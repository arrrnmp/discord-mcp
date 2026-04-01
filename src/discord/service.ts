import { type HttpClient } from 'seyfert/lib/client/httpclient.js';
import type { GuildChannelTypes } from 'seyfert/lib/structures/channels.js';
import type {
  APIGuild,
  APIChannel,
  APIRole,
  APIVoiceRegion,
  OverwriteType,
  RESTAPIPartialCurrentUserGuild,
  RESTPatchAPIChannelJSONBody,
  RESTPatchAPIGuildRoleJSONBody,
  RESTPostAPIGuildChannelJSONBody,
  RESTPostAPIGuildRoleJSONBody,
} from 'seyfert/lib/types/index.js';

import type {
  DiscordChannelPermissionOverwriteSummary,
  DiscordChannelSummary,
  DiscordGuildSummary,
  DiscordRoleSummary,
} from '../types/discord.js';
import { DiscordBaseService } from './base.js';

export type DiscordVoiceRegionSummary = {
  id: string;
  name: string;
  optimal: boolean;
  deprecated: boolean;
  custom: boolean;
};

export class DiscordService extends DiscordBaseService {
  async listGuilds(): Promise<DiscordGuildSummary[]> {
    const guilds = await this.client.proxy.users('@me').guilds.get({
      query: {
        with_counts: true,
      },
    });

    return guilds.map((guild) => this.toCurrentUserGuildSummary(guild));
  }

  async getGuildRaw(guildId: string, force = true): Promise<APIGuild> {
    this.assertGuildAllowed(guildId);
    return this.client.guilds.raw(guildId, { force });
  }

  async getGuildInventory(guildId: string, force = true): Promise<{
    guild: DiscordGuildSummary;
    channels: DiscordChannelSummary[];
    categories: DiscordChannelSummary[];
    roles: DiscordRoleSummary[];
  }> {
    this.assertGuildAllowed(guildId);

    const [guildRaw, channels, roles] = await Promise.all([
      this.client.guilds.raw(guildId, { force }),
      this.client.guilds.channels.list(guildId, force),
      this.client.roles.list(guildId, force),
    ]);

    const guildSummary = this.toApiGuildSummary(guildRaw);
    const channelSummaries = channels.map((channel) =>
      this.toChannelSummary(channel as unknown as APIChannel),
    );

    const categoryType = 4;

    return {
      guild: guildSummary,
      channels: channelSummaries,
      categories: channelSummaries.filter((channel) => channel.type === categoryType),
      roles: roles.map((role) => this.toRoleSummary(role as unknown as APIRole, guildId)),
    };
  }

  async listGuildVoiceRegions(guildId: string): Promise<DiscordVoiceRegionSummary[]> {
    this.assertGuildAllowed(guildId);
    const regions = await this.client.proxy.guilds(guildId).regions.get();
    return regions.map((region) => this.toVoiceRegionSummary(region));
  }

  async listVoiceRegions(): Promise<DiscordVoiceRegionSummary[]> {
    const regions = await this.client.proxy.voice.region.get();
    return regions.map((region) => this.toVoiceRegionSummary(region));
  }

