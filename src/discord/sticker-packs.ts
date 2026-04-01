import type { StickerPackStructure } from 'seyfert/lib/client/transformers.js';
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
