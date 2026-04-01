import { z } from 'zod';

import { confirmSchema, reasonSchema, snowflakeSchema } from './common.js';

const threadNameSchema = z.string().min(1).max(100);
const threadAutoArchiveDurationSchema = z.union([
  z.literal(60),
  z.literal(1440),
  z.literal(4320),
  z.literal(10080),
]);
const threadTypeSchema = z.union([z.literal(10), z.literal(11), z.literal(12)]);

export const createThreadInputSchema = z.object({
  guildId: snowflakeSchema,
  channelId: snowflakeSchema,
  name: threadNameSchema,
  autoArchiveDuration: threadAutoArchiveDurationSchema.optional(),
  rateLimitPerUser: z.number().int().min(0).max(21600).optional(),
  type: threadTypeSchema.optional(),
  invitable: z.boolean().optional(),
  reason: reasonSchema,
});

export const updateThreadInputSchema = z.object({
  guildId: snowflakeSchema,
  threadId: snowflakeSchema,
  name: threadNameSchema.optional(),
  archived: z.boolean().optional(),
  autoArchiveDuration: threadAutoArchiveDurationSchema.optional(),
  locked: z.boolean().optional(),
  invitable: z.boolean().optional(),
  rateLimitPerUser: z.number().int().min(0).max(21600).nullable().optional(),
  appliedTags: z.array(snowflakeSchema).max(5).optional(),
  reason: reasonSchema,
});

export const editThreadInputSchema = updateThreadInputSchema;

export const joinThreadInputSchema = z.object({
  guildId: snowflakeSchema,
  threadId: snowflakeSchema,
});

export const leaveThreadInputSchema = z.object({
  guildId: snowflakeSchema,
  threadId: snowflakeSchema,
});

export const lockThreadInputSchema = z.object({
  guildId: snowflakeSchema,
  threadId: snowflakeSchema,
  locked: z.boolean().optional().default(true),
  reason: reasonSchema,
  confirm: confirmSchema,
});

export const unlockThreadInputSchema = z.object({
  guildId: snowflakeSchema,
  threadId: snowflakeSchema,
  reason: reasonSchema,
});

export const removeThreadMemberInputSchema = z.object({
  guildId: snowflakeSchema,
  threadId: snowflakeSchema,
  memberId: snowflakeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});

export const deleteThreadInputSchema = z.object({
  guildId: snowflakeSchema,
  threadId: snowflakeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});
