import type {
  FloatingViewHint,
  FloatingViewHints,
  LocalStorageData,
} from '../types';
import { filter, fromEvent, merge, Subject, takeUntil } from 'rxjs';
import SpeedChangerFloatingView from './custom-elements/speed-changer-floating-view';
import {
  defaultConfig,
  getConfig,
  getConfigSnapshot,
  setConfig,
} from '../config';
import { getHostForCurrentTab } from '../utils/hosts';
import {
  getEnabledStateForHost,
  getFloatingButtonsEnabledStateForHost,
} from '../utils/states';
import { getFormattedShortcut, getKeyName } from '../utils/shortcuts';
import { sendTelemetry } from '../telemetry/api';
import { sendMessage } from '../messaging/api';
import { altKey } from '../key-trackers';
import { equals } from 'ramda';
import browser from '../browser';

let onDisabled = new Subject<void>();

const floatingViewDefaultHints: FloatingViewHints = {
  disableFloatingButtons: 0,
  keyboardShortcuts: 40,
  altSitewideFloatingButtons: 80,
  floatingButtonsMovable: 140,
  reportAnIssue: 180,
};

getConfig().subscribe(
  async ({
    enabled,
    enabledHostExceptions,
    floatingButtonsEnabled,
    floatingButtonsEnabledHostExceptions,
  }) => {
    const host = await getHostForCurrentTab();

    const { enabled: enabledForHost } = await getEnabledStateForHost(host);
    const { enabled: floatingButtonsEnabledForHost } =
      await getFloatingButtonsEnabledStateForHost(host);
    const flButtonsEnabled = enabledForHost && floatingButtonsEnabledForHost;

    if (
      enabled.changed ||
      enabledHostExceptions.changed ||
      floatingButtonsEnabled.changed ||
      floatingButtonsEnabledHostExceptions.changed
    ) {
      if (flButtonsEnabled) {
        fromEvent(window, 'speed-changer:attach')
          .pipe(
            filter(({ target }) => target instanceof SpeedChangerFloatingView),
            takeUntil(onDisabled),
          )
          .subscribe(async () => {
            if (altKey.pressed) return;

            let { floatingViewTimesShown, floatingViewHints } =
              await browser.storage.local.get<LocalStorageData>([
                'floatingViewTimesShown',
                'floatingViewHints',
              ]);

            floatingViewTimesShown = (floatingViewTimesShown ?? 0) + 1;
            browser.storage.local.set<LocalStorageData>({
              floatingViewTimesShown,
            });

            if (
              floatingViewTimesShown > 5 &&
              floatingViewTimesShown % 100 < 5
            ) {
              SpeedChangerFloatingView.instance!.setHintContent(
                'Like this free tool? <u>Buy me a coffee</u> <big>☕️</big>',
                async () => {
                  const { allowTelemetry } = await getConfigSnapshot();
                  const link = new URL(import.meta.env.SC_SUPPORT_LINK);
                  if (allowTelemetry) {
                    link.searchParams.set(
                      'utm_source',
                      `sc_extension_${import.meta.env.MODE}`,
                    );
                    link.searchParams.set('utm_medium', 'extension');
                    link.searchParams.set('utm_content', 'floating_view_hint');
                  }
                  window.open(link.toString());

                  sendTelemetry(
                    'floating_view_hint_support_click',
                    {},
                    { realm: 'content' },
                  );
                },
              );

              return;
            }

            floatingViewHints = {
              ...floatingViewDefaultHints,
              ...floatingViewHints,
            };

            for (const _hint in floatingViewHints) {
              const hint = _hint as FloatingViewHint;
              if (floatingViewHints[hint] < -5) continue;
              floatingViewHints[hint]--;
            }

            browser.storage.local.set<LocalStorageData>({ floatingViewHints });

            if (
              floatingViewHints.disableFloatingButtons < 0 &&
              floatingViewHints.disableFloatingButtons >= -5
            ) {
              SpeedChangerFloatingView.instance!.setHintContent(
                'If you do not like these buttons, <u>press&nbsp;here</u> to turn them off',
                () => {
                  setConfig({
                    floatingButtonsEnabled: false,
                    floatingButtonsEnabledHostExceptions: [],
                  });

                  sendTelemetry(
                    'floating_view_hint_disable_fb_click',
                    {},
                    { realm: 'content' },
                  );
                },
              );
              return;
            }

            if (
              floatingViewHints.keyboardShortcuts < 0 &&
              floatingViewHints.keyboardShortcuts >= -5
            ) {
              const { keyboardShortcutsBindings } = await getConfigSnapshot();
              if (
                !equals(
                  keyboardShortcutsBindings,
                  defaultConfig['keyboardShortcutsBindings'],
                )
              )
                return;

              SpeedChangerFloatingView.instance!.setHintContent(
                `Use keyboard shortcuts — press ${await getFormattedShortcut('Alt+Digit2')} to play at 2x, ${await getFormattedShortcut(
                  'Alt+Digit3',
                )} to play at 3x etc.`,
              );

              return;
            }

            if (
              floatingViewHints.altSitewideFloatingButtons < 0 &&
              floatingViewHints.altSitewideFloatingButtons >= -5
            ) {
              const { floatingButtonsTarget } = await getConfigSnapshot();

              SpeedChangerFloatingView.instance!.setHintContent(
                `Press and hold ${await getKeyName('Alt')} to apply the speed to ` +
                  (floatingButtonsTarget === 'current'
                    ? 'all&nbsp;media on the website'
                    : 'the&nbsp;current video only'),
              );
              return;
            }

            if (
              floatingViewHints.floatingButtonsMovable < 0 &&
              floatingViewHints.floatingButtonsMovable >= -5
            ) {
              SpeedChangerFloatingView.instance!.setHintContent(
                `Press and hold ${await getKeyName('Command')} to move the floating button around the page`,
              );
            }

            if (
              floatingViewHints.reportAnIssue < 0 &&
              floatingViewHints.reportAnIssue >= -5
            ) {
              SpeedChangerFloatingView.instance!.setHintContent(
                `If you ever experience issues with the extension, you can just <u>report them</u> from Preferences.`,
                () => {
                  sendMessage({
                    action: 'open-options-page',
                    data: '#report_an_issue',
                  });
                },
              );
            }
          });

        merge(
          fromEvent(window, 'speed-changer:attach').pipe(
            filter(({ target }) => target instanceof SpeedChangerFloatingView),
          ),
          altKey.changes,
        )
          .pipe(takeUntil(onDisabled))
          .subscribe(async () => {
            if (altKey.pressed) {
              const { floatingButtonsTarget } = await getConfigSnapshot();
              SpeedChangerFloatingView.instance!.setHintContent(
                floatingButtonsTarget === 'current'
                  ? 'Changes will apply sitewide'
                  : 'Changes apply to current video only',
              );
            } else {
              SpeedChangerFloatingView.instance!.setHintContent(null);
            }
          });
      } else {
        onDisabled.next();
      }
    }
  },
);
