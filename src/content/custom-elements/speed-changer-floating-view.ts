import type { State } from '../../types';
import { filter, fromEvent, Subject, take, takeUntil } from 'rxjs';
import { RANGE_STEP_VALUE } from '../../constants';
import SpeedChangerFloatingButton from './speed-changer-floating-button';
import { trackRangeValue } from '../../helpers/range-value-tracker';
import { fixSafariStyleFreezeForElement } from '../../utils/styles';
import { getFormattedSpeed } from '../../utils/speeds';
import { customEvent, isHTMLElement, isRTL } from '../../utils/dom';

import themeStyles from '../../styles/_theme.scss?raw';

export default class SpeedChangerFloatingView extends HTMLElement {
  /**
   * The active floating view instance.
   * Stored here so as to make it accessible in website-specific patches.
   */
  static instance: SpeedChangerFloatingView | null = null;

  /**
   * Applied when the floating view has been attached to a floating button.
   */
  static ATTACHED: State = 'speed-changer-floating-view-attached' as State;
  /**
   * Applied when the range inside the floating view is visible.
   */
  static RANGE_VISIBLE: State =
    'speed-changer-floating-view-range-visible' as State;

  minSpeed: number = 1 / 16;
  maxSpeed: number = 16;

  anchor: SpeedChangerFloatingButton | null = null;
  predefinedSpeeds: number[] = [];
  speed: number = 1;
  rangeVisible: boolean = false;

  get visible() {
    return this.anchor !== null;
  }

  #onDestroyed = new Subject<void>();
  #onAttached = new Subject<void>();
  #onHintShown = new Subject<void>();
  #onHintHidden = new Subject<void>();

  #shadow: ShadowRoot;

