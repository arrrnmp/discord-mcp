import type { APIThreadMember } from 'seyfert/lib/types/index.js';
type ThreadsQuery = { before?: string; limit?: number };

import { ToolError } from '../lib/errors.js';
import { DiscordBaseService } from './base.js';

export type DiscordThreadSummary = {
  id: string;
  guildId: string;
  parentId: string | null;
  name: string;
  type: number;
  ownerId: string | null;
  messageCount: number;
  memberCount: number;
  rateLimitPerUser: number;
  archived: boolean;
  locked: boolean;
  autoArchiveDuration: number;
  archiveTimestamp: string;
  createTimestamp?: string | null;
};

export type DiscordThreadMemberSummary = {
  threadId: string;
  userId: string;
  joinTimestamp: string;
  flags: number;
};

export class DiscordThreadsService extends DiscordBaseService {
  async listActiveThreads(guildId: string): Promise<{ threads: DiscordThreadSummary[]; members: DiscordThreadMemberSummary[] }> {
    this.assertGuildAllowed(guildId);
    const response = await this.client.proxy.guilds(guildId).threads.active.get();
    return {
      threads: (response.threads ?? []).map((t: any) => this.toThreadSummary(t)),
      members: (response.members ?? []).map((m: any) => this.toThreadMemberSummary(m)),
    };
  }

  async listPublicArchivedThreads(guildId: string, channelId: string, options?: { before?: string; limit?: number }): Promise<{ threads: DiscordThreadSummary[]; members: DiscordThreadMemberSummary[]; hasMore: boolean }> {
    this.assertGuildAllowed(guildId);
    await this.assertThreadParentGuild(guildId, channelId, 'thread.archived.public.list');
    const query: ThreadsQuery = {};
    if (options?.before) query.before = options.before;
    if (options?.limit) query.limit = options.limit;

    const response = await this.client.proxy.channels(channelId).threads.archived.public.get({ query });
    return {
      threads: (response.threads ?? []).map((t: any) => this.toThreadSummary(t)),
      members: (response.members ?? []).map((m: any) => this.toThreadMemberSummary(m)),
      hasMore: response.has_more,
    };
  }

  async listPrivateArchivedThreads(guildId: string, channelId: string, options?: { before?: string; limit?: number }): Promise<{ threads: DiscordThreadSummary[]; members: DiscordThreadMemberSummary[]; hasMore: boolean }> {
    this.assertGuildAllowed(guildId);
    await this.assertThreadParentGuild(guildId, channelId, 'thread.archived.private.list');
    const query: ThreadsQuery = {};
    if (options?.before) query.before = options.before;
    if (options?.limit) query.limit = options.limit;

    const response = await this.client.proxy.channels(channelId).threads.archived.private.get({ query });
    return {
      threads: (response.threads ?? []).map((t: any) => this.toThreadSummary(t)),
      members: (response.members ?? []).map((m: any) => this.toThreadMemberSummary(m)),
      hasMore: response.has_more,
    };
  }

  async listJoinedPrivateArchivedThreads(guildId: string, channelId: string, options?: { before?: string; limit?: number }): Promise<{ threads: DiscordThreadSummary[]; members: DiscordThreadMemberSummary[]; hasMore: boolean }> {
    this.assertGuildAllowed(guildId);
    await this.assertThreadParentGuild(guildId, channelId, 'thread.archived.private.joined.list');
    const query: ThreadsQuery = {};
    if (options?.before) query.before = options.before;
    if (options?.limit) query.limit = options.limit;

    const response = await this.client.proxy.channels(channelId).threads.archived.private.get({ query }); // Seyfert uses same for joined
    return {
      threads: (response.threads ?? []).map((t: any) => this.toThreadSummary(t)),
      members: (response.members ?? []).map((m: any) => this.toThreadMemberSummary(m)),
      hasMore: response.has_more,
    };
  }

  async fetchThreadMember(guildId: string, threadId: string, userId: string): Promise<DiscordThreadMemberSummary> {
    this.assertGuildAllowed(guildId);
    const member = await this.client.proxy.channels(threadId)['thread-members'](userId).get();
    return this.toThreadMemberSummary(member);
  }

  async listThreadMembers(guildId: string, threadId: string, options?: { after?: string; limit?: number }): Promise<DiscordThreadMemberSummary[]> {
    this.assertGuildAllowed(guildId);
    const query: any = {};
    if (options?.after) query.after = options.after;
    if (options?.limit) query.limit = options.limit;

    const members = await this.client.proxy.channels(threadId)['thread-members'].get({ query });
    return (members as any[]).map((m) => this.toThreadMemberSummary(m));
  }

