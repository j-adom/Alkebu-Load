# Documentation Index

This index is the current map for Alkebulanimages 2.0 documentation. If docs conflict, prefer the launch checklist first, then the development/deployment guides, then historical phase notes.

## Current Operating Docs

- [Launch Checklist](LAUNCH-CHECKLIST.md) - Current priority board, production smoke test, and post-launch monitoring.
- [Development Guide](development-guide.md) - Local development setup, commands, troubleshooting, and environment notes.
- [Deployment Guide](Deployment-Guide.md) - Current deployment and production validation notes.
- [Product Requirements](PRD.md) - Product scope, current status, phases, and feature goals.
- [Architecture Overview](architecture.md) - System architecture, data flow, collections, and infrastructure.

## Feature Reference

- [Cart UX](CART-UX.md) - Cart behavior and implementation reference.
- [Book Enrichment Workflow](BOOK-ENRICHMENT-WORKFLOW.md) - ISBN and metadata enrichment workflow.
- [Staff Workflows](STAFF-WORKFLOWS.md) - Order dashboard and fulfillment procedures.
- [Book Availability and Shipping Release Notes](release-2026-03-15-book-availability-and-shipping.md) - Release-specific notes for availability and shipping.

## Backend-Specific Docs

- [Backend README](../alkebu-load/README.md)
- [Backend Deployment Notes](../alkebu-load/DEPLOYMENT.md)
- [Backend System Guide](../alkebu-load/SYSTEM_GUIDE.md)
- [Auto Enrichment](../alkebu-load/docs/AUTO_ENRICHMENT.md)
- [Data Migration Complete](../alkebu-load/docs/data-migration-complete.md)

## Historical / Reference Docs

These are useful for context but may include older domains, older deployment assumptions, or completed setup steps.

- [Phase 1 Quickstart](../PHASE1-QUICKSTART.md)
- [Phase 1 Setup](PHASE1-SETUP.md)
- [MCP Setup](mcp-setup.md)
- [Claude Instructions](../CLAUDE.md)
- [Backend Claude Instructions](../alkebu-load/CLAUDE.md)

## Current Production URLs

- Storefront: `https://alkebulanimages.com`
- Backend/Admin: `https://payload.alkebulanimages.com`
- Health check: `https://payload.alkebulanimages.com/api/health`

## Documentation Maintenance Rules

- Keep launch status in [Launch Checklist](LAUNCH-CHECKLIST.md).
- Keep local commands in [Development Guide](development-guide.md).
- Keep production domain and webhook updates in [Deployment Guide](Deployment-Guide.md).
- Mark older implementation notes as historical instead of silently deleting context.
