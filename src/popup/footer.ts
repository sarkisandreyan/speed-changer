import { fromEvent } from 'rxjs';
import { sendTelemetryBeacon } from '../telemetry/api';
import { preparePayload } from '../telemetry/payload';
import { sendMessage } from '../messaging/api';
import { getConfigSnapshot } from '../config';
import ui from './ui-bridge';

export function setHintContent(content: string | null) {
  if (content) {
    ui.hint.innerHTML = content;
    ui.footer.style.opacity = '0';
    ui.hint.style.opacity = '1';
    ui.hint.removeAttribute('aria-hidden');
  } else {
    ui.hint.innerHTML = '';
    ui.footer.style.opacity = '';
    ui.hint.style.opacity = '';
    ui.hint.setAttribute('aria-hidden', 'true');
  }
}

if (import.meta.env.SC_MARKET_ITEM_LINK) {
  const { allowTelemetry } = await getConfigSnapshot();
  const link = new URL(import.meta.env.SC_MARKET_ITEM_LINK);
  if (allowTelemetry) {
    link.searchParams.set('utm_source', `sc_extension_${import.meta.env.MODE}`);
    link.searchParams.set('utm_medium', 'extension');
    link.searchParams.set('utm_content', 'popup_footer_link');
  }
  ui.footerLink.href = link.toString();
}

fromEvent(ui.preferences, 'click').subscribe(async () => {
  const payload = await preparePayload(
    'popup_preferences_click',
    {},
    { realm: 'popup' },
  );
  sendMessage({ action: 'open-options-page' });
  sendTelemetryBeacon(payload);
});

const rateOnMarketPayload = await preparePayload(
  'popup_rate_click',
  {},
  { realm: 'popup' },
);

fromEvent(ui.footerLink, 'click').subscribe((event) => {
  if (!import.meta.env.SC_MARKET_ITEM_LINK) {
    event.preventDefault();
    return;
  }
  rateOnMarketPayload.events[0].params.timestamp_micros = String(
    Date.now() * 1000,
  );
  sendTelemetryBeacon(rateOnMarketPayload);
});
