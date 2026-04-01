import type { WebhookMessageStructure, WebhookStructure } from 'seyfert/lib/client/transformers.js';
import type { HttpClient } from 'seyfert/lib/client/httpclient.js';
import type {
  RESTPatchAPIWebhookJSONBody,
  RESTPostAPIChannelWebhookJSONBody,
} from 'seyfert/lib/types/index.js';
import type { MessageWebhookCreateBodyRequest, MessageWebhookUpdateBodyRequest } from 'seyfert/lib/common/types/write.js';

import type { AppConfig } from '../config/env.js';
import { ToolError } from '../lib/errors.js';
import { DiscordBaseService } from './base.js';

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

export type DiscordWebhookMessageSummary = {
  id: string;
  channelId: string;
  guildId?: string;
  authorId: string;
  authorUsername: string;
  content: string;
  timestamp?: number;
  editedTimestamp?: number | null;
  pinned?: boolean;
  tts?: boolean;
  mentionEveryone?: boolean;
  attachmentCount?: number;
  embedCount?: number;
  type?: number;
};

export type ExecuteWebhookByTokenOptions = {
  content?: string | undefined;
  username?: string | undefined;
  avatarUrl?: string | undefined;
  tts?: boolean | undefined;
  threadId?: string | undefined;
  wait?: boolean | undefined;
  suppressEmbeds?: boolean | undefined;
  allowedMentionUserIds?: string[] | undefined;
  allowedMentionRoleIds?: string[] | undefined;
  allowedMentionEveryone?: boolean | undefined;
  embeds?: unknown[] | undefined;
  components?: unknown[] | undefined;
  poll?: unknown;
};

export type FetchWebhookMessageByTokenOptions = {
  threadId?: string | undefined;
};

export type EditWebhookMessageByTokenOptions = {
  content?: string | undefined;
  embeds?: unknown[] | undefined;
  components?: unknown[] | undefined;
  threadId?: string | undefined;
};

export type DeleteWebhookMessageByTokenOptions = {
  threadId?: string | undefined;
  reason?: string | undefined;
  confirm?: boolean | undefined;
};

export class DiscordWebhooksService extends DiscordBaseService {
  constructor(client: HttpClient, config: AppConfig) {
    super(client, config);
  }

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

