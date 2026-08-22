import type { FloatingButtonInteractionMedium } from './events';
import type { KeyboardShortcutAction } from './shortcuts';

declare const Brand: unique symbol;

// Telemetry information
export type StoredTelemetryInfo = {
  client_id?: string;
  ip_override?: string;
  device?: DeviceInfo;
};

export type DeviceInfo = {
  language?: string;
  screen_resolution?: string;
  browser?: string;
  browser_version?: string;
  operating_system?: string;
  operating_system_version?: string;
  brand?: string;
  model?: string;
};

// Sessions
/**
 * The 'realm' of the session, used to automatically control when sessions
 * start and end. There exist 4 realms:
 *
 * - `'extension'` — mainly nominal, assigned to extension-wide and
 *   location-independent events
 * - `'popup'` — assigned to events happening inside the popup
 * - `'content'` — assigned to events happening inside the floating buttons
 *   and the floating view (and elsewhere on the content page)
 * - `'welcome'` — assigned to events happening on the Welcome page
 * - `'preferences'` — assigned to events happening on the Preferences page
 */
export type SessionRealm =
  | 'extension'
  | 'popup'
  | 'content'
  | 'welcome'
  | 'preferences';

export type SessionIds = {
  [Realm in SessionRealm]?: string;
};

export type SessionInfo = {
  /**
   * The 'realm' of the session. See more at {@link SessionRealm}.
   *
   */
  realm: SessionRealm;
  /**
   * When `true`, signals that a new session is to be started in the current realm.
   */
  start?: boolean;
};

// Event names & params
export type EventName =
  | 'extension_install'
  | 'extension_update'
  | 'welcome_open'
  | 'welcome_fb_choice_selected'
  | 'welcome_fb_choice_all'
  | 'welcome_fb_choice_disable'
  | 'welcome_preferences_link_click'
  | 'welcome_take_a_look_click'
  | 'welcome_telemetry_opt_out'
  | 'welcome_telemetry_opt_in'
  | 'popup_open'
  | 'popup_close'
  | 'popup_enable_click'
  | 'popup_disable_click'
  | 'popup_enable_alt_click'
  | 'popup_disable_alt_click'
  | 'popup_dropdown_click'
  | 'popup_dropdown_enable_all_click'
  | 'popup_dropdown_disable_all_click'
  | 'popup_dropdown_enable_site_click'
  | 'popup_dropdown_disable_site_click'
  | 'popup_indicator_value_change'
  | 'popup_range_click'
  | 'popup_range_alt_click'
  | 'popup_range_wheel'
  | 'popup_range_alt_wheel'
  | 'popup_predefined_click'
  | 'popup_predefined_alt_click'
  | 'popup_enable_fb_click'
  | 'popup_disable_fb_click'
  | 'popup_preferences_click'
  | 'popup_rate_click'
  | 'floating_button_engagement_begin'
  | 'floating_button_engagement_end'
  | 'floating_button_dismiss'
  | 'floating_button_long_press_begin'
  | 'floating_button_long_press_end'
  | 'floating_button_force_press_begin'
  | 'floating_button_force_press_end'
  | 'floating_button_lock_speed_begin'
  | 'floating_button_lock_speed_end'
  | 'floating_button_movement_begin'
  | 'floating_button_movement_end'
  | 'floating_view_range_show_click'
  | 'floating_view_range_hide_click'
  | 'floating_view_range_click'
  | 'floating_view_range_alt_click'
  | 'floating_view_range_wheel'
  | 'floating_view_range_alt_wheel'
  | 'floating_view_predefined_click'
  | 'floating_view_predefined_alt_click'
  | 'floating_view_hint_support_click'
  | 'floating_view_hint_disable_fb_click'
  | 'keyboard_shortcut_use'
  | 'preferences_open'
  | 'preferences_preference_change'
  | 'preferences_enabled_host_add'
  | 'preferences_enabled_host_remove'
  | 'preferences_fb_enabled_host_add'
  | 'preferences_fb_enabled_host_remove'
  | 'preferences_keyboard_shortcut_add'
  | 'preferences_keyboard_shortcut_edit'
  | 'preferences_keyboard_shortcut_remove'
  | 'preferences_restore_defaults';

