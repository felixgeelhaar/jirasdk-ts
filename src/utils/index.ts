/**
 * Utility functions for the SDK.
 */

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a timeout promise that rejects after the specified duration
 */
export function timeout(ms: number, message?: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(message ?? `Timeout after ${ms}ms`));
    }, ms);
  });
}

/**
 * Race a promise against a timeout
 */
export function promiseWithTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message?: string
): Promise<T> {
  return Promise.race([promise, timeout(ms, message)]);
}

/**
 * Build a URL query string from a parameters object.
 *
 * Returns the encoded pairs **without** a leading `?` (for example
 * `a=1&b=2`), so callers stay in control of the separator. Returns an empty
 * string when there is nothing to encode.
 *
 * Note: this previously returned a leading `?`, while the only caller also
 * prepended its own separator. The result was a doubled `??`, which made the
 * first parameter's name `?jql` rather than `jql` — so the first query
 * parameter of every request was silently dropped by Jira.
 */
export function buildQueryString(params: Record<string, unknown>): string {
  const filtered = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== ''
  );

  if (filtered.length === 0) {
    return '';
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of filtered) {
    if (Array.isArray(value)) {
      for (const item of value) {
        searchParams.append(key, String(item));
      }
    } else {
      searchParams.set(key, String(value));
    }
  }

  return searchParams.toString();
}

/**
 * Join path segments into a URL path
 */
export function joinPath(...segments: Array<string | number>): string {
  return segments
    .map(String)
    .map((s) => s.replace(/^\/+|\/+$/g, ''))
    .filter(Boolean)
    .join('/');
}

/**
 * Build a Jira REST API path
 */
export function buildApiPath(version: '2' | '3', ...segments: Array<string | number>): string {
  return joinPath('rest', 'api', version, ...segments);
}

/**
 * Build a Jira Agile API path
 */
export function buildAgileApiPath(...segments: Array<string | number>): string {
  return joinPath('rest', 'agile', '1.0', ...segments);
}

/**
 * Safely parse JSON, returning undefined on error
 */
export function safeJsonParse<T = unknown>(json: string): T | undefined {
  try {
    return JSON.parse(json) as T;
  } catch {
    return undefined;
  }
}

/**
 * Check if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Calculate exponential backoff delay
 */
export function exponentialBackoff(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  multiplier = 2,
  jitter = true
): number {
  const delay = Math.min(baseDelay * Math.pow(multiplier, attempt), maxDelay);
  if (jitter) {
    // Add random jitter of +/- 25%
    const jitterAmount = delay * 0.25;
    return delay + (Math.random() * 2 - 1) * jitterAmount;
  }
  return delay;
}

/**
 * Generate a random request ID for tracing
 */
export function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Sanitize headers for logging (redact sensitive values)
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sensitiveKeys = new Set([
    'authorization',
    'x-api-key',
    'cookie',
    'set-cookie',
    'x-auth-token',
  ]);

  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (sensitiveKeys.has(key.toLowerCase())) {
      sanitized[key] = '***REDACTED***';
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
  }
): Promise<T> {
  const { maxAttempts, baseDelay, maxDelay, shouldRetry } = options;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts - 1) {
        throw error;
      }

      if (shouldRetry && !shouldRetry(error, attempt)) {
        throw error;
      }

      const delay = exponentialBackoff(attempt, baseDelay, maxDelay);
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a deferred promise
 */
export function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/**
 * Seconds per Jira duration unit.
 *
 * Note: these are calendar units (1d = 24h, 1w = 7d), matching the Go SDK's
 * `FormatDuration`. A Jira site configured with a working day of 8h and a
 * working week of 5d will render the same number of seconds differently in its
 * UI — convert with the site's `timeTrackingConfiguration` if that matters.
 */
const DURATION_UNITS = {
  w: 7 * 24 * 3600,
  d: 24 * 3600,
  h: 3600,
  m: 60,
  s: 1,
} as const;

const DURATION_SYNTAX = /^(?:\d+(?:\.\d+)?\s*[wdhms]?\s*)+$/i;
const DURATION_TOKEN = /(\d+(?:\.\d+)?)\s*([wdhms])?/gi;

/**
 * Parse a Jira duration string into seconds.
 *
 * Accepts the units Jira uses — `w`, `d`, `h`, `m`, `s` — in any order, with
 * or without spaces. A bare number is interpreted as minutes, as Jira does.
 *
 * @param value - Duration string, e.g. `'3h 30m'`, `'1d4h'`, `'90'`
 * @returns The duration in whole seconds
 * @throws {Error} If the string is empty or not a valid duration
 *
 * @example
 * ```ts
 * parseDuration('3h 30m'); // 12600
 * parseDuration('1d 4h');  // 100800
 * ```
 */
export function parseDuration(value: string): number {
  const trimmed = value.trim();

  if (trimmed === '' || !DURATION_SYNTAX.test(trimmed)) {
    throw new Error(`Invalid duration: ${JSON.stringify(value)}. Expected a string like "3h 30m".`);
  }

  let total = 0;
  DURATION_TOKEN.lastIndex = 0;

  for (const match of trimmed.matchAll(DURATION_TOKEN)) {
    const amount = Number(match[1]);
    const unit = (match[2] ?? 'm').toLowerCase() as keyof typeof DURATION_UNITS;
    total += amount * DURATION_UNITS[unit];
  }

  return Math.round(total);
}

/**
 * Format a number of seconds as a Jira duration string.
 *
 * Uses the same calendar units as {@link parseDuration}, so the two round-trip.
 * Components that would be zero are omitted; sub-minute remainders are dropped.
 *
 * @param seconds - A non-negative duration in seconds
 * @returns The duration string, e.g. `'3h 30m'`; `'0m'` for zero
 * @throws {Error} If `seconds` is negative or not a finite number
 *
 * @example
 * ```ts
 * formatDuration(12600);  // '3h 30m'
 * formatDuration(100800); // '1d 4h'
 * ```
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new Error(
      `Invalid duration in seconds: ${String(seconds)}. Expected a non-negative number.`
    );
  }

  let remaining = Math.floor(seconds);
  const parts: string[] = [];

  for (const unit of ['w', 'd', 'h', 'm'] as const) {
    const size = DURATION_UNITS[unit];
    const count = Math.floor(remaining / size);
    if (count > 0) {
      parts.push(`${count}${unit}`);
      remaining -= count * size;
    }
  }

  return parts.length > 0 ? parts.join(' ') : '0m';
}

/**
 * Parse environment variable as number
 */
export function parseEnvNumber(value: string | undefined, defaultValue: number): number {
  if (!value) {
    return defaultValue;
  }

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse environment variable as boolean
 */
export function parseEnvBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (!value) {
    return defaultValue;
  }

  return value.toLowerCase() === 'true' || value === '1';
}
