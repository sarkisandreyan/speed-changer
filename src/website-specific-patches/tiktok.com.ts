import type { State } from '../types';
import {
  filter,
  fromEvent,
  map,
  Observable,
  skip,
  Subject,
  takeUntil,
} from 'rxjs';
import {
  SPEED_CHANGER_FLOATING_BUTTON_SURVIVES_ENDED,
  SPEED_CHANGER_RESET_WHEN_EMPTIED,
} from '../constants';
import SpeedChangerFloatingButton from '../content/custom-elements/speed-changer-floating-button';
import { getEffectivePosition, isRTL } from '../utils/dom';

const X_VISIBLE = 'speed-changer-floating-button-x-visible' as State;

const onVideoDestroyed = new Subject<void>();
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
  fromEvent(window, 'speed-changer:initialize', { capture: true })
    .pipe(
      filter(({ target }) => target instanceof SpeedChangerFloatingButton),
      map(({ target }) => target as SpeedChangerFloatingButton),
      takeUntil(onDisabled),
    )
    .subscribe((button) => {
      const articleItemContainer = button.mediaElement.closest<HTMLElement>(
        '[class*="ArticleItemContainer"]',
      );
      if (!articleItemContainer) return;

      const beganLookingForBottomPanelAt = performance.now();
      requestAnimationFrame(function findBottomPanel() {
        const bottomPanel = articleItemContainer.querySelector<HTMLElement>(
          '[class*="DivMediaCardOverlayBottom"]',
        );

        if (performance.now() - beganLookingForBottomPanelAt > 3000) {
          return;
        }

        if (!bottomPanel) {
          requestAnimationFrame(findBottomPanel);
          return;
        }

        setupResizeObserver(articleItemContainer)
          .pipe(
            takeUntil(
              // Ignore the first emit because TikTok initializes 2 videos
              // at a time, resulting in premature unsubscriptions.
              onVideoDestroyed.pipe(skip(1)),
            ),
            takeUntil(onDisabled),
          )
          .subscribe(() => {
            button.reposition();
          });

        setupResizeObserver(bottomPanel)
          .pipe(
            takeUntil(
              // Ignore the first emit because TikTok initializes 2 videos
              // at a time, resulting in premature unsubscriptions.
              onVideoDestroyed.pipe(skip(1)),
            ),
            takeUntil(onDisabled),
          )
          .subscribe(() => {
            button.setBaseDetachment({
              x: !isRTL(button.mediaElement) ? 2 : -2,
              y: -bottomPanel!.offsetHeight,
            });
          });

        button.setPreferredPosition(
          getEffectivePosition(button.mediaElement, 'sw', true),
        );

        button.mediaElement[SPEED_CHANGER_FLOATING_BUTTON_SURVIVES_ENDED] =
          true;
        button.mediaElement[SPEED_CHANGER_RESET_WHEN_EMPTIED] = true;
        button.addState(X_VISIBLE);
      });
    });

  fromEvent(window, 'speed-changer:destroy', { capture: true })
    .pipe(
      filter(({ target }) => target instanceof SpeedChangerFloatingButton),
      map(({ target }) => target as SpeedChangerFloatingButton),
      takeUntil(onDisabled),
    )
    .subscribe(() => {
      onVideoDestroyed.next();
    });

  style = document.createElement('style');
  style.textContent = `
    speed-changer-floating-button:not(.${X_VISIBLE}) {
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
