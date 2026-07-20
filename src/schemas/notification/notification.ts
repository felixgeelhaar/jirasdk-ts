import { z } from 'zod';

/**
 * A Jira user group referenced by a notification
 */
export const NotificationGroupSchema = z
  .object({
    name: z.string(),
    self: z.url().optional(),
  })
  .loose();

export type NotificationGroup = z.infer<typeof NotificationGroupSchema>;

/**
 * A Jira field referenced by a notification (e.g. a user picker field)
 */
export const NotificationFieldSchema = z
  .object({
    id: z.string(),
    name: z.string().optional(),
  })
  .loose();

export type NotificationField = z.infer<typeof NotificationFieldSchema>;

/**
 * A Jira user referenced by a notification
 */
export const NotificationUserSchema = z
  .object({
    accountId: z.string().optional(),
    emailAddress: z.email().optional(),
    displayName: z.string().optional(),
    active: z.boolean().optional(),
  })
  .loose();

export type NotificationUser = z.infer<typeof NotificationUserSchema>;

/**
 * A project role referenced by a notification
 */
export const NotificationProjectRoleSchema = z
  .object({
    id: z.number().int().optional(),
    name: z.string().optional(),
  })
  .loose();

export type NotificationProjectRole = z.infer<typeof NotificationProjectRoleSchema>;

/**
 * A notification recipient configuration within a scheme event
 */
export const NotificationSchema = z
  .object({
    id: z.number().int().optional(),
    type: z.string(),
    parameter: z.string().optional(),
    group: NotificationGroupSchema.optional(),
    field: NotificationFieldSchema.optional(),
    user: NotificationUserSchema.optional(),
    projectRole: NotificationProjectRoleSchema.optional(),
  })
  .loose();

export type Notification = z.infer<typeof NotificationSchema>;

/**
 * A notification event type
 */
export const NotificationEventSchema = z
  .object({
    id: z.number().int().optional(),
    name: z.string().optional(),
    description: z.string().optional(),
  })
  .loose();

export type NotificationEvent = z.infer<typeof NotificationEventSchema>;

/**
 * A notification event within a scheme, with its configured recipients
 */
export const NotificationSchemeItemSchema = z
  .object({
    event: NotificationEventSchema.optional(),
    notifications: z.array(NotificationSchema).optional(),
  })
  .loose();

export type NotificationSchemeItem = z.infer<typeof NotificationSchemeItemSchema>;

/**
 * A Jira notification scheme
 */
export const NotificationSchemeSchema = z
  .object({
    id: z.number().int().optional(),
    self: z.url().optional(),
    name: z.string(),
    description: z.string().optional(),
    notificationSchemeEvents: z.array(NotificationSchemeItemSchema).optional(),
  })
  .loose();

export type NotificationScheme = z.infer<typeof NotificationSchemeSchema>;

/**
 * Paginated list of notification schemes
 * (`GET /rest/api/3/notificationscheme`)
 */
export const NotificationSchemePageSchema = z
  .object({
    self: z.url().optional(),
    startAt: z.number().int().optional(),
    maxResults: z.number().int().optional(),
    total: z.number().int().optional(),
    isLast: z.boolean().optional(),
    values: z.array(NotificationSchemeSchema).default([]),
  })
  .loose();

export type NotificationSchemePage = z.infer<typeof NotificationSchemePageSchema>;

/**
 * Options for listing notification schemes
 */
export const ListNotificationSchemesOptionsSchema = z.object({
  startAt: z.number().int().min(0).optional(),
  maxResults: z.number().int().min(1).optional(),
  expand: z.string().optional(),
});

export type ListNotificationSchemesOptions = z.infer<typeof ListNotificationSchemesOptionsSchema>;

/**
 * Input for creating a notification scheme
 */
export const CreateNotificationSchemeInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
});

export type CreateNotificationSchemeInput = z.infer<typeof CreateNotificationSchemeInputSchema>;

/**
 * Input for updating a notification scheme
 */
export const UpdateNotificationSchemeInputSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
});

export type UpdateNotificationSchemeInput = z.infer<typeof UpdateNotificationSchemeInputSchema>;

/**
 * Input for adding a notification to a notification scheme event
 */
export const AddNotificationInputSchema = z.object({
  type: z.string().min(1),
  parameter: z.string().optional(),
});

export type AddNotificationInput = z.infer<typeof AddNotificationInputSchema>;

/**
 * Request body for adding notifications to a notification scheme
 * (`AddNotificationsDetails`).
 *
 * The endpoint is `PUT`, takes a nested `notificationSchemeEvents` array, and
 * returns 204. The Go SDK issues a `POST` with an `eventTypeId` query
 * parameter and a flat body, which the API answers with 405.
 */
export const AddNotificationsRequestSchema = z.object({
  notificationSchemeEvents: z
    .array(
      z.object({
        event: z.object({ id: z.string().min(1) }),
        notifications: z.array(AddNotificationInputSchema).min(1, {
          error: 'at least one notification is required',
        }),
      })
    )
    .min(1, { error: 'at least one notification scheme event is required' }),
});

export type AddNotificationsRequest = z.infer<typeof AddNotificationsRequestSchema>;

/**
 * Recipients of an issue notification
 */
export const NotificationTargetSchema = z.object({
  reporter: z.boolean().optional(),
  assignee: z.boolean().optional(),
  watchers: z.boolean().optional(),
  voters: z.boolean().optional(),
  users: z.array(z.object({ accountId: z.string() })).optional(),
  groups: z.array(z.object({ name: z.string() })).optional(),
  groupIds: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
});

export type NotificationTarget = z.infer<typeof NotificationTargetSchema>;

/**
 * Input for sending a notification about an issue
 */
export const SendNotificationInputSchema = z.object({
  subject: z.string().optional(),
  textBody: z.string().optional(),
  htmlBody: z.string().optional(),
  to: NotificationTargetSchema.optional(),
  restrict: NotificationTargetSchema.optional(),
});

export type SendNotificationInput = z.infer<typeof SendNotificationInputSchema>;
