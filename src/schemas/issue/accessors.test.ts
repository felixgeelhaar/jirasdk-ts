import { describe, it, expect } from 'vitest';
import {
  getDescriptionText,
  getEnvironmentText,
  getCommentBodyText,
  getWorklogCommentText,
  getCreatedDate,
  getUpdatedDate,
  getResolutionDate,
  getDueDate,
  getCommentCreatedDate,
  getCommentUpdatedDate,
  getAttachmentCreatedDate,
  getWorklogStartedDate,
} from './accessors.js';
import {
  setDescription,
  setDescriptionText,
  setEnvironment,
  setEnvironmentText,
  setBody,
  setBodyText,
  commentInputFromText,
} from './builders.js';
import type { Issue } from './issue.js';
import type { Comment } from './comment.js';
import type { Worklog } from './worklog.js';
import type { Attachment } from './attachment.js';
import type { AdfDocument } from '../common/index.js';

const adfHello: AdfDocument = {
  version: 1,
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
};

function makeIssue(fields: Partial<Issue['fields']> = {}): Issue {
  return {
    id: '10001',
    key: 'PROJECT-1',
    self: 'https://example.atlassian.net/rest/api/3/issue/10001',
    fields: {
      summary: 'Summary',
      status: { self: 'https://example.atlassian.net/rest/api/3/status/1', id: '1', name: 'Open' },
      issuetype: {
        self: 'https://example.atlassian.net/rest/api/3/issuetype/1',
        id: '1',
        name: 'Task',
        subtask: false,
      },
      project: {
        self: 'https://example.atlassian.net/rest/api/3/project/10000',
        id: '10000',
        key: 'PROJECT',
        name: 'Test Project',
      },
      created: null,
      updated: null,
      resolutiondate: null,
      ...fields,
    },
  };
}

