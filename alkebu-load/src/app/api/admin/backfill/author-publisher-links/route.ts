import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { autoLinkAuthors } from '@/app/utils/autoEnrichBook'
import { autoLinkPublisher } from '@/app/utils/autoLinkPublisher'

// Allow up to 5 minutes; backfill iterates the whole Books collection.
export const maxDuration = 300

/**
 * POST /api/admin/backfill/author-publisher-links
 *
 * Backfills `authors` and `publisher` relationships on Books whose
 * `authorsText` / `publisherText` are populated but whose relationships
 * are empty. Mirrors `scripts/backfill-author-publisher-links.ts`, but
 * runs in-process — required because the deployed Next.js standalone
 * container has no `scripts/` directory or `tsx` runtime.
 *
 * Auth: admin only.
 *
 * Query params:
 *   - dryRun=true → no writes, returns the same summary shape with mode=DRY_RUN.
 *
 * Response: JSON summary { mode, scanned, authorsLinked, publishersLinked,
 *   skipped, failed, durationMs }.
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

  const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true'
  const req: any = { payload, user }

  let scanned = 0
  let authorsLinked = 0
  let publishersLinked = 0
  let skipped = 0
  let failed = 0

  const PAGE_SIZE = 100
  let page = 1

  try {
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

        if (dryRun) {
          if (needsAuthors) authorsLinked++
          if (needsPublisher) publishersLinked++
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
          console.error(`Backfill: failed for book ${book.id} (${book.title}):`, err)
        }
      }

      if (page * PAGE_SIZE >= result.totalDocs) break
      page++
    }

    return NextResponse.json({
      mode: dryRun ? 'DRY_RUN' : 'APPLIED',
      scanned,
      authorsLinked,
      publishersLinked,
      skipped,
      failed,
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
          skipped,
          failed,
          durationMs: Date.now() - startedAt,
        },
      },
      { status: 500 },
    )
  }
}
