import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CircuitBreaker,
  CircuitState,
  CircuitBreakerOpenError,
  createCircuitBreakerMiddleware,
} from './circuit-breaker.js';
import type { MiddlewareContext, MiddlewareNext, HttpResponse } from './types.js';
import { NetworkError } from '../errors/network.error.js';
import { ServerError } from '../errors/api.error.js';
import { NoopLogger } from '../logging/noop-logger.js';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeoutMs: 1000,
      failureWindowMs: 5000,
      successThreshold: 1,
    });
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should allow requests when CLOSED', () => {
      expect(circuitBreaker.canExecute()).toBe(true);
    });

    it('should have zero failure count initially', () => {
      const stats = circuitBreaker.getStats();
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
    });
  });

  describe('failure recording', () => {
    it('should count network errors as failures', () => {
      const error = new NetworkError('Connection failed');
      circuitBreaker.recordFailure(error);

      const stats = circuitBreaker.getStats();
      expect(stats.failureCount).toBe(1);
    });

    it('should count server errors as failures', () => {
      const error = new ServerError('Internal server error');
      circuitBreaker.recordFailure(error);

      const stats = circuitBreaker.getStats();
      expect(stats.failureCount).toBe(1);
    });

    it('should not count client errors as failures', () => {
      const error = new Error('Client error');
      circuitBreaker.recordFailure(error);

      const stats = circuitBreaker.getStats();
      expect(stats.failureCount).toBe(0);
    });
  });

  describe('state transitions', () => {
    it('should open circuit after reaching failure threshold', () => {
      const error = new NetworkError('Connection failed');

      circuitBreaker.recordFailure(error);
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      circuitBreaker.recordFailure(error);
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);

      circuitBreaker.recordFailure(error);
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should not allow requests when OPEN', () => {
      const error = new NetworkError('Connection failed');

      // Trigger failures to open circuit
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure(error);
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
      expect(circuitBreaker.canExecute()).toBe(false);
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      const error = new NetworkError('Connection failed');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure(error);
      }
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));

      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
      expect(circuitBreaker.canExecute()).toBe(true);
    });

    it('should close circuit after success in HALF_OPEN state', async () => {
      const error = new NetworkError('Connection failed');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure(error);
      }

      // Wait for half-open
      await new Promise((resolve) => setTimeout(resolve, 1100));
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);

      // Record success
      circuitBreaker.recordSuccess();
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reopen circuit on failure in HALF_OPEN state', async () => {
      const error = new NetworkError('Connection failed');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure(error);
      }

      // Wait for half-open
      await new Promise((resolve) => setTimeout(resolve, 1100));
      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);

      // Record failure
      circuitBreaker.recordFailure(error);
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('state change callback', () => {
    it('should call onStateChange when state transitions', () => {
      const onStateChange = vi.fn();
      const cb = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeoutMs: 100,
        onStateChange,
      });

      const error = new NetworkError('Connection failed');
      cb.recordFailure(error);
      cb.recordFailure(error);

      expect(onStateChange).toHaveBeenCalledWith(CircuitState.CLOSED, CircuitState.OPEN);
    });
  });

  describe('reset', () => {
    it('should reset to CLOSED state', () => {
      const error = new NetworkError('Connection failed');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure(error);
      }
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Reset
      circuitBreaker.reset();
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.getStats().failureCount).toBe(0);
    });
  });

  describe('remaining open time', () => {
    it('should return remaining time when OPEN', () => {
      const error = new NetworkError('Connection failed');

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        circuitBreaker.recordFailure(error);
      }

      const remaining = circuitBreaker.getRemainingOpenTime();
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(1000);
    });

    it('should return 0 when CLOSED', () => {
      expect(circuitBreaker.getRemainingOpenTime()).toBe(0);
    });
  });
});

describe('createCircuitBreakerMiddleware', () => {
  let circuitBreaker: CircuitBreaker;
  let middleware: ReturnType<typeof createCircuitBreakerMiddleware>;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeoutMs: 100,
    });
    middleware = createCircuitBreakerMiddleware(circuitBreaker);
  });

  function createContext(): MiddlewareContext {
    return {
      request: {
        method: 'GET',
        url: '/test',
        headers: {},
      },
      logger: new NoopLogger(),
      retryCount: 0,
    };
  }

  it('should allow requests when circuit is CLOSED', async () => {
    const context = createContext();
    const mockResponse: HttpResponse = {
      status: 200,
      headers: new Headers(),
      data: { success: true },
      request: context.request,
      responseTime: 100,
    };

    const next: MiddlewareNext = vi.fn().mockResolvedValue(mockResponse);

    const response = await middleware(context, next);

    expect(next).toHaveBeenCalledWith(context);
    expect(response).toBe(mockResponse);
  });

  it('should record success on successful request', async () => {
    const context = createContext();
    const mockResponse: HttpResponse = {
      status: 200,
      headers: new Headers(),
      data: { success: true },
      request: context.request,
      responseTime: 100,
    };

    const next: MiddlewareNext = vi.fn().mockResolvedValue(mockResponse);

    await middleware(context, next);

    // Should still be closed and have recorded success
    expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should record failure on error', async () => {
    const context = createContext();
    const error = new NetworkError('Connection failed');
    const next: MiddlewareNext = vi.fn().mockRejectedValue(error);

    await expect(middleware(context, next)).rejects.toThrow(error);

    expect(circuitBreaker.getStats().failureCount).toBe(1);
  });

  it('should throw CircuitBreakerOpenError when circuit is OPEN', async () => {
    const error = new NetworkError('Connection failed');

    // Open the circuit
    circuitBreaker.recordFailure(error);
    circuitBreaker.recordFailure(error);
    expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

    const context = createContext();
    const next: MiddlewareNext = vi.fn();

    await expect(middleware(context, next)).rejects.toThrow(CircuitBreakerOpenError);
    expect(next).not.toHaveBeenCalled();
  });

  it('should include remaining time in CircuitBreakerOpenError', async () => {
    const error = new NetworkError('Connection failed');

    // Open the circuit
    circuitBreaker.recordFailure(error);
    circuitBreaker.recordFailure(error);

    const context = createContext();
    const next: MiddlewareNext = vi.fn();

    try {
      await middleware(context, next);
    } catch (e) {
      expect(e).toBeInstanceOf(CircuitBreakerOpenError);
      expect((e as CircuitBreakerOpenError).remainingMs).toBeGreaterThan(0);
    }
  });
});

describe('CircuitBreakerOpenError', () => {
  it('should have correct properties', () => {
    const error = new CircuitBreakerOpenError('Circuit is open', 5000);

    expect(error.message).toBe('Circuit is open');
    expect(error.code).toBe('CIRCUIT_BREAKER_OPEN');
    expect(error.remainingMs).toBe(5000);
    expect(error.name).toBe('CircuitBreakerOpenError');
  });
});
