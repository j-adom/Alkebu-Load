'use client'

import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

/**
 * Cell for the Books `publisher` (single relationship) field.
 *
 * Prefers the linked Publishers.name, falls back to the book's free-text
 * `publisherText` (dimmed), and finally `—` if both are empty.
 *
 * See AuthorsCell for the signature rationale.
 */
type Publisher = { id: number | string; name?: string | null }

export const PublisherCell: React.FC<DefaultCellComponentProps> = ({ cellData, rowData }) => {
  // For a single relationship at depth ≥ 1 cellData is the populated object;
  // at depth 0 it's an id (number/string).
  if (cellData && typeof cellData === 'object' && (cellData as Publisher).name) {
    return <span>{(cellData as Publisher).name}</span>
  }

  const publisherText: string | undefined = (rowData as any)?.publisherText
  if (typeof publisherText === 'string' && publisherText.trim()) {
    return (
      <span style={{ color: 'var(--theme-elevation-400)' }} title="Unlinked text fallback">
        {publisherText.trim()}
      </span>
    )
  }

  return <span style={{ color: 'var(--theme-elevation-400)' }}>—</span>
}

export default PublisherCell
