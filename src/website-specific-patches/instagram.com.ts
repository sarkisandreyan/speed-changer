import type { State } from '../types';
import {
  delay,
  filter,
  fromEvent,
  map,
  merge,
  Subject,
  takeUntil,
  tap,
} from 'rxjs';
import {
  SPEED_CHANGER_FLOATING_BUTTON_REF,
  SPEED_CHANGER_FLOATING_BUTTON_SURVIVES_ENDED,
} from '../constants';
import SpeedChangerFloatingButton from '../content/custom-elements/speed-changer-floating-button';
import {
  setup as setupHistoryTracking,
  teardown as teardownHistoryTracking,
} from './helpers/history-change-tracker';
import { isRTL } from '../utils/dom';

// Applied to floating buttons that are confirmed to be good to show.
const X_VISIBLE = 'speed-changer-floating-button-x-visible' as State;
// Appled to floating buttons that should temporarily be hidden
// because they're behind an active modal dialog.
const X_OUTSIDE_MODAL =
  'speed-changer-floating-button-x-outside-modal' as State;

const onDisabled = new Subject<void>();

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
      const isInsideModal = !!button.mediaElement.closest(
        '[role="dialog"][aria-modal="true"]',
      );
      const isReelInFeed =
        !isInsideModal &&
        !!button.mediaElement.closest('article') &&
        // Exclude videos in carousels
        !button.mediaElement.closest('ul');
      const isStory = !!button.mediaElement
        .closest('div:not([class]):not([style])')
        ?.previousElementSibling?.querySelector('[role="link"]');
      const isArchivedStory = !!button.mediaElement
        .closest('section')
        ?.querySelector('& > :not(nav) header [role="link"]');
      const isExploreGridItem = !!button.mediaElement.closest(
        '[style*="--x-gridTemplateColumns"]',
      );

      if (isExploreGridItem) {
        button.destroy();
        return;
      }

      if (isReelInFeed && button.preferredPosition.startsWith('n')) {
        button.setBaseDetachment({
          x: 0,
          y: 48,
        });
      }

      if (
        (isStory || isArchivedStory) &&
        button.preferredPosition.startsWith('n')
      ) {
        button.setBaseDetachment({
          x: !isRTL(button.mediaElement) ? -5 : 5,
          y: 70,
        });
      }

      button.mediaElement[SPEED_CHANGER_FLOATING_BUTTON_SURVIVES_ENDED] = true;
      button.addState(X_VISIBLE);
    });

  let lastUrl = window.location.href;
  fromEvent(window, 'speed-changer:x-history-change')
    .pipe(
      // Add a slight delay so that URL is actually changed
      delay(20),
      // Check against same-URL replacements because Instagram
      // fires a lot of intermittent `replaceStates` for some reason
      filter(() => lastUrl !== window.location.href),
      tap(() => (lastUrl = window.location.href)),
      takeUntil(onDisabled),
    )
    .subscribe(() => {
      const isOnReelsPage = window.location.href.indexOf('/reels/') > -1;
      const isOnModalPage = window.location.href.indexOf('/p/') > -1;

      // Destroy buttons when the window location is changed
      // so that they appear in their correct positions. This
      // resolves the issue where Instagram reels 'expanded'
      // from the feed (both using the same video element)
      // keep their in-feed base detachment in the reels
      // section, making the floating button look odd.
      // TODO: This has the side effect of not persisting the
      // locked state of the floating button, and, overall,
      // destroying the button just to correct its position
      // seems is probably suboptimal.
      for (const button of SpeedChangerFloatingButton.instances) {
        const isInsideModal = !!button.mediaElement.closest(
          '[role="dialog"][aria-modal="true"]',
        );

        if (!isOnReelsPage && button.preferredPosition.startsWith('n')) {
          button.setBaseDetachment({ x: 0, y: 48 });
        } else {
          button.setBaseDetachment({ x: 0, y: 0 });
        }

        if (isOnModalPage && !isInsideModal) {
          button.addState(X_OUTSIDE_MODAL);
        } else {
          button.removeState(X_OUTSIDE_MODAL);
        }
      }
    });

  fromEvent(window, 'pause', { capture: true })
    .pipe(
      filter(({ target }) => target instanceof HTMLMediaElement),
      map(({ target }) => target as HTMLMediaElement),
      takeUntil(onDisabled),
    )
    .subscribe((element) => {
      const isGalleryItem =
        ((
          element.closest<HTMLElement>('.html-div')
            ?.previousElementSibling as HTMLElement | null
        )?.style?.cssText?.indexOf('aspect-ratio') ?? -Infinity) > -1;

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

  setupHistoryTracking();

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
  teardownHistoryTracking();
  style?.remove();
  onDisabled.next();
}
