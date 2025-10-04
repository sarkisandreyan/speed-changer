import { fromEvent, Observable, Subject, takeUntil } from 'rxjs';
import { altKey } from '../key-trackers';
import { isRTL } from '../utils/dom';
import { clamp } from 'ramda';

type RangeValueResult = {
  interaction: 'pointer' | 'wheel';
  value: number;
  altKey: boolean;
};

/**
 * Sets up the appropriate event listeners necessary for tracking changes to
 * a range input element, taking into account the min/max values and especially
 * its precision (`range.step`), which browsers don't seem to handle nicely,
 * producing values that are not a multiple of `range.step`.
 *
 * @param range The range input element
 * @param thumbWidth The width of the thumb
 */
export function trackRangeValue(
  range: HTMLInputElement,
  thumbWidth: number,
): Observable<RangeValueResult> {
  return new Observable<RangeValueResult>((subscriber) => {
    let onUnsubscribed = new Subject<void>();

    let thumbDragging = false;

    function getRangeParams() {
      return {
        value: Number.parseFloat(range.value),
        min: Number.parseFloat(range.min),
        max: Number.parseFloat(range.max),
        step: Number.parseFloat(range.step),
      };
    }

    function handleRangeMouseInteraction(event: MouseEvent) {
      const rtl = isRTL(range);
      const { min, max, step } = getRangeParams();
      const { width, left } = range.getBoundingClientRect();
      let offsetX = clamp(
        0,
        width,
        event.pageX - left + (rtl ? thumbWidth / 2 : -thumbWidth / 2),
      );
      if (rtl) {
        offsetX = width - offsetX;
      }
      const perc = offsetX / (0.98 * width - thumbWidth);
      const rawSpeed = min + perc * (max - min);
      const roundedSpeed = clamp(min, max, Math.floor(rawSpeed / step) * step);

      subscriber.next({
        interaction: 'pointer',
        value: roundedSpeed,
        altKey: altKey.pressed,
      });
    }

    // Disable wheel events in Safari for now because handling them is very
    // problematic and requires lots of quirks, which I may or may not come
    // back to and implement sometime in the future.
    //
    // TODO: Collect telemetry for unsuccessful wheel events in Safari to
    // determine whether it is necessary to go for the quirky implementation
    // and support wheel events in Safari too.
    if (import.meta.env.MODE !== 'safari') {
      fromEvent<WheelEvent>(range, 'wheel')
        .pipe(takeUntil(onUnsubscribed))
        .subscribe(async (event) => {
          event.preventDefault();

          const { max, min, step, value } = getRangeParams();
          const delta =
            Math.abs(event.deltaX) > Math.abs(event.deltaY)
              ? !isRTL(range)
                ? -event.deltaX
                : event.deltaX
              : event.deltaY;

          const roundedSpeed = clamp(
            min,
            max,
            Math.floor((value + delta / (1.25 / step)) / step) * step,
          );

          subscriber.next({
            interaction: 'wheel',
            value: roundedSpeed,
            altKey: altKey.pressed,
          });
        });
    }

    fromEvent<MouseEvent>(range, 'click')
      .pipe(takeUntil(onUnsubscribed))
      .subscribe((event) => {
        handleRangeMouseInteraction(event);
      });

    fromEvent(range, 'mousedown')
      .pipe(takeUntil(onUnsubscribed))
      .subscribe(() => {
        thumbDragging = true;
      });

    fromEvent(window, 'mouseup')
      .pipe(takeUntil(onUnsubscribed))
      .subscribe(() => {
        thumbDragging = false;
      });

    fromEvent<MouseEvent>(window, 'mousemove')
      .pipe(takeUntil(onUnsubscribed))
      .subscribe((event) => {
        if (!thumbDragging) return;

        if (event.target === range) {
          event.preventDefault();
        }

        handleRangeMouseInteraction(event);
      });

    return () => {
      onUnsubscribed.next();
    };
  });
}
