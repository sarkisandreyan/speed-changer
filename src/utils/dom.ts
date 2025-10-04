import type { Position } from '../types';

/**
 * Creates a custom event of the given type with the given `detail`.
 *
 * The event bubbles by default unless instructed otherwise by specifying
 * `{ bubbles: false }` in the `config` parameter.
 *
 * @param type The type of the custom event
 * @param detail The data (`detail`) of the custom event
 * @param config The event init configuration
 * @param target When specified, overrides the default target of the event
 */
export function customEvent<T = any>(
  type: string,
  detail?: T,
  config?: EventInit,
  target?: EventTarget,
) {
  const defaultConfig: EventInit = {
    bubbles: true,
  };

  const event = new CustomEvent(type, {
    detail,
    ...defaultConfig,
    ...config,
  });

  if (target) {
    Object.defineProperty(event, 'target', {
      value: target,
    });
  }

  return event;
}

/**
 * Checks whether the given object is a `Node`.
 *
 * Useful because between different JavaScript execution 'realms' that
 * form part of the extension, `target instanceof Node` checks sometimes
 * incorrectly return `false`.
 */
export function isNode(node: object): node is Node {
  return 'nodeType' in node && typeof node.nodeType === 'number';
}

/**
 * Checks whether the given object is an `HTMLElement`.
 *
 * Useful because between different JavaScript execution 'realms' that
 * form part of the extension, `target instanceof HTMLElement` checks
 * sometimes incorrectly return `false`.
 */
export function isHTMLElement(element: unknown): element is HTMLElement {
  return (
    typeof element === 'object' &&
    element !== null &&
    isNode(element) &&
    'contentEditable' in element
  );
}

/**
 * Determines whether the given HTML element is in a right-to-left layout.
 */
export function isRTL(element: HTMLElement) {
  return element.matches(':dir(rtl)');
}

/**
 * Checks whether the provided HTML element is editable, i.e. is a non-disabled and
 * non-readonly form element, or a content-editale element, or is in a document
 * whose `designMode` is `'on'`.
 */
export function isEditableElement(element: HTMLElement) {
  return (
    element.ownerDocument.designMode === 'on' ||
    (['INPUT', 'SELECT', 'TEXTAREA'].indexOf(element.tagName) > -1 &&
      !element.matches(':is(:disabled, :read-only)')) ||
    element.isContentEditable
  );
}

/**
 * Determines the effective position of floating buttons based on the directionality
 * of the media element they should be attached to, taking into account whether
 * mirroring is enabled for right-to-left layouts.
 *
 * @param element The media element
 * @param preferredPosition The preferred position (for LTR layouts)
 * @param shouldMirror Whether RTL mirroring is enabled
 */
export function getEffectivePosition(
  element: HTMLMediaElement,
  preferredPosition: Position,
  shouldMirror: boolean,
): Position {
  if (!shouldMirror || !isRTL(element)) {
    return preferredPosition;
  }

  switch (preferredPosition) {
    case 'nw':
      return 'ne';
    case 'ne':
      return 'nw';
    case 'e':
      return 'w';
    case 'se':
      return 'sw';
    case 'sw':
      return 'se';
    case 'w':
      return 'e';
    default:
      return preferredPosition;
  }
}

/**
 * Adjusts the width for text fields that should fit their contents.
 *
 * @param element The text field that needs adjusting
 * @param minWidth The minimum width to apply to the field
 */
export function adjustWidthForInput(
  element: HTMLInputElement | HTMLTextAreaElement,
  minWidth: number = 0,
) {
  element.style.width = `${minWidth}px`;
  element.style.width = `${element.scrollWidth}px`;
}
