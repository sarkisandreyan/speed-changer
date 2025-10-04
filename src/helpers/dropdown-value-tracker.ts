import { fromEvent, Observable, skip, Subject, takeUntil } from 'rxjs';

export type Option<T = any> = {
  label: string;
  value: T;
};

let dropdownIndex = 0;

/**
 * Populates the provided HTML element with the provided options,
 * setting up the appropriate event listeners for accessible and
 * user-friendly navigation. The value is delegated through the
 * returned observable.
 *
 * @param dropdown The dropdown element to populate
 * @param options The list of options (with their labels and values)
 */
export function trackDropdownValue<T = any>(
  dropdown: HTMLElement,
  options: Array<Option<T>>,
) {
  return new Observable<Option<T>>((subscriber) => {
    let onUnsubscribed = new Subject<void>();

    let previousActiveElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    let activeItemIndex = 0;

    dropdown.id = `dropdown-${++dropdownIndex}`;
    dropdown.tabIndex = 0;
    dropdown.hidden = false;
    dropdown.role = 'listbox';

    for (const option of options) {
      const index = options.indexOf(option);
      const item = document.createElement('div');
      item.role = 'option';
      item.className = 'dropdown-option';
      item.id = `dropdown-${dropdownIndex}-option-${index}`;
      item.textContent = option.label;

      fromEvent(item, 'mousemove', { passive: true })
        .pipe(takeUntil(onUnsubscribed))
        .subscribe(() => {
          activeItemIndex = index;
          highlightOptions();
        });

      fromEvent(item, 'click', { passive: true })
        .pipe(takeUntil(onUnsubscribed))
        .subscribe(() => {
          subscriber.next(option);
          dismissDropdown();
        });

      dropdown.appendChild(item);
    }

    highlightOptions();

    // TODO: This is probably unneeded given that we have
    // the 'focusout' listener below?
    fromEvent(window, 'click', { passive: true })
      .pipe(
        // Ignore the first click that opens the dropdown itself.
        skip(1),
        takeUntil(onUnsubscribed),
      )
      .subscribe((event) => {
        if (event.composedPath().indexOf(dropdown) > -1) return;
        dismissDropdown();
      });

    fromEvent(dropdown, 'focusout', { passive: true })
      .pipe(takeUntil(onUnsubscribed))
      .subscribe(() => {
        dismissDropdown();
      });

    fromEvent<KeyboardEvent>(dropdown, 'keydown')
      .pipe(takeUntil(onUnsubscribed))
      .subscribe((event) => {
        switch (event.code) {
          case 'Tab':
            // Capture focus
            event.preventDefault();
            break;
          case 'ArrowUp':
            if (activeItemIndex === 0) activeItemIndex = options.length - 1;
            else --activeItemIndex;
            highlightOptions();
            break;
          case 'ArrowDown':
            if (activeItemIndex + 1 === options.length) activeItemIndex = 0;
            else ++activeItemIndex;
            highlightOptions();
            break;
          case 'Enter':
          case 'NumpadEnter':
          case 'Space':
            event.preventDefault();
            subscriber.next(options[activeItemIndex]);
            dismissDropdown();
            break;
          case 'Escape':
            event.preventDefault();
            dismissDropdown();
            break;
        }
      });

    function dismissDropdown() {
      dropdown.hidden = true;
      dropdown.innerHTML = '';
      previousActiveElement?.focus();
      subscriber.complete();
    }

    function highlightOptions() {
      dropdown.setAttribute(
        'aria-activedescendant',
        `dropdown-${dropdownIndex}-option-${activeItemIndex}`,
      );
      dropdown.querySelectorAll('.dropdown-option').forEach((item, index) => {
        if (index === activeItemIndex) {
          item.classList.add('dropdown-option-active');
        } else {
          item.classList.remove('dropdown-option-active');
        }
      });
    }

    requestAnimationFrame(() => dropdown.focus());

    return () => {
      dismissDropdown();
      onUnsubscribed.next();
    };
  });
}
