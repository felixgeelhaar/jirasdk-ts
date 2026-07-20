/**
 * JQL escaping helpers.
 *
 * Every value interpolated into a JQL query must go through
 * {@link quoteJqlValue}. Concatenating raw user input into JQL allows an
 * attacker to break out of the string literal and append arbitrary clauses
 * (`project = "X" OR project != "X"` — i.e. read every issue they can see).
 */

/**
 * Characters that JQL recognises inside a double-quoted string literal.
 * Order matters: the backslash must be escaped first.
 */
const ESCAPES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\\/g, '\\\\'],
  [/"/g, '\\"'],
  [/\n/g, '\\n'],
  [/\r/g, '\\r'],
  [/\t/g, '\\t'],
];

/**
 * Escapes the contents of a JQL string literal (without adding quotes).
 *
 * @param value - The raw value
 * @returns The escaped value
 */
export function escapeJqlValue(value: string): string {
  return ESCAPES.reduce<string>((acc, [pattern, replacement]) => acc.replace(pattern, replacement), value);
}

/**
 * Escapes and double-quotes a value for safe use in a JQL query.
 *
 * Values are *always* quoted — quoting is valid for every JQL operand, and it
 * removes any need to reason about whether a particular value happens to be a
 * reserved word (`AND`, `ORDER`, `EMPTY`, ...) or contains a special
 * character.
 *
 * @param value - The raw value
 * @returns A quoted, escaped JQL string literal
 */
export function quoteJqlValue(value: string): string {
  return `"${escapeJqlValue(value)}"`;
}

/**
 * Field names cannot be quoted the way values can, so they are validated
 * instead: a bare identifier (`summary`, `issuetype`), a dotted/hyphenated
 * name (`Story Points` is expressed as `cf[10004]`), or `cf[12345]`.
 */
const FIELD_NAME = /^(?:[A-Za-z][A-Za-z0-9_.-]*|cf\[\d+\])$/;

/**
 * Validates a JQL field name, rejecting anything that could inject syntax.
 *
 * @param field - The field name to validate
 * @returns The field name, unchanged
 * @throws {Error} If the field name is not a valid JQL identifier
 */
export function assertJqlFieldName(field: string): string {
  if (!FIELD_NAME.test(field)) {
    throw new Error(
      `Invalid JQL field name: ${JSON.stringify(field)}. Expected an identifier such as "created" or "cf[10004]".`
    );
  }
  return field;
}
