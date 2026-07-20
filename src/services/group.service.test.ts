import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GroupService } from './group.service.js';
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

function createMockGroup(name: string) {
  return {
    name,
    groupId: `id-${name}`,
    self: `https://example.atlassian.net/rest/api/3/group?groupId=id-${name}`,
  };
}

function createMockUser(accountId: string) {
  return {
    accountId,
    displayName: `User ${accountId}`,
    active: true,
    accountType: 'atlassian',
    emailAddress: `${accountId}@example.com`,
  };
}

describe('GroupService', () => {
  let service: GroupService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new GroupService(mockHttp, '/rest/api/3');
  });

  describe('find', () => {
    it('should search for groups', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ header: 'Showing 1 of 1', total: 1, groups: [createMockGroup('jira')] })
      );

      const groups = await service.find({ query: 'jira', maxResults: 50 });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/groups/picker',
        { query: 'jira', maxResults: 50 },
        undefined
      );
      expect(groups).toHaveLength(1);
      expect(groups[0]?.name).toBe('jira');
    });

    it('should support exclude and userName', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ groups: [] }));

      await service.find({ exclude: 'admins', userName: 'alice' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/groups/picker',
        { exclude: 'admins', userName: 'alice' },
        undefined
      );
    });

    it('should throw when the response fails validation', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ groups: [{ id: 1 }] }));

      await expect(service.find()).rejects.toThrow();
    });
  });

  describe('get', () => {
    it('should fetch a group by name with expand', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          ...createMockGroup('jira-administrators'),
          users: { size: 1, items: [createMockUser('5b10a')], maxResults: 50, startAt: 0 },
        })
      );

      const group = await service.get({ groupname: 'jira-administrators', expand: ['users'] });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/group',
        { groupname: 'jira-administrators', expand: ['users'] },
        undefined
      );
      expect(group.users?.items?.[0]?.accountId).toBe('5b10a');
    });

    it('should fetch a group by ID', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockGroup('g')));

      await service.get({ groupId: 'id-g' });

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/group', { groupId: 'id-g' }, undefined);
    });

    it('should require a group identifier', async () => {
      await expect(service.get({})).rejects.toThrow('group name or ID is required');
    });
  });

  describe('create', () => {
    it('should create a group', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse(createMockGroup('my-new-group'))
      );

      const group = await service.create({ name: 'my-new-group' });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/group',
        { name: 'my-new-group' },
        undefined
      );
      expect(group.name).toBe('my-new-group');
    });

    it('should reject an empty name', async () => {
      await expect(service.create({ name: '' })).rejects.toThrow();
    });
  });

  describe('deleteGroup', () => {
    it('should delete a group by name', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(undefined));

      await service.deleteGroup({ groupname: 'my-group' });

      expect(mockHttp.delete).toHaveBeenCalledWith('/rest/api/3/group', {
        params: { groupname: 'my-group' },
      });
    });

    it('should require a group identifier', async () => {
      await expect(service.deleteGroup({})).rejects.toThrow('group name or ID is required');
    });
  });

  describe('getMembers', () => {
    it('should fetch group members', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ values: [createMockUser('5b10a')], total: 1, isLast: true })
      );

      const members = await service.getMembers({
        groupname: 'jira-users',
        maxResults: 50,
        includeInactiveUsers: true,
      });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/group/member',
        { groupname: 'jira-users', maxResults: 50, includeInactiveUsers: true },
        undefined
      );
      expect(members[0]?.accountId).toBe('5b10a');
    });

    it('should require a group identifier', async () => {
      await expect(service.getMembers({})).rejects.toThrow('group name or ID is required');
    });
  });

  describe('iterateMembers / allMembers', () => {
    it('should page through all members', async () => {
      vi.mocked(mockHttp.get)
        .mockResolvedValueOnce(
          createMockResponse({ values: [createMockUser('a'), createMockUser('b')], total: 3 })
        )
        .mockResolvedValueOnce(createMockResponse({ values: [createMockUser('c')], total: 3 }));

      const ids: string[] = [];
      for await (const user of service.iterateMembers({ groupname: 'g', maxResults: 2 })) {
        ids.push(user.accountId);
      }

      expect(ids).toEqual(['a', 'b', 'c']);
      expect(mockHttp.get).toHaveBeenCalledTimes(2);
    });

    it('should stop on an empty page', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ values: [] }));

      const members = await service.allMembers({ groupname: 'g' });

      expect(members).toEqual([]);
    });

    it('should stop on isLast', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ values: [createMockUser('a')], isLast: true })
      );

      const members = await service.allMembers({ groupname: 'g', maxResults: 1 });

      expect(members.map((u) => u.accountId)).toEqual(['a']);
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('addUser', () => {
    it('should add a user to a group', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse(createMockGroup('jira-users'))
      );

      const group = await service.addUser({
        groupname: 'jira-users',
        accountId: '5b10a2844c20165700ede21g',
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/group/user',
        { accountId: '5b10a2844c20165700ede21g' },
        { params: { groupname: 'jira-users' } }
      );
      expect(group.name).toBe('jira-users');
    });

    it('should require a group identifier', async () => {
      await expect(service.addUser({ accountId: '5b10a' })).rejects.toThrow(
        'group name or ID is required'
      );
    });

    it('should require an account ID', async () => {
      await expect(service.addUser({ groupname: 'g', accountId: '' })).rejects.toThrow(
        'account ID is required'
      );
    });
  });

  describe('removeUser', () => {
    it('should remove a user from a group', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(undefined));

      await service.removeUser({ groupname: 'jira-users', accountId: '5b10a' });

      expect(mockHttp.delete).toHaveBeenCalledWith('/rest/api/3/group/user', {
        params: { groupname: 'jira-users', accountId: '5b10a' },
      });
    });

    it('should accept a username instead of an account ID', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(undefined));

      await service.removeUser({ groupId: 'id-g', username: 'alice' });

      expect(mockHttp.delete).toHaveBeenCalledWith('/rest/api/3/group/user', {
        params: { groupId: 'id-g', username: 'alice' },
      });
    });

    it('should require an account ID or username', async () => {
      await expect(service.removeUser({ groupname: 'g' })).rejects.toThrow(
        'account ID or username is required'
      );
    });
  });

  describe('bulkGet', () => {
    it('should fetch groups in bulk', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          values: [createMockGroup('jira-administrators'), createMockGroup('jira-users')],
          total: 2,
          isLast: true,
        })
      );

      const groups = await service.bulkGet({
        groupName: ['jira-administrators', 'jira-users'],
      });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/group/bulk',
        { groupName: ['jira-administrators', 'jira-users'] },
        undefined
      );
      expect(groups).toHaveLength(2);
    });

    it('should require group names or IDs', async () => {
      await expect(service.bulkGet({})).rejects.toThrow('group names or IDs are required');
    });
  });

  describe('iterateBulk / allBulk', () => {
    it('should page through all bulk results', async () => {
      vi.mocked(mockHttp.get)
        .mockResolvedValueOnce(createMockResponse({ values: [createMockGroup('a')], total: 2 }))
        .mockResolvedValueOnce(createMockResponse({ values: [createMockGroup('b')], total: 2 }));

      const groups = await service.allBulk({ groupId: ['a', 'b'], maxResults: 1 });

      expect(groups.map((g) => g.name)).toEqual(['a', 'b']);
      expect(mockHttp.get).toHaveBeenCalledTimes(2);
    });

    it('should stop on an empty page', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ values: [] }));

      const groups = await service.allBulk({ groupName: ['x'] });

      expect(groups).toEqual([]);
    });
  });
});
