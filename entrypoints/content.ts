import { SelectorEngine } from '../core/selector-engine';
import { PlanExecutor } from '../core/executor';

export default defineContentScript({
  matches: ['<all_urls>'],
  
  main() {
    console.log('[OctoGrab] Content script loaded');
    
    const selectorEngine = new SelectorEngine();
    let currentExecutor: PlanExecutor | null = null;
    
    // Listen for messages from sidepanel
    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('[OctoGrab] Received message:', message);
      
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
          
        case 'EXECUTE_PLAN':
          // Execute the plan
          if (currentExecutor) {
            sendResponse({ success: false, error: 'Execution already in progress' });
            break;
          }
          
          // Log batching to prevent message flooding
          const logBuffer: { message: string, type: string }[] = [];
          const flushLogs = () => {
            if (logBuffer.length === 0) return;
            const batch = [...logBuffer];
            logBuffer.length = 0;
            
            // Send batch or individual (UI expects individual usually, but high freq is bad)
            // OctoGrab UI (hooks.ts) expects individual logs.
            // We'll iterate and send, BUT we should probably debounce.
            // BETTER: Update UI to accept batch? No, that requires changing hooks.ts.
            // Let's throttle sending:
            
            // Actually, sending many messages in a loop is still flooding.
            // Check if we can change the protocol.
            // Hooks.ts 'EXECUTION_LOG' expects { message, type }.
            
            // Alternative: Send one message with joined text?
            // "Iteration 1 start | Executing... | Done"
            
            // Let's try sending batched message if we change hooks.ts?
            // For now, let's just console.log the high-freq stuff and ONLY send essential logs to UI?
            
            // Current strategy: Only send 'system', 'error', 'success'. 'info' goes to console only.
          };
          
          currentExecutor = new PlanExecutor(message.plan, {
            onLog: (logMessage: string, type: 'info' | 'success' | 'error' | 'system') => {
              console.log(`[OctoGrab Executor] [${type}] ${logMessage}`);
              
              // Filter high-frequency logs to prevent UI freeze
              // Only send important statuses to the UI
              if (type === 'info' && (logMessage.includes('Iteration') || logMessage.includes('Extracting'))) {
                  return; // Skip sending these to UI, keep in console
              }
              
              browser.runtime.sendMessage({
                type: 'EXECUTION_LOG',
                data: { message: logMessage, type }
              }).catch(err => console.warn('[OctoGrab] Failed to send log:', err));
            },
            onResult: (data: any) => {
              console.log('[OctoGrab Executor] Result:', data);
              browser.runtime.sendMessage({
                type: 'EXECUTION_RESULT',
                data
              }).catch(err => console.warn('[OctoGrab] Failed to send result:', err));
            },
            onComplete: () => {
              console.log('[OctoGrab Executor] Execution complete');
              browser.runtime.sendMessage({
                type: 'EXECUTION_COMPLETE'
              }).catch(err => console.warn('[OctoGrab] Failed to send completion:', err));
              currentExecutor = null;
            }
          });
          
          currentExecutor.run().catch((error: Error) => {
            browser.runtime.sendMessage({
              type: 'EXECUTION_LOG',
              data: { message: `Execution error: ${error.message}`, type: 'error' }
            }).catch(err => console.warn('[OctoGrab] Failed to send error:', err));
            currentExecutor = null;
          });
          
          sendResponse({ success: true, message: 'Execution started' });
          break;
          
        case 'STOP_EXECUTION':
          if (currentExecutor) {
            currentExecutor.stop();
            currentExecutor = null;
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'No execution in progress' });
          }
          break;
          
        case 'PING':
          sendResponse({ success: true, message: 'Content script is ready' });
          break;
          
        default:
          console.warn('[OctoGrab] Unknown message type:', message.type);
          sendResponse({ success: false, error: 'Unknown message type' });
      }
      
      return true; // Keep the message channel open for async responses
    });
  },
});
