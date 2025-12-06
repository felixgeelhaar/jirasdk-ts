/**
 * Base error class for all SDK errors.
 * Provides consistent error structure with error codes and cause chaining.
 */
export abstract class JiraSdkError extends Error {
  /** Unique error code for programmatic handling */
  abstract readonly code: string;

  /** HTTP status code if applicable */
  readonly statusCode?: number;

  /** Original cause of the error */
  readonly cause?: Error;

  /** Additional context/metadata */
  readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    options?: {
      cause?: Error | undefined;
      statusCode?: number | undefined;
      context?: Record<string, unknown> | undefined;
    }
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;

    // Only assign properties when values are defined (for exactOptionalPropertyTypes)
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
    if (options?.statusCode !== undefined) {
      this.statusCode = options.statusCode;
    }
    if (options?.context !== undefined) {
      this.context = options.context;
    }

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Returns a JSON representation of the error
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      context: this.context,
      cause: this.cause?.message,
      stack: this.stack,
    };
  }
}
