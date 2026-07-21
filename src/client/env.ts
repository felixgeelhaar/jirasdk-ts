import { ApiTokenAuth, BasicAuth, OAuth2Auth, PatAuth, type AuthProvider } from '../auth/index.js';
import { ConfigValidationError } from '../errors/index.js';
import { processEnv } from '../utils/runtime.js';
import { JiraClient } from './client.js';
import type { JiraClientConfig, JiraClientOption } from './types.js';

/**
 * Environment variable names, matching the Go SDK's `env.go` so the two SDKs can
 * share a deployment's configuration.
 *
 * One deliberate omission: Go reads `JIRA_OAUTH_REDIRECT_URL` because its
 * `OAuth2Authenticator` drives the full authorization-code flow. This SDK's
 * `OAuth2Auth` consumes tokens that were obtained elsewhere and has no redirect
 * URL, so reading that variable would silently do nothing.
 */
export const ENV_VARS = {
  baseUrl: 'JIRA_BASE_URL',
  email: 'JIRA_EMAIL',
  apiToken: 'JIRA_API_TOKEN',
  pat: 'JIRA_PAT',
  username: 'JIRA_USERNAME',
  password: 'JIRA_PASSWORD',
  oauthClientId: 'JIRA_OAUTH_CLIENT_ID',
  oauthClientSecret: 'JIRA_OAUTH_CLIENT_SECRET',
  timeout: 'JIRA_TIMEOUT',
  maxRetries: 'JIRA_MAX_RETRIES',
  userAgent: 'JIRA_USER_AGENT',
} as const;

/** A source of environment variables. Defaults to `process.env`. */
export type EnvSource = Record<string, string | undefined>;

function readEnv(source?: EnvSource): EnvSource {
  // `process` is absent in browsers and some edge runtimes; processEnv()
  // handles that and returns an empty object there.
  return source ?? processEnv();
}

function trimmed(value: string | undefined): string | undefined {
  const result = value?.trim();
  return result === undefined || result === '' ? undefined : result;
}

function positiveInt(raw: string | undefined, name: string): number | undefined {
  const value = trimmed(raw);
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new ConfigValidationError(`${name} must be a non-negative integer, got "${value}"`);
  }
  return parsed;
}

/**
 * Build an auth provider from environment variables.
 *
 * Resolution order matches the Go SDK:
 * 1. `JIRA_EMAIL` + `JIRA_API_TOKEN` → API token (Jira Cloud)
 * 2. `JIRA_PAT` → personal access token (Server/Data Center)
 * 3. `JIRA_USERNAME` + `JIRA_PASSWORD` → basic auth
 * 4. `JIRA_OAUTH_CLIENT_ID` + `JIRA_OAUTH_CLIENT_SECRET` + `JIRA_OAUTH_REDIRECT_URL` → OAuth 2.0
 *
 * @param source Environment variables; defaults to `process.env`.
 * @returns The first auth provider whose variables are fully present.
 * @throws {ConfigValidationError} If no complete credential set is present.
 */
export function createAuthFromEnv(source?: EnvSource): AuthProvider {
  const env = readEnv(source);

  const email = trimmed(env[ENV_VARS.email]);
  const apiToken = trimmed(env[ENV_VARS.apiToken]);
  if (email !== undefined && apiToken !== undefined) {
    return new ApiTokenAuth({ email, apiToken });
  }

  const pat = trimmed(env[ENV_VARS.pat]);
  if (pat !== undefined) {
    return new PatAuth({ token: pat });
  }

  const username = trimmed(env[ENV_VARS.username]);
  const password = trimmed(env[ENV_VARS.password]);
  if (username !== undefined && password !== undefined) {
    return new BasicAuth({ username, password });
  }

  const clientId = trimmed(env[ENV_VARS.oauthClientId]);
  const clientSecret = trimmed(env[ENV_VARS.oauthClientSecret]);
  if (clientId !== undefined && clientSecret !== undefined) {
    return new OAuth2Auth({ clientId, clientSecret });
  }

  throw new ConfigValidationError(
    'No Jira credentials found in the environment. Set one of: ' +
      `${ENV_VARS.email} + ${ENV_VARS.apiToken}; ` +
      `${ENV_VARS.pat}; ` +
      `${ENV_VARS.username} + ${ENV_VARS.password}; ` +
      `or ${ENV_VARS.oauthClientId} + ${ENV_VARS.oauthClientSecret}.`
  );
}

/**
 * Build a full client configuration from environment variables.
 *
 * @param source Environment variables; defaults to `process.env`.
 * @returns A configuration ready to pass to {@link JiraClient}.
 * @throws {ConfigValidationError} If `JIRA_BASE_URL` is missing, a numeric
 * variable is malformed, or no credentials are present.
 */
export function loadConfigFromEnv(source?: EnvSource): JiraClientConfig {
  const env = readEnv(source);

  const host = trimmed(env[ENV_VARS.baseUrl]);
  if (host === undefined) {
    throw new ConfigValidationError(`${ENV_VARS.baseUrl} is required`);
  }

  // Go expresses JIRA_TIMEOUT in seconds; the TS client takes milliseconds.
  const timeoutSeconds = positiveInt(env[ENV_VARS.timeout], ENV_VARS.timeout);
  const maxRetries = positiveInt(env[ENV_VARS.maxRetries], ENV_VARS.maxRetries);
  const userAgent = trimmed(env[ENV_VARS.userAgent]);

  return {
    host,
    auth: createAuthFromEnv(env),
    ...(timeoutSeconds !== undefined && { timeout: timeoutSeconds * 1000 }),
    ...(maxRetries !== undefined && { maxRetries }),
    ...(userAgent !== undefined && { userAgent }),
  };
}

/**
 * Create a Jira client entirely from environment variables.
 *
 * The equivalent of the Go SDK's `LoadConfigFromEnv()`.
 *
 * @example
 * ```typescript
 * // JIRA_BASE_URL=https://acme.atlassian.net
 * // JIRA_EMAIL=me@acme.com
 * // JIRA_API_TOKEN=...
 * const client = createJiraClientFromEnv();
 * ```
 *
 * @param options Functional options applied on top of the environment config.
 * @returns A configured client.
 */
export function createJiraClientFromEnv(...options: JiraClientOption[]): JiraClient {
  return new JiraClient(loadConfigFromEnv(), ...options);
}

/**
 * Functional option that layers environment-variable configuration onto an
 * existing config. Explicit values already present on the config win.
 *
 * The equivalent of the Go SDK's `WithEnv()`.
 */
export function withEnv(source?: EnvSource): JiraClientOption {
  return (config) => ({ ...loadConfigFromEnv(source), ...config });
}
