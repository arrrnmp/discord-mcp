import { ApiHandler } from 'seyfert/lib/api/api.js';
import type { InternalRuntimeConfigHTTP } from 'seyfert/lib/client/base.js';
import { HttpClient } from 'seyfert/lib/client/httpclient.js';

import type { AppConfig } from '../config/env.js';

export type DiscordRuntime = {
  client: HttpClient;
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
      commands: '',
      langs: '',
      components: '',
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

  await client.start({
    token: config.discordToken,
  });

  if (config.discordBotId) {
    client.botId = config.discordBotId;
  }

  client.applicationId = config.discordApplicationId;

  return { client };
}
