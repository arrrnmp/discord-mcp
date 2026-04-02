import { describe, expect, test } from 'bun:test';
import type { HttpClient } from 'seyfert/lib/client/httpclient.js';

import type { AppConfig } from '../config/env.js';
import { DiscordMessagesService } from './messages.js';

const baseConfig: AppConfig = {
  discordToken: 'token',
  discordApplicationId: 'app',
  guildAllowlist: [],
  dryRun: false,
  gatewayEnabled: false,
  gatewayIntents: 1,
  httpHost: '127.0.1',
  httpPort: 3456,
  httpPath: '/mcp',
  serverName: 'discord-control-mcp',
  serverVersion: '0.1.0',
};

const mockChannel = { id: '123456789012345679', guildId: '123456789012345678' };
const mockChannelOtherGuild = { id: '123456789012345679', guildId: '999999999999999999' };

describe('DiscordMessagesService', () => {
  test('sendMessage blocks in dry-run mode', async () => {
    const client = {
      channels: {
        fetch: async () => mockChannel,
      },
    } as unknown as HttpClient;

    const service = new DiscordMessagesService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.sendMessage('123456789012345679', { content: 'hello' }),
    ).rejects.toThrow('Dry-run mode blocked mutation message.send');
  });

  test('sendMessage returns message summary', async () => {
    const client = {
      channels: {
        fetch: async () => mockChannel,
      },
      messages: {
        write: async () => ({
          id: '123456789012345680',
          channelId: '123456789012345679',
          author: {
            id: '123456789012345670',
            username: 'bot',
            globalName: 'Bot',
            discriminator: '0',
            bot: true,
          },
          content: 'hello',
          timestamp: '2024-01-01T00:00:00.000Z',
          editedTimestamp: null,
          tts: false,
          mentionEveryone: false,
          mentions: [],
          mentionRoles: [],
          attachments: [],
          embeds: [],
          reactions: [],
          pinned: false,
          type: 0,
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordMessagesService(client, baseConfig);
    const result = await service.sendMessage('123456789012345679', { content: 'hello' });

    expect(result.id).toBe('123456789012345680');
    expect(result.channelId).toBe('123456789012345679');
    expect(result.content).toBe('hello');
  });

  test('editMessage blocks in dry-run mode', async () => {
    const client = {
      channels: {
        fetch: async () => mockChannel,
      },
    } as unknown as HttpClient;

    const service = new DiscordMessagesService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.editMessage('123456789012345679', '123456789012345680', { content: 'updated' }),
    ).rejects.toThrow('Dry-run mode blocked mutation message.edit');
  });

  test('deleteMessage requires confirm', async () => {
    const client = {
      channels: {
        fetch: async () => mockChannel,
      },
    } as unknown as HttpClient;

    const service = new DiscordMessagesService(client, baseConfig);

    await expect(
      service.deleteMessage('123456789012345679', '123456789012345680', { confirm: false }),
    ).rejects.toThrow('requires confirm=true');
  });

  test('deleteMessage blocks in dry-run mode', async () => {
    const client = {
      channels: {
        fetch: async () => mockChannel,
      },
    } as unknown as HttpClient;

    const service = new DiscordMessagesService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.deleteMessage('123456789012345679', '123456789012345680', { confirm: true }),
    ).rejects.toThrow('Dry-run mode blocked mutation message.delete');
  });

  test('purgeMessages requires confirm', async () => {
    const client = {
      channels: {
        fetch: async () => mockChannel,
      },
    } as unknown as HttpClient;

    const service = new DiscordMessagesService(client, baseConfig);

    await expect(
      service.purgeMessages('123456789012345679', { confirm: false, limit: 10 }),
    ).rejects.toThrow('requires confirm=true');
  });

  test('purgeMessages blocks in dry-run mode', async () => {
    const client = {
      channels: {
        fetch: async () => mockChannel,
      },
      messages: {
        list: async () => [
          { id: '1' },
          { id: '2' },
        ],
      },
    } as unknown as HttpClient;

    const service = new DiscordMessagesService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.purgeMessages('123456789012345679', { confirm: true, limit: 10 }),
    ).rejects.toThrow('Dry-run mode blocked mutation message.purge');
  });

  test('pinMessage blocks in dry-run mode', async () => {
    const client = {
      channels: {
        fetch: async () => mockChannel,
      },
    } as unknown as HttpClient;

    const service = new DiscordMessagesService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.pinMessage('123456789012345679', '123456789012345680', { confirm: true }),
    ).rejects.toThrow('Dry-run mode blocked mutation message.pin');
  });

  test('unpinMessage blocks in dry-run mode', async () => {
    const client = {
      channels: {
        fetch: async () => mockChannel,
      },
    } as unknown as HttpClient;

    const service = new DiscordMessagesService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.unpinMessage('123456789012345679', '123456789012345680', { confirm: true }),
    ).rejects.toThrow('Dry-run mode blocked mutation message.pin.delete');
  });

  test('addReaction blocks in dry-run mode', async () => {
    const client = {
      channels: {
        fetch: async () => mockChannel,
      },
    } as unknown as HttpClient;

    const service = new DiscordMessagesService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.addReaction('123456789012345679', '123456789012345680', '👍'),
    ).rejects.toThrow('Dry-run mode blocked mutation message.reaction.add');
  });

  test('clearReactions blocks in dry-run mode', async () => {
    const client = {
      channels: {
        fetch: async () => mockChannel,
      },
    } as unknown as HttpClient;

    const service = new DiscordMessagesService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.clearReactions('123456789012345679', '123456789012345680'),
    ).rejects.toThrow('Dry-run mode blocked mutation message.reaction.clear');
  });

  test('enforces guild allowlist', async () => {
    const client = {
      channels: {
        fetch: async () => mockChannelOtherGuild,
      },
    } as unknown as HttpClient;

    const service = new DiscordMessagesService(client, {
      ...baseConfig,
      guildAllowlist: ['123456789012345678'],
    });

    await expect(
      service.sendMessage('123456789012345679', { content: 'hello' }),
    ).rejects.toThrow('Guild 999999999999999999 is not in DISCORD_GUILD_ALLOWLIST');
  });
});
