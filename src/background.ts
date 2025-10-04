/**
 * This file has to reside outside `src/background/`; Vite won't include the
 * background script in the `dist/` folder when it's nested inside folders.
 */

import './background/update-tracker';
import './background/messaging';
import './background/config-tracker';
import './background/action-icon';
import './background/telemetry-info';
