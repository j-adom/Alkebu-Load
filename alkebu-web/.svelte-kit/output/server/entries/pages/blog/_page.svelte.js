import { i as attr_style, g as ensure_array_like, d as attr, e as stringify } from "../../../chunks/index2.js";
import { L as LexicalRenderer } from "../../../chunks/LexicalRenderer.js";
import { M as Meta } from "../../../chunks/Meta.js";
import { u as urlFor } from "../../../chunks/payload2.js";
import dayjs from "dayjs";
import { C as Chevron_right } from "../../../chunks/chevron-right.js";
import { C as Calendar } from "../../../chunks/calendar.js";
import { A as Arrow_right } from "../../../chunks/arrow-right.js";
import { e as escape_html } from "../../../chunks/utils2.js";
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const posts = data.posts || [];
    const settings = data.settings || {};
    const metadata = data.seo;
    const placeholderImage = "/assets/images/resources/placeholder.jpg";
    const bannerUrl = settings.banner ? urlFor(settings.banner).width(1920).height(600).auto("format").url() : "/assets/images/resources/page-header-bg.jpg";
    const imageForPost = (post) => urlFor(post.mainImage || post.featuredImage || placeholderImage).width(400).height(300).auto("format").url();
    Meta($$renderer2, { metadata });
    $$renderer2.push(`<!----> <section class="relative py-20 md:py-28 bg-cover bg-center overflow-hidden"${attr_style(`background-image: url(${bannerUrl});`)}><div class="absolute inset-0 bg-gradient-to-br from-kente-forest/90 via-kente-indigo/80 to-kente-forest/90"></div> <div class="container relative z-10 mx-auto px-4 text-center"><h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 font-display">Habari Gani?</h1> <p class="text-xl md:text-2xl text-white/90 mb-6">(What's the News?)</p> <nav class="flex items-center justify-center gap-2 text-white/80"><a href="/" class="hover:text-kente-gold transition-colors">Home</a> `);
    Chevron_right($$renderer2, { class: "w-4 h-4" });
    $$renderer2.push(`<!----> <span class="text-kente-gold">News</span></nav></div></section> <section class="section bg-background"><div class="container mx-auto px-4">`);
    if (posts.length === 0) {
      $$renderer2.push("<!--[-->");
      $$renderer2.push(`<div class="text-center py-16"><p class="text-muted-foreground text-lg">No posts available yet. Check back soon!</p></div>`);
    } else {
      $$renderer2.push("<!--[!-->");
      $$renderer2.push(`<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"><!--[-->`);
      const each_array = ensure_array_like(posts);
      for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
        let post = each_array[$$index];
        $$renderer2.push(`<article class="group card-modern flex flex-col"><a${attr("href", `/blog/${stringify(post.slug)}`)} class="block relative overflow-hidden aspect-[4/3]">`);
        if (post.mainImage || post.featuredImage) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<img${attr("src", imageForPost(post))}${attr("alt", post.title)} loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>`);
        } else {
          $$renderer2.push("<!--[!-->");
          $$renderer2.push(`<img${attr("src", placeholderImage)} alt="Placeholder" loading="lazy" class="w-full h-full object-cover"/>`);
        }
        $$renderer2.push(`<!--]--> <div class="absolute top-4 left-4 bg-kente-gold text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5">`);
        Calendar($$renderer2, { class: "w-4 h-4" });
        $$renderer2.push(`<!----> ${escape_html(dayjs(post.publishedAt).format("MMM DD, YYYY"))}</div></a> <div class="p-6 flex flex-col flex-grow"><h3 class="text-xl font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors"><a${attr("href", `/blog/${stringify(post.slug)}`)}>${escape_html(post.title)}</a></h3> <div class="text-muted-foreground mb-4 line-clamp-3 flex-grow">`);
        LexicalRenderer($$renderer2, { content: post.excerpt });
        $$renderer2.push(`<!----></div> <a${attr("href", `/blog/${stringify(post.slug)}`)} class="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all">Read More `);
        Arrow_right($$renderer2, { class: "w-4 h-4" });
        $$renderer2.push(`<!----></a></div></article>`);
      }
      $$renderer2.push(`<!--]--></div>`);
    }
    $$renderer2.push(`<!--]--></div></section>`);
  });
}
export {
  _page as default
};
