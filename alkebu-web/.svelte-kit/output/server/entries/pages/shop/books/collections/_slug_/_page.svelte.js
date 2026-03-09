import { f as store_get, i as attr_style, e as stringify, u as unsubscribe_stores } from "../../../../../../chunks/index2.js";
import { B as BookList } from "../../../../../../chunks/BookList.js";
/* empty css                                                                  */
import { M as Meta } from "../../../../../../chunks/Meta.js";
import { p as page } from "../../../../../../chunks/stores.js";
import { u as urlFor } from "../../../../../../chunks/payload2.js";
import { e as escape_html } from "../../../../../../chunks/utils2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    let { title, bookCount, books, genres, featured } = data.books;
    const settings = data.settings;
    let currentPage = parseInt(store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("p")) || 1;
    let sort = store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("query") || "";
    let slug = store_get($$store_subs ??= {}, "$page", page).params.slug;
    let baseURL = `/shop/books/collections/${slug}/`;
    let metaURL = parseInt(store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("p")) > 1 ? baseURL + "?p=" + store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("p") : baseURL;
    let metaImg = "https://cdn.sanity.io/images/nrl6nc45/production/87f3a18c04e9e50a99b0e4e46b0e08a0e9c0ae57-4160x2340.jpg?&w=400&h=300&auto=format";
    let thisPage = parseInt(store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("p")) > 1 ? `| Page ${store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("p")} ` : "";
    const metadata = {
      title: `Collection: ${title} ${thisPage}| Alkebu-Lan Images`,
      description: `A curated selection of books from the collection ${title} `,
      image: metaImg,
      imageAlt: "bookshelf",
      url: metaURL
    };
    Meta($$renderer2, { metadata });
    $$renderer2.push(`<!----> <section class="page-header"${attr_style(`background-image: url(${stringify(urlFor(settings.banner).width(1920).height(300).auto("format").url())});`)}><div class="container"><h2><small>Collection:</small><br/>${escape_html(title)}</h2> <ul class="flex items-center gap-2 text-sm text-white/80"><li><a href="/shop/">Shop</a></li> <li><a href="/shop/books/" class="shop_style">Books</a></li> <li><span>Collections</span></li></ul></div></section> <section class="product mx-auto">`);
    BookList($$renderer2, {
      books,
      sort,
      currentPage
    });
    $$renderer2.push(`<!----></section>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
