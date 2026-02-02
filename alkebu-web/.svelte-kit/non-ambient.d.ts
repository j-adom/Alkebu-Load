
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/(app)" | "/" | "/about" | "/api" | "/api/cart" | "/api/cart/add" | "/api/cart/clear" | "/api/cart/remove" | "/api/cart/summary" | "/api/cart/update" | "/api/checkout" | "/api/media" | "/api/media/file" | "/api/media/file/[...path]" | "/blog" | "/blog/[slug]" | "/cart" | "/(app)/cart" | "/checkout" | "/checkout/success" | "/contact" | "/directory" | "/directory/[slug]" | "/events" | "/events/[slug]" | "/login" | "/privacy" | "/return-policy" | "/robots.txt" | "/search" | "/shop" | "/shop/apparel" | "/shop/apparel/brands" | "/shop/apparel/brands/[slug]" | "/shop/apparel/categories" | "/shop/apparel/categories/[slug]" | "/shop/apparel/tags" | "/shop/apparel/tags/[slug]" | "/shop/apparel/[...slug]" | "/shop/books" | "/shop/books/authors" | "/shop/books/authors/[slug]" | "/shop/books/collections" | "/shop/books/collections/[slug]" | "/shop/books/genres" | "/shop/books/genres/[slug]" | "/shop/books/tags" | "/shop/books/tags/[slug]" | "/shop/books/[slug]" | "/shop/books/[slug]/[isbn]" | "/shop/books/[...slug]" | "/shop/health-and-beauty" | "/shop/health-and-beauty/collections" | "/shop/health-and-beauty/collections/[slug]" | "/shop/health-and-beauty/tags" | "/shop/health-and-beauty/tags/[slug]" | "/shop/health-and-beauty/types" | "/shop/health-and-beauty/types/[slug]" | "/shop/health-and-beauty/[...slug]" | "/shop/home-goods" | "/shop/home-goods/collections" | "/shop/home-goods/collections/[slug]" | "/shop/home-goods/tags" | "/shop/home-goods/tags/[slug]" | "/shop/home-goods/types" | "/shop/home-goods/types/[slug]" | "/shop/home-goods/[...slug]" | "/sitemap.xml" | "/terms-of-service";
		RouteParams(): {
			"/api/media/file/[...path]": { path: string };
			"/blog/[slug]": { slug: string };
			"/directory/[slug]": { slug: string };
			"/events/[slug]": { slug: string };
			"/shop/apparel/brands/[slug]": { slug: string };
			"/shop/apparel/categories/[slug]": { slug: string };
			"/shop/apparel/tags/[slug]": { slug: string };
			"/shop/apparel/[...slug]": { slug: string };
			"/shop/books/authors/[slug]": { slug: string };
			"/shop/books/collections/[slug]": { slug: string };
			"/shop/books/genres/[slug]": { slug: string };
			"/shop/books/tags/[slug]": { slug: string };
			"/shop/books/[slug]": { slug: string };
			"/shop/books/[slug]/[isbn]": { slug: string; isbn: string };
			"/shop/books/[...slug]": { slug: string };
			"/shop/health-and-beauty/collections/[slug]": { slug: string };
			"/shop/health-and-beauty/tags/[slug]": { slug: string };
			"/shop/health-and-beauty/types/[slug]": { slug: string };
			"/shop/health-and-beauty/[...slug]": { slug: string };
			"/shop/home-goods/collections/[slug]": { slug: string };
			"/shop/home-goods/tags/[slug]": { slug: string };
			"/shop/home-goods/types/[slug]": { slug: string };
			"/shop/home-goods/[...slug]": { slug: string }
		};
		LayoutParams(): {
			"/(app)": Record<string, never>;
			"/": { path?: string; slug?: string; isbn?: string };
			"/about": Record<string, never>;
			"/api": { path?: string };
			"/api/cart": Record<string, never>;
			"/api/cart/add": Record<string, never>;
			"/api/cart/clear": Record<string, never>;
			"/api/cart/remove": Record<string, never>;
			"/api/cart/summary": Record<string, never>;
			"/api/cart/update": Record<string, never>;
			"/api/checkout": Record<string, never>;
			"/api/media": { path?: string };
			"/api/media/file": { path?: string };
			"/api/media/file/[...path]": { path: string };
			"/blog": { slug?: string };
			"/blog/[slug]": { slug: string };
			"/cart": Record<string, never>;
			"/(app)/cart": Record<string, never>;
			"/checkout": Record<string, never>;
			"/checkout/success": Record<string, never>;
			"/contact": Record<string, never>;
			"/directory": { slug?: string };
			"/directory/[slug]": { slug: string };
			"/events": { slug?: string };
			"/events/[slug]": { slug: string };
			"/login": Record<string, never>;
			"/privacy": Record<string, never>;
			"/return-policy": Record<string, never>;
			"/robots.txt": Record<string, never>;
			"/search": Record<string, never>;
			"/shop": { slug?: string; isbn?: string };
			"/shop/apparel": { slug?: string };
			"/shop/apparel/brands": { slug?: string };
			"/shop/apparel/brands/[slug]": { slug: string };
			"/shop/apparel/categories": { slug?: string };
			"/shop/apparel/categories/[slug]": { slug: string };
			"/shop/apparel/tags": { slug?: string };
			"/shop/apparel/tags/[slug]": { slug: string };
			"/shop/apparel/[...slug]": { slug: string };
			"/shop/books": { slug?: string; isbn?: string };
			"/shop/books/authors": { slug?: string };
			"/shop/books/authors/[slug]": { slug: string };
			"/shop/books/collections": { slug?: string };
			"/shop/books/collections/[slug]": { slug: string };
			"/shop/books/genres": { slug?: string };
			"/shop/books/genres/[slug]": { slug: string };
			"/shop/books/tags": { slug?: string };
			"/shop/books/tags/[slug]": { slug: string };
			"/shop/books/[slug]": { slug: string; isbn?: string };
			"/shop/books/[slug]/[isbn]": { slug: string; isbn: string };
			"/shop/books/[...slug]": { slug: string };
			"/shop/health-and-beauty": { slug?: string };
			"/shop/health-and-beauty/collections": { slug?: string };
			"/shop/health-and-beauty/collections/[slug]": { slug: string };
			"/shop/health-and-beauty/tags": { slug?: string };
			"/shop/health-and-beauty/tags/[slug]": { slug: string };
			"/shop/health-and-beauty/types": { slug?: string };
			"/shop/health-and-beauty/types/[slug]": { slug: string };
			"/shop/health-and-beauty/[...slug]": { slug: string };
			"/shop/home-goods": { slug?: string };
			"/shop/home-goods/collections": { slug?: string };
			"/shop/home-goods/collections/[slug]": { slug: string };
			"/shop/home-goods/tags": { slug?: string };
			"/shop/home-goods/tags/[slug]": { slug: string };
			"/shop/home-goods/types": { slug?: string };
			"/shop/home-goods/types/[slug]": { slug: string };
			"/shop/home-goods/[...slug]": { slug: string };
			"/sitemap.xml": Record<string, never>;
			"/terms-of-service": Record<string, never>
		};
		Pathname(): "/" | "/about" | "/about/" | "/api" | "/api/" | "/api/cart" | "/api/cart/" | "/api/cart/add" | "/api/cart/add/" | "/api/cart/clear" | "/api/cart/clear/" | "/api/cart/remove" | "/api/cart/remove/" | "/api/cart/summary" | "/api/cart/summary/" | "/api/cart/update" | "/api/cart/update/" | "/api/checkout" | "/api/checkout/" | "/api/media" | "/api/media/" | "/api/media/file" | "/api/media/file/" | `/api/media/file/${string}` & {} | `/api/media/file/${string}/` & {} | "/blog" | "/blog/" | `/blog/${string}` & {} | `/blog/${string}/` & {} | "/cart" | "/cart/" | "/checkout" | "/checkout/" | "/checkout/success" | "/checkout/success/" | "/contact" | "/contact/" | "/directory" | "/directory/" | `/directory/${string}` & {} | `/directory/${string}/` & {} | "/events" | "/events/" | `/events/${string}` & {} | `/events/${string}/` & {} | "/login" | "/login/" | "/privacy" | "/privacy/" | "/return-policy" | "/return-policy/" | "/robots.txt" | "/robots.txt/" | "/search" | "/search/" | "/shop" | "/shop/" | "/shop/apparel" | "/shop/apparel/" | "/shop/apparel/brands" | "/shop/apparel/brands/" | `/shop/apparel/brands/${string}` & {} | `/shop/apparel/brands/${string}/` & {} | "/shop/apparel/categories" | "/shop/apparel/categories/" | `/shop/apparel/categories/${string}` & {} | `/shop/apparel/categories/${string}/` & {} | "/shop/apparel/tags" | "/shop/apparel/tags/" | `/shop/apparel/tags/${string}` & {} | `/shop/apparel/tags/${string}/` & {} | `/shop/apparel/${string}` & {} | `/shop/apparel/${string}/` & {} | "/shop/books" | "/shop/books/" | "/shop/books/authors" | "/shop/books/authors/" | `/shop/books/authors/${string}` & {} | `/shop/books/authors/${string}/` & {} | "/shop/books/collections" | "/shop/books/collections/" | `/shop/books/collections/${string}` & {} | `/shop/books/collections/${string}/` & {} | "/shop/books/genres" | "/shop/books/genres/" | `/shop/books/genres/${string}` & {} | `/shop/books/genres/${string}/` & {} | "/shop/books/tags" | "/shop/books/tags/" | `/shop/books/tags/${string}` & {} | `/shop/books/tags/${string}/` & {} | `/shop/books/${string}` & {} | `/shop/books/${string}/` & {} | `/shop/books/${string}/${string}` & {} | `/shop/books/${string}/${string}/` & {} | "/shop/health-and-beauty" | "/shop/health-and-beauty/" | "/shop/health-and-beauty/collections" | "/shop/health-and-beauty/collections/" | `/shop/health-and-beauty/collections/${string}` & {} | `/shop/health-and-beauty/collections/${string}/` & {} | "/shop/health-and-beauty/tags" | "/shop/health-and-beauty/tags/" | `/shop/health-and-beauty/tags/${string}` & {} | `/shop/health-and-beauty/tags/${string}/` & {} | "/shop/health-and-beauty/types" | "/shop/health-and-beauty/types/" | `/shop/health-and-beauty/types/${string}` & {} | `/shop/health-and-beauty/types/${string}/` & {} | `/shop/health-and-beauty/${string}` & {} | `/shop/health-and-beauty/${string}/` & {} | "/shop/home-goods" | "/shop/home-goods/" | "/shop/home-goods/collections" | "/shop/home-goods/collections/" | `/shop/home-goods/collections/${string}` & {} | `/shop/home-goods/collections/${string}/` & {} | "/shop/home-goods/tags" | "/shop/home-goods/tags/" | `/shop/home-goods/tags/${string}` & {} | `/shop/home-goods/tags/${string}/` & {} | "/shop/home-goods/types" | "/shop/home-goods/types/" | `/shop/home-goods/types/${string}` & {} | `/shop/home-goods/types/${string}/` & {} | `/shop/home-goods/${string}` & {} | `/shop/home-goods/${string}/` & {} | "/sitemap.xml" | "/sitemap.xml/" | "/terms-of-service" | "/terms-of-service/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/ali_logo_small.png" | "/android-chrome-192x192.png" | "/android-chrome-512x512.png" | "/apple-touch-icon.png" | "/assets/css/agrikol_iconl.css" | "/assets/css/animate.min.css" | "/assets/css/bootstrap-datepicker.min.css" | "/assets/css/bootstrap-select.min.css" | "/assets/css/fontawesome-all.min.css" | "/assets/css/jquery-ui.css" | "/assets/css/jquery.bootstrap-touchspin.css" | "/assets/css/jquery.mCustomScrollbar.min.css" | "/assets/css/responsive.css" | "/assets/css/style.css" | "/assets/css/swiper.min.css" | "/assets/css/tripo-icons.css" | "/assets/fonts/fa-brands-400.eot" | "/assets/fonts/fa-brands-400.svg" | "/assets/fonts/fa-brands-400.ttf" | "/assets/fonts/fa-brands-400.woff" | "/assets/fonts/fa-brands-400.woff2" | "/assets/fonts/fa-regular-400.eot" | "/assets/fonts/fa-regular-400.svg" | "/assets/fonts/fa-regular-400.ttf" | "/assets/fonts/fa-regular-400.woff" | "/assets/fonts/fa-regular-400.woff2" | "/assets/fonts/fa-solid-900.eot" | "/assets/fonts/fa-solid-900.svg" | "/assets/fonts/fa-solid-900.ttf" | "/assets/fonts/fa-solid-900.woff" | "/assets/fonts/fa-solid-900.woff2" | "/assets/fonts/icomoon.eot" | "/assets/fonts/icomoon.svg" | "/assets/fonts/icomoon.ttf" | "/assets/fonts/icomoon.woff" | "/assets/fonts/tripo-icon.eot" | "/assets/fonts/tripo-icon.svg" | "/assets/fonts/tripo-icon.ttf" | "/assets/fonts/tripo-icon.woff" | "/assets/images/about/about-1-img-1.jpg" | "/assets/images/about/about-1-img-2.jpg" | "/assets/images/about/about_page_left-img.jpg" | "/assets/images/about/about_page_middle-img.jpg" | "/assets/images/about/about_page_right-img.jpg" | "/assets/images/alkebulan/basket-4.svg" | "/assets/images/alkebulan/bookbackground.jpg" | "/assets/images/alkebulan/crocs.svg" | "/assets/images/alkebulan/neao_lg.svg" | "/assets/images/alkebulan/sankofa.ico" | "/assets/images/alkebulan/sankofa.jpg" | "/assets/images/alkebulan/sankofa.png" | "/assets/images/alkebulan/sankofa.svg" | "/assets/images/alkebulan/sankofaBird.ico" | "/assets/images/alkebulan/yusef.jpg" | "/assets/images/backgrounds/page-header-contact.jpg" | "/assets/images/blog/author-1-1.jpg" | "/assets/images/blog/blog-1-img-1.jpg" | "/assets/images/blog/blog-1-img-2.jpg" | "/assets/images/blog/blog-1-img-3.jpg" | "/assets/images/blog/blog-1-img-4.jpg" | "/assets/images/blog/blog-1-img-5.jpg" | "/assets/images/blog/blog-1-img-6.jpg" | "/assets/images/blog/blog-2-img-1.jpg" | "/assets/images/blog/blog-2-img-2.jpg" | "/assets/images/blog/blog-4-img-1.jpg" | "/assets/images/blog/blog-4-img-2.jpg" | "/assets/images/blog/comment-1-1.png" | "/assets/images/blog/comment-1-2.png" | "/assets/images/blog/lp-1-1.jpg" | "/assets/images/blog/lp-1-2.jpg" | "/assets/images/blog/lp-1-3.jpg" | "/assets/images/blog/news-detail-img-1.jpg" | "/assets/images/favicons/android-chrome-192x192.png" | "/assets/images/favicons/android-chrome-512x512.png" | "/assets/images/favicons/apple-touch-icon.png" | "/assets/images/favicons/favicon-16x16.png" | "/assets/images/favicons/favicon-32x32.png" | "/assets/images/favicons/favicon.ico" | "/assets/images/favicons/site.webmanifest" | "/assets/images/icon/Thumbs.db" | "/assets/images/icon/line1.png" | "/assets/images/icon/quote_1.png" | "/assets/images/icon/quote_2.png" | "/assets/images/loader-old.png" | "/assets/images/loader.png" | "/assets/images/main-slider/Thumbs.db" | "/assets/images/main-slider/banner-five-bg.jpg" | "/assets/images/main-slider/certified_logo.png" | "/assets/images/main-slider/round_1.png" | "/assets/images/main-slider/round_2.png" | "/assets/images/main-slider/slide_v1_1.jpg" | "/assets/images/main-slider/slide_v1_2.jpg" | "/assets/images/main-slider/slide_v1_3.jpg" | "/assets/images/main-slider/slide_v2_1.jpg" | "/assets/images/main-slider/slide_v2_2.jpg" | "/assets/images/main-slider/slide_v3_1.jpg" | "/assets/images/main-slider/slide_v3_2.jpg" | "/assets/images/main-slider/slide_v4_1.jpg" | "/assets/images/main-slider/slide_v4_2.jpg" | "/assets/images/main-slider/slider-3-leafs.png" | "/assets/images/main-slider/slider-5-leafs.png" | "/assets/images/project/project-3-img-1.jpg" | "/assets/images/project/project-3-img-2.jpg" | "/assets/images/project/project-3-img-3.jpg" | "/assets/images/project/project-3-img-4.jpg" | "/assets/images/project/project-detail-img-1.jpg" | "/assets/images/project/recent-pro-img-1.jpg" | "/assets/images/project/recent-pro-img-2.jpg" | "/assets/images/project/recent-pro-img-3.jpg" | "/assets/images/project/recent-pro-img-4.jpg" | "/assets/images/project/recent-pro-img-5.jpg" | "/assets/images/project/recent-pro-img-6.jpg" | "/assets/images/resources/Thumbs.db" | "/assets/images/resources/achieved_1-img-1.jpg" | "/assets/images/resources/achieved_1-img-2.jpg" | "/assets/images/resources/benifits_bg.png" | "/assets/images/resources/brand-1-1.png" | "/assets/images/resources/brand-1-2.png" | "/assets/images/resources/brand-1-3.png" | "/assets/images/resources/brand-1-4.png" | "/assets/images/resources/brand-1-5.png" | "/assets/images/resources/brand-2-1.png" | "/assets/images/resources/brand-2-2.png" | "/assets/images/resources/brand-2-3.png" | "/assets/images/resources/brand-2-4.png" | "/assets/images/resources/brand-2-5.png" | "/assets/images/resources/com_solutions_img-1.jpg" | "/assets/images/resources/com_solutions_img-2.jpg" | "/assets/images/resources/com_solutions_img-3.jpg" | "/assets/images/resources/company-icon-1.png" | "/assets/images/resources/company-img-.jpg" | "/assets/images/resources/contact_img.jpg" | "/assets/images/resources/cta_one_bg-1.jpg" | "/assets/images/resources/eco-friendly_bg.jpg" | "/assets/images/resources/faq_one_img-1.jpg" | "/assets/images/resources/featured-leaf.png" | "/assets/images/resources/footer-1-img-1.jpg" | "/assets/images/resources/footer-1-img-2.jpg" | "/assets/images/resources/get_quote_bg.jpg" | "/assets/images/resources/helathy_food_bg.png" | "/assets/images/resources/leaf.png" | "/assets/images/resources/logo-2.png" | "/assets/images/resources/logo.jpg" | "/assets/images/resources/logo.png" | "/assets/images/resources/management-1.jpg" | "/assets/images/resources/management-2.jpg" | "/assets/images/resources/need_img-1.jpg" | "/assets/images/resources/product-1-img-1.jpg" | "/assets/images/resources/product-2-bg.png" | "/assets/images/resources/quote_1-bg.png" | "/assets/images/resources/site-footer-farm.png" | "/assets/images/resources/trusted_one_bg.jpg" | "/assets/images/resources/video-bg-1.jpg" | "/assets/images/resources/welcome-2_img-1.jpg" | "/assets/images/resources/welcome-2_img-2.jpg" | "/assets/images/resources/welcome_2_bg.png" | "/assets/images/resources/welcome_video_bg.jpg" | "/assets/images/resources/what-makes-bg.jpg" | "/assets/images/resources/why_choose1_img-1.jpg" | "/assets/images/service/service-1-img-1.jpg" | "/assets/images/service/service-1-img-2.jpg" | "/assets/images/service/service-1-img-3.jpg" | "/assets/images/service/service-1-img-4.jpg" | "/assets/images/service/service-2-img-1.png" | "/assets/images/service/service-2-img-2.png" | "/assets/images/service/service-2-img-3.png" | "/assets/images/service/service-2-img-4.png" | "/assets/images/service/service-3--img-1.jpg" | "/assets/images/service/service-3--img-2.jpg" | "/assets/images/service/service-3--img-3.jpg" | "/assets/images/service/service-3--img-4.jpg" | "/assets/images/service/service-detail_img_1.jpg" | "/assets/images/service/service-detail_img_2.jpg" | "/assets/images/service/service-detail_img_3.jpg" | "/assets/images/shapes/Thumbs.db" | "/assets/images/shapes/about-1-shape-1.png" | "/assets/images/shapes/close-1-1.png" | "/assets/images/shapes/header-bg.png" | "/assets/images/shapes/testi-arrow-3-1.png" | "/assets/images/shapes/testi-qoute-3-1.png" | "/assets/images/team/farmers-1.jpg" | "/assets/images/team/farmers-2.jpg" | "/assets/images/team/farmers-3.jpg" | "/assets/images/team/farmers-4.jpg" | "/assets/images/team/farmers-5.jpg" | "/assets/images/team/farmers-6.jpg" | "/assets/images/team/team_1-img-1.jpg" | "/assets/images/team/team_1-img-2.jpg" | "/assets/images/team/team_1-img-3.jpg" | "/assets/images/team/team_1-img-4.jpg" | "/assets/images/testimonials/Thumbs.db" | "/assets/images/testimonials/bx-testi-1.png" | "/assets/images/testimonials/bx-testi-2.png" | "/assets/images/testimonials/bx-testi-3.png" | "/assets/images/testimonials/bx-testi-bg.png" | "/assets/images/testimonials/testimonial-1-img-1.png" | "/assets/images/testimonials/testimonial-3-img-1.png" | "/assets/images/testimonials/testimonial-3-img-2.png" | "/assets/images/testimonials/testimonial-3-img-3.png" | "/assets/js/TweenMax.min.js" | "/assets/js/appear.js" | "/assets/js/bootstrap-datepicker.min.js" | "/assets/js/bootstrap-select.min.js" | "/assets/js/bootstrap.bundle.min.js" | "/assets/js/countdown.min.js" | "/assets/js/isotope.js" | "/assets/js/jquery-ui.js" | "/assets/js/jquery.ajaxchimp.min.js" | "/assets/js/jquery.bootstrap-touchspin.js" | "/assets/js/jquery.bxslider.min.js" | "/assets/js/jquery.counterup.min.js" | "/assets/js/jquery.mCustomScrollbar.concat.min.js" | "/assets/js/jquery.magnific-popup.min.js" | "/assets/js/jquery.min.js" | "/assets/js/jquery.validate.min.js" | "/assets/js/nouislider.min.js" | "/assets/js/owl.carousel.min.js" | "/assets/js/swiper.min.js" | "/assets/js/theme.js" | "/assets/js/typed-2.0.11.js" | "/assets/js/vegas.min.js" | "/assets/js/waypoints.min.js" | "/assets/js/wow.js" | "/favicon-16x16.png" | "/favicon-32x32.png" | "/favicon.ico" | "/favicon.png" | "/inc/sendemail.php" | "/mstile-150x150.png" | "/robots.txt" | "/svelte-welcome.png" | "/svelte-welcome.webp" | string & {};
	}
}