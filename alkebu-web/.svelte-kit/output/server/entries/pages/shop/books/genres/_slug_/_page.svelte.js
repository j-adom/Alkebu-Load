import { i as attr_style } from "../../../../../../chunks/index2.js";
import { B as BookList } from "../../../../../../chunks/BookList.js";
import { M as Meta } from "../../../../../../chunks/Meta.js";
import { u as urlFor } from "../../../../../../chunks/payload2.js";
import { e as escape_html } from "../../../../../../chunks/utils2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const genre = data.genre;
    const books = data.books || [];
    const pagination = data.pagination || { page: 1, totalPages: 1, totalDocs: 0, limit: 24 };
    const currentPage = pagination.page || 1;
    const pageSize = pagination.limit || 24;
    const totalDocs = pagination.totalDocs || 0;
    const categories = data.categories || [];
    const sort = data.currentSort || "newest";
    const settings = data.settings || {};
    const bannerUrl = settings?.banner ? urlFor(settings.banner).width(1920).height(300).auto("format").url() : "";
    const metadata = data.seo || {
      title: `${genre?.name || "Genre"} Books | Alkebu-Lan Images`,
      description: `Explore our collection of ${genre?.name || "genre"} books`,
      url: `/shop/books/genres/${genre?.slug || ""}`
    };
    Meta($$renderer2, { metadata });
    $$renderer2.push(`<!----> <section class="page-header"${attr_style(bannerUrl ? `background-image: url(${bannerUrl});` : "")}><div class="container"><h2><small>Genre:</small><br/>${escape_html(genre?.name || "Books")}</h2> <ul class="flex items-center gap-2 text-sm text-white/80"><li><a href="/">Home</a></li> <li><a href="/shop/">Shop</a></li> <li><a href="/shop/books/" class="shop_style">Books</a></li> <li><span>${escape_html(genre?.name || "Genre")}</span></li></ul></div></section> <section class="container product mx-auto">`);
    BookList($$renderer2, {
      books,
      categories,
      totalDocs,
      totalPages: pagination.totalPages || 1,
      currentPage,
      pageSize,
      sort,
      currentCategory: ""
    });
    $$renderer2.push(`<!----></section>`);
  });
}
export {
  _page as default
};
