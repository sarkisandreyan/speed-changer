import type {
  FloatingButtonAnchorChange,
  FloatingButtonInteractionMedium,
  MeasurementPayload,
} from '../types';
import { filter, fromEvent, map, merge, Subject, takeUntil } from 'rxjs';
import {
  SPEED_CHANGER_CUSTOM_RATE,
  SPEED_CHANGER_FLOATING_BUTTON_REF,
  SPEED_CHANGER_FLOATING_BUTTON_DISMISSED,
  SPEED_CHANGER_FLOATING_BUTTON_SURVIVES_ENDED,
  SPEED_CHANGER_TEMPORARY_RATE,
  SPEED_CHANGER_RESET_WHEN_EMPTIED,
} from '../constants';
import SpeedChangerFloatingButton from './custom-elements/speed-changer-floating-button';
import SpeedChangerFloatingView from './custom-elements/speed-changer-floating-view';
import AnchorsResizeObserver from './anchors-resize-observer';
import { getEffectivePosition, isNode, isRTL } from '../utils/dom';
import { getHostForCurrentTab } from '../utils/hosts';
import {
  getEnabledStateForHost,
  getFloatingButtonsEnabledStateForHost,
} from '../utils/states';
import {
  patchRateForElement,
  resetCustomRatesForElement,
  setSpeedForHost,
} from '../utils/speeds';
import { clamp } from 'ramda';
import { getConfig, getConfigSnapshot } from '../config';
import { preparePayload } from '../telemetry/payload';
import { sendTelemetry } from '../telemetry/api';
import { altKey } from '../key-trackers';
import browser from '../browser';

import interVariable from '../assets/fonts/Inter-Variable.woff2?url&no-inline';
import scIcons from '../assets/fonts/SC-Icons.woff2?url&no-inline';

// Keep track of media elements whose floating buttons have
// been dismissed so as to reset their do-not-reattach flags
// when the floating buttons or the extension is disabled for
// for the current host.
let dismissedMediaElements = new Set<HTMLMediaElement>();
let fontsLoaderStyle: HTMLStyleElement | null = null;

let onDisabled = new Subject<void>();

