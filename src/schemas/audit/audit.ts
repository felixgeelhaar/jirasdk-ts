import { z } from 'zod';
import { JiraDateTimeSchema } from '../common/index.js';

/**
 * An object affected by an audit event.
 */
export const AuditObjectItemSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    typeName: z.string().optional(),
    parentId: z.string().optional(),
    parentName: z.string().optional(),
  })
  .loose();

export type AuditObjectItem = z.infer<typeof AuditObjectItemSchema>;

/**
 * A single field change captured by an audit record.
 */
export const AuditChangedValueSchema = z
  .object({
    fieldName: z.string(),
    changedFrom: z.string().optional(),
    changedTo: z.string().optional(),
  })
  .loose();

export type AuditChangedValue = z.infer<typeof AuditChangedValueSchema>;

/**
 * An item associated with an audit event.
 */
export const AuditAssociatedItemSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().optional(),
    typeName: z.string().optional(),
    parentId: z.string().optional(),
    parentName: z.string().optional(),
  })
  .loose();

export type AuditAssociatedItem = z.infer<typeof AuditAssociatedItemSchema>;

/**
 * An audit log record.
 */
export const AuditRecordSchema = z
  .object({
    id: z.number().int(),
    summary: z.string(),
    remoteAddress: z.string().optional(),
    authorKey: z.string().optional(),
    created: JiraDateTimeSchema,
    category: z.string().optional(),
    eventSource: z.string().optional(),
    description: z.string().optional(),
    objectItem: AuditObjectItemSchema.optional(),
    changedValues: z.array(AuditChangedValueSchema).optional(),
    associatedItems: z.array(AuditAssociatedItemSchema).optional(),
  })
  .loose();

export type AuditRecord = z.infer<typeof AuditRecordSchema>;

/**
 * Envelope returned by `GET /rest/api/3/auditing/record`.
 */
export const AuditRecordPageSchema = z
  .object({
    offset: z.number().int().optional(),
    limit: z.number().int().optional(),
    total: z.number().int().optional(),
    records: z.array(AuditRecordSchema),
  })
  .loose();

export type AuditRecordPage = z.infer<typeof AuditRecordPageSchema>;

/**
 * Options for listing audit records.
 *
 * `from` and `to` are ISO-8601 timestamps, matching the Go SDK which
 * formats its `time.Time` values as RFC 3339.
 */
export const AuditListOptionsSchema = z.object({
  offset: z.number().int().min(0).optional(),
  limit: z.number().int().min(1).optional(),
  filter: z.string().optional(),
  from: JiraDateTimeSchema.optional(),
  to: JiraDateTimeSchema.optional(),
});

export type AuditListOptions = z.infer<typeof AuditListOptionsSchema>;
