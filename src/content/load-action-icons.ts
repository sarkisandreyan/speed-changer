import iconDimmed from '../assets/graphics/action/icon-dimmed.png?url';
import iconDimmedTinted from '../assets/graphics/action/icon-dimmed-tinted.png?url';
import iconNormal from '../assets/graphics/action/icon-normal.png?url';
import iconFaster from '../assets/graphics/action/icon-faster.png?url';
import iconSlower from '../assets/graphics/action/icon-slower.png?url';

/**
 * The sole purpose of this dummy no-op function is to ensure the `.png` files
 * are correctly resolved in the background script; for some reason, Vite won't
 * correctly resolve `.png` imports inside the background script unless they are
 * imported somewhere in the content script too.
 */
function noop(...args: any[]) {
  args;
}

noop(iconDimmed, iconDimmedTinted, iconNormal, iconFaster, iconSlower);
