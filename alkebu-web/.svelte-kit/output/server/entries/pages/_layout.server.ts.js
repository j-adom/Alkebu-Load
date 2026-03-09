import { p as payloadGet } from "../../chunks/payload.js";
const load = async ({ locals }) => {
  try {
    const settings = await payloadGet("/api/globals/siteSettings?depth=1");
    const featuredBooks = await payloadGet("/api/books?where[isFeatured][equals]=true&limit=10&depth=2");
    const newBooks = await payloadGet("/api/books?sort=-createdAt&limit=10&depth=2");
    return {
      settings: settings || {},
      featured: featuredBooks.docs || [],
      newBooks: newBooks.docs || [],
      user: locals.user ?? null
    };
  } catch (error) {
    console.error("Error loading layout data:", error);
    return {
      settings: {},
      featured: [],
      newBooks: [],
      user: locals.user ?? null
    };
  }
};
export {
  load
};
