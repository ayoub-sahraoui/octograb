/**
 * Runtime integrity checking to detect code tampering.
 * Verifies that critical license functions haven't been replaced with stubs.
 */

import { activateLicense, verifyLicense, deactivateLicense, getLicenseState } from './license';
import { isDevMode } from './dev-mode';

/**
 * Verify that license functions are real implementations, not stubs.
 * A cracker would typically replace these with functions that return
 * hardcoded { success: true } or { isActivated: true } — we detect
 * that by checking the function source contains expected patterns.
 */
export function checkIntegrity(): boolean {
  const fnSources = [
    activateLicense.toString(),
    verifyLicense.toString(),
    deactivateLicense.toString(),
    getLicenseState.toString(),
  ];

  // Every real license function must reference the storage API and fetch
  const requiredPatterns = [
    /storage/, // Must use browser.storage
    /fetch|apiCall/, // Must make network calls (or reference apiCall)
  ];

  for (const src of fnSources) {
    // If a function is suspiciously short, it's likely a stub
    if (src.length < 50) return false;
  }

  // activateLicense and verifyLicense must reference network + storage
  const networkFns = [fnSources[0], fnSources[1]];
  for (const src of networkFns) {
    for (const pattern of requiredPatterns) {
      if (!pattern.test(src)) return false;
    }
  }

  return true;
}

/**
 * Mark extension as tampered in storage (silent flag)
 */
export async function markTampered(): Promise<void> {
  try {
    await browser.storage.local.set({ __xt: true });
  } catch {
    // Silently fail
  }
}

/**
 * Check if extension has been marked as tampered
 */
export async function isTampered(): Promise<boolean> {
  try {
    const result = await browser.storage.local.get('__xt');
    return result.__xt === true;
  } catch {
    return false;
  }
}

/**
 * Run integrity check and flag if tampered.
 * Called from background script on startup and periodically.
 * ONLY runs in production builds — skipped in dev mode.
 */
export function startIntegrityMonitoring(): void {
  // Skip integrity checks in development mode
  if (isDevMode()) {
    return;
  }

  if (!checkIntegrity()) {
    markTampered();
  }

  setInterval(() => {
    if (!checkIntegrity()) {
      markTampered();
    }
  }, 5 * 60 * 1000);
}
