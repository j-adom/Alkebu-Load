/**
 * Packaging-weight defaults for WellnessLifestyle / OilsIncense variations
 * (Task 6). Shippo mis-rates shipments without a real `weight`, and wellness
 * is NOT Media Mail eligible (that default is book-only) -- an unset or wrong
 * weight on a $14.99 tub eats the margin on the shipment.
 *
 * Payload does NOT row-reconcile array fields on update -- sending `variations`
 * in `data` REPLACES the entire stored array (the bug class that hit Task 4's
 * importer and Task 5's inventory sync). `applyWeightsToVariations` below
 * follows the same fix: start from the EXISTING row for every variation, and
 * set `weight` ONLY on rows where it is currently unset, preserving every
 * other field via a spread.
 *
 * A staff-entered weight is authoritative and is NEVER overwritten here.
 *
 * Defaults are classified by PRODUCT SHAPE (bar soap vs. liquid/wash, shea vs.
 * cocoa/mango butter), never by ingredient word -- the same rule documented
 * repeatedly in wellnessProductLines.ts (an earlier draft excluded /\bhoney\b/
 * and silently dropped a real, sellable soap).
 *
 * Where the brief's table gives two different weights for one line depending
 * on size (Raw Black Soap: 1 lb vs 1/2 lb; Whipped Shea Butter: 4 oz vs 8 oz;
 * Scented Oil: 1/4 oz through 2 oz), this module looks for a size signal on
 * the variation row. `variantName` -- Square's own item_variation_data.name
 * (e.g. "1 oz", "1/4 oz", "Roll-on"), persisted verbatim by the importer -- is
 * now the AUTHORITATIVE size signal. `size` / `sku` / `scent` are checked only
 * as a secondary fallback, for rows imported before `variantName` existed.
 * When no signal is present at all:
 *   - Raw Black Soap defaults to the full 1 lb weight -- same "assume full
 *     unless flagged half" convention `matchProductLine` itself uses.
 *   - Scented Oil defaults to the 1 oz weight -- documented in
 *     wellnessProductLines.ts as the dominant bottle size ("the top seller,
 *     2,259 units"). A row that DOES carry a size signal but one that doesn't
 *     match any known bottle size is left unresolved rather than guessed.
 *   - Whipped Shea Butter has no such dominant-size evidence in this
 *     codebase, and it is literally the $14.99-tub example from the brief --
 *     so an unresolved row is left unset and reported rather than guessed.
 *
 * Round Black Soap has no distinct entry in the brief's table, but it IS a
 * bar soap, and the brief's instruction is explicit: "all bar soaps -> 6 oz".
 * That default applies to the Regular row. A "Small" row (detected via
 * `variantName`/matchProductLine's variantLabel) has no defined weight of its
 * own in the brief -- rather than keep re-using the Regular 6oz guess (known
 * wrong), it is left unresolved and reported for a human to fill in.
 */

import { RAW_BUTTERS, SOAPS } from './wellnessProductLines';

export interface VariationSizeGroup {
  volume?: number | null;
  unit?: string | null;
}

export interface WeightableVariation {
  sku?: string | null;
  scent?: string | null;
  // Square's own item_variation_data.name (e.g. "1 oz", "1/4 oz", "Roll-on"),
  // persisted verbatim by the importer -- the authoritative size signal.
  variantName?: string | null;
  // WellnessLifestyle.variations[].size is a { volume, unit } group;
  // OilsIncense.variations[].size is a fixed select string (e.g. '1-oz-bottle').
  size?: VariationSizeGroup | string | null;
  weight?: number | null;
  [key: string]: unknown;
}

export interface WeightResolution {
  weight: number | null;
  /** Populated only when weight is null -- explains why no default applies. */
  reason?: string;
}

export interface UnresolvedVariation {
  sku?: string | null;
  reason: string;
}

export interface ApplyWeightsResult<T extends WeightableVariation> {
  variations: T[];
  filled: number;
  alreadySet: number;
  unresolved: UnresolvedVariation[];
}

export const hasPositiveWeight = (weight: number | null | undefined): boolean =>
  typeof weight === 'number' && Number.isFinite(weight) && weight > 0;

// --- size-signal extraction from whatever the row actually carries ---------

