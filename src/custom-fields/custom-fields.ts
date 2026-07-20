import { isObject } from '../utils/index.js';

/**
 * Known custom field types.
 *
 * Modelled as a const object rather than a TS `enum` so it survives
 * `isolatedModules` and erases cleanly at runtime.
 */
export const CustomFieldType = {
  String: 'string',
  Number: 'number',
  Date: 'date',
  DateTime: 'datetime',
  User: 'user',
  Select: 'select',
  MultiSelect: 'multiselect',
  Url: 'url',
  TextArea: 'textarea',
  Checkbox: 'checkbox',
  Radio: 'radio',
  CascadingSelect: 'cascadingselect',
  Version: 'version',
  Labels: 'labels',
} as const;

export type CustomFieldType = (typeof CustomFieldType)[keyof typeof CustomFieldType];

/**
 * A single custom field value together with the type it was written as.
 */
export interface CustomField {
  /** The custom field id, e.g. `customfield_10001` */
  id: string;
  /** The type the value was set as; absent for raw/unmarshalled values */
  type?: CustomFieldType | undefined;
  /** The wire value, exactly as it is sent to (or received from) Jira */
  value: unknown;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const NUMERIC_OFFSET = /([+-]\d{2})(\d{2})$/;

/**
 * Type-safe helper for reading and writing Jira custom fields.
 *
 * Setters are chainable and return the same instance; getters return the
 * decoded value or `undefined` when the field is absent or holds an
 * incompatible shape.
 *
 * @example
 * ```ts
 * const fields = new CustomFields()
 *   .setString('customfield_10001', 'Sprint 1')
 *   .setNumber('customfield_10002', 42.5)
 *   .setLabels('customfield_10008', ['bug', 'urgent']);
 *
 * await client.issues.updateIssue('PROJ-1', { fields: fields.toMap() });
 * ```
 */
export class CustomFields {
  private readonly fields = new Map<string, CustomField>();

  /**
   * Creates a collection, optionally seeded from raw Jira field values.
   *
   * @param initial - Raw `{ fieldId: value }` map, e.g. from an issue response
   */
  constructor(initial?: Readonly<Record<string, unknown>>) {
    if (initial) {
      for (const [id, value] of Object.entries(initial)) {
        this.fields.set(id, { id, value });
      }
    }
  }

  /**
   * Creates an empty collection (Go's `NewCustomFields`).
   *
   * @returns A new, empty collection
   */
  static create(): CustomFields {
    return new CustomFields();
  }

  /**
   * Creates a collection from a raw `{ fieldId: value }` map (Go's `FromMap`).
   *
   * @param map - Raw field values as returned by the Jira API
   * @returns A collection wrapping the supplied values
   */
  static fromMap(map: Readonly<Record<string, unknown>>): CustomFields {
    return new CustomFields(map);
  }

  /**
   * Parses a JSON string or already-parsed object of raw field values
   * (Go's `UnmarshalJSON`).
   *
   * @param data - JSON text or a plain object of field values
   * @returns A collection wrapping the parsed values
   * @throws {Error} If the input is not a JSON object
   */
  static fromJSON(data: string | Record<string, unknown>): CustomFields {
    const parsed: unknown = typeof data === 'string' ? JSON.parse(data) : data;
    if (!isObject(parsed)) {
      throw new Error('CustomFields.fromJSON expects a JSON object of field values');
    }
    return new CustomFields(parsed);
  }

  /** Number of fields held in the collection. */
  get size(): number {
    return this.fields.size;
  }

  /**
   * Whether a field id is present.
   *
   * @param fieldId - The custom field id
   * @returns True when the field has a value
   */
  has(fieldId: string): boolean {
    return this.fields.has(fieldId);
  }

  /**
   * Removes a field.
   *
   * @param fieldId - The custom field id
   * @returns This collection, for chaining
   */
  remove(fieldId: string): this {
    this.fields.delete(fieldId);
    return this;
  }

  /**
   * The declared type of a field, when it was written through a typed setter.
   *
   * @param fieldId - The custom field id
   * @returns The field type, or `undefined`
   */
  getType(fieldId: string): CustomFieldType | undefined {
    return this.fields.get(fieldId)?.type;
  }

