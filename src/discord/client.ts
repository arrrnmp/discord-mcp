import { ApiHandler, Client } from 'seyfert';
import type { InternalRuntimeConfigHTTP } from 'seyfert/lib/client/base.js';
import { HttpClient } from 'seyfert';

import type { AppConfig } from '../config/env.js';

export type DiscordRuntime = {
  client: HttpClient;
  gatewayClient?: Client;
  close: () => Promise<void>;
};

export async function createDiscordRuntime(config: AppConfig): Promise<DiscordRuntime> {
  const runtimeConfig: InternalRuntimeConfigHTTP = {
    debug: config.nodeEnv !== 'production',
    token: config.discordToken,
    applicationId: config.discordApplicationId,
    publicKey: 'unused-in-mcp-mode',
    port: 0,
    locations: {
      base: '.',
    },
  };

  const client = new HttpClient({
    getRC: async () => runtimeConfig,
  });

  client.setServices({
    rest: new ApiHandler({
      token: config.discordToken,
      type: 'Bot',
      debug: config.nodeEnv !== 'production',
    }),
  });

  if (config.discordBotId) {
    client.botId = config.discordBotId;
  }

  client.applicationId = config.discordApplicationId;

  let gatewayClient: Client | undefined;

  if (config.gatewayEnabled) {
    gatewayClient = new Client({
      getRC: async () => ({
        debug: config.nodeEnv !== 'production',
        token: config.discordToken,
        applicationId: config.discordApplicationId,
        intents: config.gatewayIntents,
        locations: {
          base: '.',
        },
      }),
    });

    if (config.discordBotId) {
      gatewayClient.botId = config.discordBotId;
    }

    gatewayClient.applicationId = config.discordApplicationId;
    await gatewayClient.start({
      token: config.discordToken,
      connection: {
        intents: config.gatewayIntents,
      },
    });
  }

  const runtime: DiscordRuntime = {
    client,
    close: async () => {
      if (gatewayClient?.gateway) {
        gatewayClient.gateway.disconnectAll();
      }
    },
  };

  if (gatewayClient) {
    runtime.gatewayClient = gatewayClient;
  }

  return runtime;
}
