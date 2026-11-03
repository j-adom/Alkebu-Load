/**
 * Plans the Square fill-in for poured-to-order Scented Oil (scripts/oils-fill-square-sizes.ts).
 * Pure. Each scent is one Square item ("<Scent> Scented Oil") whose variations are bottle
 * sizes; any scent can be poured into any bottle, so every item should carry every
 * standard size. This lists the missing ones, priced from the standard price for the size
 * and cloned from one of the item's own sizes (locations, tracking). A standard size
 * that exists but has no price (entered without one) gets the standard price and nothing
 * else changed. Any other off-standard price is only reported.
 */

/** Verified 2026-11-02: every existing variation of each size carries exactly this price. */
export const STANDARD_OIL_SIZES: ReadonlyArray<{ name: string; cents: number }> = [
  { name: '1/4 oz', cents: 500 },
  { name: '1/2 oz', cents: 1000 },
  { name: 'Roll-on', cents: 800 },
  { name: '1 oz', cents: 1500 },
  { name: '2 oz', cents: 2500 },
];

const key = (value: unknown) => (typeof value === 'string' ? value.trim().toLowerCase() : '');

export type OilItem = {
  id: string;
  isDeleted?: boolean;
  presentAtAllLocations?: boolean;
  presentAtLocationIds?: string[];
  itemData?: {
    name?: string;
    itemOptions?: Array<{ itemOptionId?: string }>;
    variations?: Array<{
      id?: string;
      isDeleted?: boolean;
      presentAtAllLocations?: boolean;
      presentAtLocationIds?: string[];
      itemVariationData?: {
        name?: string;
        priceMoney?: { amount?: bigint | number; currency?: string };
        trackInventory?: boolean;
        locationOverrides?: Array<{ locationId?: string; trackInventory?: boolean }>;
      };
    }>;
  };
};

export type SizeAddition = {
  itemId: string;
  itemName: string;
  size: string;
  cents: number;
  currency: string;
  presentAtAllLocations: boolean;
  presentAtLocationIds: string[];
  locationIds: string[];
  /** Set when the item uses a Square item option ("Volume"): Square requires it on every variation. */
  itemOptionValues?: Array<{ itemOptionId: string; itemOptionValueId: string }>;
};

/** Square item option id -> its values by name (trimmed, lower-cased) -> value id. */
export type OptionValueIndex = ReadonlyMap<string, ReadonlyMap<string, string>>;

export type PriceFix = { itemName: string; size: string; cents: number; variation: any };

export type OilFillPlan = {
  additions: SizeAddition[];
  priceFixes: PriceFix[];
  priceMismatches: Array<{ itemName: string; size: string; cents: number; standard: number }>;
  nonStandard: Array<{ itemName: string; name: string }>;
  skippedNoTemplate: string[];
  skippedNoOptionValue: string[];
  counts: { items: number; complete: number; toFill: number; additions: number; priceFixes: number; bySize: Record<string, number> };
};

export function isScentedOilItem(item: OilItem): boolean {
  return !item.isDeleted && /\s+scented oil$/i.test(item.itemData?.name ?? '');
}