  async modifyGuildChannelPositions(
    guildId: string,
    positions: Array<{
      id: string;
      position: number | null;
      lockPermissions?: boolean | undefined;
      parentId?: string | null | undefined;
    }>,
    options: {
      reason?: string;
      confirm?: boolean;
    },
  ): Promise<void> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'channel.reorder', { guildId });

    this.auditMutation(
      this.buildMutationContext(guildId, 'channel.reorder', {
        reason: options.reason,
        confirm: options.confirm,
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('channel.reorder', { guildId, count: positions.length });
    }

    const payload = positions.map((pos) => ({
      id: pos.id,
      ...(pos.position !== null ? { position: pos.position } : {}),
      ...(pos.lockPermissions !== undefined ? { lock_permissions: pos.lockPermissions } : {}),
      ...(pos.parentId !== undefined ? { parent_id: pos.parentId } : {}),
    }));

    await this.client.proxy.guilds(guildId).channels.patch({
      body: payload as any,
      reason: options.reason,
    });
  }

  async modifyGuildRolePositions(
    guildId: string,
    positions: Array<{
      id: string;
      position: number | null;
    }>,
    options: {
      reason?: string;
      confirm?: boolean;
    },
  ): Promise<DiscordRoleSummary[]> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'role.reorder', { guildId });

    this.auditMutation(
      this.buildMutationContext(guildId, 'role.reorder', {
        reason: options.reason,
        confirm: options.confirm,
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('role.reorder', { guildId, count: positions.length });
    }

    const payload = positions.map((pos) => ({
      id: pos.id,
      ...(pos.position !== null ? { position: pos.position } : {}),
    }));

    const roles = await this.client.proxy.guilds(guildId).roles.patch({
      body: payload as any,
      reason: options.reason,
    });

    return (roles as APIRole[]).map((role: APIRole) => this.toRoleSummary(role, guildId));
  }

  async createChannel(
    guildId: string,
    body: RESTPostAPIGuildChannelJSONBody & { type: GuildChannelTypes },
    reason?: string,
  ): Promise<DiscordChannelSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'channel.create', { reason }));

    if (this.config.dryRun) {
      this.throwDryRun('channel.create', { guildId, body });
    }

    const channel = await this.client.guilds.channels.create(guildId, body, reason);
    return this.toChannelSummary(channel as unknown as APIChannel);
  }

  async updateChannel(
    guildId: string,
    channelId: string,
    body: RESTPatchAPIChannelJSONBody,
    reason?: string,
  ): Promise<DiscordChannelSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'channel.update', { channelId, reason }));

    if (this.config.dryRun) {
      this.throwDryRun('channel.update', { guildId, channelId, body });
    }

    const channel = await this.client.guilds.channels.edit(guildId, channelId, body, reason);
    return this.toChannelSummary(channel as unknown as APIChannel);
  }

  async deleteChannel(
    guildId: string,
    channelId: string,
    options: { reason?: string; confirm?: boolean },
  ): Promise<DiscordChannelSummary> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'channel.delete', { guildId, channelId });
    this.auditMutation(this.buildMutationContext(guildId, 'channel.delete', options));

    if (this.config.dryRun) {
      this.throwDryRun('channel.delete', { guildId, channelId });
    }

    const channel = await this.client.guilds.channels.delete(guildId, channelId, options.reason);
    return this.toChannelSummary(channel as unknown as APIChannel);
  }

  async createRole(
    guildId: string,
    body: RESTPostAPIGuildRoleJSONBody,
    reason?: string,
  ): Promise<DiscordRoleSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'role.create', { reason }));

    if (this.config.dryRun) {
      this.throwDryRun('role.create', { guildId, body });
    }

    const role = await this.client.roles.create(guildId, body, reason);
    return this.toRoleSummary(role as unknown as APIRole, guildId);
  }

  async updateRole(
    guildId: string,
    roleId: string,
    body: RESTPatchAPIGuildRoleJSONBody,
    reason?: string,
  ): Promise<DiscordRoleSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'role.update', { roleId, reason }));

    if (this.config.dryRun) {
      this.throwDryRun('role.update', { guildId, roleId, body });
    }

    const role = await this.client.roles.edit(guildId, roleId, body, reason);
    return this.toRoleSummary(role as unknown as APIRole, guildId);
  }

  async deleteRole(
    guildId: string,
    roleId: string,
    options: { reason?: string; confirm?: boolean },
  ): Promise<void> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'role.delete', { guildId, roleId });
    this.auditMutation(this.buildMutationContext(guildId, 'role.delete', options));

    if (this.config.dryRun) {
      this.throwDryRun('role.delete', { guildId, roleId });
    }

    await this.client.roles.delete(guildId, roleId, options.reason);
  }

  async listChannelPermissionOverwrites(guildId: string, channelId: string): Promise<{
    channelId: string;
    guildId: string;
    overwrites: DiscordChannelPermissionOverwriteSummary[];
  }> {
    this.assertGuildAllowed(guildId);
    const channel = await this.fetchAndAssertGuildChannel(guildId, channelId, 'channel.permission_overwrite.list');
    const overwrites = this.extractPermissionOverwrites(channel);

    return {
      channelId,
      guildId,
      overwrites,
    };
  }

  async setChannelPermissionOverwrite(
    guildId: string,
    channelId: string,
    overwriteId: string,
    overwrite: {
      type: 0 | 1;
      allow?: string;
      deny?: string;
    },
    reason?: string,
  ): Promise<{
    channelId: string;
    guildId: string;
    overwrite: DiscordChannelPermissionOverwriteSummary | null;
  }> {
    this.assertGuildAllowed(guildId);
    await this.fetchAndAssertGuildChannel(guildId, channelId, 'channel.permission_overwrite.set');
    this.auditMutation(
      this.buildMutationContext(guildId, 'channel.permission_overwrite.set', {
        channelId,
        overwriteId,
        reason,
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('channel.permission_overwrite.set', {
        guildId,
        channelId,
        overwriteId,
        overwrite,
      });
    }

    const payload: {
      type: OverwriteType;
      allow?: Array<bigint>;
      deny?: Array<bigint>;
    } = {
      type: overwrite.type as OverwriteType,
    };

    if (overwrite.allow !== undefined) {
      payload.allow = [BigInt(overwrite.allow)];
    }

    if (overwrite.deny !== undefined) {
      payload.deny = [BigInt(overwrite.deny)];
    }
    await this.client.channels.editOverwrite(channelId, overwriteId, payload, {
      guildId,
      ...(reason !== undefined ? { reason } : {}),
    });

    const updated = await this.fetchAndAssertGuildChannel(guildId, channelId, 'channel.permission_overwrite.set');
    const overwrites = this.extractPermissionOverwrites(updated);
    const persisted = overwrites.find((item) => item.id === overwriteId) ?? null;

    return {
      channelId,
      guildId,
      overwrite: persisted,
    };
  }

  async deleteChannelPermissionOverwrite(
    guildId: string,
    channelId: string,
    overwriteId: string,
    options: { reason?: string; confirm?: boolean },
  ): Promise<{
    channelId: string;
    guildId: string;
    overwriteId: string;
  }> {
    this.assertGuildAllowed(guildId);
    await this.fetchAndAssertGuildChannel(guildId, channelId, 'channel.permission_overwrite.delete');
    this.assertConfirm(options.confirm, 'channel.permission_overwrite.delete', {
      guildId,
      channelId,
      overwriteId,
    });
    this.auditMutation(
      this.buildMutationContext(guildId, 'channel.permission_overwrite.delete', {
        channelId,
        overwriteId,
        reason: options.reason,
        confirm: options.confirm,
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('channel.permission_overwrite.delete', { guildId, channelId, overwriteId });
    }

    await this.client.channels.deleteOverwrite(channelId, overwriteId, {
      guildId,
      ...(options.reason !== undefined ? { reason: options.reason } : {}),
    });

    return {
      channelId,
      guildId,
      overwriteId,
    };
  }

  async getRoleMemberCounts(guildId: string): Promise<Record<string, number>> {
    this.assertGuildAllowed(guildId);
    const counts = await this.client.roles.memberCounts(guildId);
    return counts;
  }

  async getGatewayBotInfo(): Promise<{
    url: string;
    shards: number;
    sessionStartLimit: {
      total: number;
      remaining: number;
      resetAfter: number;
      maxConcurrency: number;
    };
  }> {
    const info = await this.client.proxy.gateway.bot.get();
    return {
      url: info.url,
      shards: info.shards,
      sessionStartLimit: {
        total: info.session_start_limit.total,
        remaining: info.session_start_limit.remaining,
        resetAfter: info.session_start_limit.reset_after,
        maxConcurrency: info.session_start_limit.max_concurrency,
      },
    };
  }

  async getInviteTargetUsers(inviteCode: string): Promise<string> {
    const csv = await this.client.invites.getTargetUsers(inviteCode);
    return csv;
  }

  async updateInviteTargetUsers(inviteCode: string, targetUserIds: string[]): Promise<void> {
    await this.client.invites.updateTargetUsers(inviteCode, targetUserIds);
  }

  async getInviteTargetUserJobStatus(inviteCode: string): Promise<{
    status: number;
    totalUsers?: number;
    processedUsers?: number;
    createdAt?: string;
    completedAt?: string;
    errorMessage?: string;
  }> {
    const result = await this.client.invites.jobStatus(inviteCode);
    const summary: {
      status: number;
      totalUsers?: number;
      processedUsers?: number;
      createdAt?: string;
      completedAt?: string;
      errorMessage?: string;
    } = { status: result.status };

    if (result.totalUsers !== undefined) {
      summary.totalUsers = result.totalUsers;
    }
    if (result.processedUsers !== undefined) {
      summary.processedUsers = result.processedUsers;
    }
    if (result.createdAt !== undefined) {
      summary.createdAt = result.createdAt;
    }
    if (result.completedAt !== undefined && result.completedAt !== null) {
      summary.completedAt = result.completedAt;
    }
    if (result.errorMessage !== undefined) {
      summary.errorMessage = result.errorMessage;
    }

    return summary;
  }

  protected async fetchAndAssertGuildChannel(
    guildId: string,
    channelId: string,
    action: string,
  ): Promise<APIChannel> {
    const channel = await this.client.channels.raw(channelId, true);
    const candidate = channel as { guild_id?: unknown };

    if (typeof candidate.guild_id !== 'string') {
      const { ToolError } = await import('../lib/errors.js');
      throw new ToolError('BAD_REQUEST', `Channel ${channelId} is not a guild channel`, {
        status: 400,
        details: {
          action,
          channelId,
        },
      });
    }

    if (candidate.guild_id !== guildId) {
      const { ToolError } = await import('../lib/errors.js');
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

  private extractPermissionOverwrites(channel: APIChannel): DiscordChannelPermissionOverwriteSummary[] {
    const candidate = channel as { permission_overwrites?: any[] };
    if (!Array.isArray(candidate.permission_overwrites)) {
      return [];
    }

    return candidate.permission_overwrites.map((item) => ({
      id: item.id,
      type: item.type,
      allow: item.allow,
      deny: item.deny,
    }));
  }

  private toCurrentUserGuildSummary(guild: RESTAPIPartialCurrentUserGuild): DiscordGuildSummary {
    const summary: DiscordGuildSummary = {
      id: guild.id,
      name: guild.name,
      features: [...guild.features],
      owner: guild.owner,
      permissions: guild.permissions,
    };

    if (typeof guild.approximate_member_count === 'number') {
      summary.memberCount = guild.approximate_member_count;
    }

    return summary;
  }

  private toApiGuildSummary(guild: APIGuild): DiscordGuildSummary {
    const summary: DiscordGuildSummary = {
      id: guild.id,
      name: guild.name,
      ownerId: guild.owner_id,
      features: [...guild.features],
      verificationLevel: guild.verification_level,
    };

    if (typeof guild.approximate_member_count === 'number') {
      summary.memberCount = guild.approximate_member_count;
    }

    return summary;
  }

  private toChannelSummary(channel: APIChannel): DiscordChannelSummary {
    const guildChannel = channel as any;

    const summary: DiscordChannelSummary = {
      id: channel.id,
      name: guildChannel.name ?? '(unnamed)',
      type: channel.type,
    };

    if (typeof guildChannel.guild_id === 'string') {
      summary.guildId = guildChannel.guild_id;
    }

    if (typeof guildChannel.parent_id === 'string' || guildChannel.parent_id === null) {
      summary.parentId = guildChannel.parent_id;
    }

    if (typeof guildChannel.topic === 'string' || guildChannel.topic === null) {
      summary.topic = guildChannel.topic;
    }

    if (typeof guildChannel.position === 'number') {
      summary.position = guildChannel.position;
    }

    if (typeof guildChannel.nsfw === 'boolean') {
      summary.nsfw = guildChannel.nsfw;
    }

    if (Array.isArray(guildChannel.permission_overwrites)) {
      summary.permissionOverwrites = guildChannel.permission_overwrites.map((item: any) => ({
        id: item.id,
        type: item.type,
        allow: item.allow,
        deny: item.deny,
      }));
    }

    return summary;
  }

  private toRoleSummary(role: APIRole, guildId: string): DiscordRoleSummary {
    return {
      id: role.id,
      guildId,
      name: role.name,
      color: role.color,
      position: role.position,
      hoist: role.hoist,
      mentionable: role.mentionable,
      permissions: role.permissions,
    };
  }

  private toVoiceRegionSummary(region: APIVoiceRegion): DiscordVoiceRegionSummary {
    return {
      id: region.id,
      name: region.name,
      optimal: region.optimal,
      deprecated: region.deprecated,
      custom: region.custom,
    };
  }
}
