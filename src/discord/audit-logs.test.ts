import { describe, expect, test } from 'bun:test';
import type { HttpClient } from 'seyfert/lib/client/httpclient.js';

import type { AppConfig } from '../config/env.js';
import { DiscordAuditLogsService } from './audit-logs.js';

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

describe('DiscordAuditLogsService', () => {
  test('maps entries, users, and related target IDs', async () => {
    const client = {
      proxy: {
        guilds: (guildId: string) => ({
          'audit-logs': {
            get: async () => ({
              entries: [
                {
                  id: '111',
                  actionType: 10,
                  targetId: '999',
                  userId: '222',
                  reason: 'cleanup',
                  options: { count: '2' },
                  changes: [
                    { key: 'name', old_value: 'old', new_value: 'new' },
                    { key: 'topic', new_value: 'hello' },
                  ],
                },
              ],
              users: [
                {
                  id: '222',
                  username: 'alice',
                  globalName: 'Alice',
                  bot: false,
                },
              ],
              webhooks: [{ id: 'w1', name: 'hook', channelId: 'c1' }],
            }),
          },
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordAuditLogsService(client, baseConfig);
    const result = await service.fetchAuditLogs('123456789012345678', {
      limit: 10,
    });

    expect(result.guildId).toBe('123456789012345678');
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toEqual({
      id: '111',
      actionType: 10,
      targetId: '999',
      userId: '222',
      reason: 'cleanup',
      options: { count: '2' },
      changeCount: 2,
      changes: [
        { key: 'name', oldValue: 'old', newValue: 'new' },
        { key: 'topic', newValue: 'hello' },
      ],
    });
    expect(result.users).toEqual([
      {
        id: '222',
        username: 'alice',
        globalName: 'Alice',
        bot: false,
      },
    ]);
  });

  test('enforces guild allowlist', async () => {
    const service = new DiscordAuditLogsService({} as HttpClient, {
      ...baseConfig,
      guildAllowlist: ['123456789012345678'],
    });

    await expect(
      service.fetchAuditLogs('999999999999999999', {
        limit: 10,
      }),
    ).rejects.toThrow('is not in DISCORD_GUILD_ALLOWLIST');
  });

  test('fetchAuditLogs with userId filter', async () => {
    const client = {
      proxy: {
        guilds: () => ({
          'audit-logs': {
            get: async ({ query }: any) => {
              expect(query.user_id).toBe('123456789012345670');
              return {
                entries: [],
                users: [],
                webhooks: [],
              };
            },
          },
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordAuditLogsService(client, baseConfig);
    const result = await service.fetchAuditLogs('123456789012345678', {
      userId: '123456789012345670',
    });

    expect(result.guildId).toBe('123456789012345678');
    expect(result.entries).toHaveLength(0);
  });

  test('fetchAuditLogs with actionType filter', async () => {
    const client = {
      proxy: {
        guilds: () => ({
          'audit-logs': {
            get: async ({ query }: any) => {
              expect(query.action_type).toBe(20);
              return {
                entries: [],
                users: [],
                webhooks: [],
              };
            },
          },
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordAuditLogsService(client, baseConfig);
    const result = await service.fetchAuditLogs('123456789012345678', {
      actionType: 20,
    });

    expect(result.guildId).toBe('123456789012345678');
    expect(result.entries).toHaveLength(0);
  });

  test('fetchAuditLogs with before and after filters', async () => {
    const client = {
      proxy: {
        guilds: () => ({
          'audit-logs': {
            get: async ({ query }: any) => {
              expect(query.before).toBe('123456789012345680');
              expect(query.after).toBe('123456789012345670');
              return {
                entries: [],
                users: [],
                webhooks: [],
              };
            },
          },
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordAuditLogsService(client, baseConfig);
    const result = await service.fetchAuditLogs('123456789012345678', {
      before: '123456789012345680',
      after: '123456789012345670',
    });

    expect(result.guildId).toBe('123456789012345678');
  });

  test('fetchAuditLogs with limit filter', async () => {
    const client = {
      proxy: {
        guilds: () => ({
          'audit-logs': {
            get: async ({ query }: any) => {
              expect(query.limit).toBe(50);
              return {
                entries: [],
                users: [],
                webhooks: [],
              };
            },
          },
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordAuditLogsService(client, baseConfig);
    const result = await service.fetchAuditLogs('123456789012345678', {
      limit: 50,
    });

    expect(result.guildId).toBe('123456789012345678');
  });

  test('maps changes with both old and new values', async () => {
    const client = {
      proxy: {
        guilds: () => ({
          'audit-logs': {
            get: async () => ({
              entries: [
                {
                  id: '123',
                  actionType: 10,
                  changes: [
                    { key: 'name', old_value: 'OldName', new_value: 'NewName' },
                    { key: 'permissions', old_value: '100', new_value: '200' },
                  ],
                },
              ],
              users: [],
              webhooks: [],
            }),
          },
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordAuditLogsService(client, baseConfig);
    const result = await service.fetchAuditLogs('123456789012345678');

    expect(result.entries).toHaveLength(1);
    const entry = result.entries[0]!;
    expect(entry.changeCount).toBe(2);
    expect(entry.changes).toHaveLength(2);
    expect(entry.changes![0]).toEqual({
      key: 'name',
      oldValue: 'OldName',
      newValue: 'NewName',
    });
    expect(entry.changes![1]).toEqual({
      key: 'permissions',
      oldValue: '100',
      newValue: '200',
    });
  });
});
