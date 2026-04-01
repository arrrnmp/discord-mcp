import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ThreadCreateBodyRequest } from 'seyfert/lib/common/index.js';
import type { GuildChannelTypes } from 'seyfert/lib/structures/channels.js';
import { z } from 'zod';

import { DiscordMembersService } from '../../discord/members.js';
import type { DiscordService } from '../../discord/service.js';
import { DiscordThreadsService } from '../../discord/threads.js';
import { DiscordWebhooksService } from '../../discord/webhooks.js';
import { logger } from '../../lib/logging.js';
import { createChannelInputSchema, deleteChannelInputSchema, updateChannelInputSchema } from '../schemas/channel.js';
import { normalizeHexColor } from '../schemas/common.js';
import { getGuildInventoryInputSchema, listGuildsInputSchema } from '../schemas/guild.js';
import {
  addMemberRoleInputSchema,
  editMemberBasicsInputSchema,
  fetchMemberInputSchema,
  kickMemberInputSchema,
  listMembersInputSchema,
  removeMemberRoleInputSchema,
} from '../schemas/member.js';
import { createRoleInputSchema, deleteRoleInputSchema, updateRoleInputSchema } from '../schemas/role.js';
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
  createWebhookInputSchema,
  deleteWebhookInputSchema,
  listChannelWebhooksInputSchema,
  listGuildWebhooksInputSchema,
  updateWebhookInputSchema,
} from '../schemas/webhook.js';
import { withToolResult } from './helpers.js';

type ToolContext = {
  server: McpServer;
  discord: DiscordService;
  members: DiscordMembersService;
  webhooks: DiscordWebhooksService;
  threads: DiscordThreadsService;
};

function permissionsToBitfield(permissions: Array<number | string> | undefined): string | undefined {
  if (!permissions || permissions.length === 0) {
    return undefined;
  }

  return permissions.map((value) => BigInt(value)).reduce((acc, value) => acc | value, 0n).toString();
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
      logger.debug('mcp.tool.call', { tool: config.name, input });
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
        position,
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
}
