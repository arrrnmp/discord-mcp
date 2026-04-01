import { type HttpClient } from 'seyfert/lib/client/httpclient.js';
import type { GuildChannelTypes } from 'seyfert/lib/structures/channels.js';
import type {
  APIGuild,
  APIGuildCategoryChannel,
  APIRole,
  APIChannel,
  RESTAPIPartialCurrentUserGuild,
  RESTPatchAPIChannelJSONBody,
  RESTPatchAPIGuildRoleJSONBody,
  RESTPostAPIGuildChannelJSONBody,
  RESTPostAPIGuildRoleJSONBody,
} from 'seyfert/lib/types/index.js';

import type { AppConfig } from '../config/env.js';
import { ToolError } from '../lib/errors.js';
import { logger } from '../lib/logging.js';
import type { DiscordChannelSummary, DiscordGuildSummary, DiscordRoleSummary } from '../types/discord.js';

type MutationContext = {
  guildId: string;
  action: string;
  reason?: string;
  confirm?: boolean;
};

export class DiscordService {
  constructor(
    private readonly client: HttpClient,
    private readonly config: AppConfig,
  ) {}

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

  async createChannel(
    guildId: string,
    body: RESTPostAPIGuildChannelJSONBody & { type: GuildChannelTypes },
    reason?: string,
  ): Promise<DiscordChannelSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'channel.create', this.buildReasonOptions(reason)));

    if (this.config.dryRun) {
      this.throwDryRun('channel.create', { guildId, body });
    }

    const channel = await this.client.guilds.channels.create(guildId, body);
    return this.toChannelSummary(channel as unknown as APIChannel);
  }

  async updateChannel(
    guildId: string,
    channelId: string,
    body: RESTPatchAPIChannelJSONBody,
    reason?: string,
  ): Promise<DiscordChannelSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'channel.update', this.buildReasonOptions(reason)));

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
    this.auditMutation(this.buildMutationContext(guildId, 'role.create', this.buildReasonOptions(reason)));

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
    position?: number,
  ): Promise<DiscordRoleSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'role.update', this.buildReasonOptions(reason)));

    if (this.config.dryRun) {
      this.throwDryRun('role.update', { guildId, roleId, body, position });
    }

    let role = await this.client.roles.edit(guildId, roleId, body, reason);

    if (typeof position === 'number') {
      await this.client.roles.editPositions(guildId, [{ id: roleId, position }]);
      role = await this.client.roles.fetch(guildId, roleId, true);
    }

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

  private buildReasonOptions(reason: string | undefined): { reason?: string } | undefined {
    if (reason === undefined) {
      return undefined;
    }

    return { reason: reason };
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
    const guildChannel = channel as Partial<APIGuildCategoryChannel> & Record<string, unknown>;

    const summary: DiscordChannelSummary = {
      id: channel.id,
      name: 'name' in guildChannel && typeof guildChannel.name === 'string' ? guildChannel.name : '(unnamed)',
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
}