describe('issue accessors', () => {
  describe('ADF flattening', () => {
    it('should flatten an ADF description to plain text', () => {
      expect(getDescriptionText(makeIssue({ description: adfHello }))).toBe('Hello world');
    });

    it('should pass through a plain string description', () => {
      expect(getDescriptionText(makeIssue({ description: 'legacy text' }))).toBe('legacy text');
    });

    it('should return an empty string for a missing or null description', () => {
      expect(getDescriptionText(makeIssue())).toBe('');
      expect(getDescriptionText(makeIssue({ description: null }))).toBe('');
      expect(getDescriptionText(undefined)).toBe('');
    });

    it('should flatten the environment field', () => {
      expect(getEnvironmentText(makeIssue({ environment: adfHello }))).toBe('Hello world');
      expect(getEnvironmentText(makeIssue())).toBe('');
    });

    it('should flatten a comment body', () => {
      const comment: Comment = {
        self: 'https://example.atlassian.net/rest/api/3/issue/10001/comment/1',
        id: '1',
        body: adfHello,
        created: null,
        updated: null,
      };

      expect(getCommentBodyText(comment)).toBe('Hello world');
      expect(getCommentBodyText(null)).toBe('');
    });

    it('should flatten a worklog comment', () => {
      const worklog: Worklog = {
        self: 'https://example.atlassian.net/rest/api/3/issue/10001/worklog/1',
        id: '1',
        started: '2024-01-15T09:00:00.000+0000',
        timeSpent: '1h',
        timeSpentSeconds: 3600,
        comment: adfHello,
        created: null,
        updated: null,
      };

      expect(getWorklogCommentText(worklog)).toBe('Hello world');
      expect(getWorklogCommentText(undefined)).toBe('');
    });
  });

  describe('date parsing', () => {
    it('should parse Jira datetimes with a colon-less offset', () => {
      const created = getCreatedDate(makeIssue({ created: '2024-01-15T10:30:00.000+0000' }));

      expect(created).toBeInstanceOf(Date);
      expect(created?.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should parse standard ISO datetimes', () => {
      expect(getUpdatedDate(makeIssue({ updated: '2024-02-01T00:00:00.000Z' }))?.getUTCMonth()).toBe(
        1
      );
    });

    it('should return undefined for missing, null or unparseable values', () => {
      expect(getCreatedDate(makeIssue())).toBeUndefined();
      expect(getUpdatedDate(makeIssue())).toBeUndefined();
      expect(getCreatedDate(makeIssue({ created: 'not-a-date' }))).toBeUndefined();
      expect(getCreatedDate(null)).toBeUndefined();
    });

    it('should parse the resolution date', () => {
      expect(
        getResolutionDate(makeIssue({ resolutiondate: '2024-03-01T12:00:00.000+0100' }))
      ).toBeInstanceOf(Date);
      expect(getResolutionDate(makeIssue())).toBeUndefined();
    });

    it('should parse the due date from a bare YYYY-MM-DD value', () => {
      expect(getDueDate(makeIssue({ duedate: '2024-12-31' }))?.toISOString()).toBe(
        '2024-12-31T00:00:00.000Z'
      );
      expect(getDueDate(makeIssue({ duedate: null }))).toBeUndefined();
    });

    it('should parse comment timestamps', () => {
      const comment: Comment = {
        self: 'https://example.atlassian.net/rest/api/3/issue/10001/comment/1',
        id: '1',
        body: 'text',
        created: '2024-01-15T10:00:00.000+0000',
        updated: '2024-01-16T10:00:00.000+0000',
      };

      expect(getCommentCreatedDate(comment)?.toISOString()).toBe('2024-01-15T10:00:00.000Z');
      expect(getCommentUpdatedDate(comment)?.toISOString()).toBe('2024-01-16T10:00:00.000Z');
    });

    it('should parse attachment and worklog timestamps', () => {
      const attachment: Attachment = {
        self: 'https://example.atlassian.net/rest/api/3/attachment/1',
        id: '1',
        filename: 'a.txt',
        created: '2024-01-15T10:00:00.000+0000',
        size: 1,
        mimeType: 'text/plain',
        content: 'https://example.atlassian.net/rest/api/3/attachment/content/1',
      };

      const worklog: Worklog = {
        self: 'https://example.atlassian.net/rest/api/3/issue/10001/worklog/1',
        id: '1',
        started: '2024-01-15T09:00:00.000+0000',
        timeSpent: '1h',
        timeSpentSeconds: 3600,
        created: null,
        updated: null,
      };

      expect(getAttachmentCreatedDate(attachment)?.toISOString()).toBe('2024-01-15T10:00:00.000Z');
      expect(getWorklogStartedDate(worklog)?.toISOString()).toBe('2024-01-15T09:00:00.000Z');
      expect(getAttachmentCreatedDate(undefined)).toBeUndefined();
      expect(getWorklogStartedDate(null)).toBeUndefined();
    });
  });
});

describe('issue builders', () => {
  it('should set a description from plain text as ADF', () => {
    const fields = setDescriptionText({ summary: 'S' }, 'Line one\n\nLine two');

    expect(fields.summary).toBe('S');
    expect(fields.description.type).toBe('doc');
    expect(fields.description.content).toHaveLength(2);
  });

  it('should set a description from an ADF document', () => {
    expect(setDescription({ summary: 'S' }, adfHello).description).toEqual(adfHello);
  });

  it('should not mutate the input object', () => {
    const original = { summary: 'S' };
    setDescriptionText(original, 'text');

    expect(original).toEqual({ summary: 'S' });
  });

  it('should set the environment from text and from ADF', () => {
    expect(setEnvironmentText({}, 'Prod').environment.type).toBe('doc');
    expect(setEnvironment({}, adfHello).environment).toEqual(adfHello);
  });

  it('should set a comment body from text and from ADF', () => {
    const input = { body: 'old' as string, visibility: { type: 'role' as const, value: 'Admin' } };

    const fromText = setBodyText(input, 'new body');
    expect(fromText.visibility).toEqual({ type: 'role', value: 'Admin' });
    expect(fromText.body).toEqual(expect.objectContaining({ type: 'doc' }));

    expect(setBody(input, adfHello).body).toEqual(adfHello);
  });

  it('should build a comment input from text', () => {
    expect(commentInputFromText('hi').body.content).toHaveLength(1);
  });
});
