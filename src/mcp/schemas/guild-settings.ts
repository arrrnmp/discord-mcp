import { z } from 'zod';
import type {
  GuildDefaultMessageNotifications,
  GuildExplicitContentFilter,
  GuildVerificationLevel,
} from 'seyfert/lib/types/index.js';

import { confirmSchema, reasonSchema, snowflakeSchema } from './common.js';

const guildVerificationLevelSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).transform(
  (value) => value as GuildVerificationLevel,
);
const guildDefaultMessageNotificationsSchema = z.union([z.literal(0), z.literal(1)]).transform(
  (value) => value as GuildDefaultMessageNotifications,
);
const guildExplicitContentFilterSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]).transform(
  (value) => value as GuildExplicitContentFilter,
);
const afkTimeoutSecondsSchema = z.union([
  z.literal(60),
  z.literal(300),
  z.literal(900),
  z.literal(1800),
  z.literal(3600),
]);
const guildTemplateCodeSchema = z.string().min(1).max(200);
const localeSchema = z.string().min(2).max(20);
const dataUrlImageSchema = z
  .string()
  .regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/, 'Must be a base64 data URL');

const guildSettingsPatchSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    icon: dataUrlImageSchema.nullable().optional(),
    description: z.string().max(120).nullable().optional(),
    preferredLocale: localeSchema.nullable().optional(),
    verificationLevel: guildVerificationLevelSchema.nullable().optional(),
    defaultMessageNotifications: guildDefaultMessageNotificationsSchema.nullable().optional(),
    explicitContentFilter: guildExplicitContentFilterSchema.nullable().optional(),
    afkChannelId: snowflakeSchema.nullable().optional(),
    afkTimeout: afkTimeoutSecondsSchema.optional(),
    systemChannelId: snowflakeSchema.nullable().optional(),
    systemChannelFlags: z.number().int().min(0).optional(),
    rulesChannelId: snowflakeSchema.nullable().optional(),
    publicUpdatesChannelId: snowflakeSchema.nullable().optional(),
    safetyAlertsChannelId: snowflakeSchema.nullable().optional(),
    premiumProgressBarEnabled: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one guild field must be provided for update',
    path: ['name'],
  });

const widgetSettingsPatchSchema = z
  .object({
    enabled: z.boolean().optional(),
    channelId: snowflakeSchema.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one widget field must be provided for update',
    path: ['enabled'],
  });

const pruneIncludeRoleIdsSchema = z.array(snowflakeSchema).max(1000);

export const getGuildSettingsInputSchema = z.object({
  guildId: snowflakeSchema,
  force: z.boolean().optional().default(true),
});

export const updateGuildSettingsInputSchema = z.object({
  guildId: snowflakeSchema,
  patch: guildSettingsPatchSchema,
  reason: reasonSchema,
});

export const getGuildWidgetSettingsInputSchema = z.object({
  guildId: snowflakeSchema,
});

export const updateGuildWidgetSettingsInputSchema = z.object({
  guildId: snowflakeSchema,
  patch: widgetSettingsPatchSchema,
  reason: reasonSchema,
});

export const getGuildVanityUrlInputSchema = z.object({
  guildId: snowflakeSchema,
});

export const getGuildPruneCountInputSchema = z.object({
  guildId: snowflakeSchema,
  days: z.number().int().min(1).optional().default(7),
  includeRoleIds: pruneIncludeRoleIdsSchema.optional(),
});

export const beginGuildPruneInputSchema = z.object({
  guildId: snowflakeSchema,
  days: z.number().int().min(1).optional(),
  computePruneCount: z.boolean().optional(),
  includeRoleIds: pruneIncludeRoleIdsSchema.optional(),
  reason: reasonSchema,
  confirm: confirmSchema,
});

export const listGuildIntegrationsInputSchema = z.object({
  guildId: snowflakeSchema,
});

export const getGuildWelcomeScreenInputSchema = z.object({
  guildId: snowflakeSchema,
});

export const updateGuildWelcomeScreenInputSchema = z
  .object({
    guildId: snowflakeSchema,
    enabled: z.boolean().nullable().optional(),
    description: z.string().max(140).nullable().optional(),
    welcomeChannels: z
      .array(
        z.object({
          channelId: snowflakeSchema,
          description: z.string().min(1).max(140),
          emojiId: snowflakeSchema.nullable().optional(),
          emojiName: z.string().min(1).max(100).nullable().optional(),
        }),
      )
      .max(5)
      .optional(),
    reason: reasonSchema,
  })
  .refine(
    (value) => value.enabled !== undefined || value.description !== undefined || value.welcomeChannels !== undefined,
    {
      message: 'At least one welcome screen field must be provided for update',
      path: ['enabled'],
    },
  );

export const listGuildTemplatesInputSchema = z.object({
  guildId: snowflakeSchema,
});

export const createGuildTemplateInputSchema = z.object({
  guildId: snowflakeSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(120).nullable().optional(),
  reason: reasonSchema,
});

export const syncGuildTemplateInputSchema = z.object({
  guildId: snowflakeSchema,
  templateCode: guildTemplateCodeSchema,
  reason: reasonSchema,
});

export const updateGuildTemplateInputSchema = z
  .object({
    guildId: snowflakeSchema,
    templateCode: guildTemplateCodeSchema,
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(120).nullable().optional(),
    reason: reasonSchema,
  })
  .refine((value) => value.name !== undefined || value.description !== undefined, {
    message: 'At least one of name or description must be provided',
    path: ['name'],
  });

export const deleteGuildTemplateInputSchema = z.object({
  guildId: snowflakeSchema,
  templateCode: guildTemplateCodeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});
