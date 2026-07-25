
import React, { useMemo, useState } from 'react';
import type { SchedulingTaskData } from '../types';

interface AllTeamsStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    allScheduledTasks: SchedulingTaskData[];
    involvedDisciplines: string[];
    maxHours: number;
    schedulingDate: string | null;
    checkAvailabilityInterval?: { start: Date; end: Date } | null;
    /** Pass true only when the user has selected a start date */
    hasStartDate?: boolean;
    shiftStartTime?: string;
    shutdownStart?: string;
    shutdownEnd?: string;
    /** Called when user picks a team from this page — returns to assistant with team pre-selected */
    onSelectTeam?: (discipline: string, teamType: string) => void;
}

// ─── helpers ────────────────────────────────────────────────────────────────

const fmt = (d: Date) =>
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const fmtDate = (iso: string) => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
};

const isoDate = (d: Date) => d.toISOString().split('T')[0];

function getDaysInRange(start: Date, end: Date): string[] {
    const days: string[] = [];
    const cur = new Date(start);
    cur.setHours(0, 0, 0, 0);
    const fin = new Date(end);
    fin.setHours(0, 0, 0, 0);
    while (cur <= fin) {
        days.push(isoDate(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return days;
}

function overlapHours(
    taskStart: Date, taskEnd: Date,
    winStart: Date, winEnd: Date
): number {
    const ms = Math.max(0, Math.min(taskEnd.getTime(), winEnd.getTime()) - Math.max(taskStart.getTime(), winStart.getTime()));
    return ms / 3_600_000;
}

// ─── types ──────────────────────────────────────────────────────────────────

interface TeamDaySlot {
    teamName: string;
    teamType: string;  // the part after discipline
    discipline: string;
    manpower: number;
    usedHours: number;
    freeHours: number;
    status: 'LIBRE' | 'PARTIEL' | 'PLEINE' | 'MEILLEUR';
    tasks: Array<{
        id: number;
        action: string;
        equipment: string;
        start: Date;
        end: Date;
        duree: number;
        manpower: number;
    }>;
}

// ─── sub-components ──────────────────────────────────────────────────────────

const StatusPill: React.FC<{ status: TeamDaySlot['status']; small?: boolean }> = ({ status, small }) => {
    const map: Record<TeamDaySlot['status'], { bg: string; text: string; label: string; dot: string }> = {
        LIBRE:    { bg: 'bg-emerald-500/15 border border-emerald-500/30', text: 'text-emerald-400', label: 'LIBRE',   dot: 'bg-emerald-400' },
        PARTIEL:  { bg: 'bg-amber-500/15 border border-amber-500/30',    text: 'text-amber-400',   label: 'PARTIEL', dot: 'bg-amber-400' },
        PLEINE:   { bg: 'bg-red-500/15 border border-red-500/30',        text: 'text-red-400',     label: 'PLEINE',  dot: 'bg-red-400' },
        MEILLEUR: { bg: 'bg-indigo-500/15 border border-indigo-500/30',  text: 'text-indigo-300',  label: '⭐ TOP',  dot: 'bg-indigo-400' },
    };
    const s = map[status];
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 font-black uppercase tracking-wider ${small ? 'text-[9px]' : 'text-[10px]'} ${s.bg} ${s.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
            {s.label}
        </span>
    );
};

const BarFill: React.FC<{ pct: number; status: TeamDaySlot['status'] }> = ({ pct, status }) => {
    const color = { LIBRE: 'bg-emerald-500', PARTIEL: 'bg-amber-500', PLEINE: 'bg-red-500', MEILLEUR: 'bg-indigo-500' }[status];
    return (
        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden mt-2">
            <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(100, pct)}%`, opacity: 0.8 }} />
        </div>
    );
};

const TaskRow: React.FC<{ task: TeamDaySlot['tasks'][0] }> = ({ task }) => (
    <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center py-2 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] rounded-lg px-2 transition-colors">
        <div className="min-w-0">
            <p className="text-[11px] font-semibold text-slate-200 truncate leading-tight">{task.action}</p>
            {task.equipment && <p className="text-[10px] text-slate-500 truncate mt-0.5">{task.equipment}</p>}
        </div>
        <div className="text-right shrink-0">
            <p className="text-[10px] font-mono text-slate-400">{fmt(task.start)}</p>
            <p className="text-[10px] font-mono text-slate-500">→ {fmt(task.end)}</p>
        </div>
        <span className="text-[10px] font-black text-slate-300 font-mono shrink-0">{task.duree.toFixed(1)}h</span>
        <span className="text-[10px] text-slate-500 shrink-0">{task.manpower}p</span>
    </div>
);

// ─── team card ────────────────────────────────────────────────────────────────

const TeamDayCard: React.FC<{
    slot: TeamDaySlot;
    maxHours: number;
    isHighlighted: boolean;
    isExpanded: boolean;
    canAssign: boolean;
    onToggle: (e: React.MouseEvent) => void;
    onAssign: (e: React.MouseEvent) => void;
}> = ({ slot, maxHours, isHighlighted, isExpanded, canAssign, onToggle, onAssign }) => {
    const pct = maxHours > 0 ? ((maxHours - slot.freeHours) / maxHours) * 100 : 0;
    const canBePicked = canAssign && slot.status !== 'PLEINE';

    return (
        <div
            className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                isHighlighted
                    ? 'border-indigo-500/40 bg-indigo-500/5 shadow-[0_0_24px_rgba(99,102,241,0.12)]'
                    : slot.status === 'PLEINE'
                        ? 'border-red-500/20 bg-red-500/[0.03]'
                        : slot.status === 'LIBRE' || slot.status === 'MEILLEUR'
                            ? 'border-emerald-500/20 bg-emerald-500/[0.03]'
                            : 'border-white/[0.06] bg-white/[0.02]'
            }`}
            onClick={e => e.stopPropagation()}
        >
            {/* Header row */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                    {/* Name + badge */}
                    <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left group">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-200 text-sm leading-tight group-hover:text-white transition-colors">{slot.teamName}</span>
                            <StatusPill status={slot.status} small />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                            👤 {slot.manpower} pers · {slot.tasks.length} tâche{slot.tasks.length !== 1 ? 's' : ''}
                        </p>
                    </button>

                    {/* Right side: hours + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                            <p className={`text-sm font-black font-mono ${slot.freeHours > 0.1 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {slot.freeHours.toFixed(1)}h
                            </p>
                            <p className="text-[9px] text-slate-500 uppercase tracking-wider">libre</p>
                        </div>

                        {/* Assign button */}
                        {canBePicked && (
                            <button
                                type="button"
                                onClick={onAssign}
                                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-500/40 text-emerald-300 hover:text-white px-3 py-1.5 rounded-xl transition-all active:scale-95 whitespace-nowrap"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                                Assigner
                            </button>
                        )}

                        {/* Expand chevron */}
                        <button type="button" onClick={onToggle} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                            <svg className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Progress bar */}
                <BarFill pct={pct} status={slot.status} />
                <div className="flex justify-between mt-1">
                    <span className="text-[9px] text-slate-600">{(maxHours - slot.freeHours).toFixed(1)}h utilisées</span>
                    <span className="text-[9px] text-slate-600">{maxHours}h max</span>
                </div>
            </div>

            {/* Expanded task list */}
            {isExpanded && (
                <div
                    className="border-t border-white/[0.06] px-4 pb-3 pt-2 bg-black/20"
                    onClick={e => e.stopPropagation()}
                >
                    {slot.tasks.length === 0 ? (
                        <p className="text-[11px] text-slate-500 py-3 text-center italic">Aucune tâche ce jour</p>
                    ) : (
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 mb-2">Tâches assignées</p>
                            {slot.tasks.map(t => <TaskRow key={t.id} task={t} />)}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── main component ──────────────────────────────────────────────────────────

export const AllTeamsStatusModal: React.FC<AllTeamsStatusModalProps> = ({
    isOpen,
    onClose,
    allScheduledTasks,
    involvedDisciplines,
    maxHours,
    schedulingDate,
    checkAvailabilityInterval,
    hasStartDate = false,
    shiftStartTime = '07:00',
    shutdownStart,
    shutdownEnd,
    onSelectTeam,
}) => {
    const [showFreeOnly, setShowFreeOnly] = useState(false);
    const [expandedKey, setExpandedKey] = useState<string | null>(null);
    const [disciplineFilter, setDisciplineFilter] = useState<string>('Toutes');
    const [assignedFeedback, setAssignedFeedback] = useState<string | null>(null);

    // Build list of shutdown days
    const shutdownDays = useMemo(() => {
        if (shutdownStart && shutdownEnd) {
            return getDaysInRange(new Date(shutdownStart), new Date(shutdownEnd));
        }
        if (schedulingDate) {
            const base = new Date(schedulingDate);
            const start = new Date(base); start.setDate(base.getDate() - 3);
            const end = new Date(base); end.setDate(base.getDate() + 7);
            return getDaysInRange(start, end);
        }
        return [];
    }, [shutdownStart, shutdownEnd, schedulingDate]);

    // Auto-select the day matching schedulingDate
    const initialDayIdx = useMemo(() => {
        if (!schedulingDate || shutdownDays.length === 0) return 0;
        const target = isoDate(new Date(schedulingDate));
        const idx = shutdownDays.indexOf(target);
        return idx >= 0 ? idx : 0;
    }, [schedulingDate, shutdownDays]);

    const [activeDayIdx, setActiveDayIdx] = useState(initialDayIdx);
    React.useEffect(() => { setActiveDayIdx(initialDayIdx); }, [initialDayIdx]);

    const activeDay = shutdownDays[activeDayIdx] ?? null;

    // All disciplines present in scheduled tasks
    const allDisciplines = useMemo(() => {
        const set = new Set<string>();
        allScheduledTasks.forEach(t => { if (t.DISCIPLINE) set.add(t.DISCIPLINE); });
        return ['Toutes', ...Array.from(set).sort()];
    }, [allScheduledTasks]);

    // Build slot data for the active day
    const daySlots = useMemo((): TeamDaySlot[] => {
        if (!activeDay) return [];

        const [shH, shM] = shiftStartTime.split(':').map(Number);
        const winStart = new Date(activeDay + 'T00:00:00');
        winStart.setHours(shH, shM, 0, 0);
        const winEnd = new Date(winStart.getTime() + maxHours * 3_600_000);

        const teamMap = new Map<string, { discipline: string; tasks: SchedulingTaskData[] }>();
        allScheduledTasks.forEach(task => {
            if (!task.isScheduled || !task["TYPE D'EQUIPE"]) return;
            const key = `${task.DISCIPLINE} ${task["TYPE D'EQUIPE"]}`;
            if (!teamMap.has(key)) teamMap.set(key, { discipline: task.DISCIPLINE, tasks: [] });
            teamMap.get(key)!.tasks.push(task);
        });

        const checkStart = checkAvailabilityInterval?.start ?? null;
        const checkEnd = checkAvailabilityInterval?.end ?? null;

        let slots: TeamDaySlot[] = Array.from(teamMap.entries()).map(([teamName, { discipline, tasks }]) => {
            const teamType = teamName.substring(discipline.length + 1);

            const usedHours = tasks
                .filter(t => t['START DATE'] && t['END DATE'])
                .reduce((sum, t) => sum + overlapHours(t['START DATE']!, t['END DATE']!, winStart, winEnd), 0);

            const freeHours = Math.max(0, maxHours - usedHours);
            const manpower = tasks.length > 0 ? Math.max(...tasks.map(t => t.EFFECTIF || 0)) : 0;

            const dayTasks = tasks
                .filter(t => t['START DATE'] && t['END DATE'] && overlapHours(t['START DATE']!, t['END DATE']!, winStart, winEnd) > 0)
                .map(t => ({
                    id: t.id,
                    action: t['GLOBAL TASKS'] || '',
                    equipment: t['Nom Equipement'] || '',
                    start: t['START DATE']!,
                    end: t['END DATE']!,
                    duree: t.DUREE,
                    manpower: t.EFFECTIF || 0,
                }))
                .sort((a, b) => a.start.getTime() - b.start.getTime());

            let status: TeamDaySlot['status'] = 'LIBRE';
            if (usedHours >= maxHours - 0.1) status = 'PLEINE';
            else if (usedHours > 0) status = 'PARTIEL';

            if (checkStart && checkEnd) {
                const hasConflict = tasks.some(t => t['START DATE'] && t['END DATE'] &&
                    t['START DATE'] < checkEnd && t['END DATE'] > checkStart);
                if (hasConflict) status = 'PLEINE';
            }

            return { teamName, teamType, discipline, manpower, usedHours, freeHours, status, tasks: dayTasks };
        });

        // Best fit
        const available = slots.filter(s => s.status === 'LIBRE');
        if (available.length > 0) {
            const best = available.reduce((a, b) => a.freeHours < b.freeHours ? a : b);
            best.status = 'MEILLEUR';
        }

        if (disciplineFilter !== 'Toutes') {
            slots = slots.filter(s => s.discipline === disciplineFilter);
        }
        if (showFreeOnly) {
            slots = slots.filter(s => s.status !== 'PLEINE');
        }

        return slots.sort((a, b) => {
            const order = { MEILLEUR: 0, LIBRE: 1, PARTIEL: 2, PLEINE: 3 };
            return order[a.status] - order[b.status];
        });
    }, [activeDay, allScheduledTasks, maxHours, shiftStartTime, checkAvailabilityInterval, disciplineFilter, showFreeOnly]);

    if (!isOpen) return null;

    const targetDayKey = schedulingDate ? isoDate(new Date(schedulingDate)) : null;
    const stats = {
        libre: daySlots.filter(s => s.status === 'LIBRE' || s.status === 'MEILLEUR').length,
        partiel: daySlots.filter(s => s.status === 'PARTIEL').length,
        pleine: daySlots.filter(s => s.status === 'PLEINE').length,
    };

    const handleAssign = (slot: TeamDaySlot, e: React.MouseEvent) => {
        e.stopPropagation();
        if (onSelectTeam) {
            onSelectTeam(slot.discipline, slot.teamType);
            setAssignedFeedback(slot.teamName);
            // Small delay so user sees the feedback before closing
            setTimeout(() => {
                onClose();
            }, 600);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[200] flex flex-col"
            style={{ background: 'rgba(4,7,18,0.97)', backdropFilter: 'blur(24px)' }}
            onClick={e => e.stopPropagation()}
        >
            {/* ── TOP HEADER ─────────────────────────────────────────────── */}
            <header
                className="flex items-center justify-between px-8 py-4 border-b border-white/[0.07] flex-shrink-0"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-4">
                    {/* Back button */}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="flex items-center gap-2 text-slate-400 hover:text-white transition-all group"
                    >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.05] group-hover:bg-white/[0.1] transition-all border border-white/[0.08]">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                        </div>
                        <span className="text-sm font-semibold hidden md:block">Retour à l'Assistant</span>
                    </button>

                    <div className="w-px h-8 bg-white/[0.07]" />

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-indigo-400">Planification Intelligente</p>
                            <h1 className="text-xl font-black text-white tracking-tight">Disponibilité des Équipes</h1>
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="hidden lg:flex items-center gap-5 text-[10px] font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400" />Libre</span>
                    <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-400" />Partiel</span>
                    <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 rounded-full bg-red-400" />Pleine</span>
                    <span className="flex items-center gap-1.5 text-indigo-300"><span className="w-2 h-2 rounded-full bg-indigo-400" />⭐ Meilleur</span>
                    {onSelectTeam && (
                        <span className="flex items-center gap-1.5 text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                            ✓ Cliquez "Assigner" pour sélectionner une équipe
                        </span>
                    )}
                </div>
            </header>

            {/* ── ASSIGNED FEEDBACK TOAST ──────────────────────────────── */}
            {assignedFeedback && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[210] bg-emerald-500 text-white font-black text-sm px-6 py-3 rounded-2xl shadow-2xl animate-bounce">
                    ✅ {assignedFeedback} assignée — retour à l'assistant…
                </div>
            )}

            {/* ── BODY ──────────────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* ── LEFT: Day Navigator ── */}
                <aside className="w-56 flex-shrink-0 border-r border-white/[0.06] flex flex-col overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.06]">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Jours d'Arrêt</p>
                    </div>
                    <div className="overflow-y-auto flex-1 py-2">
                        {shutdownDays.length === 0 && (
                            <p className="text-[11px] text-slate-600 text-center py-6 italic">Paramètres requis</p>
                        )}
                        {shutdownDays.map((day, idx) => {
                            const isActive = idx === activeDayIdx;
                            const isTarget = day === targetDayKey;
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setActiveDayIdx(idx); setExpandedKey(null); }}
                                    className={`w-full text-left px-4 py-2.5 transition-all duration-200 relative ${
                                        isActive
                                            ? 'bg-indigo-500/15 text-indigo-300'
                                            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                                    }`}
                                >
                                    {isActive && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500 rounded-r-full" />}
                                    <p className="text-[11px] font-bold capitalize">{fmtDate(day)}</p>
                                    {isTarget && (
                                        <span className="text-[9px] font-black uppercase tracking-wider text-indigo-400">← Créneau ciblé</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </aside>

                {/* ── RIGHT: Teams Panel ── */}
                <main className="flex-1 flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

                    {/* Toolbar */}
                    <div className="px-6 py-3 border-b border-white/[0.06] bg-white/[0.01] flex items-center gap-4 flex-shrink-0 flex-wrap">
                        <div className="flex items-center gap-2 mr-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-bold text-white capitalize">
                                {activeDay ? fmtDate(activeDay) : '—'}
                            </span>
                            {activeDay === targetDayKey && (
                                <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-lg">
                                    Jour ciblé
                                </span>
                            )}
                            <span className="text-[10px] text-slate-500 ml-2 font-mono">
                                {shiftStartTime} → {(() => {
                                    const [h, m] = shiftStartTime.split(':').map(Number);
                                    const e = new Date(0); e.setHours(h + maxHours, m);
                                    return `${String(e.getHours()).padStart(2,'0')}:${String(e.getMinutes()).padStart(2,'0')}`;
                                })()} ({maxHours}H)
                            </span>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1">{stats.libre} Libres</span>
                            <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1">{stats.partiel} Partiels</span>
                            <span className="text-[10px] font-black text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2.5 py-1">{stats.pleine} Pleines</span>
                        </div>

                        {/* Discipline filter */}
                        <select
                            value={disciplineFilter}
                            onChange={e => { e.stopPropagation(); setDisciplineFilter(e.target.value); }}
                            className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50 transition-all"
                            onClick={e => e.stopPropagation()}
                        >
                            {allDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>

                        {/* Libres only toggle */}
                        <label className="flex items-center gap-2 cursor-pointer" onClick={e => e.stopPropagation()}>
                            <div
                                className={`relative w-9 h-5 rounded-full transition-colors ${showFreeOnly ? 'bg-indigo-500' : 'bg-white/10'}`}
                                onClick={(e) => { e.stopPropagation(); setShowFreeOnly(v => !v); }}
                            >
                                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showFreeOnly ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </div>
                            <span className="text-xs text-slate-300 whitespace-nowrap">Libres only</span>
                        </label>
                    </div>

                    {/* Gate: no start date */}
                    {!hasStartDate ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8" onClick={e => e.stopPropagation()}>
                            <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                                style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(99,102,241,0.05))', border: '1px solid rgba(99,102,241,0.3)' }}>
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                </svg>
                            </div>
                            <div className="text-center max-w-sm">
                                <p className="text-white font-black text-xl mb-2">Stratégie requise</p>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Sélectionnez une <span className="text-indigo-300 font-semibold">date de démarrage</span> dans le formulaire pour activer le calendrier de disponibilité.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); onClose(); }}
                                className="flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 font-bold text-sm px-5 py-2.5 rounded-xl transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Retour à l'Assistant
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
                            {daySlots.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <p className="text-slate-500 font-semibold">Aucune équipe pour ce jour</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {daySlots.map(slot => {
                                        const key = `${slot.teamName}-${activeDay}`;
                                        const isHighlighted = (activeDay === targetDayKey) && (slot.status === 'MEILLEUR');
                                        const canAssign = !!onSelectTeam && (involvedDisciplines.length === 0 || involvedDisciplines.includes(slot.discipline));
                                        return (
                                            <TeamDayCard
                                                key={key}
                                                slot={slot}
                                                maxHours={maxHours}
                                                isHighlighted={isHighlighted}
                                                isExpanded={expandedKey === key}
                                                canAssign={canAssign}
                                                onToggle={(e) => { e.stopPropagation(); setExpandedKey(expandedKey === key ? null : key); }}
                                                onAssign={(e) => handleAssign(slot, e)}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};
