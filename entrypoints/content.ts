import { SelectorEngine } from '../core/selector-engine';
// PlanExecutor is now running in Sidepanel, communicating via EnvHandler
import { initEnvHandler } from './content/env-handler';
import { NetworkMonitor } from '../core/network-monitor';

export default defineContentScript({
  matches: ['<all_urls>'],

  main() {
    console.log('[OctoGrab] Content script loaded');

    // Initialize Network Monitor
    new NetworkMonitor();

    const selectorEngine = new SelectorEngine();

    // Initialize Environment Handler for RPC calls from Sidepanel
    initEnvHandler();

    // Listen for messages from sidepanel (Picking logic)
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // console.log('[OctoGrab] Received message:', message);

      switch (message.type) {
        case 'START_PICKING':
          // Done handler callback
          const doneHandler = (success: boolean) => {
            console.log('[OctoGrab] doneHandler callback triggered, success:', success);
            browser.runtime.sendMessage({
              type: 'PICKING_DONE',
              data: { success }
            }).then(() => console.log('[OctoGrab] Sent PICKING_DONE to sidepanel'))
              .catch(err => console.error('[OctoGrab] Error sending PICKING_DONE:', err));
          };

          selectorEngine.start((selector: string, xpath: string, elementInfo?: unknown) => {
            // Send selected element info back to sidepanel
            browser.runtime.sendMessage({
              type: 'ELEMENT_SELECTED',
              data: { selector, xpath, elementInfo }
            });
          }, message.scopeElement || null, doneHandler, message.parentSelector || null);
          sendResponse({ success: true });
          break;

        case 'STOP_PICKING':
          selectorEngine.stop();
          sendResponse({ success: true });
          break;
      }

      // Ideally, we explicitly handle or not.
      if (message.type === 'START_PICKING' || message.type === 'STOP_PICKING') {
        return; // synchronous response already sent
      }

      return;
    });
  },
});
