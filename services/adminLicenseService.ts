/**
 * adminLicenseService.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Fully offline admin operations.
 * Licenses are stored in localStorage and signed files are downloaded locally.
 */

import { generateLicenseFile, LicensePayload } from './licenseEngine';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface License {
  id: string;
  username: string;
  company_name: string;
  machine_id: string;
  expires_at: string;       // ISO string
  is_active: boolean;
  is_admin: boolean;
  grace_period_days: number;
  notes: string;
  last_login_at: string | null;
  created_at: string;
}

const LICENSES_KEY = 'plannex_admin_licenses';

// ── Local storage helpers ──────────────────────────────────────────────────────

function loadLicenses(): License[] {
  try {
    const raw = localStorage.getItem(LICENSES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveLicenses(licenses: License[]): void {
  try { localStorage.setItem(LICENSES_KEY, JSON.stringify(licenses)); } catch { }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Public API ─────────────────────────────────────────────────────────────────

/** Fetch all licenses */
export async function getAllLicenses(_adminKey: string): Promise<License[]> {
  return loadLicenses().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

/** Create a new license AND download the .plxlicense file */
export async function createLicense(
  _adminKey: string,
  opts: { username: string; companyName: string; machineId: string; expiresAt: Date; notes?: string }
): Promise<string> {
  const all = loadLicenses();

  const payload: LicensePayload = {
    username: opts.username.toLowerCase().trim(),
    companyName: opts.companyName,
    machineId: opts.machineId.trim(),
    expiresAt: opts.expiresAt.toISOString(),
    issuedAt: new Date().toISOString(),
    notes: opts.notes || '',
    v: 1,
  };

  const licenseContent = await generateLicenseFile(payload);

  const newLicense: License = {
    id: generateId(),
    username: payload.username,
    company_name: opts.companyName,
    machine_id: opts.machineId.trim(),
    expires_at: opts.expiresAt.toISOString(),
    is_active: true,
    is_admin: false,
    grace_period_days: 0,
    notes: opts.notes || '',
    last_login_at: null,
    created_at: new Date().toISOString(),
  };

  saveLicenses([newLicense, ...all]);
  return licenseContent;
}

/** Update a license */
export async function updateLicense(
  _adminKey: string,
  id: string,
  updates: { is_active?: boolean; expires_at?: string; company_name?: string; notes?: string }
): Promise<void> {
  const all = loadLicenses();
  const idx = all.findIndex(l => l.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...updates };
  saveLicenses(all);
}

/** Delete a license */
export async function deleteLicense(_adminKey: string, id: string): Promise<void> {
  saveLicenses(loadLicenses().filter(l => l.id !== id));
}

/** Regenerate and re-download a license file for an existing license */
export async function regenerateLicenseFile(license: License): Promise<string> {
  const payload: LicensePayload = {
    username: license.username,
    companyName: license.company_name,
    machineId: license.machine_id,
    expiresAt: license.expires_at,
    issuedAt: license.created_at,
    notes: license.notes || '',
    v: 1,
  };
  return generateLicenseFile(payload);
}

/** Stub */
export async function resetPassword(_adminKey: string, _id: string, _newPassword: string): Promise<void> { }

/** Stub */
export async function sendNotification(_adminKey: string, _targetUsername: string, _message: string): Promise<void> { }

/** Fetch recent login logs (stored locally) */
export async function getLoginLogs(
  _adminKey: string,
  limit = 50
): Promise<{ username: string; logged_in_at: string; machine_name: string }[]> {
  try {
    const raw = localStorage.getItem('plannex_login_logs');
    const logs = raw ? JSON.parse(raw) : [];
    return logs.slice(0, limit);
  } catch { return []; }
}

/** Record a login event */
export function recordLoginLog(username: string, machineId: string): void {
  try {
    const raw = localStorage.getItem('plannex_login_logs');
    const logs = raw ? JSON.parse(raw) : [];
    logs.unshift({ username, logged_in_at: new Date().toISOString(), machine_name: machineId });
    localStorage.setItem('plannex_login_logs', JSON.stringify(logs.slice(0, 200)));
  } catch { }
}

