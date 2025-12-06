import {
  type AuthProvider,
  type AuthType,
  type OAuth2AuthConfig,
  OAuth2AuthConfigSchema,
  OAuth2TokenResponseSchema,
} from './types.js';
import { AuthConfigError, TokenRefreshError, TokenExpiredError } from '../errors/auth.error.js';

/**
 * Default token endpoint for Atlassian Cloud OAuth2
 */
const ATLASSIAN_TOKEN_ENDPOINT = 'https://auth.atlassian.com/oauth/token';

/**
 * Buffer time (in ms) before token expiration to trigger refresh
 * Default: 5 minutes
 */
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * OAuth2 authentication provider
 *
 * Supports OAuth 2.0 with automatic token refresh for Atlassian Cloud.
 *
 * @see https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/
 *
 * @example
 * ```typescript
 * const auth = new OAuth2Auth({
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   accessToken: 'current-access-token',
 *   refreshToken: 'refresh-token',
 * });
 * ```
 */
export class OAuth2Auth implements AuthProvider {
  public readonly type: AuthType = 'oauth2';
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly tokenEndpoint: string;

  private accessToken: string | undefined;
  private refreshToken: string | undefined;
  private expiresAt: number | undefined;

  /**
   * Promise for in-flight token refresh (prevents concurrent refreshes)
   */
  private refreshPromise: Promise<void> | undefined;

  /**
   * Callback invoked when tokens are refreshed
   * Useful for persisting new tokens
   */
  public onTokenRefresh?: (tokens: {
    accessToken: string;
    refreshToken: string | undefined;
    expiresAt: number | undefined;
  }) => void | Promise<void>;

  constructor(config: OAuth2AuthConfig) {
    const result = OAuth2AuthConfigSchema.safeParse(config);
    if (!result.success) {
      throw new AuthConfigError('Invalid OAuth2 auth configuration', result.error.issues);
    }

    const data = result.data;
    this.clientId = data.clientId;
    this.clientSecret = data.clientSecret;
    this.tokenEndpoint = data.tokenEndpoint ?? ATLASSIAN_TOKEN_ENDPOINT;
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    this.expiresAt = data.expiresAt;
  }

  /**
   * Returns the Authorization header with Bearer token
   * Uses a mutex to prevent concurrent token refreshes
   */
  async getAuthHeaders(): Promise<Record<string, string>> {
    // Check if we need to refresh the token
    if (this.shouldRefreshToken()) {
      // Use existing refresh promise if one is in flight (prevents concurrent refreshes)
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- ??= can't be used with side effects
      if (!this.refreshPromise) {
        this.refreshPromise = this.refresh().finally(() => {
          this.refreshPromise = undefined;
        });
      }
      await this.refreshPromise;
    }

    if (!this.accessToken) {
      throw new TokenExpiredError('No access token available');
    }

    return {
      Authorization: `Bearer ${this.accessToken}`,
    };
  }

  /**
   * Check if the current token is valid
   */
  isValid(): boolean {
    if (!this.accessToken) {
      return false;
    }

    if (this.expiresAt && Date.now() >= this.expiresAt) {
      return false;
    }

    return true;
  }

  /**
   * Refresh the access token using the refresh token
   */
  async refresh(): Promise<void> {
    if (!this.refreshToken) {
      throw new TokenRefreshError('No refresh token available');
    }

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.refreshToken,
    });

    try {
      const response = await fetch(this.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new TokenRefreshError(
          `Token refresh failed: ${response.status} ${response.statusText}`,
          { responseBody: errorText }
        );
      }

      const data: unknown = await response.json();
      const parsed = OAuth2TokenResponseSchema.safeParse(data);

      if (!parsed.success) {
        throw new TokenRefreshError('Invalid token response from server', {
          validationErrors: parsed.error.issues,
        });
      }

      const tokens = parsed.data;
      this.accessToken = tokens.access_token;

      if (tokens.refresh_token) {
        this.refreshToken = tokens.refresh_token;
      }

      if (tokens.expires_in) {
        this.expiresAt = Date.now() + tokens.expires_in * 1000;
      }

      // Invoke callback if provided
      if (this.onTokenRefresh) {
        await this.onTokenRefresh({
          accessToken: this.accessToken,
          refreshToken: this.refreshToken,
          expiresAt: this.expiresAt,
        });
      }
    } catch (error) {
      if (error instanceof TokenRefreshError) {
        throw error;
      }
      throw new TokenRefreshError('Failed to refresh token', { cause: error });
    }
  }

  /**
   * Set a new access token
   */
  setAccessToken(token: string, expiresIn?: number): void {
    this.accessToken = token;
    if (expiresIn) {
      this.expiresAt = Date.now() + expiresIn * 1000;
    }
  }

  /**
   * Set a new refresh token
   */
  setRefreshToken(token: string): void {
    this.refreshToken = token;
  }

  /**
   * Get current tokens (for persistence)
   */
  getTokens(): {
    accessToken: string | undefined;
    refreshToken: string | undefined;
    expiresAt: number | undefined;
  } {
    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      expiresAt: this.expiresAt,
    };
  }

  /**
   * Check if we should proactively refresh the token
   */
  private shouldRefreshToken(): boolean {
    if (!this.accessToken) {
      return true;
    }

    if (!this.expiresAt) {
      return false;
    }

    // Refresh if within buffer time of expiration
    return Date.now() >= this.expiresAt - TOKEN_EXPIRY_BUFFER_MS;
  }
}

/**
 * Factory function to create OAuth2 auth provider
 */
export function createOAuth2Auth(config: OAuth2AuthConfig): OAuth2Auth {
  return new OAuth2Auth(config);
}
