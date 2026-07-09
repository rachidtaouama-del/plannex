import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
    Plus, Trash2, Edit3, ArrowLeft,
    AlertTriangle, CheckCircle2, Calendar, TrendingUp, TrendingDown,
    Zap, GitBranch, Activity, Target, RotateCcw, Eye, EyeOff,
    X, Save, FlaskConical, Layers, ChevronLeft, ChevronDown, BarChart2,
    Clock, Flame, Shield, Cpu, ChevronsRight, CloudUpload, RefreshCw
} from 'lucide-react';
import type { ScheduledTask, AppParameters } from '../types';
import {
    createScenario, applyOverride, removeOverride, formatDate, formatDateTime,
    type Scenario, type ScenarioTask
} from '../services/scenarioService';
import { loadScenariosFromDB, upsertScenarioInDB, deleteScenarioFromDB } from '../services/scenariosDb';

interface WhatIfScenarioPageProps {
    baselineTasks: ScheduledTask[];
    params: AppParameters;
    projectId: string | null;
    onBack: () => void;
}

// ── Colour helpers ────────────────────────────────────────────
const fmtDays = (h: number) => {
    const d = h / 24;
    if (d < 1) return `${Math.round(h)}h`;
    return `${d.toFixed(1)}j`;
};

type DelayUnit = 'hours' | 'days' | 'months';

const fmtDelay = (h: number, unit: DelayUnit): string => {
    if (unit === 'hours') return `${h.toFixed(1)}h`;
    if (unit === 'months') return `${(h / 24 / 30).toFixed(2)} mois`;
    const d = h / 24;
    return `${d.toFixed(1)}j`;
};

