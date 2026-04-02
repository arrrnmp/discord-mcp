import type {
  AutoModerationRuleStructure,
  GuildEmojiStructure,
  StickerStructure,
} from 'seyfert/lib/client/transformers.js';
import type {
  APISoundBoard,
  RESTPatchAPIAutoModerationRuleJSONBody,
  RESTPatchAPIGuildSoundboardSound,
  RESTPatchAPIGuildEmojiJSONBody,
  RESTPatchAPIGuildStickerJSONBody,
  RESTPostAPIAutoModerationRuleJSONBody,
  RESTPostAPIChannelInviteJSONBody,
  RESTPostAPIGuildSoundboardSound,
} from 'seyfert/lib/types/index.js';

import { ToolError } from '../lib/errors.js';
import { DiscordBaseService } from './base.js';

type RawFileLike = {
  filename: string;
  data: ArrayBuffer | Buffer | Uint8Array | Uint8ClampedArray | boolean | number | string;
  contentType?: string;
};

export type DiscordInviteSummary = {
  code: string;
  channelId?: string | null;
  guildId?: string;
  inviterId?: string;
  uses?: number;
  maxUses?: number;
  maxAge?: number;
  temporary?: boolean;
  createdAt?: string;
  expiresAt?: string | null;
};

export type DiscordAutoModerationRuleSummary = {
  id: string;
  guildId: string;
  name?: string;
  eventType?: number;
  triggerType?: number;
  enabled?: boolean;
  exemptRoleIds?: string[];
  exemptChannelIds?: string[];
  actionsCount?: number;
};

export type DiscordGuildEmojiSummary = {
  id: string;
  guildId: string;
  name: string | null;
  animated?: boolean;
  available?: boolean;
  roleIds?: string[];
};

export type DiscordApplicationEmojiSummary = {
  id: string;
  name: string | null;
  animated?: boolean;
  available?: boolean;
};

export type DiscordStickerSummary = {
  id: string;
  guildId?: string;
  name: string;
  description?: string | null;
  tags?: string;
  type?: number;
  formatType?: number;
};

export type DiscordSoundboardSoundSummary = {
  id: string;
  guildId: string;
  name: string;
  volume?: number;
  emojiId?: string | null;
  emojiName?: string | null;
  available?: boolean;
  userId?: string;
};

export type CreateInviteOptions = {
  maxAge?: number;
  maxUses?: number;
  temporary?: boolean;
  unique?: boolean;
  targetType?: number;
  targetUserId?: string;
  targetApplicationId?: string;
  reason?: string;
};

export type CreateAutoModerationRuleOptions = {
  name: string;
  eventType: number;
  triggerType: number;
  triggerMetadata?: any;
  actions: any[];
  enabled?: boolean;
  exemptRoleIds?: string[];
  exemptChannelIds?: string[];
  reason?: string;
};

export type UpdateAutoModerationRuleOptions = {
  name?: string;
  eventType?: number;
  triggerMetadata?: any;
  actions?: any[];
  enabled?: boolean;
  exemptRoleIds?: string[];
  exemptChannelIds?: string[];
  reason?: string;
};

export type DeleteAutoModerationRuleOptions = {
  reason?: string;
  confirm?: boolean;
};

export type CreateEmojiOptions = {
  name: string;
  image: string;
  roleIds?: string[];
  reason?: string;
};

export type UpdateEmojiOptions = {
  name?: string;
  roleIds?: string[];
  reason?: string;
};

export type DeleteEmojiOptions = {
  reason?: string;
  confirm?: boolean;
};

export type CreateStickerOptions = {
  name: string;
  description?: string;
  tags: string;
  file: {
    filename: string;
    data: any;
    contentType?: string;
  };
  reason?: string;
};

export type UpdateStickerOptions = {
  name?: string;
  description?: string | null;
  tags?: string;
  reason?: string;
};

