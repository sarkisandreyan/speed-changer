import type { MeasurementPayload } from '../types';
import { RANGE_STEP_VALUE } from '../constants';
import { debounceTime } from 'rxjs';
import { trackRangeValue } from '../helpers/range-value-tracker';
import { getHostForActiveTab } from '../utils/hosts';
import { preparePayload } from '../telemetry/payload';
import { getConfig } from '../config';
import {
  getSpeedForHost,
  setGlobalSpeed,
  setSpeedForHost,
} from '../utils/speeds';
import ui from './ui-bridge';

const host = await getHostForActiveTab();
const rangeValueTracker = trackRangeValue(ui.range, ui.thumb.offsetWidth);

getConfig().subscribe(
  async ({ minSpeed, maxSpeed, hostSpecificSpeeds, globalSpeed }) => {
    if (!host) return;

    if (hostSpecificSpeeds.changed || globalSpeed.changed) {
      const speed = await getSpeedForHost(host);

      const perc = Math.max(
        0,
        (speed - minSpeed.value) / (maxSpeed.value - minSpeed.value),
      );

      ui.range.min = `${minSpeed.value}`;
      ui.range.max = `${maxSpeed.value}`;
      ui.range.step = `${RANGE_STEP_VALUE}`;

      ui.range.value = `${speed}`;
      ui.thumb.style.left =
        1 +
        ui.thumb.offsetWidth / 2 +
        (ui.thumb.parentElement!.offsetWidth - ui.thumb.offsetWidth - 2) *
          perc +
        'px';
    }
  },
);

rangeValueTracker.subscribe(({ value, altKey }) => {
  if (!host) return;

  if (!altKey) {
    setSpeedForHost(host, value);
  } else {
    setGlobalSpeed(value);
  }
});

// This stores the tracking payload for range change events.
// The reason is that we do not want to track every interaction
// with the range because a lot of them can happen in a short
// period of time, whereas we only need the value that the
// user has 'committed' (i.e. the last picked value).
//
// Storing the committed value here, we can send it to GA only
// when we are sure the user has committed the value. Currently,
// we consider the value to have been committed when:
//
// 1. The popup has been closed after using the range
// 2. A predefined speed has been selected after using the range
//
// TODO: Think of better ways of detecting 'committed' values because
// popup closure tracking is not reliable and we might lose these
// events due to ungraceful popup closures.
//
// TODO: Rethink this export; not looking very neat.
export const rangeChangePayload: {
  payload: MeasurementPayload<
    | 'popup_range_click'
    | 'popup_range_wheel'
    | 'popup_range_alt_click'
    | 'popup_range_alt_wheel'
  > | null;
} = {
  payload: null,
};

rangeValueTracker
  .pipe(debounceTime(200))
  .subscribe(async ({ interaction, value, altKey }) => {
    if (!altKey) {
      if (interaction === 'pointer') {
        rangeChangePayload.payload = await preparePayload(
          'popup_range_click',
          { applied_speed: value },
          { realm: 'popup' },
        );
      } else {
        rangeChangePayload.payload = await preparePayload(
          'popup_range_wheel',
          { applied_speed: value },
          { realm: 'popup' },
        );
      }
    } else {
      if (interaction === 'pointer') {
        rangeChangePayload.payload = await preparePayload(
          'popup_range_alt_click',
          { applied_speed: value },
          { realm: 'popup' },
        );
      } else {
        rangeChangePayload.payload = await preparePayload(
          'popup_range_alt_wheel',
          { applied_speed: value },
          { realm: 'popup' },
        );
      }
    }
  });
