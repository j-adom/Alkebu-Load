# Release Plan: Book Availability and Shipping

Date: 2026-03-15

This release spans both deploy targets:

- `alkebu-load` on Coolify / VPS
- `alkebu-web` on Cloudflare

Do not deploy the backend alone. The new `request-only` behavior is enforced server-side, but the customer-facing request button lives in the frontend. Shipping label changes can go live from the backend, but the availability UX needs both sides shipped together.

## Commit Groups

### Commit 1: Backend release

Suggested message:

```text
feat(payload): add request-only book availability and safer shipping estimates
```

Files:

```text
alkebu-load/src/app/api/checkout/preview/route.ts
alkebu-load/src/app/api/checkout/route.ts
alkebu-load/src/app/api/search/route.ts
alkebu-load/src/app/lib/payments/squareAdapter.ts
alkebu-load/src/app/utils/bookAvailabilityExceptions.ts
alkebu-load/src/app/utils/cartOperations.ts
alkebu-load/src/app/utils/cartProductDetails.ts
alkebu-load/src/app/utils/searchEngine.ts
alkebu-load/src/app/utils/shippingQuotes.ts
alkebu-load/src/app/utils/stripeHelpers.ts
alkebu-load/src/collections/Books.tsx
alkebu-load/src/migrations/20260315_154500_add_book_availability_status.ts
alkebu-load/src/migrations/index.ts
alkebu-load/src/payload-types.ts
alkebu-load/scripts/fix-carts-schema.sql
alkebu-load/tests/cart/cartProductDetails.test.ts
alkebu-load/tests/payments/shippingQuotes.test.ts
```

Notes:

- This keeps the earlier cart and checkout fixes with the new availability and shipping work.
- `payload-types.ts` was regenerated after adding `availabilityStatus`.

### Commit 2: Frontend release

Suggested message:

```text
feat(web): add request-only book storefront flow
```

Files:

```text
alkebu-web/src/lib/components/Shop/Books/BookCard.svelte
alkebu-web/src/lib/components/Shop/Books/BookDetailPage.svelte
alkebu-web/src/lib/components/Shop/Books/BookPurchaseAction.svelte
alkebu-web/src/lib/components/Shop/Books/BuyBook.svelte
alkebu-web/src/lib/components/Shop/Books/CarouselCard.svelte
alkebu-web/src/lib/components/Shop/Books/RelatedBooks.svelte
alkebu-web/src/lib/components/Shop/Books/RequestTitleButton.svelte
alkebu-web/src/lib/components/cart/AddToCartButton.svelte
alkebu-web/src/lib/seo.ts
alkebu-web/src/lib/server/payload.ts
alkebu-web/src/lib/utils/bookAvailability.ts
alkebu-web/src/routes/+layout.server.ts
alkebu-web/src/routes/+page.server.ts
alkebu-web/src/routes/+page.svelte
alkebu-web/src/routes/contact/+page.svelte
alkebu-web/src/routes/search/+page.server.ts
alkebu-web/src/routes/shop/books/+page.server.ts
alkebu-web/src/routes/shop/books/[slug]/[isbn]/+page.server.ts
alkebu-web/src/routes/shop/books/authors/[slug]/+page.server.ts
alkebu-web/src/routes/shop/books/collections/[slug]/+page.server.ts
alkebu-web/src/routes/shop/books/genres/[slug]/+page.server.ts
alkebu-web/src/routes/shop/books/tags/[slug]/+page.server.ts
alkebu-web/src/routes/sitemap.xml/+server.ts
```

## Checks Already Run

Backend:

- `pnpm generate:types`
- `node --test --import tsx ./tests/payments/shippingQuotes.test.ts`
- `pnpm check:scripts`

Frontend:

- `pnpm check`

## Production Backend Deploy

Current live backend app:

