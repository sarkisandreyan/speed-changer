import type { LocalStorageData } from '../types';
import { getConfigSnapshot } from '../config';
import browser from '../browser';

getConfigSnapshot().then(async ({ allowTelemetry }) => {
  if (!allowTelemetry) return;

  let { telemetryInfo } =
    await browser.storage.local.get<LocalStorageData>('telemetryInfo');

  // Delete `'device'` from telemetry info when background script
  // is started so that the browser version is always up to date
  // (to be populated later from the content page/popup).
  if (telemetryInfo?.device) {
    delete telemetryInfo.device;
  }

  // Retrieve the public IP of the user to send to GA for more precise
  // geolocation inferral.
  try {
    const request = await fetch('https://api.ipify.org/?format=json');
    const response = await request.json();

    if (!('ip' in response) || typeof response.ip !== 'string') throw 0;

    telemetryInfo = {
      ...telemetryInfo,
      ip_override: response.ip,
    };
  } catch {}

  await browser.storage.local.set<LocalStorageData>({ telemetryInfo });
});
