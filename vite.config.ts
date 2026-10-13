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

  return {
    plugins: [react(), { name: 'site-url', transformIndexHtml: (html: string) => html.replaceAll('%SITE_URL%', siteUrl) }],
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
