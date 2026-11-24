import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { catalogueSchema } from './src/domain/catalogue';

function publicCatalogue(): Plugin {
  const id = '\0virtual:public-catalogue';
  const files = ['walks', 'images'].map((name) =>
    fileURLToPath(new URL(`./data/catalogue/${name}.json`, import.meta.url)),
  );
  return {
    name: 'public-catalogue',
    resolveId(source) {
      if (source === 'virtual:public-catalogue') return id;
    },
    async load(source) {
      if (source !== id) return;
      const [walkRows, imageRows] = await Promise.all(
        files.map(async (file) => {
          this.addWatchFile(file);
          return JSON.parse(await readFile(file, 'utf8'));
        }),
      );
      const catalogue = catalogueSchema.parse({
        walks: walkRows,
        images: imageRows,
      });
      const walks = catalogue.walks
        .filter((walk) => walk.status !== 'draft')
        .map((walk) =>
          Object.fromEntries(
            Object.entries(walk).filter(
              ([field]) =>
                field !== 'evidence_notes' && field !== 'practical_notes',
            ),
          ),
        );
      const slugs = new Set(walks.map(({ slug }) => slug));
      const images = catalogue.images.filter(
        (photo) =>
          slugs.has(photo.walk_slug) &&
          photo.licence_note !== null &&
          photo.image_url.startsWith('https://'),
      );
      return `export const walks = ${JSON.stringify(walks)}; export const images = ${JSON.stringify(images)};`;
    },
  };
}

export default defineConfig({
  base: '/hertfordshire-walker/',
  plugins: [react(), publicCatalogue()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id === '\0virtual:public-catalogue') return 'catalogue-data';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
