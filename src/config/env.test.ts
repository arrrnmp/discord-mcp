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
    expect(config.gatewayEnabled).toBe(false);
    expect(config.gatewayIntents).toBe(1);
    expect(config.guildAllowlist).toEqual([]);
    expect(config.httpHost).toBe('127.0.0.1');
    expect(config.httpPort).toBe(3456);
    expect(config.httpPath).toBe('/mcp');
  });

  test('normalizes HTTP path and port', () => {
    const config = loadConfig({
      DISCORD_TOKEN: 'token',
      DISCORD_APPLICATION_ID: 'app',
      MCP_HTTP_PORT: '8080',
      MCP_HTTP_PATH: 'discord-mcp',
    });

    expect(config.httpPort).toBe(8080);
    expect(config.httpPath).toBe('/discord-mcp');
  });

  test('parses gateway settings from names', () => {
    const config = loadConfig({
      DISCORD_TOKEN: 'token',
      DISCORD_APPLICATION_ID: 'app',
      DISCORD_GATEWAY_ENABLED: 'true',
      DISCORD_GATEWAY_INTENTS: 'Guilds, GuildMembers, MessageContent',
    });

    expect(config.gatewayEnabled).toBe(true);
    expect(config.gatewayIntents).toBe(1 | 2 | 32768);
  });

  test('parses gateway intents from bitfield', () => {
    const config = loadConfig({
      DISCORD_TOKEN: 'token',
      DISCORD_APPLICATION_ID: 'app',
      DISCORD_GATEWAY_INTENTS: '513',
    });

    expect(config.gatewayIntents).toBe(513);
  });

  test('throws on unknown gateway intent name', () => {
    expect(() =>
      loadConfig({
        DISCORD_TOKEN: 'token',
        DISCORD_APPLICATION_ID: 'app',
        DISCORD_GATEWAY_INTENTS: 'Guilds,NotARealIntent',
      }),
    ).toThrow('Unknown Discord gateway intent name');
  });
});
