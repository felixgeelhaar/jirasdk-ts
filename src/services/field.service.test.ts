import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FieldService } from './field.service.js';
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

function createMockField(id: string) {
  return {
    id,
    key: id,
    name: 'Story Points',
    custom: true,
    orderable: true,
    navigable: true,
    searchable: true,
    clauseNames: ['cf[10000]'],
    schema: {
      type: 'number',
      custom: 'com.atlassian.jira.plugin.system.customfieldtypes:float',
      customId: 10000,
    },
  };
}

describe('FieldService', () => {
  let service: FieldService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new FieldService(mockHttp, '/rest/api/3');
  });

  describe('list', () => {
    it('should list all fields', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse([createMockField('customfield_10000'), createMockField('summary')])
      );

      const fields = await service.list();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/field', undefined, undefined);
      expect(fields).toHaveLength(2);
      expect(fields[0]?.id).toBe('customfield_10000');
    });

    it('should throw when the response is not an array of fields', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse([{ id: 123 }]));

      await expect(service.list()).rejects.toThrow();
    });
  });

  describe('get', () => {
    it('should fetch a field by ID', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse(createMockField('customfield_10000'))
      );

      const field = await service.get('customfield_10000');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/field/customfield_10000',
        undefined,
        undefined
      );
      expect(field.name).toBe('Story Points');
    });
  });

  describe('create', () => {
    it('should create a custom field', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse(createMockField('customfield_10000'))
      );

      const field = await service.create({
        name: 'Story Points',
        type: 'com.atlassian.jira.plugin.system.customfieldtypes:float',
        searcherKey: 'com.atlassian.jira.plugin.system.customfieldtypes:exactnumber',
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/field',
        expect.objectContaining({
          name: 'Story Points',
          type: 'com.atlassian.jira.plugin.system.customfieldtypes:float',
        }),
        undefined
      );
      expect(field.id).toBe('customfield_10000');
    });

    it('should reject an empty field name', async () => {
      await expect(
        service.create({ name: '', type: 'type', searcherKey: 'searcher' })
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a custom field', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(
        createMockResponse({ ...createMockField('customfield_10000'), name: 'Points' })
      );

      const field = await service.update('customfield_10000', { name: 'Points' });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/field/customfield_10000',
        { name: 'Points' },
        undefined
      );
      expect(field.name).toBe('Points');
    });
  });

  describe('deleteField', () => {
    it('should delete a custom field', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteField('customfield_10000');

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/field/customfield_10000',
        undefined
      );
    });
  });

  describe('listContexts', () => {
    it('should unwrap the values array', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          values: [
            { id: '10100', name: 'Default Context', isGlobalContext: true, isAnyIssueType: true },
          ],
          startAt: 0,
          maxResults: 50,
          total: 1,
          isLast: true,
        })
      );

      const contexts = await service.listContexts('customfield_10000');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/field/customfield_10000/context',
        undefined,
        undefined
      );
      expect(contexts).toHaveLength(1);
      expect(contexts[0]?.id).toBe('10100');
    });
  });

  describe('createContext', () => {
    it('should create a field context', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse({ id: '10100', name: 'Software Context' })
      );

      const context = await service.createContext('customfield_10000', {
        name: 'Software Context',
        projectIds: ['10000'],
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/field/customfield_10000/context',
        expect.objectContaining({ name: 'Software Context', projectIds: ['10000'] }),
        undefined
      );
      expect(context.id).toBe('10100');
    });
  });

  describe('updateContext', () => {
    it('should update a field context', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(
        createMockResponse({ id: '10100', name: 'Renamed' })
      );

      const context = await service.updateContext('customfield_10000', '10100', {
        name: 'Renamed',
      });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/field/customfield_10000/context/10100',
        { name: 'Renamed' },
        undefined
      );
      expect(context.name).toBe('Renamed');
    });
  });

  describe('deleteContext', () => {
    it('should delete a field context', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteContext('customfield_10000', '10100');

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/field/customfield_10000/context/10100',
        undefined
      );
    });
  });

  describe('listOptions', () => {
    it('should unwrap the values array', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          values: [
            { id: '10001', value: 'High', disabled: false },
            { id: 10002, value: 'Low' },
          ],
        })
      );

      const options = await service.listOptions('customfield_10000', '10100');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/field/customfield_10000/context/10100/option',
        undefined,
        undefined
      );
      expect(options).toHaveLength(2);
      expect(options[0]?.value).toBe('High');
    });
  });

  describe('createOption', () => {
    it('should create a field option', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse({ id: '10001', value: 'High Priority' })
      );

      const option = await service.createOption('customfield_10000', '10100', {
        value: 'High Priority',
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/field/customfield_10000/context/10100/option',
        { value: 'High Priority' },
        undefined
      );
      expect(option.value).toBe('High Priority');
    });
  });

  describe('associateContextProjects', () => {
    it('should PUT the project IDs to the context project endpoint', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(null));

      await service.associateContextProjects('customfield_10000', '10100', {
        projectIds: ['10000', '10001'],
      });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/field/customfield_10000/context/10100/project',
        { projectIds: ['10000', '10001'] },
        undefined
      );
    });

    it('should reject an empty project ID list', async () => {
      await expect(
        service.associateContextProjects('customfield_10000', '10100', { projectIds: [] })
      ).rejects.toThrow();
    });
  });

  describe('removeContextProjects', () => {
    it('should POST the project IDs to the remove endpoint', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(null));

      await service.removeContextProjects('customfield_10000', '10100', {
        projectIds: ['10000'],
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/field/customfield_10000/context/10100/project/remove',
        { projectIds: ['10000'] },
        undefined
      );
    });

    it('should reject an empty project ID list', async () => {
      await expect(
        service.removeContextProjects('customfield_10000', '10100', { projectIds: [] })
      ).rejects.toThrow();
    });
  });

  describe('getContextProjectMappings', () => {
    it('should fetch mappings without options', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          values: [{ contextId: '10100', projectId: '10000', isGlobalContext: false }],
        })
      );

      const mappings = await service.getContextProjectMappings('customfield_10000');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/field/customfield_10000/context/projectmapping',
        {},
        undefined
      );
      expect(mappings).toHaveLength(1);
      expect(mappings[0]?.projectId).toBe('10000');
    });

    it('should pass context IDs as repeated contextId params', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ values: [] }));

      await service.getContextProjectMappings('customfield_10000', {
        contextIds: ['10100', '10101'],
        startAt: 10,
        maxResults: 25,
      });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/field/customfield_10000/context/projectmapping',
        {
          contextId: ['10100', '10101'],
          startAt: 10,
          maxResults: 25,
        },
        undefined
      );
    });

    it('should throw when the response shape is invalid', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ notValues: [] }));

      await expect(service.getContextProjectMappings('customfield_10000')).rejects.toThrow();
    });
  });
});
