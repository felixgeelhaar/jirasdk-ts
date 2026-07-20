import { describe, it, expect } from 'vitest';
import { createAuthFromEnv, loadConfigFromEnv, withEnv, ENV_VARS } from './env.js';
import { ConfigValidationError } from '../errors/index.js';

const BASE = { [ENV_VARS.baseUrl]: 'https://acme.atlassian.net' };

describe('createAuthFromEnv', () => {
  it('prefers API token when email and token are both set', () => {
    const auth = createAuthFromEnv({
      [ENV_VARS.email]: 'me@acme.com',
      [ENV_VARS.apiToken]: 'token',
      [ENV_VARS.pat]: 'pat',
    });

    expect(auth.type).toBe('api-token');
  });

  it('falls back to PAT when no API token pair is present', () => {
    expect(createAuthFromEnv({ [ENV_VARS.pat]: 'pat' }).type).toBe('pat');
  });

  it('falls back to basic auth when only username and password are set', () => {
    const auth = createAuthFromEnv({
      [ENV_VARS.username]: 'user',
      [ENV_VARS.password]: 'pass',
    });

    expect(auth.type).toBe('basic');
  });

  it('falls back to OAuth2 last', () => {
    const auth = createAuthFromEnv({
      [ENV_VARS.oauthClientId]: 'id',
      [ENV_VARS.oauthClientSecret]: 'secret',
    });

    expect(auth.type).toBe('oauth2');
  });

  it('ignores a half-configured credential pair', () => {
    // Email without a token must not be mistaken for API token auth.
    expect(
      createAuthFromEnv({ [ENV_VARS.email]: 'me@acme.com', [ENV_VARS.pat]: 'pat' }).type
    ).toBe('pat');
  });

  it('treats whitespace-only values as absent', () => {
    expect(() => createAuthFromEnv({ [ENV_VARS.pat]: '   ' })).toThrow(ConfigValidationError);
  });

  it('throws a helpful error when nothing is configured', () => {
    expect(() => createAuthFromEnv({})).toThrow(/No Jira credentials found/);
  });
});

describe('loadConfigFromEnv', () => {
  it('builds a config from the minimum viable environment', () => {
    const config = loadConfigFromEnv({ ...BASE, [ENV_VARS.pat]: 'pat' });

    expect(config.host).toBe('https://acme.atlassian.net');
    expect(config.auth.type).toBe('pat');
  });

  it('requires the base URL', () => {
    expect(() => loadConfigFromEnv({ [ENV_VARS.pat]: 'pat' })).toThrow(
      `${ENV_VARS.baseUrl} is required`
    );
  });

  it('converts JIRA_TIMEOUT from seconds to milliseconds', () => {
    const config = loadConfigFromEnv({ ...BASE, [ENV_VARS.pat]: 'p', [ENV_VARS.timeout]: '45' });

    expect(config.timeout).toBe(45_000);
  });

  it('reads maxRetries and userAgent', () => {
    const config = loadConfigFromEnv({
      ...BASE,
      [ENV_VARS.pat]: 'p',
      [ENV_VARS.maxRetries]: '5',
      [ENV_VARS.userAgent]: 'my-app/1.0',
    });

    expect(config.maxRetries).toBe(5);
    expect(config.userAgent).toBe('my-app/1.0');
  });

  it('omits optional fields that are not set', () => {
    const config = loadConfigFromEnv({ ...BASE, [ENV_VARS.pat]: 'p' });

    expect(config).not.toHaveProperty('timeout');
    expect(config).not.toHaveProperty('maxRetries');
    expect(config).not.toHaveProperty('userAgent');
  });

  it.each(['abc', '-1', '1.5'])('rejects a malformed numeric value %p', (value) => {
    expect(() => loadConfigFromEnv({ ...BASE, [ENV_VARS.pat]: 'p', [ENV_VARS.timeout]: value })).toThrow(
      ConfigValidationError
    );
  });
});

describe('withEnv', () => {
  it('fills in values absent from the explicit config', () => {
    const option = withEnv({ ...BASE, [ENV_VARS.pat]: 'p', [ENV_VARS.maxRetries]: '7' });
    const result = option({ host: 'https://explicit.atlassian.net', auth: createAuthFromEnv({ [ENV_VARS.pat]: 'x' }) });

    expect(result.maxRetries).toBe(7);
  });

  it('lets the explicit config win over the environment', () => {
    const option = withEnv({ ...BASE, [ENV_VARS.pat]: 'p' });
    const auth = createAuthFromEnv({ [ENV_VARS.pat]: 'x' });
    const result = option({ host: 'https://explicit.atlassian.net', auth });

    expect(result.host).toBe('https://explicit.atlassian.net');
  });
});
