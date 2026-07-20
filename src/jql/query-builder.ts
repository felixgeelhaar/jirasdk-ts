import { assertJqlFieldName, quoteJqlValue } from './escape.js';

/** Sort direction for an `ORDER BY` term. */
export type SortDirection = 'ASC' | 'DESC';

interface OrderTerm {
  field: string;
  direction: SortDirection;
}

type Part = { kind: 'clause'; text: string } | { kind: 'operator'; text: 'AND' | 'OR' };

/**
 * Fluent, injection-safe builder for JQL queries.
 *
 * The builder is immutable: every method returns a **new** builder, so a
 * partially built query can be safely reused as the base for several
 * variations.
 *
 * Consecutive clauses are joined with `AND` automatically; call
 * {@link JqlQueryBuilder.or} between them to use `OR` instead.
 *
 * @example
 * ```ts
 * const jql = jql()
 *   .project('PROJ')
 *   .status('In Progress')
 *   .assignee('5b10a2844c20165700ede21g')
 *   .orderBy('created', 'DESC')
 *   .build();
 * // project = "PROJ" AND status = "In Progress" AND assignee = "5b10..." ORDER BY created DESC
 * ```
 */
export class JqlQueryBuilder {
  private readonly parts: readonly Part[];
  private readonly order: readonly OrderTerm[];

  private constructor(parts: readonly Part[] = [], order: readonly OrderTerm[] = []) {
    this.parts = parts;
    this.order = order;
  }

  /**
   * Creates an empty query builder.
   *
   * @returns A new builder
   */
  static create(): JqlQueryBuilder {
    return new JqlQueryBuilder();
  }

  /**
   * Adds a `project = ...` filter.
   *
   * @param key - Project key or id
   * @returns A new builder with the clause appended
   */
  project(key: string): JqlQueryBuilder {
    return this.clause(`project = ${quoteJqlValue(key)}`);
  }

  /**
   * Adds a `status = ...` filter.
   *
   * @param status - Status name or id
   * @returns A new builder with the clause appended
   */
  status(status: string): JqlQueryBuilder {
    return this.clause(`status = ${quoteJqlValue(status)}`);
  }

  /**
   * Adds an `issuetype = ...` filter.
   *
   * @param issueType - Issue type name or id
   * @returns A new builder with the clause appended
   */
  issueType(issueType: string): JqlQueryBuilder {
    return this.clause(`issuetype = ${quoteJqlValue(issueType)}`);
  }

  /**
   * Adds an `assignee` filter. An empty string becomes `assignee is EMPTY`
   * (unassigned issues), matching the Go SDK.
   *
   * @param assignee - Account id, or `''` for unassigned
   * @returns A new builder with the clause appended
   */
  assignee(assignee: string): JqlQueryBuilder {
    return this.clause(
      assignee === '' ? 'assignee is EMPTY' : `assignee = ${quoteJqlValue(assignee)}`
    );
  }

  /**
   * Adds a `reporter = ...` filter.
   *
   * @param reporter - Account id
   * @returns A new builder with the clause appended
   */
  reporter(reporter: string): JqlQueryBuilder {
    return this.clause(`reporter = ${quoteJqlValue(reporter)}`);
  }

  /**
   * Adds a `priority = ...` filter.
   *
   * @param priority - Priority name or id
   * @returns A new builder with the clause appended
   */
  priority(priority: string): JqlQueryBuilder {
    return this.clause(`priority = ${quoteJqlValue(priority)}`);
  }

  /**
   * Adds one `labels = ...` clause per label, joined with `AND`.
   *
   * @param labels - The labels an issue must carry
   * @returns A new builder with the clauses appended
   */
  labels(...labels: string[]): JqlQueryBuilder {
    return labels.reduce<JqlQueryBuilder>(
      (builder, label) => builder.clause(`labels = ${quoteJqlValue(label)}`),
      this
    );
  }

  /**
   * Adds a free-text search (`text ~ ...`).
   *
   * @param text - The search text
   * @returns A new builder with the clause appended
   */
  text(text: string): JqlQueryBuilder {
    return this.clause(`text ~ ${quoteJqlValue(text)}`);
  }

  /**
   * Adds a `summary ~ ...` filter.
   *
   * @param text - The search text
   * @returns A new builder with the clause appended
   */
  summary(text: string): JqlQueryBuilder {
    return this.clause(`summary ~ ${quoteJqlValue(text)}`);
  }

  /**
   * Adds a `description ~ ...` filter.
   *
   * @param text - The search text
   * @returns A new builder with the clause appended
   */
  description(text: string): JqlQueryBuilder {
    return this.clause(`description ~ ${quoteJqlValue(text)}`);
  }

