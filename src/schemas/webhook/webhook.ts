import { z } from 'zod';

/**
 * A Jira webhook registration.
 *
 * Read path — lenient, since Jira omits fields depending on how the
 * webhook was registered (dynamic vs. app-descriptor webhooks).
 */
export const WebhookSchema = z
  .object({
    id: z.number().int().optional(),
    name: z.string().optional(),
    url: z.string().optional(),
    events: z.array(z.string()).optional(),
    jqlFilter: z.string().optional(),
    excludeBody: z.boolean().optional(),
    enabled: z.boolean().optional(),
    expirationDate: z.number().int().optional(),
    lastUpdatedUser: z.string().optional(),
    lastUpdatedDate: z.number().int().optional(),
  })
  .loose();

export type Webhook = z.infer<typeof WebhookSchema>;

/**
 * A page of webhooks as returned by `GET /rest/api/3/webhook`.
 */
export const WebhookPageSchema = z
  .object({
    values: z.array(WebhookSchema),
    startAt: z.number().int().optional(),
    maxResults: z.number().int().optional(),
    total: z.number().int().optional(),
    isLast: z.boolean().optional(),
  })
  .loose();

export type WebhookPage = z.infer<typeof WebhookPageSchema>;

/**
 * Input for registering a single webhook.
 *
 * Write path — strict, mirroring the validation the Go SDK performs
 * before issuing the request.
 */
export const CreateWebhookInputSchema = z.object({
  name: z.string().min(1, { error: 'name is required' }),
  url: z.url({ error: 'url must be a valid URL' }),
  events: z.array(z.string()).min(1, { error: 'at least one event is required' }),
  jqlFilter: z.string().optional(),
  excludeBody: z.boolean().optional(),
});

export type CreateWebhookInput = z.infer<typeof CreateWebhookInputSchema>;

/**
 * Input for updating an existing webhook. All fields are optional.
 */
export const UpdateWebhookInputSchema = z.object({
  name: z.string().optional(),
  url: z.url().optional(),
  events: z.array(z.string()).optional(),
  jqlFilter: z.string().optional(),
  excludeBody: z.boolean().optional(),
  enabled: z.boolean().optional(),
});

export type UpdateWebhookInput = z.infer<typeof UpdateWebhookInputSchema>;

/**
 * An error reported for a single webhook registration.
 */
export const WebhookErrorSchema = z
  .object({
    message: z.string(),
  })
  .loose();

export type WebhookError = z.infer<typeof WebhookErrorSchema>;

/**
 * Result of registering one webhook.
 */
export const WebhookRegistrationResultSchema = z
  .object({
    createdWebhookId: z.number().int().optional(),
    errors: z.array(WebhookErrorSchema).optional(),
  })
  .loose();

export type WebhookRegistrationResult = z.infer<typeof WebhookRegistrationResultSchema>;

/**
 * Envelope returned by `POST /rest/api/3/webhook`.
 */
export const WebhookRegistrationResponseSchema = z
  .object({
    webhookRegistrationResult: z.array(WebhookRegistrationResultSchema),
  })
  .loose();

export type WebhookRegistrationResponse = z.infer<typeof WebhookRegistrationResponseSchema>;

/**
 * Envelope returned by `PUT /rest/api/3/webhook/refresh`.
 */
export const WebhookRefreshResponseSchema = z
  .object({
    expirationDate: z.number().int(),
  })
  .loose();

export type WebhookRefreshResponse = z.infer<typeof WebhookRefreshResponseSchema>;

/**
 * A webhook delivery that recently failed.
 */
export const FailedWebhookSchema = z
  .object({
    id: z.number().int(),
    body: z.string().optional(),
    url: z.string(),
    failureTime: z.number().int(),
  })
  .loose();

export type FailedWebhook = z.infer<typeof FailedWebhookSchema>;

/**
 * Envelope returned by `GET /rest/api/3/webhook/failed`.
 */
export const FailedWebhookPageSchema = z
  .object({
    values: z.array(FailedWebhookSchema),
    maxResults: z.number().int().optional(),
    next: z.string().optional(),
  })
  .loose();

export type FailedWebhookPage = z.infer<typeof FailedWebhookPageSchema>;

/**
 * Dynamic modules registered by the app.
 */
export const DynamicModulesSchema = z.record(z.string(), z.unknown());

export type DynamicModules = z.infer<typeof DynamicModulesSchema>;

/**
 * Options for listing webhooks.
 */
export const WebhookListOptionsSchema = z.object({
  startAt: z.number().int().min(0).optional(),
  maxResults: z.number().int().min(1).optional(),
});

export type WebhookListOptions = z.infer<typeof WebhookListOptionsSchema>;
