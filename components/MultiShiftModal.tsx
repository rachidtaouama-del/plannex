
/**
 * MultiShiftModal — confirms multi-team rotation for tasks that exceed MAX_HOURS_PER_DAY.
 *
 * Flow:
 *   1. Detect task.DUREE > shiftDuration in SchedulingModal
 *   2. Open this modal BEFORE applying any changes
 *   3. User reviews / renames teams per shift
 *   4. User clicks [Appliquer] → callback fires with shiftAssignments
 *   5. Or [Scénario B] → single-team, existing logic
 *   6. Or [Annuler] → nothing applied
 */

import React, { useMemo, useState } from 'react';

export interface ShiftBlock {
    shiftIndex: number;
    teamType: string;       // editable by the user
    startTime: Date;
    endTime: Date;
    durationH: number;
    manpower: number;
}

interface MultiShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Task info */
    taskName: string;
    taskDuration: number;       // total hours
    taskManpower: number;
    discipline: string;
    /** Shift params */
    shiftDuration: number;      // e.g. 12
    shiftStartTime: string;     // e.g. "07:00"
    taskStartDate: Date;
    /** Existing teams in this discipline */
    existingTeams: string[];
    /** Scenario A applied → called with final shift blocks */
    onApplyMultiShift: (shifts: ShiftBlock[]) => void;
    /** Scenario B — keep single team, standard flow */
    onKeepSingleTeam: () => void;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmtDT = (d: Date) =>
    d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const fmtH = (d: Date) =>
    d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

function buildShiftBlocks(
    taskStartDate: Date,
    totalHours: number,
    shiftDuration: number,
    shiftStartHour: number,
    shiftStartMin: number,
    manpower: number,
    existingTeams: string[]
): ShiftBlock[] {
    const blocks: ShiftBlock[] = [];
    let remaining = totalHours;
    let shiftIndex = 1;
    let cursor = new Date(taskStartDate);

    while (remaining > 0.01) {
        const blockDuration = Math.min(remaining, shiftDuration);
        const start = new Date(cursor);
        const end = new Date(start.getTime() + blockDuration * 3_600_000);

        // Default team assignment: alternate A, B, A, B...
        const defaultTeam = shiftIndex % 2 === 1
            ? (existingTeams[0] || 'Équipe A')
            : (existingTeams[1] || 'Équipe B');

        blocks.push({ shiftIndex, teamType: defaultTeam, startTime: start, endTime: end, durationH: blockDuration, manpower });

        cursor = new Date(end);
        remaining -= blockDuration;
        shiftIndex++;
    }

    return blocks;
}

// ─── team badge colors ───────────────────────────────────────────────────────

const COLORS = [
    'bg-indigo-500/20 border-indigo-500/40 text-indigo-300',
    'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',
    'bg-amber-500/20 border-amber-500/40 text-amber-300',
    'bg-pink-500/20 border-pink-500/40 text-pink-300',
    'bg-cyan-500/20 border-cyan-500/40 text-cyan-300',
];

function teamColor(teamName: string, allTeams: string[]) {
    const idx = allTeams.indexOf(teamName) % COLORS.length;
    return COLORS[Math.max(0, idx)];
}

// ─── main component ──────────────────────────────────────────────────────────