  /**
   * Adds a `created >= ...` filter.
   *
   * @param date - A JQL date literal (`'2024-01-01'`) or function (`'-7d'`)
   * @returns A new builder with the clause appended
   */
  createdAfter(date: string | Date): JqlQueryBuilder {
    return this.clause(`created >= ${quoteJqlValue(toJqlDate(date))}`);
  }

  /**
   * Adds a `created <= ...` filter.
   *
   * @param date - A JQL date literal or function
   * @returns A new builder with the clause appended
   */
  createdBefore(date: string | Date): JqlQueryBuilder {
    return this.clause(`created <= ${quoteJqlValue(toJqlDate(date))}`);
  }

  /**
   * Adds an `updated >= ...` filter.
   *
   * @param date - A JQL date literal or function
   * @returns A new builder with the clause appended
   */
  updatedAfter(date: string | Date): JqlQueryBuilder {
    return this.clause(`updated >= ${quoteJqlValue(toJqlDate(date))}`);
  }

  /**
   * Adds an `updated <= ...` filter.
   *
   * @param date - A JQL date literal or function
   * @returns A new builder with the clause appended
   */
  updatedBefore(date: string | Date): JqlQueryBuilder {
    return this.clause(`updated <= ${quoteJqlValue(toJqlDate(date))}`);
  }

  /**
   * Joins the previous and next clause with `AND`. Redundant in most cases,
   * since consecutive clauses are already `AND`-ed.
   *
   * @returns A new builder with the operator appended
   */
  and(): JqlQueryBuilder {
    return this.operator('AND');
  }

  /**
   * Joins the previous and next clause with `OR`.
   *
   * @returns A new builder with the operator appended
   */
  or(): JqlQueryBuilder {
    return this.operator('OR');
  }

  /**
   * Adds an `ORDER BY` term. Multiple calls accumulate into a single
   * comma-separated clause, always emitted at the end of the query.
   *
   * @param field - The field to sort by; validated as a JQL identifier
   * @param direction - Sort direction, defaults to `ASC`
   * @returns A new builder with the sort term appended
   * @throws {Error} If the field name is not a valid JQL identifier
   */
  orderBy(field: string, direction: string = 'ASC'): JqlQueryBuilder {
    const term: OrderTerm = {
      field: assertJqlFieldName(field),
      direction: direction.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    };
    return new JqlQueryBuilder(this.parts, [...this.order, term]);
  }

  /**
   * Appends a raw JQL fragment.
   *
   * **Unsafe:** the fragment is inserted verbatim. Never pass unvalidated user
   * input here — use the typed methods, or escape with `quoteJqlValue` first.
   *
   * @param jql - The raw JQL fragment
   * @returns A new builder with the fragment appended
   */
  raw(jql: string): JqlQueryBuilder {
    return this.clause(jql);
  }

  /**
   * Whether the builder has no clauses and no sort terms.
   *
   * @returns True when `build()` would return an empty string
   */
  isEmpty(): boolean {
    return this.parts.length === 0 && this.order.length === 0;
  }

  /**
   * Renders the JQL query.
   *
   * @returns The assembled JQL string
   */
  build(): string {
    const where = this.parts.map((part) => part.text).join(' ');
    if (this.order.length === 0) {
      return where;
    }
    const orderBy = `ORDER BY ${this.order
      .map((term) => `${term.field} ${term.direction}`)
      .join(', ')}`;
    return where === '' ? orderBy : `${where} ${orderBy}`;
  }

  /**
   * Alias for {@link JqlQueryBuilder.build}, so a builder can be interpolated
   * into a template literal.
   *
   * @returns The assembled JQL string
   */
  toString(): string {
    return this.build();
  }

  private clause(text: string): JqlQueryBuilder {
    const last = this.parts[this.parts.length - 1];
    const needsConjunction = last?.kind === 'clause';
    const parts: Part[] = needsConjunction
      ? [...this.parts, { kind: 'operator', text: 'AND' }, { kind: 'clause', text }]
      : [...this.parts, { kind: 'clause', text }];
    return new JqlQueryBuilder(parts, this.order);
  }

  private operator(text: 'AND' | 'OR'): JqlQueryBuilder {
    const last = this.parts[this.parts.length - 1];
    if (last === undefined || last.kind === 'operator') {
      // A leading or doubled operator would produce invalid JQL.
      return this;
    }
    return new JqlQueryBuilder([...this.parts, { kind: 'operator', text }], this.order);
  }
}

/**
 * Shorthand factory for {@link JqlQueryBuilder.create}.
 *
 * @returns A new JQL query builder
 */
export function jql(): JqlQueryBuilder {
  return JqlQueryBuilder.create();
}

function toJqlDate(date: string | Date): string {
  return typeof date === 'string' ? date : date.toISOString().slice(0, 10);
}
