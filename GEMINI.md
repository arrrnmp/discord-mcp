# GEMINI.md

This file provides instructional context for Gemini CLI when working in the `discord-mcp` repository.

## Project Overview

`discord-mcp` is a Model Context Protocol (MCP) server built with **Bun** and **TypeScript** that exposes a wide range of Discord API actions as tools. It uses **Seyfert** as the underlying Discord client library and **Zod** for robust schema validation.

### Key Features
- **Comprehensive Discord Tools**: Supports guild management, member moderation, message operations, channel/role configuration, audit logs, webhooks, scheduled events, and more.
- **Streamable HTTP Transport**: Implements the MCP HTTP transport with ephemeral session management.
- **Security & Safety**:
  - `DISCORD_GUILD_ALLOWLIST`: Restricts operations to specific guilds.
  - `DISCORD_DRY_RUN`: Prevents mutations while still validating logic.
  - **Confirmation Protocol**: Destructive actions require `confirm: true` in tool arguments.
- **Session Management**: Sessions have a 60-minute idle timeout and are uniquely identified by the `mcp-session-id` header.

## Building and Running

The project uses **Bun** as its primary runtime and package manager.

### Core Commands
- `bun install`: Install all dependencies.
- `bun run start`: Start the MCP server.
- `bun run dev`: Start the server in watch mode for development.
- `bun run check`: Run TypeScript type-checking (no emit).
- `bun run build`: Compile TypeScript to the `dist/` directory.
- `bun test`: Run all tests using the Bun test runner.
- `bun test <path/to/test>`: Run a specific test file.

### Environment Configuration
The server requires a `.env` file with the following minimum variables:
- `DISCORD_TOKEN`: Discord Bot Token.
- `DISCORD_APPLICATION_ID`: Discord Application ID.
- `MCP_HTTP_PORT`: Port for the MCP server (default: `3456`).

## Architecture & Conventions

### Directory Structure
- `src/index.ts`: Entry point for the server.
- `src/config/`: Environment and application configuration.
- `src/discord/`: Domain-specific service classes (e.g., `members.ts`, `messages.ts`).
  - All services MUST extend `DiscordBaseService` from `src/discord/base.ts`.
- `src/mcp/`: MCP-specific logic.
  - `server.ts`: HTTP transport and session lifecycle.
  - `schemas/`: Zod schemas for tool input validation.
  - `tools/register.ts`: Central registry for mapping services to MCP tools.
- `src/lib/`: Utility libraries (logging, error handling).
- `src/types/`: Shared TypeScript definitions.

### Development Patterns
- **Tool Registration**: New tools are added by:
  1. Defining a Zod schema in `src/mcp/schemas/`.
  2. Implementing the logic in the appropriate `DiscordService`.
  3. Registering the handler in `src/mcp/tools/register.ts` using `withToolResult()`.
- **Response Handling**: Always use the `withToolResult()` helper from `src/mcp/tools/helpers.ts` to ensure consistent tool output structure.
- **BigInt Safety**: Use `toJsonSafe()` in `helpers.ts` to recursively convert BigInts to strings before returning data to the MCP client.
- **Error Handling**: Use the `ToolError` class from `src/lib/errors.ts` for expected failures.
- **Testing**: Follow existing patterns in `src/**/*.test.ts`. Use mocks for Discord API calls where possible.

## Technical Context
- **Discord Library**: Seyfert (`seyfert`).
- **MCP SDK**: `@modelcontextprotocol/sdk`.
- **Runtime**: Bun (`bun`).
- **Validation**: Zod (`zod`).
