import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResolutionService } from './resolution.service.js';
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

function createMockResolution(id: string, name: string) {
  return {
    id,
    self: `https://example.atlassian.net/rest/api/3/resolution/${id}`,
    name,
    description: `${name} resolution`,
    isDefault: false,
  };
}

describe('ResolutionService', () => {
  let service: ResolutionService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new ResolutionService(mockHttp, '/rest/api/3');
  });

  describe('list', () => {
    it('should list all resolutions', async () => {
      const mockResolutions = [
        createMockResolution('1', 'Fixed'),
        createMockResolution('2', 'Duplicate'),
      ];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockResolutions));

      const resolutions = await service.list();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/resolution', undefined, undefined);
      expect(resolutions).toHaveLength(2);
    });

    it('should throw when the response is invalid', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse([{ name: 'No id' }]));

      await expect(service.list()).rejects.toThrow();
    });
  });

  describe('get', () => {
    it('should fetch a resolution by ID', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse(createMockResolution('1', 'Fixed'))
      );

      const resolution = await service.get('1');

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/resolution/1', undefined, undefined);
      expect(resolution.name).toBe('Fixed');
    });
  });

  describe('create', () => {
    it('should create a resolution', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse(createMockResolution('3', 'Deferred'))
      );

      const resolution = await service.create({
        name: 'Deferred',
        description: 'Issue deferred to future release',
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/resolution',
        expect.objectContaining({ name: 'Deferred' }),
        undefined
      );
      expect(resolution.id).toBe('3');
    });

    it('should reject an empty name', async () => {
      await expect(service.create({ name: '' })).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a resolution', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(
        createMockResponse(createMockResolution('1', 'Updated Deferred'))
      );

      const resolution = await service.update('1', { name: 'Updated Deferred' });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/resolution/1',
        expect.objectContaining({ name: 'Updated Deferred' }),
        undefined
      );
      expect(resolution.name).toBe('Updated Deferred');
    });
  });

  describe('deleteResolution', () => {
    it('should delete a resolution with a replacement', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteResolution('1', '2');

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/resolution/1',
        expect.objectContaining({ params: { replaceWith: '2' } })
      );
    });
  });

  describe('setDefault', () => {
    it('should set the default resolution', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(null));

      await service.setDefault('1');

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/resolution/default',
        { id: '1' },
        undefined
      );
    });
  });
});
