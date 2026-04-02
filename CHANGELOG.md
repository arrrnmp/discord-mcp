# CHANGELOG

## [1.1.0] - 2026-04-01

### Architectural Refactor
- **Service Inheritance**: Every service now shares a unified `DiscordBaseService` covering auth checks, dry-run mode, and audit logging — consistent security enforcement across all 126 tools.
- **Memory Safety**: Implemented ephemeral MCP sessions with `MCP_SESSION_TTL_MS` (60m) idle timeout and automatic background cleanup to prevent memory leaks in the Streamable HTTP transport.
- **Improved Initialization**: Discord client startup is now independent from the MCP runtime, making REST-only and gateway-enabled modes cleaner to start and easier to debug.

### Security & Safety
- **Allowlist Hardening**: Dedicated test suite for `DISCORD_GUILD_ALLOWLIST` ensuring all service operations are correctly gated.
- **Mutation Guardrails**: Uniform enforcement of `confirm: true` and `dryRun` mode across all 126 MCP tools.
- **Audit Logs**: Enhanced audit log property mapping to preserve the `bot` field in user summaries and ensure consistent camelCase naming.

### Performance
- **Serialization Optimization**: Optimized `toJsonSafe` to use shallow checks for large arrays and deep objects, significantly reducing serialization overhead for large Discord payloads.
- **Efficient Session Management**: Sessions are now lazily created and automatically pruned, reducing long-term resource footprint.

### Testing
- **Tool Sweep**: Added a high-level registration sweep test that verifies all 126 MCP tools are correctly registered and smoke-tested against a mocked Discord client.
- **Coverage**: Increased unit test coverage for authorization, audit logs, and member management.

### Bug Fixes
- Fixed a bug where mutation details (like dry-run status) were not correctly surfaced in tool failure responses.
- Fixed inconsistent property naming in audit log entry summaries.
