import type { LocalStorageData } from '../types';
import { getConfigSnapshot } from '../config';
import { VERSION } from '../constants';
import browser from '../browser';

// Update uninstall URL to contain `client_id` if telemetry is enabled.
getConfigSnapshot().then(async ({ allowTelemetry }) => {
  if (!import.meta.env.SC_GOODBYE_LINK) {
    browser.runtime.setUninstallURL('');
    return;
  }

  const goodbyeUrl = new URL(import.meta.env.SC_GOODBYE_LINK);

  if (!allowTelemetry) {
    browser.runtime.setUninstallURL(goodbyeUrl.toString());
    return;
  }

  const { telemetryInfo } =
    await browser.storage.local.get<LocalStorageData>('telemetryInfo');
  if (telemetryInfo?.client_id) {
    goodbyeUrl.searchParams.set('c', telemetryInfo.client_id);
  }
  goodbyeUrl.searchParams.set('v', VERSION);

  browser.runtime.setUninstallURL(goodbyeUrl.toString());
});

browser.runtime.onInstalled.addListener(({ reason }) => {
  switch (reason) {
    case 'install':
      // Open the welcome page with a slight delay because most assets
      // don't seem to be ready to be served when opening immediately.
      setTimeout(() => {
        browser.tabs.create({
          url: browser.runtime.getURL('src/welcome/welcome.html'),
        });
      }, 500);
      break;
  }
});

browser.storage.local
  .get<LocalStorageData>('latestVersion')
  .then(({ latestVersion }) => {
    if (latestVersion === VERSION) return;

    // Schedule the update report to happen in the content script
    // because device information cannot be confidently inferred
    // from the background script.
    browser.storage.local.set<LocalStorageData>({
      pendingTelemetryForUpdateAt: Date.now(),
    });
  });
