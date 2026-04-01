import type { WebhookStructure } from 'seyfert/lib/client/transformers.js';
import type { HttpClient } from 'seyfert/lib/client/httpclient.js';
import type { RESTPatchAPIWebhookJSONBody, RESTPostAPIChannelWebhookJSONBody } from 'seyfert/lib/types/index.js';

import type { AppConfig } from '../config/env.js';
import { ToolError } from '../lib/errors.js';
import { logger } from '../lib/logging.js';

type MutationContext = {
  guildId: string;
  action: string;
  reason?: string;
  confirm?: boolean;
};

export type DiscordWebhookSummary = {
  id: string;
  type: number;
  guildId?: string;
  channelId: string;
  name: string | null;
  avatar: string | null;
  applicationId: string | null;
  token?: string;
  url?: string;
};

export class DiscordWebhooksService {
  constructor(
    private readonly client: HttpClient,
    private readonly config: AppConfig,
  ) {}

  async listGuildWebhooks(guildId: string): Promise<DiscordWebhookSummary[]> {
    this.assertGuildAllowed(guildId);
    const webhooks = await this.client.webhooks.listFromGuild(guildId);
    const summaries = webhooks.map((webhook) => this.toWebhookSummary(webhook));
    summaries.forEach((summary) => this.assertWebhookGuild(summary, guildId, 'webhook.list.guild'));
    return summaries;
  }

  async listChannelWebhooks(guildId: string, channelId: string): Promise<DiscordWebhookSummary[]> {
    this.assertGuildAllowed(guildId);
    await this.assertChannelBelongsToGuild(guildId, channelId, 'webhook.list.channel');
    const webhooks = await this.client.webhooks.listFromChannel(channelId);
    const summaries = webhooks.map((webhook) => this.toWebhookSummary(webhook));
    summaries.forEach((summary) => this.assertWebhookGuild(summary, guildId, 'webhook.list.channel'));
    return summaries;
  }

  async createWebhook(
    guildId: string,
    channelId: string,
    body: RESTPostAPIChannelWebhookJSONBody,
  ): Promise<DiscordWebhookSummary> {
    this.assertGuildAllowed(guildId);
    await this.assertChannelBelongsToGuild(guildId, channelId, 'webhook.create');
    this.auditMutation(this.buildMutationContext(guildId, 'webhook.create'));

    if (this.config.dryRun) {
      this.throwDryRun('webhook.create', { guildId, channelId, body });
    }

    const webhook = await this.client.webhooks.create(channelId, body);
    const summary = this.toWebhookSummary(webhook);
    this.assertWebhookGuild(summary, guildId, 'webhook.create');
    return summary;
  }

  async editWebhook(
    guildId: string,
    webhookId: string,
    body: RESTPatchAPIWebhookJSONBody,
    reason?: string,
  ): Promise<DiscordWebhookSummary> {
    this.assertGuildAllowed(guildId);
    await this.assertWebhookBelongsToGuild(guildId, webhookId, 'webhook.edit');
    this.auditMutation(this.buildMutationContext(guildId, 'webhook.edit', this.buildMutationOptions(reason)));

    if (this.config.dryRun) {
      this.throwDryRun('webhook.edit', { guildId, webhookId, body });
    }

    const webhook = await this.client.webhooks.edit(webhookId, body, this.buildWebhookOptions(reason));
    const summary = this.toWebhookSummary(webhook);
    this.assertWebhookGuild(summary, guildId, 'webhook.edit');
    return summary;
  }

  async deleteWebhook(
    guildId: string,
    webhookId: string,
    options: { reason?: string; confirm?: boolean },
  ): Promise<void> {
    this.assertGuildAllowed(guildId);
    await this.assertWebhookBelongsToGuild(guildId, webhookId, 'webhook.delete');
    this.assertConfirm(options.confirm, 'webhook.delete', { guildId, webhookId });
    this.auditMutation(this.buildMutationContext(guildId, 'webhook.delete', options));

    if (this.config.dryRun) {
      this.throwDryRun('webhook.delete', { guildId, webhookId });
    }

    await this.client.webhooks.delete(webhookId, this.buildWebhookOptions(options.reason));
  }

