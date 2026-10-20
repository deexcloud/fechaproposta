/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = { ...process.env, ...loadEnv(mode, process.cwd(), '') };
  // Endereço público do site: WhatsApp e redes só leem a imagem de prévia com URL completa.
  const siteUrl = (
    env.VITE_SITE_URL ||
    (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
    'https://fechaproposta.vercel.app'
  ).replace(/\/$/, '');

  // Páginas públicas para o buscador (as mesmas de INDEXABLE em src/lib/seo.ts).
  const publicPages = ['/', '/exemplo', '/criar-conta', '/termos', '/privacidade'];
  const robots = `User-agent: *\nAllow: /\nDisallow: /painel\nDisallow: /admin\n\nSitemap: ${siteUrl}/sitemap.xml\n`;
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${publicPages
    .map((path) => `  <url><loc>${siteUrl}${path}</loc></url>`)
    .join('\n')}\n</urlset>\n`;

  return {
    plugins: [
      react(),
      { name: 'site-url', transformIndexHtml: (html: string) => html.replaceAll('%SITE_URL%', siteUrl) },
      {
        name: 'seo-files',
        generateBundle() {
          this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots });
          this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap });
        },
      },
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: { port: 5173 },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'supabase/functions/**/*.test.ts'],
    },
  };
});
