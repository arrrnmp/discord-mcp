# Events & Announcements Reference

Covers scheduled events, stage instances, announcements, and community engagement tools.
Read when the user wants to host an event, make an announcement, or set up community programming.

---

## Scheduled Events

Scheduled events appear in the server's event list and can be discovered via the Events tab.
Members can RSVP and get notified when the event starts.

```
discord_create_scheduled_event
discord_update_scheduled_event
discord_fetch_scheduled_event
discord_list_scheduled_events
discord_delete_scheduled_event
discord_list_scheduled_event_users  (see who's attending)
```

### Event Types

| Entity type | What it is                           | Use for                          |
|-------------|--------------------------------------|----------------------------------|
| `1`         | Stage instance                       | Live audio events, talks, AMAs   |
| `2`         | Voice channel                        | Gaming sessions, watch parties   |
| `3`         | External (URL/location)              | IRL meetups, external streams    |

### Creating an Event

Key fields:
- `name` — the event title
- `description` — what it is, what to expect, how to join
- `scheduled_start_time` — ISO 8601 format (e.g., `2025-01-15T20:00:00Z`)
- `scheduled_end_time` — optional but recommended
- `entity_type` — 1, 2, or 3 (see above)
- `channel_id` — required for types 1 and 2; the stage or voice channel where it happens
- `entity_metadata.location` — required for type 3 (URL or location string)
- `privacy_level` — `2` (GUILD_ONLY) is the only option currently

### Promoting Events

After creating a scheduled event, consider:
1. Announcing it in the announcements channel with `discord_send_message`
2. Pinging a relevant role with `@Role` in the announcement
3. Using `discord_crosspost_message` if the announcement channel is type 5 (announcement) — this broadcasts the message to servers that follow your channel

---

## Stage Instances

Stages are special voice channels where a few speakers talk to a live audience.
Good for: AMAs, workshops, community talks, interviews, podcast recordings.

```
discord_create_stage_instance
discord_update_stage_instance
discord_fetch_stage_instance
discord_delete_stage_instance
```

Creating a stage instance activates a stage channel and shows it as "live" to members.
The `topic` field shows what's currently being discussed.

Workflow:
1. Create a stage channel (`discord_create_channel` type 13) during server setup
2. When event starts: `discord_create_stage_instance` with a descriptive topic
3. During event: update topic as conversation shifts (`discord_update_stage_instance`)
4. When done: `discord_delete_stage_instance` to close the stage

---

## Announcements

For important server-wide news, updates, or event callouts.

```
discord_send_message    (send to announcements channel)
discord_crosspost_message  (if channel type is Announcement/5, broadcast to followers)
discord_pin_message     (pin for visibility)
discord_edit_message    (correct mistakes after posting)
```

### Announcement Message Format

A good announcement is clear, brief, and easy to scan. Structure:
```
📢 **[Title / What's happening]**

[1-2 sentence description]

[When / Where / How to join — if applicable]

[Any call to action: react, RSVP, join voice, etc.]
```

For event announcements specifically, pair with a scheduled event so members can click RSVP.

### Pinning Key Messages

Pin important information so it's easily findable:
- `discord_pin_message` — adds to the channel's pinned messages
- `discord_list_pinned_messages` — see what's currently pinned
- `discord_unpin_message` — remove outdated pins

Keep pins lean — more than 8-10 pinned messages and members stop reading them.

---

## Webhooks for Integrations

Webhooks let external services post to Discord channels automatically.
Common uses: GitHub notifications, RSS feeds, stream alerts, form submissions.

```
discord_create_webhook
discord_list_channel_webhooks
discord_list_guild_webhooks
discord_update_webhook
discord_delete_webhook
discord_execute_webhook_by_token  (post a message via webhook)
```

The `execute_webhook_by_token` tool lets you post messages without a full bot context — useful for
posting formatted announcements or feed content programmatically.

---

## Community Engagement Patterns

### Polls
Discord has a native poll feature built into `discord_send_message`. Use `poll` field with:
- `question.text` — the question
- `answers` — array of up to 10 options with text and optional emoji
- `duration` — how long the poll runs (in hours, 1-168)
- `allow_multiselect` — whether members can pick multiple options

After a poll ends: `discord_end_poll` to close early, `discord_list_poll_answer_voters` to see results per option.

### Reactions for Engagement
```
discord_add_reaction        (bot reacts to seed engagement)
discord_list_reaction_users (who reacted — useful for giveaways/raffles)
```
Adding a reaction to an announcement with a relevant emoji (✅ for "attending", 🎉 for "excited") can
prompt members to react and creates a visual signal of engagement.

### Threads for Events
For longer events or discussions, create a dedicated thread:
```
discord_create_thread
```
Thread from an announcement message keeps related discussion organized without cluttering the main channel.
Use `auto_archive_duration` of 1440 (1 day) or 4320 (3 days) for event threads.
