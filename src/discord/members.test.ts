import { describe, expect, test } from 'bun:test';
import type { HttpClient } from 'seyfert/lib/client/httpclient.js';

import type { AppConfig } from '../config/env.js';
import { DiscordMembersService } from './members.js';

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

describe('DiscordMembersService bans', () => {
  test('fetches a specific guild ban', async () => {
    const fetchCalls: Array<{ guildId: string; userId: string; force: boolean }> = [];
    const client = {
      bans: {
        fetch: async (guildId: string, userId: string, force = false) => {
          fetchCalls.push({ guildId, userId, force });
          return {
            id: userId,
            reason: 'spam',
            user: {
              id: userId,
              username: 'alice',
              globalName: 'Alice',
              bot: false,
            },
          };
        },
      },
    } as unknown as HttpClient;

    const service = new DiscordMembersService(client, baseConfig);
    const summary = await service.fetchGuildBan('123456789012345678', '123456789012345679');

    expect(fetchCalls).toEqual([
      {
        guildId: '123456789012345678',
        userId: '123456789012345679',
        force: true,
      },
    ]);
    expect(summary).toEqual({
      guildId: '123456789012345678',
      userId: '123456789012345679',
      reason: 'spam',
      username: 'alice',
      globalName: 'Alice',
      bot: false,
    });
  });

  test('requires confirm for bulk ban', async () => {
    const service = new DiscordMembersService({} as HttpClient, baseConfig);

    await expect(
      service.bulkBanMembers('123456789012345678', {
        userIds: ['123456789012345679'],
        confirm: false,
      }),
    ).rejects.toThrow('requires confirm=true');
  });

  test('blocks bulk ban in dry-run mode', async () => {
    const service = new DiscordMembersService({} as HttpClient, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.bulkBanMembers('123456789012345678', {
        userIds: ['123456789012345679'],
        confirm: true,
      }),
    ).rejects.toThrow('Dry-run mode blocked mutation member.ban.bulk');
  });

  test('bulk bans deduplicated users and maps Discord response', async () => {
    const bulkCalls: Array<{
      guildId: string;
      body: { user_ids: string[]; delete_message_seconds?: number };
      reason?: string;
    }> = [];
    const client = {
      bans: {
        bulkCreate: async (
          guildId: string,
          body: { user_ids: string[]; delete_message_seconds?: number },
          reason?: string,
        ) => {
          const call: {
            guildId: string;
            body: { user_ids: string[]; delete_message_seconds?: number };
            reason?: string;
          } = { guildId, body };
          if (reason !== undefined) {
            call.reason = reason;
          }
          bulkCalls.push(call);
          return {
            banned_users: ['123456789012345679'],
            failed_users: ['123456789012345680'],
          };
        },
      },
    } as unknown as HttpClient;

    const service = new DiscordMembersService(client, baseConfig);
    const result = await service.bulkBanMembers('123456789012345678', {
      userIds: ['123456789012345679', '123456789012345679', '123456789012345680'],
      deleteMessageSeconds: 300,
      reason: 'raid cleanup',
      confirm: true,
    });

    expect(bulkCalls).toEqual([
      {
        guildId: '123456789012345678',
        body: {
          user_ids: ['123456789012345679', '123456789012345680'],
          delete_message_seconds: 300,
        },
        reason: 'raid cleanup',
      },
    ]);
    expect(result).toEqual({
      guildId: '123456789012345678',
      bannedUserIds: ['123456789012345679'],
      failedUserIds: ['123456789012345680'],
    });
  });

  test('enforces bulk ban max of 200 users', async () => {
    const service = new DiscordMembersService({} as HttpClient, baseConfig);
    const userIds = Array.from({ length: 201 }, (_, index) => (123456789012345678n + BigInt(index)).toString());

    await expect(
      service.bulkBanMembers('123456789012345678', {
        userIds,
        confirm: true,
      }),
    ).rejects.toThrow('Bulk ban supports at most 200 user IDs per request');
  });
});
