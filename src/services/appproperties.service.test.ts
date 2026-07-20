import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppPropertiesService } from './appproperties.service.js';
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

function createMockProperty(id: string) {
  return {
    id,
    key: id,
    value: 'CLONE -',
    name: 'Clone prefix',
    desc: 'Prefix used for cloned issues',
    type: 'string',
    defaultValue: 'CLONE -',
    example: 'CLONE -',
  };
}

describe('AppPropertiesService', () => {
  let service: AppPropertiesService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new AppPropertiesService(mockHttp, '/rest/api/3');
  });

  describe('getAdvancedSettings', () => {
    it('should fetch all advanced settings', async () => {
      const mockProperties = [
        createMockProperty('jira.clone.prefix'),
        createMockProperty('jira.x'),
      ];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockProperties));

      const properties = await service.getAdvancedSettings();

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/application-properties/advanced-settings',
        undefined,
        undefined
      );
      expect(properties).toHaveLength(2);
    });

    it('should throw when the response is invalid', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse([{ value: 'no id' }]));

      await expect(service.getAdvancedSettings()).rejects.toThrow();
    });
  });

  describe('getApplicationProperty', () => {
    it('should fetch a property by key', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse([createMockProperty('jira.clone.prefix')])
      );

      const property = await service.getApplicationProperty('jira.clone.prefix');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/application-properties',
        { key: 'jira.clone.prefix' },
        undefined
      );
      expect(property.id).toBe('jira.clone.prefix');
    });

    it('should throw when no property matches', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse([]));

      await expect(service.getApplicationProperty('missing')).rejects.toThrow(
        'Application property not found: missing'
      );
    });
  });

  describe('setApplicationProperty', () => {
    it('should set a property value', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(null));

      await service.setApplicationProperty({ id: 'jira.clone.prefix', value: 'COPY -' });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/application-properties/jira.clone.prefix',
        { value: 'COPY -' },
        undefined
      );
    });

    it('should reject an empty property ID', async () => {
      await expect(service.setApplicationProperty({ id: '', value: 'x' })).rejects.toThrow();
    });
  });
});
