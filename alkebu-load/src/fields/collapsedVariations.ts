import type { ArrayField, CollapsibleField } from 'payload'

/**
 * A presentation-only wrapper: a collapsible has no persisted name, so the
 * variations array stays at the product root for Square sync and checkout.
 * Keeping the entire section closed also defers the array's row UI until an
 * editor needs it; collapsing individual rows alone still mounts every header.
 */
export function collapsedVariations(field: ArrayField): CollapsibleField {
  return {
    type: 'collapsible',
    label: 'Scent and size variations',
    admin: {
      initCollapsed: true,
      description:
        'Open to edit scents, sizes, prices, and stock. Keep this section closed when editing photos or product details.',
    },
    fields: [field],
  }
}