export type BaseEventParams = {
  session_id: string;
  timestamp_micros: string;
  engagement_time_msec: number;
  /**
   * The current version of the extension.
   */
  extension_version: string;
  /**
   * Whether the user uses the light or the dark mode.
   */
  color_scheme?: 'light' | 'dark';
  /**
   * The host of the current tab, obfuscated if necessary.
   */
  host?: TrackableHost;
  /**
   * The session ID of the *content page*.
   *
   * Applicable only when `sessionInfo.realm` is `'content'` and
   * updated only when a certain amount of time has passed from
   * the time the user left the page (i.e. page visibility state
   * changed to 'hidden').
   */
  page_session_id?: string;
  /**
   * Whether the event is fired from within an iframe or not.
   */
  is_from_iframe?: '1' | '0';
  /**
   * Whether GA debug mode is enabled.
   */
  debug_mode?: '1' | '0';
};

export type EventParams<Event extends EventName> =
  Event extends keyof EventParamMappings ? EventParamMappings[Event] : {};

export type FullEventParams<Event extends EventName> = BaseEventParams &
  EventParams<Event>;

export type EventParamMappings = {
  extension_update: {
    previous_version: string;
  };
  popup_indicator_value_change: {
    applied_speed: number;
  };
  popup_range_click: {
    applied_speed: number;
  };
  popup_range_alt_click: {
    applied_speed: number;
  };
  popup_range_wheel: {
    applied_speed: number;
  };
  popup_range_alt_wheel: {
    applied_speed: number;
  };
  popup_predefined_click: {
    applied_speed: number;
  };
  popup_predefined_alt_click: {
    applied_speed: number;
  };
  floating_button_long_press_begin: {
    fb_interaction_medium: FloatingButtonInteractionMedium;
  };
  floating_button_long_press_end: {
    fb_interaction_medium: FloatingButtonInteractionMedium;
  };
  floating_button_force_press_begin: {
    fb_interaction_medium: FloatingButtonInteractionMedium;
  };
  floating_button_force_press_end: {
    fb_interaction_medium: FloatingButtonInteractionMedium;
  };
  floating_button_lock_speed_begin: {
    fb_interaction_medium: FloatingButtonInteractionMedium;
  };
  floating_button_lock_speed_end: {
    fb_interaction_medium: FloatingButtonInteractionMedium;
  };
  floating_view_range_click: {
    applied_speed: number;
  };
  floating_view_range_alt_click: {
    applied_speed: number;
  };
  floating_view_range_wheel: {
    applied_speed: number;
  };
  floating_view_range_alt_wheel: {
    applied_speed: number;
  };
  floating_view_predefined_click: {
    applied_speed: number;
    change_target: 'current' | 'host';
  };
  floating_view_predefined_alt_click: {
    applied_speed: number;
    change_target: 'current' | 'host';
  };
  keyboard_shortcut_use: {
    shortcut_action: KeyboardShortcutAction;
    shortcut_keys: string;
  };
  preferences_preference_change: {
    preference_name: string;
    preference_old_value: string | number;
    preference_new_value: string | number;
  };
  preferences_enabled_host_add: {
    changed_host: string;
  };
  preferences_enabled_host_remove: {
    changed_host: string;
  };
  preferences_keyboard_shortcut_add: {
    shortcut_action: KeyboardShortcutAction;
    shortcut_keys: string;
  };
  preferences_keyboard_shortcut_edit: {
    shortcut_action: KeyboardShortcutAction;
    shortcut_keys: string;
  };
  preferences_keyboard_shortcut_remove: {
    shortcut_action: KeyboardShortcutAction;
    shortcut_keys: string;
  };
};

// Measurement Protocol API payloads
export type EventsPayload<Event extends EventName> = Array<{
  name: Event;
  params: FullEventParams<Event>;
}>;

export type DevicePayload = DeviceInfo;

export type MeasurementPayload<Event extends EventName> = {
  client_id: string;
  events: EventsPayload<Event>;
  device: DevicePayload;
  ip_override?: string;
};

// Miscellaneous
export type AllowedHost = string & { [Brand]: true };
export type ObfuscatedHost = 'Unavailable' | 'Other';
export type TrackableHost = AllowedHost | ObfuscatedHost;