getConfig().subscribe(
  async ({
    enabled,
    enabledHostExceptions,
    minSpeed,
    maxSpeed,
    globalSpeed,
    hostSpecificSpeeds,
    predefinedSpeeds,
    floatingButtonsEnabled,
    floatingButtonsEnabledHostExceptions,
    floatingButtonsDimming,
    floatingButtonsPreferredPosition,
    floatingButtonsMirrorForRTL,
    floatingButtonsVisualIndicatorsEnabled,
    floatingButtonsLongPressSpeed,
    floatingButtonsForcePressSpeed,
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
        // Load typography & iconography
        fontsLoaderStyle = document.createElement('style');
        fontsLoaderStyle.textContent = `
          @font-face {
            font-family: 'Speed Changer Inter';
            src: url("${browser.runtime.getURL(interVariable)}")
          }
          @font-face {
            font-family: 'Speed Changer Icons';
            src: url("${browser.runtime.getURL(scIcons)}")
          }
        `;
        document.head.appendChild(fontsLoaderStyle);

        // Setup the floating view
        SpeedChangerFloatingView.instance = document.createElement(
          'speed-changer-floating-view',
        ) as SpeedChangerFloatingView;
        // For some reason, the prototype gets lost in Gecko, leading to errors as if
        // the custom component methods are not defined. Hence, this 'prototype rescue'.
        // See this excellent post for more information:
        // https://jakearchibald.com/2025/firefox-custom-elements-iframes-bug/
        Object.setPrototypeOf(
          SpeedChangerFloatingView.instance,
          SpeedChangerFloatingView.prototype,
        );
        SpeedChangerFloatingView.instance.setSpeedLimits(
          minSpeed.value,
          maxSpeed.value,
        );
        SpeedChangerFloatingView.instance.setPredefinedSpeeds(
          predefinedSpeeds.value,
        );

        merge(
          fromEvent(
            SpeedChangerFloatingView.instance,
            'speed-changer:range-show',
          ),
          fromEvent(
            SpeedChangerFloatingView.instance,
            'speed-changer:range-hide',
          ),
        )
          .pipe(takeUntil(onDisabled))
          .subscribe((event) => {
            if (event.type === 'speed-changer:range-show') {
              sendTelemetry(
                'floating_view_range_show_click',
                {},
                { realm: 'content' },
              );
            } else {
              sendTelemetry(
                'floating_view_range_hide_click',
                {},
                { realm: 'content' },
              );
            }
          });

        document.body.appendChild(SpeedChangerFloatingView.instance);

        // Setup the resize observer for anchors
        AnchorsResizeObserver.instance = new AnchorsResizeObserver();

        fromEvent(window, 'timeupdate', {
          passive: true,
          capture: true,
        })
          .pipe(
            filter(({ target }) => target instanceof HTMLMediaElement),
            map(({ target }) => target as HTMLMediaElement),
            takeUntil(onDisabled),
          )
          .subscribe(async (element) => {
            // Skip media elements that already have a floating button attached
            if (SPEED_CHANGER_FLOATING_BUTTON_REF in element) return;

            // Skip media elements that have the floating button dismissal flag set
            if (SPEED_CHANGER_FLOATING_BUTTON_DISMISSED in element) return;

            // Skip media elements that authors have explicitly marked as presentational
            if (element.role === 'presentation') return;

            const {
              floatingButtonsDimming,
              floatingButtonsPreferredPosition,
              floatingButtonsMirrorForRTL,
              floatingButtonsVisualIndicatorsEnabled,
              floatingButtonsLongPressSpeed,
              floatingButtonsForcePressSpeed,
            } = await getConfigSnapshot();

            const button = document.createElement(
              'speed-changer-floating-button',
            ) as SpeedChangerFloatingButton;
            // For some reason, the prototype gets lost in Gecko, leading to errors as if
            // the custom component methods are not defined. Hence, this 'prototype rescue'.
            // See this excellent post for more information:
            // https://jakearchibald.com/2025/firefox-custom-elements-iframes-bug/
            Object.setPrototypeOf(button, SpeedChangerFloatingButton.prototype);
            button.setMediaElement(element);
            button.setDirectionality(!isRTL(element) ? 'ltr' : 'rtl');
            button.setDimming(floatingButtonsDimming);
            button.setPreferredPosition(
              getEffectivePosition(
                element,
                floatingButtonsPreferredPosition,
                floatingButtonsMirrorForRTL,
              ),
            );
            button.setVisualMode(floatingButtonsVisualIndicatorsEnabled);
            button.setLongPressSpeed(floatingButtonsLongPressSpeed);
            button.setForcePressSpeed(floatingButtonsForcePressSpeed);

            requestAnimationFrame(() => {
              button.style.opacity = '1';
              button.reposition();
            });

            document.body.appendChild(button);
          });

        // Notify the floating view about rate changes as necessary.
        fromEvent(window, 'ratechange', {
          passive: true,
          capture: true,
        })
          .pipe(
            filter(({ target }) => target instanceof HTMLMediaElement),
            map(({ target }) => target as HTMLMediaElement),
            takeUntil(onDisabled),
          )
          .subscribe(async (element) => {
            const { minSpeed, maxSpeed } = await getConfigSnapshot();
            const clampedSpeed = clamp(
              minSpeed,
              maxSpeed,
              element.playbackRate,
            );

            if (
              SpeedChangerFloatingView.instance!.anchor ===
              element[SPEED_CHANGER_FLOATING_BUTTON_REF]
            ) {
              SpeedChangerFloatingView.instance!.setSpeed(clampedSpeed);
            }
          });

        // Destroy the floating button if there is a `SPEED_CHANGER_RESET_WHEN_EMPTIED`
        // present on the media element so that a new floating button is initialized.
        fromEvent(window, 'emptied', {
          passive: true,
          capture: true,
        })
          .pipe(
            filter(({ target }) => target instanceof HTMLMediaElement),
            map(({ target }) => target as HTMLMediaElement),
            takeUntil(onDisabled),
          )
          .subscribe((element) => {
            if (SPEED_CHANGER_RESET_WHEN_EMPTIED in element) {
              element[SPEED_CHANGER_FLOATING_BUTTON_REF]?.close();
            }
          });

        // Delete the floating button dismissal flag when a new source has been loaded.
        fromEvent(window, 'loadeddata', {
          passive: true,
          capture: true,
        })
          .pipe(
            filter(({ target }) => target instanceof HTMLMediaElement),
            map(({ target }) => target as HTMLMediaElement),
            takeUntil(onDisabled),
          )
          .subscribe((element) => {
            delete element[SPEED_CHANGER_FLOATING_BUTTON_DISMISSED];
          });

        // When a media element is ended, close the floating button attached to it. This
        // behavior may be overridden by adding the `SPEED_CHANGER_FLOATING_BUTTON_SURVIVES_ENDED`
        // flag to the media element.
        fromEvent(window, 'ended', {
          passive: true,
          capture: true,
        })
          .pipe(
            filter(({ target }) => target instanceof HTMLMediaElement),
            map(({ target }) => target as HTMLMediaElement),
            takeUntil(onDisabled),
          )
          .subscribe((element) => {
            if (SPEED_CHANGER_FLOATING_BUTTON_SURVIVES_ENDED in element) return;

            element[SPEED_CHANGER_FLOATING_BUTTON_REF]?.close();
          });

        // Hide floating buttons for non-visible media elements when they are paused.
        fromEvent(window, 'pause', {
          passive: true,
          capture: true,
        })
          .pipe(
            filter(({ target }) => target instanceof HTMLMediaElement),
            map(({ target }) => target as HTMLMediaElement),
            takeUntil(onDisabled),
          )
          .subscribe((element) => {
            if (!element.checkVisibility()) {
              element[SPEED_CHANGER_FLOATING_BUTTON_REF]?.close();
            }
          });

        fromEvent(window, 'speed-changer:initialize')
          .pipe(
            filter(
              ({ target }) => target instanceof SpeedChangerFloatingButton,
            ),
            map(({ target }) => target as SpeedChangerFloatingButton),
            takeUntil(onDisabled),
          )
          .subscribe((button) => {
            AnchorsResizeObserver.instance!.observe(button.anchor);
            SpeedChangerFloatingButton.instances.add(button);
          });

        fromEvent<CustomEvent<FloatingButtonAnchorChange>>(
          window,
          'speed-changer:anchor-override',
          { capture: true },
        )
          .pipe(
            filter(
              ({ target }) => target instanceof SpeedChangerFloatingButton,
            ),
            takeUntil(onDisabled),
          )
          .subscribe((event) => {
            const { previousAnchor, newAnchor } = event.detail;
            AnchorsResizeObserver.instance!.unobserve(previousAnchor);
            AnchorsResizeObserver.instance!.observe(newAnchor);
          });

        merge(
          fromEvent<CustomEvent>(window, 'speed-changer:long-press-willbegin'),
          fromEvent<CustomEvent>(window, 'speed-changer:long-press-begin'),
          fromEvent<CustomEvent>(window, 'speed-changer:long-press-end'),
        )
          .pipe(
            filter(
              ({ target }) => target instanceof SpeedChangerFloatingButton,
            ),
            takeUntil(onDisabled),
          )
          .subscribe(async (event) => {
            const button = event.target as SpeedChangerFloatingButton;
            const medium = event.detail as FloatingButtonInteractionMedium;
            if (event.type === 'speed-changer:long-press-willbegin') {
              button.mediaElement[SPEED_CHANGER_TEMPORARY_RATE] =
                button.longPressSpeed;
              patchRateForElement(button.mediaElement);
            } else if (event.type === 'speed-changer:long-press-end') {
              delete button.mediaElement[SPEED_CHANGER_TEMPORARY_RATE];
              patchRateForElement(button.mediaElement);
            }

            if (event.type === 'speed-changer:long-press-begin') {
              const payload = await preparePayload(
                'floating_button_long_press_begin',
                { fb_interaction_medium: medium },
                { realm: 'content' },
              );
              payload.events[0].params.timestamp_micros = String(
                Number.parseInt(payload.events[0].params.timestamp_micros) -
                  200000,
              );
              sendTelemetry(payload);
            } else if (event.type === 'speed-changer:long-press-end') {
              sendTelemetry(
                'floating_button_long_press_end',
                { fb_interaction_medium: medium },
                { realm: 'content' },
              );
            }
          });

        merge(
          fromEvent<CustomEvent>(window, 'speed-changer:lock-speed-begin'),
          fromEvent<CustomEvent>(window, 'speed-changer:lock-speed-end'),
        )
          .pipe(
            filter(
              ({ target }) => target instanceof SpeedChangerFloatingButton,
            ),
            takeUntil(onDisabled),
          )
          .subscribe((event) => {
            const medium = event.detail as FloatingButtonInteractionMedium;
            if (event.type === 'speed-changer:lock-speed-begin') {
              sendTelemetry(
                'floating_button_lock_speed_begin',
                { fb_interaction_medium: medium },
                { realm: 'content' },
              );
            } else {
              sendTelemetry(
                'floating_button_lock_speed_end',
                { fb_interaction_medium: medium },
                { realm: 'content' },
              );
            }
          });

        merge(
          fromEvent<CustomEvent>(window, 'speed-changer:force-press-begin'),
          fromEvent<CustomEvent>(window, 'speed-changer:force-press-end'),
        )
          .pipe(
            filter(
              ({ target }) => target instanceof SpeedChangerFloatingButton,
            ),
            takeUntil(onDisabled),
          )
          .subscribe((event) => {
            const button = event.target as SpeedChangerFloatingButton;
            const medium = event.detail as FloatingButtonInteractionMedium;
            button.mediaElement[SPEED_CHANGER_TEMPORARY_RATE] =
              event.type === 'speed-changer:force-press-begin'
                ? button.forcePressSpeed
                : button.longPressSpeed;
            patchRateForElement(button.mediaElement);

            if (event.type === 'speed-changer:force-press-begin') {
              sendTelemetry(
                'floating_button_force_press_begin',
                { fb_interaction_medium: medium },
                { realm: 'content' },
              );
            } else {
              sendTelemetry(
                'floating_button_force_press_end',
                { fb_interaction_medium: medium },
                { realm: 'content' },
              );
            }
          });

        merge(
          fromEvent<CustomEvent>(window, 'speed-changer:movement-begin'),
          fromEvent<CustomEvent>(window, 'speed-changer:movement-end'),
        )
          .pipe(
            filter(
              ({ target }) => target instanceof SpeedChangerFloatingButton,
            ),
            takeUntil(onDisabled),
          )
          .subscribe((event) => {
            if (event.type === 'speed-changer:movement-begin') {
              sendTelemetry(
                'floating_button_movement_begin',
                {},
                { realm: 'content' },
              );
            } else {
              sendTelemetry(
                'floating_button_movement_end',
                {},
                { realm: 'content' },
              );
            }
          });

        fromEvent(window, 'speed-changer:dismiss')
          .pipe(
            filter(
              ({ target }) => target instanceof SpeedChangerFloatingButton,
            ),
            map(({ target }) => target as SpeedChangerFloatingButton),
            takeUntil(onDisabled),
          )
          .subscribe(async (button) => {
            button.mediaElement[SPEED_CHANGER_FLOATING_BUTTON_DISMISSED] = true;
            dismissedMediaElements.add(button.mediaElement);
            resetCustomRatesForElement(button.mediaElement);

            if (SpeedChangerFloatingView.instance!.anchor === button) {
              SpeedChangerFloatingView.instance!.close();
            }

            sendTelemetry('floating_button_dismiss', {}, { realm: 'content' });
          });

        fromEvent<CustomEvent<number>>(
          window,
          'speed-changer:attachment-request',
        )
          .pipe(
            filter(
              ({ target }) => target instanceof SpeedChangerFloatingButton,
            ),
            map(({ target, detail }) => [target, detail] as const),
            takeUntil(onDisabled),
          )
          .subscribe(([button, speed]) => {
            SpeedChangerFloatingView.instance!.setSpeed(speed);
            SpeedChangerFloatingView.instance!.setAnchor(
              button as SpeedChangerFloatingButton,
            );
          });

        fromEvent(window, 'speed-changer:detachment-request')
          .pipe(takeUntil(onDisabled))
          .subscribe(() => {
            SpeedChangerFloatingView.instance!.setAnchor(null);
          });

        merge(
          fromEvent(window, 'speed-changer:engagement-begin'),
          fromEvent(window, 'speed-changer:engagement-end'),
        )
          .pipe(takeUntil(onDisabled))
          .subscribe((event) => {
            if (event.type === 'speed-changer:engagement-begin') {
              sendTelemetry(
                'floating_button_engagement_begin',
                {},
                { realm: 'content', start: true },
              );
            } else {
              sendTelemetry(
                'floating_button_engagement_end',
                {},
                { realm: 'content' },
              );
              if (pendingRangeEvent) {
                sendTelemetry(pendingRangeEvent);
                pendingRangeEvent = null;
              }
            }
          });

        fromEvent(window, 'speed-changer:destroy')
          .pipe(
            filter(
              ({ target }) => target instanceof SpeedChangerFloatingButton,
            ),
            map(({ target }) => target as SpeedChangerFloatingButton),
            takeUntil(onDisabled),
          )
          .subscribe((button) => {
            AnchorsResizeObserver.instance?.unobserve(button.anchor);
            SpeedChangerFloatingButton.instances.delete(button);

            if (SpeedChangerFloatingView.instance!.anchor === button) {
              SpeedChangerFloatingView.instance!.setAnchor(null);
            }
          });

        AnchorsResizeObserver.instance.changes.subscribe((element) => {
          for (const button of SpeedChangerFloatingButton.instances) {
            if (button.anchor !== element) continue;
            button.reposition();
          }
        });

        fromEvent(window, 'scroll', {
          passive: true,
          capture: true,
        })
          .pipe(
            filter(({ target }) => !!target && isNode(target)),
            map(({ target }) => target as Node),
            takeUntil(onDisabled),
          )
          .subscribe((element) => {
            for (const button of SpeedChangerFloatingButton.instances) {
              if (!element.contains(button.mediaElement)) continue;
              button.reposition();
            }

            // Dismiss floating view on scroll
            SpeedChangerFloatingView.instance!.setAnchor(null);
          });

        fromEvent(window, 'resize', {
          passive: true,
          capture: true,
        })
          .pipe(takeUntil(onDisabled))
          .subscribe(() => {
            for (const button of SpeedChangerFloatingButton.instances) {
              button.reposition();
            }
          });

        let pendingRangeEvent: MeasurementPayload<
          | 'floating_view_range_click'
          | 'floating_view_range_alt_click'
          | 'floating_view_range_wheel'
          | 'floating_view_range_alt_wheel'
        > | null = null;
        fromEvent<
          CustomEvent<{
            medium: 'predefined' | 'range';
            interaction?: 'pointer' | 'wheel';
            speed: number;
          }>
        >(window, 'speed-changer:change-speed')
          .pipe(
            filter(({ target }) => target instanceof SpeedChangerFloatingView),
            map(({ detail }) => detail),
            takeUntil(onDisabled),
          )
          .subscribe(async ({ medium, interaction, speed }) => {
            const { floatingButtonsTarget } = await getConfigSnapshot();

            const currentMediaOnly =
              (floatingButtonsTarget === 'current' && !altKey.pressed) ||
              (floatingButtonsTarget === 'host' && altKey.pressed);

            if (currentMediaOnly) {
              if (SpeedChangerFloatingView.instance!.anchor) {
                SpeedChangerFloatingView.instance!.anchor.mediaElement[
                  SPEED_CHANGER_CUSTOM_RATE
                ] = speed;
                patchRateForElement(
                  SpeedChangerFloatingView.instance!.anchor.mediaElement,
                );
              }
            } else {
              setSpeedForHost(host, speed);
            }

            if (medium === 'predefined') {
              sendTelemetry(
                !altKey.pressed
                  ? 'floating_view_predefined_click'
                  : 'floating_view_predefined_alt_click',
                {
                  applied_speed: speed,
                  change_target: currentMediaOnly ? 'current' : 'host',
                },
                { realm: 'content' },
              );
            } else {
              pendingRangeEvent = await preparePayload(
                !altKey.pressed
                  ? interaction === 'pointer'
                    ? 'floating_view_range_click'
                    : 'floating_view_range_wheel'
                  : interaction === 'pointer'
                    ? 'floating_view_range_alt_click'
                    : 'floating_view_range_alt_wheel',
                { applied_speed: speed },
                { realm: 'content' },
              );
            }
          });
      } else {
        fontsLoaderStyle?.remove();

        SpeedChangerFloatingView.instance?.close();
        SpeedChangerFloatingView.instance = null;

        for (const button of SpeedChangerFloatingButton.instances) {
          // Reset custom rates here only when the extension is still
          // enabled for host. If the extension is disabled for host
          // altogether, the 'clean-up' of rates happens inside
          // `patch-media-elements.ts` and we should not interfere
          // here to avoid race conditions.
          if (enabledForHost) {
            resetCustomRatesForElement(button.mediaElement);
          }
          button.close();
        }
        SpeedChangerFloatingButton.instances.clear();

        for (const element of dismissedMediaElements) {
          delete element[SPEED_CHANGER_FLOATING_BUTTON_DISMISSED];
        }
        dismissedMediaElements.clear();

        AnchorsResizeObserver.instance?.disconnect();
        AnchorsResizeObserver.instance = null;

        onDisabled.next();
      }
    }

    if (
      flButtonsEnabled &&
      floatingButtonsDimming.changed &&
      !floatingButtonsDimming.firstChange
    ) {
      SpeedChangerFloatingButton.instances.forEach((button) => {
        button.setDimming(floatingButtonsDimming.value);
      });
    }

    if (
      flButtonsEnabled &&
      floatingButtonsLongPressSpeed.changed &&
      !floatingButtonsLongPressSpeed.firstChange
    ) {
      for (const button of SpeedChangerFloatingButton.instances) {
        button.setLongPressSpeed(floatingButtonsLongPressSpeed.value);
      }
    }

    if (
      flButtonsEnabled &&
      floatingButtonsForcePressSpeed.changed &&
      !floatingButtonsForcePressSpeed.firstChange
    ) {
      for (const button of SpeedChangerFloatingButton.instances) {
        button.setForcePressSpeed(floatingButtonsForcePressSpeed.value);
      }
    }

    if (
      flButtonsEnabled &&
      ((floatingButtonsPreferredPosition.changed &&
        !floatingButtonsPreferredPosition.firstChange) ||
        (floatingButtonsMirrorForRTL.changed &&
          !floatingButtonsMirrorForRTL.firstChange))
    ) {
      for (const button of SpeedChangerFloatingButton.instances) {
        button.setPreferredPosition(
          getEffectivePosition(
            button.mediaElement,
            floatingButtonsPreferredPosition.value,
            floatingButtonsMirrorForRTL.value,
          ),
        );
      }
    }

    if (
      flButtonsEnabled &&
      floatingButtonsVisualIndicatorsEnabled.changed &&
      !floatingButtonsVisualIndicatorsEnabled.firstChange
    ) {
      for (const button of SpeedChangerFloatingButton.instances) {
        button.setVisualMode(floatingButtonsVisualIndicatorsEnabled.value);
      }
    }

    if (flButtonsEnabled && (minSpeed.changed || maxSpeed.changed)) {
      SpeedChangerFloatingView.instance!.setSpeedLimits(
        minSpeed.value,
        maxSpeed.value,
      );
    }

    if (flButtonsEnabled && predefinedSpeeds.changed) {
      SpeedChangerFloatingView.instance!.setPredefinedSpeeds(
        predefinedSpeeds.value,
      );
    }

    if (flButtonsEnabled && globalSpeed.changed) {
      SpeedChangerFloatingView.instance!.setSpeed(globalSpeed.value);
      SpeedChangerFloatingView.instance!.showRangeIfNeeded();
    }

    if (flButtonsEnabled && hostSpecificSpeeds.changed) {
      if (host in hostSpecificSpeeds.value) {
        SpeedChangerFloatingView.instance!.setSpeed(
          hostSpecificSpeeds.value[host],
        );
        SpeedChangerFloatingView.instance!.showRangeIfNeeded();
      }
    }
  },
);
