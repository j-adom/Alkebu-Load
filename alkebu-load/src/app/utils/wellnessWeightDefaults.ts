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
 * on size (Raw Black Soap: 1 lb vs 1/2 lb; Whipped Shea Butter: 4 oz vs 8 oz),
 * this module looks for a size signal on the variation row itself (`size`,
 * `sku`, `scent`) before picking a default. When that signal is genuinely
 * absent:
 *   - Raw Black Soap defaults to the full 1 lb weight -- same "assume full
 *     unless flagged half" convention `matchProductLine` itself uses.
 *   - Scented Oil defaults to the 1 oz weight -- documented in
 *     wellnessProductLines.ts as the dominant bottle size ("the top seller,
 *     2,259 units").
 *   - Whipped Shea Butter has no such dominant-size evidence in this
 *     codebase, and it is literally the $14.99-tub example from the brief --
 *     so an unresolved row is left unset and reported rather than guessed.
 *
 * Round Black Soap has no distinct entry in the brief's table, but it IS a
 * bar soap, and the brief's instruction is explicit: "all bar soaps -> 6 oz".
 * Both its Regular and Small rows get the bar-soap default; the backfill
 * script's summary should still flag it for human review since a genuinely
 * "Small" row likely weighs less in reality.
 */

import { RAW_BUTTERS, SOAPS } from './wellnessProductLines';

export interface VariationSizeGroup {
  volume?: number | null;
  unit?: string | null;
}

export interface WeightableVariation {
  sku?: string | null;
  scent?: string | null;
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
  if (variation.size && typeof variation.size === 'object') {
    const fromGroup = sizeGroupToOunces(variation.size);
    if (fromGroup !== undefined) return fromGroup;
  }

  return textSizeOunces(textOf(variation));
}

function looksHalfPound(variation: WeightableVariation): boolean {
  return extractSizeHintOunces(variation) === 8;
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
    // "all bar soaps -> 6 oz" per the brief -- applies to both Regular and
    // Small rows here; the backfill script's report should still flag this
    // line for human review since a genuine Small likely weighs less.
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
    const hint = extractSizeHintOunces(variation);
    if (hint === undefined || hint === 1) return { weight: 3 };
    return {
      weight: null,
      reason: `Scented Oil's 3oz default only covers the 1oz bottle; this row's size signal (~${hint}oz) is a different bottle size with no defined default.`,
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
