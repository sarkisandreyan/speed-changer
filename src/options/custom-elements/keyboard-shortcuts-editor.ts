import type {
  KeyboardShortcutAction,
  KeyboardShortcutBinding,
} from '../../types';
import { customEvent } from '../../utils/dom';
import { rem } from '../../utils/styles';
import {
  getFormattedShortcut,
  getKeyName,
  getShortcut,
  hasActiveModifierKey,
  isModifierOrShiftKeyEvent,
} from '../../utils/shortcuts';

const formattedShortcutsCache = new Map<string, string>();

const actionLabels: Record<KeyboardShortcutAction, string> = {
  ToggleExtension: 'Toggle Extension',
  ToggleFloatingButtons: 'Toggle Floating Buttons',
  IncreaseSpeed: 'Increase Speed',
  DecreaseSpeed: 'Decrease Speed',
  'PlayAt0.25x': 'Play at 0.25x',
  'PlayAt0.5x': 'Play at 0.5x',
  'PlayAt0.75x': 'Play at 0.75x',
  PlayAt1x: 'Play at 1x',
  'PlayAt1.25x': 'Play at 1.25x',
  'PlayAt1.5x': 'Play at 1.5x',
  'PlayAt1.75x': 'Play at 1.75x',
  PlayAt2x: 'Play at 2x',
  PlayAt3x: 'Play at 3x',
  PlayAt4x: 'Play at 4x',
  PlayAt5x: 'Play at 5x',
  PlayAt6x: 'Play at 6x',
  PlayAt7x: 'Play at 7x',
  PlayAt8x: 'Play at 8x',
  PlayAt9x: 'Play at 9x',
  PlayAtMinimumSpeed: 'Play at the Minimum Speed',
  PlayAtMaximumSpeed: 'Play at the Maximum Speed',
};

export class KeyboardShortcutsEditorItem extends HTMLElement {
  #template = `
    <button
      class="remove-button"
      title="Remove Shortcut"
      aria-label="Remove Shortcut"
    ></button>
    <span class="action-name"></span>
    <select class="action-picker" aria-label="Pick an Action" hidden></select>
    <input
      type="text"
      aria-label="Pick a Shortcut"
      class="shortcut-editor"
    />
  `;

  #styles = `
    :host {
      display: flex;
      gap: ${rem(8)};
      padding: ${rem(4)} ${rem(12)};
      height: ${rem(40)};
      align-items: center;
      border-bottom: ${rem(1)} solid var(--grey-300);
      box-sizing: border-box;
    }

    .remove-button {
      appearance: none;
      display: flex;
      justify-content: center;
      align-items: center;
      border: 0;
      background: none;
      padding: 0;
      font: inherit;
      font-size: ${rem(12)};
      width: ${rem(24)};
      height: ${rem(24)};
      cursor: pointer;

      &::before {
        content: '\\E005';
        font-family: 'Speed Changer Icons';
        line-height: 1;
      }
    }

    .action-picker {
      font-size: inherit;
      height: 85%;
    }

    .shortcut-editor {
      margin-inline-start: auto;
      text-align: end;
      max-width: ${rem(100)};
      font-size: 87.5%;
      font-family: inherit;
      font-feature-settings: 'ss02' 1;
      color: var(--grey-800);
      height: ${rem(24)};
      border: 0;
      padding: 0;
      background: none;

      &:invalid { color: red }
      &:disabled { background-color: inherit }
    }

