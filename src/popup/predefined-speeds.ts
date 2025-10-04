import type { HostEnabledState } from '../types';
import { fromEvent, merge } from 'rxjs';
import { getConfig, setConfig } from '../config';
import { sendTelemetryBeacon, sendTelemetry } from '../telemetry/api';
import { getFloatingButtonsEnabledStateForHost } from '../utils/states';
import { getHostForActiveTab } from '../utils/hosts';
import {
  getFormattedSpeed,
  getSpeedForHost,
  setGlobalSpeed,
  setSpeedForHost,
} from '../utils/speeds';
import { setHintContent } from './footer';
import { rangeChangePayload } from './range';
import { altKey } from '../key-trackers';
import ui from './ui-bridge';

const host = await getHostForActiveTab();

let floatingButtonsEnabledStateForHost: HostEnabledState;

if (host) {
  ui.floatingButtonsSwitcher.textContent = `Enable floating buttons for ${host}`;
}

getConfig().subscribe(
  async ({
    globalSpeed,
    minSpeed,
    maxSpeed,
    hostSpecificSpeeds,
    floatingButtonsEnabled,
    floatingButtonsEnabledHostExceptions,
    predefinedSpeeds,
  }) => {
    const hostSpeed = host ? await getSpeedForHost(host) : 1;

    if (predefinedSpeeds.changed) {
      ui.predefinedSpeeds
        .querySelectorAll('[data-speed]')
        .forEach((button) => button.remove());
      [...predefinedSpeeds.value].reverse().forEach((speed) => {
        const button = document.createElement('button');
        button.textContent = `${getFormattedSpeed(speed)}x`;
        button.setAttribute('data-speed', String(speed));
        button.setAttribute(
          'aria-pressed',
          speed === hostSpeed ? 'true' : 'false',
        );
        if (button.textContent.length > 4) {
          button.classList.add('smallest');
        } else if (button.textContent.length > 3) {
          button.classList.add('smaller');
        }
        if (speed < minSpeed.value || speed > maxSpeed.value) {
          button.disabled = true;
          button.classList.add('ouside-allowed-range');
        }
        fromEvent(button, 'click').subscribe(() => {
          if (!host) return;

          if (rangeChangePayload.payload) {
            sendTelemetryBeacon(rangeChangePayload.payload);
            rangeChangePayload.payload = null;
          }

          if (!altKey.pressed) {
            setSpeedForHost(host, speed);
            sendTelemetry(
              'popup_predefined_click',
              { applied_speed: speed },
              { realm: 'popup' },
            );
          } else {
            setGlobalSpeed(speed);
            sendTelemetry(
              'popup_predefined_alt_click',
              { applied_speed: speed },
              { realm: 'popup' },
            );
          }
        });
        ui.predefinedSpeeds.insertAdjacentElement('afterbegin', button);
      });
    }

    if (
      (minSpeed.changed && !minSpeed.firstChange) ||
      (maxSpeed.changed && !maxSpeed.firstChange)
    ) {
      ui.predefinedSpeeds
        .querySelectorAll<HTMLButtonElement>('[data-speed]')
        .forEach((button) => {
          const speed = Number.parseFloat(button.getAttribute('data-speed')!);
          button.disabled = speed < minSpeed.value || speed > maxSpeed.value;
        });
    }

    if (
      (globalSpeed.changed && !globalSpeed.firstChange) ||
      (hostSpecificSpeeds.changed && !hostSpecificSpeeds.firstChange)
    ) {
      ui.predefinedSpeeds
        .querySelectorAll('button[data-speed]')
        .forEach((button) => {
          const enabled =
            button.getAttribute('data-speed') === String(hostSpeed);
          button.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        });
    }

    if (
      floatingButtonsEnabled.changed ||
      floatingButtonsEnabledHostExceptions
    ) {
      floatingButtonsEnabledStateForHost = host
        ? await getFloatingButtonsEnabledStateForHost(host)
        : { enabled: false, exceptional: false };
      ui.floatingButtonsSwitcher.setAttribute(
        'aria-pressed',
        String(floatingButtonsEnabledStateForHost.enabled),
      );
    }
  },
);

async function updateHint() {
  setHintContent(
    `${floatingButtonsEnabledStateForHost.enabled ? 'Disable' : 'Enable'} floating buttons for this website.`,
  );
}

merge(
  fromEvent<MouseEvent>(ui.floatingButtonsSwitcher, 'mouseenter'),
  fromEvent<UIEvent>(ui.floatingButtonsSwitcher, 'focusin'),
  fromEvent<MouseEvent>(ui.floatingButtonsSwitcher, 'mouseleave'),
  fromEvent<UIEvent>(ui.floatingButtonsSwitcher, 'focusout'),
).subscribe(async ({ type }) => {
  if (type === 'mouseenter' || type === 'focusin') {
    updateHint();
  } else {
    setHintContent(null);
  }
});

fromEvent(ui.floatingButtonsSwitcher, 'click').subscribe(async () => {
  if (!host) return;

  const enabled = !floatingButtonsEnabledStateForHost.exceptional;

  await setConfig(({ floatingButtonsEnabledHostExceptions }) => ({
    floatingButtonsEnabledHostExceptions: enabled
      ? floatingButtonsEnabledHostExceptions.concat(host)
      : floatingButtonsEnabledHostExceptions.filter((_host) => _host !== host),
  }));

  if (enabled) {
    sendTelemetry('popup_enable_fb_click', {}, { realm: 'popup' });
  } else {
    sendTelemetry('popup_disable_fb_click', {}, { realm: 'popup' });
  }

  updateHint();
});
