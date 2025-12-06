/**
 * Logging abstraction for the SDK.
 * Provides a simple interface that can be implemented by any logging library.
 */

/** Log levels supported by the SDK */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** Structured log fields */
export type LogFields = Record<string, unknown>;

/**
 * Logger interface that SDK consumers can implement.
 * Compatible with most logging libraries.
 */
export interface Logger {
  /** Log debug messages (verbose, for development) */
  debug(message: string, fields?: LogFields): void;

  /** Log informational messages (normal operations) */
  info(message: string, fields?: LogFields): void;

  /** Log warning messages (potential issues) */
  warn(message: string, fields?: LogFields): void;

  /** Log error messages (failures) */
  error(message: string, fields?: LogFields): void;

  /** Create a child logger with additional context */
  child?(fields: LogFields): Logger;
}

/**
 * Check if a value implements the Logger interface
 */
export function isLogger(value: unknown): value is Logger {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return (
    typeof obj['debug'] === 'function' &&
    typeof obj['info'] === 'function' &&
    typeof obj['warn'] === 'function' &&
    typeof obj['error'] === 'function'
  );
}
