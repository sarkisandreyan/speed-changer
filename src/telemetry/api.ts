import type {
  EventName,
  EventParams,
  MeasurementPayload,
  SessionInfo,
} from '../types';
import { sendEventBeacon } from './private-api';
import { preparePayload } from './payload';
import { sendMessage } from '../messaging/api';
import { getConfig } from '../config';

let telemetryAllowed = false;

export async function sendTelemetry<Event extends EventName>(
  name: Event,
  params: EventParams<Event>,
  sessionInfo: SessionInfo,
): Promise<MeasurementPayload<Event> | null>;

export async function sendTelemetry<Event extends EventName>(
  payload: MeasurementPayload<Event>,
): Promise<MeasurementPayload<Event> | null>;

/**
 * Sends telemetry information to Google Analytics (unless the user
 * has opted out of telemetry).
 *
 * This function is unsuitable for cases where instant dispatchment is
 * needed (e.g. when the user is navigating away from the page) for two
 * reasons:
 *
 * 1. The Measurement API payload is created from scratch
 *    (using {@link preparePayload}); it takes time and the browsers
 *    will have killed the process before the event is actually
 *    dispatched anywhere.
 * 2. The events here are channeled through the background script
 *    to make sure the events from the content realm are not blocked
 *    by the browser. This may be a concern for privacy, but seems
 *    to be the only way to prevent scenarios where the events from
 *    the popup realm are coming through but those from the content
 *    realm are blocked, resulting in unreliable statistics. I suppose
 *    showing the user the checkbox to opt out of telemetry on the
 *    welcome page is enough due diligence to ensure the user agrees
 *    to data collection (arguable? TODO: rethink this later).
 *
 * If you need to dispatch the events immediately without channeling
 * them through the background script, see {@link sendTelemetryBeacon}.
 *
 * When telemetry is disabled, this is a no-op.
 *
 * @returns The sent payload when the Measurement Protocol API call is a success, `null` otherwise.
 */
export async function sendTelemetry<Event extends EventName>(
  nameOrPayload: Event | MeasurementPayload<Event>,
  params?: EventParams<Event>,
  sessionInfo?: SessionInfo,
): Promise<MeasurementPayload<Event> | null> {
  if (!telemetryAllowed) return null;

  const payload =
    typeof nameOrPayload === 'string'
      ? await preparePayload(nameOrPayload, params!, sessionInfo!)
      : nameOrPayload;

  return sendMessage({
    action: 'send-telemetry',
    data: payload,
  });
}

/**
 * Sends telemetry information to Google Analytics (unless the user
 * has opted out of telemetry) via `keepalive`-enabled `fetch` requests,
 * or `navigator.sendBeacon` if the former is not available. This is
 * appropriate to use in cases when the user is navigating away from
 * the content page or the popup and we need to immediately schedule
 * an API call to the Measurement Protocol, without channelling them
 * through the background script.
 *
 * If immediate dispatchment of the event is not a concern, prefer
 * using {@link sendTelemetry} (see comment there).
 *
 * Unlike {@link sendTelemetry}, which constructs the full event payload from
 * scratch, this function only accepts a ready-made {@link MeasurementPayload}
 * which can be constructed in advance using {@link preparePayload}.
 *
 * When telemetry is disabled, this is a no-op.
 */
export async function sendTelemetryBeacon<Event extends EventName>(
  payload: MeasurementPayload<Event>,
): Promise<MeasurementPayload<Event> | null> {
  if (!telemetryAllowed) return null;
  return sendEventBeacon(payload);
}

getConfig().subscribe(({ allowTelemetry }) => {
  if (allowTelemetry.changed) {
    telemetryAllowed = allowTelemetry.value;
  }
});
