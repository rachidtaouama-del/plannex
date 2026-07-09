
import React, { useMemo, useState } from 'react';
import type { SchedulingTaskData } from '../types';

interface AllTeamsStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    allScheduledTasks: SchedulingTaskData[];
    involvedDisciplines: string[];
    maxHours: number;
    schedulingDate: string | null;
    checkAvailabilityInterval?: { start: Date, end: Date } | null;
    onViewTeamDetails?: (teamName: string, tasks: SchedulingTaskData[]) => void;
    /** Pass true only when the user has selected a scheduling strategy and an effective start date exists */
    hasStartDate?: boolean;
}

export const AllTeamsStatusModal: React.FC<AllTeamsStatusModalProps> = ({
    isOpen,
    onClose,
    allScheduledTasks,
    involvedDisciplines,
    maxHours,
    schedulingDate,
    checkAvailabilityInterval,
    onViewTeamDetails,
    hasStartDate = false,
}) => {
    const [showAvailableOnly, setShowAvailableOnly] = useState(false);

    const teamsStatus = useMemo(() => {
        const teamsData = new Map<string, { discipline: string; totalDuration: number; tasks: SchedulingTaskData[] }>();

        allScheduledTasks.forEach(task => {
            if (task.isScheduled && task.DISCIPLINE && task["TYPE D'EQUIPE"]) {
                const fullTeamName = `${task.DISCIPLINE} ${task["TYPE D'EQUIPE"]}`;
                if (!teamsData.has(fullTeamName)) {
                    teamsData.set(fullTeamName, { discipline: task.DISCIPLINE, totalDuration: 0, tasks: [] });
                }
                teamsData.get(fullTeamName)!.tasks.push(task);
                teamsData.get(fullTeamName)!.totalDuration += task.DUREE;
            }
        });

        const durationNeeded = checkAvailabilityInterval
            ? (checkAvailabilityInterval.end.getTime() - checkAvailabilityInterval.start.getTime()) / (1000 * 3600)
            : 0;

        let result = Array.from(teamsData.entries())
            .filter(([, teamInfo]) => involvedDisciplines.length === 0 || involvedDisciplines.includes(teamInfo.discipline))
            .map(([teamName, teamInfo]) => {
                const globalRemaining = maxHours - teamInfo.totalDuration;

                let isFreeInInterval = true;
                let conflictingTask: SchedulingTaskData | null = null;
                if (checkAvailabilityInterval) {
                    const { start: checkStart, end: checkEnd } = checkAvailabilityInterval;
                    conflictingTask = teamInfo.tasks.find(t => {
                        if (!t['START DATE'] || !t['END DATE']) return false;
                        return t['START DATE'] < checkEnd && t['END DATE'] > checkStart;
                    }) || null;
                    isFreeInInterval = !conflictingTask;
                }

                let remainingHoursOnDay = maxHours;
                let hasCapacity = true;
                let missingHours = 0;

                if (checkAvailabilityInterval) {
                    const checkStartDateKey = checkAvailabilityInterval.start.toISOString().split('T')[0];
                    const workloadOnDay = teamInfo.tasks.reduce((sum, task) => {
                        const taskStartKey = task['START DATE']?.toISOString().split('T')[0];
                        if (taskStartKey === checkStartDateKey) return sum + task.DUREE;
                        return sum;
                    }, 0);
                    remainingHoursOnDay = maxHours - workloadOnDay;
                    hasCapacity = remainingHoursOnDay >= durationNeeded;
                    if (!hasCapacity) missingHours = durationNeeded - remainingHoursOnDay;
                } else {
                    hasCapacity = globalRemaining > 0.01;
                }

                let statusLabel: 'LIBRE' | 'OCCUPÉ' | 'SATURÉ' | 'MEILLEUR CHOIX' = 'LIBRE';
                let statusColor = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
                let isAvailable = true;

                if (checkAvailabilityInterval) {
                    if (!isFreeInInterval) {
                        statusLabel = 'OCCUPÉ';
                        statusColor = 'bg-red-500/15 text-red-400 border-red-500/30';
                        isAvailable = false;
                    } else if (!hasCapacity) {
                        statusLabel = 'SATURÉ';
                        statusColor = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
                        isAvailable = false;
                    }
                } else {
                    if (!hasCapacity) {
                        statusLabel = 'SATURÉ';
                        statusColor = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
                        isAvailable = false;
                    }
                }

                const manpower = teamInfo.tasks.length > 0 ? Math.max(...teamInfo.tasks.map(t => t.EFFECTIF)) : 0;

                return {
                    name: teamName,
                    availabilityOnDay: remainingHoursOnDay,
                    globalAvailability: globalRemaining,
                    tasks: teamInfo.tasks,
                    isAvailable,
                    statusLabel,
                    statusColor,
                    manpower,
                    conflictingTaskName: conflictingTask ? conflictingTask['GLOBAL TASKS'] : null,
                    missingHours,
                };
            });

        // Best Fit Logic
        if (checkAvailabilityInterval) {
            let bestFitTeamName: string | null = null;
            let minWastedTime = Infinity;
            result.filter(t => t.isAvailable).forEach(team => {
                const waste = team.availabilityOnDay - durationNeeded;
                if (waste < minWastedTime) { minWastedTime = waste; bestFitTeamName = team.name; }
            });
            if (bestFitTeamName) {
                const bestFit = result.find(t => t.name === bestFitTeamName);
                if (bestFit) (bestFit as any).statusLabel = 'MEILLEUR CHOIX';
            }
        }

        if (showAvailableOnly && checkAvailabilityInterval) {
            result = result.filter(t => t.isAvailable);
        }

        return result.sort((a, b) => {
            if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
            return b.availabilityOnDay - a.availabilityOnDay;
        });
    }, [allScheduledTasks, involvedDisciplines, maxHours, checkAvailabilityInterval, showAvailableOnly]);

    if (!isOpen) return null;

    const formatTime = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    // ── STATUS helpers ──────────────────────────────────────────────────────
    const statusStyles: Record<string, { bar: string; badge: string; label: string }> = {
        'MEILLEUR CHOIX': { bar: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', label: '⭐ MEILLEUR CHOIX' },
        LIBRE: { bar: 'bg-emerald-400', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'LIBRE' },
        OCCUPÉ: { bar: 'bg-red-400', badge: 'bg-red-500/15 text-red-400 border-red-500/30', label: 'OCCUPÉ' },
        SATURÉ: { bar: 'bg-orange-400', badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30', label: 'SATURÉ' },
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[75] p-4" onClick={onClose}>
            <div
                className="relative w-full max-w-2xl bg-[#080d1a] border border-white/[0.07] rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.85)] max-h-[88vh] flex flex-col"
                style={{ animation: 'modalIn 0.22s cubic-bezier(0.16,1,0.3,1) forwards' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Shimmer line */}
                <div className="absolute top-0 left-0 right-0 h-px rounded-t-3xl" style={{ background: 'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)' }} />

                {/* ── HEADER ─────────────────────────────────────────────── */}
                <header className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06] flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: '#6366f1' }}>Planification Intelligente</p>
                            <h2 className="text-lg font-bold text-white">Disponibilité des Équipes</h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>

                {/* ── GATE: no start date selected ───────────────────────── */}
                {!hasStartDate ? (
                    <div className="flex flex-col items-center justify-center px-7 py-16 text-center gap-5">
                        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(99,102,241,0.05))', border: '1px solid rgba(99,102,241,0.3)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-white font-bold text-base">Stratégie requise</p>
                            <p className="text-slate-400 text-sm mt-1.5 max-w-sm leading-relaxed">
                                Sélectionnez une <span className="text-indigo-300 font-semibold">Stratégie de Démarrage</span> dans le formulaire pour que le système puisse calculer la vraie disponibilité de chaque équipe.
                            </p>
                        </div>
                        <div className="mt-2 px-4 py-2.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-xs text-indigo-300 font-medium max-w-xs">
                            💡 Sans date de référence, le temps restant affiché serait simplement la charge max par jour — ce qui n'est pas précis.
                        </div>
                    </div>
                ) : (
                    <>
                        {/* ── TOOLBAR ── */}
                        <div className="px-7 py-3 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Cliquez sur une équipe pour voir le détail des tâches
                                {checkAvailabilityInterval && (
                                    <span className="ml-2 font-mono text-indigo-300">
                                        · {formatTime(checkAvailabilityInterval.start)} → {formatTime(checkAvailabilityInterval.end)}
                                    </span>
                                )}
                            </div>
                            {checkAvailabilityInterval && (
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <div
                                        className={`relative w-9 h-5 rounded-full transition-colors ${showAvailableOnly ? 'bg-indigo-500' : 'bg-white/10'}`}
                                        onClick={() => setShowAvailableOnly(v => !v)}
                                    >
                                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showAvailableOnly ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                    </div>
                                    <span className="text-xs text-slate-300 whitespace-nowrap">Libres only</span>
                                </label>
                            )}
                        </div>

                        {/* ── TEAM LIST ── */}
                        <main className="px-5 py-4 overflow-y-auto flex-grow custom-scrollbar">
                            <div className="space-y-2">
                                {teamsStatus.length === 0 && (
                                    <p className="text-slate-500 text-center py-8 text-sm">Aucune équipe correspondante trouvée.</p>
                                )}
                                {teamsStatus.map(team => {
                                    const st = statusStyles[team.statusLabel] ?? statusStyles['LIBRE'];
                                    const pct = Math.min(100, Math.max(0, (team.availabilityOnDay / maxHours) * 100));

                                    return (
                                        <button
                                            key={team.name}
                                            onClick={() => onViewTeamDetails && onViewTeamDetails(team.name, team.tasks)}
                                            className="w-full text-left bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.07] hover:border-white/[0.15] rounded-2xl p-4 transition-all group"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                {/* Left */}
                                                <div className="flex items-center gap-3 min-w-0">
                                                    {/* Status dot */}
                                                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${st.bar}`} />
                                                    <div className="min-w-0">
                                                        <span className="font-bold text-slate-200 group-hover:text-white text-sm leading-tight block truncate">{team.name}</span>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-white/[0.05] border border-white/[0.08] px-2 py-0.5 rounded-lg">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" /></svg>
                                                                {team.manpower}
                                                            </span>
                                                            {checkAvailabilityInterval && (
                                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border ${st.badge}`}>
                                                                    {st.label}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Right */}
                                                <div className="flex-shrink-0 text-right">
                                                    <span className={`font-bold text-sm font-mono ${team.availabilityOnDay >= 0.01 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {team.availabilityOnDay.toFixed(2)}h
                                                    </span>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">
                                                        {checkAvailabilityInterval ? 'sur la journée' : 'disponible'}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Progress bar */}
                                            <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${st.bar}`}
                                                    style={{ width: `${pct}%`, opacity: 0.7 }}
                                                />
                                            </div>

                                            {/* Conflict / saturation detail */}
                                            {checkAvailabilityInterval && team.statusLabel === 'OCCUPÉ' && (
                                                <div className="mt-2.5 text-xs text-red-300 bg-red-500/10 p-2 rounded-xl border border-red-500/20 flex items-start gap-2">
                                                    <span className="text-red-400 mt-0.5">⚠</span>
                                                    <div><span className="font-bold">Conflit :</span> <span className="italic opacity-80">{team.conflictingTaskName}</span></div>
                                                </div>
                                            )}
                                            {checkAvailabilityInterval && team.statusLabel === 'SATURÉ' && (
                                                <div className="mt-2.5 text-xs text-orange-300 bg-orange-500/10 p-2 rounded-xl border border-orange-500/20 flex items-start gap-2">
                                                    <span className="text-orange-400 mt-0.5">⚠</span>
                                                    <div><span className="font-bold">Capacité insuffisante :</span> Manque {team.missingHours.toFixed(2)}h ce jour-là.</div>
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </main>
                    </>
                )}
            </div>
        </div>
    );
};
