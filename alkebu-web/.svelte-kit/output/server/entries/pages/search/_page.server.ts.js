import { p as payloadGet } from "../../../chunks/payload.js";
import { b as buildSEOData } from "../../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../../chunks/public.js";
const DISPLAY_TO_FLEXSEARCH = {
  books: "books",
  apparel: "fashionJewelry",
  health: "wellnessLifestyle",
  home: "oilsIncense",
  blog: "blogPosts",
  directory: "businesses",
  events: "events"
};
const FLEXSEARCH_TO_DISPLAY = {
  books: "books",
  fashionJewelry: "apparel",
  wellnessLifestyle: "health",
  oilsIncense: "home",
  blogPosts: "blog",
  businesses: "directory",
  events: "events"
};
const TYPE_URL_PREFIX = {
  books: (slug) => `/shop/books/${slug}`,
  fashionJewelry: (slug) => `/shop/apparel/${slug}`,
  wellnessLifestyle: (slug) => `/shop/health-and-beauty/${slug}`,
  oilsIncense: (slug) => `/shop/home-goods/${slug}`,
  blogPosts: (slug) => `/blog/${slug}`,
  businesses: (slug) => `/directory/${slug}`,
  events: (slug) => `/events/${slug}`
};
const AVAILABLE_TYPES = [
  { label: "All", value: "all" },
  { label: "Books", value: "books" },
  { label: "Apparel", value: "apparel" },
  { label: "Health & Beauty", value: "health" },
  { label: "Home Goods", value: "home" },
  { label: "Blog", value: "blog" },
  { label: "Directory", value: "directory" },
  { label: "Events", value: "events" }
];
const load = async ({ url, setHeaders }) => {
  const searchQuery = (url.searchParams.get("q") || "").trim();
  const typeFilter = url.searchParams.get("type") || "all";
  try {
    let combinedResults = [];
    let searchTime = 0;
    if (searchQuery) {
      const params = new URLSearchParams({
        q: searchQuery,
        limit: "30"
      });
      if (typeFilter !== "all") {
        const flexType = DISPLAY_TO_FLEXSEARCH[typeFilter];
        if (flexType) {
          params.set("types", flexType);
        }
      }
      try {
        const searchResponse = await payloadGet(`/api/search?${params}`);
        searchTime = searchResponse.searchTime || 0;
        combinedResults = searchResponse.internal.map((result) => {
          const displayType = FLEXSEARCH_TO_DISPLAY[result.type] || result.type;
          const urlBuilder = TYPE_URL_PREFIX[result.type];
          const resultUrl = urlBuilder && result.slug ? urlBuilder(result.slug) : "#";
          return {
            type: displayType,
            title: result.title,
            description: result.excerpt,
            image: result.imageUrl,
            url: resultUrl,
            author: result.author,
            price: result.price,
            score: result.score
          };
        });
      } catch (searchErr) {
        console.warn("FlexSearch API unavailable, falling back to Payload REST:", searchErr);
        combinedResults = await fallbackSearch(searchQuery, typeFilter);
      }
    }
    setHeaders({
      "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      "Vary": "Accept-Encoding"
    });
    const seoData = buildSEOData({
      title: searchQuery ? `Search results for "${searchQuery}"` : "Search - Alkebulan Images",
      description: searchQuery ? `Find books, products, and content related to "${searchQuery}" at Alkebulan Images.` : "Search our collection of literature, wellness products, cultural items, events, and businesses.",
      canonical: `${PUBLIC_SITE_URL}/search${searchQuery ? `?q=${encodeURIComponent(searchQuery)}${typeFilter !== "all" ? `&type=${typeFilter}` : ""}` : ""}`,
      noIndex: !!searchQuery
    });
    return {
      searchQuery,
      typeFilter,
      availableTypes: AVAILABLE_TYPES,
      results: combinedResults,
      searchTime,
      pagination: {
        page: 1,
        totalPages: 1,
        totalDocs: combinedResults.length
      },
      seo: seoData
    };
  } catch (error) {
    console.error("Error performing search:", error);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
    });
    return {
      searchQuery,
      typeFilter,
      availableTypes: AVAILABLE_TYPES,
      results: [],
      searchTime: 0,
      pagination: { page: 1, totalPages: 1, totalDocs: 0 },
      seo: buildSEOData({
        title: "Search - Alkebulan Images",
        description: "Search our collection of books and cultural items.",
        canonical: `${PUBLIC_SITE_URL}/search`
      })
    };
  }
};
async function fallbackSearch(query, typeFilter) {
  const collections = [
    { type: "books", path: "/api/books", titleField: "title", descField: "description", imgField: "images", urlFn: (i) => `/shop/books/${i.slug}` },
    { type: "apparel", path: "/api/fashion-jewelry", titleField: "name", descField: "description", imgField: "images", urlFn: (i) => `/shop/apparel/${i.slug}` },
    { type: "health", path: "/api/wellness-lifestyle", titleField: "title", descField: "description", imgField: "images", urlFn: (i) => `/shop/health-and-beauty/${i.slug}` },
    { type: "home", path: "/api/oils-incense", titleField: "title", descField: "description", imgField: "images", urlFn: (i) => `/shop/home-goods/${i.slug}` },
    { type: "blog", path: "/api/blogPosts", titleField: "title", descField: "excerpt", imgField: "featuredImage", urlFn: (i) => `/blog/${i.slug}` },
    { type: "directory", path: "/api/businesses", titleField: "name", descField: "description", imgField: "logo", urlFn: (i) => `/directory/${i.slug}` },
    { type: "events", path: "/api/events", titleField: "title", descField: "description", imgField: "featuredImage", urlFn: (i) => `/events/${i.slug}` }
  ].filter((c) => typeFilter === "all" || c.type === typeFilter);
  const queries = collections.map(async (col) => {
    const params = new URLSearchParams({ page: "1", limit: "6", depth: "2" });
    params.append(`where[or][0][${col.titleField}][contains]`, query);
    params.append(`where[or][1][${col.descField}][contains]`, query);
    try {
      const resp = await payloadGet(`${col.path}?${params}`);
      return (resp.docs || []).map((item) => ({
        type: col.type,
        title: item[col.titleField],
        description: item[col.descField],
        image: item[col.imgField] || item.images,
        url: col.urlFn(item)
      }));
    } catch {
      return [];
    }
  });
  return (await Promise.all(queries)).flat();
}
export {
  load
};
