import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilterService } from './filter.service.js';
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

function createMockFilter(id: string, name = `Filter ${id}`) {
  return {
    id,
    self: `https://example.atlassian.net/rest/api/3/filter/${id}`,
    name,
    description: 'A saved search',
    jql: 'project = PROJ',
    favourite: false,
    favouritedCount: 0,
    owner: {
      self: 'https://example.atlassian.net/rest/api/3/user?accountId=user123',
      accountId: 'user123',
      displayName: 'Test User',
      active: true,
    },
  };
}

function createMockPage(values: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    self: 'https://example.atlassian.net/rest/api/3/filter/search',
    startAt: 0,
    maxResults: 50,
    total: values.length,
    isLast: true,
    values,
    ...overrides,
  };
}

describe('FilterService', () => {
  let service: FilterService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new FilterService(mockHttp, '/rest/api/3');
  });

  describe('get', () => {
    it('should fetch a filter by ID', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockFilter('10000')));

      const filter = await service.get('10000');

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/filter/10000', {}, undefined);
      expect(filter.id).toBe('10000');
    });

    it('should pass expand and overrideSharePermissions', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockFilter('10000')));

      await service.get('10000', {
        expand: ['sharedUsers', 'subscriptions'],
        overrideSharePermissions: true,
      });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/filter/10000',
        expect.objectContaining({
          expand: 'sharedUsers,subscriptions',
          overrideSharePermissions: true,
        }),
        undefined
      );
    });

    it('should throw when the response fails validation', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ name: 'no id' }));

      await expect(service.get('10000')).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('should create a filter', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse(createMockFilter('10001', 'My Bugs'))
      );

      const filter = await service.create({
        name: 'My Bugs',
        jql: 'project = PROJ AND type = Bug',
        favourite: true,
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/filter',
        expect.objectContaining({
          name: 'My Bugs',
          jql: 'project = PROJ AND type = Bug',
          favourite: true,
        }),
        undefined
      );
      expect(filter.name).toBe('My Bugs');
    });

    it('should reject input without a name', async () => {
      await expect(service.create({ name: '', jql: 'project = PROJ' })).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a filter', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(
        createMockResponse(createMockFilter('10000', 'Renamed'))
      );

      const filter = await service.update('10000', { name: 'Renamed' });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/filter/10000',
        expect.objectContaining({ name: 'Renamed' }),
        undefined
      );
      expect(filter.name).toBe('Renamed');
    });
  });

  describe('deleteFilter', () => {
    it('should delete a filter', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteFilter('10000');

      expect(mockHttp.delete).toHaveBeenCalledWith('/rest/api/3/filter/10000', undefined);
    });
  });

  describe('list', () => {
    it('should search filters', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse(createMockPage([createMockFilter('1'), createMockFilter('2')]))
      );

      const result = await service.list();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/filter/search', {}, undefined);
      expect(result.values).toHaveLength(2);
    });

    it('should build query params from options', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockPage([])));

      await service.list({
        expand: ['owner', 'jql'],
        includeFavourites: true,
        orderBy: '-name',
        startAt: 25,
        maxResults: 25,
        filterName: 'bug',
        accountId: 'user123',
        groupname: 'jira-users',
        projectId: '10000',
        id: ['1', '2'],
        overrideSharePermissions: true,
      });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/filter/search',
        expect.objectContaining({
          expand: 'owner,jql',
          includeFavourites: true,
          orderBy: '-name',
          startAt: 25,
          maxResults: 25,
          filterName: 'bug',
          accountId: 'user123',
          groupname: 'jira-users',
          projectId: '10000',
          id: ['1', '2'],
          overrideSharePermissions: true,
        }),
        undefined
      );
    });
  });

  describe('iterate / all', () => {
    it('should page through results until isLast', async () => {
      vi.mocked(mockHttp.get)
        .mockResolvedValueOnce(
          createMockResponse(
            createMockPage([createMockFilter('1'), createMockFilter('2')], {
              total: 3,
              isLast: false,
              maxResults: 2,
            })
          )
        )
        .mockResolvedValueOnce(
          createMockResponse(
            createMockPage([createMockFilter('3')], {
              startAt: 2,
              total: 3,
              isLast: true,
              maxResults: 2,
            })
          )
        );

      const ids: string[] = [];
      for await (const filter of service.iterate({ maxResults: 2 })) {
        ids.push(filter.id);
      }

      expect(ids).toEqual(['1', '2', '3']);
      expect(mockHttp.get).toHaveBeenCalledTimes(2);
      expect(vi.mocked(mockHttp.get).mock.calls[1]?.[1]).toEqual(
        expect.objectContaining({ startAt: 2, maxResults: 2 })
      );
    });

    it('should stop on an empty page', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse(createMockPage([], { total: 0, isLast: false }))
      );

      const filters = await service.all();

      expect(filters).toEqual([]);
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });

    it('should collect all filters via all()', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse(createMockPage([createMockFilter('1'), createMockFilter('2')]))
      );

      const filters = await service.all();

      expect(filters.map((f) => f.id)).toEqual(['1', '2']);
    });
  });

  describe('getFavorites', () => {
    it('should get favourite filters', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse([createMockFilter('10000')])
      );

      const filters = await service.getFavorites({ expand: ['owner'] });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/filter/favourite',
        expect.objectContaining({ expand: 'owner' }),
        undefined
      );
      expect(filters).toHaveLength(1);
    });
  });

  describe('getMyFilters', () => {
    it("should get the current user's filters", async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse([createMockFilter('10000')])
      );

      const filters = await service.getMyFilters({ includeFavourites: true });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/filter/my',
        expect.objectContaining({ includeFavourites: true }),
        undefined
      );
      expect(filters).toHaveLength(1);
    });
  });

  describe('setFavorite', () => {
    it('should mark a filter as favourite', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(
        createMockResponse({ ...createMockFilter('10000'), favourite: true })
      );

      const filter = await service.setFavorite('10000');

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/filter/10000/favourite',
        undefined,
        undefined
      );
      expect(filter.favourite).toBe(true);
    });
  });

  describe('removeFavorite', () => {
    it('should remove a filter from favourites', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(
        createMockResponse({ ...createMockFilter('10000'), favourite: false })
      );

      const filter = await service.removeFavorite('10000');

      expect(mockHttp.delete).toHaveBeenCalledWith('/rest/api/3/filter/10000/favourite', undefined);
      expect(filter.favourite).toBe(false);
    });
  });

  describe('getDefaultShareScope', () => {
    it('should return the scope string', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ scope: 'PRIVATE' }));

      const scope = await service.getDefaultShareScope();

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/filter/defaultShareScope',
        undefined,
        undefined
      );
      expect(scope).toBe('PRIVATE');
    });

    it('should throw on an unknown scope value', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ scope: 'NOPE' }));

      await expect(service.getDefaultShareScope()).rejects.toThrow();
    });
  });

  describe('setDefaultShareScope', () => {
    it('should set the default share scope', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse({ scope: 'GLOBAL' }));

      await service.setDefaultShareScope('GLOBAL');

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/filter/defaultShareScope',
        { scope: 'GLOBAL' },
        undefined
      );
    });
  });

  describe('getSharePermission', () => {
    it('should fetch a single share permission', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ id: 12345, type: 'group', group: { name: 'jira-users' } })
      );

      const permission = await service.getSharePermission('10000', 12345);

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/filter/10000/permission/12345',
        undefined,
        undefined
      );
      expect(permission.type).toBe('group');
    });
  });

  describe('addSharePermission', () => {
    it('should add a share permission', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse([{ id: 12345, type: 'group', group: { name: 'jira-users' } }])
      );

      const permissions = await service.addSharePermission('10000', {
        type: 'group',
        groupname: 'jira-users',
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/filter/10000/permission',
        expect.objectContaining({ type: 'group', groupname: 'jira-users' }),
        undefined
      );
      expect(permissions).toHaveLength(1);
    });

    it('should reject a permission without a type', async () => {
      await expect(service.addSharePermission('10000', { type: '' })).rejects.toThrow();
    });
  });

  describe('deleteSharePermission', () => {
    it('should delete a share permission', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteSharePermission('10000', 12345);

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/filter/10000/permission/12345',
        undefined
      );
    });
  });
});
