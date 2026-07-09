// ============================================================
// Scenario Service — What-If Sandbox Engine
// Handles cloning, forward-pass recalculation, critical path
// ============================================================

import type { ScheduledTask, AppParameters } from '../types';

export interface ScenarioTaskOverride {
    taskId: number;
    newDuration?: number;  // hours
    newStartDate?: Date;
    newPredecessors?: number[];
    delayDays?: number;    // Extra delay added on top of dependencies
}

export interface Scenario {
    id: string;
    name: string;
    description?: string;
    color: string;
    createdAt: string;
    baselineTasks: ScheduledTask[];        // immutable copy of baseline
    overrides: Record<number, ScenarioTaskOverride>;
    computedTasks: ScenarioTask[];         // recalculated tasks
    baselineEndDate: Date;
    scenarioEndDate: Date;
    totalDelayDays: number;
    impactedTaskIds: number[];
    criticalPathIds: number[];
}

export interface ScenarioTask extends ScheduledTask {
    scenarioStartTime: Date;
    scenarioEndTime: Date;
    isDelayed: boolean;
    delayHours: number;
}

const SCENARIO_COLORS = [
    '#f59e0b', // amber
    '#3b82f6', // blue
    '#ec4899', // pink
    '#8b5cf6', // violet
    '#06b6d4', // cyan
    '#14b8a6', // teal
    '#f97316', // orange
];

let colorIndex = 0;

// ── Forward-pass scheduler ─────────────────────────────────────
// Given baseline tasks + overrides, recomputes all start/end dates
// using a topological forward pass (CPM-style).
export function recomputeScenario(
    baseline: ScheduledTask[],
    overrides: Record<number, ScenarioTaskOverride>,
    params: AppParameters
): ScenarioTask[] {
    const taskMap = new Map<number, ScheduledTask>(baseline.map(t => [t.id, t]));
    const computedMap = new Map<number, ScenarioTask>();

    // Build dependency adjacency
    const dependents = new Map<number, number[]>(); // id → [successors]
    baseline.forEach(t => {
        if (!dependents.has(t.id)) dependents.set(t.id, []);
        (t.predecessor || []).forEach(pId => {
            if (!dependents.has(pId)) dependents.set(pId, []);
            dependents.get(pId)!.push(t.id);
        });
    });

    // Topological sort (Kahn's algorithm)
    const inDeg = new Map<number, number>();
    baseline.forEach(t => {
        inDeg.set(t.id, (t.predecessor || []).filter(p => taskMap.has(p)).length);
    });

    const queue: number[] = [];
    inDeg.forEach((deg, id) => { if (deg === 0) queue.push(id); });

    const shutdownStart = new Date(params.shutdownStart);

    while (queue.length > 0) {
        const id = queue.shift()!;
        const base = taskMap.get(id);
        if (!base) continue;

        const override = overrides[id] || {};
        const durationHours = override.newDuration ?? base.duration;
        const extraDelayMs = (override.delayDays ?? 0) * 24 * 60 * 60 * 1000;

        // Earliest start = max end of all predecessors (in scenario)
        let earliestStart: Date;
        const preds = (override.newPredecessors ?? base.predecessor ?? []).filter(p => taskMap.has(p));
        if (preds.length === 0) {
            // No predecessors — use baseline start or shutdown start
            earliestStart = override.newStartDate ?? base.startTime;
        } else {
            let maxPredEnd = shutdownStart;
            preds.forEach(pId => {
                const comp = computedMap.get(pId);
                const predEnd = comp ? comp.scenarioEndTime : (taskMap.get(pId)?.endTime ?? shutdownStart);
                if (predEnd > maxPredEnd) maxPredEnd = predEnd;
            });
            earliestStart = override.newStartDate && override.newStartDate > maxPredEnd
                ? override.newStartDate
                : maxPredEnd;
        }

        // Apply extra delay
        const scenarioStart = new Date(earliestStart.getTime() + extraDelayMs);
        const scenarioEnd = new Date(scenarioStart.getTime() + durationHours * 60 * 60 * 1000);

        const delayHours = (scenarioStart.getTime() - base.startTime.getTime()) / (1000 * 60 * 60);

        const scenarioTask: ScenarioTask = {
            ...base,
            duration: durationHours,
            startTime: scenarioStart,    // keep ScheduledTask fields so Gantt still works
            endTime: scenarioEnd,
            scenarioStartTime: scenarioStart,
            scenarioEndTime: scenarioEnd,
            isDelayed: delayHours > 0.01,
            delayHours: Math.max(0, delayHours),
            predecessor: preds.length > 0 ? preds : (base.predecessor ?? []),
        };

        computedMap.set(id, scenarioTask);

        // Reduce in-degrees of successors
        (dependents.get(id) ?? []).forEach(succId => {
            const d = (inDeg.get(succId) ?? 1) - 1;
            inDeg.set(succId, d);
            if (d === 0) queue.push(succId);
        });
    }

    // Handle any tasks not reached (disconnected)
    baseline.forEach(t => {
        if (!computedMap.has(t.id)) {
            computedMap.set(t.id, {
                ...t,
                scenarioStartTime: t.startTime,
                scenarioEndTime: t.endTime,
                isDelayed: false,
                delayHours: 0,
            });
        }
    });

    return baseline.map(t => computedMap.get(t.id)!);
}

