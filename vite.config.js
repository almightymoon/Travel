import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        journeys: resolve(root, 'journeys.html'),
        about: resolve(root, 'about.html'),
        stays: resolve(root, 'stays.html'),
        hosts: resolve(root, 'hosts.html'),
        plan: resolve(root, 'plan.html'),
        stories: resolve(root, 'stories.html'),
        patagonia: resolve(root, 'journeys/patagonia.html'),
        morocco: resolve(root, 'journeys/morocco.html'),
        indonesia: resolve(root, 'journeys/indonesia.html'),
        cyclades: resolve(root, 'journeys/cyclades.html'),
        dolomites: resolve(root, 'journeys/dolomites.html'),
      },
    },
  },
});
