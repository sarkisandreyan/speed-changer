import type { State } from '../types';
import { filter, fromEvent, map, Observable, Subject, takeUntil } from 'rxjs';
import SpeedChangerFloatingButton from '../content/custom-elements/speed-changer-floating-button';
import {
  SPEED_CHANGER_FLOATING_BUTTON_REF,
  SPEED_CHANGER_RESET_WHEN_EMPTIED,
} from '../constants';
import { resetCustomRatesForElement } from '../utils/speeds';
import { getEffectivePosition, isRTL } from '../utils/dom';

const X_VISIBLE = 'speed-changer-floating-button-x-visible' as State;
const X_AUTOHIDE = 'speed-changer-floating-button-x-autohide' as State;

const onMainVideoDisconnected = new Subject<void>();
const onReelVideoDisconnected = new Subject<void>();
const onDisabled = new Subject<void>();

let style: HTMLStyleElement;

function setupMainVideoStateObserver(player: HTMLElement) {
  const currentState = {
    active: false,
    fullscreen: false,
  };

  return new Observable<{
    state: 'active' | 'fullscreen';
    value: boolean;
  }>((observer) => {
    function check() {
      const active = !player.classList.contains('ytp-autohide');
      const fullscreen = player.classList.contains('ytp-fullscreen');

      if (active !== currentState.active) {
        observer.next({
          state: 'active',
          value: active,
        });
        currentState.active = active;
      }

      if (fullscreen !== currentState.fullscreen) {
        observer.next({
          state: 'fullscreen',
          value: fullscreen,
        });
        currentState.fullscreen = fullscreen;
      }
    }

    const mutationObserver = new MutationObserver(check);
    mutationObserver.observe(player, { attributeFilter: ['class'] });
    check();

    return () => {
      mutationObserver.disconnect();
    };
  });
}

function setupReelVideoStateObserver(reelRenderer: HTMLElement) {
  const currentState = {
    actionBarExtracted: false,
    hasCommentsOpen: false,
  };

  return new Observable<{
    state: 'action-bar-extracted' | 'has-comments-open';
    value: boolean;
  }>((observer) => {
    function checkState() {
      const actionBarExtracted =
        reelRenderer.hasAttribute('extract-action-bar');
      const hasCommentsOpen = reelRenderer.hasAttribute('is-watch-while-mode');

      if (actionBarExtracted !== currentState.actionBarExtracted) {
        observer.next({
          state: 'action-bar-extracted',
          value: actionBarExtracted,
        });
        currentState.actionBarExtracted = actionBarExtracted;
      }

      if (hasCommentsOpen !== currentState.hasCommentsOpen) {
        observer.next({
          state: 'has-comments-open',
          value: hasCommentsOpen,
        });
        currentState.hasCommentsOpen = hasCommentsOpen;
      }
    }

    const stateObserver = new MutationObserver(checkState);
    stateObserver.observe(reelRenderer, {
      attributeFilter: [
        'extract-overlay',
        'extract-action-bar',
        'is-watch-while-mode',
      ],
    });
    checkState();

    return () => {
      stateObserver.disconnect();
    };
  });
}

function setupReelVideoMetadataObserver(reelRenderer: HTMLElement) {
  return new Observable<{
    extracted: boolean;
    height: number;
  }>((observer) => {
    const beganLookingForMetadataContainerAt = performance.now();

    const resizeObserver = new ResizeObserver(checkSize);
    let metadataContainer: HTMLElement | null;

    function lookForMetadataContainer() {
      metadataContainer =
        // Metadata container for regular shorts
        reelRenderer.querySelector<HTMLElement>(
          '.ytReelPlayerOverlayViewModelMetadataContainer',
        ) ??
        // Metadata container for ads
        reelRenderer.querySelector<HTMLElement>(
          '.ytwReelsPlayerOverlayLayoutViewModelHostMetadataContainer',
        );

      // If looking for the metadata panel takes longer than 5 seconds,
      // simply don't set up the floating button.
      if (performance.now() - beganLookingForMetadataContainerAt > 5e3) {
        resizeObserver.disconnect();
        observer.complete();
        return;
      }

      if (!metadataContainer) {
        requestAnimationFrame(lookForMetadataContainer);
        return;
      }

      resizeObserver.observe(metadataContainer);
      checkSize();
    }

    function checkSize() {
      const extracted = reelRenderer.hasAttribute('extract-overlay');

      observer.next({
        extracted,
        height: metadataContainer!.offsetHeight,
      });
    }

    lookForMetadataContainer();

    return () => {
      resizeObserver.disconnect();
    };
  });
}

