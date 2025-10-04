import type { NormalizedHost } from '../types';
import { sendMessage } from '../messaging/api';
import browser from '../browser';

/**
 * Returns the host for the active tab in the current window,
 * or `null` if unavailable.
 *
 * Not to be confused with {@link getHostForCurrentTab}, which
 * is intended to be used in the content realm.
 */
export async function getHostForActiveTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url) return null;

  return getHostFromURL(tab.url);
}

/**
 * Returns the host for the current tab (i.e. the topmost window
 * in the content).
 *
 * Not to be confused with {@link getHostForActiveTab}, which
 * is intended to be used in non-content realms.
 */
export async function getHostForCurrentTab() {
  const tabUrl = await sendMessage<string | void>({
    action: 'get-current-tab-url',
  });
  // Fall back to `location.href` if tab URL is not available
  const url = tabUrl ?? location.href;
  return getHostFromURL(url);
}

/**
 * Extracts the normalized host from the given URL, removing the
 * trailing 'www.', if any, when the http(s): protocol is used.
 */
export function getHostFromURL(url: URL | string) {
  const { protocol, host } = typeof url !== 'string' ? url : new URL(url);

  return getNormalizedHost(host, protocol === 'http:' || protocol === 'https:');
}

/**
 * Taken (with minor changes) from:
 * https://github.com/miguelmota/is-valid-host
 */
export function isValidHost(host: string) {
  if (typeof host !== 'string') return false;

  const parts = host.match(/^([a-zA-Z0-9-.]{1,253})(?:\.)?(:[0-9]{1,5})?$/);
  if (!(parts && parts.length > 1)) {
    return false;
  }

  host = parts[1];
  const port = parts[2];
  if (port && Number(port.replace(/^:/, '')) > 65535) {
    return false;
  }
  if (host.endsWith('.')) {
    host = host.slice(0, -1);
  }
  if (host.length > 253) {
    return false;
  }

  const labels = host.split('.');
  const isValid = labels.every((label) => {
    const validLabelChars = /^([a-zA-Z0-9-]+)$/g;
    const validLabel =
      validLabelChars.test(label) &&
      label.length < 64 &&
      !label.startsWith('-') &&
      !label.endsWith('-');

    return validLabel;
  });

  return isValid;
}

/**
 * Returns a 'normalized' version of the given host, i.e. one that:
 *
 * - (a) is all lowercase
 * - (b) lacks the leading 'www.', unless instructed otherwise
 * - (c) lacks the trailing dot
 *
 * @param host The host string to normalize
 * @param removeWww Whether the leading 'www.' must be removed if present, useful when using the http(s): scheme
 */
export function getNormalizedHost(
  host: string,
  removeWww: boolean = true,
): NormalizedHost {
  // Convert to lowercase.
  host = host.toLowerCase();

  // Remove trailing dot, if any.
  if (host.endsWith('.')) {
    host = host.slice(0, -1);
  }

  // Remove the leading www. subdomain, if any & if needed.
  if (
    removeWww &&
    host.startsWith('www.') &&
    Number(host.match(/\./g)?.length) > 1
  ) {
    host = host.slice(4);
  }

  return host as NormalizedHost;
}
