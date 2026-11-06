import { manifestTransformer } from './manifest-transformer.js';
import { crx } from '@crxjs/vite-plugin';
import { Features } from 'lightningcss';
import { defineConfig } from 'vite';

import pkg from './package.json' with { type: 'json' };
import manifest from './manifest.config.js';
import zip from 'vite-plugin-zip-pack';

export default defineConfig(({ mode }) => ({
  envPrefix: 'SC_',
  plugins: [
    crx({ manifest }),
    manifestTransformer(mode),
    zip({
      outDir: 'release',
      outFileName: `crx-${pkg.name}-${pkg.version}-${mode}.zip`,
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
  css: {
    lightningcss: {
      // Disables 'syntax lowering' for the `:dir` pseudo-class
      // bacause we rely on actual rather than locale-induced
      // directionality in quite a lot of places in the code.
      exclude: Features.DirSelector,
    },
  },
}));
