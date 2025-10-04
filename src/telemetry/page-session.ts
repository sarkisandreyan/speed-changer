import { TELEMETRY_PAGE_SESSION_EXPIRES_IN } from '../constants';
import { generateSessionId } from '../utils/telemetry';

let latestActiveTimestamp: number | null = null;

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    latestActiveTimestamp = Date.now();
    return;
  }

  // Reset page session ID after a specific amount of time has passed.
  if (
    latestActiveTimestamp !== null &&
    Date.now() - latestActiveTimestamp > TELEMETRY_PAGE_SESSION_EXPIRES_IN
  ) {
    pageSessionId.value = generateSessionId();
  }
});

export const pageSessionId = {
  value: generateSessionId(),
};
