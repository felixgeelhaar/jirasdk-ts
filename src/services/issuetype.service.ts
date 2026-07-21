import { z } from 'zod';
import { BaseService } from './base.service.js';
import {
  IssueTypeDetailsSchema,
  IssueTypeSchemeSchema,
  IssueTypeSchemeListResponseSchema,
  IssueTypeSchemeMappingListResponseSchema,
  CreateIssueTypeInputSchema,
  UpdateIssueTypeInputSchema,
  CreateIssueTypeSchemeInputSchema,
  UpdateIssueTypeSchemeInputSchema,
  AddIssueTypesToSchemeInputSchema,
  type IssueTypeDetails,
  type IssueTypeScheme,
  type IssueTypeSchemeMapping,
  type CreateIssueTypeInput,
  type UpdateIssueTypeInput,
  type CreateIssueTypeSchemeInput,
  type UpdateIssueTypeSchemeInput,
  type AddIssueTypesToSchemeInput,
  type ListIssueTypeSchemesOptions,
  type GetIssueTypeSchemeMappingsOptions,
} from '../schemas/issuetype/index.js';

/**
 * Issue type service for managing Jira issue types and issue type schemes.
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * // Create an issue type and add it to a scheme
 * const issueType = await client.issueTypes.create({ name: 'Incident', type: 'standard' });
 * await client.issueTypes.addIssueTypesToScheme('10000', {
 *   issueTypeIds: [issueType.id],
 * });
 * ```
 */
export class IssueTypeService extends BaseService {
  /**
   * Get all issue types
   *
   * `GET /rest/api/3/issuetype`
   *
   * @returns All issue types visible to the caller
   */
  async list(): Promise<IssueTypeDetails[]> {
    return this.getMethod('/issuetype', z.array(IssueTypeDetailsSchema));
  }

  /**
   * Get a single issue type by ID
   *
   * `GET /rest/api/3/issuetype/{issueTypeId}`
   *
   * @param issueTypeId - Issue type ID
   * @returns The requested issue type
   */
  async get(issueTypeId: string): Promise<IssueTypeDetails> {
    return this.getMethod(`/issuetype/${issueTypeId}`, IssueTypeDetailsSchema);
  }

  /**
   * Create an issue type
   *
   * `POST /rest/api/3/issuetype`
   *
   * @param input - Name plus optional description and `standard`/`subtask` type
   * @returns The created issue type
   */
  async create(input: CreateIssueTypeInput): Promise<IssueTypeDetails> {
    const body = CreateIssueTypeInputSchema.parse(input);
    return this.postMethod('/issuetype', IssueTypeDetailsSchema, body);
  }

  /**
   * Update an issue type
   *
   * `PUT /rest/api/3/issuetype/{issueTypeId}`
   *
   * @param issueTypeId - Issue type ID
   * @param input - Fields to update
   * @returns The updated issue type
   */
  async update(issueTypeId: string, input: UpdateIssueTypeInput): Promise<IssueTypeDetails> {
    const body = UpdateIssueTypeInputSchema.parse(input);
    return this.putMethod(`/issuetype/${issueTypeId}`, IssueTypeDetailsSchema, body);
  }

  /**
   * Delete an issue type
   *
   * `DELETE /rest/api/3/issuetype/{issueTypeId}`
   *
   * @param issueTypeId - Issue type ID
   * @param options - Optional issue type to move existing issues to
   * @returns Nothing
   */
  async deleteIssueType(
    issueTypeId: string,
    options?: { alternativeIssueTypeId?: string }
  ): Promise<void> {
    const params = this.buildParams({
      alternativeIssueTypeId: options?.alternativeIssueTypeId,
    });

    await this.http.delete(this.buildPath(`/issuetype/${issueTypeId}`), {
      params,
    });
  }

