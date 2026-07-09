/**
 * scenariosDb.ts
 * localStorage-backed CRUD for What-If Scenarios — no Supabase dependency.
 */

export interface DbScenario {
    id: string;
    project_id: string;
    owner_id: string;
    name: string;
    color: string;
    created_at: string;
    updated_at: string;
    overrides: Record<string, any>;
}

const getKey = (projectId: string) => `plannex_scenarios_${projectId}`;

const loadAll = (projectId: string): DbScenario[] => {
    try {
        const raw = localStorage.getItem(getKey(projectId));
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

const saveAll = (projectId: string, scenarios: DbScenario[]): void => {
    try {
        localStorage.setItem(getKey(projectId), JSON.stringify(scenarios));
    } catch (e) {
        console.error('scenariosDb saveAll error:', e);
    }
};

// ─── Load all scenarios for a project ─────────────────────────────────────────
export const loadScenariosFromDB = async (projectId: string): Promise<DbScenario[]> => {
    return loadAll(projectId).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
};

// ─── Upsert a scenario (create or update) ─────────────────────────────────────
export const upsertScenarioInDB = async (
    projectId: string,
    scenario: { id: string; name: string; color: string; overrides: Record<string, any> }
): Promise<boolean> => {
    const all = loadAll(projectId);
    const now = new Date().toISOString();
    const idx = all.findIndex(s => s.id === scenario.id);

    if (idx !== -1) {
        // Update existing
        all[idx] = { ...all[idx], ...scenario, updated_at: now };
    } else {
        // Create new
        all.push({
            id: scenario.id,
            project_id: projectId,
            owner_id: 'local',
            name: scenario.name,
            color: scenario.color,
            overrides: scenario.overrides,
            created_at: now,
            updated_at: now,
        });
    }

    saveAll(projectId, all);
    return true;
};

// ─── Delete a scenario ────────────────────────────────────────────────────────
export const deleteScenarioFromDB = async (scenarioId: string, projectId?: string): Promise<boolean> => {
    // If projectId is not provided, search all keys
    if (projectId) {
        const all = loadAll(projectId);
        const filtered = all.filter(s => s.id !== scenarioId);
        if (filtered.length === all.length) return false;
        saveAll(projectId, filtered);
        return true;
    }
    // Fallback: scan all localStorage keys for scenarios
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('plannex_scenarios_')) {
            const pid = key.replace('plannex_scenarios_', '');
            const all = loadAll(pid);
            const filtered = all.filter(s => s.id !== scenarioId);
            if (filtered.length < all.length) {
                saveAll(pid, filtered);
                return true;
            }
        }
    }
    return false;
};
