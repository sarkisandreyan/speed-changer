import pkg from '../package.json';

export const PLATFORM_MAX_SPEED = 16;
export const PLATFORM_MIN_SPEED = 1 / 16;

export const RANGE_STEP_VALUE = 0.25;

export const VERSION = pkg.version;

export const TELEMETRY_ENDPOINT = 'https://www.google-analytics.com/mp/collect';
export const TELEMETRY_PAGE_SESSION_EXPIRES_IN = 30 * 60 * 1e3; // 30 minutes

/**
 * The original rate at which the media element was playing before
 * being patched by the extension.
 */
export const SPEED_CHANGER_ORIGINAL_RATE = Symbol(
  'SPEED_CHANGER_ORIGINAL_RATE',
);

/**
 * The custom rate at which the media element should play.
 * Used when changes to the speed are applied on a per-element basis.
 */
export const SPEED_CHANGER_CUSTOM_RATE = Symbol('SPEED_CHANGER_CUSTOM_RATE');

/**
 * The custom rate at which the media element should play when its attached floating
 * button is long- or force-pressed. This takes precedence over `SPEED_CHANGER_CUSTOM_RATE`.
 */
export const SPEED_CHANGER_TEMPORARY_RATE = Symbol(
  'SPEED_CHANGER_TEMPORARY_RATE',
);

/**
 * A reference to the floating button attached to the current media element.
 */
export const SPEED_CHANGER_FLOATING_BUTTON_REF = Symbol(
  'SPEED_CHANGER_FLOATING_BUTTON_REF',
);

/**
 * Controls whether the `emptied` event should re-set all the custom rates for
 * the media element, as well as destroy the floating button attached to it.
 *
 * Useful in many websites where the video elements are reused for showing short
 * video content (e.g. YouTube Shorts, TikTok etc.), but they are, non-technically
 * speaking, completely different videos.
 */
export const SPEED_CHANGER_RESET_WHEN_EMPTIED = Symbol(
  'SPEED_CHANGER_RESET_WHEN_EMPTIED',
);

/**
 * Controls whether the floating button attached to the current media element
 * should 'survive' the media element's `ended` event.
 *
 * Useful in many websites where looping videos are not being looped using the
 * standard `loop` attribute but rather manually re-started when the `ended`
 * event is fired. In those cases the floating button should 'survive' the
 * `ended` event because the video, factually speaking, has not ended.
 */
export const SPEED_CHANGER_FLOATING_BUTTON_SURVIVES_ENDED = Symbol(
  'SPEED_CHANGER_FLOATING_BUTTON_SURVIVES_ENDED',
);

/**
 * When present on a media element, indicates that its attached
 * floating button has been manually dismissed by the user.
 */
export const SPEED_CHANGER_FLOATING_BUTTON_DISMISSED = Symbol(
  'SPEED_CHANGER_FLOATING_BUTTON_DISMISSED',
);
