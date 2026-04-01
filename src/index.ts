import { loadConfig } from './config/env.js';
import { createDiscordRuntime } from './discord/client.js';
import { logger } from './lib/logging.js';
import { createMcpRuntime } from './mcp/server.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const discordRuntime = await createDiscordRuntime(config);
  const mcpRuntime = await createMcpRuntime(config, discordRuntime);

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    logger.info('shutdown.received', { signal });
    await mcpRuntime.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
}

main().catch((error) => {
  logger.error('startup.failed', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
