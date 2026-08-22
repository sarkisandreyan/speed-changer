import type {
  Config,
  KeyboardShortcutBinding,
  NormalizedHost,
  Position,
} from '../types';
import { PLATFORM_MAX_SPEED, PLATFORM_MIN_SPEED, VERSION } from '../constants';
import {
  defaultConfig,
  getConfig,
  getConfigSnapshot,
  setConfig,
} from '../config';
import { HostListEditor } from './custom-elements/host-list-editor';
import { KeyboardShortcutsEditor } from './custom-elements/keyboard-shortcuts-editor';
import { PredefinedSpeedsEditor } from './custom-elements/predefined-speeds-editor';
import { PreferredPositionEditor } from './custom-elements/preferred-position-editor';
import { getBooleanValue, getTrackableHost } from '../utils/telemetry';
import { getKeyName } from '../utils/shortcuts';
import { sendTelemetry } from '../telemetry/api';
import { UAParser } from '@ua-parser-js/pro-personal';
import { equals } from 'ramda';

import './custom-elements/host-list-editor';
import './custom-elements/keyboard-shortcuts-editor';
import './custom-elements/predefined-speeds-editor';
import './custom-elements/preferred-position-editor';

const LAST_VALID_VALUE = Symbol('LAST_VALID_VALUE');

declare global {
  interface HTMLInputElement {
    [LAST_VALID_VALUE]?: string;
  }
}

declare const extension_enabled: HTMLInputElement;
declare const extension_enabled_manage_exceptions: HTMLInputElement;
declare const global_speed: HTMLInputElement;
declare const minimum_speed: HTMLInputElement;
declare const maximum_speed: HTMLInputElement;
declare const predefined_speeds_editor: PredefinedSpeedsEditor;
declare const keyboard_shortcuts_enabled: HTMLInputElement;
declare const keyboard_shortcuts_modify_shortcuts: HTMLButtonElement;
declare const keyboard_shortcuts_target: HTMLSelectElement;
declare const floating_buttons_enabled: HTMLInputElement;
declare const floating_buttons_manage_exceptions: HTMLButtonElement;
declare const floating_buttons_target: HTMLSelectElement;
declare const floating_buttons_target_hint: HTMLParagraphElement;
declare const floating_buttons_preferred_position: PreferredPositionEditor;
declare const floating_buttons_long_press_speed: HTMLInputElement;
declare const floating_buttons_force_press_speed: HTMLInputElement;
declare const floating_buttons_dim_when_inactive: HTMLInputElement;
declare const floating_buttons_visual_indicators_enabled: HTMLInputElement;
declare const telemetry_section: HTMLElement;
declare const allow_telemetry: HTMLInputElement;
declare const allow_telemetry_link: HTMLAnchorElement;
declare const restore_defaults: HTMLButtonElement;
declare const privacy_policy: HTMLAnchorElement | undefined;
declare const rate_on_market: HTMLAnchorElement | undefined;
declare const report_issue: HTMLAnchorElement | undefined;
declare const send_feedback: HTMLAnchorElement | undefined;

let effectiveConfig: Config;

if (import.meta.env.MODE === 'safari') {
  floating_buttons_force_press_speed.closest('li')?.removeAttribute('hidden');
}

