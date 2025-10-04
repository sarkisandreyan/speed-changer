import type {
  Position,
  Detachment,
  State,
  DetachmentOrigin,
  ViewportPosition,
  FloatingButtonInteractionMedium,
  FloatingButtonAnchorChange,
} from '../../types';
import {
  filter,
  fromEvent,
  merge,
  startWith,
  Subject,
  take,
  takeUntil,
  timer,
} from 'rxjs';
import SpeedChangerFloatingView from './speed-changer-floating-view';
import {
  SPEED_CHANGER_FLOATING_BUTTON_REF,
  SPEED_CHANGER_FLOATING_BUTTON_DISMISSED,
} from '../../constants';
import { fixSafariStyleFreezeForElement } from '../../utils/styles';
import { customEvent } from '../../utils/dom';
import { commandKey } from '../../key-trackers';

import iconNormal from '../../assets/graphics/content/icon-normal.svg?inline';
import iconFaster from '../../assets/graphics/content/icon-faster.svg?inline';
import iconSlower from '../../assets/graphics/content/icon-slower.svg?inline';
import iconLocked from '../../assets/graphics/content/icon-locked.svg?inline';

import themeStyles from '../../styles/_theme.scss?raw';

export default class SpeedChangerFloatingButton extends HTMLElement {
  /**
   * The active floating button instances.
   * Stored here so as to make them accessible in website-specific patches.
   */
  static instances = new Set<SpeedChangerFloatingButton>();

  /**
   * Applied when the floating button is movable (i.e. the Meta key
   * has been pressed and held).
   */
  static MOVABLE: State = 'speed-changer-floating-button-movable' as State;
  /**
   * Applied when the attached media element has a faster playback rate.
   */
  static FASTER: State = 'speed-changer-floating-button-faster' as State;
  /**
   * Applied when the attached media element has a slower playback rate.
   */
  static SLOWER: State = 'speed-changer-floating-button-slower' as State;
  /**
   *
   * Applied when the floating button is long-pressed.
   */
  static PRESSED: State = 'speed-changer-floating-button-pressed' as State;
  /**
   * Safari-only.
   *
   * Applied when the floating button is force-pressed (using the touchbar).
   */
  static FORCED: State = 'speed-changer-floating-button-forced' as State;
  /**
   * Applied when the floating button is 'locked', i.e. it is long pressed
   * and then pulled down to lock the long press speed.
   */
  static LOCKED: State = 'speed-changer-floating-button-locked' as State;
  /**
   * Applied when the floating button is being interacted with in some way,
   * i.e. the button or the attached floating view is being hovered, or the
   * button is currently being moved or long-pressed.
   */
  static ACTIVE: State = 'speed-changer-floating-button-active' as State;
  /**
   * Applied if the floating button should dim when not in use.
   */
  static DIMMING: State = 'speed-changer-floating-button-dimming' as State;

  directionality: 'ltr' | 'rtl' = 'ltr';

  movable = false;

  #viewportPosition: ViewportPosition = { x: 0, y: 0 };
  /**
   * The base detachment, applied programmatically in order to adjust
   * the position of the button covering important UI of some apps.
   */
  baseDetachment: Detachment = { x: 0, y: 0 };
  /**
   * The detachment applied by the user (by moving it with the Command key pressed).
   */
  detachment: Detachment = { x: 0, y: 0 };
  #pendingDetachment: Detachment = { x: 0, y: 0 };
  #pendingDetachmentOrigin: DetachmentOrigin | null = null;