  /**
   * Sets a text field value.
   *
   * @param fieldId - The custom field id
   * @param value - The text value
   * @returns This collection, for chaining
   */
  setString(fieldId: string, value: string): this {
    return this.set(fieldId, CustomFieldType.String, value);
  }

  /**
   * Reads a text field value.
   *
   * @param fieldId - The custom field id
   * @returns The string, or `undefined` if absent or not a string
   */
  getString(fieldId: string): string | undefined {
    const value = this.rawValue(fieldId);
    return typeof value === 'string' ? value : undefined;
  }

  /**
   * Sets a numeric field value.
   *
   * @param fieldId - The custom field id
   * @param value - The numeric value
   * @returns This collection, for chaining
   */
  setNumber(fieldId: string, value: number): this {
    return this.set(fieldId, CustomFieldType.Number, value);
  }

  /**
   * Reads a numeric field value. Numeric strings are coerced, as Jira
   * occasionally returns numbers as strings.
   *
   * @param fieldId - The custom field id
   * @returns The number, or `undefined` if absent or not numeric
   */
  getNumber(fieldId: string): number | undefined {
    const value = this.rawValue(fieldId);
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  /**
   * Sets a date field value, serialised as `YYYY-MM-DD` (UTC).
   *
   * @param fieldId - The custom field id
   * @param value - A `Date` or an already formatted `YYYY-MM-DD` string
   * @returns This collection, for chaining
   */
  setDate(fieldId: string, value: Date | string): this {
    const formatted = typeof value === 'string' ? value : formatDateOnly(value);
    return this.set(fieldId, CustomFieldType.Date, formatted);
  }

  /**
   * Reads a date field value, tolerating the several formats Jira emits.
   *
   * @param fieldId - The custom field id
   * @returns The parsed `Date`, or `undefined` if absent or unparseable
   */
  getDate(fieldId: string): Date | undefined {
    return parseJiraDate(this.rawValue(fieldId));
  }

  /**
   * Sets a datetime field value, serialised as ISO-8601.
   *
   * @param fieldId - The custom field id
   * @param value - A `Date` or an already formatted ISO-8601 string
   * @returns This collection, for chaining
   */
  setDateTime(fieldId: string, value: Date | string): this {
    const formatted = typeof value === 'string' ? value : value.toISOString();
    return this.set(fieldId, CustomFieldType.DateTime, formatted);
  }

  /**
   * Reads a datetime field value, tolerating the several formats Jira emits.
   *
   * @param fieldId - The custom field id
   * @returns The parsed `Date`, or `undefined` if absent or unparseable
   */
  getDateTime(fieldId: string): Date | undefined {
    return parseJiraDate(this.rawValue(fieldId));
  }

  /**
   * Sets a user-picker field value.
   *
   * @param fieldId - The custom field id
   * @param accountId - The Atlassian account id
   * @returns This collection, for chaining
   */
  setUser(fieldId: string, accountId: string): this {
    return this.set(fieldId, CustomFieldType.User, { accountId });
  }

  /**
   * Reads the account id from a user-picker field.
   *
   * @param fieldId - The custom field id
   * @returns The account id, or `undefined`
   */
  getUser(fieldId: string): string | undefined {
    return readStringProperty(this.rawValue(fieldId), 'accountId');
  }

  /**
   * Sets a single-select field value.
   *
   * @param fieldId - The custom field id
   * @param value - The option value
   * @returns This collection, for chaining
   */
  setSelect(fieldId: string, value: string): this {
    return this.set(fieldId, CustomFieldType.Select, { value });
  }

  /**
   * Reads a single-select field value.
   *
   * @param fieldId - The custom field id
   * @returns The option value, or `undefined`
   */
  getSelect(fieldId: string): string | undefined {
    return readStringProperty(this.rawValue(fieldId), 'value');
  }

  /**
   * Sets a multi-select field value.
   *
   * @param fieldId - The custom field id
   * @param values - The option values
   * @returns This collection, for chaining
   */
  setMultiSelect(fieldId: string, values: readonly string[]): this {
    return this.set(
      fieldId,
      CustomFieldType.MultiSelect,
      values.map((value) => ({ value }))
    );
  }

  /**
   * Reads a multi-select field value.
   *
   * @param fieldId - The custom field id
   * @returns The option values, or `undefined` if absent or not an array
   */
  getMultiSelect(fieldId: string): string[] | undefined {
    const value = this.rawValue(fieldId);
    if (!Array.isArray(value)) {
      return undefined;
    }
    const values: string[] = [];
    for (const option of value) {
      const optionValue = readStringProperty(option, 'value');
      if (optionValue !== undefined) {
        values.push(optionValue);
      }
    }
    return values;
  }

  /**
   * Sets a labels field value.
   *
   * @param fieldId - The custom field id
   * @param labels - The labels
   * @returns This collection, for chaining
   */
  setLabels(fieldId: string, labels: readonly string[]): this {
    return this.set(fieldId, CustomFieldType.Labels, [...labels]);
  }

  /**
   * Reads a labels field value.
   *
   * @param fieldId - The custom field id
   * @returns The labels, or `undefined` if absent or not an array
   */
  getLabels(fieldId: string): string[] | undefined {
    const value = this.rawValue(fieldId);
    if (!Array.isArray(value)) {
      return undefined;
    }
    return value.filter((label): label is string => typeof label === 'string');
  }

  /**
   * Sets an arbitrary value for field shapes the typed setters do not cover.
   *
   * @param fieldId - The custom field id
   * @param value - The value, sent to Jira verbatim
   * @returns This collection, for chaining
   */
  setRaw(fieldId: string, value: unknown): this {
    this.fields.set(fieldId, { id: fieldId, value });
    return this;
  }

  /**
   * Reads the untouched wire value of a field.
   *
   * @param fieldId - The custom field id
   * @returns The raw value, or `undefined` if the field is absent
   */
  getRaw(fieldId: string): unknown {
    return this.rawValue(fieldId);
  }

  /**
   * Merges another collection into this one; conflicting ids are overwritten.
   *
   * @param other - The collection to merge in
   * @returns This collection, for chaining
   */
  merge(other: CustomFields): this {
    for (const [id, field] of other.entries()) {
      this.fields.set(id, { ...field });
    }
    return this;
  }

  /**
   * All entries as `[fieldId, CustomField]` pairs.
   *
   * @returns An iterable of field entries
   */
  entries(): IterableIterator<[string, CustomField]> {
    return this.fields.entries();
  }

  /**
   * All field ids in the collection.
   *
   * @returns An iterable of field ids
   */
  keys(): IterableIterator<string> {
    return this.fields.keys();
  }

  /**
   * Converts to the `{ fieldId: value }` map Jira expects in a `fields` payload.
   *
   * @returns A plain object of raw field values
   */
  toMap(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [id, field] of this.fields) {
      result[id] = field.value;
    }
    return result;
  }

