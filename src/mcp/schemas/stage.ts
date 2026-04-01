import { z } from 'zod';

import { confirmSchema, reasonSchema, snowflakeSchema } from './common.js';

export const createStageInstanceInputSchema = z.object({
  guildId: snowflakeSchema,
  channelId: snowflakeSchema,
  topic: z.string().min(1).max(120),
  privacyLevel: z.union([z.literal(1), z.literal(2)]).optional().default(2),
  sendStartNotification: z.boolean().optional(),
  reason: reasonSchema,
});

export const fetchStageInstanceInputSchema = z.object({
  channelId: snowflakeSchema,
});

export const updateStageInstanceInputSchema = z.object({
  channelId: snowflakeSchema,
  topic: z.string().min(1).max(120).optional(),
  privacyLevel: z.union([z.literal(1), z.literal(2)]).optional(),
  reason: reasonSchema,
});

export const deleteStageInstanceInputSchema = z.object({
  channelId: snowflakeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});

export const listActiveThreadsInputSchema = z.object({
  guildId: snowflakeSchema,
});

export const getGuildPreviewInputSchema = z.object({
  guildId: snowflakeSchema,
});
