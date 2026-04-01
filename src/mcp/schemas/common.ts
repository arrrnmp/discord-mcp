import { z } from 'zod';

export const snowflakeSchema = z
  .string()
  .regex(/^\d{16,20}$/, 'Must be a valid Discord snowflake');

export const reasonSchema = z.string().min(1).max(512).optional();

export const confirmSchema = z.boolean().optional().default(false);

export const hexColorSchema = z
  .string()
  .regex(/^#?[0-9a-fA-F]{6}$/, 'Color must be a 6-digit hex string');

export function normalizeHexColor(color: string): number {
  const normalized = color.startsWith('#') ? color.slice(1) : color;
  return Number.parseInt(normalized, 16);
}

export const baseResultSchema = z.object({
  ok: z.boolean(),
});
