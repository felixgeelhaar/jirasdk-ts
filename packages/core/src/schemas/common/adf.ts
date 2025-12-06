import { z } from 'zod';

/**
 * Atlassian Document Format (ADF) type definitions.
 * ADF is used for rich text content in Jira Cloud API v3.
 */

/**
 * Text mark types
 */
export const AdfMarkSchema = z.object({
  type: z.enum(['strong', 'em', 'strike', 'underline', 'code', 'subsup', 'textColor', 'link']),
  attrs: z.record(z.unknown()).optional(),
});

export type AdfMark = z.infer<typeof AdfMarkSchema>;

/**
 * Base ADF node schema (recursive)
 */
export const AdfNodeSchema: z.ZodType<AdfNode> = z.lazy(() =>
  z.object({
    type: z.string(),
    attrs: z.record(z.unknown()).optional(),
    content: z.array(AdfNodeSchema).optional(),
    text: z.string().optional(),
    marks: z.array(AdfMarkSchema).optional(),
  })
);

export interface AdfNode {
  type: string;
  attrs?: Record<string, unknown> | undefined;
  content?: AdfNode[] | undefined;
  text?: string | undefined;
  marks?: AdfMark[] | undefined;
}

/**
 * ADF Document schema
 */
export const AdfDocumentSchema = z.object({
  version: z.literal(1),
  type: z.literal('doc'),
  content: z.array(AdfNodeSchema),
});

export type AdfDocument = z.infer<typeof AdfDocumentSchema>;

/**
 * Flexible schema that accepts both ADF and plain string
 * Used for fields that can be either format
 */
export const AdfOrStringSchema = z.union([AdfDocumentSchema, z.string()]);

export type AdfOrString = z.infer<typeof AdfOrStringSchema>;

/**
 * Create a simple text paragraph ADF document
 */
export function textToAdf(text: string): AdfDocument {
  const paragraphs = text.split('\n\n').filter(Boolean);

  return {
    version: 1,
    type: 'doc',
    content: paragraphs.map((para) => ({
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: para,
        },
      ],
    })),
  };
}

/**
 * Extract plain text from an ADF document
 */
export function adfToText(adf: AdfDocument | string | null | undefined): string {
  if (!adf) {
    return '';
  }

  if (typeof adf === 'string') {
    return adf;
  }

  return extractText(adf.content);
}

function extractText(nodes: AdfNode[] | undefined): string {
  if (!nodes) {
    return '';
  }

  return nodes
    .map((node) => {
      if (node.text) {
        return node.text;
      }
      if (node.content) {
        return extractText(node.content);
      }
      return '';
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
