import type { ConfigEnv, Plugin } from 'vite';
import { readFile, writeFile } from 'fs/promises';
import { resolve } from 'path';

export function manifestTransformer(mode: ConfigEnv['mode']): Plugin {
  return {
    name: 'Vendor-specific transformer for manifest.json',
    async writeBundle({ dir }) {
      if (!dir) return;

      const manifest = resolve(dir, './manifest.json');
      const manifestContent = String(await readFile(manifest));
      const parsedManifest = JSON.parse(manifestContent);

      switch (mode) {
        case 'gecko':
          parsedManifest.background.scripts = [
            parsedManifest.background.service_worker,
          ];
          delete parsedManifest.background.service_worker;

          parsedManifest.web_accessible_resources.forEach((resources: any) => {
            delete resources.use_dynamic_url;
          });
          break;
        case 'chromium':
        case 'safari':
          delete parsedManifest.browser_specific_settings;
          break;
      }

      await writeFile(manifest, JSON.stringify(parsedManifest, null, 2));
    },
  };
}
