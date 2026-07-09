/**
 * supabaseClient.ts
 * Supabase has been removed. All data is stored in localStorage.
 * This file is kept as a stub to avoid breaking any stray imports.
 */

export const supabase = null;

// ─── Database types (kept for type compatibility) ───────────────────────────
export interface DbProfile {
    id: string;
    name: string;
    role: 'admin' | 'user';
    created_at: string;
}

export interface DbProject {
    id: string;
    owner_id: string;
    name: string;
    description: string;
    mode: 'expert' | 'libre';
    status: 'en_cours' | 'termine';
    session_data: any | null;
    created_at: string;
    updated_at: string;
}
