import { z } from 'zod';
import { BaseService } from './base.service.js';
import {
  ScreenSchema,
  ScreenListResultSchema,
  ScreenTabSchema,
  ScreenFieldSchema,
  CreateScreenInputSchema,
  UpdateScreenInputSchema,
  CreateScreenTabInputSchema,
  UpdateScreenTabInputSchema,
  AddScreenFieldInputSchema,
  type Screen,
  type ScreenListResult,
  type ScreenTab,
  type ScreenField,
  type CreateScreenInput,
  type UpdateScreenInput,
  type CreateScreenTabInput,
  type UpdateScreenTabInput,
  type AddScreenFieldInput,
  type ListScreensOptions,
} from '../schemas/screen/index.js';

const DEFAULT_PAGE_SIZE = 50;

/**
 * Screen service for managing Jira screens, their tabs and the fields on them.
 *
 * Screens define which fields are displayed during issue operations
 * (create, edit, view).
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * const screens = await client.screens.list({ maxResults: 50 });
 * const tabs = await client.screens.listTabs(10000);
 * await client.screens.addField(10000, 10100, { fieldId: 'summary' });
 * ```
 */
export class ScreenService extends BaseService {
  /**
   * List screens (paginated)
   *
   * `GET /rest/api/3/screens`
   *
   * @param options - Optional pagination
   * @returns A page of screens
   */
  async list(options?: ListScreensOptions): Promise<ScreenListResult> {
    const params = this.buildParams({
      startAt: options?.startAt,
      maxResults: options?.maxResults,
    });

    return this.getMethod('/screens', ScreenListResultSchema, params);
  }

  /**
   * Async iterator over every screen, transparently paging the API
   *
   * @param options - Optional pagination; `maxResults` sets the page size
   * @returns An async generator yielding each screen
   */
  async *iterate(
    options?: Omit<ListScreensOptions, 'startAt'>
  ): AsyncGenerator<Screen, void, undefined> {
    const pageSize = options?.maxResults ?? DEFAULT_PAGE_SIZE;
    let startAt = 0;

    for (;;) {
      const page = await this.list({ startAt, maxResults: pageSize });

      for (const screen of page.values) {
        yield screen;
      }

      if (page.values.length === 0 || page.isLast === true) {
        return;
      }

      startAt += page.values.length;

      if (page.total !== undefined && startAt >= page.total) {
        return;
      }

      if (page.values.length < pageSize) {
        return;
      }
    }
  }

  /**
   * Collect every screen into an array (loads all pages into memory)
   *
   * @param options - Optional pagination; `maxResults` sets the page size
   * @returns All screens
   */
  async all(options?: Omit<ListScreensOptions, 'startAt'>): Promise<Screen[]> {
    const screens: Screen[] = [];
    for await (const screen of this.iterate(options)) {
      screens.push(screen);
    }
    return screens;
  }

  /**
   * Get a screen by ID
   *
   * `GET /rest/api/3/screens/{screenId}`
   *
   * @param screenId - Screen ID
   * @returns The screen
   */
  async get(screenId: number): Promise<Screen> {
    return this.getMethod(`/screens/${screenId}`, ScreenSchema);
  }

  /**
   * Create a screen
   *
   * `POST /rest/api/3/screens`
   *
   * @param input - Screen name and optional description
   * @returns The created screen
   */
  async create(input: CreateScreenInput): Promise<Screen> {
    const body = CreateScreenInputSchema.parse(input);
    return this.postMethod('/screens', ScreenSchema, body);
  }

  /**
   * Update a screen
   *
   * `PUT /rest/api/3/screens/{screenId}`
   *
   * @param screenId - Screen ID
   * @param input - Fields to update
   * @returns The updated screen
   */
  async update(screenId: number, input: UpdateScreenInput): Promise<Screen> {
    const body = UpdateScreenInputSchema.parse(input);
    return this.putMethod(`/screens/${screenId}`, ScreenSchema, body);
  }

