import { BaseService } from './base.service.js';
import {
  AddGadgetInputSchema,
  CreateDashboardInputSchema,
  DashboardGadgetListSchema,
  DashboardGadgetSchema,
  DashboardListResultSchema,
  DashboardSchema,
  UpdateDashboardInputSchema,
  UpdateGadgetInputSchema,
  type AddGadgetInput,
  type CreateDashboardInput,
  type Dashboard,
  type DashboardGadget,
  type DashboardListResult,
  type ListDashboardsOptions,
  type UpdateDashboardInput,
  type UpdateGadgetInput,
} from '../schemas/dashboard/index.js';

/**
 * Dashboard service for managing Jira dashboards and their gadgets
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * // List the current user's favourite dashboards
 * const page = await client.dashboards.list({ filter: 'favourite' });
 *
 * // Add a gadget
 * await client.dashboards.addGadget('10000', {
 *   moduleKey: 'com.atlassian.jira.gadgets:filter-results',
 *   position: { row: 0, column: 0 },
 * });
 * ```
 */
export class DashboardService extends BaseService {
  /**
   * List dashboards visible to the current user
   *
   * `GET /rest/api/3/dashboard`
   *
   * @param options - Filter (`favourite` / `my`) and pagination options
   * @returns A page of dashboards
   */
  async list(options?: ListDashboardsOptions): Promise<DashboardListResult> {
    const params = this.buildParams({
      filter: options?.filter,
      startAt: options?.startAt,
      maxResults: options?.maxResults,
    });

    return this.getMethod('/dashboard', DashboardListResultSchema, params);
  }

  /**
   * Async iterator over every dashboard matching the given options
   *
   * @param options - List options (`startAt` is managed by the iterator)
   * @returns An async generator yielding dashboards page by page
   *
   * @example
   * ```typescript
   * for await (const dashboard of client.dashboards.iterate()) {
   *   console.log(dashboard.id, dashboard.name);
   * }
   * ```
   */
  async *iterate(
    options?: Omit<ListDashboardsOptions, 'startAt'>
  ): AsyncGenerator<Dashboard, void, undefined> {
    const pageSize = options?.maxResults ?? 50;
    let startAt = 0;

    for (;;) {
      const page = await this.list({ ...options, startAt, maxResults: pageSize });

      for (const dashboard of page.dashboards) {
        yield dashboard;
      }

      if (page.dashboards.length === 0) {
        return;
      }

      startAt += page.dashboards.length;

      if (page.total === undefined || startAt >= page.total) {
        return;
      }
    }
  }

  /**
   * Collect every dashboard matching the given options into an array
   *
   * Loads all pages into memory — prefer `iterate()` for large result sets.
   *
   * @param options - List options (`startAt` is managed internally)
   * @returns All matching dashboards
   */
  async all(options?: Omit<ListDashboardsOptions, 'startAt'>): Promise<Dashboard[]> {
    const dashboards: Dashboard[] = [];
    for await (const dashboard of this.iterate(options)) {
      dashboards.push(dashboard);
    }
    return dashboards;
  }

  /**
   * Get a dashboard by ID
   *
   * `GET /rest/api/3/dashboard/{dashboardId}`
   *
   * @param dashboardId - ID of the dashboard
   * @returns The requested dashboard
   */
  async get(dashboardId: string): Promise<Dashboard> {
    return this.getMethod(`/dashboard/${dashboardId}`, DashboardSchema);
  }

  /**
   * Create a new dashboard
   *
   * `POST /rest/api/3/dashboard`
   *
   * @param input - Dashboard definition (name is required)
   * @returns The created dashboard
   */
  async create(input: CreateDashboardInput): Promise<Dashboard> {
    const body = CreateDashboardInputSchema.parse(input);
    return this.postMethod('/dashboard', DashboardSchema, body);
  }

  /**
   * Update a dashboard
   *
   * `PUT /rest/api/3/dashboard/{dashboardId}`
   *
   * @param dashboardId - ID of the dashboard to update
   * @param input - Fields to change
   * @returns The updated dashboard
   */
  async update(dashboardId: string, input: UpdateDashboardInput): Promise<Dashboard> {
    const body = UpdateDashboardInputSchema.parse(input);
    return this.putMethod(`/dashboard/${dashboardId}`, DashboardSchema, body);
  }

  /**
   * Delete a dashboard
   *
   * `DELETE /rest/api/3/dashboard/{dashboardId}`
   *
   * @param dashboardId - ID of the dashboard to delete
   * @returns Nothing
   */
  async deleteDashboard(dashboardId: string): Promise<void> {
    await this.deleteMethod(`/dashboard/${dashboardId}`);
  }

  /**
   * Copy an existing dashboard
   *
   * `POST /rest/api/3/dashboard/{dashboardId}/copy`
   *
   * @param dashboardId - ID of the dashboard to copy
   * @param input - Definition of the copy (name is required)
   * @returns The newly created dashboard
   */
  async copy(dashboardId: string, input: CreateDashboardInput): Promise<Dashboard> {
    const body = CreateDashboardInputSchema.parse(input);
    return this.postMethod(`/dashboard/${dashboardId}/copy`, DashboardSchema, body);
  }

  /**
   * Get all gadgets on a dashboard
   *
   * `GET /rest/api/3/dashboard/{dashboardId}/gadget`
   *
   * @param dashboardId - ID of the dashboard
   * @returns The dashboard's gadgets
   */
  async getGadgets(dashboardId: string): Promise<DashboardGadget[]> {
    const result = await this.getMethod(
      `/dashboard/${dashboardId}/gadget`,
      DashboardGadgetListSchema
    );
    return result.gadgets;
  }

  /**
   * Add a gadget to a dashboard
   *
   * `POST /rest/api/3/dashboard/{dashboardId}/gadget`
   *
   * @param dashboardId - ID of the dashboard
   * @param input - Gadget definition (module key is required)
   * @returns The created gadget
   */
  async addGadget(dashboardId: string, input: AddGadgetInput): Promise<DashboardGadget> {
    const body = AddGadgetInputSchema.parse(input);
    return this.postMethod(`/dashboard/${dashboardId}/gadget`, DashboardGadgetSchema, body);
  }

  /**
   * Update a gadget on a dashboard
   *
   * `PUT /rest/api/3/dashboard/{dashboardId}/gadget/{gadgetId}`
   *
   * Deviates from the Go SDK, which decodes a gadget from the response body.
   * The endpoint is documented as returning `204 No Content`, so there is no
   * body to decode and attempting to validate one fails against a live
   * instance.
   *
   * @param dashboardId - ID of the dashboard
   * @param gadgetId - ID of the gadget
   * @param input - Fields to change (title, color, position)
   * @returns Nothing; resolves once the gadget is updated
   */
  async updateGadget(
    dashboardId: string,
    gadgetId: number,
    input: UpdateGadgetInput
  ): Promise<void> {
    const body = UpdateGadgetInputSchema.parse(input);
    await this.putMethodRaw(`/dashboard/${dashboardId}/gadget/${String(gadgetId)}`, body);
  }

  /**
   * Remove a gadget from a dashboard
   *
   * `DELETE /rest/api/3/dashboard/{dashboardId}/gadget/{gadgetId}`
   *
   * @param dashboardId - ID of the dashboard
   * @param gadgetId - ID of the gadget to remove
   * @returns Nothing
   */
  async removeGadget(dashboardId: string, gadgetId: number): Promise<void> {
    await this.deleteMethod(`/dashboard/${dashboardId}/gadget/${String(gadgetId)}`);
  }
}
