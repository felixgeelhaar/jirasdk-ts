import { z } from 'zod';
import { BaseService } from './base.service.js';
import {
  ApplicationPropertySchema,
  SetApplicationPropertyInputSchema,
  type ApplicationProperty,
  type SetApplicationPropertyInput,
} from '../schemas/appproperties/index.js';

const APPLICATION_PROPERTIES_PATH = '/application-properties';

/**
 * Application properties service for Jira system configuration settings
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * const settings = await client.appProperties.getAdvancedSettings();
 * const prop = await client.appProperties.getApplicationProperty('jira.clone.prefix');
 * await client.appProperties.setApplicationProperty({
 *   id: 'jira.clone.prefix',
 *   value: 'CLONE -',
 * });
 * ```
 */
export class AppPropertiesService extends BaseService {
  /**
   * Get all advanced settings
   *
   * `GET /rest/api/3/application-properties/advanced-settings`
   *
   * @returns The list of advanced settings properties
   */
  async getAdvancedSettings(): Promise<ApplicationProperty[]> {
    return this.getMethod(
      `${APPLICATION_PROPERTIES_PATH}/advanced-settings`,
      z.array(ApplicationPropertySchema)
    );
  }

  /**
   * Get a single application property by key
   *
   * `GET /rest/api/3/application-properties?key={key}`
   *
   * @param key - The application property key
   * @returns The matching application property
   * @throws If no property matches the given key
   */
  async getApplicationProperty(key: string): Promise<ApplicationProperty> {
    const params = this.buildParams({ key });
    const properties = await this.getMethod(
      APPLICATION_PROPERTIES_PATH,
      z.array(ApplicationPropertySchema),
      params
    );

    const property = properties[0];
    if (property === undefined) {
      throw new Error(`Application property not found: ${key}`);
    }

    return property;
  }

  /**
   * Set the value of an application property
   *
   * `PUT /rest/api/3/application-properties/{id}`
   *
   * @param input - The property ID and its new value
   * @returns Nothing; resolves once the property is stored
   */
  async setApplicationProperty(input: SetApplicationPropertyInput): Promise<void> {
    const { id, value } = SetApplicationPropertyInputSchema.parse(input);
    await this.putMethodRaw(`${APPLICATION_PROPERTIES_PATH}/${id}`, { value });
  }
}
