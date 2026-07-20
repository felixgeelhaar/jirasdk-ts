import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from './notification.service.js';
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

function createMockScheme(id = 10000, name = 'Default Notification Scheme') {
  return {
    id,
    self: `https://example.atlassian.net/rest/api/3/notificationscheme/${String(id)}`,
    name,
    description: 'Notifications for the project team',
    notificationSchemeEvents: [
      {
        event: { id: 1, name: 'Issue Created' },
        notifications: [{ id: 5, type: 'Group', parameter: 'jira-administrators' }],
      },
    ],
  };
}

describe('NotificationService', () => {
  let service: NotificationService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new NotificationService(mockHttp, '/rest/api/3');
  });

  describe('list', () => {
    it('should list notification schemes', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          startAt: 0,
          maxResults: 50,
          total: 1,
          isLast: true,
          values: [createMockScheme()],
        })
      );

      const page = await service.list();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/notificationscheme', {}, undefined);
      expect(page.values).toHaveLength(1);
      expect(page.values[0]?.name).toBe('Default Notification Scheme');
    });

    it('should build pagination query params', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ values: [] }));

      await service.list({ startAt: 25, maxResults: 25, expand: 'all' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/notificationscheme',
        { startAt: 25, maxResults: 25, expand: 'all' },
        undefined
      );
    });

    it('should throw when the response is invalid', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ values: [{ description: 'no name' }] })
      );

      await expect(service.list()).rejects.toThrow();
    });
  });

  describe('iterate / all', () => {
    it('should page through all notification schemes', async () => {
      vi.mocked(mockHttp.get)
        .mockResolvedValueOnce(
          createMockResponse({
            startAt: 0,
            maxResults: 1,
            total: 2,
            isLast: false,
            values: [createMockScheme(10000, 'First')],
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            startAt: 1,
            maxResults: 1,
            total: 2,
            isLast: true,
            values: [createMockScheme(10001, 'Second')],
          })
        );

      const names: string[] = [];
      for await (const scheme of service.iterate({ maxResults: 1 })) {
        names.push(scheme.name);
      }

      expect(names).toEqual(['First', 'Second']);
      expect(mockHttp.get).toHaveBeenCalledTimes(2);
      expect(mockHttp.get).toHaveBeenNthCalledWith(
        1,
        '/rest/api/3/notificationscheme',
        { startAt: 0, maxResults: 1 },
        undefined
      );
      expect(mockHttp.get).toHaveBeenNthCalledWith(
        2,
        '/rest/api/3/notificationscheme',
        { startAt: 1, maxResults: 1 },
        undefined
      );
    });

    it('should collect all schemes into an array', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          startAt: 0,
          maxResults: 50,
          total: 1,
          isLast: true,
          values: [createMockScheme()],
        })
      );

      const schemes = await service.all();

      expect(schemes).toHaveLength(1);
    });

    it('should stop when a page comes back empty', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ values: [] }));

      const schemes = await service.all();

      expect(schemes).toEqual([]);
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('get', () => {
    it('should fetch a notification scheme by id', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockScheme()));

      const scheme = await service.get(10000);

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/notificationscheme/10000',
        undefined,
        undefined
      );
      expect(scheme.id).toBe(10000);
    });
  });

  describe('create', () => {
    it('should create a notification scheme', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(createMockScheme()));

      await service.create({ name: 'Custom', description: 'Custom scheme' });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/notificationscheme',
        { name: 'Custom', description: 'Custom scheme' },
        undefined
      );
    });

    it('should reject an empty name', async () => {
      await expect(service.create({ name: '' })).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a notification scheme', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(createMockScheme()));

      await service.update(10000, { description: 'Updated description' });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/notificationscheme/10000',
        { description: 'Updated description' },
        undefined
      );
    });
  });

  describe('deleteNotificationScheme', () => {
    it('should delete a notification scheme', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(undefined));

      await service.deleteNotificationScheme(10000);

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/notificationscheme/10000',
        undefined
      );
    });
  });

  describe('addNotification', () => {
    it('should add a notification with the event id as a query param', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse({ id: 12345, type: 'Group', parameter: 'jira-administrators' })
      );

      const notification = await service.addNotification(10000, 1, {
        type: 'Group',
        parameter: 'jira-administrators',
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/notificationscheme/10000/notification',
        { type: 'Group', parameter: 'jira-administrators' },
        { params: { eventTypeId: 1 } }
      );
      expect(notification.id).toBe(12345);
    });
  });

  describe('removeNotification', () => {
    it('should remove a notification', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(undefined));

      await service.removeNotification(10000, 12345);

      expect(mockHttp.delete).toHaveBeenCalledWith(
        '/rest/api/3/notificationscheme/10000/notification/12345',
        undefined
      );
    });
  });

  describe('sendIssueNotification', () => {
    it('should send an issue notification', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse(undefined));

      await service.sendIssueNotification('PROJ-123', {
        subject: 'Important Update',
        textBody: 'This issue has been updated',
        to: { assignee: true, watchers: true },
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/issue/PROJ-123/notify',
        {
          subject: 'Important Update',
          textBody: 'This issue has been updated',
          to: { assignee: true, watchers: true },
        },
        undefined
      );
    });
  });
});
