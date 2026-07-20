import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from './user.service.js';
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

function createMockUser(accountId: string, name: string) {
  return {
    self: `https://example.atlassian.net/rest/api/3/user?accountId=${accountId}`,
    accountId,
    displayName: name,
    active: true,
    emailAddress: `${name.toLowerCase().replace(' ', '.')}@example.com`,
    avatarUrls: {
      '48x48': 'https://example.com/avatar.png',
      '24x24': 'https://example.com/avatar-24.png',
      '16x16': 'https://example.com/avatar-16.png',
      '32x32': 'https://example.com/avatar-32.png',
    },
  };
}

describe('UserService', () => {
  let service: UserService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new UserService(mockHttp, '/rest/api/3');
  });

  describe('getCurrentUser', () => {
    it('should fetch the current user', async () => {
      const mockUser = createMockUser('user123', 'John Doe');

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUser));

      // eslint-disable-next-line @typescript-eslint/no-deprecated -- the deprecated method stays supported, so it stays tested
      const user = await service.getCurrentUser();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/myself', {}, undefined);
      expect(user.accountId).toBe('user123');
      expect(user.displayName).toBe('John Doe');
    });

    it('should fetch the current user with expand options', async () => {
      const mockUser = createMockUser('user123', 'John Doe');

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUser));

      // eslint-disable-next-line @typescript-eslint/no-deprecated -- the deprecated method stays supported, so it stays tested
      await service.getCurrentUser({ expand: ['groups', 'applicationRoles'] });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/myself',
        expect.objectContaining({
          expand: 'groups,applicationRoles',
        }),
        undefined
      );
    });
  });

  describe('get', () => {
    it('should fetch a user by account ID', async () => {
      const mockUser = createMockUser('user456', 'Jane Smith');

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUser));

      const user = await service.get('user456');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user',
        expect.objectContaining({
          accountId: 'user456',
        }),
        undefined
      );
      expect(user.accountId).toBe('user456');
    });
  });

  describe('search', () => {
    it('should search for users by query', async () => {
      const mockUsers = [
        createMockUser('user1', 'John Doe'),
        createMockUser('user2', 'John Smith'),
      ];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUsers));

      const users = await service.search({ query: 'john' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/search',
        expect.objectContaining({
          query: 'john',
        }),
        undefined
      );
      expect(users).toHaveLength(2);
    });

    it('should search with pagination', async () => {
      const mockUsers = [createMockUser('user1', 'Test User')];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUsers));

      await service.search({
        query: 'test',
        startAt: 10,
        maxResults: 20,
      });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/search',
        expect.objectContaining({
          query: 'test',
          startAt: 10,
          maxResults: 20,
        }),
        undefined
      );
    });
  });

  describe('getAssignable', () => {
    it('should get users assignable to a project', async () => {
      const mockUsers = [
        createMockUser('user1', 'Developer 1'),
        createMockUser('user2', 'Developer 2'),
      ];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUsers));

      const users = await service.getAssignable({ project: 'PROJECT' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/assignable/search',
        expect.objectContaining({
          project: 'PROJECT',
        }),
        undefined
      );
      expect(users).toHaveLength(2);
    });

    it('should get users assignable to an issue', async () => {
      const mockUsers = [createMockUser('user1', 'Developer 1')];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUsers));

      await service.getAssignable({ issueKey: 'PROJECT-123' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/assignable/search',
        expect.objectContaining({
          issueKey: 'PROJECT-123',
        }),
        undefined
      );
    });
  });

  describe('getAssignableForProject', () => {
    it('should be a convenience method for getAssignable with project', async () => {
      const mockUsers = [createMockUser('user1', 'Developer 1')];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUsers));

      const users = await service.getAssignableForProject('PROJECT', { query: 'dev' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/assignable/search',
        expect.objectContaining({
          project: 'PROJECT',
          query: 'dev',
        }),
        undefined
      );
      expect(users).toHaveLength(1);
    });
  });

  describe('getAssignableForIssue', () => {
    it('should be a convenience method for getAssignable with issue', async () => {
      const mockUsers = [createMockUser('user1', 'Developer 1')];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUsers));

      const users = await service.getAssignableForIssue('PROJECT-123');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/assignable/search',
        expect.objectContaining({
          issueKey: 'PROJECT-123',
        }),
        undefined
      );
      expect(users).toHaveLength(1);
    });
  });

  describe('getProjectMembers', () => {
    it('should get project members', async () => {
      const mockUsers = [
        createMockUser('user1', 'Member 1'),
        createMockUser('user2', 'Member 2'),
        createMockUser('user3', 'Member 3'),
      ];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUsers));

      const users = await service.getProjectMembers('PROJECT');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/viewissue/search',
        expect.objectContaining({
          projectKey: 'PROJECT',
        }),
        undefined
      );
      expect(users).toHaveLength(3);
    });

    it('should search project members with query', async () => {
      const mockUsers = [createMockUser('user1', 'John Member')];

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockUsers));

      await service.getProjectMembers('PROJECT', { query: 'john' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/viewissue/search',
        expect.objectContaining({
          projectKey: 'PROJECT',
          query: 'john',
        }),
        undefined
      );
    });
  });

  describe('bulkGet', () => {
    it('should request multiple account IDs and unwrap the page', async () => {
      const mockPage = {
        maxResults: 50,
        startAt: 0,
        total: 2,
        isLast: true,
        values: [createMockUser('user1', 'User One'), createMockUser('user2', 'User Two')],
      };

      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(mockPage));

      const users = await service.bulkGet({ accountIds: ['user1', 'user2'], maxResults: 50 });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/bulk',
        expect.objectContaining({
          accountId: ['user1', 'user2'],
          maxResults: 50,
        }),
        undefined
      );
      expect(users).toHaveLength(2);
    });

    it('should reject a response that is not a user page', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ values: 'nope' }));

      await expect(service.bulkGet({ accountIds: ['user1'] })).rejects.toThrow();
    });
  });

  describe('default columns', () => {
    it('should get default columns as an ordered list of IDs', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse([
          { label: 'Key', value: 'issuekey' },
          { label: 'Summary', value: 'summary' },
        ])
      );

      const columns = await service.getDefaultColumns('user123');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/columns',
        { accountId: 'user123' },
        undefined
      );
      expect(columns).toEqual(['issuekey', 'summary']);
    });

    it('should set default columns', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(null));

      await service.setDefaultColumns(['issuekey', 'summary']);

      // UserColumnRequestBody wraps the IDs in a `columns` array; the Go SDK
      // sends a bare JSON array.
      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/user/columns',
        { columns: ['issuekey', 'summary'] },
        undefined
      );
    });

    it('should reset default columns', async () => {
      vi.mocked(mockHttp.request).mockResolvedValueOnce(createMockResponse(null));

      await service.resetDefaultColumns('user123');

      expect(mockHttp.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/rest/api/3/user/columns',
        params: { accountId: 'user123' },
      });
    });
  });

  describe('user properties', () => {
    it('should get a user property', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ key: 'theme', value: { mode: 'dark' } })
      );

      const property = await service.getUserProperty('user123', 'theme');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/properties/theme',
        { accountId: 'user123' },
        undefined
      );
      expect(property.value).toEqual({ mode: 'dark' });
    });

    it('should set a user property', async () => {
      vi.mocked(mockHttp.request).mockResolvedValueOnce(createMockResponse(null));

      await service.setUserProperty('user123', 'theme', { mode: 'dark' });

      expect(mockHttp.request).toHaveBeenCalledWith({
        method: 'PUT',
        url: '/rest/api/3/user/properties/theme',
        body: { mode: 'dark' },
        params: { accountId: 'user123' },
      });
    });

    it('should delete a user property', async () => {
      vi.mocked(mockHttp.request).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteUserProperty('user123', 'theme');

      expect(mockHttp.request).toHaveBeenCalledWith({
        method: 'DELETE',
        url: '/rest/api/3/user/properties/theme',
        params: { accountId: 'user123' },
      });
    });

    it('should reject a malformed property response', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ value: 1 }));

      await expect(service.getUserProperty('user123', 'theme')).rejects.toThrow();
    });
  });

  describe('getUserGroups', () => {
    it('should get the groups a user belongs to', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse([
          { name: 'jira-users', self: 'https://example.atlassian.net/rest/api/3/group?groupId=1' },
        ])
      );

      const groups = await service.getUserGroups('user123');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/groups',
        { accountId: 'user123' },
        undefined
      );
      expect(groups[0]?.name).toBe('jira-users');
    });
  });

  describe('findUsersWithAllPermissions', () => {
    it('should join permissions into a comma-separated param', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse([createMockUser('user1', 'User One')])
      );

      const users = await service.findUsersWithAllPermissions({
        permissions: ['EDIT_ISSUES', 'DELETE_ISSUES'],
        projectKey: 'PROJECT',
        query: 'john',
        maxResults: 10,
      });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/permission/search',
        expect.objectContaining({
          permissions: 'EDIT_ISSUES,DELETE_ISSUES',
          projectKey: 'PROJECT',
          query: 'john',
          maxResults: 10,
        }),
        undefined
      );
      expect(users).toHaveLength(1);
    });
  });

  describe('findUsersWithBrowsePermission', () => {
    it('should search without any filters', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse([]));

      const users = await service.findUsersWithBrowsePermission();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/user/viewissue/search', {}, undefined);
      expect(users).toHaveLength(0);
    });

    it('should pass filters through', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse([createMockUser('user1', 'User One')])
      );

      await service.findUsersWithBrowsePermission({ issueKey: 'PROJECT-1', startAt: 5 });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/viewissue/search',
        expect.objectContaining({ issueKey: 'PROJECT-1', startAt: 5 }),
        undefined
      );
    });
  });

  describe('findByName', () => {
    it('should default to 50 results', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse([createMockUser('user1', 'John Doe')])
      );

      const users = await service.findByName('john');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/user/search',
        expect.objectContaining({ query: 'john', maxResults: 50 }),
        undefined
      );
      expect(users).toHaveLength(1);
    });

    it('should honour an explicit maxResults and ignore invalid values', async () => {
      vi.mocked(mockHttp.get)
        .mockResolvedValueOnce(createMockResponse([]))
        .mockResolvedValueOnce(createMockResponse([]));

      await service.findByName('john', 10);
      await service.findByName('john', 0);

      expect(vi.mocked(mockHttp.get).mock.calls[0]?.[1]).toEqual(
        expect.objectContaining({ maxResults: 10 })
      );
      expect(vi.mocked(mockHttp.get).mock.calls[1]?.[1]).toEqual(
        expect.objectContaining({ maxResults: 50 })
      );
    });
  });
});