  #ui!: {
    rangeWrapper: HTMLElement;
    range: HTMLInputElement;
    moreOptions: HTMLElement;
    predefinedSpeeds: HTMLElement;
    thumb: HTMLElement;
    indicator: HTMLElement;
    placeholder: HTMLElement;
    hint: HTMLElement;
  };

  #template = `
    <div class="container">
      <div class="range">
        <div class="range-ui">
          <div class="range-ui-thumb"></div>
          <div class="speed-indicator">1.00x</div>
          <input type="range" aria-label="Current Speed" />
        </div>
      </div>
      <div class="predefined-speeds">
        <button
          aria-label="More Options"
          class="more-options-button"
        >
          &middot;&middot;&middot;
        </button>
      </div>
    </div>
    <div dir="auto" class="hint" hidden></div>
    <div class="placeholder" hidden></div>
  `;

  #styles = `
    ${themeStyles.replace(':root', ':host')}

    :host, * { box-sizing: border-box }

    :host {
      font-family:
        'Speed Changer Inter',
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        Roboto,
        Oxygen,
        Ubuntu,
        Cantarell,
        'Open Sans',
        'Helvetica Neue',
        sans-serif
        !important;
      position: fixed !important;
      top: -999em;
      left: -999em;
      transition: 150ms opacity !important;
      opacity: 0;
      z-index: 99999999 !important;
      color-scheme: auto !important;
      line-height: 1.2 !important;
      -webkit-font-smoothing: antialiased !important;
    }

    .container {
      padding: 5px;
      background-color: color-mix(in srgb, #585858 50%, transparent);
      backdrop-filter: blur(24px);
      border: 1px solid color-mix(in srgb, currentcolor 7.5%, transparent);
      border-radius: 21px;
      color: var(--base-100);
    }

    .range {
      height: 0;
      opacity: 0;
      overflow: hidden;
      transition:
        height 150ms,
        opacity 150ms;

      input {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;

        &:focus-visible + .range-ui {
          outline: 2px dotted var(--base-700);
          outline-offset: 0.1em;
        }
      }

      .speed-indicator {
        font-size: 11px;
        font-variation-settings: 'wght' 600;
        font-variant-numeric: tabular-nums;
        position: absolute;
        inset-block-start: 6px;
        inset-inline-start: calc(100% - 8px);
        transform: translateX(var(--detachment));
        pointer-events: none;
        opacity: 0.5;

        &:dir(ltr) {
          --detachment: -100%;
        }
        &:dir(rtl) {
          --detachment: 100%;
        }

        &.opposite {
          inset-inline-start: 8px;
          --detachment: 0;
        }
      }

      .range-ui {
        width: 100%;
        height: 28px;
        background-color: color-mix(in srgb, #b0b0b0 25%, transparent);
        border: 1px solid color-mix(in srgb, currentcolor 7.5%, transparent);
        border-radius: 999em;
        position: relative;

        .range-ui-thumb {
          height: calc(100% - 2px);
          aspect-ratio: 1/1;
          background-color: var(--base-400);
          border-radius: 999em;
          position: absolute;
          top: 1px;
          pointer-events: none;
        }
      }
    }

    .predefined-speeds {
      display: flex;
      gap: 4px;

      button {
        width: 30px;
        height: 30px;
        background-color: color-mix(in srgb, #b0b0b0 25%, transparent);
        border-radius: 999em;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: none;
        font-family: inherit;
        font-variation-settings: 'wght' 700;
        line-height: inherit;
        color: inherit;
        font-size: 12px;
        border: 1px solid color-mix(in srgb, currentcolor 7.5%, transparent);
        cursor: pointer;

        &[aria-pressed="true"] {
          background-color: color-mix(in srgb, var(--base-400) 75%, transparent);
        }

        &.smaller {
          font-size: 10px;
        }

        &:disabled {
          opacity: .33;
          cursor: default;
        }
      }
    }

    .hint {
      font-size: 10px;
      color: rgba(255, 255, 255, .875);
      text-align: center;
      padding: 5px 13px 10px;
      margin: 0 auto;
      text-shadow: 0px 0px 3px #000;
      transition: opacity 150ms;
      position: absolute;
      width: 100%;
      cursor: default;
      user-select: none;
      opacity: 0;

      u { cursor: pointer }
    }

    :host(.${SpeedChangerFloatingView.ATTACHED}) {
      .speed-indicator {
        transition:
          inset-inline-start 150ms,
          transform 150ms;
      }
    }

    :host(.${SpeedChangerFloatingView.RANGE_VISIBLE}) {
      .range {
        height: 36px;
        opacity: 1;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host, .range, .hint, .speed-indicator {
        transition-duration: 0.001s !important;
      }
    }
  `;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.innerHTML = this.#template;

    this.#ui = {
      rangeWrapper: this.#shadow.querySelector('.range')!,
      range: this.#shadow.querySelector('.range input')!,
      thumb: this.#shadow.querySelector('.range-ui-thumb')!,
      predefinedSpeeds: this.#shadow.querySelector('.predefined-speeds')!,
      moreOptions: this.#shadow.querySelector('.more-options-button')!,
      indicator: this.#shadow.querySelector('.speed-indicator')!,
      placeholder: this.#shadow.querySelector('.placeholder')!,
      hint: this.#shadow.querySelector('.hint')!,
    };
  }

  connectedCallback() {
    this.#initializeStyles();
    this.#initializeMoreOptionsButton();
    this.#initializeRange();
    this.#setupEventListeners();
    this.dispatchEvent(customEvent('speed-changer:initialize'));
  }

  disconnectedCallback() {
    window.dispatchEvent(
      customEvent('speed-changer:destroy', undefined, {}, this),
    );
    this.#onDestroyed.next();
  }

  setRangeVisibility(visible: boolean) {
    if (visible) {
      this.addState(SpeedChangerFloatingView.RANGE_VISIBLE);
    } else {
      this.removeState(SpeedChangerFloatingView.RANGE_VISIBLE);
    }

    // The range wrapper sometimes does not open in Safari.
    if (this.#ui.rangeWrapper) {
      fixSafariStyleFreezeForElement(this.#ui.rangeWrapper);
    }

    this.rangeVisible = visible;
  }

  #setPlaceholderVisiblity(visible: boolean) {
    if (visible) {
      this.#ui.placeholder.style.height =
        Math.max(0, 36 - this.#ui.hint.offsetHeight) + 'px';
      this.#ui.placeholder.hidden = false;
    } else {
      this.#ui.placeholder.style.height = '';
      this.#ui.placeholder.hidden = true;
    }
  }

  showRangeIfNeeded() {
    if (
      !this.rangeVisible &&
      this.predefinedSpeeds.indexOf(this.speed) === -1
    ) {
      this.setRangeVisibility(true);
    }
  }

  setSpeedLimits(min: number, max: number) {
    this.minSpeed = min;
    this.maxSpeed = max;

    this.#ui.range.min = `${this.minSpeed}`;
    this.#ui.range.max = `${this.maxSpeed}`;

    this.#populatePredefinedSpeeds();
    this.setSpeed(this.speed);
  }

  setSpeed(speed: number) {
    this.speed = speed;

    const perc = Math.max(
      0,
      (speed - this.minSpeed) / (this.maxSpeed - this.minSpeed),
    );

    this.#ui.range.value = `${speed}`;
    this.#ui.thumb.style.insetInlineStart =
      1 +
      (this.#ui.rangeWrapper.offsetWidth - this.#ui.thumb.offsetWidth - 4) *
        perc +
      'px';

    this.#ui.indicator.textContent = `${getFormattedSpeed(speed, true)}x`;

    if (speed >= 0.75 * (this.maxSpeed - this.minSpeed)) {
      this.#ui.indicator.classList.add('opposite');
    } else {
      this.#ui.indicator.classList.remove('opposite');
    }

    const buttons = this.#ui.predefinedSpeeds.querySelectorAll('[data-speed]');
    buttons.forEach((button) => {
      if (
        !this.rangeVisible &&
        button.getAttribute('data-speed') === speed.toString()
      ) {
        button.ariaPressed = 'true';
        return;
      }
      button.ariaPressed = 'false';
    });
  }

  setPredefinedSpeeds(speeds: number[]) {
    this.predefinedSpeeds = [...speeds];
    this.#populatePredefinedSpeeds();
    this.showRangeIfNeeded();
  }

  setAnchor(anchor: SpeedChangerFloatingButton | null) {
    if (this.anchor === anchor) return;

    if (!anchor) {
      this.removeState(SpeedChangerFloatingView.ATTACHED);
      this.style.opacity = '';
      fromEvent<TransitionEvent>(this, 'transitionend')
        .pipe(
          filter(
            (event) =>
              event.target === this && event.propertyName === 'opacity',
          ),
          takeUntil(this.#onAttached),
          take(1),
        )
        .subscribe(() => {
          this.setRangeVisibility(false);
          this.#setPlaceholderVisiblity(false);
          this.style.top = '';
          this.style.left = '';
        });
      this.setHintContent(null);
      this.dispatchEvent(customEvent('speed-changer:detach'));
      this.anchor = null;
      return;
    }

    this.anchor = anchor;
    this.setAttribute('dir', !isRTL(this.anchor.mediaElement) ? 'ltr' : 'rtl');

    this.showRangeIfNeeded();

    const position = this.#getPosition();
    if (!position) return;
    this.style.top = `${position.top}px`;
    this.style.left = `${position.left}px`;
    this.style.opacity = '1';
    this.addState(SpeedChangerFloatingView.ATTACHED);
    this.dispatchEvent(customEvent('speed-changer:attach'));
    this.#onAttached.next();
  }

  setHintContent(content: string | null, callback?: (action?: string) => void) {
    if (content) {
      this.#ui.hint.hidden = false;
      this.#ui.hint.style.opacity = '1';
      this.#ui.hint.innerHTML = content;
      if (callback) {
        this.#ui.hint.role = 'button';
        fromEvent(this.#ui.hint, 'click')
          .pipe(
            takeUntil(this.#onHintHidden),
            filter(
              ({ target }) =>
                isHTMLElement(target) && target.tagName.toLowerCase() === 'u',
            ),
          )
          .subscribe(({ target }) => {
            const action = (target as HTMLElement).getAttribute('data-action');
            if (action) {
              callback(action);
            } else {
              callback();
            }
          });
      }
      this.dispatchEvent(customEvent('speed-changer:hint-show'));
      this.#onHintShown.next();
    } else {
      this.#ui.hint.style.opacity = '';
      fromEvent<TransitionEvent>(this.#ui.hint, 'transitionend')
        .pipe(
          filter(
            (event) =>
              event.target === this.#ui.hint &&
              event.propertyName === 'opacity',
          ),
          takeUntil(this.#onHintShown),
          take(1),
        )
        .subscribe(() => {
          this.#ui.hint.role = '';
          this.#ui.hint.hidden = true;
          this.#ui.hint.innerHTML = '';
        });
      this.dispatchEvent(customEvent('speed-changer:hint-hide'));
      this.#onHintHidden.next();
    }
  }

  close() {
    if (!this.style.opacity) {
      this.destroy();
      return;
    }

    this.style.opacity = '';
    fromEvent<TransitionEvent>(this, 'transitionend')
      .pipe(
        filter(
          (event) => event.target === this && event.propertyName === 'opacity',
        ),
        take(1),
      )
      .subscribe(() => {
        this.destroy();
      });
  }

  addState(state: State) {
    this.classList.add(state);
  }

  removeState(state: State) {
    this.classList.remove(state);
  }

  destroy() {
    this.remove();
  }

  #setupEventListeners() {
    fromEvent<MouseEvent>(this, 'mouseleave')
      .pipe(takeUntil(this.#onDestroyed))
      .subscribe(({ clientX, clientY }) => {
        // If the mouse moves out of the floating view into a
        // floating button, do not close the floating view.
        if (
          document.elementFromPoint(clientX, clientY) instanceof
          SpeedChangerFloatingButton
        )
          return;

        this.anchor?.removeState(SpeedChangerFloatingButton.ACTIVE);

        this.dispatchEvent(customEvent('speed-changer:detachment-request'));
        this.dispatchEvent(customEvent('speed-changer:engagement-end'));
      });

    fromEvent<MouseEvent>(this.#ui.placeholder, 'mouseleave')
      .pipe(takeUntil(this.#onDestroyed))
      .subscribe(() => {
        this.#setPlaceholderVisiblity(false);
      });
  }

  #initializeStyles() {
    const style = document.createElement('style');
    style.textContent = this.#styles;
    this.#shadow.appendChild(style);
  }

  #initializeMoreOptionsButton() {
    fromEvent<MouseEvent>(this.#ui.moreOptions, 'click')
      .pipe(takeUntil(this.#onDestroyed))
      .subscribe(() => {
        if (this.rangeVisible) {
          this.#setPlaceholderVisiblity(true);
        }
        this.setRangeVisibility(!this.rangeVisible);

        if (this.rangeVisible) {
          this.dispatchEvent(customEvent('speed-changer:range-show'));
        } else {
          this.dispatchEvent(customEvent('speed-changer:range-hide'));
        }
      });
  }

  #initializeRange() {
    this.#ui.range.min = `${this.minSpeed}`;
    this.#ui.range.max = `${this.maxSpeed}`;
    this.#ui.range.step = `${RANGE_STEP_VALUE}`;

    trackRangeValue(this.#ui.range, this.#ui.thumb.offsetWidth)
      .pipe(takeUntil(this.#onDestroyed))
      .subscribe(({ interaction, value }) => {
        if (this.speed !== value) {
          this.dispatchEvent(
            customEvent('speed-changer:change-speed', {
              medium: 'range',
              interaction,
              speed: value,
            }),
          );
          this.setSpeed(value);
        }
      });
  }

  #getPosition(): { top: number; left: number } | null {
    if (!this.anchor) return null;

    const { top, left, width } = this.anchor.getBoundingClientRect();
    const mediaElRect = this.anchor.mediaElement.checkVisibility()
      ? this.anchor.mediaElement.getBoundingClientRect()
      : null;

    const preferredDirection: 'left' | 'right' = mediaElRect
      ? mediaElRect.left + mediaElRect.width / 2 < left
        ? 'left'
        : 'right'
      : 'left';

    let effectiveDirection: 'left' | 'right' | null = null;

    if (preferredDirection === 'left') {
      if (left - this.offsetWidth > 0) effectiveDirection = 'left';
      else if (left + width + this.offsetWidth < window.innerWidth)
        effectiveDirection = 'right';
    }

    if (preferredDirection === 'right') {
      if (left + width + this.offsetWidth < window.innerWidth)
        effectiveDirection = 'right';
      else if (left - this.offsetWidth > 0) effectiveDirection = 'left';
    }

    switch (effectiveDirection) {
      case 'left':
        return {
          top: top + 6,
          left: left - this.offsetWidth,
        };
      case 'right':
        return {
          top: top + 6,
          left: left + width,
        };
      default:
        return null;
    }
  }

  #populatePredefinedSpeeds() {
    this.#ui
      .predefinedSpeeds!.querySelectorAll('[data-speed]')
      .forEach((button) => button.remove());
    this.predefinedSpeeds.forEach((speed) => {
      const button = document.createElement('button');
      button.textContent = `${getFormattedSpeed(speed)}x`;
      button.disabled = speed < this.minSpeed || speed > this.maxSpeed;
      button.ariaPressed = 'false';
      button.setAttribute('data-speed', speed.toString());

      if (button.textContent.length > 2) {
        button.classList.add('smaller');
      }

      fromEvent<MouseEvent>(button, 'click')
        .pipe(takeUntil(this.#onDestroyed))
        .subscribe(() => {
          if (this.rangeVisible) {
            this.#setPlaceholderVisiblity(true);
          }
          this.setRangeVisibility(false);
          this.dispatchEvent(
            customEvent('speed-changer:change-speed', {
              medium: 'predefined',
              speed,
            }),
          );
          this.setSpeed(speed);
        });

      this.#ui.predefinedSpeeds.insertBefore(button, this.#ui.moreOptions);
    });
  }
}
