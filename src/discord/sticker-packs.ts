import { DiscordBaseService } from './base.js';

export type DiscordStickerPackSummary = {
  id: string;
  stickers: Array<{
    id: string;
    packId: string;
    name: string;
    description: string | null;
    tags: string;
    assetHash?: string;
    type: number;
    formatType: number;
    available?: boolean;
    guildId?: string;
    user?: {
      id: string;
      username: string;
    };
    sortValue?: number;
  }>;
  name: string;
  skuId: string;
  coverStickerId: string | null;
  description: string;
  bannerAssetId: string | null;
};

export class DiscordStickerPacksService extends DiscordBaseService {
  async listStickerPacks(): Promise<DiscordStickerPackSummary[]> {
    const response = await this.client.proxy['sticker-packs'].get();
    const packs = (response.sticker_packs ?? []) as any[];
    return packs.map((pack) => this.toStickerPackSummary(pack));
  }

  async getStickerPack(packId: string): Promise<DiscordStickerPackSummary> {
    const pack = await this.client.proxy['sticker-packs'](packId).get();
    return this.toStickerPackSummary(pack as any);
  }

  async getSticker(stickerId: string): Promise<DiscordStickerPackSummary['stickers'][number]> {
    const sticker = await this.client.proxy.stickers(stickerId).get() as any;
    return {
      id: sticker.id,
      packId: sticker.pack_id ?? '',
      name: sticker.name,
      description: sticker.description ?? null,
      tags: sticker.tags ?? '',
      type: sticker.type,
      formatType: sticker.format_type,
      ...(sticker.available !== undefined && { available: sticker.available }),
      ...(sticker.guild_id !== undefined && { guildId: sticker.guild_id }),
      ...(sticker.sort_value !== undefined && { sortValue: sticker.sort_value }),
    };
  }

  private toStickerPackSummary(pack: any): DiscordStickerPackSummary {
    return {
      id: pack.id,
      stickers: (pack.stickers ?? []).map((s: any) => ({
        id: s.id,
        packId: s.pack_id,
        name: s.name,
        description: s.description,
        tags: s.tags,
        type: s.type,
        formatType: s.format_type,
      })),
      name: pack.name,
      skuId: pack.sku_id,
      coverStickerId: pack.cover_sticker_id,
      description: pack.description,
      bannerAssetId: pack.banner_asset_id,
    };
  }
}
