# Alkebu Load

Payload CMS backend for Alkebulanimages 2.0.

## Role

alkebu-load serves the live backend/admin at https://payload.alkebulanimages.com. It owns Payload collections, product data, cart/order APIs, Stripe/Square integrations, email notifications, search, enrichment scripts, and the staff order dashboard.

## Project Docs

- [Project overview](../README.md)
- [Documentation index](../docs/README.md)
- [Launch and operations board](../docs/launch.md)
- [Deployment guide](../docs/deployment.md)
- [Book operations](../docs/book-operations.md)
- [Product requirements](../docs/PRD.md)

## Integration Points

This Payload CMS serves as the central data hub for:

- **alkebu-web**: Content and product APIs.
- **Square POS**: Catalog/inventory sync webhook.
- **Stripe**: Checkout and payment webhooks.
- **Amazon SES SMTP**: Transactional email.