- Coolify app dir: `/data/coolify/applications/tcoks4wcgsokg0gw8kw4sgw4`
- Live compose file: `/data/coolify/applications/tcoks4wcgsokg0gw8kw4sgw4/docker-compose.yaml`
- Current live image: `tcoks4wcgsokg0gw8kw4sgw4:checkoutfix-20260316b`

### 1. Upload source snapshot to the VPS

From the repo root:

```bash
tar cz --exclude=.git --exclude=node_modules --exclude=.next --exclude=alkebulanimages.db --exclude=alkebulanimages.db.backup-* --exclude=square-dumps --exclude=logs --exclude=data --exclude=output-29.csv --exclude=enrichment*.log --exclude=catalog-*.json --exclude=payload-*.json --exclude=inventory-response.json --exclude=sync-summary.json -C /home/jadom/Coding/alkebulanimages2.0/alkebu-load . | ssh alkebu-vps 'cat > /tmp/alkebu-load-release-20260315.tgz'
```

### 2. Extract on the VPS

```bash
ssh alkebu-vps 'rm -rf /tmp/alkebu-load-release-20260315 && mkdir -p /tmp/alkebu-load-release-20260315 && tar xzf /tmp/alkebu-load-release-20260315.tgz -C /tmp/alkebu-load-release-20260315'
```

### 3. Run the Payload migration in a one-off Node container

The VPS itself does not have `node` or `pnpm`, so run the migration in Docker:

```bash
ssh alkebu-vps 'docker run --rm \
  --env-file /data/coolify/applications/tcoks4wcgsokg0gw8kw4sgw4/.env \
  -v /tmp/alkebu-load-release-20260315:/app \
  -w /app \
  node:22-alpine \
  sh -lc "apk add --no-cache libc6-compat && npm install -g pnpm && pnpm install --frozen-lockfile && pnpm payload migrate"'
```

### 4. Build the new backend image on the VPS

```bash
ssh alkebu-vps 'docker build -t tcoks4wcgsokg0gw8kw4sgw4:availability-20260315a /tmp/alkebu-load-release-20260315'
```

### 5. Swap the live image in Coolify compose

Edit:

- `/data/coolify/applications/tcoks4wcgsokg0gw8kw4sgw4/docker-compose.yaml`

Change:

```yaml
image: 'tcoks4wcgsokg0gw8kw4sgw4:checkoutfix-20260316b'
```

To:

```yaml
image: 'tcoks4wcgsokg0gw8kw4sgw4:availability-20260315a'
```

Then restart the app:

```bash
ssh alkebu-vps 'cd /data/coolify/applications/tcoks4wcgsokg0gw8kw4sgw4 && docker compose up -d'
```

### 6. Verify backend health

```bash
curl -i -sS https://payload.alkebulanimages.com/api/health
```

Manual smoke tests after deploy:

- `available` book still adds to cart
- `request-only` book rejects add-to-cart at the API layer
- checkout preview returns shipping options with `USPS Media Mail` or `Best Available`
- shipping labels no longer expose the word `fallback`

## Frontend Deploy

Deploy only after the backend health check is green.

### 1. Push the frontend commit to the branch Cloudflare watches

Current repo branch:

- `main`

### 2. Ensure the frontend build uses the live backend

Required env:

- `PAYLOAD_BASE_URL` pointed at the production backend

### 3. Sync payment provider before build

```bash
cd alkebu-web
pnpm sync:payment-provider
pnpm build
```

### 4. Deploy through the normal Cloudflare Pages / Workers pipeline

After deploy, verify:

- `request-only` books show `Request this title`
- `discontinued` books do not appear in catalog, search, or sitemap
- `available` books still show shipping timing and add to cart normally

## Release Order

1. Push backend commit
2. Build backend release tarball
3. Run production migration
4. Build and promote backend image
5. Verify backend health and checkout preview
6. Push frontend commit
7. Deploy frontend on Cloudflare
8. Verify `available`, `request-only`, and `discontinued` book cases end to end
