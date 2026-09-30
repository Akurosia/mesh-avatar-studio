import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
export default defineConfig({
  plugins: [react(), {
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
  test: { include: ['tests/**/*.test.ts'] },
});