  get #effectivePosition() {
    return {
      x: this.#viewportPosition.x + this.baseDetachment.x + this.detachment.x,
      y: this.#viewportPosition.y + this.baseDetachment.y + this.detachment.y,
    };
  }

  preferredPosition: Position = 'ne';

  longPressed = false;
  longPressSpeed!: number;
  forcePressed = false;
  forcePressSpeed!: number;
  #pressTimestamp = 0;

  locked = false;
  #awaitingLockOrUnlock = false;

  latestInteractionMedium: FloatingButtonInteractionMedium | null = null;

  mediaElement!: HTMLMediaElement;

  #anchorOverride?: HTMLElement;
  get anchor() {
    return this.#anchorOverride ?? this.mediaElement;
  }

  #onDestroyed = new Subject<void>();
  #onVisualModeDisabled = new Subject<void>();
  #onMovementDisabled = new Subject<void>();
  #onEngagedWith = new Subject<void>();

  #shadow: ShadowRoot;

  #ui!: {
    mainButton: HTMLButtonElement;
    closeButton: HTMLButtonElement;
  };

  #template = `
    <button
      class="close-button"
      aria-label="Dismiss Floating Button"
    ></button>
    <button class="main-button">Speed Changer Floating Button</button>
  `;

  #styles = `
    ${themeStyles.replace(':root', ':host')}

    :host, * { box-sizing: border-box }

    :host {
      position: fixed !important;
      width: 52px !important;
      height: 52px !important;
      padding: 11px !important;
      z-index: 99999999 !important;
      transition: opacity 150ms !important;
      z-index: 99999999;
      opacity: 0;
    }

    .main-button {
      width: 30px;
      height: 30px;
      border: 0;
      text-indent: -999em;
      border-radius: 4px;
      transition: transform 150ms, opacity 150ms;
      cursor: pointer;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,.5));
      background: transparent;

      &::before {
        content: '';
        background: url("${iconNormal}") center / 100% 100% no-repeat;
        width: 120%;
        height: 120%;
        position: absolute;
        top: -10%;
        left: -10%;
      }
    }

    .close-button {
      position: absolute;
      top: 5px; right: 3px;
      width: 16px; height: 16px;
      border-radius: 50%;
      background-color: #404040;
      padding: 0;
      border: 0;
      box-shadow: 0 2px 4px 0 rgba(0, 0, 0, .5);
      opacity: 0;
      transition: opacity 150ms;
      cursor: pointer;
      line-height: 0;
      z-index: 1;
      
      &::before {
        content: '\\E005';
        font-family: 'Speed Changer Icons';
        font-size: 7px;
        line-height: 1;
        color: #fff;
      }

      &:hover, &:focus-visible {
        opacity: 1;
      }
    }

    @keyframes glow {
      from { transform: scale(0.5); opacity: 1; }
      to { transform: scale(1.125); opacity: 0; }
    }

    .glow-effect {
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      transform-origin: 50% 50%;
      animation: glow 875ms forwards;
      z-index: -1;

      &::before {
        content: '';
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        border: 2.5px solid var(--base-400);
        border-radius: 20px;
        box-sizing: border-box;
      }
    }

    :host(.${SpeedChangerFloatingButton.MOVABLE}) {
      .main-button {
        cursor: grab;

        &:active {
          cursor: grabbing;
        }
      }
    }

    :host(.${SpeedChangerFloatingButton.ACTIVE}) {
      .main-button {
        transform: scale(1.075);
      }
    }

    :host(.${SpeedChangerFloatingButton.FASTER}) {
      .main-button::before { background-image: url("${iconFaster}") }
    }

    :host(.${SpeedChangerFloatingButton.SLOWER}) {
      .main-button::before { background-image: url("${iconSlower}") }
    }

    :host(.${SpeedChangerFloatingButton.PRESSED}) {
      .main-button {
        transform: scale(0.9);
      }
    }

    :host(.${SpeedChangerFloatingButton.FORCED}) {
      .main-button {
        transform: scale(0.75);
      }
    }

    :host(.${SpeedChangerFloatingButton.LOCKED}) {
      .main-button {
        transform: scale(0.9);

        &::before { background-image: url("${iconLocked}") }
      }
    }

    :host(
      .${SpeedChangerFloatingButton.LOCKED}.${SpeedChangerFloatingButton.FORCED}
    ) {
      .main-button {
        transform: scale(0.75);
      }
    }

    :host(
      .${SpeedChangerFloatingButton.DIMMING}:not(.${SpeedChangerFloatingButton.ACTIVE})
    ) {
      .main-button {
        opacity: .5;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host, .main-button, .close-button {
        transition-duration: 0.001s;
      }
    }
  `;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.innerHTML = this.#template;

    this.#ui = {
      mainButton:
        this.#shadow.querySelector<HTMLButtonElement>('.main-button')!,
      closeButton:
        this.#shadow.querySelector<HTMLButtonElement>('.close-button')!,
    };
  }

  connectedCallback() {
    this.#initializeStyles();
    this.#initializeMainButton();
    this.#initializeCloseButton();
    this.#setupEventListeners();
    this.dispatchEvent(customEvent('speed-changer:initialize'));
  }

  disconnectedCallback() {
    delete this.mediaElement[SPEED_CHANGER_FLOATING_BUTTON_REF];
    window.dispatchEvent(
      customEvent('speed-changer:destroy', undefined, {}, this),
    );
    this.#onDestroyed.next();
  }

  setMediaElement(mediaElement: HTMLMediaElement) {
    this.mediaElement = mediaElement;
    this.mediaElement[SPEED_CHANGER_FLOATING_BUTTON_REF] = this;
  }

  setAnchorOverride(anchor: HTMLElement) {
    const previousAnchor = this.anchor;
    this.#anchorOverride = anchor;
    this.dispatchEvent(
      customEvent<FloatingButtonAnchorChange>('speed-changer:anchor-override', {
        previousAnchor,
        newAnchor: anchor,
      }),
    );
  }

  setMovable(movable: boolean) {
    this.movable = movable;

    if (this.movable) {
      this.#setupMovementListeners();
      this.addState(SpeedChangerFloatingButton.MOVABLE);
    } else {
      this.removeState(SpeedChangerFloatingButton.MOVABLE);
      this.dispatchEvent(customEvent('speed-changer:movement-disabled'));
      this.#onMovementDisabled.next();
    }
  }

  setBaseDetachment(detachment: Detachment) {
    this.baseDetachment = detachment;
    this.readjust();
  }

  setLongPressSpeed(speed: number) {
    this.longPressSpeed = speed;
  }

  setForcePressSpeed(speed: number) {
    this.forcePressSpeed = speed;
  }

  setLongPressed(longPressed: boolean) {
    if (longPressed) {
      this.addState(SpeedChangerFloatingButton.PRESSED);
      this.#awaitingLockOrUnlock = true;
      this.longPressed = true;
      this.dispatchEvent(customEvent('speed-changer:long-press-willbegin'));
      setTimeout(() => {
        this.dispatchEvent(
          customEvent(
            'speed-changer:long-press-begin',
            this.latestInteractionMedium,
          ),
        );
      }, 200);
    } else {
      this.removeState(SpeedChangerFloatingButton.PRESSED);
      this.removeState(SpeedChangerFloatingButton.FORCED);
      this.longPressed = false;
      this.dispatchEvent(
        customEvent(
          'speed-changer:long-press-end',
          this.latestInteractionMedium,
        ),
      );
      if (this.forcePressed) {
        this.dispatchEvent(
          customEvent(
            'speed-changer:force-press-end',
            this.latestInteractionMedium,
          ),
        );
        this.forcePressed = false;
      }
    }
  }

  setForcePressed(forcePressed: boolean) {
    if (forcePressed) {
      this.addState(SpeedChangerFloatingButton.FORCED);
      this.forcePressed = true;
      this.dispatchEvent(
        customEvent(
          'speed-changer:force-press-begin',
          this.latestInteractionMedium,
        ),
      );
    } else {
      this.removeState(SpeedChangerFloatingButton.FORCED);
      this.forcePressed = false;
      this.dispatchEvent(
        customEvent(
          'speed-changer:force-press-end',
          this.latestInteractionMedium,
        ),
      );
    }
  }

  setVisualMode(enabled: boolean) {
    if (enabled) {
      fromEvent<void>(this.mediaElement, 'ratechange')
        .pipe(
          startWith(void 0),
          takeUntil(this.#onVisualModeDisabled),
          takeUntil(this.#onDestroyed),
        )
        .subscribe(() => {
          this.removeState(SpeedChangerFloatingButton.FASTER);
          this.removeState(SpeedChangerFloatingButton.SLOWER);
          if (this.mediaElement.playbackRate > 1) {
            this.addState(SpeedChangerFloatingButton.FASTER);
          } else if (this.mediaElement.playbackRate < 1) {
            this.addState(SpeedChangerFloatingButton.SLOWER);
          }
        });
    } else {
      this.removeState(SpeedChangerFloatingButton.FASTER);
      this.removeState(SpeedChangerFloatingButton.SLOWER);
      this.dispatchEvent(customEvent('speed-changer:visual-mode-disable'));
      this.#onVisualModeDisabled.next();
    }
  }

  setPreferredPosition(position: Position) {
    this.preferredPosition = position;
    this.reposition();

    if (this.preferredPosition !== position) {
      this.dispatchEvent(
        customEvent('speed-changer:preferred-position-change'),
      );
    }
  }

  reposition() {
    if (!this.anchor.isConnected) {
      this.destroy();
      return;
    }

    // TODO: Implement non-anchored floating buttons.
    if (!this.anchor.checkVisibility()) {
      this.destroy();
      return;
    }

    const { width: selfWidth, height: selfHeight } =
      this.getBoundingClientRect();
    const { top, left, width, height } = this.anchor.getBoundingClientRect();

    switch (this.preferredPosition) {
      case 'nw':
        this.#viewportPosition = { x: left, y: top };
        break;
      case 'n':
        this.#viewportPosition = {
          x: left + width / 2 - selfWidth / 2,
          y: top,
        };
        break;
      case 'ne':
        this.#viewportPosition = {
          x: left + width - selfWidth,
          y: top,
        };
        break;
      case 'e':
        this.#viewportPosition = {
          x: left + width - selfWidth,
          y: top + height * 0.46 - selfHeight / 2,
        };
        break;
      case 'se':
        this.#viewportPosition = {
          x: left + width - selfWidth,
          y: top + height - selfHeight,
        };
        break;
      case 's':
        this.#viewportPosition = {
          x: left + width / 2 - selfWidth / 2,
          y: top + height - selfHeight,
        };
        break;
      case 'sw':
        this.#viewportPosition = {
          x: left,
          y: top + height - selfHeight,
        };
        break;
      case 'w':
        this.#viewportPosition = {
          x: left,
          y: top + height * 0.46 - selfHeight / 2,
        };
        break;
    }

    this.style.left = `${this.#viewportPosition.x}px`;
    this.style.top = `${this.#viewportPosition.y}px`;
  }

  setLocked(locked: boolean) {
    if (locked) {
      this.addState(SpeedChangerFloatingButton.LOCKED);
      this.dispatchEvent(
        customEvent(
          'speed-changer:lock-speed-begin',
          this.latestInteractionMedium,
        ),
      );
    } else {
      this.removeState(SpeedChangerFloatingButton.LOCKED);
      this.dispatchEvent(
        customEvent(
          'speed-changer:lock-speed-end',
          this.latestInteractionMedium,
        ),
      );
      this.setLongPressed(false);
    }
    this.locked = locked;
  }

  setDirectionality(directionality: 'ltr' | 'rtl') {
    this.directionality = directionality;
    this.readjust();
  }

  setDimming(dimming: boolean) {
    if (dimming) {
      this.addState(SpeedChangerFloatingButton.DIMMING);
    } else {
      this.removeState(SpeedChangerFloatingButton.DIMMING);
    }
  }

  readjust() {
    this.style.transform = `translate(${
      this.baseDetachment.x + this.detachment.x + this.#pendingDetachment.x
    }px, ${
      this.baseDetachment.y + this.detachment.y + this.#pendingDetachment.y
    }px)${this.directionality === 'rtl' ? ' scaleX(-1)' : ''}`;
  }

  addState(state: State) {
    this.classList.add(state);
    if (this.#ui.mainButton) {
      fixSafariStyleFreezeForElement(this.#ui.mainButton);
    }
  }

  removeState(state: State) {
    this.classList.remove(state);
    if (this.#ui.mainButton) {
      fixSafariStyleFreezeForElement(this.#ui.mainButton);
    }
  }

  close() {
    this.style.opacity = '';
    fromEvent<TransitionEvent>(this, 'transitionend')
      .pipe(
        filter((event) => event.propertyName === 'opacity'),
        take(1),
      )
      .subscribe(() => {
        this.destroy();
      });
  }

  destroy() {
    this.remove();
  }

  #setupEventListeners() {
    fromEvent<MouseEvent>(this, 'mouseleave')
      .pipe(takeUntil(this.#onDestroyed))
      .subscribe(({ clientX, clientY }) => {
        // If the mouse moves out of the floating button into the
        // floating view, do not close the floating view.
        if (
          document.elementFromPoint(clientX, clientY) instanceof
          SpeedChangerFloatingView
        )
          return;

        if (!this.longPressed && !this.movable) {
          this.removeState(SpeedChangerFloatingButton.ACTIVE);
          this.dispatchEvent(customEvent('speed-changer:engagement-end'));
        }

        this.dispatchEvent(customEvent('speed-changer:detachment-request'));
      });

    commandKey.changes
      .pipe(takeUntil(this.#onDestroyed))
      .subscribe((pressed) => {
        this.setMovable(pressed);

        if (pressed && this.#ui.mainButton.matches(':hover')) {
          this.dispatchEvent(customEvent('speed-changer:detachment-request'));
        }
      });
  }

  #setupMovementListeners() {
    fromEvent<MouseEvent>(this.#ui.mainButton, 'mousedown', { passive: true })
      .pipe(takeUntil(this.#onMovementDisabled), takeUntil(this.#onDestroyed))
      .subscribe(({ button, clientX, clientY }: MouseEvent) => {
        if (button !== 0) return;

        this.addState(SpeedChangerFloatingButton.ACTIVE);

        this.#pendingDetachmentOrigin = {
          x: clientX,
          y: clientY,
        };

        this.dispatchEvent(customEvent('speed-changer:movement-begin'));
      });

    // `'mousemove'` and `'mouseup'` need to be attached to the `window` so that
    // they are captured outside of the flaoting button (or the window) as well
    fromEvent<MouseEvent>(window, 'mousemove', { passive: true })
      .pipe(takeUntil(this.#onMovementDisabled), takeUntil(this.#onDestroyed))
      .subscribe(({ clientX, clientY }: MouseEvent) => {
        if (!this.#pendingDetachmentOrigin) return;

        this.dispatchEvent(customEvent('speed-changer:detachment-request'));

        this.#pendingDetachment = {
          x: clientX - this.#pendingDetachmentOrigin.x,
          y: clientY - this.#pendingDetachmentOrigin.y,
        };
        this.readjust();
      });

    fromEvent<MouseEvent>(window, 'mouseup', {
      passive: true,
    })
      .pipe(takeUntil(this.#onMovementDisabled), takeUntil(this.#onDestroyed))
      .subscribe(() => {
        if (!this.#pendingDetachmentOrigin) return;

        this.detachment = {
          x: this.detachment.x + this.#pendingDetachment.x,
          y: this.detachment.y + this.#pendingDetachment.y,
        };

        this.#pendingDetachment = { x: 0, y: 0 };
        this.#pendingDetachmentOrigin = null;

        this.dispatchEvent(customEvent('speed-changer:movement-end'));

        this.readjust();
      });
  }

  #initializeStyles() {
    const style = document.createElement('style');
    style.textContent = this.#styles;
    this.#shadow.appendChild(style);
  }

  #initializeMainButton() {
    fromEvent<MouseEvent>(this.#ui.mainButton, 'mouseenter')
      .pipe(takeUntil(this.#onDestroyed))
      .subscribe(() => {
        this.addState(SpeedChangerFloatingButton.ACTIVE);

        if (this.movable || this.longPressed) return;

        this.dispatchEvent(
          customEvent(
            'speed-changer:attachment-request',
            this.mediaElement.playbackRate,
          ),
        );

        this.dispatchEvent(customEvent('speed-changer:engagement-begin'));
        this.#onEngagedWith.next();
      });

    fromEvent<MouseEvent>(this.#ui.mainButton, 'mousedown')
      .pipe(takeUntil(this.#onDestroyed))
      .subscribe(({ button }) => {
        if (this.movable || button !== 0) return;

        this.latestInteractionMedium = 'longpress';

        this.dispatchEvent(customEvent('speed-changer:detachment-request'));

        this.#pressTimestamp = performance.now();
        if (!this.longPressed) {
          this.setLongPressed(true);
        } else {
          this.#awaitingLockOrUnlock = true;
        }
      });

    if (import.meta.env.MODE === 'safari') {
      fromEvent<MouseEvent>(this.#ui.mainButton, 'webkitmouseforcewillbegin')
        .pipe(takeUntil(this.#onDestroyed))
        .subscribe((event) => {
          event.preventDefault();
        });

      merge(
        fromEvent<MouseEvent>(this.#ui.mainButton, 'webkitmouseforcedown'),
        fromEvent<MouseEvent>(this.#ui.mainButton, 'webkitmouseforceup'),
      )
        .pipe(takeUntil(this.#onDestroyed))
        .subscribe(({ type }) => {
          if (this.longPressSpeed === this.forcePressSpeed) return;

          if (this.movable) return;

          if (this.locked) return;

          if (type === 'webkitmouseforcedown') {
            this.setForcePressed(true);
          } else {
            this.setForcePressed(false);
          }
        });
    }

    fromEvent<MouseEvent>(window, 'mousemove')
      .pipe(takeUntil(this.#onDestroyed))
      .subscribe(({ clientX, clientY }) => {
        if (!this.longPressed || !this.#awaitingLockOrUnlock) return;

        if (
          Math.abs(this.#effectivePosition.x + this.offsetWidth / 2 - clientX) >
            80 ||
          Math.abs(
            this.#effectivePosition.y + this.offsetHeight / 2 - clientY,
          ) > 80
        ) {
          this.latestInteractionMedium = 'pullaway';
          this.setLocked(!this.locked);
          if (!this.locked && !this.movable) {
            timer(1e3)
              .pipe(takeUntil(this.#onEngagedWith))
              .subscribe(() =>
                this.removeState(SpeedChangerFloatingButton.ACTIVE),
              );
          }
          this.#glow();
          this.#awaitingLockOrUnlock = false;
        }
      });

    fromEvent<MouseEvent>(window, 'mouseup')
      .pipe(takeUntil(this.#onDestroyed))
      .subscribe(() => {
        if (!this.longPressed) return;

        if (performance.now() - this.#pressTimestamp < 200) {
          this.latestInteractionMedium = 'click';
          this.setLocked(!this.locked);
          this.#awaitingLockOrUnlock = false;
          this.#pressTimestamp = 0;
          return;
        }

        this.latestInteractionMedium = 'longpress';
        if (!this.locked) {
          this.setLongPressed(false);
        }
      });

    this.#shadow.appendChild(this.#ui.mainButton);
  }

  #glow() {
    const glowEffect = document.createElement('div');
    glowEffect.classList.add('glow-effect');
    glowEffect.addEventListener('animationend', () => {
      glowEffect.remove();
    });
    this.#shadow.appendChild(glowEffect);
  }

  async #initializeCloseButton() {
    this.#ui.closeButton.title = `Dismiss`;

    fromEvent<MouseEvent>(this.#ui.closeButton, 'click')
      .pipe(takeUntil(this.#onDestroyed))
      .subscribe(() => {
        this.mediaElement[SPEED_CHANGER_FLOATING_BUTTON_DISMISSED] = true;
        this.dispatchEvent(customEvent('speed-changer:dismiss'));
        this.close();
      });

    this.#shadow.insertBefore(this.#ui.closeButton, this.#ui.mainButton);
  }
}
