import { describe, expect, test } from 'bun:test';

import { normalizeHexColor, snowflakeSchema } from './common.js';

describe('common schemas', () => {
  test('validates snowflake', () => {
    expect(() => snowflakeSchema.parse('123456789012345678')).not.toThrow();
    expect(() => snowflakeSchema.parse('abc')).toThrow();
  });

  test('normalizes hex colors', () => {
    expect(normalizeHexColor('#FF00AA')).toBe(0xff00aa);
    expect(normalizeHexColor('00ff00')).toBe(0x00ff00);
  });
});
