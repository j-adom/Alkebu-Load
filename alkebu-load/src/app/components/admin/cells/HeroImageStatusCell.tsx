'use client'

import React from 'react'
import type { DefaultCellComponentProps } from 'payload'

/**
 * Cell for the WellnessLifestyle / OilsIncense `heroImage` field.
 *
 * Only ~6% of the imported Square wellness catalog has any photo, and for
 * most of the 46 product lines a missing `heroImage` is the single thing
 * blocking `publishOnline`. Payload's default upload-field Cell just links
 * to (or omits) the related Media doc, which doesn't answer "is this ready
 * to publish?" at a glance. This Cell makes that state visible directly in
 * the list view:
 *
 *   - set   -> thumbnail (when the linked Media doc has a `url`) or a plain
 *              "✓ Photo" when populated but the URL isn't available yet
 *   - unset -> "📷 Missing" in a warning color, so staff can filter/scan for
 *              exactly the products that need a photo shoot
 *
 * Matches the AuthorsCell / PublisherCell / OrderCustomerCell pattern.
 */
type LinkedMedia = {
  id?: number | string
  url?: string | null
  alt?: string | null
}

export const HeroImageStatusCell: React.FC<DefaultCellComponentProps> = ({ cellData }) => {
  // For an upload (single) relationship, cellData is the populated Media
  // object at depth >= 1, or just an id at depth 0. Either way, a truthy
  // value means the relationship is set.
  if (cellData && typeof cellData === 'object') {
    const media = cellData as LinkedMedia
    if (media.url) {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <img
            src={media.url}
            alt={media.alt || ''}
            style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: 4 }}
          />
          <span>Photo</span>
        </span>
      )
    }
    return <span>✓ Photo</span>
  }

  if (cellData) {
    return <span>✓ Photo</span>
  }

  return (
    <span
      style={{ color: 'var(--theme-error-500, #d4380d)', fontWeight: 500 }}
      title="No hero image uploaded — blocks publishOnline"
    >
      📷 Missing
    </span>
  )
}

export default HeroImageStatusCell
