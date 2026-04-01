import { type HttpClient } from 'seyfert/lib/client/httpclient.js';

import type { AppConfig } from '../config/env.js';
import { ToolError } from '../lib/errors.js';
import { logger } from '../lib/logging.js';

export type MutationContext = {
  guildId: string;
  action: string;
  channelId?: string;
  messageId?: string;
  memberId?: string;
  roleId?: string;
  inviteCode?: string;
  ruleId?: string;
  emojiId?: string;
  stickerId?: string;
  soundId?: string;
  webhookId?: string;
  overwriteId?: string;
  userIdsCount?: number;
  deleteCount?: number;
  deleteMessageSeconds?: number;
  reason?: string;
  confirm?: boolean;
};

export abstract class DiscordBaseService {
  constructor(
    protected readonly client: HttpClient,
    protected readonly config: AppConfig,
  ) {}

  protected assertGuildAllowed(guildId: string): void {
    if (this.config.guildAllowlist.length === 0) {
      return;
    }

    if (!this.config.guildAllowlist.includes(guildId)) {
      throw new ToolError('UNAUTHORIZED_GUILD', `Guild ${guildId} is not in DISCORD_GUILD_ALLOWLIST`, {
        status: 403,
        details: {
          guildId,
          allowlist: this.config.guildAllowlist,
        },
      });
    }
  }

  protected assertConfirm(confirm: boolean | undefined, action: string, details: Record<string, unknown>): void {
    if (confirm) {
      return;
    }

    throw new ToolError('CONFIRMATION_REQUIRED', `Action ${action} requires confirm=true`, {
      status: 400,
      details,
    });
  }

  protected throwDryRun(action: string, details: Record<string, unknown>): never {
    throw new ToolError('DRY_RUN_BLOCKED', `Dry-run mode blocked mutation ${action}`, {
      status: 409,
      details,
    });
  }

  protected buildMutationContext(
    guildId: string,
    action: string,
    options?: Partial<MutationContext>,
  ): MutationContext {
    return {
      guildId,
      action,
      ...options,
    };
  }

  protected auditMutation(ctx: MutationContext): void {
    logger.info('discord.mutation', {
      ...ctx,
      dryRun: this.config.dryRun,
    });
  }
}
