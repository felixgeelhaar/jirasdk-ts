import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from './dashboard.service.js';
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

function createMockDashboard(id: string, name = `Dashboard ${id}`) {
  return {
    id,
    name,
    description: 'A dashboard',
    self: `https://example.atlassian.net/rest/api/3/dashboard/${id}`,
    isFavourite: false,
    isWritable: true,
    systemDashboard: false,
    view: `https://example.atlassian.net/secure/Dashboard.jspa?selectPageId=${id}`,
    owner: {
      self: 'https://example.atlassian.net/rest/api/3/user?accountId=user123',
      accountId: 'user123',
      displayName: 'Test User',
      active: true,
    },
  };
}

function createMockGadget(id: number, title = `Gadget ${String(id)}`) {
  return {
    id,
    moduleKey: 'com.atlassian.jira.gadgets:filter-results',
    color: 'blue',
    position: { row: 0, column: 0 },
    title,
  };
}

function createMockPage(dashboards: unknown[], overrides: Record<string, unknown> = {}) {
  return {
    startAt: 0,
    maxResults: 50,
    total: dashboards.length,
    dashboards,
    ...overrides,
  };
}

describe('DashboardService', () => {
  let service: DashboardService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new DashboardService(mockHttp, '/rest/api/3');
  });

  describe('list', () => {
    it('should list dashboards', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse(
          createMockPage([createMockDashboard('10000'), createMockDashboard('10001')])
        )
      );

      const result = await service.list();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/dashboard', {}, undefined);
      expect(result.dashboards).toHaveLength(2);
    });

    it('should build query params from options', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockPage([])));

      await service.list({ filter: 'favourite', startAt: 10, maxResults: 25 });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/dashboard',
        expect.objectContaining({ filter: 'favourite', startAt: 10, maxResults: 25 }),
        undefined
      );
    });

    it('should throw when the response fails validation', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ startAt: 0 }));

      await expect(service.list()).rejects.toThrow();
    });
  });

  describe('iterate / all', () => {
    it('should page through results until total is reached', async () => {
      vi.mocked(mockHttp.get)
        .mockResolvedValueOnce(
          createMockResponse(
            createMockPage([createMockDashboard('1'), createMockDashboard('2')], {
              total: 3,
              maxResults: 2,
            })
          )
        )
        .mockResolvedValueOnce(
          createMockResponse(
            createMockPage([createMockDashboard('3')], {
              startAt: 2,
              total: 3,
              maxResults: 2,
            })
          )
        );

      const ids: Array<string | undefined> = [];
      for await (const dashboard of service.iterate({ maxResults: 2 })) {
        ids.push(dashboard.id);
      }

      expect(ids).toEqual(['1', '2', '3']);
      expect(mockHttp.get).toHaveBeenCalledTimes(2);
      expect(vi.mocked(mockHttp.get).mock.calls[1]?.[1]).toEqual(
        expect.objectContaining({ startAt: 2, maxResults: 2 })
      );
    });

    it('should collect all dashboards via all()', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse(createMockPage([createMockDashboard('1'), createMockDashboard('2')]))
      );

      const dashboards = await service.all();

      expect(dashboards.map((d) => d.id)).toEqual(['1', '2']);
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });

    it('should stop on an empty page', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse(createMockPage([], { total: 10 }))
      );

      const dashboards = await service.all();

      expect(dashboards).toEqual([]);
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('get', () => {
    it('should fetch a dashboard by ID', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse(createMockDashboard('10000'))
      );

      const dashboard = await service.get('10000');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/dashboard/10000',
        undefined,
        undefined
      );
      expect(dashboard.id).toBe('10000');
    });
  });

  describe('create', () => {
    it('should create a dashboard', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse(createMockDashboard('10002', 'My Dashboard'))
      );

      const dashboard = await service.create({
        name: 'My Dashboard',
        description: 'Custom dashboard',
        sharePermissions: [{ type: 'global' }],
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/dashboard',
        expect.objectContaining({
          name: 'My Dashboard',
          description: 'Custom dashboard',
          sharePermissions: [{ type: 'global' }],
        }),
        undefined
      );
      expect(dashboard.name).toBe('My Dashboard');
    });

    it('should reject input without a name', async () => {
      await expect(service.create({ name: '' })).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a dashboard', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(
        createMockResponse({ ...createMockDashboard('10000'), description: 'Updated' })
      );

      const dashboard = await service.update('10000', { description: 'Updated' });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/dashboard/10000',
        expect.objectContaining({ description: 'Updated' }),
        undefined
      );
      expect(dashboard.description).toBe('Updated');
    });
  });

  describe('deleteDashboard', () => {
    it('should delete a dashboard', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.deleteDashboard('10000');

      expect(mockHttp.delete).toHaveBeenCalledWith('/rest/api/3/dashboard/10000', undefined);
    });
  });

  describe('copy', () => {
    it('should copy a dashboard', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse(createMockDashboard('10003', 'Copy of Dashboard'))
      );

      const dashboard = await service.copy('10000', { name: 'Copy of Dashboard' });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/dashboard/10000/copy',
        expect.objectContaining({ name: 'Copy of Dashboard' }),
        undefined
      );
      expect(dashboard.name).toBe('Copy of Dashboard');
    });
  });

  describe('getGadgets', () => {
    it('should return the gadget array', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ gadgets: [createMockGadget(20000), createMockGadget(20001)] })
      );

      const gadgets = await service.getGadgets('10000');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/dashboard/10000/gadget',
        undefined,
        undefined
      );
      expect(gadgets).toHaveLength(2);
    });
  });

  describe('addGadget', () => {
    it('should add a gadget', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse(createMockGadget(20000, 'My Filter'))
      );

      const gadget = await service.addGadget('10000', {
        moduleKey: 'com.atlassian.jira.gadgets:filter-results',
        position: { row: 0, column: 0 },
        title: 'My Filter',
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/dashboard/10000/gadget',
        expect.objectContaining({
          moduleKey: 'com.atlassian.jira.gadgets:filter-results',
          position: { row: 0, column: 0 },
          title: 'My Filter',
        }),
        undefined
      );
      expect(gadget.id).toBe(20000);
    });

    it('should reject a gadget without a module key', async () => {
      await expect(service.addGadget('10000', { moduleKey: '' })).rejects.toThrow();
    });
  });

  describe('updateGadget', () => {
    // The endpoint returns 204 No Content, so nothing is decoded from the
    // response (deviation from the Go SDK, which decodes a gadget).
    it('should update a gadget and return nothing', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(null));

      const result = await service.updateGadget('10000', 20000, {
        title: 'Updated Title',
        position: { row: 1, column: 0 },
      });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/dashboard/10000/gadget/20000',
        expect.objectContaining({
          title: 'Updated Title',
          position: { row: 1, column: 0 },
        }),
        undefined
      );
      expect(result).toBeUndefined();
    });

    it('should not attempt to validate an empty 204 body', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(''));

      await expect(service.updateGadget('10000', 20000, { title: 'x' })).resolves.toBeUndefined();
    });
  });

  describe('removeGadget', () => {
    it('should remove a gadget', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(null));

      await service.removeGadget('10000', 20000);

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/dashboard/10000/gadget/20000',
        undefined
      );
    });
  });
});
