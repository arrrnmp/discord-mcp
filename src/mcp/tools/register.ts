import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ThreadCreateBodyRequest } from 'seyfert/lib/common/index.js';
import type { GuildChannelTypes } from 'seyfert/lib/structures/channels.js';
import type {
  AuditLogEvent,
  AutoModerationActionType,
  AutoModerationRuleKeywordPresetType,
  GuildDefaultMessageNotifications,
  GuildExplicitContentFilter,
  GuildVerificationLevel,
  OverwriteType,
  RESTGetAPIAuditLogQuery,
  RESTGetAPIGuildPruneCountQuery,
  RESTPatchAPIGuildJSONBody,
  RESTPatchAPIGuildTemplateJSONBody,
  RESTPatchAPIGuildWelcomeScreenJSONBody,
  RESTPatchAPIGuildWidgetSettingsJSONBody,
  RESTPatchAPIAutoModerationRuleJSONBody,
  RESTPostAPIGuildPruneJSONBody,
  RESTPostAPIGuildTemplatesJSONBody,
  RESTPostAPIAutoModerationRuleJSONBody,
} from 'seyfert/lib/types/index.js';
import { z } from 'zod';

import { DiscordAuditLogsService } from '../../discord/audit-logs.js';
import { DiscordGuildSettingsService } from '../../discord/guild-settings.js';
import { DiscordMembersService } from '../../discord/members.js';
import { DiscordMessagesService } from '../../discord/messages.js';
import { DiscordPresenceService } from '../../discord/presence.js';
import { DiscordScheduledEventsService, type UpdateScheduledEventOptions } from '../../discord/scheduled-events.js';
import type { DiscordService } from '../../discord/service.js';
import { DiscordSpecialService } from '../../discord/special.js';
import { DiscordStageService } from '../../discord/stage.js';
import { DiscordStickerPacksService } from '../../discord/sticker-packs.js';
import { DiscordThreadsService } from '../../discord/threads.js';
import { DiscordWebhooksService } from '../../discord/webhooks.js';
import { logger } from '../../lib/logging.js';
import {
  createChannelInputSchema,
  deleteChannelInputSchema,
  deleteChannelPermissionOverwriteInputSchema,
  listChannelPermissionOverwritesInputSchema,
  setChannelPermissionOverwriteInputSchema,
  updateChannelInputSchema,
} from '../schemas/channel.js';
import { normalizeHexColor } from '../schemas/common.js';
import {
  getGatewayInfoInputSchema,
  getGuildInventoryInputSchema,
  listGuildVoiceRegionsInputSchema,
  listGuildsInputSchema,
  listVoiceRegionsInputSchema,
} from '../schemas/guild.js';
import {
  beginGuildPruneInputSchema,
  createGuildTemplateInputSchema,
  deleteGuildTemplateInputSchema,
  getGuildPruneCountInputSchema,
  getGuildSettingsInputSchema,
  getGuildVanityUrlInputSchema,
  getGuildWelcomeScreenInputSchema,
  getGuildWidgetSettingsInputSchema,
  listGuildIntegrationsInputSchema,
  listGuildTemplatesInputSchema,
  syncGuildTemplateInputSchema,
  updateGuildSettingsInputSchema,
  updateGuildTemplateInputSchema,
  updateGuildWelcomeScreenInputSchema,
  updateGuildWidgetSettingsInputSchema,
} from '../schemas/guild-settings.js';
import {
  addMemberRoleInputSchema,
  banMemberInputSchema,
  bulkBanMembersInputSchema,
  editMemberBasicsInputSchema,
  fetchGuildBanInputSchema,
  fetchMemberInputSchema,
  kickMemberInputSchema,
  listGuildBansInputSchema,
  listMembersInputSchema,
  removeMemberRoleInputSchema,
  searchMembersInputSchema,
  setCurrentMemberVoiceStateInputSchema,
  setMemberVoiceStateInputSchema,
  setMemberTimeoutInputSchema,
  unbanMemberInputSchema,
} from '../schemas/member.js';
import {
  addReactionInputSchema,
  clearEmojiReactionsInputSchema,
  clearReactionsInputSchema,
  crosspostMessageInputSchema,
  deleteMessageInputSchema,
  editMessageInputSchema,
  endPollInputSchema,
  fetchMessageInputSchema,
  listPinnedMessagesInputSchema,
  listChannelMessagesInputSchema,
  listPollAnswerVotersInputSchema,
  listReactionUsersInputSchema,
  pinMessageInputSchema,
  purgeMessagesInputSchema,
  removeOwnReactionInputSchema,
  removeUserReactionInputSchema,
  sendMessageInputSchema,
  unpinMessageInputSchema,
} from '../schemas/message.js';
import { getPresenceStateInputSchema, setPresenceInputSchema } from '../schemas/presence.js';
import { modifyGuildChannelPositionsInputSchema, modifyGuildRolePositionsInputSchema } from '../schemas/reorder.js';
import { createRoleInputSchema, deleteRoleInputSchema, updateRoleInputSchema } from '../schemas/role.js';
import { listGuildAuditLogsInputSchema } from '../schemas/audit-log.js';
import {
  createApplicationEmojiInputSchema,
  createAutoModerationRuleInputSchema,
  createChannelInviteInputSchema,
  createGuildEmojiInputSchema,
  createGuildStickerInputSchema,
  createGuildSoundboardSoundInputSchema,
  deleteApplicationEmojiInputSchema,
  deleteAutoModerationRuleInputSchema,
  deleteGuildEmojiInputSchema,
  deleteGuildSoundboardSoundInputSchema,
  deleteGuildStickerInputSchema,
  deleteInviteInputSchema,
  listApplicationEmojisInputSchema,
  listAutoModerationRulesInputSchema,
  listGuildEmojisInputSchema,
  listGuildInvitesInputSchema,
  listGuildSoundboardSoundsInputSchema,
  listGuildStickersInputSchema,
  updateApplicationEmojiInputSchema,
  updateAutoModerationRuleInputSchema,
  updateGuildEmojiInputSchema,
  updateGuildSoundboardSoundInputSchema,
  updateGuildStickerInputSchema,
} from '../schemas/special.js';
import {
  createThreadInputSchema,
  deleteThreadInputSchema,
  joinThreadInputSchema,
  leaveThreadInputSchema,
  lockThreadInputSchema,
  removeThreadMemberInputSchema,
  unlockThreadInputSchema,
  updateThreadInputSchema,
} from '../schemas/thread.js';
import {
  createScheduledEventInputSchema,
  deleteScheduledEventInputSchema,
  fetchScheduledEventInputSchema,
  listScheduledEventUsersInputSchema,
  listScheduledEventsInputSchema,
  updateScheduledEventInputSchema,
} from '../schemas/scheduled-event.js';
import {
  createStageInstanceInputSchema,
  deleteStageInstanceInputSchema,
  fetchStageInstanceInputSchema,
  getGuildPreviewInputSchema,
  listActiveThreadsInputSchema,
  updateStageInstanceInputSchema,
} from '../schemas/stage.js';
import {
  getInviteTargetUserJobStatusInputSchema,
  getInviteTargetUsersInputSchema,
  getRoleMemberCountsInputSchema,
  updateInviteTargetUsersInputSchema,
} from '../schemas/role-invite-parity.js';
import {
  getStickerInputSchema,
  getStickerPackInputSchema,
  listStickerPacksInputSchema,
} from '../schemas/sticker-pack.js';
import {
  createWebhookInputSchema,
  deleteWebhookMessageByTokenInputSchema,
  deleteWebhookInputSchema,
  editWebhookMessageByTokenInputSchema,
  executeWebhookByTokenInputSchema,
  fetchWebhookMessageByTokenInputSchema,
  listChannelWebhooksInputSchema,
  listGuildWebhooksInputSchema,
  updateWebhookInputSchema,
} from '../schemas/webhook.js';
import { withToolResult } from './helpers.js';

type ToolContext = {
  server: McpServer;
  discord: DiscordService;
  members: DiscordMembersService;
  messages: DiscordMessagesService;
  presence: DiscordPresenceService;
  special: DiscordSpecialService;
  scheduledEvents: DiscordScheduledEventsService;
  guildSettings: DiscordGuildSettingsService;
  auditLogs: DiscordAuditLogsService;
  webhooks: DiscordWebhooksService;
  threads: DiscordThreadsService;
  stage: DiscordStageService;
  stickerPacks: DiscordStickerPacksService;
};

function permissionsToBitfield(permissions: Array<number | string> | undefined): string | undefined {
  if (!permissions || permissions.length === 0) {
    return undefined;
  }

  return permissions.map((value) => BigInt(value)).reduce((acc, value) => acc | value, 0n).toString();
}

function toAutoModerationActions(
  actions: Array<{
    type: AutoModerationActionType;
    channelId?: string | undefined;
    durationSeconds?: number | undefined;
    customMessage?: string | undefined;
  }>,
): RESTPostAPIAutoModerationRuleJSONBody['actions'] {
  return actions.map((action) => {
    const payload: RESTPostAPIAutoModerationRuleJSONBody['actions'][number] = {
      type: action.type,
    };

    const metadata: {
      channel_id?: string;
      duration_seconds?: number;
      custom_message?: string;
    } = {};

    if (action.channelId !== undefined) {
      metadata.channel_id = action.channelId;
    }

    if (action.durationSeconds !== undefined) {
      metadata.duration_seconds = action.durationSeconds;
    }

    if (action.customMessage !== undefined) {
      metadata.custom_message = action.customMessage;
    }

    if (Object.keys(metadata).length > 0) {
      payload.metadata = metadata;
    }

    return payload;
  });
}

