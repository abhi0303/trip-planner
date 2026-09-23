import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

/**
 * GitHub Pages serves a project site under /<repo>/, so a build has to know it
 * sits on a subpath. Dev stays at the root, where there is no such prefix.
 * Override with BASE_PATH when deploying somewhere else (a custom domain
 * wants BASE_PATH=/).
 */
const base = process.env.BASE_PATH ?? '/trip-planner/';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? base : '/',
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, host: true },
}));
