import { defaultConfig, getConfig, setConfig } from '../config';
import { sendTelemetry } from '../telemetry/api';
import browser from '../browser';

import './custom-elements/floating-button-demo';

declare const animation_area: HTMLElement;
declare const preferences_link: HTMLAnchorElement;
declare const take_a_look_link: HTMLAnchorElement;
declare const allow_telemetry: HTMLInputElement;
declare const privacy_policy_link: HTMLAnchorElement;

animation_area.dir =
  import.meta.env.SC_BROWSER_TOOLBAR_DIRECTIONALITY === 'right' ? 'ltr' : 'rtl';

privacy_policy_link.href = import.meta.env.SC_PRIVACY_POLICY_LINK;

window.addEventListener(
  'change',
  async (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;

    if (event.target.name !== 'floating_buttons_enabled_for') return;

    const { value } = event.target;

    switch (value) {
      case 'selected-websites':
        await setConfig({
          floatingButtonsEnabled: false,
          floatingButtonsEnabledHostExceptions:
            defaultConfig.floatingButtonsEnabledHostExceptions,
        });
        sendTelemetry('welcome_fb_choice_selected', {}, { realm: 'welcome' });
        break;
      case 'all-websites':
        await setConfig({
          floatingButtonsEnabled: true,
          floatingButtonsEnabledHostExceptions: [],
        });
        sendTelemetry('welcome_fb_choice_all', {}, { realm: 'welcome' });
        break;
      case 'none':
        await setConfig({
          floatingButtonsEnabled: false,
          floatingButtonsEnabledHostExceptions: [],
        });
        sendTelemetry('welcome_fb_choice_disable', {}, { realm: 'welcome' });
        break;
    }
  },
  { capture: true },
);

preferences_link.href = browser.runtime.getURL('src/options/options.html');

preferences_link.addEventListener('click', () => {
  sendTelemetry('welcome_preferences_link_click', {}, { realm: 'welcome' });
});

take_a_look_link.addEventListener('click', () => {
  sendTelemetry('welcome_take_a_look_click', {}, { realm: 'welcome' });
});

allow_telemetry.addEventListener('change', () => {
  setConfig({
    allowTelemetry: allow_telemetry.checked,
  });

  const scheduler = allow_telemetry.checked
    ? (fn: Function) => void setTimeout(fn, 20)
    : (fn: Function) => fn();

  scheduler(() => {
    sendTelemetry(
      allow_telemetry.checked
        ? 'welcome_telemetry_opt_in'
        : 'welcome_telemetry_opt_out',
      {},
      { realm: 'welcome' },
    );
  });
});

getConfig().subscribe(({ allowTelemetry }) => {
  if (allowTelemetry.changed) {
    const link = new URL(import.meta.env.SC_WELCOME_PAGE_LINK);
    if (allowTelemetry.value) {
      link.searchParams.set(
        'utm_source',
        `sc_extension_${import.meta.env.MODE}`,
      );
      link.searchParams.set('utm_medium', 'extension');
      link.searchParams.set('utm_content', 'welcome_page_link');
    }
    take_a_look_link.href = link.toString();
  }
});

requestAnimationFrame(() => {
  sendTelemetry('welcome_open', {}, { realm: 'welcome', start: true });
});
