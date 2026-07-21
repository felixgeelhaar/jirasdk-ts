import { z } from 'zod';

/**
 * A Jira application (system) property
 */
export const ApplicationPropertySchema = z
  .object({
    id: z.string(),
    key: z.string().optional(),
    value: z.string().optional(),
    name: z.string().optional(),
    desc: z.string().optional(),
    type: z.string().optional(),
    defaultValue: z.string().optional(),
    allowedValues: z.array(z.string()).optional(),
    example: z.string().optional(),
  })
  .loose();

export type ApplicationProperty = z.infer<typeof ApplicationPropertySchema>;

/**
 * Input for setting the value of an application property
 */
export const SetApplicationPropertyInputSchema = z.object({
  id: z.string().min(1, { error: 'Property ID is required' }),
  value: z.string(),
});

export type SetApplicationPropertyInput = z.infer<typeof SetApplicationPropertyInputSchema>;
