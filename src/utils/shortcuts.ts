import type { Key, ModifierOrShiftKey } from '../types';
import { getOS } from './platform';

/**
 * Checks whether the Alt key is the only active modifier key in the provided
 * keyboard event (i.e. the Control and Meta keys are not active).
 *
 * Useful for dismissing Alt-only keyboard shortcuts when inside editable fields.
 */
export function hasOnlyAltAsModifierKey(event: KeyboardEvent) {
  return event.altKey && !event.ctrlKey && !event.metaKey;
}

/**
 * Checks whether the provided keyboard event has any active modifier keys
 * (i.e. the Control, Alt, or Meta key).
 */
export function hasActiveModifierKey(event: KeyboardEvent) {
  return event.ctrlKey || event.altKey || event.metaKey;
}

/**
 * Checks whether the provided keyboard event is for the modifier keys
 * Control, Alt, or Meta themselves, or the Shift key itself.
 */
export function isModifierOrShiftKeyEvent({ key }: KeyboardEvent) {
  switch (key) {
    case 'Alt':
    case 'Control':
    case 'Shift':
    case 'Meta':
      return true;
    default:
      return false;
  }
}

/**
 * Extracts the 'raw' shortcut from the keyboard event as stored in the config object,
 * i.e. a string representation of the key code that was pressed together with any active
 * modifier keys (strictly in the order Control, Alt, Shift, and Meta), delimited by '+'.
 *
 * Example return values: `Control+Shift+Digit2`, `Alt+Shift+Period`.
 */
export function getShortcut(event: KeyboardEvent) {
  return `${event.ctrlKey ? 'Control+' : ''}${event.altKey ? 'Alt+' : ''}${
    event.shiftKey ? 'Shift+' : ''
  }${event.metaKey ? 'Meta+' : ''}${event.code}`;
}

/**
 * Returns the shortcut in a platform-specific formatting, e.g. for the 'raw' shortcut
 * 'Ctrl+KeyA', this will return `'⌃A'` and `'Ctrl+A'` in macOS and Windows respectively.
 */
export async function getFormattedShortcut(shortcut: string) {
  const joiner = (await getOS()) !== 'mac' ? '+' : '';
  const segments = shortcut.split('+');
  const modifierKeys = segments.slice(0, -1) as ModifierOrShiftKey[];
  const targetKey = segments[segments.length - 1] as Key;

  const formattedModifierKeys = [].join.call(
    await Promise.all(modifierKeys.map((key) => getKeyName(key))),
    joiner,
  );
  const formattedTargetKey = await getKeyName(targetKey);

  return `${formattedModifierKeys}${joiner}${formattedTargetKey}`;
}

/**
 * Returns the platform-specific name of the given key as seen on a US English keyboard layout,
 * or `null` if the key does not have a name mapped to it.
 *
 * I would very much like to make this utility locale-aware, but after a lot of trial and error
 * I chose to stick to a static mapping like this due to the following reasons:
 *
 * 1. It is not reliably possible to retrieve the locale-aware name of the key by the key code.
 *    The Keyboard API (`navigator.keyboard`) allows for such a retrieval on demand, however its
 *    availability is limited to Chromium only. The only more or less reliable way to retrieve
 *    the locale-aware names of keys is using the `key` property on `KeyboardEvent`, but relying
 *    on a keyboard interaction just to retrieve the name is not ideal. To make use of keyboard
 *    events, we would have to store the `key` as reported at the time of the keyboard event, but
 *    this could give rise to scenarios where two different key bindings that were created at
 *    different times with different keyboard layouts active would contain key names from
 *    different locales — again, not ideal.
 * 2. It does not seem possible to retrieve the 'raw' locale-aware key name that is not affected
 *    by the concurrently active Alt key. For example, when creating a keyboard binding using the
 *    shortcut Control + Alt + U, the browsers would persistently report "¨" as the `key` (or any
 *    other related, even deprecated properties such as `keyIdentifier`) because that is what the
 *    Alt + U presses produce. However, it is essential for the keyboard shortcuts editing dialog
 *    in the extension to display the actual 'raw' key name so as not to confuse the users with
 *    the Alt-produced characters that many of the users may not even be aware of.
 */
