/**
 * License verification client for OctoGrab extension.
 * Handles activation, verification, heartbeat, and device fingerprinting.
 */

const LICENSE_SERVER_URL = 'https://server.octograb.online';

const STORAGE_KEYS = {
  LICENSE_KEY: 'octograb_license_key',
  DEVICE_FINGERPRINT: 'octograb_device_fingerprint',
  LICENSE_STATUS: 'octograb_license_status',
  LAST_VERIFIED: 'octograb_last_verified',
  GRACE_DEADLINE: 'octograb_grace_deadline',
};

const VERIFY_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface LicenseState {
  isActivated: boolean;
  licenseKey: string | null;
  plan: string | null;
  status: 'active' | 'revoked' | 'expired' | 'inactive' | 'grace';
  expiresAt: string | null;
  lastVerified: number | null;
}

// ─── Device Fingerprint ─────────────────────────────────────

async function getOrCreateFingerprint(): Promise<string> {
  const stored = await browser.storage.local.get(STORAGE_KEYS.DEVICE_FINGERPRINT);
  if (stored[STORAGE_KEYS.DEVICE_FINGERPRINT]) {
    return stored[STORAGE_KEYS.DEVICE_FINGERPRINT] as string;
  }

  // Generate a unique fingerprint: extension ID + random UUID
  const extensionId = browser.runtime.id;
  const uuid = crypto.randomUUID();
  const fingerprint = `${extensionId}-${uuid}`;

  await browser.storage.local.set({ [STORAGE_KEYS.DEVICE_FINGERPRINT]: fingerprint });
  return fingerprint;
}

// ─── API Calls ──────────────────────────────────────────────

