import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LabelService } from './label.service.js';
import { ResponseValidationError } from '../errors/index.js';
import type { HttpClient, HttpResponse } from '../transport/index.js';

// Create mock HTTP client
function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    request: vi.fn(),
    use: vi.fn(),
    getBaseUrl: vi.fn().mockReturnValue('https://example.atlassian.net'),
    getAuth: vi.fn(),
  } as unknown as HttpClient;
}

function createMockResponse<T>(data: T): HttpResponse<T> {
  return {
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
    data,
    request: { method: 'GET', url: '/test', headers: {} },
    responseTime: 100,
  };
}

describe('LabelService', () => {
  let service: LabelService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new LabelService(mockHttp, '/rest/api/3');
  });

  describe('list', () => {
    it('should list labels', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          values: ['bug', 'feature'],
          startAt: 0,
          maxResults: 50,
          total: 2,
          isLast: true,
        })
      );

      const labels = await service.list();

      expect(mockHttp.get).toHaveBeenCalledWith('/rest/api/3/label', {}, undefined);
      expect(labels).toEqual(['bug', 'feature']);
    });

    it('should pass pagination and query params', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ values: ['bug'], isLast: true })
      );

      await service.list({ startAt: 10, maxResults: 25, query: 'bu' });

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/label',
        { startAt: 10, maxResults: 25, query: 'bu' },
        undefined
      );
    });

    it('should throw on an invalid response shape', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ values: [1, 2] }));

      await expect(service.list()).rejects.toThrow(ResponseValidationError);
    });
  });

  // `/rest/api/3/label/suggest` (the Go SDK's path) is not part of the v3 API.
  // Label autocompletion is served by the JQL autocomplete endpoint.
  describe('suggest', () => {
    it('should return label suggestions from the JQL autocomplete endpoint', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({
          results: [
            { value: 'bug', displayName: '<b>bu</b>g' },
            { value: 'bugfix', displayName: '<b>bu</b>gfix' },
          ],
        })
      );

      const suggestions = await service.suggest('bu');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/jql/autocompletedata/suggestions',
        { fieldName: 'labels', fieldValue: 'bu' },
        undefined
      );
      expect(suggestions).toEqual(['bug', 'bugfix']);
    });

    it('should omit an empty query but always send fieldName', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ results: [] }));

      const suggestions = await service.suggest('');

      expect(mockHttp.get).toHaveBeenCalledWith(
        '/rest/api/3/jql/autocompletedata/suggestions',
        { fieldName: 'labels' },
        undefined
      );
      expect(suggestions).toEqual([]);
    });

    it('should tolerate a missing results array and value-less entries', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({}));
      await expect(service.suggest('bu')).resolves.toEqual([]);

      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ results: [{ displayName: 'no value' }, { value: 'bug' }] })
      );
      await expect(service.suggest('bu')).resolves.toEqual(['bug']);
    });
  });

  describe('iterate', () => {
    it('should paginate through every label', async () => {
      vi.mocked(mockHttp.get)
        .mockResolvedValueOnce(
          createMockResponse({
            values: ['a', 'b'],
            startAt: 0,
            maxResults: 2,
            total: 3,
            isLast: false,
          })
        )
        .mockResolvedValueOnce(
          createMockResponse({
            values: ['c'],
            startAt: 2,
            maxResults: 2,
            total: 3,
            isLast: true,
          })
        );

      const labels: string[] = [];
      for await (const label of service.iterate({ maxResults: 2 })) {
        labels.push(label);
      }

      expect(labels).toEqual(['a', 'b', 'c']);
      expect(mockHttp.get).toHaveBeenNthCalledWith(
        1,
        '/rest/api/3/label',
        { startAt: 0, maxResults: 2 },
        undefined
      );
      expect(mockHttp.get).toHaveBeenNthCalledWith(
        2,
        '/rest/api/3/label',
        { startAt: 2, maxResults: 2 },
        undefined
      );
    });

    it('should stop on an empty page', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ values: [] }));

      const labels: string[] = [];
      for await (const label of service.iterate()) {
        labels.push(label);
      }

      expect(labels).toEqual([]);
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });

    it('should stop on a short page when no pagination metadata is present', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(createMockResponse({ values: ['a'] }));

      const labels: string[] = [];
      for await (const label of service.iterate({ maxResults: 10 })) {
        labels.push(label);
      }

      expect(labels).toEqual(['a']);
      expect(mockHttp.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('all', () => {
    it('should collect every label into an array', async () => {
      vi.mocked(mockHttp.get).mockResolvedValueOnce(
        createMockResponse({ values: ['a', 'b'], total: 2, isLast: true })
      );

      const labels = await service.all();

      expect(labels).toEqual(['a', 'b']);
    });
  });
});
