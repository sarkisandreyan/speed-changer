/**
 * A keyboard shortcut binding (= shortcut + action).
 */
export type KeyboardShortcutBinding = {
  action: KeyboardShortcutAction;
  shortcut: string;
};

/**
 * An action that a shortcut can trigger.
 */
export type KeyboardShortcutAction =
  | 'ToggleExtension'
  | 'ToggleFloatingButtons'
  | 'IncreaseSpeed'
  | 'DecreaseSpeed'
  | 'PlayAt0.25x'
  | 'PlayAt0.5x'
  | 'PlayAt0.75x'
  | 'PlayAt1x'
  | 'PlayAt1.25x'
  | 'PlayAt1.5x'
  | 'PlayAt1.75x'
  | 'PlayAt2x'
  | 'PlayAt3x'
  | 'PlayAt4x'
  | 'PlayAt5x'
  | 'PlayAt6x'
  | 'PlayAt7x'
  | 'PlayAt8x'
  | 'PlayAt9x'
  | 'PlayAtMinimumSpeed'
  | 'PlayAtMaximumSpeed';

/**
 * A modifier key, defined as part of this extension as the Control,
 * Alt, and Meta keys. Shift is not considered to be a modifier key
 * because it can't be used alone in keyboard shortcuts.
 */
type ModifierKey = 'Control' | 'Alt' | 'Meta';

/**
 * A modifier key or the Shift key. See {@link ModifierKey} to learn
 * why Shift is not considered a modifier key.
 */
export type ModifierOrShiftKey = ModifierKey | 'Shift';

/**
 * A restrictive list of keys that the extension will acknowledge when
 * creating keyboard shortcuts.
 *
 * `'Command'` is a platform-aware sugar for the Command key on macOS
 * and the Control key elsewhere, but is not used when creating keyboard
 * shortcuts.
 */
export type Key =
  | ModifierOrShiftKey
  | 'Escape'
  | 'Minus'
  | 'NumpadSubtract'
  | 'Equal'
  | 'NumpadEqual'
  | 'Backspace'
  | 'Tab'
  | 'BracketLeft'
  | 'BracketRight'
  | 'Enter'
  | 'NumpadEnter'
  | 'Digit1'
  | 'Numpad1'
  | 'Digit2'
  | 'Numpad2'
  | 'Digit3'
  | 'Numpad3'
  | 'Digit4'
  | 'Numpad4'
  | 'Digit5'
  | 'Numpad5'
  | 'Digit6'
  | 'Numpad6'
  | 'Digit7'
  | 'Numpad7'
  | 'Digit8'
  | 'Numpad8'
  | 'Digit9'
  | 'Numpad9'
  | 'Digit0'
  | 'Numpad0'
  | 'KeyQ'
  | 'KeyW'
  | 'KeyE'
  | 'KeyR'
  | 'KeyT'
  | 'KeyY'
  | 'KeyU'
  | 'KeyI'
  | 'KeyO'
  | 'KeyP'
  | 'KeyA'
  | 'KeyS'
  | 'KeyD'
  | 'KeyF'
  | 'KeyG'
  | 'KeyH'
  | 'KeyJ'
  | 'KeyK'
  | 'KeyL'
  | 'KeyZ'
  | 'KeyX'
  | 'KeyC'
  | 'KeyV'
  | 'KeyB'
  | 'KeyN'
  | 'KeyM'
  | 'Semicolon'
  | 'Quote'
  | 'Backquote'
  | 'Backslash'
  | 'IntlBackslash'
  | 'Comma'
  | 'Period'
  | 'NumpadDecimal'
  | 'Slash'
  | 'NumpadDivide'
  | 'Space'
  | 'CapsLock'
  | 'F1'
  | 'F2'
  | 'F3'
  | 'F4'
  | 'F5'
  | 'F6'
  | 'F7'
  | 'F8'
  | 'F9'
  | 'F10'
  | 'F11'
  | 'F12'
  | 'F13'
  | 'F14'
  | 'F15'
  | 'F16'
  | 'F17'
  | 'F18'
  | 'F19'
  | 'F20'
  | 'F21'
  | 'F22'
  | 'F23'
  | 'NumLock'
  | 'NumpadMultiply'
  | 'NumpadAdd'
  | 'PrintScreen'
  | 'Home'
  | 'End'
  | 'ArrowUp'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowDown'
  | 'PageUp'
  | 'PageDown'
  | 'Insert'
  | 'Delete'
  | 'ContextMenu'
  | 'Command';