    @media (prefers-color-scheme: dark) {
      :host {
        border-color: var(--grey-800);
      }

      .shortcut-editor {
        color: var(--grey-400);
      }
    }
  `;

  #shadow!: ShadowRoot;

  #removeButtonEl!: HTMLButtonElement;
  #actionNameEl!: HTMLSpanElement;
  #actionPickerEl!: HTMLSelectElement;
  #shortcutEditorEl!: HTMLInputElement;

  #binding: Partial<KeyboardShortcutBinding> = {};
  #unavailableActions: KeyboardShortcutAction[] = [];
  #unavailableShortcuts: string[] = [];

  constructor() {
    super();

    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.innerHTML = this.#template;

    const styles = document.createElement('style');
    styles.textContent = this.#styles;
    this.#shadow.appendChild(styles);

    this.#removeButtonEl =
      this.#shadow.querySelector<HTMLButtonElement>('.remove-button')!;
    this.#actionNameEl =
      this.#shadow.querySelector<HTMLSpanElement>('.action-name')!;
    this.#actionPickerEl =
      this.#shadow.querySelector<HTMLSelectElement>('.action-picker')!;
    this.#shortcutEditorEl =
      this.#shadow.querySelector<HTMLInputElement>('.shortcut-editor')!;

    this.#initializeRemoveButton();
    this.#initializeActionPicker();
    this.#initializeShortcutEditor();
  }

  connectedCallback() {
    this.role = 'listitem';
  }

  focusRemoveButton() {
    this.#removeButtonEl.focus();
  }

  focusActionPicker() {
    this.#actionPickerEl.focus();
  }

  focusItem() {
    this.tabIndex = -1;
    this.addEventListener('focusout', () => this.setAttribute('tabindex', ''), {
      once: true,
    });
    this.focus();
  }

  async setBinding(binding: KeyboardShortcutBinding) {
    const { action, shortcut } = binding;

    let formattedShortcut: string;
    if (formattedShortcutsCache.has(shortcut)) {
      formattedShortcut = formattedShortcutsCache.get(shortcut)!;
    } else {
      formattedShortcut = await getFormattedShortcut(shortcut);
      formattedShortcutsCache.set(shortcut, formattedShortcut);
    }

    this.#actionNameEl.textContent = actionLabels[action];
    this.setShortcutEditorValue(formattedShortcut);

    this.#binding = { ...binding };
  }

  setUnavailableActions(actions: KeyboardShortcutAction[]) {
    this.#unavailableActions = [...actions];
  }

  setUnavailableShortcuts(shortcuts: string[]) {
    this.#unavailableShortcuts = [...shortcuts];
  }

  setEditable() {
    const availableActions = Object.keys(actionLabels).filter(
      (action) =>
        this.#unavailableActions.indexOf(action as KeyboardShortcutAction) ===
        -1,
    ) as KeyboardShortcutAction[];

    this.#actionNameEl.hidden = true;
    this.#actionPickerEl.hidden = false;
    this.#shortcutEditorEl.disabled = true;
    this.setShortcutEditorValue('unset');

    const blankOption = document.createElement('option');
    blankOption.value = '';
    blankOption.textContent = 'Select an Action';
    this.#actionPickerEl.appendChild(blankOption);

    for (const action of availableActions) {
      const option = document.createElement('option');
      option.value = action;
      option.textContent = actionLabels[action];
      this.#actionPickerEl.appendChild(option);
    }
  }

  setShortcutEditorValue(value: string) {
    this.#shortcutEditorEl.value = value;
    this.#shortcutEditorEl.style.minWidth = '';
    requestAnimationFrame(() => {
      this.#shortcutEditorEl.style.minWidth = `${
        this.#shortcutEditorEl.scrollWidth
      }px`;
    });
  }

  #initializeRemoveButton() {
    this.#removeButtonEl.addEventListener('click', () => {
      this.dispatchEvent(
        customEvent('keyboard-shortcuts-editor-item:remove', this.#binding),
      );
    });
  }

  #initializeActionPicker() {
    this.#actionPickerEl.addEventListener('change', () => {
      const action = this.#actionPickerEl.value as KeyboardShortcutAction;
      if (action) {
        this.#shortcutEditorEl.disabled = false;
        this.#binding.action = action;
      } else {
        this.#shortcutEditorEl.disabled = true;
        this.#binding.action = undefined;
      }
    });
  }

  #initializeShortcutEditor() {
    this.#shortcutEditorEl.addEventListener('focusin', () => {
      this.setShortcutEditorValue('');
    });

    this.#shortcutEditorEl.addEventListener('focusout', async () => {
      if (
        !this.#shortcutEditorEl.value ||
        !this.#shortcutEditorEl.checkValidity()
      ) {
        const formattedShortcut = this.#binding.shortcut
          ? formattedShortcutsCache.get(this.#binding.shortcut)!
          : 'unset';
        this.setShortcutEditorValue(formattedShortcut);
        this.#shortcutEditorEl.setCustomValidity('');
      }
    });

    this.#shortcutEditorEl.addEventListener('keydown', async (event) => {
      if (!hasActiveModifierKey(event)) {
        switch (event.key) {
          case 'Escape':
            event.preventDefault();
            this.#shortcutEditorEl.blur();
            return;
          case 'Tab':
            return;
        }
      }

      event.preventDefault();

      if (isModifierOrShiftKeyEvent(event) || !hasActiveModifierKey(event))
        return;

      const keyName = await getKeyName(event.code);
      if (!keyName) return;

      const shortcut = getShortcut(event);
      const formattedShortcut = await getFormattedShortcut(shortcut);

      if (
        this.#unavailableShortcuts.indexOf(shortcut) > -1 &&
        shortcut !== this.#binding.shortcut
      ) {
        this.#shortcutEditorEl.setCustomValidity(
          'This binding is already in use.',
        );
        this.#shortcutEditorEl.reportValidity();
      } else {
        this.#shortcutEditorEl.setCustomValidity('');
        this.#binding.shortcut = shortcut;

        this.dispatchEvent(
          customEvent<KeyboardShortcutBinding>(
            'keyboard-shortcuts-editor-item:commit',
            {
              action: this.#binding.action!,
              shortcut: this.#binding.shortcut,
            },
          ),
        );
      }

      this.setShortcutEditorValue(formattedShortcut);
    });
  }
}

export class KeyboardShortcutsEditor extends HTMLElement {
  #template = `
    <dialog
      id="keyboard-shortcuts-editor-dialog"
      aria-labelledby="keyboard-shortcuts-editor-dialog-title"
      closedby="any"
    >
      <header>
        <h4 id="keyboard-shortcuts-editor-dialog-title">Modify Keyboard Shortcuts</h4>
        <button id="add-button" aria-label="Add a Shortcut" title="Add a Shortcut">
          <span class="add-icon"></span>
        </button>
        <button id="close-button" aria-label="Close Dialog" title="Close Dialog">
          <span class="close-icon"></span>
        </button>
      </header>
      <ul id="bindings-list"></ul>
    </dialog>;
  `;

  #styles = `
    dialog {
      display: flex;
      flex-direction: column;
      max-width: ${rem(512)};
      max-height: ${rem(400)};
      height: 100%;
      width: 100%;
      border: ${rem(1)} solid var(--grey-400);
      border-radius: ${rem(14)};
      padding: 0;
      color: inherit;
      box-shadow: 0 ${rem(5)} ${rem(20)} color-mix(in srgb, var(--grey-800), transparent);

      header {
        display: flex;
        align-items: center;
        gap: ${rem(8)};
        padding: ${rem(12)} ${rem(16)};
        border-bottom: ${rem(1)} solid var(--grey-300);
        background-color: var(--base-100);

        h4 {
          font-weight: normal;
          font-variation-settings: 'wght' 500;
          font-size: ${rem(16)};
          margin-inline: 0 auto;
          margin-block: 0;
        }

        button {
          appearance: none;
          border: 0;
          background: none;
          padding: 0;
          font-size: 80%;
          line-height: 1;
          width: 1.5em;
          height: 1.5em;
          
          span {
            &::before {
              display: block;
              font-family: 'Speed Changer Icons';
            }

            &.add-icon::before { content: '\\E004' }
            &.close-icon::before { content: '\\E005' }
          }

          &:not(:disabled) { cursor: pointer; }
        }
      }

      #bindings-list {
        padding: 0;
        margin: 0;
        flex: 1;
        overflow: auto;
        overscroll-behavior: contain;

        .no-shortcuts {
          text-align: center;
          border-bottom: 0;
          padding: ${rem(20)} 0;
          color: var(--grey-800);
        }
      }

