import { describe, expect, test, mock } from 'bun:test';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { type HttpClient } from 'seyfert/lib/client/httpclient.js';
import { type Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { type JSONRPCMessage, type JSONRPCResponse } from '@modelcontextprotocol/sdk/types.js';

import type { AppConfig } from '../../config/env.js';
import { DiscordAuditLogsService } from '../../discord/audit-logs.js';
import { DiscordGuildSettingsService } from '../../discord/guild-settings.js';
import { DiscordMembersService } from '../../discord/members.js';
import { DiscordMessagesService } from '../../discord/messages.js';
import { DiscordPresenceService } from '../../discord/presence.js';
import { DiscordScheduledEventsService } from '../../discord/scheduled-events.js';
import { DiscordService } from '../../discord/service.js';
import { DiscordSpecialService } from '../../discord/special.js';
import { DiscordStageService } from '../../discord/stage.js';
import { DiscordStickerPacksService } from '../../discord/sticker-packs.js';
import { DiscordThreadsService } from '../../discord/threads.js';
import { DiscordWebhooksService } from '../../discord/webhooks.js';
import { registerDiscordTools } from './register.js';

const mockConfig: AppConfig = {
  discordToken: 'mock-token',
  discordApplicationId: 'mock-app-id',
  guildAllowlist: [], 
  dryRun: true, 
  gatewayEnabled: false,
  gatewayIntents: 0,
  httpHost: '127.0.0.1',
  httpPort: 3456,
  httpPath: '/mcp',
  serverName: 'test-server',
  serverVersion: '1.0.0',
};

const mockHttpClient = {
  proxy: {
    users: () => ({
      guilds: {
        get: async () => [],
      },
    }),
    guilds: (id: string) => ({
      get: async () => ({ id, name: 'Mock Guild' }),
      regions: {
        get: async () => [],
      },
    }),
    voice_regions: {
      get: async () => [],
    }
  },
  guilds: {
    raw: async (id: string) => ({ id, name: 'Mock Guild', features: [], owner_id: '123', verification_level: 0 }),
    channels: {
      list: async () => [],
    }
  },
  roles: {
    list: async () => [],
  },
  channels: {
    fetch: async (id: string) => ({ id, name: 'mock-channel', type: 0, guildId: '123456789012345678' }),
    list: async (id: string) => [],
  },
  members: {
    list: async (id: string) => [],
  }
} as unknown as HttpClient;

const mockGatewayClient = {
  presence: {
    set: mock(() => {}),
  },
} as any;

class MockTransport implements Transport {
  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage) => void;
  
  private responses: Map<string | number, (res: JSONRPCResponse) => void> = new Map();

  async start(): Promise<void> {}
  async connect(): Promise<void> {}
  async close(): Promise<void> { this.onclose?.(); }
  
  async send(message: JSONRPCMessage): Promise<void> {
    if ('result' in message || 'error' in message) {
      const response = message as JSONRPCResponse;
      if (response.id !== undefined) {
        const resolve = this.responses.get(response.id);
        if (resolve) {
          resolve(response);
          this.responses.delete(response.id);
        }
      }
    }
  }

  async call(method: string, params: any): Promise<any> {
    const id = Math.floor(Math.random() * 1000000);
    return new Promise((resolve, reject) => {
      this.responses.set(id, (res) => {
        if ('error' in res) reject(res.error);
        else resolve(res.result);
      });
      this.onmessage!({
        jsonrpc: '2.0',
        id,
        method,
        params
      } as any);
    });
  }
}

describe('MCP Tool Registration Sweep', () => {
  const server = new McpServer({ name: 'test', version: '1.0' });
  const transport = new MockTransport();
  
  const context = {
    server,
    discord: new DiscordService(mockHttpClient, mockConfig),
    members: new DiscordMembersService(mockHttpClient, mockConfig),
    messages: new DiscordMessagesService(mockHttpClient, mockConfig),
    presence: new DiscordPresenceService(mockGatewayClient, mockConfig),
    special: new DiscordSpecialService(mockHttpClient, mockConfig),
    scheduledEvents: new DiscordScheduledEventsService(mockHttpClient, mockConfig),
    guildSettings: new DiscordGuildSettingsService(mockHttpClient, mockConfig),
    auditLogs: new DiscordAuditLogsService(mockHttpClient, mockConfig),
    webhooks: new DiscordWebhooksService(mockHttpClient, mockConfig),
    threads: new DiscordThreadsService(mockHttpClient, mockConfig),
    stage: new DiscordStageService(mockHttpClient, mockConfig),
    stickerPacks: new DiscordStickerPacksService(mockHttpClient, mockConfig),
  };

  test('registers and lists tools', async () => {
    registerDiscordTools(context);
    await server.connect(transport);
    
    const result = await transport.call('tools/list', {});
    expect(result.tools.length).toBe(126);
  });

  test('critical tools are present', async () => {
    const result = await transport.call('tools/list', {});
    const toolNames = result.tools.map((t: any) => t.name);
    
    const essentials = [
      'discord_list_guilds',
      'discord_get_guild_inventory',
      'discord_send_message',
      'discord_list_members',
      'discord_list_channel_messages',
      'discord_get_guild_settings',
      'discord_list_guild_audit_logs'
    ];
    
    for (const name of essentials) {
      expect(toolNames).toContain(name);
    }
  });

  test('smoke test: discord_list_guilds', async () => {
    const result = await transport.call('tools/call', {
      name: 'discord_list_guilds',
      arguments: {}
    });
    const content = JSON.parse(result.content[0].text);
    expect(content.guilds).toBeArray();
  });

  test('smoke test: discord_get_guild_inventory', async () => {
    const result = await transport.call('tools/call', {
      name: 'discord_get_guild_inventory',
      arguments: { guildId: '123456789012345678' }
    });
    const content = JSON.parse(result.content[0].text);
    expect(content.inventory).toBeDefined();
  });

  test('smoke test: discord_send_message (respects dryRun)', async () => {
    const result = await transport.call('tools/call', {
      name: 'discord_send_message',
      arguments: { 
        channelId: '123456789012345678',
        content: 'test'
      }
    });
    const content = JSON.parse(result.content[0].text);
    expect(result.isError).toBe(true);
    expect(content.error.code).toBe('DRY_RUN_BLOCKED');
  });
});
