/**
 * Translates technical error messages into user-friendly messages
 */

export interface UserFriendlyError {
  title: string;
  message: string;
  suggestion?: string;
}

/**
 * Common error patterns and their user-friendly translations
 */
const errorPatterns: Array<{ pattern: RegExp; translate: (match: RegExpMatchArray) => UserFriendlyError }> = [
  {
    pattern: /Cannot read property '(\w+)' of (undefined|null)/i,
    translate: () => ({
      title: 'Data Not Available',
      message: 'The required information is not available.',
      suggestion: 'Please try refreshing the page or restarting the wizard.',
    }),
  },
  {
    pattern: /Network request failed|Failed to fetch/i,
    translate: () => ({
      title: 'Connection Error',
      message: 'Unable to connect to the server.',
      suggestion: 'Please check your internet connection and try again.',
    }),
  },
  {
    pattern: /401|Unauthorized|Authentication failed/i,
    translate: () => ({
      title: 'Authentication Error',
      message: 'Your API key is invalid or expired.',
      suggestion: 'Please update your API key in Settings.',
    }),
  },
  {
    pattern: /429|Rate limit|Too many requests/i,
    translate: () => ({
      title: 'Rate Limit Exceeded',
      message: 'You have made too many requests.',
      suggestion: 'Please wait a moment and try again.',
    }),
  },
  {
    pattern: /quota.*exceeded|storage.*full/i,
    translate: () => ({
      title: 'Storage Full',
      message: 'Your browser storage is full.',
      suggestion: 'Please delete some old conversations or blueprints.',
    }),
  },
  {
    pattern: /selector.*invalid|Invalid CSS|Invalid XPath/i,
    translate: () => ({
      title: 'Invalid Selector',
      message: 'The element selector is not valid.',
      suggestion: 'Please check the selector syntax and try again.',
    }),
  },
  {
    pattern: /chrome:\/\/|about:|file:\//i,
    translate: () => ({
      title: 'Invalid Page',
      message: 'This extension cannot run on this type of page.',
      suggestion: 'Please navigate to a regular website (http:// or https://).',
    }),
  },
  {
    pattern: /timeout|timed out/i,
    translate: () => ({
      title: 'Request Timeout',
      message: 'The operation took too long to complete.',
      suggestion: 'Please try again. If the problem persists, the page may be too slow.',
    }),
  },
];

/**
 * Translate a technical error message into a user-friendly format
 */
export function translateError(error: Error | string): UserFriendlyError {
  const message = typeof error === 'string' ? error : error.message;

  // Try to match against known patterns
  for (const { pattern, translate } of errorPatterns) {
    const match = message.match(pattern);
    if (match) {
      return translate(match);
    }
  }

  // Fallback for unknown errors
  return {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred.',
    suggestion: 'Please try again. If the problem persists, try restarting the extension.',
  };
}

/**
 * Format a user-friendly error for display
 */
export function formatError(friendlyError: UserFriendlyError): string {
  let formatted = `**${friendlyError.title}**\n\n${friendlyError.message}`;
  if (friendlyError.suggestion) {
    formatted += `\n\n💡 ${friendlyError.suggestion}`;
  }
  return formatted;
}