      &::backdrop {
        backdrop-filter: blur(${rem(12)});
      }
    }

    @media (prefers-color-scheme: dark) {
      dialog {
        background-color: #3b3b3b;
        border-color: var(--grey-800);

        header {
          background-color: var(--grey-900);
          border-bottom: 0;
        }

        #host-list {
          li { border-color: var(--grey-800) }
        }
      }
    }
  `;

  #shadow!: ShadowRoot;
  #dialogEl!: HTMLDialogElement;
  #addButtonEl!: HTMLButtonElement;
  #closeButtonEl!: HTMLButtonElement;
  #bindingsListEl!: HTMLUListElement;

  #editableItem: KeyboardShortcutsEditorItem | null = null;

  #bindings: KeyboardShortcutBinding[] = [];

  constructor() {
    super();

    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#shadow.innerHTML = this.#template;

    const styles = document.createElement('style');
    styles.textContent = this.#styles;
    this.#shadow.appendChild(styles);

    this.#dialogEl = this.#shadow.querySelector<HTMLDialogElement>('dialog')!;
    this.#addButtonEl =
      this.#shadow.querySelector<HTMLButtonElement>('#add-button')!;
    this.#closeButtonEl =
      this.#shadow.querySelector<HTMLButtonElement>('#close-button')!;
    this.#bindingsListEl =
      this.#shadow.querySelector<HTMLUListElement>('#bindings-list')!;

    this.#initializeDialog();
    this.#initializeAddButton();
    this.#initializeCloseButton();
  }

  setBindings(bindings: KeyboardShortcutBinding[]) {
    this.#bindings = [...bindings];
    this.rerenderBindingsList();
  }

  connectedCallback() {
    this.#dialogEl.showModal();
    if (import.meta.env.MODE === 'safari') {
      // Add a slight delay to focusing the close button
      // because Safari for some reason does not show the
      // focus ring around the close button if focus is
      // moved immediately.
      setTimeout(() => this.#closeButtonEl.focus(), 20);
    } else {
      this.#closeButtonEl.focus();
    }
  }

  rerenderBindingsList() {
    this.#bindingsListEl.innerHTML = '';

    if (this.#bindings.length === 0 && !this.#editableItem) {
      const listItem = document.createElement('li');
      listItem.classList.add('no-shortcuts');
      listItem.textContent = 'No shortcuts defined.';
      this.#bindingsListEl.appendChild(listItem);
      return;
    }

    const unavailableShortcuts = this.#bindings.map(({ shortcut }) => shortcut);

    for (const [index, binding] of this.#bindings.entries()) {
      const item = document.createElement(
        'keyboard-shortcuts-editor-item',
      ) as KeyboardShortcutsEditorItem;
      item.setBinding(binding);
      item.setUnavailableShortcuts(unavailableShortcuts);

      item.addEventListener(
        'keyboard-shortcuts-editor-item:remove',
        (event) => {
          this.#bindings.splice(index, 1);
          this.rerenderBindingsList();
          this.commit();

          this.dispatchEvent(
            customEvent(
              'keyboard-shortcuts-editor:remove-item',
              (event as CustomEvent<KeyboardShortcutBinding>).detail,
            ),
          );

          requestAnimationFrame(() => {
            if (this.#bindings.length === 0) {
              this.#addButtonEl.focus();
              return;
            }

            const items =
              this.#bindingsListEl.querySelectorAll<KeyboardShortcutsEditorItem>(
                'keyboard-shortcuts-editor-item',
              );
            const targetItem = items[index] ?? items[index - 1];
            targetItem.focusRemoveButton();
          });
        },
      );

      item.addEventListener(
        'keyboard-shortcuts-editor-item:commit',
        (event) => {
          const binding = (event as CustomEvent<KeyboardShortcutBinding>)
            .detail;
          this.#bindings.splice(index, 1, binding);
          this.rerenderBindingsList();
          this.commit();

          this.dispatchEvent(
            customEvent('keyboard-shortcuts-editor:edit-item', binding),
          );

          requestAnimationFrame(() => {
            this.getListElements()[index]?.focusItem();
          });
        },
      );

      this.#bindingsListEl.appendChild(item);
    }

    if (this.#editableItem) {
      this.#bindingsListEl.appendChild(this.#editableItem);
    }
  }

  getListElements() {
    return [].slice.call(
      this.#bindingsListEl.querySelectorAll('keyboard-shortcuts-editor-item'),
    ) as KeyboardShortcutsEditorItem[];
  }

  commit() {
    this.dispatchEvent(
      customEvent('keyboard-shortcuts-editor:commit', this.#bindings),
    );
  }

  #initializeDialog() {
    this.#dialogEl.addEventListener('close', () => {
      formattedShortcutsCache.clear();
      this.remove();
    });
  }

  #initializeAddButton() {
    this.#addButtonEl.addEventListener('click', () => {
      const unavailableActions = this.#bindings.map(({ action }) => action);
      const unavailableShortcuts = this.#bindings.map(
        ({ shortcut }) => shortcut,
      );

      this.#editableItem = document.createElement(
        'keyboard-shortcuts-editor-item',
      ) as KeyboardShortcutsEditorItem;

      this.#editableItem.setUnavailableActions(unavailableActions);
      this.#editableItem.setUnavailableShortcuts(unavailableShortcuts);
      this.#editableItem.setEditable();

      this.#editableItem.addEventListener(
        'keyboard-shortcuts-editor-item:remove',
        () => {
          this.#editableItem = null;
          this.rerenderBindingsList();
          this.#addButtonEl.disabled = false;

          requestAnimationFrame(() => {
            this.#bindingsListEl
              .querySelector<KeyboardShortcutsEditorItem>(
                'keyboard-shortcuts-editor-item:last-child',
              )
              ?.focusRemoveButton();
          });
        },
      );

      this.#editableItem.addEventListener(
        'keyboard-shortcuts-editor-item:commit',
        (event) => {
          const binding = (event as CustomEvent<KeyboardShortcutBinding>)
            .detail;
          this.#bindings.push(binding);

          this.#editableItem = null;
          this.rerenderBindingsList();
          this.commit();

          this.#addButtonEl.disabled = false;
          this.#addButtonEl.focus();

          this.dispatchEvent(
            customEvent('keyboard-shortcuts-editor:add-item', binding),
          );
        },
      );

      this.rerenderBindingsList();
      this.#addButtonEl.disabled = true;

      requestAnimationFrame(() => {
        this.#editableItem!.focusActionPicker();
      });
    });
  }

  #initializeCloseButton() {
    this.#closeButtonEl.addEventListener('click', () => {
      this.#dialogEl.close();
    });
  }
}

customElements.define('keyboard-shortcuts-editor', KeyboardShortcutsEditor);
customElements.define(
  'keyboard-shortcuts-editor-item',
  KeyboardShortcutsEditorItem,
);
