import {
  type AuthProvider,
  type AuthType,
  type PatAuthConfig,
  PatAuthConfigSchema,
} from './types.js';
import { AuthConfigError } from '../errors/auth.error.js';

/**
 * Personal Access Token (PAT) authentication provider
 *
 * Uses Bearer token authentication with a PAT.
 * Supported by Jira Server/Data Center and some Cloud APIs.
 *
 * @see https://confluence.atlassian.com/enterprise/using-personal-access-tokens-1026032365.html
 *
 * @example
 * ```typescript
 * const auth = new PatAuth({
 *   token: 'your-personal-access-token'
 * });
 * ```
 */
export class PatAuth implements AuthProvider {
  public readonly type: AuthType = 'pat';
  private readonly token: string;

  constructor(config: PatAuthConfig) {
    const result = PatAuthConfigSchema.safeParse(config);
    if (!result.success) {
      throw new AuthConfigError('Invalid PAT auth configuration', result.error.issues);
    }

    this.token = result.data.token;
  }

  /**
   * Returns the Authorization header with Bearer token
   */
  getAuthHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
    };
  }

  /**
   * PAT auth is always valid (no automatic expiration check)
   */
  isValid(): boolean {
    return true;
  }
}

/**
 * Factory function to create PAT auth provider
 */
export function createPatAuth(config: PatAuthConfig): PatAuth {
  return new PatAuth(config);
}
