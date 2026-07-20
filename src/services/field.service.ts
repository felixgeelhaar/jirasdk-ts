import { z } from 'zod';
import { BaseService } from './base.service.js';
import {
  FieldSchema,
  FieldContextSchema,
  FieldContextListResponseSchema,
  FieldOptionListResponseSchema,
  ContextProjectMappingListResponseSchema,
  CreateFieldInputSchema,
  UpdateFieldInputSchema,
  CreateFieldContextInputSchema,
  UpdateFieldContextInputSchema,
  CreateFieldOptionsRequestSchema,
  CreateFieldOptionsResponseSchema,
  AssociateContextProjectsInputSchema,
  RemoveContextProjectsInputSchema,
  type Field,
  type FieldContext,
  type FieldOption,
  type ContextProjectMapping,
  type CreateFieldInput,
  type UpdateFieldInput,
  type CreateFieldContextInput,
  type UpdateFieldContextInput,
  type CreateFieldOptionInput,
  type AssociateContextProjectsInput,
  type RemoveContextProjectsInput,
  type GetContextProjectMappingsOptions,
} from '../schemas/field/index.js';

/**
 * Field service for managing Jira system and custom fields,
 * their contexts, options and project associations.
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * // List all fields
 * const fields = await client.fields.list();
 *
 * // Create a custom field, then associate its context with projects
 * const field = await client.fields.create({
 *   name: 'Story Points',
 *   type: 'com.atlassian.jira.plugin.system.customfieldtypes:float',
 *   searcherKey: 'com.atlassian.jira.plugin.system.customfieldtypes:exactnumber',
 * });
 * const [context] = await client.fields.listContexts(field.id);
 * await client.fields.associateContextProjects(field.id, context.id, {
 *   projectIds: ['10000'],
 * });
 * ```
 */
export class FieldService extends BaseService {
  /**
   * Get all fields (system and custom)
   *
   * `GET /rest/api/3/field`
   *
   * @returns All fields visible to the caller
   */
  async list(): Promise<Field[]> {
    return this.getMethod('/field', z.array(FieldSchema));
  }

  /**
   * Get a single field by ID or key
   *
   * `GET /rest/api/3/field/{fieldId}`
   *
   * @param fieldId - Field ID or key (e.g. `customfield_10000`)
   * @returns The requested field
   */
  async get(fieldId: string): Promise<Field> {
    return this.getMethod(`/field/${fieldId}`, FieldSchema);
  }

  /**
   * Create a custom field
   *
   * `POST /rest/api/3/field`
   *
   * @param input - Name, type and searcher key of the new custom field
   * @returns The created field
   */
  async create(input: CreateFieldInput): Promise<Field> {
    const body = CreateFieldInputSchema.parse(input);
    return this.postMethod('/field', FieldSchema, body);
  }

  /**
   * Update a custom field
   *
   * `PUT /rest/api/3/field/{fieldId}`
   *
   * @param fieldId - Field ID or key
   * @param input - Fields to update
   * @returns The updated field
   */
  async update(fieldId: string, input: UpdateFieldInput): Promise<Field> {
    const body = UpdateFieldInputSchema.parse(input);
    return this.putMethod(`/field/${fieldId}`, FieldSchema, body);
  }

  /**
   * Delete a custom field
   *
   * `DELETE /rest/api/3/field/{fieldId}`
   *
   * @param fieldId - Field ID or key
   * @returns Nothing
   */
  async deleteField(fieldId: string): Promise<void> {
    await this.deleteMethod(`/field/${fieldId}`);
  }

  /**
   * Get the contexts of a custom field
   *
   * `GET /rest/api/3/field/{fieldId}/context`
   *
   * @param fieldId - Field ID or key
   * @returns The contexts defined for the field
   */
  async listContexts(fieldId: string): Promise<FieldContext[]> {
    const result = await this.getMethod(
      `/field/${fieldId}/context`,
      FieldContextListResponseSchema
    );
    return result.values;
  }

  /**
   * Create a context for a custom field
   *
   * `POST /rest/api/3/field/{fieldId}/context`
   *
   * @param fieldId - Field ID or key
   * @param input - Context name plus optional project / issue type restrictions
   * @returns The created context
   */
  async createContext(fieldId: string, input: CreateFieldContextInput): Promise<FieldContext> {
    const body = CreateFieldContextInputSchema.parse(input);
    return this.postMethod(`/field/${fieldId}/context`, FieldContextSchema, body);
  }

  /**
   * Update a custom field context
   *
   * `PUT /rest/api/3/field/{fieldId}/context/{contextId}`
   *
   * @param fieldId - Field ID or key
   * @param contextId - Context ID
   * @param input - Name and/or description to update
   * @returns The updated context
   */
  async updateContext(
    fieldId: string,
    contextId: string,
    input: UpdateFieldContextInput
  ): Promise<FieldContext> {
    const body = UpdateFieldContextInputSchema.parse(input);
    return this.putMethod(`/field/${fieldId}/context/${contextId}`, FieldContextSchema, body);
  }

