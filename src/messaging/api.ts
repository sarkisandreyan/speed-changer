import type {
  MessagingPayload,
  MessagingRequest,
  MessagingResponse,
} from '../types';
import { generateMessageId, isValidMessagingPayload } from '../utils/messaging';
import browser from '../browser';

declare const importScripts: any;

let port: chrome.runtime.Port | null = null;
setupPort();

export async function sendMessage<ResponseBody = any>(
  payload: MessagingPayload,
): Promise<ResponseBody> {
  if (typeof importScripts !== 'undefined') {
    throw new Error(
      'You are not supposed to call `sendMessage` from the background script.',
    );
  }

  if (!isValidMessagingPayload(payload)) {
    throw new TypeError('Invalid messaging payload.');
  }

  return new Promise(async (resolve, reject) => {
    if (!port) {
      // Set up a new port if the previous one was closed.
      setupPort();
    } else if (import.meta.env.MODE === 'safari') {
      // See comment above the function for details.
      await pingBasedSetupFallback();
    }

    // Just to avoid non-null-asserting everywhere below.
    if (!port) return;

    const request: MessagingRequest = {
      id: generateMessageId(),
      payload,
    };

    // Time out after 10 seconds.
    const rejectTimeout = setTimeout(() => {
      port?.onMessage.removeListener(listener);
      reject('Messaging request timed out.');
    }, 10e3);

    const listener = (response: MessagingResponse) => {
      if (response.id === request.id) {
        resolve(response.body as ResponseBody);
        port?.onMessage.removeListener(listener);
        clearTimeout(rejectTimeout);
      }
    };

    port.onMessage.addListener(listener);

    port.postMessage(request);
  });
}

function setupPort() {
  // Do not setup up a port if executed inside the background script itself.
  if (typeof importScripts !== 'undefined') return;

  port = browser.runtime.connect({ name: generateMessageId() });
  port.onDisconnect.addListener(() => {
    port = null;
  });
}

// Ports tend to get 'stale' in Safari after some time of inactivity —
// not only do these ports *not* fire `onDisconnect`, but they also
// keep gladly accepting `postMessage` calls without throwing an
// exception. Hence, this ping-based fallback that expects the port
// to 'pong back' in under 50ms, setting up a new port otherwise.
//
// This function is a no-op in non-Safari builds, but it's preferable
// not to call it in non-Safari environments at all.
//
// Possibly related to this `isQuarantined`?
// https://github.com/WebKit/WebKit/blob/23b15df9ebc00659c80da09bf7e7297a60f6a479/Source/WebKit/WebProcess/Extensions/API/Cocoa/WebExtensionAPIPortCocoa.mm#L141
function pingBasedSetupFallback() {
  if (import.meta.env.MODE !== 'safari') return;

  return new Promise<void>((resolve) => {
    const pingRequest = {
      id: generateMessageId(),
      payload: { action: 'ping' },
    };
    port?.postMessage(pingRequest);

    const resetPortTimeout = setTimeout(() => {
      port?.onMessage.removeListener(pingListener);
      try {
        // Try to disconnect from the previous port, just in case.
        port?.disconnect();
      } catch {}
      setupPort();
      resolve();
    }, 50);

    const pingListener = (response: MessagingResponse) => {
      if (response.id === pingRequest.id) {
        clearTimeout(resetPortTimeout);
        port?.onMessage.removeListener(pingListener);
        resolve();
      }
    };

    port?.onMessage.addListener(pingListener);
  });
}
