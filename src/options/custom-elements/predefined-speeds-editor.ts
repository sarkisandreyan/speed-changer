import { customEvent } from '../../utils/dom';
import { rem } from '../../utils/styles';

export class PredefinedSpeedsEditor extends HTMLElement {
  #template = `
    <div id="predefined-speeds"></div>
    <div id="action-buttons">
      <button id="add-button" hidden>Add</button>
      <button id="customize-button"></button>
    </div>
  `;

  #styles = `
    * {  box-sizing: border-box }

    @keyframes shaking-editor {
      from { transform: rotate(7.5deg) }
      to { transform: rotate(-7.5deg) }
    }

    :host {
      display: flex;
      flex-direction: column;
      align-items: end;
      gap: ${rem(4)};
      color-scheme: light dark;
    }

    #predefined-speeds {
      display: flex;
      gap: ${rem(6)};
      transition: gap 250ms;

      .predefined-speed {
        position: relative;
      }

      .speed-editor {
        appearance: none;
        border: ${rem(1)} solid currentColor;
        color: var(--base-800);
        border-radius: 999em;
        font: inherit;
        font-size: ${rem(14)};
        font-weight: 500;
        background: none;
        padding: 0;
        width: ${rem(32)};
        height: ${rem(32)};
        line-height: ${rem(32)};
        text-align: center;
        outline-offset: ${rem(4)};

        &.smaller {
          font-size: ${rem(12)};
        }

        &.smallest {
          font-size: ${rem(10)};
        }

        &:read-only {
          cursor: default;
        }

        &:invalid {
          color: red;
        }
      }

      .remove-button {
        appearance: none;
        position: absolute;
        inset-block-start: ${rem(-6)};
        inset-inline-end: ${rem(-8)};
        background: #fff;
        color: var(--base-800);
        width: ${rem(20)}; height: ${rem(20)};
        border: ${rem(1)} solid currentColor;
        border-radius: 999em;
        padding: 0;
        z-index: 1;
        cursor: pointer;

        &::before {
          content: '\\E005';
          font-family: 'Speed Changer Icons';
          font-size: ${rem(8.8)};
          line-height: 1;
        }

        &:disabled {
          color: color-mix(in srgb, var(--base-800), transparent);
          cursor: default;
        }
      }

