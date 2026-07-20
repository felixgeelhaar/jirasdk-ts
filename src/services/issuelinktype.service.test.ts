import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IssueLinkTypeService } from './issuelinktype.service.js';
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

function createMockLinkType(id: string, name: string) {
  return {
    id,
    name,
    inward: 'is blocked by',
    outward: 'blocks',
    self: `https://example.atlassian.net/rest/api/3/issueLinkType/${id}`,
  };
}

describe('IssueLinkTypeService', () => {
  let service: IssueLinkTypeService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new IssueLinkTypeService(mockHttp, '/rest/api/3');
  });

  describe('list', () => {
    it('should unwrap the issueLinkTypes array', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          issueLinkTypes: [
            createMockLinkType('10000', 'Blocks'),
            createMockLinkType('10001', 'Relates'),
          ],
        })
      );

      const linkTypes = await service.list();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/issueLinkType', undefined, undefined);
      expect(linkTypes).toHaveLength(2);
      expect(linkTypes[0]?.name).toBe('Blocks');
    });

    it('should throw when the response shape is invalid', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ values: [] }));

      await expect(service.list()).rejects.toThrow();
    });
  });

  describe('get', () => {
    it('should fetch a link type by ID', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse(createMockLinkType('10000', 'Blocks'))
      );

      const linkType = await service.get('10000');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/issueLinkType/10000',
        undefined,
        undefined
      );
      expect(linkType.name).toBe('Blocks');
    });
  });

  describe('create', () => {
    it('should create a link type', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse(createMockLinkType('10002', 'Dependency'))
      );

      const linkType = await service.create({
        name: 'Dependency',
        inward: 'depends on',
        outward: 'is depended on by',
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/issueLinkType',
        {
          name: 'Dependency',
          inward: 'depends on',
          outward: 'is depended on by',
        },
        undefined
      );
      expect(linkType.id).toBe('10002');
    });

    it('should reject missing inward/outward descriptions', async () => {
      await expect(
        service.create({ name: 'Dependency', inward: '', outward: '' })
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a link type', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(
        createMockResponse(createMockLinkType('10000', 'Updated Dependency'))
      );

      const linkType = await service.update('10000', { name: 'Updated Dependency' });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/issueLinkType/10000',
        { name: 'Updated Dependency' },
        undefined
      );
      expect(linkType.name).toBe('Updated Dependency');
    });
  });

  describe('deleteIssueLinkType', () => {
    it('should delete a link type', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteIssueLinkType('10000');

      expect(mockHttp.delete).toHaveBeenCalledWith('/rest/api/3/issueLinkType/10000', undefined);
    });
  });
});
