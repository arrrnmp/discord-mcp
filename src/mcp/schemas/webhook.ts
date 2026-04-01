import { z } from 'zod';

import { confirmSchema, reasonSchema, snowflakeSchema } from './common.js';

const webhookNameSchema = z.string().min(1).max(80);

export const listGuildWebhooksInputSchema = z.object({
  guildId: snowflakeSchema,
});

export const listChannelWebhooksInputSchema = z.object({
  guildId: snowflakeSchema,
  channelId: snowflakeSchema,
});

export const createWebhookInputSchema = z.object({
  guildId: snowflakeSchema,
  channelId: snowflakeSchema,
  name: webhookNameSchema,
  avatar: z.string().nullable().optional(),
});

export const updateWebhookInputSchema = z.object({
  guildId: snowflakeSchema,
  webhookId: snowflakeSchema,
  name: webhookNameSchema.optional(),
  avatar: z.string().nullable().optional(),
  channelId: snowflakeSchema.optional(),
  reason: reasonSchema,
});

export const editWebhookInputSchema = updateWebhookInputSchema;

export const deleteWebhookInputSchema = z.object({
  guildId: snowflakeSchema,
  webhookId: snowflakeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});
