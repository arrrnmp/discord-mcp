import { z } from 'zod';
import type {
  AutoModerationActionType,
  AutoModerationRuleEventType,
  AutoModerationRuleKeywordPresetType,
  AutoModerationRuleTriggerType,
  InviteTargetType,
} from 'seyfert/lib/types/index.js';

import { confirmSchema, reasonSchema, snowflakeSchema } from './common.js';

const inviteMaxAgeSchema = z.number().int().min(0).max(604_800);
const inviteMaxUsesSchema = z.number().int().min(0).max(100);
const inviteTargetTypeSchema = z.union([z.literal(1), z.literal(2)]).transform((value) => value as InviteTargetType);

const automodEventTypeSchema = z.union([z.literal(1), z.literal(2)]).transform((value) => value as AutoModerationRuleEventType);
const automodTriggerTypeSchema = z
  .union([z.literal(1), z.literal(3), z.literal(4), z.literal(5), z.literal(6)])
  .transform((value) => value as AutoModerationRuleTriggerType);
const automodActionTypeSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).transform((value) => value as AutoModerationActionType);
const automodPresetSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]).transform((value) => value as AutoModerationRuleKeywordPresetType);

const automodActionSchema = z.object({
  type: automodActionTypeSchema,
  channelId: snowflakeSchema.optional(),
  durationSeconds: z.number().int().min(1).max(2_419_200).optional(),
  customMessage: z.string().min(1).max(150).optional(),
});

const automodTriggerMetadataSchema = z
  .object({
    keywordFilter: z.array(z.string().min(1).max(60)).max(1000).optional(),
    presets: z.array(automodPresetSchema).min(1).max(3).optional(),
    allowList: z.array(z.string().min(1).max(60)).max(1000).optional(),
    regexPatterns: z.array(z.string().min(1).max(260)).max(10).optional(),
    mentionTotalLimit: z.number().int().min(1).max(50).optional(),
    mentionRaidProtectionEnabled: z.boolean().optional(),
  })
  .optional();

const emojiNameSchema = z.string().min(2).max(32);
const dataUrlImageSchema = z
  .string()
  .regex(/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/, 'Must be a base64 data URL');
const dataUrlAudioSchema = z
  .string()
  .regex(/^data:audio\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/, 'Must be a base64 audio data URL');

const stickerFileSchema = z.object({
  filename: z.string().min(1).max(128),
  dataBase64: z.string().min(1),
  contentType: z.string().min(1).max(120).optional(),
});

export const listGuildInvitesInputSchema = z.object({
  guildId: snowflakeSchema,
});

export const createChannelInviteInputSchema = z.object({
  channelId: snowflakeSchema,
  maxAge: inviteMaxAgeSchema.optional(),
  maxUses: inviteMaxUsesSchema.optional(),
  temporary: z.boolean().optional(),
  unique: z.boolean().optional(),
  targetType: inviteTargetTypeSchema.optional(),
  targetUserId: snowflakeSchema.optional(),
  targetApplicationId: snowflakeSchema.optional(),
  reason: reasonSchema,
}).superRefine((value, ctx) => {
  if (value.targetType === undefined) {
    if (value.targetUserId !== undefined || value.targetApplicationId !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'targetUserId/targetApplicationId require targetType',
        path: ['targetType'],
      });
    }
    return;
  }

  if (value.targetType === 1) {
    if (value.targetUserId === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'targetType=1 requires targetUserId',
        path: ['targetUserId'],
      });
    }
    if (value.targetApplicationId !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'targetApplicationId is invalid when targetType=1',
        path: ['targetApplicationId'],
      });
    }
    return;
  }

  if (value.targetApplicationId === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'targetType=2 requires targetApplicationId',
      path: ['targetApplicationId'],
    });
  }
  if (value.targetUserId !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'targetUserId is invalid when targetType=2',
      path: ['targetUserId'],
    });
  }
});

export const deleteInviteInputSchema = z.object({
  code: z.string().min(2).max(200),
  reason: reasonSchema,
  confirm: confirmSchema,
});

export const listAutoModerationRulesInputSchema = z.object({
  guildId: snowflakeSchema,
});

export const createAutoModerationRuleInputSchema = z.object({
  guildId: snowflakeSchema,
  name: z.string().min(1).max(100),
  eventType: automodEventTypeSchema,
  triggerType: automodTriggerTypeSchema,
  triggerMetadata: automodTriggerMetadataSchema,
  actions: z.array(automodActionSchema).min(1).max(20),
  enabled: z.boolean().optional(),
  exemptRoleIds: z.array(snowflakeSchema).max(20).optional(),
  exemptChannelIds: z.array(snowflakeSchema).max(50).optional(),
});