getConfig().subscribe(async (config) => {
  effectiveConfig = await getConfigSnapshot();

  extension_enabled.checked = config.enabled.value;
  extension_enabled_manage_exceptions.textContent = `Manage Exceptions${
    config.enabledHostExceptions.value.length > 0
      ? ` (${config.enabledHostExceptions.value.length})`
      : ''
  }…`;
  global_speed.value = String(config.globalSpeed.value);
  global_speed[LAST_VALID_VALUE] = global_speed.value;
  minimum_speed.value = String(config.minSpeed.value);
  minimum_speed[LAST_VALID_VALUE] = minimum_speed.value;
  maximum_speed.value = String(config.maxSpeed.value);
  maximum_speed[LAST_VALID_VALUE] = maximum_speed.value;

  if (config.predefinedSpeeds.changed) {
    predefined_speeds_editor.setSpeeds(config.predefinedSpeeds.value);
  }
  if (config.minSpeed.changed) {
    predefined_speeds_editor.setMinimumSpeed(config.minSpeed.value);
  }
  if (config.maxSpeed.changed) {
    predefined_speeds_editor.setMaximumSpeed(config.maxSpeed.value);
  }

  keyboard_shortcuts_enabled.checked = config.keyboardShortcutsEnabled.value;
  keyboard_shortcuts_target.value = config.keyboardShortcutsTarget.value;

  floating_buttons_enabled.checked = config.floatingButtonsEnabled.value;
  floating_buttons_manage_exceptions.textContent = `Manage Exceptions${
    config.floatingButtonsEnabledHostExceptions.value.length > 0
      ? ` (${config.floatingButtonsEnabledHostExceptions.value.length})`
      : ''
  }…`;
  floating_buttons_target.value = config.floatingButtonsTarget.value;
  floating_buttons_target_hint.innerHTML = `Press and hold ${await getKeyName(
    'Alt',
  )} while picking a speed from the floating button to&nbsp;apply changes ${
    config.floatingButtonsTarget.value !== 'current'
      ? 'to the current video only'
      : 'sitewide'
  }.`;
  floating_buttons_preferred_position.setPosition(
    config.floatingButtonsPreferredPosition.value,
  );
  floating_buttons_long_press_speed.value = String(
    config.floatingButtonsLongPressSpeed.value,
  );
  floating_buttons_long_press_speed[LAST_VALID_VALUE] =
    floating_buttons_long_press_speed.value;
  floating_buttons_force_press_speed.value = String(
    config.floatingButtonsForcePressSpeed.value,
  );
  floating_buttons_force_press_speed[LAST_VALID_VALUE] =
    floating_buttons_force_press_speed.value;
  floating_buttons_dim_when_inactive.checked =
    config.floatingButtonsDimming.value;
  floating_buttons_visual_indicators_enabled.checked =
    config.floatingButtonsVisualIndicatorsEnabled.value;

  if (
    import.meta.env.SC_GA_MEASUREMENT_ID &&
    import.meta.env.SC_GA_MEASUREMENT_API_SECRET
  ) {
    telemetry_section.hidden = false;
    allow_telemetry.checked = config.allowTelemetry.value;
    allow_telemetry_link.href = import.meta.env.SC_PRIVACY_POLICY_LINK ?? '#';
  }

  restore_defaults.disabled = equals(defaultConfig, effectiveConfig);

  if (import.meta.env.SC_PRIVACY_POLICY_LINK) {
    privacy_policy?.setAttribute(
      'href',
      import.meta.env.SC_PRIVACY_POLICY_LINK,
    );
  } else if (typeof privacy_policy !== 'undefined') {
    privacy_policy.parentElement?.remove();
  }

  if (import.meta.env.SC_MARKET_ITEM_LINK && rate_on_market) {
    switch (import.meta.env.MODE) {
      case 'chromium':
        rate_on_market.textContent = 'Rate on the Chrome Web Store';
        break;
      case 'edge':
        rate_on_market.textContent = 'Rate on Microsoft Edge Add-ons';
        break;
      case 'gecko':
        rate_on_market.textContent = 'Rate on Firefox Addons';
        break;
      case 'safari':
        rate_on_market.textContent = 'Rate on the Mac App Store';
        break;
    }
    rate_on_market.setAttribute('href', import.meta.env.SC_MARKET_ITEM_LINK);
  } else if (typeof rate_on_market !== 'undefined') {
    rate_on_market.parentElement?.remove();
  }

  if (import.meta.env.SC_REPORT_ISSUE_LINK) {
    const reportUrl = new URL(import.meta.env.SC_REPORT_ISSUE_LINK);
    const { browser, os } = await UAParser().withFeatureCheck();
    if (browser.name) {
      reportUrl.searchParams.set(
        'browser',
        `${browser.name}${browser.version ? ' ' + browser.version : ''}`,
      );
    }
    if (os.name) {
      reportUrl.searchParams.set(
        'os',
        `${os.name}${os.version ? ' ' + os.version : ''}`,
      );
    }
    reportUrl.searchParams.set('version', VERSION);
    report_issue?.setAttribute('href', reportUrl.toString());
  } else if (typeof report_issue !== 'undefined') {
    report_issue.parentElement?.remove();
  }

  if (import.meta.env.SC_SEND_FEEDBACK_LINK) {
    send_feedback?.setAttribute('href', import.meta.env.SC_SEND_FEEDBACK_LINK);
  } else if (typeof send_feedback !== 'undefined') {
    send_feedback.parentElement?.remove();
  }
});

