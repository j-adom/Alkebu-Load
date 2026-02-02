# Claude Configuration Directory

This directory contains configuration files for Claude Code and MCP servers.

## Files

### `mcp.json`
MCP (Model Context Protocol) server configuration. Currently configured:
- **Filesystem MCP**: Provides enhanced file system access to the entire project directory

### `settings.local.json`
Local permissions and settings for Claude Code. Defines allowed bash commands and web fetch domains.

## Quick Reference

### Restart MCP Server
Restart Claude Code or the Claude Desktop application.

### View MCP Logs
MCP server logs are typically in:
- **MacOS**: `~/Library/Logs/Claude/`
- **Linux**: `~/.config/Claude/logs/`
- **Windows**: `%APPDATA%\Claude\logs\`

### Modify Allowed Directories
Edit `mcp.json` and update the args array to include additional directories.

## Documentation

See `/docs/mcp-setup.md` for complete MCP setup documentation.
