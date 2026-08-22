export default {
  toggleButton: document.querySelector<HTMLButtonElement>('.toggle-button')!,
  toggleButtonTextState: document.querySelector<HTMLElement>(
    '.toggle-button .state',
  )!,
  toggleButtonTextScope: document.querySelector<HTMLElement>(
    '.toggle-button .scope',
  )!,
  toggleButtonDropdownTrigger: document.querySelector<HTMLElement>(
    '.toggle-button-dropdown-trigger',
  )!,
  toggleButtonDropdown: document.querySelector<HTMLElement>(
    '.toggle-button-dropdown',
  )!,
  indicator: document.querySelector<HTMLInputElement>('.speed-indicator')!,
  range: document.querySelector<HTMLInputElement>('.range input')!,
  thumb: document.querySelector<HTMLElement>('.range-ui-thumb')!,
  predefinedSpeeds: document.querySelector<HTMLElement>('.predefined-speeds')!,
  floatingButtonsSwitcher: document.querySelector<HTMLButtonElement>(
    '.floating-buttons-switcher',
  )!,
  footer: document.querySelector<HTMLElement>('footer')!,
  preferences: document.querySelector<HTMLButtonElement>('.preferences')!,
  footerLink: document.querySelector<HTMLAnchorElement>('footer a')!,
  hint: document.querySelector<HTMLElement>('.hint')!,
};
