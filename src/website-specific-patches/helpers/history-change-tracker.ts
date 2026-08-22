import scriptUrl from '../../assets/scripts/override-history.js?url&no-inline';
import browser from '../../browser';

let script: HTMLScriptElement;

export function setup() {
  script = document.createElement('script');
  script.src = browser.runtime.getURL(scriptUrl);
  document.body.appendChild(script);
}

export function teardown() {
  // This doesn't actually 'tear' anything down except for
  // removing the script tag, but it's still nice to have
  // for a cleaner DOM.
  script?.remove();
}
