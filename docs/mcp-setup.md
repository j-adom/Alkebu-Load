# MCP (Model Context Protocol) Setup

This document explains the MCP filesystem server configuration for the Alkebulanimages 2.0 project.

## What is MCP?

MCP (Model Context Protocol) is a protocol that allows Claude to interact with external tools and services. The filesystem MCP server provides enhanced file system access capabilities.

## Configuration

### Location
The MCP configuration is located at:
```
.claude/mcp.json
```

### Current Setup

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
    }
  }
}
```

## What This Provides

The filesystem MCP server gives Claude access to:

1. **Read files** - Enhanced file reading capabilities
2. **Write files** - Create and modify files
3. **Directory operations** - List, create, and manage directories
4. **File search** - Advanced file searching within the project
5. **File metadata** - Access file information (size, permissions, timestamps)

## Allowed Directory

The MCP server is configured to access:
- **Root**: `/home/jadom/Coding/alkebulanimages2.0`
- **Includes**: All subdirectories:
  - `alkebu-load/` - Payload CMS backend
  - `alkebu-web/` - SvelteKit frontend
  - `alkebu-shared/` - Shared utilities (future)
  - `docs/` - Project documentation

## Security

### Scope Restriction
The MCP server is restricted to the project directory only. It cannot access:
- Parent directories
- System files outside the project
- Other user directories

### Additional Permissions
See `.claude/settings.local.json` for additional tool permissions that complement the MCP server.

## How to Restart MCP Server

If you need to restart the MCP server (after configuration changes):

1. **Claude Desktop App**: Restart the application
2. **Claude Code**: The server will restart automatically on next use

## Troubleshooting

### MCP Server Not Starting

**Check npx availability:**
```bash
which npx
npx --version
```

**Test MCP server manually:**
```bash
npx -y @modelcontextprotocol/server-filesystem /home/jadom/Coding/alkebulanimages2.0
```

### Permission Issues

Ensure the project directory is readable:
```bash
ls -la /home/jadom/Coding/alkebulanimages2.0
```

### Package Not Found

Install the MCP filesystem server globally:
```bash
npm install -g @modelcontextprotocol/server-filesystem
```

## Advanced Configuration

### Multiple Directories

To allow access to multiple directories, modify the args:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/home/jadom/Coding/alkebulanimages2.0",
        "/home/jadom/Coding/other-project"
      ],
      "enabled": true
    }
  }
}
```

### Read-Only Mode

For read-only access, use the `--readonly` flag:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "--readonly",
        "/home/jadom/Coding/alkebulanimages2.0"
      ],
      "enabled": true
    }
  }
}
```

## Related Documentation

- [MCP Specification](https://modelcontextprotocol.io/)
- [Filesystem Server Documentation](https://github.com/modelcontextprotocol/servers)
- [Claude Code Documentation](https://docs.claude.com/claude-code)

## Notes

- The MCP server runs in the background when Claude Code is active
- No manual installation is required - `npx -y` handles it automatically
- The server is scoped to this project only for security