async function apiCall(endpoint: string, body: Record<string, string>): Promise<any> {
  const response = await fetch(`${LICENSE_SERVER_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return response.json();
}

// ─── Public API ─────────────────────────────────────────────

export async function activateLicense(licenseKey: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const fingerprint = await getOrCreateFingerprint();
  const deviceName = `Chrome Extension (${navigator.userAgent.split(' ').pop() || 'Unknown'})`;

  try {
    const result = await apiCall('/api/licenses/activate', {
      licenseKey,
      deviceFingerprint: fingerprint,
      deviceName,
    });

    if (result.success) {
      await browser.storage.local.set({
        [STORAGE_KEYS.LICENSE_KEY]: licenseKey,
        [STORAGE_KEYS.LICENSE_STATUS]: 'active',
        [STORAGE_KEYS.LAST_VERIFIED]: Date.now(),
        [STORAGE_KEYS.GRACE_DEADLINE]: '',
      });
      return { success: true };
    }

    return { success: false, error: result.error || 'Activation failed' };
  } catch (err) {
    return { success: false, error: 'Cannot reach license server. Check your connection.' };
  }
}

export async function verifyLicense(): Promise<LicenseState> {
  const stored = await browser.storage.local.get([
    STORAGE_KEYS.LICENSE_KEY,
    STORAGE_KEYS.DEVICE_FINGERPRINT,
    STORAGE_KEYS.LICENSE_STATUS,
    STORAGE_KEYS.LAST_VERIFIED,
    STORAGE_KEYS.GRACE_DEADLINE,
  ]);

  const licenseKey = (stored[STORAGE_KEYS.LICENSE_KEY] as string) || null;
  const fingerprint = (stored[STORAGE_KEYS.DEVICE_FINGERPRINT] as string) || null;
  const lastVerified = (stored[STORAGE_KEYS.LAST_VERIFIED] as number) || null;
  const graceDeadline = (stored[STORAGE_KEYS.GRACE_DEADLINE] as number) || null;

  // No license key stored
  if (!licenseKey || !fingerprint) {
    return {
      isActivated: false,
      licenseKey: null,
      plan: null,
      status: 'inactive',
      expiresAt: null,
      lastVerified: null,
    };
  }

  // Check if we need to verify (only every 24h)
  if (lastVerified && Date.now() - lastVerified < VERIFY_INTERVAL_MS) {
    const cachedStatus = (stored[STORAGE_KEYS.LICENSE_STATUS] as LicenseState['status']) || 'active';
    return {
      isActivated: true,
      licenseKey,
      plan: null,
      status: cachedStatus,
      expiresAt: null,
      lastVerified,
    };
  }

  // Verify with server
  try {
    const result = await apiCall('/api/licenses/verify', {
      licenseKey,
      deviceFingerprint: fingerprint,
    });

    if (result.valid) {
      await browser.storage.local.set({
        [STORAGE_KEYS.LICENSE_STATUS]: 'active',
        [STORAGE_KEYS.LAST_VERIFIED]: Date.now(),
        [STORAGE_KEYS.GRACE_DEADLINE]: '',
      });
      return {
        isActivated: true,
        licenseKey,
        plan: result.license?.plan || null,
        status: 'active',
        expiresAt: result.license?.expiresAt || null,
        lastVerified: Date.now(),
      };
    }

    // License invalid on server
    await browser.storage.local.set({
      [STORAGE_KEYS.LICENSE_STATUS]: result.error?.includes('revoked') ? 'revoked' : 'expired',
    });
    return {
      isActivated: false,
      licenseKey,
      plan: null,
      status: result.error?.includes('revoked') ? 'revoked' : 'expired',
      expiresAt: null,
      lastVerified: Date.now(),
    };
  } catch {
    // Server unreachable — enter grace period
    const now = Date.now();
    if (!graceDeadline) {
      const deadline = now + GRACE_PERIOD_MS;
      await browser.storage.local.set({
        [STORAGE_KEYS.GRACE_DEADLINE]: deadline,
        [STORAGE_KEYS.LICENSE_STATUS]: 'grace',
      });
      return {
        isActivated: true,
        licenseKey,
        plan: null,
        status: 'grace',
        expiresAt: null,
        lastVerified: lastVerified,
      };
    }

    // Grace period expired
    if (now > Number(graceDeadline)) {
      await browser.storage.local.set({
        [STORAGE_KEYS.LICENSE_STATUS]: 'expired',
      });
      return {
        isActivated: false,
        licenseKey,
        plan: null,
        status: 'expired',
        expiresAt: null,
        lastVerified: lastVerified,
      };
    }

    // Still in grace period
    return {
      isActivated: true,
      licenseKey,
      plan: null,
      status: 'grace',
      expiresAt: null,
      lastVerified: lastVerified,
    };
  }
}

export async function deactivateLicense(): Promise<{ success: boolean; error?: string }> {
  const stored = await browser.storage.local.get([
    STORAGE_KEYS.LICENSE_KEY,
    STORAGE_KEYS.DEVICE_FINGERPRINT,
  ]);

  const licenseKey = stored[STORAGE_KEYS.LICENSE_KEY] as string | undefined;
  const fingerprint = stored[STORAGE_KEYS.DEVICE_FINGERPRINT] as string | undefined;

  if (licenseKey && fingerprint) {
    try {
      await apiCall('/api/licenses/deactivate', {
        licenseKey,
        deviceFingerprint: fingerprint,
      });
    } catch {
      // Best effort — clear locally even if server unreachable
    }
  }

  await browser.storage.local.remove([
    STORAGE_KEYS.LICENSE_KEY,
    STORAGE_KEYS.LICENSE_STATUS,
    STORAGE_KEYS.LAST_VERIFIED,
    STORAGE_KEYS.GRACE_DEADLINE,
  ]);

  return { success: true };
}

export async function getLicenseState(): Promise<LicenseState> {
  const stored = await browser.storage.local.get([
    STORAGE_KEYS.LICENSE_KEY,
    STORAGE_KEYS.LICENSE_STATUS,
    STORAGE_KEYS.LAST_VERIFIED,
  ]);

  const licenseKey = (stored[STORAGE_KEYS.LICENSE_KEY] as string) || null;
  const status = (stored[STORAGE_KEYS.LICENSE_STATUS] as LicenseState['status']) || 'inactive';
  const lastVerified = (stored[STORAGE_KEYS.LAST_VERIFIED] as number) || null;

  return {
    isActivated: !!licenseKey && (status === 'active' || status === 'grace'),
    licenseKey,
    plan: null,
    status,
    expiresAt: null,
    lastVerified,
  };
}

// Background heartbeat — call from service worker / background script
export async function startHeartbeat(): Promise<void> {
  // Run verification immediately
  await verifyLicense();

  // Set up periodic alarm
  if (browser.alarms) {
    browser.alarms.create('license-heartbeat', {
      periodInMinutes: 60 * 24, // Every 24 hours
    });

    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'license-heartbeat') {
        verifyLicense().catch(console.error);
      }
    });
  }
}
