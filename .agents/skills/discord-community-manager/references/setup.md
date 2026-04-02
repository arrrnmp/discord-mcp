# Server Setup Workflow

This reference covers the full workflow for building a Discord server from scratch.
Read this when executing the initial setup after the design has been approved.

---

## Pre-flight: What You Need Before Starting

Before creating anything, have these confirmed:
- **Server personality brief** — the vibe, tone, audience, purpose
- **Channel/category plan** — the full proposed structure with names
- **Role plan** — names, rough permissions, colors
- **Aesthetic style** — which decorator style from aesthetics.md
- **User confirmation** — they've reviewed and approved the plan

---

## Execution Order (Important)

Discord has dependencies: channels reference parent categories, permission overwrites reference roles.
Build in this order:

### 1. Update Guild Settings
```
discord_update_guild_settings
```
- Set server name if changing it
- Set description (shows in discovery and invites)
- Set verification level appropriate to server size:
  - Small friend group: `NONE` (0) or `LOW` (1)
  - Growing community: `MEDIUM` (2)
  - Public community: `HIGH` (3)
- Set default message notifications: `ONLY_MENTIONS` (1) is usually better for active servers

### 2. Create Roles (before channels)
```
discord_create_role
```
Create all roles first. Common hierarchy (highest position = most powerful):

```
[Bot roles — above everything else]
Admin / Owner
Moderator
Trusted / Veteran
[Content-specific roles: Gamer, Artist, etc.]
Regular / Member
Newcomer / Guest
@everyone (always bottom, can't move)
```

For each role, set:
- `name` — see roles.md for naming patterns
- `color` — hex code; use colors that fit the server's palette (see roles.md)
- `hoist` — `true` if you want the role to appear as a separate group in the member list
- `mentionable` — `true` for staff roles, `false` for most others
- `permissions` — use roles.md for permission bit guidance

After creating all roles, set their positions with `discord_modify_guild_role_positions`.

### 3. Create Categories
```
discord_create_channel  (type: 4)
```
Categories organize channels. Typical pattern for a community server:

```
── 📌 INFO ──           (read-only: welcome, rules, announcements)
── 💬 COMMUNITY ──      (open chat: general, introductions, off-topic)
── [theme-specific] ── (the server's main purpose: gaming, art, dev, etc.)
── 🔊 VOICE ──          (voice channels)
── 🛠️ STAFF ──          (staff-only, hidden from regular members)
```

Size matters:
- **5-person friend group**: Skip categories entirely or use 1-2 max
- **Small community (10-100)**: 2-4 categories
- **Larger community (100+)**: 4-6 categories; more than 6 gets overwhelming

### 4. Create Channels
```
discord_create_channel
```
Always set `parent_id` to place the channel inside the right category.

Channel types:
- `0` — Text channel (standard chat)
- `2` — Voice channel
- `5` — Announcement channel (can crosspost to other servers)
- `13` — Stage channel (for live audio events)
- `15` — Forum channel (threaded, like a bulletin board — great for help, showcases, feedback)

For each channel:
- `name` — use the aesthetic system (emoji + separator + name), all lowercase, hyphens for spaces
- `topic` — a short description of what the channel is for; shows at the top of the channel
- `nsfw` — only `true` when absolutely necessary and appropriate
- `slowmode_delay` — consider 5-10s for busy channels to reduce spam

### 5. Apply Permission Overwrites
```
discord_set_channel_permission_overwrite
```
This is where access control happens. Common patterns:

**Read-only info channel:**
```
@everyone: send_messages=DENY, view_channel=ALLOW
```

**Staff-only channel:**
```
@everyone: view_channel=DENY
[Staff role]: view_channel=ALLOW, send_messages=ALLOW
```

**Announcement channel:**
```
@everyone: send_messages=DENY, view_channel=ALLOW
[Staff role]: send_messages=ALLOW
```

**Member-gated channel (requires joining/verification):**
```
@everyone: view_channel=DENY
[Member role]: view_channel=ALLOW
```

### 6. Reorder Channels and Roles
```
discord_modify_guild_channel_positions
discord_modify_guild_role_positions
```
Positions matter for readability. Put the most important channels at the top of each category.
Announcement channels before general chat. Staff channels last or hidden.

### 7. Finishing Touches

**Welcome screen** (for community servers):
```
discord_update_guild_welcome_screen
```
Set a welcome message and feature 2-3 key channels (rules, general, introductions).

**AutoMod basics** (see moderation.md for full setup):
```
discord_create_automod_rule
```
At minimum: block common slurs and spam patterns for public-facing servers.

**Server description and widget:**
```
discord_update_guild_settings  (description field)
discord_update_guild_widget_settings
```

---

## Scaling by Server Size

### Micro (≤10 people)
- 1-2 categories or none
- 3-6 channels total
- 2-3 roles max (admin, member, maybe a bot role)
- No automod needed
- Skip the welcome screen

### Small community (10-100)
- 2-4 categories
- 8-15 channels
- 4-7 roles
- Light automod (spam filter)
- Welcome screen optional

### Growing community (100-1000)
- 4-6 categories
- 15-25 channels
- 6-12 roles (include newcomer/unverified, moderator, etc.)
- AutoMod on
- Welcome screen + rules channel
- Consider verification gate (newcomer role → member role after reading rules)

### Large community (1000+)
- 5-8 categories
- 20-35 channels (but prune aggressively — dead channels confuse newcomers)
- Multiple moderator roles, community helper roles
- Full AutoMod pipeline (see moderation.md)
- Strict verification
- Consider forum channels for Q&A and showcases

---

## Common Mistakes to Avoid

- **Too many channels**: Newcomers get overwhelmed. Start lean, add channels when you see organic demand.
- **No channel topics**: Every channel should have a topic line describing its purpose.
- **@everyone can send in announcements**: Lock this down immediately.
- **No staff channel**: Even tiny servers benefit from a private place for admins to talk.
- **Roles with no clear purpose**: Every role should mean something. Don't create "Cool Guy" unless it does something.
- **Forgetting voice channels**: Even text-heavy communities appreciate 2-3 voice channels (lounge, gaming, AFK).
