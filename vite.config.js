import path from 'node:path';
import { crx } from '@crxjs/vite-plugin';
import { defineConfig } from 'vite';
import zip from 'vite-plugin-zip-pack';
import manifest from './manifest.config.js';
import { manifestTransformer } from './manifest-transformer.js';
import { name, version } from './package.json';

export default defineConfig(({ mode }) => ({
  envPrefix: 'SC_',
  plugins: [
    crx({ manifest }),
    manifestTransformer(mode),
    zip({
      outDir: 'release',
      outFileName: `crx-${name}-${version}-${mode}.zip`,
    }),
  ],
  server: {
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
  build: {
    // Prevents dynamic imports incorrectly being resolved against
    // the current host instead of the extension base URL.
    modulePreload: false,
    rollupOptions: {
      input: {
        welcome: 'src/welcome/welcome.html',
      },
    },
  },
}));
