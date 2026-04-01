import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import type { AppConfig } from '../config/env.js';
import { DiscordService } from '../discord/service.js';
import type { DiscordRuntime } from '../discord/client.js';
import { DiscordMembersService } from '../discord/members.js';
import { DiscordWebhooksService } from '../discord/webhooks.js';
import { DiscordThreadsService } from '../discord/threads.js';
import { logger } from '../lib/logging.js';
import { registerDiscordTools } from './tools/register.js';

export type McpRuntime = {
  server: McpServer;
  close: () => Promise<void>;
};

export async function createMcpRuntime(config: AppConfig, discordRuntime: DiscordRuntime): Promise<McpRuntime> {
  const server = new McpServer(
    {
      name: config.serverName,
      version: config.serverVersion,
    },
    {
      capabilities: {
        logging: {},
        tools: {
          listChanged: true,
        },
      },
    },
  );

  const discordService = new DiscordService(discordRuntime.client, config);
  const membersService = new DiscordMembersService(discordRuntime.client, config);
  const webhooksService = new DiscordWebhooksService(discordRuntime.client, config);
  const threadsService = new DiscordThreadsService(discordRuntime.client, config);

  registerDiscordTools({
    server,
    discord: discordService,
    members: membersService,
    webhooks: webhooksService,
    threads: threadsService,
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info('mcp.server.started', {
    name: config.serverName,
    version: config.serverVersion,
    dryRun: config.dryRun,
    allowlistSize: config.guildAllowlist.length,
  });

  return {
    server,
    close: async () => {
      logger.info('mcp.server.stopping');
      await server.close();
    },
  };
}
