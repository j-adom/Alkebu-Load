'use client'

import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

/**
 * Cell for the Books `authors` (hasMany relationship) field.
 *
 * Payload's default relationship Cell shows nothing when the relationship is
 * empty — even if the book has `authorsText` (a free-text fallback array used
 * during catalog imports before the Authors collection was wired up). This
 * Cell prefers the linked relationship names, falls back to the text array
 * (dimmed), and finally shows `—` if both are empty.
 *
 * Signature note: Payload passes `DefaultCellComponentProps` — `cellData` is
 * the field's value (here an array of populated author objects at depth ≥ 1),
 * and `rowData` is the full book document so we can reach sibling fields like
 * `authorsText`.
 */
type Author = { id: number | string; name?: string | null }
type AuthorTextEntry = { name?: string | null }

export const AuthorsCell: React.FC<DefaultCellComponentProps> = ({ cellData, rowData }) => {
  // cellData for a hasMany relationship at depth ≥ 1 is an array of populated
  // author objects. At depth 0 it would be an array of IDs (rendered as #N).
  const linked: Author[] = Array.isArray(cellData) ? cellData : cellData ? [cellData as Author] : []

  const linkedNames = linked
    .map((a) => (typeof a === 'object' && a?.name) || (typeof a === 'object' && a?.id ? `#${a.id}` : null))
    .filter(Boolean) as string[]

  if (linkedNames.length > 0) {
    return <span>{linkedNames.join(', ')}</span>
  }

  const authorsText: AuthorTextEntry[] | undefined = (rowData as any)?.authorsText
  if (Array.isArray(authorsText) && authorsText.length > 0) {
    const fallbackNames = authorsText
      .map((a) => (typeof a?.name === 'string' ? a.name.trim() : null))
      .filter(Boolean) as string[]
    if (fallbackNames.length > 0) {
      return (
        <span style={{ color: 'var(--theme-elevation-400)' }} title="Unlinked text fallback">
          {fallbackNames.join(', ')}
        </span>
      )
    }
  }

  return <span style={{ color: 'var(--theme-elevation-400)' }}>—</span>
}

export default AuthorsCell
