---
target: homepage
total_score: 22
max_score: 36
na_heuristics: 7
p0_count: 0
p1_count: 2
target_identity: "file:/home/jadom/Coding/alkebulanimages2.0/alkebu-web/src/routes/+page.svelte"
target_fingerprint: "sha256:d3168cdb924e94fe3e93de26c5cbbe46cb4b24a28950e9c94e626655f9482a15"
target_path: /home/jadom/Coding/alkebulanimages2.0/alkebu-web/src/routes/+page.svelte
timestamp: 2026-09-08T00-32-42Z
slug: alkebu-web-src-routes-page-svelte
---
**The homepage feels like a real cultural institution, but it makes visitors work too hard to discover books.** Its strongest next step is a tighter shopping hierarchy, preserving the photography and cultural identity.

Independent design review + automated/browser evidence. Live desktop and mobile; Persuade/discovery scope. **Design health: 22/36 (61%, acceptable with material opportunities).** This is a heuristic assessment, not a conversion measurement.

**Design specificity.** The real shelves, Sankofa imagery, Nashville history, and Black cultural mission belong to Alkebu-Lan. The welcome/About/category-card arrangement is conventional. Staff taste and the book selection should carry more of the identity.

**What works:** authentic store photography builds trust; the gold Shop Now action is clear; four recognizable shopping categories keep the assortment understandable. Preserve those foundations.

**Priorities**

1. **P1 — Populate or remove the empty Featured Titles section.** Production shows its heading without books. It promises curation and then supplies whitespace. Hide the entire section when empty, or use a maintained selection with a deliberate fallback. Suggested command: `/impeccable harden`.
2. **P1 — Bring actual books closer to the entrance.** At 390px width, category choices begin around 2,262px down and Newly Added Books around 4,434px—over five 844px screens. Shop Now is available early, but visitors must travel far to inspect merchandise on the homepage. Put a compact book shelf immediately after the hero, follow with categories, and compress About into a shorter proof of the store's identity. Suggested commands: `/impeccable distill`, `/impeccable layout`.
3. **P2 — Let the hero explain the store, rather than just welcome people.** “Welcome to Alkebu-Lan Images” occupies the most valuable text space while bookstore, Nashville, and Since 1986 are less prominent. Use a concise bookstore proposition and make the founding history visible. Keep the real shelf photograph and clear shopping action. Suggested command: `/impeccable clarify`.
4. **P2 — Make the institutional buying entrance easier to recognize.** Business services start around 6,328px down on mobile. Three different destinations share “Contact Us,” and “Institutional Contracts” can sound more involved than a bulk-book inquiry. Provide an earlier bulk-order entrance and specific destination labels. Keep the existing dedicated routes. Suggested command: `/impeccable clarify`.
5. **P2 — Give returning readers a concrete reason to subscribe.** “Join our newsletter” describes a channel, not its benefit. State what staff can reliably provide: new books, store news, or author events, where supported by actual content. Avoid creating a publishing burden for a lean team. Suggested command: `/impeccable clarify`.

**Cognitive load and emotional journey.** The problem is mainly scrolling and competing emphasis, not too many products. The four categories are sensible; an eight-book shelf need not be reduced arbitrarily. The inviting store photograph is the opening high point, the long About sequence and empty featured shelf are the valley, and actual books restore momentum too late.

**Persona concerns:** a first-time mobile shopper waits several screens to compare books; a school buyer must discover and interpret the distant services cards; a returning reader gets little current editorial reason to return.

| Heuristic | Score / 4 | Main observation |
|---|---:|---|
| System status | 2 | Empty featured section has no useful state |
| Real-world language | 3 | Categories clear; some copy unnecessarily formal |
| Control and freedom | 3 | Familiar links and browsing controls |
| Consistency | 3 | Coherent actions; vague repeated business labels |
| Error prevention | 3 | Newsletter validation and submission protection |
| Recognition | 2 | Shopping choices buried; mobile search inside menu |
| Efficiency | n/a | Expert workflow shortcuts outside this homepage's scope |
| Minimalist design | 2 | Long introduction and repeated section treatments |
| Error recovery | 2 | No recovery from empty merchandising section |
| Help and reassurance | 2 | Contact details present; fulfillment reassurance distant |
| **Total** | **22/36** | **61%** |

**Minor observations:** replace “over the last 35 years” with evergreen “Since 1986”; review the multi-second hero entrance against reduced-motion needs; keep long book titles readable without mixing excessive format metadata into display copy. Make mobile search easier to find in a subsequent shopping pass.

**Technical evidence:** deterministic scans of the homepage and ProductCard reported zero findings. Both widths had no horizontal overflow, and all images loaded after scrolling. Those checks do not measure editorial hierarchy, so they do not contradict the design findings. A live detector overlay could not load because Chrome blocked localhost script injection from the HTTPS production origin; DOM inspection and screenshots provided fallback evidence.

Which of these homepage priorities should lead the next pass? What existing homepage elements should remain unchanged?
