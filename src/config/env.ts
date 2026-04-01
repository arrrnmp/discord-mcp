import { z } from 'zod';

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_APPLICATION_ID: z.string().min(1),
  DISCORD_BOT_ID: z.string().min(1).optional(),
  DISCORD_GUILD_ALLOWLIST: z.string().optional(),
  DISCORD_DRY_RUN: z.string().optional(),
  MCP_SERVER_NAME: z.string().default('discord-control-mcp'),
  MCP_SERVER_VERSION: z.string().default('0.1.0'),
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
});

export type AppConfig = {
  discordToken: string;
  discordApplicationId: string;
  discordBotId?: string;
  guildAllowlist: string[];
  dryRun: boolean;
  serverName: string;
  serverVersion: string;
  nodeEnv?: 'development' | 'test' | 'production';
};

function parseGuildAllowlist(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
}

function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);

  const config: AppConfig = {
    discordToken: parsed.DISCORD_TOKEN,
    discordApplicationId: parsed.DISCORD_APPLICATION_ID,
    guildAllowlist: parseGuildAllowlist(parsed.DISCORD_GUILD_ALLOWLIST),
    dryRun: parseBoolean(parsed.DISCORD_DRY_RUN, false),
    serverName: parsed.MCP_SERVER_NAME,
    serverVersion: parsed.MCP_SERVER_VERSION,
  };

  if (parsed.DISCORD_BOT_ID) {
    config.discordBotId = parsed.DISCORD_BOT_ID;
  }

  if (parsed.NODE_ENV) {
    config.nodeEnv = parsed.NODE_ENV;
  }

  return config;
}
