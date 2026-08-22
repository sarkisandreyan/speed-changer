import type { LocalStorageData, MeasurementPayload } from '../types';
import { preparePayload } from '../telemetry/payload';
import { sendTelemetry } from '../telemetry/api';
import { VERSION } from '../constants';
import browser from '../browser';

const { latestVersion, pendingTelemetryForUpdateAt } =
  await browser.storage.local.get<LocalStorageData>([
    'latestVersion',
    'pendingTelemetryForUpdateAt',
  ]);

if (typeof pendingTelemetryForUpdateAt === 'number') {
  let payload: MeasurementPayload<'extension_install' | 'extension_update'>;
  if (!latestVersion) {
    // If there is no record of the latest version,
    // report an install event instead of an update.
    payload = await preparePayload(
      'extension_install',
      {},
      { realm: 'extension' },
    );
  } else {
    payload = await preparePayload(
      'extension_update',
      {
        previous_version: latestVersion,
      },
      { realm: 'extension' },
    );
  }

  payload.events[0].params.timestamp_micros = String(
    pendingTelemetryForUpdateAt * 1000,
  );
  await sendTelemetry(payload);

  await browser.storage.local.remove<LocalStorageData>(
    'pendingTelemetryForUpdateAt',
  );

  await browser.storage.local.set<LocalStorageData>({ latestVersion: VERSION });
}
