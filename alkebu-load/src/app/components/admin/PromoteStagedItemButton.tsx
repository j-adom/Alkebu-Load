'use client'

import React, { useState } from 'react'
import { useDocumentInfo, useFormFields } from '@payloadcms/ui'

/** Sidebar control on a Square staging item: publishes a 'ready' item as a Book. */
export const PromoteStagedItemButton: React.FC = () => {
  const { id } = useDocumentInfo()
  const status = useFormFields(([fields]) => fields.reviewStatus?.value) as string | undefined
  const promotedBook = useFormFields(([fields]) => fields.promotedBook?.value) as string | number | undefined
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bookId, setBookId] = useState<string | number | null>(null)

  if (!id) return null

  const linkedBook = bookId ?? promotedBook
  if (linkedBook) {
    return (
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: '0 0 8px' }}>Promoted to a book.</p>
        <a className="btn btn--style-secondary btn--size-small" href={`/admin/collections/books/${linkedBook}`}>
          Open book
        </a>
      </div>
    )
  }

  if (status !== 'ready') {
    return (
      <p style={{ marginBottom: 24, color: 'var(--theme-elevation-500)' }}>
        Promote becomes available once Square supplies a valid ISBN and a price (status “Ready to Promote”).
      </p>
    )
  }

  const promote = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/square-catalog-staging/${id}/promote`, { method: 'POST', credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Promotion failed (${res.status})`)
      setBookId(data.bookId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Promotion failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <button type="button" className="btn btn--style-primary btn--size-small" onClick={promote} disabled={busy}>
        {busy ? 'Promoting…' : 'Promote to book'}
      </button>
      <p style={{ margin: '8px 0 0', color: 'var(--theme-elevation-500)', fontSize: 13 }}>
        Creates a book from this Square item. Check that the title and ISBN aren’t already in the catalog first.
      </p>
      {error && <p style={{ margin: '8px 0 0', color: 'var(--theme-error-500)' }}>{error}</p>}
    </div>
  )
}

export default PromoteStagedItemButton
