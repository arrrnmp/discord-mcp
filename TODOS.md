# TODOS

## Architecture
- [x] Consolidate service logic into `DiscordBaseService` inheritance hierarchy.
- [x] Implement memory-safe ephemeral sessions with TTL and idle timeout.
- [ ] Implement persistent session storage (Redis/SQLite) for scale-out support.
- [ ] Add more comprehensive audit logging for read-only operations if required.
- [ ] Explore WebSocket transport for real-time MCP notifications.

## Performance
- [x] Optimize `toJsonSafe` serialization for large arrays and deep objects.
- [ ] Implement response caching for frequently accessed static data (guild regions, sticker packs).

## Testing
- [x] Add high-level tool registration sweep and smoke tests.
- [x] Implement comprehensive security allowlist test suite.
- [ ] Add E2E tests using a test Discord bot and real guild.
- [ ] Increase unit test coverage for `special.ts` and `scheduled-events.ts`.

## Features
- [x] Implement camelCase property mapping and preservation for audit logs.
- [ ] Support for more Discord API features (e.g., Application Commands management).
- [ ] Enhanced error details for rate limit scenarios.
