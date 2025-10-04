import { fromEvent } from 'rxjs';
import { sendTelemetryBeacon } from '../telemetry/api';
import { preparePayload } from '../telemetry/payload';
import { sendMessage } from '../messaging/api';
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

fromEvent(ui.preferences, 'click').subscribe(async () => {
  const payload = await preparePayload(
    'popup_preferences_click',
    {},
    { realm: 'popup' },
  );
  sendMessage({ action: 'open-options-page' });
  sendTelemetryBeacon(payload);
});

fromEvent(ui.supportLink, 'click').subscribe(async (event) => {
  event.preventDefault();
  const payload = await preparePayload(
    'popup_support_click',
    {},
    { realm: 'popup' },
  );
  sendMessage({ action: 'open-support-page' });
  sendTelemetryBeacon(payload);
});
