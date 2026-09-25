// Stand-in for the 'square' SDK, substituted via squareLoader.mjs's resolve hook so that
// squareCatalogSync.ts's `await import('square')` resolves to THIS file instead of the
// real package -- no live Square calls are possible in the integration suite.
//
// squareCatalogSync.ts memoizes its SquareClient instance at module scope (see its
// `_squareClient` variable), so every test after the first reuses the SAME instance.
// `catalog.list()` therefore reads `currentCatalogItems` at CALL time, not at
// construction time -- `setCatalogItems` lets each test drive a different catalog
// response through that one long-lived client.
let currentCatalogItems = [];

export function setCatalogItems(items) {
  currentCatalogItems = items;
}

export class SquareClient {
  catalog = {
    list: async function* list() {
      for (const item of currentCatalogItems) yield item;
    },
  };
}
