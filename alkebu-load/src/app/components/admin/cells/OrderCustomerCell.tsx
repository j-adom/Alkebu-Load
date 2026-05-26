'use client'

import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

/**
 * Cell for the Orders `customer` (single relationship) field.
 *
 * Payload's default relationship Cell renders a link to the related Customer
 * doc when present and falls back to nothing when the field is empty. Post
 * Phase 6, every new order auto-links its customer, but historical guest
 * orders (and any orders where upsert failed) sit with `customer = null`
 * and `guestEmail` set. This Cell:
 *
 *   - linked customer → displayName → firstName+lastName → email → #id
 *   - unlinked        → guestEmail (dimmed, "Guest checkout" tooltip)
 *   - neither         → em-dash
 *
 * Matches the AuthorsCell / PublisherCell pattern from Phase 5.
 */
type LinkedCustomer = {
  id?: number | string
  displayName?: string | null
  firstName?: string | null
  lastName?: string | null
  email?: string | null
}

function resolveLinkedName(c: LinkedCustomer): string | null {
  if (c.displayName) return c.displayName.trim() || null
  const composed = `${c.firstName || ''} ${c.lastName || ''}`.trim()
  if (composed) return composed
  if (c.email) return c.email
  if (c.id != null) return `#${c.id}`
  return null
}

export const OrderCustomerCell: React.FC<DefaultCellComponentProps> = ({ cellData, rowData }) => {
  if (cellData && typeof cellData === 'object') {
    const name = resolveLinkedName(cellData as LinkedCustomer)
    if (name) return <span>{name}</span>
  }

  const guestEmail = (rowData as { guestEmail?: string | null } | undefined)?.guestEmail
  if (typeof guestEmail === 'string' && guestEmail.trim()) {
    return (
      <span style={{ color: 'var(--theme-elevation-400)' }} title="Guest checkout (no linked customer)">
        {guestEmail.trim()}
      </span>
    )
  }

  return <span style={{ color: 'var(--theme-elevation-400)' }}>—</span>
}

export default OrderCustomerCell
