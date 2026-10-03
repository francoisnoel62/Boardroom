// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

const repository = 'https://github.com/francoisnoel62/Boardroom';

export default defineConfig({
  // The public domain is pending a decision (plan: SITE-VITRINE-ET-DOCUMENTATION.md, D3).
  site: process.env.SITE_URL,
  trailingSlash: 'always',
  vite: {
    // The site reads the product's own fixtures and exports from the repository root.
    server: { fs: { allow: ['..'] } },
  },
  integrations: [
    starlight({
      title: 'Boardroom',
      description: 'Documentation for BOARDROOM, an open-source decision room where AI advisers challenge your plan and you make the call.',
      logo: { light: './src/assets/mark-light.svg', dark: './src/assets/mark-dark.svg', alt: '' },
      social: [{ icon: 'github', label: 'GitHub', href: repository }],
      editLink: { baseUrl: `${repository}/edit/main/site/` },
      lastUpdated: true,
      customCss: ['./src/styles/fonts.css', './src/styles/tokens.css', './src/styles/docs.css'],
      components: {
        PageTitle: './src/components/docs/PageTitle.astro',
      },
      sidebar: [
        { label: 'Get started', items: ['docs', 'docs/quickstart'] },
        { label: 'Concepts', items: ['docs/your-data'] },
      ],
    }),
  ],
});