export type DeleteStickerOptions = {
  reason?: string;
  confirm?: boolean;
};

export type CreateSoundboardSoundOptions = {
  name: string;
  sound: string;
  volume?: number;
  emojiId?: string | null;
  emojiName?: string | null;
  reason?: string;
};

export type UpdateSoundboardSoundOptions = {
  name?: string;
  volume?: number | null;
  emojiId?: string | null;
  emojiName?: string | null;
  reason?: string;
};

export type DeleteSoundboardSoundOptions = {
  reason?: string;
  confirm?: boolean;
};

export type CreateApplicationEmojiOptions = {
  name: string;
  image: string;
};

export type UpdateApplicationEmojiOptions = {
  name: string;
};

export type DeleteApplicationEmojiOptions = {
  reason?: string;
  confirm?: boolean;
};

export class DiscordSpecialService extends DiscordBaseService {
  async listChannelInvites(guildId: string, channelId: string): Promise<DiscordInviteSummary[]> {
    this.assertGuildAllowed(guildId);
    await this.getGuildIdForChannel(channelId, 'invite.list');
    const invites = await this.client.proxy.channels(channelId).invites.get();
    const summaries = (invites as any[]).map((invite: any) => this.toInviteSummary(invite));
    summaries.forEach((summary) => this.assertInviteGuild(summary, guildId, 'invite.list'));
    return summaries;
  }

