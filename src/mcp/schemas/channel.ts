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

const overwriteTypeSchema = z.union([z.literal(0), z.literal(1)]);
const permissionBitfieldSchema = z.union([z.string().regex(/^\d+$/), z.number().int().nonnegative()]).transform((value) =>
  value.toString(),
);

export const listChannelPermissionOverwritesInputSchema = z.object({
  guildId: snowflakeSchema,
  channelId: snowflakeSchema,
});

export const setChannelPermissionOverwriteInputSchema = z.object({
  guildId: snowflakeSchema,
  channelId: snowflakeSchema,
  overwriteId: snowflakeSchema,
  type: overwriteTypeSchema,
  allow: permissionBitfieldSchema.optional(),
  deny: permissionBitfieldSchema.optional(),
  reason: reasonSchema,
}).refine((value) => value.allow !== undefined || value.deny !== undefined, {
  path: ['allow'],
  message: 'At least one of allow or deny must be provided',
});

export const deleteChannelPermissionOverwriteInputSchema = z.object({
  guildId: snowflakeSchema,
  channelId: snowflakeSchema,
  overwriteId: snowflakeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});
