import { describe, it, expect } from 'vitest';
import type { ZodError } from 'zod';
import { z } from 'zod';
import {
  ApiError,
  NetworkError,
  TimeoutError,
  AbortError,
  RateLimitError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ServerError,
  ValidationError,
  ConfigValidationError,
  ResponseValidationError,
  AuthError,
  TokenExpiredError,
  TokenRefreshError,
  AuthConfigError,
} from './index.js';

describe('ApiError', () => {
  it('should create an API error', () => {
    const error = new ApiError('API failed', 400);
    expect(error.message).toBe('API failed');
    expect(error.code).toBe('JIRA_API_ERROR');
    expect(error.statusCode).toBe(400);
  });

  it('should create an API error with response body', () => {
    const responseBody = { errorMessages: ['Field is required'] };
    const error = new ApiError('API failed', 400, responseBody);
    expect(error.statusCode).toBe(400);
    expect(error.responseBody).toEqual(responseBody);
    expect(error.details?.errorMessages).toContain('Field is required');
  });
});

describe('NetworkError', () => {
  it('should create a network error', () => {
    const error = new NetworkError('Network failed');
    expect(error.message).toBe('Network failed');
    expect(error.code).toBe('NETWORK_ERROR');
  });
});

describe('TimeoutError', () => {
  it('should create a timeout error', () => {
    const error = new TimeoutError('Request timed out', 5000);
    expect(error.message).toBe('Request timed out');
    expect(error.code).toBe('TIMEOUT_ERROR');
  });
});

describe('AbortError', () => {
  it('should create an abort error', () => {
    const error = new AbortError('Request aborted');
    expect(error.message).toBe('Request aborted');
    expect(error.code).toBe('ABORT_ERROR');
  });
});

describe('RateLimitError', () => {
  it('should create a rate limit error', () => {
    const error = new RateLimitError('Rate limited');
    expect(error.message).toBe('Rate limited');
    expect(error.code).toBe('JIRA_RATE_LIMITED');
    expect(error.statusCode).toBe(429);
  });

  it('should include retryAfter if provided', () => {
    const error = new RateLimitError('Rate limited', undefined, { retryAfter: 60 });
    expect(error.retryAfter).toBe(60);
  });

  it('should accept response body', () => {
    const responseBody = { errorMessages: ['Too many requests'] };
    const error = new RateLimitError('Rate limited', responseBody);
    expect(error.responseBody).toEqual(responseBody);
  });
});

describe('HTTP status errors', () => {
  it('should create NotFoundError', () => {
    const error = new NotFoundError('Resource not found');
    expect(error.code).toBe('JIRA_NOT_FOUND');
    expect(error.statusCode).toBe(404);
  });

  it('should create UnauthorizedError', () => {
    const error = new UnauthorizedError('Not authenticated');
    expect(error.code).toBe('JIRA_UNAUTHORIZED');
    expect(error.statusCode).toBe(401);
  });

  it('should create ForbiddenError', () => {
    const error = new ForbiddenError('Access denied');
    expect(error.code).toBe('JIRA_FORBIDDEN');
    expect(error.statusCode).toBe(403);
  });

  it('should create ServerError', () => {
    const error = new ServerError('Internal server error');
    expect(error.code).toBe('JIRA_SERVER_ERROR');
    expect(error.statusCode).toBe(500);
  });
});

describe('ValidationError', () => {
  it('should create from ZodError', () => {
    const schema = z.object({ name: z.string() });
    try {
      schema.parse({ name: 123 });
    } catch (e) {
      const error = ValidationError.fromZodError(e as ZodError);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.issues).toHaveLength(1);
      expect(error.getFieldErrors()).toHaveLength(1);
    }
  });
});

describe('ConfigValidationError', () => {
  it('should create from ZodError', () => {
    const schema = z.object({ host: z.url() });
    try {
      schema.parse({ host: 'not-a-url' });
    } catch (e) {
      const error = ConfigValidationError.fromZodError(e as ZodError);
      expect(error.code).toBe('CONFIG_VALIDATION_ERROR');
    }
  });
});

describe('ResponseValidationError', () => {
  it('should create from ZodError', () => {
    const schema = z.object({ id: z.number() });
    try {
      schema.parse({ id: 'not-a-number' });
    } catch (e) {
      const error = ResponseValidationError.fromZodError(e as ZodError);
      expect(error.code).toBe('RESPONSE_VALIDATION_ERROR');
    }
  });
});

describe('AuthError', () => {
  it('should create auth error', () => {
    const error = new AuthError('Authentication failed');
    expect(error.code).toBe('AUTH_ERROR');
  });
});

describe('TokenExpiredError', () => {
  it('should create token expired error', () => {
    const error = new TokenExpiredError('Token has expired');
    expect(error.code).toBe('TOKEN_EXPIRED_ERROR');
  });
});

describe('TokenRefreshError', () => {
  it('should create token refresh error', () => {
    const error = new TokenRefreshError('Failed to refresh token');
    expect(error.code).toBe('TOKEN_REFRESH_ERROR');
  });
});

describe('AuthConfigError', () => {
  it('should create auth config error', () => {
    const error = new AuthConfigError('Invalid auth config');
    expect(error.code).toBe('AUTH_CONFIG_ERROR');
  });
});
