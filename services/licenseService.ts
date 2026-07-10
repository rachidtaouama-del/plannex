// services/licenseService.ts
// User-facing Supabase service — uses publishable key (safe to embed in user app)
// All sensitive operations go through SECURITY DEFINER RPC functions

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = 'https://hntqukjrmjpootxqddfi.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_SqyFH4KKAzbp8TBycHy2Hw_E0lLcf6t';

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

export interface LicenseSession {
  username: string;
  companyName: string;
  activationKey: string;
  expiresAt: Date;
  isAdmin: boolean;
  gracePeriodDays: number;
}

export interface LoginResult {
  success: boolean;
  session?: LicenseSession;
  error?: 'not_found' | 'wrong_password' | 'inactive' | 'network_error';
}

/**
 * Validate username + password against the license database.
 * Returns a session object on success.
 */
export async function loginWithLicense(username: string, password: string): Promise<LoginResult> {
  try {
    const { data, error } = await supabase.rpc('validate_user_license', {
      p_username: username.toLowerCase().trim(),
    });

    if (error) {
      console.error('[licenseService] RPC error:', error);
      return { success: false, error: 'network_error' };
    }

    const record = data as {
      found: boolean;
      password_hash?: string;
      expires_at?: string;
      is_active?: boolean;
      is_admin?: boolean;
      company_name?: string;
      grace_period_days?: number;
      activation_key?: string;
    };

    if (!record.found) return { success: false, error: 'not_found' };
    if (!record.is_active) return { success: false, error: 'inactive' };

    // Verify password locally using bcrypt
    const passwordValid = await bcrypt.compare(password, record.password_hash!);
    if (!passwordValid) return { success: false, error: 'wrong_password' };

    return {
      success: true,
      session: {
        username: username.toLowerCase().trim(),
        companyName: record.company_name || '',
        activationKey: record.activation_key!,
        expiresAt: new Date(record.expires_at!),
        isAdmin: record.is_admin || false,
        gracePeriodDays: record.grace_period_days || 7,
      },
    };
  } catch (err) {
    console.error('[licenseService] Unexpected error:', err);
    return { success: false, error: 'network_error' };
  }
}

/**
 * Fetch unread notifications for this user.
 */
export async function fetchNotifications(
  username: string,
  activationKey: string
): Promise<{ id: string; message: string; created_at: string }[]> {
  try {
    const { data } = await supabase.rpc('get_user_notifications', {
      p_username: username,
      p_activation_key: activationKey,
    });
    if (data?.authorized && Array.isArray(data.notifications)) {
      return data.notifications;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(
  notificationId: string,
  username: string,
  activationKey: string
): Promise<void> {
  await supabase.rpc('mark_notification_read', {
    p_id: notificationId,
    p_username: username,
    p_activation_key: activationKey,
  });
}

/**
 * Log the user's login event.
 */
export async function logLogin(username: string, activationKey: string): Promise<void> {
  const machineName = (window as any).electronAPI?.getMachineName?.() || 'unknown';
  await supabase.rpc('log_user_login', {
    p_username: username,
    p_activation_key: activationKey,
    p_machine: machineName,
  });
}

/**
 * Calculate license status from session.
 */
export function getLicenseStatus(session: LicenseSession): {
  daysRemaining: number;
  isExpired: boolean;
  isInGrace: boolean;
  isHardLocked: boolean;
  status: 'valid' | 'warning' | 'critical' | 'grace' | 'locked';
} {
  const now = new Date();
  const diff = session.expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diff / (1000 * 60 * 60 * 24));
  const isExpired = daysRemaining <= 0;
  const isInGrace = isExpired && Math.abs(daysRemaining) <= session.gracePeriodDays;
  const isHardLocked = isExpired && !isInGrace;

  let status: 'valid' | 'warning' | 'critical' | 'grace' | 'locked';
  if (session.isAdmin) status = 'valid'; // admin never expires
  else if (isHardLocked) status = 'locked';
  else if (isInGrace) status = 'grace';
  else if (daysRemaining <= 7) status = 'critical';
  else if (daysRemaining <= 30) status = 'warning';
  else status = 'valid';

  return { daysRemaining, isExpired, isInGrace, isHardLocked, status };
}
