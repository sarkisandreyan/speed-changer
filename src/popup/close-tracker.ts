import type { MeasurementPayload } from '../types';
import { fromEvent } from 'rxjs';
import { sendTelemetryBeacon, sendTelemetry } from '../telemetry/api';
import { preparePayload } from '../telemetry/payload';
import { rangeChangePayload } from './range';

const openPayload = await sendTelemetry(
  'popup_open',
  {},
  { realm: 'popup', start: true },
);

let closePayload: MeasurementPayload<'popup_close'> | null = null;
if (openPayload) {
  closePayload = await preparePayload('popup_close', {}, { realm: 'popup' });
}

fromEvent(document, 'visibilitychange').subscribe(() => {
  if (document.visibilityState !== 'hidden' || !closePayload) return;

  closePayload.events[0].params.timestamp_micros = String(Date.now() * 1000);

  // Combine pending range change events with the close event
  // to send them in one request (probably more reliable).
  if (rangeChangePayload.payload) {
    closePayload.events.unshift(
      ...(rangeChangePayload.payload
        .events as MeasurementPayload<any>['events']),
    );
  }

  sendTelemetryBeacon(closePayload);
});
