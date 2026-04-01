import { ToolError } from '../lib/errors.js';
import { DiscordBaseService } from './base.js';

export type StageInstanceSummary = {
  id: string;
  channelId: string;
  guildId: string;
  topic: string;
  privacyLevel: number;
  discoverableDisabled: boolean;
};

export type ActiveThreadsSummary = {
  threads: Array<{
    id: string;
    name: string;
    parentId?: string;
    ownerId?: string;
    archived: boolean;
    locked: boolean;
    messageCount?: number;
    memberCount?: number;
  }>;
  members: Array<{
    id?: string;
    userId?: string;
    joinTimestamp?: number;
  }>;
};

export type GuildPreviewSummary = {
  id: string;
  name: string;
  icon?: string | null;
  splash?: string | null;
  discoverySplash?: string | null;
  emojis: Array<{ id?: string; name?: string }>;
  features: string[];
  approximateMemberCount?: number;
  approximatePresenceCount?: number;
  description?: string | null;
};

export class DiscordStageService extends DiscordBaseService {
  async createStageInstance(
    guildId: string,
    options: {
      channelId: string;
      topic: string;
      privacyLevel?: number;
      sendStartNotification?: boolean;
      reason?: string;
    },
  ): Promise<StageInstanceSummary> {
    this.assertGuildAllowed(guildId);

    const channel = await this.fetchAndAssertGuildChannel(guildId, options.channelId, 'stage.create');

    this.auditMutation(
      this.buildMutationContext(guildId, 'stage.create', {
        channelId: options.channelId,
        reason: options.reason,
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('stage.create', { guildId, channelId: options.channelId });
    }

    const payload: {
      channel_id: string;
      topic: string;
      privacy_level?: number;
      send_start_notification?: boolean;
    } = {
      channel_id: options.channelId,
      topic: options.topic,
    };

    if (options.privacyLevel !== undefined) {
      payload.privacy_level = options.privacyLevel;
    }
    if (options.sendStartNotification !== undefined) {
      payload.send_start_notification = options.sendStartNotification;
    }

    const stage = await this.client.proxy['stage-instances'].post({
      body: payload,
      reason: options.reason,
    });

    return this.toStageInstanceSummary(stage);
  }

  async fetchStageInstance(channelId: string): Promise<StageInstanceSummary> {
    const stage = await this.client.proxy['stage-instances'](channelId).get();
    this.assertGuildAllowed(stage.guild_id);
    return this.toStageInstanceSummary(stage);
  }

  async updateStageInstance(
    channelId: string,
    options: {
      topic?: string;
      privacyLevel?: number;
      reason?: string;
    },
  ): Promise<StageInstanceSummary> {
    const existing = await this.client.proxy['stage-instances'](channelId).get();
    this.assertGuildAllowed(existing.guild_id);

    if (options.topic === undefined && options.privacyLevel === undefined) {
      throw new ToolError('BAD_REQUEST', 'At least one field must be provided for update', {
        status: 400,
        details: { channelId },
      });
    }

    this.auditMutation(
      this.buildMutationContext(existing.guild_id, 'stage.update', {
        channelId,
        reason: options.reason,
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('stage.update', { guildId: existing.guild_id, channelId });
    }

    const payload: {
      topic?: string;
      privacy_level?: number;
    } = {};

    if (options.topic !== undefined) {
      payload.topic = options.topic;
    }
    if (options.privacyLevel !== undefined) {
      payload.privacy_level = options.privacyLevel;
    }

    const stage = await this.client.proxy['stage-instances'](channelId).patch({
      body: payload,
      reason: options.reason,
    });

    return this.toStageInstanceSummary(stage);
  }

  async deleteStageInstance(
    channelId: string,
    options: {
      reason?: string;
      confirm?: boolean;
    },
  ): Promise<void> {
    const existing = await this.client.proxy['stage-instances'](channelId).get();
    this.assertGuildAllowed(existing.guild_id);
    this.assertConfirm(options.confirm, 'stage.delete', { guildId: existing.guild_id, channelId });

    this.auditMutation(
      this.buildMutationContext(existing.guild_id, 'stage.delete', {
        channelId,
        reason: options.reason,
        confirm: options.confirm,
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('stage.delete', { guildId: existing.guild_id, channelId });
    }

    await this.client.proxy['stage-instances'](channelId).delete({
      reason: options.reason,
    });
  }

  async listActiveThreads(guildId: string): Promise<ActiveThreadsSummary> {
    this.assertGuildAllowed(guildId);

    const response = await this.client.proxy.guilds(guildId).threads.active.get();

    return {
      threads:
        response.threads?.map((thread: any) => ({
          id: thread.id,
          name: thread.name ?? '',
          parentId: thread.parent_id,
          ownerId: thread.owner_id,
          archived: thread.thread_metadata?.archived ?? false,
          locked: thread.thread_metadata?.locked ?? false,
          messageCount: thread.message_count,
          memberCount: thread.member_count,
        })) ?? [],
      members:
        response.members?.map((member: any) => {
          const result: { id?: string; userId?: string; joinTimestamp?: number } = {};
          if (member.id !== undefined) result.id = member.id;
          if (member.user_id !== undefined) result.userId = member.user_id;
          if (member.join_timestamp !== undefined) {
            result.joinTimestamp = new Date(member.join_timestamp).getTime();
          }
          return result;
        }) ?? [],
    };
  }

  async getGuildPreview(guildId: string): Promise<GuildPreviewSummary> {
    const preview = await this.client.proxy.guilds(guildId).preview.get();

    return {
      id: preview.id,
      name: preview.name,
      icon: preview.icon,
      splash: preview.splash,
      discoverySplash: preview.discovery_splash,
      emojis:
        preview.emojis?.map((emoji: any) => ({
          id: emoji.id,
          name: emoji.name,
        })) ?? [],
      features: preview.features ?? [],
      approximateMemberCount: preview.approximate_member_count,
      approximatePresenceCount: preview.approximate_presence_count,
      description: preview.description,
    };
  }

  private toStageInstanceSummary(stage: any): StageInstanceSummary {
    return {
      id: stage.id,
      channelId: stage.channel_id,
      guildId: stage.guild_id,
      topic: stage.topic,
      privacyLevel: stage.privacy_level,
      discoverableDisabled: stage.discoverable_disabled ?? false,
    };
  }

  protected async fetchAndAssertGuildChannel(
    guildId: string,
    channelId: string,
    action: string,
  ): Promise<any> {
    const channel = await this.client.channels.raw(channelId, true);
    const candidate = channel as { guild_id?: unknown; type?: unknown };

    if (typeof candidate.guild_id !== 'string') {
      throw new ToolError('BAD_REQUEST', `Channel ${channelId} is not a guild channel`, {
        status: 400,
        details: {
          action,
          channelId,
        },
      });
    }

    if (candidate.guild_id !== guildId) {
      throw new ToolError('UNAUTHORIZED_GUILD', `Channel ${channelId} is not in allowed guild ${guildId}`, {
        status: 403,
        details: {
          action,
          channelId,
          guildId: candidate.guild_id,
          expectedGuildId: guildId,
        },
      });
    }

    return channel;
  }
}
