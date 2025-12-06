import {
  type AuthProvider,
  type AuthType,
  type BasicAuthConfig,
  BasicAuthConfigSchema,
} from './types.js';
import { AuthConfigError } from '../errors/auth.error.js';

/**
 * Basic authentication provider
 *
 * Uses HTTP Basic authentication with username and password.
 * Primarily used with Jira Server/Data Center instances.
 *
 * @example
 * ```typescript
 * const auth = new BasicAuth({
 *   username: 'admin',
 *   password: 'password123'
 * });
 * ```
 */
export class BasicAuth implements AuthProvider {
  public readonly type: AuthType = 'basic';
  private readonly encodedCredentials: string;

  constructor(config: BasicAuthConfig) {
    const result = BasicAuthConfigSchema.safeParse(config);
    if (!result.success) {
      throw new AuthConfigError('Invalid basic auth configuration', result.error.issues);
    }

    const { username, password } = result.data;
    const credentials = `${username}:${password}`;
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
   * Basic auth is always valid (no expiration)
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
 * Factory function to create Basic auth provider
 */
export function createBasicAuth(config: BasicAuthConfig): BasicAuth {
  return new BasicAuth(config);
}
