import { i as attr_style, g as ensure_array_like } from "../../../../../chunks/index2.js";
import { M as Meta } from "../../../../../chunks/Meta.js";
import { P as PayloadImage } from "../../../../../chunks/PayloadImage.js";
import { A as AddToCartButton } from "../../../../../chunks/AddToCartButton.js";
import { A as ApparelCard } from "../../../../../chunks/ApparelCard.js";
import { f as formatCurrency } from "../../../../../chunks/currency.js";
import { g as getImageUrl } from "../../../../../chunks/payload2.js";
import { e as escape_html } from "../../../../../chunks/utils2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    const normalizePrice = (value) => {
      if (typeof value !== "number") return null;
      return value > 1e3 ? value / 100 : value;
    };
    const toPlainText = (content) => {
      if (!content) return "";
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content.map((block) => block?.children?.map((child) => child?.text).join(" ") || "").join("\n").trim();
      }
      return "";
    };
    let { data } = $$props;
    const product = data.product;
    const seo = data.seo;
    const relatedProducts = data.relatedProducts ?? [];
    const productName = product?.name || product?.title || "Product";
    const productId = product?.id || product?._id;
    const description = toPlainText(product?.shortDescription) || toPlainText(product?.description) || "Celebrate culture and style with this Alkebu-Lan Images piece.";
    const gallery = () => {
      const uploads = Array.isArray(product?.images) ? product.images.map((img) => img?.image || img).filter(Boolean) : [];
      const scraped = Array.isArray(product?.scrapedImageUrls) ? product.scrapedImageUrls.map((img) => ({ url: img?.url, alt: productName })).filter(Boolean) : [];
      return [...uploads, ...scraped];
    };
    const heroImage = Array.isArray(gallery) ? gallery[0] : void 0;
    const secondaryImages = Array.isArray(gallery) ? gallery.slice(1, 5) : [];
    const basePrice = normalizePrice(product?.price) ?? normalizePrice(product?.pricing?.retailPrice) ?? normalizePrice(product?.variations?.[0]?.price) ?? 0;
    const variations = product?.variations || [];
    const availableTypes = product?.availableProductTypes || [];
    const availableSizes = product?.availableSizes || [];
    const availableColors = product?.availableColors?.map((c) => c.colorName || c) || [];
    let selectedType = variations.find((v) => v.isAvailable)?.productType || availableTypes[0];
    let selectedSize = variations.find((v) => v.isAvailable)?.size || availableSizes[0];
    let selectedColor = variations.find((v) => v.isAvailable)?.color || availableColors[0];
    const selectedVariation = () => variations.find((variation) => (!selectedType || variation.productType === selectedType) && (!selectedSize || variation.size === selectedSize) && (!selectedColor || variation.color === selectedColor)) || variations[0];
    const displayPrice = normalizePrice(selectedVariation?.price) ?? basePrice;
    const inStock = selectedVariation?.isAvailable !== false;
    const customization = () => ({
      productType: selectedType,
      size: selectedSize,
      color: selectedColor,
      variationSku: selectedVariation?.sku
    });
    const tags = product?.tags?.map((tag) => tag.tag).filter(Boolean) || [];
    const collections = product?.collections?.map((c) => c.collectionName).filter(Boolean) || [];
    const metadata = () => seo ?? {
      title: `${productName} | Alkebu-Lan Images`,
      description,
      image: heroImage ? getImageUrl(heroImage, { size: "card" }) : void 0,
      imageAlt: productName,
      url: `/shop/apparel/${product?.slug || ""}`
    };
    Meta($$renderer2, { metadata });
    $$renderer2.push(`<!----> <section class="page-header svelte-1bdnocd"${attr_style(heroImage ? `background-image: linear-gradient(90deg, rgba(23,23,23,0.65), rgba(23,23,23,0.45)), url(${getImageUrl(heroImage, { size: "hero" })});` : "")}><div class="container"><h2>${escape_html(productName)}</h2> <ul class="flex items-center gap-2 text-sm text-white/80"><li><a href="/">Home</a></li> <li><a href="/shop" class="shop_style">Shop</a></li> <li><a href="/shop/apparel">Apparel</a></li> <li><span>${escape_html(productName)}</span></li></ul></div></section> <section class="product-detail py-12"><div class="container mx-auto px-6 lg:px-12"><div class="grid grid-cols-1 lg:grid-cols-2 gap-10"><div>`);
    if (heroImage) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="rounded-xl overflow-hidden shadow bg-white mb-4">`);
      PayloadImage($$renderer2, { image: heroImage, alt: productName, maxWidth: 900 });
      $$renderer2.push(`<!----></div> `);
      if (secondaryImages.length) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="grid grid-cols-4 gap-3"><!--[-->`);
        const each_array = ensure_array_like(secondaryImages);
        for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
          let image = each_array[$$index];
          $$renderer2.push(`<div class="rounded-lg overflow-hidden border border-gray-100 bg-white">`);
          PayloadImage($$renderer2, { image, alt: productName, maxWidth: 200 });
          $$renderer2.push(`<!----></div>`);
        }
        $$renderer2.push(`<!--]--></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="aspect-square bg-gray-100 rounded-lg flex items-center justify-center"><i class="fas fa-image text-4xl text-gray-400"></i></div>`);
    }
    $$renderer2.push(`<!--]--></div> <div class="space-y-5">`);
    if (product?.brand) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-sm uppercase tracking-wide text-primary font-semibold">${escape_html(product.brand)}</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <h1 class="text-3xl lg:text-4xl font-bold text-foreground leading-tight">${escape_html(productName)}</h1> `);
    if (product?.shortDescription) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<p class="text-lg text-gray-700">${escape_html(product.shortDescription)}</p>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="flex items-center gap-4"><p class="text-4xl font-semibold text-primary">${escape_html(formatCurrency(displayPrice))}</p> `);
    if (!inStock) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-50 text-red-700"><i class="fas fa-times-circle mr-2"></i> Out of Stock</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-50 text-green-700"><i class="fas fa-check-circle mr-2"></i> In Stock</span>`);
    }
    $$renderer2.push(`<!--]--></div> `);
    if (variations.length || availableTypes.length || availableSizes.length || availableColors.length) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">`);
      if (availableTypes.length) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<label class="flex flex-col gap-2 text-sm font-semibold text-gray-700">Product Type `);
        $$renderer2.select(
          { class: "form-select", value: selectedType },
          ($$renderer3) => {
            $$renderer3.push(`<!--[-->`);
            const each_array_1 = ensure_array_like(availableTypes);
            for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
              let type = each_array_1[$$index_1];
              $$renderer3.option({ value: type }, ($$renderer4) => {
                $$renderer4.push(`${escape_html(type)}`);
              });
            }
            $$renderer3.push(`<!--]-->`);
          },
          "svelte-1bdnocd"
        );
        $$renderer2.push(`</label>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (availableSizes.length) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<label class="flex flex-col gap-2 text-sm font-semibold text-gray-700">Size `);
        $$renderer2.select(
          { class: "form-select", value: selectedSize },
          ($$renderer3) => {
            $$renderer3.push(`<!--[-->`);
            const each_array_2 = ensure_array_like(availableSizes);
            for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
              let size = each_array_2[$$index_2];
              $$renderer3.option({ value: size }, ($$renderer4) => {
                $$renderer4.push(`${escape_html(size.toUpperCase ? size.toUpperCase() : size)}`);
              });
            }
            $$renderer3.push(`<!--]-->`);
          },
          "svelte-1bdnocd"
        );
        $$renderer2.push(`</label>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> `);
      if (availableColors.length) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<label class="flex flex-col gap-2 text-sm font-semibold text-gray-700">Color `);
        $$renderer2.select(
          { class: "form-select", value: selectedColor },
          ($$renderer3) => {
            $$renderer3.push(`<!--[-->`);
            const each_array_3 = ensure_array_like(availableColors);
            for (let $$index_3 = 0, $$length = each_array_3.length; $$index_3 < $$length; $$index_3++) {
              let color = each_array_3[$$index_3];
              $$renderer3.option({ value: color }, ($$renderer4) => {
                $$renderer4.push(`${escape_html(color)}`);
              });
            }
            $$renderer3.push(`<!--]-->`);
          },
          "svelte-1bdnocd"
        );
        $$renderer2.push(`</label>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <div class="flex flex-col sm:flex-row gap-3">`);
    AddToCartButton($$renderer2, {
      productId,
      productType: "fashion-jewelry",
      customization,
      className: "btn-primary text-center min-w-[200px]",
      disabled: !inStock,
      label: inStock ? "Add to Cart" : "Unavailable"
    });
    $$renderer2.push(`<!----> <div class="flex flex-wrap gap-3 text-sm text-gray-600">`);
    if (product?.style) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="badge svelte-1bdnocd">Style: ${escape_html(product.style)}</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (product?.primaryType) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="badge svelte-1bdnocd">Primary: ${escape_html(product.primaryType)}</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (product?.targetAudience?.length) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<span class="badge svelte-1bdnocd">For ${escape_html(product.targetAudience.join(", "))}</span>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></div> <div class="bg-muted rounded-lg p-6 space-y-4"><h3 class="text-xl font-semibold text-foreground">Product Details</h3> <p class="text-gray-700 leading-relaxed whitespace-pre-line">${escape_html(description)}</p> <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">`);
    if (product?.vendor?.name) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div><dt class="font-semibold">Vendor</dt> <dd>${escape_html(product.vendor.name)}</dd></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (product?.sizingNotes) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div><dt class="font-semibold">Sizing</dt> <dd>${escape_html(product.sizingNotes)}</dd></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (availableColors.length) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div><dt class="font-semibold">Available Colors</dt> <dd class="flex flex-wrap gap-2"><!--[-->`);
      const each_array_4 = ensure_array_like(availableColors);
      for (let $$index_4 = 0, $$length = each_array_4.length; $$index_4 < $$length; $$index_4++) {
        let color = each_array_4[$$index_4];
        $$renderer2.push(`<span class="inline-flex items-center px-3 py-1 rounded-full bg-white border text-xs">${escape_html(color)}</span>`);
      }
      $$renderer2.push(`<!--]--></dd></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (availableSizes.length) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div><dt class="font-semibold">Available Sizes</dt> <dd>${escape_html(availableSizes.join(", "))}</dd></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (collections.length) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div><dt class="font-semibold">Collections</dt> <dd>${escape_html(collections.join(", "))}</dd></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (tags.length) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div><dt class="font-semibold">Tags</dt> <dd class="flex flex-wrap gap-2"><!--[-->`);
      const each_array_5 = ensure_array_like(tags);
      for (let $$index_5 = 0, $$length = each_array_5.length; $$index_5 < $$length; $$index_5++) {
        let tag = each_array_5[$$index_5];
        $$renderer2.push(`<span class="inline-flex items-center px-3 py-1 rounded-full bg-white border text-xs">#${escape_html(tag)}</span>`);
      }
      $$renderer2.push(`<!--]--></dd></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> `);
    if (product?.categories?.length) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div><dt class="font-semibold">Categories</dt> <dd>${escape_html(product.categories.join(", "))}</dd></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></dl></div></div></div></div></section> `);
    if (relatedProducts.length) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<section class="py-12 bg-muted"><div class="container mx-auto px-6 lg:px-12"><div class="flex items-center justify-between mb-6"><div><p class="text-primary font-semibold uppercase text-xs">You may also like</p> <h2 class="text-2xl font-bold text-foreground">Related Apparel</h2></div> <a href="/shop/apparel" class="text-primary text-sm font-semibold">Browse all</a></div> <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"><!--[-->`);
      const each_array_6 = ensure_array_like(relatedProducts);
      for (let $$index_6 = 0, $$length = each_array_6.length; $$index_6 < $$length; $$index_6++) {
        let product2 = each_array_6[$$index_6];
        ApparelCard($$renderer2, { product: product2 });
      }
      $$renderer2.push(`<!--]--></div></div></section>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]-->`);
  });
}
export {
  _page as default
};
