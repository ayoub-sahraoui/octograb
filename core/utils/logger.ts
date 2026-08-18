/**
 * Centralized logging utility for consistent logging across the application
 */

export type LogLevel = 'log' | 'warn' | 'error';

export interface Logger {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
}

/**
 * Create a logger with a consistent prefix
 */
export function createLogger(prefix: string): Logger {
  return {
    log: (...args: any[]) => console.log(`[${prefix}]`, ...args),
    warn: (...args: any[]) => console.warn(`[${prefix}]`, ...args),
    error: (...args: any[]) => console.error(`[${prefix}]`, ...args),
  };
}

/**
 * Pre-configured loggers for common modules
 */
export const loggers = {
  wizard: createLogger('Wizard'),
  wizardStore: createLogger('Wizard Store'),
  wizardStep: createLogger('Wizard Step'),
  toolExecutor: createLogger('Tool Executor'),
};
