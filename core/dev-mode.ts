/**
 * Shared dev mode detection utility.
 * Returns true when running as an unpacked extension (no update_url in manifest).
 * In dev mode, license checks and free tier limits are bypassed.
 */

let _cachedDevMode: boolean | null = null;

export function isDevMode(): boolean {
  if (_cachedDevMode !== null) return _cachedDevMode;
  try {
    const manifest = browser.runtime.getManifest();
    _cachedDevMode = !('update_url' in manifest);
  } catch {
    _cachedDevMode = false;
  }
  return _cachedDevMode;
}
