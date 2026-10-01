---
target: alkebulanimages.com/search
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
target_identity: "file:/home/jadom/Coding/alkebulanimages2.0/alkebu-web/src/routes/search/+page.svelte"
target_fingerprint: "sha256:591f7eb7f33da31de5f6660dd5e0c5a0820630529f58c65311b233a5dc8cb9f6"
target_path: /home/jadom/Coding/alkebulanimages2.0/alkebu-web/src/routes/search/+page.svelte
timestamp: 2026-09-08T01-03-13Z
slug: alkebu-web-src-routes-search-page-svelte
---
⚠️ DEGRADED: single-context (design-review sub-agent hit its usage limit; the design assessment was completed in the parent before detector findings were released)

**Design health: 24/40 (60%, acceptable with significant usability gaps).** This search works, but its presentation treats books like generic landscape products and does too little to distinguish loading, failure, and true no-result states.

**Design specificity.** The forest/indigo field and gold actions connect the page to Alkebu-Lan's visual language. The search composition and result cards are otherwise category-interchangeable. The strongest opportunity is to let the bookstore's product—portrait book covers, authorship, price, availability, and staff-quality metadata—shape the interface.

**What works**

- The query, category selector, and Search action are easy to find and work with keyboard Enter.
- Search results expose title, author, price, and a large clickable target; the live `jochanan` query returns 15 unique books with valid links.
- The no-results state offers four useful department exits. Desktop and mobile showed no horizontal overflow or failed images in the completed visual pass.

**Priority issues**

1. **P1 — Book covers are cropped into landscape thumbnails.** Every result uses `aspect-[4/3]` and `object-cover`. Portrait covers lose meaningful content and can resemble unrelated imagery. Use a product-type-aware media frame: 2:3 portrait with `object-contain` for books, and appropriate crops for apparel and other products. Suggested command: `/impeccable layout`.
2. **P1 — Mobile comparison is far too slow.** Fifteen one-column cards produce a page around 8,400px tall. A shopper sees roughly one book per viewport, making comparison laborious. Use compact mobile result rows with a small portrait cover beside title, author, price, and availability; use a denser portrait grid on wider screens. Suggested command: `/impeccable adapt`.
3. **P1 — Loading, backend failure, and zero matches are not distinct.** Programmatic navigation exposes no pending state or `aria-live` result update. The outer loader catch returns an empty result set, so a temporary search failure can be announced as “No results found.” That is especially damaging after the refresh-only issue observed during recent work. Add a visible searching state, live announcement, explicit failure message, and Retry action; reserve the no-results language for successful empty responses. Suggested command: `/impeccable harden`.
4. **P2 — The search task is wrapped in too much page chrome.** Desktop repeats search in the global header and the page hero. Mobile uses about 500px before results begin, while results start around 620px. Collapse the hero after a query, or replace it with a compact sticky search/filter bar so the result list becomes primary. Suggested command: `/impeccable distill`.
5. **P2 — Result metadata is noisy and the catalog is not fully explorable.** Descriptions such as “Yosef Ben-Jochannan - African Studies...” repeat the author instead of helping a purchase decision; one result repeats the author twice. Broad searches stop at 30 results and the storefront ignores the API's total result count, with no pagination or “show more.” Clean imported snippets, show useful availability/format information, and expose continuation when more results exist. Suggested commands: `/impeccable clarify`, `/impeccable harden`.

**Cognitive load and emotional journey.** The query/filter interaction is simple. Most wasted effort occurs after submission: distorted covers reduce recognition, long cards slow comparison, and duplicated metadata must be mentally filtered. The opening feels confident; a successful count reassures; the long mobile list quickly becomes tiring. The no-results state recovers with department links, but repeats the same failure message twice and exposes an internal millisecond measurement that does not help customers recover.

**Persona concerns**

- **Casey, distracted mobile shopper:** can submit easily, but must repeatedly swipe through oversized cards and cannot compare adjacent books.
- **Jordan, first-time shopper:** recognizes titles and prices, but cropped covers and catalog fragments weaken confidence about what each result represents.
- **Sam, accessibility-dependent shopper:** the input relies on placeholder text rather than a persistent label; result changes lack a live announcement; no loading or retry state clearly communicates what happened.

| # | Heuristic | Score | Main observation |
|---|---|---:|---|
| 1 | Visibility of system status | 2 | Timing is shown, but loading and failure states are missing |
| 2 | Match with the real world | 3 | Familiar search language; catalog fragments reduce clarity |
| 3 | User control and freedom | 3 | Query and category remain editable; no clear/reset shortcut |
| 4 | Consistency and standards | 2 | Duplicate search surfaces and one generic media treatment |
| 5 | Error prevention | 3 | Empty queries are blocked and filters are constrained |
| 6 | Recognition rather than recall | 3 | Visible query/count/categories; distorted covers hurt recognition |
| 7 | Flexibility and efficiency | 2 | Enter and filtering work; no sorting, pagination, or dense view |
| 8 | Aesthetic and minimalist design | 2 | Strong palette; oversized chrome/cards and noisy metadata |
| 9 | Error recovery | 2 | Department exits exist; failure and zero-result states collapse together |
| 10 | Help and documentation | 2 | Useful prompt, but no spelling explanation, retry, or search guidance |
| **Total** | | **24/40** | **60%** |

**Minor observations:** remove the customer-facing `ms` number; use a real `<form>` with a visible or visually hidden label; avoid repeating “No results found” in both heading and panel; expose a clear reset when a category filter is active; make category badges readable against both dark and light covers.

**Technical evidence:** the deterministic detector returned zero findings for the route. The completed design browser pass covered the initial, successful, and no-result states at 1440px and 390px, with no page errors, horizontal overflow, or failed images. The detector's overlay pass did not complete, so no user-visible overlay or console result is claimed.
