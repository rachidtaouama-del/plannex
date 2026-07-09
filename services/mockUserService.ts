/**
 * mockUserService.ts
 * localStorage-backed user management — no Supabase dependency.
 * The default users (ADMIN, TR, SIHAMB) are seeded on first run.
 */
import type { UserAccount } from '../types';

const USERS_KEY = 'plannex_users';

// ─── Default seed users ────────────────────────────────────────────────────────
const defaultUsers: UserAccount[] = [
    {
        id: 1,
        firstName: 'ADMIN',
        lastName: 'RACHID TAOUAMA',
        email: 'admin@plannex.com',
        phone: '+212600000000',
        username: 'ADMIN',
        password: 'ADMIN123',
        role: 'admin',
        status: 'Active',
        expiresAt: null, // Admin never expires
        notifications: []
    },
    {
        id: 2,
        firstName: 'AHMED',
        lastName: 'ADAM',
        email: 'rachid.tawama@gmail.com',
        phone: '43434343434',
        username: 'TR',
        password: 'T@2026',
        role: 'Scheduler',
        status: 'Active',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        notifications: []
    },
    {
        id: 3,
        firstName: 'SIHAM',
        lastName: 'BAHRAOUI',
        email: 'siham@gmail.com',
        phone: '0671717171',
        username: 'SIHAMB',
        password: 'SIHAM@2128',
        role: 'Scheduler',
        status: 'Active',
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        notifications: []
    }
];

// ─── Persistence helpers ────────────────────────────────────────────────────────
const SEED_VERSION = 'v2'; // Bump this to force a re-seed with correct credentials
const SEED_VERSION_KEY = 'plannex_users_seed_version';

const loadUsers = (): UserAccount[] => {
    try {
        // If the seed version doesn't match, reset to defaults
        const storedVersion = localStorage.getItem(SEED_VERSION_KEY);
        if (storedVersion !== SEED_VERSION) {
            localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
            localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION);
            return defaultUsers;
        }
        const raw = localStorage.getItem(USERS_KEY);
        if (raw) return JSON.parse(raw);
        // First time: seed defaults
        localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
        return defaultUsers;
    } catch {
        return defaultUsers;
    }
};

const persistUsers = (users: UserAccount[]): void => {
    try {
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } catch (e) {
        console.error('mockUserService: failed to persist users', e);
    }
};

// ─── Public API ─────────────────────────────────────────────────────────────────
export const getMockUsers = (): UserAccount[] => {
    let users = loadUsers();
    // Auto-suspend users whose expiry date has passed
    users = users.map(u => {
        if (u.expiresAt && new Date(u.expiresAt) < new Date() && u.status === 'Active') {
            return { ...u, status: 'Suspended' };
        }
        return u;
    });
    persistUsers(users);
    return [...users];
};

export const saveMockUser = (userToSave: Omit<UserAccount, 'id' | 'status'> & { id?: number }): UserAccount => {
    let users = loadUsers();

    if (userToSave.id !== undefined) {
        // Edit existing user
        let updatedUser: UserAccount | undefined;
        users = users.map(u => {
            if (u.id === userToSave.id) {
                updatedUser = { ...u, ...userToSave };
                if (!userToSave.password) {
                    updatedUser.password = u.password;
                }
                updatedUser.notifications = userToSave.notifications || u.notifications || [];
                return updatedUser;
            }
            return u;
        });
        persistUsers(users);
        return updatedUser!;
    } else {
        // Create new user
        const newUser: UserAccount = {
            id: Math.max(0, ...users.map(u => u.id)) + 1,
            firstName: userToSave.firstName,
            lastName: userToSave.lastName,
            email: userToSave.email,
            phone: userToSave.phone,
            username: userToSave.username,
            password: userToSave.password!,
            role: userToSave.role,
            status: 'Active',
            picture: userToSave.picture,
            expiresAt: userToSave.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            notifications: []
        };
        users.push(newUser);
        persistUsers(users);
        return newUser;
    }
};

export const updateMockUserStatus = (userId: number, status: UserAccount['status']): UserAccount | undefined => {
    let users = loadUsers();
    let updatedUser: UserAccount | undefined;
    users = users.map(u => {
        if (u.id === userId) {
            updatedUser = { ...u, status };
            return updatedUser;
        }
        return u;
    });
    persistUsers(users);
    return updatedUser;
};

export const updateMockUserExpiry = (userId: number, daysToAdd: number): UserAccount | undefined => {
    let users = loadUsers();
    let updatedUser: UserAccount | undefined;
    users = users.map(u => {
        if (u.id === userId) {
            const baseDate = (u.expiresAt && new Date(u.expiresAt) > new Date()) ? new Date(u.expiresAt) : new Date();
            const newExpiry = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();
            updatedUser = { ...u, expiresAt: newExpiry, status: 'Active' };
            return updatedUser;
        }
        return u;
    });
    persistUsers(users);
    return updatedUser;
};

export const deleteMockUser = (userId: number): boolean => {
    const users = loadUsers();
    const filtered = users.filter(u => u.id !== userId);
    if (filtered.length === users.length) return false;
    persistUsers(filtered);
    return true;
};

export const findMockUserByCredentials = (username: string, password: string): UserAccount | undefined => {
    getMockUsers(); // Triggers auto-suspend and persistence
    const users = loadUsers();
    return users.find(u => u.username === username && u.password === password);
};

export const findMockUserByEmailOrUsername = (input: string, password: string): UserAccount | undefined => {
    getMockUsers(); // Triggers auto-suspend and persistence
    const users = loadUsers();
    const normalized = input.trim().toLowerCase();
    return users.find(u =>
        (u.username.toLowerCase() === normalized || u.email.toLowerCase() === normalized)
        && u.password === password
    );
};

// ─── Notifications ─────────────────────────────────────────────────────────────
export const sendNotification = (userId: number, message: string, from: 'admin' | 'system' = 'admin') => {
    let users = loadUsers();
    users = users.map(u => {
        if (u.id === userId) {
            const notif = { id: Math.random().toString(36).substr(2, 9), message, read: false, date: new Date().toISOString(), from };
            return { ...u, notifications: [...(u.notifications || []), notif] };
        }
        return u;
    });
    persistUsers(users);
};

export const broadcastNotification = (message: string, from: 'admin' | 'system' = 'admin') => {
    let users = loadUsers();
    users = users.map(u => {
        const notif = { id: Math.random().toString(36).substr(2, 9), message, read: false, date: new Date().toISOString(), from };
        return { ...u, notifications: [...(u.notifications || []), notif] };
    });
    persistUsers(users);
};

export const markNotificationsAsRead = (userId: number) => {
    let users = loadUsers();
    users = users.map(u => {
        if (u.id === userId) {
            const updatedNotifs = (u.notifications || []).map(n => ({ ...n, read: true }));
            return { ...u, notifications: updatedNotifs };
        }
        return u;
    });
    persistUsers(users);
};

export const getMockUserById = (userId: number): UserAccount | undefined => {
    return loadUsers().find(u => u.id === userId);
};
