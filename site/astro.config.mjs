// @ts-check
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'node:url';

const repository = 'https://github.com/francoisnoel62/Boardroom';

export default defineConfig({
  // The public domain is pending a decision (plan: SITE-VITRINE-ET-DOCUMENTATION.md, D3).
  // SITE_URL wins; on Vercel, canonical URLs and the sitemap point at the production deployment.
  site: process.env.SITE_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined),
  trailingSlash: 'always',
  // Tests build a fixture release into a separate directory.
  outDir: process.env.SITE_OUT_DIR ?? './dist',
  vite: {
    // The site reads the product's own fixtures and exports from the repository root.
    server: { fs: { allow: ['..'] } },
    // src/domain.ts lives outside the site package; its schemas resolve zod from here (same pinned version).
    resolve: { alias: { zod: fileURLToPath(new URL('./node_modules/zod', import.meta.url)) } },
  },
  integrations: [
    starlight({
      title: 'Boardroom',
      description: 'Documentation for BOARDROOM, a local decision room where AI advisers challenge your plan and you make the call.',
      logo: { light: './src/assets/mark-light.svg', dark: './src/assets/mark-dark.svg', alt: '' },
      social: [{ icon: 'github', label: 'GitHub', href: repository }],
      editLink: { baseUrl: `${repository}/edit/main/site/` },
      lastUpdated: true,
      // Long commands wrap rather than creating scroll regions a keyboard cannot reach; copying is unaffected.
      expressiveCode: { defaultProps: { wrap: true, preserveIndent: true } },
      customCss: ['./src/styles/fonts.css', './src/styles/tokens.css', './src/styles/docs.css'],
      components: {
        PageTitle: './src/components/docs/PageTitle.astro',
        Footer: './src/components/docs/Footer.astro',
      },
      sidebar: [
        { label: 'Get started', items: ['docs', 'docs/quickstart', 'docs/install', 'docs/first-real-meeting'] },
        { label: 'Concepts', items: ['docs/concepts/the-room', 'docs/concepts/meeting-lifecycle', 'docs/concepts/verdicts', 'docs/concepts/evidence', 'docs/your-data'] },
        { label: 'Guides', items: ['docs/guides/recorded-example', 'docs/guides/documents', 'docs/guides/export', 'docs/guides/history-and-decision', 'docs/guides/terminal-check', 'docs/guides/doctor', 'docs/guides/technical-evidence', 'docs/guides/troubleshooting'] },
        { label: 'Reference', items: ['docs/reference/cli', 'docs/reference/exit-codes', 'docs/reference/json-output', 'docs/reference/data-directory', 'docs/reference/platforms'] },
        { label: 'Project', items: ['docs/project/roadmap', { label: 'Engineering', link: '/engineering/' }, 'docs/project/contributing', 'docs/project/license'] },
      ],
    }),
  ],
});
