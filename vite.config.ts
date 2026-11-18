import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      manifest: {
        id: '/',
        name: 'Club La Ruedita',
        short_name: 'La Ruedita',
        description: 'Programa de fidelidad digital de Club La Ruedita.',
        theme_color: '#4A5D3F',
        background_color: '#FAF7F0',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: '/',
        scope: '/',
        lang: 'es',
        icons: [{ src: '/assets/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }]
      },
      workbox: { globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,webp,woff,woff2}'], cleanupOutdatedCaches: true }
    }),
    {
      name: 'copy-existing-club-pages-and-assets',
      apply: 'build',
      closeBundle() {
        const root = process.cwd();
        const dist = path.join(root, 'dist');
        for (const item of ['assets', 'css', 'js']) {
          const from = path.join(root, item);
          if (fs.existsSync(from)) fs.cpSync(from, path.join(dist, item), { recursive: true, force: true });
        }
        for (const file of ['caja.html', 'panel.html', 'survey.html', 'cookies.html', 'privacidad.html', 'manifest.json']) {
          const from = path.join(root, file);
          if (fs.existsSync(from)) fs.copyFileSync(from, path.join(dist, file));
        }
      }
    }
  ],
  build: { outDir: 'dist', emptyOutDir: true }
});
