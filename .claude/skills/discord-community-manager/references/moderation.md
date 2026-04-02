# Moderation Reference

Covers AutoMod setup, member management, and handling incidents.
Read this when the user wants to set up moderation or asks for help managing member issues.

---

## Philosophy

Good moderation is mostly invisible. The goal is a community where members feel safe and the rules
are enforced consistently — not a server that feels like a police state. Scale the moderation
infrastructure to the actual risk level of the server.

- **Friend group / micro server**: Almost no moderation needed. Trust is implicit.
- **Small community**: A few basic AutoMod rules. Manual handling for issues.
- **Growing community**: AutoMod + clear rules channel + a team of mods.
- **Large public server**: Full AutoMod pipeline, verification gating, audit log monitoring.

---

## AutoMod Setup

AutoMod runs automatically on messages before they're posted.

```
discord_create_automod_rule
discord_list_automod_rules
discord_update_automod_rule
discord_delete_automod_rule
```

### Rule Types

**Keyword filter** (`trigger_type: 1`)
Block specific words or phrases. Use for slurs, common harassing phrases, server-specific banned terms.
```json
{
  "name": "Blocked keywords",
  "trigger_type": 1,
  "trigger_metadata": {
    "keyword_filter": ["[word1]", "[word2]"],
    "regex_patterns": []
  },
  "actions": [{ "type": 1 }]  // type 1 = block message
}
```

**Spam detection** (`trigger_type: 3`)
Catches rapid-fire message spam automatically. No configuration needed — just enable it.
```json
{
  "name": "Anti-spam",
  "trigger_type": 3,
  "actions": [{ "type": 1 }]
}
```

**Mention spam** (`trigger_type: 5`)
Blocks messages with too many mentions (mass ping attacks).
```json
{
  "name": "Anti-mass-ping",
  "trigger_type": 5,
  "trigger_metadata": { "mention_total_limit": 5 },
  "actions": [{ "type": 1 }]
}
```

**Preset keyword lists** (`trigger_type: 4`)
Discord's built-in lists: profanity (1), sexual content (2), slurs (3).
```json
{
  "name": "Content filter",
  "trigger_type": 4,
  "trigger_metadata": { "presets": [3] },
  "actions": [{ "type": 1 }]
}
```

### AutoMod Actions

| Type | Effect                              | When to use                             |
|------|-------------------------------------|-----------------------------------------|
| 1    | Block message (silent)              | Default — stops message, user sees warning |
| 2    | Send alert to a mod channel         | For things you want mods to review      |
| 3    | Timeout the member (duration in ms) | For repeat offenders, severe violations |

You can combine multiple actions on one rule. A common pattern: block the message AND alert mods.

### Exempt Roles / Channels

Always exempt your staff/moderator roles from AutoMod rules so they can discuss moderation context.
Use `exempt_roles` array with role IDs.

---

## Member Management

### Timeouts (Temporary Mutes)
```
discord_set_member_timeout
```
Prevents a member from sending messages, joining voice, or reacting for a duration.
Use for: spam, minor rule violations, cooling-down heated arguments.

Duration tips:
- First offense: 5-15 minutes
- Repeat: 1-24 hours
- Severe: 1-7 days (max is 28 days)

### Kicks
```
discord_kick_member
```
Removes from server but they can rejoin. Use when someone needs a break but isn't permanently banned.
The member loses their roles and messages history remains.

### Bans
```
discord_ban_member
discord_bulk_ban_members  (for raids)
discord_unban_member
discord_list_guild_bans
discord_fetch_guild_ban
```
Permanent removal (unless manually unbanned). Always add a `reason` — it appears in audit logs.

Use `delete_message_days` (0-7) to clean up recent messages from a banned spammer/raider.

### Voice Management
```
discord_set_member_voice_state   (move, mute, deafen a member)
discord_set_current_member_voice_state
```
Move disruptive members to a "timeout voice channel" or disconnect them.

---

## Handling Raids

A raid is when many bot accounts or bad-faith users join rapidly and spam.

Immediate response:
1. `discord_update_guild_settings` — temporarily raise `verification_level` to HIGH or VERY_HIGH
2. `discord_bulk_ban_members` — ban the raider accounts in one call
3. After the raid: review and potentially lower verification again

Prevention:
- Verification gating (newcomer role → member after reading rules)
- `discord_update_guild_settings` — set `explicit_content_filter` to scan media from all members

---

## Audit Log

```
discord_list_guild_audit_logs
```
Your paper trail. Use to:
- See what actions were taken and by whom
- Investigate suspicious activity
- Verify a moderator's actions
- Check a member's history before making a decision

Filter by `action_type` to narrow down (e.g., ban actions, message deletes, role changes).

---

## Invites

```
discord_list_guild_invites
discord_create_channel_invite
discord_delete_invite
```

For controlled growth:
- Create invite links with `max_uses` and `max_age` limits
- Delete old invite links when they're no longer valid
- Use `discord_list_guild_invites` to audit who created what links and how much they were used

---

## Moderation Channel Setup

For any server with moderators, create a private `#mod-log` or `#staff-notes` channel:
- Set AutoMod alert action to send to this channel
- Staff use it to coordinate on issues
- Keep permission overwrite: `@everyone: view_channel = DENY`, staff role: `view_channel = ALLOW`
