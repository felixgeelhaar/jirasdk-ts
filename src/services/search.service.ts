import { z } from 'zod';
import { BaseService } from './base.service.js';
import { IssueSchema, IssueFieldsSchema, type Issue } from '../schemas/index.js';

/**
 * Search result schema
 */
const SearchResultSchema = z.object({
  expand: z.string().optional(),
  startAt: z.number(),
  maxResults: z.number(),
  total: z.number(),
  issues: z.array(IssueSchema),
  warningMessages: z.array(z.string()).optional(),
  names: z.record(z.string(), z.string()).optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

/**
 * Issue shape returned by the Enhanced JQL Search API.
 *
 * The enhanced endpoint is field-selective: unless you ask for `*all` /
 * `*navigable`, Jira returns only the fields you named (by default just the
 * issue ID). Every field is therefore optional here — validating against the
 * full {@link IssueSchema} would reject perfectly valid, sparse responses.
 */
const SearchJqlIssueSchema = IssueSchema.extend({
  fields: IssueFieldsSchema.partial().optional(),
});

export type SearchJqlIssue = z.infer<typeof SearchJqlIssueSchema>;

/**
 * Enhanced JQL search result schema
 *
 * Note: there is no `total` — the enhanced endpoint deliberately omits it for
 * performance. Pagination is driven by `nextPageToken`.
 */
const SearchJqlResultSchema = z.object({
  issues: z.array(SearchJqlIssueSchema),
  nextPageToken: z.string().optional(),
  maxResults: z.number().optional(),
  names: z.record(z.string(), z.string()).optional(),
  schema: z.record(z.string(), z.unknown()).optional(),
  warningMessages: z.array(z.string()).optional(),
});

export type SearchJqlResult = z.infer<typeof SearchJqlResultSchema>;

/**
 * Options for the Enhanced JQL Search API (`POST /rest/api/3/search/jql`)
 */
export interface SearchJqlOptions {
  /**
   * JQL query string (required)
   */
  jql: string;

  /**
   * Fields to include in the response.
   *
   * IMPORTANT: this endpoint does NOT default to navigable fields. If you omit
   * `fields`, Jira returns the issue ID only — `issue.fields` will be
   * `undefined`. Pass `['*all']` for every field, `['*navigable']` for the
   * legacy default, or an explicit list such as `['summary', 'status']`.
   */
  fields?: string[];

  /**
   * Sections to expand
   */
  expand?: string[];

  /**
   * Maximum results per page. Up to 5000 when few fields are requested;
   * the server default (typically 50) applies when omitted.
   */
  maxResults?: number;

  /**
   * Pagination token from the previous response. Omit for the first page.
   */
  nextPageToken?: string;

  /**
   * Request fields by key instead of ID
   */
  fieldsByKeys?: boolean;

  /**
   * Issue properties to include
   */
  properties?: string[];

  /**
   * Validate the JQL before executing
   */
  validateQuery?: 'strict' | 'warn' | 'none';
}

/**
 * Default page size used by {@link SearchService.iterateJql}, matching the Go SDK.
 */
const DEFAULT_JQL_PAGE_SIZE = 100;

/**
 * Search options
 */
export interface SearchOptions {
  /**
   * JQL query string
   */
  jql: string;

  /**
   * Starting index (0-based)
   */
  startAt?: number;

  /**
   * Maximum results to return (max 100)
   */
  maxResults?: number;

  /**
   * Fields to include in the response
   */
  fields?: string[];

  /**
   * Sections to expand
   */
  expand?: string[];

  /**
   * Properties to include
   */
  properties?: string[];

  /**
   * Request fields by key instead of ID
   */
  fieldsByKeys?: boolean;

  /**
   * Validate JQL before executing
   */
  validateQuery?: 'strict' | 'warn' | 'none';
}

/**
 * Search service for JQL queries
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * // Search with JQL
 * const results = await client.search.jql('project = PROJECT AND status = Open');
 *
 * // Search with options
 * const results = await client.search.search({
 *   jql: 'project = PROJECT',
 *   maxResults: 50,
 *   fields: ['summary', 'status', 'assignee'],
 * });
 *
 * // Iterate all results
 * for await (const issue of client.search.iterate('project = PROJECT')) {
 *   console.log(issue.key);
 * }
 * ```
 */
export class SearchService extends BaseService {
  /**
   * Execute a JQL search against the legacy search endpoint
   *
   * `POST /rest/api/3/search`
   *
   * @param options - Search options (JQL plus offset pagination)
   * @returns A page of results including a `total` count
   *
   * @deprecated Use {@link SearchService.searchJql} instead. Atlassian is
   * retiring `/rest/api/3/search` in favour of the Enhanced JQL Search API.
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    const body = {
      jql: options.jql,
      startAt: options.startAt ?? 0,
      maxResults: options.maxResults ?? 50,
      fields: options.fields,
      expand: options.expand,
      properties: options.properties,
      fieldsByKeys: options.fieldsByKeys,
      validateQuery: options.validateQuery,
    };

    return this.postMethod('/search', SearchResultSchema, body);
  }

  /**
   * Convenience method for simple JQL search
   *
   * @param query - JQL query string
   * @param options - Additional search options
   * @returns A page of results
   *
   * @deprecated Use {@link SearchService.searchJql} instead.
   */
  async jql(query: string, options?: Omit<SearchOptions, 'jql'>): Promise<SearchResult> {
    return this.search({ jql: query, ...options });
  }

  /**
   * Async iterator for paginating through all search results
   *
   * @example
   * ```typescript
   * for await (const issue of client.search.iterate('project = PROJECT')) {
   *   console.log(issue.key, issue.fields.summary);
   * }
   * ```
   *
   * @deprecated Use {@link SearchService.iterateJql} instead.
   */
  async *iterate(
    jql: string,
    options?: Omit<SearchOptions, 'jql' | 'startAt'>
  ): AsyncGenerator<Issue, void, undefined> {
    const pageSize = options?.maxResults ?? 50;
    let startAt = 0;
    let hasMore = true;

    while (hasMore) {
      const result = await this.search({
        jql,
        ...options,
        startAt,
        maxResults: pageSize,
      });

      for (const issue of result.issues) {
        yield issue;
      }

      startAt += result.issues.length;
      hasMore = startAt < result.total;
    }
  }

  /**
   * Get all issues matching a JQL query (loads all pages into memory)
   * Use with caution for large result sets - prefer iterate() instead
   *
   * @deprecated Use {@link SearchService.allJql} instead.
   */
  async all(jql: string, options?: Omit<SearchOptions, 'jql' | 'startAt'>): Promise<Issue[]> {
    const issues: Issue[] = [];
    for await (const issue of this.iterate(jql, options)) {
      issues.push(issue);
    }
    return issues;
  }

  /**
   * Count issues matching a JQL query (more efficient than fetching all)
   */
  async count(jql: string): Promise<number> {
    const result = await this.search({
      jql,
      maxResults: 0,
      fields: [],
    });
    return result.total;
  }
}
