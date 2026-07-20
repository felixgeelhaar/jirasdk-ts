import { describe, it, expect, vi } from 'vitest';
import {
  DEFAULT_MAX_RESULTS,
  MAX_MAX_RESULTS,
  hasNextPage,
  nextStartAt,
  normalizeMaxResults,
  paginate,
  paginateByToken,
  collect,
  type Page,
  type TokenPage,
} from './index.js';

/** Builds a fake offset-paginated endpoint over a fixed dataset. */
function offsetSource<T>(items: T[], pageSize: number, includeTotal = true) {
  return vi.fn((startAt: number): Promise<Page<T>> => {
    const slice = items.slice(startAt, startAt + pageSize);
    return Promise.resolve({
      items: slice,
      pageInfo: {
        startAt,
        maxResults: pageSize,
        ...(includeTotal ? { total: items.length } : { isLast: startAt + pageSize >= items.length }),
      },
    });
  });
}

describe('constants', () => {
  it('matches the Go SDK defaults', () => {
    expect(DEFAULT_MAX_RESULTS).toBe(50);
    expect(MAX_MAX_RESULTS).toBe(100);
  });
});

describe('hasNextPage', () => {
  it('is false when isLast is true', () => {
    expect(hasNextPage({ startAt: 0, maxResults: 50, total: 500, isLast: true })).toBe(false);
  });

  it('compares against total when isLast is absent', () => {
    expect(hasNextPage({ startAt: 0, maxResults: 50, total: 120 })).toBe(true);
    expect(hasNextPage({ startAt: 100, maxResults: 50, total: 120 })).toBe(false);
    expect(hasNextPage({ startAt: 0, maxResults: 50, total: 50 })).toBe(false);
  });

  it('trusts isLast: false when there is no total', () => {
    expect(hasNextPage({ startAt: 0, maxResults: 50, isLast: false })).toBe(true);
  });

  it('stops when there is no metadata at all', () => {
    expect(hasNextPage({ startAt: 0, maxResults: 50 })).toBe(false);
  });
});

describe('nextStartAt', () => {
  it('advances by the page size', () => {
    expect(nextStartAt({ startAt: 50, maxResults: 25, total: 100 })).toBe(75);
  });
});

describe('normalizeMaxResults', () => {
  it.each([
    [undefined, DEFAULT_MAX_RESULTS],
    [0, DEFAULT_MAX_RESULTS],
    [-10, DEFAULT_MAX_RESULTS],
    [Number.NaN, DEFAULT_MAX_RESULTS],
    [25, 25],
    [25.9, 25],
    [500, MAX_MAX_RESULTS],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeMaxResults(input)).toBe(expected);
  });
});

