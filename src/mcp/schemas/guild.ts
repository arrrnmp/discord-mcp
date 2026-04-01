import { z } from 'zod';
import { snowflakeSchema } from './common.js';

export const listGuildsInputSchema = z.object({});

export const getGuildInventoryInputSchema = z.object({
  guildId: snowflakeSchema,
  force: z.boolean().optional().default(true),
});