function toAutoModerationTriggerMetadata(
  triggerMetadata:
    | {
        keywordFilter?: string[] | undefined;
        presets?: AutoModerationRuleKeywordPresetType[] | undefined;
        allowList?: string[] | undefined;
        regexPatterns?: string[] | undefined;
        mentionTotalLimit?: number | undefined;
        mentionRaidProtectionEnabled?: boolean | undefined;
      }
    | undefined,
): RESTPostAPIAutoModerationRuleJSONBody['trigger_metadata'] {
  if (!triggerMetadata) {
    return undefined;
  }

  const metadata: NonNullable<RESTPostAPIAutoModerationRuleJSONBody['trigger_metadata']> = {};

  if (triggerMetadata.keywordFilter !== undefined) {
    metadata.keyword_filter = triggerMetadata.keywordFilter;
  }

  if (triggerMetadata.presets !== undefined) {
    metadata.presets = triggerMetadata.presets;
  }

  if (triggerMetadata.allowList !== undefined) {
    metadata.allow_list = triggerMetadata.allowList;
  }

  if (triggerMetadata.regexPatterns !== undefined) {
    metadata.regex_patterns = triggerMetadata.regexPatterns;
  }

  if (triggerMetadata.mentionTotalLimit !== undefined) {
    metadata.mention_total_limit = triggerMetadata.mentionTotalLimit;
  }

  if (triggerMetadata.mentionRaidProtectionEnabled !== undefined) {
    metadata.mention_raid_protection_enabled = triggerMetadata.mentionRaidProtectionEnabled;
  }

  if (Object.keys(metadata).length === 0) {
    return undefined;
  }

  return metadata;
}

function toGuildSettingsPatchBody(
  patch: z.infer<typeof updateGuildSettingsInputSchema>['patch'],
): RESTPatchAPIGuildJSONBody {
  const body: RESTPatchAPIGuildJSONBody = {};

  if (patch.name !== undefined) {
    body.name = patch.name;
  }

  if (patch.icon !== undefined) {
    body.icon = patch.icon;
  }

  if (patch.description !== undefined) {
    body.description = patch.description;
  }

  if (patch.preferredLocale !== undefined) {
    body.preferred_locale = patch.preferredLocale;
  }

  if (patch.verificationLevel !== undefined) {
    body.verification_level = patch.verificationLevel as GuildVerificationLevel | null;
  }

  if (patch.defaultMessageNotifications !== undefined) {
    body.default_message_notifications =
      patch.defaultMessageNotifications as GuildDefaultMessageNotifications | null;
  }

  if (patch.explicitContentFilter !== undefined) {
    body.explicit_content_filter = patch.explicitContentFilter as GuildExplicitContentFilter | null;
  }

  if (patch.afkChannelId !== undefined) {
    body.afk_channel_id = patch.afkChannelId;
  }

  if (patch.afkTimeout !== undefined) {
    body.afk_timeout = patch.afkTimeout;
  }

  if (patch.systemChannelId !== undefined) {
    body.system_channel_id = patch.systemChannelId;
  }

  if (patch.systemChannelFlags !== undefined) {
    body.system_channel_flags = patch.systemChannelFlags;
  }

  if (patch.rulesChannelId !== undefined) {
    body.rules_channel_id = patch.rulesChannelId;
  }

  if (patch.publicUpdatesChannelId !== undefined) {
    body.public_updates_channel_id = patch.publicUpdatesChannelId;
  }

  if (patch.safetyAlertsChannelId !== undefined) {
    body.safety_alerts_channel_id = patch.safetyAlertsChannelId;
  }

  if (patch.premiumProgressBarEnabled !== undefined) {
    body.premium_progress_bar_enabled = patch.premiumProgressBarEnabled;
  }

  return body;
}

function toGuildWidgetSettingsPatchBody(
  patch: z.infer<typeof updateGuildWidgetSettingsInputSchema>['patch'],
): RESTPatchAPIGuildWidgetSettingsJSONBody {
  const body: RESTPatchAPIGuildWidgetSettingsJSONBody = {};

  if (patch.enabled !== undefined) {
    body.enabled = patch.enabled;
  }

  if (patch.channelId !== undefined) {
    body.channel_id = patch.channelId;
  }

  return body;
}

function toGuildPruneCountQuery(input: z.infer<typeof getGuildPruneCountInputSchema>): RESTGetAPIGuildPruneCountQuery {
  const query: RESTGetAPIGuildPruneCountQuery = {};

  if (input.days !== undefined) {
    query.days = input.days;
  }

  if (input.includeRoleIds !== undefined && input.includeRoleIds.length > 0) {
    query.include_roles = input.includeRoleIds.join(',');
  }

  return query;
}

function toGuildPruneBody(input: z.infer<typeof beginGuildPruneInputSchema>): { days?: number; computePruneCount?: boolean; includeRoleIds?: string[] } {
  const body: { days?: number; computePruneCount?: boolean; includeRoleIds?: string[] } = {};

  if (input.days !== undefined) {
    body.days = input.days;
  }

  if (input.computePruneCount !== undefined) {
    body.computePruneCount = input.computePruneCount;
  }

  if (input.includeRoleIds !== undefined) {
    body.includeRoleIds = input.includeRoleIds;
  }

  return body;
}

function toWelcomeScreenPatchBody(
  input: z.infer<typeof updateGuildWelcomeScreenInputSchema>,
): RESTPatchAPIGuildWelcomeScreenJSONBody {
  const body: RESTPatchAPIGuildWelcomeScreenJSONBody = {};

  if (input.enabled !== undefined) {
    body.enabled = input.enabled;
  }

  if (input.description !== undefined) {
    body.description = input.description;
  }

  if (input.welcomeChannels !== undefined) {
    body.welcome_channels = input.welcomeChannels.map((channel) => {
      const channelBody: {
        channel_id: string;
        description: string;
        emoji_id: string | null;
        emoji_name: string | null;
      } = {
        channel_id: channel.channelId,
        description: channel.description,
        emoji_id: channel.emojiId ?? null,
        emoji_name: channel.emojiName ?? null,
      };

      return channelBody;
    });
  }

  return body;
}

function toCreateGuildTemplateBody(
  input: z.infer<typeof createGuildTemplateInputSchema>,
): RESTPostAPIGuildTemplatesJSONBody {
  const body: RESTPostAPIGuildTemplatesJSONBody = {
    name: input.name,
  };

  if (input.description !== undefined) {
    body.description = input.description;
  }

  return body;
}

function toUpdateGuildTemplateBody(
  input: z.infer<typeof updateGuildTemplateInputSchema>,
): RESTPatchAPIGuildTemplateJSONBody {
  const body: RESTPatchAPIGuildTemplateJSONBody = {};

  if (input.name !== undefined) {
    body.name = input.name;
  }

  if (input.description !== undefined) {
    body.description = input.description;
  }

  return body;
}

function toAuditLogQuery(input: z.infer<typeof listGuildAuditLogsInputSchema>): RESTGetAPIAuditLogQuery {
  const query: RESTGetAPIAuditLogQuery = {};

  if (input.userId !== undefined) {
    query.user_id = input.userId;
  }

  if (input.actionType !== undefined) {
    query.action_type = input.actionType as AuditLogEvent;
  }

  if (input.before !== undefined) {
    query.before = input.before;
  }

  if (input.after !== undefined) {
    query.after = input.after;
  }

  if (input.limit !== undefined) {
    query.limit = input.limit;
  }

  return query;
}

function registerTool<TSchema extends z.ZodObject<z.ZodRawShape>>(
  context: ToolContext,
  config: {
    name: string;
    description: string;
    inputSchema: TSchema;
    run: (input: z.infer<TSchema>) => Promise<Record<string, unknown>>;
  },
): void {
  const inputShape = config.inputSchema.shape as z.ZodRawShape;

  context.server.registerTool(
    config.name,
    {
      description: config.description,
      inputSchema: inputShape,
    },
    async (input: Record<string, unknown>, _extra) => {
      const sanitizedInput = { ...input };
      if (config.name === 'discord_execute_webhook_by_token' && 'token' in sanitizedInput) {
        sanitizedInput.token = '[REDACTED]';
      }
      logger.debug('mcp.tool.call', { tool: config.name, input: sanitizedInput });
      const parsed = config.inputSchema.parse(input);
      return withToolResult(async () => config.run(parsed));
    },
  );
}

