/**
 * Jira issue keys look like `PROJ-123`: a project key followed by a number.
 */
const ISSUE_KEY = /^[A-Za-z][A-Za-z0-9_]*-\d+$/;

/**
 * Extracts the issue key from a Jira issue URL.
 *
 * Handles the canonical `/browse/PROJ-123` form (with or without a host,
 * query string or fragment) and the `?selectedIssue=PROJ-123` links used by
 * board and backlog views.
 *
 * @param issueUrl - The issue URL, e.g. `https://acme.atlassian.net/browse/PROJ-123`
 * @returns The issue key, e.g. `PROJ-123`
 * @throws {Error} If no issue key can be extracted
 *
 * @example
 * ```ts
 * parseIssueUrl('https://acme.atlassian.net/browse/PROJ-123'); // 'PROJ-123'
 * ```
 */
export function parseIssueUrl(issueUrl: string): string {
  const key = tryParseIssueUrl(issueUrl);
  if (key === undefined) {
    throw new Error(`Unable to extract issue key from URL: ${issueUrl}`);
  }
  return key;
}

/**
 * Non-throwing variant of {@link parseIssueUrl}.
 *
 * @param issueUrl - The issue URL
 * @returns The issue key, or `undefined` if none could be extracted
 */
export function tryParseIssueUrl(issueUrl: string): string | undefined {
  const url = toUrl(issueUrl);
  if (url === undefined) {
    return undefined;
  }

  const browseIndex = url.pathname.indexOf('/browse/');
  if (browseIndex !== -1) {
    const segment = url.pathname.slice(browseIndex + '/browse/'.length).split('/')[0] ?? '';
    const key = decodeURIComponent(segment);
    if (ISSUE_KEY.test(key)) {
      return key.toUpperCase();
    }
  }

  const selected = url.searchParams.get('selectedIssue');
  if (selected !== null && ISSUE_KEY.test(selected)) {
    return selected.toUpperCase();
  }

  return undefined;
}

/**
 * Parses absolute URLs, and falls back to treating the input as a path so
 * that `/browse/PROJ-123` works too.
 */
function toUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    try {
      return new URL(value, 'https://jira.invalid');
    } catch {
      return undefined;
    }
  }
}
