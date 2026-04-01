import { describe, expect, test } from 'bun:test';
import { type HttpClient } from 'seyfert/lib/client/httpclient.js';

import type { AppConfig } from '../config/env.js';
import { DiscordMembersService } from './members.js';
import { DiscordService } from './service.js';
import { DiscordWebhooksService } from './webhooks.js';

const configWithAllowlist: AppConfig = {
  discordToken: 'token',
  discordApplicationId: 'app',
  guildAllowlist: ['111222333444555666'], // Only this guild allowed
  dryRun: false,
  gatewayEnabled: false,
  gatewayIntents: 1,
  httpHost: '127.0.0.1',
  httpPort: 3456,
  httpPath: '/mcp',
  serverName: 'discord-control-mcp',
  serverVersion: '0.1.0',
};

const allowedGuildId = '111222333444555666';
const blockedGuildId = '999888777666555444';

describe('Discord Authorization (Guild Allowlist)', () => {
  const mockClient = {
    proxy: {
      users: () => ({
        guilds: {
          get: async () => [],
        },
      }),
      guilds: () => ({
        regions: {
          get: async () => [],
        },
      }),
    },
    guilds: {
      raw: async () => ({ id: allowedGuildId, name: 'Allowed', features: [], owner_id: '123', verification_level: 0 }),
      channels: {
        list: async () => [],
      },
    },
    roles: {
      list: async () => [],
    },
    members: {
      list: async () => [],
    },
    webhooks: {
      list: async () => [],
    },
  } as unknown as HttpClient;

  test('allows access to whitelisted guild in DiscordService', async () => {
    const service = new DiscordService(mockClient, configWithAllowlist);
    try {
      await service.getGuildInventory(allowedGuildId);
    } catch (e) {
      console.error('getGuildInventory failed:', e);
      throw e;
    }
  });

  test('blocks access to non-whitelisted guild in DiscordService', async () => {
    const service = new DiscordService(mockClient, configWithAllowlist);
    await expect(service.getGuildInventory(blockedGuildId)).rejects.toThrow('not in DISCORD_GUILD_ALLOWLIST');
  });

  test('blocks access to non-whitelisted guild in DiscordMembersService', async () => {
    const service = new DiscordMembersService(mockClient, configWithAllowlist);
    await expect(service.listMembers(blockedGuildId)).rejects.toThrow('not in DISCORD_GUILD_ALLOWLIST');
  });

  test('blocks access to non-whitelisted guild in DiscordWebhooksService', async () => {
    const service = new DiscordWebhooksService(mockClient, configWithAllowlist);
    await expect(service.listGuildWebhooks(blockedGuildId)).rejects.toThrow('not in DISCORD_GUILD_ALLOWLIST');
  });

  test('allows access to all guilds when allowlist is empty', async () => {
    const openConfig = { ...configWithAllowlist, guildAllowlist: [] };
    const service = new DiscordService(mockClient, openConfig);
    try {
      await service.getGuildInventory(blockedGuildId);
    } catch (e) {
      console.error('getGuildInventory failed (open):', e);
      throw e;
    }
  });
});
