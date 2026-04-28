# Alkebu Load

Payload CMS backend for Alkebulanimages 2.0.

## Role

`alkebu-load` serves the live backend/admin at `https://payload.alkebulanimages.com`. It owns Payload collections, product data, cart/order APIs, Stripe/Square integrations, email notifications, search, enrichment scripts, and the staff order dashboard.

## Project Docs

- See [../README.md](../README.md) for the complete project overview
- See [../docs/README.md](../docs/README.md) for the documentation index
- See [../docs/LAUNCH-CHECKLIST.md](../docs/LAUNCH-CHECKLIST.md) for current launch priorities
- See [../docs/PRD.md](../docs/PRD.md) for detailed requirements

## Integration Points

This Payload CMS serves as the central data hub for:
- **alkebu-web**: Content and product APIs
- **Square POS**: Existing webhook integration (unchanged)
- **Stripe**: Hosted checkout and payment webhooks
- **Amazon SES SMTP**: Transactional email
