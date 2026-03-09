import { g as ensure_array_like, d as attr, e as stringify } from "./index2.js";
import { P as PayloadImage } from "./PayloadImage.js";
import { e as escape_html } from "./utils2.js";
function FeaturedBar($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { featured } = $$props;
    const shuffle = (arr, count) => {
      let _arr = [...arr];
      return [...Array(count)].map(() => _arr.splice(Math.floor(Math.random() * _arr.length), 1)[0]).filter(Boolean);
    };
    let randFeatured = shuffle(featured, 5);
    const getPrice = (product) => {
      const priceCents = product?.pricing?.retailPrice ?? product?.editions?.[0]?.price ?? 0;
      return (priceCents || 0) / 100;
    };
    $$renderer2.push(`<div class="single-sidebar wow fadeInUp animated" data-wow-delay="0.5s" data-wow-duration="1200ms"><div class="top_sellers"><div class="title"><h3>Featured Products</h3></div> <ul class="top-products"><!--[-->`);
    const each_array = ensure_array_like(randFeatured);
    for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
      let product = each_array[$$index];
      if (product) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<li><div class="product_item"><div class="img-box">`);
        PayloadImage($$renderer2, {
          image: product.images?.[0]?.image || product.images?.[0] || product.editions?.[0]?.images?.[0],
          alt: product.title,
          maxWidth: 150
        });
        $$renderer2.push(`<!----> <div class="overlay-content"><a${attr("href", `/shop/books/${stringify(product.slug)}`)}${attr("aria-label", `View ${product.title}`)}><i class="fa fa-link" aria-hidden="true"></i></a></div></div> <div class="title-box"><h4><a${attr("href", `/shop/books/${stringify(product.slug)}`)}>${escape_html(product.title)}</a></h4> <div class="value">$${escape_html(getPrice(product).toFixed(2))}</div></div></div></li>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></ul></div></div>`);
  });
}
export {
  FeaturedBar as F
};
