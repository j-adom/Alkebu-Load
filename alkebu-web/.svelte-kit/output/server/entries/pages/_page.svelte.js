import { i as attr_style, d as attr, e as stringify, g as ensure_array_like } from "../../chunks/index2.js";
import "@sveltejs/kit/internal";
import "../../chunks/exports.js";
import "../../chunks/utils.js";
import "@sveltejs/kit/internal/server";
import "../../chunks/state.svelte.js";
import { u as urlFor } from "../../chunks/payload2.js";
import { e as escape_html } from "../../chunks/utils2.js";
import "clsx";
import { A as AddToCartButton } from "../../chunks/AddToCartButton.js";
import { f as formatCurrency } from "../../chunks/currency.js";
import { M as Meta } from "../../chunks/Meta.js";
import { A as Arrow_right } from "../../chunks/arrow-right.js";
function BookCover($$renderer, $$props) {
  let { title, subtitle } = $$props;
  $$renderer.push(`<div class="book-cover svelte-1q8ca3m"><div class="fade svelte-1q8ca3m"><p class="book-title svelte-1q8ca3m">${escape_html(title)}</p> <br/> `);
  if (subtitle) {
    $$renderer.push("<!--[-->");
    $$renderer.push(`<p class="book-subtitle svelte-1q8ca3m">${escape_html(subtitle)}</p>`);
  } else {
    $$renderer.push("<!--[!-->");
  }
  $$renderer.push(`<!--]--> <br/> <br/> <br/> <br/></div></div>`);
}
function _page($$renderer, $$props) {
  $$renderer.component(($$renderer2) => {
    let { data } = $$props;
    const { banner, section2, section3, section4, featured, newBooks } = data;
    const metadata = {
      title: `Alkebu-Lan Images, Nashville's only Black-owned bookstore`,
      description: `Alkebu-Lan Images is a Black-Owned bookstore that has been Nashville's center for promoting positivity in Black culture and empowering diverse Black lifestyles since 1986`,
      image: "/assets/images/resources/logo.png",
      imageAlt: "Alkebu-Lan Images Logo",
      url: "/"
    };
    const shopCategories = [
      {
        title: "Books",
        desc: "Our extensive range of books on Black topics by Black authors.",
        href: "/shop/books",
        imageIndex: 0
      },
      {
        title: "Apparel",
        desc: "Clothing and Accessories for the Black esthetic",
        href: "/shop/apparel",
        imageIndex: 1
      },
      {
        title: "Health & Beauty",
        desc: "All-natural products for your skin, hair, and health",
        href: "/shop/health-and-beauty",
        imageIndex: 2
      },
      {
        title: "Art & Imports",
        desc: "Decorate your home with unique African imports and prints",
        href: "/shop/home-goods",
        imageIndex: 3
      }
    ];
    const businessServices = section4?.images ? [
      {
        title: "Wholesale",
        subtitle: "solutions",
        image: section4.images[0],
        desc: "Partner with us for bulk orders and wholesale pricing for retailers and distributors."
      },
      {
        title: "Institutional",
        subtitle: "Contracts",
        image: section4.images[1],
        desc: "Libraries, schools, and organizations can benefit from our institutional partnerships."
      },
      {
        title: "Non-profit",
        subtitle: "projects",
        image: section4.images[2],
        desc: "We support community initiatives and non-profit organizations with special programs."
      }
    ] : [];
    Meta($$renderer2, { metadata });
    $$renderer2.push(`<!----> <section class="banner-section banner-one"><div class="banner-carousel"><div class="slide-item"><div class="image-layer"${attr_style(`background-image: url(${stringify(urlFor(banner.bannerImages[0]).width(1920).height(780).auto("format").url())});`)}></div> <div class="container mx-auto"><div class="content-box"><div class="content"><div class="inner"><div class="sub-title">Elevating Black Lifestyles</div> <h1>Welcome to<br/> Alkebu-Lan Images</h1> <div class="link-box"><a href="/shop" class="btn-primary btn-lg">Shop Now</a></div></div></div></div></div></div></div></section>  <section class="section bg-background"><div class="container mx-auto px-4"><div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"><div class="relative"><div class="grid grid-cols-12 gap-4"><div class="col-span-8"><img class="w-full h-auto rounded-2xl shadow-medium" loading="lazy"${attr("src", urlFor(section2.images[0]).width(500).height(600).auto("format").url())}${attr("alt", section2.images[0].alt)}/></div> <div class="col-span-4 flex items-end"><div class="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-glow"><span class="text-3xl text-primary-foreground font-bold">35+</span></div></div></div> <div class="absolute -bottom-8 right-8 w-2/3"><img class="w-full h-auto rounded-2xl shadow-strong border-4 border-background" loading="lazy"${attr("src", urlFor(section2.images[1]).width(400).height(300).auto("format").url())}${attr("alt", section2.images[1].alt)}/></div></div> <div class="lg:pl-8"><p class="text-primary font-semibold uppercase tracking-wide mb-2">About Alkebu-lan</p> <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-6">We curate the whole Black experience: mind, body, and soul</h2> <div class="w-20 h-1 bg-primary mb-8"></div> <p class="text-lg text-muted-foreground mb-8">Over the last 35 years, Alkebu-Lan Images has created a
					shopping experience found in few places around the world.
					Our goal is to bring all the accoutrements of the Black
					esthetic under one roof to promote positive Black lifestyles
					for our customers.</p> <div class="grid grid-cols-2 gap-6 mb-8"><div class="flex items-center gap-4"><div class="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><img loading="lazy" class="w-10 h-10" src="/assets/images/alkebulan/sankofa.svg" alt="SANKOFA"/></div> <p class="font-medium text-sm">Connecting our present to our past</p></div> <div class="flex items-center gap-4"><div class="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"><img loading="lazy" class="w-10 h-10" src="/assets/images/alkebulan/crocs.svg" alt="FUNTUNFUNEFU-DENKYEMFUNEFU"/></div> <p class="font-medium text-sm">Strength and unity through knowledge</p></div></div> <p class="text-muted-foreground mb-8">As mainstream retailers provide less and less service to
					customers while at the same time making it more and more
					difficult to find quality products, Alkebu-Lan Images
					strives to empower our customers in their search for
					products that amplify diverse, Afrocentric lifestyles.</p> <a href="/about" class="btn-outline inline-flex items-center gap-2">Learn More `);
    Arrow_right($$renderer2, { class: "w-4 h-4" });
    $$renderer2.push(`<!----></a></div></div></div></section> <section class="py-20 bg-muted/30"><div class="container mx-auto px-4"><div class="text-center mb-12"><p class="text-primary font-semibold uppercase tracking-wide mb-2">Shop Our Store Online</p> <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-4">Products We Offer</h2> <div class="w-20 h-1 bg-primary mx-auto"></div></div> <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"><!--[-->`);
    const each_array = ensure_array_like(shopCategories);
    for (let i = 0, $$length = each_array.length; i < $$length; i++) {
      let cat = each_array[i];
      $$renderer2.push(`<a${attr("href", cat.href)} class="group"><div class="card-modern overflow-hidden h-full"><div class="relative aspect-[4/3] overflow-hidden">`);
      if (section3.images?.[cat.imageIndex]) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<img loading="lazy"${attr("src", urlFor(section3.images[cat.imageIndex]).width(400).height(300).auto("format").url())}${attr("alt", section3.images[cat.imageIndex]?.alt || cat.title)} class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/>`);
      } else {
        $$renderer2.push("<!--[!-->");
        $$renderer2.push(`<img loading="lazy" src="/assets/images/resources/placeholder.jpg"${attr("alt", cat.title)} class="w-full h-full object-cover"/>`);
      }
      $$renderer2.push(`<!--]--> <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div> <div class="absolute bottom-4 left-4 right-4 text-white"><h3 class="text-xl font-bold mb-1">Shop ${escape_html(cat.title)}</h3></div></div> <div class="p-5"><p class="text-muted-foreground text-sm mb-4">${escape_html(cat.desc)}</p> <span class="inline-flex items-center gap-2 text-primary font-semibold text-sm group-hover:gap-3 transition-all">Browse ${escape_html(cat.title)} `);
      Arrow_right($$renderer2, { class: "w-4 h-4" });
      $$renderer2.push(`<!----></span></div></div></a>`);
    }
    $$renderer2.push(`<!--]--></div></div></section> <section class="section bg-background"><div class="container mx-auto px-4"><div class="text-center mb-12"><p class="text-primary font-semibold uppercase tracking-wide mb-2">Keep Shopping</p> <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-4">Our Featured Titles</h2> <div class="w-20 h-1 bg-primary mx-auto"></div></div> <div class="grid grid-cols-2 md:grid-cols-4 gap-6"><!--[-->`);
    const each_array_1 = ensure_array_like(featured);
    for (let index = 0, $$length = each_array_1.length; index < $$length; index++) {
      let book = each_array_1[index];
      if (index < 8) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<a${attr("href", `/shop/books/${stringify(book.slug)}/${stringify(book.id)}/`)} class="group"><div class="card-modern overflow-hidden h-full"><div class="relative aspect-[3/4] overflow-hidden bg-muted">`);
        if (book.images) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<img loading="lazy"${attr("src", urlFor(book.images).fit("fill").auto("format").url())}${attr("alt", book.title)} class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>`);
        } else {
          $$renderer2.push("<!--[!-->");
          BookCover($$renderer2, { title: book.title, subtitle: book.sibtitle });
        }
        $$renderer2.push(`<!--]--> <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"><div class="absolute bottom-4 left-0 right-0 flex justify-center">`);
        AddToCartButton($$renderer2, {
          className: "btn-primary btn-sm",
          productId: book.id || book._id,
          productType: "books",
          iconOnly: true,
          label: `Add ${book.title} to cart`
        });
        $$renderer2.push(`<!----></div></div></div> <div class="p-4 text-center"><h4 class="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-2">${escape_html(book.title)} (${escape_html(book.binding)})</h4> <p class="text-lg font-bold text-primary">${escape_html(formatCurrency(book.price || book.pricing?.retailPrice || 0))}</p></div></div></a>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div></div></section> <section class="section bg-muted/30"><div class="container mx-auto px-4"><div class="text-center mb-12"><p class="text-primary font-semibold uppercase tracking-wide mb-2">Fresh Arrivals</p> <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-4">Newly Added Books</h2> <div class="w-20 h-1 bg-primary mx-auto"></div></div> <div class="grid grid-cols-2 md:grid-cols-4 gap-6"><!--[-->`);
    const each_array_2 = ensure_array_like(newBooks);
    for (let index = 0, $$length = each_array_2.length; index < $$length; index++) {
      let book = each_array_2[index];
      if (index < 8) {
        $$renderer2.push("<!--[-->");
        $$renderer2.push(`<a${attr("href", `/shop/books/${stringify(book.slug)}/${stringify(book.id)}/`)} class="group"><div class="card-modern overflow-hidden h-full"><div class="relative aspect-[3/4] overflow-hidden bg-muted">`);
        if (book.images) {
          $$renderer2.push("<!--[-->");
          $$renderer2.push(`<img loading="lazy"${attr("src", urlFor(book.images).fit("fill").auto("format").url())}${attr("alt", book.title)} class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>`);
        } else {
          $$renderer2.push("<!--[!-->");
          BookCover($$renderer2, { title: book.title, subtitle: book.sibtitle });
        }
        $$renderer2.push(`<!--]--> <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"><div class="absolute bottom-4 left-0 right-0 flex justify-center">`);
        AddToCartButton($$renderer2, {
          className: "btn-primary btn-sm",
          productId: book.id || book._id,
          productType: "books",
          iconOnly: true,
          label: `Add ${book.title} to cart`
        });
        $$renderer2.push(`<!----></div></div></div> <div class="p-4 text-center"><h4 class="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-2">${escape_html(book.title)} (${escape_html(book.binding)})</h4> <p class="text-lg font-bold text-primary">${escape_html(formatCurrency(book.price || book.pricing?.retailPrice || 0))}</p></div></div></a>`);
      } else {
        $$renderer2.push("<!--[!-->");
      }
      $$renderer2.push(`<!--]-->`);
    }
    $$renderer2.push(`<!--]--></div></div></section> <section class="section bg-background"><div class="container mx-auto px-4"><div class="text-center mb-12"><p class="text-primary font-semibold uppercase tracking-wide mb-2">Let's Work Together</p> <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-4">More than just Retail</h2> <div class="w-20 h-1 bg-primary mx-auto"></div></div> <div class="grid grid-cols-1 md:grid-cols-3 gap-8"><!--[-->`);
    const each_array_3 = ensure_array_like(businessServices);
    for (let i = 0, $$length = each_array_3.length; i < $$length; i++) {
      let service = each_array_3[i];
      $$renderer2.push(`<a href="/contact" class="group"><div class="card-modern overflow-hidden h-full"><div class="relative aspect-[3/4] overflow-hidden"><img loading="lazy"${attr("src", urlFor(service.image).width(370).height(484).auto("format").url())}${attr("alt", service.image?.alt || `${service.title} ${service.subtitle}`)} class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"/> <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div> <div class="absolute bottom-0 left-0 right-0 p-6 text-white"><h3 class="text-2xl font-bold font-display mb-2">${escape_html(service.title)}<br/>${escape_html(service.subtitle)}</h3> <p class="text-white/80 text-sm mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">${escape_html(service.desc)}</p> <span class="inline-flex items-center gap-2 text-primary font-semibold text-sm group-hover:gap-3 transition-all">Contact Us `);
      Arrow_right($$renderer2, { class: "w-4 h-4" });
      $$renderer2.push(`<!----></span></div></div></div></a>`);
    }
    $$renderer2.push(`<!--]--></div></div></section>`);
  });
}
export {
  _page as default
};
