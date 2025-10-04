import { getEnabledStateForHost } from '../utils/states';
import { getHostForActiveTab } from '../utils/hosts';
import { getConfig } from '../config';
import ui from './ui-bridge';

const host = await getHostForActiveTab();

getConfig().subscribe(async ({ enabled, enabledHostExceptions }) => {
  if (enabled.changed || enabledHostExceptions.changed) {
    const { enabled } = host
      ? await getEnabledStateForHost(host)
      : { enabled: false };

    ui.indicator.disabled = !enabled;
    ui.range.disabled = !enabled;
    ui.supportLink.tabIndex = !enabled ? -1 : 0;

    ui.predefinedSpeeds
      .querySelectorAll<HTMLButtonElement>('button[data-speed]')
      .forEach((button) => {
        if (button.classList.contains('ouside-allowed-range')) {
          button.disabled = true;
          return;
        }

        button.disabled = !enabled;
      });

    ui.floatingButtonsSwitcher.disabled = !enabled;
    ui.preferences.disabled = !enabled;
  }
});
