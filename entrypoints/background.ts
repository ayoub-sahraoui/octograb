export default defineBackground(() => {
  // Open side panel on clicking the extension icon
  browser.action.onClicked.addListener((tab) => {
    // Chrome MV3 style
    if (browser.sidePanel && browser.sidePanel.open) {
       browser.sidePanel.open({ tabId: tab.id! });
    }
    // For MV2 or Firefox, behavior might differ, but WXT abstracts some.
    // However, sidePanel.open is specific to Chrome MV3 usually.
    // Firefox uses sidebar_action default behavior if no popup.
  });
});
