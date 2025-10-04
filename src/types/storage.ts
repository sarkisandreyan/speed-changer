import type { Config } from './config';
import type { SessionIds, StoredTelemetryInfo } from './telemetry';
import type { FloatingViewHints } from './custom-elements';

export type LocalStorageData = {
  config?: Config;
  floatingViewTimesShown?: number;
  floatingViewHints?: FloatingViewHints;
  telemetryInfo?: StoredTelemetryInfo;
  sessionIds?: SessionIds;
  latestVersion?: string;
  pendingTelemetryForUpdateAt?: number;
};
