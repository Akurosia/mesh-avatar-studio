import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { localProjectsPlugin, studioAllowedHosts } from './src/server/local-projects';
import { mediapipeAssets } from './src/server/mediapipe-assets';
import { liveRelay } from './src/server/live-relay';
const allowedHosts = studioAllowedHosts();
export default defineConfig({
  server: { host: '127.0.0.1', allowedHosts },
  plugins: [react(), localProjectsPlugin(fileURLToPath(new URL('.', import.meta.url)), allowedHosts), mediapipeAssets(fileURLToPath(new URL('.', import.meta.url))), liveRelay(), {
    name: 'sample-rig',
    resolveId(id) {
      if (id === 'virtual:sample-rig') return '\0sample-rig';
    },
    load(id) {
      if (id === '\0sample-rig') {
        const json = readFileSync(new URL('./samples/miko-qipao/rig.json', import.meta.url), 'utf8');
        return `export default ${json}`;
      }
    },
  }],
  publicDir: 'samples',
  build: { rollupOptions: { input: { editor: 'index.html', stream: 'stream.html', live: 'live.html' } } },
  test: { include: ['tests/**/*.test.ts'] },
});
