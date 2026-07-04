# MCP (Model Context Protocol) Setup

This document explains the MCP servers configured for the Alkebulanimages 2.0
project. MCP lets Claude interact with external tools and documentation sources.

## Configuration

The MCP configuration lives at `.claude/mcp.json`. It currently defines **three**
servers:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/home/jadom/Coding/alkebulanimages2.0"
      ],
      "description": "Filesystem access for alkebulanimages2.0 project",
      "enabled": true
    },
    "svelte": {
      "url": "https://mcp.svelte.dev/mcp",
      "transport": "sse",
      "description": "Official Svelte MCP server for Svelte 5 and SvelteKit docs, code analysis, and best practices",
      "enabled": true
    },
    "tailwindcss-server": {
      "command": "tailwindcss-server"
    }
  }
}
```

> The optional, opt-in **Payload MCP server** (`@payloadcms/plugin-mcp`, served by
> the backend at `/api/mcp`, enabled via `MCP_ENABLED=true`) is a *separate*
> mechanism — it is served by the Payload app itself, not launched from
> `.claude/mcp.json`. It is dormant by default; see the backend design spec if/when
> it is enabled.

## 1. Filesystem MCP server

Runs `@modelcontextprotocol/server-filesystem` (via `npx -y`, no install needed)
scoped to the project root `/home/jadom/Coding/alkebulanimages2.0`. Provides
enhanced read/write/search/metadata access to:
- `alkebu-load/` — Payload CMS backend
- `alkebu-web/` — SvelteKit frontend
- `alkebu-shared/` — **empty placeholder** (planned shared types, not implemented)
- `docs/` — project documentation

**Security:** scoped to the project directory only — it cannot reach parent
directories, system files, or other user directories. See `.claude/settings.local.json`
for complementary tool permissions.

## 2. Svelte MCP server

A remote **SSE** server at `https://mcp.svelte.dev/mcp` providing Svelte 5 /
SvelteKit documentation, code analysis, and an autofixer. **Use it for any work in
`alkebu-web/`.** The workflow (see the repo [CLAUDE.md](../CLAUDE.md) "Svelte MCP
Server" section) is:

1. `list-sections` — discover relevant Svelte/SvelteKit topics
2. `get-documentation` — pull full content for the sections you need
3. `svelte-autofixer` — **run on any component before finalizing; loop until clean**
4. `playground-link` — only after user confirmation, never for code already written to files

## 3. Tailwind CSS MCP server

Runs a local `tailwindcss-server` binary (note: a bare `command`, not an `npx -y`
wrapper — the binary must be on your `PATH`). Provides Tailwind class/utility
assistance for the storefront's Tailwind v3 setup.

## Restarting / applying config changes

- **Claude Code**: servers restart automatically on next use after editing `.claude/mcp.json`.
- **Claude Desktop App**: restart the application.

## Troubleshooting

**Filesystem server not starting** — check `npx`:
```bash
which npx && npx --version
npx -y @modelcontextprotocol/server-filesystem /home/jadom/Coding/alkebulanimages2.0
```

**Svelte (SSE) server unreachable** — it's a remote endpoint; verify network access:
```bash
curl -I https://mcp.svelte.dev/mcp
```
An interactively-authenticated/remote MCP may be unavailable in headless runs.

**Tailwind server not found** — the `tailwindcss-server` binary must be installed and on `PATH`:
```bash
which tailwindcss-server
```
If missing, install it (or disable the server in `.claude/mcp.json`).

## Related Documentation

- [MCP Specification](https://modelcontextprotocol.io/)
- [Filesystem Server](https://github.com/modelcontextprotocol/servers)
- [Svelte MCP](https://mcp.svelte.dev/)
- [Claude Code Documentation](https://docs.claude.com/claude-code)
