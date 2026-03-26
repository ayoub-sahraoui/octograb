/**
 * Dev mode detection utility - BUILD TIME ONLY.
 * 
 * IMPORTANT: This uses compile-time flags (import.meta.env) to determine dev mode.
 * This prevents users from bypassing license checks by simply running unpacked.
 * 
 * For development: Set VITE_DEV_MODE=true in your .env file
 * For production: No env var = no bypass (secure by default)
 */

declare global {
  interface ImportMetaEnv {
    VITE_DEV_MODE?: string;
  }
}

/**
 * Check if running in development mode.
 * This is determined at BUILD TIME, not runtime - preventing tampering.
 */
export function isDevMode(): boolean {
  // Use compile-time env var - only present in dev builds
  return import.meta.env?.VITE_DEV_MODE === 'true';
}
