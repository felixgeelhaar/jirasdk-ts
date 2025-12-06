import { describe, it, expect } from 'vitest';
import {
  ApiTokenAuth,
  BasicAuth,
  PatAuth,
  OAuth2Auth,
  createApiTokenAuth,
  createBasicAuth,
  createPatAuth,
  createOAuth2Auth,
} from './index.js';
import { AuthConfigError, TokenRefreshError } from '../errors/index.js';

describe('ApiTokenAuth', () => {
  it('should create auth with email and token', () => {
    const auth = new ApiTokenAuth({
      email: 'test@example.com',
      apiToken: 'test-token',
    });

    expect(auth.type).toBe('api-token');
    const headers = auth.getAuthHeaders();
    expect(headers['Authorization']).toMatch(/^Basic /);
  });

  it('should throw on empty email', () => {
    expect(
      () =>
        new ApiTokenAuth({
          email: '',
          apiToken: 'test-token',
        })
    ).toThrow(AuthConfigError);
  });

  it('should throw on empty token', () => {
    expect(
      () =>
        new ApiTokenAuth({
          email: 'test@example.com',
          apiToken: '',
        })
    ).toThrow(AuthConfigError);
  });

  it('should be valid', async () => {
    const auth = new ApiTokenAuth({
      email: 'test@example.com',
      apiToken: 'test-token',
    });
    if (auth.isValid) {
      expect(await auth.isValid()).toBe(true);
    }
  });
});

describe('BasicAuth', () => {
  it('should create auth with username and password', () => {
    const auth = new BasicAuth({
      username: 'user',
      password: 'pass',
    });

    expect(auth.type).toBe('basic');
    const headers = auth.getAuthHeaders();
    expect(headers['Authorization']).toMatch(/^Basic /);
  });

  it('should throw on empty username', () => {
    expect(
      () =>
        new BasicAuth({
          username: '',
          password: 'pass',
        })
    ).toThrow(AuthConfigError);
  });
});

describe('PatAuth', () => {
  it('should create auth with PAT', () => {
    const auth = new PatAuth({
      token: 'personal-access-token',
    });

    expect(auth.type).toBe('pat');
    const headers = auth.getAuthHeaders();
    expect(headers['Authorization']).toBe('Bearer personal-access-token');
  });

  it('should throw on empty PAT', () => {
    expect(
      () =>
        new PatAuth({
          token: '',
        })
    ).toThrow(AuthConfigError);
  });
});

describe('OAuth2Auth', () => {
  it('should create auth with access token', async () => {
    const auth = new OAuth2Auth({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      accessToken: 'access-token',
    });

    expect(auth.type).toBe('oauth2');
    const headers = await auth.getAuthHeaders();
    expect(headers['Authorization']).toBe('Bearer access-token');
  });

  it('should detect expiration', () => {
    // expiresAt is a timestamp in milliseconds
    const pastTimestamp = Date.now() - 1000;
    const auth = new OAuth2Auth({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      accessToken: 'access-token',
      expiresAt: pastTimestamp,
    });

    expect(auth.isValid()).toBe(false);
  });

  it('should not need refresh if not expired', () => {
    // 1 hour from now in milliseconds
    const futureTimestamp = Date.now() + 3600000;
    const auth = new OAuth2Auth({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      accessToken: 'access-token',
      expiresAt: futureTimestamp,
    });

    expect(auth.isValid()).toBe(true);
  });

  it('should throw when trying to refresh without refresh token', async () => {
    const auth = new OAuth2Auth({
      clientId: 'client-id',
      clientSecret: 'client-secret',
      accessToken: 'access-token',
    });

    await expect(auth.refresh()).rejects.toThrow(TokenRefreshError);
  });

  it('should return false when no access token', () => {
    const auth = new OAuth2Auth({
      clientId: 'client-id',
      clientSecret: 'client-secret',
    });

    expect(auth.isValid()).toBe(false);
  });
});

describe('Factory functions', () => {
  it('createApiTokenAuth should create ApiTokenAuth', () => {
    const auth = createApiTokenAuth({
      email: 'test@example.com',
      apiToken: 'token',
    });
    expect(auth).toBeInstanceOf(ApiTokenAuth);
  });

  it('createBasicAuth should create BasicAuth', () => {
    const auth = createBasicAuth({
      username: 'user',
      password: 'pass',
    });
    expect(auth).toBeInstanceOf(BasicAuth);
  });

  it('createPatAuth should create PatAuth', () => {
    const auth = createPatAuth({
      token: 'token',
    });
    expect(auth).toBeInstanceOf(PatAuth);
  });

  it('createOAuth2Auth should create OAuth2Auth', () => {
    const auth = createOAuth2Auth({
      clientId: 'client',
      clientSecret: 'secret',
      accessToken: 'token',
    });
    expect(auth).toBeInstanceOf(OAuth2Auth);
  });
});
