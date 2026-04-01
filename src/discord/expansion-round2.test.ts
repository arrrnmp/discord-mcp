import { describe, expect, test } from 'bun:test';
import type { HttpClient } from 'seyfert/lib/client/httpclient.js';

import type { AppConfig } from '../config/env.js';
import { DiscordMessagesService } from './messages.js';
import { DiscordService } from './service.js';
import { DiscordSpecialService } from './special.js';

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

describe('expansion round2 services', () => {
  test('enforces confirm for pin and unpin actions', async () => {
    const client = {
      channels: {
        fetch: async () => ({ guildId: '123456789012345678' }),
      },
    } as unknown as HttpClient;

    const service = new DiscordMessagesService(client, baseConfig);

    await expect(
      service.pinMessage('123456789012345679', '123456789012345680', {
        confirm: false,
      }),
    ).rejects.toThrow('requires confirm=true');

    await expect(
      service.unpinMessage('123456789012345679', '123456789012345680', {
        confirm: false,
      }),
    ).rejects.toThrow('requires confirm=true');
  });

  test('lists channel permission overwrites from raw channel payload', async () => {
    const client = {
      channels: {
        raw: async () => ({
          id: '123456789012345679',
          guild_id: '123456789012345678',
          permission_overwrites: [
            {
              id: '123456789012345681',
              type: 0,
              allow: '1024',
              deny: '0',
            },
          ],
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordService(client, baseConfig);
    const result = await service.listChannelPermissionOverwrites(
      '123456789012345678',
      '123456789012345679',
    );

    expect(result.overwrites).toEqual([
      {
        id: '123456789012345681',
        type: 0,
        allow: '1024',
        deny: '0',
      },
    ]);
  });

  test('blocks soundboard create in dry-run mode', async () => {
    const service = new DiscordSpecialService({} as HttpClient, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.createGuildSoundboardSound('123456789012345678', {
        name: 'alert',
        sound: 'data:audio/ogg;base64,AAAA',
      }),
    ).rejects.toThrow('Dry-run mode blocked mutation soundboard.create');
  });

  test('blocks reaction and crosspost mutations in dry-run mode', async () => {
    const client = {
      channels: {
        fetch: async () => ({ guildId: '123456789012345678' }),
      },
    } as unknown as HttpClient;

    const service = new DiscordMessagesService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.addReaction('123456789012345679', '123456789012345680', '🔥'),
    ).rejects.toThrow('Dry-run mode blocked mutation message.reaction.add');

    await expect(
      service.crosspostMessage('123456789012345679', '123456789012345680'),
    ).rejects.toThrow('Dry-run mode blocked mutation message.crosspost');
  });

  test('lists poll voters via proxy when query options are provided', async () => {
    const client = {
      channels: {
        fetch: async () => ({ guildId: '123456789012345678' }),
      },
      proxy: {
        channels: () => ({
          polls: () => ({
            answers: () => ({
              get: async () => ({
                users: [
                  {
                    id: '123456789012345681',
                    username: 'alice',
                    global_name: 'Alice',
                    avatar: null,
                    bot: false,
                  },
                ],
              }),
            }),
          }),
        }),
      },
      messages: {
        getAnswerVoters: async () => [],
      },
    } as unknown as HttpClient;

    const service = new DiscordMessagesService(client, baseConfig);
    const users = await service.listPollAnswerVoters('123456789012345679', '123456789012345680', 1, {
      limit: 10,
    });

    expect(users).toEqual([
      {
        id: '123456789012345681',
        username: 'alice',
        globalName: 'Alice',
        avatar: null,
        bot: false,
      },
    ]);
  });

  test('supports rich message body without text content', async () => {
    const client = {
      channels: {
        fetch: async () => ({ guildId: '123456789012345678' }),
      },
      messages: {
        write: async () => ({
          id: '123456789012345680',
          channelId: '123456789012345679',
          guildId: '123456789012345678',
          author: { id: '123456789012345681', username: 'bot' },
          content: '',
          embeds: [{ title: 'status' }],
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordMessagesService(client, baseConfig);
    const message = await service.sendMessage('123456789012345679', {
      embeds: [{ title: 'status' }],
    });

    expect(message.id).toBe('123456789012345680');
    expect(message.embedCount).toBe(1);
  });
});
