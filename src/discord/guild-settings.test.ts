import { describe, expect, test } from 'bun:test';
import type { HttpClient } from 'seyfert/lib/client/httpclient.js';

import type { AppConfig } from '../config/env.js';
import { DiscordGuildSettingsService } from './guild-settings.js';

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

describe('DiscordGuildSettingsService', () => {
  test('requires confirm for beginGuildPrune', async () => {
    const service = new DiscordGuildSettingsService({} as HttpClient, baseConfig);

    await expect(
      service.beginGuildPrune(
        '123456789012345678',
        {},
        {
          confirm: false,
        },
      ),
    ).rejects.toThrow('requires confirm=true');
  });

  test('blocks updateGuildSettings in dry-run mode', async () => {
    const service = new DiscordGuildSettingsService({} as HttpClient, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.updateGuildSettings('123456789012345678', {
        name: 'new name',
      }),
    ).rejects.toThrow('Dry-run mode blocked mutation guild.settings.update');
  });

  test('normalizes prune count include roles', async () => {
    const client = {
      proxy: {
        guilds: () => ({
          prune: {
            get: async () => ({
              pruned: 4,
            }),
          },
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordGuildSettingsService(client, baseConfig);
    const result = await service.getGuildPruneCount('123456789012345678', {
      days: 7,
      include_roles: '1,2,3',
    });

    expect(result.pruned).toBe(4);
    expect(result.days).toBe(7);
    expect(result.includeRoleIds).toEqual(['1', '2', '3']);
  });

  test('maps template fields from snake_case', async () => {
    const client = {
      templates: {
        list: async () => [
          {
            code: 'tpl1',
            name: 'Template',
            description: null,
            usage_count: 12,
            creator_id: '222222222222222222',
            source_guild_id: '123456789012345678',
            is_dirty: false,
            created_at: '2020-01-01T00:00:00.000Z',
            updated_at: '2020-01-02T00:00:00.000Z',
          },
        ],
      },
    } as unknown as HttpClient;

    const service = new DiscordGuildSettingsService(client, baseConfig);
    const templates = await service.listGuildTemplates('123456789012345678');

    expect(templates).toHaveLength(1);
    expect(templates[0]).toEqual({
      code: 'tpl1',
      name: 'Template',
      description: null,
      usageCount: 12,
      creatorId: '222222222222222222',
      sourceGuildId: '123456789012345678',
      isDirty: false,
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-02T00:00:00.000Z',
    });
  });

  test('includes icon hash in guild settings summary when present', async () => {
    const client = {
      guilds: {
        raw: async () => ({
          id: '123456789012345678',
          name: 'Guild',
          owner_id: '123456789012345679',
          features: [],
          icon: 'abc123hash',
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordGuildSettingsService(client, baseConfig);
    const summary = await service.fetchGuildSettings('123456789012345678');
    expect(summary.iconHash).toBe('abc123hash');
  });
});
