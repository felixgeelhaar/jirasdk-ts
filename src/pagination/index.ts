/**
 * Reusable pagination primitives shared by all paginated services.
 */
export {
  DEFAULT_MAX_RESULTS,
  MAX_MAX_RESULTS,
  hasNextPage,
  nextStartAt,
  normalizeMaxResults,
  paginate,
  paginateByToken,
  collect,
  type PageInfo,
  type Page,
  type TokenPage,
  type PaginateOptions,
  type PaginateByTokenOptions,
} from './pagination.js';
