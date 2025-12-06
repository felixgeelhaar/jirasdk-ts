import { z } from 'zod';
import { BaseService } from './base.service.js';
import {
  ProjectSchema,
  ProjectSearchResultSchema,
  CreateProjectInputSchema,
  UpdateProjectInputSchema,
  type Project,
  type ProjectSearchResult,
  type CreateProjectInput,
  type UpdateProjectInput,
  type GetProjectsOptions,
} from '../schemas/index.js';

/**
 * Project service for CRUD operations on Jira projects
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * // Get all projects
 * const projects = await client.projects.list();
 *
 * // Get a project
 * const project = await client.projects.get('PROJECT');
 *
 * // Create a project
 * const newProject = await client.projects.create({
 *   key: 'PROJ',
 *   name: 'My Project',
 *   projectTypeKey: 'software',
 * });
 * ```
 */
export class ProjectService extends BaseService {
  /**
   * Get a project by key or ID
   */
  async get(
    projectIdOrKey: string,
    options?: { expand?: string[]; properties?: string[] }
  ): Promise<Project> {
    const params = this.buildParams({
      expand: this.arrayToCommaSeparated(options?.expand),
      properties: this.arrayToCommaSeparated(options?.properties),
    });

    return this.getMethod(`/project/${projectIdOrKey}`, ProjectSchema, params);
  }

  /**
   * Get all projects (paginated)
   */
  async list(options?: GetProjectsOptions): Promise<ProjectSearchResult> {
    const params = this.buildParams({
      startAt: options?.startAt,
      maxResults: options?.maxResults,
      orderBy: options?.orderBy,
      id: options?.id?.join(','),
      keys: options?.keys?.join(','),
      query: options?.query,
      typeKey: options?.typeKey,
      categoryId: options?.categoryId,
      action: options?.action,
      expand: options?.expand,
      status: options?.status?.join(','),
      properties: options?.properties?.join(','),
      propertyQuery: options?.propertyQuery,
    });

    return this.getMethod('/project/search', ProjectSearchResultSchema, params);
  }

  /**
   * Create a new project
   */
  async create(input: CreateProjectInput): Promise<Project> {
    const validatedInput = CreateProjectInputSchema.parse(input);
    return this.postMethod('/project', ProjectSchema, validatedInput);
  }

  /**
   * Update a project
   */
  async update(projectIdOrKey: string, input: UpdateProjectInput): Promise<Project> {
    const validatedInput = UpdateProjectInputSchema.parse(input);
    return this.putMethod(`/project/${projectIdOrKey}`, ProjectSchema, validatedInput);
  }

  /**
   * Delete a project
   */
  async deleteProject(projectIdOrKey: string, options?: { enableUndo?: boolean }): Promise<void> {
    const params = this.buildParams({
      enableUndo: options?.enableUndo,
    });

    await this.http.delete(this.buildPath(`/project/${projectIdOrKey}`), {
      params,
    } as never);
  }

  /**
   * Archive a project
   */
  async archive(projectIdOrKey: string): Promise<void> {
    await this.postMethodRaw(`/project/${projectIdOrKey}/archive`);
  }

  /**
   * Restore an archived project
   */
  async restore(projectIdOrKey: string): Promise<Project> {
    return this.postMethod(`/project/${projectIdOrKey}/restore`, ProjectSchema);
  }

  /**
   * Get recent projects
   */
  async getRecent(options?: { expand?: string[]; properties?: string[] }): Promise<Project[]> {
    const params = this.buildParams({
      expand: this.arrayToCommaSeparated(options?.expand),
      properties: this.arrayToCommaSeparated(options?.properties),
    });

    return this.getMethod('/project/recent', z.array(ProjectSchema), params);
  }
}
