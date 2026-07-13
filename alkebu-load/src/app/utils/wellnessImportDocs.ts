/**
 * Pure document builders for the Square -> Payload wellness/oils importer
 * (scripts/import-wellness-from-square.ts). Split out so they're unit
 * testable without executing that script's main() (which reaches out to a
 * live Square client and Payload instance at module load).
 *
 * The importer's ownership split: Square owns price/stock/variations;
 * Payload owns name, slug, productType, images, and all marketing copy once a
 * document exists. The CREATE doc seeds name/slug/productType from Square's
 * item name/category ONCE; the UPDATE doc must never send any of them again.
 *
 * name/slug: sending them on every update would silently revert a staff
 * rename or a hand-edited marketing slug, and a reverted slug 404s a URL
 * Google has already indexed.
 *
 * productType: on OilsIncense it IS the storefront-section selector
 * (fragrance-oil -> health-and-beauty; incense-pack/sage-bundle/palo-santo ->
 * home-goods -- see resolveOilsIncenseShopSection). matchProductLine()'s name
 * heuristics sometimes misdetect it (e.g. a sage bundle read as a
 * fragrance-oil); a staff member correcting that in admin gets silently
 * reverted on the next import if productType is part of the update payload --
 * same failure mode as the name/slug revert, and it 404s an indexed URL too.
 */

interface CreateDocParams<V> {
  name: string
  slug: string
  productType: string
  variations: V[]
}

interface UpdateDocParams<V> {
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
    variations: params.variations,
  }
}
