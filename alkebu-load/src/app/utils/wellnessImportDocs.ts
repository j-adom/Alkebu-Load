/**
 * Pure document builders for the Square -> Payload wellness/oils importer
 * (scripts/import-wellness-from-square.ts). Split out so they're unit
 * testable without executing that script's main() (which reaches out to a
 * live Square client and Payload instance at module load).
 *
 * The importer's ownership split: Square owns price/stock/variations
 * (and productType); Payload owns name, slug, images, and all marketing copy
 * once a document exists. The CREATE doc seeds name/slug from Square's item
 * name ONCE; the UPDATE doc must never send them again -- doing so would
 * silently revert a staff rename or a hand-edited marketing slug on every
 * re-run, and a reverted slug 404s a URL Google has already indexed.
 */

interface CreateDocParams<V> {
  name: string
  slug: string
  productType: string
  variations: V[]
}

interface UpdateDocParams<V> {
  productType: string
  variations: V[]
}

export function buildWellnessLifestyleCreateDoc<V>(params: CreateDocParams<V>) {
  return {
    name: params.name,
    slug: params.slug,
    productType: params.productType,
    variations: params.variations,
  }
}

export function buildWellnessLifestyleUpdateDoc<V>(params: UpdateDocParams<V>) {
  return {
    productType: params.productType,
    variations: params.variations,
  }
}

export function buildOilsIncenseCreateDoc<V>(params: CreateDocParams<V>) {
  return {
    name: params.name,
    slug: params.slug,
    productType: params.productType,
    variations: params.variations,
  }
}

export function buildOilsIncenseUpdateDoc<V>(params: UpdateDocParams<V>) {
  return {
    productType: params.productType,
    variations: params.variations,
  }
}
