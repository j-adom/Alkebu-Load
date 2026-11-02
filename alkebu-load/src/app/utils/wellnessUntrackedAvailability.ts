// One-off cleanup for wellness/oils variations Square doesn't track inventory for.
// Square never sends counts for them, so their stock sits at the importer's default 0
// and the storefront showed them sold out. The owner's rule: an untracked variation that
// sold in Square within the window is available; one that didn't is unavailable until a
// human reviews it. Tracked variations only get trackInventory: true and keep everything
// else (stock still comes from the inventory webhook).
//
// planUntrackedAvailability is pure (unit-tested); the two fetchers are the only Square I/O,
// used by scripts/wellness-untracked-availability.ts.

import { resolveSquareTrackInventory } from './wellnessImportPlan'

export interface AvailabilityVariation {
  sku?: string | null
  scent?: string | null
  variantName?: string | null
  squareVariationId?: string | null
  isAvailable?: boolean | null
  trackInventory?: boolean | null
  [key: string]: unknown
}

export interface AvailabilityDoc {
  id: string | number
  name?: string | null
  slug?: string | null
  variations?: AvailabilityVariation[] | null
}

export interface ProductAvailabilityCounts {
  variations: number
  tracked: number
  untracked: number
  soldAvailable: number // untracked, sold in window -> isAvailable true
  scentSoldAvailable: number // untracked, unsold, but another size of its scent sold -> isAvailable true
  unsoldUnavailable: number // untracked, no size of its scent sold in window -> isAvailable false
  notInSquare: number // no squareVariationId, or Square no longer has it: left untouched
  unchanged: number // rows whose stored values already match the plan
}

export interface ReviewRow {
  product: string
  scent: string
  size: string
  sku: string
  lastSold: string
  isAvailable: boolean
}

export interface ProductAvailabilityPlan {
  collection: string
  doc: AvailabilityDoc
  variations: AvailabilityVariation[]
  changed: boolean
  counts: ProductAvailabilityCounts
  review: ReviewRow[]
}

/**
 * @param tracking squareVariationId -> whether Square tracks it (missing = not in Square)
 * @param sold     squareVariationId -> ISO date of the latest completed sale in the window
 *
 * Availability goes by scent (the owner's rule): if any size of a scent sold in the window,
 * every untracked size of that scent is available. Square's per-size records are
 * unreliable, so one size selling shows the scent is stocked.
 */
export function planUntrackedAvailability(
  collection: string,
  doc: AvailabilityDoc,
  tracking: Map<string, boolean>,
  sold: Map<string, string>,
): ProductAvailabilityPlan {
  const counts: ProductAvailabilityCounts = {
    variations: 0,
    tracked: 0,
    untracked: 0,
    soldAvailable: 0,
    scentSoldAvailable: 0,
    unsoldUnavailable: 0,
    notInSquare: 0,
    unchanged: 0,
  }
  const review: ReviewRow[] = []
  const product = doc.name || doc.slug || String(doc.id)
  const scentKey = (row: AvailabilityVariation) => (row.scent ?? '').trim().toLowerCase()
  const scentLastSold = new Map<string, string>()
  for (const row of doc.variations ?? []) {
    const date = row.squareVariationId ? sold.get(row.squareVariationId) : undefined
    const key = scentKey(row)
    if (date && key && (scentLastSold.get(key) ?? '') < date) scentLastSold.set(key, date)
  }

  const variations = (doc.variations ?? []).map((row) => {
    counts.variations += 1
    const id = row.squareVariationId || ''
    const isTracked = id ? tracking.get(id) : undefined

    if (isTracked === undefined) {
      counts.notInSquare += 1
      counts.unchanged += 1
      return row
    }

    let next: AvailabilityVariation
    if (isTracked) {
      counts.tracked += 1
      next = { ...row, trackInventory: true }
    } else {
      counts.untracked += 1
      const lastSold = sold.get(id) ?? scentLastSold.get(scentKey(row))
      const isAvailable = lastSold !== undefined
      if (sold.has(id)) counts.soldAvailable += 1
      else if (isAvailable) counts.scentSoldAvailable += 1
      else counts.unsoldUnavailable += 1
      next = { ...row, trackInventory: false, isAvailable }
      review.push({
        product,
        scent: row.scent ?? '',
        size: row.variantName ?? '',
        sku: row.sku ?? '',
        lastSold: lastSold ? lastSold.slice(0, 10) : '',
        isAvailable,
      })
    }

    // A missing trackInventory is stored as the default (true) once Postgres has the
    // column, so treat it that way when deciding whether the row actually changes.
    const same =
      (row.trackInventory ?? true) === next.trackInventory &&
      (row.isAvailable ?? true) === (next.isAvailable ?? true)
    if (same) counts.unchanged += 1
    return next
  })

  return {
    collection,
    doc,
    variations,
    changed: counts.unchanged < counts.variations,
    counts,
    review,
  }
}

const CATALOG_BATCH = 1000 // Square BatchRetrieveCatalogObjects limit
const LOCATIONS_PER_SEARCH = 10 // SearchOrders accepts at most 10 location ids
const ORDERS_PAGE = 500

/** squareVariationId -> track_inventory (location override for `locationId` wins). */
export async function fetchVariationTracking(
  client: any,
  variationIds: string[],
  locationId?: string,
): Promise<Map<string, boolean>> {
  const tracking = new Map<string, boolean>()
  const unique = [...new Set(variationIds.filter(Boolean))]
  for (let i = 0; i < unique.length; i += CATALOG_BATCH) {
    const response = await client.catalog.batchGet({
      objectIds: unique.slice(i, i + CATALOG_BATCH),
      includeRelatedObjects: false,
    })
    for (const obj of response?.objects ?? []) {
      if (obj?.type !== 'ITEM_VARIATION' || !obj.id || obj.isDeleted) continue
      tracking.set(obj.id, resolveSquareTrackInventory(obj.itemVariationData, locationId))
    }
  }
  return tracking
}

/** catalog_object_id -> latest closed_at among COMPLETED orders closed since `sinceIso`, all locations. */
export async function fetchSoldVariationIds(
  client: any,
  sinceIso: string,
): Promise<{ sold: Map<string, string>; orders: number; locations: number }> {
  const locationsResponse = await client.locations.list()
  const locationIds: string[] = (locationsResponse?.locations ?? []).map((l: any) => l?.id).filter(Boolean)
  const sold = new Map<string, string>()
  let orders = 0

  for (let i = 0; i < locationIds.length; i += LOCATIONS_PER_SEARCH) {
    let cursor: string | undefined
    do {
      const response = await client.orders.search({
        locationIds: locationIds.slice(i, i + LOCATIONS_PER_SEARCH),
        query: {
          filter: {
            stateFilter: { states: ['COMPLETED'] },
            dateTimeFilter: { closedAt: { startAt: sinceIso } },
          },
          sort: { sortField: 'CLOSED_AT', sortOrder: 'ASC' },
        },
        limit: ORDERS_PAGE,
        ...(cursor ? { cursor } : {}),
      })
      for (const order of response?.orders ?? []) {
        orders += 1
        const closedAt: string = order?.closedAt ?? order?.createdAt ?? ''
        for (const item of order?.lineItems ?? []) {
          const id = item?.catalogObjectId
          if (!id) continue
          const previous = sold.get(id)
          if (!previous || closedAt > previous) sold.set(id, closedAt)
        }
      }
      cursor = response?.cursor || undefined
    } while (cursor)
  }

  return { sold, orders, locations: locationIds.length }
}
