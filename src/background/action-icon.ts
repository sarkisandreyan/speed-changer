import { getHostFromURL } from '../utils/hosts';
import { getEnabledStateForHost } from '../utils/states';
import { getSpeedForHost } from '../utils/speeds';
import { setIconForTabBySpeed } from '../utils/background';
import { getConfig } from '../config';
import browser from '../browser';

getConfig().subscribe(
  async ({
    enabled,
    enabledHostExceptions,
    globalSpeed,
    hostSpecificSpeeds,
  }) => {
    if (
      enabled.changed ||
      enabledHostExceptions.changed ||
      globalSpeed.changed ||
      hostSpecificSpeeds.changed
    ) {
      const tabs = await browser.tabs.query({});
      for (const tab of tabs) {
        if (!tab.id || !tab.url) continue;

        const host = getHostFromURL(tab.url);
        const { enabled } = await getEnabledStateForHost(host);

        setIconForTabBySpeed(
          tab.id,
          enabled,
          hostSpecificSpeeds.value[host] ?? globalSpeed.value,
        );
      }
    }
  },
);

browser.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (!info.status && !info.url) return;

  if (!tab.url) {
    setIconForTabBySpeed(tabId, false, NaN);
    return;
  }

  const host = getHostFromURL(tab.url);
  const { enabled } = await getEnabledStateForHost(host);

  setIconForTabBySpeed(tabId, enabled, await getSpeedForHost(host));
});
