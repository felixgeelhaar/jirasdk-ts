import {
  type AuthProvider,
  type AuthType,
  type ApiTokenAuthConfig,
  ApiTokenAuthConfigSchema,
} from './types.js';
import { AuthConfigError } from '../errors/auth.error.js';

/**
 * API Token authentication provider for Atlassian Cloud
 *
 * Uses email + API token authentication which creates a Basic auth header.
 * This is the recommended auth method for Atlassian Cloud APIs.
 *
 * @see https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/
 *
 * @example
 * ```typescript
 * const auth = new ApiTokenAuth({
 *   email: 'user@example.com',
 *   apiToken: 'your-api-token'
 * });
 * ```
 */
export class ApiTokenAuth implements AuthProvider {
  public readonly type: AuthType = 'api-token';
  private readonly email: string;
  private readonly apiToken: string;
  private readonly encodedCredentials: string;

  constructor(config: ApiTokenAuthConfig) {
    const result = ApiTokenAuthConfigSchema.safeParse(config);
    if (!result.success) {
      throw new AuthConfigError('Invalid API token auth configuration', result.error.errors);
    }

    this.email = result.data.email;
    this.apiToken = result.data.apiToken;

    // Pre-compute the base64 encoded credentials
    // In browser, use btoa; in Node.js, use Buffer
    const credentials = `${this.email}:${this.apiToken}`;
    this.encodedCredentials = this.encodeBase64(credentials);
  }

  /**
   * Returns the Authorization header with Basic auth
   */
  getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Basic ${this.encodedCredentials}`,
    };
  }

  /**
   * API token auth is always valid (no expiration)
   */
  isValid(): boolean {
    return true;
  }

  /**
   * Encode string to base64 (works in both browser and Node.js)
   */
  private encodeBase64(str: string): string {
    if (typeof btoa === 'function') {
      // Browser environment
      return btoa(str);
    } else if (typeof Buffer !== 'undefined') {
      // Node.js environment
      return Buffer.from(str, 'utf-8').toString('base64');
    }
    throw new Error('No base64 encoding method available');
  }
}

/**
 * Factory function to create API Token auth provider
 */
export function createApiTokenAuth(config: ApiTokenAuthConfig): ApiTokenAuth {
  return new ApiTokenAuth(config);
}
