import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectService } from './project.service.js';
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
      vi.mocked(mockHttp.request).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteProject('PROJECT');

      expect(mockHttp.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/rest/api/3/project/PROJECT',
        params: {},
      });
    });

    it('should delete a project with undo enabled', async () => {
      vi.mocked(mockHttp.request).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteProject('PROJECT', { enableUndo: true });

      expect(mockHttp.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: '/rest/api/3/project/PROJECT',
          params: { enableUndo: true },
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

  describe('components', () => {
    const mockComponent = {
      self: 'https://example.atlassian.net/rest/api/3/component/10000',
      id: '10000',
      name: 'Frontend',
      description: 'Frontend components',
      project: 'PROJECT',
      projectId: 10000,
      assigneeType: 'PROJECT_DEFAULT',
    };

    it('should create a component', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(mockComponent));

      const result = await service.createComponent({
        name: 'Frontend',
        project: 'PROJECT',
        description: 'Frontend components',
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/component',
        expect.objectContaining({ name: 'Frontend', project: 'PROJECT' }),
        undefined
      );
      expect(result.id).toBe('10000');
    });

    it('should reject a component input without a name', async () => {
      await expect(service.createComponent({ name: '', project: 'PROJECT' })).rejects.toThrow();
    });

    it('should update a component', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(
        createMockResponse({ ...mockComponent, name: 'UI' })
      );

      const result = await service.updateComponent('10000', { name: 'UI' });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/component/10000',
        { name: 'UI' },
        undefined
      );
      expect(result.name).toBe('UI');
    });

    it('should get a component', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockComponent));

      const result = await service.getComponent('10000');

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/component/10000', undefined, undefined);
      expect(result.name).toBe('Frontend');
    });

    it('should delete a component', async () => {
      vi.mocked(mockHttp.request).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteComponent('10000', { moveIssuesTo: '10001' });

      expect(mockHttp.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/rest/api/3/component/10000',
        params: { moveIssuesTo: '10001' },
      });
    });

    it('should list project components', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse([mockComponent]));

      const result = await service.listProjectComponents('PROJECT');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/project/PROJECT/components',
        undefined,
        undefined
      );
      expect(result).toHaveLength(1);
    });

    it('should reject an invalid component response', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ id: 10000 }));

      await expect(service.getComponent('10000')).rejects.toThrow();
    });
  });

  describe('versions', () => {
    const mockVersion = {
      self: 'https://example.atlassian.net/rest/api/3/version/10000',
      id: '10000',
      name: 'v1.0.0',
      description: 'First release',
      archived: false,
      released: false,
      releaseDate: '2024-12-31',
      projectId: 10000,
    };

    it('should create a version', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(mockVersion));

      const result = await service.createVersion({
        name: 'v1.0.0',
        project: 'PROJECT',
        releaseDate: '2024-12-31',
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/version',
        expect.objectContaining({ name: 'v1.0.0', project: 'PROJECT', releaseDate: '2024-12-31' }),
        undefined
      );
      expect(result.name).toBe('v1.0.0');
    });

    it('should reject a release date that is not YYYY-MM-DD', async () => {
      await expect(
        service.createVersion({ name: 'v1', project: 'PROJECT', releaseDate: '31-12-2024' })
      ).rejects.toThrow();
    });

    it('should update a version', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(
        createMockResponse({ ...mockVersion, released: true })
      );

      const result = await service.updateVersion('10000', { released: true });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/version/10000',
        { released: true },
        undefined
      );
      expect(result.released).toBe(true);
    });

    it('should get a version with expand options', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockVersion));

      const result = await service.getVersion('10000', { expand: ['operations'] });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/version/10000',
        { expand: 'operations' },
        undefined
      );
      expect(result.id).toBe('10000');
    });

    it('should delete a version', async () => {
      vi.mocked(mockHttp.request).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteVersion('10000', { moveFixIssuesTo: '10001' });

      expect(mockHttp.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/rest/api/3/version/10000',
        params: { moveFixIssuesTo: '10001' },
      });
    });

    it('should list project versions', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse([mockVersion]));

      const result = await service.listProjectVersions('PROJECT');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/project/PROJECT/versions',
        undefined,
        undefined
      );
      expect(result).toHaveLength(1);
    });

    it('should reject an invalid version response', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ id: 10000 }));

      await expect(service.getVersion('10000')).rejects.toThrow();
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
