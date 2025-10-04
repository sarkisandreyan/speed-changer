import type { NormalizedHost, AllowedHost, TrackableHost } from '../types';
import trackableHosts from '../../trackable-hosts';

const trackableHostsSet = new Set(trackableHosts as NormalizedHost[]);

export function generateUserId(): string {
  const digits = '1234567890';

  let salt = '';
  for (let i = 0; i < 12; ++i) {
    salt += digits[Math.floor(Math.random() * digits.length)];
  }

  const currentDate = new Date()
    .toISOString()
    .match(/^.*(?=T)/)![0]
    .replace(/-/g, '');

  return `1${salt}.${currentDate}`;
}

export function generateSessionId(): string {
  const digits = '1234567890';

  let salt = '';
  for (let i = 0; i < 9; ++i) {
    salt += digits[Math.floor(Math.random() * digits.length)];
  }

  const currentDate = new Date()
    .toISOString()
    .match(/^.*(?=T)/)![0]
    .replace(/-/g, '');

  return `${currentDate}${salt}`;
}

/**
 * Returns a 'trackable host', i.e.:
 *
 * (a) the host itself it it is a trackable host (as defined
 *     inside `trackable-hosts.mts`),
 * (b) an obfuscating string if it is a non-trackable host.
 */
export function getTrackableHost(host: NormalizedHost | null): TrackableHost {
  if (!host) return 'Unavailable';

  if (trackableHostsSet.has(host)) {
    return host as string as AllowedHost;
  }

  return 'Other';
}

/**
 * Formats the given boolean as a `'1'`/`'0'` to send to GA.
 */
export function getBooleanValue(value: boolean): '1' | '0' {
  return value ? '1' : '0';
}
