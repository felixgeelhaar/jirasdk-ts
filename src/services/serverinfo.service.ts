import { BaseService } from './base.service.js';
import {
  ServerInfoSchema,
  JiraConfigurationSchema,
  type ServerInfo,
  type JiraConfiguration,
} from '../schemas/serverinfo/index.js';

/**
 * Server info service for inspecting the Jira instance
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * const info = await client.serverInfo.get();
 * console.log(info.version, info.deploymentType);
 *
 * const config = await client.serverInfo.getConfiguration();
 * console.log(config.timeTrackingEnabled);
 * ```
 */
export class ServerInfoService extends BaseService {
  /**
   * Get information about the Jira instance
   *
   * `GET /rest/api/3/serverInfo`
   *
   * @returns Version, build and deployment details of the instance
   */
  async get(): Promise<ServerInfo> {
    return this.getMethod('/serverInfo', ServerInfoSchema);
  }

  /**
   * Get the global configuration of the Jira instance
   *
   * `GET /rest/api/3/configuration`
   *
   * @returns Which optional Jira features are enabled
   */
  async getConfiguration(): Promise<JiraConfiguration> {
    return this.getMethod('/configuration', JiraConfigurationSchema);
  }
}