export function setup() {
  fromEvent(window, 'speed-changer:initialize', { capture: true })
    .pipe(
      filter(({ target }) => target instanceof SpeedChangerFloatingButton),
      map(({ target }) => target as SpeedChangerFloatingButton),
      takeUntil(onDisabled),
    )
    .subscribe((button) => {
      const isMainVideo = !!button.mediaElement.closest<HTMLElement>(
        ':is(#full-bleed-container, #primary-inner > #player)',
      );
      const isReelVideo = !!button.mediaElement.closest('#reel-video-renderer');

      if (isMainVideo) {
        const player = button.mediaElement.closest<HTMLElement>(
          '.html5-video-player',
        )!;
        button.setAnchorOverride(player);
        button.addState(X_VISIBLE);

        setupMainVideoStateObserver(player)
          .pipe(takeUntil(onMainVideoDisconnected), takeUntil(onDisabled))
          .subscribe(({ state, value }) => {
            switch (state) {
              case 'active':
                if (!value) {
                  button.addState(X_AUTOHIDE);
                } else {
                  button.removeState(X_AUTOHIDE);
                }
                break;
              case 'fullscreen':
                if (!value) {
                  button.setBaseDetachment({ x: 0, y: 0 });
                } else {
                  button.setBaseDetachment({
                    x: !isRTL(button.mediaElement) ? -5 : 5,
                    y: 54,
                  });
                }
                break;
            }
          });

        return;
      }

      if (isReelVideo) {
        button.mediaElement[SPEED_CHANGER_RESET_WHEN_EMPTIED] = true;
        const reelRenderer = button.mediaElement.closest<HTMLElement>(
          'ytd-reel-video-renderer',
        );

        if (reelRenderer) {
          setupReelVideoStateObserver(reelRenderer)
            .pipe(takeUntil(onReelVideoDisconnected), takeUntil(onDisabled))
            .subscribe(({ state, value }) => {
              switch (state) {
                case 'action-bar-extracted':
                  if (value) {
                    button.addState(X_VISIBLE);
                  } else {
                    button.removeState(X_VISIBLE);
                  }
                  break;
                case 'has-comments-open':
                  const beganAnimatingAt = performance.now();
                  requestAnimationFrame(function reposition() {
                    if (performance.now() - beganAnimatingAt > 500) return;
                    button.reposition();
                    requestAnimationFrame(reposition);
                  });
                  break;
              }
            });

          setupReelVideoMetadataObserver(reelRenderer)
            .pipe(takeUntil(onReelVideoDisconnected), takeUntil(onDisabled))
            .subscribe(({ extracted, height }) => {
              button.setBaseDetachment({
                x: !isRTL(button.mediaElement) ? 5 : -5,
                y: !extracted ? -5 - height : -12,
              });
            });
        }

        button.setPreferredPosition(
          getEffectivePosition(button.mediaElement, 'sw', true),
        );
        return;
      }

      button.destroy();
    });

  fromEvent(window, 'speed-changer:destroy', { capture: true })
    .pipe(
      filter(({ target }) => target instanceof SpeedChangerFloatingButton),
      map(({ target }) => target as SpeedChangerFloatingButton),
      takeUntil(onDisabled),
    )
    .subscribe((button) => {
      const isMainVideo = !!button.mediaElement.closest(
        ':is(#full-bleed-container, #primary-inner > #player)',
      );
      const isReelVideo = !!button.mediaElement.closest('#reel-video-renderer');

      if (isMainVideo) {
        onMainVideoDisconnected.next();
      }

      if (isReelVideo) {
        onReelVideoDisconnected.next();
      }
    });

  fromEvent(window, 'emptied', { capture: true })
    .pipe(takeUntil(onDisabled))
    .subscribe(({ target }) => {
      const element = target as HTMLMediaElement;
      const isReelVideo = !!element.closest('#reel-video-renderer');
      if (!isReelVideo) return;

      resetCustomRatesForElement(element);
      element[SPEED_CHANGER_FLOATING_BUTTON_REF]?.destroy();
    });

  style = document.createElement('style');
  style.textContent = `
    speed-changer-floating-button { z-index: 2019 !important }

    speed-changer-floating-button:not(.${X_VISIBLE}),
    speed-changer-floating-button.${X_AUTOHIDE}:not(.${
      SpeedChangerFloatingButton.ACTIVE
    }) {
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
