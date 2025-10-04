import { filter, fromEvent, map, merge, Subject, takeUntil } from 'rxjs';
import {
  SPEED_CHANGER_CUSTOM_RATE,
  SPEED_CHANGER_ORIGINAL_RATE,
  SPEED_CHANGER_TEMPORARY_RATE,
  SPEED_CHANGER_RESET_WHEN_EMPTIED,
} from '../constants';
import { getConfig, getConfigSnapshot } from '../config';
import { getHostForCurrentTab } from '../utils/hosts';
import { getEnabledStateForHost } from '../utils/states';
import {
  patchRateForElement,
  resetAllRatesForElement,
  resetCustomRatesForElement,
} from '../utils/speeds';
import { clamp } from 'ramda';

const onDisabled = new Subject<void>();

export const mediaElements = new Set<HTMLMediaElement>();
export const playingMediaElements = new Set<HTMLMediaElement>();

getConfig().subscribe(
  async ({
    enabled,
    enabledHostExceptions,
    hostSpecificSpeeds,
    globalSpeed,
    minSpeed,
    maxSpeed,
  }) => {
    const host = await getHostForCurrentTab();
    const { enabled: enabledForHost } = await getEnabledStateForHost(host);

    if (enabled.changed || enabledHostExceptions.changed) {
      if (enabledForHost) {
        // Using the `timeupdate` event to register media elements
        // because it seems to be the most reliable in terms of
        // tracking playing content. Potential better alternatives
        // that unfortunately do not work are:
        //
        // 1. the `play` event: does not fire when playback is user-
        //    initiated (vs. a result of a programmatic `.play()`)
        // 2. the `playing` event: unreliable in that a media element
        //    may already be playing before being injected into the
        //    document, thus bypassing the event capture
        fromEvent(window, 'timeupdate', {
          capture: true,
          passive: true,
        })
          .pipe(
            takeUntil(onDisabled),
            filter(({ target }) => target instanceof HTMLMediaElement),
            map(({ target }) => target as HTMLMediaElement),
          )
          .subscribe((element) => {
            if (mediaElements.has(element)) return;

            // Skip media elements that authors have explicitly marked as presentational
            if (element.role === 'presentation') return;

            // Save the original rate so that we can switch back to it when extension is disabled
            element[SPEED_CHANGER_ORIGINAL_RATE] = element.playbackRate;

            patchRateForElement(element);
            mediaElements.add(element);
            playingMediaElements.add(element);
          });

        // Further updates to the source of a media element resets its playback rate to
        // `defaultPlaybackRate`, which we should prevent from happening.
        fromEvent(window, 'loadstart', {
          capture: true,
          passive: true,
        })
          .pipe(
            takeUntil(onDisabled),
            filter(({ target }) => target instanceof HTMLMediaElement),
            map(({ target }) => target as HTMLMediaElement),
          )
          .subscribe((element) => {
            patchRateForElement(element);
          });

        // Reset the custom rates for media elements that have the
        // `SPEED_CHANGER_RESET_WHEN_EMPTIED` set.
        fromEvent(window, 'emptied', {
          capture: true,
          passive: true,
        })
          .pipe(
            takeUntil(onDisabled),
            filter(({ target }) => target instanceof HTMLMediaElement),
            map(({ target }) => target as HTMLMediaElement),
          )
          .subscribe((element) => {
            if (SPEED_CHANGER_RESET_WHEN_EMPTIED in element) {
              resetCustomRatesForElement(element);
            }
          });

        // Clamp rate changes to the minimum & maxiumum speed configurations.
        fromEvent(window, 'ratechange', {
          capture: true,
          passive: true,
        })
          .pipe(
            takeUntil(onDisabled),
            filter(({ target }) => target instanceof HTMLMediaElement),
            map(({ target }) => target as HTMLMediaElement),
          )
          .subscribe(async (element) => {
            const { minSpeed, maxSpeed } = await getConfigSnapshot();
            const clampedSpeed = clamp(
              minSpeed,
              maxSpeed,
              element.playbackRate,
            );

            if (element.playbackRate !== clampedSpeed) {
              element.playbackRate = clampedSpeed;
            }
          });

        merge(
          fromEvent(window, 'play', {
            capture: true,
            passive: true,
          }),
          fromEvent(window, 'pause', {
            capture: true,
            passive: true,
          }),
        )
          .pipe(
            takeUntil(onDisabled),
            filter(({ target }) => target instanceof HTMLMediaElement),
          )
          .subscribe((event) => {
            const element = event.target as HTMLMediaElement;

            if (event.type === 'play') {
              playingMediaElements.add(element);
            } else {
              playingMediaElements.delete(element);
            }
          });
      } else {
        // Re-set media elements to their original playback rates.
        for (const element of mediaElements) {
          resetAllRatesForElement(element);
        }
        mediaElements.clear();

        onDisabled.next();
      }
    }

    if (
      enabledForHost &&
      ((minSpeed.changed && !minSpeed.firstChange) ||
        (maxSpeed.changed && !maxSpeed.firstChange))
    ) {
      for (const element of mediaElements) {
        if (typeof element[SPEED_CHANGER_TEMPORARY_RATE] === 'number') {
          element[SPEED_CHANGER_TEMPORARY_RATE] = clamp(
            minSpeed.value,
            maxSpeed.value,
            element[SPEED_CHANGER_TEMPORARY_RATE],
          );
        }
        if (typeof element[SPEED_CHANGER_CUSTOM_RATE] === 'number') {
          element[SPEED_CHANGER_CUSTOM_RATE] = clamp(
            minSpeed.value,
            maxSpeed.value,
            element[SPEED_CHANGER_CUSTOM_RATE],
          );
        }
        patchRateForElement(element);
      }
    }

    if (enabledForHost && globalSpeed.changed && !globalSpeed.firstChange) {
      for (const element of mediaElements) {
        delete element[SPEED_CHANGER_CUSTOM_RATE];
        patchRateForElement(element);
      }
    }

    if (
      enabledForHost &&
      hostSpecificSpeeds.changed &&
      !hostSpecificSpeeds.firstChange
    ) {
      if (host in hostSpecificSpeeds.value) {
        for (const element of mediaElements) {
          delete element[SPEED_CHANGER_CUSTOM_RATE];
          patchRateForElement(element);
        }
      }
    }
  },
);
