// Base error
export { JiraSdkError } from './base.error.js';

// API errors
export {
  ApiError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ServerError,
  type JiraErrorDetail,
} from './api.error.js';

// Validation errors
export {
  ValidationError,
  ConfigValidationError,
  ResponseValidationError,
} from './validation.error.js';

// Network errors
export { NetworkError, TimeoutError, AbortError } from './network.error.js';

// Auth errors
export { AuthError, TokenRefreshError, TokenExpiredError, AuthConfigError } from './auth.error.js';
