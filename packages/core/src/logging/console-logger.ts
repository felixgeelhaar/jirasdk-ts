import type { Logger, LogLevel, LogFields } from './types.js';

/**
 * Options for configuring the console logger
 */
export interface ConsoleLoggerOptions {
  /** Minimum log level to output */
  level?: LogLevel;
  /** Whether to include timestamps */
  timestamps?: boolean;
  /** Whether to pretty print objects */
  prettyPrint?: boolean;
  /** Prefix for all log messages */
  prefix?: string;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Console logger implementation for development and debugging.
 */
export class ConsoleLogger implements Logger {
  private readonly options: Required<ConsoleLoggerOptions>;
  private readonly contextFields: LogFields;

  constructor(options: ConsoleLoggerOptions = {}, contextFields: LogFields = {}) {
    this.options = {
      level: options.level ?? 'info',
      timestamps: options.timestamps ?? true,
      prettyPrint: options.prettyPrint ?? true,
      prefix: options.prefix ?? '[jira-sdk]',
    };
    this.contextFields = contextFields;
  }

  debug(message: string, fields?: LogFields): void {
    this.log('debug', message, fields);
  }

  info(message: string, fields?: LogFields): void {
    this.log('info', message, fields);
  }

  warn(message: string, fields?: LogFields): void {
    this.log('warn', message, fields);
  }

  error(message: string, fields?: LogFields): void {
    this.log('error', message, fields);
  }

  child(fields: LogFields): Logger {
    return new ConsoleLogger(this.options, {
      ...this.contextFields,
      ...fields,
    });
  }

  private log(level: LogLevel, message: string, fields?: LogFields): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const allFields = { ...this.contextFields, ...fields };
    const formattedMessage = this.formatMessage(level, message);

    const consoleFn = this.getConsoleFn(level);

    if (Object.keys(allFields).length > 0) {
      if (this.options.prettyPrint) {
        consoleFn(formattedMessage, allFields);
      } else {
        consoleFn(formattedMessage, JSON.stringify(allFields));
      }
    } else {
      consoleFn(formattedMessage);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.options.level];
  }

  private formatMessage(level: LogLevel, message: string): string {
    const parts: string[] = [];

    if (this.options.timestamps) {
      parts.push(new Date().toISOString());
    }

    if (this.options.prefix) {
      parts.push(this.options.prefix);
    }

    parts.push(`[${level.toUpperCase()}]`);
    parts.push(message);

    return parts.join(' ');
  }

  private getConsoleFn(level: LogLevel): typeof console.log {
    switch (level) {
      case 'debug':
        return console.debug.bind(console);
      case 'info':
        return console.info.bind(console);
      case 'warn':
        return console.warn.bind(console);
      case 'error':
        return console.error.bind(console);
    }
  }
}

/** Create a console logger with sensible defaults */
export function createConsoleLogger(options?: ConsoleLoggerOptions): ConsoleLogger {
  return new ConsoleLogger(options);
}
