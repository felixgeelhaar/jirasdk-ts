import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MyselfService } from './myself.service.js';
import type { HttpClient, HttpResponse } from '../transport/index.js';

// Create mock HTTP client
function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    use: vi.fn(),
    getBaseUrl: vi.fn().mockReturnValue('https://example.atlassian.net'),
    getAuth: vi.fn(),
  } as unknown as HttpClient;
}

function createMockResponse<T>(data: T): HttpResponse<T> {
  return {
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    data,
    request: { method: 'GET', url: '/test', headers: {} },
    responseTime: 100,
  };
}

function createMockCurrentUser() {
  return {
    self: 'https://example.atlassian.net/rest/api/3/user?accountId=user123',
    accountId: 'user123',
    accountType: 'atlassian',
    emailAddress: 'user@example.com',
    displayName: 'Test User',
    active: true,
    timeZone: 'Europe/Berlin',
    locale: 'en_US',
    groups: {
      size: 1,
      items: [{ name: 'jira-users', self: 'https://example.atlassian.net/rest/api/3/group' }],
    },
  };
}

describe('MyselfService', () => {
  let service: MyselfService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new MyselfService(mockHttp, '/rest/api/3');
  });

  describe('get', () => {
    it('should fetch the current user', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockCurrentUser()));

      const user = await service.get();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/myself', undefined, undefined);
      expect(user.accountId).toBe('user123');
      expect(user.groups?.size).toBe(1);
    });

    it('should throw when the response is invalid', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ displayName: 'No account id' })
      );

      await expect(service.get()).rejects.toThrow();
    });
  });

  describe('getPreferences', () => {
    it('should fetch the current user preferences', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ locale: 'en_US', timeZone: 'Europe/Berlin' })
      );

      const prefs = await service.getPreferences();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/mypreferences', undefined, undefined);
      expect(prefs.locale).toBe('en_US');
    });
  });

  describe('setPreferences', () => {
    it('should set the current user preferences', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(null));

      await service.setPreferences({ locale: 'en_US', timeZone: 'Europe/Berlin' });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/mypreferences',
        { locale: 'en_US', timeZone: 'Europe/Berlin' },
        undefined
      );
    });
  });

  // `GET /mypreferences?key=` returns the value itself, not a map keyed by
  // preference name as the Go SDK assumes.
  describe('getPreference', () => {
    it('should fetch a single preference value by key', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse('en_US'));

      const value = await service.getPreference('locale');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/mypreferences',
        { key: 'locale' },
        undefined
      );
      expect(value).toBe('en_US');
    });

    it('should coerce non-string scalar preference values', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(true));
      await expect(service.getPreference('jira.user.locale.notice')).resolves.toBe('true');

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(42));
      await expect(service.getPreference('pageSize')).resolves.toBe('42');
    });

    it('should reject a non-scalar response body', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ locale: 'en_US' }));

      await expect(service.getPreference('locale')).rejects.toThrow();
    });
  });

  // The key travels as a query parameter; the body is the bare value, not the
  // `{[key]: value}` object the Go SDK sends.
  describe('setPreference', () => {
    it('should send the raw value as the body with the key as a query param', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(null));

      await service.setPreference('locale', 'en_US');

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/mypreferences',
        'en_US',
        expect.objectContaining({ params: { key: 'locale' } })
      );
    });
  });

  describe('deletePreference', () => {
    it('should delete a single preference', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deletePreference('customSetting');

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/mypreferences',
        expect.objectContaining({ params: { key: 'customSetting' } })
      );
    });
  });
});
