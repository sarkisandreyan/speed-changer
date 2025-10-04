import overrideScript from '../assets/scripts/override-prototype.js?url&no-inline';
import browser from '../browser';

// Inject a script to additionally override `HTMLMediaElement::play`.
const overridePrototypeScript = document.createElement('script');
overridePrototypeScript.src = browser.runtime.getURL(overrideScript);
document.body.appendChild(overridePrototypeScript);