extension_enabled.addEventListener('change', () => {
  setConfig({
    enabled: extension_enabled.checked,
  });

  sendTelemetry(
    'preferences_preference_change',
    {
      preference_name: 'enabled',
      preference_old_value: getBooleanValue(effectiveConfig.enabled),
      preference_new_value: getBooleanValue(extension_enabled.checked),
    },
    { realm: 'preferences' },
  );
});

extension_enabled_manage_exceptions.addEventListener('click', () => {
  const hostListEditor = document.createElement(
    'host-list-editor',
  ) as HostListEditor;
  hostListEditor.setHosts(effectiveConfig.enabledHostExceptions);

  hostListEditor.addEventListener('host-list-editor:commit', (event) => {
    setConfig({
      enabledHostExceptions: (event as CustomEvent<string[]>).detail,
    });
  });

  hostListEditor.addEventListener('host-list-editor:add-host', (event) => {
    const host = (event as CustomEvent<string>).detail as NormalizedHost;
    const trackableHost = getTrackableHost(host);

    sendTelemetry(
      'preferences_enabled_host_add',
      { changed_host: trackableHost },
      { realm: 'preferences' },
    );
  });

  hostListEditor.addEventListener('host-list-editor:remove-host', (event) => {
    const host = (event as CustomEvent<string>).detail as NormalizedHost;
    const trackableHost = getTrackableHost(host);

    sendTelemetry(
      'preferences_enabled_host_add',
      { changed_host: trackableHost },
      { realm: 'preferences' },
    );
  });

  document.body.appendChild(hostListEditor);
});

global_speed.addEventListener('change', () => {
  const globalSpeed = Number.parseFloat(global_speed.value);

  if (Number.isNaN(globalSpeed)) {
    global_speed.setCustomValidity('Invalid global speed');
    return;
  }

  if (globalSpeed < effectiveConfig.minSpeed) {
    global_speed.setCustomValidity(
      `The global default speed cannot be lower than the minimum speed.`,
    );
    return;
  }

  if (globalSpeed > effectiveConfig.maxSpeed) {
    global_speed.setCustomValidity(
      `The global default speed cannot be higher than the maximum speed.`,
    );
    return;
  }

  global_speed[LAST_VALID_VALUE] = global_speed.value;
  global_speed.setCustomValidity('');
  setConfig({ globalSpeed });

  sendTelemetry(
    'preferences_preference_change',
    {
      preference_name: 'global_speed',
      preference_old_value: effectiveConfig.globalSpeed,
      preference_new_value: globalSpeed,
    },
    { realm: 'preferences' },
  );
});

minimum_speed.addEventListener('change', () => {
  const minSpeed = Number.parseFloat(minimum_speed.value);

  if (Number.isNaN(minSpeed)) {
    minimum_speed.setCustomValidity('Invalid minimum speed');
    return;
  }

  if (minSpeed < PLATFORM_MIN_SPEED) {
    minimum_speed.setCustomValidity(
      `The minimum speed cannot be lower than ${PLATFORM_MIN_SPEED}x. This is a browser limitation.`,
    );
    return;
  }

  if (minSpeed > PLATFORM_MAX_SPEED) {
    minimum_speed.setCustomValidity(
      `The minimum speed cannot be higher than ${PLATFORM_MAX_SPEED}x. This is a browser limitation.`,
    );
    return;
  }

  minimum_speed[LAST_VALID_VALUE] = minimum_speed.value;
  minimum_speed.setCustomValidity('');
  setConfig({ minSpeed });

  sendTelemetry(
    'preferences_preference_change',
    {
      preference_name: 'minimum_speed',
      preference_old_value: effectiveConfig.minSpeed,
      preference_new_value: minSpeed,
    },
    { realm: 'preferences' },
  );
});

maximum_speed.addEventListener('change', () => {
  const maxSpeed = Number.parseFloat(maximum_speed.value);

  if (Number.isNaN(maxSpeed)) {
    maximum_speed.setCustomValidity('Invalid maximum speed');
    return;
  }

  if (maxSpeed < PLATFORM_MIN_SPEED) {
    maximum_speed.setCustomValidity(
      `The maximum speed cannot be lower than ${PLATFORM_MIN_SPEED}x. This is a browser limitation.`,
    );
    return;
  }

  if (maxSpeed > PLATFORM_MAX_SPEED) {
    maximum_speed.setCustomValidity(
      `The maximum speed cannot be higher than ${PLATFORM_MAX_SPEED}x. This is a browser limitation.`,
    );
    return;
  }

  maximum_speed[LAST_VALID_VALUE] = maximum_speed.value;
  maximum_speed.setCustomValidity('');
  setConfig({ maxSpeed });

  sendTelemetry(
    'preferences_preference_change',
    {
      preference_name: 'maximum_speed',
      preference_old_value: effectiveConfig.maxSpeed,
      preference_new_value: maxSpeed,
    },
    { realm: 'preferences' },
  );
});

