export default defineBackground(() => {
  // Open side panel on clicking the extension icon
  browser.action.onClicked.addListener((tab) => {
    // Chrome MV3 style
    if (browser.sidePanel && browser.sidePanel.open) {
      browser.sidePanel.open({ tabId: tab.id! });
    }
  });
});
