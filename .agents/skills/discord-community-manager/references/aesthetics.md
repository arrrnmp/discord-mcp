# Aesthetics Reference: Emoji + Unicode Decorators

This is a curated library of unicode characters and patterns for Discord channel and category names.
The goal is visual personality, not decoration for its own sake. Pick a style that fits the server's
vibe and apply it consistently.

---

## Separator Characters (use between emoji and channel name)

These replace the plain `|` with something more characterful:

| Style       | Characters                           | Best for                          |
|-------------|--------------------------------------|-----------------------------------|
| Clean lines | `┃` `│` `╎` `╏` `┆` `┇` `┊` `┋`    | Modern, professional, gaming      |
| Soft dots   | `·` `‧` `⁃` `•` `◦` `∘`            | Cozy, casual, friendly            |
| Heavy/bold  | `━` `─` `▸` `◈` `◉`                | Hype, competitive, bold           |
| Minimal     | `-` `—` `⁚` `⁝`                     | Ultra-minimal, professional       |
| Ornate      | `✦` `✧` `⋆` `˖` `ₒ` `₊`           | Aesthetic, art, fandom, cozy      |
| Gothic/dark | `†` `╫` `⁘` `⁖` `۞` `⸸`           | Dark themes, horror, metal        |
| Arrows      | `›` `»` `⟩` `▶` `➤` `⇒`           | Technical, directional, utility   |

---

## Category Header Styles

Categories are section dividers — they're seen above their channels. Style them to feel like headers, not just labels.

**Minimal bracket:**
```
[ 🎮 gaming ]
[ 📢 community ]
```

**Centered with dashes:**
```
── 🎮 gaming ──
── 📢 community ──
```

**Bold bars:**
```
━━ 🎮 GAMING ━━
━━ 📢 COMMUNITY ━━
```

**Clean line:**
```
┃ 🎮 gaming
┃ 📢 community
```

**Ornate (cozy/aesthetic):**
```
✦ gaming ✦
˚ community ˚
```

**No decorator (clean names only):**
```
gaming
community
```
(Sometimes the cleanest approach is the right one — don't force decoration onto minimal-aesthetic servers)

---

## Channel Name Patterns

Channel names follow the format: `{emoji} {separator} {name}` or just `{emoji} {name}`.

**Standard with separator:**
```
💬 ┃ general
📢 ┃ announcements
🎮 ┃ gaming-chat
🎨 ┃ art-showcase
```

**Dot separator (soft/cozy):**
```
💬 · general
📢 · announcements
🎨 · art-showcase
🌿 · introductions
```

**Heavy separator (hype/bold):**
```
💬 ━ general
🏆 ━ leaderboards
📢 ━ announcements
```

**Just emoji (minimal):**
```
💬 general
📢 announcements
🎮 gaming
```

**No emoji, unicode prefix (ultra-minimal/professional):**
```
› general
› announcements
› resources
```

---

## Vibe → Aesthetic Mapping

Use this as a starting point, then adapt to the specific server:

| Vibe / Type               | Category style        | Channel separator | Emoji usage         |
|---------------------------|-----------------------|-------------------|---------------------|
| Gaming community          | `── 🎮 GAMING ──`     | `┃`               | High, themed        |
| Cozy/friends              | `✦ vibes ✦`           | `·`               | Warm, gentle        |
| Professional/business     | `[ 📋 operations ]`   | `›` or minimal    | Sparse or none      |
| Art/creative              | `˚ gallery ˚`         | `✦` or `·`       | Varied, expressive  |
| Open-source/dev           | `── 💻 dev ──`        | `┃` or `›`        | Functional          |
| Anime/fandom              | `✦ 𝓯𝓪𝓷𝓭𝓸𝓶 ✦`       | `⋆` or `·`        | High, character art |
| Dark/gothic               | `† lore †`            | `╫`               | Moody, specific     |
| Local club/community org  | `[ 📋 info ]`         | `┃` or `·`        | Moderate            |

---

## Common Emoji Sets by Theme

Pick from these and build the server's emoji vocabulary — use the same emoji for the same type of channel across the server.

**Utility / Info:**  `📢` `📌` `📋` `ℹ️` `🔔` `📣` `📝` `🔗` `📎`
**Chat / Community:** `💬` `🗨️` `💭` `🌐` `👥` `🤝` `🎉`
**Gaming:**          `🎮` `🕹️` `🏆` `⚔️` `🎯` `🃏` `🎲` `👾`
**Art / Creative:**  `🎨` `✏️` `🖼️` `🎭` `📸` `🎬` `🎵` `🎸`
**Dev / Tech:**      `💻` `⚙️` `🔧` `🐛` `🚀` `📦` `🔐` `🛠️`
**Cozy / Lifestyle:**`☕` `🌿` `✨` `🌸` `📚` `🕯️` `🍃` `🌙`
**Support / Help:**  `❓` `🆘` `🙋` `💡` `🤔` `📬` `🧰`
**Events / Fun:**    `🎊` `🎟️` `🎤` `🏟️` `🎆` `🎈` `🥳`
**Moderation:**      `🔨` `⚖️` `🛡️` `👮` `🚨` `📜`
**Voice:**           `🔊` `🎙️` `🎤` `📡` `🎵`

---

## What to Avoid

- **Mixing aesthetic styles** — don't have `┃` in some channels and `·` in others unless it's intentional zoning
- **Overloading every channel name** with 3+ decorators — pick one separator, one emoji, done
- **All-caps everywhere** — save caps for high-visibility channels (ANNOUNCEMENTS) or bold-aesthetic servers
- **Random emoji** — every emoji should make sense for the channel's purpose
- **Forcing decoration onto a server that wants to be minimal** — sometimes no decorators is the right answer
