import { BaseService } from './base.service.js';
import {
  NotificationSchemeSchema,
  NotificationSchemePageSchema,
  CreateNotificationSchemeInputSchema,
  UpdateNotificationSchemeInputSchema,
  AddNotificationsRequestSchema,
  SendNotificationInputSchema,
  type NotificationScheme,
  type NotificationSchemePage,
  type ListNotificationSchemesOptions,
  type CreateNotificationSchemeInput,
  type UpdateNotificationSchemeInput,
  type AddNotificationInput,
  type SendNotificationInput,
} from '../schemas/notification/index.js';

/**
 * Notification service for notification schemes and issue notifications
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * // List notification schemes
 * const page = await client.notifications.list({ maxResults: 50 });
 *
 * // Notify everyone watching an issue
 * await client.notifications.sendIssueNotification('PROJ-123', {
 *   subject: 'Important update',
 *   textBody: 'This issue has been updated',
 *   to: { watchers: true, assignee: true },
 * });
 * ```
 */
export class NotificationService extends BaseService {
  /**
   * List notification schemes (paginated)
   *
   * `GET /rest/api/3/notificationscheme`
   *
   * @param options - Pagination and expand options
   * @returns A page of notification schemes
   */
  async list(options?: ListNotificationSchemesOptions): Promise<NotificationSchemePage> {
    const params = this.buildParams({
      startAt: options?.startAt,
      maxResults: options?.maxResults,
      expand: options?.expand,
    });

    return this.getMethod('/notificationscheme', NotificationSchemePageSchema, params);
  }

  /**
   * Async iterator over every notification scheme, page by page
   *
   * @param options - Pagination and expand options (`startAt` is managed by the iterator)
   * @returns An async generator yielding notification schemes
   *
   * @example
   * ```typescript
   * for await (const scheme of client.notifications.iterate()) {
   *   console.log(scheme.name);
   * }
   * ```
   */
  async *iterate(
    options?: Omit<ListNotificationSchemesOptions, 'startAt'>
  ): AsyncGenerator<NotificationScheme, void, undefined> {
    const pageSize = options?.maxResults ?? 50;
    let startAt = 0;
    let hasMore = true;

    while (hasMore) {
      const page = await this.list({ ...options, startAt, maxResults: pageSize });

      for (const scheme of page.values) {
        yield scheme;
      }

      startAt += page.values.length;
      hasMore =
        page.values.length > 0 &&
        page.isLast !== true &&
        (page.total === undefined || startAt < page.total);
    }
  }

  /**
   * Get every notification scheme (loads all pages into memory)
   *
   * @param options - Pagination and expand options (`startAt` is managed internally)
   * @returns All notification schemes
   */
  async all(
    options?: Omit<ListNotificationSchemesOptions, 'startAt'>
  ): Promise<NotificationScheme[]> {
    const schemes: NotificationScheme[] = [];
    for await (const scheme of this.iterate(options)) {
      schemes.push(scheme);
    }
    return schemes;
  }

  /**
   * Get a notification scheme by ID
   *
   * `GET /rest/api/3/notificationscheme/{schemeId}`
   *
   * @param schemeId - ID of the notification scheme
   * @returns The notification scheme
   */
  async get(schemeId: number): Promise<NotificationScheme> {
    return this.getMethod(`/notificationscheme/${String(schemeId)}`, NotificationSchemeSchema);
  }

  /**
   * Create a notification scheme
   *
   * `POST /rest/api/3/notificationscheme`
   *
   * @param input - Name and optional description
   * @returns The created notification scheme
   */
  async create(input: CreateNotificationSchemeInput): Promise<NotificationScheme> {
    const body = CreateNotificationSchemeInputSchema.parse(input);
    return this.postMethod('/notificationscheme', NotificationSchemeSchema, body);
  }

  /**
   * Update a notification scheme
   *
   * `PUT /rest/api/3/notificationscheme/{schemeId}`
   *
   * @param schemeId - ID of the notification scheme
   * @param input - Fields to update
   * @returns The updated notification scheme
   */
  async update(
    schemeId: number,
    input: UpdateNotificationSchemeInput
  ): Promise<NotificationScheme> {
    const body = UpdateNotificationSchemeInputSchema.parse(input);
    return this.putMethod(
      `/notificationscheme/${String(schemeId)}`,
      NotificationSchemeSchema,
      body
    );
  }

  /**
   * Delete a notification scheme
   *
   * `DELETE /rest/api/3/notificationscheme/{schemeId}`
   *
   * @param schemeId - ID of the notification scheme
   * @returns Nothing
   */
  async deleteNotificationScheme(schemeId: number): Promise<void> {
    await this.deleteMethod(`/notificationscheme/${String(schemeId)}`);
  }

  /**
   * Add one or more notification recipients to a notification scheme event
   *
   * `PUT /rest/api/3/notificationscheme/{schemeId}/notification`
   *
   * Deviates from the Go SDK, which issues
   * `POST .../notification?eventTypeId={eventId}` with a flat body. That
   * operation does not exist — the path defines only `PUT`, taking a nested
   * `notificationSchemeEvents` array and no query parameters — so the Go call
   * returns 405.
   *
   * The endpoint returns 204, so there is no created notification to return.
   *
   * @param schemeId - ID of the notification scheme
   * @param eventId - ID of the event type the notifications attach to
   * @param input - A notification, or several, to add to that event
   */
  async addNotification(
    schemeId: number,
    eventId: number,
    input: AddNotificationInput | AddNotificationInput[]
  ): Promise<void> {
    const notifications = Array.isArray(input) ? input : [input];
    const body = AddNotificationsRequestSchema.parse({
      notificationSchemeEvents: [{ event: { id: String(eventId) }, notifications }],
    });

    await this.putMethodRaw(`/notificationscheme/${String(schemeId)}/notification`, body);
  }

  /**
   * Remove a notification from a notification scheme
   *
   * `DELETE /rest/api/3/notificationscheme/{schemeId}/notification/{notificationId}`
   *
   * @param schemeId - ID of the notification scheme
   * @param notificationId - ID of the notification to remove
   * @returns Nothing
   */
  async removeNotification(schemeId: number, notificationId: number): Promise<void> {
    await this.deleteMethod(
      `/notificationscheme/${String(schemeId)}/notification/${String(notificationId)}`
    );
  }

  /**
   * Send a notification about an issue
   *
   * `POST /rest/api/3/issue/{issueIdOrKey}/notify`
   *
   * @param issueIdOrKey - Issue key or ID
   * @param input - Subject, body and recipients
   * @returns Nothing
   */
  async sendIssueNotification(issueIdOrKey: string, input: SendNotificationInput): Promise<void> {
    const body = SendNotificationInputSchema.parse(input);
    await this.postMethodRaw(`/issue/${issueIdOrKey}/notify`, body);
  }
}