// ── Create a new scenario ─────────────────────────────────────
export function createScenario(
    baseline: ScheduledTask[],
    params: AppParameters,
    name?: string
): Scenario {
    const id = `scenario_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const color = SCENARIO_COLORS[colorIndex % SCENARIO_COLORS.length];
    colorIndex++;

    const baselineEndDate = baseline.length
        ? new Date(Math.max(...baseline.map(t => t.endTime.getTime())))
        : new Date(params.shutdownEnd);

    const computed = recomputeScenario(baseline, {}, params);
    const scenarioEndDate = computed.length
        ? new Date(Math.max(...computed.map(t => t.scenarioEndTime.getTime())))
        : baselineEndDate;

    return {
        id,
        name: name ?? `Scénario ${new Date().toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
        color,
        createdAt: new Date().toISOString(),
        baselineTasks: [...baseline],
        overrides: {},
        computedTasks: computed,
        baselineEndDate,
        scenarioEndDate,
        totalDelayDays: 0,
        impactedTaskIds: [],
        criticalPathIds: [],
    };
}

// ── Apply an override and recompute ──────────────────────────
export function applyOverride(
    scenario: Scenario,
    taskId: number,
    override: Partial<ScenarioTaskOverride>,
    params: AppParameters
): Scenario {
    const newOverrides = {
        ...scenario.overrides,
        [taskId]: { ...(scenario.overrides[taskId] ?? { taskId }), ...override, taskId },
    };

    const computed = recomputeScenario(scenario.baselineTasks, newOverrides, params);
    const scenarioEndDate = computed.length
        ? new Date(Math.max(...computed.map(t => t.scenarioEndTime.getTime())))
        : scenario.baselineEndDate;

    const delayMs = scenarioEndDate.getTime() - scenario.baselineEndDate.getTime();
    const totalDelayDays = Math.max(0, delayMs / (1000 * 60 * 60 * 24));

    const impactedTaskIds = computed.filter(t => t.isDelayed).map(t => t.id);

    return {
        ...scenario,
        overrides: newOverrides,
        computedTasks: computed,
        scenarioEndDate,
        totalDelayDays,
        impactedTaskIds,
    };
}

// ── Remove a single override ──────────────────────────────────
export function removeOverride(
    scenario: Scenario,
    taskId: number,
    params: AppParameters
): Scenario {
    const newOverrides = { ...scenario.overrides };
    delete newOverrides[taskId];
    return applyOverride({ ...scenario, overrides: newOverrides }, taskId, {}, params);
}

// ── Utility: format date ──────────────────────────────────────
export function formatDate(d: Date | null | undefined): string {
    if (!d || isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(d: Date | null | undefined): string {
    if (!d || isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