export const MultiShiftModal: React.FC<MultiShiftModalProps> = ({
    isOpen,
    onClose,
    taskName,
    taskDuration,
    taskManpower,
    discipline,
    shiftDuration,
    shiftStartTime,
    taskStartDate,
    existingTeams,
    onApplyMultiShift,
    onKeepSingleTeam,
}) => {
    const [shH, shM] = shiftStartTime.split(':').map(Number);

    const initialBlocks = useMemo(() =>
        buildShiftBlocks(taskStartDate, taskDuration, shiftDuration, shH, shM, taskManpower, existingTeams),
        [taskStartDate, taskDuration, shiftDuration, shH, shM, taskManpower, existingTeams]
    );

    const [blocks, setBlocks] = useState<ShiftBlock[]>(initialBlocks);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');

    // Reset when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setBlocks(buildShiftBlocks(taskStartDate, taskDuration, shiftDuration, shH, shM, taskManpower, existingTeams));
            setEditingIdx(null);
        }
    }, [isOpen, taskStartDate, taskDuration, shiftDuration, shH, shM, taskManpower, existingTeams]);

    if (!isOpen) return null;

    const allTeamNames = Array.from(new Set(blocks.map(b => b.teamType)));
    const distinctTeams = allTeamNames.length;
    const totalPeople = distinctTeams * taskManpower;
    const lastShift = blocks[blocks.length - 1];

    const startEdit = (idx: number, currentValue: string) => {
        setEditingIdx(idx);
        setEditValue(currentValue);
    };

    const commitEdit = (idx: number) => {
        const trimmed = editValue.trim();
        if (!trimmed) { setEditingIdx(null); return; }
        setBlocks(prev => prev.map((b, i) => i === idx ? { ...b, teamType: trimmed } : b));
        setEditingIdx(null);
    };

    const handleApply = () => {
        onApplyMultiShift(blocks);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)' }}
            onClick={e => e.stopPropagation()}
        >
            <div
                className="relative w-full max-w-2xl bg-[#080d1a] border border-white/[0.09] rounded-3xl shadow-[0_40px_120px_rgba(0,0,0,0.9)] flex flex-col max-h-[90vh] overflow-hidden"
                style={{ animation: 'modalIn 0.22s cubic-bezier(0.16,1,0.3,1) forwards' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Shimmer top */}
                <div className="absolute top-0 left-0 right-0 h-px rounded-t-3xl"
                    style={{ background: 'linear-gradient(90deg,transparent,rgba(99,102,241,0.6),transparent)' }} />

                {/* ── HEADER ─────────────────────────────────────────────── */}
                <div className="px-7 py-5 border-b border-white/[0.06] flex items-start justify-between gap-4 flex-shrink-0">
                    <div className="flex items-start gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">Tâche Longue Détectée</p>
                            <h2 className="text-lg font-black text-white leading-tight mt-0.5">Rotation Multi-Équipes</h2>
                            <p className="text-xs text-slate-500 mt-1 max-w-md truncate">{discipline} — {taskName}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all mt-0.5 flex-shrink-0"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* ── CONTEXT BANNER ────────────────────────────────────── */}
                <div className="px-7 py-3 bg-amber-500/[0.06] border-b border-amber-500/[0.15] flex items-center gap-3 flex-shrink-0">
                    <span className="text-amber-400 text-lg">⚠️</span>
                    <p className="text-xs text-amber-300 leading-relaxed">
                        Cette tâche dure <span className="font-black">{taskDuration}h</span> mais votre shift maximum est de{' '}
                        <span className="font-black">{shiftDuration}h/jour</span>. Elle nécessite{' '}
                        <span className="font-black">{blocks.length} équipes de shift</span> pour être réalisée en continu.
                    </p>
                </div>

                {/* ── SHIFT BLOCKS ─────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-7 py-5">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
                        Répartition des Shifts — Cliquez sur un nom pour le modifier
                    </p>

                    <div className="space-y-3">
                        {blocks.map((block, idx) => {
                            const color = teamColor(block.teamType, allTeamNames);
                            const isEditing = editingIdx === idx;

                            return (
                                <div
                                    key={idx}
                                    className="flex items-center gap-4 bg-white/[0.03] hover:bg-white/[0.05] border border-white/[0.06] rounded-2xl p-4 transition-all"
                                    onClick={e => e.stopPropagation()}
                                >
                                    {/* Shift number */}
                                    <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center flex-shrink-0">
                                        <span className="text-sm font-black text-slate-300">S{block.shiftIndex}</span>
                                    </div>

                                    {/* Time block */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-mono text-slate-400">
                                                {fmtDT(block.startTime)}
                                            </span>
                                            <span className="text-slate-600 text-[10px]">→</span>
                                            <span className="text-[10px] font-mono text-slate-400">
                                                {fmtDT(block.endTime)}
                                            </span>
                                            <span className="text-[10px] font-black text-slate-300 bg-white/[0.05] px-2 py-0.5 rounded-lg">
                                                {block.durationH.toFixed(1)}h
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[9px] text-slate-600">
                                            <span>👤 {block.manpower} pers.</span>
                                        </div>
                                    </div>

                                    {/* Team name (editable) */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {isEditing ? (
                                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                <input
                                                    autoFocus
                                                    value={editValue}
                                                    onChange={e => setEditValue(e.target.value)}
                                                    onBlur={() => commitEdit(idx)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') commitEdit(idx);
                                                        if (e.key === 'Escape') setEditingIdx(null);
                                                        e.stopPropagation();
                                                    }}
                                                    onClick={e => e.stopPropagation()}
                                                    className="bg-slate-900 border border-indigo-500/50 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-400 w-40 font-bold"
                                                    placeholder="Nom de l'équipe..."
                                                />
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); commitEdit(idx); }}
                                                    className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/30 transition-all"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={(e) => { e.stopPropagation(); startEdit(idx, block.teamType); }}
                                                className={`flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-xl border transition-all hover:opacity-80 ${color}`}
                                                title="Cliquer pour renommer"
                                            >
                                                <span>{block.teamType}</span>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── IMPACT SUMMARY ───────────────────────────────────── */}
                <div className="px-7 py-4 border-t border-white/[0.06] bg-white/[0.02] flex-shrink-0">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-3 text-center">
                            <p className="text-xl font-black text-indigo-300">{distinctTeams}</p>
                            <p className="text-[10px] text-indigo-400/70 uppercase tracking-wider font-bold mt-0.5">Équipes distinctes</p>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 text-center">
                            <p className="text-xl font-black text-emerald-300">{totalPeople}</p>
                            <p className="text-[10px] text-emerald-400/70 uppercase tracking-wider font-bold mt-0.5">Personnes mobilisées</p>
                        </div>
                        <div className="bg-slate-500/10 border border-white/[0.07] rounded-2xl p-3 text-center">
                            <p className="text-sm font-black text-slate-300">{lastShift ? fmtDT(lastShift.endTime) : '—'}</p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">Fin de tâche</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Scenario B */}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onKeepSingleTeam(); onClose(); }}
                            className="flex-1 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] text-xs font-bold transition-all"
                        >
                            Scénario B — Équipe unique
                        </button>

                        {/* Apply */}
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleApply(); }}
                            className="flex-1 py-2.5 rounded-xl text-white text-sm font-black transition-all active:scale-95 flex items-center justify-center gap-2"
                            style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)', boxShadow: '0 8px 24px rgba(99,102,241,0.35)' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            Appliquer la Rotation
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
