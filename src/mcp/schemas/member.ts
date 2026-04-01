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
