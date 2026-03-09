export { matchers } from './matchers.js';

export const nodes = [
	() => import('./nodes/0'),
	() => import('./nodes/1'),
	() => import('./nodes/2'),
	() => import('./nodes/3'),
	() => import('./nodes/4'),
	() => import('./nodes/5'),
	() => import('./nodes/6'),
	() => import('./nodes/7'),
	() => import('./nodes/8'),
	() => import('./nodes/9'),
	() => import('./nodes/10'),
	() => import('./nodes/11'),
	() => import('./nodes/12'),
	() => import('./nodes/13'),
	() => import('./nodes/14'),
	() => import('./nodes/15'),
	() => import('./nodes/16'),
	() => import('./nodes/17'),
	() => import('./nodes/18'),
	() => import('./nodes/19'),
	() => import('./nodes/20'),
	() => import('./nodes/21'),
	() => import('./nodes/22'),
	() => import('./nodes/23'),
	() => import('./nodes/24'),
	() => import('./nodes/25'),
	() => import('./nodes/26'),
	() => import('./nodes/27'),
	() => import('./nodes/28'),
	() => import('./nodes/29'),
	() => import('./nodes/30'),
	() => import('./nodes/31'),
	() => import('./nodes/32'),
	() => import('./nodes/33'),
	() => import('./nodes/34'),
	() => import('./nodes/35'),
	() => import('./nodes/36'),
	() => import('./nodes/37'),
	() => import('./nodes/38'),
	() => import('./nodes/39'),
	() => import('./nodes/40'),
	() => import('./nodes/41'),
	() => import('./nodes/42'),
	() => import('./nodes/43'),
	() => import('./nodes/44'),
	() => import('./nodes/45')
];

export const server_loads = [0];

export const dictionary = {
		"/": [~2],
		"/about": [~3],
		"/blog": [4],
		"/blog/[slug]": [5],
		"/cart": [~6],
		"/checkout": [~7],
		"/checkout/cancel": [8],
		"/checkout/success": [~9],
		"/contact": [~10],
		"/directory": [~11],
		"/directory/[slug]": [~12],
		"/events": [~13],
		"/events/[slug]": [~14],
		"/login": [15],
		"/privacy": [16],
		"/return-policy": [17],
		"/search": [~18],
		"/shop": [~19],
		"/shop/apparel": [~20],
		"/shop/apparel/brands/[slug]": [~22],
		"/shop/apparel/categories/[slug]": [~23],
		"/shop/apparel/tags/[slug]": [~24],
		"/shop/apparel/[...slug]": [~21],
		"/shop/books": [~25],
		"/shop/books/authors": [~28],
		"/shop/books/authors/[slug]": [~29],
		"/shop/books/collections": [~30],
		"/shop/books/collections/[slug]": [~31],
		"/shop/books/genres": [~32],
		"/shop/books/genres/[slug]": [~33],
		"/shop/books/tags": [~34],
		"/shop/books/tags/[slug]": [~35],
		"/shop/books/[slug]/[isbn]": [~27],
		"/shop/books/[...slug]": [~26],
		"/shop/health-and-beauty": [~36],
		"/shop/health-and-beauty/collections/[slug]": [~38],
		"/shop/health-and-beauty/tags/[slug]": [~39],
		"/shop/health-and-beauty/types/[slug]": [~40],
		"/shop/health-and-beauty/[...slug]": [~37],
		"/shop/home-goods": [~41],
		"/shop/home-goods/tags/[slug]": [~43],
		"/shop/home-goods/types/[slug]": [~44],
		"/shop/home-goods/[...slug]": [~42],
		"/terms-of-service": [45]
	};

export const hooks = {
	handleError: (({ error }) => { console.error(error) }),
	
	reroute: (() => {}),
	transport: {}
};

export const decoders = Object.fromEntries(Object.entries(hooks.transport).map(([k, v]) => [k, v.decode]));

export const hash = false;

export const decode = (type, value) => decoders[type](value);

export { default as root } from '../root.js';