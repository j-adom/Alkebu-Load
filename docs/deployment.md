# Deployment Guide

**Updated:** May 28, 2026  
**Storefront:** https://alkebulanimages.com  
**Payload/Admin:** https://payload.alkebulanimages.com

This repo has two deployable apps:

- alkebu-load - Payload CMS backend/admin, commerce APIs, webhooks, email, jobs, search, and enrichment scripts.
- alkebu-web - SvelteKit storefront deployed to the current Cloudflare target.

## Release Order

1. Deploy alkebu-load first when API contracts, Payload schema, payment, email, or webhook behavior changes.
2. Verify backend health and payment-provider endpoint.
3. Run npm run sync:payment-provider in alkebu-web before the storefront build.
4. Deploy alkebu-web.
5. Run the smoke tests in [launch.md](launch.md).

## Backend: Payload

### Required Environment

~~~bash
DATABASE_URI=postgresql://user:password@host:5432/alkebulanimages
PAYLOAD_SECRET=<secure-32-plus-character-secret>
PAYLOAD_PUBLIC_SERVER_URL=https://payload.alkebulanimages.com
PAYLOAD_PUBLIC_SITE_URL=https://alkebulanimages.com
NODE_ENV=production
PORT=3000

STRIPE_SECRET_KEY=<stripe-secret>
STRIPE_PUBLISHABLE_KEY=<stripe-publishable>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>

SQUARE_ACCESS_TOKEN=<square-token>
SQUARE_APPLICATION_ID=<square-app-id>
SQUARE_WEBHOOK_SIGNATURE_KEY=<square-catalog-webhook-signature-key>

FROM_EMAIL=orders@alkebulanimages.com
FROM_NAME=Alkebu-Lan Images
SES_SMTP_USER=<ses-smtp-user>
SES_SMTP_PASSWORD=<ses-smtp-password>
SMTP_HOST=email-smtp.us-east-2.amazonaws.com
SMTP_PORT=587
~~~

Optional but recommended:

~~~bash
SHIPPO_API_TOKEN=<shippo-token>
SHIPPO_SHIP_FROM_NAME=Alkebu-Lan Images
SHIPPO_SHIP_FROM_STREET1=2721 Jefferson St.
SHIPPO_SHIP_FROM_CITY=Nashville
SHIPPO_SHIP_FROM_STATE=TN
SHIPPO_SHIP_FROM_ZIP=37208
SHIPPO_SHIP_FROM_COUNTRY=US
SHIPPO_SHIP_FROM_EMAIL=info@alkebulanimages.com
SHIPPO_SHIP_FROM_PHONE=6153214111

ISBNDB_API_KEY=<isbndb-key>
GOOGLE_BOOKS_API_KEY=<google-books-key>
~~~

### Coolify Notes

- Build pack: Docker.
- Dockerfile: ./Dockerfile from the alkebu-load directory.
- Health path: /api/health on port 3000.
- Add persistent storage for uploads if local media storage is used: mount a volume to /app/media.
- Prefer PostgreSQL for production. SQLite is only acceptable for local development.

### Backend Commands

~~~bash
cd alkebu-load
pnpm install
pnpm run check:scripts
pnpm test
pnpm run lint
pnpm run build
pnpm run start
~~~

### Webhooks

- Stripe: https://payload.alkebulanimages.com/api/stripe-webhook
- Square catalog sync: https://payload.alkebulanimages.com/api/webhooks/square-catalog

Square signature validation uses the exact notification URL plus the raw request body. If PAYLOAD_PUBLIC_SERVER_URL or the Square dashboard URL differs by protocol, host, path, or trailing slash behavior, valid deliveries can fail signature checks.

### Migrations

The production standalone container does not include the full development toolchain. Do not expect commands like docker exec <container> pnpm payload migrate to work inside the running app container.

Use one of these patterns:

- Run migrations as a pre-deploy command/job with the full repo and dependencies installed.
- Run a one-off container that has the full source tree and production DATABASE_URI.
- Wait for https://payload.alkebulanimages.com/api/health to return healthy before promoting the frontend deploy.

## Frontend: SvelteKit

### Required Environment

~~~bash
PAYLOAD_API_URL=https://payload.alkebulanimages.com
PUBLIC_SITE_URL=https://alkebulanimages.com
~~~

### Frontend Commands

~~~bash
cd alkebu-web
npm install
npm run sync:payment-provider
npm run lint
npm run check:svelte
npm run build
npm run preview
~~~

npm run build runs check:svelte before vite build, so Svelte contract errors block production builds.

## Post-Deploy Validation

- /api/health returns only status, timestamp, and database after the redaction patch is deployed.
- /api/payment-methods returns the provider selected in Payload Site Settings.
- Storefront checkout text matches the selected provider.
- Stripe webhook deliveries are successful.
- Square catalog webhook deliveries are successful and signed.
- Contact/order/staff/shipping emails send from production SES SMTP.
- Smoke tests in [launch.md](launch.md) pass.

## Rollback

1. Roll back the backend in Coolify or revert the deployment commit.
2. Restore the database from backup only if a schema/data migration caused the problem.
3. Redeploy the frontend only after the backend contract is healthy again.
4. Re-run public smoke and one controlled checkout if commerce behavior changed.

## Monitoring and Backups

- Monitor /api/health with UptimeRobot or equivalent.
- Keep PostgreSQL backups enabled with at least 7 days retention.
- Watch Coolify logs for webhook failures, SMTP errors, and database connection errors.
- Track disk usage for media volume/R2 sync paths.