  /**
   * Makes `JSON.stringify(fields)` emit the Jira wire format.
   *
   * @returns The same object as {@link CustomFields.toMap}
   */
  toJSON(): Record<string, unknown> {
    return this.toMap();
  }

  /**
   * Creates an independent copy of this collection.
   *
   * @returns A cloned collection
   */
  clone(): CustomFields {
    return new CustomFields(this.toMap());
  }

  private set(fieldId: string, type: CustomFieldType, value: unknown): this {
    this.fields.set(fieldId, { id: fieldId, type, value });
    return this;
  }

  private rawValue(fieldId: string): unknown {
    return this.fields.get(fieldId)?.value;
  }
}

function readStringProperty(value: unknown, key: string): string | undefined {
  if (!isObject(value)) {
    return undefined;
  }
  const property = value[key];
  return typeof property === 'string' ? property : undefined;
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Parses the date/datetime formats Jira uses: `YYYY-MM-DD`, ISO-8601, and the
 * legacy `2006-01-02T15:04:05.000-0700` form with a colon-less UTC offset.
 */
function parseJiraDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || value === '') {
    return undefined;
  }

  // Date-only values are anchored to UTC midnight so they do not shift by
  // timezone the way `new Date('2024-01-15')` would across runtimes.
  const normalized = DATE_ONLY.test(value)
    ? `${value}T00:00:00.000Z`
    : value.replace(NUMERIC_OFFSET, '$1:$2');

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
