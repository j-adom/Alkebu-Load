import { d as attr, g as ensure_array_like, e as stringify, c as attr_class, u as unsubscribe_stores, f as store_get } from "./index2.js";
import { A as AddToCartButton } from "./AddToCartButton.js";
import { f as formatCurrency } from "./currency.js";
import { g as getImageUrl } from "./payload2.js";
import { e as escape_html } from "./utils2.js";
import { p as page } from "./stores.js";
import { g as goto } from "./client.js";
import { F as FeaturedBar } from "./FeaturedBar.js";
import { S as Search } from "./search.js";
function BookCard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { book } = $$props;
    const primaryEdition = book?.editions?.find((edition) => edition.isPrimary) || book?.editions?.[0] || {};
    const binding = (primaryEdition?.binding || book?.binding || "Paperback").toString();
    const priceCents = book?.pricing?.retailPrice ?? primaryEdition?.pricing?.retailPrice ?? 0;
    const price = (priceCents || 0) / 100;
    const imageSource = book?.images?.[0]?.image || book?.images?.[0] || (book?.scrapedImageUrls?.[0]?.url ? { url: book.scrapedImageUrls[0].url } : null);
    const productId = book?.id || book?._id;
    const slug = (() => {
      if (!book?.slug) return "";
      if (typeof book.slug === "string") return book.slug;
      return book.slug?.current || "";
    })();
    const isbn = primaryEdition?.isbn13 || primaryEdition?.isbn || book?.isbn13 || book?.isbn || "";
    const productPath = (() => {
      if (!slug) return "/shop/books";
      return isbn ? `/shop/books/${slug}/${isbn}` : `/shop/books/${slug}`;
    })();
    const coverUrl = getImageUrl(imageSource, { fallback: "" });
    let imageError = false;
    $$renderer2.push(`<div class="flex flex-col text-center all_products_single"><div class="all_product_item_image">`);
    if (!coverUrl || imageError) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="placeholder-cover svelte-g8da1h"><div class="placeholder-title svelte-g8da1h">${escape_html(book.title)}</div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<img${attr("src", coverUrl)}${attr("alt", book.title)} class="book-image svelte-g8da1h" loading="lazy" onerror="this.__e=event" onload="this.__e=event"/>`);
    }
    $$renderer2.push(`<!--]--> <div class="all_product_hover">`);
    AddToCartButton($$renderer2, {
      className: "all_product_icon add-to-cart",
      productId,
      productType: "books",
      iconOnly: true,
      label: `Add ${book.title} to cart`
    });
    $$renderer2.push(`<!----></div></div> <h4><a${attr("href", productPath)}>${escape_html(book.title)} (${escape_html(binding)})</a></h4> <h2>`);
    if (book.authors?.length) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`by  <!--[-->`);
      const each_array = ensure_array_like(book.authors);
      for (let i = 0, $$length = each_array.length; i < $$length; i++) {
        let author = each_array[i];
        if (author.slug) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<a${attr("href", `/shop/books/authors/${stringify(author.slug)}`)}>${escape_html(author.name)}</a>${escape_html(i < book.authors.length - 1 ? ", " : "")}`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`${escape_html(author.name)}${escape_html(i < book.authors.length - 1 ? ", " : "")}`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></h2> <p class="text-2xl">${escape_html(formatCurrency(price))}</p></div>`);
  });
}
function BookList($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let {
      books = [],
      categories = [],
      currentPage = 1,
      totalDocs = 0,
      totalPages = 1,
      pageSize = 12,
      sort = "newest",
      currentCategory = ""
    } = $$props;
    const sortOptions = [
      { value: "title-asc", label: "Title A-Z" },
      { value: "title-desc", label: "Title Z-A" },
      { value: "newest", label: "Recently Added" },
      { value: "oldest", label: "Oldest First" }
    ];
    const startIdx = Math.min((currentPage - 1) * pageSize + 1, Math.max(totalDocs, 1));
    const endIdx = Math.min(currentPage * pageSize, totalDocs);
    const pageNumbers = (() => {
      const pages = [];
      const neighbors = 2;
      pages.push(1);
      const start = Math.max(2, currentPage - neighbors);
      const end = Math.min(totalPages - 1, currentPage + neighbors);
      if (start > 2) pages.push("ellipsis");
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (end < totalPages - 1) pages.push("ellipsis");
      if (totalPages > 1) pages.push(totalPages);
      return pages;
    })();
    const buildHref = (targetPage) => {
      const params = new URLSearchParams(store_get($$store_subs ??= {}, "$page", page).url.searchParams);
      params.set("p", targetPage.toString());
      if (sort) params.set("sort", sort);
      if (currentCategory) params.set("category", currentCategory);
      return `${store_get($$store_subs ??= {}, "$page", page).url.pathname}?${params.toString()}#productList`;
    };
    function handleSortChange(event) {
      const nextSort = event.target.value;
      const params = new URLSearchParams(store_get($$store_subs ??= {}, "$page", page).url.searchParams);
      params.set("sort", nextSort);
      params.set("p", "1");
      goto(`${store_get($$store_subs ??= {}, "$page", page).url.pathname}?${params.toString()}#productList`);
    }
    function handlePageSizeChange(event) {
      const nextPageSize = event.target.value;
      const params = new URLSearchParams(store_get($$store_subs ??= {}, "$page", page).url.searchParams);
      params.set("limit", nextPageSize);
      params.set("p", "1");
      goto(`${store_get($$store_subs ??= {}, "$page", page).url.pathname}?${params.toString()}#productList`, {});
    }
    $$renderer2.push(`<div class="container w-full mx-12 px-12"><div class="flex flex-col md:flex-row gap-3"><div class="basis-1 md:basis-1/2 lg:basis-1/4"><div class="sidebar-wrapper style2"><div class="single-sidebar wow fadeInUp animated" data-wow-delay="0.1s" data-wow-duration="1200ms"><div class="sidebar-search-box"><form class="search-form" action="/search" method="GET"><input placeholder="Search" type="search" name="q"/> <button type="submit">`);
    Search($$renderer2, { size: "24" });
    $$renderer2.push(`<!----></button></form></div></div> <div class="single-sidebar wow fadeInUp animated" data-wow-delay="0.3s" data-wow-duration="1200ms"><div class="categories-box"><div class="title"><h3>Genres</h3></div> <ul class="categories clearfix">`);
    if (categories.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<li class="text-sm text-gray-500">No genres available</li>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<!--[-->`);
      const each_array = ensure_array_like(categories);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let category = each_array[$$index];
        $$renderer2.push(`<li><a${attr("href", `/shop/books/genres/${category.slug}`)}>${escape_html(category.name)}</a></li>`);
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></ul></div></div> `);
    FeaturedBar($$renderer2, { featured: books.slice(0, 4) });
    $$renderer2.push(`<!----></div></div> <div class="basis-1 lg:basis-3/4"><div class="product-items"><div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-4"><div class="showing" id="productList"><p>Showing products ${escape_html(startIdx)}-${escape_html(endIdx)} of ${escape_html(totalDocs)} Results</p></div> <div class="flex items-center gap-4"><div class="flex items-center gap-2"><label class="text-sm font-medium whitespace-nowrap" for="page-size-select">Per page:</label> `);
    $$renderer2.select(
      {
        id: "page-size-select",
        class: "border px-3 py-2 rounded",
        value: pageSize,
        onchange: handlePageSizeChange
      },
      ($$renderer3) => {
        $$renderer3.option({ value: "12", selected: pageSize === 12 }, ($$renderer4) => {
          $$renderer4.push(`12`);
        });
        $$renderer3.option({ value: "25", selected: pageSize === 25 }, ($$renderer4) => {
          $$renderer4.push(`25`);
        });
        $$renderer3.option({ value: "100", selected: pageSize === 100 }, ($$renderer4) => {
          $$renderer4.push(`100`);
        });
      }
    );
    $$renderer2.push(`</div> <div class="flex items-center gap-2"><label class="text-sm font-medium whitespace-nowrap" for="sort-select">Sort by:</label> `);
    $$renderer2.select(
      {
        id: "sort-select",
        class: "border px-3 py-2 rounded",
        value: sort,
        onchange: handleSortChange
      },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array_1 = ensure_array_like(sortOptions);
        for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
          let option = each_array_1[$$index_1];
          $$renderer3.option({ value: option.value, selected: option.value === sort }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(option.label)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      }
    );
    $$renderer2.push(`</div></div></div> `);
    if (totalPages > 1) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<nav aria-label="Page navigation" class="post-pagination mb-6 svelte-1b6oesz">`);
      if (currentPage > 1) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<a${attr("href", buildHref(currentPage - 1))} class="prev-link svelte-1b6oesz" aria-label="Previous page"><i class="fa fa-angle-left" aria-hidden="true"></i></a>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <!--[-->`);
      const each_array_2 = ensure_array_like(pageNumbers);
      for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
        let pageNum = each_array_2[$$index_2];
        if (pageNum === "ellipsis") {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span class="ellipsis svelte-1b6oesz">...</span>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<a${attr("href", buildHref(pageNum))}${attr("aria-current", currentPage === pageNum ? "page" : void 0)}${attr_class("svelte-1b6oesz", void 0, { "active": currentPage === pageNum })}>${escape_html(pageNum)}</a>`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--> `);
      if (currentPage < totalPages) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<a${attr("href", buildHref(currentPage + 1))} class="next-link svelte-1b6oesz" aria-label="Next page"><i class="fa fa-angle-right" aria-hidden="true"></i></a>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></nav>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="all_products"><div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"><!--[-->`);
    const each_array_3 = ensure_array_like(books);
    for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
      let book = each_array_3[$$index_3];
      BookCard($$renderer2, { book });
    }
    $$renderer2.push(`<!--]--></div></div> `);
    if (totalPages > 1) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<nav aria-label="Page navigation" class="post-pagination mt-8 svelte-1b6oesz">`);
      if (currentPage > 1) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<a${attr("href", buildHref(currentPage - 1))} class="prev-link svelte-1b6oesz" aria-label="Previous page"><i class="fa fa-angle-left" aria-hidden="true"></i></a>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <!--[-->`);
      const each_array_4 = ensure_array_like(pageNumbers);
      for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
        let pageNum = each_array_4[$$index_4];
        if (pageNum === "ellipsis") {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<span class="ellipsis svelte-1b6oesz">...</span>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<a${attr("href", buildHref(pageNum))}${attr("aria-current", currentPage === pageNum ? "page" : void 0)}${attr_class("svelte-1b6oesz", void 0, { "active": currentPage === pageNum })}>${escape_html(pageNum)}</a>`);
        }
        $$renderer2.push(`<!--]-->`);
      }
      $$renderer2.push(`<!--]--> `);
      if (currentPage < totalPages) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<a${attr("href", buildHref(currentPage + 1))} class="next-link svelte-1b6oesz" aria-label="Next page"><i class="fa fa-angle-right" aria-hidden="true"></i></a>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></nav>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div></div></div>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  BookList as B
};