export async function getKeyName(key: Key | (string & {})) {
  const os = await getOS();
  const isMac = os === 'mac';
  const isWin = os === 'win';

  switch (key) {
    case 'Control':
      return isMac ? '⌃' : 'Ctrl';
    case 'Alt':
      return isMac ? '⌥' : 'Alt';
    case 'Shift':
      return isMac ? '⇧' : 'Shift';
    case 'Meta':
      return isMac ? '⌘' : isWin ? 'Win' : key;
    case 'Escape':
      return isMac ? '⎋' : 'Esc';
    case 'Minus':
    case 'NumpadSubtract':
      return '-';
    case 'Equal':
    case 'NumpadEqual':
      return '=';
    case 'Backspace':
      return isMac ? '⌫' : key;
    case 'Tab':
      return isMac ? '⇥' : key;
    case 'BracketLeft':
      return '[';
    case 'BracketRight':
      return ']';
    case 'Enter':
    case 'NumpadEnter':
      return isMac ? '⏎' : key;
    case 'Digit1':
    case 'Numpad1':
      return '1';
    case 'Digit2':
    case 'Numpad2':
      return '2';
    case 'Digit3':
    case 'Numpad3':
      return '3';
    case 'Digit4':
    case 'Numpad4':
      return '4';
    case 'Digit5':
    case 'Numpad5':
      return '5';
    case 'Digit6':
    case 'Numpad6':
      return '6';
    case 'Digit7':
    case 'Numpad7':
      return '7';
    case 'Digit8':
    case 'Numpad8':
      return '8';
    case 'Digit9':
    case 'Numpad9':
      return '9';
    case 'Digit0':
    case 'Numpad0':
      return '0';
    case 'KeyQ':
      return 'Q';
    case 'KeyW':
      return 'W';
    case 'KeyE':
      return 'E';
    case 'KeyR':
      return 'R';
    case 'KeyT':
      return 'T';
    case 'KeyY':
      return 'Y';
    case 'KeyU':
      return 'U';
    case 'KeyI':
      return 'I';
    case 'KeyO':
      return 'O';
    case 'KeyP':
      return 'P';
    case 'KeyA':
      return 'A';
    case 'KeyS':
      return 'S';
    case 'KeyD':
      return 'D';
    case 'KeyF':
      return 'F';
    case 'KeyG':
      return 'G';
    case 'KeyH':
      return 'H';
    case 'KeyJ':
      return 'J';
    case 'KeyK':
      return 'K';
    case 'KeyL':
      return 'L';
    case 'KeyZ':
      return 'Z';
    case 'KeyX':
      return 'X';
    case 'KeyC':
      return 'C';
    case 'KeyV':
      return 'V';
    case 'KeyB':
      return 'B';
    case 'KeyN':
      return 'N';
    case 'KeyM':
      return 'M';
    case 'Semicolon':
      return ';';
    case 'Quote':
      return "'";
    case 'Backquote':
      return '`';
    case 'Backslash':
    case 'IntlBackslash':
      return '\\';
    case 'Comma':
      return ',';
    case 'Period':
    case 'NumpadDecimal':
      return '.';
    case 'Slash':
    case 'NumpadDivide':
      return '/';
    case 'Space':
      return isMac ? '␣' : key;
    case 'CapsLock':
      return isMac ? '⇪' : 'Caps Lock';
    case 'F1':
    case 'F2':
    case 'F3':
    case 'F4':
    case 'F5':
    case 'F6':
    case 'F7':
    case 'F8':
    case 'F9':
    case 'F10':
    case 'F11':
    case 'F12':
    case 'F13':
    case 'F14':
    case 'F15':
    case 'F16':
    case 'F17':
    case 'F18':
    case 'F19':
    case 'F20':
    case 'F21':
    case 'F22':
    case 'F23':
      return key;
    case 'NumLock':
      return 'Num Lock';
    case 'NumpadMultiply':
      return '*';
    case 'NumpadAdd':
      return '+';
    case 'PrintScreen':
      return 'Prt Sc';
    case 'Home':
      return isMac ? '↖' : key;
    case 'End':
      return isMac ? '↘' : key;
    case 'ArrowUp':
      return '↑';
    case 'ArrowLeft':
      return '←';
    case 'ArrowRight':
      return '→';
    case 'ArrowDown':
      return '↓';
    case 'PageUp':
      return isMac ? '⇞' : 'PgUp';
    case 'PageDown':
      return isMac ? '⇟' : 'PgDn';
    case 'Insert':
      return key;
    case 'Delete':
      return isMac ? '⌦' : key;
    case 'Command':
      return isMac ? '⌘' : 'Ctrl';
    default:
      return null;
  }
}
