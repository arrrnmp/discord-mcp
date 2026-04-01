import { z } from 'zod';

import { confirmSchema, reasonSchema, snowflakeSchema } from './common.js';

const messageLimitSchema = z.number().int().min(1).max(100);
const pinListLimitSchema = z.number().int().min(1).max(50);
const reactionTypeSchema = z.union([z.literal(0), z.literal(1)]);
const messageEmbedLimitSchema = z.number().int().min(1).max(10);
const reactionUserLimitSchema = z.number().int().min(1).max(100);
const pollDurationHoursSchema = z.number().int().min(1).max(768);
const pollLayoutTypeSchema = z.union([z.literal(1)]);
const pollAnswerIdSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
  z.literal(9),
  z.literal(10),
]);

const messageEmbedFieldSchema = z.object({
  name: z.string().min(1).max(256),
  value: z.string().min(1).max(1024),
  inline: z.boolean().optional(),
});

const messageEmbedSchema = z
  .object({
    title: z.string().min(1).max(256).optional(),
    description: z.string().min(1).max(4096).optional(),
    url: z.string().url().optional(),
    timestamp: z.string().datetime().optional(),
    color: z.number().int().min(0).max(0xffffff).optional(),
    footer: z
      .object({
        text: z.string().min(1).max(2048),
        icon_url: z.string().url().optional(),
      })
      .optional(),
    image: z
      .object({
        url: z.string().url(),
      })
      .optional(),
    thumbnail: z
      .object({
        url: z.string().url(),
      })
      .optional(),
    author: z
      .object({
        name: z.string().min(1).max(256),
        url: z.string().url().optional(),
        icon_url: z.string().url().optional(),
      })
      .optional(),
    fields: z.array(messageEmbedFieldSchema).max(25).optional(),
  })
  .passthrough();

const messageEmbedsSchema = z.array(messageEmbedSchema).max(messageEmbedLimitSchema.parse(10));

const messageComponentSchema = z
  .object({
    type: z.number().int().min(1),
  })
  .passthrough();

const messageComponentsSchema = z.array(messageComponentSchema).max(25);

const pollEmojiSchema = z
  .object({
    id: snowflakeSchema.optional(),
    name: z.string().min(1).max(100).optional(),
    animated: z.boolean().optional(),
  })
  .refine((value) => value.id !== undefined || value.name !== undefined, {
    path: ['id'],
    message: 'Poll emoji must include id or name',
  });

const pollQuestionMediaSchema = z
  .object({
    text: z.string().min(1).max(300).optional(),
    emoji: pollEmojiSchema.optional(),
  })
  .refine((value) => value.text !== undefined || value.emoji !== undefined, {
    path: ['text'],
    message: 'Poll question must include text or emoji',
  });

const pollAnswerMediaSchema = z
  .object({
    text: z.string().min(1).max(55).optional(),
    emoji: pollEmojiSchema.optional(),
  })
  .refine((value) => value.text !== undefined || value.emoji !== undefined, {
    path: ['text'],
    message: 'Poll answer must include text or emoji',
  });

const pollAnswerSchema = z.object({
  poll_media: pollAnswerMediaSchema,
});

const pollCreateSchema = z.object({
  question: pollQuestionMediaSchema,
  answers: z.array(pollAnswerSchema).min(2).max(10),
  duration: pollDurationHoursSchema.optional(),
  allow_multiselect: z.boolean().optional(),
  layout_type: pollLayoutTypeSchema.optional(),
});

export const listChannelMessagesInputSchema = z.object({
  channelId: snowflakeSchema,
  limit: messageLimitSchema.optional(),
  before: snowflakeSchema.optional(),
  after: snowflakeSchema.optional(),
  around: snowflakeSchema.optional(),
});

export const fetchMessageInputSchema = z.object({
  channelId: snowflakeSchema,
  messageId: snowflakeSchema,
  force: z.boolean().optional().default(true),
});

