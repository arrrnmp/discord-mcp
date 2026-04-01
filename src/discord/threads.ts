import type { ThreadChannelStructure } from 'seyfert/lib/client/transformers.js';
import type { ThreadCreateBodyRequest } from 'seyfert/lib/common/index.js';
import type { HttpClient } from 'seyfert/lib/client/httpclient.js';
import type { RESTPatchAPIChannelJSONBody } from 'seyfert/lib/types/index.js';

import type { AppConfig } from '../config/env.js';
import { ToolError } from '../lib/errors.js';
import { logger } from '../lib/logging.js';

type MutationContext = {
  guildId: string;
  action: string;
  memberId?: string;
  reason?: string;
  confirm?: boolean;
};

export type DiscordThreadSummary = {
  id: string;
  guildId: string;
  parentId: string;
  ownerId?: string;
  name: string;
  type: number;
  archived?: boolean;
  locked?: boolean;
  autoArchiveDuration?: number;
  messageCount?: number;
  memberCount?: number;
};

export class DiscordThreadsService {
  constructor(
    private readonly client: HttpClient,
    private readonly config: AppConfig,
  ) {}

  async createThread(
    guildId: string,
    channelId: string,
    body: ThreadCreateBodyRequest,
    reason?: string,
  ): Promise<DiscordThreadSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'thread.create', this.buildMutationOptions(reason)));

    if (this.config.dryRun) {
      this.throwDryRun('thread.create', { guildId, channelId, body });
    }

    const thread = await this.client.threads.create(channelId, body, reason);
    this.assertThreadGuild(thread, guildId, 'thread.create');
    return this.toThreadSummary(thread);
  }

  async editThread(
    guildId: string,
    threadId: string,
    body: RESTPatchAPIChannelJSONBody,
    reason?: string,
  ): Promise<DiscordThreadSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'thread.update', this.buildMutationOptions(reason)));

    if (this.config.dryRun) {
      this.throwDryRun('thread.update', { guildId, threadId, body });
    }

    const thread = await this.client.threads.edit(threadId, body, reason);
    this.assertThreadGuild(thread, guildId, 'thread.update');
    return this.toThreadSummary(thread);
  }

  async updateThread(
    guildId: string,
    threadId: string,
    body: RESTPatchAPIChannelJSONBody,
    reason?: string,
  ): Promise<DiscordThreadSummary> {
    return this.editThread(guildId, threadId, body, reason);
  }

  async joinThread(guildId: string, threadId: string): Promise<void> {
    this.assertGuildAllowed(guildId);
    await this.assertThreadBelongsToGuild(guildId, threadId, 'thread.join');
    this.auditMutation(this.buildMutationContext(guildId, 'thread.join'));

    if (this.config.dryRun) {
      this.throwDryRun('thread.join', { guildId, threadId });
    }

    await this.client.threads.join(threadId);
  }

  async leaveThread(guildId: string, threadId: string): Promise<void> {
    this.assertGuildAllowed(guildId);
    await this.assertThreadBelongsToGuild(guildId, threadId, 'thread.leave');
    this.auditMutation(this.buildMutationContext(guildId, 'thread.leave'));

    if (this.config.dryRun) {
      this.throwDryRun('thread.leave', { guildId, threadId });
    }

    await this.client.threads.leave(threadId);
  }

  async lockThread(
    guildId: string,
    threadId: string,
    options: { locked?: boolean; reason?: string; confirm?: boolean },
  ): Promise<DiscordThreadSummary> {
    this.assertGuildAllowed(guildId);
    await this.assertThreadBelongsToGuild(guildId, threadId, 'thread.lock');
    if ((options.locked ?? true) === true) {
      this.assertConfirm(options.confirm, 'thread.lock', { guildId, threadId });
    }
    this.auditMutation(this.buildMutationContext(guildId, 'thread.lock', options));

    if (this.config.dryRun) {
      this.throwDryRun('thread.lock', { guildId, threadId, locked: options.locked });
    }

    const thread = await this.client.threads.lock(threadId, options.locked, options.reason);
    this.assertThreadGuild(thread, guildId, 'thread.lock');
    return this.toThreadSummary(thread);
  }

  async unlockThread(
    guildId: string,
    threadId: string,
    options: { reason?: string; confirm?: boolean },
  ): Promise<DiscordThreadSummary> {
    this.assertGuildAllowed(guildId);
    await this.assertThreadBelongsToGuild(guildId, threadId, 'thread.unlock');
    this.auditMutation(this.buildMutationContext(guildId, 'thread.unlock', options));

    if (this.config.dryRun) {
      this.throwDryRun('thread.unlock', { guildId, threadId });
    }

    const thread = await this.client.threads.lock(threadId, false, options.reason);
    this.assertThreadGuild(thread, guildId, 'thread.unlock');
    return this.toThreadSummary(thread);
  }

  async deleteThread(
    guildId: string,
    threadId: string,
    options: { reason?: string; confirm?: boolean },
  ): Promise<DiscordThreadSummary> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'thread.delete', { guildId, threadId });
    await this.assertThreadBelongsToGuild(guildId, threadId, 'thread.delete');
    this.auditMutation(this.buildMutationContext(guildId, 'thread.delete', options));

    if (this.config.dryRun) {
      this.throwDryRun('thread.delete', { guildId, threadId });
    }

    const deleteOptions: { guildId: string; reason?: string } = { guildId };

    if (options.reason !== undefined) {
      deleteOptions.reason = options.reason;
    }

    const deletedThread = await this.client.channels.delete(threadId, deleteOptions);

    return this.toThreadSummary(this.assertThreadType(deletedThread, 'thread.delete'));
  }

  async removeMemberFromThread(
    guildId: string,
    threadId: string,
    memberId: string,
    options: { reason?: string; confirm?: boolean },
  ): Promise<void> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'thread.member.remove', { guildId, threadId, memberId });
    await this.assertThreadBelongsToGuild(guildId, threadId, 'thread.member.remove');
    this.auditMutation(this.buildMutationContext(guildId, 'thread.member.remove', { ...options, memberId }));

    if (this.config.dryRun) {
      this.throwDryRun('thread.member.remove', { guildId, threadId, memberId });
    }

    await this.client.threads.removeMember(threadId, memberId);
  }

  private toThreadSummary(thread: ThreadChannelStructure): DiscordThreadSummary {
    const summary: DiscordThreadSummary = {
      id: thread.id,
      guildId: thread.guildId,
      parentId: thread.parentId,
      name: thread.name,
      type: thread.type,
    };

    if (typeof thread.ownerId === 'string') {
      summary.ownerId = thread.ownerId;
    }

    if (thread.threadMetadata) {
      summary.archived = thread.threadMetadata.archived;
      summary.locked = thread.threadMetadata.locked;
      summary.autoArchiveDuration = thread.threadMetadata.autoArchiveDuration;
    }

    if (typeof thread.messageCount === 'number') {
      summary.messageCount = thread.messageCount;
    }

    if (typeof thread.memberCount === 'number') {
      summary.memberCount = thread.memberCount;
    }

    return summary;
  }

  private assertThreadType(channel: unknown, action: string): ThreadChannelStructure {
    if (this.isThreadChannel(channel)) {
      return channel;
    }

    throw new ToolError('BAD_REQUEST', `Action ${action} expected a thread channel response`, {
      status: 400,
      details: {
        action,
      },
    });
  }

  private isThreadChannel(channel: unknown): channel is ThreadChannelStructure {
    if (!channel || typeof channel !== 'object') {
      return false;
    }

    const candidate = channel as Partial<ThreadChannelStructure>;
    return typeof candidate.guildId === 'string' && typeof candidate.parentId === 'string';
  }

  private assertThreadGuild(thread: ThreadChannelStructure, guildId: string, action: string): void {
    if (thread.guildId === guildId) {
      return;
    }

    throw new ToolError('UNAUTHORIZED_GUILD', `Thread ${thread.id} is not in allowed guild ${guildId}`, {
      status: 403,
      details: {
        action,
        threadId: thread.id,
        guildId: thread.guildId,
        expectedGuildId: guildId,
      },
    });
  }

  private async assertThreadBelongsToGuild(guildId: string, threadId: string, action: string): Promise<void> {
    const channel = await this.client.channels.fetch(threadId, true);
    const thread = this.assertThreadType(channel, action);
    this.assertThreadGuild(thread, guildId, action);
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
    options?: { memberId?: string; reason?: string; confirm?: boolean },
  ): MutationContext {
    const context: MutationContext = { guildId, action };

    if (options?.memberId !== undefined) {
      context.memberId = options.memberId;
    }

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

  private auditMutation(ctx: MutationContext): void {
    logger.info('discord.mutation', {
      action: ctx.action,
      guildId: ctx.guildId,
      memberId: ctx.memberId,
      reason: ctx.reason,
      confirm: ctx.confirm ?? false,
      dryRun: this.config.dryRun,
    });
  }
}

export { DiscordThreadsService as DiscordThreadDomain };
