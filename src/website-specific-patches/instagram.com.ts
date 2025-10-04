import type { State } from '../types';
import {
  filter,
  fromEvent,
  map,
  merge,
  Observable,
  Subject,
  takeUntil,
} from 'rxjs';
import {
  SPEED_CHANGER_FLOATING_BUTTON_REF,
  SPEED_CHANGER_FLOATING_BUTTON_SURVIVES_ENDED,
} from '../constants';
import SpeedChangerFloatingButton from '../content/custom-elements/speed-changer-floating-button';
import { getEffectivePosition, isRTL } from '../utils/dom';

// Applied to floating buttons that are confirmed to be good to show.
const X_VISIBLE = 'speed-changer-floating-button-x-visible' as State;
// Appled to floating buttons that should temporarily be hidden
// because they're behind an active modal dialog.
const X_OUTSIDE_MODAL =
  'speed-changer-floating-button-x-outside-modal' as State;

const onReelVideoInactive = new Subject<void>();
const onDisabled = new Subject<void>();

function setupResizeObserver(element: HTMLElement) {
  return new Observable<void>((observer) => {
    const resizeObserver = new ResizeObserver(() => {
      observer.next();
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.disconnect();
    };
  });
}

let style: HTMLStyleElement;

export function setup() {
  merge(
    fromEvent(window, 'speed-changer:initialize', { capture: true }),
    fromEvent(window, 'speed-changer:preferred-position-change', {
      capture: true,
    }),
  )
    .pipe(
      filter(({ target }) => target instanceof SpeedChangerFloatingButton),
      map(({ target }) => target as SpeedChangerFloatingButton),
      takeUntil(onDisabled),
    )
    .subscribe((button) => {
      const isReelVideo =
        !!button.mediaElement.nextElementSibling?.querySelector(
          'a[href*="/reels"]',
        );
      const isStory = !!button.mediaElement
        .closest('div:not([class]):not([style])')
        ?.previousElementSibling?.querySelector('[role="link"]');
      const isArchivedStory = !!button.mediaElement
        .closest('section')
        ?.querySelector('& > :not(nav) header [role="link"]');
      const isExploreGridItem = !!button.mediaElement.closest(
        '[style*="--x-gridTemplateColumns"]',
      );
      const isInsideModal = !!button.mediaElement.closest(
        '[role="dialog"][aria-modal="true"]',
      );

      if (isExploreGridItem) {
        button.destroy();
        return;
      }

      if (isReelVideo) {
        const reelBottomPanel =
          button.mediaElement.nextElementSibling?.querySelector('[role=button]')
            ?.lastElementChild as HTMLElement | null;

        // Mark the previous video as 'inactive'.
        onReelVideoInactive.next();

        if (reelBottomPanel) {
          setupResizeObserver(reelBottomPanel)
            .pipe(takeUntil(onReelVideoInactive), takeUntil(onDisabled))
            .subscribe(() => {
              button.setBaseDetachment({
                x: !isRTL(button.mediaElement) ? 5 : -5,
                y: 5 - reelBottomPanel.offsetHeight,
              });
            });

          button.setPreferredPosition(
            getEffectivePosition(button.mediaElement, 'sw', true),
          );
          button.setBaseDetachment({
            x: !isRTL(button.mediaElement) ? 5 : -5,
            y: 5 - reelBottomPanel.offsetHeight,
          });
        }
        button.mediaElement[SPEED_CHANGER_FLOATING_BUTTON_SURVIVES_ENDED] =
          true;
        button.addState(X_VISIBLE);
        return;
      }

      if (isStory || isArchivedStory) {
        if (
          button.preferredPosition === 'ne' ||
          button.preferredPosition === 'nw'
        ) {
          button.setBaseDetachment({
            x: !isRTL(button.mediaElement) ? -5 : 5,
            y: 70,
          });
        }
      }

      if (
        button.preferredPosition !== 'e' &&
        button.preferredPosition !== 'w'
      ) {
        button.setPreferredPosition(
          getEffectivePosition(button.mediaElement, 'ne', true),
        );
      }

      if (isInsideModal) {
        for (const button of SpeedChangerFloatingButton.instances) {
          // If a new floating button is initialized inside a modal dialog,
          // mark all floating buttons for paused videos as 'outside-modal'.
          // The same process happens in a more reactive way in the 'pause'
          // listener below, for videos that were playing before the modal
          // dialog was opened.
          if (button.mediaElement.paused) {
            button.addState(X_OUTSIDE_MODAL);
          }
        }
      }

      button.mediaElement[SPEED_CHANGER_FLOATING_BUTTON_SURVIVES_ENDED] = true;
      button.addState(X_VISIBLE);
    });

  fromEvent(window, 'play', { capture: true })
    .pipe(
      filter(({ target }) => target instanceof HTMLMediaElement),
      map(({ target }) => target as HTMLMediaElement),
      takeUntil(onDisabled),
    )
    .subscribe((element) => {
      const hasModalOpen = !!document.querySelector(
        '[role="dialog"][aria-modal="true"]',
      );

      if (!hasModalOpen) {
        // Remove the 'outside-modal' flag when videos
        // re-play after closing any active modals.
        element[SPEED_CHANGER_FLOATING_BUTTON_REF]?.removeState(
          X_OUTSIDE_MODAL,
        );
      }
    });

  fromEvent(window, 'pause', { capture: true })
    .pipe(
      filter(({ target }) => target instanceof HTMLMediaElement),
      map(({ target }) => target as HTMLMediaElement),
      takeUntil(onDisabled),
    )
    .subscribe((element) => {
      const hasModalOpen = !!document.querySelector(
        '[role="dialog"][aria-modal="true"]',
      );
      const isGalleryItem =
        ((
          element.closest<HTMLElement>('.html-div')
            ?.previousElementSibling as HTMLElement | null
        )?.style?.cssText?.indexOf('aspect-ratio') ?? -Infinity) > -1;

      if (hasModalOpen) {
        requestAnimationFrame(() => {
          // If the video is still paused in the next frame,
          // (i.e. is not being looped), then mark all other
          // floating buttons as 'outside-modal'.
          if (element.paused) {
            for (const button of SpeedChangerFloatingButton.instances) {
              button.addState(X_OUTSIDE_MODAL);
            }
          }
        });
      }

      if (isGalleryItem) {
        requestAnimationFrame(() => {
          // If a gallery video is still paused in the next frame
          // (i.e. is not being looped), destroy it immediately.
          if (element.paused) {
            element[SPEED_CHANGER_FLOATING_BUTTON_REF]?.destroy();
          }
        });
      }
    });

  fromEvent(window, 'speed-changer:destroy', { capture: true })
    .pipe(
      filter(({ target }) => target instanceof SpeedChangerFloatingButton),
      map(({ target }) => target as SpeedChangerFloatingButton),
      takeUntil(onDisabled),
    )
    .subscribe((button) => {
      const isReelVideo =
        !!button.mediaElement.nextElementSibling?.querySelector(
          'a[href*="/reels"]',
        );

      if (isReelVideo) {
        onReelVideoInactive.next();
      }
    });

  style = document.createElement('style');
  style.textContent = `
    speed-changer-floating-button:not(.${X_VISIBLE}),
    speed-changer-floating-button.${X_OUTSIDE_MODAL} {
      opacity: 0.0000001 !important;
      pointer-events: none;
    }
  `;

  document.head.appendChild(style);
}

export function teardown() {
  style.remove();
  onDisabled.next();
}
