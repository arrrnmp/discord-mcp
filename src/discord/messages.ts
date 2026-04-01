import type { MessageStructure, UserStructure } from 'seyfert/lib/client/transformers.js';
import type { HttpClient } from 'seyfert/lib/client/httpclient.js';
import type {
  APIUser,
  RESTAPIPollCreate,
  RESTGetAPIChannelMessageReactionUsersQuery,
  RESTGetAPIChannelMessagesQuery,
  RESTGetAPIChannelPinsQuery,
  RESTGetAPIPollAnswerVotersQuery,
  ReactionType,
} from 'seyfert/lib/types/index.js';
import type { MessageCreateBodyRequest, MessageUpdateBodyRequest } from 'seyfert/lib/common/types/write.js';

import type { AppConfig } from '../config/env.js';
import { ToolError } from '../lib/errors.js';
import { DiscordBaseService } from './base.js';

export type DiscordMessageSummary = {
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

export type ListMessagesOptions = {
  limit?: number | undefined;
  before?: string | undefined;
  after?: string | undefined;
  around?: string | undefined;
};

export type ListPinnedMessagesOptions = {
  limit?: number | undefined;
  before?: string | undefined;
};

export type SendMessageOptions = {
  content?: string | undefined;
  tts?: boolean | undefined;
  replyToMessageId?: string | undefined;
  replyFailIfNotExists?: boolean | undefined;
  suppressEmbeds?: boolean | undefined;
  allowedMentionUserIds?: string[] | undefined;
  allowedMentionRoleIds?: string[] | undefined;
  allowedMentionEveryone?: boolean | undefined;
  embeds?: unknown[] | undefined;
  components?: unknown[] | undefined;
  poll?: unknown;
};

export type EditMessageOptions = {
  content?: string | undefined;
  suppressEmbeds?: boolean | undefined;
  embeds?: unknown[] | null | undefined;
  components?: unknown[] | null | undefined;
};

export type DeleteMessageOptions = {
  reason?: string | undefined;
  confirm?: boolean | undefined;
};

export type PurgeMessagesOptions = {
  messageIds?: string[] | undefined;
  limit?: number | undefined;
  reason?: string | undefined;
  confirm?: boolean | undefined;
};

export type PinMessageOptions = {
  reason?: string | undefined;
  confirm?: boolean | undefined;
};

type PollAnswerId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type ListReactionUsersOptions = {
  limit?: number | undefined;
  after?: string | undefined;
  type?: 0 | 1 | undefined;
};

export type ListPollAnswerVotersOptions = {
  limit?: number | undefined;
  after?: string | undefined;
};

export type DiscordUserSummary = {
  id: string;
  username: string;
  globalName?: string | null;
  avatar?: string | null;
  bot?: boolean;
};

export class DiscordMessagesService extends DiscordBaseService {
  constructor(client: HttpClient, config: AppConfig) {
    super(client, config);
  }

  async listMessages(channelId: string, options?: ListMessagesOptions): Promise<DiscordMessageSummary[]> {
    const guildId = await this.getGuildIdForChannel(channelId, 'message.list');
    this.assertGuildAllowed(guildId);

    const query = this.toListMessagesQuery(options);
    const messages = await this.client.messages.list(channelId, query ?? {});
    return messages.map((message) => this.toMessageSummary(message));
  }

  async fetchMessage(channelId: string, messageId: string, force = true): Promise<DiscordMessageSummary> {
    const guildId = await this.getGuildIdForChannel(channelId, 'message.fetch');
    this.assertGuildAllowed(guildId);

    const message = await this.client.messages.fetch(messageId, channelId, force);
    this.assertMessageGuild(message, guildId, 'message.fetch');
    return this.toMessageSummary(message);
  }

  async sendMessage(channelId: string, options: SendMessageOptions): Promise<DiscordMessageSummary> {
    const guildId = await this.getGuildIdForChannel(channelId, 'message.send');
    this.assertGuildAllowed(guildId);

    if (
      options.content === undefined &&
      options.embeds === undefined &&
      options.components === undefined &&
      options.poll === undefined
    ) {
      throw new ToolError('BAD_REQUEST', 'At least one of content, embeds, components, or poll must be provided', {
        status: 400,
        details: {
          channelId,
        },
      });
    }

    if (options.content !== undefined && options.content.length === 0) {
      throw new ToolError('BAD_REQUEST', 'content cannot be empty', {
        status: 400,
        details: {
          channelId,
        },
      });
    }

    this.auditMutation(
      this.buildMutationContext(guildId, 'message.send', {
        channelId,
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('message.send', {
        guildId,
        channelId,
        contentLength: options.content?.length,
        embedCount: options.embeds?.length,
        componentCount: options.components?.length,
        poll: options.poll,
      });
    }

    const body: MessageCreateBodyRequest = {};

    if (options.content !== undefined) {
      body.content = options.content;
    }
    if (options.tts !== undefined) {
      body.tts = options.tts;
    }
    if (options.replyToMessageId !== undefined) {
      body.message_reference = {
        message_id: options.replyToMessageId,
        fail_if_not_exists: options.replyFailIfNotExists ?? true,
      };
    }
    if (options.suppressEmbeds) {
      body.flags = 1 << 2;
    }
    const mentions = this.toAllowedMentions(options);
    if (mentions !== undefined) {
      body.allowed_mentions = mentions;
    }
    if (options.embeds !== undefined) {
      body.embeds = options.embeds as MessageCreateBodyRequest['embeds'];
    }
    if (options.components !== undefined) {
      body.components = options.components as NonNullable<MessageCreateBodyRequest['components']>;
    }
    if (options.poll !== undefined) {
      body.poll = options.poll as MessageCreateBodyRequest['poll'];
    }

    const message = await this.client.messages.write(channelId, body);

    this.assertMessageGuild(message, guildId, 'message.send');
    return this.toMessageSummary(message);
  }

  async editMessage(channelId: string, messageId: string, options: EditMessageOptions): Promise<DiscordMessageSummary> {
    const guildId = await this.getGuildIdForChannel(channelId, 'message.edit');
    this.assertGuildAllowed(guildId);

    if (
      options.content === undefined &&
      options.suppressEmbeds === undefined &&
      options.embeds === undefined &&
      options.components === undefined
    ) {
      throw new ToolError('BAD_REQUEST', 'At least one editable field must be provided', {
        status: 400,
        details: {
          channelId,
          messageId,
        },
      });
    }

    this.auditMutation(
      this.buildMutationContext(guildId, 'message.edit', {
        channelId,
        messageId,
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('message.edit', { guildId, channelId, messageId });
    }

    const body: MessageUpdateBodyRequest = {};
    if (options.content !== undefined) {
      body.content = options.content;
    }
    if (options.suppressEmbeds !== undefined) {
      body.flags = options.suppressEmbeds ? 1 << 2 : 0;
    }
    if (options.embeds !== undefined) {
      body.embeds = options.embeds as MessageUpdateBodyRequest['embeds'];
    }
    if (options.components !== undefined) {
      body.components = options.components as NonNullable<MessageUpdateBodyRequest['components']>;
    }

    const message = await this.client.messages.edit(messageId, channelId, body);

    this.assertMessageGuild(message, guildId, 'message.edit');
    return this.toMessageSummary(message);
  }

  async deleteMessage(channelId: string, messageId: string, options: DeleteMessageOptions): Promise<void> {
    const guildId = await this.getGuildIdForChannel(channelId, 'message.delete');
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'message.delete', { guildId, channelId, messageId });

    this.auditMutation(
      this.buildMutationContext(guildId, 'message.delete', {
        channelId,
        messageId,
        ...(options.reason !== undefined ? { reason: options.reason } : {}),
        ...(options.confirm !== undefined ? { confirm: options.confirm } : {}),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('message.delete', { guildId, channelId, messageId });
    }

    await this.client.messages.delete(messageId, channelId, options.reason);
  }

  async purgeMessages(channelId: string, options: PurgeMessagesOptions): Promise<{ deletedCount: number; messageIds: string[] }> {
    const guildId = await this.getGuildIdForChannel(channelId, 'message.purge');
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'message.purge', { guildId, channelId });

    let messageIds = options.messageIds;
    if (messageIds === undefined) {
      const limit = options.limit ?? 20;
      const messages = await this.client.messages.list(channelId, { limit });
      messageIds = messages.map((message) => message.id);
    }

    const uniqueMessageIds = [...new Set(messageIds)];
    if (uniqueMessageIds.length === 0) {
      throw new ToolError('BAD_REQUEST', 'No message IDs available to purge', {
        status: 400,
        details: {
          channelId,
        },
      });
    }

    if (uniqueMessageIds.length > 100) {
      throw new ToolError('BAD_REQUEST', 'Bulk purge supports at most 100 message IDs per request', {
        status: 400,
        details: {
          requested: uniqueMessageIds.length,
        },
      });
    }

    this.auditMutation(
      this.buildMutationContext(guildId, 'message.purge', {
        channelId,
        deleteCount: uniqueMessageIds.length,
        ...(options.reason !== undefined ? { reason: options.reason } : {}),
        ...(options.confirm !== undefined ? { confirm: options.confirm } : {}),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('message.purge', { guildId, channelId, messageIds: uniqueMessageIds });
    }

    await this.client.messages.purge(uniqueMessageIds, channelId, options.reason);

    return {
      deletedCount: uniqueMessageIds.length,
      messageIds: uniqueMessageIds,
    };
  }

  async listPinnedMessages(channelId: string, options?: ListPinnedMessagesOptions): Promise<DiscordMessageSummary[]> {
    const guildId = await this.getGuildIdForChannel(channelId, 'message.pin.list');
    this.assertGuildAllowed(guildId);

    const query = this.toListPinnedMessagesQuery(options);
    const pins = await this.client.channels.pins(channelId, query);
    return pins.items.map((item) => this.toMessageSummary(item.message));
  }

  async pinMessage(channelId: string, messageId: string, options: PinMessageOptions): Promise<void> {
    const guildId = await this.getGuildIdForChannel(channelId, 'message.pin.set');
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'message.pin.set', { guildId, channelId, messageId });
    this.auditMutation(
      this.buildMutationContext(guildId, 'message.pin.set', {
        channelId,
        messageId,
        ...(options.reason !== undefined ? { reason: options.reason } : {}),
        ...(options.confirm !== undefined ? { confirm: options.confirm } : {}),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('message.pin.set', { guildId, channelId, messageId });
    }

    await this.client.channels.setPin(messageId, channelId, options.reason);
  }

  async unpinMessage(channelId: string, messageId: string, options: PinMessageOptions): Promise<void> {
    const guildId = await this.getGuildIdForChannel(channelId, 'message.pin.delete');
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'message.pin.delete', { guildId, channelId, messageId });
    this.auditMutation(
      this.buildMutationContext(guildId, 'message.pin.delete', {
        channelId,
        messageId,
        ...(options.reason !== undefined ? { reason: options.reason } : {}),
        ...(options.confirm !== undefined ? { confirm: options.confirm } : {}),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('message.pin.delete', { guildId, channelId, messageId });
    }

    await this.client.channels.deletePin(messageId, channelId, options.reason);
  }

  async crosspostMessage(channelId: string, messageId: string, reason?: string): Promise<DiscordMessageSummary> {
    const guildId = await this.getGuildIdForChannel(channelId, 'message.crosspost');
    this.assertGuildAllowed(guildId);
    this.auditMutation(
      this.buildMutationContext(guildId, 'message.crosspost', {
        channelId,
        messageId,
        ...(reason !== undefined ? { reason } : {}),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('message.crosspost', { guildId, channelId, messageId });
    }

    const message = await this.client.messages.crosspost(messageId, channelId, reason);
    this.assertMessageGuild(message, guildId, 'message.crosspost');
    return this.toMessageSummary(message);
  }

  async addReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    const guildId = await this.getGuildIdForChannel(channelId, 'message.reaction.add');
    this.assertGuildAllowed(guildId);
    this.auditMutation(
      this.buildMutationContext(guildId, 'message.reaction.add', {
        channelId,
        messageId,
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('message.reaction.add', { guildId, channelId, messageId, emoji });
    }

    await this.client.reactions.add(messageId, channelId, emoji);
  }

  async removeOwnReaction(channelId: string, messageId: string, emoji: string): Promise<void> {
    const guildId = await this.getGuildIdForChannel(channelId, 'message.reaction.remove.own');
    this.assertGuildAllowed(guildId);
    this.auditMutation(
      this.buildMutationContext(guildId, 'message.reaction.remove.own', {
        channelId,
        messageId,
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('message.reaction.remove.own', { guildId, channelId, messageId, emoji });
    }

    await this.client.reactions.delete(messageId, channelId, emoji);
  }

  async removeUserReaction(channelId: string, messageId: string, emoji: string, userId: string): Promise<void> {
    const guildId = await this.getGuildIdForChannel(channelId, 'message.reaction.remove.user');
    this.assertGuildAllowed(guildId);
    this.auditMutation(
      this.buildMutationContext(guildId, 'message.reaction.remove.user', {
        channelId,
        messageId,
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('message.reaction.remove.user', { guildId, channelId, messageId, emoji, userId });
    }

    await this.client.reactions.delete(messageId, channelId, emoji, userId);
  }

  async listReactionUsers(
    channelId: string,
    messageId: string,
    emoji: string,
    options?: ListReactionUsersOptions,
  ): Promise<DiscordUserSummary[]> {
    const guildId = await this.getGuildIdForChannel(channelId, 'message.reaction.list');
    this.assertGuildAllowed(guildId);

    const query = this.toListReactionUsersQuery(options);
    const users = await this.client.reactions.fetch(messageId, channelId, emoji, query);
    return users.map((user) => this.toUserSummary(user));
  }

  async clearReactions(channelId: string, messageId: string): Promise<void> {
    const guildId = await this.getGuildIdForChannel(channelId, 'message.reaction.clear');
    this.assertGuildAllowed(guildId);
    this.auditMutation(
      this.buildMutationContext(guildId, 'message.reaction.clear', {
        channelId,
        messageId,
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('message.reaction.clear', { guildId, channelId, messageId });
    }

    await this.client.reactions.purge(messageId, channelId);
  }

  async clearEmojiReactions(channelId: string, messageId: string, emoji: string): Promise<void> {
    const guildId = await this.getGuildIdForChannel(channelId, 'message.reaction.clear.emoji');
    this.assertGuildAllowed(guildId);
    this.auditMutation(
      this.buildMutationContext(guildId, 'message.reaction.clear.emoji', {
        channelId,
        messageId,
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('message.reaction.clear.emoji', { guildId, channelId, messageId, emoji });
    }

    await this.client.reactions.purge(messageId, channelId, emoji);
  }

  async endPoll(channelId: string, messageId: string): Promise<DiscordMessageSummary> {
    const guildId = await this.getGuildIdForChannel(channelId, 'message.poll.end');
    this.assertGuildAllowed(guildId);
    this.auditMutation(
      this.buildMutationContext(guildId, 'message.poll.end', {
        channelId,
        messageId,
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('message.poll.end', { guildId, channelId, messageId });
    }

    const message = await this.client.messages.endPoll(channelId, messageId);
    this.assertMessageGuild(message, guildId, 'message.poll.end');
    return this.toMessageSummary(message);
  }

  async listPollAnswerVoters(
    channelId: string,
    messageId: string,
    answerId: PollAnswerId,
    options?: ListPollAnswerVotersOptions,
  ): Promise<DiscordUserSummary[]> {
    const guildId = await this.getGuildIdForChannel(channelId, 'message.poll.voters');
    this.assertGuildAllowed(guildId);

    const query = this.toListPollAnswerVotersQuery(options);
    if (query !== undefined) {
      const raw = await this.client.proxy
        .channels(channelId)
        .polls(messageId)
        .answers(answerId)
        .get({ query });
      return raw.users.map((user) => this.toApiUserSummary(user));
    }

    const users = await this.client.messages.getAnswerVoters(channelId, messageId, answerId);
    return users.map((user) => this.toUserSummary(user));
  }

  private async getGuildIdForChannel(channelId: string, action: string): Promise<string> {
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

    return candidate.guildId;
  }

  private toListMessagesQuery(options: ListMessagesOptions | undefined): RESTGetAPIChannelMessagesQuery | undefined {
    const query: RESTGetAPIChannelMessagesQuery = {};

    if (options?.limit !== undefined) {
      query.limit = options.limit;
    }

    if (options?.before !== undefined) {
      query.before = options.before;
    }

    if (options?.after !== undefined) {
      query.after = options.after;
    }

    if (options?.around !== undefined) {
      query.around = options.around;
    }

    if (Object.keys(query).length === 0) {
      return undefined;
    }

    return query;
  }

  private toListPinnedMessagesQuery(options: ListPinnedMessagesOptions | undefined): RESTGetAPIChannelPinsQuery | undefined {
    const query: RESTGetAPIChannelPinsQuery = {};

    if (options?.limit !== undefined) {
      query.limit = options.limit;
    }

    if (options?.before !== undefined) {
      query.before = options.before;
    }

    if (Object.keys(query).length === 0) {
      return undefined;
    }

    return query;
  }

  private toListReactionUsersQuery(
    options: ListReactionUsersOptions | undefined,
  ): RESTGetAPIChannelMessageReactionUsersQuery | undefined {
    const query: RESTGetAPIChannelMessageReactionUsersQuery = {};

    if (options?.limit !== undefined) {
      query.limit = options.limit;
    }

    if (options?.after !== undefined) {
      query.after = options.after;
    }

    if (options?.type !== undefined) {
      query.type = options.type as ReactionType;
    }

    if (Object.keys(query).length === 0) {
      return undefined;
    }

    return query;
  }

  private toListPollAnswerVotersQuery(
    options: ListPollAnswerVotersOptions | undefined,
  ): RESTGetAPIPollAnswerVotersQuery | undefined {
    const query: RESTGetAPIPollAnswerVotersQuery = {};

    if (options?.limit !== undefined) {
      query.limit = options.limit;
    }

    if (options?.after !== undefined) {
      query.after = options.after;
    }

    if (Object.keys(query).length === 0) {
      return undefined;
    }

    return query;
  }

  private toAllowedMentions(options: SendMessageOptions):
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

  private assertMessageGuild(message: MessageStructure, guildId: string, action: string): void {
    if (message.guildId === undefined || message.guildId === guildId) {
      return;
    }

    throw new ToolError('UNAUTHORIZED_GUILD', `Message ${message.id} is not in allowed guild ${guildId}`, {
      status: 403,
      details: {
        action,
        messageId: message.id,
        guildId: message.guildId,
        expectedGuildId: guildId,
      },
    });
  }

  private toMessageSummary(message: MessageStructure): DiscordMessageSummary {
    const summary: DiscordMessageSummary = {
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

  private toUserSummary(user: UserStructure): DiscordUserSummary {
    const summary: DiscordUserSummary = {
      id: user.id,
      username: user.username,
    };

    if (user.globalName !== undefined) {
      summary.globalName = user.globalName;
    }

    if (user.avatar !== undefined) {
      summary.avatar = user.avatar;
    }

    if (user.bot !== undefined) {
      summary.bot = user.bot;
    }

    return summary;
  }

  private toApiUserSummary(user: APIUser): DiscordUserSummary {
    const summary: DiscordUserSummary = {
      id: user.id,
      username: user.username,
    };

    if ('global_name' in user) {
      summary.globalName = user.global_name ?? null;
    }

    if ('avatar' in user) {
      summary.avatar = user.avatar ?? null;
    }

    if ('bot' in user && user.bot !== undefined) {
      summary.bot = user.bot;
    }

    return summary;
  }
}
