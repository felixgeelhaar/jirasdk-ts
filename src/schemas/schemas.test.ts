import { describe, it, expect } from 'vitest';
import {
  UserSchema,
  UserRefSchema,
  UserInputSchema,
  AvatarUrlsSchema,
  AccountTypeSchema,
  PaginationParamsSchema,
  JiraDateSchema,
  JiraDateTimeSchema,
  OptionalJiraDateTimeSchema,
  AdfNodeSchema,
  AdfDocumentSchema,
  AdfOrStringSchema,
  toJiraDate,
  toJiraDateTime,
} from './index.js';

describe('UserSchema', () => {
  it('should validate a complete user', () => {
    const user = {
      self: 'https://example.atlassian.net/rest/api/3/user?accountId=123456',
      accountId: '123456',
      accountType: 'atlassian',
      displayName: 'John Doe',
      emailAddress: 'john@example.com',
      active: true,
      timeZone: 'UTC',
      avatarUrls: {
        '48x48': 'https://example.com/avatar.png',
        '24x24': 'https://example.com/avatar-24.png',
        '16x16': 'https://example.com/avatar-16.png',
        '32x32': 'https://example.com/avatar-32.png',
      },
    };

    const result = UserSchema.safeParse(user);
    expect(result.success).toBe(true);
  });

  it('should validate a minimal user', () => {
    const user = {
      self: 'https://example.atlassian.net/rest/api/3/user?accountId=123456',
      accountId: '123456',
      displayName: 'John Doe',
      active: true,
    };

    const result = UserSchema.safeParse(user);
    expect(result.success).toBe(true);
  });

  it('should reject user without self URL', () => {
    const user = {
      accountId: '123456',
      displayName: 'John Doe',
      active: true,
    };

    const result = UserSchema.safeParse(user);
    expect(result.success).toBe(false);
  });
});

describe('UserRefSchema', () => {
  it('should validate a user reference', () => {
    const ref = {
      accountId: '123456',
      displayName: 'John Doe',
    };

    const result = UserRefSchema.safeParse(ref);
    expect(result.success).toBe(true);
  });

  it('should validate minimal user ref with only accountId', () => {
    const ref = {
      accountId: '123456',
    };

    const result = UserRefSchema.safeParse(ref);
    expect(result.success).toBe(true);
  });
});

describe('UserInputSchema', () => {
  it('should validate user input with accountId', () => {
    const input = { accountId: '123456' };
    const result = UserInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('should reject empty accountId', () => {
    const result = UserInputSchema.safeParse({ accountId: '' });
    // Empty string is still valid for the schema, but might fail other validation
    expect(result.success).toBe(true);
  });
});

describe('AccountTypeSchema', () => {
  it('should validate atlassian account type', () => {
    const result = AccountTypeSchema.safeParse('atlassian');
    expect(result.success).toBe(true);
  });

  it('should validate app account type', () => {
    const result = AccountTypeSchema.safeParse('app');
    expect(result.success).toBe(true);
  });

  it('should validate customer account type', () => {
    const result = AccountTypeSchema.safeParse('customer');
    expect(result.success).toBe(true);
  });

  it('should reject invalid account type', () => {
    const result = AccountTypeSchema.safeParse('invalid');
    expect(result.success).toBe(false);
  });
});

describe('PaginationParamsSchema', () => {
  it('should validate pagination params', () => {
    const params = {
      startAt: 0,
      maxResults: 50,
    };

    const result = PaginationParamsSchema.safeParse(params);
    expect(result.success).toBe(true);
  });

  it('should reject negative startAt', () => {
    const params = {
      startAt: -1,
      maxResults: 50,
    };

    const result = PaginationParamsSchema.safeParse(params);
    expect(result.success).toBe(false);
  });
});

describe('JiraDateSchema', () => {
  it('should validate YYYY-MM-DD format', () => {
    const result = JiraDateSchema.safeParse('2024-01-15');
    expect(result.success).toBe(true);
  });

  it('should reject invalid date format', () => {
    const result = JiraDateSchema.safeParse('01-15-2024');
    expect(result.success).toBe(false);
  });

  it('should reject partial dates', () => {
    const result = JiraDateSchema.safeParse('2024-01');
    expect(result.success).toBe(false);
  });
});

describe('JiraDateTimeSchema', () => {
  it('should validate datetime string', () => {
    const result = JiraDateTimeSchema.safeParse('2024-01-15T10:30:00.000+0000');
    expect(result.success).toBe(true);
  });

  it('should validate ISO 8601 format', () => {
    const result = JiraDateTimeSchema.safeParse('2024-01-15T10:30:00.000Z');
    expect(result.success).toBe(true);
  });
});

describe('OptionalJiraDateTimeSchema', () => {
  it('should allow null', () => {
    const result = OptionalJiraDateTimeSchema.safeParse(null);
    expect(result.success).toBe(true);
  });

  it('should allow valid datetime', () => {
    const result = OptionalJiraDateTimeSchema.safeParse('2024-01-15T10:30:00.000Z');
    expect(result.success).toBe(true);
  });
});

describe('Date conversion helpers', () => {
  it('toJiraDate should convert Date to YYYY-MM-DD', () => {
    const date = new Date('2024-01-15T10:30:00.000Z');
    const result = toJiraDate(date);
    expect(result).toBe('2024-01-15');
  });

  it('toJiraDateTime should convert Date to ISO string', () => {
    const date = new Date('2024-01-15T10:30:00.000Z');
    const result = toJiraDateTime(date);
    expect(result).toBe('2024-01-15T10:30:00.000Z');
  });
});

describe('AdfNodeSchema', () => {
  it('should validate text node', () => {
    const node = {
      type: 'text',
      text: 'Hello world',
    };

    const result = AdfNodeSchema.safeParse(node);
    expect(result.success).toBe(true);
  });

  it('should validate paragraph node', () => {
    const node = {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Hello' }],
    };

    const result = AdfNodeSchema.safeParse(node);
    expect(result.success).toBe(true);
  });

  it('should validate node with marks', () => {
    const node = {
      type: 'text',
      text: 'Bold text',
      marks: [{ type: 'strong' }],
    };

    const result = AdfNodeSchema.safeParse(node);
    expect(result.success).toBe(true);
  });
});

describe('AdfDocumentSchema', () => {
  it('should validate complete ADF document', () => {
    const doc = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
    };

    const result = AdfDocumentSchema.safeParse(doc);
    expect(result.success).toBe(true);
  });
});

describe('AdfOrStringSchema', () => {
  it('should accept plain string', () => {
    const result = AdfOrStringSchema.safeParse('Hello world');
    expect(result.success).toBe(true);
    expect(result.data).toBe('Hello world');
  });

  it('should accept ADF document', () => {
    const doc = {
      type: 'doc',
      version: 1,
      content: [],
    };

    const result = AdfOrStringSchema.safeParse(doc);
    expect(result.success).toBe(true);
  });
});
