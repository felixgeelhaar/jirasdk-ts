import { z } from 'zod';
import { UserRefSchema } from '@felixgeelhaar/sdk-core/schemas';

/**
 * Issue Watchers
 */
export const WatchersSchema = z.object({
  self: z.url(),
  watchCount: z.number().int().min(0),
  isWatching: z.boolean(),
  watchers: z.array(UserRefSchema).optional(),
});

export type Watchers = z.infer<typeof WatchersSchema>;
