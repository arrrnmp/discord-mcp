import { z } from 'zod';

import { snowflakeSchema } from './common.js';

export const getRoleMemberCountsInputSchema = z.object({
  guildId: snowflakeSchema,
});

export const getInviteTargetUsersInputSchema = z.object({
  inviteCode: z.string().min(1).max(200),
});

export const updateInviteTargetUsersInputSchema = z.object({
  inviteCode: z.string().min(1).max(200),
  targetUserIds: z.array(snowflakeSchema).min(1).max(10000),
});

export const getInviteTargetUserJobStatusInputSchema = z.object({
  inviteCode: z.string().min(1).max(200),
});
