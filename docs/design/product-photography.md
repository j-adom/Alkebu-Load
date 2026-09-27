# Product photography — September 26, 2026

The scented-oil page and shop card use bundled photography when CMS photos are absent. CMS photos retain priority. The exact `scented-oil` slug limits the fallback to the house product line. No publication flags or catalog prices were changed.

## Assets

- `alkebu-web/static/assets/images/products/scented-oil/shop-shelves.webp`
- `alkebu-web/static/assets/images/products/scented-oil/bottle-sizes.webp`

Both are AI-retouched derivatives of the user's shop photographs, created using the built-in imagegen tool and encoded as WebP with ffmpeg. They are not untouched originals. The gallery identifies the empty bottles as size samples and directs shoppers to their selection for current pricing. These photos illustrate the collection, not an individual selected scent.

The portrait shelf photo was not needed alongside the wider shelf view. The later shea-butter attachments supplied the group shot and open-jar detail added below.

## Final image-edit prompts

### Bottle sizes

Edit the SECOND of the three attached photos only: the landscape photo of five empty scented-oil size sample bottles on a wooden shop counter with artwork behind. Use case: lighting-weather. Asset: authentic ecommerce product-gallery size guide photograph. Light professional photographic cleanup: gently brighten shadows, neutralize blue color cast, recover highlights, keep warm wood and vivid original shop artwork. Preserve EXACTLY the five original bottles, their shapes, clear empty contents, black caps, relative scale, framing, and all handwritten stickers: from left '$25' and '2 oz'; '$15' and '1 oz'; '$10' and '1/2 oz'; '$8' and 'Roll-on'; '$5' and '1/4 oz'. Preserve original text and handwriting rather than redesigning labels. Remove only loose white dust/debris on counter. Do not invent products, fill bottles, add labels, alter prices, or merge in shelves from other photos. Return one clean landscape photograph.

### Shop shelves

Edit target: the user's landscape photograph showing TWO wooden shelving cabinets full of scented-oil bottles (the THIRD original user attachment, NOT the portrait shelves or the five size sample bottles or their edited version). Use case lighting-weather. Intended use: product gallery editorial photo of Alkebulan Images' actual shop scent collection. Light photographic cleanup only: recover bright glass highlights, gently lift deep shadows, neutralize blue haze, keep natural amber oils, wood warmth and colored bottle tops. Preserve the full two-cabinet composition, every existing bottle's position, size, liquid level, cap color, existing labels and lettering, and hanging fabric. Do not invent readable labels or add/remove bottles. No text overlay, props, branding, or fake studio setting. Output one landscape photograph with the original warm art-filled shop character.

## Validation

Desktop (1440 px) and mobile (390 px) browser checks use a temporary local fixture API, not published catalog data. Both photos load, mouse/keyboard thumbnail selection updates the main photo and caption, and neither viewport has horizontal overflow or JavaScript page errors. Catalog publication gating remains unchanged.

## Whipped shea butter

Selected the landscape group shot for the hero and the portrait open-jar photograph for a texture detail. Shelf images were omitted to keep the gallery focused. Both were enhanced with built-in imagegen (exposure, color balance and detail), then encoded as WebP. These are AI-retouched derivatives, not untouched originals or a guaranteed recovery of original detail.

- `alkebu-web/static/assets/images/products/whipped-shea-butter/group.webp` (1672 × 941)
- `alkebu-web/static/assets/images/products/whipped-shea-butter/texture.webp` (1122 × 1402)

The exact `whipped-shea-butter` slug connects these to the existing gallery and shop-card fallback. Captions identify the photographs as a selection and name the scent shown in the detail; photos do not change with the chosen scent. Existing CMS images retain priority. No publication or pricing changes.

### Shea-butter group — final prompt

Edit target: the LANDSCAPE group photo of four whipped shea butter jars on dark dotted cloth, with an open Frank&Myrrh jar and clear lid on the RIGHT, Obama jar stacked behind Pink Sugar and Baby Powder. Use the user's landscape original, not either portrait photo or the enhanced portrait. Enhance exposure on jars and labels, neutralize blue cast to warm natural cream, recover highlights, sharpen gently. Keep exact original packaging, jar count, shapes, label text 'Alkebu-Lan Images', 'Whipped Shea Butter', 'Obama', 'Pink Sugar', 'Baby Powder', 'Frank&Myrrh', existing butter texture and small scoop mark, clear lid, patterned cloth, colorful bags and sculptures. Preserve the real shop setting. No new props, ingredients, whipped peaks, text overlays, or packaging redesign. Return one landscape ecommerce photograph.

### Shea-butter detail — final prompt

Edit target: the portrait photo of the OPEN Frank&Myrrh whipped shea butter jar closest to camera, clear lid leaning to the LEFT, Obama jar out of focus above and behind, patterned cloth underneath, colorful bags in the shop background. It is third from last among the most recent seven user photos. Other two supplied photos are context only. Use case lighting-weather. Gently enhance exposure, remove blue cast for natural cream tones, sharpen the foreground label subtly, preserve shallow depth of field. Crop excess empty fabric below into a balanced 4:5 portrait composition while keeping entire foreground jar and lid. Preserve exactly the original packaging, natural butter surface and small scoop mark, all jar shapes, label text 'Alkebu-Lan Images', 'Whipped Shea Butter', 'Frank&Myrrh', arrangement, dotted textile, background art. No new props, invented creamy peaks, added copy, new branding or changes to product. Authentic warm shop product photography; one image.

Shea-butter verification: desktop (1440 px) and mobile (390 px) fixture previews passed image loading, keyboard thumbnail selection, and overflow checks, with no page errors. Svelte check: 0 errors, 2 existing warnings. Existing frontend tests: 34 passed.
