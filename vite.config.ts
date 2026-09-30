import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * GitHub Pages serves a project site under /<repo>/, so a build has to know it
 * sits on a subpath. Dev stays at the root, where there is no such prefix.
 * Override with BASE_PATH when deploying somewhere else (a custom domain
 * wants BASE_PATH=/).
 */
const base = process.env.BASE_PATH ?? '/trip-planner/';

/**
 * Writes the built bundle's filenames into the service worker.
 *
 * They are content-hashed, so the worker cannot know them ahead of time — and
 * without them it can only cache assets it happens to see, which on a first
 * visit is none of them: the script and stylesheet are requested before the
 * worker controls the page. Someone who visited once and then lost their
 * connection would get a blank screen. Precaching at install closes that.
 */
function precacheAssets(outDir: string, basePath: string): Plugin {
  return {
    name: 'precache-assets',
    apply: 'build',
    closeBundle() {
      const swPath = resolve(outDir, 'sw.js');
      const assets = readdirSync(resolve(outDir, 'assets'))
        .filter((name) => name.endsWith('.js') || name.endsWith('.css'))
        .map((name) => `${basePath}assets/${name}`);

      const sw = readFileSync(swPath, 'utf8');
      writeFileSync(swPath, sw.replace('self.__PRECACHE__ = [];', `self.__PRECACHE__ = ${JSON.stringify(assets)};`));
    },
  };
}

export default defineConfig(({ command }) => ({
  base: command === 'build' ? base : '/',
  plugins: [react(), precacheAssets('dist', base)],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, host: true },
}));
