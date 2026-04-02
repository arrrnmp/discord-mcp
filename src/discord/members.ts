import type { GuildBanStructure, GuildMemberStructure } from 'seyfert/lib/client/transformers.js';
import type {
  APIVoiceState,
  RESTGetAPIGuildBansQuery,
  RESTGetAPIGuildMembersQuery,
  RESTPatchAPIGuildVoiceStateCurrentMemberJSONBody,
  RESTPatchAPIGuildVoiceStateUserJSONBody,
  RESTPatchAPIGuildMemberJSONBody,
  RESTPostAPIGuildBulkBanJSONBody,
  RESTPutAPIGuildBanJSONBody,
} from 'seyfert/lib/types/index.js';

import { ToolError } from '../lib/errors.js';
import { DiscordBaseService } from './base.js';

export type DiscordMemberSummary = {
  id: string;
  guildId: string;
  username: string;
  globalName: string | null;
  displayName: string;
  nickname: string | null;
  roleIds: string[];
  joinedTimestamp?: number;
  communicationDisabledUntilTimestamp?: number | null;
  pending?: boolean;
  bot?: boolean;
};

export type ListMembersOptions = {
  limit?: number | undefined;
  after?: string | undefined;
  force?: boolean | undefined;
};

export type SearchMembersOptions = {
  query: string;
  limit?: number | undefined;
};

export type EditMemberBasicsOptions = {
  nickname?: string | null | undefined;
  timeoutSeconds?: number | null | undefined;
  reason?: string | undefined;
};

export type ListGuildBansOptions = {
  limit?: number | undefined;
  before?: string | undefined;
  after?: string | undefined;
  force?: boolean | undefined;
};

export type BanMemberOptions = {
  deleteMessageSeconds?: number | undefined;
  reason?: string | undefined;
  confirm?: boolean | undefined;
};

export type BulkBanMembersOptions = {
  userIds: string[];
  deleteMessageSeconds?: number | undefined;
  reason?: string | undefined;
  confirm?: boolean | undefined;
};

export type SetCurrentMemberVoiceStateOptions = {
  channelId?: string | undefined;
  suppress?: boolean | undefined;
  requestToSpeakTimestamp?: string | null | undefined;
  reason?: string | undefined;
};

export type SetMemberVoiceStateOptions = {
  channelId: string;
  suppress?: boolean | undefined;
  reason?: string | undefined;
};

export type DiscordGuildBanSummary = {
  guildId: string;
  userId: string;
  reason: string | null;
  username?: string;
  globalName?: string | null;
  bot?: boolean;
};

export type DiscordBulkBanSummary = {
  guildId: string;
  bannedUserIds: string[];
  failedUserIds: string[];
};

export type DiscordVoiceStateSummary = {
  guildId: string;
  userId: string;
  channelId: string | null;
  sessionId?: string;
  deaf?: boolean;
  mute?: boolean;
  selfDeaf?: boolean;
  selfMute?: boolean;
  selfStream?: boolean;
  selfVideo?: boolean;
  suppress?: boolean;
  requestToSpeakTimestamp?: string | null;
};

export class DiscordMembersService extends DiscordBaseService {
  async listMembers(guildId: string, options?: ListMembersOptions): Promise<DiscordMemberSummary[]> {
    this.assertGuildAllowed(guildId);

    const query = this.toListMembersQuery(options);
    const members = await this.client.members.list(guildId, query, options?.force ?? true);
    return members.map((member) => this.toMemberSummary(member));
  }

  async searchMembers(guildId: string, options: SearchMembersOptions): Promise<DiscordMemberSummary[]> {
    this.assertGuildAllowed(guildId);
    const query: { query: string; limit?: number } = {
      query: options.query,
    };

    if (options.limit !== undefined) {
      query.limit = options.limit;
    }

    const members = await this.client.members.search(guildId, query);

    return members.map((member) => this.toMemberSummary(member));
  }

