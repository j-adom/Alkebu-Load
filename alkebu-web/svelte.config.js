import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import adapter from "@sveltejs/adapter-cloudflare";

// Static pages that can be prerendered (homepage excluded — it fetches live data from Payload CMS)
const prerenderStatic = [
  '/about', '/contact', '/privacy', '/return-policy', '/terms-of-service'
];

const cloudflareStaticExcludes = [
  '<build>',
  '/assets/*',
  '/inc/*',
  '/android-chrome-*',
  '/apple-touch-icon.png',
  '/favicon*',
  '/mstile-*',
  '/ali_logo_small.png',
  '/svelte-welcome.*',
  ...prerenderStatic
];

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: cloudflareStaticExcludes
      }
    }),
    prerender: {
      entries: prerenderStatic
    }
  },

  preprocess: [vitePreprocess({})],
};

export default config;
