interface ProductLineMatchBase {
  lineKey: string;
  lineName: string;
  variantLabel: string;
  variantAxis: 'scent' | 'size' | 'none';
}

// Discriminated on `collection` so a caller that has already checked
// `match.collection === 'oils-incense'` gets `productType` narrowed to exactly the
// values that collection's schema accepts (and likewise for wellness-lifestyle),
// with no unsafe `as` assertion required on either side.
export type ProductLineMatch =
  | (ProductLineMatchBase & { collection: 'wellness-lifestyle'; productType: 'body-butter' | 'soap' })
  | (ProductLineMatchBase & { collection: 'oils-incense'; productType: 'fragrance-oil' });

/**
 * Phase 1 covers four house-made lines only. Everything else — bulk supply SKUs,
 * miscategorized items, and the deferred Sea Moss / Bitters families — returns null.
 *
 * This is an allow-list on purpose. Square's wellness tree contains a djembe drum,
 * a bucket hat, and a line item named "Shipping"; its categories cannot be trusted
 * as a publish signal.
 */

/**
 * Guards the two LOOSE scent patterns below against bulk supply and packaging SKUs.
 *
 * This list covers bulk/packaging/miscategorized items ONLY. It deliberately does NOT
 * list the deferred Phase 2 families (Sea Moss, Bitters/Tonics) — the allow-list below
 * is anchored, so anything not explicitly named already returns null.
 *
 * Excluding by ingredient word is a trap: an earlier draft had /\bhoney\b/ to keep the
 * Phase 2 tonics out, which silently dropped "Turmeric, Lemon, Honey & Kojic Facial Bar" —
 * a $2,572/yr Phase 1 soap. Exclude by *product shape*, never by ingredient.
 */
const BULK_OR_PACKAGING = [
  /\b\d+\s*(lb|lbs|gallon|gal|liter|litre)\s*(box|bottle|jug)?\b/i, // "25lb Box Shea Butter", "3 Gallon BPA Free Bottle"
  /\bbottle\b/i,                              // empty containers: "1oz Oil Bottle single"
  /\bdozen|gross|bulk\b/i,
  /\bdiamond cut|swirl|spout|roll-on\b/i,
  /^\s*shipping\s*$/i,
  /\bdjembe|bucket hat|rug|shower curtain\b/i,
  /^\d+\s*lb\s+fragrance oil$/i,              // "1 lb Fragrance Oil" — blending stock
];

const SIZE_LABELS: Record<string, string> = {
  lb: '1 lb',
  'l b': '1 lb',
  '1/2 lb': '1/2 lb',
};

