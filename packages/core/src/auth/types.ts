import { z } from 'zod';

/**
 * Authentication provider interface
 * All auth providers must implement this interface
 */
export interface AuthProvider {
  /**
   * Returns the authentication headers to be added to requests
   */
  getAuthHeaders(): Promise<Record<string, string>> | Record<string, string>;

  /**
   * Returns the auth type identifier
   */
  readonly type: AuthType;

  /**
   * Optional: Check if the auth is still valid
   */
  isValid?(): Promise<boolean> | boolean;

  /**
   * Optional: Refresh the authentication (for OAuth2)
   */
  refresh?(): Promise<void>;
}

/**
 * Auth type enum
 */
export type AuthType = 'api-token' | 'pat' | 'basic' | 'oauth2' | 'none';

/**
 * API Token auth configuration schema
 */
export const ApiTokenAuthConfigSchema = z.object({
  email: z.string().email('Invalid email address'),
  apiToken: z.string().min(1, 'API token is required'),
});

export type ApiTokenAuthConfig = z.infer<typeof ApiTokenAuthConfigSchema>;

/**
 * Personal Access Token (PAT) auth configuration schema
 */
export const PatAuthConfigSchema = z.object({
  token: z.string().min(1, 'Personal access token is required'),
});

export type PatAuthConfig = z.infer<typeof PatAuthConfigSchema>;

/**
 * Basic auth configuration schema
 */
export const BasicAuthConfigSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

export type BasicAuthConfig = z.infer<typeof BasicAuthConfigSchema>;

/**
 * OAuth2 auth configuration schema
 */
export const OAuth2AuthConfigSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientSecret: z.string().min(1, 'Client secret is required'),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  tokenEndpoint: z.string().url().optional(),
  scopes: z.array(z.string()).optional(),
  expiresAt: z.number().int().optional(),
});

export type OAuth2AuthConfig = z.infer<typeof OAuth2AuthConfigSchema>;

/**
 * OAuth2 token response schema
 */
export const OAuth2TokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string(),
  expires_in: z.number().int().optional(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

export type OAuth2TokenResponse = z.infer<typeof OAuth2TokenResponseSchema>;

/**
 * Union of all auth configs
 */
export type AuthConfig =
  | { type: 'api-token'; config: ApiTokenAuthConfig }
  | { type: 'pat'; config: PatAuthConfig }
  | { type: 'basic'; config: BasicAuthConfig }
  | { type: 'oauth2'; config: OAuth2AuthConfig }
  | { type: 'none' };
