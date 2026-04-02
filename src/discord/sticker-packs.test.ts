import { describe, expect, test } from 'bun:test';
import type { HttpClient } from 'seyfert/lib/client/httpclient.js';

import type { AppConfig } from '../config/env.js';
import { DiscordStickerPacksService } from './sticker-packs.js';

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

describe('DiscordStickerPacksService', () => {
  test('listStickerPacks maps pack and sticker structures correctly', async () => {
    const client = {
      proxy: {
        'sticker-packs': {
          get: async () => ({
            sticker_packs: [
              {
                id: '123456789012345680',
                name: 'Test Pack',
                description: 'A test sticker pack',
                banner_asset_id: 'banner123',
                stickers: [
                  {
                    id: '123456789012345681',
                    name: 'Test Sticker',
                    description: 'A test sticker',
                    tags: 'test,sticker',
                    type: 1,
                    format_type: 1,
                  },
                ],
              },
            ],
          }),
        },
      },
    } as unknown as HttpClient;

    const service = new DiscordStickerPacksService(client, baseConfig);
    const result = await service.listStickerPacks();

    expect(result).toHaveLength(1);
    const pack = result[0]!;
    expect(pack.id).toBe('123456789012345680');
    expect(pack.name).toBe('Test Pack');
    expect(pack.stickers).toHaveLength(1);
    expect(pack.stickers[0]!.id).toBe('123456789012345681');
  });

  test('getStickerPack returns single pack', async () => {
    const client = {
      proxy: {
        'sticker-packs': (packId: string) => ({
          get: async () => ({
            id: packId,
            name: 'Single Pack',
            description: 'A single sticker pack',
            banner_asset_id: 'banner456',
            stickers: [
              {
                id: '123456789012345682',
                name: 'Single Sticker',
                description: 'A single sticker',
                tags: 'single',
                type: 1,
                format_type: 1,
              },
            ],
          }),
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordStickerPacksService(client, baseConfig);
    const result = await service.getStickerPack('123456789012345680');

    expect(result.id).toBe('123456789012345680');
    expect(result.name).toBe('Single Pack');
    expect(result.stickers).toHaveLength(1);
  });

  test('getSticker returns single sticker', async () => {
    const client = {
      proxy: {
        stickers: (stickerId: string) => ({
          get: async () => ({
            id: stickerId,
            name: 'Single Sticker',
            description: 'A standalone sticker',
            tags: 'standalone',
            type: 1,
            format_type: 1,
          }),
        }),
      },
    } as unknown as HttpClient;

    const service = new DiscordStickerPacksService(client, baseConfig);
    const result = await service.getSticker('123456789012345683');

    expect(result.id).toBe('123456789012345683');
    expect(result.name).toBe('Single Sticker');
    expect(result.tags).toBe('standalone');
  });
});
