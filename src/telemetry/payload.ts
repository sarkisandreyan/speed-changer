import type {
  BaseEventParams,
  DeviceInfo,
  EventName,
  EventParams,
  EventsPayload,
  LocalStorageData,
  MeasurementPayload,
  SessionInfo,
  SessionRealm,
  TrackableHost,
} from '../types';
import { VERSION } from '../constants';
import { UAParser } from '@ua-parser-js/pro-personal';
import { pageSessionId } from './page-session';
import { getHostForActiveTab, getHostForCurrentTab } from '../utils/hosts';
import {
  generateSessionId,
  generateUserId,
  getTrackableHost,
} from '../utils/telemetry';
import browser from '../browser';

export async function getClientId(): Promise<string> {
  let { telemetryInfo } =
    await browser.storage.local.get<LocalStorageData>('telemetryInfo');

  if (typeof telemetryInfo === 'object' && telemetryInfo.client_id) {
    return telemetryInfo.client_id;
  }

  const client_id = generateUserId();
  telemetryInfo = {
    ...(telemetryInfo ?? {}),
    client_id,
  };
  await browser.storage.local.set<LocalStorageData>({ telemetryInfo });

  return client_id;
}

export async function getDeviceInfo(): Promise<DeviceInfo> {
  let { telemetryInfo } =
    await browser.storage.local.get<LocalStorageData>('telemetryInfo');

  if (typeof telemetryInfo === 'object' && telemetryInfo.device) {
    return telemetryInfo.device;
  }

  const {
    browser: browserInfo,
    device: deviceInfo,
    os: osInfo,
  } = await UAParser().withFeatureCheck();
  const device: DeviceInfo = {
    language: navigator.language,
    screen_resolution: `${screen.width}x${screen.height}`,
    browser: browserInfo.name,
    browser_version: browserInfo.version,
    operating_system: osInfo.name,
    operating_system_version: osInfo.version,
    brand: deviceInfo.vendor,
    model: deviceInfo.model,
  };

  telemetryInfo = {
    ...(telemetryInfo ?? {}),
    device,
  };
  await browser.storage.local.set<LocalStorageData>({ telemetryInfo });

  return device;
}

export async function getIpOverride(): Promise<string | null> {
  let { telemetryInfo } =
    await browser.storage.local.get<LocalStorageData>('telemetryInfo');

  return telemetryInfo?.ip_override ?? null;
}

export async function getBaseEventParams(
  sessionInfo: SessionInfo,
): Promise<BaseEventParams> {
  const session_id = await getSessionId(sessionInfo.realm, sessionInfo.start);
  const timestamp_micros = String(Date.now() * 1000);
  const extension_version = VERSION;

  let color_scheme: 'light' | 'dark' | undefined = void 0;
  if (sessionInfo.realm !== 'extension') {
    color_scheme = !matchMedia('(prefers-color-scheme: dark)').matches
      ? 'light'
      : 'dark';
  }

  let host: TrackableHost | undefined = void 0;
  if (sessionInfo.realm === 'content' || sessionInfo.realm === 'popup') {
    const rawHost =
      'tabs' in browser
        ? await getHostForActiveTab()
        : await getHostForCurrentTab();
    host = getTrackableHost(rawHost);
  }

  let page_session_id: string | undefined = void 0;
  let is_from_iframe: '1' | '0' | undefined = void 0;
  if (sessionInfo.realm === 'content') {
    page_session_id = pageSessionId.value;
    is_from_iframe = window !== top ? '1' : '0';
  }

  return {
    session_id,
    timestamp_micros,
    engagement_time_msec: 100,
    extension_version,
    ...(color_scheme && { color_scheme }),
    ...(host && { host }),
    ...(page_session_id && { page_session_id }),
    ...(is_from_iframe && { is_from_iframe }),
    ...(import.meta.env.DEV && { debug_mode: '1' }),
  };
}

export async function getSessionId(
  realm: SessionRealm,
  startSession: boolean = false,
): Promise<string> {
  let { sessionIds } =
    await browser.storage.local.get<LocalStorageData>('sessionIds');

  if (!startSession && typeof sessionIds === 'object' && sessionIds[realm]) {
    return sessionIds[realm];
  }

  const sessionId = generateSessionId();
  sessionIds = {
    ...(sessionIds ?? {}),
    [realm]: sessionId,
  };
  await browser.storage.local.set<LocalStorageData>({ sessionIds });

  return sessionId;
}

export async function preparePayload<Event extends EventName>(
  name: Event,
  params: EventParams<Event>,
  sessionInfo: SessionInfo,
): Promise<MeasurementPayload<Event>> {
  const client_id = await getClientId();
  const device = await getDeviceInfo();
  const ip_override = await getIpOverride();

  const baseEventParams = await getBaseEventParams(sessionInfo);

  const events: EventsPayload<Event> = [
    {
      name,
      params: {
        ...baseEventParams,
        ...params,
      },
    },
  ];

  return {
    client_id,
    events,
    device,
    ...(ip_override ? { ip_override } : {}),
  };
}
