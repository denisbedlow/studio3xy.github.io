import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://studio3xy.com',
  integrations: [mdx()],
  vite: {
    build: {
      rollupOptions: {
        // Pagefind JS is generated post-build into dist/pagefind/.
        // Leave the dynamic import as-is rather than trying to bundle it.
        external: [/\/pagefind\//],
      },
    },
  },
});
