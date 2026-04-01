import { z } from 'zod';
import { confirmSchema, reasonSchema, snowflakeSchema } from './common.js';

export const createChannelInputSchema = z.object({
  guildId: snowflakeSchema,
  name: z.string().min(1).max(100),
  type: z.number().int().nonnegative(),
  topic: z.string().max(4096).optional(),
  parentId: snowflakeSchema.nullable().optional(),
  position: z.number().int().optional(),
  nsfw: z.boolean().optional(),
  reason: reasonSchema,
});

export const updateChannelInputSchema = z.object({
  guildId: snowflakeSchema,
  channelId: snowflakeSchema,
  name: z.string().min(1).max(100).optional(),
  topic: z.string().max(4096).nullable().optional(),
  parentId: snowflakeSchema.nullable().optional(),
  position: z.number().int().optional(),
  nsfw: z.boolean().optional(),
  reason: reasonSchema,
});

export const deleteChannelInputSchema = z.object({
  guildId: snowflakeSchema,
  channelId: snowflakeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});
