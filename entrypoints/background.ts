import { startHeartbeat } from '@/core/license';
import { startIntegrityMonitoring } from '@/core/integrity';
import { isExecutionFrameActiveForTab } from './content/execution-frame-session';

export default defineBackground(() => {
  // Open side panel on clicking the extension icon
  browser.action.onClicked.addListener((tab) => {
    // Chrome MV3 style
    if (browser.sidePanel && browser.sidePanel.open) {
      browser.sidePanel.open({ tabId: tab.id! });
    }
  });

  // Start integrity monitoring (detects code tampering)
  startIntegrityMonitoring();

  // Start license verification heartbeat (checks every 24h)
  startHeartbeat().catch(() => { });

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === 'GET_EXECUTION_FRAME_STATE') {
      const tabId = sender.tab?.id;

      if (!tabId) {
        sendResponse({ success: true, data: { active: false } });
        return;
      }

      isExecutionFrameActiveForTab(tabId)
        .then((active) => sendResponse({ success: true, data: { active } }))
        .catch(() => sendResponse({ success: true, data: { active: false } }));

      return true;
    }
  });
});
