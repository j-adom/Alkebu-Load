export const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["ali_logo_small.png","android-chrome-192x192.png","android-chrome-512x512.png","apple-touch-icon.png","assets/css/agrikol_iconl.css","assets/css/animate.min.css","assets/css/bootstrap-datepicker.min.css","assets/css/bootstrap-select.min.css","assets/css/fontawesome-all.min.css","assets/css/jquery-ui.css","assets/css/jquery.bootstrap-touchspin.css","assets/css/jquery.mCustomScrollbar.min.css","assets/css/responsive.css","assets/css/style.css","assets/css/swiper.min.css","assets/css/tripo-icons.css","assets/fonts/fa-brands-400.eot","assets/fonts/fa-brands-400.svg","assets/fonts/fa-brands-400.ttf","assets/fonts/fa-brands-400.woff","assets/fonts/fa-brands-400.woff2","assets/fonts/fa-regular-400.eot","assets/fonts/fa-regular-400.svg","assets/fonts/fa-regular-400.ttf","assets/fonts/fa-regular-400.woff","assets/fonts/fa-regular-400.woff2","assets/fonts/fa-solid-900.eot","assets/fonts/fa-solid-900.svg","assets/fonts/fa-solid-900.ttf","assets/fonts/fa-solid-900.woff","assets/fonts/fa-solid-900.woff2","assets/fonts/icomoon.eot","assets/fonts/icomoon.svg","assets/fonts/icomoon.ttf","assets/fonts/icomoon.woff","assets/fonts/tripo-icon.eot","assets/fonts/tripo-icon.svg","assets/fonts/tripo-icon.ttf","assets/fonts/tripo-icon.woff","assets/images/about/about-1-img-1.jpg","assets/images/about/about-1-img-2.jpg","assets/images/about/about_page_left-img.jpg","assets/images/about/about_page_middle-img.jpg","assets/images/about/about_page_right-img.jpg","assets/images/alkebulan/basket-4.svg","assets/images/alkebulan/bookbackground.jpg","assets/images/alkebulan/crocs.svg","assets/images/alkebulan/neao_lg.svg","assets/images/alkebulan/sankofa.ico","assets/images/alkebulan/sankofa.jpg","assets/images/alkebulan/sankofa.png","assets/images/alkebulan/sankofa.svg","assets/images/alkebulan/sankofaBird.ico","assets/images/alkebulan/yusef.jpg","assets/images/backgrounds/page-header-contact.jpg","assets/images/blog/author-1-1.jpg","assets/images/blog/blog-1-img-1.jpg","assets/images/blog/blog-1-img-2.jpg","assets/images/blog/blog-1-img-3.jpg","assets/images/blog/blog-1-img-4.jpg","assets/images/blog/blog-1-img-5.jpg","assets/images/blog/blog-1-img-6.jpg","assets/images/blog/blog-2-img-1.jpg","assets/images/blog/blog-2-img-2.jpg","assets/images/blog/blog-4-img-1.jpg","assets/images/blog/blog-4-img-2.jpg","assets/images/blog/comment-1-1.png","assets/images/blog/comment-1-2.png","assets/images/blog/lp-1-1.jpg","assets/images/blog/lp-1-2.jpg","assets/images/blog/lp-1-3.jpg","assets/images/blog/news-detail-img-1.jpg","assets/images/favicons/android-chrome-192x192.png","assets/images/favicons/android-chrome-512x512.png","assets/images/favicons/apple-touch-icon.png","assets/images/favicons/favicon-16x16.png","assets/images/favicons/favicon-32x32.png","assets/images/favicons/favicon.ico","assets/images/favicons/site.webmanifest","assets/images/icon/Thumbs.db","assets/images/icon/line1.png","assets/images/icon/quote_1.png","assets/images/icon/quote_2.png","assets/images/loader-old.png","assets/images/loader.png","assets/images/main-slider/Thumbs.db","assets/images/main-slider/banner-five-bg.jpg","assets/images/main-slider/certified_logo.png","assets/images/main-slider/round_1.png","assets/images/main-slider/round_2.png","assets/images/main-slider/slide_v1_1.jpg","assets/images/main-slider/slide_v1_2.jpg","assets/images/main-slider/slide_v1_3.jpg","assets/images/main-slider/slide_v2_1.jpg","assets/images/main-slider/slide_v2_2.jpg","assets/images/main-slider/slide_v3_1.jpg","assets/images/main-slider/slide_v3_2.jpg","assets/images/main-slider/slide_v4_1.jpg","assets/images/main-slider/slide_v4_2.jpg","assets/images/main-slider/slider-3-leafs.png","assets/images/main-slider/slider-5-leafs.png","assets/images/project/project-3-img-1.jpg","assets/images/project/project-3-img-2.jpg","assets/images/project/project-3-img-3.jpg","assets/images/project/project-3-img-4.jpg","assets/images/project/project-detail-img-1.jpg","assets/images/project/recent-pro-img-1.jpg","assets/images/project/recent-pro-img-2.jpg","assets/images/project/recent-pro-img-3.jpg","assets/images/project/recent-pro-img-4.jpg","assets/images/project/recent-pro-img-5.jpg","assets/images/project/recent-pro-img-6.jpg","assets/images/resources/Thumbs.db","assets/images/resources/achieved_1-img-1.jpg","assets/images/resources/achieved_1-img-2.jpg","assets/images/resources/benifits_bg.png","assets/images/resources/brand-1-1.png","assets/images/resources/brand-1-2.png","assets/images/resources/brand-1-3.png","assets/images/resources/brand-1-4.png","assets/images/resources/brand-1-5.png","assets/images/resources/brand-2-1.png","assets/images/resources/brand-2-2.png","assets/images/resources/brand-2-3.png","assets/images/resources/brand-2-4.png","assets/images/resources/brand-2-5.png","assets/images/resources/com_solutions_img-1.jpg","assets/images/resources/com_solutions_img-2.jpg","assets/images/resources/com_solutions_img-3.jpg","assets/images/resources/company-icon-1.png","assets/images/resources/company-img-.jpg","assets/images/resources/contact_img.jpg","assets/images/resources/cta_one_bg-1.jpg","assets/images/resources/eco-friendly_bg.jpg","assets/images/resources/faq_one_img-1.jpg","assets/images/resources/featured-leaf.png","assets/images/resources/footer-1-img-1.jpg","assets/images/resources/footer-1-img-2.jpg","assets/images/resources/get_quote_bg.jpg","assets/images/resources/helathy_food_bg.png","assets/images/resources/leaf.png","assets/images/resources/logo-2.png","assets/images/resources/logo.jpg","assets/images/resources/logo.png","assets/images/resources/management-1.jpg","assets/images/resources/management-2.jpg","assets/images/resources/need_img-1.jpg","assets/images/resources/product-1-img-1.jpg","assets/images/resources/product-2-bg.png","assets/images/resources/quote_1-bg.png","assets/images/resources/site-footer-farm.png","assets/images/resources/trusted_one_bg.jpg","assets/images/resources/video-bg-1.jpg","assets/images/resources/welcome-2_img-1.jpg","assets/images/resources/welcome-2_img-2.jpg","assets/images/resources/welcome_2_bg.png","assets/images/resources/welcome_video_bg.jpg","assets/images/resources/what-makes-bg.jpg","assets/images/resources/why_choose1_img-1.jpg","assets/images/service/service-1-img-1.jpg","assets/images/service/service-1-img-2.jpg","assets/images/service/service-1-img-3.jpg","assets/images/service/service-1-img-4.jpg","assets/images/service/service-2-img-1.png","assets/images/service/service-2-img-2.png","assets/images/service/service-2-img-3.png","assets/images/service/service-2-img-4.png","assets/images/service/service-3--img-1.jpg","assets/images/service/service-3--img-2.jpg","assets/images/service/service-3--img-3.jpg","assets/images/service/service-3--img-4.jpg","assets/images/service/service-detail_img_1.jpg","assets/images/service/service-detail_img_2.jpg","assets/images/service/service-detail_img_3.jpg","assets/images/shapes/Thumbs.db","assets/images/shapes/about-1-shape-1.png","assets/images/shapes/close-1-1.png","assets/images/shapes/header-bg.png","assets/images/shapes/testi-arrow-3-1.png","assets/images/shapes/testi-qoute-3-1.png","assets/images/team/farmers-1.jpg","assets/images/team/farmers-2.jpg","assets/images/team/farmers-3.jpg","assets/images/team/farmers-4.jpg","assets/images/team/farmers-5.jpg","assets/images/team/farmers-6.jpg","assets/images/team/team_1-img-1.jpg","assets/images/team/team_1-img-2.jpg","assets/images/team/team_1-img-3.jpg","assets/images/team/team_1-img-4.jpg","assets/images/testimonials/Thumbs.db","assets/images/testimonials/bx-testi-1.png","assets/images/testimonials/bx-testi-2.png","assets/images/testimonials/bx-testi-3.png","assets/images/testimonials/bx-testi-bg.png","assets/images/testimonials/testimonial-1-img-1.png","assets/images/testimonials/testimonial-3-img-1.png","assets/images/testimonials/testimonial-3-img-2.png","assets/images/testimonials/testimonial-3-img-3.png","assets/js/TweenMax.min.js","assets/js/appear.js","assets/js/bootstrap-datepicker.min.js","assets/js/bootstrap-select.min.js","assets/js/bootstrap.bundle.min.js","assets/js/countdown.min.js","assets/js/isotope.js","assets/js/jquery-ui.js","assets/js/jquery.ajaxchimp.min.js","assets/js/jquery.bootstrap-touchspin.js","assets/js/jquery.bxslider.min.js","assets/js/jquery.counterup.min.js","assets/js/jquery.mCustomScrollbar.concat.min.js","assets/js/jquery.magnific-popup.min.js","assets/js/jquery.min.js","assets/js/jquery.validate.min.js","assets/js/nouislider.min.js","assets/js/owl.carousel.min.js","assets/js/swiper.min.js","assets/js/theme.js","assets/js/typed-2.0.11.js","assets/js/vegas.min.js","assets/js/waypoints.min.js","assets/js/wow.js","favicon-16x16.png","favicon-32x32.png","favicon.ico","favicon.png","inc/sendemail.php","mstile-150x150.png","robots.txt","svelte-welcome.png","svelte-welcome.webp"]),
	mimeTypes: {".png":"image/png",".css":"text/css",".svg":"image/svg+xml",".ttf":"font/ttf",".woff":"font/woff",".woff2":"font/woff2",".jpg":"image/jpeg",".webmanifest":"application/manifest+json",".js":"text/javascript",".txt":"text/plain",".webp":"image/webp"},
	_: {
		client: {start:"_app/immutable/entry/start.CgEgfm4W.js",app:"_app/immutable/entry/app.gLxE0lN3.js",imports:["_app/immutable/entry/start.CgEgfm4W.js","_app/immutable/chunks/DCVd-jCw.js","_app/immutable/chunks/BHQzBQfU.js","_app/immutable/chunks/Bmew28_A.js","_app/immutable/chunks/9p2O56ug.js","_app/immutable/chunks/Cd_Yc72e.js","_app/immutable/entry/app.gLxE0lN3.js","_app/immutable/chunks/DGelV_wN.js","_app/immutable/chunks/Bmew28_A.js","_app/immutable/chunks/9p2O56ug.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/BHQzBQfU.js","_app/immutable/chunks/mNN9vv1_.js","_app/immutable/chunks/CYV9pcsX.js","_app/immutable/chunks/DcdIBE9g.js","_app/immutable/chunks/Dga7b2p1.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('../output/server/nodes/0.js')),
			__memo(() => import('../output/server/nodes/1.js')),
			__memo(() => import('../output/server/nodes/2.js')),
			__memo(() => import('../output/server/nodes/3.js')),
			__memo(() => import('../output/server/nodes/4.js')),
			__memo(() => import('../output/server/nodes/5.js')),
			__memo(() => import('../output/server/nodes/6.js')),
			__memo(() => import('../output/server/nodes/7.js')),
			__memo(() => import('../output/server/nodes/8.js')),
			__memo(() => import('../output/server/nodes/9.js')),
			__memo(() => import('../output/server/nodes/10.js')),
			__memo(() => import('../output/server/nodes/11.js')),
			__memo(() => import('../output/server/nodes/12.js')),
			__memo(() => import('../output/server/nodes/13.js')),
			__memo(() => import('../output/server/nodes/14.js')),
			__memo(() => import('../output/server/nodes/15.js')),
			__memo(() => import('../output/server/nodes/16.js')),
			__memo(() => import('../output/server/nodes/17.js')),
			__memo(() => import('../output/server/nodes/18.js')),
			__memo(() => import('../output/server/nodes/19.js')),
			__memo(() => import('../output/server/nodes/20.js')),
			__memo(() => import('../output/server/nodes/21.js')),
			__memo(() => import('../output/server/nodes/22.js')),
			__memo(() => import('../output/server/nodes/23.js')),
			__memo(() => import('../output/server/nodes/24.js')),
			__memo(() => import('../output/server/nodes/25.js')),
			__memo(() => import('../output/server/nodes/26.js')),
			__memo(() => import('../output/server/nodes/27.js')),
			__memo(() => import('../output/server/nodes/28.js')),
			__memo(() => import('../output/server/nodes/29.js')),
			__memo(() => import('../output/server/nodes/30.js')),
			__memo(() => import('../output/server/nodes/31.js')),
			__memo(() => import('../output/server/nodes/32.js')),
			__memo(() => import('../output/server/nodes/33.js')),
			__memo(() => import('../output/server/nodes/34.js')),
			__memo(() => import('../output/server/nodes/35.js')),
			__memo(() => import('../output/server/nodes/36.js')),
			__memo(() => import('../output/server/nodes/37.js')),
			__memo(() => import('../output/server/nodes/38.js')),
			__memo(() => import('../output/server/nodes/39.js')),
			__memo(() => import('../output/server/nodes/40.js')),
			__memo(() => import('../output/server/nodes/41.js')),
			__memo(() => import('../output/server/nodes/42.js')),
			__memo(() => import('../output/server/nodes/43.js')),
			__memo(() => import('../output/server/nodes/44.js')),
			__memo(() => import('../output/server/nodes/45.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/about",
				pattern: /^\/about\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/api/cart/add",
				pattern: /^\/api\/cart\/add\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/cart/add/_server.ts.js'))
			},
			{
				id: "/api/cart/clear",
				pattern: /^\/api\/cart\/clear\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/cart/clear/_server.ts.js'))
			},
			{
				id: "/api/cart/remove",
				pattern: /^\/api\/cart\/remove\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/cart/remove/_server.ts.js'))
			},
			{
				id: "/api/cart/summary",
				pattern: /^\/api\/cart\/summary\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/cart/summary/_server.ts.js'))
			},
			{
				id: "/api/cart/update",
				pattern: /^\/api\/cart\/update\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/cart/update/_server.ts.js'))
			},
			{
				id: "/api/checkout",
				pattern: /^\/api\/checkout\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/checkout/_server.ts.js'))
			},
			{
				id: "/api/checkout/preview",
				pattern: /^\/api\/checkout\/preview\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/checkout/preview/_server.ts.js'))
			},
			{
				id: "/api/media/file/[...path]",
				pattern: /^\/api\/media\/file(?:\/([^]*))?\/?$/,
				params: [{"name":"path","optional":false,"rest":true,"chained":true}],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/api/media/file/_...path_/_server.ts.js'))
			},
			{
				id: "/blog",
				pattern: /^\/blog\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/blog/[slug]",
				pattern: /^\/blog\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/cart",
				pattern: /^\/cart\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/checkout",
				pattern: /^\/checkout\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/checkout/cancel",
				pattern: /^\/checkout\/cancel\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/checkout/success",
				pattern: /^\/checkout\/success\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/contact",
				pattern: /^\/contact\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/directory",
				pattern: /^\/directory\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/directory/[slug]",
				pattern: /^\/directory\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/events",
				pattern: /^\/events\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/events/[slug]",
				pattern: /^\/events\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 15 },
				endpoint: null
			},
			{
				id: "/privacy",
				pattern: /^\/privacy\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 16 },
				endpoint: null
			},
			{
				id: "/return-policy",
				pattern: /^\/return-policy\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 17 },
				endpoint: null
			},
			{
				id: "/robots.txt",
				pattern: /^\/robots\.txt\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/robots.txt/_server.ts.js'))
			},
			{
				id: "/search",
				pattern: /^\/search\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 18 },
				endpoint: null
			},
			{
				id: "/shop",
				pattern: /^\/shop\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 19 },
				endpoint: null
			},
			{
				id: "/shop/apparel",
				pattern: /^\/shop\/apparel\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 20 },
				endpoint: null
			},
			{
				id: "/shop/apparel/brands/[slug]",
				pattern: /^\/shop\/apparel\/brands\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 22 },
				endpoint: null
			},
			{
				id: "/shop/apparel/categories/[slug]",
				pattern: /^\/shop\/apparel\/categories\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 23 },
				endpoint: null
			},
			{
				id: "/shop/apparel/tags/[slug]",
				pattern: /^\/shop\/apparel\/tags\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 24 },
				endpoint: null
			},
			{
				id: "/shop/apparel/[...slug]",
				pattern: /^\/shop\/apparel(?:\/([^]*))?\/?$/,
				params: [{"name":"slug","optional":false,"rest":true,"chained":true}],
				page: { layouts: [0,], errors: [1,], leaf: 21 },
				endpoint: null
			},
			{
				id: "/shop/books",
				pattern: /^\/shop\/books\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 25 },
				endpoint: null
			},
			{
				id: "/shop/books/authors",
				pattern: /^\/shop\/books\/authors\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 28 },
				endpoint: null
			},
			{
				id: "/shop/books/authors/[slug]",
				pattern: /^\/shop\/books\/authors\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 29 },
				endpoint: null
			},
			{
				id: "/shop/books/collections",
				pattern: /^\/shop\/books\/collections\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 30 },
				endpoint: null
			},
			{
				id: "/shop/books/collections/[slug]",
				pattern: /^\/shop\/books\/collections\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 31 },
				endpoint: null
			},
			{
				id: "/shop/books/genres",
				pattern: /^\/shop\/books\/genres\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 32 },
				endpoint: null
			},
			{
				id: "/shop/books/genres/[slug]",
				pattern: /^\/shop\/books\/genres\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 33 },
				endpoint: null
			},
			{
				id: "/shop/books/tags",
				pattern: /^\/shop\/books\/tags\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 34 },
				endpoint: null
			},
			{
				id: "/shop/books/tags/[slug]",
				pattern: /^\/shop\/books\/tags\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 35 },
				endpoint: null
			},
			{
				id: "/shop/books/[slug]/[isbn]",
				pattern: /^\/shop\/books\/([^/]+?)\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false},{"name":"isbn","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 27 },
				endpoint: null
			},
			{
				id: "/shop/books/[...slug]",
				pattern: /^\/shop\/books(?:\/([^]*))?\/?$/,
				params: [{"name":"slug","optional":false,"rest":true,"chained":true}],
				page: { layouts: [0,], errors: [1,], leaf: 26 },
				endpoint: null
			},
			{
				id: "/shop/health-and-beauty",
				pattern: /^\/shop\/health-and-beauty\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 36 },
				endpoint: null
			},
			{
				id: "/shop/health-and-beauty/collections/[slug]",
				pattern: /^\/shop\/health-and-beauty\/collections\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 38 },
				endpoint: null
			},
			{
				id: "/shop/health-and-beauty/tags/[slug]",
				pattern: /^\/shop\/health-and-beauty\/tags\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 39 },
				endpoint: null
			},
			{
				id: "/shop/health-and-beauty/types/[slug]",
				pattern: /^\/shop\/health-and-beauty\/types\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 40 },
				endpoint: null
			},
			{
				id: "/shop/health-and-beauty/[...slug]",
				pattern: /^\/shop\/health-and-beauty(?:\/([^]*))?\/?$/,
				params: [{"name":"slug","optional":false,"rest":true,"chained":true}],
				page: { layouts: [0,], errors: [1,], leaf: 37 },
				endpoint: null
			},
			{
				id: "/shop/home-goods",
				pattern: /^\/shop\/home-goods\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 41 },
				endpoint: null
			},
			{
				id: "/shop/home-goods/tags/[slug]",
				pattern: /^\/shop\/home-goods\/tags\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 43 },
				endpoint: null
			},
			{
				id: "/shop/home-goods/types/[slug]",
				pattern: /^\/shop\/home-goods\/types\/([^/]+?)\/?$/,
				params: [{"name":"slug","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 44 },
				endpoint: null
			},
			{
				id: "/shop/home-goods/[...slug]",
				pattern: /^\/shop\/home-goods(?:\/([^]*))?\/?$/,
				params: [{"name":"slug","optional":false,"rest":true,"chained":true}],
				page: { layouts: [0,], errors: [1,], leaf: 42 },
				endpoint: null
			},
			{
				id: "/sitemap.xml",
				pattern: /^\/sitemap\.xml\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('../output/server/entries/endpoints/sitemap.xml/_server.ts.js'))
			},
			{
				id: "/terms-of-service",
				pattern: /^\/terms-of-service\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 45 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

export const prerendered = new Set([]);

export const base_path = "";