// ── Mini Gantt bar overlay ────────────────────────────────────
const GanttOverlay: React.FC<{
    baseline: ScheduledTask[];
    scenario: Scenario | null;
    showBaseline: boolean;
}> = ({ baseline, scenario, showBaseline }) => {
    if (!baseline.length) return null;

    const minT = Math.min(...baseline.map(t => t.startTime.getTime()));
    const maxT = scenario
        ? Math.max(...scenario.computedTasks.map(t => t.scenarioEndTime.getTime()), ...baseline.map(t => t.endTime.getTime()))
        : Math.max(...baseline.map(t => t.endTime.getTime()));
    const range = maxT - minT || 1;

    const pct = (t: Date) => ((t.getTime() - minT) / range) * 100;
    const tasks = baseline.slice(0, 30);

    return (
        <div style={{ fontFamily: 'monospace' }}>
            {/* Timeline header */}
            <div className="flex justify-between text-[9px] text-slate-600 mb-3 px-2">
                <span>{formatDate(new Date(minT))}</span>
                <span>{formatDate(new Date(maxT))}</span>
            </div>

            <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                {tasks.map(t => {
                    const scenTask = scenario?.computedTasks.find(s => s.id === t.id);
                    const isImpacted = scenario?.impactedTaskIds.includes(t.id);

                    const bLeft = pct(t.startTime);
                    const bWidth = Math.max(0.3, pct(t.endTime) - bLeft);
                    const sLeft = scenTask ? pct(scenTask.scenarioStartTime) : bLeft;
                    const sWidth = scenTask ? Math.max(0.3, pct(scenTask.scenarioEndTime) - sLeft) : bWidth;

                    return (
                        <div key={t.id} className="group flex items-center gap-3">
                            <div className="w-36 shrink-0 truncate text-[10px] text-slate-400 text-right pr-2"
                                title={t.action}>
                                {t.action.length > 18 ? t.action.slice(0, 18) + '…' : t.action}
                            </div>
                            <div className="flex-1 relative h-5">
                                {/* baseline bar */}
                                {showBaseline && (
                                    <div
                                        className="absolute top-1/2 h-2 -translate-y-1/2 rounded-sm opacity-30"
                                        style={{
                                            left: `${bLeft}%`,
                                            width: `${bWidth}%`,
                                            background: '#94a3b8',
                                            border: '1px solid #64748b',
                                        }}
                                    />
                                )}
                                {/* scenario bar */}
                                {scenTask && (
                                    <div
                                        className="absolute top-1/2 h-3 -translate-y-1/2 rounded-sm transition-all duration-500"
                                        style={{
                                            left: `${sLeft}%`,
                                            width: `${sWidth}%`,
                                            background: isImpacted
                                                ? `linear-gradient(90deg, ${scenario!.color}, ${scenario!.color}cc)`
                                                : `${scenario!.color}99`,
                                            border: `1px solid ${scenario!.color}`,
                                            boxShadow: isImpacted ? `0 0 8px ${scenario!.color}60` : 'none',
                                        }}
                                    />
                                )}
                            </div>
                            {isImpacted && (
                                <div className="shrink-0 w-2 h-2 rounded-full animate-pulse"
                                    style={{ background: scenario?.color }} />
                            )}
                        </div>
                    );
                })}
                {baseline.length > 30 && (
                    <p className="text-center text-slate-600 text-[9px] pt-2">
                        +{baseline.length - 30} tâches supplémentaires non affichées
                    </p>
                )}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-white/5">
                {showBaseline && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-2 rounded-sm bg-slate-500 opacity-40" />
                        <span className="text-[9px] text-slate-500">Baseline</span>
                    </div>
                )}
                {scenario && (
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-3 rounded-sm" style={{ background: scenario.color }} />
                        <span className="text-[9px] text-slate-300">{scenario.name}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Task Override Modal ───────────────────────────────────────
const TaskOverrideModal: React.FC<{
    task: ScheduledTask;
    existing?: { newDuration?: number; delayDays?: number };
    onSave: (override: { newDuration?: number; delayDays?: number }) => void;
    onClose: () => void;
    scenarioColor: string;
}> = ({ task, existing, onSave, onClose, scenarioColor }) => {
    const [duration, setDuration] = useState(
        existing?.newDuration !== undefined ? String(existing.newDuration) : String(task.duration)
    );
    const [delay, setDelay] = useState(
        existing?.delayDays !== undefined ? String(existing.delayDays) : '0'
    );
    const [delayUnit, setDelayUnit] = useState<'hours' | 'days'>('days');

    const handleSave = () => {
        const d = parseFloat(duration);
        const rawDelay = parseFloat(delay);
        const delayInDays = delayUnit === 'hours' ? rawDelay / 24 : rawDelay;
        onSave({
            newDuration: isNaN(d) ? undefined : d,
            delayDays: isNaN(delayInDays) ? 0 : delayInDays,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="w-full max-w-md rounded-3xl overflow-hidden"
                style={{ background: '#0c0c0e', border: `1px solid ${scenarioColor}30`, boxShadow: `0 0 60px ${scenarioColor}20` }}>

                {/* Header */}
                <div className="p-6 border-b" style={{ borderColor: `${scenarioColor}20` }}>
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: scenarioColor }}>
                                Modifier la tâche — Sandbox
                            </p>
                            <h3 className="text-base font-black text-white truncate">{task.action}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{task.discipline} · OT {task.ot || '—'}</p>
                        </div>
                        <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="p-6 space-y-5">
                    {/* Baseline info */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Durée baseline', val: `${task.duration}h` },
                            { label: 'Début baseline', val: task.startTime.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) },
                        ].map(i => (
                            <div key={i.label} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">{i.label}</p>
                                <p className="text-sm font-black text-white">{i.val}</p>
                            </div>
                        ))}
                    </div>

                    {/* Duration override */}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                            Nouvelle Durée (heures)
                        </label>
                        <input
                            type="number"
                            value={duration}
                            onChange={e => setDuration(e.target.value)}
                            min={0}
                            step={0.5}
                            className="w-full px-4 py-3 rounded-xl text-white text-sm font-bold bg-transparent outline-none focus:ring-1 transition-all"
                            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${scenarioColor}40` }}
                        />
                    </div>

                    {/* Delay override */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Retard Supplémentaire</label>
                            <div className="flex items-center gap-1 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                {(['hours', 'days'] as const).map(u => (
                                    <button key={u} onClick={() => setDelayUnit(u)}
                                        className="px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all"
                                        style={{ background: delayUnit === u ? scenarioColor : 'transparent', color: delayUnit === u ? '#000' : '#64748b' }}>
                                        {u === 'hours' ? 'Heures' : 'Jours'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <input
                            type="number"
                            value={delay}
                            onChange={e => setDelay(e.target.value)}
                            min={0}
                            step={delayUnit === 'hours' ? 1 : 0.5}
                            className="w-full px-4 py-3 rounded-xl text-white text-sm font-bold bg-transparent outline-none focus:ring-1 transition-all"
                            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${scenarioColor}40` }}
                        />
                        <p className="text-[9px] text-slate-600 mt-1.5">Ce retard s'ajoute au délai normal et se propage aux tâches dépendantes.</p>
                    </div>
                </div>

                <div className="p-6 pt-0 flex gap-3">
                    <button onClick={onClose}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-white"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        Annuler
                    </button>
                    <button onClick={handleSave}
                        className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all hover:scale-105 active:scale-95"
                        style={{ background: scenarioColor, boxShadow: `0 0 20px ${scenarioColor}40` }}>
                        <Save className="w-3.5 h-3.5 inline mr-1.5" />
                        Appliquer
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Scenario Card (sidebar) ───────────────────────────────────
const ScenarioCard: React.FC<{
    scenario: Scenario;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
    onRename: (name: string) => void;
}> = ({ scenario, isActive, onSelect, onDelete, onRename }) => {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(scenario.name);

    const delaySign = scenario.totalDelayDays > 0 ? '+' : '';
    const delayColor = scenario.totalDelayDays > 0 ? '#ef4444' : '#10b981';

    return (
        <div
            className="rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden group"
            style={{
                background: isActive ? `${scenario.color}10` : '#0c0c0e',
                border: `1px solid ${isActive ? scenario.color + '50' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: isActive ? `0 0 30px ${scenario.color}15` : 'none',
            }}
            onClick={onSelect}
        >
            {/* top accent */}
            <div className="h-0.5" style={{ background: isActive ? scenario.color : 'transparent' }} />

            <div className="p-4">
                {/* Name row */}
                <div className="flex items-start gap-2 mb-3" onClick={e => e.stopPropagation()}>
                    <div className="w-3 h-3 rounded-full mt-0.5 shrink-0" style={{ background: scenario.color }} />
                    {editing ? (
                        <input
                            autoFocus
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onBlur={() => { onRename(name); setEditing(false); }}
                            onKeyDown={e => { if (e.key === 'Enter') { onRename(name); setEditing(false); } }}
                            className="flex-1 bg-transparent text-white text-xs font-bold outline-none border-b border-white/20"
                            onClick={e => e.stopPropagation()}
                        />
                    ) : (
                        <span className="flex-1 text-xs font-bold text-white leading-tight">{scenario.name}</span>
                    )}
                    <button
                        onClick={e => { e.stopPropagation(); setEditing(true); }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-white transition-all"
                    >
                        <Edit3 className="w-3 h-3" />
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <p className="text-[8px] text-slate-600 uppercase tracking-widest">Fin Scénario</p>
                        <p className="text-[10px] font-black text-white">{formatDate(scenario.scenarioEndDate)}</p>
                    </div>
                    <div className="p-2 rounded-lg" style={{ background: `${delayColor}0a` }}>
                        <p className="text-[8px] text-slate-600 uppercase tracking-widest">Écart</p>
                        <p className="text-[10px] font-black" style={{ color: delayColor }}>
                            {delaySign}{scenario.totalDelayDays.toFixed(1)}j
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                    <span className="text-[8px] text-slate-600 font-mono">{Object.keys(scenario.overrides).length} modif.</span>
                    <button
                        onClick={e => { e.stopPropagation(); onDelete(); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── MAIN PAGE ─────────────────────────────────────────────────
const WhatIfScenarioPage: React.FC<WhatIfScenarioPageProps> = ({ baselineTasks, params, projectId, onBack }) => {
    const [scenarios, setScenarios] = useState<Scenario[]>([]);
    const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
    const [showBaseline, setShowBaseline] = useState(true);
    const [searchTask, setSearchTask] = useState('');
    const [overrideModal, setOverrideModal] = useState<{ task: ScheduledTask } | null>(null);
    const [activeTab, setActiveTab] = useState<'analytics' | 'tasks' | 'impact'>('analytics');
    const [taskFilter, setTaskFilter] = useState<'all' | 'impacted' | 'modified'>('all');
    const [isCreating, setIsCreating] = useState(false);
    const [newScenarioName, setNewScenarioName] = useState('');
    const [ganttGroupBy, setGanttGroupBy] = useState<'family' | 'discipline' | 'flat'>('family');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [delayUnit, setDelayUnit] = useState<DelayUnit>('days');
    const [impactView, setImpactView] = useState<'heatmap' | 'cascade' | 'disciplines' | 'compare'>('heatmap');
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const activeScenario = scenarios.find(s => s.id === activeScenarioId) ?? null;

    const baselineEndDate = useMemo(() => {
        if (!baselineTasks.length) return new Date(params.shutdownEnd);
        return new Date(Math.max(...baselineTasks.map(t => t.endTime.getTime())));
    }, [baselineTasks, params]);

    const handleCreateScenario = () => {
        const name = newScenarioName.trim() || undefined;
        const s = createScenario(baselineTasks, params, name);
        setScenarios(prev => [...prev, s]);
        setActiveScenarioId(s.id);
        setIsCreating(false);
        setNewScenarioName('');
    };

    const handleDeleteScenario = (id: string) => {
        setScenarios(prev => prev.filter(s => s.id !== id));
        if (activeScenarioId === id) setActiveScenarioId(null);
        if (projectId) deleteScenarioFromDB(id);
    };

    const handleRenameScenario = (id: string, name: string) => {
        setScenarios(prev => prev.map(s => s.id === id ? { ...s, name } : s));
    };

    const handleApplyOverride = useCallback((task: ScheduledTask, override: { newDuration?: number; delayDays?: number }) => {
        if (!activeScenarioId) return;
        setScenarios(prev => prev.map(s => {
            if (s.id !== activeScenarioId) return s;
            return applyOverride(s, task.id, override, params);
        }));
    }, [activeScenarioId, params]);

    const handleRemoveOverride = (taskId: number) => {
        if (!activeScenarioId) return;
        setScenarios(prev => prev.map(s => {
            if (s.id !== activeScenarioId) return s;
            return removeOverride(s, taskId, params);
        }));
    };

    const handleResetScenario = () => {
        if (!activeScenarioId) return;
        setScenarios(prev => prev.map(s => {
            if (s.id !== activeScenarioId) return s;
            const fresh = createScenario(s.baselineTasks, params, s.name);
            return { ...fresh, id: s.id, color: s.color, createdAt: s.createdAt };
        }));
    };

    const filteredTasks = useMemo(() => {
        let list = baselineTasks;
        if (searchTask) {
            list = list.filter(t =>
                t.action.toLowerCase().includes(searchTask.toLowerCase()) ||
                t.discipline.toLowerCase().includes(searchTask.toLowerCase())
            );
        }
        if (taskFilter === 'impacted' && activeScenario) {
            list = list.filter(t => activeScenario.impactedTaskIds.includes(t.id));
        }
        if (taskFilter === 'modified' && activeScenario) {
            list = list.filter(t => activeScenario.overrides[t.id] !== undefined);
        }
        return list;
    }, [baselineTasks, searchTask, taskFilter, activeScenario]);

    const scenarioEndDate = activeScenario?.scenarioEndDate;
    const totalDelayDays = activeScenario?.totalDelayDays ?? 0;
    const impactedCount = activeScenario?.impactedTaskIds.length ?? 0;
    const modifiedCount = Object.keys(activeScenario?.overrides ?? {}).length;

    // ── Load scenarios from Supabase on mount ──────────────────
    useEffect(() => {
        if (!projectId) return;
        setIsSyncing(true);
        loadScenariosFromDB(projectId).then(rows => {
            if (!rows.length) { setIsSyncing(false); return; }
            // Reconstruct Scenario objects from DB stubs
            const rehydrated: Scenario[] = rows.map(row => {
                const overrides: Record<number, any> = {};
                Object.entries(row.overrides).forEach(([k, v]) => { overrides[Number(k)] = v; });
                const s = createScenario(baselineTasks, params, row.name);
                s.id = row.id;
                s.color = row.color;
                s.createdAt = row.created_at;
                // Reapply all overrides
                let rebuilt = { ...s, overrides: {} } as Scenario;
                Object.entries(overrides).forEach(([_k, ov]) => {
                    const tId = ov.taskId as number;
                    rebuilt = applyOverride(rebuilt, tId, ov, params);
                });
                return rebuilt;
            });
            setScenarios(rehydrated);
            setActiveScenarioId(rehydrated[0]?.id ?? null);
            setIsSyncing(false);
        }).catch(() => setIsSyncing(false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    // ── Debounced auto-save on scenario changes ────────────────
    useEffect(() => {
        if (!projectId || !scenarios.length) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        setSyncStatus('saving');
        saveTimerRef.current = setTimeout(async () => {
            const results = await Promise.all(
                scenarios.map(s => upsertScenarioInDB(projectId, {
                    id: s.id,
                    name: s.name,
                    color: s.color,
                    overrides: s.overrides as Record<string, any>,
                }))
            );
            setSyncStatus(results.every(Boolean) ? 'saved' : 'error');
            setTimeout(() => setSyncStatus('idle'), 2500);
        }, 1200);
        return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
    }, [scenarios, projectId]);

    return (
        <div className="min-h-screen w-full text-white" style={{ background: '#060608', fontFamily: "'Inter', sans-serif" }}>
            <style>{`
        @keyframes siSlide { from { opacity:0; transform:translateX(-12px); } to { opacity:1; transform:translateX(0); } }
        @keyframes siUp    { from { opacity:0; transform:translateY(10px); }  to { opacity:1; transform:translateY(0); } }
        .si-slide { animation: siSlide 0.4s ease forwards; }
        .si-up    { animation: siUp    0.4s ease forwards; }
        @media (max-width: 768px) {
            .si-layout { flex-direction: column !important; }
            .si-sidebar { width: 100% !important; }
        }
      `}</style>

            {/* ══ STICKY HEADER ══ */}
            <div className="sticky top-0 z-50 border-b" style={{ background: 'rgba(6,6,8,0.92)', backdropFilter: 'blur(24px)', borderColor: 'rgba(245,158,11,0.2)' }}>
                <div className="max-w-[1800px] mx-auto px-6 py-3.5 flex items-center gap-4">
                    <button onClick={onBack}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <ArrowLeft className="w-4 h-4 text-slate-400" />
                    </button>
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.35)' }}>
                        <FlaskConical className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.4em] text-amber-500">Sandbox · Non-Destructif</p>
                        <h1 className="text-lg font-black text-white tracking-tighter -mt-0.5">What-If Scenario Analysis</h1>
                    </div>

                    {/* Sync Status Badge */}
                    <div className="ml-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                        {syncStatus === 'saving' && <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />}
                        {syncStatus === 'saved' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        {syncStatus === 'error' && <AlertTriangle className="w-3 h-3 text-red-400" />}
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {syncStatus === 'idle' ? 'Sync' : syncStatus}
                        </span>
                    </div>

                    {/* Baseline pill */}
                    <div className="hidden lg:flex items-center gap-3 ml-6 px-4 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="w-2 h-2 rounded-full bg-slate-400 opacity-50" />
                        <div>
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest">Fin Baseline</p>
                            <p className="text-xs font-black text-slate-300">{formatDateTime(baselineEndDate)}</p>
                        </div>
                        <div className="h-5 w-px bg-white/5 mx-1" />
                        <div>
                            <p className="text-[8px] text-slate-500 uppercase tracking-widest">Tâches</p>
                            <p className="text-xs font-black text-slate-300">{baselineTasks.length}</p>
                        </div>
                    </div>

                    {/* Scenario impact pill */}
                    {activeScenario && (
                        <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-xl transition-all" style={{ background: `${activeScenario.color}0f`, border: `1px solid ${activeScenario.color}35` }}>
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: activeScenario.color }} />
                            <div>
                                <p className="text-[8px] uppercase tracking-widest" style={{ color: activeScenario.color }}>Fin Scénario Actif</p>
                                <p className="text-xs font-black text-white">{formatDateTime(scenarioEndDate)}</p>
                            </div>
                            {totalDelayDays > 0 && (
                                <>
                                    <div className="h-5 w-px bg-white/5 mx-1" />
                                    <div>
                                        <p className="text-[8px] text-red-400 uppercase tracking-widest">Retard Total</p>
                                        <p className="text-xs font-black text-red-400">+{totalDelayDays.toFixed(1)} jours</p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <div className="ml-auto flex items-center gap-3">
                        <button
                            onClick={handleResetScenario}
                            disabled={!activeScenario || modifiedCount === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#94a3b8' }}>
                            <RotateCcw className="w-3.5 h-3.5" />
                            Réinitialiser
                        </button>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-black transition-all hover:scale-105 active:scale-95"
                            style={{ background: '#f59e0b', boxShadow: '0 0 20px rgba(245,158,11,0.3)' }}>
                            <Plus className="w-3.5 h-3.5" />
                            Créer Scénario
                        </button>
                    </div>
                </div>
            </div>

            {/* Create Scenario Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }} onClick={e => e.target === e.currentTarget && setIsCreating(false)}>
                    <div className="w-full max-w-sm rounded-3xl p-8" style={{ background: '#0c0c0e', border: '1px solid rgba(245,158,11,0.3)', boxShadow: '0 0 60px rgba(245,158,11,0.15)' }}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
                                <FlaskConical className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Nouveau Scénario</p>
                                <h3 className="text-base font-black text-white">Créer un Sandbox</h3>
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                            Toutes les tâches du planning baseline seront clonées. Vos modifications ne toucheront jamais les données originales.
                        </p>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nom du scénario (optionnel)</label>
                        <input
                            autoFocus
                            value={newScenarioName}
                            onChange={e => setNewScenarioName(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleCreateScenario()}
                            placeholder="Ex: Retard Transformateur +45j"
                            className="w-full px-4 py-3 rounded-xl text-white text-sm bg-transparent outline-none mb-6"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(245,158,11,0.3)' }}
                        />
                        <div className="flex gap-3">
                            <button onClick={() => setIsCreating(false)} className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>Annuler</button>
                            <button onClick={handleCreateScenario} className="flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-black" style={{ background: '#f59e0b', boxShadow: '0 0 20px rgba(245,158,11,0.3)' }}>
                                <Plus className="w-3.5 h-3.5 inline mr-1" />
                                Créer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Override Modal */}
            {overrideModal && activeScenario && (
                <TaskOverrideModal
                    task={overrideModal.task}
                    existing={activeScenario.overrides[overrideModal.task.id]}
                    onSave={override => handleApplyOverride(overrideModal.task, override)}
                    onClose={() => setOverrideModal(null)}
                    scenarioColor={activeScenario.color}
                />
            )}

            {/* ══ MAIN LAYOUT ══ */}
            <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-10 py-6 lg:py-8">

                {/* Loading state from DB */}
                {isSyncing && (
                    <div className="flex flex-col items-center justify-center py-40">
                        <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mb-4" />
                        <p className="text-slate-400 text-sm">Chargement des scénarios…</p>
                    </div>
                )}

                {!isSyncing && scenarios.length === 0 && (
                    <div className="si-up flex flex-col items-center justify-center py-40 text-center">
                        <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)' }}>
                            <FlaskConical className="w-12 h-12 text-amber-400/40" />
                        </div>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter mb-3">Aucun Scénario</h2>
                        <p className="text-slate-500 max-w-md leading-relaxed mb-8">
                            Créez votre premier scénario sandbox pour simuler des retards, modifier des durées et voir l'impact sur le planning — sans toucher aux données réelles.
                        </p>
                        <button
                            onClick={() => setIsCreating(true)}
                            className="flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-black uppercase tracking-widest text-black transition-all hover:scale-105 active:scale-95"
                            style={{ background: '#f59e0b', boxShadow: '0 0 30px rgba(245,158,11,0.3)' }}>
                            <Plus className="w-5 h-5" />
                            Créer mon premier scénario
                        </button>
                        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl w-full">
                            {[
                                { icon: <GitBranch className="w-5 h-5" />, color: '#f59e0b', title: 'Isolé & Sûr', desc: 'Le baseline ne sera jamais modifié. Chaque scénario est une copie indépendante.' },
                                { icon: <Zap className="w-5 h-5" />, color: '#3b82f6', title: 'Recalcul Instantané', desc: 'Algorithme CPM en forward-pass. Les dépendances se propagent automatiquement.' },
                                { icon: <Layers className="w-5 h-5" />, color: '#ec4899', title: 'Multi-Scénarios', desc: 'Comparez visuellement plusieurs hypothèses côte à côte avec overlay Gantt.' },
                            ].map(f => (
                                <div key={f.title} className="p-5 rounded-2xl text-left" style={{ background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: `${f.color}15`, border: `1px solid ${f.color}25` }}>
                                        <span style={{ color: f.color }}>{f.icon}</span>
                                    </div>
                                    <p className="text-xs font-black text-white mb-1">{f.title}</p>
                                    <p className="text-[10px] text-slate-500 leading-relaxed">{f.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main layout when scenarios exist */}
                {!isSyncing && scenarios.length > 0 && (
                    <div className="flex gap-6 si-layout">

                        {/* ── SIDEBAR ── */}
                        <div className={`si-sidebar shrink-0 space-y-4 si-slide transition-all duration-300 ${sidebarCollapsed ? 'w-12' : 'lg:w-72 w-full'}`}>
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                {!sidebarCollapsed && <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Mes Scénarios ({scenarios.length})</h2>}
                                <button onClick={() => setSidebarCollapsed(p => !p)}
                                    className="ml-auto w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-white transition-all"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                    {sidebarCollapsed ? <ChevronsRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                                </button>
                            </div>

                            {!sidebarCollapsed && (
                                <>
                                    {scenarios.map(s => (
                                        <ScenarioCard
                                            key={s.id}
                                            scenario={s}
                                            isActive={s.id === activeScenarioId}
                                            onSelect={() => setActiveScenarioId(s.id)}
                                            onDelete={() => handleDeleteScenario(s.id)}
                                            onRename={name => handleRenameScenario(s.id, name)}
                                        />
                                    ))}

                                    <button
                                        onClick={() => setIsCreating(true)}
                                        className="w-full py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-amber-400 transition-all"
                                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.08)' }}>
                                        <Plus className="w-3.5 h-3.5 inline mr-1" />
                                        Ajouter un scénario
                                    </button>

                                    {/* Baseline summary card */}
                                    <div className="mt-4 p-4 rounded-2xl" style={{ background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-3">Baseline de Référence</p>
                                        <div className="space-y-2">
                                            {[
                                                { l: 'Tâches', v: baselineTasks.length },
                                                { l: 'Fin Projet', v: formatDate(baselineEndDate) },
                                            ].map(i => (
                                                <div key={i.l} className="flex justify-between">
                                                    <span className="text-[9px] text-slate-600">{i.l}</span>
                                                    <span className="text-[9px] font-black text-slate-400">{String(i.v)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Collapsed: mini colored dots for each scenario */}
                            {sidebarCollapsed && (
                                <div className="flex flex-col items-center gap-3 pt-2">
                                    {scenarios.map(s => (
                                        <button key={s.id} onClick={() => { setActiveScenarioId(s.id); setSidebarCollapsed(false); }}
                                            title={s.name}
                                            className="w-6 h-6 rounded-full transition-all hover:scale-125"
                                            style={{ background: s.color, boxShadow: s.id === activeScenarioId ? `0 0 12px ${s.color}` : 'none' }} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* ── MAIN PANEL ── */}
                        <div className="flex-1 min-w-0 si-up">
                            {!activeScenario ? (
                                <div className="flex flex-col items-center justify-center h-80 text-center rounded-3xl" style={{ background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <Eye className="w-12 h-12 text-slate-700 mb-4" />
                                    <p className="text-slate-500 font-bold">Sélectionnez un scénario pour commencer l'analyse</p>
                                </div>
                            ) : (
                                <div className="space-y-6">

                                    {/* Impact KPI Bar */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            {
                                                label: 'Fin Baseline',
                                                value: formatDateTime(baselineEndDate),
                                                icon: <Calendar className="w-4 h-4" />,
                                                color: '#94a3b8',
                                                sub: 'Référence originale',
                                            },
                                            {
                                                label: 'Fin Scénario',
                                                value: formatDateTime(scenarioEndDate),
                                                icon: <Calendar className="w-4 h-4" />,
                                                color: activeScenario.color,
                                                sub: activeScenario.name,
                                            },
                                            {
                                                label: 'Retard Total',
                                                value: fmtDelay(totalDelayDays * 24, delayUnit),
                                                icon: totalDelayDays > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
                                                color: totalDelayDays > 0 ? '#ef4444' : '#10b981',
                                                sub: 'Impact sur date fin',
                                            },
                                            {
                                                label: 'Tâches Impactées',
                                                value: `${impactedCount} / ${baselineTasks.length}`,
                                                icon: <AlertTriangle className="w-4 h-4" />,
                                                color: impactedCount > 0 ? '#f59e0b' : '#10b981',
                                                sub: `${modifiedCount} modification(s)`,
                                            },
                                        ].map(kpi => (
                                            <div key={kpi.label} className="p-5 rounded-2xl transition-all hover:scale-[1.02]"
                                                style={{ background: `${kpi.color}0a`, border: `1px solid ${kpi.color}25` }}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span style={{ color: kpi.color }}>{kpi.icon}</span>
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{kpi.label}</p>
                                                </div>
                                                <p className="text-xl font-black text-white leading-tight mb-0.5" style={{ letterSpacing: '-0.02em' }}>{kpi.value}</p>
                                                <p className="text-[9px]" style={{ color: kpi.color }}>{kpi.sub}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Tabs + Delay Unit Selector */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <div className="flex items-center gap-1 p-1.5 rounded-2xl flex-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            {([
                                                { key: 'analytics', label: 'Vue Analytique', icon: <BarChart2 className="w-3.5 h-3.5" /> },
                                                { key: 'tasks', label: 'Modifier Tâches', icon: <Edit3 className="w-3.5 h-3.5" /> },
                                                { key: 'impact', label: 'Analyse Impact', icon: <Target className="w-3.5 h-3.5" /> },
                                            ] as const).map(tab => (
                                                <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
                                                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                    style={{ background: activeTab === tab.key ? activeScenario.color : 'transparent', color: activeTab === tab.key ? '#000' : '#64748b' }}>
                                                    {tab.icon} {tab.label}
                                                </button>
                                            ))}
                                        </div>
                                        {/* Delay unit picker */}
                                        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <span className="text-[8px] text-slate-600 uppercase tracking-widest pl-2 pr-1">Retard en</span>
                                            {(['hours', 'days', 'months'] as const).map(u => (
                                                <button key={u} onClick={() => setDelayUnit(u)}
                                                    className="px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                                    style={{ background: delayUnit === u ? activeScenario.color : 'transparent', color: delayUnit === u ? '#000' : '#64748b' }}>
                                                    {u === 'hours' ? 'H' : u === 'days' ? 'J' : 'M'}
                                                </button>
                                            ))}
                                        </div>
                                        {activeTab !== 'analytics' && (
                                            <button onClick={() => setShowBaseline(b => !b)}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                style={{ color: showBaseline ? '#94a3b8' : '#475569', background: showBaseline ? 'rgba(255,255,255,0.06)' : 'transparent', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                {showBaseline ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} Baseline
                                            </button>
                                        )}
                                    </div>

                                    {/* ── TAB: ANALYTICS ── */}
                                    {activeTab === 'analytics' && (() => {
                                        // Pre-compute analytics data
                                        const computed = activeScenario.computedTasks;
                                        const delayed = computed.filter(t => t.isDelayed);
                                        const onTime = computed.filter(t => !t.isDelayed);

                                        // Delay distribution buckets
                                        const buckets = [0, 2, 4, 8, 16, 32, 64, Infinity];
                                        const bucketLabels = ['<2h', '2-4h', '4-8h', '8-16h', '16-32h', '32-64h', '>64h'];
                                        const distrib = bucketLabels.map((label, i) => ({
                                            label,
                                            count: delayed.filter(t => t.delayHours >= buckets[i] && t.delayHours < buckets[i + 1]).length,
                                        }));
                                        const maxDistrib = Math.max(1, ...distrib.map(d => d.count));

                                        // Discipline breakdown
                                        const byDisc: Record<string, { total: number; delayed: number; maxDelay: number }> = {};
                                        computed.forEach(t => {
                                            const d = t.discipline || 'N/A';
                                            if (!byDisc[d]) byDisc[d] = { total: 0, delayed: 0, maxDelay: 0 };
                                            byDisc[d].total++;
                                            if (t.isDelayed) { byDisc[d].delayed++; byDisc[d].maxDelay = Math.max(byDisc[d].maxDelay, t.delayHours); }
                                        });
                                        const discList = Object.entries(byDisc)
                                            .map(([d, v]) => ({ disc: d, ...v, pct: Math.round((v.delayed / v.total) * 100) }))
                                            .sort((a, b) => b.delayed - a.delayed)
                                            .slice(0, 10);

                                        // Timeline: show projects end shift
                                        const baseMs = baselineEndDate.getTime();
                                        const scenMs = activeScenario.scenarioEndDate.getTime();
                                        const slipHours = Math.max(0, (scenMs - baseMs) / 3600000);
                                        const slipPct = Math.min(100, (slipHours / Math.max(1, slipHours + 48)) * 100);

                                        const discColors = ['#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#3b82f6', '#ec4899', '#f97316', '#14b8a6', '#a855f7'];

                                        return (
                                            <div className="space-y-5">
                                                {/* Row 1: Status overview + Delay distribution */}
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                                                    {/* Status donut-like */}
                                                    <div className="p-6 rounded-3xl" style={{ background: '#0c0c0e', border: `1px solid ${activeScenario.color}20` }}>
                                                        <h4 className="text-xs font-black text-white uppercase tracking-tight mb-5 flex items-center gap-2">
                                                            <CheckCircle2 className="w-4 h-4" style={{ color: activeScenario.color }} /> Répartition du Statut des Tâches
                                                        </h4>
                                                        {/* Visual progress bar with groups */}
                                                        <div className="flex h-4 rounded-full overflow-hidden mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                            <div className="h-full transition-all" style={{ width: `${(onTime.length / Math.max(1, computed.length)) * 100}%`, background: '#10b981' }} />
                                                            <div className="h-full transition-all" style={{ width: `${(delayed.length / Math.max(1, computed.length)) * 100}%`, background: '#ef4444' }} />
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-3 mt-4">
                                                            {[{ label: 'À l\'heure', val: onTime.length, color: '#10b981' }, { label: 'En retard', val: delayed.length, color: '#ef4444' }, { label: 'Modifiées', val: Object.keys(activeScenario.overrides).length, color: activeScenario.color }].map(s => (
                                                                <div key={s.label} className="text-center p-3 rounded-2xl" style={{ background: `${s.color}10`, border: `1px solid ${s.color}20` }}>
                                                                    <p className="text-2xl font-black" style={{ color: s.color }}>{s.val}</p>
                                                                    <p className="text-[8px] text-slate-500 uppercase tracking-widest mt-1">{s.label}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className="mt-5 p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                            <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-2">Glissement de date fin</p>
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                                    <div className="h-full rounded-full" style={{ width: `${slipPct}%`, background: slipHours > 0 ? 'linear-gradient(90deg,#f59e0b,#ef4444)' : '#10b981', transition: 'width 1s ease' }} />
                                                                </div>
                                                                <span className="text-xs font-black shrink-0" style={{ color: slipHours > 0 ? '#ef4444' : '#10b981' }}>
                                                                    {slipHours > 0 ? `+${fmtDelay(slipHours, delayUnit)}` : 'Aucun'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Delay distribution histogram */}
                                                    <div className="p-6 rounded-3xl" style={{ background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.07)' }}>
                                                        <h4 className="text-xs font-black text-white uppercase tracking-tight mb-5 flex items-center gap-2">
                                                            <BarChart2 className="w-4 h-4 text-amber-400" /> Distribution des Retards
                                                        </h4>
                                                        <div className="flex items-end gap-2 h-32">
                                                            {distrib.map((d, i) => {
                                                                const h = (d.count / maxDistrib) * 100;
                                                                const heat = i < 2 ? '#06b6d4' : i < 4 ? '#f59e0b' : '#ef4444';
                                                                return (
                                                                    <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
                                                                        <span className="text-[8px] font-black" style={{ color: d.count > 0 ? heat : '#334155' }}>{d.count}</span>
                                                                        <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(4, h)}%`, background: d.count > 0 ? `linear-gradient(180deg, ${heat}, ${heat}60)` : 'rgba(255,255,255,0.05)' }} />
                                                                        <span className="text-[7px] text-slate-600 text-center">{d.label}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <p className="text-[9px] text-slate-600 mt-3">Nombre de tâches par tranche de retard</p>
                                                    </div>
                                                </div>

                                                {/* Row 2: Discipline impact breakdown */}
                                                <div className="p-6 rounded-3xl" style={{ background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.07)' }}>
                                                    <h4 className="text-xs font-black text-white uppercase tracking-tight mb-1 flex items-center gap-2">
                                                        <Cpu className="w-4 h-4 text-violet-400" /> Impact par Discipline — Taux de Retard & Amplitude
                                                    </h4>
                                                    <p className="text-[9px] text-slate-600 mb-5">Barre verte = tâches à l'heure · Barre rouge = tâches en retard · Valeur = retard max de la discipline</p>
                                                    {discList.length === 0 && <p className="text-slate-600 text-center py-6">Aucune donnée de discipline disponible.</p>}
                                                    <div className="space-y-3">
                                                        {discList.map(({ disc, total, delayed: dl, maxDelay }, idx) => (
                                                            <div key={disc}>
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 rounded-full" style={{ background: discColors[idx % discColors.length] }} />
                                                                        <span className="text-xs font-bold text-white">{disc}</span>
                                                                        <span className="text-[9px] text-slate-600">{dl}/{total} tâches</span>
                                                                    </div>
                                                                    {maxDelay > 0 && <span className="text-[9px] font-black text-red-400">max +{fmtDelay(maxDelay, delayUnit)}</span>}
                                                                </div>
                                                                <div className="flex h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                                                    <div className="h-full" style={{ width: `${((total - dl) / total) * 100}%`, background: '#10b98160' }} />
                                                                    <div className="h-full" style={{ width: `${(dl / total) * 100}%`, background: '#ef444480' }} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Row 3: Top 5 critical tasks mini heatmap */}
                                                <div className="p-6 rounded-3xl" style={{ background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.07)' }}>
                                                    <h4 className="text-xs font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                                                        <Flame className="w-4 h-4 text-red-400" /> Top 5 Tâches Critiques
                                                    </h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                                                        {delayed
                                                            .sort((a, b) => b.delayHours - a.delayHours)
                                                            .slice(0, 5)
                                                            .map((t, i) => {
                                                                const intensity = 1 - (i / 5);
                                                                return (
                                                                    <div key={t.id} className="p-4 rounded-2xl cursor-pointer hover:scale-105 transition-all" style={{
                                                                        background: `rgba(239,68,68,${0.06 + intensity * 0.08})`,
                                                                        border: `1px solid rgba(239,68,68,${0.15 + intensity * 0.25})`,
                                                                    }} onClick={() => setOverrideModal({ task: baselineTasks.find(b => b.id === t.id) || baselineTasks[0] })}>
                                                                        <p className="text-[8px] font-black uppercase tracking-widest mb-1" style={{ color: `rgba(239,68,68,${0.6 + intensity * 0.4})` }}>#{i + 1}</p>
                                                                        <p className="text-xs font-black text-white truncate mb-2" title={t.action}>{t.action}</p>
                                                                        <p className="text-[8px] text-slate-500 mb-2">{t.discipline}</p>
                                                                        <p className="text-sm font-black text-red-400">+{fmtDelay(t.delayHours, delayUnit)}</p>
                                                                        <p className="text-[8px] text-slate-600 mt-0.5">Cliquer pour modifier</p>
                                                                    </div>
                                                                );
                                                            })}
                                                        {delayed.length === 0 && (
                                                            <div className="col-span-5 text-center py-8 text-slate-600">
                                                                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                                                Aucune tâche en retard dans ce scénario.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                            </div>
                                        );
                                    })()}

                                    {/* ── TAB: TASKS ── */}
                                    {activeTab === 'tasks' && (
                                        <div className="rounded-3xl overflow-hidden" style={{ background: '#0c0c0e', border: `1px solid ${activeScenario.color}20` }}>
                                            <div className="p-5 border-b flex flex-wrap items-center gap-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                <input
                                                    value={searchTask}
                                                    onChange={e => setSearchTask(e.target.value)}
                                                    placeholder="Rechercher une tâche…"
                                                    className="flex-1 min-w-48 px-4 py-2 rounded-xl text-sm text-white bg-transparent outline-none"
                                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                                                />
                                                {(['all', 'impacted', 'modified'] as const).map(f => (
                                                    <button key={f}
                                                        onClick={() => setTaskFilter(f)}
                                                        className="px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                        style={{
                                                            background: taskFilter === f ? `${activeScenario.color}20` : 'rgba(255,255,255,0.03)',
                                                            border: `1px solid ${taskFilter === f ? activeScenario.color + '50' : 'rgba(255,255,255,0.07)'}`,
                                                            color: taskFilter === f ? activeScenario.color : '#64748b'
                                                        }}>
                                                        {f === 'all' ? `Toutes (${baselineTasks.length})` : f === 'impacted' ? `Impactées (${impactedCount})` : `Modifiées (${modifiedCount})`}
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="divide-y divide-white/[0.04]">
                                                {filteredTasks.slice(0, 60).map(task => {
                                                    const override = activeScenario.overrides[task.id];
                                                    const scenTask = activeScenario.computedTasks.find(t => t.id === task.id);
                                                    const isImpacted = activeScenario.impactedTaskIds.includes(task.id);
                                                    const isModified = !!override;

                                                    return (
                                                        <div key={task.id}
                                                            className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors group">
                                                            {/* Status dot */}
                                                            <div className="shrink-0 w-2 h-2 rounded-full"
                                                                style={{ background: isModified ? activeScenario.color : isImpacted ? '#f59e0b' : 'rgba(255,255,255,0.15)' }} />

                                                            {/* Task info */}
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-white truncate">{task.action}</p>
                                                                <p className="text-[9px] text-slate-600">{task.discipline} · {task.duration}h original</p>
                                                            </div>

                                                            {/* Date comparison */}
                                                            <div className="hidden md:flex items-center gap-4 shrink-0">
                                                                {showBaseline && (
                                                                    <div className="text-right">
                                                                        <p className="text-[8px] text-slate-600">Baseline</p>
                                                                        <p className="text-[10px] text-slate-500 font-mono">{task.startTime.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</p>
                                                                    </div>
                                                                )}
                                                                {scenTask && (
                                                                    <div className="text-right">
                                                                        <p className="text-[8px]" style={{ color: activeScenario.color }}>Scénario</p>
                                                                        <p className="text-[10px] font-mono font-bold" style={{ color: isImpacted ? activeScenario.color : '#94a3b8' }}>
                                                                            {scenTask.scenarioStartTime.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                                {isImpacted && scenTask && (
                                                                    <div className="text-right">
                                                                        <p className="text-[8px] text-red-500">Retard</p>
                                                                        <p className="text-[10px] font-bold text-red-400">+{fmtDelay(scenTask.delayHours, delayUnit)}</p>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Actions */}
                                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                {isModified && (
                                                                    <button
                                                                        onClick={() => handleRemoveOverride(task.id)}
                                                                        className="p-1.5 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                                                        <RotateCcw className="w-3 h-3" />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => setOverrideModal({ task })}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105"
                                                                    style={{ background: `${activeScenario.color}20`, border: `1px solid ${activeScenario.color}35`, color: activeScenario.color }}>
                                                                    <Edit3 className="w-3 h-3" />
                                                                    Modifier
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {filteredTasks.length > 60 && (
                                                    <p className="text-center text-slate-600 text-[9px] p-4">+{filteredTasks.length - 60} tâches supplémentaires</p>
                                                )}
                                                {filteredTasks.length === 0 && (
                                                    <div className="py-16 text-center">
                                                        <p className="text-slate-600">Aucune tâche correspondante</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* ── TAB: IMPACT ── */}
                                    {activeTab === 'impact' && (
                                        <div className="space-y-5">
                                            {/* Headline alert */}
                                            <div className="relative overflow-hidden p-6 rounded-3xl" style={{ background: totalDelayDays > 0 ? 'linear-gradient(135deg,#ef444408,#f59e0b05)' : 'linear-gradient(135deg,#10b98108,#06b6d405)', border: `1px solid ${totalDelayDays > 0 ? '#ef444430' : '#10b98130'}` }}>
                                                <div className="flex items-center gap-5">
                                                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0" style={{ background: totalDelayDays > 0 ? '#ef444415' : '#10b98115', border: `1px solid ${totalDelayDays > 0 ? '#ef444440' : '#10b98140'}` }}>
                                                        {totalDelayDays > 0 ? <Flame className="w-8 h-8 text-red-400" /> : <Shield className="w-8 h-8 text-emerald-400" />}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] mb-1" style={{ color: totalDelayDays > 0 ? '#ef4444' : '#10b981' }}>VERDICT DU SYSTÈME</p>
                                                        <h3 className="text-2xl font-black text-white tracking-tighter mb-1">
                                                            {totalDelayDays > 0 ? `⚠ +${fmtDelay(totalDelayDays * 24, delayUnit)} de retard détecté` : '✓ Planning intact'}
                                                        </h3>
                                                        <p className="text-sm text-slate-400">
                                                            {totalDelayDays > 0
                                                                ? `Le scénario "${activeScenario.name}" propage un glissement de ${fmtDelay(totalDelayDays * 24, delayUnit)} sur ${impactedCount} tâche(s) dépendantes — chemin critique compromis.`
                                                                : `Le scénario "${activeScenario.name}" ne génère aucun retard sur la date de fin de projet.`}
                                                        </p>
                                                    </div>
                                                    <div className="hidden lg:grid grid-cols-2 gap-3 shrink-0">
                                                        {[
                                                            { label: 'Tâches Modifiées', value: modifiedCount, color: activeScenario.color },
                                                            { label: 'Tâches Impactées', value: impactedCount, color: '#f59e0b' },
                                                        ].map(m => (
                                                            <div key={m.label} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                                                                <p className="text-2xl font-black" style={{ color: m.color }}>{m.value}</p>
                                                                <p className="text-[8px] text-slate-600 uppercase tracking-widest mt-0.5">{m.label}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Impact view switcher */}
                                            <div className="flex items-center gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                {([
                                                    { key: 'heatmap', label: 'Top Retards', icon: <Flame className="w-3 h-3" /> },
                                                    { key: 'cascade', label: 'Cascade', icon: <GitBranch className="w-3 h-3" /> },
                                                    { key: 'disciplines', label: 'Par Discipline', icon: <Cpu className="w-3 h-3" /> },
                                                    { key: 'compare', label: 'Comparatif', icon: <Layers className="w-3 h-3" /> },
                                                ] as const).map(v => (
                                                    <button key={v.key} onClick={() => setImpactView(v.key)}
                                                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                        style={{ background: impactView === v.key ? activeScenario.color : 'transparent', color: impactView === v.key ? '#000' : '#64748b' }}>
                                                        {v.icon} {v.label}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* VIEW: TOP RETARDS HEATMAP */}
                                            {impactView === 'heatmap' && (
                                                <div className="p-5 rounded-3xl" style={{ background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.07)' }}>
                                                    <h4 className="text-xs font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2"><Flame className="w-4 h-4 text-red-400" /> Heatmap des Retards (Top {Math.min(15, impactedCount)})</h4>
                                                    <div className="space-y-2">
                                                        {activeScenario.computedTasks
                                                            .filter(t => t.isDelayed)
                                                            .sort((a, b) => b.delayHours - a.delayHours)
                                                            .slice(0, 15)
                                                            .map((t, idx) => {
                                                                const pct = Math.min(100, (t.delayHours / Math.max(1, totalDelayDays * 24)) * 100);
                                                                const heat = pct > 75 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#06b6d4';
                                                                return (
                                                                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl group transition-all hover:bg-white/[0.03]">
                                                                        <span className="text-[9px] font-black text-slate-600 w-5 text-center">#{idx + 1}</span>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-xs font-bold text-white truncate">{t.action}</p>
                                                                            <p className="text-[9px] text-slate-600">{t.discipline}</p>
                                                                        </div>
                                                                        <div className="w-32 h-2.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${heat}60, ${heat})` }} />
                                                                        </div>
                                                                        <span className="text-[10px] font-black shrink-0" style={{ color: heat }}>+{fmtDelay(t.delayHours, delayUnit)}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        {impactedCount === 0 && <p className="text-center text-slate-600 py-8">Aucun retard détecté dans ce scénario.</p>}
                                                    </div>
                                                </div>
                                            )}

                                            {/* VIEW: CASCADE */}
                                            {impactView === 'cascade' && (
                                                <div className="p-5 rounded-3xl" style={{ background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.07)' }}>
                                                    <h4 className="text-xs font-black text-white uppercase tracking-tight mb-1 flex items-center gap-2"><GitBranch className="w-4 h-4 text-blue-400" /> Analyse de Cascade CPM</h4>
                                                    <p className="text-[9px] text-slate-600 mb-5">Visualisation des tâches modifiées et de leurs effets en cascade direct.</p>
                                                    <div className="space-y-3">
                                                        {Object.entries(activeScenario.overrides).map(([id, ov]) => {
                                                            const task = baselineTasks.find(t => t.id === Number(id));
                                                            if (!task) return null;
                                                            const directImpact = activeScenario.computedTasks.filter(t => t.isDelayed && t.delayHours > 0);
                                                            return (
                                                                <div key={id} className="p-4 rounded-2xl" style={{ background: `${activeScenario.color}08`, border: `1px solid ${activeScenario.color}25` }}>
                                                                    <div className="flex items-center gap-3 mb-3">
                                                                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${activeScenario.color}20`, border: `1px solid ${activeScenario.color}40` }}>
                                                                            <Edit3 className="w-3.5 h-3.5" style={{ color: activeScenario.color }} />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-xs font-black text-white truncate">SOURCE: {task.action}</p>
                                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                                {ov.newDuration !== undefined && ov.newDuration !== task.duration && <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: '#f59e0b20', color: '#f59e0b' }}>{task.duration}h → {ov.newDuration}h</span>}
                                                                                {(ov.delayDays ?? 0) > 0 && <span className="text-[8px] px-1.5 py-0.5 rounded" style={{ background: '#ef444420', color: '#ef4444' }}>+{fmtDelay((ov.delayDays ?? 0) * 24, delayUnit)} retard</span>}
                                                                            </div>
                                                                        </div>
                                                                        <span className="text-[9px] font-black px-2 py-1 rounded-lg" style={{ background: '#ef444415', color: '#ef4444' }}>{directImpact.length} tâche(s) impactée(s)</span>
                                                                    </div>
                                                                    <div className="pl-4 border-l-2" style={{ borderColor: `${activeScenario.color}30` }}>
                                                                        <p className="text-[8px] text-slate-600 uppercase tracking-widest mb-2">Effets propagés</p>
                                                                        {directImpact.slice(0, 4).map(ct => (
                                                                            <div key={ct.id} className="flex items-center gap-2 py-1">
                                                                                <div className="w-1 h-1 rounded-full bg-red-500" />
                                                                                <span className="text-[10px] text-slate-400 truncate flex-1">{ct.action}</span>
                                                                                <span className="text-[9px] font-bold text-red-400 shrink-0">+{fmtDelay(ct.delayHours, delayUnit)}</span>
                                                                            </div>
                                                                        ))}
                                                                        {directImpact.length > 4 && <p className="text-[8px] text-slate-600 pt-1">+{directImpact.length - 4} autres tâches...</p>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                        {modifiedCount === 0 && <p className="text-center text-slate-600 py-8">Aucune modification appliquée. Éditez des tâches pour voir la cascade CPM.</p>}
                                                    </div>
                                                </div>
                                            )}

                                            {/* VIEW: BY DISCIPLINE */}
                                            {impactView === 'disciplines' && (() => {
                                                const byDisc: Record<string, { count: number; totalDelayH: number; }> = {};
                                                activeScenario.computedTasks.filter(t => t.isDelayed).forEach(t => {
                                                    const disc = t.discipline || 'Non défini';
                                                    if (!byDisc[disc]) byDisc[disc] = { count: 0, totalDelayH: 0 };
                                                    byDisc[disc].count++;
                                                    byDisc[disc].totalDelayH += t.delayHours;
                                                });
                                                const discList = Object.entries(byDisc).sort((a, b) => b[1].totalDelayH - a[1].totalDelayH);
                                                const maxDelay = Math.max(1, ...discList.map(d => d[1].totalDelayH));
                                                return (
                                                    <div className="p-5 rounded-3xl" style={{ background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.07)' }}>
                                                        <h4 className="text-xs font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2"><Cpu className="w-4 h-4 text-violet-400" /> Impact par Discipline</h4>
                                                        {discList.length === 0 && <p className="text-center text-slate-600 py-8">Aucune discipline impactée.</p>}
                                                        <div className="space-y-4">
                                                            {discList.map(([disc, data], idx) => {
                                                                const pct = (data.totalDelayH / maxDelay) * 100;
                                                                const colors = ['#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981'];
                                                                const c = colors[idx % colors.length];
                                                                return (
                                                                    <div key={disc}>
                                                                        <div className="flex items-center justify-between mb-1.5">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-2 h-2 rounded-full" style={{ background: c }} />
                                                                                <span className="text-xs font-bold text-white">{disc}</span>
                                                                                <span className="text-[9px] text-slate-600">{data.count} tâche(s)</span>
                                                                            </div>
                                                                            <span className="text-xs font-black" style={{ color: c }}>+{fmtDelay(data.totalDelayH, delayUnit)}</span>
                                                                        </div>
                                                                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${c}60, ${c})`, transition: 'width 0.8s ease' }} />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* VIEW: MULTI-SCENARIO COMPARE */}
                                            {impactView === 'compare' && (
                                                <div className="p-5 rounded-3xl overflow-x-auto" style={{ background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.07)' }}>
                                                    <h4 className="text-xs font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2"><Layers className="w-4 h-4 text-blue-400" /> Tableau de Bord Décisionnel — Tous Scénarios</h4>
                                                    <table className="w-full text-xs">
                                                        <thead>
                                                            <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                                                {['Scénario', 'Fin Projet', 'Retard', 'Tâches Impactées', 'Modifs', 'Risque'].map(h => (
                                                                    <th key={h} className="text-left pb-3 text-[8px] font-black text-slate-500 uppercase tracking-widest pr-6">{h}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                                                <td className="py-3 pr-6"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-500 opacity-50" /><span className="text-slate-500">Baseline</span></div></td>
                                                                <td className="py-3 pr-6 text-slate-400">{formatDate(baselineEndDate)}</td>
                                                                <td className="py-3 pr-6 text-slate-600">Référence</td>
                                                                <td className="py-3 pr-6 text-slate-600">—</td>
                                                                <td className="py-3 pr-6 text-slate-600">—</td>
                                                                <td className="py-3 pr-6"><span className="px-2 py-0.5 rounded text-[8px] font-black" style={{ background: '#10b98120', color: '#10b981' }}>FAIBLE</span></td>
                                                            </tr>
                                                            {scenarios.map(s => {
                                                                const risk = s.totalDelayDays > 14 ? 'CRITIQUE' : s.totalDelayDays > 5 ? 'ÉLEVÉ' : s.totalDelayDays > 0 ? 'MOYEN' : 'FAIBLE';
                                                                const riskColor = s.totalDelayDays > 14 ? '#ef4444' : s.totalDelayDays > 5 ? '#f59e0b' : s.totalDelayDays > 0 ? '#06b6d4' : '#10b981';
                                                                return (
                                                                    <tr key={s.id} className={`border-b ${s.id === activeScenarioId ? '' : 'opacity-50'} hover:opacity-100 transition-opacity`} style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                                                        <td className="py-3 pr-6"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: s.color }} /><span className="font-bold text-white">{s.name}</span></div></td>
                                                                        <td className="py-3 pr-6 text-slate-300">{formatDate(s.scenarioEndDate)}</td>
                                                                        <td className="py-3 pr-6 font-black" style={{ color: s.totalDelayDays > 0 ? '#ef4444' : '#10b981' }}>{s.totalDelayDays > 0 ? '+' : ''}{fmtDelay(s.totalDelayDays * 24, delayUnit)}</td>
                                                                        <td className="py-3 pr-6 text-slate-400">{s.impactedTaskIds.length}</td>
                                                                        <td className="py-3 pr-6 text-slate-400">{Object.keys(s.overrides).length}</td>
                                                                        <td className="py-3 pr-6"><span className="px-2 py-0.5 rounded text-[8px] font-black" style={{ background: `${riskColor}20`, color: riskColor }}>{risk}</span></td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {/* Modifications list */}
                                            {modifiedCount > 0 && (
                                                <details className="group p-5 rounded-3xl" style={{ background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.07)' }} open>
                                                    <summary className="list-none cursor-pointer flex items-center gap-2 text-xs font-black text-white uppercase tracking-tight">
                                                        <Edit3 className="w-4 h-4 text-amber-400" /> Modifications Appliquées ({modifiedCount})
                                                        <ChevronDown className="w-3.5 h-3.5 ml-auto text-slate-600 group-open:rotate-180 transition-transform" />
                                                    </summary>
                                                    <div className="space-y-2 mt-4">
                                                        {Object.entries(activeScenario.overrides).map(([id, ov]) => {
                                                            const task = baselineTasks.find(t => t.id === Number(id));
                                                            if (!task) return null;
                                                            return (
                                                                <div key={id} className="flex items-center gap-4 p-3 rounded-xl" style={{ background: `${activeScenario.color}08`, border: `1px solid ${activeScenario.color}20` }}>
                                                                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: activeScenario.color }} />
                                                                    <div className="flex-1 min-w-0"><p className="text-xs font-bold text-white truncate">{task.action}</p><p className="text-[9px] text-slate-600">{task.discipline}</p></div>
                                                                    {ov.newDuration !== undefined && ov.newDuration !== task.duration && <span className="text-[9px] font-black px-2 py-1 rounded-lg" style={{ background: '#f59e0b20', color: '#f59e0b' }}>{task.duration}h → {ov.newDuration}h</span>}
                                                                    {(ov.delayDays ?? 0) > 0 && <span className="text-[9px] font-black px-2 py-1 rounded-lg" style={{ background: '#ef444420', color: '#ef4444' }}>+{fmtDelay((ov.delayDays ?? 0) * 24, delayUnit)} retard</span>}
                                                                    <button onClick={() => handleRemoveOverride(Number(id))} className="p-1 rounded text-slate-600 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </details>
                                            )}

                                        </div>
                                    )}

                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhatIfScenarioPage;
