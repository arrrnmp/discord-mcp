import { z } from 'zod';

const envSchema = z.object({
  DISCORD_TOKEN: z.string().min(1),
  DISCORD_APPLICATION_ID: z.string().min(1),
  DISCORD_BOT_ID: z.string().min(1).optional(),
  DISCORD_GUILD_ALLOWLIST: z.string().optional(),
  DISCORD_DRY_RUN: z.string().optional(),
  DISCORD_GATEWAY_ENABLED: z.string().optional(),
  DISCORD_GATEWAY_INTENTS: z.string().optional(),
  MCP_HTTP_HOST: z.string().default('127.0.0.1'),
  MCP_HTTP_PORT: z.coerce.number().int().min(1).max(65535).default(3456),
  MCP_HTTP_PATH: z.string().default('/mcp'),
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
  gatewayEnabled: boolean;
  gatewayIntents: number;
  httpHost: string;
  httpPort: number;
  httpPath: string;
  serverName: string;
  serverVersion: string;
  nodeEnv?: 'development' | 'test' | 'production';
};

const GATEWAY_INTENT_BITS: Record<string, number> = {
  guilds: 1,
  guildmembers: 2,
  guildmoderation: 4,
  guildexpressions: 8,
  guildintegrations: 16,
  guildwebhooks: 32,
  guildinvites: 64,
  guildvoicestates: 128,
  guildpresences: 256,
  guildmessages: 512,
  guildmessagereactions: 1024,
  guildmessagetyping: 2048,
  directmessages: 4096,
  directmessagereactions: 8192,
  directmessagetyping: 16384,
  messagecontent: 32768,
  guildscheduledevents: 65536,
  automoderationconfiguration: 1048576,
  automoderationexecution: 2097152,
  guildmessagepolls: 16777216,
  directmessagepolls: 33554432,
  nonprivilaged: 53575421,
  nonprivileged: 53575421,
  onlyprivilaged: 33026,
  onlyprivileged: 33026,
};

function normalizeIntentName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseGatewayIntents(value: string | undefined, defaultValue: number): number {
  if (value === undefined || value.trim().length === 0) {
    return defaultValue;
  }

  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) {
    const bitfield = Number(normalized);
    if (!Number.isSafeInteger(bitfield) || bitfield <= 0) {
      throw new Error('DISCORD_GATEWAY_INTENTS must be a positive integer bitfield');
    }
    return bitfield;
  }

  const intents = normalized
    .split(',')
    .map((intent) => normalizeIntentName(intent))
    .filter((intent) => intent.length > 0);

  if (intents.length === 0) {
    throw new Error('DISCORD_GATEWAY_INTENTS must include at least one intent name or bitfield');
  }

  let bitfield = 0;
  for (const intent of intents) {
    const intentBit = GATEWAY_INTENT_BITS[intent];
    if (intentBit === undefined) {
      throw new Error(`Unknown Discord gateway intent name: ${intent}`);
    }
    bitfield |= intentBit;
  }

  if (bitfield <= 0) {
    throw new Error('DISCORD_GATEWAY_INTENTS resolved to an invalid bitfield');
  }

  return bitfield;
}

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
  const normalizedHttpPath = parsed.MCP_HTTP_PATH.startsWith('/') ? parsed.MCP_HTTP_PATH : `/${parsed.MCP_HTTP_PATH}`;

  const config: AppConfig = {
    discordToken: parsed.DISCORD_TOKEN,
    discordApplicationId: parsed.DISCORD_APPLICATION_ID,
    guildAllowlist: parseGuildAllowlist(parsed.DISCORD_GUILD_ALLOWLIST),
    dryRun: parseBoolean(parsed.DISCORD_DRY_RUN, false),
    gatewayEnabled: parseBoolean(parsed.DISCORD_GATEWAY_ENABLED, false),
    gatewayIntents: parseGatewayIntents(parsed.DISCORD_GATEWAY_INTENTS, 1),
    httpHost: parsed.MCP_HTTP_HOST,
    httpPort: parsed.MCP_HTTP_PORT,
    httpPath: normalizedHttpPath,
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
