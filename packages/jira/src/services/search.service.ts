import { z } from 'zod';
import { BaseService } from './base.service.js';
import { IssueSchema, type Issue } from '../schemas/index.js';

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
   * Execute a JQL search
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
