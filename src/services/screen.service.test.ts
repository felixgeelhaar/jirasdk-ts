import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScreenService } from './screen.service.js';
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

function createMockScreen(id: number, name = `Screen ${String(id)}`): unknown {
  return {
    id,
    name,
    description: 'A screen',
    scope: { type: 'GLOBAL' },
  };
}

describe('ScreenService', () => {
  let service: ScreenService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new ScreenService(mockHttp, '/rest/api/3');
  });

  describe('list', () => {
    it('should list screens', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          startAt: 0,
          maxResults: 50,
          total: 1,
          values: [createMockScreen(10000)],
        })
      );

      const result = await service.list();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/screens', {}, undefined);
      expect(result.values).toHaveLength(1);
    });

    it('should pass pagination params', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ startAt: 10, maxResults: 25, total: 0, values: [] })
      );

      await service.list({ startAt: 10, maxResults: 25 });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/screens',
        { startAt: 10, maxResults: 25 },
        undefined
      );
    });

    it('should throw when the response fails validation', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ values: 'nope' }));

      await expect(service.list()).rejects.toThrow();
    });
  });

  describe('iterate / all', () => {
    it('should page through all screens', async () => {
      vi.mocked(mockHttp.get)
        .mockResolvedValueOnce(
          createMockResponse({
            startAt: 0,
            maxResults: 2,
            total: 3,
            values: [createMockScreen(1, 'A'), createMockScreen(2, 'B')],
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            startAt: 2,
            maxResults: 2,
            total: 3,
            values: [createMockScreen(3, 'C')],
          })
        );

      const names: string[] = [];
      for await (const screen of service.iterate({ maxResults: 2 })) {
        names.push(screen.name);
      }

      expect(names).toEqual(['A', 'B', 'C']);
      expect(mockHttp.get).toHaveBeenCalledTimes(2);
    });

    it('should collect all screens into an array', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          startAt: 0,
          maxResults: 50,
          total: 1,
          isLast: true,
          values: [createMockScreen(1)],
        })
      );

      const screens = await service.all();

      expect(screens).toHaveLength(1);
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('get', () => {
    it('should fetch a screen by id', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockScreen(10000)));

      const screen = await service.get(10000);

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/screens/10000', undefined, undefined);
      expect(screen.id).toBe(10000);
    });
  });

  describe('create', () => {
    it('should create a screen', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(createMockScreen(10000)));

      const screen = await service.create({ name: 'Bug Screen', description: 'For bugs' });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/screens',
        { name: 'Bug Screen', description: 'For bugs' },
        undefined
      );
      expect(screen.id).toBe(10000);
    });

    it('should reject an empty name', async () => {
      await expect(service.create({ name: '' })).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a screen', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(createMockScreen(10000)));

      await service.update(10000, { name: 'Renamed' });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/screens/10000',
        { name: 'Renamed' },
        undefined
      );
    });
  });

  describe('deleteScreen', () => {
    it('should delete a screen', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(undefined));

      await service.deleteScreen(10000);

      expect(mockHttp.delete).toHaveBeenCalledWith('/rest/api/3/screens/10000', undefined);
    });
  });

  describe('getAvailableFields', () => {
    it('should fetch available fields', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse([{ id: 'summary', name: 'Summary' }])
      );

      const fields = await service.getAvailableFields(10000);

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/screens/10000/availableFields',
        undefined,
        undefined
      );
      expect(fields[0]?.id).toBe('summary');
    });
  });

  describe('tabs', () => {
    it('should list tabs', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse([{ id: 10100, name: 'Field Tab' }])
      );

      const tabs = await service.listTabs(10000);

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/screens/10000/tabs',
        undefined,
        undefined
      );
      expect(tabs[0]?.name).toBe('Field Tab');
    });

    it('should create a tab', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse({ id: 10100, name: 'Details' })
      );

      const tab = await service.createTab(10000, { name: 'Details' });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/screens/10000/tabs',
        { name: 'Details' },
        undefined
      );
      expect(tab.id).toBe(10100);
    });

    it('should reject a tab without a name', async () => {
      await expect(service.createTab(10000, { name: '' })).rejects.toThrow();
    });

    it('should update a tab', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(
        createMockResponse({ id: 10100, name: 'Renamed' })
      );

      await service.updateTab(10000, 10100, { name: 'Renamed' });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/screens/10000/tabs/10100',
        { name: 'Renamed' },
        undefined
      );
    });

    it('should delete a tab', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(undefined));

      await service.deleteTab(10000, 10100);

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/screens/10000/tabs/10100',
        undefined
      );
    });
  });

  describe('fields', () => {
    it('should add a field to a tab', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse({ id: 'summary' }));

      const field = await service.addField(10000, 10100, { fieldId: 'summary' });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/screens/10000/tabs/10100/fields',
        { fieldId: 'summary' },
        undefined
      );
      expect(field.id).toBe('summary');
    });

    it('should reject an empty field id', async () => {
      await expect(service.addField(10000, 10100, { fieldId: '' })).rejects.toThrow();
    });

    it('should remove a field from a tab', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(undefined));

      await service.removeField(10000, 10100, 'summary');

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/screens/10000/tabs/10100/fields/summary',
        undefined
      );
    });
  });
});
