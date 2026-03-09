import { q as head, g as ensure_array_like, c as attr_class, e as stringify, f as store_get, d as attr, u as unsubscribe_stores } from "../../../../../../chunks/index2.js";
import { p as page } from "../../../../../../chunks/stores.js";
/* empty css                                                                  */
import { A as ApparelCard } from "../../../../../../chunks/ApparelCard.js";
import { S as Search } from "../../../../../../chunks/search.js";
import { e as escape_html } from "../../../../../../chunks/utils2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    let { tag, products, pagination, currentSort, seo } = data;
    const sortOptions = [
      { value: "-createdAt", label: "Newest" },
      { value: "createdAt", label: "Oldest" },
      { value: "title", label: "Name A-Z" },
      { value: "-title", label: "Name Z-A" },
      { value: "pricing.basePrice", label: "Price: Low to High" },
      { value: "-pricing.basePrice", label: "Price: High to Low" }
    ];
    function updateSort(newSort) {
      const url = new URL(store_get($$store_subs ??= {}, "$page", page).url);
      if (newSort === "-createdAt") {
        url.searchParams.delete("sort");
      } else {
        url.searchParams.set("sort", newSort);
      }
      url.searchParams.delete("p");
      window.location.href = url.toString();
    }
    head($$renderer2, ($$renderer3) => {
      $$renderer3.title(($$renderer4) => {
        $$renderer4.push(`<title>${escape_html(seo?.title)}</title>`);
      });
      $$renderer3.push(`<meta name="description"${attr("content", seo?.description)}/> `);
      if (seo?.canonical) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<link rel="canonical"${attr("href", seo.canonical)}/>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (seo?.noIndex) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<meta name="robots" content="noindex,nofollow"/>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]-->`);
    });
    $$renderer2.push(`<section class="page-header svelte-qxbyqf"><div class="container"><div class="row"><div class="col-12"><h1>Apparel Tagged: ${escape_html(tag?.name || "Tag")}</h1> `);
    if (tag?.description) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="lead">${escape_html(tag.description)}</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <nav aria-label="breadcrumb"><ol class="breadcrumb svelte-qxbyqf"><li class="breadcrumb-item svelte-qxbyqf"><a href="/" class="svelte-qxbyqf">Home</a></li> <li class="breadcrumb-item svelte-qxbyqf"><a href="/shop" class="svelte-qxbyqf">Shop</a></li> <li class="breadcrumb-item svelte-qxbyqf"><a href="/shop/apparel" class="svelte-qxbyqf">Apparel</a></li> <li class="breadcrumb-item svelte-qxbyqf"><a href="/shop/apparel/tags" class="svelte-qxbyqf">Tags</a></li> <li class="breadcrumb-item active svelte-qxbyqf" aria-current="page">${escape_html(tag?.name)}</li></ol></nav></div></div></div></section> <section class="products-section py-5"><div class="container"><div class="row mb-4"><div class="col-md-6"><p class="text-muted mb-0">Showing ${escape_html((pagination.page - 1) * 24 + 1)}-${escape_html(Math.min(pagination.page * 24, pagination.totalDocs))} 
                    of ${escape_html(pagination.totalDocs)} items</p></div> <div class="col-md-6"><div class="d-flex justify-content-end align-items-center"><label for="sort-select" class="me-2">Sort by:</label> `);
    $$renderer2.select(
      {
        id: "sort-select",
        class: "form-select form-select-sm",
        style: "width: auto;",
        value: currentSort,
        onchange: (e) => updateSort(e.target.value)
      },
      ($$renderer3) => {
        $$renderer3.push(`<!--[-->`);
        const each_array = ensure_array_like(sortOptions);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let option = each_array[$$index];
          $$renderer3.option({ value: option.value }, ($$renderer4) => {
            $$renderer4.push(`${escape_html(option.label)}`);
          });
        }
        $$renderer3.push(`<!--]-->`);
      }
    );
    $$renderer2.push(`</div></div></div> `);
    if (products.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="row"><!--[-->`);
      const each_array_1 = ensure_array_like(products);
      for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
        let product = each_array_1[$$index_1];
        $$renderer2.push(`<div class="col-lg-3 col-md-4 col-sm-6 mb-4">`);
        ApparelCard($$renderer2, { product });
        $$renderer2.push(`<!----></div>`);
      }
      $$renderer2.push(`<!--]--></div> `);
      if (pagination.totalPages > 1) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="row mt-5"><div class="col-12"><nav aria-label="Page navigation"><ul class="pagination justify-content-center">`);
        if (pagination.hasPrevPage) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<li class="page-item"><button class="page-link svelte-qxbyqf">Previous</button></li>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <!--[-->`);
        const each_array_2 = ensure_array_like(Array(Math.min(5, pagination.totalPages)));
        for (let i = 0, $$length = each_array_2.length; i < $$length; i++) {
          each_array_2[i];
          const pageNum = Math.max(1, pagination.page - 2) + i;
          if (pageNum <= pagination.totalPages) {
            $$renderer2.push("<!--[-->");
            $$renderer2.push(`<li${attr_class(`page-item ${stringify(pageNum === pagination.page ? "active" : "")}`, "svelte-qxbyqf")}><button class="page-link svelte-qxbyqf">${escape_html(pageNum)}</button></li>`);
          } else {
            $$renderer2.push("<!--[!-->");
          }
          $$renderer2.push(`<!--]-->`);
        }
        $$renderer2.push(`<!--]--> `);
        if (pagination.hasNextPage) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<li class="page-item"><button class="page-link svelte-qxbyqf">Next</button></li>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></ul></nav></div></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="row"><div class="col-12 text-center py-5"><div class="no-products svelte-qxbyqf">`);
      Search($$renderer2, { size: "48", class: "text-muted mb-3" });
      $$renderer2.push(`<!----> <h3>No apparel found</h3> <p class="text-muted">No apparel items found with the tag "${escape_html(tag?.name)}".</p> <a href="/shop/apparel" class="btn btn-primary">Browse All Apparel</a></div></div></div>`);
    }
    $$renderer2.push(`<!--]--></div></section>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
