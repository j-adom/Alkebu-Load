import { e as escape_html } from "../../../../../../chunks/utils2.js";
import "clsx";
import { M as Meta } from "../../../../../../chunks/Meta.js";
import { B as BookList } from "../../../../../../chunks/BookList.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const author = data.author;
    const books = data.books || [];
    const pagination = data.pagination || { page: 1, totalPages: 1, totalDocs: books.length, limit: 24 };
    const currentPage = pagination.page || 1;
    const pageSize = pagination.limit || 24;
    const totalDocs = pagination.totalDocs || books.length;
    const sort = data.currentSort || "newest";
    const metadata = data.seo || {
      title: `Books by ${author?.name || "Author"}`,
      description: `Explore titles by ${author?.name || "this author"}.`,
      url: `/shop/books/authors/${author?.slug || ""}`
    };
    Meta($$renderer2, { metadata });
    $$renderer2.push(`<!----> <section class="page-header"><div class="container"><h2><small>Author:</small><br/>${escape_html(author?.name)}</h2> <ul class="flex items-center gap-2 text-sm text-white/80"><li><a href="/shop/">Shop</a></li> <li><a href="/shop/books/" class="shop_style">Books</a></li> <li><span>Authors</span></li></ul></div></section> <section class="product mx-auto">`);
    BookList($$renderer2, {
      books,
      categories: [],
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
