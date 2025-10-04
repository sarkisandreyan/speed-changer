import { sendMessage } from '../messaging/api';

/**
 * Retrieves the current operating system.
 */
export async function getOS() {
  const platformInfo = await sendMessage<chrome.runtime.PlatformInfo | void>({
    action: 'get-platform-info',
  });

  return platformInfo?.os;
}
