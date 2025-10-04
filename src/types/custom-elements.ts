declare const Brand: unique symbol;

/**
 * A state of a custom element.
 */
export type State = string & { [Brand]: true };

// Floating Buttons
export type Detachment = { x: number; y: number };

export type Position = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

export type DetachmentOrigin = { x: number; y: number };

export type ViewportPosition = { x: number; y: number };

// Floating View
export type FloatingViewHint =
  | 'disableFloatingButtons'
  | 'keyboardShortcuts'
  | 'altSitewideFloatingButtons'
  | 'floatingButtonsMovable'
  | 'reportAnIssue';

export type FloatingViewHints = Record<FloatingViewHint, number>;
