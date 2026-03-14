import { startHeartbeat } from '@/core/license';
import { startIntegrityMonitoring } from '@/core/integrity';

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
});
