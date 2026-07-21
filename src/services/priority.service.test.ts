import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PriorityService } from './priority.service.js';
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

function createMockPriority(id: string, name: string) {
  return {
    id,
    self: `https://example.atlassian.net/rest/api/3/priority/${id}`,
    name,
    description: `${name} priority`,
    iconUrl: 'https://example.atlassian.net/images/icons/priorities/high.svg',
    statusColor: '#FF0000',
    isDefault: false,
  };
}

describe('PriorityService', () => {
  let service: PriorityService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new PriorityService(mockHttp, '/rest/api/3');
  });

  describe('list', () => {
    it('should list all priorities', async () => {
      const mockPriorities = [createMockPriority('1', 'High'), createMockPriority('2', 'Low')];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockPriorities));

      const priorities = await service.list();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/priority', undefined, undefined);
      expect(priorities).toHaveLength(2);
    });

    it('should throw when the response is invalid', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse([{ id: '1' }]));

      await expect(service.list()).rejects.toThrow();
    });
  });

  describe('get', () => {
    it('should fetch a priority by ID', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse(createMockPriority('1', 'High'))
      );

      const priority = await service.get('1');

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/priority/1', undefined, undefined);
      expect(priority.name).toBe('High');
    });
  });

  describe('create', () => {
    it('should create a priority', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse(createMockPriority('3', 'Critical'))
      );

      const priority = await service.create({
        name: 'Critical',
        description: 'Critical priority for urgent issues',
        statusColor: '#FF0000',
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/priority',
        expect.objectContaining({ name: 'Critical', statusColor: '#FF0000' }),
        undefined
      );
      expect(priority.id).toBe('3');
    });

    it('should reject an empty name', async () => {
      await expect(service.create({ name: '' })).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a priority', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(
        createMockResponse(createMockPriority('1', 'Updated Critical'))
      );

      const priority = await service.update('1', { name: 'Updated Critical' });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/priority/1',
        expect.objectContaining({ name: 'Updated Critical' }),
        undefined
      );
      expect(priority.name).toBe('Updated Critical');
    });
  });

  describe('deletePriority', () => {
    it('should delete a priority with a replacement', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deletePriority('1', '2');

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/priority/1',
        expect.objectContaining({ params: { replaceWith: '2' } })
      );
    });
  });

  describe('setDefault', () => {
    it('should set the default priority', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(null));

      await service.setDefault('3');

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/priority/default',
        { id: '3' },
        undefined
      );
    });
  });
});
