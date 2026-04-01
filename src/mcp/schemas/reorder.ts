import { z } from 'zod';

import { confirmSchema, reasonSchema, snowflakeSchema } from './common.js';

export const modifyGuildChannelPositionsInputSchema = z.object({
  guildId: snowflakeSchema,
  positions: z
    .array(
      z.object({
        id: snowflakeSchema,
        position: z.number().int().min(0).nullable(),
        lockPermissions: z.boolean().optional(),
        parentId: snowflakeSchema.nullable().optional(),
      }),
    )
    .min(1)
    .max(50),
  reason: reasonSchema,
  confirm: confirmSchema,
});

export const modifyGuildRolePositionsInputSchema = z.object({
  guildId: snowflakeSchema,
  positions: z
    .array(
      z.object({
        id: snowflakeSchema,
        position: z.number().int().min(0).nullable(),
      }),
    )
    .min(1)
    .max(250),
  reason: reasonSchema,
  confirm: confirmSchema,
});