const sizeGroupToOunces = (size: VariationSizeGroup): number | undefined => {
  const { volume, unit } = size;
  if (typeof volume !== 'number' || !Number.isFinite(volume) || volume <= 0) return undefined;

  switch ((unit || '').toLowerCase()) {
    case 'oz':
    case 'fl-oz':
      return volume;
    case 'lb':
      return volume * 16;
    case 'g':
      return volume / 28.349523125;
    case 'kg':
      return volume * 35.27396195;
    default:
      return undefined;
  }
};

const textOf = (variation: WeightableVariation): string =>
  [
    typeof variation.size === 'string' ? variation.size : '',
    variation.sku || '',
    variation.scent || '',
  ].join(' ');

const textSizeOunces = (text: string): number | undefined => {
  // Matches "4oz", "4 oz", "1-oz-bottle", "0.33-oz-rollon", etc.
  const ozMatch = /(\d+(?:\.\d+)?)\s*-?\s*oz\b/i.exec(text);
  if (ozMatch) return Number.parseFloat(ozMatch[1]);

  // "1/2 lb" (typed) and "1-2-lb" (the importer's own slugify('1/2 lb') output --
  // slugify collapses non-alnum runs to a single '-', so the literal slash never
  // survives into a synthesized sku).
  if (/\b1[\s/-]2[\s-]?lb\b/i.test(text) || /half\s*(a\s*)?lb/i.test(text)) return 8;

  const lbMatch = /(\d+(?:\.\d+)?)\s*lbs?\b/i.exec(text);
  if (lbMatch) return Number.parseFloat(lbMatch[1]) * 16;

  return undefined;
};

function extractSizeHintOunces(variation: WeightableVariation): number | undefined {
  // variantName is the authoritative size signal -- checked first. size/sku/scent
  // below are a secondary fallback, kept for rows imported before variantName existed.
  if (typeof variation.variantName === 'string' && variation.variantName.trim()) {
    const fromName = textSizeOunces(variation.variantName);
    if (fromName !== undefined) return fromName;
  }

  if (variation.size && typeof variation.size === 'object') {
    const fromGroup = sizeGroupToOunces(variation.size);
    if (fromGroup !== undefined) return fromGroup;
  }

  return textSizeOunces(textOf(variation));
}

function looksHalfPound(variation: WeightableVariation): boolean {
  return extractSizeHintOunces(variation) === 8;
}

// --- Scented Oil size -> weight table ---------------------------------------
// Real Square variation names (item_variation_data.name) for this line, and the
// packaging weight each ships at (ounces, including packaging). "Roll-on" has no
// literal fluid-ounce value of its own -- it is a distinct bottle format, not a
// fraction of the numbered sizes below -- so it is matched by name, not by number.
const OIL_SIZE_TO_WEIGHT: Array<{ pattern: RegExp; weight: number }> = [
  { pattern: /roll[\s-]?on/i, weight: 2 },
  { pattern: /(1\/4|0\.25|quarter)\s*-?\s*oz/i, weight: 2 },
  { pattern: /(1\/2|0\.5|half)\s*-?\s*oz/i, weight: 3 },
  { pattern: /\b2(\.0+)?\s*-?\s*oz\b/i, weight: 5 },
  { pattern: /\b1(\.0+)?\s*-?\s*oz\b/i, weight: 3 },
];

function resolveOilSizeWeight(text: string): number | undefined {
  for (const { pattern, weight } of OIL_SIZE_TO_WEIGHT) {
    if (pattern.test(text)) return weight;
  }
  return undefined;
}

function hasAnyOilSizeMention(text: string): boolean {
  return /oz\b/i.test(text) || /roll[\s-]?on/i.test(text);
}

// --- per-line default table, derived from the Phase 1 line lists -----------

const BAR_SOAP_OZ = 6;
const RAW_SHEA_BUTTER_OZ = 18;
const RAW_COCOA_MANGO_BUTTER_OZ = 10;

// These two have a size axis and are resolved by dedicated branches below.
const SIZE_AXIS_SOAP_KEYS = new Set(['raw-black-soap', 'round-black-soap']);

const SINGLE_DEFAULT_OZ = new Map<string, number>();
const NO_DEFAULT_REASON = new Map<string, string>();

for (const soap of SOAPS) {
  if (SIZE_AXIS_SOAP_KEYS.has(soap.key)) continue;

  if (/\b(liquid|wash)\b/i.test(soap.name)) {
    NO_DEFAULT_REASON.set(
      soap.key,
      `"${soap.name}" is a liquid/wash product, not a solid bar -- the "Soaps (bar) -> 6 oz" default does not apply.`,
    );
    continue;
  }

  SINGLE_DEFAULT_OZ.set(soap.key, BAR_SOAP_OZ);
}

