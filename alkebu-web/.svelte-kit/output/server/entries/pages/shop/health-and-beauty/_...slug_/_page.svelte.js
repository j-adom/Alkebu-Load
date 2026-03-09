import { i as attr_style, e as stringify, g as ensure_array_like } from "../../../../../chunks/index2.js";
import { M as Meta } from "../../../../../chunks/Meta.js";
import { P as PayloadImage } from "../../../../../chunks/PayloadImage.js";
import { A as AddToCartButton } from "../../../../../chunks/AddToCartButton.js";
import { f as formatCurrency } from "../../../../../chunks/currency.js";
import { e as escape_html } from "../../../../../chunks/utils2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const { product, productType, seo } = data;
    const price = product.pricing?.retailPrice || product.price || 0;
    const inStock = product.inventory?.trackInventory ? product.inventory.stockLevel > 0 : true;
    Meta($$renderer2, { metadata: seo });
    $$renderer2.push(`<!----> <section class="page-header"${attr_style(`background-image: url(${stringify(product.images?.[0]?.url || "/assets/images/resources/page-header-bg.jpg")});`)}><div class="container"><h2>${escape_html(product.title)}</h2> <ul class="flex items-center gap-2 text-sm text-white/80"><li><a href="/">Home</a></li> <li><a href="/shop">Shop</a></li> <li><a href="/shop/health-and-beauty">Health &amp; Beauty</a></li> <li><span>${escape_html(product.title)}</span></li></ul></div></section> <section class="product-detail py-12"><div class="container mx-auto px-6 lg:px-12"><div class="grid grid-cols-1 lg:grid-cols-2 gap-12"><div><div class="sticky top-24">`);
    if (product.images && product.images.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mb-4 rounded-lg overflow-hidden bg-white shadow-lg">`);
      PayloadImage($$renderer2, { image: product.images[0], alt: product.title, maxWidth: 600 });
      $$renderer2.push(`<!----></div> `);
      if (product.images.length > 1) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="grid grid-cols-4 gap-2"><!--[-->`);
        const each_array = ensure_array_like(product.images.slice(1, 5));
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let image = each_array[$$index];
          $$renderer2.push(`<div class="rounded overflow-hidden cursor-pointer hover:opacity-75 transition-opacity">`);
          PayloadImage($$renderer2, { image, alt: product.title, maxWidth: 150 });
          $$renderer2.push(`<!----></div>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="aspect-square bg-gray-200 rounded-lg flex items-center justify-center"><i class="fas fa-image text-6xl text-gray-400"></i></div>`);
    }
    $$renderer2.push(`<!--]--></div></div> <div><div class="mb-6">`);
    if (product.brand) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-sm text-primary mb-2 uppercase tracking-wide font-semibold">${escape_html(product.brand.name)}</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <h1 class="text-3xl lg:text-4xl font-bold mb-4 text-foreground">${escape_html(product.title)}</h1> `);
    if (product.subtitle) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-xl text-gray-600 mb-4">${escape_html(product.subtitle)}</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="mb-6"><p class="text-4xl font-bold text-primary">${escape_html(formatCurrency(price))}</p> `);
    if (product.pricing?.compareAtPrice && product.pricing.compareAtPrice > price) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-lg text-gray-500 line-through">${escape_html(formatCurrency(product.pricing.compareAtPrice))}</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div> <div class="mb-6">`);
    if (inStock) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"><i class="fas fa-check-circle mr-2"></i> In Stock</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"><i class="fas fa-times-circle mr-2"></i> Out of Stock</span>`);
    }
    $$renderer2.push(`<!--]--></div></div> `);
    if (product.description) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="mb-8"><h2 class="text-2xl font-bold mb-4 text-foreground">About This Product</h2> <div class="prose max-w-none"><p class="text-gray-700 leading-relaxed">${escape_html(product.description)}</p></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="mb-8"><h3 class="text-xl font-bold mb-4 text-foreground">Product Details</h3> <dl class="space-y-2">`);
    if (product.sku) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex justify-between py-2 border-b border-gray-200"><dt class="font-medium text-gray-700">SKU:</dt> <dd class="text-gray-600">${escape_html(product.sku)}</dd></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (product.size) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex justify-between py-2 border-b border-gray-200"><dt class="font-medium text-gray-700">Size:</dt> <dd class="text-gray-600">${escape_html(product.size)}</dd></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (product.weight) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex justify-between py-2 border-b border-gray-200"><dt class="font-medium text-gray-700">Weight:</dt> <dd class="text-gray-600">${escape_html(product.weight)}</dd></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (product.ingredients || product.materials) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex justify-between py-2 border-b border-gray-200"><dt class="font-medium text-gray-700">Ingredients/Materials:</dt> <dd class="text-gray-600">${escape_html(product.ingredients || product.materials)}</dd></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></dl></div> <div class="mb-8">`);
    AddToCartButton($$renderer2, {
      productId: product.id,
      productType,
      disabled: !inStock,
      className: "btn-primary w-full text-center text-lg py-4",
      label: inStock ? "Add to Cart" : "Out of Stock"
    });
    $$renderer2.push(`<!----></div> `);
    if (product.howToUse) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="bg-muted rounded-lg p-6 mb-6"><h3 class="text-lg font-bold mb-3 text-foreground"><i class="far fa-info-circle mr-2"></i> How to Use</h3> <p class="text-gray-700">${escape_html(product.howToUse)}</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (product.warnings) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6"><h3 class="text-lg font-bold mb-3 text-yellow-800"><i class="far fa-exclamation-triangle mr-2"></i> Warnings &amp; Precautions</h3> <p class="text-yellow-700 text-sm">${escape_html(product.warnings)}</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div></div></section>`);
  });
}
export {
  _page as default
};
