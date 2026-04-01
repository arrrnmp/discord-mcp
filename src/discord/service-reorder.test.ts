import { describe, expect, test } from 'bun:test';
import type { HttpClient } from 'seyfert/lib/client/httpclient.js';

import type { AppConfig } from '../config/env.js';
import { DiscordService } from './service.js';

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

describe('DiscordService — reorder and role counts', () => {
  test('modifyGuildChannelPositions requires confirm', async () => {
    const client = {} as unknown as HttpClient;
    const service = new DiscordService(client, baseConfig);

    await expect(
      service.modifyGuildChannelPositions(
        '123456789012345678',
        [{ id: '123456789012345679', position: 0 }],
        { confirm: false },
      ),
    ).rejects.toThrow('requires confirm=true');
  });

  test('modifyGuildChannelPositions blocks in dry-run mode', async () => {
    const client = {
      proxy: {
        guilds: (_guildId: string) => ({
          channels: {
            patch: async () => undefined,
          },
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.modifyGuildChannelPositions(
        '123456789012345678',
        [{ id: '123456789012345679', position: 0 }],
        { confirm: true },
      ),
    ).rejects.toThrow('Dry-run mode blocked mutation channel.reorder');
  });

  test('modifyGuildRolePositions requires confirm', async () => {
    const client = {} as unknown as HttpClient;
    const service = new DiscordService(client, baseConfig);

    await expect(
      service.modifyGuildRolePositions(
        '123456789012345678',
        [{ id: '123456789012345679', position: 1 }],
        { confirm: false },
      ),
    ).rejects.toThrow('requires confirm=true');
  });

  test('modifyGuildRolePositions blocks in dry-run mode', async () => {
    const client = {
      proxy: {
        guilds: (_guildId: string) => ({
          roles: {
            patch: async () => [],
          },
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.modifyGuildRolePositions(
        '123456789012345678',
        [{ id: '123456789012345679', position: 1 }],
        { confirm: true },
      ),
    ).rejects.toThrow('Dry-run mode blocked mutation role.reorder');
  });

  test('getRoleMemberCounts enforces guild allowlist', async () => {
    const client = {} as unknown as HttpClient;
    const service = new DiscordService(client, {
      ...baseConfig,
      guildAllowlist: ['999999999999999999'],
    });

    await expect(
      service.getRoleMemberCounts('123456789012345678'),
    ).rejects.toThrow('not in DISCORD_GUILD_ALLOWLIST');
  });

  test('getRoleMemberCounts returns role count map', async () => {
    const guildId = '123456789012345678';
    const roleId = '123456789012345679';

    const client = {
      roles: {
        memberCounts: async (_gId: string) => ({ [roleId]: 42 }),
      },
    } as unknown as HttpClient;

    const service = new DiscordService(client, baseConfig);
    const counts = await service.getRoleMemberCounts(guildId);

    expect(counts[roleId]).toBe(42);
  });
});
