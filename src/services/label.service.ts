import { BaseService } from './base.service.js';
import {
  LabelPageSchema,
  LabelSuggestionsSchema,
  type LabelPage,
  type ListLabelsOptions,
} from '../schemas/label/index.js';

/**
 * Default page size used when iterating labels.
 */
const DEFAULT_LABEL_PAGE_SIZE = 50;

/**
 * Label service for retrieving Jira labels.
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * const labels = await client.labels.list({ query: 'bug', maxResults: 50 });
 *
 * for await (const label of client.labels.iterate()) {
 *   console.log(label);
 * }
 * ```
 */
export class LabelService extends BaseService {
  /**
   * List labels, optionally filtered by a query string.
   *
   * `GET /rest/api/3/label`
   *
   * @param options - Pagination and query filter.
   * @returns The label values for the requested page.
   */
  async list(options?: ListLabelsOptions): Promise<string[]> {
    const page = await this.listPage(options);
    return page.values;
  }

  /**
   * Get label suggestions for a query string.
   *
   * `GET /rest/api/3/jql/autocompletedata/suggestions?fieldName=labels`
   *
   * Deviates from the Go SDK, which calls `GET /rest/api/3/label/suggest` and
   * reads a `{suggestions: [...]}` envelope. That endpoint is not part of the
   * v3 API — the Labels group only documents `GET /rest/api/3/label` — so the
   * Go call 404s. Label autocompletion is served by the JQL autocomplete
   * endpoint, which returns `{results: [{value, displayName}]}`.
   *
   * @param query - The partial label to get suggestions for.
   * @returns The suggested label values.
   */
  async suggest(query: string): Promise<string[]> {
    const params = this.buildParams({
      fieldName: 'labels',
      fieldValue: query === '' ? undefined : query,
    });

    const result = await this.getMethod(
      '/jql/autocompletedata/suggestions',
      LabelSuggestionsSchema,
      params
    );

    return (result.results ?? []).flatMap((suggestion) =>
      suggestion.value === undefined ? [] : [suggestion.value]
    );
  }

  /**
   * Async iterator over every label, transparently paginating.
   *
   * `GET /rest/api/3/label` (paged)
   *
   * @param options - Query filter and page size (`maxResults`).
   * @returns An async generator yielding label values one at a time.
   */
  async *iterate(
    options?: Omit<ListLabelsOptions, 'startAt'>
  ): AsyncGenerator<string, void, undefined> {
    const pageSize = options?.maxResults ?? DEFAULT_LABEL_PAGE_SIZE;
    let startAt = 0;

    for (;;) {
      const page = await this.listPage({ ...options, startAt, maxResults: pageSize });

      for (const label of page.values) {
        yield label;
      }

      if (page.values.length === 0) {
        return;
      }

      startAt += page.values.length;

      if (page.isLast === true) {
        return;
      }

      if (page.total !== undefined && startAt >= page.total) {
        return;
      }

      // Without `isLast` or `total` a short page marks the end.
      if (page.isLast === undefined && page.total === undefined && page.values.length < pageSize) {
        return;
      }
    }
  }

  /**
   * Collect every label into an array (loads all pages into memory).
   *
   * @param options - Query filter and page size (`maxResults`).
   * @returns All matching label values.
   */
  async all(options?: Omit<ListLabelsOptions, 'startAt'>): Promise<string[]> {
    const labels: string[] = [];
    for await (const label of this.iterate(options)) {
      labels.push(label);
    }
    return labels;
  }

  /**
   * Fetch a single page of labels including its pagination metadata.
   */
  private async listPage(options?: ListLabelsOptions): Promise<LabelPage> {
    const params = this.buildParams({
      startAt: options?.startAt,
      maxResults: options?.maxResults,
      query: options?.query,
    });

    return this.getMethod('/label', LabelPageSchema, params);
  }
}