export function registerDiscordTools(context: ToolContext): void {
  registerTool(context, {
    name: 'discord_list_guilds',
    description: 'List guilds available to the bot',
    inputSchema: listGuildsInputSchema,
    run: async () => {
      const guilds = await context.discord.listGuilds();
      return { guilds };
    },
  });

  registerTool(context, {
    name: 'discord_get_guild_inventory',
    description:
      'Get detailed guild inventory for channels, categories, and roles for MCP-friendly introspection',
    inputSchema: getGuildInventoryInputSchema,
    run: async ({ guildId, force }) => {
      const inventory = await context.discord.getGuildInventory(guildId, force);
      return { inventory };
    },
  });

  registerTool(context, {
    name: 'discord_list_guild_voice_regions',
    description: 'List voice regions available to a guild',
    inputSchema: listGuildVoiceRegionsInputSchema,
    run: async ({ guildId }) => {
      const regions = await context.discord.listGuildVoiceRegions(guildId);
      return { regions };
    },
  });

  registerTool(context, {
    name: 'discord_list_voice_regions',
    description: 'List global voice regions',
    inputSchema: listVoiceRegionsInputSchema,
    run: async () => {
      const regions = await context.discord.listVoiceRegions();
      return { regions };
    },
  });

  registerTool(context, {
    name: 'discord_get_guild_settings',
    description: 'Get guild settings and metadata summary',
    inputSchema: getGuildSettingsInputSchema,
    run: async ({ guildId, force }) => {
      const guild = await context.guildSettings.fetchGuildSettings(guildId, force);
      return { guild };
    },
  });

  registerTool(context, {
    name: 'discord_update_guild_settings',
    description: 'Update guild settings',
    inputSchema: updateGuildSettingsInputSchema,
    run: async ({ guildId, patch, reason }) => {
      const guild = await context.guildSettings.updateGuildSettings(guildId, toGuildSettingsPatchBody(patch), reason);
      return { guild };
    },
  });

  registerTool(context, {
    name: 'discord_get_guild_widget_settings',
    description: 'Get guild widget settings',
    inputSchema: getGuildWidgetSettingsInputSchema,
    run: async ({ guildId }) => {
      const widget = await context.guildSettings.fetchGuildWidgetSettings(guildId);
      return { widget };
    },
  });

  registerTool(context, {
    name: 'discord_update_guild_widget_settings',
    description: 'Update guild widget settings',
    inputSchema: updateGuildWidgetSettingsInputSchema,
    run: async ({ guildId, patch, reason }) => {
      const widget = await context.guildSettings.updateGuildWidgetSettings(
        guildId,
        toGuildWidgetSettingsPatchBody(patch),
        reason,
      );
      return { widget };
    },
  });

  registerTool(context, {
    name: 'discord_get_guild_vanity_url',
    description: 'Get guild vanity URL',
    inputSchema: getGuildVanityUrlInputSchema,
    run: async ({ guildId }) => {
      const vanity = await context.guildSettings.fetchGuildVanityUrl(guildId);
      return { vanity };
    },
  });

  registerTool(context, {
    name: 'discord_get_guild_prune_count',
    description: 'Get estimated prune count for a guild',
    inputSchema: getGuildPruneCountInputSchema,
    run: async (input) => {
      const prune = await context.guildSettings.getGuildPruneCount(input.guildId, toGuildPruneCountQuery(input));
      return { prune };
    },
  });

  registerTool(context, {
    name: 'discord_begin_guild_prune',
    description: 'Begin guild prune (requires confirm=true)',
    inputSchema: beginGuildPruneInputSchema,
    run: async (input) => {
      const options: { reason?: string; confirm?: boolean } = { confirm: input.confirm };
      if (input.reason !== undefined) {
        options.reason = input.reason;
      }
      const prune = await context.guildSettings.beginGuildPrune(input.guildId, toGuildPruneBody(input), options);
      return { prune };
    },
  });

  registerTool(context, {
    name: 'discord_list_guild_integrations',
    description: 'List guild integrations',
    inputSchema: listGuildIntegrationsInputSchema,
    run: async ({ guildId }) => {
      const integrations = await context.guildSettings.listGuildIntegrations(guildId);
      return { integrations };
    },
  });

  registerTool(context, {
    name: 'discord_get_guild_welcome_screen',
    description: 'Get guild welcome screen',
    inputSchema: getGuildWelcomeScreenInputSchema,
    run: async ({ guildId }) => {
      const welcomeScreen = await context.guildSettings.fetchGuildWelcomeScreen(guildId);
      return { welcomeScreen };
    },
  });

  registerTool(context, {
    name: 'discord_update_guild_welcome_screen',
    description: 'Update guild welcome screen',
    inputSchema: updateGuildWelcomeScreenInputSchema,
    run: async (input) => {
      const welcomeScreen = await context.guildSettings.updateGuildWelcomeScreen(
        input.guildId,
        toWelcomeScreenPatchBody(input),
        input.reason,
      );
      return { welcomeScreen };
    },
  });

  registerTool(context, {
    name: 'discord_list_guild_templates',
    description: 'List guild templates',
    inputSchema: listGuildTemplatesInputSchema,
    run: async ({ guildId }) => {
      const templates = await context.guildSettings.listGuildTemplates(guildId);
      return { templates };
    },
  });

  registerTool(context, {
    name: 'discord_create_guild_template',
    description: 'Create a guild template',
    inputSchema: createGuildTemplateInputSchema,
    run: async (input) => {
      const template = await context.guildSettings.createGuildTemplate(
        input.guildId,
        toCreateGuildTemplateBody(input),
        input.reason,
      );
      return { template };
    },
  });

  registerTool(context, {
    name: 'discord_sync_guild_template',
    description: 'Sync a guild template with current guild state',
    inputSchema: syncGuildTemplateInputSchema,
    run: async ({ guildId, templateCode, reason }) => {
      const template = await context.guildSettings.syncGuildTemplate(guildId, templateCode, reason);
      return { template };
    },
  });

  registerTool(context, {
    name: 'discord_update_guild_template',
    description: 'Update guild template metadata',
    inputSchema: updateGuildTemplateInputSchema,
    run: async (input) => {
      const template = await context.guildSettings.updateGuildTemplate(
        input.guildId,
        input.templateCode,
        toUpdateGuildTemplateBody(input),
        input.reason,
      );
      return { template };
    },
  });

  registerTool(context, {
    name: 'discord_delete_guild_template',
    description: 'Delete a guild template (requires confirm=true)',
    inputSchema: deleteGuildTemplateInputSchema,
    run: async ({ guildId, templateCode, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = { confirm };
      if (reason !== undefined) {
        options.reason = reason;
      }
      const deletedTemplate = await context.guildSettings.deleteGuildTemplate(guildId, templateCode, options);
      return { deletedTemplate };
    },
  });

  registerTool(context, {
    name: 'discord_list_guild_audit_logs',
    description: 'List guild audit logs with optional filters',
    inputSchema: listGuildAuditLogsInputSchema,
    run: async (input) => {
      const auditLogs = await context.auditLogs.fetchAuditLogs(input.guildId, toAuditLogQuery(input));
      return { auditLogs };
    },
  });

  registerTool(context, {
    name: 'discord_create_channel',
    description: 'Create a guild channel or category',
    inputSchema: createChannelInputSchema,
    run: async ({ guildId, name, type, topic, parentId, position, nsfw, reason }) => {
      const channel = await context.discord.createChannel(
        guildId,
        {
          name,
          type: type as GuildChannelTypes,
          topic,
          parent_id: parentId,
          position,
          nsfw,
        },
        reason,
      );

      return { channel };
    },
  });

  registerTool(context, {
    name: 'discord_update_channel',
    description: 'Update channel properties like topic, category, and position',
    inputSchema: updateChannelInputSchema,
    run: async ({ guildId, channelId, name, topic, parentId, position, nsfw, reason }) => {
      const channel = await context.discord.updateChannel(
        guildId,
        channelId,
        {
          name,
          topic,
          parent_id: parentId,
          position,
          nsfw,
        },
        reason,
      );

      return { channel };
    },
  });

  registerTool(context, {
    name: 'discord_list_channel_permission_overwrites',
    description: 'List permission overwrites for a channel or category',
    inputSchema: listChannelPermissionOverwritesInputSchema,
    run: async ({ guildId, channelId }) => {
      const permissionOverwrites = await context.discord.listChannelPermissionOverwrites(guildId, channelId);
      return { permissionOverwrites };
    },
  });

  registerTool(context, {
    name: 'discord_set_channel_permission_overwrite',
    description: 'Create or update a channel permission overwrite',
    inputSchema: setChannelPermissionOverwriteInputSchema,
    run: async ({ guildId, channelId, overwriteId, type, allow, deny, reason }) => {
      const permissionOverwrite = await context.discord.setChannelPermissionOverwrite(
        guildId,
        channelId,
        overwriteId,
        {
          type: type as OverwriteType,
          ...(allow !== undefined ? { allow } : {}),
          ...(deny !== undefined ? { deny } : {}),
        },
        reason,
      );
      return { permissionOverwrite };
    },
  });

  registerTool(context, {
    name: 'discord_delete_channel_permission_overwrite',
    description: 'Delete a channel permission overwrite (requires confirm=true)',
    inputSchema: deleteChannelPermissionOverwriteInputSchema,
    run: async ({ guildId, channelId, overwriteId, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      const deletedPermissionOverwrite = await context.discord.deleteChannelPermissionOverwrite(
        guildId,
        channelId,
        overwriteId,
        options,
      );

      return { deletedPermissionOverwrite };
    },
  });

  registerTool(context, {
    name: 'discord_delete_channel',
    description: 'Delete a channel (requires confirm=true)',
    inputSchema: deleteChannelInputSchema,
    run: async ({ guildId, channelId, reason, confirm }) => {
      const options: { confirm: boolean; reason?: string } = { confirm };
      if (reason !== undefined) {
        options.reason = reason;
      }

      const deletedChannel = await context.discord.deleteChannel(guildId, channelId, options);

      return { deletedChannel };
    },
  });

  registerTool(context, {
    name: 'discord_create_role',
    description: 'Create a role with optional color and permissions',
    inputSchema: createRoleInputSchema,
    run: async ({ guildId, name, color, permissions, hoist, mentionable, reason }) => {
      const role = await context.discord.createRole(
        guildId,
        {
          name,
          color: color ? normalizeHexColor(color) : undefined,
          permissions: permissionsToBitfield(permissions),
          hoist,
          mentionable,
        },
        reason,
      );

      return { role };
    },
  });

  registerTool(context, {
    name: 'discord_update_role',
    description: 'Update role attributes including color, permissions, and position',
    inputSchema: updateRoleInputSchema,
    run: async ({ guildId, roleId, name, color, permissions, hoist, mentionable, position, reason }) => {
      const role = await context.discord.updateRole(
        guildId,
        roleId,
        {
          name,
          color: color ? normalizeHexColor(color) : undefined,
          permissions: permissionsToBitfield(permissions),
          hoist,
          mentionable,
        },
        reason,
      );

      return { role };
    },
  });

  registerTool(context, {
    name: 'discord_delete_role',
    description: 'Delete a role (requires confirm=true)',
    inputSchema: deleteRoleInputSchema,
    run: async ({ guildId, roleId, reason, confirm }) => {
      const options: { confirm: boolean; reason?: string } = { confirm };
      if (reason !== undefined) {
        options.reason = reason;
      }

      await context.discord.deleteRole(guildId, roleId, options);

      return {
        deletedRole: {
          guildId,
          roleId,
        },
      };
    },
  });

  registerTool(context, {
    name: 'discord_list_members',
    description: 'List members in a guild with optional pagination',
    inputSchema: listMembersInputSchema,
    run: async ({ guildId, limit, after, force }) => {
      const options: { limit?: number; after?: string; force?: boolean } = {};

      if (limit !== undefined) {
        options.limit = limit;
      }

      if (after !== undefined) {
        options.after = after;
      }

      if (force !== undefined) {
        options.force = force;
      }

      const membersList = await context.members.listMembers(guildId, options);

      return { members: membersList };
    },
  });

  registerTool(context, {
    name: 'discord_fetch_member',
    description: 'Fetch a specific guild member',
    inputSchema: fetchMemberInputSchema,
    run: async ({ guildId, memberId, force }) => {
      const member = await context.members.fetchMember(guildId, memberId, force);
      return { member };
    },
  });

  registerTool(context, {
    name: 'discord_edit_member',
    description: 'Edit member basics like nickname and timeout',
    inputSchema: editMemberBasicsInputSchema,
    run: async ({ guildId, memberId, nickname, timeoutSeconds, reason }) => {
      const options: { nickname?: string | null; timeoutSeconds?: number | null; reason?: string } = {};

      if (nickname !== undefined) {
        options.nickname = nickname;
      }

      if (timeoutSeconds !== undefined) {
        options.timeoutSeconds = timeoutSeconds;
      }

      if (reason !== undefined) {
        options.reason = reason;
      }

      const member = await context.members.editMemberBasics(guildId, memberId, options);
      return { member };
    },
  });

  registerTool(context, {
    name: 'discord_kick_member',
    description: 'Kick a member from a guild (requires confirm=true)',
    inputSchema: kickMemberInputSchema,
    run: async ({ guildId, memberId, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      await context.members.kickMember(guildId, memberId, options);
      return { kicked: { guildId, memberId } };
    },
  });

  registerTool(context, {
    name: 'discord_add_member_role',
    description: 'Add a role to a guild member',
    inputSchema: addMemberRoleInputSchema,
    run: async ({ guildId, memberId, roleId, reason }) => {
      const member = await context.members.addRoleToMember(guildId, memberId, roleId, reason);
      return { member };
    },
  });

  registerTool(context, {
    name: 'discord_remove_member_role',
    description: 'Remove a role from a guild member',
    inputSchema: removeMemberRoleInputSchema,
    run: async ({ guildId, memberId, roleId, reason }) => {
      const member = await context.members.removeRoleFromMember(guildId, memberId, roleId, reason);
      return { member };
    },
  });

  registerTool(context, {
    name: 'discord_search_members',
    description: 'Search members in a guild by nickname or username',
    inputSchema: searchMembersInputSchema,
    run: async ({ guildId, query, limit }) => {
      const members = await context.members.searchMembers(guildId, {
        query,
        limit,
      });
      return { members };
    },
  });

  registerTool(context, {
    name: 'discord_set_member_timeout',
    description: 'Set or clear member timeout',
    inputSchema: setMemberTimeoutInputSchema,
    run: async ({ guildId, memberId, timeoutSeconds, reason }) => {
      const member = await context.members.setMemberTimeout(guildId, memberId, timeoutSeconds, reason);
      return { member };
    },
  });

  registerTool(context, {
    name: 'discord_list_guild_bans',
    description: 'List bans in a guild',
    inputSchema: listGuildBansInputSchema,
    run: async ({ guildId, limit, before, after, force }) => {
      const options: { limit?: number; before?: string; after?: string; force?: boolean } = {};
      if (limit !== undefined) {
        options.limit = limit;
      }
      if (before !== undefined) {
        options.before = before;
      }
      if (after !== undefined) {
        options.after = after;
      }
      if (force !== undefined) {
        options.force = force;
      }

      const bans = await context.members.listGuildBans(guildId, options);
      return { bans };
    },
  });

  registerTool(context, {
    name: 'discord_fetch_guild_ban',
    description: 'Fetch a specific guild ban',
    inputSchema: fetchGuildBanInputSchema,
    run: async ({ guildId, userId, force }) => {
      const ban = await context.members.fetchGuildBan(guildId, userId, force);
      return { ban };
    },
  });

  registerTool(context, {
    name: 'discord_ban_member',
    description: 'Ban a member from a guild (requires confirm=true)',
    inputSchema: banMemberInputSchema,
    run: async ({ guildId, memberId, deleteMessageSeconds, reason, confirm }) => {
      const options: { deleteMessageSeconds?: number; reason?: string; confirm?: boolean } = {};
      if (deleteMessageSeconds !== undefined) {
        options.deleteMessageSeconds = deleteMessageSeconds;
      }
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      await context.members.banMember(guildId, memberId, options);

      return { banned: { guildId, memberId } };
    },
  });

  registerTool(context, {
    name: 'discord_bulk_ban_members',
    description: 'Bulk ban members in a guild (requires confirm=true)',
    inputSchema: bulkBanMembersInputSchema,
    run: async ({ guildId, userIds, deleteMessageSeconds, reason, confirm }) => {
      const options: { userIds: string[]; deleteMessageSeconds?: number; reason?: string; confirm?: boolean } = {
        userIds,
      };
      if (deleteMessageSeconds !== undefined) {
        options.deleteMessageSeconds = deleteMessageSeconds;
      }
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      const result = await context.members.bulkBanMembers(guildId, options);
      return { bulkBan: result };
    },
  });

  registerTool(context, {
    name: 'discord_unban_member',
    description: 'Unban a member from a guild (requires confirm=true)',
    inputSchema: unbanMemberInputSchema,
    run: async ({ guildId, memberId, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      await context.members.unbanMember(guildId, memberId, options);

      return { unbanned: { guildId, memberId } };
    },
  });

  registerTool(context, {
    name: 'discord_set_current_member_voice_state',
    description: 'Set current member voice state in stage channel',
    inputSchema: setCurrentMemberVoiceStateInputSchema,
    run: async ({ guildId, channelId, suppress, requestToSpeakTimestamp, reason }) => {
      const options: {
        channelId?: string;
        suppress?: boolean;
        requestToSpeakTimestamp?: string | null;
        reason?: string;
      } = {};
      if (channelId !== undefined) {
        options.channelId = channelId;
      }
      if (suppress !== undefined) {
        options.suppress = suppress;
      }
      if (requestToSpeakTimestamp !== undefined) {
        options.requestToSpeakTimestamp = requestToSpeakTimestamp;
      }
      if (reason !== undefined) {
        options.reason = reason;
      }

      const voiceState = await context.members.setCurrentMemberVoiceState(guildId, options);
      return { voiceState };
    },
  });

  registerTool(context, {
    name: 'discord_set_member_voice_state',
    description: 'Set specific member voice state in stage channel',
    inputSchema: setMemberVoiceStateInputSchema,
    run: async ({ guildId, memberId, channelId, suppress, reason }) => {
      const options: { channelId: string; suppress?: boolean; reason?: string } = {
        channelId,
      };
      if (suppress !== undefined) {
        options.suppress = suppress;
      }
      if (reason !== undefined) {
        options.reason = reason;
      }

      const voiceState = await context.members.setMemberVoiceState(guildId, memberId, options);
      return { voiceState };
    },
  });

  registerTool(context, {
    name: 'discord_list_channel_messages',
    description: 'List recent messages in a channel',
    inputSchema: listChannelMessagesInputSchema,
    run: async ({ channelId, limit, before, after, around }) => {
      const options: { limit?: number; before?: string; after?: string; around?: string } = {};
      if (limit !== undefined) {
        options.limit = limit;
      }
      if (before !== undefined) {
        options.before = before;
      }
      if (after !== undefined) {
        options.after = after;
      }
      if (around !== undefined) {
        options.around = around;
      }

      const messages = await context.messages.listMessages(channelId, options);
      return { messages };
    },
  });

  registerTool(context, {
    name: 'discord_fetch_message',
    description: 'Fetch a specific message in a channel',
    inputSchema: fetchMessageInputSchema,
    run: async ({ channelId, messageId, force }) => {
      const message = await context.messages.fetchMessage(channelId, messageId, force);
      return { message };
    },
  });

  registerTool(context, {
    name: 'discord_send_message',
    description: 'Send a message to a channel',
    inputSchema: sendMessageInputSchema,
    run: async ({
      channelId,
      content,
      tts,
      replyToMessageId,
      replyFailIfNotExists,
      suppressEmbeds,
      allowedMentionUserIds,
      allowedMentionRoleIds,
      allowedMentionEveryone,
      embeds,
      components,
      poll,
    }) => {
      const options: {
        content?: string;
        tts?: boolean;
        replyToMessageId?: string;
        replyFailIfNotExists?: boolean;
        suppressEmbeds?: boolean;
        allowedMentionUserIds?: string[];
        allowedMentionRoleIds?: string[];
        allowedMentionEveryone?: boolean;
        embeds?: unknown[];
        components?: unknown[];
        poll?: unknown;
      } = {
        ...(content !== undefined ? { content } : {}),
      };

      if (tts !== undefined) {
        options.tts = tts;
      }
      if (replyToMessageId !== undefined) {
        options.replyToMessageId = replyToMessageId;
      }
      if (replyFailIfNotExists !== undefined) {
        options.replyFailIfNotExists = replyFailIfNotExists;
      }
      if (suppressEmbeds !== undefined) {
        options.suppressEmbeds = suppressEmbeds;
      }
      if (allowedMentionUserIds !== undefined) {
        options.allowedMentionUserIds = allowedMentionUserIds;
      }
      if (allowedMentionRoleIds !== undefined) {
        options.allowedMentionRoleIds = allowedMentionRoleIds;
      }
      if (allowedMentionEveryone !== undefined) {
        options.allowedMentionEveryone = allowedMentionEveryone;
      }
      if (embeds !== undefined) {
        options.embeds = embeds;
      }
      if (components !== undefined) {
        options.components = components;
      }
      if (poll !== undefined) {
        options.poll = poll;
      }

      const message = await context.messages.sendMessage(channelId, options);
      return { message };
    },
  });

  registerTool(context, {
    name: 'discord_edit_message',
    description: 'Edit an existing message',
    inputSchema: editMessageInputSchema,
    run: async ({ channelId, messageId, content, suppressEmbeds, embeds, components }) => {
      const options: {
        content?: string;
        suppressEmbeds?: boolean;
        embeds?: unknown[] | null;
        components?: unknown[] | null;
      } = {};
      if (content !== undefined) {
        options.content = content;
      }
      if (suppressEmbeds !== undefined) {
        options.suppressEmbeds = suppressEmbeds;
      }
      if (embeds !== undefined) {
        options.embeds = embeds;
      }
      if (components !== undefined) {
        options.components = components;
      }

      const message = await context.messages.editMessage(channelId, messageId, options);
      return { message };
    },
  });

  registerTool(context, {
    name: 'discord_delete_message',
    description: 'Delete a message (requires confirm=true)',
    inputSchema: deleteMessageInputSchema,
    run: async ({ channelId, messageId, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      await context.messages.deleteMessage(channelId, messageId, options);
      return { deletedMessage: { channelId, messageId } };
    },
  });

  registerTool(context, {
    name: 'discord_purge_messages',
    description: 'Bulk delete up to 100 messages (requires confirm=true)',
    inputSchema: purgeMessagesInputSchema,
    run: async ({ channelId, messageIds, limit, reason, confirm }) => {
      const options: { messageIds?: string[]; limit?: number; reason?: string; confirm?: boolean } = {};
      if (messageIds !== undefined) {
        options.messageIds = messageIds;
      }
      if (limit !== undefined) {
        options.limit = limit;
      }
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      const result = await context.messages.purgeMessages(channelId, options);
      return { purged: result };
    },
  });

  registerTool(context, {
    name: 'discord_list_pinned_messages',
    description: 'List pinned messages in a channel',
    inputSchema: listPinnedMessagesInputSchema,
    run: async ({ channelId, limit, before }) => {
      const options: { limit?: number; before?: string } = {};
      if (limit !== undefined) {
        options.limit = limit;
      }
      if (before !== undefined) {
        options.before = before;
      }

      const messages = await context.messages.listPinnedMessages(channelId, options);
      return { messages };
    },
  });

  registerTool(context, {
    name: 'discord_pin_message',
    description: 'Pin a message in a channel (requires confirm=true)',
    inputSchema: pinMessageInputSchema,
    run: async ({ channelId, messageId, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      await context.messages.pinMessage(channelId, messageId, options);
      return { pinnedMessage: { channelId, messageId } };
    },
  });

  registerTool(context, {
    name: 'discord_unpin_message',
    description: 'Unpin a message in a channel (requires confirm=true)',
    inputSchema: unpinMessageInputSchema,
    run: async ({ channelId, messageId, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      await context.messages.unpinMessage(channelId, messageId, options);
      return { unpinnedMessage: { channelId, messageId } };
    },
  });

  registerTool(context, {
    name: 'discord_crosspost_message',
    description: 'Crosspost a message in a news channel',
    inputSchema: crosspostMessageInputSchema,
    run: async ({ channelId, messageId, reason }) => {
      const message = await context.messages.crosspostMessage(channelId, messageId, reason);
      return { message };
    },
  });

  registerTool(context, {
    name: 'discord_add_reaction',
    description: 'Add a reaction to a message',
    inputSchema: addReactionInputSchema,
    run: async ({ channelId, messageId, emoji }) => {
      await context.messages.addReaction(channelId, messageId, emoji);
      return { reacted: { channelId, messageId, emoji } };
    },
  });

  registerTool(context, {
    name: 'discord_remove_own_reaction',
    description: 'Remove the bot reaction from a message',
    inputSchema: removeOwnReactionInputSchema,
    run: async ({ channelId, messageId, emoji }) => {
      await context.messages.removeOwnReaction(channelId, messageId, emoji);
      return { reactionRemoved: { channelId, messageId, emoji, scope: 'own' } };
    },
  });

  registerTool(context, {
    name: 'discord_remove_user_reaction',
    description: 'Remove a specific user reaction from a message',
    inputSchema: removeUserReactionInputSchema,
    run: async ({ channelId, messageId, emoji, userId }) => {
      await context.messages.removeUserReaction(channelId, messageId, emoji, userId);
      return { reactionRemoved: { channelId, messageId, emoji, userId, scope: 'user' } };
    },
  });

  registerTool(context, {
    name: 'discord_list_reaction_users',
    description: 'List users for a specific reaction on a message',
    inputSchema: listReactionUsersInputSchema,
    run: async ({ channelId, messageId, emoji, limit, after, type }) => {
      const options: { limit?: number; after?: string; type?: 0 | 1 } = {};
      if (limit !== undefined) {
        options.limit = limit;
      }
      if (after !== undefined) {
        options.after = after;
      }
      if (type !== undefined) {
        options.type = type;
      }

      const users = await context.messages.listReactionUsers(channelId, messageId, emoji, options);
      return { users };
    },
  });

  registerTool(context, {
    name: 'discord_clear_reactions',
    description: 'Clear all reactions from a message',
    inputSchema: clearReactionsInputSchema,
    run: async ({ channelId, messageId }) => {
      await context.messages.clearReactions(channelId, messageId);
      return { reactionsCleared: { channelId, messageId } };
    },
  });

  registerTool(context, {
    name: 'discord_clear_emoji_reactions',
    description: 'Clear all reactions for a specific emoji from a message',
    inputSchema: clearEmojiReactionsInputSchema,
    run: async ({ channelId, messageId, emoji }) => {
      await context.messages.clearEmojiReactions(channelId, messageId, emoji);
      return { reactionsCleared: { channelId, messageId, emoji } };
    },
  });

  registerTool(context, {
    name: 'discord_end_poll',
    description: 'End a message poll and return updated message',
    inputSchema: endPollInputSchema,
    run: async ({ channelId, messageId }) => {
      const message = await context.messages.endPoll(channelId, messageId);
      return { message };
    },
  });

  registerTool(context, {
    name: 'discord_list_poll_answer_voters',
    description: 'List users who voted for a specific poll answer',
    inputSchema: listPollAnswerVotersInputSchema,
    run: async ({ channelId, messageId, answerId, limit, after }) => {
      const options: { limit?: number; after?: string } = {};
      if (limit !== undefined) {
        options.limit = limit;
      }
      if (after !== undefined) {
        options.after = after;
      }

      const users = await context.messages.listPollAnswerVoters(channelId, messageId, answerId, options);
      return { users };
    },
  });

  registerTool(context, {
    name: 'discord_get_presence_state',
    description: 'Get gateway presence runtime state',
    inputSchema: getPresenceStateInputSchema,
    run: async () => {
      const presence = context.presence.getPresenceState();
      return { presence };
    },
  });

  registerTool(context, {
    name: 'discord_set_presence',
    description: 'Set bot presence/activity (requires gateway and confirm=true)',
    inputSchema: setPresenceInputSchema,
    run: async ({ status, activityName, activityType, activityState, activityUrl, afk, confirm }) => {
      const options: {
        status: 'online' | 'dnd' | 'idle' | 'invisible' | 'offline';
        activityName?: string;
        activityType?: number;
        activityState?: string;
        activityUrl?: string;
        afk?: boolean;
        confirm?: boolean;
      } = {
        status,
      };

      if (activityName !== undefined) {
        options.activityName = activityName;
      }

      if (activityType !== undefined) {
        options.activityType = activityType;
      }

      if (activityState !== undefined) {
        options.activityState = activityState;
      }

      if (activityUrl !== undefined) {
        options.activityUrl = activityUrl;
      }

      if (afk !== undefined) {
        options.afk = afk;
      }

      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      const presence = context.presence.setPresence(options);
      return { presence };
    },
  });

  registerTool(context, {
    name: 'discord_list_guild_invites',
    description: 'List invites for a guild',
    inputSchema: listGuildInvitesInputSchema,
    run: async ({ guildId }) => {
      const invites = await context.special.listGuildInvites(guildId);
      return { invites };
    },
  });

  registerTool(context, {
    name: 'discord_create_channel_invite',
    description: 'Create an invite for a channel',
    inputSchema: createChannelInviteInputSchema,
    run: async ({ channelId, maxAge, maxUses, temporary, unique, targetType, targetUserId, targetApplicationId, reason }) => {
      const options: {
        maxAge?: number;
        maxUses?: number;
        temporary?: boolean;
        unique?: boolean;
        targetType?: 1 | 2;
        targetUserId?: string;
        targetApplicationId?: string;
        reason?: string;
      } = {};
      if (maxAge !== undefined) {
        options.maxAge = maxAge;
      }
      if (maxUses !== undefined) {
        options.maxUses = maxUses;
      }
      if (temporary !== undefined) {
        options.temporary = temporary;
      }
      if (unique !== undefined) {
        options.unique = unique;
      }
      if (targetType !== undefined) {
        options.targetType = targetType;
      }
      if (targetUserId !== undefined) {
        options.targetUserId = targetUserId;
      }
      if (targetApplicationId !== undefined) {
        options.targetApplicationId = targetApplicationId;
      }
      if (reason !== undefined) {
        options.reason = reason;
      }

      const invite = await context.special.createChannelInvite(channelId, options);
      return { invite };
    },
  });

  registerTool(context, {
    name: 'discord_delete_invite',

    description: 'Delete an invite (requires confirm=true)',
    inputSchema: deleteInviteInputSchema,
    run: async ({ code, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      const invite = await context.special.deleteInvite(code, options);
      return { deletedInvite: invite };
    },
  });

  registerTool(context, {
    name: 'discord_list_automod_rules',
    description: 'List auto moderation rules for a guild',
    inputSchema: listAutoModerationRulesInputSchema,
    run: async ({ guildId }) => {
      const rules = await context.special.listGuildAutoModerationRules(guildId);
      return { rules };
    },
  });

  registerTool(context, {
    name: 'discord_create_automod_rule',
    description: 'Create an auto moderation rule',
    inputSchema: createAutoModerationRuleInputSchema,
    run: async ({ guildId, name, eventType, triggerType, triggerMetadata, actions, enabled, exemptRoleIds, exemptChannelIds }) => {
      const options: {
        name: string;
        eventType: number;
        triggerType: number;
        triggerMetadata?: any;
        actions: any[];
        enabled?: boolean;
        exemptRoleIds?: string[];
        exemptChannelIds?: string[];
      } = {
        name,
        eventType,
        triggerType,
        actions: toAutoModerationActions(actions),
      };

      const triggerMetadataPayload = toAutoModerationTriggerMetadata(triggerMetadata);
      if (triggerMetadataPayload !== undefined) {
        options.triggerMetadata = triggerMetadataPayload;
      }

      if (enabled !== undefined) {
        options.enabled = enabled;
      }

      if (exemptRoleIds !== undefined) {
        options.exemptRoleIds = exemptRoleIds;
      }

      if (exemptChannelIds !== undefined) {
        options.exemptChannelIds = exemptChannelIds;
      }

      const rule = await context.special.createGuildAutoModerationRule(guildId, options);
      return { rule };
    },
  });

  registerTool(context, {
    name: 'discord_update_automod_rule',
    description: 'Update an auto moderation rule',
    inputSchema: updateAutoModerationRuleInputSchema,
    run: async ({
      guildId,
      ruleId,
      name,
      eventType,
      triggerMetadata,
      actions,
      enabled,
      exemptRoleIds,
      exemptChannelIds,
      reason,
    }) => {
      const options: {
        name?: string;
        eventType?: number;
        triggerMetadata?: any;
        actions?: any[];
        enabled?: boolean;
        exemptRoleIds?: string[];
        exemptChannelIds?: string[];
        reason?: string;
      } = {};

      if (name !== undefined) options.name = name;
      if (eventType !== undefined) options.eventType = eventType;
      const triggerMetadataPayload = toAutoModerationTriggerMetadata(triggerMetadata);
      if (triggerMetadataPayload !== undefined) options.triggerMetadata = triggerMetadataPayload;
      if (actions !== undefined) options.actions = toAutoModerationActions(actions);
      if (enabled !== undefined) options.enabled = enabled;
      if (exemptRoleIds !== undefined) options.exemptRoleIds = exemptRoleIds;
      if (exemptChannelIds !== undefined) options.exemptChannelIds = exemptChannelIds;
      if (reason !== undefined) options.reason = reason;

      const rule = await context.special.updateGuildAutoModerationRule(guildId, ruleId, options);
      return { rule };
    },
  });

  registerTool(context, {
    name: 'discord_delete_automod_rule',
    description: 'Delete an auto moderation rule (requires confirm=true)',
    inputSchema: deleteAutoModerationRuleInputSchema,
    run: async ({ guildId, ruleId, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      await context.special.deleteGuildAutoModerationRule(guildId, ruleId, options);
      return { deletedRule: { guildId, ruleId } };
    },
  });

  registerTool(context, {
    name: 'discord_list_guild_emojis',
    description: 'List guild emojis',
    inputSchema: listGuildEmojisInputSchema,
    run: async ({ guildId, force }) => {
      const emojis = await context.special.listGuildEmojis(guildId, force);
      return { emojis };
    },
  });

  registerTool(context, {
    name: 'discord_create_guild_emoji',
    description: 'Create a guild emoji from base64 image data URL',
    inputSchema: createGuildEmojiInputSchema,
    run: async ({ guildId, name, image, roleIds, reason }) => {
      const options: { name: string; image: string; roleIds?: string[]; reason?: string } = {
        name,
        image,
      };
      if (roleIds !== undefined) {
        options.roleIds = roleIds;
      }
      if (reason !== undefined) {
        options.reason = reason;
      }

      const emoji = await context.special.createGuildEmoji(guildId, options);
      return { emoji };
    },
  });

  registerTool(context, {
    name: 'discord_update_guild_emoji',
    description: 'Update guild emoji name or role allowlist',
    inputSchema: updateGuildEmojiInputSchema,
    run: async ({ guildId, emojiId, name, roleIds, reason }) => {
      const options: { name?: string; roleIds?: string[]; reason?: string } = {};
      if (name !== undefined) options.name = name;
      if (roleIds !== undefined && roleIds !== null) options.roleIds = roleIds;
      if (reason !== undefined) options.reason = reason;

      const emoji = await context.special.updateGuildEmoji(guildId, emojiId, options);
      return { emoji };
    },
  });

  registerTool(context, {
    name: 'discord_delete_guild_emoji',
    description: 'Delete a guild emoji (requires confirm=true)',
    inputSchema: deleteGuildEmojiInputSchema,
    run: async ({ guildId, emojiId, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      await context.special.deleteGuildEmoji(guildId, emojiId, options);
      return { deletedEmoji: { guildId, emojiId } };
    },
  });

  registerTool(context, {
    name: 'discord_list_guild_stickers',
    description: 'List guild stickers',
    inputSchema: listGuildStickersInputSchema,
    run: async ({ guildId }) => {
      const stickers = await context.special.listGuildStickers(guildId);
      return { stickers };
    },
  });

  registerTool(context, {
    name: 'discord_create_guild_sticker',
    description: 'Create a guild sticker from base64 file data',
    inputSchema: createGuildStickerInputSchema,
    run: async ({ guildId, name, description, tags, file, reason }) => {
      const filePayload: { filename: string; data: Buffer; contentType?: string } = {
        filename: file.filename,
        data: Buffer.from(file.dataBase64, 'base64'),
      };
      if (file.contentType !== undefined) {
        filePayload.contentType = file.contentType;
      }

      const options: {
        name: string;
        description: string;
        tags: string;
        file: { filename: string; data: Buffer; contentType?: string };
        reason?: string;
      } = {
        name,
        description,
        tags,
        file: filePayload,
      };
      if (reason !== undefined) {
        options.reason = reason;
      }

      const sticker = await context.special.createGuildSticker(guildId, options);
      return { sticker };
    },
  });

  registerTool(context, {
    name: 'discord_update_guild_sticker',
    description: 'Update guild sticker metadata',
    inputSchema: updateGuildStickerInputSchema,
    run: async ({ guildId, stickerId, name, description, tags, reason }) => {
      const options: { name?: string; description?: string | null; tags?: string; reason?: string } = {};
      if (name !== undefined) {
        options.name = name;
      }
      if (description !== undefined) {
        options.description = description;
      }
      if (tags !== undefined) {
        options.tags = tags;
      }
      if (reason !== undefined) {
        options.reason = reason;
      }

      const sticker = await context.special.updateGuildSticker(guildId, stickerId, options);
      return { sticker };
    },
  });

  registerTool(context, {
    name: 'discord_delete_guild_sticker',
    description: 'Delete a guild sticker (requires confirm=true)',
    inputSchema: deleteGuildStickerInputSchema,
    run: async ({ guildId, stickerId, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      await context.special.deleteGuildSticker(guildId, stickerId, options);
      return { deletedSticker: { guildId, stickerId } };
    },
  });

  registerTool(context, {
    name: 'discord_list_guild_soundboard_sounds',
    description: 'List guild soundboard sounds',
    inputSchema: listGuildSoundboardSoundsInputSchema,
    run: async ({ guildId }) => {
      const sounds = await context.special.listGuildSoundboardSounds(guildId);
      return { sounds };
    },
  });

  registerTool(context, {
    name: 'discord_create_guild_soundboard_sound',
    description: 'Create a guild soundboard sound',
    inputSchema: createGuildSoundboardSoundInputSchema,
    run: async ({ guildId, name, sound, volume, emojiId, emojiName, reason }) => {
      const options: {
        name: string;
        sound: string;
        volume?: number;
        emojiId?: string | null;
        emojiName?: string | null;
        reason?: string;
      } = {
        name,
        sound,
      };
      if (volume !== undefined && volume !== null) {
        options.volume = volume;
      }
      if (emojiId !== undefined) {
        options.emojiId = emojiId;
      }
      if (emojiName !== undefined) {
        options.emojiName = emojiName;
      }
      if (reason !== undefined) {
        options.reason = reason;
      }

      const soundboardSound = await context.special.createGuildSoundboardSound(guildId, options);
      return { soundboardSound };
    },
  });

  registerTool(context, {
    name: 'discord_update_guild_soundboard_sound',
    description: 'Update guild soundboard sound metadata',
    inputSchema: updateGuildSoundboardSoundInputSchema,
    run: async ({ guildId, soundId, name, volume, emojiId, emojiName, reason }) => {
      const options: {
        name?: string;
        volume?: number | null;
        emojiId?: string | null;
        emojiName?: string | null;
        reason?: string;
      } = {};
      if (name !== undefined) {
        options.name = name;
      }
      if (volume !== undefined) {
        options.volume = volume;
      }
      if (emojiId !== undefined) {
        options.emojiId = emojiId;
      }
      if (emojiName !== undefined) {
        options.emojiName = emojiName;
      }
      if (reason !== undefined) {
        options.reason = reason;
      }

      const soundboardSound = await context.special.updateGuildSoundboardSound(guildId, soundId, options);
      return { soundboardSound };
    },
  });

  registerTool(context, {
    name: 'discord_delete_guild_soundboard_sound',
    description: 'Delete a guild soundboard sound (requires confirm=true)',
    inputSchema: deleteGuildSoundboardSoundInputSchema,
    run: async ({ guildId, soundId, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      await context.special.deleteGuildSoundboardSound(guildId, soundId, options);
      return { deletedSoundboardSound: { guildId, soundId } };
    },
  });

  registerTool(context, {
    name: 'discord_list_scheduled_events',
    description: 'List scheduled events for a guild',
    inputSchema: listScheduledEventsInputSchema,
    run: async ({ guildId, withUserCount }) => {
      const events = await context.scheduledEvents.listScheduledEvents(guildId, {
        ...(withUserCount !== undefined ? { withUserCount } : {}),
      });
      return { events };
    },
  });

  registerTool(context, {
    name: 'discord_fetch_scheduled_event',
    description: 'Fetch a specific scheduled event in a guild',
    inputSchema: fetchScheduledEventInputSchema,
    run: async ({ guildId, eventId, withUserCount }) => {
      const event = await context.scheduledEvents.fetchScheduledEvent(guildId, eventId, {
        ...(withUserCount !== undefined ? { withUserCount } : {}),
      });
      return { event };
    },
  });

  registerTool(context, {
    name: 'discord_create_scheduled_event',
    description: 'Create a scheduled event in a guild',
    inputSchema: createScheduledEventInputSchema,
    run: async ({
      guildId,
      channelId,
      name,
      privacyLevel,
      scheduledStartTime,
      scheduledEndTime,
      description,
      entityType,
      entityMetadata,
      image,
      reason,
    }) => {
      const options: {
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
      } = {
        name,
        scheduledStartTime,
        entityType,
        privacyLevel,
      };

      if (channelId !== undefined && channelId !== null) {
        options.channelId = channelId;
      }
      if (scheduledEndTime !== undefined) {
        options.scheduledEndTime = scheduledEndTime;
      }
      if (description !== undefined) {
        options.description = description;
      }
      if (entityMetadata !== undefined) {
        options.entityMetadata = {
          ...(entityMetadata.location !== undefined ? { location: entityMetadata.location } : {}),
        };
      }
      if (image !== undefined && image !== null) {
        options.image = image;
      }
      if (reason !== undefined) {
        options.reason = reason;
      }

      const event = await context.scheduledEvents.createScheduledEvent(guildId, options);
      return { event };
    },
  });

  registerTool(context, {
    name: 'discord_update_scheduled_event',
    description: 'Update a scheduled event in a guild',
    inputSchema: updateScheduledEventInputSchema,
    run: async ({
      guildId,
      eventId,
      channelId,
      name,
      privacyLevel,
      scheduledStartTime,
      scheduledEndTime,
      description,
      entityType,
      status,
      entityMetadata,
      image,
      reason,
    }) => {
      const options: UpdateScheduledEventOptions = {
        ...(channelId !== undefined && { channelId }),
        ...(name !== undefined && { name }),
        ...(privacyLevel !== undefined && { privacyLevel }),
        ...(scheduledStartTime !== undefined && { scheduledStartTime }),
        ...(scheduledEndTime !== undefined && scheduledEndTime !== null && { scheduledEndTime }),
        ...(description !== undefined && description !== null && { description }),
        ...(entityType !== undefined && { entityType }),
        ...(status !== undefined && { status }),
        ...(entityMetadata !== undefined && {
          entityMetadata: entityMetadata !== null
            ? { ...(entityMetadata.location !== undefined ? { location: entityMetadata.location } : {}) }
            : null
        }),
        ...(image !== undefined && { image }),
        ...(reason !== undefined && { reason }),
      };

      const event = await context.scheduledEvents.updateScheduledEvent(guildId, eventId, options);
      return { event };
    },
  });

  registerTool(context, {
    name: 'discord_delete_scheduled_event',
    description: 'Delete a scheduled event (requires confirm=true)',
    inputSchema: deleteScheduledEventInputSchema,
    run: async ({ guildId, eventId, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      await context.scheduledEvents.deleteScheduledEvent(guildId, eventId, options);
      return { deletedScheduledEvent: { guildId, eventId } };
    },
  });

  registerTool(context, {
    name: 'discord_list_scheduled_event_users',
    description: 'List users subscribed to a scheduled event',
    inputSchema: listScheduledEventUsersInputSchema,
    run: async ({ guildId, eventId, limit, withMember, before, after }) => {
      const users = await context.scheduledEvents.listScheduledEventUsers(guildId, eventId, {
        ...(limit !== undefined ? { limit } : {}),
        ...(withMember !== undefined ? { withMember } : {}),
        ...(before !== undefined ? { before } : {}),
        ...(after !== undefined ? { after } : {}),
      });
      return { users };
    },
  });

  registerTool(context, {
    name: 'discord_list_guild_webhooks',
    description: 'List webhooks in a guild',
    inputSchema: listGuildWebhooksInputSchema,
    run: async ({ guildId }) => {
      const webhooksList = await context.webhooks.listGuildWebhooks(guildId);
      return { webhooks: webhooksList };
    },
  });

  registerTool(context, {
    name: 'discord_list_channel_webhooks',
    description: 'List webhooks in a channel',
    inputSchema: listChannelWebhooksInputSchema,
    run: async ({ guildId, channelId }) => {
      const webhooksList = await context.webhooks.listChannelWebhooks(guildId, channelId);
      return { webhooks: webhooksList };
    },
  });

  registerTool(context, {
    name: 'discord_create_webhook',
    description: 'Create a webhook in a channel',
    inputSchema: createWebhookInputSchema,
    run: async ({ guildId, channelId, name, avatar }) => {
      const webhook = await context.webhooks.createWebhook(guildId, channelId, {
        name,
        avatar,
      });
      return { webhook };
    },
  });

  registerTool(context, {
    name: 'discord_update_webhook',
    description: 'Update webhook properties',
    inputSchema: updateWebhookInputSchema,
    run: async ({ guildId, webhookId, name, avatar, channelId, reason }) => {
      const webhook = await context.webhooks.updateWebhook(
        guildId,
        webhookId,
        {
          name,
          avatar,
          channel_id: channelId,
        },
        reason,
      );
      return { webhook };
    },
  });

  registerTool(context, {
    name: 'discord_delete_webhook',
    description: 'Delete a webhook (requires confirm=true)',
    inputSchema: deleteWebhookInputSchema,
    run: async ({ guildId, webhookId, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      await context.webhooks.deleteWebhook(guildId, webhookId, options);
      return { deletedWebhook: { guildId, webhookId } };
    },
  });

  registerTool(context, {
    name: 'discord_execute_webhook_by_token',
    description: 'Execute a webhook by token',
    inputSchema: executeWebhookByTokenInputSchema,
    run: async ({
      guildId,
      webhookId,
      token,
      content,
      username,
      avatarUrl,
      tts,
      threadId,
      wait,
      suppressEmbeds,
      allowedMentionUserIds,
      allowedMentionRoleIds,
      allowedMentionEveryone,
      embeds,
      components,
      poll,
    }) => {
      const options: {
        content?: string;
        username?: string;
        avatarUrl?: string;
        tts?: boolean;
        threadId?: string;
        wait?: boolean;
        suppressEmbeds?: boolean;
        allowedMentionUserIds?: string[];
        allowedMentionRoleIds?: string[];
        allowedMentionEveryone?: boolean;
        embeds?: unknown[];
        components?: unknown[];
        poll?: unknown;
      } = {};

      if (content !== undefined) {
        options.content = content;
      }
      if (username !== undefined) {
        options.username = username;
      }
      if (avatarUrl !== undefined) {
        options.avatarUrl = avatarUrl;
      }
      if (tts !== undefined) {
        options.tts = tts;
      }
      if (threadId !== undefined) {
        options.threadId = threadId;
      }
      if (wait !== undefined) {
        options.wait = wait;
      }
      if (suppressEmbeds !== undefined) {
        options.suppressEmbeds = suppressEmbeds;
      }
      if (allowedMentionUserIds !== undefined) {
        options.allowedMentionUserIds = allowedMentionUserIds;
      }
      if (allowedMentionRoleIds !== undefined) {
        options.allowedMentionRoleIds = allowedMentionRoleIds;
      }
      if (allowedMentionEveryone !== undefined) {
        options.allowedMentionEveryone = allowedMentionEveryone;
      }
      if (embeds !== undefined) {
        options.embeds = embeds;
      }
      if (components !== undefined) {
        options.components = components;
      }
      if (poll !== undefined) {
        options.poll = poll;
      }

      const message = await context.webhooks.executeWebhookByToken(guildId, webhookId, token, options);
      return { message };
    },
  });

  registerTool(context, {
    name: 'discord_fetch_webhook_message_by_token',
    description: 'Fetch a specific webhook message by token',
    inputSchema: fetchWebhookMessageByTokenInputSchema,
    run: async ({ guildId, webhookId, token, messageId, threadId }) => {
      const message = await context.webhooks.fetchWebhookMessageByToken(guildId, webhookId, token, messageId, {
        ...(threadId !== undefined ? { threadId } : {}),
      });
      return { message };
    },
  });

  registerTool(context, {
    name: 'discord_edit_webhook_message_by_token',
    description: 'Edit a webhook message by token',
    inputSchema: editWebhookMessageByTokenInputSchema,
    run: async ({ guildId, webhookId, token, messageId, content, embeds, components, threadId }) => {
      const options: {
        content?: string;
        embeds?: unknown[];
        components?: unknown[];
        threadId?: string;
      } = {};
      if (content !== undefined) {
        options.content = content;
      }
      if (embeds !== undefined) {
        options.embeds = embeds;
      }
      if (components !== undefined) {
        options.components = components;
      }
      if (threadId !== undefined) {
        options.threadId = threadId;
      }

      const message = await context.webhooks.editWebhookMessageByToken(guildId, webhookId, token, messageId, options);
      return { message };
    },
  });

  registerTool(context, {
    name: 'discord_delete_webhook_message_by_token',
    description: 'Delete a webhook message by token (requires confirm=true)',
    inputSchema: deleteWebhookMessageByTokenInputSchema,
    run: async ({ guildId, webhookId, token, messageId, threadId, confirm }) => {
      const options: { threadId?: string; confirm?: boolean } = {};
      if (threadId !== undefined) {
        options.threadId = threadId;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      await context.webhooks.deleteWebhookMessageByToken(guildId, webhookId, token, messageId, options);
      return { deletedWebhookMessage: { guildId, webhookId, messageId } };
    },
  });

  registerTool(context, {
    name: 'discord_create_thread',
    description: 'Create a thread in a channel',
    inputSchema: createThreadInputSchema,
    run: async ({ guildId, channelId, name, autoArchiveDuration, rateLimitPerUser, type, invitable, reason }) => {
      const body: ThreadCreateBodyRequest = { name };

      if (autoArchiveDuration !== undefined) {
        body.auto_archive_duration = autoArchiveDuration;
      }

      if (rateLimitPerUser !== undefined) {
        body.rate_limit_per_user = rateLimitPerUser;
      }

      if (type !== undefined) {
        body.type = type;
      }

      if (invitable !== undefined) {
        body.invitable = invitable;
      }

      const thread = await context.threads.createThread(
        guildId,
        channelId,
        body,
        reason,
      );
      return { thread };
    },
  });

  registerTool(context, {
    name: 'discord_update_thread',
    description: 'Update thread properties',
    inputSchema: updateThreadInputSchema,
    run: async ({ guildId, threadId, name, archived, autoArchiveDuration, locked, invitable, rateLimitPerUser, appliedTags, reason }) => {
      const thread = await context.threads.updateThread(
        guildId,
        threadId,
        {
          name,
          archived,
          auto_archive_duration: autoArchiveDuration,
          locked,
          invitable,
          rate_limit_per_user: rateLimitPerUser,
          applied_tags: appliedTags,
        },
        reason,
      );
      return { thread };
    },
  });

  registerTool(context, {
    name: 'discord_join_thread',
    description: 'Join a thread',
    inputSchema: joinThreadInputSchema,
    run: async ({ guildId, threadId }) => {
      await context.threads.joinThread(guildId, threadId);
      return { joinedThread: { guildId, threadId } };
    },
  });

  registerTool(context, {
    name: 'discord_leave_thread',
    description: 'Leave a thread',
    inputSchema: leaveThreadInputSchema,
    run: async ({ guildId, threadId }) => {
      await context.threads.leaveThread(guildId, threadId);
      return { leftThread: { guildId, threadId } };
    },
  });

  registerTool(context, {
    name: 'discord_lock_thread',
    description: 'Lock/unlock a thread (locking requires confirm=true)',
    inputSchema: lockThreadInputSchema,
    run: async ({ guildId, threadId, locked, reason, confirm }) => {
      const options: { locked?: boolean; reason?: string; confirm?: boolean } = {};
      if (locked !== undefined) {
        options.locked = locked;
      }
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      const thread = await context.threads.lockThread(guildId, threadId, options);
      return { thread };
    },
  });

  registerTool(context, {
    name: 'discord_unlock_thread',
    description: 'Unlock a thread',
    inputSchema: unlockThreadInputSchema,
    run: async ({ guildId, threadId, reason }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }

      const thread = await context.threads.unlockThread(guildId, threadId, options);
      return { thread };
    },
  });

  registerTool(context, {
    name: 'discord_remove_thread_member',
    description: 'Remove a member from a thread (requires confirm=true)',
    inputSchema: removeThreadMemberInputSchema,
    run: async ({ guildId, threadId, memberId, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      await context.threads.removeMemberFromThread(guildId, threadId, memberId, options);
      return { removedThreadMember: { guildId, threadId, memberId } };
    },
  });

  registerTool(context, {
    name: 'discord_delete_thread',
    description: 'Delete a thread (requires confirm=true)',
    inputSchema: deleteThreadInputSchema,
    run: async ({ guildId, threadId, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      const deletedThread = await context.threads.deleteThread(guildId, threadId, options);
      return { deletedThread };
    },
  });

  // === Wave 3 Parity: Position Reordering ===
  registerTool(context, {
    name: 'discord_modify_guild_channel_positions',
    description: 'Reorder guild channels in bulk (requires confirm=true)',
    inputSchema: modifyGuildChannelPositionsInputSchema,
    run: async ({ guildId, positions, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      await context.discord.modifyGuildChannelPositions(guildId, positions, options);
      return { modifiedChannelPositions: { guildId, count: positions.length } };
    },
  });

  registerTool(context, {
    name: 'discord_modify_guild_role_positions',
    description: 'Reorder guild roles in bulk (requires confirm=true)',
    inputSchema: modifyGuildRolePositionsInputSchema,
    run: async ({ guildId, positions, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      const roles = await context.discord.modifyGuildRolePositions(guildId, positions, options);
      return { roles };
    },
  });

  // === Wave 3 Parity: Stage Instances ===
  registerTool(context, {
    name: 'discord_create_stage_instance',
    description: 'Create a stage instance in a stage channel',
    inputSchema: createStageInstanceInputSchema,
    run: async ({ guildId, channelId, topic, privacyLevel, sendStartNotification, reason }) => {
      const options: {
        channelId: string;
        topic: string;
        privacyLevel?: number;
        sendStartNotification?: boolean;
        reason?: string;
      } = {
        channelId,
        topic,
      };

      if (privacyLevel !== undefined) {
        options.privacyLevel = privacyLevel;
      }
      if (sendStartNotification !== undefined) {
        options.sendStartNotification = sendStartNotification;
      }
      if (reason !== undefined) {
        options.reason = reason;
      }

      const stage = await context.stage.createStageInstance(guildId, options);
      return { stage };
    },
  });

  registerTool(context, {
    name: 'discord_fetch_stage_instance',
    description: 'Fetch a stage instance by stage channel ID',
    inputSchema: fetchStageInstanceInputSchema,
    run: async ({ channelId }) => {
      const stage = await context.stage.fetchStageInstance(channelId);
      return { stage };
    },
  });

  registerTool(context, {
    name: 'discord_update_stage_instance',
    description: 'Update a stage instance',
    inputSchema: updateStageInstanceInputSchema,
    run: async ({ channelId, topic, privacyLevel, reason }) => {
      const options: {
        topic?: string;
        privacyLevel?: number;
        reason?: string;
      } = {};

      if (topic !== undefined) {
        options.topic = topic;
      }
      if (privacyLevel !== undefined) {
        options.privacyLevel = privacyLevel;
      }
      if (reason !== undefined) {
        options.reason = reason;
      }

      const stage = await context.stage.updateStageInstance(channelId, options);
      return { stage };
    },
  });

  registerTool(context, {
    name: 'discord_delete_stage_instance',
    description: 'Delete a stage instance (requires confirm=true)',
    inputSchema: deleteStageInstanceInputSchema,
    run: async ({ channelId, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      await context.stage.deleteStageInstance(channelId, options);
      return { deletedStageInstance: { channelId } };
    },
  });

  // === Wave 3 Parity: Guild Preview & Active Threads ===
  registerTool(context, {
    name: 'discord_get_guild_preview',
    description: 'Get public preview information about a guild without being a member',
    inputSchema: getGuildPreviewInputSchema,
    run: async ({ guildId }) => {
      const preview = await context.stage.getGuildPreview(guildId);
      return { preview };
    },
  });

  registerTool(context, {
    name: 'discord_list_active_threads',
    description: 'List all active threads in a guild',
    inputSchema: listActiveThreadsInputSchema,
    run: async ({ guildId }) => {
      const activeThreads = await context.stage.listActiveThreads(guildId);
      return { activeThreads };
    },
  });

  // === Wave 3 Parity: Role Member Counts ===
  registerTool(context, {
    name: 'discord_get_role_member_counts',
    description: 'Get member counts for all roles in a guild',
    inputSchema: getRoleMemberCountsInputSchema,
    run: async ({ guildId }) => {
      const roleMemberCounts = await context.discord.getRoleMemberCounts(guildId);
      return { roleMemberCounts };
    },
  });

  // === Wave 3 Parity: Invite Target Users ===
  registerTool(context, {
    name: 'discord_get_invite_target_users',
    description: 'Download CSV of target users for an invite',
    inputSchema: getInviteTargetUsersInputSchema,
    run: async ({ inviteCode }) => {
      const csv = await context.discord.getInviteTargetUsers(inviteCode);
      return { csv };
    },
  });

  registerTool(context, {
    name: 'discord_update_invite_target_users',
    description: 'Upload CSV of target user IDs for an invite',
    inputSchema: updateInviteTargetUsersInputSchema,
    run: async ({ inviteCode, targetUserIds }) => {
      await context.discord.updateInviteTargetUsers(inviteCode, targetUserIds);
      return { updated: { inviteCode, count: targetUserIds.length } };
    },
  });

  registerTool(context, {
    name: 'discord_get_invite_target_user_job_status',
    description: 'Get job status for invite target user upload',
    inputSchema: getInviteTargetUserJobStatusInputSchema,
    run: async ({ inviteCode }) => {
      const jobStatus = await context.discord.getInviteTargetUserJobStatus(inviteCode);
      return { jobStatus };
    },
  });

  // === Wave 4: Gateway Diagnostics ===
  registerTool(context, {
    name: 'discord_get_gateway_info',
    description: 'Get bot gateway connection info including shard count and session start limits',
    inputSchema: getGatewayInfoInputSchema,
    run: async () => {
      const gateway = await context.discord.getGatewayBotInfo();
      return { gateway };
    },
  });

  // === Wave 4: Public Sticker Packs ===
  registerTool(context, {
    name: 'discord_list_sticker_packs',
    description: 'List all public Discord sticker packs (Nitro sticker packs)',
    inputSchema: listStickerPacksInputSchema,
    run: async () => {
      const packs = await context.stickerPacks.listStickerPacks();
      return { packs };
    },
  });

  registerTool(context, {
    name: 'discord_get_sticker_pack',
    description: 'Get a specific public Discord sticker pack by ID',
    inputSchema: getStickerPackInputSchema,
    run: async ({ packId }) => {
      const pack = await context.stickerPacks.getStickerPack(packId);
      return { pack };
    },
  });

  registerTool(context, {
    name: 'discord_get_sticker',
    description: 'Get a specific sticker by ID (guild or public)',
    inputSchema: getStickerInputSchema,
    run: async ({ stickerId }) => {
      const sticker = await context.stickerPacks.getSticker(stickerId);
      return { sticker };
    },
  });

  // === Wave 4: Application Emojis ===
  registerTool(context, {
    name: 'discord_list_application_emojis',
    description: 'List emojis registered to this application',
    inputSchema: listApplicationEmojisInputSchema,
    run: async () => {
      const emojis = await context.special.listApplicationEmojis();
      return { emojis };
    },
  });

  registerTool(context, {
    name: 'discord_create_application_emoji',
    description: 'Create an application emoji from a base64 image data URL',
    inputSchema: createApplicationEmojiInputSchema,
    run: async ({ name, image }) => {
      const emoji = await context.special.createApplicationEmoji({ name, image });
      return { emoji };
    },
  });

  registerTool(context, {
    name: 'discord_update_application_emoji',
    description: 'Rename an application emoji',
    inputSchema: updateApplicationEmojiInputSchema,
    run: async ({ emojiId, name }) => {
      const emoji = await context.special.updateApplicationEmoji(emojiId, { name });
      return { emoji };
    },
  });

  registerTool(context, {
    name: 'discord_delete_application_emoji',
    description: 'Delete an application emoji (requires confirm=true)',
    inputSchema: deleteApplicationEmojiInputSchema,
    run: async ({ emojiId, reason, confirm }) => {
      const options: { reason?: string; confirm?: boolean } = {};
      if (reason !== undefined) {
        options.reason = reason;
      }
      if (confirm !== undefined) {
        options.confirm = confirm;
      }

      await context.special.deleteApplicationEmoji(emojiId, options);
      return { deletedApplicationEmoji: { emojiId } };
    },
  });
}
