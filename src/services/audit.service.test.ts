import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from './audit.service.js';
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

function createMockAuditRecord(id: number) {
  return {
    id,
    summary: 'User added to group',
    remoteAddress: '192.168.0.1',
    authorKey: 'admin',
    created: '2024-01-15T10:30:00.000+0000',
    category: 'group management',
    eventSource: 'Jira Connect Plugin',
    objectItem: {
      id: '10000',
      name: 'jira-users',
      typeName: 'GROUP',
    },
    changedValues: [{ fieldName: 'name', changedFrom: 'old', changedTo: 'new' }],
    associatedItems: [{ id: '5b10a', name: 'alice', typeName: 'USER' }],
  };
}

describe('AuditService', () => {
  let service: AuditService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new AuditService(mockHttp, '/rest/api/3');
  });

  describe('list', () => {
    it('should fetch audit records', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ offset: 0, limit: 100, total: 1, records: [createMockAuditRecord(1)] })
      );

      const records = await service.list();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/auditing/record', {}, undefined);
      expect(records).toHaveLength(1);
      expect(records[0]?.summary).toBe('User added to group');
      expect(records[0]?.objectItem?.typeName).toBe('GROUP');
      expect(records[0]?.changedValues?.[0]?.fieldName).toBe('name');
      expect(records[0]?.associatedItems?.[0]?.name).toBe('alice');
    });

    it('should build query params from options', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ records: [] }));

      await service.list({
        offset: 20,
        limit: 50,
        filter: 'user_management',
        from: '2024-01-01T00:00:00Z',
        to: '2024-02-01T00:00:00Z',
      });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/auditing/record',
        {
          offset: 20,
          limit: 50,
          filter: 'user_management',
          from: '2024-01-01T00:00:00Z',
          to: '2024-02-01T00:00:00Z',
        },
        undefined
      );
    });

    it('should throw when the response fails validation', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ records: [{ id: 'not-a-number', summary: 'x', created: 'y' }] })
      );

      await expect(service.list()).rejects.toThrow();
    });
  });

  describe('iterate / all', () => {
    it('should page through all audit records', async () => {
      vi.mocked(mockHttp.get)
        .mockResolvedValueOnce(
          createMockResponse({
            total: 3,
            records: [createMockAuditRecord(1), createMockAuditRecord(2)],
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({ total: 3, records: [createMockAuditRecord(3)] })
        );

      const ids: number[] = [];
      for await (const record of service.iterate({ limit: 2 })) {
        ids.push(record.id);
      }

      expect(ids).toEqual([1, 2, 3]);
      expect(mockHttp.get).toHaveBeenNthCalledWith(
        1,
        '/rest/api/3/auditing/record',
        { offset: 0, limit: 2 },
        undefined
      );
      expect(mockHttp.get).toHaveBeenNthCalledWith(
        2,
        '/rest/api/3/auditing/record',
        { offset: 2, limit: 2 },
        undefined
      );
    });

    it('should stop on an empty page', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ records: [] }));

      const records = await service.all();

      expect(records).toEqual([]);
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });

    it('should stop on a short page when total is absent', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ records: [createMockAuditRecord(1)] })
      );

      const records = await service.all({ limit: 2, filter: 'user_management' });

      expect(records).toHaveLength(1);
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });
  });
});
