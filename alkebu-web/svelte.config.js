import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import adapter from "@sveltejs/adapter-cloudflare";

// Static pages that can be prerendered
const prerenderStatic = [
  '/',               // if your home is static (otherwise SSR it)
  '/about', '/contact', '/returns', '/shipping', '/privacy', '/terms'
];

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({ 
      routes: { include: ['/*'] } 
    }),
    prerender: { 
      entries: prerenderStatic 
    }
  },

  preprocess: [vitePreprocess({})],
};

export default config;
