/**
 * License verification client for OctoGrab extension.
 * Handles activation, verification, heartbeat, and device fingerprinting.
 */

const _0x = ['\x68\x74\x74\x70\x73\x3a\x2f\x2f', '\x73\x65\x72\x76\x65\x72\x2e', '\x6f\x63\x74\x6f\x67\x72\x61\x62\x2e\x6f\x6e\x6c\x69\x6e\x65'];
const LICENSE_SERVER_URL = _0x[0] + _0x[1] + _0x[2];

const STORAGE_KEYS = {
  LICENSE_KEY: 'octograb_license_key',
  DEVICE_FINGERPRINT: 'octograb_device_fingerprint',
  LICENSE_STATUS: 'octograb_license_status',
  LAST_VERIFIED: 'octograb_last_verified',
  GRACE_DEADLINE: 'octograb_grace_deadline',
  VERIFY_TOKEN: 'octograb_verify_token',
  VERIFY_HASH: 'octograb_verify_hash',
  // Rate limiting
  ACTIVATION_ATTEMPTS: 'octograb_activation_attempts',
  LAST_ACTIVATION_ATTEMPT: 'octograb_last_activation_attempt',
  // Heartbeat tracking
  HEARTBEAT_ALARM_ACTIVE: 'octograb_heartbeat_alarm_active',
} as const;

// ─── Constants ──────────────────────────────────────────────

const HOURS_24_MS = 24 * 60 * 60 * 1000;
const DAYS_7_MS = 7 * 24 * 60 * 60 * 1000;
const MINUTES_1_MS = 60 * 1000;
const VERIFY_INTERVAL_MS = HOURS_24_MS;
const GRACE_PERIOD_MS = DAYS_7_MS;

// Rate limiting configuration
const MAX_ACTIVATION_ATTEMPTS = 5;
const ACTIVATION_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const ACTIVATION_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes base

export interface LicenseState {
  isActivated: boolean;
  licenseKey: string | null;
  plan: string | null;
  status: 'active' | 'revoked' | 'expired' | 'inactive' | 'grace';
  expiresAt: string | null;
  lastVerified: number | null;
}

// ─── Token Validation ─────────────────────────────────────

/**
 * Compute a hash of the token for local validation.
 * This prevents trivial token tampering (swapping tokens between licenses).
 */
