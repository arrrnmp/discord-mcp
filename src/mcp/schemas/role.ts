import { z } from 'zod';
import { confirmSchema, hexColorSchema, reasonSchema, snowflakeSchema } from './common.js';

const permissionsSchema = z.array(z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)])).optional();

export const createRoleInputSchema = z.object({
  guildId: snowflakeSchema,
  name: z.string().min(1).max(100),
  color: hexColorSchema.optional(),
  permissions: permissionsSchema,
  hoist: z.boolean().optional(),
  mentionable: z.boolean().optional(),
  reason: reasonSchema,
});

export const updateRoleInputSchema = z.object({
  guildId: snowflakeSchema,
  roleId: snowflakeSchema,
  name: z.string().min(1).max(100).optional(),
  color: hexColorSchema.optional(),
  permissions: permissionsSchema,
  hoist: z.boolean().optional(),
  mentionable: z.boolean().optional(),
  position: z.number().int().optional(),
  reason: reasonSchema,
});

export const deleteRoleInputSchema = z.object({
  guildId: snowflakeSchema,
  roleId: snowflakeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});
