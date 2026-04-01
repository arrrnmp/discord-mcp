import { randomUUID } from 'node:crypto';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import type { AppConfig } from '../config/env.js';
import { DiscordAuditLogsService } from '../discord/audit-logs.js';
import type { DiscordRuntime } from '../discord/client.js';
import { DiscordGuildSettingsService } from '../discord/guild-settings.js';
import { DiscordMembersService } from '../discord/members.js';
import { DiscordMessagesService } from '../discord/messages.js';
import { DiscordPresenceService } from '../discord/presence.js';
import { DiscordScheduledEventsService } from '../discord/scheduled-events.js';
import { DiscordService } from '../discord/service.js';
import { DiscordSpecialService } from '../discord/special.js';
import { DiscordStageService } from '../discord/stage.js';
import { DiscordStickerPacksService } from '../discord/sticker-packs.js';
import { DiscordThreadsService } from '../discord/threads.js';
import { DiscordWebhooksService } from '../discord/webhooks.js';
import { logger } from '../lib/logging.js';
import { registerDiscordTools } from './tools/register.js';

type SessionState = {
  server: McpServer;
  transport: WebStandardStreamableHTTPServerTransport;
  lastActive: number;
};

export type McpRuntime = {
  endpoint: string;
  listen: () => Promise<void>;
  close: () => Promise<void>;
};

const SESSION_TTL_MS = 60 * 60 * 1000; // 60 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function jsonRpcErrorResponse(status: number, code: number, message: string): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: '2.0',
      error: {
        code,
        message,
      },
      id: null,
    }),
    {
      status,
      headers: {
        'content-type': 'application/json',
      },
    },
  );
}

export async function createMcpRuntime(config: AppConfig, discordRuntime: DiscordRuntime): Promise<McpRuntime> {
  const endpoint = `http://${config.httpHost}:${config.httpPort}${config.httpPath}`;

  const discordService = new DiscordService(discordRuntime.client, config);
  const membersService = new DiscordMembersService(discordRuntime.client, config);
  const messagesService = new DiscordMessagesService(discordRuntime.client, config);
  const presenceService = new DiscordPresenceService(discordRuntime.gatewayClient, config);
  const specialService = new DiscordSpecialService(discordRuntime.client, config);
  const scheduledEventsService = new DiscordScheduledEventsService(discordRuntime.client, config);
  const guildSettingsService = new DiscordGuildSettingsService(discordRuntime.client, config);
  const auditLogsService = new DiscordAuditLogsService(discordRuntime.client, config);
  const webhooksService = new DiscordWebhooksService(discordRuntime.client, config);
  const threadsService = new DiscordThreadsService(discordRuntime.client, config);
  const stageService = new DiscordStageService(discordRuntime.client, config);
  const stickerPacksService = new DiscordStickerPacksService(discordRuntime.client, config);

  const sessions = new Map<string, SessionState>();
  let httpServer: Bun.Server<undefined> | undefined;

  const cleanupSessions = async (): Promise<void> => {
    const now = Date.now();
    for (const [id, session] of sessions.entries()) {
      if (now - session.lastActive > SESSION_TTL_MS) {
        logger.info('mcp.session.timeout', {
          sessionId: id,
          lastActive: new Date(session.lastActive).toISOString(),
        });
        try {
          await session.transport.close();
          await session.server.close();
        } catch (error) {
          logger.warn('mcp.session.cleanup_failed', {
            sessionId: id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        sessions.delete(id);
      }
    }
  };

  const cleanupTimer = setInterval(() => {
    void cleanupSessions().catch((error) => {
      logger.error('mcp.session.cleanup_error', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, CLEANUP_INTERVAL_MS);

  const buildMcpServer = (): McpServer => {
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

    registerDiscordTools({
      server,
      discord: discordService,
      members: membersService,
      messages: messagesService,
      presence: presenceService,
      special: specialService,
      scheduledEvents: scheduledEventsService,
      guildSettings: guildSettingsService,
      auditLogs: auditLogsService,
      webhooks: webhooksService,
      threads: threadsService,
      stage: stageService,
      stickerPacks: stickerPacksService,
    });

    return server;
  };

  const handleRequest = async (req: Request): Promise<Response> => {
    const url = new URL(req.url);
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      });
    }

    if (url.pathname !== config.httpPath) {
      return new Response('Not Found', { status: 404 });
    }

    if (req.method !== 'POST' && req.method !== 'GET' && req.method !== 'DELETE') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const sessionId = req.headers.get('mcp-session-id');
    let parsedBody: unknown | undefined;

    if (req.method === 'POST') {
      try {
        parsedBody = await req.clone().json();
      } catch {
        return jsonRpcErrorResponse(400, -32700, 'Invalid JSON request body');
      }
    }

    let session = sessionId ? sessions.get(sessionId) : undefined;

    if (!session) {
      if (req.method !== 'POST' || parsedBody === undefined || !isInitializeRequest(parsedBody)) {
        return jsonRpcErrorResponse(400, -32000, 'Bad Request: No valid MCP session ID provided');
      }

      const sessionServer = buildMcpServer();
      const transport = new WebStandardStreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (createdSessionId) => {
          sessions.set(createdSessionId, {
            server: sessionServer,
            transport,
            lastActive: Date.now(),
          });
        },
        onsessionclosed: (closedSessionId) => {
          sessions.delete(closedSessionId);
        },
      });

      transport.onclose = () => {
        const createdSessionId = transport.sessionId;
        if (createdSessionId) {
          sessions.delete(createdSessionId);
        }
      };

      await sessionServer.connect(transport);
      session = {
        server: sessionServer,
        transport,
        lastActive: Date.now(),
      };
    } else {
      session.lastActive = Date.now();
    }

    try {
      return await session.transport.handleRequest(req, { parsedBody });
    } catch (error) {
      logger.error('mcp.http.request_failed', {
        method: req.method,
        path: url.pathname,
        error: error instanceof Error ? error.message : String(error),
      });
      return jsonRpcErrorResponse(500, -32603, 'Internal server error');
    }
  };

  return {
    endpoint,
    listen: async () => {
      httpServer = Bun.serve({
        hostname: config.httpHost,
        port: config.httpPort,
        fetch: handleRequest,
      });
      logger.info('mcp.server.started', {
        name: config.serverName,
        version: config.serverVersion,
        dryRun: config.dryRun,
        allowlistSize: config.guildAllowlist.length,
        transport: 'streamable-http',
        host: config.httpHost,
        port: config.httpPort,
        path: config.httpPath,
      });
    },
    close: async () => {
      logger.info('mcp.server.stopping');
      clearInterval(cleanupTimer);

      if (httpServer) {
        await httpServer.stop(true);
        httpServer = undefined;
      }

      for (const [sessionId, session] of sessions.entries()) {
        try {
          await session.transport.close();
          await session.server.close();
        } catch (error) {
          logger.warn('mcp.transport.close_failed', {
            sessionId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        sessions.delete(sessionId);
      }
    },
  };
}
