import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookService } from './webhook.service.js';
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

function createMockWebhook(id: number) {
  return {
    id,
    name: `Webhook ${String(id)}`,
    url: 'https://example.com/webhooks/jira',
    events: ['jira:issue_created'],
    enabled: true,
    expirationDate: 1700000000000,
  };
}

describe('WebhookService', () => {
  let service: WebhookService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new WebhookService(mockHttp, '/rest/api/3');
  });

  describe('list', () => {
    it('should list webhooks', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ values: [createMockWebhook(10000)], total: 1, isLast: true })
      );

      const webhooks = await service.list();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/webhook', {}, undefined);
      expect(webhooks).toHaveLength(1);
      expect(webhooks[0]?.id).toBe(10000);
    });

    it('should pass pagination params', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ values: [] }));

      await service.list({ startAt: 10, maxResults: 25 });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/webhook',
        { startAt: 10, maxResults: 25 },
        undefined
      );
    });

    it('should throw when the response fails validation', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ notValues: [] }));

      await expect(service.list()).rejects.toThrow();
    });
  });

  describe('iterate / all', () => {
    it('should page through all webhooks', async () => {
      vi.mocked(mockHttp.get)
        .mockResolvedValueOnce(
          createMockResponse({ values: [createMockWebhook(1), createMockWebhook(2)], total: 3 })
        )
        .mockResolvedValueOnce(createMockResponse({ values: [createMockWebhook(3)], total: 3 }));

      const ids: number[] = [];
      for await (const webhook of service.iterate({ maxResults: 2 })) {
        ids.push(webhook.id ?? 0);
      }

      expect(ids).toEqual([1, 2, 3]);
      expect(mockHttp.get).toHaveBeenCalledTimes(2);
    });

    it('should stop on isLast', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ values: [createMockWebhook(1)], isLast: true })
      );

      const webhooks = await service.all({ maxResults: 50 });

      expect(webhooks).toHaveLength(1);
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });

    it('should stop on an empty page', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ values: [] }));

      const webhooks = await service.all();

      expect(webhooks).toEqual([]);
    });

    it('should stop on a short page when total is absent', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ values: [createMockWebhook(1)] })
      );

      const webhooks = await service.all({ maxResults: 2 });

      expect(webhooks).toHaveLength(1);
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('get', () => {
    it('should fetch a webhook by ID', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse(createMockWebhook(10000)));

      const webhook = await service.get(10000);

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/webhook/10000', undefined, undefined);
      expect(webhook.id).toBe(10000);
    });
  });

  describe('create', () => {
    it('should register webhooks and return registration results', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse({ webhookRegistrationResult: [{ createdWebhookId: 10000 }] })
      );

      const results = await service.create([
        {
          name: 'Issue Created Webhook',
          url: 'https://example.com/webhooks/jira',
          events: ['jira:issue_created'],
        },
      ]);

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/webhook',
        {
          webhooks: [
            {
              name: 'Issue Created Webhook',
              url: 'https://example.com/webhooks/jira',
              events: ['jira:issue_created'],
            },
          ],
        },
        undefined
      );
      expect(results).toHaveLength(1);
      expect(results[0]?.createdWebhookId).toBe(10000);
    });

    it('should reject an empty list', async () => {
      await expect(service.create([])).rejects.toThrow('at least one webhook is required');
    });

    it('should reject a webhook without events', async () => {
      await expect(
        service.create([{ name: 'x', url: 'https://example.com', events: [] }])
      ).rejects.toThrow();
    });
  });

  describe('update', () => {
    it('should update a webhook', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(createMockResponse(createMockWebhook(10000)));

      const webhook = await service.update(10000, { name: 'Updated', enabled: false });

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/webhook/10000',
        { name: 'Updated', enabled: false },
        undefined
      );
      expect(webhook.id).toBe(10000);
    });
  });

  describe('deleteWebhooks', () => {
    it('should delete webhooks by ID', async () => {
      vi.mocked(mockHttp.delete).mockResolvedValueOnce(createMockResponse(undefined));

      await service.deleteWebhooks([10000, 10001]);

      expect(mockHttp.delete).toHaveBeenCalledWith('/rest/api/3/webhook', {
        params: { webhookId: ['10000', '10001'] },
      });
    });

    it('should reject an empty ID list', async () => {
      await expect(service.deleteWebhooks([])).rejects.toThrow(
        'at least one webhook ID is required'
      );
    });
  });

  describe('refresh', () => {
    it('should refresh webhooks and return the expiration date', async () => {
      vi.mocked(mockHttp.put).mockResolvedValueOnce(
        createMockResponse({ expirationDate: 1700000000000 })
      );

      const expirationDate = await service.refresh([10000, 10001]);

      expect(mockHttp.put).toHaveBeenCalledWith(
        '/rest/api/3/webhook/refresh',
        { webhookIds: [10000, 10001] },
        undefined
      );
      expect(expirationDate).toBe(1700000000000);
    });

    it('should reject an empty ID list', async () => {
      await expect(service.refresh([])).rejects.toThrow('at least one webhook ID is required');
    });
  });

  describe('getDynamicModules', () => {
    it('should fetch dynamic modules', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ modules: [] }));

      const modules = await service.getDynamicModules();

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/app/module/dynamic',
        undefined,
        undefined
      );
      expect(modules).toEqual({ modules: [] });
    });
  });

  describe('getFailedWebhooks', () => {
    it('should fetch failed webhooks', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          values: [
            { id: 1, url: 'https://example.com/hook', failureTime: 1700000000000, body: '{}' },
          ],
          maxResults: 10,
        })
      );

      const failed = await service.getFailedWebhooks({ maxResults: 10 });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/webhook/failed',
        { maxResults: 10 },
        undefined
      );
      expect(failed).toHaveLength(1);
      expect(failed[0]?.id).toBe(1);
    });
  });
});
