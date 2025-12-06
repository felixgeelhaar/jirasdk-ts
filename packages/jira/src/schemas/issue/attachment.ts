import { z } from 'zod';
import { UserRefSchema, OptionalJiraDateTimeSchema } from '@felixgeelhaar/sdk-core/schemas';

/**
 * Issue Attachment
 */
export const AttachmentSchema = z.object({
  self: z.string().url(),
  id: z.string(),
  filename: z.string(),
  author: UserRefSchema.optional(),
  created: OptionalJiraDateTimeSchema,
  size: z.number().int().min(0),
  mimeType: z.string(),
  content: z.string().url(),
  thumbnail: z.string().url().optional(),
});

export type Attachment = z.infer<typeof AttachmentSchema>;

/**
 * Attachment metadata response
 */
export const AttachmentMetadataSchema = z.object({
  id: z.number(),
  self: z.string().url(),
  filename: z.string(),
  author: UserRefSchema,
  created: OptionalJiraDateTimeSchema,
  size: z.number(),
  mimeType: z.string(),
  properties: z.record(z.unknown()).optional(),
  content: z.string().url().optional(),
  thumbnail: z.string().url().optional(),
});

export type AttachmentMetadata = z.infer<typeof AttachmentMetadataSchema>;

/**
 * Add attachment response (array of attachments)
 */
export const AddAttachmentResponseSchema = z.array(AttachmentSchema);

export type AddAttachmentResponse = z.infer<typeof AddAttachmentResponseSchema>;
