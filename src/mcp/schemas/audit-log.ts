import { z } from 'zod';
import type { AuditLogEvent } from 'seyfert/lib/types/index.js';

import { snowflakeSchema } from './common.js';

const auditLogEventSchema = z.number().int().min(1).max(191).transform((value) => value as AuditLogEvent);

export const listGuildAuditLogsInputSchema = z.object({
  guildId: snowflakeSchema,
  userId: snowflakeSchema.optional(),
  actionType: auditLogEventSchema.optional(),
  before: snowflakeSchema.optional(),
  after: snowflakeSchema.optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
});
