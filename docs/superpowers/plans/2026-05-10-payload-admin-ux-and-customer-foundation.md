# Payload Admin UX + Customer Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix Payload admin data visibility, density, and navigation; establish `Customers` as the canonical shopper entity across all channels (current ecom; future POS, import, B2B).

**Architecture:** Eight sequenced phases matching spec §8. Each phase is independently shippable and ends with a commit. Customer foundation (Phase 6) lands before dense Orders rows (Phase 7) so the Orders customer cell renders linked-customer names directly.

**Tech Stack:** Payload CMS 3.79.x on Next.js 15, TypeScript, SQLite (dev) / PostgreSQL (prod via Drizzle), node:test for unit tests, React for admin custom components.

**Spec:** [docs/superpowers/specs/2026-05-10-payload-admin-ux-and-customer-foundation-design.md](../specs/2026-05-10-payload-admin-ux-and-customer-foundation-design.md)

---

## File Structure

### New files

| Path | Purpose |
|---|---|
| `alkebu-load/src/app/utils/autoLinkPublisher.ts` | `autoLinkPublisher(doc, req)` — wraps `createOrFindPublisher` for Books `afterChange` hook |
| `alkebu-load/src/app/utils/customerUpsert.ts` | Upsert a `Customers` row from an order's email + shipping address |
| `alkebu-load/src/app/utils/customerRollups.ts` | Recompute `totalOrders` / `totalSpent` / `lastOrderDate` for a Customer |
| `alkebu-load/scripts/backfill-author-publisher-links.ts` | One-time backfill for `Books.authors` and `Books.publisher` from text fallbacks |
| `alkebu-load/scripts/backfill-customers-from-orders.ts` | One-time backfill creating `Customers` rows from historical guest orders |
| `alkebu-load/src/app/components/admin/DenseRow.tsx` | Shared dense-row shell with click-to-expand + keyboard nav |
| `alkebu-load/src/app/components/admin/cells/AuthorsCell.tsx` | Smart-fallback Cell: relationship → `authorsText` → `—` |
| `alkebu-load/src/app/components/admin/cells/PublisherCell.tsx` | Smart-fallback Cell: relationship → `publisherText` → `—` |
| `alkebu-load/src/app/components/admin/cells/CustomerNameCell.tsx` | Smart-fallback Cell for Orders list: customer → shipping name → guestEmail → `—` |
| `alkebu-load/src/app/components/admin/BooksListView.tsx` | Custom list view: dense rows + inline editor for Books |
| `alkebu-load/src/app/components/admin/OrdersListView.tsx` | Custom list view: dense rows + inline editor for Orders |
| `alkebu-load/tests/customers/customerUpsert.test.ts` | Unit tests: upsert behavior |
| `alkebu-load/tests/customers/customerRollups.test.ts` | Unit tests: rollup recompute |
| `alkebu-load/tests/order-dashboard/getCustomerName.test.ts` | Unit tests: name fallback ordering |

### Modified files

| Path | Change |
|---|---|
| `alkebu-load/src/app/(frontend)/page.tsx` | Replace welcome page with `redirect('/admin')` |
| `alkebu-load/src/app/(frontend)/styles.css` | Delete (orphaned) |
| `alkebu-load/src/collections/Books.tsx` | Uncomment `autoLinkAuthors`, add `autoLinkPublisher`, register custom list view |
| `alkebu-load/src/collections/Orders.ts` | `customer.relationTo: 'customers'`, add `afterChange` upsert + rollup hooks, register custom list view |
| `alkebu-load/src/collections/Customers.ts` | Add `source`, `accountStatus`, `squareCustomerId` fields; `verify: false` (managed at create call) |
| `alkebu-load/src/app/components/OrderDashboardV2.tsx` | `getCustomerName()` adds shipping-address fallback |
| `alkebu-load/src/app/components/OrderDashboardNavLink.tsx` | Tone styling to match Payload sidebar conventions |
| `alkebu-load/src/app/(payload)/admin/importMap.js` | Regenerate via `pnpm generate:importmap` |
| `alkebu-load/src/payload-types.ts` | Regenerate via `pnpm generate:types` |
| `docs/PRD.md` | Customer role removal, data-flow clarification |
| `docs/architecture.md` | Customers standalone shape (replace `user` relationship tree) |
| `docs/STAFF-WORKFLOWS.md` | Remove `customer` role from Users table |

---

## Phase 1 — Root URL Redirect (confidence-builder)

### Task 1: Replace welcome page with redirect

**Files:**
- Modify: `alkebu-load/src/app/(frontend)/page.tsx`
- Delete: `alkebu-load/src/app/(frontend)/styles.css` (only if orphaned)

- [ ] **Step 1: Confirm styles.css is orphaned**

Run:
```bash
grep -rn "frontend.*styles\|(frontend)/styles" alkebu-load/src 2>/dev/null
```
Expected: only `page.tsx` references it. If anything else references it, do NOT delete in Step 4.

- [ ] **Step 2: Replace `page.tsx` with redirect**

Overwrite `alkebu-load/src/app/(frontend)/page.tsx` with:

```tsx
import { redirect } from 'next/navigation'

export default function HomePage() {
  redirect('/admin')
}
```

- [ ] **Step 3: Start dev server and verify**

Run from `alkebu-load/`:
```bash
pnpm dev
```
Visit `http://localhost:3000/` — expected: instant redirect to `/admin` (login page if logged out, or admin shell if logged in). No welcome page flash. Stop the dev server.

- [ ] **Step 4: Delete orphaned styles.css (if Step 1 confirmed orphan)**

```bash
rm alkebu-load/src/app/(frontend)/styles.css
```

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/app/\(frontend\)/page.tsx alkebu-load/src/app/\(frontend\)/styles.css
git commit -m "feat(admin): redirect root URL to /admin"
```

---

## Phase 2 — Order Dashboard Nav Link Visibility

### Task 2: Regenerate importMap and verify nav link shows

**Files:**
- Modify (generated): `alkebu-load/src/app/(payload)/admin/importMap.js`

- [ ] **Step 1: Verify nav link is referenced in config but missing from importMap**

```bash
grep -n "OrderDashboardNavLink" alkebu-load/src/payload.config.ts alkebu-load/src/app/\(payload\)/admin/importMap.js
```
Expected: appears in `payload.config.ts` (in `afterNavLinks`), missing from `importMap.js`. Confirms the regeneration is needed.

- [ ] **Step 2: Regenerate importMap**

```bash
cd alkebu-load && pnpm generate:importmap && cd ..
```

- [ ] **Step 3: Verify OrderDashboardNavLink is now in importMap**

```bash
grep -n "OrderDashboardNavLink" alkebu-load/src/app/\(payload\)/admin/importMap.js
```
Expected: at least one import line and one map entry.

- [ ] **Step 4: Start dev server and visually verify**

```bash
cd alkebu-load && pnpm dev
```
Visit `http://localhost:3000/admin`, log in, confirm the "Quick Access — Order Dashboard" panel appears in the sidebar. Click it → `/admin/order-dashboard` opens. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/app/\(payload\)/admin/importMap.js
git commit -m "fix(admin): regenerate importMap so Order Dashboard nav link appears"
```

### Task 3: Tone nav-link styling to match sidebar conventions

**Files:**
- Modify: `alkebu-load/src/app/components/OrderDashboardNavLink.tsx`

- [ ] **Step 1: Replace the gradient banner with a subdued nav-style link**

Overwrite `alkebu-load/src/app/components/OrderDashboardNavLink.tsx`:

```tsx
import React from 'react'
import Link from 'next/link'

const OrderDashboardNavLink: React.FC = () => {
  return (
    <div
      style={{
        marginTop: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--theme-elevation-100)',
      }}
    >
      <Link
        href="/admin/order-dashboard"
        style={{
          display: 'block',
          padding: '0.65rem 0.85rem',
          borderRadius: '0.4rem',
          textDecoration: 'none',
          color: 'var(--theme-text)',
          background: 'var(--theme-elevation-50)',
          border: '1px solid var(--theme-elevation-100)',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}
      >
        Order Dashboard
        <div
          style={{
            marginTop: '0.2rem',
            fontSize: '0.75rem',
            fontWeight: 400,
            color: 'var(--theme-text-dim)',
            lineHeight: 1.4,
          }}
        >
          Process orders, add tracking, mark shipped
        </div>
      </Link>
    </div>
  )
}

