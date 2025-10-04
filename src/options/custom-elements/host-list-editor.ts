import { getNormalizedHost, isValidHost } from '../../utils/hosts';
import { customEvent } from '../../utils/dom';
import { rem } from '../../utils/styles';

export class HostListEditor extends HTMLElement {
  #template = `
    <dialog
      id="host-list-editor-dialog"
      aria-labelledby="host-list-editor-dialog-title"
      closedby="any"
    >
      <header>
        <h4 id="host-list-editor-dialog-title">Manage Exceptions</h4>
        <button id="add-button" aria-label="Add an Exception" title="Add an Exception">
          <span class="add-icon"></span>
        </button>
        <button id="close-button" aria-label="Close Dialog" title="Close Dialog">
          <span class="close-icon"></span>
        </button>
      </header>
      <ul id="host-list"></ul>
    </dialog>;
  `;

  #styles = `
    dialog {
      display: flex;
      flex-direction: column;
      max-width: ${rem(600)};
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
          font-size: 87.5%;
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

          &:not(:disabled) { cursor: pointer }
        }
      }

      #host-list {
        padding: 0;
        margin: 0;
        flex: 1;
        overflow: auto;
        overscroll-behavior: contain;

        li {
          display: flex;
          gap: ${rem(8)};
          padding: ${rem(8)} ${rem(12)};
          border-bottom: ${rem(1)} solid var(--grey-300);

          .host-editor {
            flex: 1;
            appearance: none;
            font: inherit;
            padding: 0;
            border: 0;
            background: none;
            outline-offset: ${rem(4)};
            margin-inline-start: ${rem(32)};

            &:invalid { color: red }
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

          &.no-exceptions {
            justify-content: center;
            border-bottom: 0;
            padding: ${rem(20)} 0;
            color: var(--grey-800);
          }
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
  #hostListEl!: HTMLUListElement;

  #hostList: string[] = [];

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
    this.#hostListEl =
      this.#shadow.querySelector<HTMLUListElement>('#host-list')!;

    this.#initializeDialog();
    this.#initializeAddButton();
    this.#initializeCloseButton();
  }

  setHosts(hosts: string[]) {
    this.#hostList = Array.isArray(hosts) ? [...hosts] : [];
    this.rerenderHostList();
  }

  addHost(host: string) {
    if (this.#hostList.indexOf(host) > -1) return;
    this.#hostList.push(host);
    this.rerenderHostList();
    this.commit();

    this.dispatchEvent(customEvent('host-list-editor:add-host', host));
  }

  removeHost(host: string) {
    this.#hostList = this.#hostList.filter((_host) => _host !== host);
    this.rerenderHostList();
    this.commit();

    this.dispatchEvent(customEvent('host-list-editor:remove-host', host));
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

  rerenderHostList() {
    this.#hostListEl.innerHTML = '';

    if (this.#hostList.length === 0) {
      const listItem = document.createElement('li');
      listItem.classList.add('no-exceptions');
      listItem.textContent = 'No exceptions defined.';
      this.#hostListEl.appendChild(listItem);
      return;
    }

    for (const host of this.#hostList) {
      const listItem = document.createElement('li');
      listItem.textContent = host;
      this.#hostListEl.appendChild(listItem);

      const removeButton = document.createElement('button');
      removeButton.ariaLabel = `Remove ${host}`;
      removeButton.title = `Remove ${host}`;
      removeButton.classList.add('remove-button');
      removeButton.addEventListener('click', () => {
        const nextIndex =
          this.#hostList.length > 1
            ? Math.min(
                this.#hostList.indexOf(host) + 1,
                this.#hostList.length - 1,
              )
            : null;

        if (nextIndex !== null) {
          requestAnimationFrame(() => {
            this.#hostListEl
              .querySelector<HTMLButtonElement>(
                `li:nth-child(${nextIndex}) .remove-button`,
              )
              ?.focus();
          });
        } else {
          this.#closeButtonEl.focus();
        }

        this.removeHost(host);
      });

      listItem.insertAdjacentElement('afterbegin', removeButton);
    }
  }

  commit() {
    this.dispatchEvent(customEvent('host-list-editor:commit', this.#hostList));
  }

  #initializeDialog() {
    this.#dialogEl.addEventListener('close', () => {
      this.remove();
    });
  }

  #initializeAddButton() {
    this.#addButtonEl.addEventListener('click', () => {
      this.#addButtonEl.disabled = true;

      this.#hostListEl.querySelector('.no-exceptions')?.remove();

      const listItem = document.createElement('li');
      const hostEditor = document.createElement('input');
      hostEditor.classList.add('host-editor');

      requestAnimationFrame(() => hostEditor.focus());

      const markAsInvalid = () => {
        hostEditor.setCustomValidity('Please specify a valid host.');
      };

      const markAsValid = () => {
        hostEditor.setCustomValidity('');
      };

      hostEditor.addEventListener('input', () => {
        if (hostEditor.value.length > 0 && !isValidHost(hostEditor.value)) {
          markAsInvalid();
        } else {
          markAsValid();
        }
      });

      hostEditor.addEventListener('focusout', () => {
        listItem.remove();
        this.#addButtonEl.disabled = false;
        this.#addButtonEl.focus();
      });

      hostEditor.addEventListener('keydown', (event) => {
        switch (event.key) {
          case 'Enter':
            event.preventDefault();

            if (hostEditor.value === '') {
              markAsInvalid();
              hostEditor.reportValidity();
              return;
            }

            if (!hostEditor.checkValidity()) {
              hostEditor.reportValidity();
              return;
            }

            const normalizedHost = getNormalizedHost(hostEditor.value);
            this.addHost(normalizedHost);
            this.#addButtonEl.disabled = false;
            this.#addButtonEl.focus();
            break;
          case 'Escape':
            event.preventDefault();
            listItem.remove();
            this.#addButtonEl.disabled = false;
            this.#addButtonEl.focus();
            break;
        }
      });

      listItem.appendChild(hostEditor);
      this.#hostListEl.appendChild(listItem);
    });
  }

  #initializeCloseButton() {
    this.#closeButtonEl.addEventListener('click', () => {
      this.#dialogEl.close();
    });
  }
}

customElements.define('host-list-editor', HostListEditor);
