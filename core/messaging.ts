/**
 * Messaging utilities for communication between sidepanel and content scripts
 */

export type MessageType = 
  | 'START_PICKING'
  | 'STOP_PICKING'
  | 'ELEMENT_SELECTED'
  | 'PICKING_DONE'
  | 'EXECUTE_PLAN'
  | 'EXECUTION_LOG'
  | 'EXECUTION_RESULT'
  | 'EXECUTION_COMPLETE'
  | 'PING';

export interface Message {
  type: MessageType;
  data?: any;
  plan?: any;
  scopeElement?: any;
  parentSelector?: string | null;
}

export interface MessageResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

/**
 * Send a message to the active tab's content script
 */
export async function sendToContentScript(message: Message): Promise<MessageResponse> {
  try {
    // Get the active tab
    // Try current window first, fallback to last focused window
    let tabs = await browser.tabs.query({ active: true, currentWindow: true });
    
    if (tabs.length === 0) {
      tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true });
    }
    
    const tab = tabs[0];
    
    if (!tab?.id) {
      throw new Error('No active web page found to communicate with');
    }
    
    // Send message to content script
    const response = await browser.tabs.sendMessage(tab.id, message);
    return response as MessageResponse;
  } catch (error: any) {
    console.error('[OctoGrab] Error sending message to content script:', error);
    
    const errorMessage = error.message || '';
    if (errorMessage.includes('Receiving end does not exist') || errorMessage.includes('Could not establish connection')) {
      return {
        success: false,
        error: 'Content script not ready. Please refresh the web page.'
      };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to communicate with content script'
    };
  }
}

/**
 * Check if content script is ready in the active tab
 */
export async function isContentScriptReady(): Promise<boolean> {
  try {
    const response = await sendToContentScript({ type: 'PING' });
    return response.success;
  } catch {
    return false;
  }
}

/**
 * Listen for messages from content script
 */
export function onMessageFromContentScript(
  callback: (message: Message) => void
): () => void {
  const listener = (message: Message) => {
    callback(message);
  };
  
  browser.runtime.onMessage.addListener(listener);
  
  // Return cleanup function
  return () => {
    browser.runtime.onMessage.removeListener(listener);
  };
}
