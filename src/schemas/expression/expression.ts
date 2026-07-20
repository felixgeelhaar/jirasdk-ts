import { z } from 'zod';

/**
 * Complexity metrics reported for an evaluated or analysed expression.
 */
export const ComplexitySchema = z
  .object({
    steps: z.number().int().optional(),
    expensiveOperations: z.number().int().optional(),
    beans: z.number().int().optional(),
    primitiveValues: z.number().int().optional(),
  })
  .loose();

export type Complexity = z.infer<typeof ComplexitySchema>;

/**
 * An error produced while evaluating or analysing an expression.
 */
export const EvaluationErrorSchema = z
  .object({
    type: z.string(),
    message: z.string(),
    line: z.number().int().optional(),
    column: z.number().int().optional(),
  })
  .loose();

export type EvaluationError = z.infer<typeof EvaluationErrorSchema>;

/**
 * Metadata returned alongside an evaluation result.
 */
export const EvaluationMetaSchema = z
  .object({
    complexity: ComplexitySchema.optional(),
    issues: z.array(z.string()).optional(),
  })
  .loose();

export type EvaluationMeta = z.infer<typeof EvaluationMetaSchema>;

/**
 * Input for evaluating a single Jira expression.
 */
export const EvaluationInputSchema = z.object({
  expression: z.string().min(1, { error: 'expression is required' }),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type EvaluationInput = z.infer<typeof EvaluationInputSchema>;

/**
 * Result of evaluating a Jira expression.
 */
export const EvaluationResultSchema = z
  .object({
    value: z.unknown(),
    meta: EvaluationMetaSchema.optional(),
    errors: z.array(EvaluationErrorSchema).optional(),
  })
  .loose();

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

/**
 * Input for analysing one or more Jira expressions.
 */
export const AnalysisInputSchema = z.object({
  expressions: z.array(z.string()).min(1, { error: 'at least one expression is required' }),
  context: z.record(z.string(), z.unknown()).optional(),
});

export type AnalysisInput = z.infer<typeof AnalysisInputSchema>;

/**
 * Analysis of a single expression.
 */
export const ExpressionAnalysisSchema = z
  .object({
    expression: z.string(),
    valid: z.boolean(),
    errors: z.array(EvaluationErrorSchema).optional(),
    type: z.string().optional(),
    complexity: ComplexitySchema.optional(),
  })
  .loose();

export type ExpressionAnalysis = z.infer<typeof ExpressionAnalysisSchema>;

/**
 * Result of analysing a batch of expressions.
 */
export const AnalysisResultSchema = z
  .object({
    results: z.array(ExpressionAnalysisSchema),
  })
  .loose();

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
