import { d as attr, e as stringify } from "./index2.js";
import "./cart.js";
import "./cartDrawer.js";
/* empty css                                           */
import { e as escape_html } from "./utils2.js";
function ApparelCard($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { product } = $$props;
    product.weight || 2;
    let price = product.variations?.[0]?.price || (product.pricing?.retailPrice ? product.pricing.retailPrice / 100 : 0) || product.price || // Direct price field
    0;
    let imageUrl = product.scrapedImageUrls?.[0]?.url || // R2 URLs from migration
    product.images?.[0]?.url || // Media collection URLs
    product.images?.[0]?.image?.url || // Nested image object
    null;
    let brandName = product.brand;
    let brandSlug = product.brand ? product.brand.toLowerCase().replace(/\s+/g, "-") : null;
    let productTitle = product.name || product.title;
    $$renderer2.push(`<div class="flex flex-col"><div class="all_products_single text-center"><div class="all_product_item_image"><a${attr("href", `/shop/apparel/${stringify(product.slug)}`)}>`);
    if (imageUrl) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<img${attr("src", imageUrl)}${attr("alt", productTitle)} loading="lazy" class="product-image"/>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="placeholder-image">No Image</div>`);
    }
    $$renderer2.push(`<!--]--></a></div> <h4><a${attr("href", `/shop/apparel/${stringify(product.slug)}`)}>${escape_html(productTitle)}</a></h4> <h2>`);
    if (brandName && brandSlug) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<a${attr("href", `/shop/apparel/brands/${stringify(brandSlug)}`)}>${escape_html(brandName)}</a>`);
    } else {
      $$renderer2.push("<!--[!-->");
      if (brandName) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`${escape_html(brandName)}`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></h2> <p>From $${escape_html(price.toFixed(2))}</p></div></div>`);
  });
}
export {
  ApparelCard as A
};