  /**
   * Delete a custom field context
   *
   * `DELETE /rest/api/3/field/{fieldId}/context/{contextId}`
   *
   * @param fieldId - Field ID or key
   * @param contextId - Context ID
   * @returns Nothing
   */
  async deleteContext(fieldId: string, contextId: string): Promise<void> {
    await this.deleteMethod(`/field/${fieldId}/context/${contextId}`);
  }

  /**
   * Get the options of a select / multi-select custom field context
   *
   * `GET /rest/api/3/field/{fieldId}/context/{contextId}/option`
   *
   * @param fieldId - Field ID or key
   * @param contextId - Context ID
   * @returns The options defined for the context
   */
  async listOptions(fieldId: string, contextId: string): Promise<FieldOption[]> {
    const result = await this.getMethod(
      `/field/${fieldId}/context/${contextId}/option`,
      FieldOptionListResponseSchema
    );
    return result.values;
  }

  /**
   * Create one or more options on a select / multi-select custom field context
   *
   * `POST /rest/api/3/field/{fieldId}/context/{contextId}/option`
   *
   * The endpoint is bulk in both directions: it takes `{ options: [...] }` and
   * returns `{ options: [...] }`. The Go SDK posts a bare option object and
   * decodes a bare option, which this endpoint rejects.
   *
   * @param fieldId - Field ID or key
   * @param contextId - Context ID
   * @param inputs - The options to create
   * @returns The created options, in the order the API returned them
   */
  async createOptions(
    fieldId: string,
    contextId: string,
    inputs: CreateFieldOptionInput[]
  ): Promise<FieldOption[]> {
    const body = CreateFieldOptionsRequestSchema.parse({ options: inputs });
    const result = await this.postMethod(
      `/field/${fieldId}/context/${contextId}/option`,
      CreateFieldOptionsResponseSchema,
      body
    );
    return result.options;
  }

  /**
   * Create a single option on a select / multi-select custom field context
   *
   * Convenience wrapper over {@link createOptions} for the common one-option
   * case.
   *
   * @param fieldId - Field ID or key
   * @param contextId - Context ID
   * @param input - The option value
   * @returns The created option
   * @throws If the API reports success but returns no option
   */
  async createOption(
    fieldId: string,
    contextId: string,
    input: CreateFieldOptionInput
  ): Promise<FieldOption> {
    const [option] = await this.createOptions(fieldId, contextId, [input]);
    if (option === undefined) {
      throw new Error('Jira accepted the option but returned no created option');
    }
    return option;
  }

  /**
   * Associate projects with a custom field context
   *
   * `PUT /rest/api/3/field/{fieldId}/context/{contextId}/project`
   *
   * Required since Jira Cloud CHANGE-3033 (February 2026): creating a custom
   * field no longer auto-associates it with projects.
   *
   * @param fieldId - Field ID or key
   * @param contextId - Context ID
   * @param input - The project IDs to associate (at least one)
   * @returns Nothing
   */
  async associateContextProjects(
    fieldId: string,
    contextId: string,
    input: AssociateContextProjectsInput
  ): Promise<void> {
    const body = AssociateContextProjectsInputSchema.parse(input);
    await this.putMethodRaw(`/field/${fieldId}/context/${contextId}/project`, body);
  }

  /**
   * Remove projects from a custom field context
   *
   * `POST /rest/api/3/field/{fieldId}/context/{contextId}/project/remove`
   *
   * @param fieldId - Field ID or key
   * @param contextId - Context ID
   * @param input - The project IDs to remove (at least one)
   * @returns Nothing
   */
  async removeContextProjects(
    fieldId: string,
    contextId: string,
    input: RemoveContextProjectsInput
  ): Promise<void> {
    const body = RemoveContextProjectsInputSchema.parse(input);
    await this.postMethodRaw(`/field/${fieldId}/context/${contextId}/project/remove`, body);
  }

  /**
   * Get the context-to-project mappings of a custom field
   *
   * `GET /rest/api/3/field/{fieldId}/context/projectmapping`
   *
   * @param fieldId - Field ID or key
   * @param options - Optional context ID filter and pagination
   * @returns The context-to-project mappings
   */
  async getContextProjectMappings(
    fieldId: string,
    options?: GetContextProjectMappingsOptions
  ): Promise<ContextProjectMapping[]> {
    const params = this.buildParams({
      contextId: options?.contextIds,
      startAt: options?.startAt,
      maxResults: options?.maxResults,
    });

    const result = await this.getMethod(
      `/field/${fieldId}/context/projectmapping`,
      ContextProjectMappingListResponseSchema,
      params
    );
    return result.values;
  }
}