  async addThreadMember(guildId: string, threadId: string, userId: string): Promise<void> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'thread.member.add', { channelId: threadId, memberId: userId }));
    if (this.config.dryRun) this.throwDryRun('thread.member.add', { guildId, threadId, userId });
    await this.client.proxy.channels(threadId)['thread-members'](userId).put();
  }

  async removeMemberFromThread(guildId: string, threadId: string, userId: string, options: { reason?: string; confirm?: boolean }): Promise<void> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'thread.member.remove', { guildId, threadId, userId });
    this.auditMutation(this.buildMutationContext(guildId, 'thread.member.remove', {
      channelId: threadId,
      memberId: userId,
      ...(options.reason !== undefined && { reason: options.reason }),
      ...(options.confirm !== undefined && { confirm: options.confirm }),
    }));
    if (this.config.dryRun) this.throwDryRun('thread.member.remove', { guildId, threadId, userId });
    await this.client.proxy.channels(threadId)['thread-members'](userId).delete();
  }

  async createThread(guildId: string, channelId: string, body: any, reason?: string): Promise<DiscordThreadSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'thread.create', {
      channelId,
      ...(reason !== undefined && { reason }),
    }));
    if (this.config.dryRun) this.throwDryRun('thread.create', { guildId, channelId });
    const thread = await this.client.proxy.channels(channelId).threads.post({
      body,
      ...(reason !== undefined && { reason }),
    });
    return this.toThreadSummary(thread as any);
  }

  async updateThread(guildId: string, threadId: string, options: any, reason?: string): Promise<DiscordThreadSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'thread.update', {
      channelId: threadId,
      ...(reason !== undefined && { reason }),
    }));
    if (this.config.dryRun) this.throwDryRun('thread.update', { guildId, threadId });
    const thread = await this.client.proxy.channels(threadId).patch({
      body: options,
      ...(reason !== undefined && { reason }),
    });
    return this.toThreadSummary(thread as any);
  }

  async joinThread(guildId: string, threadId: string): Promise<void> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'thread.join', { channelId: threadId }));
    if (this.config.dryRun) this.throwDryRun('thread.join', { guildId, threadId });
    await this.client.proxy.channels(threadId)['thread-members']('@me').put();
  }

  async leaveThread(guildId: string, threadId: string): Promise<void> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'thread.leave', { channelId: threadId }));
    if (this.config.dryRun) this.throwDryRun('thread.leave', { guildId, threadId });
    await this.client.proxy.channels(threadId)['thread-members']('@me').delete();
  }

  async lockThread(guildId: string, threadId: string, options?: { locked?: boolean; reason?: string; confirm?: boolean }): Promise<DiscordThreadSummary> {
    this.assertGuildAllowed(guildId);
    const locked = options?.locked ?? true;
    this.auditMutation(this.buildMutationContext(guildId, 'thread.lock', {
      channelId: threadId,
      ...(options?.reason !== undefined && { reason: options.reason }),
      ...(options?.confirm !== undefined && { confirm: options.confirm }),
    }));
    if (this.config.dryRun) this.throwDryRun('thread.lock', { guildId, threadId, locked });
    const thread = await this.client.proxy.channels(threadId).patch({
      body: { locked },
      ...(options?.reason !== undefined && { reason: options.reason }),
    });
    return this.toThreadSummary(thread as any);
  }

  async unlockThread(guildId: string, threadId: string, options?: { reason?: string; confirm?: boolean }): Promise<DiscordThreadSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'thread.unlock', {
      channelId: threadId,
      ...(options?.reason !== undefined && { reason: options.reason }),
      ...(options?.confirm !== undefined && { confirm: options.confirm }),
    }));
    if (this.config.dryRun) this.throwDryRun('thread.unlock', { guildId, threadId });
    const thread = await this.client.proxy.channels(threadId).patch({
      body: { locked: false },
      ...(options?.reason !== undefined && { reason: options.reason }),
    });
    return this.toThreadSummary(thread as any);
  }

  async deleteThread(guildId: string, threadId: string, options: { reason?: string; confirm?: boolean }): Promise<DiscordThreadSummary> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'thread.delete', { guildId, threadId });
    this.auditMutation(this.buildMutationContext(guildId, 'thread.delete', {
      channelId: threadId,
      ...(options.reason !== undefined && { reason: options.reason }),
      ...(options.confirm !== undefined && { confirm: options.confirm }),
    }));
    if (this.config.dryRun) this.throwDryRun('thread.delete', { guildId, threadId });
    const thread = await this.client.proxy.channels(threadId).delete({
      ...(options.reason !== undefined && { reason: options.reason }),
    });
    return this.toThreadSummary(thread as any);
  }

  private toThreadSummary(thread: any): DiscordThreadSummary {
    return {
      id: thread.id,
      guildId: thread.guild_id,
      parentId: thread.parent_id,
      name: thread.name,
      type: thread.type,
      ownerId: thread.owner_id,
      messageCount: thread.message_count,
      memberCount: thread.member_count,
      rateLimitPerUser: thread.rate_limit_per_user,
      archived: thread.thread_metadata?.archived ?? false,
      locked: thread.thread_metadata?.locked ?? false,
      autoArchiveDuration: thread.thread_metadata?.auto_archive_duration ?? 0,
      archiveTimestamp: thread.thread_metadata?.archive_timestamp,
      createTimestamp: thread.thread_metadata?.create_timestamp,
    };
  }

  private toThreadMemberSummary(member: any): DiscordThreadMemberSummary {
    return {
      threadId: member.id,
      userId: member.user_id,
      joinTimestamp: member.join_timestamp,
      flags: member.flags,
    };
  }

  private async assertThreadParentGuild(guildId: string, channelId: string, action: string): Promise<void> {
    const channel = await this.client.channels.raw(channelId, true);
    if ((channel as any).guild_id !== guildId) {
      throw new ToolError('UNAUTHORIZED_GUILD', `Thread parent ${channelId} is not in allowed guild ${guildId}`, {
        status: 403,
        details: { action, channelId, guildId: (channel as any).guild_id, expectedGuildId: guildId },
      });
    }
  }
}
