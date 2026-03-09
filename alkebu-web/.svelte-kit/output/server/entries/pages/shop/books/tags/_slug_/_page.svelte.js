import { f as store_get, i as attr_style, e as stringify, u as unsubscribe_stores } from "../../../../../../chunks/index2.js";
/* empty css                                                                  */
import { B as BookList } from "../../../../../../chunks/BookList.js";
import { M as Meta } from "../../../../../../chunks/Meta.js";
import { u as urlFor } from "../../../../../../chunks/payload2.js";
import { p as page } from "../../../../../../chunks/stores.js";
import { e as escape_html } from "../../../../../../chunks/utils2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    const tag = data.tag;
    let { bookCount, books, genres } = data.bks;
    const settings = data.settings;
    data.featured;
    let currentPage = parseInt(store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("p")) || 1;
    let sort = store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("query") || "";
    store_get($$store_subs ??= {}, "$page", page).params.slug;
    let urlTag = tag.replace("&", "and");
    let baseURL = `/shop/books/tags/${encodeURI(urlTag)}/`;
    let metaURL = parseInt(store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("p")) > 1 ? baseURL + "?p=" + store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("p") : baseURL;
    let metaImg = "https://cdn.sanity.io/images/nrl6nc45/production/87f3a18c04e9e50a99b0e4e46b0e08a0e9c0ae57-4160x2340.jpg?&w=400&h=300&auto=format";
    let thisPage = parseInt(store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("p")) > 1 ? `| Page ${store_get($$store_subs ??= {}, "$page", page).url.searchParams.get("p")} ` : "";
    const metadata = {
      title: `Tag: ${tag} ${thisPage}| Alkebu-Lan Images`,
      description: `${tag} Tagged Books`,
      image: metaImg,
      imageAlt: "bookshelf",
      url: metaURL
    };
    Meta($$renderer2, { metadata });
    $$renderer2.push(`<!----> <section class="page-header"${attr_style(`background-image: url(${stringify(urlFor(settings.banner).width(1920).height(300).auto("format").url())});`)}><div class="container"><h2><small>Tag:</small><br/>${escape_html(urlTag)}</h2> <ul class="flex items-center gap-2 text-sm text-white/80"><li><a href="/shop/">Shop</a></li> <li><a href="/shop/books/" class="shop_style">Books</a></li> <li><span>Tags</span></li></ul></div></section> <section class="product mx-auto">`);
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
