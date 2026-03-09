import { i as attr_style, e as stringify, d as attr, f as store_get, g as ensure_array_like, u as unsubscribe_stores } from "../../../../chunks/index2.js";
import { u as urlFor } from "../../../../chunks/payload2.js";
import { p as page } from "../../../../chunks/stores.js";
import { L as LexicalRenderer } from "../../../../chunks/LexicalRenderer.js";
import dayjs from "dayjs";
import { C as Chevron_right } from "../../../../chunks/chevron-right.js";
import { C as Calendar } from "../../../../chunks/calendar.js";
import { F as Facebook, T as Twitter } from "../../../../chunks/twitter.js";
import { A as Arrow_left } from "../../../../chunks/arrow-left.js";
import { e as escape_html } from "../../../../chunks/utils2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    var $$store_subs;
    let { data } = $$props;
    const { settings, post } = data;
    $$renderer2.push(`<section class="relative py-16 md:py-24 bg-cover bg-center overflow-hidden"${attr_style(`background-image: url(${stringify(urlFor(settings.banner).width(1920).height(600).auto("format").url())});`)}><div class="absolute inset-0 bg-gradient-to-br from-kente-forest/90 via-kente-indigo/80 to-kente-forest/90"></div> <div class="container relative z-10 mx-auto px-4"><nav class="flex items-center gap-2 text-white/80 mb-6"><a href="/" class="hover:text-kente-gold transition-colors">Home</a> `);
    Chevron_right($$renderer2, { class: "w-4 h-4" });
    $$renderer2.push(`<!----> <a href="/blog" class="hover:text-kente-gold transition-colors">News</a> `);
    Chevron_right($$renderer2, { class: "w-4 h-4" });
    $$renderer2.push(`<!----> <span class="text-kente-gold line-clamp-1">${escape_html(post.title)}</span></nav> <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white font-display max-w-4xl">${escape_html(post.title)}</h1></div></section> <section class="section bg-background"><div class="container mx-auto px-4"><div class="flex flex-col lg:flex-row gap-8 lg:gap-12"><article class="lg:w-2/3"><div class="relative rounded-2xl overflow-hidden mb-8"><img${attr("src", urlFor(post.mainImage).size(800, 450).url())}${attr("alt", post.title)} class="w-full h-auto"/> <div class="absolute bottom-4 left-4 bg-kente-gold text-primary-foreground px-4 py-2 rounded-lg font-semibold flex items-center gap-2">`);
    Calendar($$renderer2, { class: "w-4 h-4" });
    $$renderer2.push(`<!----> ${escape_html(dayjs(post.publishedAt).format("MMMM DD, YYYY"))}</div></div> <div class="prose prose-lg max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary hover:prose-a:text-primary/80 mb-8">`);
    LexicalRenderer($$renderer2, { content: post.body });
    $$renderer2.push(`<!----></div> <div class="flex items-center justify-between py-6 border-t border-b border-border mb-8"><span class="text-muted-foreground font-medium">Share this article:</span> <div class="flex items-center gap-3"><a${attr("href", `https://www.facebook.com/sharer.php?u=https://www.alkebulanimages.com${stringify(store_get($$store_subs ??= {}, "$page", page).url.pathname)}`)} target="_blank" rel="noopener noreferrer" class="p-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors" aria-label="Share on Facebook">`);
    Facebook($$renderer2, { class: "w-5 h-5" });
    $$renderer2.push(`<!----></a> <a${attr("href", `https://twitter.com/share?text=${stringify(encodeURIComponent(post.title))}&url=https://www.alkebulanimages.com${stringify(store_get($$store_subs ??= {}, "$page", page).url.pathname)}`)} target="_blank" rel="noopener noreferrer" class="p-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors" aria-label="Share on Twitter">`);
    Twitter($$renderer2, { class: "w-5 h-5" });
    $$renderer2.push(`<!----></a></div></div> `);
    if (post.author) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="flex flex-col sm:flex-row gap-6 p-6 bg-muted rounded-2xl mb-8">`);
      if (post.author.image) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<img${attr("src", urlFor(post.author.image).size(120, 120).url())}${attr("alt", post.author.name)} class="w-24 h-24 rounded-full object-cover flex-shrink-0"/>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--> <div><h3 class="text-xl font-bold mb-2">${escape_html(post.author.name)}</h3> `);
      if (post.author.bio) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<div class="text-muted-foreground">`);
        LexicalRenderer($$renderer2, { content: post.author.bio });
        $$renderer2.push(`<!----></div>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--> <a href="/blog" class="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all">`);
    Arrow_left($$renderer2, { class: "w-4 h-4" });
    $$renderer2.push(`<!----> Back to all articles</a></article> <aside class="lg:w-1/3"><div class="sticky top-24">`);
    if (post.latest && post.latest.length > 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="card-modern p-6"><h3 class="text-xl font-bold mb-6 pb-4 border-b border-border">Latest Posts</h3> <div class="space-y-4"><!--[-->`);
      const each_array = ensure_array_like(post.latest);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let l = each_array[$$index];
        $$renderer2.push(`<a${attr("href", `/blog/${stringify(l.slug)}`)} class="group flex gap-4">`);
        if (l.mainImage) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<img${attr("src", urlFor(l.mainImage).size(80, 80).url())}${attr("alt", l.mainImage.alt || l.title)} class="w-20 h-20 rounded-lg object-cover flex-shrink-0"/>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--> <div class="flex-grow"><h4 class="font-semibold line-clamp-2 group-hover:text-primary transition-colors">${escape_html(l.title)}</h4> `);
        if (l.publishedAt) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<p class="text-sm text-muted-foreground mt-1">${escape_html(dayjs(l.publishedAt).format("MMM DD, YYYY"))}</p>`);
        } else {
          $$renderer2.push("<!--[!-->");
        }
        $$renderer2.push(`<!--]--></div></a>`);
      }
      $$renderer2.push(`<!--]--></div></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
    }
    $$renderer2.push(`<!--]--></div></aside></div></div></section>`);
    if ($$store_subs) unsubscribe_stores($$store_subs);
  });
}
export {
  _page as default
};