  async executeWebhookByToken(
    guildId: string,
    webhookId: string,
    token: string,
    options: ExecuteWebhookByTokenOptions,
  ): Promise<DiscordWebhookMessageSummary | null> {
    this.assertGuildAllowed(guildId);
    await this.assertWebhookBelongsToGuild(guildId, webhookId, 'webhook.token.execute', token);
    if (options.threadId !== undefined) {
      await this.assertChannelBelongsToGuild(guildId, options.threadId, 'webhook.token.execute');
    }
    this.assertWebhookExecuteBody(options);
    this.auditMutation(
      this.buildMutationContext(guildId, 'webhook.token.execute', {
        webhookId,
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('webhook.token.execute', { guildId, webhookId, options });
    }

    const body: MessageWebhookCreateBodyRequest = {};
    if (options.content !== undefined) {
      body.content = options.content;
    }
    if (options.username !== undefined) {
      body.username = options.username;
    }
    if (options.avatarUrl !== undefined) {
      body.avatar_url = options.avatarUrl;
    }
    if (options.tts !== undefined) {
      body.tts = options.tts;
    }
    if (options.suppressEmbeds) {
      body.flags = 1 << 2;
    }
    const allowedMentions = this.toAllowedMentions(options);
    if (allowedMentions !== undefined) {
      body.allowed_mentions = allowedMentions;
    }
    if (options.embeds !== undefined) {
      body.embeds = options.embeds as MessageWebhookCreateBodyRequest['embeds'];
    }
    if (options.components !== undefined) {
      body.components = options.components as NonNullable<MessageWebhookCreateBodyRequest['components']>;
    }
    if (options.poll !== undefined) {
      body.poll = options.poll as MessageWebhookCreateBodyRequest['poll'];
    }

    const query: { wait?: boolean; thread_id?: string } = {};
    if (options.wait !== undefined) {
      query.wait = options.wait;
    }
    if (options.threadId !== undefined) {
      query.thread_id = options.threadId;
    }

    const message = await this.client.webhooks.writeMessage(webhookId, token, {
      body,
      ...(Object.keys(query).length > 0 ? { query } : {}),
    });

    if (message !== null) {
      this.assertWebhookMessageGuild(message, guildId, 'webhook.token.execute');
      return this.toWebhookMessageSummary(message);
    }

    return null;
  }

  async fetchWebhookMessageByToken(
    guildId: string,
    webhookId: string,
    token: string,
    messageId: string,
    options?: FetchWebhookMessageByTokenOptions,
  ): Promise<DiscordWebhookMessageSummary> {
    this.assertGuildAllowed(guildId);
    await this.assertWebhookBelongsToGuild(guildId, webhookId, 'webhook.token.message.fetch', token);
    if (options?.threadId !== undefined) {
      await this.assertChannelBelongsToGuild(guildId, options.threadId, 'webhook.token.message.fetch');
    }
    const message = await this.client.webhooks.fetchMessage({
      webhookId,
      token,
      messageId,
      ...(options?.threadId !== undefined ? { query: { thread_id: options.threadId } } : {}),
    });
    this.assertWebhookMessageGuild(message, guildId, 'webhook.token.message.fetch');
    return this.toWebhookMessageSummary(message);
  }

  async editWebhookMessageByToken(
    guildId: string,
    webhookId: string,
    token: string,
    messageId: string,
    options: EditWebhookMessageByTokenOptions,
  ): Promise<DiscordWebhookMessageSummary> {
    this.assertGuildAllowed(guildId);
    await this.assertWebhookBelongsToGuild(guildId, webhookId, 'webhook.token.message.edit', token);
    if (options.threadId !== undefined) {
      await this.assertChannelBelongsToGuild(guildId, options.threadId, 'webhook.token.message.edit');
    }
    this.assertWebhookMessageEditBody(options);
    this.auditMutation(
      this.buildMutationContext(guildId, 'webhook.token.message.edit', {
        webhookId,
        messageId,
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('webhook.token.message.edit', { guildId, webhookId, messageId, options });
    }

    const body: MessageWebhookUpdateBodyRequest = {};
    if (options.content !== undefined) {
      body.content = options.content;
    }
    if (options.embeds !== undefined) {
      body.embeds = options.embeds as MessageWebhookUpdateBodyRequest['embeds'];
    }
    if (options.components !== undefined) {
      body.components = options.components as NonNullable<MessageWebhookUpdateBodyRequest['components']>;
    }

    const message = await this.client.webhooks.editMessage(webhookId, token, {
      messageId,
      body,
      ...(options.threadId !== undefined ? { query: { thread_id: options.threadId } } : {}),
    });

    this.assertWebhookMessageGuild(message, guildId, 'webhook.token.message.edit');
    return this.toWebhookMessageSummary(message);
  }

  async deleteWebhookMessageByToken(
    guildId: string,
    webhookId: string,
    token: string,
    messageId: string,
    options: DeleteWebhookMessageByTokenOptions,
  ): Promise<void> {
    this.assertGuildAllowed(guildId);
    await this.assertWebhookBelongsToGuild(guildId, webhookId, 'webhook.token.message.delete', token);
    if (options.threadId !== undefined) {
      await this.assertChannelBelongsToGuild(guildId, options.threadId, 'webhook.token.message.delete');
    }
    this.assertConfirm(options.confirm, 'webhook.token.message.delete', { guildId, webhookId, messageId });
    this.auditMutation(
      this.buildMutationContext(guildId, 'webhook.token.message.delete', {
        webhookId,
        messageId,
        ...(options.reason !== undefined ? { reason: options.reason } : {}),
        ...(options.confirm !== undefined ? { confirm: options.confirm } : {}),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('webhook.token.message.delete', { guildId, webhookId, messageId });
    }

    await this.client.webhooks.deleteMessage({
      webhookId,
      token,
      messageId,
      ...(options.reason !== undefined ? { reason: options.reason } : {}),
      ...(options.threadId !== undefined ? { query: { thread_id: options.threadId } } : {}),
    });
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

  private toWebhookMessageSummary(message: WebhookMessageStructure): DiscordWebhookMessageSummary {
    const summary: DiscordWebhookMessageSummary = {
      id: message.id,
      channelId: message.channelId,
      authorId: message.author.id,
      authorUsername: message.author.username,
      content: message.content ?? '',
    };

    if (typeof message.guildId === 'string') {
      summary.guildId = message.guildId;
    }

    if (typeof message.timestamp === 'number') {
      summary.timestamp = message.timestamp;
    }

    if (message.editedTimestamp !== undefined) {
      summary.editedTimestamp = message.editedTimestamp === null ? null : Date.parse(message.editedTimestamp);
    }

    if (typeof message.pinned === 'boolean') {
      summary.pinned = message.pinned;
    }

    if (typeof message.tts === 'boolean') {
      summary.tts = message.tts;
    }

    if (typeof message.mentionEveryone === 'boolean') {
      summary.mentionEveryone = message.mentionEveryone;
    }

    if (Array.isArray(message.attachments)) {
      summary.attachmentCount = message.attachments.length;
    }

    if (Array.isArray(message.embeds)) {
      summary.embedCount = message.embeds.length;
    }

    if (typeof message.type === 'number') {
      summary.type = message.type;
    }

    return summary;
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

  private async assertWebhookBelongsToGuild(
    guildId: string,
    webhookId: string,
    action: string,
    token?: string,
  ): Promise<void> {
    const webhook = await this.client.webhooks.fetch(webhookId, token);
    const summary = this.toWebhookSummary(webhook);

    if (summary.guildId !== undefined) {
      this.assertWebhookGuild(summary, guildId, action);
      return;
    }

    await this.assertChannelBelongsToGuild(guildId, summary.channelId, action);
  }

  private assertWebhookMessageGuild(message: WebhookMessageStructure, guildId: string, action: string): void {
    if (message.guildId === undefined || message.guildId === guildId) {
      return;
    }

    throw new ToolError('UNAUTHORIZED_GUILD', `Webhook message ${message.id} is not in allowed guild ${guildId}`, {
      status: 403,
      details: {
        action,
        messageId: message.id,
        guildId: message.guildId,
        expectedGuildId: guildId,
      },
    });
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

  private toAllowedMentions(options: ExecuteWebhookByTokenOptions):
    | {
        parse?: Array<'roles' | 'users' | 'everyone'>;
        users?: string[];
        roles?: string[];
      }
    | undefined {
    const parse: Array<'roles' | 'users' | 'everyone'> = [];
    if (options.allowedMentionEveryone) {
      parse.push('everyone');
    }

    const users = options.allowedMentionUserIds;
    const roles = options.allowedMentionRoleIds;

    if (!users && !roles && parse.length === 0) {
      return undefined;
    }

    const payload: {
      parse?: Array<'roles' | 'users' | 'everyone'>;
      users?: string[];
      roles?: string[];
    } = {};

    if (parse.length > 0) {
      payload.parse = parse;
    }

    if (users !== undefined) {
      payload.users = users;
    }

    if (roles !== undefined) {
      payload.roles = roles;
    }

    return payload;
  }

  private assertWebhookExecuteBody(options: ExecuteWebhookByTokenOptions): void {
    if (
      options.content === undefined &&
      options.embeds === undefined &&
      options.components === undefined &&
      options.poll === undefined
    ) {
      throw new ToolError('BAD_REQUEST', 'At least one of content, embeds, components, or poll must be provided', {
        status: 400,
        details: {},
      });
    }
  }

  private assertWebhookMessageEditBody(options: EditWebhookMessageByTokenOptions): void {
    if (
      options.content === undefined &&
      options.embeds === undefined &&
      options.components === undefined
    ) {
      throw new ToolError('BAD_REQUEST', 'At least one editable field must be provided', {
        status: 400,
        details: {},
      });
    }
  }
}

export { DiscordWebhooksService as DiscordWebhookDomain };
