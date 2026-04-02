import { describe, expect, test } from 'bun:test';
import type { HttpClient } from 'seyfert/lib/client/httpclient.js';

import type { AppConfig } from '../config/env.js';
import { DiscordThreadsService } from './threads.js';

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

describe('DiscordThreadsService', () => {
  test('listActiveThreads maps thread and member structures correctly', async () => {
    const client = {
      proxy: {
        guilds: () => ({
          threads: {
            active: {
              get: async () => ({
                threads: [
                  {
                    id: '123456789012345680',
                    name: 'Test Thread',
                    type: 11,
                    guildId: '123456789012345678',
                    parentId: '123456789012345679',
                    ownerId: '123456789012345670',
                    archived: false,
                    locked: false,
                    messageCount: 5,
                    memberCount: 2,
                  },
                ],
                members: [
                  {
                    id: '123456789012345670',
                    userId: '123456789012345670',
                    joinTimestamp: '2024-01-01T00:00:00.000Z',
                  },
                ],
              }),
            },
          },
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordThreadsService(client, baseConfig);
    const result = await service.listActiveThreads('123456789012345678');

    expect(result.threads).toHaveLength(1);
    const thread = result.threads[0]!;
    expect(thread.id).toBe('123456789012345680');
    expect(thread.name).toBe('Test Thread');
    expect(result.members).toHaveLength(1);
  });

  test('createThread blocks in dry-run mode', async () => {
    const client = {} as unknown as HttpClient;

    const service = new DiscordThreadsService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.createThread('123456789012345678', '123456789012345679', { name: 'New Thread', type: 11 }),
    ).rejects.toThrow('Dry-run mode blocked mutation thread.create');
  });

  test('createThread returns thread summary', async () => {
    const client = {
      proxy: {
        channels: () => ({
          threads: {
            post: async () => ({
              id: '123456789012345680',
              name: 'New Thread',
              type: 11,
              guildId: '123456789012345678',
              parentId: '123456789012345679',
              ownerId: '123456789012345670',
              archived: false,
              locked: false,
              messageCount: 0,
              memberCount: 1,
            }),
          },
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordThreadsService(client, baseConfig);
    const result = await service.createThread('123456789012345678', '123456789012345679', {
      name: 'New Thread',
      type: 11,
    });

    expect(result.id).toBe('123456789012345680');
    expect(result.name).toBe('New Thread');
  });

  test('updateThread blocks in dry-run mode', async () => {
    const client = {} as unknown as HttpClient;

    const service = new DiscordThreadsService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.updateThread('123456789012345678', '123456789012345680', { name: 'Updated Thread' }),
    ).rejects.toThrow('Dry-run mode blocked mutation thread.update');
  });

  test('joinThread blocks in dry-run mode', async () => {
    const client = {} as unknown as HttpClient;

    const service = new DiscordThreadsService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.joinThread('123456789012345678', '123456789012345680'),
    ).rejects.toThrow('Dry-run mode blocked mutation thread.join');
  });

  test('leaveThread blocks in dry-run mode', async () => {
    const client = {} as unknown as HttpClient;

    const service = new DiscordThreadsService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.leaveThread('123456789012345678', '123456789012345680'),
    ).rejects.toThrow('Dry-run mode blocked mutation thread.leave');
  });

  test('lockThread blocks in dry-run mode', async () => {
    const client = {} as unknown as HttpClient;

    const service = new DiscordThreadsService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.lockThread('123456789012345678', '123456789012345680', { locked: true }),
    ).rejects.toThrow('Dry-run mode blocked mutation thread.lock');
  });

  test('unlockThread blocks in dry-run mode', async () => {
    const client = {} as unknown as HttpClient;

    const service = new DiscordThreadsService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.unlockThread('123456789012345678', '123456789012345680'),
    ).rejects.toThrow('Dry-run mode blocked mutation thread.unlock');
  });

  test('deleteThread requires confirm', async () => {
    const client = {} as unknown as HttpClient;

    const service = new DiscordThreadsService(client, baseConfig);

    await expect(
      service.deleteThread('123456789012345678', '123456789012345680', { confirm: false }),
    ).rejects.toThrow('requires confirm=true');
  });

  test('deleteThread blocks in dry-run mode', async () => {
    const client = {} as unknown as HttpClient;

    const service = new DiscordThreadsService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.deleteThread('123456789012345678', '123456789012345680', { confirm: true }),
    ).rejects.toThrow('Dry-run mode blocked mutation thread.delete');
  });

  test('removeMemberFromThread blocks in dry-run mode', async () => {
    const client = {} as unknown as HttpClient;

    const service = new DiscordThreadsService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.removeMemberFromThread('123456789012345678', '123456789012345680', '123456789012345670', {
        confirm: true,
      }),
    ).rejects.toThrow('Dry-run mode blocked mutation thread.member.remove');
  });

  test('enforces guild allowlist', async () => {
    const client = {} as unknown as HttpClient;

    const service = new DiscordThreadsService(client, {
      ...baseConfig,
      guildAllowlist: ['999999999999999999'],
    });

    await expect(
      service.createThread('123456789012345678', '123456789012345679', { name: 'New Thread', type: 11 }),
    ).rejects.toThrow('Guild 123456789012345678 is not in DISCORD_GUILD_ALLOWLIST');
  });
});
