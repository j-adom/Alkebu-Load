import "clsx";
import { B as BookList } from "../../../../chunks/BookList.js";
import { u as urlFor } from "../../../../chunks/payload2.js";
import { M as Meta } from "../../../../chunks/Meta.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const settings = data.settings || {};
    const products = data.products || [];
    const pagination = data.pagination || { page: 1, totalPages: 1, totalDocs: 0, limit: 24 };
    const currentPage = pagination.page || 1;
    const pageSize = pagination.limit || 24;
    const totalDocs = pagination.totalDocs || 0;
    const categories = data.categories || [];
    const sort = data.sort || "newest";
    const currentCategory = data.currentCategory || "";
    settings?.banner ? urlFor(settings.banner).width(1920).height(300).auto("format").url() : "";
    const metadata = data.seo || {
      title: "Books | Alkebu-Lan Images",
      description: "Browse our catalog of books from Black authors and about Black stories.",
      url: "/shop/books"
    };
    Meta($$renderer2, { metadata });
    $$renderer2.push(`<!----> <section class="page-header-modern"><div class="container mx-auto px-4"><nav class="flex items-center gap-2 text-sm text-white/80 mb-4"><a href="/" class="hover:text-white transition-colors">Home</a> <span class="text-white/60">›</span> <a href="/shop/" class="hover:text-white transition-colors">Shop</a> <span class="text-white/60">›</span> <span class="text-white font-medium">Books</span></nav> <h1 class="text-3xl md:text-4xl font-bold font-display">Book Catalogue</h1></div></section> <section class="container product mx-auto">`);
    BookList($$renderer2, {
      books: products,
      categories,
      totalDocs,
      totalPages: pagination.totalPages || 1,
      currentPage,
      pageSize,
      sort,
      currentCategory
    });
    $$renderer2.push(`<!----></section>`);
  });
}
export {
  _page as default
};
