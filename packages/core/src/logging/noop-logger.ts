import type { Logger, LogFields } from './types.js';

/**
 * No-op logger that discards all log messages.
 * Used as the default logger when no logger is configured.
 */
export class NoopLogger implements Logger {
  debug(_message: string, _fields?: LogFields): void {
    // Intentionally empty
  }

  info(_message: string, _fields?: LogFields): void {
    // Intentionally empty
  }

  warn(_message: string, _fields?: LogFields): void {
    // Intentionally empty
  }

  error(_message: string, _fields?: LogFields): void {
    // Intentionally empty
  }

  child(_fields: LogFields): Logger {
    return this;
  }
}

/** Singleton instance of the no-op logger */
export const noopLogger = new NoopLogger();
