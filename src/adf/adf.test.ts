import { describe, it, expect } from 'vitest';
import { AdfBuilder, adf, adfFromText } from './index.js';
import { AdfDocumentSchema } from '../schemas/common/adf.js';

describe('AdfBuilder', () => {
  describe('create', () => {
    it('creates an empty document', () => {
      const builder = AdfBuilder.create();

      expect(builder.isEmpty()).toBe(true);
      expect(builder.length).toBe(0);
      expect(builder.toDocument()).toEqual({ version: 1, type: 'doc', content: [] });
    });

    it('is also available as the adf() shorthand', () => {
      expect(adf()).toBeInstanceOf(AdfBuilder);
    });
  });

  describe('fromText', () => {
    it('returns an empty document for empty text', () => {
      expect(AdfBuilder.fromText('').isEmpty()).toBe(true);
    });

    it('creates a single paragraph for single-line text', () => {
      const doc = adfFromText('Hello world').toDocument();

      expect(doc.content).toEqual([
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] },
      ]);
    });

    it('splits on blank lines into separate paragraphs', () => {
      const doc = AdfBuilder.fromText('First paragraph\n\nSecond paragraph').toDocument();

      expect(doc.content).toHaveLength(2);
      expect(doc.content[0]?.content?.[0]?.text).toBe('First paragraph');
      expect(doc.content[1]?.content?.[0]?.text).toBe('Second paragraph');
    });

    it('folds single newlines into spaces within a paragraph', () => {
      const doc = AdfBuilder.fromText('One\nTwo\n\nThree').toDocument();

      expect(doc.content).toHaveLength(2);
      expect(doc.content[0]?.content?.[0]?.text).toBe('One Two');
      expect(doc.content[1]?.content?.[0]?.text).toBe('Three');
    });

    it('ignores runs of blank lines and leading newlines', () => {
      const doc = AdfBuilder.fromText('\n\nAlpha\n\n\nBeta\n\n').toDocument();

      expect(doc.content.map((node) => node.content?.[0]?.text)).toEqual(['Alpha', 'Beta']);
    });
  });

  describe('fromDocument', () => {
    it('seeds a builder from an existing document', () => {
      const original = adfFromText('Existing').toDocument();
      const extended = AdfBuilder.fromDocument(original).addParagraph('Added').toDocument();

      expect(extended.content).toHaveLength(2);
      // The original document is untouched.
      expect(original.content).toHaveLength(1);
    });
  });

  describe('immutability', () => {
    it('returns a new builder from every add and leaves the receiver alone', () => {
      const base = adf().addParagraph('base');
      const branchA = base.addParagraph('a');
      const branchB = base.addParagraph('b');

      expect(base).not.toBe(branchA);
      expect(base.length).toBe(1);
      expect(branchA.toText()).toBe('base\na');
      expect(branchB.toText()).toBe('base\nb');
    });
  });

  describe('addHeading', () => {
    it('adds a heading with the given level', () => {
      const doc = adf().addHeading('Title', 3).toDocument();

      expect(doc.content[0]).toEqual({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Title' }],
      });
    });

    it('defaults to level 1', () => {
      expect(adf().addHeading('Title').toDocument().content[0]?.attrs).toEqual({ level: 1 });
    });

    it.each([
      [0, 1],
      [-5, 1],
      [7, 6],
      [99, 6],
      [2.7, 2],
    ])('clamps level %s to %s', (input, expected) => {
      expect(adf().addHeading('Title', input).toDocument().content[0]?.attrs).toEqual({
        level: expected,
      });
    });
  });

  describe('lists', () => {
    it('adds a bullet list', () => {
      const doc = adf().addBulletList(['one', 'two']).toDocument();

      expect(doc.content[0]).toEqual({
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'one' }] }],
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'two' }] }],
          },
        ],
      });
    });

    it('adds an ordered list', () => {
      const doc = adf().addOrderedList(['first']).toDocument();

      expect(doc.content[0]?.type).toBe('orderedList');
      expect(doc.content[0]?.content).toHaveLength(1);
    });

    it('supports empty lists', () => {
      expect(adf().addBulletList([]).toDocument().content[0]?.content).toEqual([]);
    });
  });

  describe('addCodeBlock', () => {
    it('includes the language when provided', () => {
      const doc = adf().addCodeBlock('const x = 1;', 'typescript').toDocument();

      expect(doc.content[0]).toEqual({
        type: 'codeBlock',
        attrs: { language: 'typescript' },
        content: [{ type: 'text', text: 'const x = 1;' }],
      });
    });

    it('omits attrs when no language is given', () => {
      const node = adf().addCodeBlock('plain').toDocument().content[0];

      expect(node?.attrs).toBeUndefined();
      expect(node?.type).toBe('codeBlock');
    });

    it('omits attrs for an empty language', () => {
      expect(adf().addCodeBlock('plain', '').toDocument().content[0]?.attrs).toBeUndefined();
    });
  });

  describe('addNode', () => {
    it('appends an arbitrary node', () => {
      const doc = adf().addNode({ type: 'rule' }).toDocument();

      expect(doc.content[0]).toEqual({ type: 'rule' });
    });
  });

  describe('chaining', () => {
    it('builds a document from mixed content', () => {
      const doc = adf()
        .addHeading('Release notes', 2)
        .addParagraph('Highlights:')
        .addBulletList(['Faster search', 'Fewer bugs'])
        .addCodeBlock('npm i jirasdk', 'bash')
        .toDocument();

      expect(doc.content.map((node) => node.type)).toEqual([
        'heading',
        'paragraph',
        'bulletList',
        'codeBlock',
      ]);
    });
  });

  describe('toDocument', () => {
    it('produces output that validates against AdfDocumentSchema', () => {
      const doc = adf().addParagraph('Valid').toDocument();

      expect(() => AdfDocumentSchema.parse(doc)).not.toThrow();
    });

    it('throws when an invalid node is appended', () => {
      const invalid = adf().addNode({ type: 42 } as unknown as { type: string });

      expect(() => invalid.toDocument()).toThrow();
    });
  });

  describe('toText / toJSON / toString', () => {
    it('extracts plain text', () => {
      expect(adf().addParagraph('one').addParagraph('two').toText()).toBe('one\ntwo');
    });

    it('returns an empty string for an empty document', () => {
      expect(adf().toText()).toBe('');
    });

    it('serialises through JSON.stringify', () => {
      const builder = adf().addParagraph('hi');

      expect(JSON.parse(JSON.stringify(builder))).toEqual(builder.toDocument());
    });

    it('pretty-prints via toString', () => {
      expect(adf().addParagraph('hi').toString()).toContain('\n  "type": "doc"');
    });
  });
});