// Distinct soap products. Each is its own line; some carry a size variant.
const SOAPS: Array<{ key: string; name: string; pattern: RegExp }> = [
  { key: 'raw-black-soap', name: 'Raw Black Soap', pattern: /^raw black soap\b/i },
  { key: 'yadain-bar-soap', name: 'Yadain Bar Soap', pattern: /^yadain bar soap$/i },
  { key: 'turmeric-kojic-facial-bar', name: 'Turmeric, Lemon, Honey & Kojic Facial Bar', pattern: /^turmeric, lemon, honey & kojic facial bar$/i },
  { key: 'sunaroma-shea-vitamin-e', name: 'Sunaroma Shea Butter & Vitamin E Soap Bar', pattern: /^sunaroma with shea butter/i },
  { key: 'gye-nyame-blackseed-soap', name: 'Gye Nyame Blackseed Soap', pattern: /^gye nyame blackseed soap$/i },
  { key: 'zuresh-black-shea-detox', name: 'Zuresh Black & Shea Detox Soap', pattern: /^zuresh black & shea detox soap$/i },
  { key: 'zuresh-whipped-olive-bar', name: 'Zuresh Whipped Olive Bar', pattern: /^zuresh whipped olive bar$/i },
  { key: 'essencetree-turmeric-sea-buckthorn', name: 'EssenceTree Turmeric & Sea Buckthorn Soap', pattern: /^essencetree turmeric & sea buckthorn soap$/i },
  { key: 'african-liquid-black-soap', name: 'African Liquid Black Soap', pattern: /^african liquid black soap$/i },
  { key: 'turmeric-soap', name: 'Turmeric Soap', pattern: /^turmeric soap$/i },
  { key: 'erzuli-black-soap-bar', name: 'Erzuli Black Soap Bar', pattern: /^erzuli black soap bar$/i },
  { key: 'african-black-soap-shea-aloe', name: 'African Black Soap — Shea Butter & Aloe Vera', pattern: /^african black soap - shea butter & aloe vera$/i },
  { key: 'yoni-soap-acv', name: 'Feminine Wash w/ Apple Cider Vinegar Yoni Soap', pattern: /^feminine wash w\/ apple cider vinegar yoni soap$/i },

  // Added after the Step 5 dry-run against the live Square catalog (July 2026): the table
  // above only covered a sample. These are additional distinct bar-soap products found in
  // the excluded list — same "distinct product, not a scent variant" rule applies. Several
  // carry ingredient words (Honey, Sea Moss) in the name; per the ingredient-word regression
  // above, that never disqualifies a soap-shaped product.
  { key: 'activated-charcoal-soap', name: 'Activated Charcoal Soap', pattern: /^activated charcoal soap$/i },
  { key: 'african-black-soap-nubian-heritage', name: 'African Black Soap — Nubian Heritage', pattern: /^african black soap nubian heritage$/i },
  { key: 'anti-aging-carrot-soap-bar', name: 'Anti Aging Carrot Soap Bar', pattern: /^anti aging carrot soap bar$/i },
  { key: 'black-seed-soap', name: 'Black Seed Soap', pattern: /^black seed soap$/i },
  { key: 'buttermilk-manuka-honey-soap', name: 'Buttermilk & Manuka Honey Soap', pattern: /^buttermilk & manuka honey soap$/i },
  { key: 'colloidal-silver-soap', name: 'Colloidal Silver Soap', pattern: /^colloidal silver soap$/i },
  { key: 'egyptian-musk-herbal-soap', name: 'Egyptian Musk Herbal Soap', pattern: /^egyptian musk herbal soap$/i },
  { key: 'egyptian-musk-soap', name: 'Egyptian Musk Soap', pattern: /^egyptian musk soap$/i },
  { key: 'erzuli-soap-black-bar-unscented', name: 'Erzuli Soap Black Bar Unscented', pattern: /^erzuli, soap black bar unscented$/i },
  { key: 'face-card-bar-soap', name: 'Face Card Bar Soap', pattern: /^face card bar soap$/i },
  { key: 'florida-water-soap', name: 'Florida Water Soap', pattern: /^florida water soap$/i },
  { key: 'honey-black-seed-soap', name: 'Honey & Black Seed Soap', pattern: /^honey & black seed soap$/i },
  { key: 'lemongrass-tea-tree-bar-soap', name: 'Lemongrass and Tea Tree Bar Soap', pattern: /^lemongrass and tea tree bar soap$/i },
  { key: 'mango-butter-bar-soap', name: 'Mango Butter Bar Soap', pattern: /^mango butter bar soap$/i },
  { key: 'moringa-soap-chia-seeds', name: 'Moringa Soap with Chia Seeds', pattern: /^moringa soap with chia seeds$/i },
  { key: 'nag-champa-bar-soap', name: 'Nag Champa Bar Soap', pattern: /^nag champa bar soap$/i },
  { key: 'neem-soap', name: 'Neem Soap', pattern: /^neem soap$/i },
  { key: 'nubian-heritage-bar-soap', name: 'Nubian Heritage Bar Soap', pattern: /^nubian heritage bar soap$/i },
  { key: 'nubian-heritage-soap', name: 'Nubian Heritage Soap', pattern: /^nubian heritage soap$/i },
  { key: 'peppermint-soap', name: 'Peppermint Soap', pattern: /^peppermint soap$/i },
  { key: 'sea-moss-manuka-honey-bar-soap', name: 'Sea Moss and Manuka Honey Bar Soap', pattern: /^sea moss and manuka honey bar soap$/i },
  { key: 'shea-olein-soap', name: 'Shea Olein Soap', pattern: /^shea olein soap$/i },
  { key: 'turmeric-manuka-honey-brightening-bar-soap', name: 'Turmeric Manuka Honey Brightening Bar Soap', pattern: /^turmeric manuka honey brightening bar soap$/i },

  // Round Black Soap has a regular/small size axis, same shape as Raw Black Soap.
  { key: 'round-black-soap', name: 'Round Black Soap', pattern: /^(small )?round black soap$|^small black round soap$/i },
];