export const sendMessageInputSchema = z
  .object({
    channelId: snowflakeSchema,
    content: z.string().min(1).max(2000).optional(),
    tts: z.boolean().optional(),
    replyToMessageId: snowflakeSchema.optional(),
    replyFailIfNotExists: z.boolean().optional().default(true),
    suppressEmbeds: z.boolean().optional(),
    allowedMentionUserIds: z.array(snowflakeSchema).max(100).optional(),
    allowedMentionRoleIds: z.array(snowflakeSchema).max(100).optional(),
    allowedMentionEveryone: z.boolean().optional(),
    embeds: messageEmbedsSchema.optional(),
    components: messageComponentsSchema.optional(),
    poll: pollCreateSchema.optional(),
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

export const editMessageInputSchema = z
  .object({
    channelId: snowflakeSchema,
    messageId: snowflakeSchema,
    content: z.string().min(1).max(2000).optional(),
    suppressEmbeds: z.boolean().optional(),
    embeds: messageEmbedsSchema.nullable().optional(),
    components: messageComponentsSchema.nullable().optional(),
  })
  .refine(
    (value) =>
      value.content !== undefined ||
      value.suppressEmbeds !== undefined ||
      value.embeds !== undefined ||
      value.components !== undefined,
    {
      path: ['content'],
      message: 'At least one editable field must be provided',
    },
  );

export const deleteMessageInputSchema = z.object({
  channelId: snowflakeSchema,
  messageId: snowflakeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});

export const purgeMessagesInputSchema = z
  .object({
    channelId: snowflakeSchema,
    messageIds: z.array(snowflakeSchema).min(2).max(100).optional(),
    limit: messageLimitSchema.optional().default(20),
    reason: reasonSchema,
    confirm: confirmSchema,
  })
  .refine((value) => value.messageIds !== undefined || value.limit !== undefined, {
    path: ['messageIds'],
    message: 'Provide messageIds or limit for purge',
  });

export const listPinnedMessagesInputSchema = z.object({
  channelId: snowflakeSchema,
  limit: pinListLimitSchema.optional(),
  before: z.string().datetime().optional(),
});

export const pinMessageInputSchema = z.object({
  channelId: snowflakeSchema,
  messageId: snowflakeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});

export const unpinMessageInputSchema = z.object({
  channelId: snowflakeSchema,
  messageId: snowflakeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});

const reactionEmojiSchema = z.string().min(1).max(200);

export const crosspostMessageInputSchema = z.object({
  channelId: snowflakeSchema,
  messageId: snowflakeSchema,
  reason: reasonSchema,
});

export const addReactionInputSchema = z.object({
  channelId: snowflakeSchema,
  messageId: snowflakeSchema,
  emoji: reactionEmojiSchema,
});

export const removeOwnReactionInputSchema = z.object({
  channelId: snowflakeSchema,
  messageId: snowflakeSchema,
  emoji: reactionEmojiSchema,
});

export const removeUserReactionInputSchema = z.object({
  channelId: snowflakeSchema,
  messageId: snowflakeSchema,
  emoji: reactionEmojiSchema,
  userId: snowflakeSchema,
});

export const listReactionUsersInputSchema = z.object({
  channelId: snowflakeSchema,
  messageId: snowflakeSchema,
  emoji: reactionEmojiSchema,
  limit: reactionUserLimitSchema.optional(),
  after: snowflakeSchema.optional(),
  type: reactionTypeSchema.optional(),
});

export const clearReactionsInputSchema = z.object({
  channelId: snowflakeSchema,
  messageId: snowflakeSchema,
});

export const clearEmojiReactionsInputSchema = z.object({
  channelId: snowflakeSchema,
  messageId: snowflakeSchema,
  emoji: reactionEmojiSchema,
});

export const endPollInputSchema = z.object({
  channelId: snowflakeSchema,
  messageId: snowflakeSchema,
});

export const listPollAnswerVotersInputSchema = z.object({
  channelId: snowflakeSchema,
  messageId: snowflakeSchema,
  answerId: pollAnswerIdSchema,
  limit: reactionUserLimitSchema.optional(),
  after: snowflakeSchema.optional(),
});
