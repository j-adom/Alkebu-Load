import { p as payloadGet } from "../../../../chunks/payload.js";
const load = async ({ url, setHeaders }) => {
  const page = parseInt(url.searchParams.get("p") || "1");
  const sort = url.searchParams.get("sort") || "-createdAt";
  const limit = 12;
  try {
    const sortParam = sort ? `&sort=${encodeURIComponent(sort)}` : "";
    const apiUrl = `/api/fashion-jewelry?page=${page}&limit=${limit}&depth=1${sortParam}`;
    const response = await payloadGet(apiUrl);
    const categorySet = /* @__PURE__ */ new Set();
    response.docs.forEach((product) => {
      product.categories?.forEach((cat) => categorySet.add(cat));
    });
    const categories = Array.from(categorySet).map((cat) => ({
      name: cat.charAt(0).toUpperCase() + cat.slice(1).replace(/-/g, " "),
      slug: { current: cat }
    }));
    const featured = response.docs.filter((p) => p.isFeatured).slice(0, 4);
    setHeaders({
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      "Vary": "Accept-Encoding"
    });
    return {
      prods: {
        products: response.docs,
        prodCount: response.totalDocs,
        categories,
        featured
      }
    };
  } catch (error) {
    console.error("Error loading apparel products:", error);
    return {
      prods: {
        products: [],
        prodCount: 0,
        categories: [],
        featured: []
      }
    };
  }
};
export {
  load
};
