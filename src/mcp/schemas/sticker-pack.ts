import { z } from 'zod';

import { snowflakeSchema } from './common.js';

export const listStickerPacksInputSchema = z.object({});

export const getStickerPackInputSchema = z.object({
  packId: snowflakeSchema,
});

export const getStickerInputSchema = z.object({
  stickerId: snowflakeSchema,
});
