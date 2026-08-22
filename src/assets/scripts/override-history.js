(function () {
  function getOverrideForAction(action) {
    const originalImplementation = window.history[action];

    return function () {
      window.dispatchEvent(new CustomEvent('speed-changer:x-history-change'));
      return originalImplementation.call(this, ...arguments);
    };
  }

  window.history.back = getOverrideForAction('back');
  window.history.forward = getOverrideForAction('forward');
  window.history.go = getOverrideForAction('go');
  window.history.pushState = getOverrideForAction('pushState');
  window.history.replaceState = getOverrideForAction('replaceState');
})();
