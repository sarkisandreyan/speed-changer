import type { Position } from '../../types';
import { customEvent } from '../../utils/dom';
import { rem } from '../../utils/styles';

const positionLabels: Record<Position, string> = {
  nw: 'Top-Left',
  n: 'Top-Middle',
  ne: 'Top-Right',
  e: 'Middle-Right',
  se: 'Bottom-Left',
  s: 'Bottom-Middle',
  sw: 'Bottom-Right',
  w: 'Middle-Left',
};

export class PreferredPositionEditor extends HTMLElement {
  // We're only exposing a handful of positions to the users because most
  // other positions either are problematic in that they can block actual
  // video controls ('se', 's', 'sw') or just look weird ('n'; is this a
  // good enough reason not to expose it though?).
  static ALLOWED_POSITIONS: Position[] = ['nw', 'ne', 'e', 'w'];

  #template = `
    <svg viewBox="0 0 80 60">
      <path d="M75.82,24.99v-9.83c3.02-1.67,4.72-5.15,4.02-8.68-.63-3.22-3.21-5.76-6.42-6.34-.49-.09-1-.14-1.49-.14-3.01,0-5.68,1.63-7.09,4.18H15.16C13.76,1.64,11.09.01,8.07.01c-.51,0-1.04.05-1.55.15C3.3.76.74,3.35.14,6.56c-.65,3.51,1.04,6.95,4.04,8.61v9.83C1.63,26.4,0,29.08,0,32.08s1.63,5.68,4.18,7.09v13.22c0,4.2,3.42,7.61,7.61,7.61h56.41c4.2,0,7.61-3.42,7.61-7.61v-13.23c2.55-1.4,4.18-4.07,4.18-7.08s-1.63-5.68-4.18-7.09ZM73.67,37.74v14.64c0,3.02-2.44,5.47-5.47,5.47H11.79c-3.02,0-5.47-2.44-5.47-5.47v-14.64c-2.41-.75-4.18-3-4.18-5.67s1.76-4.92,4.18-5.67v-12.64c-2.76-.85-4.65-3.66-4.07-6.81.43-2.35,2.33-4.25,4.67-4.69.39-.07.78-.11,1.15-.11,0,0,0,0,0,0h.01s0,0,0,0c2.66,0,4.92,1.76,5.67,4.18h52.51c.75-2.41,3-4.18,5.67-4.18.36,0,.73.03,1.1.1,2.34.42,4.25,2.31,4.71,4.64.62,3.16-1.29,6-4.06,6.86v12.64c2.41.75,4.18,3,4.18,5.67s-1.76,4.92-4.18,5.67ZM66.25,9.84H13.76c-.58,1.87-2.05,3.33-3.91,3.91v12.64c2.41.75,4.18,3,4.18,5.67s-1.76,4.92-4.18,5.67v13.54c0,1.68,1.36,3.05,3.04,3.05h54.23c1.68,0,3.04-1.36,3.04-3.05v-13.54c-2.41-.75-4.18-3-4.18-5.67s1.76-4.92,4.18-5.67v-12.64c-1.87-.58-3.33-2.05-3.91-3.91ZM68.02,24.99c-2.55,1.39-4.18,4.07-4.18,7.08s1.63,5.68,4.18,7.09v12.14c0,.49-.41.9-.9.9H12.89c-.49,0-.9-.41-.9-.9v-12.14c2.55-1.4,4.18-4.07,4.18-7.08s-1.63-5.68-4.18-7.09v-9.82c1.34-.74,2.43-1.83,3.17-3.17h0s23.06-.01,23.06-.01h26.63c.74,1.34,1.83,2.43,3.17,3.17v9.83Z"/>
    </svg>
    <div class="position-buttons-container"></div>
    <div class="indicator"></div>
  `;

  #styles = `
    * { box-sizing: border-box }

    :host {
      display: block;
      width: fit-content;
      height: ${rem(60)};
      position: relative;
    }
    
    svg {
      height: 100%;
      fill: #757575;
    }

    .position-buttons-container {
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0; left: 0;

      .position-button {
        appearance: none;
        background: none;
        border: 0;
        height: 27%;
        aspect-ratio: 1/1;
        position: absolute;
        border-radius: 999em;
        padding: 0;
        cursor: pointer;
        outline-offset: ${rem(3)};

        .indicator {
          display: block;
        }
        
        &.position-button-nw { top: 0; left: 0; }
        &.position-button-ne { top: 0; right: 0; }
        &.position-button-e { top: 40%; right: 0; }
        &.position-button-w { top: 40%; left: 0; }
      }
    }

    .indicator {
      display: none;
      width: 45%;
      aspect-ratio: 1/1;
      background-color: var(--base-700);
      border-radius: 999em;
      position: absolute;
      top: 0; left: 0;
      right: 0; bottom: 0;
      margin: auto;
    }

    @media (prefers-color-scheme: dark) {
      svg {
        fill: #848484;
      }

      .indicator {
        background-color: var(--base-400);
      }
    }
  `;

  #shadow: ShadowRoot;
  #indicator: HTMLDivElement;
  #positionButtonsContainer!: HTMLDivElement;
  #positionButtons!: Map<Position, HTMLButtonElement>;

  constructor() {
    super();

    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.innerHTML = this.#template;

    const styles = document.createElement('style');
    styles.textContent = this.#styles;
    this.#shadow.appendChild(styles);

    this.#indicator = this.#shadow.querySelector<HTMLDivElement>('.indicator')!;
    this.#initializePositionButtons();
  }

  setPosition(position: Position) {
    const button = this.#positionButtons.get(position);
    if (button) {
      button.appendChild(this.#indicator);
    }
  }

  #initializePositionButtons() {
    this.#positionButtons = new Map();
    this.#positionButtonsContainer = this.#shadow.querySelector<HTMLDivElement>(
      '.position-buttons-container',
    )!;

    for (const position of PreferredPositionEditor.ALLOWED_POSITIONS) {
      const button = document.createElement('button');
      button.classList.add('position-button', `position-button-${position}`);
      button.title = positionLabels[position];

      button.addEventListener('click', () => {
        this.dispatchEvent(
          customEvent('preferred-position-editor:commit', position),
        );
      });

      this.#positionButtonsContainer.appendChild(button);

      this.#positionButtons.set(position, button);
    }
  }
}

customElements.define('preferred-position-editor', PreferredPositionEditor);
