import { p as payloadGet } from "../../chunks/payload.js";
import { b as buildSEOData } from "../../chunks/seo.js";
import { P as PUBLIC_SITE_URL } from "../../chunks/public.js";
const load = async ({ setHeaders }) => {
  try {
    const homePageData = await payloadGet("/api/globals/homePage?depth=2");
    const featuredBooks = await payloadGet("/api/books?where[isFeatured][equals]=true&limit=8&depth=2");
    const newBooks = await payloadGet("/api/books?sort=-createdAt&limit=8&depth=2");
    const blogPosts = await payloadGet("/api/blogPosts?sort=-publishedDate&limit=4&depth=2");
    const events = await payloadGet("/api/events?where[startDate][greater_than_equal]=" + (/* @__PURE__ */ new Date()).toISOString() + "&sort=startDate&limit=3&depth=1");
    setHeaders({
      "Cache-Control": "public, s-maxage=7200, stale-while-revalidate=21600, stale-if-error=7200",
      "Vary": "Accept-Encoding",
      "x-key": "homepage"
    });
    const seoData = buildSEOData({
      title: "Alkebulan Images - African Diaspora Literature & Culture",
      description: "Discover books, art, and cultural treasures celebrating African diaspora heritage. Nashville's premier destination for Black literature, wellness products, and community connection.",
      canonical: PUBLIC_SITE_URL
    });
    console.log("Section3 images:", JSON.stringify(homePageData?.section3?.images, null, 2));
    return {
      // HomePage global data (banner, sections, etc.)
      banner: homePageData?.banner || {},
      section2: homePageData?.section2 || {},
      section3: homePageData?.section3 || {},
      section4: homePageData?.section4 || {},
      // Book data
      featured: featuredBooks.docs || [],
      newBooks: newBooks.docs || [],
      // Content data
      blogPosts: blogPosts.docs || [],
      events: events.docs || [],
      seo: seoData
    };
  } catch (error) {
    console.error("Error loading homepage data:", error);
    setHeaders({
      "Cache-Control": "public, s-maxage=300"
    });
    return {
      banner: {},
      section2: {},
      section3: {},
      section4: {},
      featured: [],
      newBooks: [],
      blogPosts: [],
      events: [],
      seo: buildSEOData({
        title: "Alkebulan Images - African Diaspora Literature & Culture",
        description: "Nashville's premier destination for Black literature and culture.",
        canonical: PUBLIC_SITE_URL
      })
    };
  }
};
export {
  load
};
