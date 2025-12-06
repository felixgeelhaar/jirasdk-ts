import type { ZodError, ZodIssue } from 'zod';
import { JiraSdkError } from './base.error.js';

/**
 * Error thrown when validation fails (either request or response).
 */
export class ValidationError extends JiraSdkError {
  readonly code: string = 'VALIDATION_ERROR';

  /** Validation issues from Zod */
  readonly issues: ZodIssue[];

  constructor(message: string, zodError: ZodError) {
    super(message, {
      context: {
        issues: zodError.issues,
      },
    });
    this.issues = zodError.issues;
  }

  /**
   * Creates a ValidationError from a ZodError
   */
  static fromZodError(zodError: ZodError, prefix = 'Validation failed'): ValidationError {
    const message = `${prefix}: ${formatZodIssues(zodError.issues)}`;
    return new ValidationError(message, zodError);
  }

  /**
   * Returns a flat list of all error paths and messages
   */
  getFieldErrors(): Array<{ path: string; message: string }> {
    return this.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
  }
}

/**
 * Error thrown when configuration validation fails
 */
export class ConfigValidationError extends ValidationError {
  override readonly code = 'CONFIG_VALIDATION_ERROR';

  static override fromZodError(zodError: ZodError): ConfigValidationError {
    const message = `Configuration validation failed: ${formatZodIssues(zodError.issues)}`;
    return new ConfigValidationError(message, zodError);
  }
}

/**
 * Error thrown when response validation fails
 */
export class ResponseValidationError extends ValidationError {
  override readonly code = 'RESPONSE_VALIDATION_ERROR';

  static override fromZodError(zodError: ZodError): ResponseValidationError {
    const message = `Response validation failed: ${formatZodIssues(zodError.issues)}`;
    return new ResponseValidationError(message, zodError);
  }
}

// Helper function
function formatZodIssues(issues: ZodIssue[]): string {
  return issues
    .map((issue) => {
      const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : '';
      return `${path}${issue.message}`;
    })
    .join('; ');
}
