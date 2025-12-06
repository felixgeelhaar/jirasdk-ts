import type { Middleware, MiddlewareContext, MiddlewareNext, HttpResponse } from './types.js';
import { NetworkError } from '../errors/network.error.js';
import { ApiError, ServerError, RateLimitError } from '../errors/api.error.js';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation, requests flow through
  OPEN = 'OPEN', // Circuit is open, requests fail fast
  HALF_OPEN = 'HALF_OPEN', // Testing if service is recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /**
   * Number of failures before opening the circuit (default: 5)
   */
  failureThreshold?: number;

  /**
   * Time in ms to wait before testing recovery (default: 30000)
   */
  resetTimeoutMs?: number;

  /**
   * Time window in ms to count failures (default: 60000)
   */
  failureWindowMs?: number;

  /**
   * Number of successful requests in half-open state to close circuit (default: 1)
   */
  successThreshold?: number;

  /**
   * Custom function to determine if an error should count as a failure
   */
  isFailure?: (error: unknown) => boolean;

  /**
   * Callback when state changes
   */
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
}

/**
 * Circuit breaker error thrown when circuit is open
 */
export class CircuitBreakerOpenError extends Error {
  readonly code = 'CIRCUIT_BREAKER_OPEN';
  readonly remainingMs: number;

  constructor(message: string, remainingMs: number) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
    this.remainingMs = remainingMs;
  }
}

/**
 * Circuit breaker state manager
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number[] = [];
  private lastFailureTime: number = 0;
  private successCount: number = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly failureWindowMs: number;
  private readonly successThreshold: number;
  private readonly isFailure: (error: unknown) => boolean;
  private readonly onStateChange: ((from: CircuitState, to: CircuitState) => void) | undefined;

  constructor(config: CircuitBreakerConfig = {}) {
    this.failureThreshold = config.failureThreshold ?? 5;
    this.resetTimeoutMs = config.resetTimeoutMs ?? 30000;
    this.failureWindowMs = config.failureWindowMs ?? 60000;
    this.successThreshold = config.successThreshold ?? 1;
    this.isFailure = config.isFailure ?? defaultIsFailure;
    this.onStateChange = config.onStateChange;
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    this.updateState();
    return this.state;
  }

  /**
   * Check if request is allowed
   */
  canExecute(): boolean {
    this.updateState();
    return this.state !== CircuitState.OPEN;
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
        this.reset();
      }
    } else if (this.state === CircuitState.CLOSED) {
      // Clear old failures on success
      this.cleanupFailures();
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(error: unknown): void {
    if (!this.isFailure(error)) {
      return;
    }

    const now = Date.now();
    this.failures.push(now);
    this.lastFailureTime = now;
    this.cleanupFailures();

    if (this.state === CircuitState.HALF_OPEN) {
      // Failure in half-open state reopens the circuit
      this.transitionTo(CircuitState.OPEN);
      this.successCount = 0;
    } else if (this.state === CircuitState.CLOSED) {
      if (this.failures.length >= this.failureThreshold) {
        this.transitionTo(CircuitState.OPEN);
      }
    }
  }

  /**
   * Get remaining time until circuit can transition to half-open
   */
  getRemainingOpenTime(): number {
    if (this.state !== CircuitState.OPEN) {
      return 0;
    }
    const elapsed = Date.now() - this.lastFailureTime;
    return Math.max(0, this.resetTimeoutMs - elapsed);
  }

  /**
   * Force reset the circuit breaker
   */
  reset(): void {
    this.failures = [];
    this.successCount = 0;
    this.lastFailureTime = 0;
    if (this.state !== CircuitState.CLOSED) {
      this.transitionTo(CircuitState.CLOSED);
    }
  }

  /**
   * Get circuit breaker statistics
   */
  getStats(): {
    state: CircuitState;
    failureCount: number;
    successCount: number;
    remainingOpenTimeMs: number;
  } {
    this.cleanupFailures();
    return {
      state: this.getState(),
      failureCount: this.failures.length,
      successCount: this.successCount,
      remainingOpenTimeMs: this.getRemainingOpenTime(),
    };
  }

  private updateState(): void {
    if (this.state === CircuitState.OPEN) {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.resetTimeoutMs) {
        this.transitionTo(CircuitState.HALF_OPEN);
        this.successCount = 0;
      }
    }
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.onStateChange?.(oldState, newState);
    }
  }

  private cleanupFailures(): void {
    const cutoff = Date.now() - this.failureWindowMs;
    this.failures = this.failures.filter((t) => t > cutoff);
  }
}

/**
 * Default failure detection - network errors, server errors, and rate limits
 */
function defaultIsFailure(error: unknown): boolean {
  if (error instanceof NetworkError) {
    return true;
  }
  if (error instanceof ServerError) {
    return true;
  }
  if (error instanceof RateLimitError) {
    return true;
  }
  // Don't count client errors (4xx except 429) as circuit breaker failures
  if (error instanceof ApiError && error.statusCode !== undefined) {
    return error.statusCode >= 500;
  }
  return false;
}

/**
 * Create a circuit breaker middleware
 *
 * The circuit breaker pattern prevents cascading failures by:
 * 1. Tracking failures within a time window
 * 2. Opening the circuit when failure threshold is reached
 * 3. Failing fast while circuit is open
 * 4. Testing recovery with half-open state
 *
 * @example
 * ```typescript
 * const circuitBreaker = new CircuitBreaker({
 *   failureThreshold: 5,
 *   resetTimeoutMs: 30000,
 *   onStateChange: (from, to) => console.log(`Circuit: ${from} -> ${to}`),
 * });
 *
 * const client = new HttpClient({
 *   baseUrl: '...',
 *   middleware: [
 *     createCircuitBreakerMiddleware(circuitBreaker),
 *   ],
 * });
 * ```
 */
export function createCircuitBreakerMiddleware(circuitBreaker: CircuitBreaker): Middleware {
  return async (context: MiddlewareContext, next: MiddlewareNext): Promise<HttpResponse> => {
    // Check if circuit allows the request
    if (!circuitBreaker.canExecute()) {
      const remainingMs = circuitBreaker.getRemainingOpenTime();
      context.logger.warn('Circuit breaker open, rejecting request', {
        remainingMs,
        url: context.request.url,
      });
      throw new CircuitBreakerOpenError(
        `Circuit breaker is open. Retry after ${remainingMs}ms`,
        remainingMs
      );
    }

    try {
      const response = await next(context);
      circuitBreaker.recordSuccess();
      return response;
    } catch (error) {
      circuitBreaker.recordFailure(error);
      throw error;
    }
  };
}

/**
 * Create a circuit breaker with default configuration
 */
export function createDefaultCircuitBreaker(
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  return new CircuitBreaker(config);
}
