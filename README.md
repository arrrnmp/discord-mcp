# discord-mcp

A Bun-run MCP server that uses Seyfert to perform Discord API actions.

## What this does (v1.1.0)

- Exposes Discord admin tools over MCP (Streamable HTTP transport)
- Guild introspection:
  - `discord_list_guilds`
  - `discord_get_guild_inventory`
- Guild admin/settings:
  - `discord_get_guild_settings`
  - `discord_update_guild_settings`
  - `discord_get_guild_widget_settings`
  - `discord_update_guild_widget_settings`
  - `discord_get_guild_vanity_url`
  - `discord_get_guild_prune_count`
  - `discord_begin_guild_prune`
  - `discord_list_guild_integrations`
  - `discord_get_guild_welcome_screen`
  - `discord_update_guild_welcome_screen`
  - `discord_list_guild_templates`
  - `discord_create_guild_template`
  - `discord_sync_guild_template`
  - `discord_update_guild_template`
  - `discord_delete_guild_template`
- Audit logs:
  - `discord_list_guild_audit_logs`
- Guild preview:
  - `discord_get_guild_preview`
- Voice regions:
  - `discord_list_guild_voice_regions`
  - `discord_list_voice_regions`
- Channel/category management:
  - `discord_create_channel`
  - `discord_update_channel`
  - `discord_list_channel_permission_overwrites`
  - `discord_set_channel_permission_overwrite`
  - `discord_delete_channel_permission_overwrite`
  - `discord_delete_channel`
- Role management:
  - `discord_create_role`
  - `discord_update_role`
  - `discord_delete_role`
  - `discord_get_role_member_counts`
- Member management:
  - `discord_list_members`
  - `discord_search_members`
  - `discord_fetch_member`
  - `discord_edit_member`
  - `discord_set_member_timeout`
  - `discord_kick_member`
  - `discord_ban_member`
  - `discord_fetch_guild_ban`
  - `discord_bulk_ban_members`
  - `discord_unban_member`
  - `discord_list_guild_bans`
  - `discord_add_member_role`
  - `discord_remove_member_role`
  - `discord_set_current_member_voice_state`
  - `discord_set_member_voice_state`
- Messages:
  - `discord_list_channel_messages`
  - `discord_list_pinned_messages`
  - `discord_fetch_message`
  - `discord_send_message`
  - `discord_edit_message`
  - `discord_crosspost_message`
  - `discord_pin_message`
  - `discord_unpin_message`
  - `discord_add_reaction`
  - `discord_remove_own_reaction`
  - `discord_remove_user_reaction`
  - `discord_list_reaction_users`
  - `discord_clear_reactions`
  - `discord_clear_emoji_reactions`
  - `discord_end_poll`
  - `discord_list_poll_answer_voters`
  - `discord_delete_message`
  - `discord_purge_messages`
- Presence (gateway required):
  - `discord_get_presence_state`
  - `discord_set_presence`
- Guild special:
  - `discord_list_guild_invites`
  - `discord_create_channel_invite`
  - `discord_delete_invite`
  - `discord_get_invite_target_users`
  - `discord_get_invite_target_user_job_status`
  - `discord_update_invite_target_users`
  - `discord_list_automod_rules`
  - `discord_create_automod_rule`
  - `discord_update_automod_rule`
  - `discord_delete_automod_rule`
  - `discord_list_guild_emojis`
  - `discord_create_guild_emoji`
  - `discord_update_guild_emoji`
  - `discord_delete_guild_emoji`
  - `discord_list_guild_stickers`
  - `discord_create_guild_sticker`
  - `discord_update_guild_sticker`
  - `discord_delete_guild_sticker`
  - `discord_list_guild_soundboard_sounds`
  - `discord_create_guild_soundboard_sound`
  - `discord_update_guild_soundboard_sound`
  - `discord_delete_guild_soundboard_sound`
- Webhooks:
  - `discord_list_guild_webhooks`
  - `discord_list_channel_webhooks`
  - `discord_create_webhook`
  - `discord_update_webhook`
  - `discord_delete_webhook`
  - `discord_execute_webhook_by_token`
  - `discord_fetch_webhook_message_by_token`
  - `discord_edit_webhook_message_by_token`
  - `discord_delete_webhook_message_by_token`
