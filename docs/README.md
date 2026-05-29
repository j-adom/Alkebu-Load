# Documentation Index

This is the current map for Alkebulanimages 2.0 documentation. If docs conflict, prefer this order: launch board, deployment guide, development guide, architecture/PRD, feature docs, historical planning artifacts.

## Current Operating Docs

- [Launch and Operations Board](launch.md) - Current priority board, smoke tests, and post-deploy verification.
- [Deployment Guide](deployment.md) - Backend/frontend deploy order, environment variables, webhooks, and validation.
- [Development Guide](development-guide.md) - Local setup, commands, troubleshooting, and environment notes.
- [Architecture Overview](architecture.md) - System architecture, data flow, collections, and infrastructure.
- [Product Requirements](PRD.md) - Product scope, current status, phases, and feature goals.

## Workflow Docs

- [Cart and Checkout](cart-checkout.md) - Cart drawer, checkout APIs, payment, tax, and shipping behavior.
- [Book Operations](book-operations.md) - Square CSV import, ISBN enrichment, bulk book intake, and troubleshooting.
- [Staff Workflows](staff-workflows.md) - Order processing, shipping, refunds, book intake, directory updates, and E2E test checklist.

## Backend-Specific References

- [Backend README](../alkebu-load/README.md)
- [Backend System Guide](../alkebu-load/SYSTEM_GUIDE.md)
- [Archived migrations note](../alkebu-load/migrations.archive/README.md)

## Tooling / Agent References

- [MCP Setup](mcp-setup.md)
- [Claude Instructions](../CLAUDE.md)
- [Backend Claude Instructions](../alkebu-load/CLAUDE.md)
- [Superpowers planning artifacts](superpowers/)

## Current Production URLs

- Storefront: https://alkebulanimages.com
- Backend/Admin: https://payload.alkebulanimages.com
- Health check: https://payload.alkebulanimages.com/api/health

## Maintenance Rules

- Keep launch status and smoke tests in [launch.md](launch.md).
- Keep production domains, env vars, and webhook deployment notes in [deployment.md](deployment.md).
- Keep local commands and setup in [development-guide.md](development-guide.md).
- Keep customer/staff operational procedures in [staff-workflows.md](staff-workflows.md).
- Prefer updating one canonical doc over adding a new one-off Markdown file.
