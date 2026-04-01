import { describe, expect, test } from 'bun:test';
import type { HttpClient } from 'seyfert/lib/client/httpclient.js';

import type { AppConfig } from '../config/env.js';
import { DiscordMembersService } from './members.js';
import { DiscordScheduledEventsService } from './scheduled-events.js';
import { DiscordService } from './service.js';
import { DiscordWebhooksService } from './webhooks.js';

const baseConfig: AppConfig = {
  discordToken: 'token',
  discordApplicationId: 'app',
  guildAllowlist: [],
  dryRun: false,
  gatewayEnabled: false,
  gatewayIntents: 1,
  httpHost: '127.0.0.1',
  httpPort: 3456,
  httpPath: '/mcp',
  serverName: 'discord-control-mcp',
  serverVersion: '0.1.0',
};

describe('parity wave2 services', () => {
  test('enforces confirm for webhook token message delete', async () => {
    const client = {
      webhooks: {
        fetch: async () => ({
          id: '123456789012345670',
          type: 1,
          guildId: '123456789012345678',
          channelId: '123456789012345679',
          name: 'hook',
          avatar: null,
          applicationId: null,
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordWebhooksService(client, baseConfig);

    await expect(
      service.deleteWebhookMessageByToken(
        '123456789012345678',
        '123456789012345670',
        'token',
        '123456789012345680',
        { confirm: false },
      ),
    ).rejects.toThrow('requires confirm=true');
  });

  test('blocks webhook token execute in dry-run mode', async () => {
    const client = {
      webhooks: {
        fetch: async () => ({
          id: '123456789012345670',
          type: 1,
          guildId: '123456789012345678',
          channelId: '123456789012345679',
          name: 'hook',
          avatar: null,
          applicationId: null,
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordWebhooksService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.executeWebhookByToken('123456789012345678', '123456789012345670', 'token', {
        content: 'hello',
      }),
    ).rejects.toThrow('Dry-run mode blocked mutation webhook.token.execute');
  });

  test('lists guild and global voice regions', async () => {
    const client = {
      proxy: {
        guilds: () => ({
          regions: {
            get: async () => [
              { id: 'us-east', name: 'US East', optimal: true, deprecated: false, custom: false },
            ],
          },
        }),
        voice: {
          region: {
            get: async () => [
              { id: 'eu-west', name: 'EU West', optimal: false, deprecated: false, custom: false },
            ],
          },
        },
      },
    } as unknown as HttpClient;

    const service = new DiscordService(client, baseConfig);
    const guildRegions = await service.listGuildVoiceRegions('123456789012345678');
    const globalRegions = await service.listVoiceRegions();

    expect(guildRegions[0]?.id).toBe('us-east');
    expect(globalRegions[0]?.id).toBe('eu-west');
  });

  test('supports fetch and bulk ban parity', async () => {
    const client = {
      bans: {
        fetch: async () => ({
          id: '123456789012345681',
          reason: 'spam',
          user: {
            id: '123456789012345681',
            username: 'alice',
            globalName: 'Alice',
            bot: false,
          },
        }),
        bulkCreate: async () => ({
          banned_users: ['123456789012345681'],
          failed_users: ['123456789012345682'],
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordMembersService(client, baseConfig);
    const ban = await service.fetchGuildBan('123456789012345678', '123456789012345681', true);
    const bulk = await service.bulkBanMembers('123456789012345678', {
      userIds: ['123456789012345681', '123456789012345682'],
      confirm: true,
    });

    expect(ban.userId).toBe('123456789012345681');
    expect(bulk.bannedUserIds).toEqual(['123456789012345681']);
    expect(bulk.failedUserIds).toEqual(['123456789012345682']);
  });

  test('enforces stage channel for member voice state updates', async () => {
    const client = {
      channels: {
        fetch: async () => ({
          guildId: '123456789012345678',
          type: 2,
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordMembersService(client, baseConfig);

    await expect(
      service.setMemberVoiceState('123456789012345678', '123456789012345681', {
        channelId: '123456789012345679',
      }),
    ).rejects.toThrow('must be a stage channel');
  });

  test('maps scheduled event users and enforces delete confirm', async () => {
    const client = {
      proxy: {
        guilds: () => ({
          'scheduled-events': () => ({
            users: {
              get: async () => [
                {
                  guild_scheduled_event_id: '123456789012345680',
                  user: {
                    id: '123456789012345681',
                    username: 'alice',
                    global_name: 'Alice',
                  },
                  member: {
                    nick: 'ali',
                    user: {
                      id: '123456789012345681',
                    },
                  },
                },
              ],
            },
          }),
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordScheduledEventsService(client, baseConfig);
    const users = await service.listScheduledEventUsers('123456789012345678', '123456789012345680');
    expect(users[0]?.memberNick).toBe('ali');

    await expect(
      service.deleteScheduledEvent('123456789012345678', '123456789012345680', { confirm: false }),
    ).rejects.toThrow('requires confirm=true');
  });
});