export function planOilSizeFill(items: OilItem[], optionValues: OptionValueIndex = new Map()): OilFillPlan {
  const plan: OilFillPlan = {
    additions: [],
    priceFixes: [],
    priceMismatches: [],
    nonStandard: [],
    skippedNoTemplate: [],
    skippedNoOptionValue: [],
    counts: { items: 0, complete: 0, toFill: 0, additions: 0, priceFixes: 0, bySize: {} },
  };

  for (const item of items.filter(isScentedOilItem)) {
    plan.counts.items++
    const itemName = item.itemData?.name ?? item.id;
    const live = (item.itemData?.variations ?? []).filter((v) => !v.isDeleted);
    const have = new Set<string>();
    for (const variation of live) {
      const name = variation.itemVariationData?.name ?? '';
      const standard = STANDARD_OIL_SIZES.find((size) => key(size.name) === key(name));
      if (!standard) {
        plan.nonStandard.push({ itemName, name });
        continue;
      }
      have.add(key(standard.name));
      const cents = Number(variation.itemVariationData?.priceMoney?.amount ?? 0);
      if (cents === 0) plan.priceFixes.push({ itemName, size: standard.name, cents: standard.cents, variation });
      else if (cents !== standard.cents) plan.priceMismatches.push({ itemName, size: standard.name, cents, standard: standard.cents });
    }

    const missing = STANDARD_OIL_SIZES.filter((size) => !have.has(key(size.name)));
    if (missing.length === 0) {
      plan.counts.complete++;
      continue;
    }
    // Clone placement and tracking from one of the item's own standard sizes, else any
    // variation it has. An item with no variation at all has nothing safe to copy.
    const template =
      live.find((v) => STANDARD_OIL_SIZES.some((size) => key(size.name) === key(v.itemVariationData?.name))) ?? live[0];
    if (!template) {
      plan.skippedNoTemplate.push(itemName);
      continue;
    }
    // Items built on a Square item option need each new size's option value. Exact names
    // only ("2 oz", not the stray "2oz"); an item missing one is skipped, not guessed.
    const optionIds = (item.itemData?.itemOptions ?? []).map((o) => o.itemOptionId).filter((id): id is string => !!id);
    const optionFor = (size: string) => {
      const values: Array<{ itemOptionId: string; itemOptionValueId: string }> = [];
      for (const itemOptionId of optionIds) {
        const itemOptionValueId = optionValues.get(itemOptionId)?.get(key(size));
        if (!itemOptionValueId) return null;
        values.push({ itemOptionId, itemOptionValueId });
      }
      return values;
    };
    if (missing.some((size) => optionFor(size.name) === null)) {
      plan.skippedNoOptionValue.push(itemName);
      continue;
    }
    plan.counts.toFill++;
    const presentAtAllLocations = template.presentAtAllLocations ?? item.presentAtAllLocations ?? false;
    const presentAtLocationIds = template.presentAtLocationIds ?? item.presentAtLocationIds ?? [];
    const locationIds = presentAtAllLocations
      ? (template.itemVariationData?.locationOverrides ?? []).map((o) => o.locationId).filter((id): id is string => !!id)
      : presentAtLocationIds;
    for (const size of missing) {
      plan.additions.push({
        itemId: item.id,
        itemName,
        size: size.name,
        cents: size.cents,
        currency: template.itemVariationData?.priceMoney?.currency ?? 'USD',
        presentAtAllLocations,
        presentAtLocationIds,
        locationIds,
        ...(optionIds.length > 0 ? { itemOptionValues: optionFor(size.name)! } : {}),
      });
      plan.counts.bySize[size.name] = (plan.counts.bySize[size.name] ?? 0) + 1;
    }
  }
  plan.counts.additions = plan.additions.length;
  plan.counts.priceFixes = plan.priceFixes.length;
  return plan;
}

/** The Square catalog object for one addition: untracked, fixed price, sold where the item is. */
export function squareVariationFor(addition: SizeAddition, tempId: string) {
  return {
    type: 'ITEM_VARIATION' as const,
    id: tempId,
    presentAtAllLocations: addition.presentAtAllLocations,
    ...(addition.presentAtAllLocations ? {} : { presentAtLocationIds: addition.presentAtLocationIds }),
    itemVariationData: {
      itemId: addition.itemId,
      name: addition.size,
      pricingType: 'FIXED_PRICING' as const,
      priceMoney: { amount: BigInt(addition.cents), currency: addition.currency },
      trackInventory: false,
      sellable: true,
      stockable: true,
      locationOverrides: addition.locationIds.map((locationId) => ({ locationId, trackInventory: false })),
      ...(addition.itemOptionValues ? { itemOptionValues: addition.itemOptionValues } : {}),
    },
  };
}

/** The existing variation with the standard price set; every other field (and version) kept. */
export function squarePriceFixFor(fix: PriceFix) {
  const data = fix.variation.itemVariationData ?? {};
  return {
    ...fix.variation,
    itemVariationData: {
      ...data,
      pricingType: 'FIXED_PRICING' as const,
      priceMoney: { amount: BigInt(fix.cents), currency: data.priceMoney?.currency ?? 'USD' },
    },
  };
}