export const updateAutoModerationRuleInputSchema = z.object({
  guildId: snowflakeSchema,
  ruleId: snowflakeSchema,
  name: z.string().min(1).max(100).optional(),
  eventType: automodEventTypeSchema.optional(),
  triggerMetadata: automodTriggerMetadataSchema,
  actions: z.array(automodActionSchema).min(1).max(20).optional(),
  enabled: z.boolean().optional(),
  exemptRoleIds: z.array(snowflakeSchema).max(20).optional(),
  exemptChannelIds: z.array(snowflakeSchema).max(50).optional(),
  reason: reasonSchema,
});

export const deleteAutoModerationRuleInputSchema = z.object({
  guildId: snowflakeSchema,
  ruleId: snowflakeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});

export const listGuildEmojisInputSchema = z.object({
  guildId: snowflakeSchema,
  force: z.boolean().optional().default(true),
});

export const createGuildEmojiInputSchema = z.object({
  guildId: snowflakeSchema,
  name: emojiNameSchema,
  image: dataUrlImageSchema,
  roleIds: z.array(snowflakeSchema).max(250).optional(),
  reason: reasonSchema,
});

export const updateGuildEmojiInputSchema = z.object({
  guildId: snowflakeSchema,
  emojiId: snowflakeSchema,
  name: emojiNameSchema.optional(),
  roleIds: z.array(snowflakeSchema).max(250).nullable().optional(),
  reason: reasonSchema,
});

export const deleteGuildEmojiInputSchema = z.object({
  guildId: snowflakeSchema,
  emojiId: snowflakeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});

export const listGuildStickersInputSchema = z.object({
  guildId: snowflakeSchema,
});

export const createGuildStickerInputSchema = z.object({
  guildId: snowflakeSchema,
  name: z.string().min(2).max(30),
  description: z.string().max(100),
  tags: z.string().min(2).max(200),
  file: stickerFileSchema,
  reason: reasonSchema,
});

export const updateGuildStickerInputSchema = z.object({
  guildId: snowflakeSchema,
  stickerId: snowflakeSchema,
  name: z.string().min(2).max(30).optional(),
  description: z.string().min(2).max(100).nullable().optional(),
  tags: z.string().min(2).max(200).optional(),
  reason: reasonSchema,
});

export const deleteGuildStickerInputSchema = z.object({
  guildId: snowflakeSchema,
  stickerId: snowflakeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});

export const listGuildSoundboardSoundsInputSchema = z.object({
  guildId: snowflakeSchema,
});

export const createGuildSoundboardSoundInputSchema = z
  .object({
    guildId: snowflakeSchema,
    name: z.string().min(2).max(32),
    sound: dataUrlAudioSchema,
    volume: z.number().min(0).max(1).nullable().optional(),
    emojiId: snowflakeSchema.nullable().optional(),
    emojiName: z.string().min(1).max(100).nullable().optional(),
    reason: reasonSchema,
  })
  .superRefine((value, ctx) => {
    if (value.emojiId !== undefined && value.emojiName !== undefined && value.emojiId !== null && value.emojiName !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either emojiId or emojiName, not both',
        path: ['emojiId'],
      });
    }
  });

export const updateGuildSoundboardSoundInputSchema = z
  .object({
    guildId: snowflakeSchema,
    soundId: snowflakeSchema,
    name: z.string().min(2).max(32).optional(),
    volume: z.number().min(0).max(1).nullable().optional(),
    emojiId: snowflakeSchema.nullable().optional(),
    emojiName: z.string().min(1).max(100).nullable().optional(),
    reason: reasonSchema,
  })
  .refine(
    (value) => value.name !== undefined || value.volume !== undefined || value.emojiId !== undefined || value.emojiName !== undefined,
    {
      path: ['name'],
      message: 'At least one of name, volume, emojiId, or emojiName must be provided',
    },
  )
  .superRefine((value, ctx) => {
    if (value.emojiId !== undefined && value.emojiName !== undefined && value.emojiId !== null && value.emojiName !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either emojiId or emojiName, not both',
        path: ['emojiId'],
      });
    }
  });

export const deleteGuildSoundboardSoundInputSchema = z.object({
  guildId: snowflakeSchema,
  soundId: snowflakeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});

// Application emojis (application-level, not guild-level)
export const listApplicationEmojisInputSchema = z.object({});

export const createApplicationEmojiInputSchema = z.object({
  name: emojiNameSchema,
  image: dataUrlImageSchema,
});

export const updateApplicationEmojiInputSchema = z.object({
  emojiId: snowflakeSchema,
  name: emojiNameSchema,
});

export const deleteApplicationEmojiInputSchema = z.object({
  emojiId: snowflakeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});
