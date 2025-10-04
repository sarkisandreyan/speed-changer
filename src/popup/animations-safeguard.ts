setTimeout(() => {
  // This class name indicates that transitions may now be safely triggered.
  // It is used to safeguard against some animations unnecessarily triggering
  // when the popup has only just been opened.
  document.body.classList.add('wait-period-passed');
}, 150);
