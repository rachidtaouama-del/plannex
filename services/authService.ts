/**
 * authService.ts
 * Pure localStorage-based authentication — no Supabase dependency.
 * Uses mockUserService as the user database (persisted in localStorage).
 */
import type { UserAccount } from '../types';
import { findMockUserByEmailOrUsername } from './mockUserService';

const STORAGE_KEY = 'plannex_user';

// ─── loginUser ─────────────────────────────────────────────────────────────
// Accepts username (e.g. "ADMIN") or email (e.g. "admin@plannex.com") and password.
export const loginUser = async (
    usernameOrEmail: string,
    password: string
): Promise<{ success: boolean; user?: UserAccount; message?: string }> => {
    const input = usernameOrEmail.trim();

    // Match by username OR email (case-insensitive)
    const user = findMockUserByEmailOrUsername(input, password);

    if (!user) {
        return { success: false, message: 'Identifiants incorrects. Vérifiez votre nom d\'utilisateur et mot de passe.' };
    }

    if (user.status === 'Suspended') {
        return { success: false, message: 'Compte suspendu. Contactez l\'administrateur.' };
    }

    if (user.expiresAt && new Date(user.expiresAt) < new Date()) {
        return { success: false, message: 'Compte expiré. Contactez l\'administrateur.' };
    }

    storeUser(user);
    return { success: true, user };
};

// ─── storeUser / retrieveUser / logoutUser ─────────────────────────────────
export const storeUser = (user: UserAccount): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
        console.error('Failed to store user', e);
    }
};

export const retrieveUser = (): UserAccount | null => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
        return null;
    } catch {
        return null;
    }
};

export const logoutUser = async (): Promise<void> => {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.error('Failed to logout', e);
    }
};

// ─── rehydrateUserFromSession ───────────────────────────────────────────────
// Restores user from localStorage after page refresh.
export const rehydrateUserFromSession = async (): Promise<UserAccount | null> => {
    return retrieveUser();
};
