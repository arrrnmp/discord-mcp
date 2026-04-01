# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run start        # run the MCP server
bun --watch run src/index.ts  # dev mode with auto-reload
bun run check        # TypeScript type-check (no emit)
bun run build        # compile TypeScript to dist/
bun test src         # run all tests
bun test src/discord/members.test.ts  # run a single test file
```

## Architecture

This is a **Bun + TypeScript** MCP server that exposes Discord admin tools over Streamable HTTP transport. It uses **Seyfert** as the Discord client library and **Zod** for schema validation.

### Startup flow

`src/index.ts` → `createDiscordRuntime()` → `createMcpRuntime()` → `listen()`

- `createDiscordRuntime` (`src/discord/client.ts`): Initializes a Seyfert `HttpClient` for REST-only mode. Optionally creates a Seyfert `Client` (gateway) when `DISCORD_GATEWAY_ENABLED=true`.
- `createMcpRuntime` (`src/mcp/server.ts`): Instantiates all Discord service classes, creates a `McpServer` per session, registers all tools, and starts a `Bun.serve` HTTP server. Sessions are tracked in a `Map<string, SessionState>`.

### Layer structure

```
src/
  config/env.ts          — Zod env parsing → AppConfig
  discord/               — Service classes (one per domain area)
    base.ts              — DiscordBaseService (Shared logic: auth, dry-run, auditing)
    service.ts           — DiscordService (guilds, channels, roles)
    members.ts           — DiscordMembersService
    messages.ts          — DiscordMessagesService
    webhooks.ts          — DiscordWebhooksService
    threads.ts           — DiscordThreadsService
    special.ts           — DiscordSpecialService (invites, automod, emojis, stickers, soundboard)
    guild-settings.ts    — DiscordGuildSettingsService
    audit-logs.ts        — DiscordAuditLogsService
    scheduled-events.ts  — DiscordScheduledEventsService
    stage.ts             — DiscordStageService
    sticker-packs.ts     — DiscordStickerPacksService (public sticker pack endpoints)
    presence.ts          — DiscordPresenceService (gateway only)
  mcp/
    server.ts            — MCP HTTP transport, session management
    tools/
      register.ts        — Wires all tool handlers to McpServer
      helpers.ts         — success()/failure()/withToolResult() response builders
    schemas/             — Zod schemas for each tool's input validation
  lib/
    errors.ts            — ToolError class, normalizeError(), toolErrorResult()
    logging.ts           — Structured logger
  types/discord.ts       — Shared summary types (DiscordGuildSummary, etc.)
```

### Adding a new tool

1. Add a Zod schema in `src/mcp/schemas/`.
2. Add a method to the relevant service class in `src/discord/` (extending `DiscordBaseService`).
3. Register the tool in `src/mcp/tools/register.ts` using `withToolResult()`.

### Key patterns

**Service Architecture**: All services extend `DiscordBaseService`, which provides common security and safety gates:
- `this.assertGuildAllowed(guildId)`: Gated by `DISCORD_GUILD_ALLOWLIST`.
- `this.assertConfirm(confirm, action, details)`: Enforces `confirm: true` for destructive tools.
- `this.throwDryRun(action, details)`: Respects `DISCORD_DRY_RUN` mode for mutations.
- `this.auditMutation(ctx)`: Logs all mutation attempts with unified metadata.

**Session Lifecycle**: MCP sessions are ephemeral:
- Tracks `lastActive` timestamp for each `mcp-session-id`.
- Automatic cleanup of stale sessions after 60m (idle timeout).
- Background cleanup timer runs every 5m.

**Tool responses** always use `withToolResult()` from `helpers.ts`, which wraps the result in `{ ok: true, data }` or `{ ok: false, error }` structured content.

**bigint serialization**: `toJsonSafe()` in `helpers.ts` recursively converts bigints to strings before JSON serialization. It uses a shallow check to optimize for performance with large arrays.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
