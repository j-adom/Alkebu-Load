import { createOrFindPublisher } from './publisherManager'

/**
 * Link a book's free-text `publisherText` to a `Publishers` relationship.
 * Mirrors `autoLinkAuthors`: idempotent (no-op if already linked or no text),
 * safe to call from an `afterChange` hook and from the backfill script.
 */
export async function autoLinkPublisher(doc: any, req: any) {
  if (doc.publisher) return
  const name = (doc.publisherText || '').trim()
  if (!name) return

  try {
    // createOrFindPublisher(payload, req, name) -> publisher id string | null
    const publisherId = await createOrFindPublisher(req.payload, req, name)
    if (publisherId) {
      await req.payload.update({
        collection: 'books',
        id: doc.id,
        data: { publisher: publisherId },
      })
      console.log(`  🔗 Linked publisher "${name}" → id ${publisherId} for book: ${doc.title}`)
    }
  } catch (error) {
    console.error('Error during auto-linking publisher:', error)
  }
}
