import type { GuildScheduledEventStructure } from 'seyfert/lib/client/transformers.js';
import type {
  RESTGetAPIGuildScheduledEventQuery,
  RESTGetAPIGuildScheduledEventUsersQuery,
  RESTPatchAPIGuildScheduledEventJSONBody,
  RESTPostAPIGuildScheduledEventJSONBody,
} from 'seyfert/lib/types/index.js';

import { DiscordBaseService } from './base.js';

export type DiscordScheduledEventSummary = {
  id: string;
  guildId: string;
  channelId: string | null;
  creatorId?: string | null;
  name: string;
  description?: string | null;
  scheduledStartTime: string;
  scheduledEndTime: string | null;
  privacyLevel: number;
  status: number;
  entityType: number;
  entityId: string | null;
  entityMetadata: { location?: string } | null;
  userCount?: number;
  image?: string | null;
};

export type DiscordScheduledEventUserSummary = {
  eventId: string;
  userId: string;
  username: string;
  globalName: string | null;
  memberNick?: string | null;
};

export type CreateScheduledEventOptions = {
  name: string;
  scheduledStartTime: string;
  entityType: number;
  privacyLevel: number;
  channelId?: string;
  scheduledEndTime?: string;
  description?: string;
  entityMetadata?: { location?: string };
  image?: string;
  reason?: string;
};

export type UpdateScheduledEventOptions = {
  name?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  description?: string;
  entityType?: number;
  privacyLevel?: number;
  status?: number;
  channelId?: string | null;
  entityMetadata?: { location?: string } | null;
  image?: string | null;
  reason?: string;
};

export class DiscordScheduledEventsService extends DiscordBaseService {
  async listScheduledEvents(guildId: string, options?: { withUserCount?: boolean }): Promise<DiscordScheduledEventSummary[]> {
    this.assertGuildAllowed(guildId);
    const query: RESTGetAPIGuildScheduledEventQuery = {};
    if (options?.withUserCount !== undefined) query.with_user_count = options.withUserCount;

    const events = await this.client.proxy.guilds(guildId)['scheduled-events'].get({ query });
    return (events as any[]).map((event) => this.toScheduledEventSummary(event));
  }

  async fetchScheduledEvent(guildId: string, eventId: string, options?: { withUserCount?: boolean }): Promise<DiscordScheduledEventSummary> {
    this.assertGuildAllowed(guildId);
    const query: RESTGetAPIGuildScheduledEventQuery = {};
    if (options?.withUserCount !== undefined) query.with_user_count = options.withUserCount;

    const event = await this.client.proxy.guilds(guildId)['scheduled-events'](eventId).get({ query });
    this.assertEventGuild(event, guildId, 'event.fetch');
    return this.toScheduledEventSummary(event);
  }

  async createScheduledEvent(guildId: string, options: CreateScheduledEventOptions): Promise<DiscordScheduledEventSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'event.create', { reason: options.reason }));

    if (this.config.dryRun) {
      this.throwDryRun('event.create', { guildId, name: options.name });
    }

    const body: RESTPostAPIGuildScheduledEventJSONBody = {
      name: options.name,
      scheduled_start_time: options.scheduledStartTime,
      entity_type: options.entityType,
      privacy_level: options.privacyLevel,
    };

    if (options.channelId !== undefined) body.channel_id = options.channelId;
    if (options.scheduledEndTime !== undefined) body.scheduled_end_time = options.scheduledEndTime;
    if (options.description !== undefined) body.description = options.description;
    if (options.entityMetadata !== undefined) body.entity_metadata = options.entityMetadata;
    if (options.image !== undefined) body.image = options.image;

    const event = await this.client.proxy.guilds(guildId)['scheduled-events'].post({ body, reason: options.reason });
    return this.toScheduledEventSummary(event);
  }

  async updateScheduledEvent(guildId: string, eventId: string, options: UpdateScheduledEventOptions): Promise<DiscordScheduledEventSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'event.update', { reason: options.reason }));

    if (this.config.dryRun) {
      this.throwDryRun('event.update', { guildId, eventId });
    }

    const body: RESTPatchAPIGuildScheduledEventJSONBody = {};
    if (options.name !== undefined) body.name = options.name;
    if (options.scheduledStartTime !== undefined) body.scheduled_start_time = options.scheduledStartTime;
    if (options.scheduledEndTime !== undefined) body.scheduled_end_time = options.scheduledEndTime;
    if (options.description !== undefined) body.description = options.description;
    if (options.entityType !== undefined) body.entity_type = options.entityType;
    if (options.privacyLevel !== undefined) body.privacy_level = options.privacyLevel;
    if (options.status !== undefined) body.status = options.status;
    if (options.channelId !== undefined) body.channel_id = options.channelId;
    if (options.entityMetadata !== undefined) body.entity_metadata = options.entityMetadata;
    if (options.image !== undefined) body.image = options.image;

    const event = await this.client.proxy.guilds(guildId)['scheduled-events'](eventId).patch({ body, reason: options.reason });
    this.assertEventGuild(event, guildId, 'event.update');
    return this.toScheduledEventSummary(event);
  }

  async deleteScheduledEvent(guildId: string, eventId: string, options: { reason?: string; confirm?: boolean }): Promise<void> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'event.delete', { guildId, eventId });
    this.auditMutation(this.buildMutationContext(guildId, 'event.delete', options));

    if (this.config.dryRun) {
      this.throwDryRun('event.delete', { guildId, eventId });
    }

    await this.client.proxy.guilds(guildId)['scheduled-events'](eventId).delete({ reason: options.reason });
  }

  async listScheduledEventUsers(
    guildId: string,
    eventId: string,
    options?: { limit?: number; withMember?: boolean; before?: string; after?: string },
  ): Promise<DiscordScheduledEventUserSummary[]> {
    this.assertGuildAllowed(guildId);
    const query: RESTGetAPIGuildScheduledEventUsersQuery = {};
    if (options?.limit !== undefined) query.limit = options.limit;
    if (options?.withMember !== undefined) query.with_member = options.withMember;
    if (options?.before) query.before = options.before;
    if (options?.after) query.after = options.after;

    const users = await this.client.proxy.guilds(guildId)['scheduled-events'](eventId).users.get({ query });
    return (users as any[]).map((u) => ({
      eventId,
      userId: u.user.id,
      username: u.user.username,
      globalName: u.user.global_name,
      memberNick: u.member?.nick,
    }));
  }

  private toScheduledEventSummary(event: any): DiscordScheduledEventSummary {
    return {
      id: event.id,
      guildId: event.guild_id,
      channelId: event.channel_id,
      creatorId: event.creator_id,
      name: event.name,
      description: event.description,
      scheduledStartTime: event.scheduled_start_time,
      scheduledEndTime: event.scheduled_end_time,
      privacyLevel: event.privacy_level,
      status: event.status,
      entityType: event.entity_type,
      entityId: event.entity_id,
      entityMetadata: event.entity_metadata,
      userCount: event.user_count,
      image: event.image,
    };
  }

  private assertEventGuild(event: any, guildId: string, action: string): void {
    if (event.guild_id === guildId) return;
    throw new ToolError('UNAUTHORIZED_GUILD', `Event ${event.id} is not in allowed guild ${guildId}`, {
      status: 403,
      details: { action, eventId: event.id, guildId: event.guild_id, expectedGuildId: guildId },
    });
  }
}
