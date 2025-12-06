import { JiraSdkError } from './base.error.js';

/**
 * Error thrown when a network-level error occurs.
 */
export class NetworkError extends JiraSdkError {
  readonly code = 'NETWORK_ERROR';

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, { cause: options?.cause as Error | undefined });
  }

  /**
   * Check if this error indicates a connection failure
   */
  isConnectionError(): boolean {
    const msg = this.message.toLowerCase();
    return (
      msg.includes('econnrefused') ||
      msg.includes('econnreset') ||
      msg.includes('enotfound') ||
      msg.includes('fetch failed')
    );
  }

  /**
   * Check if this error might be retryable
   */
  isRetryable(): boolean {
    const msg = this.message.toLowerCase();
    return msg.includes('econnreset') || msg.includes('etimedout') || msg.includes('temporary');
  }
}

/**
 * Error thrown when a request times out.
 */
export class TimeoutError extends JiraSdkError {
  readonly code = 'TIMEOUT_ERROR';

  /** The timeout duration in milliseconds */
  readonly timeoutMs: number | undefined;

  constructor(message: string, options?: { cause?: unknown; timeoutMs?: number }) {
    super(message, { cause: options?.cause as Error | undefined });
    this.timeoutMs = options?.timeoutMs;
  }
}

/**
 * Error thrown when a request is aborted.
 */
export class AbortError extends JiraSdkError {
  readonly code = 'ABORT_ERROR';

  constructor(message = 'Request was aborted', options?: { cause?: unknown }) {
    super(message, { cause: options?.cause as Error | undefined });
  }
}
