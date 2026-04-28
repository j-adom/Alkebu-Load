# Deployment Guide

**Updated:** April 28, 2026  
**Current backend:** `https://payload.alkebulanimages.com`  
**Current storefront:** `https://alkebulanimages.com`

This repo has two deployable apps:
- `alkebu-load` — Payload CMS (backend)
- `alkebu-web` — SvelteKit frontend

Follow the steps below for each.

## Prerequisites
- Node 18.20+ or 20+ (match `package.json` engines)
- PNPM or NPM
- Backend env vars: `PAYLOAD_SECRET`, `DATABASE_URI` (or SQLite for dev), email/SMTP, Stripe keys, optional Square keys.
- Frontend env vars: `PAYLOAD_API_URL=https://payload.alkebulanimages.com` and `PUBLIC_SITE_URL=https://alkebulanimages.com`.

---

## Deploying Payload (`alkebu-load`)
1) Install deps
   - `cd alkebu-load`
   - `npm install` (or `pnpm install`)

2) Set environment
   - `PAYLOAD_SECRET` (required)
   - `DATABASE_URI` (Postgres in prod, SQLite accepted for local)
   - `PAYLOAD_PUBLIC_SERVER_URL=https://payload.alkebulanimages.com`
   - `PAYLOAD_PUBLIC_SITE_URL=https://alkebulanimages.com`
   - Email SMTP settings
   - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`
   - Square: `SQUARE_ACCESS_TOKEN`, `SQUARE_WEBHOOK_SIGNATURE_KEY`

3) Build / run
   - Dev: `npm run dev`
   - Prod build: `npm run build`
   - Start: `npm run start`

4) Webhooks
   - Stripe launch endpoint: `https://payload.alkebulanimages.com/api/stripe-webhook`
   - Square catalog endpoint: `https://payload.alkebulanimages.com/api/webhooks/square-catalog`

5) CMS toggle
   - In Payload admin > Globals > Site Settings, choose the default payment provider (Stripe or Square). Frontend will read this at build time.

---

## Deploying SvelteKit (`alkebu-web`)
1) Install deps
   - `cd alkebu-web`
   - `npm install` (or `pnpm install`)

2) Set environment
   - `PAYLOAD_API_URL=https://payload.alkebulanimages.com`
   - `PUBLIC_SITE_URL=https://alkebulanimages.com`

3) Sync payment provider info (must run before build)
   - `npm run sync:payment-provider`
   - This fetches `/api/payment-methods` from the backend and writes `src/lib/paymentProvider.ts`. If the fetch fails, it falls back to Stripe, so ensure backend and env are reachable when you run this.

4) Build / run
   - Dev: `npm run dev`
   - Prod build: `npm run build`
   - Preview: `npm run preview`

5) Deploy
   - Deploy the built app to the current Cloudflare hosting target with the environment above.

---

## Validation Checklist
- Backend responds at `/api/payment-methods` and `/api/checkout`.
- Frontend shows “Payments are processed by …” matching the provider selected in Site Settings.
- Stripe/Square webhook endpoints reachable and secrets configured.
- Database migrations applied or `payload` init run.
- `https://payload.alkebulanimages.com/api/health` returns healthy.
- Contact/order emails send successfully with production SES SMTP credentials.
- See [Launch Checklist](LAUNCH-CHECKLIST.md) for the full smoke test.
