import { z } from 'zod';
import { BaseService } from './base.service.js';
import {
  ResolutionSchema,
  CreateResolutionInputSchema,
  UpdateResolutionInputSchema,
  type Resolution,
  type CreateResolutionInput,
  type UpdateResolutionInput,
} from '../schemas/resolution/index.js';

/**
 * Resolution service for CRUD operations on Jira issue resolutions
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * const resolutions = await client.resolutions.list();
 * const resolution = await client.resolutions.get('1');
 * await client.resolutions.setDefault('1');
 * ```
 */
export class ResolutionService extends BaseService {
  /**
   * List all resolutions
   *
   * `GET /rest/api/3/resolution`
   *
   * @returns All resolutions defined on the instance
   */
  async list(): Promise<Resolution[]> {
    return this.getMethod('/resolution', z.array(ResolutionSchema));
  }

  /**
   * Get a resolution by ID
   *
   * `GET /rest/api/3/resolution/{id}`
   *
   * @param resolutionId - The resolution ID
   * @returns The requested resolution
   */
  async get(resolutionId: string): Promise<Resolution> {
    return this.getMethod(`/resolution/${resolutionId}`, ResolutionSchema);
  }

  /**
   * Create a new resolution
   *
   * `POST /rest/api/3/resolution`
   *
   * @param input - The resolution to create
   * @returns The created resolution
   */
  async create(input: CreateResolutionInput): Promise<Resolution> {
    const body = CreateResolutionInputSchema.parse(input);
    return this.postMethod('/resolution', ResolutionSchema, body);
  }

  /**
   * Update a resolution
   *
   * `PUT /rest/api/3/resolution/{id}`
   *
   * @param resolutionId - The resolution ID
   * @param input - The fields to update
   * @returns The updated resolution
   */
  async update(resolutionId: string, input: UpdateResolutionInput): Promise<Resolution> {
    const body = UpdateResolutionInputSchema.parse(input);
    return this.putMethod(`/resolution/${resolutionId}`, ResolutionSchema, body);
  }

  /**
   * Delete a resolution, reassigning affected issues to a replacement resolution
   *
   * `DELETE /rest/api/3/resolution/{id}?replaceWith={replacementId}`
   *
   * @param resolutionId - The resolution to delete
   * @param replacementId - The resolution to reassign issues to
   * @returns Nothing; resolves once the resolution is deleted
   */
  async deleteResolution(resolutionId: string, replacementId: string): Promise<void> {
    const params = this.buildParams({ replaceWith: replacementId });

    await this.http.delete(this.buildPath(`/resolution/${resolutionId}`), {
      params,
    });
  }

  /**
   * Set a resolution as the instance default
   *
   * `PUT /rest/api/3/resolution/default`
   *
   * @param resolutionId - The resolution to make default
   * @returns Nothing; resolves once the default is set
   */
  async setDefault(resolutionId: string): Promise<void> {
    await this.putMethodRaw('/resolution/default', { id: resolutionId });
  }
}
