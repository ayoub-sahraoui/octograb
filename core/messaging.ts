
import { browser } from 'wxt/browser';

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
  | 'PING'
  // Remote Environment Actions
  | 'ENV_EXTRACT_RECORD'
  | 'ENV_COUNT'
  | 'ENV_GET_TEXT'
  | 'ENV_GET_ATTRIBUTE'
  | 'ENV_CLICK'
  | 'ENV_INPUT'
  | 'ENV_SCROLL'
  | 'ENV_IS_VISIBLE'
  | 'ENV_WAIT_NETWORK_IDLE';

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
    let tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      tabs = await browser.tabs.query({ active: true, lastFocusedWindow: true });
    }
    const tab = tabs[0];
    if (!tab?.id) {
      throw new Error('No active web page found to communicate with');
    }
    return await sendToTab(tab.id, message);
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to communicate with content script' };
  }
}

/**
 * Send a message to a specific tab's content script by tab ID.
 * This is the preferred method during blueprint execution to avoid
 * targeting the wrong tab if the user switches tabs.
 */
export async function sendToTab(tabId: number, message: Message): Promise<MessageResponse> {
  const maxRetries = 8;
  const retryDelay = 750;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await browser.tabs.sendMessage(tabId, message);
      return response as MessageResponse;
    } catch (error: any) {
      const errorMessage = error.message || '';
      const isConnectionError = errorMessage.includes('Receiving end does not exist') ||
        errorMessage.includes('Could not establish connection');

      if (isConnectionError && attempt < maxRetries - 1) {
        console.log(`[OctoGrab] Connection to tab ${tabId} failed (attempt ${attempt + 1}/${maxRetries}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      console.error('[OctoGrab] Error sending message to tab:', error);

      if (isConnectionError) {
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

  return {
    success: false,
    error: 'Failed to communicate with content script after retries'
  };
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
 * Listen for messages from content script (Sidepanel consumer)
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

/**
 * Register a handler for RPC calls (Content Script consumer)
 * Returns a cleanup function.
 */
export function registerRpcHandler(
  handler: (message: Message) => Promise<MessageResponse | null> | MessageResponse | null
): () => void {
  const listener = (message: any, sender: any, sendResponse: (response: any) => void) => {
    // Check if message looks like one of ours
    if (!message || !message.type) return;

    const result = handler(message as Message);

    if (!result) return; // Ignore if handler returns null/undefined (not handled)

    if (result instanceof Promise) {
      result.then(response => {
        if (response) sendResponse(response);
      }).catch(err => {
        sendResponse({
          success: false,
          error: err.message
        });
      });
      return true; // Keep channel open for async response
    } else {
      sendResponse(result);
    }
  };

  browser.runtime.onMessage.addListener(listener);
  return () => browser.runtime.onMessage.removeListener(listener);
}
