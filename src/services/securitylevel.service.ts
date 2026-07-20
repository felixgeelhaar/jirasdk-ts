import { BaseService } from './base.service.js';
import {
  SecurityLevelSchema,
  SecuritySchemeSchema,
  IssueSecuritySchemesResponseSchema,
  type SecurityLevel,
  type SecurityScheme,
} from '../schemas/securitylevel/index.js';

/**
 * Security level service for Jira issue security levels and schemes
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * const level = await client.securityLevels.get('10000');
 * const schemes = await client.securityLevels.getIssueSecuritySchemes();
 * ```
 */
export class SecurityLevelService extends BaseService {
  /**
   * Get an issue security level by ID
   *
   * `GET /rest/api/3/securitylevel/{levelId}`
   *
   * @param levelId - ID of the security level
   * @returns The security level
   */
  async get(levelId: string): Promise<SecurityLevel> {
    return this.getMethod(`/securitylevel/${levelId}`, SecurityLevelSchema);
  }

  /**
   * Get all issue security schemes
   *
   * `GET /rest/api/3/issuesecurityschemes`
   *
   * @returns All issue security schemes
   */
  async getIssueSecuritySchemes(): Promise<SecurityScheme[]> {
    const result = await this.getMethod(
      '/issuesecurityschemes',
      IssueSecuritySchemesResponseSchema
    );
    return result.issueSecuritySchemes;
  }

  /**
   * Get an issue security scheme by ID
   *
   * `GET /rest/api/3/issuesecurityschemes/{schemeId}`
   *
   * @param schemeId - ID of the issue security scheme
   * @returns The issue security scheme
   */
  async getIssueSecurityScheme(schemeId: string): Promise<SecurityScheme> {
    return this.getMethod(`/issuesecurityschemes/${schemeId}`, SecuritySchemeSchema);
  }
}
