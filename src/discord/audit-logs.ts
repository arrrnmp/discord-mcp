import type { AuditLogStructure } from 'seyfert/lib/client/transformers.js';
import type { RESTGetAPIGuildAuditLogQuery } from 'seyfert/lib/types/index.js';

import { DiscordBaseService } from './base.js';

export type DiscordAuditLogSummary = {
  guildId: string;
  entries: Array<{
    id: string;
    userId: string | null;
    targetId: string | null;
    actionType: number;
    reason?: string;
    changes?: Array<{
      key: string;
      oldValue?: any;
      newValue?: any;
    }>;
    options?: any;
    changeCount?: number;
  }>;
  users: Array<{
    id: string;
    username: string;
    globalName: string | null;
  }>;
  webhooks: Array<{
    id: string;
    name: string;
    channelId: string | null;
  }>;
};

export type FetchAuditLogOptions = {
  userId?: string;
  actionType?: number;
  before?: string;
  after?: string;
  limit?: number;
};

export class DiscordAuditLogsService extends DiscordBaseService {
  async fetchAuditLogs(guildId: string, options?: FetchAuditLogOptions): Promise<DiscordAuditLogSummary> {
    this.assertGuildAllowed(guildId);

    const query: RESTGetAPIGuildAuditLogQuery = {};
    if (options?.userId) query.user_id = options.userId;
    if (options?.actionType !== undefined) query.action_type = options.actionType;
    if (options?.before) query.before = options.before;
    if (options?.after) query.after = options.after;
    if (options?.limit) query.limit = options.limit;

    const auditLog = await this.client.guilds.auditLogs.fetch(guildId, query);
    return this.toAuditLogSummary(auditLog, guildId);
  }

  private toAuditLogSummary(log: AuditLogStructure, guildId: string): DiscordAuditLogSummary {
    return {
      guildId,
      entries: log.entries.map((entry) => {
        const changes = entry.changes?.map((c: any) => ({
          key: c.key,
          oldValue: c.old_value,
          newValue: c.new_value,
        }));

        const result: any = {
          id: entry.id,
          userId: entry.userId,
          targetId: entry.targetId,
          actionType: entry.actionType,
          reason: entry.reason,
          options: entry.options,
        };

        if (changes) {
          result.changes = changes;
          result.changeCount = changes.length;
        }

        return result;
      }),
      users: log.users.map((user) => ({
        id: entryUserId(user),
        username: (user as any).username,
        globalName: (user as any).globalName,
        bot: (user as any).bot,
      })),
      webhooks: log.webhooks.map((webhook) => ({
        id: webhook.id,
        name: webhook.name ?? '',
        channelId: webhook.channelId,
      })),
    };
  }
}

function entryUserId(user: any): string {
  return typeof user === 'string' ? user : user.id;
}
