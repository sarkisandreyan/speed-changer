import { Subject } from 'rxjs';
import { isHTMLElement } from '../utils/dom';

export default class AnchorsResizeObserver {
  /**
   * The active anchors' `ResizeObserver` instance.
   * Stored here so as to make it accessible in website-specific patches.
   */
  static instance: AnchorsResizeObserver | null = null;

  #observer: ResizeObserver;
  #tracker: Subject<HTMLElement>;

  constructor() {
    this.#tracker = new Subject<HTMLElement>();
    this.#observer = new ResizeObserver((entries) => {
      for (const { target } of entries) {
        if (!isHTMLElement(target)) continue;

        this.#tracker.next(target);
      }
    });
  }

  get changes() {
    return this.#tracker.asObservable();
  }

  observe(element: HTMLElement) {
    this.#observer.observe(element);
  }

  unobserve(element: HTMLElement) {
    this.#observer.unobserve(element);
  }

  disconnect() {
    this.#observer.disconnect();
  }
}
