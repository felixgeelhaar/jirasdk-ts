import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PermissionService } from './permission.service.js';
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

function createMockScheme(id = 10000) {
  return {
    id,
    self: `https://example.atlassian.net/rest/api/3/permissionscheme/${String(id)}`,
    name: 'Custom Scheme',
    description: 'Custom permission scheme',
  };
}

function createMockRole(id = 10002) {
  return {
    id,
    self: `https://example.atlassian.net/rest/api/3/project/PROJ/role/${String(id)}`,
    name: 'Developers',
    description: 'Project developers',
    actors: [
      {
        id: 1,
        displayName: 'Alice',
        type: 'atlassian-user-role-actor',
        actorUser: { accountId: 'acc-1' },
      },
    ],
  };
}

describe('PermissionService', () => {
  let service: PermissionService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new PermissionService(mockHttp, '/rest/api/3');
  });

  describe('getAllPermissions', () => {
    it('should fetch all permissions from a keyed object', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          permissions: {
            BROWSE_PROJECTS: {
              key: 'BROWSE_PROJECTS',
              name: 'Browse Projects',
              type: 'PROJECT',
              description: 'Ability to browse projects',
            },
          },
        })
      );

      const permissions = await service.getAllPermissions();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/permissions', undefined, undefined);
      expect(permissions).toHaveLength(1);
      expect(permissions[0]?.key).toBe('BROWSE_PROJECTS');
    });

    it('should fetch all permissions from an array', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          permissions: [{ key: 'ADMINISTER', name: 'Administer Jira', type: 'GLOBAL' }],
        })
      );

      const permissions = await service.getAllPermissions();

      expect(permissions).toHaveLength(1);
      expect(permissions[0]?.name).toBe('Administer Jira');
    });

    it('should throw when the response is invalid', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ nope: true }));

      await expect(service.getAllPermissions()).rejects.toThrow();
    });
  });

  describe('getMyPermissions', () => {
    it('should fetch the current user permissions', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          permissions: {
            EDIT_ISSUES: {
              id: '12',
              key: 'EDIT_ISSUES',
              name: 'Edit Issues',
              type: 'PROJECT',
              havePermission: true,
            },
          },
        })
      );

      const result = await service.getMyPermissions();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/mypermissions', {}, undefined);
      expect(result.permissions['EDIT_ISSUES']?.havePermission).toBe(true);
    });

    it('should build query params from options', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ permissions: {} }));

      await service.getMyPermissions({
        projectKey: 'PROJ',
        projectId: '10000',
        issueKey: 'PROJ-1',
        issueId: '20000',
        permissions: ['EDIT_ISSUES', 'DELETE_ISSUES'],
      });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/mypermissions',
        {
          projectKey: 'PROJ',
          projectId: '10000',
          issueKey: 'PROJ-1',
          issueId: '20000',
          permissions: 'EDIT_ISSUES,DELETE_ISSUES',
        },
        undefined
      );
    });
  });

  describe('listPermissionSchemes', () => {
    it('should list permission schemes', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ permissionSchemes: [createMockScheme()] })
      );

      const schemes = await service.listPermissionSchemes();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/permissionscheme', {}, undefined);
      expect(schemes).toHaveLength(1);
      expect(schemes[0]?.name).toBe('Custom Scheme');
    });

    it('should pass expand values as a repeated query param', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ permissionSchemes: [] }));

      await service.listPermissionSchemes({ expand: ['permissions', 'user'] });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/permissionscheme',
        { expand: ['permissions', 'user'] },
        undefined
      );
    });
  });

  describe('getPermissionScheme', () => {
    it('should fetch a permission scheme by id', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockScheme()));

      const scheme = await service.getPermissionScheme(10000, { expand: ['permissions'] });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/permissionscheme/10000',
        { expand: ['permissions'] },
        undefined
      );
      expect(scheme.id).toBe(10000);
    });
  });

  describe('createPermissionScheme', () => {
    it('should create a permission scheme', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(createMockScheme()));

      const scheme = await service.createPermissionScheme({
        name: 'Custom Scheme',
        description: 'Custom permission scheme',
        permissions: [
          { permission: 'BROWSE_PROJECTS', holder: { type: 'group', parameter: 'jira-users' } },
        ],
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/permissionscheme',
        {
          name: 'Custom Scheme',
          description: 'Custom permission scheme',
          permissions: [
            { permission: 'BROWSE_PROJECTS', holder: { type: 'group', parameter: 'jira-users' } },
          ],
        },
        undefined
      );
      expect(scheme.name).toBe('Custom Scheme');
    });

    it('should reject an empty name', async () => {
      await expect(service.createPermissionScheme({ name: '' })).rejects.toThrow();
    });
  });

  describe('updatePermissionScheme', () => {
    it('should update a permission scheme', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(createMockScheme()));

      await service.updatePermissionScheme(10000, { description: 'Updated' });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/permissionscheme/10000',
        { description: 'Updated' },
        undefined
      );
    });
  });

  describe('deletePermissionScheme', () => {
    it('should delete a permission scheme', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(undefined));

      await service.deletePermissionScheme(10000);

      expect(mockHttp.delete).toHaveBeenCalledWith('/rest/api/3/permissionscheme/10000', undefined);
    });
  });

  describe('getProjectRoles', () => {
    it('should return a map of role name to url', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          Developers: 'https://example.atlassian.net/rest/api/3/project/PROJ/role/10002',
          Administrators: 'https://example.atlassian.net/rest/api/3/project/PROJ/role/10004',
        })
      );

      const roles = await service.getProjectRoles('PROJ');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/project/PROJ/role',
        undefined,
        undefined
      );
      expect(roles['Developers']).toContain('/role/10002');
    });

    it('should throw when the response is not a string map', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ Developers: 42 }));

      await expect(service.getProjectRoles('PROJ')).rejects.toThrow();
    });
  });

  describe('getProjectRole', () => {
    it('should fetch a project role', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockRole()));

      const role = await service.getProjectRole('PROJ', 10002);

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/project/PROJ/role/10002',
        undefined,
        undefined
      );
      expect(role.actors?.[0]?.actorUser?.accountId).toBe('acc-1');
    });
  });

  describe('addActorsToProjectRole', () => {
    it('should add users and groups to a role', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(createMockRole()));

      await service.addActorsToProjectRole('PROJ', 10002, {
        user: ['acc-1'],
        group: ['developers'],
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/project/PROJ/role/10002',
        { user: ['acc-1'], group: ['developers'] },
        undefined
      );
    });
  });

  describe('removeActorFromProjectRole', () => {
    it('should remove a user actor via query param', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(undefined));

      await service.removeActorFromProjectRole('PROJ', 10002, 'user', 'acc-1');

      expect(mockHttp.delete).toHaveBeenCalledWith('/rest/api/3/project/PROJ/role/10002', {
        params: { user: 'acc-1' },
      });
    });

    it('should remove a group actor via query param', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(undefined));

      await service.removeActorFromProjectRole('PROJ', 10002, 'group', 'developers');

      expect(mockHttp.delete).toHaveBeenCalledWith('/rest/api/3/project/PROJ/role/10002', {
        params: { group: 'developers' },
      });
    });
  });
});
