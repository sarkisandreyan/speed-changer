/**
 * This file houses website-specific patches that are applied to some popular websites
 * in order to improve the user experience on them. These are patches in the literal sense
 * of the word meaning that they mainly rely on specific DOM structures that have been
 * reverse-engineered, may use timeouts with arbitrary numbers of milliseconds, etc.
 */

import { getHostFromURL } from './utils/hosts';
import { getConfig } from './config';
import {
  getEnabledStateForHost,
  getFloatingButtonsEnabledStateForHost,
} from './utils/states';

const host = getHostFromURL(location.href);

let patch: {
  setup: () => void;
  teardown: () => void;
} | null = null;

getConfig().subscribe(
  async ({
    enabled: enabledConfig,
    enabledHostExceptions,
    floatingButtonsEnabled,
    floatingButtonsEnabledHostExceptions,
  }) => {
    if (
      !enabledConfig.changed &&
      !enabledHostExceptions.changed &&
      !floatingButtonsEnabled.changed &&
      !floatingButtonsEnabledHostExceptions.changed
    ) {
      return;
    }

    const { enabled: enabledForHost } = await getEnabledStateForHost(host);
    const { enabled: floatingButtonsEnabledForHost } =
      await getFloatingButtonsEnabledStateForHost(host);

    const enabled = enabledForHost && floatingButtonsEnabledForHost;

    if (enabled) {
      switch (host) {
        case 'youtube.com':
          patch = await import('./website-specific-patches/youtube.com');
          break;
        case 'tiktok.com':
          patch = await import('./website-specific-patches/tiktok.com');
          break;
        case 'instagram.com':
          patch = await import('./website-specific-patches/instagram.com');
          break;
      }

      patch?.setup();
    } else {
      patch?.teardown();
      patch = null;
    }
  },
);
