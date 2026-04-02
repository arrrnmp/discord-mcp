import type { GuildTemplateStructure } from 'seyfert/lib/client/transformers.js';
import type {
  APIGuild,
  APIGuildIntegration,
  APIGuildWelcomeScreen,
  APIGuildWidget,
  APIGuildWidgetSettings,
  RESTPatchAPIGuildJSONBody,
  RESTPatchAPIGuildTemplateJSONBody,
  RESTPatchAPIGuildWelcomeScreenJSONBody,
  RESTPatchAPIGuildWidgetSettingsJSONBody,
  RESTPostAPIGuildPruneJSONBody,
  RESTPostAPIGuildTemplatesJSONBody,
} from 'seyfert/lib/types/index.js';

import { DiscordBaseService } from './base.js';

export type DiscordGuildSettingsSummary = {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  afkChannelId: string | null;
  afkTimeout: number;
  systemChannelId: string | null;
  rulesChannelId: string | null;
  publicUpdatesChannelId: string | null;
  preferredLocale: string;
  features: string[];
  mfaLevel: number;
  explicitContentFilter: number;
  verificationLevel: number;
  defaultMessageNotifications: number;
  vanityUrlCode: string | null;
  premiumTier: number;
  premiumSubscriptionCount?: number;
  iconHash: string | null;
  splashHash: string | null;
  discoverySplashHash: string | null;
  bannerHash: string | null;
};

export type DiscordGuildWidgetSettingsSummary = {
  enabled: boolean;
  channelId: string | null;
};

export type DiscordGuildWelcomeScreenSummary = {
  description: string | null;
  welcomeChannels: Array<{
    channelId: string;
    description: string;
    emojiId: string | null;
    emojiName: string | null;
  }>;
};

export type DiscordGuildTemplateSummary = {
  code: string;
  name: string;
  description: string | null;
  usageCount: number;
  creatorId: string;
  sourceGuildId: string;
  isDirty: boolean | null;
  createdAt: string;
  updatedAt: string;
};

export type GetGuildPruneCountOptions = {
  days?: number;
  include_roles?: string; // Comma-separated IDs
};

export type DiscordGuildPruneCountSummary = {
  pruned: number;
  days: number;
  includeRoleIds: string[];
};

export type BeginGuildPruneOptions = {
  days?: number;
  computePruneCount?: boolean;
  includeRoleIds?: string[];
  reason?: string;
  confirm?: boolean;
};

export class DiscordGuildSettingsService extends DiscordBaseService {
  async fetchGuildSettings(guildId: string, force = true): Promise<DiscordGuildSettingsSummary> {
    this.assertGuildAllowed(guildId);
    const guild = await this.client.guilds.raw(guildId, { force });
    return this.toGuildSettingsSummary(guild);
  }

