import type { EventName, MeasurementPayload } from '../types';
import { TELEMETRY_ENDPOINT } from '../constants';

const MEASUREMENT_API_URL = `${TELEMETRY_ENDPOINT}?measurement_id=${import.meta.env.SC_GA_MEASUREMENT_ID}&api_secret=${
  import.meta.env.SC_GA_MEASUREMENT_API_SECRET
}`;

export async function sendEvent<Event extends EventName>(
  payload: MeasurementPayload<Event>,
): Promise<MeasurementPayload<Event> | null> {
  const serializedPayload = JSON.stringify(payload);

  try {
    const request = await fetch(MEASUREMENT_API_URL, {
      method: 'POST',
      body: serializedPayload,
    });

    return request.ok ? payload : null;
  } catch {
    return null;
  }
}

export async function sendEventBeacon<Event extends EventName>(
  payload: MeasurementPayload<Event>,
): Promise<MeasurementPayload<Event> | null> {
  const serializedPayload = JSON.stringify(payload);

  // Try to send via a `keepalive`-enabled `fetch` request whenever possible
  // because `navigator.sendBeacon` is unstable some browsers such as Firefox.
  if ('keepalive' in Request.prototype) {
    const request = await fetch(MEASUREMENT_API_URL, {
      method: 'POST',
      body: serializedPayload,
      keepalive: true,
    });

    if (request.ok) {
      return payload;
    }

    return null;
  } else {
    navigator.sendBeacon(MEASUREMENT_API_URL, serializedPayload);
    return null;
  }
}
