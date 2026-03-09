import { q as head, d as attr } from "./index2.js";
import { e as escape_html } from "./utils2.js";
function Meta($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { metadata = {} } = $$props;
    head($$renderer2, ($$renderer3) => {
      if (metadata.title) {
        $$renderer3.push("<!--[-->");
        $$renderer3.title(($$renderer4) => {
          $$renderer4.push(`<title>${escape_html(metadata.title)}</title>`);
        });
        $$renderer3.push(`<meta name="title"${attr("content", metadata.title)}/> <meta property="og:title"${attr("content", metadata.title)}/> <meta property="twitter:title"${attr("content", metadata.title)}/>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (metadata.description) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<meta name="description"${attr("content", metadata.description)}/> <meta property="og:description"${attr("content", metadata.description)}/> <meta property="twitter:description"${attr("content", metadata.description)}/>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (metadata.image) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<meta property="og:image"${attr("content", metadata.image)}/> <meta property="twitter:image"${attr("content", metadata.image)}/>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (metadata.imageAlt) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<meta property="og:image:alt"${attr("content", metadata.imageAlt)}/> <meta property="twitter:image:alt"${attr("content", metadata.imageAlt)}/>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (metadata.url) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<link rel="canonical"${attr("href", metadata.url)}/> <meta property="og:url"${attr("content", metadata.url)}/> <meta property="twitter:url"${attr("content", metadata.url)}/>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> `);
      if (metadata.product) {
        $$renderer3.push("<!--[-->");
        $$renderer3.push(`<meta property="og:type" content="og:product"/> <meta property="product:price:amount"${attr("content", metadata.product.price)}/> <meta property="product:price:currency" content="USD"/>`);
      } else {
        $$renderer3.push("<!--[!-->");
      }
      $$renderer3.push(`<!--]--> <meta property="twitter:card"${attr("content", metadata.twitterCard || "summary_large_image")}/>`);
    });
  });
}
export {
  Meta as M
};
