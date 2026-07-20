import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IssueTypeService } from './issuetype.service.js';
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

function createMockIssueType(id: string, name: string) {
  return {
    id,
    self: `https://example.atlassian.net/rest/api/3/issuetype/${id}`,
    name,
    description: `${name} issues`,
    iconUrl: 'https://example.atlassian.net/images/icons/issuetype.png',
    subtask: false,
    hierarchyLevel: 0,
  };
}

describe('IssueTypeService', () => {
  let service: IssueTypeService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new IssueTypeService(mockHttp, '/rest/api/3');
  });

  describe('list', () => {
    it('should list all issue types', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse([
          createMockIssueType('10001', 'Bug'),
          createMockIssueType('10002', 'Task'),
        ])
      );

      const issueTypes = await service.list();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/issuetype', undefined, undefined);
      expect(issueTypes).toHaveLength(2);
      expect(issueTypes[0]?.name).toBe('Bug');
    });

    it('should throw when the response is invalid', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse([{ id: 10001 }]));

      await expect(service.list()).rejects.toThrow();
    });
  });

  describe('get', () => {
    it('should fetch an issue type by ID', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse(createMockIssueType('10001', 'Bug'))
      );

      const issueType = await service.get('10001');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/issuetype/10001',
        undefined,
        undefined
      );
      expect(issueType.name).toBe('Bug');
    });
  });

  describe('create', () => {
    it('should create an issue type', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse(createMockIssueType('10003', 'Incident'))
      );

      const issueType = await service.create({
        name: 'Incident',
        description: 'Production incident',
        type: 'standard',
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/issuetype',
        expect.objectContaining({ name: 'Incident', type: 'standard' }),
        undefined
      );
      expect(issueType.id).toBe('10003');
    });

    it('should reject an empty name', async () => {
      await expect(service.create({ name: '' })).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update an issue type', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(
        createMockResponse(createMockIssueType('10001', 'Defect'))
      );

      const issueType = await service.update('10001', { name: 'Defect' });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/issuetype/10001',
        { name: 'Defect' },
        undefined
      );
      expect(issueType.name).toBe('Defect');
    });
  });

  describe('deleteIssueType', () => {
    it('should delete an issue type', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteIssueType('10001');

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/issuetype/10001',
        expect.objectContaining({ params: {} })
      );
    });

    it('should pass the alternative issue type ID', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteIssueType('10001', { alternativeIssueTypeId: '10002' });

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/issuetype/10001',
        expect.objectContaining({
          params: expect.objectContaining({ alternativeIssueTypeId: '10002' }),
        })
      );
    });
  });

  describe('listIssueTypeSchemes', () => {
    it('should unwrap the values array', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          values: [{ id: '10000', name: 'Default Issue Type Scheme', isDefault: true }],
          startAt: 0,
          maxResults: 50,
          total: 1,
          isLast: true,
        })
      );

      const schemes = await service.listIssueTypeSchemes();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/issuetypescheme', {}, undefined);
      expect(schemes).toHaveLength(1);
      expect(schemes[0]?.id).toBe('10000');
    });

    it('should pass pagination params', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ values: [] }));

      await service.listIssueTypeSchemes({ startAt: 5, maxResults: 10 });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/issuetypescheme',
        { startAt: 5, maxResults: 10 },
        undefined
      );
    });
  });

  describe('createIssueTypeScheme', () => {
    it('should create an issue type scheme', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse({ id: '10100', name: 'Software Development' })
      );

      const scheme = await service.createIssueTypeScheme({
        name: 'Software Development',
        defaultIssueTypeId: '10001',
        issueTypeIds: ['10001', '10002'],
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/issuetypescheme',
        expect.objectContaining({
          name: 'Software Development',
          issueTypeIds: ['10001', '10002'],
        }),
        undefined
      );
      expect(scheme.id).toBe('10100');
    });

    it('should reject an empty scheme name', async () => {
      await expect(
        service.createIssueTypeScheme({ name: '', issueTypeIds: ['10001'] })
      ).rejects.toThrow();
    });
  });

  describe('updateIssueTypeScheme', () => {
    it('should PUT the update', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(null));

      await service.updateIssueTypeScheme('10100', { name: 'Updated Scheme' });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/issuetypescheme/10100',
        { name: 'Updated Scheme' },
        undefined
      );
    });
  });

  describe('deleteIssueTypeScheme', () => {
    it('should delete an issue type scheme', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteIssueTypeScheme('10100');

      expect(mockHttp.delete).toHaveBeenCalledWith('/rest/api/3/issuetypescheme/10100', undefined);
    });
  });

  describe('addIssueTypesToScheme', () => {
    it('should PUT the issue type IDs', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(null));

      await service.addIssueTypesToScheme('10100', { issueTypeIds: ['10004', '10005'] });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/issuetypescheme/10100/issuetype',
        { issueTypeIds: ['10004', '10005'] },
        undefined
      );
    });

    it('should reject an empty issue type ID list', async () => {
      await expect(service.addIssueTypesToScheme('10100', { issueTypeIds: [] })).rejects.toThrow();
    });
  });

  describe('removeIssueTypeFromScheme', () => {
    it('should delete the issue type from the scheme', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.removeIssueTypeFromScheme('10100', '10004');

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/issuetypescheme/10100/issuetype/10004',
        undefined
      );
    });
  });

  describe('getIssueTypeSchemeMappings', () => {
    it('should unwrap the values array', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          values: [{ issueTypeSchemeId: '10100', issueTypeId: '10001' }],
        })
      );

      const mappings = await service.getIssueTypeSchemeMappings();

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/issuetypescheme/mapping',
        {},
        undefined
      );
      expect(mappings[0]?.issueTypeId).toBe('10001');
    });

    it('should pass scheme IDs as repeated issueTypeSchemeId params', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ values: [] }));

      await service.getIssueTypeSchemeMappings({
        issueTypeSchemeIds: ['10100', '10101'],
        startAt: 0,
        maxResults: 50,
      });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/issuetypescheme/mapping',
        {
          issueTypeSchemeId: ['10100', '10101'],
          startAt: 0,
          maxResults: 50,
        },
        undefined
      );
    });

    it('should throw when the response shape is invalid', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ values: [{ issueTypeSchemeId: 10100 }] })
      );

      await expect(service.getIssueTypeSchemeMappings()).rejects.toThrow();
    });
  });
});
