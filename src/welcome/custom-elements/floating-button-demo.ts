import iconNormal from '../../assets/graphics/content/icon-normal.svg?no-inline';
import iconFaster from '../../assets/graphics/content/icon-faster.svg?no-inline';
import iconLocked from '../../assets/graphics/content/icon-locked.svg?no-inline';

import cursorDefault from '../../assets/graphics/welcome/cursor-default.svg?no-inline';
import cursorPointer from '../../assets/graphics/welcome/cursor-pointer.svg?no-inline';

export class FloatingButtonDemo extends HTMLElement {
  #template = `
    <div class="floating-button" data-switch-cursor="pointer"></div>
    <div class="glow"></div>
    <div class="cursor"></div>
  `;

  #styles = `
    @keyframes floating-button-in {
      0% {
        background-image: url(${iconNormal});
        transform: rotate(15deg) scale(0.8);
        opacity: 0;
      }
      10% {
        transform: rotate(0) scale(1.1);
        opacity: 1;
      }
      12.5%, 45% {
        background-image: url(${iconNormal});
        transform: scale(1);
      }
      45.0001% {
        background-image: url(${iconFaster});
      }
      50%, 65% {
        background-image: url(${iconFaster});
        transform: scale(.8);
      }
      65.50001%, 100% {
        background-image: url(${iconLocked});
        transform: scale(.8);
        opacity: 1;
      }
    }

    @keyframes glow-in {
      0%, 65% {
        transform: scale(.55);
        opacity: 0;
      }
      65.50001% {
        opacity: 1;
      }
      85%, 100% {
        transform: scale(1.25);
        opacity: 0;
      }
    }

    @keyframes cursor-in {
      20% {
        inset-inline-start: 200%;
        inset-block-start: 300%;
        opacity: 0;
      }
      25% {
        opacity: 1;
      }
      35%, 100% {
        inset-inline-start: 50%;
        inset-block-start: 50%;
        opacity: 1;
      }
      45% {
        transform: scale(1);
      }
      50%, 62.5% {
        transform: scale(.75);
      }
      75%, 87.5% {
        transform: translate(7.5%, 200%) scale(.75);
      }
      87.5%, 100% {
        transform: translate(7.5%, 200%) scale(1);
      }
    }

    :host {
      aspect-ratio: 1/1;
      position: absolute;
      inset-block-start: 48.5%;
      inset-inline-start: 28%;
      user-select: none;
      z-index: 0;
    }

    .floating-button {
      width: 100%;
      height: 100%;
      background-position: 0 0;
      background-size: 100% 100%;
      animation: floating-button-in 6.25s forwards paused;
      filter: drop-shadow(0px 3px 5px rgba(0, 0, 0, 0.1));
      opacity: 0;
    }

    .glow {
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      border-radius: 24px;
      border: 2.5px solid var(--base-400);
      transform-origin: center;
      animation: glow-in 6.25s forwards paused;
      pointer-events: none;
      box-sizing: border-box;
      z-index: -1;
      opacity: 0;
    }

    .cursor {
      position: absolute;
      translate: -45% -33.33%;
      width: 72.5%;
      height: 72.5%;
      background: url(${cursorDefault}) 0 0/100% 100%;
      animation: cursor-in 6.25s forwards paused;
      opacity: 0;
      pointer-events: none;

      &.pointer {
        background-image: url(${cursorPointer});
      }

      &:dir(rtl) {
        translate: 55% -33.33%;
      }
    }
  `;

  #shadow: ShadowRoot;

  #startTime: number | null = null;
  #duration = 6.25;
  #playing = false;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });

    this.#shadow.innerHTML = this.#template;

    const styles = document.createElement('style');
    styles.textContent = this.#styles;
    this.#shadow.appendChild(styles);

    this.addEventListener('click', () => {
      if (this.#playing) return;
      this.start();
    });

    setTimeout(() => this.start(), 2125);
  }

  start() {
    this.#playing = true;
    this.#startTime = performance.now();

    this.#shadow.getAnimations().forEach((animation) => {
      animation.cancel();
      animation.play();
    });

    const animate = () => {
      if (performance.now() - this.#startTime! > this.#duration * 1000) {
        this.#playing = false;
        return;
      }

      const cursor = this.#shadow.querySelector('.cursor')!;
      const { left, top, width, height } = cursor.getBoundingClientRect();
      const overElement = this.#shadow.elementFromPoint(
        left + width / 3,
        top + height / 3,
      );
      if (!overElement) {
        cursor.classList.remove('pointer');
        requestAnimationFrame(animate);
        return;
      }

      if (overElement.getAttribute('data-switch-cursor') === 'pointer') {
        cursor.classList.add('pointer');
      } else {
        cursor.classList.remove('pointer');
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }
}

customElements.define('floating-button-demo', FloatingButtonDemo);
