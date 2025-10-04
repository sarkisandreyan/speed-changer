import browser from '../browser';

import iconDimmed from '../assets/graphics/action/icon-dimmed.png?url';
import iconDimmedTinted from '../assets/graphics/action/icon-dimmed-tinted.png?url';
import iconNormal from '../assets/graphics/action/icon-normal.png?url';
import iconFaster from '../assets/graphics/action/icon-faster.png?url';
import iconSlower from '../assets/graphics/action/icon-slower.png?url';

export function getIconForSpeed(speed: number) {
  if (speed === 1) {
    return iconNormal;
  } else if (speed > 1) {
    return iconFaster;
  } else {
    return iconSlower;
  }
}

export async function setIconForTabBySpeed(
  tabId: number,
  enabled: boolean,
  speed: number,
) {
  // We have to use this (somewhat ugly) tinted version of the dimmed
  // icon in Safari in order to avoid the highlighting that Safari
  // applies to grayscale 'template' icons. Other browsers should keep
  // using the normal dimmed icons.
  const dimmedIcon =
    import.meta.env.MODE === 'safari' ? iconDimmedTinted : iconDimmed;
  const icon = !enabled ? dimmedIcon : getIconForSpeed(speed);

  browser.action.setIcon({
    path: icon,
    tabId,
  });
}
