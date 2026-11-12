'use client'

// Admin view at /admin/ingram-review: pending Ingram enrichment proposals, current vs
// proposed, with accept/reject per field and bulk accept by field type.
import React, { useCallback, useEffect, useMemo, useState } from 'react'

type ReviewRow = {
  id: string | number
  book: { id: string | number; title?: string } | string | number
  fieldPath: string
  path: string
  editionIsbn?: string
  currentValue: unknown
  proposedValue: unknown
  reason?: string
}

function lexicalText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''
  const n = node as Record<string, unknown>
  if (typeof n.text === 'string') return n.text
  if (n.root) return lexicalText(n.root)
  if (Array.isArray(n.children)) {
    const sep = n.type === 'root' ? '\n\n' : ' '
    return n.children.map(lexicalText).filter(Boolean).join(sep)
  }
  return ''
}

export function displayValue(stored: unknown, path: string): string {
  // Stored wrapped as { value } (see applyEnrichment.wrapValue).
  const value =
    stored && typeof stored === 'object' && !Array.isArray(stored) && 'value' in stored
      ? (stored as { value: unknown }).value
      : stored
  if (value === null || value === undefined || value === '') return '—'
  if (path === 'description') return lexicalText(value) || '—'
  if (path === 'pricing.retailPrice' || path === 'pricing.wholesalePrice') {
    const n = Number(value)
    return Number.isFinite(n) ? `$${(n / 100).toFixed(2)}` : String(value)
  }
  if (Array.isArray(value)) {
    return value.map((v: any) => (typeof v === 'string' ? v : (v?.subject ?? v?.name ?? JSON.stringify(v)))).join('; ')
  }
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const cell: React.CSSProperties = {
  padding: '10px 12px',
  borderBottom: '1px solid var(--theme-elevation-100)',
  verticalAlign: 'top',
  fontSize: 13,
}

const valueBox: React.CSSProperties = { whiteSpace: 'pre-wrap', maxHeight: 180, overflow: 'auto', maxWidth: 420 }

const IngramEnrichmentReview: React.FC = () => {
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    const params = new URLSearchParams({
      'where[state][equals]': 'pending',
      limit: '100',
      depth: '1',
      sort: 'createdAt',
    })
    if (filter) params.set('where[path][equals]', filter)
    const res = await fetch(`/api/ingram-enrichment-review?${params.toString()}`, { credentials: 'include' })
    if (!res.ok) {
      setMessage(`Could not load proposals (${res.status})`)
      return
    }
    const data = await res.json()
    setRows(data.docs ?? [])
    setTotal(data.totalDocs ?? 0)
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  const paths = useMemo(() => [...new Set(rows.map((r) => r.path))].sort(), [rows])

  const act = async (id: string | number, action: 'accept' | 'reject') => {
    setBusy(String(id))
    setMessage(null)
    try {
      const res = await fetch(`/api/ingram-enrichment-review/${id}/${action}`, { method: 'POST', credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `${action} failed (${res.status})`)
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : `${action} failed`)
    } finally {
      setBusy(null)
    }
  }

  const bulkAccept = async () => {
    if (!filter) return
    if (!window.confirm(`Accept every pending "${filter}" proposal?`)) return
    setBusy('bulk')
    setMessage(null)
    try {
      const res = await fetch('/api/ingram-enrichment-review/bulk-accept', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filter }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `Bulk accept failed (${res.status})`)
      setMessage(`Accepted ${data.accepted}; ${data.failed} could not be applied (changed since proposed).`)
      await load()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Bulk accept failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div style={{ padding: '32px 48px' }}>
      <h1 style={{ marginBottom: 4 }}>Ingram enrichment review</h1>
      <p style={{ color: 'var(--theme-elevation-500)', marginTop: 0 }}>
        {total} pending proposal{total === 1 ? '' : 's'}. Accepting writes the proposed value and marks it as
        Ingram-sourced. Rejecting stops the same proposal coming back.
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', margin: '16px 0' }}>
        <label>
          Field:{' '}
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All fields</option>
            {[...new Set([...paths, filter].filter(Boolean))].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="btn btn--style-secondary btn--size-small"
          disabled={!filter || busy !== null}
          onClick={bulkAccept}
        >
          Accept all {filter || '(pick a field)'}
        </button>
      </div>

      {message && <p style={{ color: 'var(--theme-error-500)' }}>{message}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <th style={cell}>Book</th>
            <th style={cell}>Field</th>
            <th style={cell}>Current</th>
            <th style={cell}>Proposed (Ingram)</th>
            <th style={cell} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const book = typeof row.book === 'object' ? row.book : { id: row.book, title: undefined }
            return (
              <tr key={row.id}>
                <td style={cell}>
                  <a href={`/admin/collections/books/${book.id}`}>{book.title || `Book ${book.id}`}</a>
                  {row.editionIsbn && <div style={{ color: 'var(--theme-elevation-500)' }}>{row.editionIsbn}</div>}
                </td>
                <td style={cell}>
                  {row.path}
                  {row.reason && <div style={{ color: 'var(--theme-elevation-500)' }}>{row.reason}</div>}
                </td>
                <td style={cell}>
                  <div style={valueBox}>{displayValue(row.currentValue, row.path)}</div>
                </td>
                <td style={cell}>
                  <div style={valueBox}>{displayValue(row.proposedValue, row.path)}</div>
                </td>
                <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    className="btn btn--style-primary btn--size-small"
                    disabled={busy !== null}
                    onClick={() => act(row.id, 'accept')}
                  >
                    Accept
                  </button>{' '}
                  <button
                    type="button"
                    className="btn btn--style-secondary btn--size-small"
                    disabled={busy !== null}
                    onClick={() => act(row.id, 'reject')}
                  >
                    Reject
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p>Nothing to review.</p>}
    </div>
  )
}

export default IngramEnrichmentReview
