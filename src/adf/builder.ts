import {
  AdfDocumentSchema,
  adfToText,
  type AdfDocument,
  type AdfNode,
} from '../schemas/common/adf.js';
import { clamp } from '../utils/index.js';

/**
 * Fluent builder for Atlassian Document Format (ADF) documents.
 *
 * The builder is immutable: every `add*` method returns a **new** builder
 * instance, leaving the receiver untouched. This makes it safe to keep a
 * partially built document around and branch from it.
 *
 * @example
 * ```ts
 * const doc = adf()
 *   .addHeading('Release notes', 2)
 *   .addParagraph('Highlights of this release:')
 *   .addBulletList(['Faster search', 'Fewer bugs'])
 *   .addCodeBlock('npm install jirasdk', 'bash')
 *   .toDocument();
 * ```
 */
export class AdfBuilder {
  private readonly nodes: readonly AdfNode[];

  private constructor(nodes: readonly AdfNode[] = []) {
    this.nodes = nodes;
  }

  /**
   * Creates an empty ADF document builder.
   *
   * Equivalent to the Go SDK's `issue.NewADF()`.
   *
   * @returns A new, empty builder
   */
  static create(): AdfBuilder {
    return new AdfBuilder();
  }

  /**
   * Creates a builder pre-populated from plain text.
   *
   * Text is split into paragraphs on blank lines (`\n\n`); a single newline is
   * treated as a soft wrap and becomes a space within the current paragraph.
   * This mirrors the Go SDK's `issue.ADFFromText`.
   *
   * @param text - The plain text to convert
   * @returns A builder containing one paragraph per text block
   */
  static fromText(text: string): AdfBuilder {
    if (text === '') {
      return new AdfBuilder();
    }
    return new AdfBuilder(splitParagraphs(text).map(paragraphNode));
  }

  /**
   * Creates a builder from an existing ADF document, so it can be extended.
   *
   * @param document - The document to seed the builder with
   * @returns A builder containing the document's top-level nodes
   */
  static fromDocument(document: AdfDocument): AdfBuilder {
    return new AdfBuilder([...document.content]);
  }

  /**
   * Appends a paragraph of plain text.
   *
   * @param text - The paragraph text
   * @returns A new builder with the paragraph appended
   */
  addParagraph(text: string): AdfBuilder {
    return this.append(paragraphNode(text));
  }

  /**
   * Appends a heading.
   *
   * @param text - The heading text
   * @param level - Heading level; values outside 1-6 are clamped (default 1)
   * @returns A new builder with the heading appended
   */
  addHeading(text: string, level = 1): AdfBuilder {
    const normalized = clamp(Math.trunc(level) || 1, 1, 6);
    return this.append({
      type: 'heading',
      attrs: { level: normalized },
      content: [textNode(text)],
    });
  }

  /**
   * Appends a bullet (unordered) list.
   *
   * @param items - One string per list item
   * @returns A new builder with the list appended
   */
  addBulletList(items: readonly string[]): AdfBuilder {
    return this.append(listNode('bulletList', items));
  }

  /**
   * Appends an ordered (numbered) list.
   *
   * @param items - One string per list item
   * @returns A new builder with the list appended
   */
  addOrderedList(items: readonly string[]): AdfBuilder {
    return this.append(listNode('orderedList', items));
  }

  /**
   * Appends a code block.
   *
   * @param code - The source code
   * @param language - Optional syntax-highlighting language (e.g. `'ts'`)
   * @returns A new builder with the code block appended
   */
  addCodeBlock(code: string, language?: string): AdfBuilder {
    return this.append({
      type: 'codeBlock',
      ...(language !== undefined && language !== '' && { attrs: { language } }),
      content: [textNode(code)],
    });
  }

  /**
   * Appends an arbitrary, pre-built ADF node for constructs the builder does
   * not model (panels, tables, media, ...).
   *
   * @param node - The node to append
   * @returns A new builder with the node appended
   */
  addNode(node: AdfNode): AdfBuilder {
    return this.append(node);
  }

  /**
   * Returns true when the document has no content nodes.
   *
   * @returns Whether the builder is empty
   */
  isEmpty(): boolean {
    return this.nodes.length === 0;
  }

  /**
   * Number of top-level content nodes.
   */
  get length(): number {
    return this.nodes.length;
  }

  /**
   * Builds and validates the ADF document.
   *
   * @returns A document validated against `AdfDocumentSchema`
   * @throws {z.ZodError} If the accumulated content is not valid ADF
   */
  toDocument(): AdfDocument {
    return AdfDocumentSchema.parse({
      version: 1,
      type: 'doc',
      content: [...this.nodes],
    });
  }

  /**
   * Extracts the plain-text representation of the document.
   *
   * @returns The document rendered as plain text
   */
  toText(): string {
    return adfToText(this.toDocument());
  }

  /**
   * Makes `JSON.stringify(builder)` emit the ADF document.
   *
   * @returns The built document
   */
  toJSON(): AdfDocument {
    return this.toDocument();
  }

  /**
   * Pretty-printed JSON, useful for debugging (Go's `ADF.String()`).
   *
   * @returns The document as indented JSON
   */
  toString(): string {
    return JSON.stringify(this.toDocument(), null, 2);
  }

  private append(node: AdfNode): AdfBuilder {
    return new AdfBuilder([...this.nodes, node]);
  }
}

/**
 * Shorthand factory for {@link AdfBuilder.create}.
 *
 * @returns A new, empty ADF builder
 */
export function adf(): AdfBuilder {
  return AdfBuilder.create();
}

/**
 * Shorthand factory for {@link AdfBuilder.fromText}.
 *
 * @param text - The plain text to convert
 * @returns A builder seeded with the text
 */
export function adfFromText(text: string): AdfBuilder {
  return AdfBuilder.fromText(text);
}

function textNode(text: string): AdfNode {
  return { type: 'text', text };
}

function paragraphNode(text: string): AdfNode {
  return { type: 'paragraph', content: [textNode(text)] };
}

function listNode(type: 'bulletList' | 'orderedList', items: readonly string[]): AdfNode {
  return {
    type,
    content: items.map((item) => ({
      type: 'listItem',
      content: [paragraphNode(item)],
    })),
  };
}

/**
 * Splits text into paragraphs: a blank line starts a new paragraph, a single
 * newline is folded into a space. Mirrors the Go SDK's `splitParagraphs`.
 */
function splitParagraphs(text: string): string[] {
  const paragraphs: string[] = [];
  let current = '';

  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i);

    if (char !== '\n') {
      current += char;
      continue;
    }

    if (text.charAt(i + 1) === '\n') {
      // Blank line: end the current paragraph and skip the second newline.
      if (current !== '') {
        paragraphs.push(current);
        current = '';
      }
      i++;
    } else if (current !== '') {
      // Soft wrap inside a paragraph.
      current += ' ';
    }
  }

  if (current !== '') {
    paragraphs.push(current);
  }

  return paragraphs;
}
