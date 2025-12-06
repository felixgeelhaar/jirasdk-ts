import { z } from 'zod';

/**
 * Basic self-referencing link
 */
export const SelfLinkSchema = z.object({
  self: z.string().url(),
});

export type SelfLink = z.infer<typeof SelfLinkSchema>;

/**
 * Link with ID
 */
export const IdLinkSchema = z.object({
  self: z.string().url(),
  id: z.string(),
});

export type IdLink = z.infer<typeof IdLinkSchema>;

/**
 * Named link (common for components, versions, etc.)
 */
export const NamedLinkSchema = z.object({
  self: z.string().url(),
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

export type NamedLink = z.infer<typeof NamedLinkSchema>;

/**
 * Web link
 */
export const WebLinkSchema = z.object({
  url: z.string().url(),
  title: z.string().optional(),
  icon: z
    .object({
      url16x16: z.string().url().optional(),
      title: z.string().optional(),
    })
    .optional(),
});

export type WebLink = z.infer<typeof WebLinkSchema>;
