import { describe, expect, test } from 'bun:test';

import { loadConfig } from './env.js';

describe('loadConfig', () => {
  test('parses allowlist and booleans', () => {
    const config = loadConfig({
      DISCORD_TOKEN: 'token',
      DISCORD_APPLICATION_ID: 'app',
      DISCORD_GUILD_ALLOWLIST: '123, 456 ,',
      DISCORD_DRY_RUN: 'true',
    });

    expect(config.guildAllowlist).toEqual(['123', '456']);
    expect(config.dryRun).toBe(true);
  });

  test('uses defaults', () => {
    const config = loadConfig({
      DISCORD_TOKEN: 'token',
      DISCORD_APPLICATION_ID: 'app',
    });

    expect(config.serverName).toBe('discord-control-mcp');
    expect(config.serverVersion).toBe('0.1.0');
    expect(config.dryRun).toBe(false);
    expect(config.guildAllowlist).toEqual([]);
  });
});
