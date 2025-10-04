import type { HostEnabledState, NormalizedHost } from '../types';
import { getConfigSnapshot } from '../config';

/**
 * Returns the enabled state for the given host, also providing information
 * on whether the current state is exceptional (i.e. opposite to the current
 * global `enabled` configuration).
 */
export async function getEnabledStateForHost(
  host: NormalizedHost,
): Promise<HostEnabledState> {
  const { enabled, enabledHostExceptions } = await getConfigSnapshot();
  const exceptional = enabledHostExceptions.indexOf(host) > -1;

  return {
    enabled: (enabled && !exceptional) || (!enabled && exceptional),
    exceptional,
  };
}

/**
 * Returns the enabled state of floating buttnos for the given host, also
 * providing information on whether the current state is exceptional (i.e.
 * opposite to the current global `floatingButtonsEnabled` configuration).
 */
export async function getFloatingButtonsEnabledStateForHost(
  host: NormalizedHost,
): Promise<HostEnabledState> {
  const { floatingButtonsEnabled, floatingButtonsEnabledHostExceptions } =
    await getConfigSnapshot();
  const exceptional = floatingButtonsEnabledHostExceptions.indexOf(host) > -1;

  return {
    enabled:
      (floatingButtonsEnabled && !exceptional) ||
      (!floatingButtonsEnabled && exceptional),
    exceptional,
  };
}
