import { z } from 'zod';
import {
  GuildScheduledEventEntityType,
  GuildScheduledEventPrivacyLevel,
  GuildScheduledEventStatus,
} from 'seyfert/lib/types/payloads/guildScheduledEvent.js';

import { confirmSchema, reasonSchema, snowflakeSchema } from './common.js';

const scheduledEventNameSchema = z.string().min(1).max(100);
const scheduledEventDescriptionSchema = z.string().max(1000);
const isoDateTimeSchema = z.string().datetime();

const scheduledEventEntityTypeSchema = z.nativeEnum(GuildScheduledEventEntityType);
const scheduledEventPrivacyLevelSchema = z.nativeEnum(GuildScheduledEventPrivacyLevel);
const scheduledEventStatusSchema = z.nativeEnum(GuildScheduledEventStatus);

export const listScheduledEventsInputSchema = z.object({
  guildId: snowflakeSchema,
  withUserCount: z.boolean().optional(),
});

export const fetchScheduledEventInputSchema = z.object({
  guildId: snowflakeSchema,
  eventId: snowflakeSchema,
  withUserCount: z.boolean().optional(),
});

export const createScheduledEventInputSchema = z
  .object({
    guildId: snowflakeSchema,
    name: scheduledEventNameSchema,
    privacyLevel: scheduledEventPrivacyLevelSchema,
    scheduledStartTime: isoDateTimeSchema,
    channelId: snowflakeSchema.nullable().optional(),
    scheduledEndTime: isoDateTimeSchema.optional(),
    description: scheduledEventDescriptionSchema.optional(),
    entityType: scheduledEventEntityTypeSchema,
    entityMetadata: z
      .object({
        location: z.string().min(1).max(100),
      })
      .optional(),
    image: z.string().nullable().optional(),
    reason: reasonSchema,
  })
  .superRefine((value, ctx) => {
    if (value.entityType === GuildScheduledEventEntityType.External) {
      if (value.channelId !== null && value.channelId !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'channelId must be null or omitted when entityType is External',
          path: ['channelId'],
        });
      }

      if (value.entityMetadata?.location === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'entityMetadata.location is required when entityType is External',
          path: ['entityMetadata', 'location'],
        });
      }

      if (value.scheduledEndTime === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'scheduledEndTime is required when entityType is External',
          path: ['scheduledEndTime'],
        });
      }

      return;
    }

    if (value.channelId === undefined || value.channelId === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'channelId is required for Stage/Voice scheduled events',
        path: ['channelId'],
      });
    }

    if (value.entityMetadata !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'entityMetadata is only valid for External scheduled events',
        path: ['entityMetadata'],
      });
    }
  });

export const updateScheduledEventInputSchema = z
  .object({
    guildId: snowflakeSchema,
    eventId: snowflakeSchema,
    channelId: snowflakeSchema.nullable().optional(),
    name: scheduledEventNameSchema.optional(),
    privacyLevel: scheduledEventPrivacyLevelSchema.optional(),
    scheduledStartTime: isoDateTimeSchema.optional(),
    scheduledEndTime: isoDateTimeSchema.nullable().optional(),
    description: scheduledEventDescriptionSchema.nullable().optional(),
    entityType: scheduledEventEntityTypeSchema.optional(),
    status: scheduledEventStatusSchema.optional(),
    entityMetadata: z
      .object({
        location: z.string().min(1).max(100),
      })
      .optional(),
    image: z.string().nullable().optional(),
    reason: reasonSchema,
  })
  .refine(
    (value) =>
      value.channelId !== undefined ||
      value.name !== undefined ||
      value.privacyLevel !== undefined ||
      value.scheduledStartTime !== undefined ||
      value.scheduledEndTime !== undefined ||
      value.description !== undefined ||
      value.entityType !== undefined ||
      value.status !== undefined ||
      value.entityMetadata !== undefined ||
      value.image !== undefined,
    {
      path: ['name'],
      message: 'At least one mutable field must be provided',
    },
  )
  .superRefine((value, ctx) => {
    if (value.entityType === GuildScheduledEventEntityType.External) {
      if (value.channelId !== null && value.channelId !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'channelId must be null or omitted when entityType is External',
          path: ['channelId'],
        });
      }

      if (value.entityMetadata?.location === undefined && value.entityMetadata !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'entityMetadata.location is required when entityMetadata is provided',
          path: ['entityMetadata', 'location'],
        });
      }
    } else if (value.entityMetadata !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'entityMetadata is only valid for External scheduled events',
        path: ['entityMetadata'],
      });
    }
  });

export const deleteScheduledEventInputSchema = z.object({
  guildId: snowflakeSchema,
  eventId: snowflakeSchema,
  reason: reasonSchema,
  confirm: confirmSchema,
});

export const listScheduledEventUsersInputSchema = z.object({
  guildId: snowflakeSchema,
  eventId: snowflakeSchema,
  limit: z.number().int().min(1).max(100).optional(),
  withMember: z.boolean().optional(),
  before: snowflakeSchema.optional(),
  after: snowflakeSchema.optional(),
});
