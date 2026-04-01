import { z } from 'zod';

import { confirmSchema, reasonSchema, snowflakeSchema } from './common.js';

const webhookNameSchema = z.string().min(1).max(80);
const webhookEmbedSchema = z
  .object({
    title: z.string().min(1).max(256).optional(),
    description: z.string().min(1).max(4096).optional(),
    url: z.string().url().optional(),
    timestamp: z.string().datetime().optional(),
    color: z.number().int().min(0).max(0xffffff).optional(),
  })
  .passthrough();

const webhookComponentSchema = z
  .object({
    type: z.number().int().min(1),
  })
  .passthrough();

const webhookEmbedsSchema = z.array(webhookEmbedSchema).max(10);
const webhookComponentsSchema = z.array(webhookComponentSchema).max(25);

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

export const executeWebhookByTokenInputSchema = z
  .object({
    guildId: snowflakeSchema,
    webhookId: snowflakeSchema,
    token: z.string().min(1).max(255),
    content: z.string().min(1).max(2000).optional(),
    username: z.string().min(1).max(80).optional(),
    avatarUrl: z.string().url().optional(),
    tts: z.boolean().optional(),
    threadId: snowflakeSchema.optional(),
    wait: z.boolean().optional().default(false),
    suppressEmbeds: z.boolean().optional(),
    allowedMentionUserIds: z.array(snowflakeSchema).max(100).optional(),
    allowedMentionRoleIds: z.array(snowflakeSchema).max(100).optional(),
    allowedMentionEveryone: z.boolean().optional(),
    embeds: webhookEmbedsSchema.optional(),
    components: webhookComponentsSchema.optional(),
    poll: z.unknown().optional(),
  })
  .refine(
    (value) =>
      value.allowedMentionUserIds === undefined ||
      value.allowedMentionUserIds.length === 0 ||
      value.allowedMentionEveryone !== true,
    {
      path: ['allowedMentionEveryone'],
      message: 'allowedMentionEveryone should not be combined with explicit allowedMentionUserIds',
    },
  )
  .refine(
    (value) =>
      value.content !== undefined ||
      value.embeds !== undefined ||
      value.components !== undefined ||
      value.poll !== undefined,
    {
      path: ['content'],
      message: 'At least one of content, embeds, components, or poll must be provided',
    },
  );

export const fetchWebhookMessageByTokenInputSchema = z.object({
  guildId: snowflakeSchema,
  webhookId: snowflakeSchema,
  token: z.string().min(1).max(255),
  messageId: snowflakeSchema,
  threadId: snowflakeSchema.optional(),
});

export const editWebhookMessageByTokenInputSchema = z
  .object({
    guildId: snowflakeSchema,
    webhookId: snowflakeSchema,
    token: z.string().min(1).max(255),
    messageId: snowflakeSchema,
    content: z.string().min(1).max(2000).optional(),
    embeds: webhookEmbedsSchema.optional(),
    components: webhookComponentsSchema.optional(),
    threadId: snowflakeSchema.optional(),
  })
  .refine(
    (value) =>
      value.content !== undefined ||
      value.embeds !== undefined ||
      value.components !== undefined,
    {
      path: ['content'],
      message: 'At least one editable field must be provided',
    },
  );

export const deleteWebhookMessageByTokenInputSchema = z.object({
  guildId: snowflakeSchema,
  webhookId: snowflakeSchema,
  token: z.string().min(1).max(255),
  messageId: snowflakeSchema,
  threadId: snowflakeSchema.optional(),
  confirm: confirmSchema,
});