predefined_speeds_editor.addEventListener(
  'predefined-speeds-editor:commit',
  (event) => {
    const predefinedSpeeds = (event as CustomEvent<number[]>).detail;

    setConfig({ predefinedSpeeds });

    // TODO: Maybe track granular changes instead of whole value commits?
    sendTelemetry(
      'preferences_preference_change',
      {
        preference_name: 'predefined_speeds',
        preference_old_value: JSON.stringify(effectiveConfig.predefinedSpeeds),
        preference_new_value: JSON.stringify(predefinedSpeeds),
      },
      { realm: 'preferences' },
    );
  },
);

keyboard_shortcuts_enabled.addEventListener('change', () => {
  setConfig({
    keyboardShortcutsEnabled: keyboard_shortcuts_enabled.checked,
  });

  sendTelemetry(
    'preferences_preference_change',
    {
      preference_name: 'keyboard_shortcuts_enabled',
      preference_old_value: getBooleanValue(
        effectiveConfig.keyboardShortcutsEnabled,
      ),
      preference_new_value: getBooleanValue(keyboard_shortcuts_enabled.checked),
    },
    { realm: 'preferences' },
  );
});

keyboard_shortcuts_modify_shortcuts.addEventListener('click', () => {
  const keyboardShortcutsEditor = document.createElement(
    'keyboard-shortcuts-editor',
  ) as KeyboardShortcutsEditor;
  keyboardShortcutsEditor.setBindings(
    effectiveConfig.keyboardShortcutsBindings,
  );

  keyboardShortcutsEditor.addEventListener(
    'keyboard-shortcuts-editor:add-item',
    (event) => {
      const { action, shortcut } = (
        event as CustomEvent<KeyboardShortcutBinding>
      ).detail;

      sendTelemetry(
        'preferences_keyboard_shortcut_add',
        { shortcut_action: action, shortcut_keys: shortcut },
        {
          realm: 'preferences',
        },
      );
    },
  );

  keyboardShortcutsEditor.addEventListener(
    'keyboard-shortcuts-editor:edit-item',
    (event) => {
      const { action, shortcut } = (
        event as CustomEvent<KeyboardShortcutBinding>
      ).detail;

      sendTelemetry(
        'preferences_keyboard_shortcut_edit',
        { shortcut_action: action, shortcut_keys: shortcut },
        {
          realm: 'preferences',
        },
      );
    },
  );

  keyboardShortcutsEditor.addEventListener(
    'keyboard-shortcuts-editor:remove-item',
    (event) => {
      const { action, shortcut } = (
        event as CustomEvent<KeyboardShortcutBinding>
      ).detail;

      sendTelemetry(
        'preferences_keyboard_shortcut_remove',
        { shortcut_action: action, shortcut_keys: shortcut },
        {
          realm: 'preferences',
        },
      );
    },
  );

  keyboardShortcutsEditor.addEventListener(
    'keyboard-shortcuts-editor:commit',
    (event) => {
      setConfig({
        keyboardShortcutsBindings: (
          event as CustomEvent<KeyboardShortcutBinding[]>
        ).detail,
      });
    },
  );

  document.body.appendChild(keyboardShortcutsEditor);
});

keyboard_shortcuts_target.addEventListener('change', () => {
  if (['current', 'host'].indexOf(keyboard_shortcuts_target.value) === -1)
    return;

  setConfig({
    keyboardShortcutsTarget: keyboard_shortcuts_target.value as
      | 'current'
      | 'host',
  });

  sendTelemetry(
    'preferences_preference_change',
    {
      preference_name: 'keyboard_shortcuts_target',
      preference_old_value: effectiveConfig.keyboardShortcutsTarget,
      preference_new_value: keyboard_shortcuts_target.value,
    },
    { realm: 'preferences' },
  );
});

floating_buttons_enabled.addEventListener('change', () => {
  setConfig({
    floatingButtonsEnabled: floating_buttons_enabled.checked,
  });

  sendTelemetry(
    'preferences_preference_change',
    {
      preference_name: 'floating_buttons_enabled',
      preference_old_value: getBooleanValue(
        effectiveConfig.floatingButtonsEnabled,
      ),
      preference_new_value: getBooleanValue(floating_buttons_enabled.checked),
    },
    { realm: 'preferences' },
  );
});

