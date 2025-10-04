/**
 * Converts the given `px`-value to its equivalent in `rem`s
 * (1rem being equal to 16px).
 */
export function rem(size: number) {
  return `${size / 16}rem`;
}

/**
 * For some reason, changes to the styles of some elements in the DOM
 * are not being consistently reflected in Safari due to a style 'freeze',
 * where changes to CSS properties are not taking effect until the element
 * is interacted with in some way.
 *
 * This function fixes such 'freezes' by applying a `scale: 1` style to
 * the frozen element and then removing it immediately.
 *
 * This transpiles to a no-op in non-Safari builds.
 *
 * @param element The element whose 'frozen' state needs fixing
 */
export function fixSafariStyleFreezeForElement(element: HTMLElement) {
  if (import.meta.env.MODE !== 'safari') return;

  element.style.scale = '1';

  requestAnimationFrame(() => {
    element.style.scale = '';
  });
}
