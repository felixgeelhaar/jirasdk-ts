import { describe, it, expect } from 'vitest';
import {
  JqlQueryBuilder,
  jql,
  escapeJqlValue,
  quoteJqlValue,
  assertJqlFieldName,
  parseIssueUrl,
  tryParseIssueUrl,
} from './index.js';

describe('JQL escaping', () => {
  describe('escapeJqlValue', () => {
    it('leaves plain values untouched', () => {
      expect(escapeJqlValue('PROJ')).toBe('PROJ');
    });

    it('escapes double quotes', () => {
      expect(escapeJqlValue('say "hi"')).toBe('say \\"hi\\"');
    });

    it('escapes backslashes before quotes so they cannot be smuggled', () => {
      expect(escapeJqlValue('a\\"b')).toBe('a\\\\\\"b');
    });

    it('escapes control whitespace', () => {
      expect(escapeJqlValue('a\nb\rc\td')).toBe('a\\nb\\rc\\td');
    });
  });

  describe('quoteJqlValue', () => {
    it('always quotes, even for simple values', () => {
      expect(quoteJqlValue('PROJ')).toBe('"PROJ"');
    });

    it('quotes reserved words so they are treated as literals', () => {
      expect(quoteJqlValue('AND')).toBe('"AND"');
      expect(quoteJqlValue('ORDER')).toBe('"ORDER"');
      expect(quoteJqlValue('EMPTY')).toBe('"EMPTY"');
    });

    it('quotes the empty string', () => {
      expect(quoteJqlValue('')).toBe('""');
    });
  });

  describe('assertJqlFieldName', () => {
    it.each(['created', 'issuetype', 'Sprint_1', 'cf[10004]', 'foo.bar'])('accepts %s', (field) => {
      expect(assertJqlFieldName(field)).toBe(field);
    });

    it.each(['created DESC, x', 'created; DROP', '1field', '', 'created)'])(
      'rejects %s',
      (field) => {
        expect(() => assertJqlFieldName(field)).toThrow(/Invalid JQL field name/);
      }
    );
  });
});

