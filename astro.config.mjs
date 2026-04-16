import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://studio3xy.com',
  integrations: [
    starlight({
      title: 'Studio3xy',
      customCss: ['./src/styles/custom.css'],
      components: {
        Header: './src/components/Header.astro',
        PageSidebar: './src/components/PageSidebar.astro',
      },
      sidebar: [
        { slug: 'index' },
        { slug: 'eyetracking' },
        { slug: 'video' },
        {
          label: 'Tools',
          items: [
{ label: 'CSV Loc Name Decomposer', link: '/tools/csv-decomposer/' },
            { label: 'CSV Column Splitter', link: '/tools/csv-rule-splitter/' },
            { label: 'EDL Tool & Converter', link: '/tools/edl-converter/' },
            { label: 'CSV Add _MST to VFX ID', link: '/tools/csv-mst-appender/' },
          ],
        },
      ],
    }),
  ],
});
