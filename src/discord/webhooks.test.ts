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

const mockWebhook = {
  id: '123456789012345670',
  type: 1,
  guildId: '123456789012345678',
  channelId: '123456789012345679',
  name: 'hook',
  avatar: null,
  applicationId: null,
};

describe('DiscordWebhooksService', () => {
  test('listGuildWebhooks returns webhook summaries', async () => {
    const client = {
      webhooks: {
        listFromGuild: async () => [mockWebhook],
      },
    } as unknown as HttpClient;

    const service = new DiscordWebhooksService(client, baseConfig);
    const result = await service.listGuildWebhooks('123456789012345678');

    expect(result).toHaveLength(1);
    const webhook = result[0]!;
    expect(webhook.id).toBe('123456789012345670');
    expect(webhook.name).toBe('hook');
  });

  test('listChannelWebhooks returns webhook summaries', async () => {
    const client = {
      channels: {
        fetch: async () => ({ id: '123456789012345679', guildId: '123456789012345678' }),
      },
      webhooks: {
        listFromChannel: async () => [mockWebhook],
      },
    } as unknown as HttpClient;

    const service = new DiscordWebhooksService(client, baseConfig);
    const result = await service.listChannelWebhooks('123456789012345678', '123456789012345679');

    expect(result).toHaveLength(1);
    const webhook = result[0]!;
    expect(webhook.id).toBe('123456789012345670');
  });

  test('createWebhook blocks in dry-run mode', async () => {
    const client = {
      channels: {
        fetch: async () => ({ id: '123456789012345679', guildId: '123456789012345678' }),
      },
    } as unknown as HttpClient;

    const service = new DiscordWebhooksService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.createWebhook('123456789012345678', '123456789012345679', { name: 'new-hook' }),
    ).rejects.toThrow('Dry-run mode blocked mutation webhook.create');
  });

  test('updateWebhook blocks in dry-run mode', async () => {
    const client = {
      webhooks: {
        fetch: async () => mockWebhook,
      },
    } as unknown as HttpClient;

    const service = new DiscordWebhooksService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.updateWebhook('123456789012345678', '123456789012345670', { name: 'updated-hook' }),
    ).rejects.toThrow('Dry-run mode blocked mutation webhook.edit');
  });

  test('deleteWebhook requires confirm', async () => {
    const client = {
      webhooks: {
        fetch: async () => mockWebhook,
      },
    } as unknown as HttpClient;

    const service = new DiscordWebhooksService(client, baseConfig);

    await expect(
      service.deleteWebhook('123456789012345678', '123456789012345670', { confirm: false }),
    ).rejects.toThrow('requires confirm=true');
  });

  test('deleteWebhook blocks in dry-run mode', async () => {
    const client = {
      webhooks: {
        fetch: async () => mockWebhook,
      },
    } as unknown as HttpClient;

    const service = new DiscordWebhooksService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.deleteWebhook('123456789012345678', '123456789012345670', { confirm: true }),
    ).rejects.toThrow('Dry-run mode blocked mutation webhook.delete');
  });

  test('executeWebhookByToken blocks in dry-run mode', async () => {
    const client = {
      webhooks: {
        fetch: async () => mockWebhook,
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

  test('deleteWebhookMessageByToken requires confirm', async () => {
    const client = {
      webhooks: {
        fetch: async () => mockWebhook,
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

  test('deleteWebhookMessageByToken blocks in dry-run mode', async () => {
    const client = {
      webhooks: {
        fetch: async () => mockWebhook,
      },
    } as unknown as HttpClient;

    const service = new DiscordWebhooksService(client, {
      ...baseConfig,
      dryRun: true,
    });

    await expect(
      service.deleteWebhookMessageByToken(
        '123456789012345678',
        '123456789012345670',
        'token',
        '123456789012345680',
        { confirm: true },
      ),
    ).rejects.toThrow('Dry-run mode blocked mutation webhook.token.message.delete');
  });
});
