# discord-mcp

A Bun-run MCP server that uses Seyfert to perform Discord API actions.

## What this does (v1)

- Exposes Discord admin tools over MCP (stdio transport)
- Guild introspection:
  - `discord_list_guilds`
  - `discord_get_guild_inventory`
- Channel/category management:
  - `discord_create_channel`
  - `discord_update_channel`
  - `discord_delete_channel`
- Role management:
  - `discord_create_role`
  - `discord_update_role`
  - `discord_delete_role`
- Member management:
  - `discord_list_members`
  - `discord_fetch_member`
  - `discord_edit_member`
  - `discord_kick_member`
  - `discord_add_member_role`
  - `discord_remove_member_role`
- Webhooks:
  - `discord_list_guild_webhooks`
  - `discord_list_channel_webhooks`
  - `discord_create_webhook`
  - `discord_update_webhook`
  - `discord_delete_webhook`
- Threads:
  - `discord_create_thread`
  - `discord_update_thread`
  - `discord_join_thread`
  - `discord_leave_thread`
  - `discord_lock_thread`
  - `discord_unlock_thread`
  - `discord_remove_thread_member`
  - `discord_delete_thread`

Destructive tools require `confirm: true`.

## Requirements

- Bun
- Discord bot token + app ID

## Setup

```bash
bun install
cp .env.example .env
```

Populate `.env`:

- `DISCORD_TOKEN`
- `DISCORD_APPLICATION_ID`
- `DISCORD_BOT_ID` (optional)
- `DISCORD_GUILD_ALLOWLIST` (optional, comma-separated)
- `DISCORD_DRY_RUN=true|false`

## Run

```bash
bun run start
```

The server communicates over stdio for MCP clients.

## Connect this MCP server to AI tools

Run this server from your repo root:

```bash
bun run start
```

Then add a stdio MCP entry in your client config (examples below use the same command).

### Claude Desktop

Config file paths:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "discord-mcp": {
      "command": "bun",
      "args": ["run", "start"]
    }
  }
}
```

Restart Claude Desktop after saving.

### Claude Code

Add as local stdio MCP:

```bash
claude mcp add --transport stdio discord-mcp -- bun run start
```

Useful commands:

```bash
claude mcp list
claude mcp get discord-mcp
```

### VS Code (Copilot Chat / Agent Mode)

Create `.vscode/mcp.json` (workspace) or user `mcp.json`:

```json
{
  "servers": {
    "discord-mcp": {
      "type": "stdio",
      "command": "bun",
      "args": ["run", "start"]
    }
  }
}
```

Then run `MCP: List Servers` and start/verify the server.

### Cursor

Project config: `.cursor/mcp.json`  
Global config: `~/.cursor/mcp.json`

```json
{
  "mcpServers": {
    "discord-mcp": {
      "command": "bun",
      "args": ["run", "start"]
    }
  }
}
```

Restart Cursor if needed, then verify tools in Agent chat.

### Cursor CLI (`agent`)

Cursor CLI uses the same MCP config as the editor.

```bash
agent mcp list
agent mcp list-tools discord-mcp
```

### GitHub Copilot CLI

In interactive mode:

```text
/mcp add
```

Or edit `~/.copilot/mcp-config.json`:

```json
{
  "mcpServers": {
    "discord-mcp": {
      "type": "local",
      "command": "bun",
      "args": ["run", "start"],
      "env": {},
      "tools": ["*"]
    }
  }
}
```

## References (official docs)

- MCP local server connection guide (Claude Desktop paths + config): https://modelcontextprotocol.io/docs/develop/connect-local-servers
- Claude Code MCP: https://docs.anthropic.com/en/docs/claude-code/mcp
- VS Code MCP servers: https://code.visualstudio.com/docs/copilot/chat/mcp-servers
- VS Code MCP config reference: https://code.visualstudio.com/docs/copilot/reference/mcp-configuration
- Cursor MCP: https://cursor.com/docs/mcp.md
- Cursor CLI MCP: https://cursor.com/docs/cli/mcp.md
- GitHub Copilot CLI (using + adding MCP): https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli and https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers

## Safety defaults

- `DISCORD_GUILD_ALLOWLIST` restricts operations to approved guilds
- `DISCORD_DRY_RUN=true` blocks mutations and returns explicit errors
- Delete operations require `confirm: true`

## Validation

```bash
bun run check
bun run build
bun test
```
