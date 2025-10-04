import type { MessagingRequest } from '../types';
import { getConfigSnapshot } from '../config';
import { sendEvent } from '../telemetry/private-api';
import {
  isValidMessagingPayload,
  isValidMessagingRequest,
} from '../utils/messaging';
import browser from '../browser';

const optionsPage = browser.runtime.getURL('src/options/options.html');

browser.runtime.onConnect.addListener((port) => {
  port.onMessage.addListener(async (request: unknown) => {
    if (
      !isValidMessagingRequest(request) ||
      !isValidMessagingPayload(request.payload)
    )
      return;

    function respond(body: any) {
      const { id } = request as MessagingRequest;
      port.postMessage({ id, body });
    }

    const { action, data } = request.payload;

    switch (action) {
      case 'ping':
        respond('pong');
        break;
      case 'send-telemetry':
        sendEvent(data).then(respond);
        break;
      case 'get-current-tab-url':
        respond(port.sender?.tab?.url);
        break;
      case 'open-support-page':
        const { allowTelemetry } = await getConfigSnapshot();
        const link = new URL(import.meta.env.SC_SUPPORT_LINK);
        if (allowTelemetry) {
          link.searchParams.set(
            'utm_source',
            `sc_extension_${import.meta.env.MODE}`,
          );
          link.searchParams.set('utm_medium', 'extension');
          link.searchParams.set('utm_content', 'popup_footer_link');
        }
        browser.tabs.create({
          url: link.toString(),
        });
        respond('ok');
        break;
      case 'get-platform-info':
        browser.runtime.getPlatformInfo().then(respond);
        break;
      case 'open-options-page':
        const url = new URL(optionsPage);
        if (typeof data === 'string') {
          url.hash = data;
        }
        browser.tabs.create({
          url: url.toString(),
        });
        respond('ok');
        break;
    }

    return true;
  });
});
