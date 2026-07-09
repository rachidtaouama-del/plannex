/**
 * projectService.ts
 * localStorage-backed CRUD for projects — no Supabase dependency.
 */
import type { ProjectData } from '../components/ProjectHub';

const PROJECTS_KEY = 'plannex_projects';

// ─── Helpers ───────────────────────────────────────────────────────────────────
const loadAll = (): ProjectData[] => {
    try {
        const raw = localStorage.getItem(PROJECTS_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const saveAll = (projects: ProjectData[]): void => {
    try {
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    } catch (e) {
        console.error('projectService saveAll error:', e);
    }
};

const generateId = (): string =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);

// ─── Load all projects ─────────────────────────────────────────────────────────
export const loadProjectsFromDB = async (): Promise<ProjectData[]> => {
    return loadAll().sort(
        (a, b) => new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()
    );
};

// ─── Create a new project ──────────────────────────────────────────────────────
export const createProjectInDB = async (
    project: Omit<ProjectData, 'id' | 'createdAt' | 'updatedAt' | 'hasSessionData'>
): Promise<ProjectData | null> => {
    const now = new Date().toISOString();
    const newProject: ProjectData = {
        ...project,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
        hasSessionData: false,
    };
    const all = loadAll();
    saveAll([newProject, ...all]);
    return newProject;
};

// ─── Update project metadata ───────────────────────────────────────────────────
export const updateProjectInDB = async (
    id: string,
    updates: Partial<Pick<ProjectData, 'name' | 'description' | 'status'>>
): Promise<boolean> => {
    const all = loadAll();
    const idx = all.findIndex(p => p.id === id);
    if (idx === -1) return false;
    all[idx] = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
    saveAll(all);
    return true;
};

// ─── Delete a project ──────────────────────────────────────────────────────────
export const deleteProjectFromDB = async (id: string): Promise<boolean> => {
    const all = loadAll();
    const filtered = all.filter(p => p.id !== id);
    if (filtered.length === all.length) return false;
    saveAll(filtered);
    // Also remove session data for this project
    localStorage.removeItem(`plannex_session_${id}`);
    return true;
};

// ─── Auto-save session data ────────────────────────────────────────────────────
export const saveSessionToDB = async (projectId: string, sessionData: any): Promise<void> => {
    try {
        localStorage.setItem(`plannex_session_${projectId}`, JSON.stringify(sessionData));
        // Update hasSessionData flag on project
        await updateProjectInDB(projectId, {});
        const all = loadAll();
        const idx = all.findIndex(p => p.id === projectId);
        if (idx !== -1) {
            all[idx].hasSessionData = true;
            all[idx].updatedAt = new Date().toISOString();
            saveAll(all);
        }
    } catch (e) {
        console.warn('saveSessionToDB error:', e);
    }
};

// ─── Load session data for a project ──────────────────────────────────────────
export const loadSessionFromDB = async (projectId: string): Promise<any | null> => {
    try {
        const raw = localStorage.getItem(`plannex_session_${projectId}`);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

// ─── Load all profiles (admin view — returns mock users) ──────────────────────
export const loadAllProfiles = async () => {
    // No Supabase profiles — this is handled by mockUserService directly
    return [];
};
