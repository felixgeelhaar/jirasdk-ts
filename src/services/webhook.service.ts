import { BaseService } from './base.service.js';
import {
  WebhookPageSchema,
  WebhookSchema,
  WebhookRegistrationResponseSchema,
  WebhookRefreshResponseSchema,
  FailedWebhookPageSchema,
  DynamicModulesSchema,
  CreateWebhookInputSchema,
  UpdateWebhookInputSchema,
  type Webhook,
  type WebhookPage,
  type WebhookListOptions,
  type WebhookRegistrationResult,
  type CreateWebhookInput,
  type UpdateWebhookInput,
  type FailedWebhook,
  type DynamicModules,
} from '../schemas/webhook/index.js';

/**
 * Webhook service for managing Jira webhook registrations.
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * // List webhooks
 * const webhooks = await client.webhooks.list({ maxResults: 50 });
 *
 * // Register webhooks. The callback URL is a single top-level argument —
 * // Jira allows only one registered URL per app, and it must share the
 * // Connect app's base URL.
 * const results = await client.webhooks.create('https://example.com/webhooks/jira', [
 *   {
 *     events: ['jira:issue_created'],
 *     jqlFilter: 'project = PROJ',
 *   },
 * ]);
 *
 * // Iterate every webhook
 * for await (const webhook of client.webhooks.iterate()) {
 *   console.log(webhook.id, webhook.url);
 * }
 * ```
 */
export class WebhookService extends BaseService {
  /**
   * List registered webhooks.
   *
   * `GET /rest/api/3/webhook`
   *
   * @param options - Pagination options
   * @returns The webhooks on the requested page
   */
  async list(options?: WebhookListOptions): Promise<Webhook[]> {
    const page = await this.listPage(options);
    return page.values;
  }

  /**
   * Async iterator over every registered webhook, paging transparently.
   *
   * `GET /rest/api/3/webhook`
   *
   * @param options - Page size options (`startAt` is managed by the iterator)
   * @returns An async generator yielding webhooks
   */
  async *iterate(
    options?: Omit<WebhookListOptions, 'startAt'>
  ): AsyncGenerator<Webhook, void, undefined> {
    const pageSize = options?.maxResults ?? 50;
    let startAt = 0;

    for (;;) {
      const page = await this.listPage({ startAt, maxResults: pageSize });

      for (const webhook of page.values) {
        yield webhook;
      }

      if (page.values.length === 0) {
        return;
      }

      startAt += page.values.length;

      if (page.isLast === true) {
        return;
      }
      if (page.total !== undefined && startAt >= page.total) {
        return;
      }
      if (page.total === undefined && page.values.length < pageSize) {
        return;
      }
    }
  }

  /**
   * Collect every registered webhook into an array.
   *
   * `GET /rest/api/3/webhook`
   *
   * @param options - Page size options
   * @returns All webhooks across all pages
   */
  async all(options?: Omit<WebhookListOptions, 'startAt'>): Promise<Webhook[]> {
    const webhooks: Webhook[] = [];
    for await (const webhook of this.iterate(options)) {
      webhooks.push(webhook);
    }
    return webhooks;
  }

  /**
   * Get a single webhook by ID.
   *
   * `GET /rest/api/3/webhook/{webhookId}`
   *
   * @param webhookId - The numeric webhook ID
   * @returns The webhook
   */
  async get(webhookId: number): Promise<Webhook> {
    return this.getMethod(`/webhook/${String(webhookId)}`, WebhookSchema);
  }

  /**
   * Register one or more webhooks.
   *
   * `POST /rest/api/3/webhook`
   *
   * Deviates from the Go SDK, which sends `{"webhooks": [{name, url, ...}]}`
   * with a `url` (and `name`) per webhook. The documented request body is
   * `WebhookRegistrationDetails`: a single top-level `url` — only one callback
   * URL per app may be registered, and it must share the Connect app's base
   * URL — plus a `webhooks` array of `WebhookDetails` objects that have no
   * `name`/`url` and require `jqlFilter`.
   *
   * @param url - The callback URL that receives every registered webhook
   * @param inputs - The webhooks to register (at least one)
   * @returns One registration result per submitted webhook
   */
  async create(url: string, inputs: CreateWebhookInput[]): Promise<WebhookRegistrationResult[]> {
    if (inputs.length === 0) {
      throw new Error('at least one webhook is required');
    }

    const webhooks = inputs.map((input) => CreateWebhookInputSchema.parse(input));
    const response = await this.postMethod('/webhook', WebhookRegistrationResponseSchema, {
      url,
      webhooks,
    });

    return response.webhookRegistrationResult;
  }

  /**
   * Update an existing webhook.
   *
   * `PUT /rest/api/3/webhook/{webhookId}`
   *
   * @param webhookId - The numeric webhook ID
   * @param input - The fields to update
   * @returns The updated webhook
   */
  async update(webhookId: number, input: UpdateWebhookInput): Promise<Webhook> {
    const body = UpdateWebhookInputSchema.parse(input);
    return this.putMethod(`/webhook/${String(webhookId)}`, WebhookSchema, body);
  }

  /**
   * Delete one or more webhooks.
   *
   * `DELETE /rest/api/3/webhook`
   *
   * Deviates from the Go SDK, which sends the IDs as repeated `webhookId`
   * query parameters. The endpoint documents a required JSON request body
   * (`ContainerForWebhookIDs`, `{"webhookIds": [...]}`) and declares no query
   * parameters at all.
   *
   * @param webhookIds - The webhook IDs to delete (at least one)
   * @returns Nothing
   */
  async deleteWebhooks(webhookIds: number[]): Promise<void> {
    if (webhookIds.length === 0) {
      throw new Error('at least one webhook ID is required');
    }

    await this.http.request({
      method: 'DELETE',
      url: this.buildPath('/webhook'),
      body: { webhookIds },
    });
  }

  /**
   * Extend the expiration date of webhooks.
   *
   * `PUT /rest/api/3/webhook/refresh`
   *
   * @param webhookIds - The webhook IDs to refresh (at least one)
   * @returns The new expiration timestamp (epoch milliseconds)
   */
  async refresh(webhookIds: number[]): Promise<number> {
    if (webhookIds.length === 0) {
      throw new Error('at least one webhook ID is required');
    }

    const response = await this.putMethod('/webhook/refresh', WebhookRefreshResponseSchema, {
      webhookIds,
    });

    return response.expirationDate;
  }

  /**
   * Get the dynamic modules registered by the app.
   *
   * `GET /rest/api/3/app/module/dynamic`
   *
   * @returns The dynamic module registration payload
   */
  async getDynamicModules(): Promise<DynamicModules> {
    return this.getMethod('/app/module/dynamic', DynamicModulesSchema);
  }

  /**
   * Get webhooks whose delivery recently failed.
   *
   * `GET /rest/api/3/webhook/failed`
   *
   * @param options - Pagination options (only `maxResults` is sent)
   * @returns The failed webhook deliveries
   */
  async getFailedWebhooks(options?: WebhookListOptions): Promise<FailedWebhook[]> {
    const params = this.buildParams({
      maxResults: options?.maxResults,
    });

    const page = await this.getMethod('/webhook/failed', FailedWebhookPageSchema, params);
    return page.values;
  }

  /**
   * Fetch a single page of webhooks, including its pagination metadata.
   */
  private async listPage(options?: WebhookListOptions): Promise<WebhookPage> {
    const params = this.buildParams({
      startAt: options?.startAt,
      maxResults: options?.maxResults,
    });

    return this.getMethod('/webhook', WebhookPageSchema, params);
  }
}
