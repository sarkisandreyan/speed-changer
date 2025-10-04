import type { HostEnabledState } from '../types';
import { fromEvent, merge, skipUntil, Subscription, timer } from 'rxjs';
import { getConfig, setConfig } from '../config';
import { trackDropdownValue } from '../helpers/dropdown-value-tracker';
import { sendTelemetry } from '../telemetry/api';
import { getHostForActiveTab } from '../utils/hosts';
import { getKeyName } from '../utils/shortcuts';
import { getEnabledStateForHost } from '../utils/states';
import { setHintContent } from './footer';
import { altKey } from '../key-trackers';
import ui from './ui-bridge';

const host = await getHostForActiveTab();

let enabledStateForHost: HostEnabledState;

async function updateHint() {
  if (!enabledStateForHost.exceptional) {
    setHintContent(
      `Press and hold ${await getKeyName('Alt')} to ${enabledStateForHost.enabled ? 'disable' : 'enable'} for this website only.`,
    );
  } else {
    setHintContent(null);
  }
}

// Attach listeners with a slight delay so that the initial focus
// on the toggle button in Safari does not trigger the hint.

merge(
  fromEvent<MouseEvent>(ui.toggleButton, 'mouseenter'),
  fromEvent<UIEvent>(ui.toggleButton, 'focusin'),
  fromEvent<MouseEvent>(ui.toggleButton, 'mouseleave'),
  fromEvent<UIEvent>(ui.toggleButton, 'focusout'),
)
  .pipe(
    // Ignore events triggered in the first 100ms so that the initial
    // focus on the toggle button in Safari does not trigger the hint.
    skipUntil(timer(100)),
  )
  .subscribe(async ({ type }) => {
    if (type === 'mouseenter' || type === 'focusin') {
      updateHint();
    } else {
      setHintContent(null);
    }
  });

fromEvent<MouseEvent>(ui.toggleButton, 'click').subscribe(async () => {
  if (!altKey.pressed) {
    const enabled = !enabledStateForHost.enabled;

    await setConfig({
      enabled,
      enabledHostExceptions: [],
    });

    if (enabled) {
      sendTelemetry('popup_enable_click', {}, { realm: 'popup' });
    } else {
      sendTelemetry('popup_disable_click', {}, { realm: 'popup' });
    }
  } else if (host) {
    const enabled = !enabledStateForHost.exceptional;

    await setConfig(({ enabledHostExceptions }) => ({
      enabledHostExceptions: enabled
        ? enabledHostExceptions.concat(host)
        : enabledHostExceptions.filter((_host) => _host !== host),
    }));

    if (enabled) {
      sendTelemetry('popup_enable_alt_click', {}, { realm: 'popup' });
    } else {
      sendTelemetry('popup_disable_alt_click', {}, { realm: 'popup' });
    }
  }
  updateHint();
});

let dropdownValueSubscription: Subscription | null;

fromEvent(ui.toggleButtonDropdownTrigger, 'click').subscribe(() => {
  if (dropdownValueSubscription) {
    dropdownValueSubscription.unsubscribe();
    dropdownValueSubscription = null;
    return;
  }

  const { top, height } =
    ui.toggleButtonDropdownTrigger.getBoundingClientRect();
  ui.toggleButtonDropdown.style.top = `${top + height - 2}px`;

  dropdownValueSubscription = trackDropdownValue<
    'all-websites' | 'current-host'
  >(ui.toggleButtonDropdown, [
    {
      label: !enabledStateForHost.enabled
        ? 'Enable for All Websites'
        : 'Disable for All Websites',
      value: 'all-websites',
    },
    {
      label: !enabledStateForHost.enabled
        ? `Enable for This Website`
        : `Disable for This Website`,
      value: 'current-host',
    },
  ]).subscribe({
    async next(option) {
      if (host && option.value === 'current-host') {
        const enabled = !enabledStateForHost.enabled;

        await setConfig(({ enabledHostExceptions }) => ({
          enabledHostExceptions: !enabledStateForHost.exceptional
            ? enabledHostExceptions.concat(host)
            : enabledHostExceptions.filter((_host) => _host !== host),
        }));

        if (enabled) {
          sendTelemetry(
            'popup_dropdown_enable_site_click',
            {},
            { realm: 'popup' },
          );
        } else {
          sendTelemetry(
            'popup_dropdown_disable_site_click',
            {},
            { realm: 'popup' },
          );
        }
      } else if (option.value === 'all-websites') {
        const enabled = !enabledStateForHost.enabled;

        await setConfig({
          enabled,
          enabledHostExceptions: [],
        });

        if (enabled) {
          sendTelemetry(
            'popup_dropdown_enable_all_click',
            {},
            { realm: 'popup' },
          );
        } else {
          sendTelemetry(
            'popup_dropdown_disable_all_click',
            {},
            { realm: 'popup' },
          );
        }
      }
    },
    complete() {
      dropdownValueSubscription = null;
    },
  });

  sendTelemetry('popup_dropdown_click', {}, { realm: 'popup' });
});

getConfig().subscribe(async ({ enabled, enabledHostExceptions }) => {
  if (!enabled.changed && !enabledHostExceptions.changed) return;

  enabledStateForHost = host
    ? await getEnabledStateForHost(host)
    : { enabled: false, exceptional: true };

  if (!host) {
    document.body.classList.add('unavailable');
  } else {
    document.body.classList.remove('unavailable');
  }

  if (enabledStateForHost.enabled) {
    document.body.classList.add('enabled');
    ui.toggleButtonTextState.textContent = 'Enabled';
  } else {
    document.body.classList.remove('enabled');
    ui.toggleButtonTextState.textContent = host ? 'Disabled' : 'Unavailable';
  }

  if (enabledStateForHost.exceptional) {
    document.body.classList.add('exceptional');
    ui.toggleButtonTextScope.removeAttribute('aria-hidden');
    ui.toggleButtonTextScope.style.opacity = '1';
  } else {
    document.body.classList.remove('exceptional');
    ui.toggleButtonTextScope.setAttribute('aria-hidden', 'true');
    ui.toggleButtonTextScope.style.opacity = '';
  }
});
