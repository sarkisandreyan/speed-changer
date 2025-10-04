import type { NormalizedHost } from '../types';
import { getConfigSnapshot, setConfig } from '../config';
import {
  SPEED_CHANGER_CUSTOM_RATE,
  SPEED_CHANGER_ORIGINAL_RATE,
  SPEED_CHANGER_TEMPORARY_RATE,
} from '../constants';
import { getHostForCurrentTab, getHostFromURL } from './hosts';
import { clamp } from 'ramda';

export async function getClosestSpeed(
  speed: number,
  direction: 'next' | 'prev',
) {
  const { minSpeed, maxSpeed } = await getConfigSnapshot();

  let step = 1;

  if (speed < 2) {
    step = 0.25;
  } else if (speed < 4) {
    step = 0.5;
  }

  let result: number;
  if (direction === 'next') {
    result = Math.ceil((speed + 1e-6) / step) * step;
  } else {
    result = Math.floor((speed - 1e-6) / step) * step;
  }

  return clamp(minSpeed, maxSpeed, result);
}

/**
 * Formats the given speed to be displayed in the UI.
 *
 * For the short format, integers are returned as-is, while for
 * numbers with a decimal point, only the first two digits are
 * picked up from the fractional part without applying any rounding.
 *
 * For the long format, a minimum of 2 numbers are returned in
 * the fractional part, padded with zeros as necessary. If the
 * fractional part contains more than 3 digits, only the first
 * two digits are picked up without applying any rounding.
 *
 * @param speed The speed to format
 * @param long Whether to use the long format
 */
export function getFormattedSpeed(speed: number, long: boolean = false) {
  if (!Number.isFinite(speed)) {
    return '';
  }

  if (Number.isInteger(speed)) {
    return long ? `${speed}.00` : String(speed);
  }

  if (long) {
    let [_, integerPart, fractionalPart] =
      String(speed).match(/^(\d+)\.(\d+)$/) ?? [];
    if (!integerPart || !fractionalPart) return '';

    fractionalPart = fractionalPart.slice(0, 2).padEnd(2, '0');
    return `${integerPart}.${fractionalPart}`;
  }

  return String(speed).match(/^\d+(?:\.\d{1,2})?/)![0];
}

/**
 * Returns the host-specific speed if available, falling back to the global speed otherwise.
 */
export async function getSpeedForHost(host: NormalizedHost) {
  const { hostSpecificSpeeds, globalSpeed } = await getConfigSnapshot();

  if (host in hostSpecificSpeeds) {
    return hostSpecificSpeeds[host];
  }

  return globalSpeed;
}

/**
 * Updates (or sets, if unset) the host-specific speed for the given host.
 */
export async function setSpeedForHost(host: NormalizedHost, speed: number) {
  setConfig(({ hostSpecificSpeeds }) => ({
    hostSpecificSpeeds: {
      ...hostSpecificSpeeds,
      [host]: speed,
    },
  }));
}

/**
 * Updates the global speed.
 */
export async function setGlobalSpeed(speed: number) {
  setConfig({ globalSpeed: speed });
}

/**
 * Returns the host-speed mapping of hosts whose values have been clamped
 * to the provided minimum & maximum speeds, or `null` if none was applicable.
 */
export function clampHostSpecificSpeeds(
  hostSpecificSpeeds: Record<string, number>,
  minSpeed: number,
  maxSpeed: number,
): Record<string, number> | null {
  const overriddenSpeeds: typeof hostSpecificSpeeds = {};
  let atLeastOneOverridden = false;

  for (const host in hostSpecificSpeeds) {
    if (
      hostSpecificSpeeds[host] < minSpeed ||
      hostSpecificSpeeds[host] > maxSpeed
    ) {
      overriddenSpeeds[host] = clamp(
        minSpeed,
        maxSpeed,
        hostSpecificSpeeds[host],
      );
      atLeastOneOverridden = true;
    }
  }

  return atLeastOneOverridden ? overriddenSpeeds : null;
}

/**
 * Detemines the most suitable playback rate for the given media element and
 * patches its playback speed accordingly, taking into account:
 * - whether the element is subject to a temporary rate change override (as changed
 *   by long-/force-pressing the floating button or locking the speed),
 * - whether the element has a custom playback rate definition (as picked from the
 *   floating view),
 * - or whether it should fall back to the host-specific/global speed.
 */
export async function patchRateForElement(element: HTMLMediaElement) {
  if (typeof element[SPEED_CHANGER_TEMPORARY_RATE] === 'number') {
    element.playbackRate = element[SPEED_CHANGER_TEMPORARY_RATE];
  } else if (typeof element[SPEED_CHANGER_CUSTOM_RATE] === 'number') {
    element.playbackRate = element[SPEED_CHANGER_CUSTOM_RATE];
  } else {
    const host = await getHostForCurrentTab();
    element.playbackRate = await getSpeedForHost(host);
  }
}

/**
 * Resets the *custom* rates for the given media element, i.e. the temporary rate
 * ({@link SPEED_CHANGER_TEMPORARY_RATE}) as assigned by long-/force-pressing or
 * locking the speed using the floating buttons, and the custom rate
 * ({@link SPEED_CHANGER_CUSTOM_RATE}) as assigned by manually choosing a speed
 * from the floating view.
 *
 * Additionally, resets the rate of the media element to the host-specific speed,
 * or the global speed if it does not exist.
 *
 * Useful when cleaning up custom rate overrides when floating buttons are disabled
 * but the host-specific and global speed overrides should still be in force.
 *
 * See also {@link resetAllRatesForElement}.
 */
export async function resetCustomRatesForElement(element: HTMLMediaElement) {
  const host = getHostFromURL(location.href);
  delete element[SPEED_CHANGER_TEMPORARY_RATE];
  delete element[SPEED_CHANGER_CUSTOM_RATE];
  element.playbackRate = await getSpeedForHost(host);
}

/**
 * Resets *all* the rates for the given media element, i.e. the temporary rate
 * ({@link SPEED_CHANGER_TEMPORARY_RATE}) as assigned by long-/force-pressing or
 * locking the speed using the floating buttons, and the custom rate
 * ({@link SPEED_CHANGER_CUSTOM_RATE}) as assigned by manually choosing a speed
 * from the floating view.
 *
 * Additionally, resets the rate of the media element to its original rate as stored
 * ({@link SPEED_CHANGER_ORIGINAL_RATE}) during the initialization of the extension.
 *
 * Useful when cleaning up all kinds of rate overrides when the extension is disabled.
 *
 * See also {@link resetCustomRatesForElement}.
 */
export async function resetAllRatesForElement(element: HTMLMediaElement) {
  delete element[SPEED_CHANGER_TEMPORARY_RATE];
  delete element[SPEED_CHANGER_CUSTOM_RATE];
  if (typeof element[SPEED_CHANGER_ORIGINAL_RATE] === 'number') {
    element.playbackRate = element[SPEED_CHANGER_ORIGINAL_RATE];
    delete element[SPEED_CHANGER_ORIGINAL_RATE];
  }
}