  async createChannelInvite(
    channelId: string,
    options: CreateInviteOptions,
  ): Promise<DiscordInviteSummary> {
    const guildId = await this.getGuildIdForChannel(channelId, 'invite.create');
    this.assertGuildAllowed(guildId);
    this.assertInviteTargetCombination(options);

    this.auditMutation(
      this.buildMutationContext(guildId, 'invite.create', {
        channelId,
        ...(options.reason !== undefined && { reason: options.reason }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('invite.create', { guildId, channelId });
    }

    const body: RESTPostAPIChannelInviteJSONBody = {};
    if (options.maxAge !== undefined) body.max_age = options.maxAge;
    if (options.maxUses !== undefined) body.max_uses = options.maxUses;
    if (options.temporary !== undefined) body.temporary = options.temporary;
    if (options.unique !== undefined) body.unique = options.unique;
    if (options.targetType !== undefined) body.target_type = options.targetType;
    if (options.targetUserId !== undefined) body.target_user_id = options.targetUserId;
    if (options.targetApplicationId !== undefined) body.target_application_id = options.targetApplicationId;

    const invite = await this.client.proxy.channels(channelId).invites.post({
      body,
      ...(options.reason !== undefined && { reason: options.reason }),
    });
    const summary = this.toInviteSummary(invite as any);
    this.assertInviteGuild(summary, guildId, 'invite.create');
    return summary;
  }

  async listGuildInvites(guildId: string): Promise<DiscordInviteSummary[]> {
    this.assertGuildAllowed(guildId);
    const invites = await this.client.proxy.guilds(guildId).invites.get();
    return (invites as any[]).map((invite: any) => this.toInviteSummary(invite));
  }

  async deleteInvite(code: string, options: { reason?: string; confirm?: boolean }): Promise<DiscordInviteSummary> {
    this.assertConfirm(options.confirm, 'invite.delete', { code });
    this.auditMutation(this.buildMutationContext('invite', 'invite.delete', {
      inviteCode: code,
      ...(options.reason !== undefined && { reason: options.reason }),
      ...(options.confirm !== undefined && { confirm: options.confirm }),
    }));
    if (this.config.dryRun) this.throwDryRun('invite.delete', { code });
    const invite = await this.client.proxy.invites(code).delete({
      ...(options.reason !== undefined && { reason: options.reason }),
    });
    return this.toInviteSummary(invite as any);
  }

  async listGuildAutoModerationRules(guildId: string): Promise<DiscordAutoModerationRuleSummary[]> {
    this.assertGuildAllowed(guildId);
    const rules = await this.client.guilds.moderation.list(guildId);
    return rules.map((rule) => this.toAutoModerationRuleSummary(rule));
  }

  async createGuildAutoModerationRule(
    guildId: string,
    options: CreateAutoModerationRuleOptions,
  ): Promise<DiscordAutoModerationRuleSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(
      this.buildMutationContext(guildId, 'automod.create', {
        ...(options.reason !== undefined && { reason: options.reason }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('automod.create', { guildId, name: options.name });
    }

    const body: RESTPostAPIAutoModerationRuleJSONBody = {
      name: options.name,
      event_type: options.eventType,
      trigger_type: options.triggerType,
      actions: options.actions,
    };

    if (options.triggerMetadata !== undefined) body.trigger_metadata = options.triggerMetadata;
    if (options.enabled !== undefined) body.enabled = options.enabled;
    if (options.exemptRoleIds !== undefined) body.exempt_roles = options.exemptRoleIds;
    if (options.exemptChannelIds !== undefined) body.exempt_channels = options.exemptChannelIds;

    const rule = await this.client.guilds.moderation.create(guildId, body);
    this.assertAutoModerationGuild(rule, guildId, 'automod.create');
    return this.toAutoModerationRuleSummary(rule);
  }

  async updateGuildAutoModerationRule(
    guildId: string,
    ruleId: string,
    options: UpdateAutoModerationRuleOptions,
  ): Promise<DiscordAutoModerationRuleSummary> {
    this.assertGuildAllowed(guildId);
    await this.assertAutoModerationRuleBelongsToGuild(guildId, ruleId, 'automod.update');
    this.auditMutation(
      this.buildMutationContext(guildId, 'automod.update', {
        ruleId,
        ...(options.reason !== undefined && { reason: options.reason }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('automod.update', { guildId, ruleId });
    }

    const body: RESTPatchAPIAutoModerationRuleJSONBody = {};
    if (options.name !== undefined) body.name = options.name;
    if (options.eventType !== undefined) body.event_type = options.eventType;
    if (options.triggerMetadata !== undefined) body.trigger_metadata = options.triggerMetadata;
    if (options.actions !== undefined) body.actions = options.actions;
    if (options.enabled !== undefined) body.enabled = options.enabled;
    if (options.exemptRoleIds !== undefined) body.exempt_roles = options.exemptRoleIds;
    if (options.exemptChannelIds !== undefined) body.exempt_channels = options.exemptChannelIds;

    const rule = await this.client.guilds.moderation.edit(guildId, ruleId, body, options.reason);
    this.assertAutoModerationGuild(rule, guildId, 'automod.update');
    return this.toAutoModerationRuleSummary(rule);
  }

  async deleteGuildAutoModerationRule(
    guildId: string,
    ruleId: string,
    options: DeleteAutoModerationRuleOptions,
  ): Promise<void> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'automod.delete', { guildId, ruleId });
    await this.assertAutoModerationRuleBelongsToGuild(guildId, ruleId, 'automod.delete');
    this.auditMutation(
      this.buildMutationContext(guildId, 'automod.delete', {
        ruleId,
        ...(options.reason !== undefined && { reason: options.reason }),
        ...(options.confirm !== undefined && { confirm: options.confirm }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('automod.delete', { guildId, ruleId });
    }

    await this.client.guilds.moderation.delete(guildId, ruleId, options.reason);
  }

  async listGuildEmojis(guildId: string, force = true): Promise<DiscordGuildEmojiSummary[]> {
    this.assertGuildAllowed(guildId);
    const emojis = await this.client.emojis.list(guildId, force);
    return emojis.map((emoji) => this.toGuildEmojiSummary(emoji));
  }

  async createGuildEmoji(guildId: string, options: CreateEmojiOptions): Promise<DiscordGuildEmojiSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(
      this.buildMutationContext(guildId, 'emoji.create', {
        ...(options.reason !== undefined && { reason: options.reason }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('emoji.create', { guildId, name: options.name });
    }

    const emoji = await this.client.emojis.create(guildId, {
      name: options.name,
      image: {
        type: 'buffer',
        data: this.decodeBase64DataUrl(options.image),
        filename: `${options.name}.png`,
      },
      roles: options.roleIds,
    });

    this.assertEmojiGuild(emoji, guildId, 'emoji.create');
    return this.toGuildEmojiSummary(emoji);
  }

  async updateGuildEmoji(guildId: string, emojiId: string, options: UpdateEmojiOptions): Promise<DiscordGuildEmojiSummary> {
    this.assertGuildAllowed(guildId);
    await this.assertEmojiBelongsToGuild(guildId, emojiId, 'emoji.update');
    this.auditMutation(
      this.buildMutationContext(guildId, 'emoji.update', {
        emojiId,
        ...(options.reason !== undefined && { reason: options.reason }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('emoji.update', { guildId, emojiId });
    }

    const emojiBody: RESTPatchAPIGuildEmojiJSONBody = {};
    if (options.name !== undefined) emojiBody.name = options.name;
    if (options.roleIds !== undefined) emojiBody.roles = options.roleIds;

    const emoji = await this.client.emojis.edit(guildId, emojiId, emojiBody, options.reason);
    this.assertEmojiGuild(emoji, guildId, 'emoji.update');
    return this.toGuildEmojiSummary(emoji);
  }

  async deleteGuildEmoji(guildId: string, emojiId: string, options: DeleteEmojiOptions): Promise<void> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'emoji.delete', { guildId, emojiId });
    await this.assertEmojiBelongsToGuild(guildId, emojiId, 'emoji.delete');
    this.auditMutation(
      this.buildMutationContext(guildId, 'emoji.delete', {
        emojiId,
        ...(options.reason !== undefined && { reason: options.reason }),
        ...(options.confirm !== undefined && { confirm: options.confirm }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('emoji.delete', { guildId, emojiId });
    }

    await this.client.emojis.delete(guildId, emojiId, options.reason);
  }

  async listGuildStickers(guildId: string): Promise<DiscordStickerSummary[]> {
    this.assertGuildAllowed(guildId);
    const stickers = await this.client.guilds.stickers.list(guildId);
    return stickers.map((sticker) => this.toStickerSummary(sticker));
  }

  async createGuildSticker(guildId: string, options: CreateStickerOptions): Promise<DiscordStickerSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(
      this.buildMutationContext(guildId, 'sticker.create', {
        ...(options.reason !== undefined && { reason: options.reason }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('sticker.create', { guildId, name: options.name });
    }

    const stickerBody: any = {
      name: options.name,
      description: options.description ?? '',
      tags: options.tags,
      file: {
        filename: options.file.filename,
        data: options.file.data,
        contentType: options.file.contentType,
      },
    };
    const sticker = await this.client.guilds.stickers.create(
      guildId,
      stickerBody,
      options.reason,
    );

    this.assertStickerGuild(sticker, guildId, 'sticker.create');
    return this.toStickerSummary(sticker);
  }

  async updateGuildSticker(
    guildId: string,
    stickerId: string,
    options: UpdateStickerOptions,
  ): Promise<DiscordStickerSummary> {
    this.assertGuildAllowed(guildId);
    await this.assertStickerBelongsToGuild(guildId, stickerId, 'sticker.update');
    this.auditMutation(
      this.buildMutationContext(guildId, 'sticker.update', {
        stickerId,
        ...(options.reason !== undefined && { reason: options.reason }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('sticker.update', { guildId, stickerId });
    }

    const stickerBody: RESTPatchAPIGuildStickerJSONBody = {};
    if (options.name !== undefined) stickerBody.name = options.name;
    if (options.description !== undefined) stickerBody.description = options.description;
    if (options.tags !== undefined) stickerBody.tags = options.tags;

    const sticker = await this.client.guilds.stickers.edit(guildId, stickerId, stickerBody, options.reason);
    this.assertStickerGuild(sticker, guildId, 'sticker.update');
    return this.toStickerSummary(sticker);
  }

  async deleteGuildSticker(guildId: string, stickerId: string, options: DeleteStickerOptions): Promise<void> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'sticker.delete', { guildId, stickerId });
    await this.assertStickerBelongsToGuild(guildId, stickerId, 'sticker.delete');
    this.auditMutation(
      this.buildMutationContext(guildId, 'sticker.delete', {
        stickerId,
        ...(options.reason !== undefined && { reason: options.reason }),
        ...(options.confirm !== undefined && { confirm: options.confirm }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('sticker.delete', { guildId, stickerId });
    }

    await this.client.guilds.stickers.delete(guildId, stickerId, options.reason);
  }

  async listGuildSoundboardSounds(guildId: string): Promise<DiscordSoundboardSoundSummary[]> {
    this.assertGuildAllowed(guildId);
    const sounds = await this.client.soundboards.list(guildId);
    return sounds.items.map((sound) => this.toSoundboardSoundSummary(sound, guildId));
  }

  async createGuildSoundboardSound(
    guildId: string,
    options: CreateSoundboardSoundOptions,
  ): Promise<DiscordSoundboardSoundSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(
      this.buildMutationContext(guildId, 'soundboard.create', {
        ...(options.reason !== undefined && { reason: options.reason }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('soundboard.create', { guildId, name: options.name });
    }

    const body: RESTPostAPIGuildSoundboardSound = {
      name: options.name,
      sound: options.sound,
      ...(options.volume !== undefined ? { volume: options.volume } : {}),
      ...(options.emojiId !== undefined ? { emoji_id: options.emojiId } : {}),
      ...(options.emojiName !== undefined ? { emoji_name: options.emojiName } : {}),
    };

    const sound = await this.client.soundboards.create(guildId, body);
    return this.toSoundboardSoundSummary(sound, guildId);
  }

  async updateGuildSoundboardSound(
    guildId: string,
    soundId: string,
    options: UpdateSoundboardSoundOptions,
  ): Promise<DiscordSoundboardSoundSummary> {
    this.assertGuildAllowed(guildId);
    await this.assertSoundboardSoundBelongsToGuild(guildId, soundId, 'soundboard.update');
    this.auditMutation(
      this.buildMutationContext(guildId, 'soundboard.update', {
        soundId,
        ...(options.reason !== undefined && { reason: options.reason }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('soundboard.update', { guildId, soundId });
    }

    const body: RESTPatchAPIGuildSoundboardSound = {
      ...(options.name !== undefined ? { name: options.name } : {}),
      ...(options.volume !== undefined ? { volume: options.volume } : {}),
      ...(options.emojiId !== undefined ? { emoji_id: options.emojiId } : {}),
      ...(options.emojiName !== undefined ? { emoji_name: options.emojiName } : {}),
    };

    const sound = await this.client.soundboards.edit(guildId, soundId, body);
    return this.toSoundboardSoundSummary(sound, guildId);
  }

  async deleteGuildSoundboardSound(
    guildId: string,
    soundId: string,
    options: DeleteSoundboardSoundOptions,
  ): Promise<void> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'soundboard.delete', { guildId, soundId });
    await this.assertSoundboardSoundBelongsToGuild(guildId, soundId, 'soundboard.delete');
    this.auditMutation(
      this.buildMutationContext(guildId, 'soundboard.delete', {
        soundId,
        ...(options.reason !== undefined && { reason: options.reason }),
        ...(options.confirm !== undefined && { confirm: options.confirm }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('soundboard.delete', { guildId, soundId });
    }

    await this.client.soundboards.delete(guildId, soundId, options.reason);
  }

  async listApplicationEmojis(): Promise<DiscordApplicationEmojiSummary[]> {
    const response = await this.client.proxy
      .applications(this.config.discordApplicationId)
      .emojis.get();
    const items: unknown[] = Array.isArray(response)
      ? response
      : (response as { items?: unknown[] }).items ?? [];
    return items.map((emoji) => this.toApplicationEmojiSummary(emoji as Record<string, unknown>));
  }

  async createApplicationEmoji(options: CreateApplicationEmojiOptions): Promise<DiscordApplicationEmojiSummary> {
    this.auditMutation(this.buildMutationContext('application', 'app.emoji.create'));

    if (this.config.dryRun) {
      this.throwDryRun('app.emoji.create', { name: options.name });
    }

    const emoji = await this.client.proxy
      .applications(this.config.discordApplicationId)
      .emojis.post({
        body: {
          name: options.name,
          image: options.image,
        },
      });

    return this.toApplicationEmojiSummary(emoji as unknown as Record<string, unknown>);
  }

  async updateApplicationEmoji(
    emojiId: string,
    options: UpdateApplicationEmojiOptions,
  ): Promise<DiscordApplicationEmojiSummary> {
    this.auditMutation(this.buildMutationContext('application', 'app.emoji.update', { emojiId }));

    if (this.config.dryRun) {
      this.throwDryRun('app.emoji.update', { emojiId, name: options.name });
    }

    const emoji = await this.client.proxy
      .applications(this.config.discordApplicationId)
      .emojis(emojiId)
      .patch({
        body: {
          name: options.name,
        },
      });

    return this.toApplicationEmojiSummary(emoji as unknown as Record<string, unknown>);
  }

  async deleteApplicationEmoji(emojiId: string, options: DeleteApplicationEmojiOptions): Promise<void> {
    this.assertConfirm(options.confirm, 'app.emoji.delete', { emojiId });
    this.auditMutation(
      this.buildMutationContext('application', 'app.emoji.delete', {
        emojiId,
        ...(options.reason !== undefined && { reason: options.reason }),
        ...(options.confirm !== undefined && { confirm: options.confirm }),
      }),
    );

    if (this.config.dryRun) {
      this.throwDryRun('app.emoji.delete', { emojiId });
    }

    await this.client.proxy
      .applications(this.config.discordApplicationId)
      .emojis(emojiId)
      .delete();
  }

  private toApplicationEmojiSummary(emoji: Record<string, unknown>): DiscordApplicationEmojiSummary {
    const summary: DiscordApplicationEmojiSummary = {
      id: emoji.id as string,
      name: (emoji.name as string | null) ?? null,
    };

    if (emoji.animated !== undefined) summary.animated = emoji.animated as boolean;
    if (emoji.available !== undefined) summary.available = emoji.available as boolean;

    return summary;
  }

  private decodeBase64DataUrl(image: string): Buffer {
    const match = image.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
    if (!match || !match[1]) {
      throw new ToolError('BAD_REQUEST', 'image must be a valid data URL with base64 encoding', {
        status: 400,
      });
    }
    return Buffer.from(match[1], 'base64');
  }

  private toInviteSummary(invite: Record<string, unknown>): DiscordInviteSummary {
    const candidate = invite as any;
    const summary: DiscordInviteSummary = {
      code: candidate.code,
      channelId: candidate.channel?.id ?? null,
    };

    if (candidate.guild?.id) summary.guildId = candidate.guild.id;
    if (candidate.inviter?.id) summary.inviterId = candidate.inviter.id;
    if (candidate.uses !== undefined) summary.uses = candidate.uses;
    if (candidate.maxUses !== undefined) summary.maxUses = candidate.maxUses;
    if (candidate.maxAge !== undefined) summary.maxAge = candidate.maxAge;
    if (candidate.temporary !== undefined) summary.temporary = candidate.temporary;
    if (candidate.createdAt !== undefined) summary.createdAt = candidate.createdAt;
    if (candidate.expiresAt !== undefined) summary.expiresAt = candidate.expiresAt;

    return summary;
  }

  private toAutoModerationRuleSummary(rule: AutoModerationRuleStructure): DiscordAutoModerationRuleSummary {
    const candidate = rule as any;
    const summary: DiscordAutoModerationRuleSummary = {
      id: rule.id,
      guildId: rule.guildId,
    };

    if (candidate.name !== undefined) summary.name = candidate.name;
    if (candidate.eventType !== undefined) summary.eventType = candidate.eventType;
    if (candidate.triggerType !== undefined) summary.triggerType = candidate.triggerType;
    if (candidate.enabled !== undefined) summary.enabled = candidate.enabled;
    if (Array.isArray(candidate.exemptRoles)) summary.exemptRoleIds = [...candidate.exemptRoles];
    if (Array.isArray(candidate.exemptChannels)) summary.exemptChannelIds = [...candidate.exemptChannels];
    if (Array.isArray(candidate.actions)) summary.actionsCount = candidate.actions.length;

    return summary;
  }

  private toGuildEmojiSummary(emoji: GuildEmojiStructure): DiscordGuildEmojiSummary {
    const candidate = emoji as any;
    const summary: DiscordGuildEmojiSummary = {
      id: emoji.id,
      guildId: emoji.guildId,
      name: emoji.name,
    };

    if (candidate.animated !== undefined) summary.animated = candidate.animated;
    if (candidate.available !== undefined) summary.available = candidate.available;
    if (Array.isArray(candidate.roles)) summary.roleIds = [...candidate.roles];

    return summary;
  }

  private toStickerSummary(sticker: StickerStructure): DiscordStickerSummary {
    const candidate = sticker as any;
    const summary: DiscordStickerSummary = {
      id: sticker.id,
      name: sticker.name,
    };

    if (typeof sticker.guildId === 'string') summary.guildId = sticker.guildId;
    if (candidate.description !== undefined) summary.description = candidate.description;
    if (candidate.tags !== undefined) summary.tags = candidate.tags;
    if (candidate.type !== undefined) summary.type = candidate.type;
    if (candidate.formatType !== undefined) summary.formatType = candidate.formatType;

    return summary;
  }

  private toSoundboardSoundSummary(sound: APISoundBoard, guildId: string): DiscordSoundboardSoundSummary {
    const summary: DiscordSoundboardSoundSummary = {
      id: sound.sound_id,
      guildId: sound.guild_id ?? guildId,
      name: sound.name,
    };

    if (sound.volume !== undefined) summary.volume = sound.volume;
    if (sound.emoji_id !== undefined) summary.emojiId = sound.emoji_id;
    if (sound.emoji_name !== undefined) summary.emojiName = sound.emoji_name;
    if (sound.available !== undefined) summary.available = sound.available;
    if (sound.user?.id !== undefined) summary.userId = sound.user.id;

    return summary;
  }

  private assertAutoModerationGuild(rule: AutoModerationRuleStructure, guildId: string, action: string): void {
    if (rule.guildId === guildId) return;
    throw new ToolError('UNAUTHORIZED_GUILD', `Auto moderation rule ${rule.id} is not in allowed guild ${guildId}`, {
      status: 403,
      details: { action, ruleId: rule.id, guildId: rule.guildId, expectedGuildId: guildId },
    });
  }

  private assertEmojiGuild(emoji: GuildEmojiStructure, guildId: string, action: string): void {
    if (emoji.guildId === guildId) return;
    throw new ToolError('UNAUTHORIZED_GUILD', `Emoji ${emoji.id} is not in allowed guild ${guildId}`, {
      status: 403,
      details: { action, emojiId: emoji.id, guildId: emoji.guildId, expectedGuildId: guildId },
    });
  }

  private assertStickerGuild(sticker: StickerStructure, guildId: string, action: string): void {
    if (sticker.guildId === guildId) return;
    throw new ToolError('UNAUTHORIZED_GUILD', `Sticker ${sticker.id} is not in allowed guild ${guildId}`, {
      status: 403,
      details: { action, stickerId: sticker.id, guildId: sticker.guildId, expectedGuildId: guildId },
    });
  }

  private assertInviteGuild(summary: DiscordInviteSummary, guildId: string, action: string): void {
    if (summary.guildId === undefined || summary.guildId === guildId) return;
    throw new ToolError('UNAUTHORIZED_GUILD', `Invite ${summary.code} is not in allowed guild ${guildId}`, {
      status: 403,
      details: { action, inviteCode: summary.code, guildId: summary.guildId, expectedGuildId: guildId },
    });
  }

  private async assertAutoModerationRuleBelongsToGuild(guildId: string, ruleId: string, action: string): Promise<void> {
    const rule = await this.client.guilds.moderation.fetch(guildId, ruleId);
    this.assertAutoModerationGuild(rule, guildId, action);
  }

  private async assertEmojiBelongsToGuild(guildId: string, emojiId: string, action: string): Promise<void> {
    const emoji = await this.client.emojis.fetch(guildId, emojiId, true);
    this.assertEmojiGuild(emoji, guildId, action);
  }

  private async assertStickerBelongsToGuild(guildId: string, stickerId: string, action: string): Promise<void> {
    const sticker = await this.client.guilds.stickers.fetch(guildId, stickerId, true);
    this.assertStickerGuild(sticker, guildId, action);
  }

  private async assertSoundboardSoundBelongsToGuild(guildId: string, soundId: string, action: string): Promise<void> {
    const sound = await this.client.soundboards.get(guildId, soundId);
    if (sound.guild_id === undefined || sound.guild_id === guildId) return;
    throw new ToolError('UNAUTHORIZED_GUILD', `Soundboard sound ${soundId} is not in allowed guild ${guildId}`, {
      status: 403,
      details: { action, soundId, guildId: sound.guild_id, expectedGuildId: guildId },
    });
  }

  private async getGuildIdForChannel(channelId: string, action: string): Promise<string> {
    const channel = await this.client.channels.fetch(channelId, true);
    const candidate = channel as any;
    if (typeof candidate.guildId !== 'string') {
      throw new ToolError('BAD_REQUEST', `Channel ${channelId} is not a guild channel`, {
        status: 400,
        details: { action, channelId },
      });
    }
    return candidate.guildId;
  }

  private assertInviteTargetCombination(options: CreateInviteOptions): void {
    const { targetType, targetUserId, targetApplicationId } = options;
    if (targetType === undefined) {
      if (targetUserId !== undefined || targetApplicationId !== undefined) {
        throw new ToolError('BAD_REQUEST', 'targetUserId/targetApplicationId require targetType', {
          status: 400,
          details: { targetType, targetUserId, targetApplicationId },
        });
      }
      return;
    }
    if (targetType === 1) {
      if (targetUserId === undefined) {
        throw new ToolError('BAD_REQUEST', 'targetType=1 requires targetUserId', {
          status: 400,
          details: { targetType },
        });
      }
      if (targetApplicationId !== undefined) {
        throw new ToolError('BAD_REQUEST', 'targetApplicationId is invalid when targetType=1', {
          status: 400,
          details: { targetType, targetApplicationId },
        });
      }
      return;
    }
    if (targetApplicationId === undefined) {
      throw new ToolError('BAD_REQUEST', 'targetType=2 requires targetApplicationId', {
        status: 400,
        details: { targetType },
      });
    }
    if (targetUserId !== undefined) {
      throw new ToolError('BAD_REQUEST', 'targetUserId is invalid when targetType=2', {
        status: 400,
        details: { targetType, targetUserId },
      });
    }
  }
}
