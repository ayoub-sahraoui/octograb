import { startHeartbeat } from '@/core/license';

export default defineBackground(() => {
  // Open side panel on clicking the extension icon
  browser.action.onClicked.addListener((tab) => {
    // Chrome MV3 style
    if (browser.sidePanel && browser.sidePanel.open) {
      browser.sidePanel.open({ tabId: tab.id! });
    }
  });

  // Start license verification heartbeat (checks every 24h)
  startHeartbeat().catch(console.error);
});
