import type { GuildMemberStructure } from 'seyfert/lib/client/transformers.js';
import { type HttpClient } from 'seyfert/lib/client/httpclient.js';
import type { RESTGetAPIGuildMembersQuery, RESTPatchAPIGuildMemberJSONBody } from 'seyfert/lib/types/index.js';

import type { AppConfig } from '../config/env.js';
import { ToolError } from '../lib/errors.js';
import { logger } from '../lib/logging.js';

type MutationContext = {
  guildId: string;
  action: string;
  memberId?: string;
  roleId?: string;
  reason?: string;
  confirm?: boolean;
};

type MutationDetails = {
  memberId?: string;
  roleId?: string;
  reason?: string;
  confirm?: boolean;
};

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
  limit?: number;
  after?: string;
  force?: boolean;
};

export type EditMemberBasicsOptions = {
  nickname?: string | null;
  timeoutSeconds?: number | null;
  reason?: string;
};

export class DiscordMembersService {
  constructor(
    private readonly client: HttpClient,
    private readonly config: AppConfig,
  ) {}

  async listMembers(guildId: string, options?: ListMembersOptions): Promise<DiscordMemberSummary[]> {
    this.assertGuildAllowed(guildId);

    const query = this.toListMembersQuery(options);
    const members = await this.client.members.list(guildId, query, options?.force ?? true);
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
        ...(options.reason !== undefined ? { reason: options.reason } : {}),
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
        ...(options.reason !== undefined ? { reason: options.reason } : {}),
        ...(options.confirm !== undefined ? { confirm: options.confirm } : {}),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('member.kick', { guildId, memberId });
    }

    await this.client.members.kick(guildId, memberId, options.reason);
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
        ...(reason !== undefined ? { reason } : {}),
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
        ...(reason !== undefined ? { reason } : {}),
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

  private timeoutSecondsToIso(timeoutSeconds: number | null): string | null {
    if (timeoutSeconds === null) {
      return null;
    }

    return new Date(Date.now() + timeoutSeconds * 1000).toISOString();
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

  private buildMutationContext(guildId: string, action: string, details?: MutationDetails): MutationContext {
    const context: MutationContext = { guildId, action };

    if (details?.memberId !== undefined) {
      context.memberId = details.memberId;
    }

    if (details?.roleId !== undefined) {
      context.roleId = details.roleId;
    }

    if (details?.reason !== undefined) {
      context.reason = details.reason;
    }

    if (details?.confirm !== undefined) {
      context.confirm = details.confirm;
    }

    return context;
  }

  private auditMutation(ctx: MutationContext): void {
    logger.info('discord.mutation', {
      action: ctx.action,
      guildId: ctx.guildId,
      memberId: ctx.memberId,
      roleId: ctx.roleId,
      reason: ctx.reason,
      confirm: ctx.confirm ?? false,
      dryRun: this.config.dryRun,
    });
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
