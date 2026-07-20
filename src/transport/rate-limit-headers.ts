import type { Middleware } from './types.js';

/**
 * Rate-limit budget advertised by Jira's `Beta-RateLimit-Policy` header.
 */
export interface RateLimitPolicy {
  /** Total cost budget for the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

/**
 * A point-in-time read of the rate-limit headers on a single response.
 *
 * Every field is optional: Jira does not send these headers on all endpoints,
 * and the beta headers in particular are only present on APIs enrolled in the
 * cost-based rate-limiting rollout (Atlassian CHANGE-3045).
 */
export interface RateLimitSnapshot {
  /** `X-RateLimit-Remaining` — legacy request-count budget. */
  remainingRequests?: number;
  /** `Retry-After` — seconds to wait, present on 429 responses. */
  retryAfterSeconds?: number;
  /** Parsed `Beta-RateLimit-Policy`. */
  policy?: RateLimitPolicy;
  /** Parsed `r=` value from `Beta-RateLimit` — remaining cost points. */
  remainingPoints?: number;
}

/**
 * Parse the `Beta-RateLimit-Policy` header.
 *
 * Format: `"100;w=60"` — a limit followed by `;w=<window seconds>`.
 *
 * @param header Raw header value.
 * @returns The parsed policy, or `undefined` if absent or malformed.
 */
export function parseBetaRateLimitPolicy(
  header: string | null | undefined
): RateLimitPolicy | undefined {
  if (header === null || header === undefined || header === '') {
    return undefined;
  }

  const parts = header.split(';');
  const rawLimit = parts[0]?.trim();
  if (rawLimit === undefined || rawLimit === '') {
    return undefined;
  }

  const limit = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(limit)) {
    return undefined;
  }

  let windowSeconds = 0;
  for (const part of parts.slice(1)) {
    const [key, value] = part.trim().split('=', 2);
    if (key === 'w' && value !== undefined) {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) {
        windowSeconds = parsed;
      }
    }
  }

  return { limit, windowSeconds };
}

/**
 * Parse the `Beta-RateLimit` header.
 *
 * Format: `r=85;policy="100;w=60"` — `r` is the remaining cost points.
 *
 * @param header Raw header value.
 * @returns Remaining points, or `undefined` if absent or malformed.
 */
export function parseBetaRateLimit(header: string | null | undefined): number | undefined {
  if (header === null || header === undefined || header === '') {
    return undefined;
  }

  for (const part of header.split(';')) {
    const [key, value] = part.trim().split('=', 2);
    if (key === 'r' && value !== undefined) {
      const remaining = Number.parseInt(value, 10);
      if (Number.isFinite(remaining)) {
        return remaining;
      }
    }
  }

  return undefined;
}

/**
 * Parse a `Retry-After` header, which may be either a number of seconds or an
 * HTTP-date.
 *
 * @param header Raw header value.
 * @param now Reference time for HTTP-date values; defaults to the current time.
 * @returns Seconds to wait, or `undefined` if absent or malformed.
 */
export function parseRetryAfterSeconds(
  header: string | null | undefined,
  now: number = Date.now()
): number | undefined {
  if (header === null || header === undefined || header === '') {
    return undefined;
  }

  const seconds = Number.parseInt(header.trim(), 10);
  if (Number.isFinite(seconds) && String(seconds) === header.trim()) {
    return Math.max(0, seconds);
  }

  const date = Date.parse(header);
  if (Number.isFinite(date)) {
    return Math.max(0, Math.ceil((date - now) / 1000));
  }

  return undefined;
}

/**
 * Read every rate-limit signal Jira exposes from a response's headers.
 *
 * @param headers Response headers.
 * @returns A snapshot with whichever fields were present.
 */
export function readRateLimitHeaders(headers: Headers): RateLimitSnapshot {
  const snapshot: RateLimitSnapshot = {};

  const remaining = headers.get('x-ratelimit-remaining');
  if (remaining !== null) {
    const parsed = Number.parseInt(remaining, 10);
    if (Number.isFinite(parsed)) {
      snapshot.remainingRequests = parsed;
    }
  }

  const retryAfter = parseRetryAfterSeconds(headers.get('retry-after'));
  if (retryAfter !== undefined) {
    snapshot.retryAfterSeconds = retryAfter;
  }

  const policy = parseBetaRateLimitPolicy(headers.get('beta-ratelimit-policy'));
  if (policy !== undefined) {
    snapshot.policy = policy;
  }

  const points = parseBetaRateLimit(headers.get('beta-ratelimit'));
  if (points !== undefined) {
    snapshot.remainingPoints = points;
  }

  return snapshot;
}

/**
 * Configuration for {@link createRateLimitHeaderMiddleware}.
 */
export interface RateLimitHeaderMiddlewareConfig {
  /**
   * Called after every response that carries at least one rate-limit header.
   *
   * Use it to drive adaptive throttling, emit metrics, or warn as the budget
   * runs low. Errors thrown here are swallowed so observability never breaks a
   * request.
   */
  onRateLimit: (snapshot: RateLimitSnapshot) => void;
}

/**
 * Observe Jira's rate-limit headers on every response.
 *
 * The Go SDK parses these headers and only logs them. This middleware hands
 * them to a callback instead, so a consumer can react — for example by backing
 * off before Jira starts returning 429s.
 *
 * @example
 * ```typescript
 * const client = createJiraClient({
 *   host,
 *   auth,
 *   middleware: [
 *     createRateLimitHeaderMiddleware({
 *       onRateLimit: (snapshot) => {
 *         if (snapshot.remainingPoints !== undefined && snapshot.remainingPoints < 10) {
 *           logger.warn('Jira rate-limit budget nearly exhausted', snapshot);
 *         }
 *       },
 *     }),
 *   ],
 * });
 * ```
 */
export function createRateLimitHeaderMiddleware(
  config: RateLimitHeaderMiddlewareConfig
): Middleware {
  return async (ctx, next) => {
    const response = await next(ctx);

    const snapshot = readRateLimitHeaders(response.headers);
    if (Object.keys(snapshot).length > 0) {
      try {
        config.onRateLimit(snapshot);
      } catch {
        // Observability must never fail a request.
      }
    }

    return response;
  };
}