  async fetchMember(guildId: string, memberId: string, force = true): Promise<DiscordMemberSummary> {
    this.assertGuildAllowed(guildId);
    const member = await this.client.members.fetch(guildId, memberId, force);
    return this.toMemberSummary(member);
  }

  async editMemberBasics(
    guildId: string,
    memberId: string,
    options: EditMemberBasicsOptions,
  ): Promise<DiscordMemberSummary> {
    this.assertGuildAllowed(guildId);

    const body = this.toMemberPatchBody(options);

    if (Object.keys(body).length === 0) {
      throw new ToolError('BAD_REQUEST', 'At least one of nickname or timeoutSeconds must be provided', {
        status: 400,
        details: {
          guildId,
          memberId,
        },
      });
    }

    this.auditMutation(
      this.buildMutationContext(guildId, 'member.edit', {
        memberId,
        ...(options.reason !== undefined && { reason: options.reason }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('member.edit', { guildId, memberId, body });
    }

    const member = await this.client.members.edit(guildId, memberId, body, options.reason);
    return this.toMemberSummary(member);
  }

  async kickMember(guildId: string, memberId: string, options: { reason?: string; confirm?: boolean }): Promise<void> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'member.kick', { guildId, memberId });
    this.auditMutation(
      this.buildMutationContext(guildId, 'member.kick', {
        memberId,
        ...(options.reason !== undefined && { reason: options.reason }),
        ...(options.confirm !== undefined && { confirm: options.confirm }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('member.kick', { guildId, memberId });
    }

    await this.client.members.kick(guildId, memberId, options.reason);
  }

  async setMemberTimeout(
    guildId: string,
    memberId: string,
    timeoutSeconds: number | null,
    reason?: string,
  ): Promise<DiscordMemberSummary> {
    this.assertGuildAllowed(guildId);

    if (timeoutSeconds !== null && timeoutSeconds <= 0) {
      throw new ToolError('BAD_REQUEST', 'timeoutSeconds must be a positive integer or null to clear timeout', {
        status: 400,
        details: {
          timeoutSeconds,
        },
      });
    }

    this.auditMutation(
      this.buildMutationContext(guildId, 'member.timeout', {
        memberId,
        ...(reason !== undefined && { reason }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('member.timeout', { guildId, memberId, timeoutSeconds });
    }

    const member = await this.client.members.timeout(guildId, memberId, timeoutSeconds, reason);
    return this.toMemberSummary(member);
  }

  async listGuildBans(guildId: string, options?: ListGuildBansOptions): Promise<DiscordGuildBanSummary[]> {
    this.assertGuildAllowed(guildId);

    const query = this.toListGuildBansQuery(options);
    const bans = await this.client.bans.list(guildId, query, options?.force ?? true);
    return bans.map((ban) => this.toGuildBanSummary(ban, guildId));
  }

  async fetchGuildBan(guildId: string, userId: string, force = true): Promise<DiscordGuildBanSummary> {
    this.assertGuildAllowed(guildId);
    const ban = await this.client.bans.fetch(guildId, userId, force);
    return this.toGuildBanSummary(ban, guildId);
  }

  async banMember(guildId: string, memberId: string, options: BanMemberOptions): Promise<void> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'member.ban', { guildId, memberId });
    this.assertDeleteMessageSeconds(options.deleteMessageSeconds);

    this.auditMutation(
      this.buildMutationContext(guildId, 'member.ban', {
        memberId,
        ...(options.reason !== undefined && { reason: options.reason }),
        ...(options.confirm !== undefined && { confirm: options.confirm }),
        ...(options.deleteMessageSeconds !== undefined && { deleteMessageSeconds: options.deleteMessageSeconds }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('member.ban', { guildId, memberId, deleteMessageSeconds: options.deleteMessageSeconds });
    }

    const body = this.toBanBody(options);
    await this.client.bans.create(guildId, memberId, body, options.reason);
  }

  async bulkBanMembers(guildId: string, options: BulkBanMembersOptions): Promise<DiscordBulkBanSummary> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'member.ban.bulk', { guildId, userIdsCount: options.userIds.length });

    const userIds = [...new Set(options.userIds)];
    if (userIds.length === 0) {
      throw new ToolError('BAD_REQUEST', 'At least one user ID must be provided for bulk ban', {
        status: 400,
        details: {
          userIdsCount: 0,
        },
      });
    }

    if (userIds.length > 200) {
      throw new ToolError('BAD_REQUEST', 'Bulk ban supports at most 200 user IDs per request', {
        status: 400,
        details: {
          userIdsCount: userIds.length,
        },
      });
    }

    this.assertDeleteMessageSeconds(options.deleteMessageSeconds);

    this.auditMutation(
      this.buildMutationContext(guildId, 'member.ban.bulk', {
        ...(options.reason !== undefined && { reason: options.reason }),
        ...(options.confirm !== undefined && { confirm: options.confirm }),
        userIdsCount: userIds.length,
        ...(options.deleteMessageSeconds !== undefined && { deleteMessageSeconds: options.deleteMessageSeconds }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('member.ban.bulk', {
        guildId,
        userIds,
        deleteMessageSeconds: options.deleteMessageSeconds,
      });
    }

    const body: RESTPostAPIGuildBulkBanJSONBody = {
      user_ids: userIds,
    };

    if (options.deleteMessageSeconds !== undefined) {
      body.delete_message_seconds = options.deleteMessageSeconds;
    }

    const result = await this.client.bans.bulkCreate(guildId, body, options.reason);
    return {
      guildId,
      bannedUserIds: [...result.banned_users],
      failedUserIds: [...result.failed_users],
    };
  }

  async setCurrentMemberVoiceState(
    guildId: string,
    options: SetCurrentMemberVoiceStateOptions,
  ): Promise<DiscordVoiceStateSummary> {
    this.assertGuildAllowed(guildId);
    if (options.channelId !== undefined) {
      await this.assertChannelBelongsToGuild(guildId, options.channelId, 'member.voice_state.set.current');
    }
    this.assertVoiceStateCurrentBody(options);
    this.auditMutation(
      this.buildMutationContext(guildId, 'member.voice_state.set.current', {
        ...(options.channelId !== undefined && { channelId: options.channelId }),
        ...(options.reason !== undefined && { reason: options.reason }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('member.voice_state.set.current', {
        guildId,
        options,
      });
    }

    const body: RESTPatchAPIGuildVoiceStateCurrentMemberJSONBody = {};
    if (options.channelId !== undefined) {
      body.channel_id = options.channelId;
    }
    if (options.suppress !== undefined) {
      body.suppress = options.suppress;
    }
    if (options.requestToSpeakTimestamp !== undefined) {
      body.request_to_speak_timestamp = options.requestToSpeakTimestamp;
    }

    await this.client.proxy.guilds(guildId)['voice-states']['@me'].patch({
      body,
      ...(options.reason !== undefined ? { reason: options.reason } : {}),
    });

    const voiceState = await this.client.proxy.guilds(guildId)['voice-states']['@me'].get();
    return this.toVoiceStateSummary(voiceState, guildId);
  }

  async setMemberVoiceState(
    guildId: string,
    memberId: string,
    options: SetMemberVoiceStateOptions,
  ): Promise<DiscordVoiceStateSummary> {
    this.assertGuildAllowed(guildId);
    await this.assertChannelBelongsToGuild(guildId, options.channelId, 'member.voice_state.set.user');
    this.auditMutation(
      this.buildMutationContext(guildId, 'member.voice_state.set.user', {
        memberId,
        channelId: options.channelId,
        ...(options.reason !== undefined && { reason: options.reason }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('member.voice_state.set.user', {
        guildId,
        memberId,
        options,
      });
    }

    const body: RESTPatchAPIGuildVoiceStateUserJSONBody = {
      channel_id: options.channelId,
    };
    if (options.suppress !== undefined) {
      body.suppress = options.suppress;
    }

    await this.client.proxy.guilds(guildId)['voice-states'](memberId).patch({
      body,
      ...(options.reason !== undefined ? { reason: options.reason } : {}),
    });

    const voiceState = await this.client.proxy.guilds(guildId)['voice-states'](memberId).get();
    return this.toVoiceStateSummary(voiceState, guildId);
  }

  async unbanMember(guildId: string, memberId: string, options: { reason?: string; confirm?: boolean }): Promise<void> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'member.unban', { guildId, memberId });
    this.auditMutation(
      this.buildMutationContext(guildId, 'member.unban', {
        memberId,
        ...(options.reason !== undefined && { reason: options.reason }),
        ...(options.confirm !== undefined && { confirm: options.confirm }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('member.unban', { guildId, memberId });
    }

    await this.client.bans.remove(guildId, memberId, options.reason);
  }

  async addRoleToMember(
    guildId: string,
    memberId: string,
    roleId: string,
    reason?: string,
  ): Promise<DiscordMemberSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(
      this.buildMutationContext(guildId, 'member.role.add', {
        memberId,
        roleId,
        ...(reason !== undefined && { reason }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('member.role.add', { guildId, memberId, roleId });
    }

    await this.client.members.addRole(guildId, memberId, roleId);
    const member = await this.client.members.fetch(guildId, memberId, true);
    return this.toMemberSummary(member);
  }

  async removeRoleFromMember(
    guildId: string,
    memberId: string,
    roleId: string,
    reason?: string,
  ): Promise<DiscordMemberSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(
      this.buildMutationContext(guildId, 'member.role.remove', {
        memberId,
        roleId,
        ...(reason !== undefined && { reason }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('member.role.remove', { guildId, memberId, roleId });
    }

    await this.client.members.removeRole(guildId, memberId, roleId);
    const member = await this.client.members.fetch(guildId, memberId, true);
    return this.toMemberSummary(member);
  }

  private toListMembersQuery(options: ListMembersOptions | undefined): RESTGetAPIGuildMembersQuery | undefined {
    const query: RESTGetAPIGuildMembersQuery = {};

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

  private toListGuildBansQuery(options: ListGuildBansOptions | undefined): RESTGetAPIGuildBansQuery | undefined {
    const query: RESTGetAPIGuildBansQuery = {};

    if (options?.limit !== undefined) {
      query.limit = options.limit;
    }

    if (options?.before !== undefined) {
      query.before = options.before;
    }

    if (options?.after !== undefined) {
      query.after = options.after;
    }

    if (Object.keys(query).length === 0) {
      return undefined;
    }

    return query;
  }

  private assertDeleteMessageSeconds(deleteMessageSeconds: number | undefined): void {
    if (deleteMessageSeconds === undefined) {
      return;
    }

    if (!Number.isInteger(deleteMessageSeconds)) {
      throw new ToolError('BAD_REQUEST', 'deleteMessageSeconds must be an integer', {
        status: 400,
        details: {
          deleteMessageSeconds,
        },
      });
    }

    if (deleteMessageSeconds < 0 || deleteMessageSeconds > 604_800) {
      throw new ToolError('BAD_REQUEST', 'deleteMessageSeconds must be between 0 and 604800', {
        status: 400,
        details: {
          deleteMessageSeconds,
        },
      });
    }
  }

  private toBanBody(options: BanMemberOptions): RESTPutAPIGuildBanJSONBody | undefined {
    const body: RESTPutAPIGuildBanJSONBody = {};

    if (options.deleteMessageSeconds !== undefined) {
      body.delete_message_seconds = options.deleteMessageSeconds;
    }

    if (Object.keys(body).length === 0) {
      return undefined;
    }

    return body;
  }

  private toMemberPatchBody(options: EditMemberBasicsOptions): RESTPatchAPIGuildMemberJSONBody {
    const body: RESTPatchAPIGuildMemberJSONBody = {};

    if (options.nickname !== undefined) {
      body.nick = options.nickname;
    }

    if (options.timeoutSeconds !== undefined) {
      if (options.timeoutSeconds !== null && options.timeoutSeconds <= 0) {
        throw new ToolError('BAD_REQUEST', 'timeoutSeconds must be a positive integer or null to clear timeout', {
          status: 400,
          details: {
            timeoutSeconds: options.timeoutSeconds,
          },
        });
      }

      body.communication_disabled_until = this.timeoutSecondsToIso(options.timeoutSeconds);
    }

    return body;
  }

  private assertVoiceStateCurrentBody(options: SetCurrentMemberVoiceStateOptions): void {
    if (
      options.channelId === undefined &&
      options.suppress === undefined &&
      options.requestToSpeakTimestamp === undefined
    ) {
      throw new ToolError(
        'BAD_REQUEST',
        'At least one of channelId, suppress, or requestToSpeakTimestamp must be provided',
        {
          status: 400,
          details: {},
        },
      );
    }
  }

  private timeoutSecondsToIso(timeoutSeconds: number | null): string | null {
    if (timeoutSeconds === null) {
      return null;
    }

    return new Date(Date.now() + timeoutSeconds * 1000).toISOString();
  }

  private async assertChannelBelongsToGuild(guildId: string, channelId: string, action: string): Promise<void> {
    const channel = await this.client.channels.fetch(channelId, true);
    const candidate = channel as { guildId?: unknown; type?: unknown };

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

    if (candidate.type !== 13) {
      throw new ToolError('BAD_REQUEST', `Channel ${channelId} must be a stage channel (type 13)`, {
        status: 400,
        details: {
          action,
          channelId,
          channelType: candidate.type,
        },
      });
    }
  }

  private toGuildBanSummary(ban: GuildBanStructure, guildId: string): DiscordGuildBanSummary {
    const banData = ban as unknown as {
      id: string;
      reason?: string | null;
      user?: {
        id: string;
        username: string;
        globalName?: string | null;
        bot?: boolean;
      };
    };

    const summary: DiscordGuildBanSummary = {
      guildId,
      userId: banData.id,
      reason: banData.reason ?? null,
    };

    if (banData.user?.username) {
      summary.username = banData.user.username;
    }

    if (banData.user?.globalName !== undefined) {
      summary.globalName = banData.user.globalName;
    }

    if (banData.user?.bot !== undefined) {
      summary.bot = banData.user.bot;
    }

    return summary;
  }

  private toVoiceStateSummary(voiceState: APIVoiceState, guildId: string): DiscordVoiceStateSummary {
    const summary: DiscordVoiceStateSummary = {
      guildId,
      userId: voiceState.user_id,
      channelId: voiceState.channel_id,
    };

    if (voiceState.session_id !== undefined) {
      summary.sessionId = voiceState.session_id;
    }

    summary.deaf = voiceState.deaf;
    summary.mute = voiceState.mute;
    summary.selfDeaf = voiceState.self_deaf;
    summary.selfMute = voiceState.self_mute;
    summary.selfVideo = voiceState.self_video;
    summary.suppress = voiceState.suppress;
    summary.requestToSpeakTimestamp = voiceState.request_to_speak_timestamp;

    if (voiceState.self_stream !== undefined) {
      summary.selfStream = voiceState.self_stream;
    }

    return summary;
  }

  private toMemberSummary(member: GuildMemberStructure): DiscordMemberSummary {
    const summary: DiscordMemberSummary = {
      id: member.id,
      guildId: member.guildId,
      username: member.username,
      globalName: member.globalName,
      displayName: member.displayName,
      nickname: member.nick ?? null,
      roleIds: member.roles.keys.filter((roleId) => roleId !== member.guildId),
    };

    if (member.joinedTimestamp !== undefined) {
      summary.joinedTimestamp = member.joinedTimestamp;
    }

    if (member.communicationDisabledUntilTimestamp !== undefined) {
      summary.communicationDisabledUntilTimestamp = member.communicationDisabledUntilTimestamp;
    }

    if (member.pending !== undefined) {
      summary.pending = member.pending;
    }

    if (member.bot !== undefined) {
      summary.bot = member.bot;
    }

    return summary;
  }
}