for (const butter of RAW_BUTTERS) {
  const isShea = /\bshea\b/i.test(butter.name);
  SINGLE_DEFAULT_OZ.set(butter.key, isShea ? RAW_SHEA_BUTTER_OZ : RAW_COCOA_MANGO_BUTTER_OZ);
}

// --- resolution --------------------------------------------------------------

export function resolveVariationWeight(lineKey: string, variation: WeightableVariation): WeightResolution {
  const single = SINGLE_DEFAULT_OZ.get(lineKey);
  if (single !== undefined) return { weight: single };

  const noDefaultReason = NO_DEFAULT_REASON.get(lineKey);
  if (noDefaultReason) return { weight: null, reason: noDefaultReason };

  if (lineKey === 'raw-black-soap') {
    // Half-lb signal found -> 10 oz; otherwise assume the full 1 lb size, same
    // "default to full unless flagged half" convention matchProductLine uses.
    return looksHalfPound(variation) ? { weight: 10 } : { weight: 18 };
  }

  if (lineKey === 'round-black-soap') {
    // "all bar soaps -> 6 oz" per the brief -- but that default was verified
    // against the Regular size only. A "Small" row (surfaced via variantName --
    // either Square's own variation name or, when Square only carries a generic
    // per-variation name like "Regular", matchProductLine's variantLabel) has no
    // defined weight in the brief. Silently reusing the Regular default for it
    // is a knowingly-wrong guess -- report it unresolved instead.
    const text = [variation.variantName, textOf(variation)]
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .join(' ');

    if (/small/i.test(text)) {
      return {
        weight: null,
        reason:
          'Round Black Soap "Small" has no defined shipped weight -- the 6oz default is verified ' +
          'for the Regular size only; a human must supply the Small weight.',
      };
    }

    return { weight: BAR_SOAP_OZ };
  }

  if (lineKey === 'whipped-shea-butter') {
    const hint = extractSizeHintOunces(variation);
    if (hint === 4) return { weight: 6 };
    if (hint === 8) return { weight: 11 };
    return {
      weight: null,
      reason:
        'Whipped Shea Butter ships in 4oz (-> 6oz) and 8oz (-> 11oz) sizes, but this row carries no size signal (sku/scent/size) to tell them apart.',
    };
  }

  if (lineKey === 'scented-oil') {
    const text = [variation.variantName, textOf(variation)]
      .filter((v): v is string => typeof v === 'string' && v.length > 0)
      .join(' ');

    const resolved = resolveOilSizeWeight(text);
    if (resolved !== undefined) return { weight: resolved };

    // No size signal at all (not even an "oz"/"roll-on" mention anywhere) -- fall
    // back to the documented dominant bottle size (1oz, "the top seller, 2,259
    // units" per wellnessProductLines.ts) rather than leaving these unresolved.
    if (!hasAnyOilSizeMention(text)) return { weight: 3 };

    return {
      weight: null,
      reason:
        `Scented Oil's size signal on this row ("${text.trim()}") doesn't match a defined bottle ` +
        'size (1/4 oz -> 2oz, 1/2 oz -> 3oz, 1 oz -> 3oz, 2 oz -> 5oz, Roll-on -> 2oz) -- add a ' +
        'default before running --commit for this row.',
    };
  }

  return {
    weight: null,
    reason: `No packaging-weight default is defined for lineKey "${lineKey}" -- add one to wellnessWeightDefaults.ts before running --commit for this line.`,
  };
}

/**
 * Returns a NEW array with `weight` filled in on every row where it was
 * unset and a default could be resolved. Every other field on every row --
 * matched or not -- is preserved via a spread. Rows that already carry a
 * positive weight are returned by the SAME reference, untouched.
 */
export function applyWeightsToVariations<T extends WeightableVariation>(
  variations: T[],
  lineKey: string,
): ApplyWeightsResult<T> {
  let filled = 0;
  let alreadySet = 0;
  const unresolved: UnresolvedVariation[] = [];

  const nextVariations = variations.map((variation) => {
    if (hasPositiveWeight(variation.weight)) {
      alreadySet += 1;
      return variation;
    }

    const { weight, reason } = resolveVariationWeight(lineKey, variation);

    if (weight === null) {
      unresolved.push({ sku: variation.sku, reason: reason ?? 'no default available' });
      return variation;
    }

    filled += 1;
    return { ...variation, weight };
  });

  return { variations: nextVariations, filled, alreadySet, unresolved };
}
