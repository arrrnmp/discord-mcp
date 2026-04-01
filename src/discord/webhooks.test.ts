import { describe, expect, test } from 'bun:test';
import type { HttpClient } from 'seyfert/lib/client/httpclient.js';

import type { AppConfig } from '../config/env.js';
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

describe('DiscordWebhooksService', () => {
  test('requires confirm for delete webhook message by token', async () => {
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

  test('blocks execute webhook by token in dry-run mode', async () => {
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
});
