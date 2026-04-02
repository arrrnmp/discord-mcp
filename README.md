# discord-mcp

Control your Discord server with AI. Connect this MCP server to Claude, Cursor, Copilot, or any MCP-compatible AI tool and manage your server through conversation — no Discord dashboard required.

## What you can do

Once connected, just ask your AI assistant naturally:

- **Set up a server from scratch** — create channels, categories, and roles with a consistent layout and style
- **Manage members** — search members, assign roles, issue timeouts, kick or ban users, view ban lists
- **Send and manage messages** — post to channels, edit messages, pin important posts, add reactions, purge messages
- **Moderate automatically** — create and manage AutoMod rules to filter content
- **Schedule events** — create and manage scheduled events, stage instances, and announcements
- **Organize channels** — reorder channels and categories, set permissions per role, manage threads
- **Customize your server** — update server settings, manage emojis, stickers, and soundboard sounds
- **Create invites and webhooks** — generate invite links, set up webhooks for integrations
- **Review activity** — read audit logs to see who did what and when

Destructive actions (deleting channels, banning members, purging messages) always require explicit confirmation before anything happens.

## Requirements

- [Bun](https://bun.sh) — the JavaScript runtime that runs this server
- A Discord bot token and application ID ([create one here](https://discord.com/developers/applications))

## Setup

**1. Install dependencies**

```bash
bun install
```

**2. Create your config file**

```bash
cp .env.example .env
```

**3. Fill in your Discord credentials**

Open `.env` and set at minimum:

```env
DISCORD_TOKEN=your_bot_token_here
DISCORD_APPLICATION_ID=your_app_id_here
```

Make sure your bot has been invited to your server with the necessary permissions.

**4. Start the server**

```bash
bun run start
```

The MCP server is now running at `http://127.0.0.1:3456/mcp`.

## Connect to your AI tool

### Claude Desktop

Open Claude Desktop settings → MCP → Add server:
- **URL:** `http://127.0.0.1:3456/mcp`
- **Transport:** Streamable HTTP

Restart Claude Desktop after saving.

### Claude Code

```bash
claude mcp add --transport http discord-mcp http://127.0.0.1:3456/mcp
```

### Cursor

Create `.cursor/mcp.json` in your project (or `~/.cursor/mcp.json` globally):

```json
{
  "mcpServers": {
    "discord-mcp": {
      "url": "http://127.0.0.1:3456/mcp"
    }
  }
}
```

Restart Cursor, then verify tools are available in Agent chat.

### VS Code (Copilot / Agent Mode)

Create `.vscode/mcp.json` in your project:

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

Then run `MCP: List Servers` from the command palette to verify.

### GitHub Copilot CLI

Edit `~/.copilot/mcp-config.json`:

```json
{
  "mcpServers": {
    "discord-mcp": {
      "type": "http",
      "url": "http://127.0.0.1:3456/mcp",
      "tools": ["*"]
    }
  }
}
```

## Safety

A few built-in guardrails:

- **Guild allowlist** — set `DISCORD_GUILD_ALLOWLIST` to a comma-separated list of server IDs to restrict which servers the bot can touch
- **Dry run mode** — set `DISCORD_DRY_RUN=true` to preview what would happen without actually making any changes
- **Confirmation required** — delete and ban operations require `confirm: true` to execute

## Optional: keep your bot online (Gateway mode)

By default the server uses Discord's REST API only — no persistent connection. If you want the bot to appear online and enable presence features, add this to your `.env`:

```env
DISCORD_GATEWAY_ENABLED=true
DISCORD_GATEWAY_INTENTS=Guilds
```

## Advanced configuration

All available environment variables:

| Variable | Default | Description |
|---|---|---|
| `DISCORD_TOKEN` | required | Your bot token |
| `DISCORD_APPLICATION_ID` | required | Your application ID |
| `DISCORD_BOT_ID` | optional | Bot user ID |
| `DISCORD_GUILD_ALLOWLIST` | optional | Comma-separated list of allowed guild IDs |
| `DISCORD_DRY_RUN` | `false` | Block all mutations, return previews instead |
| `DISCORD_GATEWAY_ENABLED` | `false` | Enable live Gateway connection |
| `DISCORD_GATEWAY_INTENTS` | `Guilds` | Comma-separated intent names or numeric bitfield |
| `MCP_HTTP_HOST` | `127.0.0.1` | Host to bind to |
| `MCP_HTTP_PORT` | `3456` | Port to listen on |
| `MCP_HTTP_PATH` | `/mcp` | URL path for the MCP endpoint |
| `MCP_SESSION_TTL_MS` | `3600000` | How long an idle session lives (ms) |
| `MCP_SESSION_CLEANUP_MS` | `300000` | How often stale sessions are cleaned up (ms) |

## For developers

To run in dev mode with auto-reload:

```bash
bun --watch run src/index.ts
```

Type-check and build:

```bash
bun run check   # type-check only
bun run build   # compile to dist/
bun test src    # run tests
```

Health check:

```bash
curl http://127.0.0.1:3456/health
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for how the codebase is structured and how to add new tools.

<details>
<summary>Full tool list</summary>

Guild: `discord_list_guilds`, `discord_get_guild_settings`, `discord_update_guild_settings`, `discord_get_guild_preview`, `discord_get_guild_inventory`, `discord_get_guild_widget_settings`, `discord_update_guild_widget_settings`, `discord_get_guild_vanity_url`, `discord_get_guild_prune_count`, `discord_begin_guild_prune`, `discord_list_guild_integrations`, `discord_get_guild_welcome_screen`, `discord_update_guild_welcome_screen`, `discord_list_guild_templates`, `discord_create_guild_template`, `discord_sync_guild_template`, `discord_update_guild_template`, `discord_delete_guild_template`, `discord_list_guild_voice_regions`, `discord_list_voice_regions`

Channels: `discord_create_channel`, `discord_update_channel`, `discord_delete_channel`, `discord_list_channel_permission_overwrites`, `discord_set_channel_permission_overwrite`, `discord_delete_channel_permission_overwrite`, `discord_modify_guild_channel_positions`

Roles: `discord_create_role`, `discord_update_role`, `discord_delete_role`, `discord_get_role_member_counts`, `discord_modify_guild_role_positions`

Members: `discord_list_members`, `discord_search_members`, `discord_fetch_member`, `discord_edit_member`, `discord_set_member_timeout`, `discord_kick_member`, `discord_ban_member`, `discord_bulk_ban_members`, `discord_unban_member`, `discord_fetch_guild_ban`, `discord_list_guild_bans`, `discord_add_member_role`, `discord_remove_member_role`, `discord_set_current_member_voice_state`, `discord_set_member_voice_state`

Messages: `discord_list_channel_messages`, `discord_list_pinned_messages`, `discord_fetch_message`, `discord_send_message`, `discord_edit_message`, `discord_crosspost_message`, `discord_pin_message`, `discord_unpin_message`, `discord_delete_message`, `discord_purge_messages`, `discord_add_reaction`, `discord_remove_own_reaction`, `discord_remove_user_reaction`, `discord_list_reaction_users`, `discord_clear_reactions`, `discord_clear_emoji_reactions`, `discord_end_poll`, `discord_list_poll_answer_voters`

Threads: `discord_create_thread`, `discord_update_thread`, `discord_join_thread`, `discord_leave_thread`, `discord_lock_thread`, `discord_unlock_thread`, `discord_remove_thread_member`, `discord_delete_thread`, `discord_list_active_threads`

Webhooks: `discord_list_guild_webhooks`, `discord_list_channel_webhooks`, `discord_create_webhook`, `discord_update_webhook`, `discord_delete_webhook`, `discord_execute_webhook_by_token`, `discord_fetch_webhook_message_by_token`, `discord_edit_webhook_message_by_token`, `discord_delete_webhook_message_by_token`

Scheduled events: `discord_list_scheduled_events`, `discord_fetch_scheduled_event`, `discord_create_scheduled_event`, `discord_update_scheduled_event`, `discord_delete_scheduled_event`, `discord_list_scheduled_event_users`

Stage: `discord_create_stage_instance`, `discord_fetch_stage_instance`, `discord_update_stage_instance`, `discord_delete_stage_instance`

Invites: `discord_list_guild_invites`, `discord_create_channel_invite`, `discord_delete_invite`, `discord_get_invite_target_users`, `discord_get_invite_target_user_job_status`, `discord_update_invite_target_users`

AutoMod: `discord_list_automod_rules`, `discord_create_automod_rule`, `discord_update_automod_rule`, `discord_delete_automod_rule`

Emojis & stickers: `discord_list_guild_emojis`, `discord_create_guild_emoji`, `discord_update_guild_emoji`, `discord_delete_guild_emoji`, `discord_list_guild_stickers`, `discord_create_guild_sticker`, `discord_update_guild_sticker`, `discord_delete_guild_sticker`, `discord_list_sticker_packs`, `discord_get_sticker_pack`, `discord_get_sticker`, `discord_list_application_emojis`, `discord_create_application_emoji`, `discord_update_application_emoji`, `discord_delete_application_emoji`

Soundboard: `discord_list_guild_soundboard_sounds`, `discord_create_guild_soundboard_sound`, `discord_update_guild_soundboard_sound`, `discord_delete_guild_soundboard_sound`

Audit logs: `discord_list_guild_audit_logs`

Presence (gateway required): `discord_get_presence_state`, `discord_set_presence`

Gateway: `discord_get_gateway_info`

</details>
