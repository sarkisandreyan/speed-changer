import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'Speed Changer – Play videos faster',
  short_name: 'Speed Changer',
  version: pkg.version,
  description: pkg.description,
  icons: {
    128: 'src/assets/graphics/default/default.png',
  },
  action: {
    default_icon: {
      128: 'src/assets/graphics/action/icon-normal.png',
    },
    default_popup: 'src/popup/popup.html',
  },
  content_scripts: [
    {
      js: [
        'node_modules/@webcomponents/custom-elements/custom-elements.min.js',
        'src/content/content.ts',
        'src/apply-website-specific-patches.ts',
      ],
      all_frames: true,
      matches: ['<all_urls>'],
    },
  ],
  options_page: 'src/options/options.html',
  background: {
    service_worker: 'src/background.ts',
    scripts: ['src/background.ts'],
    type: 'module',
  },
  host_permissions: ['<all_urls>'],
  web_accessible_resources: [
    {
      matches: ['<all_urls>'],
      resources: ['src/assets/scripts/override-prototype.js'],
    },
    {
      matches: ['<all_urls>'],
      resources: ['src/welcome/welcome.html'],
    },
  ],
  permissions: ['storage'],
  // @ts-expect-error `browser_specific_settings` is not specified by @crxjs/vite-plugin
  browser_specific_settings: {
    gecko: {
      id: 'speed-changer@andreyan.com',
    },
  },
});