  /**
   * Get all issue type schemes
   *
   * `GET /rest/api/3/issuetypescheme`
   *
   * @param options - Optional pagination
   * @returns The issue type schemes
   */
  async listIssueTypeSchemes(options?: ListIssueTypeSchemesOptions): Promise<IssueTypeScheme[]> {
    const params = this.buildParams({
      startAt: options?.startAt,
      maxResults: options?.maxResults,
    });

    const result = await this.getMethod(
      '/issuetypescheme',
      IssueTypeSchemeListResponseSchema,
      params
    );
    return result.values;
  }

  /**
   * Create an issue type scheme
   *
   * `POST /rest/api/3/issuetypescheme`
   *
   * Needed since Jira Cloud CHANGE-2999/3000 (February 2026): creating an
   * issue type no longer auto-adds it to the Default Work Type Scheme.
   *
   * @param input - Scheme name plus the issue type IDs it contains
   * @returns The created scheme
   */
  async createIssueTypeScheme(input: CreateIssueTypeSchemeInput): Promise<IssueTypeScheme> {
    const body = CreateIssueTypeSchemeInputSchema.parse(input);
    return this.postMethod('/issuetypescheme', IssueTypeSchemeSchema, body);
  }

  /**
   * Update an issue type scheme
   *
   * `PUT /rest/api/3/issuetypescheme/{schemeId}`
   *
   * @param schemeId - Issue type scheme ID
   * @param input - Fields to update
   * @returns Nothing
   */
  async updateIssueTypeScheme(schemeId: string, input: UpdateIssueTypeSchemeInput): Promise<void> {
    const body = UpdateIssueTypeSchemeInputSchema.parse(input);
    await this.putMethodRaw(`/issuetypescheme/${schemeId}`, body);
  }

  /**
   * Delete an issue type scheme
   *
   * `DELETE /rest/api/3/issuetypescheme/{schemeId}`
   *
   * @param schemeId - Issue type scheme ID
   * @returns Nothing
   */
  async deleteIssueTypeScheme(schemeId: string): Promise<void> {
    await this.deleteMethod(`/issuetypescheme/${schemeId}`);
  }

  /**
   * Add issue types to an issue type scheme
   *
   * `PUT /rest/api/3/issuetypescheme/{schemeId}/issuetype`
   *
   * @param schemeId - Issue type scheme ID
   * @param input - The issue type IDs to add (at least one)
   * @returns Nothing
   */
  async addIssueTypesToScheme(schemeId: string, input: AddIssueTypesToSchemeInput): Promise<void> {
    const body = AddIssueTypesToSchemeInputSchema.parse(input);
    await this.putMethodRaw(`/issuetypescheme/${schemeId}/issuetype`, body);
  }

  /**
   * Remove an issue type from an issue type scheme
   *
   * `DELETE /rest/api/3/issuetypescheme/{schemeId}/issuetype/{issueTypeId}`
   *
   * @param schemeId - Issue type scheme ID
   * @param issueTypeId - Issue type ID to remove
   * @returns Nothing
   */
  async removeIssueTypeFromScheme(schemeId: string, issueTypeId: string): Promise<void> {
    await this.deleteMethod(`/issuetypescheme/${schemeId}/issuetype/${issueTypeId}`);
  }

  /**
   * Get the issue type scheme to issue type mappings
   *
   * `GET /rest/api/3/issuetypescheme/mapping`
   *
   * @param options - Optional scheme ID filter and pagination
   * @returns The scheme-to-issue-type mappings
   */
  async getIssueTypeSchemeMappings(
    options?: GetIssueTypeSchemeMappingsOptions
  ): Promise<IssueTypeSchemeMapping[]> {
    const params = this.buildParams({
      issueTypeSchemeId: options?.issueTypeSchemeIds,
      startAt: options?.startAt,
      maxResults: options?.maxResults,
    });

    const result = await this.getMethod(
      '/issuetypescheme/mapping',
      IssueTypeSchemeMappingListResponseSchema,
      params
    );
    return result.values;
  }
}