function computeTokenHash(token: string, licenseKey: string): string {
  const raw = `${token}:${licenseKey}:${browser.runtime.id}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

async function storeTokenWithHash(token: string, licenseKey: string): Promise<void> {
  const hash = computeTokenHash(token, licenseKey);
  await browser.storage.local.set({
    [STORAGE_KEYS.VERIFY_TOKEN]: token,
    [`${STORAGE_KEYS.VERIFY_TOKEN}_hash`]: hash,
  });
}

async function validateStoredToken(licenseKey: string): Promise<boolean> {
  const stored = await browser.storage.local.get([
    STORAGE_KEYS.VERIFY_TOKEN,
    `${STORAGE_KEYS.VERIFY_TOKEN}_hash`,
  ]);
  const token = stored[STORAGE_KEYS.VERIFY_TOKEN] as string | undefined;
  const hash = stored[`${STORAGE_KEYS.VERIFY_TOKEN}_hash`] as string | undefined;

  if (!token || !hash) return false;

  const expected = computeTokenHash(token, licenseKey);
  return hash === expected;
}

// ─── Rate Limiting ─────────────────────────────────────────

interface RateLimitState {
  attempts: number;
  lastAttempt: number;
  nextAllowedAt: number;
}

async function checkRateLimit(): Promise<{ allowed: boolean; waitMs?: number; state: RateLimitState }> {
  const stored = await browser.storage.local.get([
    STORAGE_KEYS.ACTIVATION_ATTEMPTS,
    STORAGE_KEYS.LAST_ACTIVATION_ATTEMPT,
  ]);

  const now = Date.now();
  const attempts = (stored[STORAGE_KEYS.ACTIVATION_ATTEMPTS] as number) || 0;
  const lastAttempt = (stored[STORAGE_KEYS.LAST_ACTIVATION_ATTEMPT] as number) || 0;

  // Reset if window has passed
  if (now - lastAttempt > ACTIVATION_RATE_LIMIT_WINDOW_MS) {
    const resetState: RateLimitState = { attempts: 0, lastAttempt: now, nextAllowedAt: now };
    await browser.storage.local.set({
      [STORAGE_KEYS.ACTIVATION_ATTEMPTS]: 0,
      [STORAGE_KEYS.LAST_ACTIVATION_ATTEMPT]: now,
    });
    return { allowed: true, state: resetState };
  }

  // Exponential backoff after max attempts
  if (attempts >= MAX_ACTIVATION_ATTEMPTS) {
    const backoffMs = ACTIVATION_BACKOFF_MS * Math.pow(2, attempts - MAX_ACTIVATION_ATTEMPTS);
    const nextAllowedAt = lastAttempt + backoffMs;

    if (now < nextAllowedAt) {
      return {
        allowed: false,
        waitMs: nextAllowedAt - now,
        state: { attempts, lastAttempt, nextAllowedAt }
      };
    }
  }

  return {
    allowed: true,
    state: { attempts, lastAttempt, nextAllowedAt: now }
  };
}

async function recordActivationAttempt(): Promise<void> {
  const stored = await browser.storage.local.get(STORAGE_KEYS.ACTIVATION_ATTEMPTS);
  const attempts = ((stored[STORAGE_KEYS.ACTIVATION_ATTEMPTS] as number) || 0) + 1;

  await browser.storage.local.set({
    [STORAGE_KEYS.ACTIVATION_ATTEMPTS]: attempts,
    [STORAGE_KEYS.LAST_ACTIVATION_ATTEMPT]: Date.now(),
  });
}

async function resetActivationAttempts(): Promise<void> {
  await browser.storage.local.remove([
    STORAGE_KEYS.ACTIVATION_ATTEMPTS,
    STORAGE_KEYS.LAST_ACTIVATION_ATTEMPT,
  ]);
}

// ─── Anti-Tampering ─────────────────────────────────────────

function computeVerifyHash(licenseKey: string, timestamp: number): string {
  const raw = `${licenseKey}:${timestamp}:${browser.runtime.id}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

async function setVerifiedTimestamp(licenseKey: string, timestamp: number): Promise<void> {
  const hash = computeVerifyHash(licenseKey, timestamp);
  await browser.storage.local.set({
    [STORAGE_KEYS.LAST_VERIFIED]: timestamp,
    [STORAGE_KEYS.VERIFY_HASH]: hash,
  });
}

async function getVerifiedTimestamp(licenseKey: string): Promise<number | null> {
  const stored = await browser.storage.local.get([
    STORAGE_KEYS.LAST_VERIFIED,
    STORAGE_KEYS.VERIFY_HASH,
  ]);
  const timestamp = stored[STORAGE_KEYS.LAST_VERIFIED] as number | undefined;
  const hash = stored[STORAGE_KEYS.VERIFY_HASH] as string | undefined;
  if (!timestamp || !hash) return null;
  const expected = computeVerifyHash(licenseKey, timestamp);
  if (hash !== expected) return null; // Tampered — force re-verification
  return timestamp;
}

// ─── Device Fingerprint ─────────────────────────────────────

/**
 * Generate a more robust device fingerprint using multiple entropy sources.
 * Includes a client-side hash to detect tampering with stored fingerprint.
 */
async function getOrCreateFingerprint(): Promise<string> {
  const stored = await browser.storage.local.get([
    STORAGE_KEYS.DEVICE_FINGERPRINT,
    `${STORAGE_KEYS.DEVICE_FINGERPRINT}_hash`,
  ]);

  const existingFingerprint = stored[STORAGE_KEYS.DEVICE_FINGERPRINT] as string | undefined;
  const existingHash = stored[`${STORAGE_KEYS.DEVICE_FINGERPRINT}_hash`] as string | undefined;

  // Validate existing fingerprint hasn't been tampered with
  if (existingFingerprint && existingHash) {
    const expectedHash = await computeFingerprintHash(existingFingerprint);
    if (existingHash === expectedHash) {
      return existingFingerprint;
    }
    // Tampered - regenerate
    console.warn('[OctoGrab] Fingerprint tampering detected, regenerating...');
  }

  const extensionId = browser.runtime.id;
  const uuid = crypto.randomUUID();

  // Collect multiple entropy sources for stronger fingerprinting
  const signals = [
    extensionId,
    uuid,
    navigator.language || '',
    String(navigator.hardwareConcurrency || ''),
    `${screen.width}x${screen.height}x${screen.colorDepth || 24}`,
    String(new Date().getTimezoneOffset()),
    navigator.platform || '',
    navigator.userAgent?.split(' ').pop() || '', // Browser version only
    // Additional entropy
    String((navigator as any).deviceMemory || ''),
    String(navigator.maxTouchPoints || 0),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    // Chrome extension specific
    browser.runtime.getManifest()?.version || '',
  ];

  // Combine with hash for tamper detection
  const rawFingerprint = signals.join('|');
  const fingerprintHash = await computeFingerprintHash(rawFingerprint);
  const fingerprint = `${rawFingerprint}#${fingerprintHash.substring(0, 16)}`;

  await browser.storage.local.set({
    [STORAGE_KEYS.DEVICE_FINGERPRINT]: fingerprint,
    [`${STORAGE_KEYS.DEVICE_FINGERPRINT}_hash`]: fingerprintHash,
  });

  return fingerprint;
}

/**
 * Compute a hash of the fingerprint for tamper detection.
 */
async function computeFingerprintHash(fingerprint: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${fingerprint}:${browser.runtime.id}`);

  // Use SubtleCrypto if available, fallback to simple hash
  if (crypto.subtle) {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Fall through to simple hash
    }
  }

  // Simple fallback hash
  let hash = 0;
  const str = String.fromCharCode(...data);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).padStart(16, '0');
}

// ─── API Calls ──────────────────────────────────────────────

async function apiCall(endpoint: string, body: Record<string, string>): Promise<any> {
  const response = await fetch(`${LICENSE_SERVER_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return response.json();
}

// ─── Public API ─────────────────────────────────────────────

export async function activateLicense(licenseKey: string): Promise<{
  success: boolean;
  error?: string;
  rateLimited?: boolean;
  retryAfterMs?: number;
}> {
  // Check rate limiting first
  const rateCheck = await checkRateLimit();
  if (!rateCheck.allowed) {
    const minutes = Math.ceil((rateCheck.waitMs || 0) / 60000);
    return {
      success: false,
      error: `Too many activation attempts. Please try again in ${minutes} minute${minutes > 1 ? 's' : ''}.`,
      rateLimited: true,
      retryAfterMs: rateCheck.waitMs,
    };
  }

  await recordActivationAttempt();

  const fingerprint = await getOrCreateFingerprint();
  const deviceName = `Chrome Extension (${navigator.userAgent.split(' ').pop() || 'Unknown'})`;

  try {
    const result = await apiCall('/api/licenses/activate', {
      licenseKey,
      deviceFingerprint: fingerprint,
      deviceName,
    });

    if (result.success) {
      // Reset attempts on successful activation
      await resetActivationAttempts();

      const now = Date.now();
      await browser.storage.local.set({
        [STORAGE_KEYS.LICENSE_KEY]: licenseKey,
        [STORAGE_KEYS.LICENSE_STATUS]: 'active',
        [STORAGE_KEYS.GRACE_DEADLINE]: '',
      });
      // Store token from server (signed proof of activation)
      if (result.token) {
        await storeTokenWithHash(result.token, licenseKey);
      }
      await setVerifiedTimestamp(licenseKey, now);
      return { success: true };
    }

    return { success: false, error: result.error || 'Activation failed' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Cannot reach license server.' };
  }
}

export async function verifyLicense(): Promise<LicenseState> {
  const stored = await browser.storage.local.get([
    STORAGE_KEYS.LICENSE_KEY,
    STORAGE_KEYS.DEVICE_FINGERPRINT,
    STORAGE_KEYS.LICENSE_STATUS,
    STORAGE_KEYS.GRACE_DEADLINE,
    STORAGE_KEYS.VERIFY_TOKEN,
  ]);

  const licenseKey = (stored[STORAGE_KEYS.LICENSE_KEY] as string) || null;
  const fingerprint = (stored[STORAGE_KEYS.DEVICE_FINGERPRINT] as string) || null;
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

  // Anti-tamper: validate the stored timestamp hash
  const lastVerified = await getVerifiedTimestamp(licenseKey);

  // Check if we need to verify (only every 24h)
  if (lastVerified && Date.now() - lastVerified < VERIFY_INTERVAL_MS) {
    const cachedStatus = (stored[STORAGE_KEYS.LICENSE_STATUS] as LicenseState['status']) || 'active';
    return {
      isActivated: cachedStatus === 'active' || cachedStatus === 'grace',
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
      const now = Date.now();
      await browser.storage.local.set({
        [STORAGE_KEYS.LICENSE_STATUS]: 'active',
        [STORAGE_KEYS.GRACE_DEADLINE]: '',
      });
      if (result.token) {
        await storeTokenWithHash(result.token, licenseKey);
      }
      await setVerifiedTimestamp(licenseKey, now);
      return {
        isActivated: true,
        licenseKey,
        plan: result.license?.plan || null,
        status: 'active',
        expiresAt: result.license?.expiresAt || null,
        lastVerified: now,
      };
    }

    // License invalid on server
    const invalidStatus = result.error?.includes('revoked') ? 'revoked' as const : 'expired' as const;
    await browser.storage.local.set({
      [STORAGE_KEYS.LICENSE_STATUS]: invalidStatus,
    });
    await browser.storage.local.remove([STORAGE_KEYS.VERIFY_TOKEN, `${STORAGE_KEYS.VERIFY_TOKEN}_hash`]);
    return {
      isActivated: false,
      licenseKey,
      plan: null,
      status: invalidStatus,
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
      await browser.storage.local.remove([STORAGE_KEYS.VERIFY_TOKEN, `${STORAGE_KEYS.VERIFY_TOKEN}_hash`]);
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
    STORAGE_KEYS.VERIFY_TOKEN,
    `${STORAGE_KEYS.VERIFY_TOKEN}_hash`,
    STORAGE_KEYS.VERIFY_HASH,
    STORAGE_KEYS.ACTIVATION_ATTEMPTS,
    STORAGE_KEYS.LAST_ACTIVATION_ATTEMPT,
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

// ─── Pre-Run Check ───────────────────────────────────────────

export interface PreRunCheckResult {
  allowed: boolean;
  plan: string | null;
  status: string;
  error?: string;
  limits?: {
    maxBlueprints: number;
    maxBlocksPerBlueprint: number;
    canExport: boolean;
    canResume: boolean;
  };
}

/**
 * Verify license with the server before each blueprint execution.
 * This prevents cracked extensions from running blueprints without a valid license.
 * Free users (no license key) get limited capabilities enforced server-side.
 */
export async function preRunCheck(): Promise<PreRunCheckResult> {
  const stored = await browser.storage.local.get([
    STORAGE_KEYS.LICENSE_KEY,
    STORAGE_KEYS.DEVICE_FINGERPRINT,
  ]);

  const licenseKey = (stored[STORAGE_KEYS.LICENSE_KEY] as string) || null;
  const fingerprint = (stored[STORAGE_KEYS.DEVICE_FINGERPRINT] as string) || null;

  if (!fingerprint) {
    // No fingerprint yet — allow as free tier (first run edge case)
    return {
      allowed: true,
      plan: 'free',
      status: 'active',
      limits: {
        maxBlueprints: 1,
        maxBlocksPerBlueprint: 10,
        canExport: true,
        canResume: false,
      },
    };
  }

  try {
    const body: Record<string, string> = { deviceFingerprint: fingerprint };
    if (licenseKey) {
      body.licenseKey = licenseKey;
    }

    const result = await apiCall('/api/licenses/pre-run-check', body);

    // Update cached token if provided
    if (result.token && licenseKey) {
      await storeTokenWithHash(result.token, licenseKey);
    }

    // If server says license is invalid, update local state
    if (!result.allowed && licenseKey) {
      await browser.storage.local.set({
        [STORAGE_KEYS.LICENSE_STATUS]: result.status || 'expired',
      });
    }

    return {
      allowed: result.allowed,
      plan: result.plan || null,
      status: result.status || 'unknown',
      error: result.error,
      limits: result.limits,
    };
  } catch (err: any) {
    // Server unreachable — check if we have a valid cached token
    const tokenValid = licenseKey ? await validateStoredToken(licenseKey) : false;

    if (licenseKey && tokenValid) {
      // We have a cached token with valid hash; allow execution (grace behavior)
      return {
        allowed: true,
        plan: null,
        status: 'grace',
        limits: {
          maxBlueprints: -1,
          maxBlocksPerBlueprint: -1,
          canExport: true,
          canResume: true,
        },
      };
    }

    // No valid token — clear it to prevent tampering attempts
    if (licenseKey) {
      await browser.storage.local.remove([STORAGE_KEYS.VERIFY_TOKEN, `${STORAGE_KEYS.VERIFY_TOKEN}_hash`]);
    }

    // No license key = free user, allow even offline
    if (!licenseKey) {
      return {
        allowed: true,
        plan: 'free',
        status: 'active',
        limits: {
          maxBlueprints: 1,
          maxBlocksPerBlueprint: 10,
          canExport: true,
          canResume: false,
        },
      };
    }

    // Licensed user with no cached token and server unreachable — block
    return {
      allowed: false,
      plan: null,
      status: 'error',
      error: 'Cannot verify license. Please check your internet connection.',
    };
  }
}

// Background heartbeat tracking to prevent duplicate listeners
let heartbeatAlarmListener: ((alarm: any) => void) | null = null;

/**
 * Stop the license heartbeat alarm and remove listeners.
 * Call this when the extension is being updated or disabled.
 */
export async function stopHeartbeat(): Promise<void> {
  if (browser.alarms) {
    await browser.alarms.clear('license-heartbeat');

    if (heartbeatAlarmListener) {
      browser.alarms.onAlarm.removeListener(heartbeatAlarmListener);
      heartbeatAlarmListener = null;
    }
  }

  await browser.storage.local.set({ [STORAGE_KEYS.HEARTBEAT_ALARM_ACTIVE]: false });
}

// Background heartbeat — call from service worker / background script
export async function startHeartbeat(): Promise<void> {
  // Check if already initialized to prevent duplicate alarms
  const stored = await browser.storage.local.get(STORAGE_KEYS.HEARTBEAT_ALARM_ACTIVE);
  const isActive = stored[STORAGE_KEYS.HEARTBEAT_ALARM_ACTIVE] as boolean | undefined;

  if (isActive && heartbeatAlarmListener) {
    // Already running, just verify once
    await verifyLicense();
    return;
  }

  // Clean up any existing alarm first
  await stopHeartbeat();

  // Run verification immediately
  await verifyLicense();

  // Set up periodic alarm
  if (browser.alarms) {
    await browser.alarms.create('license-heartbeat', {
      periodInMinutes: 60 * 24, // Every 24 hours
    });

    await browser.storage.local.set({ [STORAGE_KEYS.HEARTBEAT_ALARM_ACTIVE]: true });

    heartbeatAlarmListener = (alarm: any) => {
      if (alarm.name === 'license-heartbeat') {
        verifyLicense().catch(() => { });
      }
    };

    browser.alarms.onAlarm.addListener(heartbeatAlarmListener);
  }
}
