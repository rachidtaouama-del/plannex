/**
 * adminLicenseService.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Admin operations via SECURITY DEFINER RPC functions.
 * Uses the safe ANON key — authentication is enforced server-side by the
 * activation_key of the admin account (passed on every request).
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = 'https://hntqukjrmjpootxqddfi.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SqyFH4KKAzbp8TBycHy2Hw_E0lLcf6t';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Types ─────────────────────────────────────────────────────────────────────
export interface License {
  id: string;
  username: string;
  company_name: string;
  activation_key: string;
  expires_at: string;
  is_active: boolean;
  is_admin: boolean;
  grace_period_days: number;
  notes: string;
  last_login_at: string | null;
  created_at: string;
}

/** Generate a unique activation key */
function generateActivationKey(username: string): string {
  const uid = crypto.randomUUID().split('-')[0].toUpperCase();
  const prefix = username.toUpperCase().slice(0, 4).padEnd(4, 'X');
  return `PLX-${prefix}-${uid}`;
}

// ── All functions require the admin's activation_key for server-side auth ─────

/** Fetch all licenses */
export async function getAllLicenses(adminKey: string): Promise<License[]> {
  const { data, error } = await supabase.rpc('admin_get_all_licenses', {
    p_activation_key: adminKey,
  });
  if (error) throw new Error(error.message);
  return (data as License[]) || [];
}

/** Create a new license */
export async function createLicense(
  adminKey: string,
  opts: { username: string; password: string; companyName: string; expiresAt: Date; notes?: string }
): Promise<void> {
  const passwordHash = await bcrypt.hash(opts.password, 10);
  const newKey = generateActivationKey(opts.username);

  const { error } = await supabase.rpc('admin_create_license', {
    p_activation_key:     adminKey,
    p_username:           opts.username,
    p_password_hash:      passwordHash,
    p_company_name:       opts.companyName,
    p_expires_at:         opts.expiresAt.toISOString(),
    p_new_activation_key: newKey,
    p_notes:              opts.notes || '',
  });
  if (error) throw new Error(error.message);
}

/** Update a license (any subset of fields) */
export async function updateLicense(
  adminKey: string,
  id: string,
  updates: { is_active?: boolean; expires_at?: string; company_name?: string; notes?: string }
): Promise<void> {
  const { error } = await supabase.rpc('admin_update_license', {
    p_activation_key: adminKey,
    p_target_id:      id,
    p_is_active:      updates.is_active      ?? null,
    p_expires_at:     updates.expires_at     ?? null,
    p_company_name:   updates.company_name   ?? null,
    p_notes:          updates.notes          ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Delete a license */
export async function deleteLicense(adminKey: string, id: string): Promise<void> {
  const { error } = await supabase.rpc('admin_delete_license', {
    p_activation_key: adminKey,
    p_target_id:      id,
  });
  if (error) throw new Error(error.message);
}

/** Reset a user's password */
export async function resetPassword(adminKey: string, id: string, newPassword: string): Promise<void> {
  const newHash = await bcrypt.hash(newPassword, 10);
  const { error } = await supabase.rpc('admin_reset_password', {
    p_activation_key: adminKey,
    p_target_id:      id,
    p_new_hash:       newHash,
  });
  if (error) throw new Error(error.message);
}

/** Send a push notification to a user */
export async function sendNotification(
  adminKey: string,
  targetUsername: string,
  message: string
): Promise<void> {
  const { error } = await supabase.rpc('admin_send_notification', {
    p_activation_key:   adminKey,
    p_target_username:  targetUsername,
    p_message:          message,
  });
  if (error) throw new Error(error.message);
}

/** Fetch recent login logs */
export async function getLoginLogs(
  adminKey: string,
  limit = 50
): Promise<{ username: string; logged_in_at: string; machine_name: string }[]> {
  const { data, error } = await supabase.rpc('admin_get_login_logs', {
    p_activation_key: adminKey,
    p_limit:          limit,
  });
  if (error) throw new Error(error.message);
  return (data as any[]) || [];
}
