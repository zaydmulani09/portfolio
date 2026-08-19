// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  output: 'static',

  // Deploy: GitHub Pages, custom domain at the subdomain root.
  site: 'https://zayd.dpdns.org',
  base: '/',

  integrations: [sitemap()],
});
