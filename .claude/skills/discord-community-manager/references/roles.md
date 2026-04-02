# Roles Reference

This reference covers role architecture, naming, permissions, and colors.
Read when designing or modifying a server's role structure.

---

## Role Hierarchy Philosophy

Roles in Discord stack from bottom (weakest) to top (strongest). A role higher up inherits nothing —
permissions are additive. Think of the hierarchy as trust levels, not job titles.

A healthy role structure answers two questions clearly:
1. What can this person do?
2. How are they shown to others in the member list?

---

## Common Role Archetypes

### Administrative Layer
| Role name ideas          | Purpose                                              |
|--------------------------|------------------------------------------------------|
| Owner, Founder, Root     | Server owner (auto-assigned, can't be managed)       |
| Admin, Administrator     | Full access, manages server settings and other staff |
| Moderator, Mod, Staff    | Manages members, handles issues, can't touch settings|

### Community Layer
| Role name ideas                    | Purpose                                          |
|------------------------------------|--------------------------------------------------|
| Veteran, OG, Senior, Trusted       | Long-time members with extra trust               |
| Member, Regular, Citizen, Resident | Standard joined-and-verified member              |
| Newcomer, Pending, Guest, Scout    | Just joined, limited access until verified       |

### Functional / Content Roles
These depend entirely on the server's purpose. Examples:
- Gaming: `Gamer`, `Speedrunner`, `Modder`, `Spectator`
- Art: `Artist`, `Creator`, `Appreciator`
- Dev: `Contributor`, `Maintainer`, `Tester`
- Music: `Musician`, `Producer`, `Listener`

### Bot Roles
Always put bot roles at the top of the hierarchy (below only Owner/Admin) to ensure bots can manage
lower roles without conflicts. Name them after the bot: `MEE6`, `Carl-bot`, `Dyno`, etc.

---

## Permission Levels

Discord uses a bitfield for permissions. Here's a practical breakdown by role type:

### @everyone (baseline)
Keep this minimal. Suggested defaults:
- `view_channel`: Depends — often DENY here and grant per-role to enforce verification gating
- `send_messages`, `read_message_history`: ALLOW
- `add_reactions`: ALLOW
- Everything else: DENY or default

### Newcomer / Guest
Slightly above @everyone:
- Can view public channels, send messages in general/intro
- Cannot access member-gated channels

### Member / Regular
Full community access:
- All standard channels
- Can attach files, embed links, use external emojis (if desired)
- Cannot manage anything

### Moderator
- `kick_members`, `ban_members`, `manage_messages` (delete/pin)
- `mute_members`, `deafen_members` (voice)
- `manage_threads`
- `view_audit_log`
- NOT: `manage_guild`, `manage_roles`, `manage_channels` (those stay with Admin)

### Admin
- Most permissions except `administrator` flag (which is a nuclear option — avoid using it)
- `manage_guild`, `manage_channels`, `manage_roles`
- `manage_webhooks`, `manage_emojis`

---

## Colors

Role colors show in the member list and on mentions. Colors should reflect the server's palette and
the role's meaning.

**Practical tips:**
- Staff roles should be visually distinct from member roles
- Don't make every role a bright color — it looks chaotic
- Consider a gradient: admin = strongest color, roles fade toward neutral as you go down

**Color suggestions by server vibe:**

| Vibe          | Admin          | Mod           | Member         | Special roles      |
|---------------|----------------|---------------|----------------|--------------------|
| Gaming        | `#e74c3c` red  | `#e67e22` ora | `#3498db` blue | `#9b59b6` purple   |
| Cozy          | `#f0a500` gold | `#b5a392` tan | `#a8c5a0` sage | `#d4a5c9` lavender |
| Professional  | `#2c3e50` navy | `#546e7a` grey| `#78909c` steel| `#37474f` charcoal |
| Dark/gothic   | `#8e44ad` purp | `#c0392b` red | `#7f8c8d` grey | `#2c3e50` black    |
| Dev/tech      | `#00bcd4` cyan | `#4caf50` grn | `#9e9e9e` grey | `#ff9800` orange   |
| Pastel/art    | `#f48fb1` pink | `#ce93d8` lav | `#80cbc4` mint | `#fff176` yellow   |

---

## Hoisting (Showing in Member List)

`hoist: true` shows the role as a separate section in the member list sidebar.

- Hoist: Admin, Moderator (so members know who staff is)
- Hoist: Any "featured" community roles (Veteran, Artist, etc.) if you want community visibility
- Don't hoist: Basic Member, Newcomer — it creates visual noise for standard roles

---

## Role Naming Patterns

Match naming style to server personality:

| Style         | Examples                                        |
|---------------|-------------------------------------------------|
| Formal        | Administrator, Moderator, Member, Guest         |
| Friendly      | Helper, Friendly, Newcomer, Regular             |
| Themed        | Knight, Squire, Peasant (fantasy) / Captain, Crew, Landlubber (pirate) |
| Minimal       | admin, mod, member, new                         |
| Branded       | [ServerName] Staff, [ServerName] Team           |

For themed servers, lean into the theme for community roles but keep staff roles recognizable.
A new member needs to know who to ping for help — don't make "Mod" so thematic it's unclear.

---

## Role Management Operations

**Creating a role:**
```
discord_create_role
```
Fields: name, color (hex without #), hoist, mentionable, permissions (integer bitfield)

**Reordering roles:**
```
discord_modify_guild_role_positions
```
Pass array of {id, position} pairs. Higher position = higher in hierarchy.

**Assigning to a member:**
```
discord_add_member_role
```

**Removing from a member:**
```
discord_remove_member_role
```

**Getting role counts:**
```
discord_get_role_member_counts
```
Useful for auditing: "how many people have this role?"
