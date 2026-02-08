import { SelectorEngine } from '../core/selector-engine';
// PlanExecutor is now running in Sidepanel, communicating via EnvHandler
import { initEnvHandler } from './content/env-handler';

export default defineContentScript({
  matches: ['<all_urls>'],
  
  main() {
    console.log('[OctoGrab] Content script loaded');
    
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

          selectorEngine.start((selector, xpath) => {
            // Send selected element info back to sidepanel
            browser.runtime.sendMessage({
              type: 'ELEMENT_SELECTED',
              data: { selector, xpath }
            });
          }, message.scopeElement || null, doneHandler, message.parentSelector || null);
          sendResponse({ success: true });
          break;
          
        case 'STOP_PICKING':
          selectorEngine.stop();
          sendResponse({ success: true });
          break;
          
        /* 
           Legacy Execution Logic removed. 
           Execution is now orchestrated by Sidepanel via EnvHandler.
        */
      }
      
      // Return true only if we are handling async response (which we are not anymore here except for simple ack)
      // Actually we sendResponse immediately above.
      // But if we return true, we should be careful. 
      // Since EnvHandler also listens, and it handles OTHER messages.
      // We should return false/undefined if we didn't handle it here?
      // But existing code returns true always.
      // If we return true, existing listener keeps channel open.
      // If EnvHandler returns true (async), it also keeps channel open.
      // Multiple listeners returning true is fine in Chrome Extension?
      // Yes, "If any listener returns true, the channel is kept open."
      // BUT only ONE response can be sent.
      // Since EnvHandler handles DIFFERENT types, they won't conflict on sendResponse.
      // For START_PICKING, EnvHandler ignores (returns null). This listener handles it.
      // For ENV_CLICK, this listener ignores (no case). EnvHandler handles it.
      // So returning true here potentially keeps channel open for unknown messages?
      // Yes, but we don't call sendResponse for unknown messages here.
      // So the OTHER listener should be able to.
      
      // Ideally, we explicitly handle or not.
      if (message.type === 'START_PICKING' || message.type === 'STOP_PICKING') {
          return false; // synchronous response sent
      }
      
      // For unknown types, let other listeners handle it.
      return false;
    });
  },
});
