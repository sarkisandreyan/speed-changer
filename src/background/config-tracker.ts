import { getConfig, setConfig } from '../config';
import { PLATFORM_MAX_SPEED, PLATFORM_MIN_SPEED } from '../constants';
import { clampHostSpecificSpeeds } from '../utils/speeds';
import { clamp } from 'ramda';

getConfig().subscribe(
  async ({
    enabled,
    enabledHostExceptions,
    floatingButtonsEnabled,
    floatingButtonsEnabledHostExceptions,
    globalSpeed,
    hostSpecificSpeeds,
    minSpeed,
    maxSpeed,
  }) => {
    if (
      enabled.changed &&
      !enabled.firstChange &&
      // Skip resetting the exceptions if they are
      // already updated in the same batch of changes.
      !enabledHostExceptions.changed
    ) {
      setConfig({ enabledHostExceptions: [] });
    }

    if (
      floatingButtonsEnabled.changed &&
      !floatingButtonsEnabled.firstChange &&
      // Skip resetting the exceptions if they are
      // already updated in the same batch of changes.
      !floatingButtonsEnabledHostExceptions.changed
    ) {
      setConfig({ floatingButtonsEnabledHostExceptions: [] });
    }

    if (
      globalSpeed.changed ||
      hostSpecificSpeeds.changed ||
      minSpeed.changed ||
      maxSpeed.changed
    ) {
      if (
        globalSpeed.value < minSpeed.value ||
        globalSpeed.value > maxSpeed.value
      ) {
        setConfig({
          globalSpeed: clamp(minSpeed.value, maxSpeed.value, globalSpeed.value),
        });
      }

      const clampedSpeeds = clampHostSpecificSpeeds(
        hostSpecificSpeeds.value,
        minSpeed.value,
        maxSpeed.value,
      );

      if (clampedSpeeds) {
        setConfig({
          hostSpecificSpeeds: {
            ...hostSpecificSpeeds.value,
            ...clampedSpeeds,
          },
        });
      }

      if (
        minSpeed.value < PLATFORM_MIN_SPEED ||
        maxSpeed.value > PLATFORM_MAX_SPEED
      ) {
        setConfig({
          minSpeed: Math.max(PLATFORM_MIN_SPEED, minSpeed.value),
          maxSpeed: Math.min(PLATFORM_MAX_SPEED, maxSpeed.value),
        });
      }
    }

    if (
      globalSpeed.changed &&
      !globalSpeed.firstChange &&
      // Skip resetting the host-specific speeds if they
      // are already updated in the same batch of changes.
      !hostSpecificSpeeds.changed
    ) {
      setConfig({ hostSpecificSpeeds: {} });
    }
  },
);
