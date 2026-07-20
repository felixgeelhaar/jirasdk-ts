/**
 * Shared pagination primitives.
 *
 * Jira uses two pagination styles:
 *
 * - **Offset based** (`startAt` / `maxResults` / `total` / `isLast`) — used by
 *   almost every endpoint. See {@link paginate}.
 * - **Token based** (`nextPageToken`, no `total`) — used by the Enhanced JQL
 *   Search API. See {@link paginateByToken}.
 */

/** Default page size when a caller does not specify one. */
export const DEFAULT_MAX_RESULTS = 50;

/** Largest page size the Jira API accepts for most endpoints. */
export const MAX_MAX_RESULTS = 100;

/**
 * Pagination metadata returned alongside a page of results.
 */
export interface PageInfo {
  /** Index of the first item in this page (0-based) */
  startAt: number;
  /** Maximum number of items the page could contain */
  maxResults: number;
  /** Total number of items available; omitted by some endpoints */
  total?: number | undefined;
  /** Whether this is the final page; omitted by some endpoints */
  isLast?: boolean | undefined;
}

/** A page of offset-paginated results. */
export interface Page<T> {
  items: T[];
  pageInfo: PageInfo;
}

/** A page of token-paginated results. */
export interface TokenPage<T> {
  items: T[];
  /** Token for the following page; absent or empty when this is the last page */
  nextPageToken?: string | undefined;
}

/** Options accepted by {@link paginate}. */
export interface PaginateOptions {
  /** Index to start from (0-based, default `0`) */
  startAt?: number | undefined;
  /** Stop after yielding this many items */
  maxItems?: number | undefined;
}

/** Options accepted by {@link paginateByToken}. */
export interface PaginateByTokenOptions {
  /** Resume from a previously returned page token */
  initialToken?: string | undefined;
  /** Stop after yielding this many items */
  maxItems?: number | undefined;
}

/**
 * Whether more pages follow the given page.
 *
 * `isLast` wins when present; otherwise `startAt + maxResults < total` decides.
 * When neither is available the answer is `false`, so callers stop rather than
 * loop forever against an endpoint that reports no pagination metadata.
 *
 * @param page - The page metadata
 * @returns True when another page should be fetched
 */
export function hasNextPage(page: PageInfo): boolean {
  if (page.isLast === true) {
    return false;
  }
  if (page.total !== undefined) {
    return page.startAt + page.maxResults < page.total;
  }
  return page.isLast === false;
}

/**
 * The `startAt` value for the page after the given one.
 *
 * @param page - The page metadata
 * @returns The next offset
 */
export function nextStartAt(page: PageInfo): number {
  return page.startAt + page.maxResults;
}

/**
 * Clamps a requested page size into the range Jira accepts.
 *
 * @param maxResults - The requested page size, if any
 * @returns A page size between 1 and {@link MAX_MAX_RESULTS}
 */
export function normalizeMaxResults(maxResults?: number): number {
  if (maxResults === undefined || !Number.isFinite(maxResults) || maxResults <= 0) {
    return DEFAULT_MAX_RESULTS;
  }
  return Math.min(Math.trunc(maxResults), MAX_MAX_RESULTS);
}

/**
 * Turns an offset-paginated endpoint into an async iterator over its items.
 *
 * Pages are fetched lazily, one at a time, so `break`ing out of the loop stops
 * making requests. Errors thrown by `fetchPage` propagate to the consumer.
 *
 * @param fetchPage - Fetches the page starting at the given offset
 * @param options - Starting offset and item cap
 * @returns An async generator over every item across all pages
 *
 * @example
 * ```ts
 * for await (const issue of paginate((startAt) => fetchIssues({ startAt }))) {
 *   console.log(issue.key);
 * }
 * ```
 */
export async function* paginate<T>(
  fetchPage: (startAt: number) => Promise<Page<T>>,
  options: PaginateOptions = {}
): AsyncGenerator<T, void, undefined> {
  const maxItems = options.maxItems ?? Infinity;
  let startAt = options.startAt ?? 0;
  let yielded = 0;

  while (yielded < maxItems) {
    const { items, pageInfo } = await fetchPage(startAt);

    for (const item of items) {
      yield item;
      yielded++;
      if (yielded >= maxItems) {
        return;
      }
    }

    if (items.length === 0 || !hasNextPage(pageInfo)) {
      return;
    }

    const next = nextStartAt(pageInfo);
    if (next <= startAt) {
      // Defensive: a page reporting maxResults <= 0 would loop forever.
      return;
    }
    startAt = next;
  }
}

/**
 * Turns a token-paginated endpoint (the Enhanced JQL Search API) into an async
 * iterator over its items.
 *
 * Iteration stops when a page comes back without a `nextPageToken`, when a
 * page is empty, or when the server repeats a token it already returned.
 *
 * @param fetchPage - Fetches the page for the given token (`undefined` = first page)
 * @param options - Initial token and item cap
 * @returns An async generator over every item across all pages
 */
export async function* paginateByToken<T>(
  fetchPage: (pageToken: string | undefined) => Promise<TokenPage<T>>,
  options: PaginateByTokenOptions = {}
): AsyncGenerator<T, void, undefined> {
  const maxItems = options.maxItems ?? Infinity;
  const seenTokens = new Set<string>();
  let token = options.initialToken;
  let yielded = 0;

  while (yielded < maxItems) {
    const page = await fetchPage(token);

    for (const item of page.items) {
      yield item;
      yielded++;
      if (yielded >= maxItems) {
        return;
      }
    }

    const nextToken = page.nextPageToken;
    if (nextToken === undefined || nextToken === '' || page.items.length === 0) {
      return;
    }
    if (seenTokens.has(nextToken)) {
      // Defensive: a repeated token would loop forever.
      return;
    }
    seenTokens.add(nextToken);
    token = nextToken;
  }
}

/**
 * Collects an async iterable into an array — the `all()` counterpart to an
 * `iterate()` generator.
 *
 * @param source - The async iterable to drain
 * @param maxItems - Optional cap on the number of collected items
 * @returns Every item produced by the iterable
 */
export async function collect<T>(source: AsyncIterable<T>, maxItems?: number): Promise<T[]> {
  const limit = maxItems ?? Infinity;
  const results: T[] = [];

  for await (const item of source) {
    if (results.length >= limit) {
      break;
    }
    results.push(item);
  }

  return results;
}