describe('JqlQueryBuilder', () => {
  describe('injection safety', () => {
    it('neutralises a quote break-out attempt', () => {
      const query = jql().project('X" OR project != "X').build();

      expect(query).toBe('project = "X\\" OR project != \\"X"');
    });

    it('neutralises a backslash-assisted break-out (the Go SDK is vulnerable here)', () => {
      // In Go, `quote` escapes `"` but not `\`, so `a\" OR project = X` becomes
      // `"a\\" OR project = X"` — the trailing backslash escapes the escape and
      // the rest of the payload lands outside the string literal.
      const query = jql().project('a\\" OR project = X').build();

      expect(query).toBe('project = "a\\\\\\" OR project = X"');
    });

    it('quotes values containing JQL syntax characters', () => {
      expect(jql().status('Done (verified), really').build()).toBe(
        'status = "Done (verified), really"'
      );
    });

    it('quotes newline payloads', () => {
      expect(jql().text('a\nORDER BY created').build()).toBe('text ~ "a\\nORDER BY created"');
    });
  });

  describe('clauses', () => {
    it('builds a project filter', () => {
      expect(jql().project('PROJ').build()).toBe('project = "PROJ"');
    });

    it('builds a status filter', () => {
      expect(jql().status('In Progress').build()).toBe('status = "In Progress"');
    });

    it('builds an issue type filter', () => {
      expect(jql().issueType('Bug').build()).toBe('issuetype = "Bug"');
    });

    it('builds an assignee filter', () => {
      expect(jql().assignee('acc-1').build()).toBe('assignee = "acc-1"');
    });

    it('maps an empty assignee to "is EMPTY"', () => {
      expect(jql().assignee('').build()).toBe('assignee is EMPTY');
    });

    it('builds a reporter filter', () => {
      expect(jql().reporter('acc-2').build()).toBe('reporter = "acc-2"');
    });

    it('builds a priority filter', () => {
      expect(jql().priority('High').build()).toBe('priority = "High"');
    });

    it('builds one clause per label, joined with AND', () => {
      expect(jql().labels('bug', 'urgent').build()).toBe('labels = "bug" AND labels = "urgent"');
    });

    it('is a no-op for an empty label list', () => {
      expect(jql().labels().build()).toBe('');
    });

    it('builds text, summary and description filters', () => {
      expect(jql().text('a').build()).toBe('text ~ "a"');
      expect(jql().summary('b').build()).toBe('summary ~ "b"');
      expect(jql().description('c').build()).toBe('description ~ "c"');
    });

    it('builds date filters', () => {
      expect(jql().createdAfter('2024-01-01').build()).toBe('created >= "2024-01-01"');
      expect(jql().createdBefore('-7d').build()).toBe('created <= "-7d"');
      expect(jql().updatedAfter('2024-01-01').build()).toBe('updated >= "2024-01-01"');
      expect(jql().updatedBefore('now()').build()).toBe('updated <= "now()"');
    });

    it('formats Date objects as YYYY-MM-DD', () => {
      expect(jql().createdAfter(new Date('2024-05-06T12:00:00Z')).build()).toBe(
        'created >= "2024-05-06"'
      );
    });
  });

  describe('operators', () => {
    it('joins consecutive clauses with AND automatically', () => {
      expect(jql().project('PROJ').status('Open').build()).toBe(
        'project = "PROJ" AND status = "Open"'
      );
    });

    it('honours an explicit or()', () => {
      expect(jql().status('Open').or().status('Reopened').build()).toBe(
        'status = "Open" OR status = "Reopened"'
      );
    });

    it('does not double up when and() is explicit', () => {
      expect(jql().project('PROJ').and().status('Open').build()).toBe(
        'project = "PROJ" AND status = "Open"'
      );
    });

    it('ignores a leading operator', () => {
      expect(jql().and().project('PROJ').build()).toBe('project = "PROJ"');
      expect(jql().or().project('PROJ').build()).toBe('project = "PROJ"');
    });

    it('ignores a doubled operator', () => {
      expect(jql().project('A').or().and().project('B').build()).toBe(
        'project = "A" OR project = "B"'
      );
    });
  });

  describe('orderBy', () => {
    it('defaults to ASC', () => {
      expect(jql().project('P').orderBy('created').build()).toBe(
        'project = "P" ORDER BY created ASC'
      );
    });

    it('accepts DESC case-insensitively', () => {
      expect(jql().orderBy('created', 'desc').build()).toBe('ORDER BY created DESC');
    });

    it('falls back to ASC for an unknown direction', () => {
      expect(jql().orderBy('created', 'sideways').build()).toBe('ORDER BY created ASC');
    });

    it('accumulates multiple terms into one clause', () => {
      expect(jql().orderBy('priority', 'DESC').orderBy('created').build()).toBe(
        'ORDER BY priority DESC, created ASC'
      );
    });

    it('always emits ORDER BY last, whatever the call order', () => {
      expect(jql().orderBy('created', 'DESC').project('P').build()).toBe(
        'project = "P" ORDER BY created DESC'
      );
    });

    it('rejects an injected field name', () => {
      expect(() => jql().orderBy('created DESC; DROP')).toThrow(/Invalid JQL field name/);
    });
  });

  describe('raw', () => {
    it('inserts a fragment verbatim and AND-joins it', () => {
      expect(jql().project('P').raw('sprint in openSprints()').build()).toBe(
        'project = "P" AND sprint in openSprints()'
      );
    });
  });

  describe('builder mechanics', () => {
    it('is immutable and branchable', () => {
      const base = jql().project('PROJ');
      const open = base.status('Open');
      const done = base.status('Done');

      expect(base.build()).toBe('project = "PROJ"');
      expect(open.build()).toBe('project = "PROJ" AND status = "Open"');
      expect(done.build()).toBe('project = "PROJ" AND status = "Done"');
    });

    it('reports emptiness', () => {
      expect(jql().isEmpty()).toBe(true);
      expect(jql().project('P').isEmpty()).toBe(false);
      expect(jql().orderBy('created').isEmpty()).toBe(false);
      expect(jql().build()).toBe('');
    });

    it('renders through toString', () => {
      expect(`${jql().project('P').build()}`).toBe('project = "P"');
      expect(String(jql().project('P'))).toBe('project = "P"');
    });

    it('exposes a create() factory', () => {
      expect(JqlQueryBuilder.create()).toBeInstanceOf(JqlQueryBuilder);
    });

    it('builds a realistic multi-clause query', () => {
      const query = jql()
        .project('PROJ')
        .status('In Progress')
        .assignee('5b10a2844c20165700ede21g')
        .labels('backend')
        .createdAfter('-30d')
        .orderBy('created', 'DESC')
        .build();

      expect(query).toBe(
        'project = "PROJ" AND status = "In Progress" AND assignee = "5b10a2844c20165700ede21g" ' +
          'AND labels = "backend" AND created >= "-30d" ORDER BY created DESC'
      );
    });
  });
});

describe('parseIssueUrl', () => {
  it('extracts the key from a browse URL', () => {
    expect(parseIssueUrl('https://example.atlassian.net/browse/PROJ-123')).toBe('PROJ-123');
  });

  it('ignores query strings and fragments', () => {
    expect(parseIssueUrl('https://example.atlassian.net/browse/PROJ-123?filter=1#comment')).toBe(
      'PROJ-123'
    );
  });

  it('handles trailing path segments', () => {
    expect(parseIssueUrl('https://example.atlassian.net/browse/PROJ-123/worklog')).toBe('PROJ-123');
  });

  it('handles a context path', () => {
    expect(parseIssueUrl('https://example.com/jira/browse/ABC-1')).toBe('ABC-1');
  });

  it('handles a bare path', () => {
    expect(parseIssueUrl('/browse/PROJ-9')).toBe('PROJ-9');
  });

  it('uppercases the key', () => {
    expect(parseIssueUrl('https://example.atlassian.net/browse/proj-7')).toBe('PROJ-7');
  });

  it('extracts the key from a board selectedIssue link', () => {
    expect(
      parseIssueUrl('https://example.atlassian.net/jira/software/projects/P/boards/1?selectedIssue=PROJ-5')
    ).toBe('PROJ-5');
  });

  it.each([
    'https://example.atlassian.net/browse/',
    'https://example.atlassian.net/browse/not-a-key',
    'https://example.atlassian.net/projects/PROJ',
    'https://example.atlassian.net/jira/boards/1?selectedIssue=nope',
    '',
  ])('throws for %s', (url) => {
    expect(() => parseIssueUrl(url)).toThrow(/Unable to extract issue key/);
  });

  describe('tryParseIssueUrl', () => {
    it('returns the key on success', () => {
      expect(tryParseIssueUrl('https://example.atlassian.net/browse/PROJ-1')).toBe('PROJ-1');
    });

    it('returns undefined instead of throwing', () => {
      expect(tryParseIssueUrl('https://example.atlassian.net/')).toBeUndefined();
    });
  });
});