  /**
   * Delete a screen
   *
   * `DELETE /rest/api/3/screens/{screenId}`
   *
   * @param screenId - Screen ID
   * @returns Nothing; the endpoint responds 204 No Content
   */
  async deleteScreen(screenId: number): Promise<void> {
    await this.deleteMethod(`/screens/${screenId}`);
  }

  /**
   * Get the fields that can still be added to a screen
   *
   * `GET /rest/api/3/screens/{screenId}/availableFields`
   *
   * @param screenId - Screen ID
   * @returns The fields available to add
   */
  async getAvailableFields(screenId: number): Promise<ScreenField[]> {
    return this.getMethod(`/screens/${screenId}/availableFields`, z.array(ScreenFieldSchema));
  }

  /**
   * List the tabs of a screen
   *
   * `GET /rest/api/3/screens/{screenId}/tabs`
   *
   * @param screenId - Screen ID
   * @returns The screen's tabs
   */
  async listTabs(screenId: number): Promise<ScreenTab[]> {
    return this.getMethod(`/screens/${screenId}/tabs`, z.array(ScreenTabSchema));
  }

  /**
   * Create a tab on a screen
   *
   * `POST /rest/api/3/screens/{screenId}/tabs`
   *
   * @param screenId - Screen ID
   * @param input - Tab name
   * @returns The created tab
   */
  async createTab(screenId: number, input: CreateScreenTabInput): Promise<ScreenTab> {
    const body = CreateScreenTabInputSchema.parse(input);
    return this.postMethod(`/screens/${screenId}/tabs`, ScreenTabSchema, body);
  }

  /**
   * Update a screen tab
   *
   * `PUT /rest/api/3/screens/{screenId}/tabs/{tabId}`
   *
   * @param screenId - Screen ID
   * @param tabId - Tab ID
   * @param input - Fields to update
   * @returns The updated tab
   */
  async updateTab(
    screenId: number,
    tabId: number,
    input: UpdateScreenTabInput
  ): Promise<ScreenTab> {
    const body = UpdateScreenTabInputSchema.parse(input);
    return this.putMethod(`/screens/${screenId}/tabs/${tabId}`, ScreenTabSchema, body);
  }

  /**
   * Delete a screen tab
   *
   * `DELETE /rest/api/3/screens/{screenId}/tabs/{tabId}`
   *
   * @param screenId - Screen ID
   * @param tabId - Tab ID
   * @returns Nothing; the endpoint responds 204 No Content
   */
  async deleteTab(screenId: number, tabId: number): Promise<void> {
    await this.deleteMethod(`/screens/${screenId}/tabs/${tabId}`);
  }

  /**
   * Add a field to a screen tab
   *
   * `POST /rest/api/3/screens/{screenId}/tabs/{tabId}/fields`
   *
   * @param screenId - Screen ID
   * @param tabId - Tab ID
   * @param input - The ID of the field to add
   * @returns The added field
   */
  async addField(
    screenId: number,
    tabId: number,
    input: AddScreenFieldInput
  ): Promise<ScreenField> {
    const body = AddScreenFieldInputSchema.parse(input);
    return this.postMethod(`/screens/${screenId}/tabs/${tabId}/fields`, ScreenFieldSchema, body);
  }

  /**
   * Remove a field from a screen tab
   *
   * `DELETE /rest/api/3/screens/{screenId}/tabs/{tabId}/fields/{fieldId}`
   *
   * @param screenId - Screen ID
   * @param tabId - Tab ID
   * @param fieldId - Field ID (e.g. `summary`)
   * @returns Nothing; the endpoint responds 204 No Content
   */
  async removeField(screenId: number, tabId: number, fieldId: string): Promise<void> {
    await this.deleteMethod(
      `/screens/${screenId}/tabs/${tabId}/fields/${encodeURIComponent(fieldId)}`
    );
  }
}
