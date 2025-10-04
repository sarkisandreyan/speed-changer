import { fromEvent } from 'rxjs';
import { getConfig, getConfigSnapshot } from '../config';
import { sendTelemetry } from '../telemetry/api';
import {
  getFormattedSpeed,
  getSpeedForHost,
  setSpeedForHost,
} from '../utils/speeds';
import { getHostForActiveTab } from '../utils/hosts';
import { adjustWidthForInput } from '../utils/dom';
import { clamp } from 'ramda';
import ui from './ui-bridge';

const host = await getHostForActiveTab();

getConfig().subscribe(async ({ hostSpecificSpeeds, globalSpeed }) => {
  if (!host) return;

  if (hostSpecificSpeeds.changed || globalSpeed.changed) {
    const speed = await getSpeedForHost(host);

    ui.indicator.value = `${getFormattedSpeed(speed, true)}x`;
    ui.indicator.style.width = `${ui.indicator.scrollWidth}px`;
  }
});

fromEvent(ui.indicator, 'focusin').subscribe(() => {
  requestAnimationFrame(() => {
    ui.indicator.setSelectionRange(0, ui.indicator.value.length - 1);
  });
});

fromEvent<InputEvent>(ui.indicator, 'beforeinput').subscribe((event) => {
  if (!event.data) return;

  // Only allow digits and floating points to be typed in.
  if (!event.data.match(/^[\d.]+$/)) {
    event.preventDefault();
  }
});

fromEvent<InputEvent>(ui.indicator, 'input').subscribe(() => {
  adjustWidthForInput(ui.indicator, 20);
});

fromEvent(ui.indicator, 'change').subscribe(async () => {
  if (!host) return;

  const { minSpeed, maxSpeed } = await getConfigSnapshot();
  const speed = Number.parseFloat(ui.indicator.value);
  const clampedSpeed = clamp(minSpeed, maxSpeed, speed);

  if (Number.isNaN(clampedSpeed)) {
    const originalSpeed = await getSpeedForHost(host);
    ui.indicator.value = `${getFormattedSpeed(originalSpeed, true)}x`;
    adjustWidthForInput(ui.indicator, 20);
    return;
  }

  await setSpeedForHost(host, clampedSpeed);
  sendTelemetry(
    'popup_indicator_value_change',
    { applied_speed: clampedSpeed },
    { realm: 'popup' },
  );

  ui.indicator.value = `${getFormattedSpeed(clampedSpeed, true)}x`;
  adjustWidthForInput(ui.indicator, 20);

  if (document.activeElement === ui.indicator) {
    ui.indicator.setSelectionRange(
      ui.indicator.value.length - 1,
      ui.indicator.value.length - 1,
    );
  }
});
