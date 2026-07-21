import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExpressionService } from './expression.service.js';
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
    request: { method: 'POST', url: '/test', headers: {} },
    responseTime: 100,
  };
}

describe('ExpressionService', () => {
  let service: ExpressionService;
  let mockHttp: HttpClient;

  beforeEach(() => {
    mockHttp = createMockHttpClient();
    service = new ExpressionService(mockHttp, '/rest/api/3');
  });

  /* eslint-disable @typescript-eslint/no-deprecated -- exercising the deprecated legacy endpoint on purpose */
  describe('evaluate (deprecated)', () => {
    it('should post to the legacy eval endpoint', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse({
          value: 'Fix the bug',
          meta: { complexity: { steps: 3, expensiveOperations: 0 } },
        })
      );

      const result = await service.evaluate({
        expression: 'issue.summary',
        context: { issue: { key: 'PROJ-123' } },
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/expression/eval',
        {
          expression: 'issue.summary',
          context: { issue: { key: 'PROJ-123' } },
        },
        undefined
      );
      expect(result.value).toBe('Fix the bug');
      expect(result.meta?.complexity?.steps).toBe(3);
    });

    it('should reject an empty expression', async () => {
      await expect(service.evaluate({ expression: '' })).rejects.toThrow();
      expect(mockHttp.post).not.toHaveBeenCalled();
    });
  });
  /* eslint-enable @typescript-eslint/no-deprecated */

  describe('evaluateExpression', () => {
    it('should post to the enhanced search evaluate endpoint', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(createMockResponse({ value: 42 }));

      const result = await service.evaluateExpression({ expression: '1 + 41' });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/expression/evaluate',
        { expression: '1 + 41' },
        undefined
      );
      expect(result.value).toBe(42);
    });

    it('should surface evaluation errors from the response', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse({
          value: null,
          errors: [{ type: 'syntax', message: 'Unexpected token', line: 1, column: 5 }],
        })
      );

      const result = await service.evaluateExpression({ expression: 'issue..summary' });

      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.message).toBe('Unexpected token');
    });
  });

  describe('analyze', () => {
    it('should post to the analyse endpoint', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse({
          results: [
            { expression: 'issue.summary', valid: true, type: 'String' },
            { expression: 'user.displayName', valid: true, type: 'String' },
          ],
        })
      );

      const result = await service.analyze({
        expressions: ['issue.summary', 'user.displayName'],
      });

      expect(mockHttp.post).toHaveBeenCalledWith(
        '/rest/api/3/expression/analyse',
        { expressions: ['issue.summary', 'user.displayName'] },
        undefined
      );
      expect(result.results).toHaveLength(2);
    });

    it('should reject an empty expression list', async () => {
      await expect(service.analyze({ expressions: [] })).rejects.toThrow();
      expect(mockHttp.post).not.toHaveBeenCalled();
    });

    it('should throw on an invalid response shape', async () => {
      vi.mocked(mockHttp.post).mockResolvedValueOnce(
        createMockResponse({ results: [{ expression: 'issue.summary' }] })
      );

      await expect(service.analyze({ expressions: ['issue.summary'] })).rejects.toThrow(
        ResponseValidationError
      );
    });
  });
});
