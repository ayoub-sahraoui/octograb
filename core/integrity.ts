/**
 * Runtime integrity checking to detect code tampering
 * Verifies that critical license functions haven't been modified
 */

import { activateLicense, verifyLicense, deactivateLicense } from './license';

// Function checksums (will be auto-generated during build)
// These are SHA-256 hashes of the function source code
const EXPECTED_CHECKSUMS: Record<string, string> = {
  // These will be populated by the build script
  // Format: functionName: 'sha256-hash'
};

/**
 * Simple hash function for function source code
 * Not cryptographically secure, but good enough for basic tampering detection
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Verify that a function hasn't been tampered with
 */
function verifyFunction(fn: Function, expectedHash: string): boolean {
  const fnString = fn.toString();
  const actualHash = simpleHash(fnString);
  return actualHash === expectedHash;
}

/**
 * Check integrity of all critical license functions
 * Returns true if all checks pass, false if tampering detected
 */
export function checkIntegrity(): boolean {
  // If no checksums are defined, skip checks (development mode)
  if (Object.keys(EXPECTED_CHECKSUMS).length === 0) {
    return true;
  }

  const checks = [
    { name: 'activateLicense', fn: activateLicense },
    { name: 'verifyLicense', fn: verifyLicense },
    { name: 'deactivateLicense', fn: deactivateLicense },
  ];

  for (const check of checks) {
    const expectedHash = EXPECTED_CHECKSUMS[check.name];
    if (expectedHash && !verifyFunction(check.fn, expectedHash)) {
      console.error(`[Security] Integrity check failed for ${check.name}`);
      return false;
    }
  }

  return true;
}

/**
 * Mark extension as tampered in storage
 */
export async function markTampered(): Promise<void> {
  try {
    await browser.storage.local.set({ __integrity_failed: true });
  } catch (e) {
    // Silently fail
  }
}

/**
 * Check if extension has been marked as tampered
 */
export async function isTampered(): Promise<boolean> {
  try {
    const result = await browser.storage.local.get('__integrity_failed');
    return result.__integrity_failed === true;
  } catch (e) {
    return false;
  }
}

/**
 * Detect if DevTools is open (anti-debugging)
 * Note: This is not foolproof but adds another layer
 */
export function detectDevTools(): boolean {
  const threshold = 160;
  const widthThreshold = window.outerWidth - window.innerWidth > threshold;
  const heightThreshold = window.outerHeight - window.innerHeight > threshold;
  return widthThreshold || heightThreshold;
}

/**
 * Periodic integrity check that runs in background
 */
export function startIntegrityMonitoring(): void {
  // Check immediately
  if (!checkIntegrity()) {
    markTampered();
  }

  // Check every 5 minutes
  setInterval(() => {
    if (!checkIntegrity()) {
      markTampered();
    }
  }, 5 * 60 * 1000);
}
