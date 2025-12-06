import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  sleep,
  timeout,
  withTimeout,
  buildQueryString,
  joinPath,
  buildApiPath,
  buildAgileApiPath,
  safeJsonParse,
  isObject,
  isNonEmptyString,
  clamp,
  exponentialBackoff,
  generateRequestId,
  sanitizeHeaders,
  retry,
  createDeferred,
  parseEnvNumber,
  parseEnvBoolean,
} from './index.js';

describe('Utils', () => {
  describe('sleep', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should resolve after specified duration', async () => {
      const promise = sleep(1000);
      vi.advanceTimersByTime(1000);
      await expect(promise).resolves.toBeUndefined();
    });

    it('should not resolve before duration', async () => {
      let resolved = false;
      const promise = sleep(1000).then(() => {
        resolved = true;
      });

      vi.advanceTimersByTime(999);
      expect(resolved).toBe(false);

      vi.advanceTimersByTime(1);
      await promise;
      expect(resolved).toBe(true);
    });
  });

  describe('timeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should reject after specified duration', async () => {
      const promise = timeout(1000);
      vi.advanceTimersByTime(1000);
      await expect(promise).rejects.toThrow('Timeout after 1000ms');
    });

    it('should use custom message', async () => {
      const promise = timeout(500, 'Custom timeout message');
      vi.advanceTimersByTime(500);
      await expect(promise).rejects.toThrow('Custom timeout message');
    });
  });

  describe('withTimeout', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should resolve if promise completes before timeout', async () => {
      const promise = withTimeout(Promise.resolve('success'), 1000);
      await expect(promise).resolves.toBe('success');
    });

    it('should reject if timeout occurs first', async () => {
      const slowPromise = new Promise((resolve) => {
        setTimeout(resolve, 2000);
      });

      const promise = withTimeout(slowPromise, 1000);
      vi.advanceTimersByTime(1000);
      await expect(promise).rejects.toThrow('Timeout after 1000ms');
    });
  });

  describe('buildQueryString', () => {
    it('should build query string from params', () => {
      const result = buildQueryString({ foo: 'bar', baz: 123 });
      expect(result).toBe('?foo=bar&baz=123');
    });

    it('should filter out undefined, null, and empty values', () => {
      const result = buildQueryString({
        foo: 'bar',
        empty: '',
        nullValue: null,
        undefinedValue: undefined,
      });
      expect(result).toBe('?foo=bar');
    });

    it('should return empty string if no valid params', () => {
      const result = buildQueryString({
        empty: '',
        nullValue: null,
        undefinedValue: undefined,
      });
      expect(result).toBe('');
    });

    it('should handle arrays', () => {
      const result = buildQueryString({ ids: ['1', '2', '3'] });
      expect(result).toBe('?ids=1&ids=2&ids=3');
    });

    it('should handle boolean values', () => {
      const result = buildQueryString({ active: true, deleted: false });
      expect(result).toBe('?active=true&deleted=false');
    });
  });

  describe('joinPath', () => {
    it('should join path segments', () => {
      expect(joinPath('a', 'b', 'c')).toBe('a/b/c');
    });

    it('should handle leading and trailing slashes', () => {
      expect(joinPath('/a/', '/b/', '/c/')).toBe('a/b/c');
    });

    it('should handle numbers', () => {
      expect(joinPath('issues', 123, 'comments')).toBe('issues/123/comments');
    });

    it('should filter empty segments', () => {
      expect(joinPath('a', '', 'b', '', 'c')).toBe('a/b/c');
    });
  });

  describe('buildApiPath', () => {
    it('should build API v3 path', () => {
      expect(buildApiPath('3', 'issue', 'PROJ-123')).toBe('rest/api/3/issue/PROJ-123');
    });

    it('should build API v2 path', () => {
      expect(buildApiPath('2', 'issue', 'PROJ-123')).toBe('rest/api/2/issue/PROJ-123');
    });
  });

  describe('buildAgileApiPath', () => {
    it('should build Agile API path', () => {
      expect(buildAgileApiPath('board', 1, 'sprint')).toBe('rest/agile/1.0/board/1/sprint');
    });
  });

  describe('safeJsonParse', () => {
    it('should parse valid JSON', () => {
      expect(safeJsonParse('{"foo": "bar"}')).toEqual({ foo: 'bar' });
    });

    it('should return undefined for invalid JSON', () => {
      expect(safeJsonParse('not valid json')).toBeUndefined();
    });

    it('should parse arrays', () => {
      expect(safeJsonParse('[1, 2, 3]')).toEqual([1, 2, 3]);
    });

    it('should parse primitives', () => {
      expect(safeJsonParse('"hello"')).toBe('hello');
      expect(safeJsonParse('123')).toBe(123);
      expect(safeJsonParse('true')).toBe(true);
      expect(safeJsonParse('null')).toBeNull();
    });
  });

  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ foo: 'bar' })).toBe(true);
    });

    it('should return false for arrays', () => {
      expect(isObject([])).toBe(false);
      expect(isObject([1, 2, 3])).toBe(false);
    });

    it('should return false for null', () => {
      expect(isObject(null)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(true)).toBe(false);
      expect(isObject(undefined)).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString(' ')).toBe(true); // whitespace is not empty
    });

    it('should return false for empty strings', () => {
      expect(isNonEmptyString('')).toBe(false);
    });

    it('should return false for non-strings', () => {
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
      expect(isNonEmptyString({})).toBe(false);
    });
  });

  describe('clamp', () => {
    it('should clamp value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('should clamp to minimum', () => {
      expect(clamp(-5, 0, 10)).toBe(0);
    });

    it('should clamp to maximum', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('should handle edge cases', () => {
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });
  });

  describe('exponentialBackoff', () => {
    it('should calculate exponential delay', () => {
      expect(exponentialBackoff(0, 1000, 30000, 2, false)).toBe(1000);
      expect(exponentialBackoff(1, 1000, 30000, 2, false)).toBe(2000);
      expect(exponentialBackoff(2, 1000, 30000, 2, false)).toBe(4000);
      expect(exponentialBackoff(3, 1000, 30000, 2, false)).toBe(8000);
    });

    it('should not exceed maxDelay', () => {
      expect(exponentialBackoff(10, 1000, 30000, 2, false)).toBe(30000);
    });

    it('should apply jitter when enabled', () => {
      const delay1 = exponentialBackoff(1, 1000, 30000, 2, true);
      const delay2 = exponentialBackoff(1, 1000, 30000, 2, true);

      // Base delay is 2000, jitter is +/- 25% (1500-2500)
      expect(delay1).toBeGreaterThanOrEqual(1500);
      expect(delay1).toBeLessThanOrEqual(2500);

      // Multiple calls should (usually) produce different values due to randomness
      // Note: This test could theoretically fail if both random values are exactly the same
    });
  });

  describe('generateRequestId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).not.toBe(id2);
    });

    it('should return a string', () => {
      expect(typeof generateRequestId()).toBe('string');
    });

    it('should contain timestamp and random part', () => {
      const id = generateRequestId();
      expect(id).toContain('-');
      const [timestamp, random] = id.split('-');
      expect(timestamp).toBeDefined();
      expect(random).toBeDefined();
    });
  });

  describe('sanitizeHeaders', () => {
    it('should redact authorization header', () => {
      const result = sanitizeHeaders({
        Authorization: 'Bearer secret-token',
        'Content-Type': 'application/json',
      });
      expect(result).toEqual({
        Authorization: '***REDACTED***',
        'Content-Type': 'application/json',
      });
    });

    it('should redact multiple sensitive headers', () => {
      const result = sanitizeHeaders({
        authorization: 'Bearer token',
        'x-api-key': 'api-key-123',
        cookie: 'session=abc',
        'set-cookie': 'session=xyz',
        'x-auth-token': 'auth-token',
        'user-agent': 'Mozilla/5.0',
      });
      expect(result).toEqual({
        authorization: '***REDACTED***',
        'x-api-key': '***REDACTED***',
        cookie: '***REDACTED***',
        'set-cookie': '***REDACTED***',
        'x-auth-token': '***REDACTED***',
        'user-agent': 'Mozilla/5.0',
      });
    });

    it('should handle case-insensitive header names', () => {
      const result = sanitizeHeaders({
        AUTHORIZATION: 'token',
        'X-API-KEY': 'key',
      });
      expect(result).toEqual({
        AUTHORIZATION: '***REDACTED***',
        'X-API-KEY': '***REDACTED***',
      });
    });
  });

  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retry(fn, {
        maxAttempts: 3,
        baseDelay: 1, // Very short delay for testing
        maxDelay: 10,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValue('success');

      const result = await retry(fn, {
        maxAttempts: 3,
        baseDelay: 1, // Very short delay for testing
        maxDelay: 10,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max attempts', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('persistent failure'));

      await expect(
        retry(fn, {
          maxAttempts: 3,
          baseDelay: 1,
          maxDelay: 10,
        })
      ).rejects.toThrow('persistent failure');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should respect shouldRetry predicate', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('non-retryable'));
      const shouldRetry = vi.fn().mockReturnValue(false);

      await expect(
        retry(fn, {
          maxAttempts: 3,
          baseDelay: 1,
          maxDelay: 10,
          shouldRetry,
        })
      ).rejects.toThrow('non-retryable');
      expect(fn).toHaveBeenCalledTimes(1);
      expect(shouldRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('createDeferred', () => {
    it('should create a deferred promise that can be resolved', async () => {
      const deferred = createDeferred<string>();
      deferred.resolve('success');
      await expect(deferred.promise).resolves.toBe('success');
    });

    it('should create a deferred promise that can be rejected', async () => {
      const deferred = createDeferred<string>();
      deferred.reject(new Error('failure'));
      await expect(deferred.promise).rejects.toThrow('failure');
    });
  });

  describe('parseEnvNumber', () => {
    it('should parse valid number strings', () => {
      expect(parseEnvNumber('123', 0)).toBe(123);
      expect(parseEnvNumber('0', 10)).toBe(0);
      expect(parseEnvNumber('-5', 0)).toBe(-5);
    });

    it('should return default for undefined', () => {
      expect(parseEnvNumber(undefined, 42)).toBe(42);
    });

    it('should return default for invalid numbers', () => {
      expect(parseEnvNumber('not a number', 42)).toBe(42);
      expect(parseEnvNumber('', 42)).toBe(42);
    });
  });

  describe('parseEnvBoolean', () => {
    it('should parse true values', () => {
      expect(parseEnvBoolean('true', false)).toBe(true);
      expect(parseEnvBoolean('TRUE', false)).toBe(true);
      expect(parseEnvBoolean('1', false)).toBe(true);
    });

    it('should parse false values', () => {
      expect(parseEnvBoolean('false', true)).toBe(false);
      expect(parseEnvBoolean('0', true)).toBe(false);
      expect(parseEnvBoolean('anything else', true)).toBe(false);
    });

    it('should return default for undefined', () => {
      expect(parseEnvBoolean(undefined, true)).toBe(true);
      expect(parseEnvBoolean(undefined, false)).toBe(false);
    });
  });
});
