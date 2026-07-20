/**
 * SDK version, injected at build time from package.json by tsup's `define`.
 *
 * Hardcoding the version here caused it to drift out of sync with package.json
 * (it sat at 0.1.0 while the package shipped 0.3.0) and that stale value went
 * out on every request's User-Agent header. Injecting it removes the chance of
 * drift entirely.
 *
 * The fallback only applies when running from source without the bundler —
 * tests, ts-node, and similar.
 */
declare const SDK_VERSION_BUILD: string | undefined;

export const SDK_VERSION: string =
  typeof SDK_VERSION_BUILD === 'string' ? SDK_VERSION_BUILD : '0.0.0-dev';
