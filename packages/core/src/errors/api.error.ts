import { JiraSdkError } from './base.error.js';

/**
 * Error details returned by Jira API
 */
export interface JiraErrorDetail {
  errorMessages?: string[] | undefined;
  errors?: Record<string, string> | undefined;
  warningMessages?: string[] | undefined;
}

/**
 * Error thrown when Jira API returns an error response.
 */
export class ApiError extends JiraSdkError {
  readonly code: string = 'JIRA_API_ERROR';

  /** Parsed error details from Jira response */
  readonly details: JiraErrorDetail | undefined;

  /** Raw response body */
  readonly responseBody: unknown;

  constructor(message: string, statusCode: number, responseBody?: unknown) {
    const details = parseErrorBody(responseBody);
    const finalMessage = details ? buildErrorMessage(message, details) : message;
    super(finalMessage, { statusCode, context: { responseBody } });
    this.details = details;
    this.responseBody = responseBody;
  }

  /**
   * Returns all error messages as a single array
   */
  getAllMessages(): string[] {
    const messages: string[] = [];

    if (this.details?.errorMessages) {
      messages.push(...this.details.errorMessages);
    }

    if (this.details?.errors) {
      for (const [field, msg] of Object.entries(this.details.errors)) {
        messages.push(`${field}: ${msg}`);
      }
    }

    if (messages.length === 0) {
      messages.push(this.message);
    }

    return messages;
  }
}

/**
 * Error thrown when user is not authenticated
 */
export class UnauthorizedError extends ApiError {
  override readonly code: string = 'JIRA_UNAUTHORIZED';

  constructor(message = 'Authentication required', responseBody?: unknown) {
    super(message, 401, responseBody);
  }
}

/**
 * Error thrown when user lacks required permissions
 */
export class ForbiddenError extends ApiError {
  override readonly code: string = 'JIRA_FORBIDDEN';

  constructor(message = 'Permission denied', responseBody?: unknown) {
    super(message, 403, responseBody);
  }
}

/**
 * Error thrown when requested resource is not found
 */
export class NotFoundError extends ApiError {
  override readonly code: string = 'JIRA_NOT_FOUND';

  constructor(message = 'Resource not found', responseBody?: unknown) {
    super(message, 404, responseBody);
  }
}

/**
 * Rate limit error options
 */
export interface RateLimitErrorOptions {
  retryAfter?: number | undefined;
}

/**
 * Error thrown when rate limit is exceeded
 */
export class RateLimitError extends ApiError {
  override readonly code: string = 'JIRA_RATE_LIMITED';

  /** When to retry (in milliseconds) */
  readonly retryAfter: number | undefined;

  constructor(
    message = 'Rate limit exceeded',
    responseBody?: unknown,
    options?: RateLimitErrorOptions
  ) {
    super(message, 429, responseBody);
    this.retryAfter = options?.retryAfter;
  }
}

/**
 * Error thrown when server encounters an internal error
 */
export class ServerError extends ApiError {
  override readonly code: string = 'JIRA_SERVER_ERROR';

  constructor(message = 'Internal server error', responseBody?: unknown, statusCode = 500) {
    super(message, statusCode, responseBody);
  }
}

// Helper functions
function parseErrorBody(body: unknown): JiraErrorDetail | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const obj = body as Record<string, unknown>;

  return {
    errorMessages: Array.isArray(obj['errorMessages'])
      ? (obj['errorMessages'] as string[])
      : undefined,
    errors:
      typeof obj['errors'] === 'object' && obj['errors'] !== null
        ? (obj['errors'] as Record<string, string>)
        : undefined,
    warningMessages: Array.isArray(obj['warningMessages'])
      ? (obj['warningMessages'] as string[])
      : undefined,
  };
}

function buildErrorMessage(baseMessage: string, details: JiraErrorDetail): string {
  // First, try to use error messages from the response
  if (details.errorMessages?.length) {
    return details.errorMessages.join('; ');
  }

  // Then, try field-specific errors
  if (details.errors && Object.keys(details.errors).length > 0) {
    const fieldErrors = Object.entries(details.errors)
      .map(([field, msg]) => `${field}: ${msg}`)
      .join('; ');
    return `${baseMessage}: ${fieldErrors}`;
  }

  return baseMessage;
}
