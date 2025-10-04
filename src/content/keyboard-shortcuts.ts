import type { HostEnabledState } from '../types';
import { filter, fromEvent } from 'rxjs';
import { getConfig, getConfigSnapshot, setConfig } from '../config';
import { SPEED_CHANGER_CUSTOM_RATE } from '../constants';
import { playingMediaElements } from './patch-media-elements';
import { sendTelemetry } from '../telemetry/api';
import { isEditableElement, isHTMLElement } from '../utils/dom';
import { getHostForCurrentTab } from '../utils/hosts';
import {
  getEnabledStateForHost,
  getFloatingButtonsEnabledStateForHost,
} from '../utils/states';
import {
  getShortcut,
  hasActiveModifierKey,
  hasOnlyAltAsModifierKey,
  isModifierOrShiftKeyEvent,
} from '../utils/shortcuts';
import {
  getClosestSpeed,
  getSpeedForHost,
  patchRateForElement,
  setSpeedForHost,
} from '../utils/speeds';

// A `null` value indicates that keyboard shortcuts are disabled.
let enabledStateForHost: HostEnabledState | null = null;

getConfig().subscribe(
  async ({ enabled, enabledHostExceptions, keyboardShortcutsEnabled }) => {
    if (
      enabled.changed ||
      enabledHostExceptions.changed ||
      keyboardShortcutsEnabled.changed
    ) {
      const host = await getHostForCurrentTab();

      enabledStateForHost = keyboardShortcutsEnabled.value
        ? await getEnabledStateForHost(host)
        : null;
    }
  },
);

fromEvent<KeyboardEvent>(window, 'keydown')
  .pipe(filter(({ target }) => !!enabledStateForHost && isHTMLElement(target)))
  .subscribe(async (event) => {
    // In the context of this file and related utility functions elsewhere, modifier key means any of
    // the keys Control, Alt, and Meta. Shift key is not considered a modifier key because Shift + {Key}
    // combinations without any other active modifier keys cannot be used used as shortcuts.

    // Skip Shift key and modifier key presses, as well as any other key presses without any active modifier keys.
    if (isModifierOrShiftKeyEvent(event) || !hasActiveModifierKey(event))
      return;

    // Skip Alt-key-only presses when the target element is editable and Alt key is
    // supposed to produce alternative characters instead of acting as a shortcut.
    if (
      hasOnlyAltAsModifierKey(event) &&
      isEditableElement(event.target as HTMLElement)
    )
      return;

    const {
      minSpeed,
      maxSpeed,
      keyboardShortcutsBindings,
      keyboardShortcutsTarget,
    } = await getConfigSnapshot();

    const potentialShortcut = getShortcut(event);

    const shortcutMatch = keyboardShortcutsBindings.find(
      ({ shortcut }) => potentialShortcut === shortcut,
    );

    if (!shortcutMatch) return;

    event.preventDefault();

    const { action } = shortcutMatch;
    const host = await getHostForCurrentTab();

    if (action === 'ToggleExtension') {
      setConfig({ enabled: !enabledStateForHost!.enabled });
      return;
    }

    if (action === 'ToggleFloatingButtons') {
      const { exceptional } = await getFloatingButtonsEnabledStateForHost(host);

      setConfig(({ floatingButtonsEnabledHostExceptions }) => ({
        floatingButtonsEnabledHostExceptions: !exceptional
          ? floatingButtonsEnabledHostExceptions.concat(host)
          : floatingButtonsEnabledHostExceptions.filter(
              (_host) => _host !== host,
            ),
      }));
      return;
    }

    let finalSpeed: number | null = null;

    if (action === 'IncreaseSpeed' || action === 'DecreaseSpeed') {
      const direction = action === 'IncreaseSpeed' ? 'next' : 'prev';

      if (keyboardShortcutsTarget === 'current') {
        playingMediaElements.forEach(async (element) => {
          const finalSpeed = await getClosestSpeed(
            element.playbackRate,
            direction,
          );
          element[SPEED_CHANGER_CUSTOM_RATE] = finalSpeed;
          patchRateForElement(element);
        });

        sendTelemetry(
          'keyboard_shortcut_use',
          {
            shortcut_keys: shortcutMatch.shortcut,
            shortcut_action: shortcutMatch.action,
          },
          { realm: 'content', start: true },
        );

        return;
      } else {
        const currentSpeed = await getSpeedForHost(host);
        finalSpeed = await getClosestSpeed(currentSpeed, direction);
      }
    }

    if (action === 'PlayAtMinimumSpeed' || action === 'PlayAtMaximumSpeed') {
      finalSpeed = action === 'PlayAtMinimumSpeed' ? minSpeed : maxSpeed;
    }

    let [speedMatch] = action.match(/(?<=PlayAt)[\d.]+(?=x)/) ?? [];
    if (speedMatch) {
      const speed = +speedMatch;
      if (Number.isNaN(speed)) return;

      finalSpeed = speed;
    }

    if (finalSpeed === null) return;

    if (keyboardShortcutsTarget === 'current') {
      playingMediaElements.forEach((element) => {
        element[SPEED_CHANGER_CUSTOM_RATE] = finalSpeed;
        patchRateForElement(element);
      });
    } else {
      setSpeedForHost(host, finalSpeed);
    }

    sendTelemetry(
      'keyboard_shortcut_use',
      {
        shortcut_keys: shortcutMatch.shortcut,
        shortcut_action: shortcutMatch.action,
      },
      { realm: 'content', start: true },
    );
  });
