import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { autoLinkAuthors } from '@/app/utils/autoEnrichBook'
import { autoLinkPublisher } from '@/app/utils/autoLinkPublisher'

// Hint only; not enforced outside Vercel runtime. The route enforces its
// own wall-clock budget via ?timeoutMs (default 60s) below.
export const maxDuration = 300

const PAGE_SIZE = 100
const DEFAULT_LINK_LIMIT = 200
const DEFAULT_WALL_TIMEOUT_MS = 60_000
const PER_BOOK_TIMEOUT_MS = 10_000

/**
 * Wrap a promise with a wall-clock timeout. Used per-book so a single
 * misbehaving record cannot hang the whole route.
 */
async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timeout: ${label} exceeded ${ms}ms`)), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * POST /api/admin/backfill/author-publisher-links
 *
 * Bounded, resumable backfill. Each call:
 *   - links up to `limit` books (default 200), then returns
 *   - bails after `timeoutMs` wall-clock (default 60_000), even mid-page
 *   - bounds each helper call to PER_BOOK_TIMEOUT_MS so one bad record
 *     can't hang the route
 *
 * Auth: admin role required.
 * Query params:
 *   - dryRun=true → no writes
 *   - limit=N → max books to LINK per call (default 200)
 *   - timeoutMs=M → wall-clock budget for this call (default 60000)
 *
 * Repeated calls are safe and idempotent. Call until `done: true`.
 */
export async function POST(request: NextRequest) {
  const startedAt = Date.now()
  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: request.headers })
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  if ((user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const dryRun = params.get('dryRun') === 'true'
  const linkLimit = Math.max(1, parseInt(params.get('limit') || `${DEFAULT_LINK_LIMIT}`, 10))
  const wallTimeoutMs = Math.max(5_000, parseInt(params.get('timeoutMs') || `${DEFAULT_WALL_TIMEOUT_MS}`, 10))
  const deadline = startedAt + wallTimeoutMs

  // context.skipEnrichment tells Books.beforeValidate to bypass the slow
  // external-API enrichment path (ISBNdb / Google Books). The link helpers
  // propagate this req — and therefore its context — to their payload.update
  // calls, so downstream hooks see the flag.
  const req: any = { payload, user, context: { skipEnrichment: true } }

  let scanned = 0
  let authorsLinked = 0
  let publishersLinked = 0
  let linkedBooks = 0
  let skipped = 0
  let failed = 0
  let totalDocs = 0
  let stoppedReason: 'completed' | 'wallTimeout' | 'linkLimit' = 'completed'

  let page = 1
  try {
    paginate: while (true) {
      if (Date.now() >= deadline) { stoppedReason = 'wallTimeout'; break }

      // depth: 0 — we only need raw FK columns and text fields; populating
      // relationship objects on every book is expensive on remote Postgres
      // and isn't needed for the needsAuthors / needsPublisher predicates.
      const result = await payload.find({
        collection: 'books',
        depth: 0,
        limit: PAGE_SIZE,
        page,
      })
      totalDocs = result.totalDocs

      if (result.docs.length === 0) break

      for (const book of result.docs as any[]) {
        if (Date.now() >= deadline) { stoppedReason = 'wallTimeout'; break paginate }
        if (linkedBooks >= linkLimit) { stoppedReason = 'linkLimit'; break paginate }
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

        if (dryRun) {
          if (needsAuthors) authorsLinked++
          if (needsPublisher) publishersLinked++
          linkedBooks++
          continue
        }

        try {
          if (needsAuthors) {
            await withTimeout(autoLinkAuthors(book, req), PER_BOOK_TIMEOUT_MS, `authors:${book.id}`)
            authorsLinked++
          }
          if (needsPublisher) {
            await withTimeout(autoLinkPublisher(book, req), PER_BOOK_TIMEOUT_MS, `publisher:${book.id}`)
            publishersLinked++
          }
          linkedBooks++
        } catch (err) {
          failed++
          console.error(`Backfill: failed for book ${book.id} (${book.title}):`, err)
        }
      }

      if (page * PAGE_SIZE >= result.totalDocs) break
      page++
    }

    const done = stoppedReason === 'completed' && scanned >= totalDocs

    return NextResponse.json({
      mode: dryRun ? 'DRY_RUN' : 'APPLIED',
      scanned,
      authorsLinked,
      publishersLinked,
      linkedBooks,
      skipped,
      failed,
      totalDocs,
      done,
      stoppedReason,
      durationMs: Date.now() - startedAt,
    })
  } catch (err) {
    console.error('Backfill: fatal error', err)
    return NextResponse.json(
      {
        error: 'Backfill aborted',
        message: err instanceof Error ? err.message : String(err),
        partial: {
          mode: dryRun ? 'DRY_RUN' : 'APPLIED',
          scanned,
          authorsLinked,
          publishersLinked,
          linkedBooks,
          skipped,
          failed,
          totalDocs,
          durationMs: Date.now() - startedAt,
        },
      },
      { status: 500 },
    )
  }
}
