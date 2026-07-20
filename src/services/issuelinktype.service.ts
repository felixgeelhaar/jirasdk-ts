import { BaseService } from './base.service.js';
import {
  IssueLinkTypeSchema,
  IssueLinkTypesResponseSchema,
  type IssueLinkType,
} from '../schemas/issue/index.js';
import {
  CreateIssueLinkTypeInputSchema,
  UpdateIssueLinkTypeInputSchema,
  type CreateIssueLinkTypeInput,
  type UpdateIssueLinkTypeInput,
} from '../schemas/issuelinktype/index.js';

/**
 * Issue link type service for managing the relationship types
 * available when linking issues.
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * const linkTypes = await client.issueLinkTypes.list();
 *
 * const created = await client.issueLinkTypes.create({
 *   name: 'Dependency',
 *   inward: 'depends on',
 *   outward: 'is depended on by',
 * });
 * ```
 */
export class IssueLinkTypeService extends BaseService {
  /**
   * Get all issue link types
   *
   * `GET /rest/api/3/issueLinkType`
   *
   * @returns All issue link types configured on the instance
   */
  async list(): Promise<IssueLinkType[]> {
    const result = await this.getMethod('/issueLinkType', IssueLinkTypesResponseSchema);
    return result.issueLinkTypes;
  }

  /**
   * Get a single issue link type by ID
   *
   * `GET /rest/api/3/issueLinkType/{issueLinkTypeId}`
   *
   * @param issueLinkTypeId - Issue link type ID
   * @returns The requested issue link type
   */
  async get(issueLinkTypeId: string): Promise<IssueLinkType> {
    return this.getMethod(`/issueLinkType/${issueLinkTypeId}`, IssueLinkTypeSchema);
  }

  /**
   * Create an issue link type
   *
   * `POST /rest/api/3/issueLinkType`
   *
   * @param input - Name plus the inward and outward descriptions
   * @returns The created issue link type
   */
  async create(input: CreateIssueLinkTypeInput): Promise<IssueLinkType> {
    const body = CreateIssueLinkTypeInputSchema.parse(input);
    return this.postMethod('/issueLinkType', IssueLinkTypeSchema, body);
  }

  /**
   * Update an issue link type
   *
   * `PUT /rest/api/3/issueLinkType/{issueLinkTypeId}`
   *
   * @param issueLinkTypeId - Issue link type ID
   * @param input - Fields to update
   * @returns The updated issue link type
   */
  async update(issueLinkTypeId: string, input: UpdateIssueLinkTypeInput): Promise<IssueLinkType> {
    const body = UpdateIssueLinkTypeInputSchema.parse(input);
    return this.putMethod(`/issueLinkType/${issueLinkTypeId}`, IssueLinkTypeSchema, body);
  }

  /**
   * Delete an issue link type
   *
   * `DELETE /rest/api/3/issueLinkType/{issueLinkTypeId}`
   *
   * @param issueLinkTypeId - Issue link type ID
   * @returns Nothing
   */
  async deleteIssueLinkType(issueLinkTypeId: string): Promise<void> {
    await this.deleteMethod(`/issueLinkType/${issueLinkTypeId}`);
  }
}
