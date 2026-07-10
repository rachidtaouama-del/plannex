// services/adminLicenseService.ts
// Admin-facing Supabase service — uses SECRET key (only in admin panel)
// Has full read/write access to the license database

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = 'https://hntqukjrmjpootxqddfi.supabase.co';
const SUPABASE_SECRET_KEY = 'sb_secret_Nko_2spUKN_DwsV_oBP3DQ_wc19MJ_t';

// Service-role client — bypasses RLS, full access
const adminSupabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY);

export interface License {
  id: string;
  username: string;
  company_name: string | null;
  expires_at: string;
  is_active: boolean;
  is_admin: boolean;
  grace_period_days: number;
  notes: string | null;
  machine_name: string | null;
  last_login_at: string | null;
  created_at: string;
  activation_key: string;
}

export interface CreateLicenseInput {
  username: string;
  password: string;
  companyName: string;
  expiresAt: Date;
  gracePeriodDays?: number;
  notes?: string;
}

/** Generate a unique activation key */
function generateActivationKey(username: string): string {
  const uid = crypto.randomUUID().split('-')[0].toUpperCase();
  const prefix = username.toUpperCase().slice(0, 4).padEnd(4, 'X');
  return `PLX-${prefix}-${uid}`;
}

/** Fetch all licenses */
export async function getAllLicenses(): Promise<License[]> {
  const { data, error } = await adminSupabase
    .from('licenses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

/** Create a new user license */
export async function createLicense(input: CreateLicenseInput): Promise<License> {
  const passwordHash = await bcrypt.hash(input.password, 10);
  const activationKey = generateActivationKey(input.username);

  const { data, error } = await adminSupabase
    .from('licenses')
    .insert({
      username: input.username.toLowerCase().trim(),
      password_hash: passwordHash,
      activation_key: activationKey,
      company_name: input.companyName,
      expires_at: input.expiresAt.toISOString(),
      is_active: true,
      is_admin: false,
      grace_period_days: input.gracePeriodDays ?? 7,
      notes: input.notes || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Update license (expiry, active status, notes) */
export async function updateLicense(
  id: string,
  updates: Partial<{
    is_active: boolean;
    expires_at: string;
    grace_period_days: number;
    notes: string;
    company_name: string;
  }>
): Promise<void> {
  const { error } = await adminSupabase.from('licenses').update(updates).eq('id', id);
  if (error) throw error;
}

/** Delete a license */
export async function deleteLicense(id: string): Promise<void> {
  const { error } = await adminSupabase.from('licenses').delete().eq('id', id);
  if (error) throw error;
}

/** Reset a user's password */
export async function resetPassword(id: string, newPassword: string): Promise<void> {
  const passwordHash = await bcrypt.hash(newPassword, 10);
  const { error } = await adminSupabase
    .from('licenses')
    .update({ password_hash: passwordHash })
    .eq('id', id);
  if (error) throw error;
}

/** Send a notification to a user */
export async function sendNotification(username: string, message: string): Promise<void> {
  const { error } = await adminSupabase
    .from('notifications')
    .insert({ username, message, is_read: false });
  if (error) throw error;
}

/** Get all login logs */
export async function getLoginLogs(
  limit = 100
): Promise<{ username: string; logged_in_at: string; machine_name: string }[]> {
  const { data, error } = await adminSupabase
    .from('login_logs')
    .select('username, logged_in_at, machine_name')
    .order('logged_in_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
