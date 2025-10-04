import type { KeyboardShortcutBinding } from './shortcuts';
import type { Position } from './custom-elements';

export interface Config {
  /**
   * Controls whether the extension is enabled.
   *
   * @default true
   */
  enabled: boolean;
  /**
   * The list of hosts that are an exception to the current `enabled` configuration.
   *
   * This list must be reset every time `enabled` is changed.
   *
   * @default []
   */
  enabledHostExceptions: string[];
  /**
   * The minimum speed at which media can be played.
   *
   * Browser-level minimum is 1/16 for Chrome & Firefox, with Firefox sometimes muting
   * audio at speeds lower than 1/8.
   *
   * @default 0.25
   */
  minSpeed: number;
  /**
   * The maximum speed at which media can be played.
   *
   * Browser-level maximum is 16 for Chrome & Firefox, with Firefox sometimes muting
   * audio at speeds higher than 8.
   *
   * @default 5
   */
  maxSpeed: number;
  /**
   * The predefined list of speeds which the user may pick from in the popup and the floating view.
   *
   * @default [0.5, 1, 1.5, 2, 3, 4]
   */
  predefinedSpeeds: number[];
  /**
   * The global speed applied to all media in case no other, more specific speed is available.
   *
   * @default 1
   */
  globalSpeed: number;
  /**
   * The custom speeds defined on a per-host basis (NB! host, not hostname).
   *
   * These take precedence over the global speed but may be overriden by custom speeds on a per-media basis.
   *
   * @default {}
   */
  hostSpecificSpeeds: Record<string, number>;
  /**
   * Controls whether keyboard shortcuts are enabled.
   *
   * @default true
   */
  keyboardShortcutsEnabled: boolean;
  /**
   * Controls whether keyboard shortcuts should only change the speed of
   * the media that is currently playing, or for the whole current host.
   *
   * @default 'current'
   */
  keyboardShortcutsTarget: 'current' | 'host';
  /**
   * The mapping between the active keyboard shortcuts and the actions that they trigger.
   *
   * See {@link defaultKeyboardShortcutBindings} for the default value.
   */
  keyboardShortcutsBindings: KeyboardShortcutBinding[];
  /**
   * Controls whether the floating buttons are enabled.
   *
   * @default false
   */
  floatingButtonsEnabled: boolean;
  /**
   * The list of hosts that are an exception to the current `floatingButtonsEnabled` configuration.
   *
   * This list is reset every time `floatingButtonsEnabled` is changed.
   *
   * @default ['instagram.com', 'youtube.com', 'tiktok.com']
   */
  floatingButtonsEnabledHostExceptions: string[];
  /**
   * Controls whether floating buttons should dim when inactive.
   *
   * @default true
   */
  floatingButtonsDimming: boolean;
  /**
   * Controls how the speed picked from the floating view affects the playing media:
   *
   * - `'current'` — the new speed is appled to the current media element only
   * - `'host'` — the new speed is appled to all media on the current host
   *
   * @default 'current'
   */
  floatingButtonsTarget: 'current' | 'host';
  /**
   * The preferred position of the floating buttons relative to the media elements
   * they are attached to.
   *
   * @default 'ne'
   */
  floatingButtonsPreferredPosition: Position;
  /**
   * Controls whether the position of the floating buttons should be mirrored
   * horizontally in right-to-left layouts.
   *
   * @default true
   */
  floatingButtonsMirrorForRTL: boolean;
  /**
   * Controls whether floating buttons should visually indicate the speed of the media
   * element they are attached to (by showing a small hare/tortoise icon in the corner
   * for faster/slower playback respectively).
   *
   * @default true
   */
  floatingButtonsVisualIndicatorsEnabled: boolean;
  /**
   * The speed at which media should play when floating buttons are long-pressed.
   *
   * @default 2 // (1.5 for Safari)
   */
  floatingButtonsLongPressSpeed: number;
  /**
   * Safari-only.
   *
   * The speed at which media should play when floating buttons are force-pressed.
   *
   * @default 2
   */
  floatingButtonsForcePressSpeed: number;
  /**
   * Controls whether telemetry is enabled.
   *
   * Default is `true` if environment variables `SC_GA_MEASUREMENT_API_SECRET` and
   * `SC_GA_MEASUREMENT_ID` have been provided, otherwise it is `false`.
   *
   * @default true
   */
  allowTelemetry: boolean;
}