export default OrderDashboardNavLink
```

- [ ] **Step 2: Restart dev server, visually verify**

The link should still appear in the sidebar but now match the visual weight of other nav items.

- [ ] **Step 3: Commit**

```bash
git add alkebu-load/src/app/components/OrderDashboardNavLink.tsx
git commit -m "style(admin): subdue Order Dashboard nav link to match sidebar conventions"
```

---

## Phase 3 — Order Dashboard Name Fallback Fix

### Task 4: Add shipping-address fallback to getCustomerName

**Files:**
- Modify: `alkebu-load/src/app/components/OrderDashboardV2.tsx:158-166`
- Create: `alkebu-load/tests/order-dashboard/getCustomerName.test.ts`

This task extracts the helper into a testable module first, then adds the fallback with TDD.

- [ ] **Step 1: Extract `getCustomerName` (and the sibling `getCustomerEmail`) into a standalone module**

Create `alkebu-load/src/app/components/orderDashboard/customerDisplay.ts`:

```ts
export type OrderCustomerInput = {
  customer?: { displayName?: string; email?: string; firstName?: string; lastName?: string } | string | null
  guestEmail?: string | null
  shippingAddress?: { firstName?: string; lastName?: string } | null
}

export function getCustomerName(order: OrderCustomerInput): string {
  if (typeof order.customer === 'object' && order.customer) {
    const linked =
      order.customer.displayName ||
      `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
    if (linked) return linked
  }

  const shipName = `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim()
  if (shipName) return shipName

  return order.guestEmail || 'Guest'
}

export function getCustomerEmail(order: OrderCustomerInput): string {
  if (typeof order.customer === 'object' && order.customer?.email) {
    return order.customer.email
  }
  return order.guestEmail || ''
}
```

- [ ] **Step 2: Write failing tests**

Create `alkebu-load/tests/order-dashboard/getCustomerName.test.ts`:

```ts
import assert from 'node:assert'
import test from 'node:test'

import { getCustomerName, getCustomerEmail } from '../../src/app/components/orderDashboard/customerDisplay'

test('linked customer displayName wins', () => {
  const r = getCustomerName({
    customer: { displayName: 'Jane Doe', email: 'j@x.com' },
    shippingAddress: { firstName: 'Janet', lastName: 'Doe' },
    guestEmail: 'guest@x.com',
  })
  assert.strictEqual(r, 'Jane Doe')
})

test('linked customer first+last wins when no displayName', () => {
  const r = getCustomerName({
    customer: { firstName: 'Jane', lastName: 'Doe', email: 'j@x.com' },
    guestEmail: 'guest@x.com',
  })
  assert.strictEqual(r, 'Jane Doe')
})

test('shipping address name used for guest orders', () => {
  const r = getCustomerName({
    customer: null,
    shippingAddress: { firstName: 'John', lastName: 'Sims' },
    guestEmail: 'simsjohnl@hotmail.com',
  })
  assert.strictEqual(r, 'John Sims')
})

test('guest email used only when no shipping name', () => {
  const r = getCustomerName({
    customer: null,
    shippingAddress: { firstName: '', lastName: '' },
    guestEmail: 'simsjohnl@hotmail.com',
  })
  assert.strictEqual(r, 'simsjohnl@hotmail.com')
})

test("falls back to 'Guest' when nothing available", () => {
  const r = getCustomerName({})
  assert.strictEqual(r, 'Guest')
})

test('getCustomerEmail prefers linked customer email', () => {
  const r = getCustomerEmail({
    customer: { email: 'linked@x.com' },
    guestEmail: 'guest@x.com',
  })
  assert.strictEqual(r, 'linked@x.com')
})

test('getCustomerEmail falls back to guestEmail', () => {
  const r = getCustomerEmail({ guestEmail: 'guest@x.com' })
  assert.strictEqual(r, 'guest@x.com')
})
```

- [ ] **Step 3: Run tests to verify they pass**

From `alkebu-load/`:
```bash
pnpm test -- --test-name-pattern='getCustomerName|getCustomerEmail|guest|shipping|displayName|linked'
```
(Or run the full `pnpm test` — the new tests should pass; existing tests should not break.)
Expected: all 7 new tests pass.

- [ ] **Step 4: Replace the inline helpers in OrderDashboardV2.tsx with imports from the new module**

In `alkebu-load/src/app/components/OrderDashboardV2.tsx`:
- Delete the existing `getCustomerName` function around line 158 and `getCustomerEmail` around line 168.
- Add `import { getCustomerName, getCustomerEmail } from './orderDashboard/customerDisplay'` near the top of the file (matching existing import ordering).

- [ ] **Step 5: Run full test suite**

```bash
cd alkebu-load && pnpm test
```
Expected: all tests pass, including the new ones. No regressions in payments/search/cart suites.

- [ ] **Step 6: Visually verify in dev**

```bash
pnpm dev
```
Open `/admin/order-dashboard`, confirm guest orders now show the shipping-address name in the "Name" column instead of the email. Stop the dev server.

- [ ] **Step 7: Commit**

```bash
git add alkebu-load/src/app/components/OrderDashboardV2.tsx \
        alkebu-load/src/app/components/orderDashboard/ \
        alkebu-load/tests/order-dashboard/
git commit -m "fix(order-dashboard): show shipping-address name for guest orders instead of email"
```

---

## Phase 4 — Books Data Mismatch Fix (auto-link + backfill)

### Task 5: Add `autoLinkPublisher` helper

**Files:**
- Create: `alkebu-load/src/app/utils/autoLinkPublisher.ts`

- [ ] **Step 1: Verify `createOrFindPublisher` signature**

Read `alkebu-load/src/app/utils/publisherManager.ts` lines 1-60. Confirm `createOrFindPublisher(payload, name)` returns a publisher object with an `id` field. If the signature differs, adjust Step 2 accordingly.

- [ ] **Step 2: Create the helper**

Create `alkebu-load/src/app/utils/autoLinkPublisher.ts`:

```ts
import { createOrFindPublisher } from './publisherManager'

export async function autoLinkPublisher(doc: any, req: any) {
  if (doc.publisher) return
  const name = (doc.publisherText || '').trim()
  if (!name) return

  try {
    const publisher = await createOrFindPublisher(req.payload, name)
    if (publisher?.id) {
      await req.payload.update({
        collection: 'books',
        id: doc.id,
        data: { publisher: publisher.id },
      })
      console.log(`  🔗 Linked publisher "${name}" → id ${publisher.id} for book: ${doc.title}`)
    }
  } catch (error) {
    console.error('Error during auto-linking publisher:', error)
  }
}
```

- [ ] **Step 3: Type-check**

```bash
cd alkebu-load && pnpm lint
```
Expected: clean. If `createOrFindPublisher` returns a different shape, fix the type usage and re-run.

- [ ] **Step 4: Commit**

```bash
git add alkebu-load/src/app/utils/autoLinkPublisher.ts
git commit -m "feat(books): add autoLinkPublisher helper for afterChange hook"
```

### Task 6: Re-enable auto-link hooks on Books `afterChange`

**Files:**
- Modify: `alkebu-load/src/collections/Books.tsx:1-3, :830-840`

- [ ] **Step 1: Add the publisher import**

In `alkebu-load/src/collections/Books.tsx`, update the imports at the top (currently `import { autoEnrichBookFromISBN, autoLinkAuthors } from '@/app/utils/autoEnrichBook'`):

Add a new import line after it:
```ts
import { autoLinkPublisher } from '@/app/utils/autoLinkPublisher';
```

- [ ] **Step 2: Replace the commented-out `afterChange` block**

Find the block around line 830-840:
```ts
afterChange: [
  async ({ doc, req, operation }) => {
    // AUTO-LINK: Link authors after book is created/updated
    // This runs after the book is saved so we have a valid book ID
    // ⚠️ TEMPORARILY DISABLED FOR BATCH ENRICHMENT SCRIPT
    // if (operation === 'create' || operation === 'update') {
    //   await autoLinkAuthors(doc, req);
    // }
  }
]
```

Replace with:
```ts
afterChange: [
  async ({ doc, req, operation }) => {
    if (operation === 'create' || operation === 'update') {
      await autoLinkAuthors(doc, req);
      await autoLinkPublisher(doc, req);
    }
  }
]
```

- [ ] **Step 3: Build to confirm types and the import map are fine**

```bash
cd alkebu-load && pnpm lint
```
Expected: clean.

- [ ] **Step 4: Smoke-test the hook in dev**

```bash
pnpm dev
```
In `/admin/collections/books`, open one book with `publisherText` populated but no `publisher` relationship. Click Save (no changes). After a moment, refresh the list — that book's Publisher column should now show the linked name. Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/collections/Books.tsx
git commit -m "feat(books): re-enable autoLinkAuthors and add autoLinkPublisher on afterChange"
```

### Task 7: Write the backfill script

**Files:**
- Create: `alkebu-load/scripts/backfill-author-publisher-links.ts`

- [ ] **Step 1: Inspect an existing backfill script for patterns**

Read `alkebu-load/scripts/backfill-book-images.ts` (or `backfill-book-shipping-weights.ts`). Note the Payload init pattern, the dry-run flag handling, the pagination over the Books collection, and the summary report at the end. Replicate this structure in Step 2.

- [ ] **Step 2: Create the backfill script**

Create `alkebu-load/scripts/backfill-author-publisher-links.ts`:

```ts
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { autoLinkAuthors } from '../src/app/utils/autoEnrichBook'
import { autoLinkPublisher } from '../src/app/utils/autoLinkPublisher'

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  const payload = await getPayload({ config: await config })
  const req: any = { payload }

  let scanned = 0
  let authorsLinked = 0
  let publishersLinked = 0
  let skipped = 0
  let failed = 0

  const PAGE_SIZE = 100
  let page = 1

  while (true) {
    const result = await payload.find({
      collection: 'books',
      depth: 1,
      limit: PAGE_SIZE,
      page,
    })

    if (result.docs.length === 0) break

    for (const book of result.docs as any[]) {
      scanned++

      const needsAuthors =
        (!book.authors || book.authors.length === 0) &&
        Array.isArray(book.authorsText) &&
        book.authorsText.length > 0

      const needsPublisher = !book.publisher && book.publisherText?.trim()

      if (!needsAuthors && !needsPublisher) {
        skipped++
        continue
      }

      if (DRY_RUN) {
        if (needsAuthors) authorsLinked++
        if (needsPublisher) publishersLinked++
        console.log(`[dry-run] would link ${needsAuthors ? 'authors' : ''}${needsAuthors && needsPublisher ? '+' : ''}${needsPublisher ? 'publisher' : ''} for: ${book.title}`)
        continue
      }

      try {
        if (needsAuthors) {
          await autoLinkAuthors(book, req)
          authorsLinked++
        }
        if (needsPublisher) {
          await autoLinkPublisher(book, req)
          publishersLinked++
        }
      } catch (err) {
        failed++
        console.error(`Failed to link for book ${book.id} (${book.title}):`, err)
      }
    }

    if (page * PAGE_SIZE >= result.totalDocs) break
    page++
  }

  console.log('\n=== Backfill Summary ===')
  console.log(`Mode:                  ${DRY_RUN ? 'DRY RUN' : 'APPLIED'}`)
  console.log(`Books scanned:         ${scanned}`)
  console.log(`Books needing authors: ${authorsLinked}`)
  console.log(`Books needing pub:     ${publishersLinked}`)
  console.log(`Already linked / no-op:${skipped}`)
  console.log(`Failed:                ${failed}`)

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 3: Type-check the scripts directory**

```bash
cd alkebu-load && pnpm check:scripts
```
Expected: clean. (`tsconfig.scripts.json` covers `scripts/*.ts`.)

- [ ] **Step 4: Dry-run against local SQLite**

```bash
cd alkebu-load && pnpm tsx scripts/backfill-author-publisher-links.ts --dry-run
```
Expected: summary prints non-zero counts (assuming local DB has imported book data). No writes to DB.

- [ ] **Step 5: Apply against local SQLite**

```bash
pnpm tsx scripts/backfill-author-publisher-links.ts
```
Expected: applied summary; spot-check a book in `/admin` to confirm authors + publisher are linked.

- [ ] **Step 6: Commit**

```bash
git add alkebu-load/scripts/backfill-author-publisher-links.ts
git commit -m "feat(books): add backfill script for author and publisher relationship links"
```

### Task 8: Apply backfill on production

This task is an **operational** step, not a code change. Do it after merging the Phase 4 PR.

- [ ] **Step 1: Take a Postgres backup of the production database**

(Follow standard Coolify / Payload-hosted backup procedure. Do not skip — backfill writes to every unfllinked book.)

- [ ] **Step 2: Dry-run against production**

Connect to prod (via Coolify shell or temporary `DATABASE_URI` override) and run:
```bash
pnpm tsx scripts/backfill-author-publisher-links.ts --dry-run
```
Record the printed counts.

- [ ] **Step 3: Apply on production**

```bash
pnpm tsx scripts/backfill-author-publisher-links.ts
```
Compare actual counts to the dry-run counts.

- [ ] **Step 4: Spot-check 5 random books in admin**

Open `/admin/collections/books`, pick 5 books that previously showed `<No Authors>` or `<No Publisher>`, confirm relationships are now linked and the columns display the names.

---

## Phase 5 — Dense Rows Infrastructure + Books List

> **⚠️ API verification gate:** Payload v3.79.x's list-view replacement extensibility API has shifted across minor versions. **Before starting Task 9**, read the current Payload v3 docs for `admin.components.views.list` (or the equivalent slot) and confirm the pattern. If the full-view replacement isn't stable, fall back to a custom one-wide Cell that renders the row (registered via `admin.components.Cell` on a synthetic "row" virtual column). User-visible result is the same.

### Task 9: Build `DenseRow` shell + smart-fallback Cells

**Files:**
- Create: `alkebu-load/src/app/components/admin/DenseRow.tsx`
- Create: `alkebu-load/src/app/components/admin/cells/AuthorsCell.tsx`
- Create: `alkebu-load/src/app/components/admin/cells/PublisherCell.tsx`

- [ ] **Step 1: Build `DenseRow.tsx`**

Create `alkebu-load/src/app/components/admin/DenseRow.tsx`:

```tsx
'use client'

import React, { useState, useRef, useEffect } from 'react'

export type DenseRowProps<T> = {
  doc: T
  index: number
  isActive: boolean
  onActivate: () => void
  renderSummary: (doc: T) => React.ReactNode
  renderEditor: (doc: T, onClose: () => void) => React.ReactNode
  onOpenFullEdit: (doc: T) => void
}

export function DenseRow<T extends { id: number | string }>(props: DenseRowProps<T>) {
  const { doc, isActive, onActivate, renderSummary, renderEditor, onOpenFullEdit } = props
  const [expanded, setExpanded] = useState(false)
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isActive) rowRef.current?.focus()
  }, [isActive])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      setExpanded((v) => !v)
    } else if (e.key === 'Escape' && expanded) {
      e.preventDefault()
      setExpanded(false)
    }
  }

  return (
    <div
      ref={rowRef}
      tabIndex={0}
      onFocus={onActivate}
      onKeyDown={onKeyDown}
      style={{
        borderBottom: '1px solid var(--theme-elevation-100)',
        padding: '0.5rem 0.75rem',
        outline: isActive ? '2px solid var(--theme-success-500)' : 'none',
        background: expanded ? 'var(--theme-elevation-50)' : 'transparent',
      }}
    >
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ width: '1rem', color: 'var(--theme-text-dim)' }}>
          {expanded ? '▾' : '▸'}
        </span>
        <div style={{ flex: 1 }}>{renderSummary(doc)}</div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onOpenFullEdit(doc)
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--theme-text-dim)',
            cursor: 'pointer',
            padding: '0.25rem 0.5rem',
          }}
          aria-label="Open full edit page"
        >
          ⋯
        </button>
      </div>
      {expanded && (
        <div style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
          {renderEditor(doc, () => setExpanded(false))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build `AuthorsCell.tsx`**

Create `alkebu-load/src/app/components/admin/cells/AuthorsCell.tsx`:

```tsx
'use client'

import React from 'react'

type Author = { id: number | string; name?: string }
type AuthorTextEntry = { name?: string }

type Props = {
  authors?: Author[] | Author | null
  authorsText?: AuthorTextEntry[] | null
}

export function AuthorsCell({ authors, authorsText }: Props) {
  const linked = Array.isArray(authors) ? authors : authors ? [authors] : []
  if (linked.length > 0) {
    const names = linked.map((a) => a.name || `#${a.id}`).filter(Boolean)
    return <span>{names.join(', ')}</span>
  }
  if (Array.isArray(authorsText) && authorsText.length > 0) {
    const names = authorsText.map((a) => a.name).filter(Boolean)
    if (names.length > 0) {
      return (
        <span style={{ color: 'var(--theme-text-dim)' }} title="Unlinked text fallback">
          {names.join(', ')}
        </span>
      )
    }
  }
  return <span style={{ color: 'var(--theme-text-dim)' }}>—</span>
}

export default AuthorsCell
```

- [ ] **Step 3: Build `PublisherCell.tsx`**

Create `alkebu-load/src/app/components/admin/cells/PublisherCell.tsx`:

```tsx
'use client'

import React from 'react'

type Publisher = { id: number | string; name?: string }

type Props = {
  publisher?: Publisher | null
  publisherText?: string | null
}

export function PublisherCell({ publisher, publisherText }: Props) {
  if (publisher?.name) {
    return <span>{publisher.name}</span>
  }
  if (publisherText) {
    return (
      <span style={{ color: 'var(--theme-text-dim)' }} title="Unlinked text fallback">
        {publisherText}
      </span>
    )
  }
  return <span style={{ color: 'var(--theme-text-dim)' }}>—</span>
}

export default PublisherCell
```

- [ ] **Step 4: Type-check**

```bash
cd alkebu-load && pnpm lint
```
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/app/components/admin/
git commit -m "feat(admin): add DenseRow shell and smart-fallback cells for authors/publisher"
```

### Task 10: Wire Cells into the Books default list

This task uses Payload's per-field `admin.components.Cell` slot — guaranteed-stable API, doesn't require list-view replacement. Skip the full DenseRow integration if Task 9's API verification fails; the Cells alone give you the data fix in the default list view.

**Files:**
- Modify: `alkebu-load/src/collections/Books.tsx` (authors and publisher field definitions, around lines 126-156)

- [ ] **Step 1: Register custom Cells on the `authors` and `publisher` fields**

In `Books.tsx`, update the `authors` field:

```ts
{
  name: 'authors',
  type: 'relationship',
  relationTo: 'authors',
  hasMany: true,
  admin: {
    description: 'Book authors (linked to Authors collection)',
    components: {
      Cell: '/app/components/admin/cells/AuthorsCell',
    },
  },
},
```

And the `publisher` field:

```ts
{
  name: 'publisher',
  type: 'relationship',
  relationTo: 'publishers',
  admin: {
    description: 'Publisher (linked to Publishers collection)',
    components: {
      Cell: '/app/components/admin/cells/PublisherCell',
    },
  },
},
```

- [ ] **Step 2: Regenerate importMap**

```bash
cd alkebu-load && pnpm generate:importmap
```

- [ ] **Step 3: Verify cells are registered**

```bash
grep -n "AuthorsCell\|PublisherCell" alkebu-load/src/app/\(payload\)/admin/importMap.js
```
Expected: both appear.

- [ ] **Step 4: Dev verify**

```bash
pnpm dev
```
Visit `/admin/collections/books`. Confirm:
- Books with linked authors show the author names.
- Books with `authorsText` but no linked authors show the text in a dimmed style (will be common before Phase 4 backfill is applied).
- Books with neither show `—`.
- Same pattern for publisher.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/collections/Books.tsx alkebu-load/src/app/\(payload\)/admin/importMap.js
git commit -m "feat(books): wire smart-fallback Cells to authors and publisher fields"
```

### Task 11: Build `BooksListView` with dense rows + inline editor

This is the ambitious step. Verify the v3 list-view replacement API works against 3.79.x before starting. If it doesn't, document the API surface that *did* work as a follow-up and ship Phase 5 with just Tasks 9–10 (Cell-only path). Either way, the user-visible data fix is complete after Task 10.

**Files:**
- Create: `alkebu-load/src/app/components/admin/BooksListView.tsx`
- Modify: `alkebu-load/src/collections/Books.tsx` (admin config block around line 65)

- [ ] **Step 1: Verify the v3 list-view API on Payload 3.79.x**

Read the current Payload docs section on Custom Components > Root Components or List Components for v3. Confirm the registration shape (it's typically one of: `admin.components.views.List = '...'` or `admin.components.views.List.Component`). Note the exact shape and the expected props (`collectionConfig`, `docs`, `data`, etc.).

If unavailable or unstable, **skip Task 11** — Tasks 9–10 already deliver the data-visibility fix. Move to Phase 6. Document the decision in the Phase 5 PR description.

- [ ] **Step 2: Build the minimal list view (collapsed rows only — no inline editor yet)**

Create `alkebu-load/src/app/components/admin/BooksListView.tsx`:

```tsx
'use client'

import React, { useState } from 'react'
import { DenseRow } from './DenseRow'
import { AuthorsCell } from './cells/AuthorsCell'
import { PublisherCell } from './cells/PublisherCell'

type BookDoc = {
  id: number | string
  title?: string
  authors?: any
  authorsText?: any
  publisher?: any
  publisherText?: string
  availabilityStatus?: string
  isActive?: boolean
  editions?: Array<{ pricing?: { price?: number; stock?: number } }>
}

// Props shape depends on Payload's actual ListView component contract (verify in Step 1).
// Treat `docs` as the list of records currently displayed.
export default function BooksListView(props: any) {
  const docs: BookDoc[] = props.data?.docs || props.docs || []
  const [activeIdx, setActiveIdx] = useState<number>(-1)

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Books</h1>
      {docs.map((doc, i) => (
        <DenseRow
          key={doc.id}
          doc={doc}
          index={i}
          isActive={i === activeIdx}
          onActivate={() => setActiveIdx(i)}
          renderSummary={(d) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
              <strong style={{ minWidth: '12rem' }}>{d.title || '(untitled)'}</strong>
              <span><AuthorsCell authors={d.authors} authorsText={d.authorsText} /></span>
              <span><PublisherCell publisher={d.publisher} publisherText={d.publisherText} /></span>
              <span style={{ color: 'var(--theme-text-dim)' }}>{d.availabilityStatus}</span>
              <span style={{ color: 'var(--theme-text-dim)' }}>
                stock: {d.editions?.[0]?.pricing?.stock ?? '—'}
              </span>
            </div>
          )}
          renderEditor={(d, onClose) => (
            <BookInlineEditor doc={d} onClose={onClose} />
          )}
          onOpenFullEdit={(d) => {
            window.location.href = `/admin/collections/books/${d.id}`
          }}
        />
      ))}
    </div>
  )
}

function BookInlineEditor({ doc, onClose }: { doc: BookDoc; onClose: () => void }) {
  // Minimal stub — see Step 3 for a more capable version.
  return (
    <div style={{ color: 'var(--theme-text-dim)' }}>
      Inline editor for {doc.title} (id: {doc.id}) — coming in next step.
      <button type="button" onClick={onClose} style={{ marginLeft: '1rem' }}>Close</button>
    </div>
  )
}
```

- [ ] **Step 3: Build the inline editor**

Replace `BookInlineEditor` in the same file with:

```tsx
function BookInlineEditor({ doc, onClose }: { doc: BookDoc; onClose: () => void }) {
  const [title, setTitle] = useState(doc.title || '')
  const [stock, setStock] = useState<number>(doc.editions?.[0]?.pricing?.stock ?? 0)
  const [status, setStatus] = useState(doc.availabilityStatus || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const editions = doc.editions ? [...doc.editions] : [{}]
      editions[0] = {
        ...editions[0],
        pricing: { ...(editions[0]?.pricing || {}), stock: Number(stock) },
      }
      const res = await fetch(`/api/books/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, availabilityStatus: status, editions }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      onClose()
      // Refresh the page to show the saved state. Payload's list normally re-fetches; this is a fallback.
      window.location.reload()
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: '0.5rem', maxWidth: '32rem' }}>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} />
      </label>
      <label>
        Stock
        <input
          type="number"
          value={stock}
          onChange={(e) => setStock(Number(e.target.value))}
          disabled={saving}
        />
      </label>
      <label>
        Status
        <input value={status} onChange={(e) => setStatus(e.target.value)} disabled={saving} />
      </label>
      {error && <div style={{ color: 'var(--theme-error-500)' }}>{error}</div>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Register the view on the Books collection**

In `Books.tsx`, modify the `admin` block (around line 65):

```ts
admin: {
  useAsTitle: 'title',
  defaultColumns: ['title', 'authors', 'publisher', 'vendor', 'availabilityStatus', 'isActive', 'isbndbChecked'],
  group: 'Inventory',
  components: {
    views: {
      list: {
        Component: '/app/components/admin/BooksListView',
      },
    },
  },
},
```

(The exact key path — `views.list.Component` vs `views.List` etc. — depends on Step 1's verification.)

- [ ] **Step 5: Regenerate importMap and test**

```bash
pnpm generate:importmap && pnpm dev
```
Visit `/admin/collections/books`. Confirm dense rows render, click one to expand, edit a stock value, click Save — confirm the change persists.

- [ ] **Step 6: Commit**

```bash
git add alkebu-load/src/app/components/admin/BooksListView.tsx \
        alkebu-load/src/collections/Books.tsx \
        alkebu-load/src/app/\(payload\)/admin/importMap.js
git commit -m "feat(admin): dense list view with inline editor for Books"
```

---

## Phase 6 — Customer Foundation

> **⚠️ Coordinated schema change.** This phase rewires `Orders.customer.relationTo` AND adds fields to `Customers`. Run the migration generation step after BOTH collections are updated, then apply once.

### Task 12: Add new fields to `Customers`

**Files:**
- Modify: `alkebu-load/src/collections/Customers.ts`

- [ ] **Step 1: Add `source`, `accountStatus`, `squareCustomerId` field definitions**

In `Customers.ts`, after the `displayName` field block (find by searching for `displayName`), insert:

```ts
{
  name: 'source',
  type: 'select',
  required: true,
  defaultValue: 'manual',
  options: [
    { label: 'E-Commerce', value: 'ecom' },
    { label: 'Point of Sale', value: 'pos' },
    { label: 'Imported', value: 'imported' },
    { label: 'Manual', value: 'manual' },
  ],
  admin: { description: 'Origin channel for this customer record' },
},
{
  name: 'accountStatus',
  type: 'select',
  required: true,
  defaultValue: 'ghost',
  options: [
    { label: 'Ghost (system-created)', value: 'ghost' },
    { label: 'Invited', value: 'invited' },
    { label: 'Active', value: 'active' },
  ],
  admin: { description: 'Login eligibility. Ghost rows cannot log in until they claim the account.' },
},
{
  name: 'squareCustomerId',
  type: 'text',
  unique: true,
  index: true,
  admin: { description: 'Square Customer Directory ID — populated by future POS sync, used as dedupe key' },
},
```

- [ ] **Step 2: Adjust auth config so verify emails don't fire on system creation**

In `Customers.ts`, find the `auth: { ... }` block and change `verify: true` to:

```ts
auth: {
  tokenExpiration: 7200,
  verify: false, // Verification will be handled by self-registration flow when added; ghost rows don't verify
  maxLoginAttempts: 5,
  lockTime: 600000,
},
```

- [ ] **Step 3: Regenerate types**

```bash
cd alkebu-load && pnpm generate:types
```
Expected: `src/payload-types.ts` updates with `source`, `accountStatus`, `squareCustomerId` on the `Customer` type.

- [ ] **Step 4: Type-check**

```bash
pnpm lint
```
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/collections/Customers.ts alkebu-load/src/payload-types.ts
git commit -m "feat(customers): add source, accountStatus, squareCustomerId fields"
```

### Task 13: Rewire `Orders.customer` to `customers`

**Files:**
- Modify: `alkebu-load/src/collections/Orders.ts:34, :492`

- [ ] **Step 1: Update both `relationTo` references**

In `Orders.ts`, find both occurrences of `relationTo: 'users'` on the `customer` field (top-level field around line 32-37 and any nested instance around line 492). Replace each with:

```ts
relationTo: 'customers',
```

(Keep the rest of each field block unchanged.)

- [ ] **Step 2: Regenerate types**

```bash
cd alkebu-load && pnpm generate:types
```

- [ ] **Step 3: Type-check**

```bash
pnpm lint
```
Expected: clean. If `OrderDashboardV2.tsx` or other consumers reference `Order.customer` with Users fields (`displayName`/`firstName`/`lastName`/`email`), those will still typecheck because the `Customers` collection has equivalent fields.

- [ ] **Step 4: Inspect prod for any orders linked to Users**

This is a one-time safety check before applying the migration. Connect to prod (read-only) and run:
```sql
SELECT id, "customer", "guestEmail" FROM orders WHERE "customer" IS NOT NULL LIMIT 100;
```
Expected: zero rows (all current orders are guest checkouts) or only a handful that are clearly test data. If anything substantive shows up, document it and decide before Step 5 whether to null those refs (and let backfill re-link) or migrate them manually.

- [ ] **Step 5: Generate the migration**

```bash
cd alkebu-load && pnpm payload migrate:create
```
Inspect the generated migration file. It should contain DDL renaming the polymorphic relationship target or updating constraints. If the change is non-trivial (Drizzle generates unexpected SQL), review carefully before committing.

- [ ] **Step 6: Apply migration locally**

```bash
pnpm payload migrate
```
Expected: success against local SQLite. Spot-check `/admin/collections/orders` — orders still render, customer relationship now points to `Customers` collection.

- [ ] **Step 7: Commit**

```bash
git add alkebu-load/src/collections/Orders.ts \
        alkebu-load/src/payload-types.ts \
        alkebu-load/src/migrations/
git commit -m "feat(orders): rewire customer relationship from Users to Customers"
```

### Task 14: Build `customerUpsert` helper

**Files:**
- Create: `alkebu-load/src/app/utils/customerUpsert.ts`
- Create: `alkebu-load/tests/customers/customerUpsert.test.ts`

This is a pure helper that takes an order and a payload instance and returns a Customer ID — easy to test.

- [ ] **Step 1: Write failing test**

Create `alkebu-load/tests/customers/customerUpsert.test.ts`:

```ts
import assert from 'node:assert'
import test from 'node:test'

import { upsertCustomerForOrder } from '../../src/app/utils/customerUpsert'

function makePayloadMock() {
  const finds: any[] = []
  const creates: any[] = []
  const customers = new Map<string, any>()
  let idCounter = 1000

  return {
    finds,
    creates,
    customers,
    api: {
      find: async (args: any) => {
        finds.push(args)
        const email = args.where?.email?.equals?.toLowerCase?.()
        if (email && customers.has(email)) {
          return { docs: [customers.get(email)], totalDocs: 1 }
        }
        return { docs: [], totalDocs: 0 }
      },
      create: async (args: any) => {
        creates.push(args)
        const id = idCounter++
        const doc = { id, ...args.data }
        customers.set(args.data.email.toLowerCase(), doc)
        return doc
      },
    },
  }
}

test('returns existing customer when email matches', async () => {
  const m = makePayloadMock()
  m.customers.set('alice@example.com', { id: 42, email: 'alice@example.com' })

  const order = {
    guestEmail: 'alice@example.com',
    shippingAddress: { firstName: 'Alice', lastName: 'Doe' },
  }

  const customerId = await upsertCustomerForOrder(m.api as any, order)

  assert.strictEqual(customerId, 42)
  assert.strictEqual(m.creates.length, 0)
})

test('email matching is case-insensitive', async () => {
  const m = makePayloadMock()
  m.customers.set('alice@example.com', { id: 42, email: 'alice@example.com' })

  const customerId = await upsertCustomerForOrder(m.api as any, {
    guestEmail: 'ALICE@Example.com',
    shippingAddress: { firstName: 'Alice', lastName: 'Doe' },
  })

  assert.strictEqual(customerId, 42)
})

test('creates a new ghost customer when email not found', async () => {
  const m = makePayloadMock()

  const customerId = await upsertCustomerForOrder(m.api as any, {
    guestEmail: 'newbie@example.com',
    shippingAddress: {
      firstName: 'Bob',
      lastName: 'Smith',
      street: '1 Main St',
      city: 'Nashville',
      state: 'TN',
      zip: '37208',
    },
  })

  assert.strictEqual(m.creates.length, 1)
  const created = m.creates[0].data
  assert.strictEqual(created.email, 'newbie@example.com')
  assert.strictEqual(created.firstName, 'Bob')
  assert.strictEqual(created.lastName, 'Smith')
  assert.strictEqual(created.source, 'ecom')
  assert.strictEqual(created.accountStatus, 'ghost')
  assert.ok(typeof created.password === 'string' && created.password.length >= 32)
  assert.strictEqual(typeof customerId, 'number')
})

test('returns null when no email is available', async () => {
  const m = makePayloadMock()
  const customerId = await upsertCustomerForOrder(m.api as any, {})
  assert.strictEqual(customerId, null)
  assert.strictEqual(m.creates.length, 0)
})

test('uses customer email from linked customer when guestEmail is absent', async () => {
  const m = makePayloadMock()
  const customerId = await upsertCustomerForOrder(m.api as any, {
    customer: { email: 'linked@example.com' },
    shippingAddress: { firstName: 'C', lastName: 'D' },
  })
  assert.strictEqual(m.creates.length, 1)
  assert.strictEqual(m.creates[0].data.email, 'linked@example.com')
  assert.strictEqual(typeof customerId, 'number')
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd alkebu-load && pnpm test -- --test-name-pattern='upsertCustomerForOrder|case-insensitive|ghost customer|no email'
```
Expected: FAIL (module does not exist).

- [ ] **Step 3: Implement `customerUpsert.ts`**

Create `alkebu-load/src/app/utils/customerUpsert.ts`:

```ts
import crypto from 'crypto'

type OrderShape = {
  customer?: { email?: string } | string | null
  guestEmail?: string | null
  shippingAddress?: {
    firstName?: string
    lastName?: string
    street?: string
    street2?: string
    city?: string
    state?: string
    zip?: string
    country?: string
    phone?: string
  } | null
}

type PayloadLike = {
  find: (args: { collection: string; where: any; limit?: number }) => Promise<{ docs: any[]; totalDocs: number }>
  create: (args: { collection: string; data: any; disableVerificationEmail?: boolean }) => Promise<{ id: number | string }>
}

function pickEmail(order: OrderShape): string | null {
  if (order.guestEmail) return order.guestEmail
  if (typeof order.customer === 'object' && order.customer?.email) return order.customer.email
  return null
}

export async function upsertCustomerForOrder(
  payload: PayloadLike,
  order: OrderShape,
): Promise<number | string | null> {
  const emailRaw = pickEmail(order)
  if (!emailRaw) return null
  const email = emailRaw.trim().toLowerCase()

  const found = await payload.find({
    collection: 'customers',
    where: { email: { equals: email } },
    limit: 1,
  })
  if (found.docs.length > 0) {
    return found.docs[0].id
  }

  const ship = order.shippingAddress || {}
  const password = crypto.randomBytes(32).toString('hex')

  const created = await payload.create({
    collection: 'customers',
    disableVerificationEmail: true,
    data: {
      email,
      password,
      firstName: ship.firstName || 'Customer',
      lastName: ship.lastName || '',
      source: 'ecom',
      accountStatus: 'ghost',
      addresses: ship.street
        ? [
            {
              street: ship.street,
              street2: ship.street2,
              city: ship.city,
              state: ship.state,
              zip: ship.zip,
              country: ship.country,
              phone: ship.phone,
              isDefault: true,
            },
          ]
        : undefined,
    },
  })

  return created.id
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test -- --test-name-pattern='upsertCustomerForOrder|case-insensitive|ghost customer|no email'
```
Expected: all 5 tests pass.

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
pnpm test
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add alkebu-load/src/app/utils/customerUpsert.ts \
        alkebu-load/tests/customers/customerUpsert.test.ts
git commit -m "feat(customers): add upsertCustomerForOrder helper with unit tests"
```

### Task 15: Build `customerRollups` helper

**Files:**
- Create: `alkebu-load/src/app/utils/customerRollups.ts`
- Create: `alkebu-load/tests/customers/customerRollups.test.ts`

- [ ] **Step 1: Write failing test**

Create `alkebu-load/tests/customers/customerRollups.test.ts`:

```ts
import assert from 'node:assert'
import test from 'node:test'

import { computeCustomerRollups } from '../../src/app/utils/customerRollups'

function makePayloadMock(orders: any[]) {
  const updates: any[] = []
  return {
    updates,
    api: {
      find: async () => ({ docs: orders, totalDocs: orders.length }),
      update: async (args: any) => {
        updates.push(args)
        return { id: args.id, ...args.data }
      },
    },
  }
}

test('counts non-cancelled, non-returned orders', async () => {
  const m = makePayloadMock([
    { id: 1, status: 'paid', totalAmount: 1000, createdAt: '2026-01-01T00:00:00Z' },
    { id: 2, status: 'shipped', totalAmount: 2000, createdAt: '2026-02-01T00:00:00Z' },
    { id: 3, status: 'cancelled', totalAmount: 5000, createdAt: '2026-03-01T00:00:00Z' },
    { id: 4, status: 'returned', totalAmount: 7000, createdAt: '2026-04-01T00:00:00Z' },
    { id: 5, status: 'delivered', totalAmount: 3000, createdAt: '2026-05-01T00:00:00Z' },
  ])

  await computeCustomerRollups(m.api as any, 42)

  assert.strictEqual(m.updates.length, 1)
  const data = m.updates[0].data
  assert.strictEqual(data.totalOrders, 3)
  assert.strictEqual(data.totalSpent, 6000)
  assert.strictEqual(data.lastOrderDate, '2026-05-01T00:00:00Z')
})

test('zero orders produces zero rollups', async () => {
  const m = makePayloadMock([])
  await computeCustomerRollups(m.api as any, 99)
  assert.strictEqual(m.updates.length, 1)
  assert.strictEqual(m.updates[0].data.totalOrders, 0)
  assert.strictEqual(m.updates[0].data.totalSpent, 0)
  assert.strictEqual(m.updates[0].data.lastOrderDate, null)
})

test('writes with disableHooks: true', async () => {
  const m = makePayloadMock([{ id: 1, status: 'paid', totalAmount: 100, createdAt: '2026-01-01T00:00:00Z' }])
  await computeCustomerRollups(m.api as any, 1)
  assert.strictEqual(m.updates[0].context?.disableHooks, true)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- --test-name-pattern='computeCustomerRollups|non-cancelled|zero orders|disableHooks'
```
Expected: FAIL.

- [ ] **Step 3: Implement `customerRollups.ts`**

Create `alkebu-load/src/app/utils/customerRollups.ts`:

```ts
type OrderRow = {
  id: number | string
  status?: string
  totalAmount?: number
  createdAt?: string
}

type PayloadLike = {
  find: (args: any) => Promise<{ docs: OrderRow[]; totalDocs: number }>
  update: (args: any) => Promise<any>
}

const EXCLUDED_STATUSES = new Set(['cancelled', 'returned'])

export async function computeCustomerRollups(
  payload: PayloadLike,
  customerId: number | string,
): Promise<void> {
  const result = await payload.find({
    collection: 'orders',
    where: { customer: { equals: customerId } },
    limit: 1000,
    depth: 0,
  })

  const eligible = result.docs.filter((o) => !EXCLUDED_STATUSES.has(o.status || ''))

  const totalOrders = eligible.length
  const totalSpent = eligible.reduce((sum, o) => sum + (o.totalAmount || 0), 0)
  const lastOrderDate =
    eligible.length === 0
      ? null
      : eligible
          .map((o) => o.createdAt)
          .filter((d): d is string => !!d)
          .sort()
          .pop() || null

  await payload.update({
    collection: 'customers',
    id: customerId,
    data: { totalOrders, totalSpent, lastOrderDate },
    context: { disableHooks: true },
  })
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test -- --test-name-pattern='computeCustomerRollups|non-cancelled|zero orders|disableHooks'
```
Expected: all 3 tests pass.

- [ ] **Step 5: Run full suite**

```bash
pnpm test
```

- [ ] **Step 6: Commit**

```bash
git add alkebu-load/src/app/utils/customerRollups.ts \
        alkebu-load/tests/customers/customerRollups.test.ts
git commit -m "feat(customers): add computeCustomerRollups helper with unit tests"
```

### Task 16: Wire upsert + rollup hooks into `Orders.afterChange`

**Files:**
- Modify: `alkebu-load/src/collections/Orders.ts` (add `hooks` block; verify nothing existing is overwritten)

- [ ] **Step 1: Inspect existing hooks on Orders**

Read the bottom of `alkebu-load/src/collections/Orders.ts`. Find the existing `hooks: { ... }` block if it exists (Orders sends status update emails via `sendOrderStatusUpdate`, so a hook may already be present). Note the existing structure so the new hooks don't break it.

- [ ] **Step 2: Add or extend `hooks.afterChange`**

If `hooks: { afterChange: [...] }` exists, append two new functions. If not, add a fresh `hooks` block before the closing `}` of the collection export:

```ts
hooks: {
  afterChange: [
    // (existing hooks here, if any)
    async ({ doc, req, operation, context }) => {
      if (context?.disableHooks) return

      // 1. Upsert customer if not already linked
      if (!doc.customer || typeof doc.customer === 'string' || typeof doc.customer === 'number') {
        try {
          const { upsertCustomerForOrder } = await import('../app/utils/customerUpsert')
          const customerId = await upsertCustomerForOrder(req.payload, doc)
          if (customerId && (!doc.customer || doc.customer !== customerId)) {
            await req.payload.update({
              collection: 'orders',
              id: doc.id,
              data: { customer: customerId },
              context: { disableHooks: true },
            })
            doc.customer = customerId
          }
        } catch (err) {
          console.error('Order customer upsert failed:', err)
        }
      }

      // 2. Recompute rollups on the linked customer
      const customerId = typeof doc.customer === 'object' ? doc.customer?.id : doc.customer
      if (customerId) {
        try {
          const { computeCustomerRollups } = await import('../app/utils/customerRollups')
          await computeCustomerRollups(req.payload, customerId)
        } catch (err) {
          console.error('Customer rollup recompute failed:', err)
        }
      }
    },
  ],
},
```

- [ ] **Step 3: Type-check**

```bash
pnpm lint
```
Expected: clean.

- [ ] **Step 4: Smoke-test in dev**

```bash
pnpm dev
```
Place a test order in dev (via the storefront or directly creating an order in admin with `guestEmail` set). Confirm:
- A new Customer row is auto-created in `/admin/collections/customers` with the correct email, name, `source: ecom`, `accountStatus: ghost`.
- The order is linked to it.
- The customer's `totalOrders`/`totalSpent`/`lastOrderDate` are populated.

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/collections/Orders.ts
git commit -m "feat(orders): auto-upsert Customer and recompute rollups on afterChange"
```

### Task 17: Write the customer backfill script

**Files:**
- Create: `alkebu-load/scripts/backfill-customers-from-orders.ts`

- [ ] **Step 1: Create the script**

Create `alkebu-load/scripts/backfill-customers-from-orders.ts`:

```ts
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { upsertCustomerForOrder } from '../src/app/utils/customerUpsert'
import { computeCustomerRollups } from '../src/app/utils/customerRollups'

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  const payload = await getPayload({ config: await config })

  const PAGE_SIZE = 100
  let page = 1
  let scanned = 0
  let linked = 0
  let alreadyLinked = 0
  let skippedNoEmail = 0
  let failed = 0
  const customerIds = new Set<number | string>()

  while (true) {
    const result = await payload.find({
      collection: 'orders',
      depth: 0,
      limit: PAGE_SIZE,
      page,
    })
    if (result.docs.length === 0) break

    for (const order of result.docs as any[]) {
      scanned++
      if (order.customer) {
        alreadyLinked++
        customerIds.add(typeof order.customer === 'object' ? order.customer.id : order.customer)
        continue
      }
      if (!order.guestEmail) {
        skippedNoEmail++
        continue
      }

      if (DRY_RUN) {
        console.log(`[dry-run] would upsert customer for order ${order.id} email=${order.guestEmail}`)
        linked++
        continue
      }

      try {
        const customerId = await upsertCustomerForOrder(payload as any, order)
        if (customerId) {
          await payload.update({
            collection: 'orders',
            id: order.id,
            data: { customer: customerId },
            context: { disableHooks: true },
          })
          customerIds.add(customerId)
          linked++
        } else {
          skippedNoEmail++
        }
      } catch (err) {
        failed++
        console.error(`Order ${order.id} backfill failed:`, err)
      }
    }

    if (page * PAGE_SIZE >= result.totalDocs) break
    page++
  }

  // Recompute rollups for every customer touched
  if (!DRY_RUN) {
    console.log(`\nRecomputing rollups for ${customerIds.size} customers...`)
    for (const cid of customerIds) {
      try {
        await computeCustomerRollups(payload as any, cid)
      } catch (err) {
        console.error(`Rollup recompute failed for customer ${cid}:`, err)
      }
    }
  }

  console.log('\n=== Customer Backfill Summary ===')
  console.log(`Mode:                 ${DRY_RUN ? 'DRY RUN' : 'APPLIED'}`)
  console.log(`Orders scanned:       ${scanned}`)
  console.log(`Orders linked:        ${linked}`)
  console.log(`Orders already linked:${alreadyLinked}`)
  console.log(`Skipped (no email):   ${skippedNoEmail}`)
  console.log(`Failed:               ${failed}`)
  console.log(`Customers touched:    ${customerIds.size}`)

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Type-check**

```bash
cd alkebu-load && pnpm check:scripts
```
Expected: clean.

- [ ] **Step 3: Dry-run locally**

```bash
pnpm tsx scripts/backfill-customers-from-orders.ts --dry-run
```
Expected: prints intended actions per order. No DB writes.

- [ ] **Step 4: Apply locally**

```bash
pnpm tsx scripts/backfill-customers-from-orders.ts
```
Expected: applied counts; spot-check `/admin/collections/customers` — should now contain one row per unique guest email from historical orders.

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/scripts/backfill-customers-from-orders.ts
git commit -m "feat(customers): add backfill script linking orders to auto-created Customers"
```

### Task 18: Apply customer foundation on production

Operational step — execute after Phase 6 PR merges.

- [ ] **Step 1: Production DB backup**

(Standard backup procedure.)

- [ ] **Step 2: Apply pending Payload migrations on production**

```bash
pnpm payload migrate
```

- [ ] **Step 3: Dry-run backfill on production**

```bash
pnpm tsx scripts/backfill-customers-from-orders.ts --dry-run
```

- [ ] **Step 4: Apply backfill on production**

```bash
pnpm tsx scripts/backfill-customers-from-orders.ts
```

- [ ] **Step 5: Verify in admin**

`/admin/collections/customers` should be populated. Open one customer; their linked orders should be reachable; rollups should match `SUM(totalAmount)` of their orders for paid/shipped/delivered/completed statuses.

---

## Phase 7 — Dense Rows for Orders

### Task 19: Build `CustomerNameCell` and register on Orders

**Files:**
- Create: `alkebu-load/src/app/components/admin/cells/CustomerNameCell.tsx`
- Modify: `alkebu-load/src/collections/Orders.ts` (the `customer` field admin config)

- [ ] **Step 1: Create the Cell**

Create `alkebu-load/src/app/components/admin/cells/CustomerNameCell.tsx`:

```tsx
'use client'

import React from 'react'
import { getCustomerName } from '../../orderDashboard/customerDisplay'

export function CustomerNameCell(props: any) {
  const order = props?.rowData || props?.row || {}
  return <span>{getCustomerName(order)}</span>
}

export default CustomerNameCell
```

(`props.rowData` and `props.row` are the two Payload v3 conventions; the OR-fallback covers either.)

- [ ] **Step 2: Wire the Cell on the `customer` field**

In `Orders.ts`, update the `customer` field admin block:

```ts
{
  name: 'customer',
  type: 'relationship',
  relationTo: 'customers',
  admin: {
    description: 'Customer who placed the order',
    components: {
      Cell: '/app/components/admin/cells/CustomerNameCell',
    },
  },
},
```

- [ ] **Step 3: Regenerate importMap**

```bash
pnpm generate:importmap
```

- [ ] **Step 4: Visually verify**

```bash
pnpm dev
```
Visit `/admin/collections/orders`. The Customer column should show real names for guest orders (post-backfill: linked Customer's displayName; pre-backfill: shipping name).

- [ ] **Step 5: Commit**

```bash
git add alkebu-load/src/app/components/admin/cells/CustomerNameCell.tsx \
        alkebu-load/src/collections/Orders.ts \
        alkebu-load/src/app/\(payload\)/admin/importMap.js
git commit -m "feat(orders): customer column uses smart name fallback"
```

### Task 20: Build `OrdersListView` with dense rows + inline editor

> **Subject to the same v3 API verification gate as Task 11.** If the list-view replacement API isn't stable, ship Task 19 only and skip this task.

**Files:**
- Create: `alkebu-load/src/app/components/admin/OrdersListView.tsx`
- Modify: `alkebu-load/src/collections/Orders.ts` (admin block)

- [ ] **Step 1: Build the list view with collapsed rows and an inline editor for status + tracking**

Create `alkebu-load/src/app/components/admin/OrdersListView.tsx`:

```tsx
'use client'

import React, { useState } from 'react'
import { DenseRow } from './DenseRow'
import { getCustomerName } from '../orderDashboard/customerDisplay'

type OrderDoc = {
  id: number | string
  orderNumber?: string
  customer?: any
  guestEmail?: string
  shippingAddress?: any
  status?: string
  totalAmount?: number
  createdAt?: string
  tracking?: { number?: string; carrier?: string } | null
}

const STATUS_OPTIONS = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'completed',
  'cancelled',
  'returned',
]

const STATUS_COLOR: Record<string, string> = {
  pending: 'var(--theme-warning-500)',
  paid: 'var(--theme-success-500)',
  processing: 'var(--theme-warning-500)',
  shipped: 'var(--theme-success-500)',
  delivered: 'var(--theme-success-700)',
  completed: 'var(--theme-success-700)',
  cancelled: 'var(--theme-error-500)',
  returned: 'var(--theme-error-500)',
}

export default function OrdersListView(props: any) {
  const docs: OrderDoc[] = props.data?.docs || props.docs || []
  const [activeIdx, setActiveIdx] = useState(-1)

  return (
    <div style={{ padding: '1rem' }}>
      <h1 style={{ marginBottom: '1rem' }}>Orders</h1>
      {docs.map((doc, i) => (
        <DenseRow
          key={doc.id}
          doc={doc}
          index={i}
          isActive={i === activeIdx}
          onActivate={() => setActiveIdx(i)}
          renderSummary={(d) => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem' }}>
              <strong style={{ minWidth: '8rem' }}>{d.orderNumber}</strong>
              <span style={{ minWidth: '12rem' }}>{getCustomerName(d)}</span>
              <StatusPill status={d.status} />
              <span style={{ minWidth: '5rem' }}>${((d.totalAmount || 0) / 100).toFixed(2)}</span>
              <span style={{ color: 'var(--theme-text-dim)' }}>
                {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}
              </span>
            </div>
          )}
          renderEditor={(d, onClose) => <OrderInlineEditor doc={d} onClose={onClose} />}
          onOpenFullEdit={(d) => {
            window.location.href = `/admin/collections/orders/${d.id}`
          }}
        />
      ))}
    </div>
  )
}

function StatusPill({ status }: { status?: string }) {
  if (!status) return <span>—</span>
  return (
    <span
      style={{
        padding: '0.15rem 0.5rem',
        borderRadius: '999px',
        fontSize: '0.75rem',
        background: 'var(--theme-elevation-100)',
        color: STATUS_COLOR[status] || 'var(--theme-text)',
      }}
    >
      {status}
    </span>
  )
}

function OrderInlineEditor({ doc, onClose }: { doc: OrderDoc; onClose: () => void }) {
  const [status, setStatus] = useState(doc.status || 'pending')
  const [trackingNumber, setTrackingNumber] = useState(doc.tracking?.number || '')
  const [carrier, setCarrier] = useState(doc.tracking?.carrier || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/orders/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          tracking: { number: trackingNumber, carrier },
        }),
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`Save failed: ${res.status}`)
      onClose()
      window.location.reload()
    } catch (e: any) {
      setError(e.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: '0.5rem', maxWidth: '32rem' }}>
      <label>
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={saving}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
      <label>
        Tracking number
        <input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} disabled={saving} />
      </label>
      <label>
        Carrier
        <input value={carrier} onChange={(e) => setCarrier(e.target.value)} disabled={saving} />
      </label>
      {error && <div style={{ color: 'var(--theme-error-500)' }}>{error}</div>}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
      </div>
    </div>
  )
}
```

Note: if the actual `Orders` collection lacks a `tracking.number` field, look at how `OrderDashboardV2.tsx` records tracking and mirror that shape — the goal is parity with the existing dashboard workflow.

- [ ] **Step 2: Register the view on the Orders collection**

In `Orders.ts`, update the `admin` block:

```ts
admin: {
  useAsTitle: 'orderNumber',
  defaultColumns: ['orderNumber', 'customer', 'status', 'totalAmount', 'payment.paymentStatus', 'createdAt'],
  group: 'E-Commerce',
  components: {
    views: {
      list: {
        Component: '/app/components/admin/OrdersListView',
      },
    },
  },
},
```

- [ ] **Step 3: Regenerate importMap, visually verify**

```bash
pnpm generate:importmap && pnpm dev
```
Visit `/admin/collections/orders`. Confirm dense rows render, expand one, change status, save — confirm status updates and customer email fires (if email is configured).

- [ ] **Step 4: Commit**

```bash
git add alkebu-load/src/app/components/admin/OrdersListView.tsx \
        alkebu-load/src/collections/Orders.ts \
        alkebu-load/src/app/\(payload\)/admin/importMap.js
git commit -m "feat(admin): dense list view with inline editor for Orders"
```

---

## Phase 8 — Documentation Reconciliation

### Task 21: Reconcile reference docs

**Files:**
- Modify: `docs/architecture.md` (lines 98-103)
- Modify: `docs/PRD.md` (line 182 area; line 202)
- Modify: `docs/STAFF-WORKFLOWS.md` (lines 295-302)

- [ ] **Step 1: Update `docs/architecture.md`**

Replace the Customers block (around lines 98-103):

**Before:**
```
Customers (extended user profiles)
├── user (relationship)
├── addresses[] (shipping)
├── taxExempt boolean
└── orderHistory
```

**After:**
```
Customers (canonical shopper entity, auth-enabled)
├── email, firstName, lastName, displayName
├── addresses[] (shipping)
├── source (ecom | pos | imported | manual)
├── accountStatus (ghost | invited | active)
├── squareCustomerId (dedupe key for future POS sync)
├── taxExempt boolean
└── rollups: totalOrders, totalSpent, lastOrderDate
```

Add a note immediately below the block:

```
Note: `Users` is staff-only (admin/staff/editor). Customers are not Users.
This separation supports centralizing in-store, ecom, and imported customers
in one collection without polluting the staff directory.
```

- [ ] **Step 2: Update `docs/PRD.md`**

At [line 182](../../docs/PRD.md), replace the bullet "Customers - Extended user profiles with addresses, tax status" with:

```
- **Customers** - Canonical shopper entity across all channels (ecom, POS, imported, manual). Auth-enabled with source, account status, and rollup fields (totalOrders, totalSpent, lastOrderDate). Designed to consolidate Square loyalty/marketing data over time.
```

At [line 202](../../docs/PRD.md), update the Users row:

**Before:**
```
- **Users** - Roles: admin, staff, editor, customer
```

**After:**
```
- **Users** - Staff and editor accounts only. Roles: admin, staff, editor. Shoppers live in the Customers collection.
```

- [ ] **Step 3: Update `docs/STAFF-WORKFLOWS.md`**

In the User Roles table (around lines 295-302), remove the `customer` row entirely. Replace it with a note immediately after the table:

```
> Note: customers (shoppers) are tracked in the Customers collection, not Users. Self-registration is a planned future feature; today, customer rows are auto-created from checkout.
```

- [ ] **Step 4: Diff check**

```bash
git diff docs/
```
Read the diff to confirm no unintended changes.

- [ ] **Step 5: Commit**

```bash
git add docs/architecture.md docs/PRD.md docs/STAFF-WORKFLOWS.md
git commit -m "docs: reconcile customer/user model in PRD, architecture, and staff workflows"
```

---

## Self-Review Results

**Spec coverage check** (every section/requirement in the spec mapped to a task):

| Spec section | Task(s) |
|---|---|
| §4.1 Books data mismatch (auto-link + backfill) | Tasks 5, 6, 7, 8 |
| §4.2 DenseRow + Books inline edit | Tasks 9, 10, 11 |
| §4.3 Root URL redirect | Task 1 |
| §4.4(a) Order Dashboard nav link | Tasks 2, 3 |
| §4.4(b) Name fallback fix | Task 4 |
| §4.5(a) Schema rewire | Task 13 |
| §4.5(b) New Customers fields | Task 12 |
| §4.5(c) Upsert hook | Tasks 14, 16 |
| §4.5(d) Ghost auth handling | Task 12 (collection-level `verify: false`) + Task 14 (random password + `disableVerificationEmail`) |
| §4.5(e) Backfill script | Task 17 |
| §4.5(f) Rollup hook | Tasks 15, 16 |
| §4.6 Doc reconciliation | Task 21 |
| §6 Risks | Mitigations called out inline (Task 11/20 API gate, Task 13 pre-check SQL, Task 14 random password, Task 17 dry-run) |
| §7 Verification | Embedded in each task's verify steps + Tasks 8, 18 for prod application |

No gaps.

**Placeholder scan:** none of the red-flag patterns are present. The two "API verification gate" callouts (Tasks 11 and 20) are explicit conditional steps with a fallback path, not TBDs.

**Type consistency check:**
- `getCustomerName(order)` signature is consistent in Task 4 (extracted helper) and Task 19/20 (callers).
- `upsertCustomerForOrder(payload, order)` returns `number | string | null` — consistent across Task 14 (definition), Task 16 (hook), and Task 17 (backfill script).
- `computeCustomerRollups(payload, customerId)` is consistent across Task 15 (definition), Task 16 (hook), and Task 17 (backfill script).
- Cell components use `props.rowData || props.row` to cover both v3 conventions — consistent across `AuthorsCell`, `PublisherCell`, `CustomerNameCell`.

No naming drift detected.
