import type { z } from 'zod';
import { JiraSdkError } from './base.error.js';

/**
 * Error thrown when authentication fails or is misconfigured.
 */
export class AuthError extends JiraSdkError {
  readonly code: string = 'AUTH_ERROR';

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, { statusCode: 401, ...(context !== undefined && { context }) });
  }
}

/**
 * Error thrown when OAuth2 token refresh fails.
 */
export class TokenRefreshError extends AuthError {
  override readonly code: string = 'TOKEN_REFRESH_ERROR';

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}

/**
 * Error thrown when OAuth2 token is expired.
 */
export class TokenExpiredError extends AuthError {
  override readonly code: string = 'TOKEN_EXPIRED_ERROR';

  constructor(message = 'Access token has expired', context?: Record<string, unknown>) {
    super(message, context);
  }
}

/**
 * Error thrown when auth configuration is invalid.
 */
export class AuthConfigError extends AuthError {
  override readonly code: string = 'AUTH_CONFIG_ERROR';
  readonly validationErrors: z.core.$ZodIssue[] | undefined;

  constructor(message: string, validationErrors?: z.core.$ZodIssue[]) {
    super(message, validationErrors !== undefined ? { validationErrors } : undefined);
    this.validationErrors = validationErrors;
  }
}