// Distinct raw butters. No variant axis.
const RAW_BUTTERS: Array<{ key: string; name: string; pattern: RegExp }> = [
  { key: 'raw-shea-butter', name: 'Raw Shea Butter', pattern: /^raw shea butter$/i },
  { key: 'natural-raw-mango-butter', name: 'Natural Raw Mango Butter', pattern: /^natural raw mango butter$/i },
  { key: 'cocoa-butter-vitamin-e', name: 'Cocoa Butter with Vitamin E', pattern: /^cocoa butter w\/ vitamin e$/i },

  // Added after the Step 5 dry-run: distinct raw-butter SKUs not in the original sample.
  // "Raw Cocoa Butter" and its Medina-branded counterpart are separate Square catalog items
  // (different ids/prices), as are the two Sunaroma 1lb retail units — 1lb is a normal
  // retail package size here, unlike the 25lb bulk blending box which stays excluded.
  { key: 'raw-cocoa-butter', name: 'Raw Cocoa Butter', pattern: /^raw cocoa butter$/i },
  { key: 'raw-cocoa-butter-medina', name: 'Raw Cocoa Butter — Medina', pattern: /^raw cocoa butter - medina$/i },
  { key: 'sunaroma-mango-butter', name: 'Sunaroma Mango Butter', pattern: /^sunaroma mango butter 1lb$/i },
  { key: 'sunaroma-raw-cocoa-butter', name: 'Sunaroma Raw Cocoa Butter', pattern: /^sunaroma raw cocoa butter 1lb$/i },
];

export const matchProductLine = (squareItemName: string): ProductLineMatch | null => {
  const name = (squareItemName || '').trim();
  if (!name) return null;

  // ORDER MATTERS. The anchored allow-lists (soaps, raw butters) run FIRST, before the
  // bulk guard. "Raw Black Soap 1/2 LB" contains "2 LB" and would otherwise be eaten by
  // the guard's \d+\s*lb pattern. Anchored names are already unambiguous — they need no guard.

  // 1. Soaps — distinct products; Raw Black Soap additionally has a size axis.
  for (const soap of SOAPS) {
    if (!soap.pattern.test(name)) continue;

    if (soap.key === 'raw-black-soap') {
      const half = /1\/2\s*lb/i.test(name);
      return {
        lineKey: soap.key,
        lineName: soap.name,
        collection: 'wellness-lifestyle',
        variantLabel: half ? SIZE_LABELS['1/2 lb'] : SIZE_LABELS.lb,
        variantAxis: 'size',
        productType: 'soap',
      };
    }

    if (soap.key === 'round-black-soap') {
      const small = /^small/i.test(name);
      return {
        lineKey: soap.key,
        lineName: soap.name,
        collection: 'wellness-lifestyle',
        variantLabel: small ? 'Small' : 'Regular',
        variantAxis: 'size',
        productType: 'soap',
      };
    }

    return {
      lineKey: soap.key,
      lineName: soap.name,
      collection: 'wellness-lifestyle',
      variantLabel: '',
      variantAxis: 'none',
      productType: 'soap',
    };
  }

  // 2. Raw butters — distinct products, no variants.
  for (const butter of RAW_BUTTERS) {
    if (butter.pattern.test(name)) {
      return {
        lineKey: butter.key,
        lineName: butter.name,
        collection: 'wellness-lifestyle',
        variantLabel: '',
        variantAxis: 'none',
        productType: 'body-butter',
      };
    }
  }

  // Only the LOOSE patterns below need the bulk/packaging guard.
  if (BULK_OR_PACKAGING.some((pattern) => pattern.test(name))) return null;

  // 3. Whipped Shea Butter — scent is the variant axis (loose tail). Square has two
  //    naming conventions here too: "Whipped Shea Butter <scent>" and the shortened
  //    "Whipped Shea <scent>" (e.g. "Whipped Shea Peppermint", "Whipped Shea Rihanna Riri").
  const shea = /^whipped shea(?: butter)?\s+(.+)$/i.exec(name);
  if (shea) {
    return {
      lineKey: 'whipped-shea-butter',
      lineName: 'Whipped Shea Butter',
      collection: 'wellness-lifestyle',
      variantLabel: shea[1].trim(),
      variantAxis: 'scent',
      productType: 'body-butter',
    };
  }

  // 4. Scented Oil — scent is the variant axis. Two naming conventions in Square:
  //    "<Scent> Scented Oil" and the bare "<Scent> type" (the top seller, 2,259 units).
  const scented = /^(.+?)\s+scented oil$/i.exec(name);
  const typeOil = /^(.+?)\s+type$/i.exec(name);
  const oilScent = scented?.[1] ?? typeOil?.[1];
  if (oilScent) {
    return {
      lineKey: 'scented-oil',
      lineName: 'Scented Oil',
      collection: 'oils-incense',
      variantLabel: oilScent.trim(),
      variantAxis: 'scent',
      productType: 'fragrance-oil',
    };
  }

  // Not in Phase 1. The allow-list is anchored, so Sea Moss, Bitters/Tonics, and every
  // other deferred or unknown item falls through to null without needing an exclusion rule.
  return null;
};