      &.editing {
        gap: ${rem(12)};

        .speed-editor {
          border-width: ${rem(1.5)};
          border-style: dashed;

          &:not(:focus) {
            animation: shaking-editor alternate linear 250ms infinite;
          }
        }
      }
    }

    #action-buttons {
      gap: ${rem(8)};

      button {
        zoom: 0.875;
      }
    }

    @media (-moz-device-pixel-ratio) {
      #predefined-speeds {
        .speed-editor {
          outline-offset: 0;
        }
      }

      #action-buttons {
        button {
          /* Additionally reduce the font size inside the button
             as well because solely chaning 'zoom' does not reduce
             the font size in Firefox for some reason. */
          zoom: 80%;
          font-size: 80%;
        }
      }
    }

    @media (-webkit-transform-2d) {
      #predefined-speeds {
        .speed-editor {
          outline-offset: 0;
        }
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .speed-editor {
        animation: none !important;
      }
    }

    @media (prefers-color-scheme: dark) {
      #predefined-speeds {
        .speed-editor {
          color: var(--base-400);
        }

        .remove-button {
          color: var(--base-400);
          background-color: var(--grey-1000);
        }
      }
    }
  `;

  #shadow: ShadowRoot;
  #predefinedSpeedsEl: HTMLDivElement;
  #addButtonEl: HTMLButtonElement;
  #customizeButtonEl: HTMLButtonElement;
  #addEditorEl: HTMLInputElement | null = null;

  #predefinedSpeeds: number[] = [];
  #minimumSpeed!: number;
  #maximumSpeed!: number;

  #adding: boolean = false;
  #editing: boolean = false;

  constructor() {
    super();

    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.innerHTML = this.#template;

    const styles = document.createElement('style');
    styles.textContent = this.#styles;
    this.#shadow.appendChild(styles);

    this.#predefinedSpeedsEl =
      this.#shadow.querySelector<HTMLDivElement>('#predefined-speeds')!;
    this.#addButtonEl =
      this.#shadow.querySelector<HTMLButtonElement>('#add-button')!;
    this.#customizeButtonEl =
      this.#shadow.querySelector<HTMLButtonElement>('#customize-button')!;

    this.#initializeAddButton();
    this.#initializeCustomizeButton();
  }

  setSpeeds(speeds: number[]) {
    this.#predefinedSpeeds = [...speeds];
    this.rerenderPredefinedSpeeds();
  }

  rerenderPredefinedSpeeds() {
    this.#predefinedSpeedsEl.innerHTML = '';

    if (this.#editing) {
      this.#addButtonEl.hidden = false;
      this.#customizeButtonEl.textContent = 'Done';
      this.#predefinedSpeedsEl.classList.add('editing');
    } else {
      this.#addButtonEl.hidden = true;
      this.#customizeButtonEl.textContent = 'Modify';
      this.#predefinedSpeedsEl.classList.remove('editing');
    }

    this.#addButtonEl.disabled =
      this.#adding || this.#predefinedSpeeds.length >= 7;

    for (const [index, speed] of this.#predefinedSpeeds.entries()) {
      const predefinedSpeed = document.createElement('div');
      predefinedSpeed.classList.add('predefined-speed');

      const speedEditor = document.createElement('input');
      speedEditor.maxLength = 6;
      speedEditor.type = 'text';
      speedEditor.disabled = !this.#editing;
      speedEditor.classList.add('speed-editor');
      speedEditor.value = `${speed}x`;

      if (String(speed).length > 3) {
        speedEditor.classList.add('smallest');
      } else if (String(speed).length > 2) {
        speedEditor.classList.add('smaller');
      }

      if (!this.#editing) {
        speedEditor.role = 'presentation';
        speedEditor.tabIndex = -1;
      } else {
        this.#trackEditableSpeedValue(
          speedEditor,
          this.#predefinedSpeeds.filter((_speed) => _speed !== speed),
        ).then((speed) => {
          if (!speed) return;

          this.#predefinedSpeeds.splice(index, 1, speed);
          this.commit();

          // TODO: It is impossible to maintain predictable focus here because of
          // the rerendering that is being done. I should get rid of the rerenders
          // and keep the DOM as minimally changed as possible.
          this.#customizeButtonEl.focus();
        });
      }

      predefinedSpeed.appendChild(speedEditor);

      if (this.#editing) {
        const removeButton = document.createElement('button');
        removeButton.title = 'Remove Speed';
        removeButton.disabled = this.#predefinedSpeeds.length <= 3;
        removeButton.classList.add('remove-button');

        removeButton.addEventListener('click', () => {
          this.#predefinedSpeeds = this.#predefinedSpeeds.filter(
            (_speed) => _speed !== speed,
          );
          this.commit();
          this.#customizeButtonEl.focus();
        });

        predefinedSpeed.appendChild(removeButton);
      }

      this.#predefinedSpeedsEl.appendChild(predefinedSpeed);
    }

    if (this.#adding) {
      this.#addEditorEl = document.createElement('input');
      this.#addEditorEl.classList.add('speed-editor');
      this.#addEditorEl.type = 'text';
      this.#addEditorEl.value = 'x';

      this.#trackEditableSpeedValue(this.#addEditorEl).then((speed) => {
        if (!speed) {
          this.#adding = false;
          this.rerenderPredefinedSpeeds();
          this.#addButtonEl.focus();
          return;
        }

        this.#adding = false;
        this.#predefinedSpeeds = [...this.#predefinedSpeeds, speed];
        this.commit();

        if (document.activeElement === document.body) {
          this.#customizeButtonEl.focus();
        }
      });

      this.#predefinedSpeedsEl.appendChild(this.#addEditorEl);
    } else {
      this.#addEditorEl = null;
    }
  }

  commit() {
    this.dispatchEvent(
      customEvent(
        'predefined-speeds-editor:commit',
        this.#predefinedSpeeds.sort(),
      ),
    );
  }

  setMinimumSpeed(speed: number) {
    this.#minimumSpeed = speed;
  }

  setMaximumSpeed(speed: number) {
    this.#maximumSpeed = speed;
  }

  release() {
    this.#editing = false;
    this.rerenderPredefinedSpeeds();
  }

  #initializeAddButton() {
    this.#addButtonEl.addEventListener('click', () => {
      this.#adding = true;
      this.rerenderPredefinedSpeeds();

      requestAnimationFrame(() => {
        if (!this.#addEditorEl) return;

        this.#addEditorEl.focus();
        this.#addEditorEl.setSelectionRange(0, 0);
      });
    });
  }

  #initializeCustomizeButton() {
    this.#customizeButtonEl.addEventListener('click', () => {
      const editing = !this.#editing;
      if (!editing) {
        this.#adding = false;
      } else {
        requestAnimationFrame(() => {
          if (!this.#addButtonEl.disabled) {
            this.#addButtonEl.focus();
          }
        });
      }
      this.#editing = editing;
      this.rerenderPredefinedSpeeds();
    });
  }

  #trackEditableSpeedValue(
    element: HTMLInputElement,
    speeds: number[] = this.#predefinedSpeeds,
  ) {
    return new Promise<number | null>((resolve) => {
      element.addEventListener('keydown', (event) => {
        switch (event.key) {
          case 'Enter':
            requestAnimationFrame(() => {
              if (element.checkValidity()) {
                this.#customizeButtonEl.focus();
              }
            });
            return;
          case 'Escape':
            resolve(null);
            return;
        }
      });
      element.addEventListener('focusin', () => {
        requestAnimationFrame(() => {
          element.setSelectionRange(0, element.value.length - 1);
        });
      });

      element.addEventListener('beforeinput', (event) => {
        if (!event.data) return;

        // Only allow digits and floating points to be typed in
        if (!event.data.match(/^[\d.]+$/)) {
          event.preventDefault();
        }
      });

      element.addEventListener('input', () => {
        element.setCustomValidity('');
        element.classList.remove('smaller', 'smallest');
        if (element.value.length > 4) {
          element.classList.add('smallest');
          return;
        }
        if (element.value.length > 3) {
          element.classList.add('smaller');
          return;
        }
      });

      element.addEventListener('change', () => {
        const speed = Number.parseFloat(element.value);

        if (Number.isNaN(speed)) {
          element.setCustomValidity('Invalid speed.');
          element.reportValidity();
          return;
        }

        if (speed < this.#minimumSpeed) {
          element.setCustomValidity(
            `The speed must be higher than ${this.#minimumSpeed}x.`,
          );
          element.reportValidity();
          return;
        }

        if (speed > this.#maximumSpeed) {
          element.setCustomValidity(
            `The speed must be lower than ${this.#maximumSpeed}x.`,
          );
          element.reportValidity();
          return;
        }

        if (speeds.some((_speed) => _speed === speed)) {
          element.setCustomValidity(`The speed ${speed}x already exists.`);
          element.reportValidity();
          return;
        }

        element.setCustomValidity('');

        const roundedSpeed = +String(speed).replace(/(?<=\.\d{2}).*$/, '');
        resolve(roundedSpeed);
      });
    });
  }
}

customElements.define('predefined-speeds-editor', PredefinedSpeedsEditor);
