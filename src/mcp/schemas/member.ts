import { z } from 'zod';

import { confirmSchema, reasonSchema, snowflakeSchema } from './common.js';

const memberTimeoutSecondsSchema = z.number().int().positive().max(2_419_200).nullable();

export const listMembersInputSchema = z.object({
  guildId: snowflakeSchema,
  limit: z.number().int().min(1).max(1000).optional(),
  after: snowflakeSchema.optional(),
  force: z.boolean().optional().default(true),
});

export const fetchMemberInputSchema = z.object({
  guildId: snowflakeSchema,
  memberId: snowflakeSchema,
  force: z.boolean().optional().default(true),
});

export const editMemberBasicsInputSchema = z
  .object({
    guildId: snowflakeSchema,
    memberId: snowflakeSchema,
    nickname: z.string().min(1).max(32).nullable().optional(),
    timeoutSeconds: memberTimeoutSecondsSchema.optional(),
    reason: reasonSchema,
  })
  .refine((value) => value.nickname !== undefined || value.timeoutSeconds !== undefined, {
    message: 'At least one of nickname or timeoutSeconds must be provided',
    path: ['nickname'],
  });

export const kickMemberInputSchema = z.object({
  guildId: snowflakeSchema,
  memberId: snowflakeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});

export const searchMembersInputSchema = z.object({
  guildId: snowflakeSchema,
  query: z.string().min(1).max(32),
  limit: z.number().int().min(1).max(1000).optional().default(25),
});

export const setMemberTimeoutInputSchema = z.object({
  guildId: snowflakeSchema,
  memberId: snowflakeSchema,
  timeoutSeconds: memberTimeoutSecondsSchema,
  reason: reasonSchema,
});

export const listGuildBansInputSchema = z.object({
  guildId: snowflakeSchema,
  limit: z.number().int().min(1).max(1000).optional(),
  before: snowflakeSchema.optional(),
  after: snowflakeSchema.optional(),
  force: z.boolean().optional().default(true),
});

export const fetchGuildBanInputSchema = z.object({
  guildId: snowflakeSchema,
  userId: snowflakeSchema,
  force: z.boolean().optional().default(true),
});

export const banMemberInputSchema = z.object({
  guildId: snowflakeSchema,
  memberId: snowflakeSchema,
  deleteMessageSeconds: z.number().int().min(0).max(604800).optional(),
  reason: reasonSchema,
  confirm: confirmSchema,
});

export const bulkBanMembersInputSchema = z.object({
  guildId: snowflakeSchema,
  userIds: z.array(snowflakeSchema).min(1).max(200),
  deleteMessageSeconds: z.number().int().min(0).max(604800).optional(),
  reason: reasonSchema,
  confirm: confirmSchema,
});

export const unbanMemberInputSchema = z.object({
  guildId: snowflakeSchema,
  memberId: snowflakeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});

export const addMemberRoleInputSchema = z.object({
  guildId: snowflakeSchema,
  memberId: snowflakeSchema,
  roleId: snowflakeSchema,
  reason: reasonSchema,
});

export const removeMemberRoleInputSchema = z.object({
  guildId: snowflakeSchema,
  memberId: snowflakeSchema,
  roleId: snowflakeSchema,
  reason: reasonSchema,
});

export const setCurrentMemberVoiceStateInputSchema = z
  .object({
    guildId: snowflakeSchema,
    channelId: snowflakeSchema.optional(),
    suppress: z.boolean().optional(),
    requestToSpeakTimestamp: z.string().datetime().nullable().optional(),
    reason: reasonSchema,
  })
  .refine(
    (value) =>
      value.channelId !== undefined ||
      value.suppress !== undefined ||
      value.requestToSpeakTimestamp !== undefined,
    {
      path: ['channelId'],
      message: 'At least one of channelId, suppress, or requestToSpeakTimestamp must be provided',
    },
  );

export const setMemberVoiceStateInputSchema = z.object({
  guildId: snowflakeSchema,
  memberId: snowflakeSchema,
  channelId: snowflakeSchema,
  suppress: z.boolean().optional(),
  reason: reasonSchema,
});
