# Deployment Guide

This repo has two deployable apps:
- `alkebu-load` — Payload CMS (backend)
- `alkebu-web` — SvelteKit frontend

Follow the steps below for each.

## Prerequisites
- Node 18.20+ or 20+ (match `package.json` engines)
- PNPM or NPM
- Backend env vars: `PAYLOAD_SECRET`, `DATABASE_URI` (or SQLite for dev), email/SMTP, Stripe keys, optional Square keys.
- Frontend env vars: `PAYLOAD_BASE_URL` pointing at the deployed backend/API.

---

## Deploying Payload (`alkebu-load`)
1) Install deps
   - `cd alkebu-load`
   - `npm install` (or `pnpm install`)

2) Set environment
   - `PAYLOAD_SECRET` (required)
   - `DATABASE_URI` (Postgres in prod, SQLite accepted for local)
   - Email SMTP settings
   - Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - Square (optional): `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_ENVIRONMENT` (sandbox|production)

3) Build / run
   - Dev: `npm run dev`
   - Prod build: `npm run build`
   - Start: `npm run start`

4) Webhooks
   - Point Stripe webhooks to: `/api/payment-webhook/stripe`
   - Point Square webhooks to: `/api/payment-webhook/square` (once enabled)

5) CMS toggle
   - In Payload admin > Globals > Site Settings, choose the default payment provider (Stripe or Square). Frontend will read this at build time.

---

## Deploying SvelteKit (`alkebu-web`)
1) Install deps
   - `cd alkebu-web`
   - `npm install` (or `pnpm install`)

2) Set environment
   - `PAYLOAD_BASE_URL` to the deployed backend (e.g., `https://api.example.com`)

3) Sync payment provider info (must run before build)
   - `npm run sync:payment-provider`
   - This fetches `/api/payment-methods` from the backend and writes `src/lib/paymentProvider.ts`. If the fetch fails, it falls back to Stripe, so ensure backend and env are reachable when you run this.

4) Build / run
   - Dev: `npm run dev`
   - Prod build: `npm run build`
   - Preview: `npm run preview`

5) Deploy
   - Deploy the built app to your hosting provider (e.g., Vercel, Cloudflare, or your chosen platform) with `PAYLOAD_BASE_URL` set.

---

## Validation Checklist
- Backend responds at `/api/payment-methods` and `/api/checkout`.
- Frontend shows “Payments are processed by …” matching the provider selected in Site Settings.
- Stripe/Square webhook endpoints reachable and secrets configured.
- Database migrations applied or `payload` init run.
