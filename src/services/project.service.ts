import { z } from 'zod';
import { BaseService } from './base.service.js';
import {
  ProjectSchema,
  ProjectSearchResultSchema,
  CreateProjectInputSchema,
  UpdateProjectInputSchema,
  ProjectComponentSchema,
  ProjectComponentsSchema,
  CreateComponentInputSchema,
  UpdateComponentInputSchema,
  ProjectVersionSchema,
  ProjectVersionsSchema,
  CreateVersionInputSchema,
  UpdateVersionInputSchema,
  type Project,
  type ProjectSearchResult,
  type CreateProjectInput,
  type UpdateProjectInput,
  type GetProjectsOptions,
  type ProjectComponent,
  type CreateComponentInput,
  type UpdateComponentInput,
  type ProjectVersion,
  type CreateVersionInput,
  type UpdateVersionInput,
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

    await this.http.request({
      method: 'DELETE',
      url: this.buildPath(`/project/${projectIdOrKey}`),
      params,
    });
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

  // Components

  /**
   * Create a project component
   *
   * `POST /rest/api/3/component`
   *
   * @param input - Component creation input (name and project are required)
   * @returns The created component
   */
  async createComponent(input: CreateComponentInput): Promise<ProjectComponent> {
    const validatedInput = CreateComponentInputSchema.parse(input);
    return this.postMethod('/component', ProjectComponentSchema, validatedInput);
  }

  /**
   * Update a project component
   *
   * `PUT /rest/api/3/component/{componentId}`
   *
   * @param componentId - Component ID
   * @param input - Fields to update
   * @returns The updated component
   */
  async updateComponent(
    componentId: string,
    input: UpdateComponentInput
  ): Promise<ProjectComponent> {
    const validatedInput = UpdateComponentInputSchema.parse(input);
    return this.putMethod(`/component/${componentId}`, ProjectComponentSchema, validatedInput);
  }

  /**
   * Get a project component by ID
   *
   * `GET /rest/api/3/component/{componentId}`
   *
   * @param componentId - Component ID
   * @returns The component
   */
  async getComponent(componentId: string): Promise<ProjectComponent> {
    return this.getMethod(`/component/${componentId}`, ProjectComponentSchema);
  }

  /**
   * Delete a project component
   *
   * `DELETE /rest/api/3/component/{componentId}`
   *
   * @param componentId - Component ID
   * @param options - Optional component to move affected issues to
   * @returns Nothing (204 No Content)
   */
  async deleteComponent(componentId: string, options?: { moveIssuesTo?: string }): Promise<void> {
    const params = this.buildParams({
      moveIssuesTo: options?.moveIssuesTo,
    });

    await this.http.request({
      method: 'DELETE',
      url: this.buildPath(`/component/${componentId}`),
      params,
    });
  }

  /**
   * List all components of a project
   *
   * `GET /rest/api/3/project/{projectIdOrKey}/components`
   *
   * @param projectIdOrKey - Project ID or key
   * @returns All components of the project
   */
  async listProjectComponents(projectIdOrKey: string): Promise<ProjectComponent[]> {
    return this.getMethod(`/project/${projectIdOrKey}/components`, ProjectComponentsSchema);
  }

  // Versions

  /**
   * Create a project version
   *
   * `POST /rest/api/3/version`
   *
   * @param input - Version creation input (name and project are required)
   * @returns The created version
   */
  async createVersion(input: CreateVersionInput): Promise<ProjectVersion> {
    const validatedInput = CreateVersionInputSchema.parse(input);
    return this.postMethod('/version', ProjectVersionSchema, validatedInput);
  }

  /**
   * Update a project version
   *
   * `PUT /rest/api/3/version/{versionId}`
   *
   * @param versionId - Version ID
   * @param input - Fields to update
   * @returns The updated version
   */
  async updateVersion(versionId: string, input: UpdateVersionInput): Promise<ProjectVersion> {
    const validatedInput = UpdateVersionInputSchema.parse(input);
    return this.putMethod(`/version/${versionId}`, ProjectVersionSchema, validatedInput);
  }

  /**
   * Get a project version by ID
   *
   * `GET /rest/api/3/version/{versionId}`
   *
   * @param versionId - Version ID
   * @param options - Optional expand values (e.g. `operations`, `issuesstatus`)
   * @returns The version
   */
  async getVersion(versionId: string, options?: { expand?: string[] }): Promise<ProjectVersion> {
    const params = this.buildParams({
      expand: this.arrayToCommaSeparated(options?.expand),
    });

    return this.getMethod(`/version/${versionId}`, ProjectVersionSchema, params);
  }

  /**
   * Delete a project version
   *
   * `DELETE /rest/api/3/version/{versionId}`
   *
   * @param versionId - Version ID
   * @param options - Optional versions to move fix/affects references to
   * @returns Nothing (204 No Content)
   */
  async deleteVersion(
    versionId: string,
    options?: { moveFixIssuesTo?: string; moveAffectedIssuesTo?: string }
  ): Promise<void> {
    const params = this.buildParams({
      moveFixIssuesTo: options?.moveFixIssuesTo,
      moveAffectedIssuesTo: options?.moveAffectedIssuesTo,
    });

    await this.http.request({
      method: 'DELETE',
      url: this.buildPath(`/version/${versionId}`),
      params,
    });
  }

  /**
   * List all versions of a project
   *
   * `GET /rest/api/3/project/{projectIdOrKey}/versions`
   *
   * @param projectIdOrKey - Project ID or key
   * @returns All versions of the project
   */
  async listProjectVersions(projectIdOrKey: string): Promise<ProjectVersion[]> {
    return this.getMethod(`/project/${projectIdOrKey}/versions`, ProjectVersionsSchema);
  }
}
