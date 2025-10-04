import { BehaviorSubject, fromEvent, skip } from 'rxjs';
import { getOS } from './utils/platform';

const os = await getOS();

class KeyStateStore {
  #valueStore: BehaviorSubject<boolean>;

  constructor(initialValue: boolean = false) {
    this.#valueStore = new BehaviorSubject<boolean>(initialValue);
  }

  set pressed(value: boolean) {
    this.#valueStore.next(value);
  }

  get pressed(): boolean {
    return this.#valueStore.getValue();
  }

  get changes() {
    return this.#valueStore.asObservable().pipe(skip(1));
  }
}

fromEvent<KeyboardEvent>(window, 'keydown', { capture: true }).subscribe(
  ({ key }) => {
    switch (key) {
      case 'Alt':
        altKey.pressed = true;
        break;
      case 'Meta':
        if (os === 'mac') {
          commandKey.pressed = true;
        }
        break;
      case 'Control':
        if (os !== 'mac') {
          commandKey.pressed = true;
        }
        break;
    }
  },
);

fromEvent<KeyboardEvent>(window, 'keyup', { capture: true }).subscribe(
  ({ key }) => {
    switch (key) {
      case 'Alt':
        altKey.pressed = false;
        break;
      case 'Meta':
        if (os === 'mac') {
          commandKey.pressed = false;
        }
        break;
      case 'Control':
        if (os !== 'mac') {
          commandKey.pressed = false;
        }
        break;
    }
  },
);

// Change pressed state of keys to 'not pressed' when document loses focus.
// This prevents cases where, for example, pressing ⌘T to open a new tab
// when hovering over a floating button keeps that floating button stuck
// in a movable state when returning to the current tab.
fromEvent(document, 'visibilitychange', { capture: true }).subscribe(() => {
  if (document.visibilityState === 'hidden') {
    altKey.pressed = false;
    commandKey.pressed = false;
  }
});

export const altKey = new KeyStateStore();
/**
 * A platform-aware store for the command key state, which corresponds
 * to the Command key on macOS, and Control key on other platforms.
 */
export const commandKey = new KeyStateStore();