- Scheduled events:
  - `discord_list_scheduled_events`
  - `discord_fetch_scheduled_event`
  - `discord_create_scheduled_event`
  - `discord_update_scheduled_event`
  - `discord_delete_scheduled_event`
  - `discord_list_scheduled_event_users`
- Stage instances:
  - `discord_create_stage_instance`
  - `discord_fetch_stage_instance`
  - `discord_update_stage_instance`
  - `discord_delete_stage_instance`
  - `discord_list_active_threads`
- Position reordering:
  - `discord_modify_guild_channel_positions`
  - `discord_modify_guild_role_positions`
- Threads:
  - `discord_create_thread`
  - `discord_update_thread`
  - `discord_join_thread`
  - `discord_leave_thread`
  - `discord_lock_thread`
  - `discord_unlock_thread`
  - `discord_remove_thread_member`
  - `discord_delete_thread`
- Gateway:
  - `discord_get_gateway_info`
- Public sticker packs:
  - `discord_list_sticker_packs`
  - `discord_get_sticker_pack`
  - `discord_get_sticker`
- Application emojis:
  - `discord_list_application_emojis`
  - `discord_create_application_emoji`
  - `discord_update_application_emoji`
  - `discord_delete_application_emoji`

Destructive tools require `confirm: true`.
`discord_set_presence` also requires `confirm: true` because it mutates live bot state.

Invite targets are enforced:
- `targetType=1` requires `targetUserId`
- `targetType=2` requires `targetApplicationId`
- target IDs without `targetType` are rejected

Server profile customization beyond standard guild settings is intentionally out of scope.

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
- `DISCORD_GATEWAY_ENABLED=true|false` (default `false`)
- `DISCORD_GATEWAY_INTENTS` (default `Guilds`; comma-separated names or numeric bitfield)
- `MCP_HTTP_HOST` (default `127.0.0.1`)
- `MCP_HTTP_PORT` (default `3456`)
- `MCP_HTTP_PATH` (default `/mcp`)
- `MCP_SESSION_TTL_MS` (default `3600000` / 60m)
- `MCP_SESSION_CLEANUP_MS` (default `300000` / 5m)

## Run

```bash
bun run start
```

The server runs an HTTP MCP endpoint at:

- `http://{MCP_HTTP_HOST}:{MCP_HTTP_PORT}{MCP_HTTP_PATH}`

Default:

- `http://127.0.0.1:3456/mcp`

### Session Management

The server manages ephemeral MCP sessions. Each session is uniquely identified by a `mcp-session-id` header.
- Sessions automatically expire after `MCP_SESSION_TTL_MS` of inactivity.
- A background cleanup task runs every `MCP_SESSION_CLEANUP_MS` to prune stale sessions.
- Each session maintains its own `McpServer` instance and tool registrations.

Health check:

```bash
curl http://127.0.0.1:3456/health
```

## Gateway mode (optional bot presence)

By default this project runs REST-only, MCP tools work but the bot does not keep a live Gateway session.

To keep the bot online for presence and future event-based features, enable:

```env
DISCORD_GATEWAY_ENABLED=true
DISCORD_GATEWAY_INTENTS=Guilds
```

Notes:

- Gateway mode stays compatible with the same HTTP MCP endpoint.
- `DISCORD_GATEWAY_INTENTS` accepts intent names like `Guilds,GuildMembers,MessageContent` or a numeric bitfield.

## Connect this MCP server to AI tools

Run this server from your repo root:

```bash
bun run start
```

Then add an HTTP MCP entry in your client config.

### Claude Desktop

Config file paths:
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Use Claude Desktop MCP settings to add:
- URL: `http://127.0.0.1:3456/mcp`
- Transport: Streamable HTTP

Restart Claude Desktop after saving.

### Claude Code

Add as HTTP MCP:

```bash
claude mcp add --transport http discord-mcp http://127.0.0.1:3456/mcp
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
      "type": "http",
      "url": "http://127.0.0.1:3456/mcp"
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
      "url": "http://127.0.0.1:3456/mcp"
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
        "type": "http",
        "url": "http://127.0.0.1:3456/mcp",
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
