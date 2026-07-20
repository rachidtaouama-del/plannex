/**
 * licenseEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Offline license generation and validation.
 * Uses Web Crypto API (HMAC-SHA256) — no external dependencies.
 *
 * License file format:  PLX:<base64_payload>.<base64_signature>
 *
 * The SECRET_KEY is what prevents forgery. Only your copy of the app
 * (which contains this key) can generate valid licenses.
 */

// ── Secret signing key ─────────────────────────────────────────────────────────
// IMPORTANT: This is the key that signs all your licenses.
// Keep this constant and never change it — old licenses will break if you do.
const SECRET_KEY = 'PLX-RACHID-TAOUAMA-PLANNEX-2024-INDUSTRIAL-ENGINE-SECRET';

// ── License Payload ────────────────────────────────────────────────────────────
export interface LicensePayload {
  username: string;
  companyName: string;
  machineId: string;       // The specific PC this license is locked to
  expiresAt: string;       // ISO date string, '2099-12-31' for forever
  issuedAt: string;        // ISO date string
  notes?: string;
  v: number;               // Version for future compatibility
}

export interface LicenseValidationResult {
  valid: boolean;
  payload?: LicensePayload;
  error?: 'tampered' | 'wrong_machine' | 'expired' | 'invalid_format';
}

// ── Crypto Helpers ─────────────────────────────────────────────────────────────

async function getSigningKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(SECRET_KEY);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function signPayload(payloadB64: string): Promise<string> {
  const key = await getSigningKey();
  const encoder = new TextEncoder();
  const data = encoder.encode(payloadB64);
  const signature = await crypto.subtle.sign('HMAC', key, data);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function verifySignature(payloadB64: string, signatureB64: string): Promise<boolean> {
  try {
    const key = await getSigningKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(payloadB64);
    const sigBytes = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));
    return await crypto.subtle.verify('HMAC', key, sigBytes, data);
  } catch {
    return false;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Generate a signed license file string.
 * Call this from the Admin Panel when creating a new license.
 */
export async function generateLicenseFile(payload: LicensePayload): Promise<string> {
  const payloadB64 = btoa(JSON.stringify(payload));
  const signature = await signPayload(payloadB64);
  return `PLX:${payloadB64}.${signature}`;
}

/**
 * Validate a license file string.
 * Checks: signature (tamper), machineId, expiry.
 */
export async function validateLicenseFile(
  licenseContent: string,
  currentMachineId: string
): Promise<LicenseValidationResult> {
  try {
    if (!licenseContent.startsWith('PLX:')) {
      return { valid: false, error: 'invalid_format' };
    }

    const rest = licenseContent.slice(4); // Remove 'PLX:'
    const dotIndex = rest.lastIndexOf('.');
    if (dotIndex === -1) return { valid: false, error: 'invalid_format' };

    const payloadB64 = rest.slice(0, dotIndex);
    const signatureB64 = rest.slice(dotIndex + 1);

    // 1. Verify signature — if tampered, this fails
    const signatureOk = await verifySignature(payloadB64, signatureB64);
    if (!signatureOk) return { valid: false, error: 'tampered' };

    // 2. Parse payload
    const payload: LicensePayload = JSON.parse(atob(payloadB64));

    // 3. Check machine ID — admin licenses bypass machine check
    if (payload.machineId !== 'ADMIN' && payload.machineId !== currentMachineId) {
      return { valid: false, error: 'wrong_machine' };
    }

    // 4. Check expiry
    const expiry = new Date(payload.expiresAt);
    const now = new Date();
    if (expiry < now) return { valid: false, error: 'expired', payload };

    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'invalid_format' };
  }
}

/**
 * Parse a license file without validating signature (for display purposes only).
 */
export function parseLicenseFileUnsafe(licenseContent: string): LicensePayload | null {
  try {
    if (!licenseContent.startsWith('PLX:')) return null;
    const rest = licenseContent.slice(4);
    const dotIndex = rest.lastIndexOf('.');
    if (dotIndex === -1) return null;
    const payloadB64 = rest.slice(0, dotIndex);
    return JSON.parse(atob(payloadB64));
  } catch {
    return null;
  }
}