  async updateWebhook(
    guildId: string,
    webhookId: string,
    body: RESTPatchAPIWebhookJSONBody,
    reason?: string,
  ): Promise<DiscordWebhookSummary> {
    return this.editWebhook(guildId, webhookId, body, reason);
  }

  private toWebhookSummary(webhook: WebhookStructure): DiscordWebhookSummary {
    const summary: DiscordWebhookSummary = {
      id: webhook.id,
      type: webhook.type,
      channelId: webhook.channelId,
      name: webhook.name,
      avatar: webhook.avatar,
      applicationId: webhook.applicationId,
    };

    if (typeof webhook.guildId === 'string') {
      summary.guildId = webhook.guildId;
    }

    if (typeof webhook.token === 'string') {
      summary.token = webhook.token;
    }

    if (typeof webhook.url === 'string') {
      summary.url = webhook.url;
    }

    return summary;
  }

  private assertGuildAllowed(guildId: string): void {
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

  private assertWebhookGuild(summary: DiscordWebhookSummary, guildId: string, action: string): void {
    if (summary.guildId === undefined || summary.guildId === guildId) {
      return;
    }

    throw new ToolError('UNAUTHORIZED_GUILD', `Webhook ${summary.id} is not in allowed guild ${guildId}`, {
      status: 403,
      details: {
        action,
        webhookId: summary.id,
        guildId: summary.guildId,
        expectedGuildId: guildId,
      },
    });
  }

  private async assertChannelBelongsToGuild(guildId: string, channelId: string, action: string): Promise<void> {
    const channel = await this.client.channels.fetch(channelId, true);
    const candidate = channel as { guildId?: unknown };

    if (typeof candidate.guildId !== 'string') {
      throw new ToolError('BAD_REQUEST', `Channel ${channelId} is not a guild channel`, {
        status: 400,
        details: {
          action,
          channelId,
        },
      });
    }

    if (candidate.guildId !== guildId) {
      throw new ToolError('UNAUTHORIZED_GUILD', `Channel ${channelId} is not in allowed guild ${guildId}`, {
        status: 403,
        details: {
          action,
          channelId,
          guildId: candidate.guildId,
          expectedGuildId: guildId,
        },
      });
    }
  }

  private async assertWebhookBelongsToGuild(guildId: string, webhookId: string, action: string): Promise<void> {
    const webhook = await this.client.webhooks.fetch(webhookId);
    const summary = this.toWebhookSummary(webhook);

    if (summary.guildId !== undefined) {
      this.assertWebhookGuild(summary, guildId, action);
      return;
    }

    await this.assertChannelBelongsToGuild(guildId, summary.channelId, action);
  }

  private assertConfirm(confirm: boolean | undefined, action: string, details: Record<string, unknown>): void {
    if (confirm) {
      return;
    }

    throw new ToolError('CONFIRMATION_REQUIRED', `Action ${action} requires confirm=true`, {
      status: 400,
      details,
    });
  }

  private throwDryRun(action: string, details: Record<string, unknown>): never {
    throw new ToolError('DRY_RUN_BLOCKED', `Dry-run mode blocked mutation ${action}`, {
      status: 409,
      details,
    });
  }

  private buildMutationContext(
    guildId: string,
    action: string,
    options?: { reason?: string; confirm?: boolean },
  ): MutationContext {
    const context: MutationContext = { guildId, action };

    if (options?.reason !== undefined) {
      context.reason = options.reason;
    }

    if (options?.confirm !== undefined) {
      context.confirm = options.confirm;
    }

    return context;
  }

  private buildMutationOptions(reason: string | undefined): { reason?: string } | undefined {
    if (reason === undefined) {
      return undefined;
    }

    return { reason };
  }

  private buildWebhookOptions(reason: string | undefined): { reason?: string } {
    const options: { reason?: string } = {};

    if (reason !== undefined) {
      options.reason = reason;
    }

    return options;
  }

  private auditMutation(ctx: MutationContext): void {
    logger.info('discord.mutation', {
      action: ctx.action,
      guildId: ctx.guildId,
      reason: ctx.reason,
      confirm: ctx.confirm ?? false,
      dryRun: this.config.dryRun,
    });
  }
}

export { DiscordWebhooksService as DiscordWebhookDomain };
