import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectService } from './project.service.js';
import type { HttpClient, HttpResponse } from '@felixgeelhaar/sdk-core';

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

function createMockProject(key: string) {
  return {
    id: '10001',
    key,
    self: `https://example.atlassian.net/rest/api/3/project/${key}`,
    name: `Project ${key}`,
    projectTypeKey: 'software',
    style: 'classic',
    isPrivate: false,
    simplified: false,
  };
}

describe('ProjectService', () => {
  let service: ProjectService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new ProjectService(mockHttp, '/rest/api/3');
  });

  describe('get', () => {
    it('should fetch a project by key', async () => {
      const mockProject = createMockProject('PROJECT');

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockProject));

      const project = await service.get('PROJECT');

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/project/PROJECT', {}, undefined);
      expect(project.key).toBe('PROJECT');
    });

    it('should fetch a project with expand options', async () => {
      const mockProject = createMockProject('PROJECT');

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockProject));

      await service.get('PROJECT', { expand: ['lead', 'issueTypes'] });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/project/PROJECT',
        expect.objectContaining({
          expand: 'lead,issueTypes',
        }),
        undefined
      );
    });
  });

  describe('list', () => {
    it('should list all projects', async () => {
      const mockResult = {
        self: 'https://example.atlassian.net/rest/api/3/project/search',
        maxResults: 50,
        startAt: 0,
        total: 2,
        isLast: true,
        values: [createMockProject('PROJ1'), createMockProject('PROJ2')],
      };

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockResult));

      const result = await service.list();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/project/search', {}, undefined);
      expect(result.values).toHaveLength(2);
    });

    it('should list projects with search options', async () => {
      const mockResult = {
        self: 'https://example.atlassian.net/rest/api/3/project/search',
        maxResults: 10,
        startAt: 0,
        total: 1,
        isLast: true,
        values: [createMockProject('PROJ1')],
      };

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockResult));

      await service.list({
        maxResults: 10,
        query: 'test',
        typeKey: 'software',
      });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/project/search',
        expect.objectContaining({
          maxResults: 10,
          query: 'test',
          typeKey: 'software',
        }),
        undefined
      );
    });
  });

  describe('create', () => {
    it('should create a new project', async () => {
      const mockProject = createMockProject('NEWPROJ');

      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(mockProject));

      const result = await service.create({
        key: 'NEWPROJ',
        name: 'New Project',
        projectTypeKey: 'software',
        leadAccountId: 'user123',
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/project',
        expect.objectContaining({
          key: 'NEWPROJ',
          name: 'New Project',
          projectTypeKey: 'software',
        }),
        undefined
      );
      expect(result.key).toBe('NEWPROJ');
    });
  });

  describe('update', () => {
    it('should update a project', async () => {
      const mockProject = {
        ...createMockProject('PROJECT'),
        name: 'Updated Project Name',
      };

      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(mockProject));

      const result = await service.update('PROJECT', {
        name: 'Updated Project Name',
      });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/project/PROJECT',
        expect.objectContaining({
          name: 'Updated Project Name',
        }),
        undefined
      );
      expect(result.name).toBe('Updated Project Name');
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteProject('PROJECT');

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/project/PROJECT',
        expect.anything()
      );
    });

    it('should delete a project with undo enabled', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteProject('PROJECT', { enableUndo: true });

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/project/PROJECT',
        expect.objectContaining({
          params: expect.objectContaining({
            enableUndo: true,
          }),
        })
      );
    });
  });

  describe('archive', () => {
    it('should archive a project', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(null));

      await service.archive('PROJECT');

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/project/PROJECT/archive',
        undefined,
        undefined
      );
    });
  });

  describe('restore', () => {
    it('should restore an archived project', async () => {
      const mockProject = createMockProject('PROJECT');

      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(mockProject));

      const result = await service.restore('PROJECT');

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/project/PROJECT/restore',
        undefined,
        undefined
      );
      expect(result.key).toBe('PROJECT');
    });
  });

  describe('getRecent', () => {
    it('should get recent projects', async () => {
      const mockProjects = [createMockProject('PROJ1'), createMockProject('PROJ2')];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockProjects));

      const result = await service.getRecent();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/project/recent', {}, undefined);
      expect(result).toHaveLength(2);
    });
  });
});