floating_buttons_manage_exceptions.addEventListener('click', () => {
  const hostListEditor = document.createElement(
    'host-list-editor',
  ) as HostListEditor;
  hostListEditor.setHosts(effectiveConfig.floatingButtonsEnabledHostExceptions);

  hostListEditor.addEventListener('host-list-editor:commit', (event) => {
    setConfig({
      floatingButtonsEnabledHostExceptions: (event as CustomEvent<string[]>)
        .detail,
    });
  });

  hostListEditor.addEventListener('host-list-editor:add-host', (event) => {
    const host = (event as CustomEvent<string>).detail as NormalizedHost;
    const trackableHost = getTrackableHost(host);

    sendTelemetry(
      'preferences_fb_enabled_host_add',
      { changed_host: trackableHost },
      { realm: 'preferences' },
    );
  });

  hostListEditor.addEventListener('host-list-editor:remove-host', (event) => {
    const host = (event as CustomEvent<string>).detail as NormalizedHost;
    const trackableHost = getTrackableHost(host);

    sendTelemetry(
      'preferences_fb_enabled_host_add',
      { changed_host: trackableHost },
      { realm: 'preferences' },
    );
  });

  document.body.appendChild(hostListEditor);
});

floating_buttons_target.addEventListener('change', () => {
  if (['current', 'host'].indexOf(floating_buttons_target.value) === -1) return;

  setConfig({
    floatingButtonsTarget: floating_buttons_target.value as 'current' | 'host',
  });

  sendTelemetry(
    'preferences_preference_change',
    {
      preference_name: 'floating_buttons_target',
      preference_old_value: String(effectiveConfig.floatingButtonsTarget),
      preference_new_value: String(floating_buttons_target.value),
    },
    { realm: 'preferences' },
  );
});

floating_buttons_preferred_position.addEventListener(
  'preferred-position-editor:commit',
  (event) => {
    const floatingButtonsPreferredPosition = (event as CustomEvent<Position>)
      .detail;

    if (
      floatingButtonsPreferredPosition ===
      effectiveConfig.floatingButtonsPreferredPosition
    )
      return;

    setConfig({ floatingButtonsPreferredPosition });

    sendTelemetry(
      'preferences_preference_change',
      {
        preference_name: 'floating_buttons_preferred_position',
        preference_old_value: effectiveConfig.floatingButtonsPreferredPosition,
        preference_new_value: floatingButtonsPreferredPosition,
      },
      { realm: 'preferences' },
    );
  },
);

floating_buttons_long_press_speed.addEventListener('change', () => {
  const longPressSpeed = Number.parseFloat(
    floating_buttons_long_press_speed.value,
  );

  if (Number.isNaN(longPressSpeed)) {
    floating_buttons_long_press_speed.setCustomValidity(
      'Invalid press-and-hold speed',
    );
    return;
  }

  if (longPressSpeed < effectiveConfig.minSpeed) {
    floating_buttons_long_press_speed.setCustomValidity(
      `The press-and-hold speed cannot be lower than the minimum speed.`,
    );
    return;
  }

  if (longPressSpeed > effectiveConfig.maxSpeed) {
    floating_buttons_long_press_speed.setCustomValidity(
      `The press-and-hold speed cannot be higher than the maximum speed.`,
    );
    return;
  }

  floating_buttons_long_press_speed[LAST_VALID_VALUE] =
    floating_buttons_long_press_speed.value;
  floating_buttons_long_press_speed.setCustomValidity('');
  setConfig({ floatingButtonsLongPressSpeed: longPressSpeed });

  sendTelemetry(
    'preferences_preference_change',
    {
      preference_name: 'floating_buttons_long_press_speed',
      preference_old_value: effectiveConfig.floatingButtonsLongPressSpeed,
      preference_new_value: longPressSpeed,
    },
    { realm: 'preferences' },
  );
});

