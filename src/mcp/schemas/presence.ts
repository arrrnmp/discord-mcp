import { z } from 'zod';
import { PresenceUpdateStatus } from 'seyfert/lib/types/payloads/gateway.js';

import { confirmSchema } from './common.js';

const presenceStatusSchema = z.nativeEnum(PresenceUpdateStatus);

const activityTypeSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

export const getPresenceStateInputSchema = z.object({});

export const setPresenceInputSchema = z.object({
  status: presenceStatusSchema,
  activityName: z.string().min(1).max(128).optional(),
  activityType: activityTypeSchema.optional().default(0),
  activityState: z.string().min(1).max(128).optional(),
  activityUrl: z.string().url().optional(),
  afk: z.boolean().optional().default(false),
  confirm: confirmSchema,
});
