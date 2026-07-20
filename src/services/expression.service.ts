import { BaseService } from './base.service.js';
import {
  AnalysisInputSchema,
  AnalysisResultSchema,
  EvaluationInputSchema,
  EvaluationResultSchema,
  type AnalysisInput,
  type AnalysisResult,
  type EvaluationInput,
  type EvaluationResult,
} from '../schemas/expression/index.js';

/**
 * Jira Expressions service.
 *
 * Jira expressions power custom automation and dynamic content. This service
 * exposes the legacy evaluation endpoint, the Enhanced Search evaluation
 * endpoint, and static analysis.
 *
 * @example
 * ```typescript
 * const client = new JiraClient({ ... });
 *
 * const result = await client.expressions.evaluateExpression({
 *   expression: 'issue.summary',
 *   context: { issue: { key: 'PROJ-123' } },
 * });
 *
 * const analysis = await client.expressions.analyze({
 *   expressions: ['issue.summary', 'user.displayName'],
 * });
 * ```
 */
export class ExpressionService extends BaseService {
  /**
   * Evaluate a Jira expression using the legacy endpoint.
   *
   * `POST /rest/api/3/expression/eval`
   *
   * @deprecated Use {@link ExpressionService.evaluateExpression} instead. Atlassian
   * removed `/rest/api/3/expression/eval` on August 1, 2025; the replacement uses the
   * Enhanced Search API (eventual consistency) for better performance and scalability.
   *
   * @param input - The expression and its evaluation context.
   * @returns The evaluated value plus optional metadata and errors.
   */
  async evaluate(input: EvaluationInput): Promise<EvaluationResult> {
    const body = EvaluationInputSchema.parse(input);
    return this.postMethod('/expression/eval', EvaluationResultSchema, body);
  }

  /**
   * Evaluate a Jira expression using the Enhanced Search API.
   *
   * `POST /rest/api/3/expression/evaluate`
   *
   * Compared with {@link ExpressionService.evaluate} this endpoint offers better
   * performance and scalability, at the cost of eventual rather than strong
   * consistency. Input and output shapes are identical.
   *
   * @param input - The expression and its evaluation context.
   * @returns The evaluated value plus optional metadata and errors.
   */
  async evaluateExpression(input: EvaluationInput): Promise<EvaluationResult> {
    const body = EvaluationInputSchema.parse(input);
    return this.postMethod('/expression/evaluate', EvaluationResultSchema, body);
  }

  /**
   * Analyse Jira expressions for syntax validity, type and complexity.
   *
   * `POST /rest/api/3/expression/analyse`
   *
   * @param input - One or more expressions plus an optional context.
   * @returns One analysis entry per submitted expression.
   */
  async analyze(input: AnalysisInput): Promise<AnalysisResult> {
    const body = AnalysisInputSchema.parse(input);
    return this.postMethod('/expression/analyse', AnalysisResultSchema, body);
  }
}
