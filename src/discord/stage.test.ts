import { describe, expect, test } from 'bun:test';
import type { HttpClient } from 'seyfert/lib/client/httpclient.js';

import type { AppConfig } from '../config/env.js';
import { DiscordStageService } from './stage.js';

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

const stageProxy = {
  'stage-instances': (channelId: string) => ({
    get: async () => ({
      id: '123456789012345690',
      channel_id: channelId,
      guild_id: '123456789012345678',
      topic: 'Test stage',
      privacy_level: 2,
      discoverable_disabled: false,
    }),
    delete: async () => undefined,
    patch: async () => ({
      id: '123456789012345690',
      channel_id: channelId,
      guild_id: '123456789012345678',
      topic: 'Updated topic',
      privacy_level: 2,
      discoverable_disabled: false,
    }),
  }),
};

describe('DiscordStageService', () => {
  test('requires confirm for delete stage instance', async () => {
    const client = {
      proxy: stageProxy,
    } as unknown as HttpClient;

    const service = new DiscordStageService(client, baseConfig);

    await expect(
      service.deleteStageInstance('123456789012345679', { confirm: false }),
    ).rejects.toThrow('requires confirm=true');
  });

  test('blocks create stage instance in dry-run mode', async () => {
    const channelId = '123456789012345679';
    const guildId = '123456789012345678';

    const client = {
      channels: {
        raw: async (_channelId: string, _force: boolean) => ({
          id: channelId,
          type: 13, // stage channel
          guild_id: guildId,
          name: 'stage',
          position: 0,
        }),
      },
      proxy: {
        'stage-instances': {
          post: async () => undefined,
        },
      },
    } as unknown as HttpClient;

    const service = new DiscordStageService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.createStageInstance(guildId, { channelId, topic: 'Test AMA' }),
    ).rejects.toThrow('Dry-run mode blocked mutation stage.create');
  });

  test('throws BAD_REQUEST for update with no fields', async () => {
    const client = {
      proxy: stageProxy,
    } as unknown as HttpClient;

    const service = new DiscordStageService(client, baseConfig);

    await expect(
      service.updateStageInstance('123456789012345679', {}),
    ).rejects.toThrow('At least one field must be provided');
  });

  test('getGuildPreview does not enforce allowlist', async () => {
    const restrictedConfig: AppConfig = {
      ...baseConfig,
      guildAllowlist: ['999999999999999999'],
    };

    const client = {
      proxy: {
        guilds: (_guildId: string) => ({
          preview: {
            get: async () => ({
              id: '123456789012345678',
              name: 'Public Guild',
              icon: null,
              splash: null,
              discovery_splash: null,
              emojis: [],
              features: [],
              approximate_member_count: 100,
              approximate_presence_count: 10,
              description: null,
            }),
          },
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordStageService(client, restrictedConfig);

    // Should not throw even though guild is not in allowlist
    await expect(
      service.getGuildPreview('123456789012345678'),
    ).resolves.toMatchObject({ id: '123456789012345678', name: 'Public Guild' });
  });

  test('listActiveThreads maps thread data correctly', async () => {
    const guildId = '123456789012345678';

    const client = {
      proxy: {
        guilds: (_gId: string) => ({
          threads: {
            active: {
              get: async () => ({
                threads: [
                  {
                    id: '123456789012345680',
                    name: 'help thread',
                    parent_id: '123456789012345679',
                    owner_id: '123456789012345681',
                    thread_metadata: { archived: false, locked: false },
                    message_count: 5,
                    member_count: 2,
                  },
                ],
                members: [
                  {
                    id: '123456789012345680',
                    user_id: '123456789012345681',
                    join_timestamp: '2026-01-01T00:00:00.000Z',
                  },
                ],
              }),
            },
          },
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordStageService(client, baseConfig);
    const result = await service.listActiveThreads(guildId);

    expect(result.threads).toHaveLength(1);
    expect(result.threads[0]).toMatchObject({
      id: '123456789012345680',
      name: 'help thread',
      parentId: '123456789012345679',
      archived: false,
      locked: false,
    });
    expect(result.members).toHaveLength(1);
    const firstMember = result.members[0];
    expect(firstMember).toBeDefined();
    expect(firstMember?.userId).toBe('123456789012345681');
  });
});
