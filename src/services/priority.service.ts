import { z } from 'zod';
import { BaseService } from './base.service.js';
import {
  PrioritySchema,
  CreatePriorityInputSchema,
  UpdatePriorityInputSchema,
  type Priority,
  type CreatePriorityInput,
  type UpdatePriorityInput,
} from '../schemas/priority/index.js';

/**
 * Priority service for CRUD operations on Jira issue priorities
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * const priorities = await client.priorities.list();
 * const priority = await client.priorities.get('1');
 * await client.priorities.setDefault('3');
 * ```
 */
export class PriorityService extends BaseService {
  /**
   * List all priorities
   *
   * `GET /rest/api/3/priority`
   *
   * @returns All priorities defined on the instance
   */
  async list(): Promise<Priority[]> {
    return this.getMethod('/priority', z.array(PrioritySchema));
  }

  /**
   * Get a priority by ID
   *
   * `GET /rest/api/3/priority/{id}`
   *
   * @param priorityId - The priority ID
   * @returns The requested priority
   */
  async get(priorityId: string): Promise<Priority> {
    return this.getMethod(`/priority/${priorityId}`, PrioritySchema);
  }

  /**
   * Create a new priority
   *
   * `POST /rest/api/3/priority`
   *
   * @param input - The priority to create
   * @returns The created priority
   */
  async create(input: CreatePriorityInput): Promise<Priority> {
    const body = CreatePriorityInputSchema.parse(input);
    return this.postMethod('/priority', PrioritySchema, body);
  }

  /**
   * Update a priority
   *
   * `PUT /rest/api/3/priority/{id}`
   *
   * @param priorityId - The priority ID
   * @param input - The fields to update
   * @returns The updated priority
   */
  async update(priorityId: string, input: UpdatePriorityInput): Promise<Priority> {
    const body = UpdatePriorityInputSchema.parse(input);
    return this.putMethod(`/priority/${priorityId}`, PrioritySchema, body);
  }

  /**
   * Delete a priority, reassigning affected issues to a replacement priority
   *
   * `DELETE /rest/api/3/priority/{id}?replaceWith={replacementId}`
   *
   * @param priorityId - The priority to delete
   * @param replacementId - The priority to reassign issues to
   * @returns Nothing; resolves once the priority is deleted
   */
  async deletePriority(priorityId: string, replacementId: string): Promise<void> {
    const params = this.buildParams({ replaceWith: replacementId });

    await this.http.delete(this.buildPath(`/priority/${priorityId}`), {
      params,
    });
  }

  /**
   * Set a priority as the instance default
   *
   * `PUT /rest/api/3/priority/default`
   *
   * @param priorityId - The priority to make default
   * @returns Nothing; resolves once the default is set
   */
  async setDefault(priorityId: string): Promise<void> {
    await this.putMethodRaw('/priority/default', { id: priorityId });
  }
}
