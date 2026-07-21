import { BaseService } from './base.service.js';
import {
  AuditRecordPageSchema,
  type AuditRecord,
  type AuditRecordPage,
  type AuditListOptions,
} from '../schemas/audit/index.js';

/**
 * Audit log service for reading Jira's administrative audit records.
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * // Get a page of audit records
 * const records = await client.audit.list({ limit: 100, filter: 'user_management' });
 *
 * // Iterate every record in a time window
 * for await (const record of client.audit.iterate({ from: '2024-01-01T00:00:00Z' })) {
 *   console.log(record.summary);
 * }
 * ```
 */
export class AuditService extends BaseService {
  /**
   * List audit records with optional filtering.
   *
   * `GET /rest/api/3/auditing/record`
   *
   * @param options - Offset/limit, a free-text filter and a from/to time window
   * @returns The audit records on the requested page
   */
  async list(options?: AuditListOptions): Promise<AuditRecord[]> {
    const page = await this.listPage(options);
    return page.records;
  }

  /**
   * Async iterator over every matching audit record, paging transparently.
   *
   * `GET /rest/api/3/auditing/record`
   *
   * @param options - Filter options (`offset` is managed by the iterator)
   * @returns An async generator yielding audit records
   */
  async *iterate(
    options?: Omit<AuditListOptions, 'offset'>
  ): AsyncGenerator<AuditRecord, void, undefined> {
    const pageSize = options?.limit ?? 100;
    let offset = 0;

    for (;;) {
      const page = await this.listPage({ ...options, offset, limit: pageSize });

      for (const record of page.records) {
        yield record;
      }

      if (page.records.length === 0) {
        return;
      }

      offset += page.records.length;

      if (page.total !== undefined) {
        if (offset >= page.total) {
          return;
        }
      } else if (page.records.length < pageSize) {
        return;
      }
    }
  }

  /**
   * Collect every matching audit record into an array.
   *
   * `GET /rest/api/3/auditing/record`
   *
   * @param options - Filter options
   * @returns All matching audit records across all pages
   */
  async all(options?: Omit<AuditListOptions, 'offset'>): Promise<AuditRecord[]> {
    const records: AuditRecord[] = [];
    for await (const record of this.iterate(options)) {
      records.push(record);
    }
    return records;
  }

  /**
   * Fetch a single page of audit records, including its pagination metadata.
   */
  private async listPage(options?: AuditListOptions): Promise<AuditRecordPage> {
    const params = this.buildParams({
      offset: options?.offset,
      limit: options?.limit,
      filter: options?.filter,
      from: options?.from,
      to: options?.to,
    });

    return this.getMethod('/auditing/record', AuditRecordPageSchema, params);
  }
}
