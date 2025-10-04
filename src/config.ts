import type {
  Config,
  KeyboardShortcutBinding,
  LocalStorageData,
} from './types';
import { BehaviorSubject, filter, map, Observable, withLatestFrom } from 'rxjs';
import { equals } from 'ramda';
import browser from './browser';

export type ConfigValues = {
  [Key in keyof Config]: ConfigValue<Config[Key]>;
};

export interface ConfigValue<T> {
  value: T;
  changed: boolean;
  firstChange: boolean;
}

const defaultKeyboardShortcutBindings: KeyboardShortcutBinding[] = [
  { action: 'ToggleExtension', shortcut: 'Alt+Shift+Backquote' },
  { action: 'ToggleFloatingButtons', shortcut: 'Alt+Backquote' },
  { action: 'DecreaseSpeed', shortcut: 'Alt+Minus' },
  { action: 'IncreaseSpeed', shortcut: 'Alt+Equal' },
  { action: 'PlayAt0.5x', shortcut: 'Alt+Digit0' },
  { action: 'PlayAt1x', shortcut: 'Alt+Digit1' },
  { action: 'PlayAt2x', shortcut: 'Alt+Digit2' },
  { action: 'PlayAt3x', shortcut: 'Alt+Digit3' },
  { action: 'PlayAt4x', shortcut: 'Alt+Digit4' },
  { action: 'PlayAt5x', shortcut: 'Alt+Digit5' },
  { action: 'PlayAt6x', shortcut: 'Alt+Digit6' },
  { action: 'PlayAt7x', shortcut: 'Alt+Digit7' },
  { action: 'PlayAt8x', shortcut: 'Alt+Digit8' },
  { action: 'PlayAt9x', shortcut: 'Alt+Digit9' },
];

export const defaultConfig: Config = {
  enabled: true,
  enabledHostExceptions: [],
  minSpeed: 0.25,
  maxSpeed: 5,
  globalSpeed: 1,
  predefinedSpeeds: [0.5, 1, 1.5, 2, 3],
  hostSpecificSpeeds: {},
  keyboardShortcutsEnabled: true,
  keyboardShortcutsTarget: 'current',
  keyboardShortcutsBindings: defaultKeyboardShortcutBindings,
  floatingButtonsEnabled: false,
  floatingButtonsEnabledHostExceptions: [
    'instagram.com',
    'youtube.com',
    'tiktok.com',
    ...(import.meta.env.DEV ? ['localhost:3000'] : []),
  ],
  floatingButtonsDimming: true,
  floatingButtonsTarget: 'current',
  floatingButtonsPreferredPosition: 'ne',
  floatingButtonsMirrorForRTL: true,
  floatingButtonsVisualIndicatorsEnabled: true,
  floatingButtonsLongPressSpeed: import.meta.env.MODE !== 'safari' ? 2 : 1.5,
  floatingButtonsForcePressSpeed: 2,
  allowTelemetry: Boolean(
    import.meta.env.SC_GA_MEASUREMENT_API_SECRET &&
      import.meta.env.SC_GA_MEASUREMENT_ID,
  ),
};

function configValue<T>(
  value: T,
  changed: boolean,
  firstChange: boolean,
): ConfigValue<T> {
  return { value, changed, firstChange };
}

const prevConfig$ = new BehaviorSubject<Config | null>(null);
const config$ = new BehaviorSubject<Config | null>(null);

browser.storage.local.get<LocalStorageData>('config').then(({ config }) => {
  config$.next({
    ...defaultConfig,
    ...config,
  });
});

browser.storage.local.onChanged.addListener(({ config }) => {
  if (config) {
    prevConfig$.next(config.oldValue);
    config$.next(config.newValue);
  }
});

export function getConfig(): Observable<ConfigValues> {
  const changedProps = new Set();

  return config$.asObservable().pipe(
    filter((config) => config !== null),
    withLatestFrom(prevConfig$),
    map(([_config, _prevConfig]) => {
      const config: Record<string, any> = {};

      for (const _prop in _config) {
        const prop = _prop as keyof Config;
        const changed =
          !_prevConfig || !equals(_config[prop], _prevConfig[prop]);
        config[prop] = configValue(
          _config[prop],
          changed,
          !changedProps.has(prop),
        );
        changedProps.add(prop);
      }

      return config as ConfigValues;
    }),
  );
}

export async function getConfigSnapshot(): Promise<Config> {
  const snapshot = config$.getValue();
  if (snapshot) return snapshot;

  const { config } =
    await browser.storage.local.get<LocalStorageData>('config');

  return {
    ...defaultConfig,
    ...config,
  };
}

export function setConfig(
  config: Partial<Config> | ((config: Config) => Partial<Config>),
) {
  return browser.storage.local.set<LocalStorageData>({
    config: {
      ...defaultConfig,
      ...config$.getValue(),
      ...(typeof config === 'function'
        ? config(config$.getValue() ?? defaultConfig)
        : config),
    },
  });
}
