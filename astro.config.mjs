import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://studio3xy.com',
  integrations: [
    starlight({
      title: 'Studio3xy',
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        { slug: 'index' },
        { slug: 'eyetracking' },
        {
          label: 'Tools',
          items: [
            { label: 'Overview', link: '/tools/' },
            { label: 'CSV Loc Name Decomposer', link: '/tools/csv-decomposer/' },
          ],
        },
      ],
    }),
  ],
});
