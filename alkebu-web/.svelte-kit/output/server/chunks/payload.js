import { P as PAYLOAD_API_URL } from "./private.js";
async function payloadGet(path, init = {}) {
  const url = `${PAYLOAD_API_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...init.headers || {}
  };
  const res = await fetch(url, {
    ...init,
    headers
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`Payload API Error (${res.status}):`, text);
    throw new Error(`Payload ${res.status}: ${text}`);
  }
  return res.json();
}
async function getProductBySlug(slug, collection = "books") {
  const response = await payloadGet(`/api/${collection}?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=2`);
  return response.docs[0] || null;
}
async function getEventBySlug(slug) {
  const response = await payloadGet(`/api/events?where[slug][equals]=${encodeURIComponent(slug)}&where[status][equals]=published&limit=1&depth=2`);
  return response.docs[0] || null;
}
async function getBusinessBySlug(slug) {
  const response = await payloadGet(`/api/businesses?where[slug][equals]=${encodeURIComponent(slug)}&limit=1&depth=2`);
  return response.docs[0] || null;
}
async function getBooksByAuthor(currentBookId, authorIds, limit = 6) {
  if (!authorIds || authorIds.length === 0) {
    return [];
  }
  try {
    const authorsQuery = authorIds.map((id) => `where[authors][in]=${encodeURIComponent(id)}`).join("&");
    const response = await payloadGet(
      `/api/books?${authorsQuery}&where[isActive][equals]=true&limit=${limit + 1}&depth=1&sort=-createdAt`
    );
    return response.docs.filter((book) => book.id !== currentBookId).slice(0, limit);
  } catch (error) {
    console.error("Error fetching books by author:", error);
    return [];
  }
}
async function getRelatedBooks(currentBookId, categories = [], collections = [], excludeBookIds = [], limit = 6) {
  const relatedBooks = [];
  const seenIds = /* @__PURE__ */ new Set([currentBookId, ...excludeBookIds]);
  try {
    if (collections && collections.length > 0 && relatedBooks.length < limit) {
      const collectionsQuery = collections.map((c) => `where[collections][in]=${encodeURIComponent(c)}`).join("&");
      try {
        const response = await payloadGet(
          `/api/books?${collectionsQuery}&where[isActive][equals]=true&limit=${limit * 2}&depth=1`
        );
        response.docs.forEach((book) => {
          if (!seenIds.has(book.id) && relatedBooks.length < limit) {
            relatedBooks.push(book);
            seenIds.add(book.id);
          }
        });
      } catch (error) {
        console.error("Error fetching books by collection:", error);
      }
    }
    if (categories && categories.length > 0 && relatedBooks.length < limit) {
      const categoriesQuery = categories.map((c) => `where[categories][in]=${encodeURIComponent(c)}`).join("&");
      try {
        const response = await payloadGet(
          `/api/books?${categoriesQuery}&where[isActive][equals]=true&limit=${limit * 2}&depth=1`
        );
        response.docs.forEach((book) => {
          if (!seenIds.has(book.id) && relatedBooks.length < limit) {
            relatedBooks.push(book);
            seenIds.add(book.id);
          }
        });
      } catch (error) {
        console.error("Error fetching books by category:", error);
      }
    }
    if (relatedBooks.length < limit) {
      try {
        const response = await payloadGet(
          `/api/books?where[isActive][equals]=true&limit=${limit * 2}&depth=1&sort=-createdAt`
        );
        response.docs.forEach((book) => {
          if (!seenIds.has(book.id) && relatedBooks.length < limit) {
            relatedBooks.push(book);
            seenIds.add(book.id);
          }
        });
      } catch (error) {
        console.error("Error fetching recent books:", error);
      }
    }
    return relatedBooks.slice(0, limit);
  } catch (error) {
    console.error("Error in getRelatedBooks:", error);
    return [];
  }
}
async function getRelatedProducts(currentProductId, collection, categories = [], limit = 6) {
  const relatedProducts = [];
  const seenIds = /* @__PURE__ */ new Set([currentProductId]);
  try {
    if (categories && categories.length > 0) {
      const categoriesQuery = categories.map((c) => `where[categories][in]=${encodeURIComponent(c)}`).join("&");
      try {
        const response = await payloadGet(
          `/api/${collection}?${categoriesQuery}&where[isActive][equals]=true&limit=${limit * 2}&depth=1`
        );
        response.docs.forEach((product) => {
          if (!seenIds.has(product.id) && relatedProducts.length < limit) {
            relatedProducts.push(product);
            seenIds.add(product.id);
          }
        });
      } catch (error) {
        console.error("Error fetching related products by category:", error);
      }
    }
    if (relatedProducts.length < limit) {
      try {
        const response = await payloadGet(
          `/api/${collection}?where[isActive][equals]=true&limit=${limit * 2}&depth=1&sort=-createdAt`
        );
        response.docs.forEach((product) => {
          if (!seenIds.has(product.id) && relatedProducts.length < limit) {
            relatedProducts.push(product);
            seenIds.add(product.id);
          }
        });
      } catch (error) {
        console.error("Error fetching recent products:", error);
      }
    }
    return relatedProducts.slice(0, limit);
  } catch (error) {
    console.error("Error in getRelatedProducts:", error);
    return [];
  }
}
export {
  getEventBySlug as a,
  getProductBySlug as b,
  getRelatedProducts as c,
  getBooksByAuthor as d,
  getRelatedBooks as e,
  getBusinessBySlug as g,
  payloadGet as p
};