floating_buttons_force_press_speed.addEventListener('change', () => {
  const forcePressSpeed = Number.parseFloat(
    floating_buttons_force_press_speed.value,
  );

  if (Number.isNaN(forcePressSpeed)) {
    floating_buttons_force_press_speed.setCustomValidity(
      'Invalid force press-and-hold speed',
    );
    return;
  }

  if (forcePressSpeed < effectiveConfig.minSpeed) {
    floating_buttons_force_press_speed.setCustomValidity(
      `The force press-and-hold speed cannot be lower than the minimum speed.`,
    );
    return;
  }

  if (forcePressSpeed > effectiveConfig.maxSpeed) {
    floating_buttons_force_press_speed.setCustomValidity(
      `The force press-and-hold speed cannot be higher than the maximum speed.`,
    );
    return;
  }

  floating_buttons_force_press_speed[LAST_VALID_VALUE] =
    floating_buttons_force_press_speed.value;
  floating_buttons_force_press_speed.setCustomValidity('');
  setConfig({ floatingButtonsForcePressSpeed: forcePressSpeed });

  sendTelemetry(
    'preferences_preference_change',
    {
      preference_name: 'floating_buttons_force_press_speed',
      preference_old_value: effectiveConfig.floatingButtonsForcePressSpeed,
      preference_new_value: forcePressSpeed,
    },
    { realm: 'preferences' },
  );
});

floating_buttons_dim_when_inactive.addEventListener('change', () => {
  setConfig({
    floatingButtonsDimming: floating_buttons_dim_when_inactive.checked,
  });

  sendTelemetry(
    'preferences_preference_change',
    {
      preference_name: 'floating_buttons_dimming',
      preference_old_value: getBooleanValue(
        effectiveConfig.floatingButtonsDimming,
      ),
      preference_new_value: getBooleanValue(
        floating_buttons_dim_when_inactive.checked,
      ),
    },
    { realm: 'preferences' },
  );
});

floating_buttons_visual_indicators_enabled.addEventListener('change', () => {
  setConfig({
    floatingButtonsVisualIndicatorsEnabled:
      floating_buttons_visual_indicators_enabled.checked,
  });

  sendTelemetry(
    'preferences_preference_change',
    {
      preference_name: 'floating_buttons_visual_indicators_enabled',
      preference_old_value: getBooleanValue(
        effectiveConfig.floatingButtonsVisualIndicatorsEnabled,
      ),
      preference_new_value: getBooleanValue(
        floating_buttons_visual_indicators_enabled.checked,
      ),
    },
    { realm: 'preferences' },
  );
});

allow_telemetry.addEventListener('change', () => {
  setConfig({
    allowTelemetry: allow_telemetry.checked,
  });

  // Schedule `false` -> `true` changes to run slightly later,
  // yet `true` -> `false` changes to run immediately so as to
  // avoid this event being blocked by itself.
  const scheduler = allow_telemetry.checked
    ? (fn: Function) => void setTimeout(fn, 20)
    : (fn: Function) => fn();

  const oldValue = getBooleanValue(effectiveConfig.allowTelemetry);

  scheduler(() => {
    sendTelemetry(
      'preferences_preference_change',
      {
        preference_name: 'allow_telemetry',
        preference_old_value: oldValue,
        preference_new_value: getBooleanValue(allow_telemetry.checked),
      },
      { realm: 'preferences' },
    );
  });
});

restore_defaults.addEventListener('click', async () => {
  const restore = window.confirm(
    'Are you sure you want to restore default preferences?',
  );

  if (restore) {
    await setConfig({ ...defaultConfig });
    predefined_speeds_editor.release();

    sendTelemetry('preferences_restore_defaults', {}, { realm: 'preferences' });
  }
});

window.addEventListener('input', (event) => {
  const { target } = event;
  if (!(target instanceof HTMLInputElement)) return;

  target.setCustomValidity('');
  target.reportValidity();
});

window.addEventListener(
  'change',
  (event) => {
    const { target } = event;
    if (!(target instanceof HTMLInputElement)) return;

    requestAnimationFrame(() => {
      if (!target.checkValidity()) {
        target.reportValidity();
      }
    });
  },
  { capture: true },
);

window.addEventListener(
  'blur',
  (event) => {
    const { target } = event;
    if (!(target instanceof HTMLInputElement)) return;

    // If the browser has not shifted focus back to the element
    // to correct the mistakes (after `reportValidity()`), revert
    // the value back to the last known valid value.
    setTimeout(() => {
      if (
        document.activeElement === target ||
        typeof target[LAST_VALID_VALUE] !== 'string'
      )
        return;

      target.value = target[LAST_VALID_VALUE];
    }, 20);
  },
  { capture: true },
);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    predefined_speeds_editor.release();
  }
});

requestAnimationFrame(() => {
  sendTelemetry('preferences_open', {}, { realm: 'preferences', start: true });
});