describe('paginate', () => {
  it('yields every item across pages', async () => {
    const fetchPage = offsetSource([1, 2, 3, 4, 5], 2);

    await expect(collect(paginate(fetchPage))).resolves.toEqual([1, 2, 3, 4, 5]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
    expect(fetchPage.mock.calls.map(([startAt]) => startAt)).toEqual([0, 2, 4]);
  });

  it('works with isLast-style pagination', async () => {
    const fetchPage = offsetSource(['a', 'b', 'c'], 2, false);

    await expect(collect(paginate(fetchPage))).resolves.toEqual(['a', 'b', 'c']);
  });

  it('handles an empty first page', async () => {
    const fetchPage = offsetSource<number>([], 10);

    await expect(collect(paginate(fetchPage))).resolves.toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('honours a custom starting offset', async () => {
    const fetchPage = offsetSource([1, 2, 3, 4, 5], 2);

    await expect(collect(paginate(fetchPage, { startAt: 2 }))).resolves.toEqual([3, 4, 5]);
  });

  it('stops at maxItems without fetching further pages', async () => {
    const fetchPage = offsetSource([1, 2, 3, 4, 5, 6], 2);

    await expect(collect(paginate(fetchPage, { maxItems: 3 }))).resolves.toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('is lazy: breaking out stops further requests', async () => {
    const fetchPage = offsetSource([1, 2, 3, 4, 5, 6], 2);

    for await (const item of paginate(fetchPage)) {
      if (item === 1) {
        break;
      }
    }

    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('propagates fetch errors to the consumer', async () => {
    const boom = new Error('boom');
    const fetchPage = vi.fn(() => Promise.reject(boom));

    await expect(collect(paginate<number>(fetchPage))).rejects.toThrow('boom');
  });

  it('guards against a non-advancing page', async () => {
    const fetchPage = vi.fn((startAt: number): Promise<Page<number>> =>
      Promise.resolve({
        items: [1],
        pageInfo: { startAt, maxResults: 0, total: 100 },
      })
    );

    await expect(collect(paginate(fetchPage))).resolves.toEqual([1]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });
});

describe('paginateByToken', () => {
  function tokenSource(pages: Array<TokenPage<string>>) {
    return vi.fn((token: string | undefined): Promise<TokenPage<string>> => {
      const index = token === undefined ? 0 : Number(token);
      return Promise.resolve(pages[index] ?? { items: [] });
    });
  }

  it('follows nextPageToken until it is absent', async () => {
    const fetchPage = tokenSource([
      { items: ['a', 'b'], nextPageToken: '1' },
      { items: ['c'], nextPageToken: '2' },
      { items: ['d'] },
    ]);

    await expect(collect(paginateByToken(fetchPage))).resolves.toEqual(['a', 'b', 'c', 'd']);
    expect(fetchPage.mock.calls.map(([token]) => token)).toEqual([undefined, '1', '2']);
  });

  it('treats an empty token as the end', async () => {
    const fetchPage = tokenSource([{ items: ['a'], nextPageToken: '' }]);

    await expect(collect(paginateByToken(fetchPage))).resolves.toEqual(['a']);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('resumes from an initial token', async () => {
    const fetchPage = tokenSource([
      { items: ['a'], nextPageToken: '1' },
      { items: ['b'] },
    ]);

    await expect(collect(paginateByToken(fetchPage, { initialToken: '1' }))).resolves.toEqual([
      'b',
    ]);
  });

  it('stops at maxItems', async () => {
    const fetchPage = tokenSource([
      { items: ['a', 'b'], nextPageToken: '1' },
      { items: ['c'] },
    ]);

    await expect(collect(paginateByToken(fetchPage, { maxItems: 1 }))).resolves.toEqual(['a']);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('stops on an empty page even when a token is returned', async () => {
    const fetchPage = vi.fn(
      (): Promise<TokenPage<string>> => Promise.resolve({ items: [], nextPageToken: 'x' })
    );

    await expect(collect(paginateByToken(fetchPage))).resolves.toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it('guards against a repeated token', async () => {
    const fetchPage = vi.fn(
      (): Promise<TokenPage<string>> => Promise.resolve({ items: ['a'], nextPageToken: 'same' })
    );

    await expect(collect(paginateByToken(fetchPage))).resolves.toEqual(['a', 'a']);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('propagates fetch errors', async () => {
    const fetchPage = vi.fn(() => Promise.reject(new Error('nope')));

    await expect(collect(paginateByToken<string>(fetchPage))).rejects.toThrow('nope');
  });
});

describe('collect', () => {
  it('drains an async iterable', async () => {
    async function* source(): AsyncGenerator<number, void, undefined> {
      yield 1;
      yield 2;
      yield 3;
    }

    await expect(collect(source())).resolves.toEqual([1, 2, 3]);
  });

  it('respects a maxItems cap', async () => {
    async function* source(): AsyncGenerator<number, void, undefined> {
      yield 1;
      yield 2;
      yield 3;
    }

    await expect(collect(source(), 2)).resolves.toEqual([1, 2]);
  });
});