  async updateGuildSettings(guildId: string, body: RESTPatchAPIGuildJSONBody, reason?: string): Promise<DiscordGuildSettingsSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'guild.settings.update', { ...(reason !== undefined && { reason }) }));

    if (this.config.dryRun) {
      this.throwDryRun('guild.settings.update', { guildId, body });
    }

    const guild = await this.client.guilds.edit(guildId, body, reason);
    return this.toGuildSettingsSummary(guild as unknown as APIGuild);
  }

  async fetchGuildWidgetSettings(guildId: string): Promise<DiscordGuildWidgetSettingsSummary> {
    this.assertGuildAllowed(guildId);
    const settings = await this.client.proxy.guilds(guildId).widget.get();
    return {
      enabled: settings.enabled,
      channelId: settings.channel_id,
    };
  }

  async updateGuildWidgetSettings(
    guildId: string,
    body: RESTPatchAPIGuildWidgetSettingsJSONBody,
    reason?: string,
  ): Promise<DiscordGuildWidgetSettingsSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'guild.widget.update', { ...(reason !== undefined && { reason }) }));

    if (this.config.dryRun) {
      this.throwDryRun('guild.widget.update', { guildId, body });
    }

    const settings = await this.client.proxy.guilds(guildId).widget.patch({ body, ...(reason !== undefined && { reason }) });
    return {
      enabled: settings.enabled,
      channelId: settings.channel_id,
    };
  }

  async fetchGuildWidget(guildId: string): Promise<APIGuildWidget> {
    this.assertGuildAllowed(guildId);
    return this.client.proxy.guilds(guildId)['widget.json'].get();
  }

  async fetchGuildWelcomeScreen(guildId: string): Promise<DiscordGuildWelcomeScreenSummary> {
    this.assertGuildAllowed(guildId);
    const screen = await this.client.proxy.guilds(guildId)['welcome-screen'].get();
    return this.toWelcomeScreenSummary(screen);
  }

  async updateGuildWelcomeScreen(
    guildId: string,
    body: RESTPatchAPIGuildWelcomeScreenJSONBody,
    reason?: string,
  ): Promise<DiscordGuildWelcomeScreenSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'guild.welcome_screen.update', { ...(reason !== undefined && { reason }) }));

    if (this.config.dryRun) {
      this.throwDryRun('guild.welcome_screen.update', { guildId, body });
    }

    const screen = await this.client.proxy.guilds(guildId)['welcome-screen'].patch({ body, ...(reason !== undefined && { reason }) });
    return this.toWelcomeScreenSummary(screen);
  }

  async fetchGuildVanityUrl(guildId: string): Promise<{ code: string | null; uses: number }> {
    this.assertGuildAllowed(guildId);
    const vanity = await this.client.proxy.guilds(guildId)['vanity-url'].get();
    return {
      code: vanity.code,
      uses: vanity.uses,
    };
  }

  async getGuildPruneCount(guildId: string, options?: GetGuildPruneCountOptions): Promise<DiscordGuildPruneCountSummary> {
    this.assertGuildAllowed(guildId);
    const query: { days?: number; include_roles?: string } = {};
    if (options?.days !== undefined) query.days = options.days;
    if (options?.include_roles) query.include_roles = options.include_roles;

    const result = await this.client.proxy.guilds(guildId).prune.get({ query });
    return {
      pruned: result.pruned,
      days: options?.days ?? 7,
      includeRoleIds: options?.include_roles ? options.include_roles.split(',') : [],
    };
  }

  async beginGuildPrune(guildId: string, options: BeginGuildPruneOptions, mutation: { reason?: string; confirm?: boolean }): Promise<{ pruned: number | null }> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(mutation.confirm, 'guild.prune', { guildId });
    this.auditMutation(this.buildMutationContext(guildId, 'guild.prune', {
      ...(mutation.reason !== undefined && { reason: mutation.reason }),
      ...(mutation.confirm !== undefined && { confirm: mutation.confirm }),
    }));

    if (this.config.dryRun) {
      this.throwDryRun('guild.prune', { guildId, options });
    }

    const body: RESTPostAPIGuildPruneJSONBody = {};
    if (options.days !== undefined) body.days = options.days;
    if (options.computePruneCount !== undefined) body.compute_prune_count = options.computePruneCount;
    if (options.includeRoleIds) body.include_roles = options.includeRoleIds;

    const result = await this.client.proxy.guilds(guildId).prune.post({ body, ...(mutation.reason !== undefined && { reason: mutation.reason }) });
    return { pruned: result.pruned };
  }

  async listGuildTemplates(guildId: string): Promise<DiscordGuildTemplateSummary[]> {
    this.assertGuildAllowed(guildId);
    const templates = await this.client.templates.list(guildId);
    return templates.map((tpl) => this.toTemplateSummary(tpl));
  }

  async listGuildIntegrations(guildId: string): Promise<APIGuildIntegration[]> {
    this.assertGuildAllowed(guildId);
    return this.client.proxy.guilds(guildId).integrations.get() as Promise<APIGuildIntegration[]>;
  }

  async createGuildTemplate(guildId: string, body: RESTPostAPIGuildTemplatesJSONBody, reason?: string): Promise<DiscordGuildTemplateSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'guild.template.create', { ...(reason !== undefined && { reason }) }));
    if (this.config.dryRun) this.throwDryRun('guild.template.create', { guildId, name: body.name });
    const tpl = await this.client.proxy.guilds(guildId).templates.post({ body, ...(reason !== undefined && { reason }) });
    return this.toTemplateSummary(tpl as any);
  }

  async syncGuildTemplate(guildId: string, templateCode: string, reason?: string): Promise<DiscordGuildTemplateSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'guild.template.sync', { ...(reason !== undefined && { reason }) }));
    if (this.config.dryRun) this.throwDryRun('guild.template.sync', { guildId, templateCode });
    const tpl = await this.client.proxy.guilds(guildId).templates(templateCode).put();
    return this.toTemplateSummary(tpl as any);
  }

  async updateGuildTemplate(guildId: string, templateCode: string, body: RESTPatchAPIGuildTemplateJSONBody, reason?: string): Promise<DiscordGuildTemplateSummary> {
    this.assertGuildAllowed(guildId);
    this.auditMutation(this.buildMutationContext(guildId, 'guild.template.update', { ...(reason !== undefined && { reason }) }));
    if (this.config.dryRun) this.throwDryRun('guild.template.update', { guildId, templateCode });
    const tpl = await this.client.proxy.guilds(guildId).templates(templateCode).patch({ body, ...(reason !== undefined && { reason }) });
    return this.toTemplateSummary(tpl as any);
  }

  async deleteGuildTemplate(guildId: string, templateCode: string, options: { reason?: string; confirm?: boolean }): Promise<DiscordGuildTemplateSummary> {
    this.assertGuildAllowed(guildId);
    this.assertConfirm(options.confirm, 'guild.template.delete', { guildId, templateCode });
    this.auditMutation(this.buildMutationContext(guildId, 'guild.template.delete', {
      ...(options.reason !== undefined && { reason: options.reason }),
      ...(options.confirm !== undefined && { confirm: options.confirm }),
    }));
    if (this.config.dryRun) this.throwDryRun('guild.template.delete', { guildId, templateCode });
    const tpl = await this.client.proxy.guilds(guildId).templates(templateCode).delete();
    return this.toTemplateSummary(tpl as any);
  }

  private toGuildSettingsSummary(guild: APIGuild): DiscordGuildSettingsSummary {
    return {
      id: guild.id,
      name: guild.name,
      description: guild.description,
      ownerId: guild.owner_id,
      afkChannelId: guild.afk_channel_id,
      afkTimeout: guild.afk_timeout,
      systemChannelId: guild.system_channel_id,
      rulesChannelId: guild.rules_channel_id,
      publicUpdatesChannelId: guild.public_updates_channel_id,
      preferredLocale: guild.preferred_locale,
      features: [...guild.features],
      mfaLevel: guild.mfa_level,
      explicitContentFilter: guild.explicit_content_filter,
      verificationLevel: guild.verification_level,
      defaultMessageNotifications: guild.default_message_notifications,
      vanityUrlCode: guild.vanity_url_code,
      premiumTier: guild.premium_tier,
      ...(guild.premium_subscription_count !== undefined && { premiumSubscriptionCount: guild.premium_subscription_count }),
      iconHash: guild.icon,
      splashHash: guild.splash,
      discoverySplashHash: guild.discovery_splash,
      bannerHash: guild.banner,
    };
  }

  private toWelcomeScreenSummary(screen: APIGuildWelcomeScreen): DiscordGuildWelcomeScreenSummary {
    return {
      description: screen.description,
      welcomeChannels: (screen.welcome_channels ?? []).map((ch) => ({
        channelId: ch.channel_id,
        description: ch.description,
        emojiId: ch.emoji_id,
        emojiName: ch.emoji_name,
      })),
    };
  }

  private toTemplateSummary(tpl: GuildTemplateStructure): DiscordGuildTemplateSummary {
    const raw = tpl as any;
    return {
      code: raw.code,
      name: raw.name,
      description: raw.description,
      usageCount: raw.usage_count,
      creatorId: raw.creator_id,
      sourceGuildId: raw.source_guild_id,
      isDirty: raw.is_dirty,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }
}
