import { loadConfig } from './config/env.js';
import { createDiscordRuntime } from './discord/client.js';
import { logger } from './lib/logging.js';
import { createMcpRuntime } from './mcp/server.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const discordRuntime = await createDiscordRuntime(config);
  const mcpRuntime = await createMcpRuntime(config, discordRuntime);
  await mcpRuntime.listen();
  logger.info('startup.ready', {
    pid: process.pid,
    host: config.httpHost,
    port: config.httpPort,
    path: config.httpPath,
    mcpEndpoint: mcpRuntime.endpoint,
    gatewayEnabled: config.gatewayEnabled,
    gatewayIntents: config.gatewayIntents,
  });

  let isShuttingDown = false;
  const shutdown = async (reason: string): Promise<void> => {
    if (isShuttingDown) {
      return;
    }

    isShuttingDown = true;
    logger.info('shutdown.received', { reason });
    await mcpRuntime.close();
    await discordRuntime.close();
  };

  const requestShutdown = (reason: string): void => {
    logger.info('shutdown.requested', { reason });
    void shutdown(reason)
      .catch((error) => {
        logger.error('shutdown.failed', {
          reason,
          error: error instanceof Error ? error.message : String(error),
        });
        process.exitCode = 1;
      })
      .finally(() => {
        process.exit();
      });
  };

  process.once('SIGINT', () => {
    requestShutdown('SIGINT');
  });

  process.once('SIGTERM', () => {
    requestShutdown('SIGTERM');
  });
}

main().catch((error) => {
  logger.error('startup.failed', {
    error: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
