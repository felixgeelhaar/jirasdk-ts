/**
 * Feature detection for host globals that TypeScript's DOM/Node lib types
 * declare as always present, but which are genuinely absent in some runtimes
 * this SDK supports (browsers, Workers, Deno, edge functions).
 *
 * Reading them through a widened view of `globalThis` keeps the runtime guard —
 * removing it would crash outside Node — while letting the type system see that
 * the check is meaningful, so it no longer reports the guard as an unnecessary
 * condition.
 */
interface RuntimeGlobals {
  process?: { env?: Record<string, string | undefined> };
  console?: { warn?: (...args: unknown[]) => void };
  crypto?: { randomUUID?: () => string };
}

function runtime(): RuntimeGlobals {
  return globalThis;
}

/**
 * Read `process.env`, or an empty object where `process` is unavailable.
 */
export function processEnv(): Record<string, string | undefined> {
  return runtime().process?.env ?? {};
}

/**
 * Read a single environment variable, or `undefined` where unavailable.
 */
export function readEnvVar(name: string): string | undefined {
  return processEnv()[name];
}

/**
 * Emit a warning through `console.warn` where one exists, otherwise do nothing.
 */
export function warn(message: string): void {
  runtime().console?.warn?.(message);
}

/**
 * Generate a UUID using `crypto.randomUUID` where available, falling back to a
 * timestamp-and-random identifier. The fallback is not cryptographically
 * random and is only used for request correlation IDs.
 */
export function randomId(): string {
  const uuid = runtime().crypto?.randomUUID?.();
  if (uuid !== undefined) {
    return uuid;
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * V8-only API used to trim the constructor frame from error stacks. Absent on
 * SpiderMonkey and JavaScriptCore.
 */
type CaptureStackTrace = (target: object, constructor?: unknown) => void;

/**
 * Trim the constructor frame from an error's stack where the engine supports
 * it; a no-op elsewhere.
 *
 * `constructor` is typed `unknown` rather than `Function` so the signature does
 * not widen to "any callable" for callers. V8 expects a constructor function
 * there, and every call site passes `this.constructor`.
 */
export function captureStackTrace(target: object, constructor?: unknown): void {
  const capture = (Error as unknown as { captureStackTrace?: CaptureStackTrace }).captureStackTrace;
  capture?.(target, constructor);
}
