/**
 * Common type definitions used throughout the SDK.
 */

/** Generic async function type */
export type AsyncFn<T = void> = () => Promise<T>;

/** Generic callback with error-first pattern */
export type Callback<T> = (error: Error | null, result?: T) => void;

/** Brand type for nominal typing */
export type Brand<T, B> = T & { __brand: B };

/** Issue key (e.g., "PROJ-123") */
export type IssueKey = Brand<string, 'IssueKey'>;

/** Project key (e.g., "PROJ") */
export type ProjectKey = Brand<string, 'ProjectKey'>;

/** Account ID for Jira Cloud users */
export type AccountId = Brand<string, 'AccountId'>;

/** Deep partial type for nested optional properties */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** Make specific properties required */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/** Make specific properties optional */
export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Extract the element type from an array */
export type ArrayElement<T> = T extends ReadonlyArray<infer E> ? E : never;

/** Make all properties mutable */
export type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/** JSON serializable types */
export type JsonPrimitive = string | number | boolean | null;
export type JsonArray = JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonValue = JsonPrimitive | JsonArray | JsonObject;

/** Expand options for API requests */
export interface ExpandOptions {
  expand?: string[];
}

/** Field selection options for API requests */
export interface FieldOptions {
  fields?: string[];
}
