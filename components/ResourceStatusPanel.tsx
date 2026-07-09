import React, { useMemo, useState, useRef, useEffect } from 'react';
import type { SchedulingTaskData } from '../types';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { DisciplineAnalysisModal } from './DisciplineAnalysisModal';

interface ResourceStatusPanelProps {
    tasks: SchedulingTaskData[];
    dailyDurationLimit: number;
    setDailyDurationLimit: (value: number) => void;
    onViewTeamTasks: (team: { name: string; tasks: SchedulingTaskData[] }) => void;
    onRenameTeam: (discipline: string, oldPartialName: string, newPartialName: string) => boolean;
    tagsByTeam: Record<string, string[]>;
    shutdownParams: { shutdownStart: string | Date; shutdownEnd: string | Date } | null;
}

export const ResourceStatusPanel: React.FC<ResourceStatusPanelProps> = ({ tasks, dailyDurationLimit, setDailyDurationLimit, onViewTeamTasks, onRenameTeam, tagsByTeam, shutdownParams }) => {
    const formatDateForInput = (date: Date) => {
        return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    };

    const initialStart = shutdownParams ? formatDateForInput(new Date(shutdownParams.shutdownStart)) : '';
    const initialEnd = shutdownParams ? formatDateForInput(new Date(shutdownParams.shutdownEnd)) : '';

    const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([]);
    const [filterStartDate, setFilterStartDate] = useState(initialStart);
    const [filterEndDate, setFilterEndDate] = useState(initialEnd);
    const [searchTerm, setSearchTerm] = useState('');
    const [localLimit, setLocalLimit] = useState(dailyDurationLimit.toString());
    const [renamingTeam, setRenamingTeam] = useState<string | null>(null);
    const [newName, setNewName] = useState('');
    const renameInputRef = useRef<HTMLInputElement>(null);
    const [selectedTag, setSelectedTag] = useState<string>('Tous les Tags');
    const [showOverloadedOnly, setShowOverloadedOnly] = useState(false);
    const [sortDescendingByTeamCount, setSortDescendingByTeamCount] = useState(false);
    const [selectedAnalysisDiscipline, setSelectedAnalysisDiscipline] = useState<string | null>(null);
    const [showCapacityToast, setShowCapacityToast] = useState(false);
    const [toastLimit, setToastLimit] = useState(0);

    useEffect(() => {
        if (shutdownParams) {
            setFilterStartDate(formatDateForInput(new Date(shutdownParams.shutdownStart)));
            setFilterEndDate(formatDateForInput(new Date(shutdownParams.shutdownEnd)));
        }
    }, [shutdownParams]);

    useEffect(() => {
        setLocalLimit(dailyDurationLimit.toString());
    }, [dailyDurationLimit]);

    useEffect(() => {
        if (renamingTeam && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [renamingTeam]);

    const allDisciplines = useMemo(() => {
        return [...new Set(tasks.filter(t => t.DISCIPLINE).map(t => t.DISCIPLINE))].sort();
    }, [tasks]);

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        Object.values(tagsByTeam).forEach(teamTags => {
            teamTags.forEach(tag => tags.add(tag));
        });
        return ['Tous les Tags', ...Array.from(tags).sort()];
    }, [tagsByTeam]);

    const teamData = useMemo(() => {
        const teams: Record<string, {
            tasks: SchedulingTaskData[];
            discipline: string;
            teamName: string;
        }> = {};

        tasks.forEach(task => {
            if (task.isScheduled && task["TYPE D'EQUIPE"]) {
                const fullTeamName = `${task.DISCIPLINE} ${task["TYPE D'EQUIPE"]}`;
                if (!teams[fullTeamName]) {
                    teams[fullTeamName] = {
                        tasks: [],
                        discipline: task.DISCIPLINE,
                        teamName: task["TYPE D'EQUIPE"],
                    };
                }
                teams[fullTeamName].tasks.push(task);
            }
        });

        let filteredTeamNames = Object.keys(teams);

        if (selectedDisciplines.length > 0) {
            filteredTeamNames = filteredTeamNames.filter(teamName => {
                const teamInfo = teams[teamName];
                return selectedDisciplines.includes(teamInfo.discipline);
            });
        }

        if (searchTerm) {
            filteredTeamNames = filteredTeamNames.filter(teamName => teamName.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        if (selectedTag !== 'Tous les Tags') {
            filteredTeamNames = filteredTeamNames.filter(teamName => {
                const tags = tagsByTeam[teamName] || [];
                return tags.includes(selectedTag);
            });
        }

        const hasDateFilter = filterStartDate || filterEndDate;

        const mappedTeams = filteredTeamNames
            .map(fullTeamName => {
                const teamInfo = teams[fullTeamName];
                if (!teamInfo) return null;

                let relevantTasks = teamInfo.tasks.filter(t => t.isScheduled && t['START DATE'] && t['END DATE']);
                if (relevantTasks.length === 0) return null;

                let label = '(Globale)';

                if (hasDateFilter) {
                    label = '(Période)';
                    const rangeStartTs = filterStartDate ? new Date(filterStartDate + 'T00:00:00').getTime() : 0;
                    const rangeEndTs = filterEndDate
                        ? new Date(filterEndDate + 'T23:59:59').getTime()
                        : (filterStartDate ? new Date(filterStartDate + 'T23:59:59').getTime() : Infinity);

                    if (rangeStartTs > rangeEndTs) return null; // Invalid range

                    relevantTasks = relevantTasks.filter(t => {
                        const taskStart = t['START DATE']!.getTime();
                        const taskEnd = t['END DATE']!.getTime();
                        return taskStart < rangeEndTs && taskEnd > rangeStartTs;
                    });

                    if (relevantTasks.length === 0) return null;
                }

                // --- DAILY WORKLOAD CALCULATION ---
                const workloadByDay: Record<string, number> = {};
                relevantTasks.forEach(task => {
                    const start = new Date(task['START DATE']!);
                    const end = new Date(task['END DATE']!);

                    let current = new Date(start);
                    while (current < end) {
                        const dayKey = current.toISOString().split('T')[0];
                        const endOfDay = new Date(current);
                        endOfDay.setHours(23, 59, 59, 999);

                        const endForThisDay = Math.min(end.getTime(), endOfDay.getTime() + 1);
                        const startForThisDay = Math.max(start.getTime(), current.getTime());

                        if (endForThisDay > startForThisDay) {
                            const hoursThisDay = (endForThisDay - startForThisDay) / (1000 * 3600);
                            workloadByDay[dayKey] = (workloadByDay[dayKey] || 0) + hoursThisDay;
                        }

                        current.setDate(current.getDate() + 1);
                        current.setHours(0, 0, 0, 0);
                    }
                });

                const overloadedDays = dailyDurationLimit > 0 ? Object.entries(workloadByDay)
                    .filter(([day, hours]) => hours > dailyDurationLimit)
                    .map(([day, hours]) => ({ day, hours })) : [];

                const maxDailyWorkload = Math.max(0, ...Object.values(workloadByDay));
                const loadPercentage = dailyDurationLimit > 0 ? (maxDailyWorkload / dailyDurationLimit) * 100 : 0;

                let status: 'Surchargé' | 'Saturé' | 'Occupé' | 'Disponible';
                let statusClasses = '';

                if (loadPercentage > 100) {
                    status = 'Surchargé';
                    statusClasses = 'bg-red-500/20 text-red-300 border border-red-500/50';
                } else if (loadPercentage >= 99) {
                    status = 'Saturé';
                    statusClasses = 'bg-blue-500/20 text-blue-300 border border-blue-500/50';
                } else if (loadPercentage > 25) {
                    status = 'Occupé';
                    statusClasses = 'bg-orange-500/20 text-orange-300 border border-orange-500/30';
                } else {
                    status = 'Disponible';
                    statusClasses = 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
                }

                const allTeamTasks = teamInfo.tasks.filter(t => t.isScheduled && t['START DATE'] && t['END DATE']);

                const currentTags = tagsByTeam[fullTeamName] || [];

                let lastTaskEnd: Date | undefined;
                let lastTaskName: string | undefined;
                let firstTaskStart: Date | undefined;

                if (allTeamTasks.length > 0) {
                    const lastTask = allTeamTasks.reduce((latest, current) => latest['END DATE']!.getTime() > current['END DATE']!.getTime() ? latest : current);
                    const firstTask = allTeamTasks.reduce((earliest, current) => earliest['START DATE']!.getTime() < current['START DATE']!.getTime() ? earliest : current);
                    lastTaskEnd = lastTask['END DATE']!;
                    lastTaskName = lastTask['GLOBAL TASKS'];
                    firstTaskStart = firstTask['START DATE']!;
                }

                return {
                    name: fullTeamName,
                    discipline: teamInfo.discipline,
                    teamName: teamInfo.teamName,
                    effectif: Math.round(relevantTasks.reduce((sum, t) => sum + t.EFFECTIF, 0) / relevantTasks.length) || 0,
                    lastTaskEnd,
                    lastTaskName,
                    firstTaskStart,
                    status,
                    statusClasses,
                    loadPercentage,
                    maxDailyWorkload,
                    totalHours: relevantTasks.reduce((sum, task) => sum + task['Heures-Homme'], 0),
                    totalDuration: relevantTasks.reduce((sum, task) => sum + task.DUREE, 0),
                    allScheduledTasks: relevantTasks,
                    label,
                    overloadedDays,
                    tags: currentTags,
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

        if (showOverloadedOnly) {
            return mappedTeams.filter(t => t.loadPercentage > 100).sort((a, b) => b.loadPercentage - a.loadPercentage);
        }

        return mappedTeams.sort((a, b) => {
            if (Math.abs(b.loadPercentage - a.loadPercentage) > 0.1) {
                return b.loadPercentage - a.loadPercentage;
            }
            return a.name.localeCompare(b.name, undefined, { numeric: true });
        });

    }, [tasks, selectedDisciplines, filterStartDate, filterEndDate, dailyDurationLimit, searchTerm, selectedTag, tagsByTeam, showOverloadedOnly]);

    const { totalTeams, totalPersonnel } = useMemo(() => {
        const personnel = teamData.reduce((sum, team) => sum + team.effectif, 0);
        return {
            totalTeams: teamData.length,
            totalPersonnel: personnel,
        };
    }, [teamData]);

    const handleConfirmLimit = () => {
        const newLimit = parseFloat(localLimit);
        if (!isNaN(newLimit) && newLimit > 0) {
            setDailyDurationLimit(newLimit);
            setToastLimit(newLimit);
            setShowCapacityToast(true);
            setTimeout(() => setShowCapacityToast(false), 3000);
        } else {
            // alert is blocked in sandbox, so we silently ignore invalid values.
        }
    };

    const handleStartRename = (fullTeamName: string, currentPartialName: string) => {
        setRenamingTeam(fullTeamName);
        setNewName(currentPartialName);
    };

    const handleConfirmRename = (discipline: string, oldPartialName: string) => {
        if (onRenameTeam(discipline, oldPartialName, newName)) {
            setRenamingTeam(null);
            setNewName('');
        }
    };

    const handleCancelRename = () => {
        setRenamingTeam(null);
        setNewName('');
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, discipline: string, oldPartialName: string) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleConfirmRename(discipline, oldPartialName);
        } else if (e.key === 'Escape') {
            handleCancelRename();
        }
    };

    const getLoadBarColor = (percentage: number) => {
        if (percentage > 100) return 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]';
        if (percentage >= 99) return 'bg-gradient-to-r from-blue-600 to-blue-400';
        if (percentage >= 80) return 'bg-gradient-to-r from-amber-500 to-amber-300';
        return 'bg-gradient-to-r from-emerald-600 to-emerald-400';
    };

    const teamsByDiscipline = useMemo(() => {
        const groups: Record<string, typeof teamData> = {};
        teamData.forEach(team => {
            if (!groups[team.discipline]) groups[team.discipline] = [];
            groups[team.discipline].push(team);
        });
        return groups;
    }, [teamData]);

    const sortedDisciplineEntries = useMemo(() => {
        const entries = Object.entries(teamsByDiscipline);
        if (sortDescendingByTeamCount) {
            return entries.sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
        }
        return entries.sort(([a], [b]) => a.localeCompare(b));
    }, [teamsByDiscipline, sortDescendingByTeamCount]);

    return (
        <div className="bg-slate-900/50 backdrop-blur-xl p-8 lg:p-10 rounded-[3rem] border border-white/10 w-full flex flex-col shadow-2xl relative overflow-hidden group/container">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500/5 blur-[100px] rounded-full"></div>
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/5 blur-[100px] rounded-full"></div>

            {/* ── Capacity Toast Notification ── */}
            {showCapacityToast && (
                <div
                    className="fixed bottom-8 right-8 z-[99999] animate-in slide-in-from-bottom-4 fade-in duration-500"
                    style={{ minWidth: '340px' }}
                >
                    <div className="relative overflow-hidden rounded-[1.75rem] bg-[#050e08] border border-emerald-500/30 shadow-[0_0_60px_rgba(16,185,129,0.25)] backdrop-blur-2xl">
                        {/* Scan-line shimmer */}
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(16,185,129,0.015)_2px,rgba(16,185,129,0.015)_4px)] pointer-events-none" />
                        {/* Top accent line */}
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                        {/* Countdown bar */}
                        <div className="absolute bottom-0 left-0 h-[3px] bg-emerald-500 rounded-full"
                            style={{ animation: 'shrink-bar 3s linear forwards' }} />
                        <style>{`@keyframes shrink-bar { from { width: 100%; } to { width: 0%; } }`}</style>

                        <div className="flex items-start gap-4 p-5 pr-4">
                            {/* Icon */}
                            <div className="relative flex-shrink-0 w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                                <div className="absolute inset-0 rounded-2xl bg-emerald-500/20 animate-ping opacity-30" />
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                    <polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                                <p className="text-[8px] font-black text-emerald-400/70 uppercase tracking-[0.35em] mb-0.5">Moteur d'Ordonnancement</p>
                                <p className="text-[13px] font-black text-white tracking-tight leading-tight">
                                    Capacité activée &nbsp;
                                    <span className="text-emerald-400">{toastLimit}H / jour</span>
                                </p>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 leading-snug">
                                    Le planning est prêt — vous pouvez démarrer l'ordonnancement.
                                </p>
                                {/* mini dot indicators */}
                                <div className="flex items-center gap-1.5 mt-2">
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className="w-4 h-0.5 rounded-full bg-emerald-500/30" />
                                    ))}
                                    <span className="text-[8px] font-black text-emerald-500/50 uppercase tracking-widest ml-1">Ready</span>
                                </div>
                            </div>

                            {/* Close button */}
                            <button
                                onClick={() => setShowCapacityToast(false)}
                                className="flex-shrink-0 w-7 h-7 rounded-xl bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white flex items-center justify-center transition-all active:scale-90 border border-white/5"
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                    <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-shrink-0 mb-8 relative z-10">
                <h3 className="text-xl font-black text-white uppercase tracking-wider">État des Équipes & Disponibilité</h3>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 items-end">
                    <div className="xl:col-span-2">
                        <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest ml-1">Recherche Tactique</label>
                        <div className="relative group">
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Identifier une équipe..."
                                className={`w-full bg-slate-950/40 border rounded-2xl pl-11 pr-4 py-3 text-xs font-bold text-slate-200 focus:outline-none transition-all duration-300 ${searchTerm ? 'border-emerald-500 ring-4 ring-emerald-500/10' : 'border-white/5 focus:border-white/20 focus:ring-4 focus:ring-white/5'}`}
                            />
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-colors ${searchTerm ? 'text-emerald-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest ml-1">Filtre Discipline</label>
                        <MultiSelectDropdown
                            options={allDisciplines}
                            selected={selectedDisciplines}
                            onChange={setSelectedDisciplines}
                            placeholder="Toutes les disciplines"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest ml-1">Filtre Segments / Tags</label>
                        <select
                            value={selectedTag}
                            onChange={e => setSelectedTag(e.target.value)}
                            className={`w-full bg-slate-950/40 border rounded-2xl px-4 py-3 text-xs font-bold text-slate-200 focus:outline-none transition-all duration-300 ${selectedTag !== 'Tous les Tags' ? 'border-emerald-500 ring-4 ring-emerald-500/10 text-emerald-400' : 'border-white/5 focus:border-white/20 focus:ring-4 focus:ring-white/5'}`}
                        >
                            {allTags.map(tag => (
                                <option key={tag} value={tag} className="bg-slate-900">{tag}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest ml-1">Horizon Début</label>
                        <input
                            type="date"
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className={`w-full bg-slate-950/40 border rounded-2xl px-4 py-3 text-xs font-bold text-slate-200 focus:outline-none transition-all duration-300 ${filterStartDate !== initialStart ? 'border-emerald-500 ring-4 ring-emerald-500/10 text-emerald-400' : 'border-white/5 focus:border-white/20 focus:ring-4 focus:ring-white/5'}`}
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest ml-1">Horizon Fin</label>
                        <input
                            type="date"
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            className={`w-full bg-slate-950/40 border rounded-2xl px-4 py-3 text-xs font-bold text-slate-200 focus:outline-none transition-all duration-300 ${filterEndDate !== initialEnd ? 'border-emerald-500 ring-4 ring-emerald-500/10 text-emerald-400' : 'border-white/5 focus:border-white/20 focus:ring-4 focus:ring-white/5'}`}
                        />
                    </div>
                    <div className="xl:col-span-2 flex flex-col justify-end">
                        <label className="text-[10px] font-black text-slate-500 mb-2 block uppercase tracking-widest ml-1">Capacité Max. / Jour (H)</label>
                        <div className="flex items-center gap-3">
                            <div className="relative flex-grow group">
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    value={localLimit}
                                    onChange={(e) => setLocalLimit(e.target.value)}
                                    className={`w-full bg-slate-950/40 border rounded-2xl pl-4 pr-10 py-3 text-xs font-black text-slate-200 transition-all duration-300 ${dailyDurationLimit <= 0 ? 'border-amber-500/50 ring-4 ring-amber-500/10 shadow-lg shadow-amber-500/5' : 'border-white/5 focus:border-white/20 focus:ring-4 focus:ring-white/5 focus:outline-none'}`}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 group-hover:text-slate-400 transition-colors uppercase tracking-widest">Hrs</span>
                            </div>
                            <button
                                onClick={handleConfirmLimit}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest px-6 rounded-2xl transition-all h-[42px] whitespace-nowrap shadow-xl shadow-emerald-900/40 active:scale-95 border border-emerald-400/30"
                            >
                                {dailyDurationLimit <= 0 ? 'Activer' : 'Adapter'}
                            </button>
                        </div>
                    </div>
                    <div className="xl:col-span-2 flex items-center h-[42px]">
                        <label className={`flex items-center justify-center gap-3 cursor-pointer px-6 py-2.5 rounded-2xl transition-all duration-300 border w-full h-full group ${showOverloadedOnly ? 'bg-red-500/10 border-red-500/30' : 'bg-slate-950/40 border-white/5 hover:bg-slate-950/60 hover:border-white/20'}`}>
                            <input
                                type="checkbox"
                                checked={showOverloadedOnly}
                                onChange={(e) => setShowOverloadedOnly(e.target.checked)}
                                className="w-4 h-4 text-red-500 bg-slate-900 border-white/10 rounded focus:ring-red-500 focus:ring-offset-slate-900"
                            />
                            <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${showOverloadedOnly ? 'text-red-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                Alertes de Surcharge
                            </span>
                        </label>
                    </div>
                </div>

                <div className="mt-8 pt-4 border-t border-white/5 flex flex-wrap gap-4 justify-between items-center text-sm">
                    <div className="flex items-center gap-4">
                        <span className="font-black text-slate-400 uppercase tracking-[0.3em] text-[10px]">&bull; Vue Analystique</span>
                        <button
                            onClick={() => setSortDescendingByTeamCount(!sortDescendingByTeamCount)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${sortDescendingByTeamCount ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m3 16 4 4 4-4M7 20V4M21 8l-4-4-4 4M17 4v16" /></svg>
                            Trier par Nb. Équipes
                        </button>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Effectif Total</span>
                            <span className="font-black text-emerald-400 text-lg tabular-nums">{totalPersonnel} <span className="text-xs text-slate-500 font-bold uppercase ml-1">PAX</span></span>
                        </div>
                        <div className="w-px h-10 bg-white/5 mx-2"></div>
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Équipes Actives</span>
                            <span className="font-black text-blue-400 text-lg tabular-nums">{totalTeams} <span className="text-xs text-slate-500 font-bold uppercase ml-1">Equipes</span></span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Discipline Dashboard Summary */}
            <div className="flex gap-4 mb-8 overflow-x-auto pb-4 custom-scrollbar">
                {sortedDisciplineEntries.map(([discipline, teams]) => {
                    const totalPax = teams.reduce((sum, t) => sum + t.effectif, 0);
                    return (
                        <button
                            key={`summary-${discipline}`}
                            onClick={() => setSelectedAnalysisDiscipline(discipline)}
                            className="flex-shrink-0 bg-slate-950/40 border border-white/5 p-6 rounded-[2.5rem] min-w-[260px] group hover:bg-slate-900/60 hover:border-white/10 transition-all text-left relative overflow-hidden active:scale-95"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl rounded-full -translate-y-12 translate-x-12 group-hover:bg-emerald-500/10 transition-colors"></div>

                            <div className="flex items-center justify-between mb-4 relative z-10">
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">{discipline}</span>
                                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-tighter shadow-sm border border-emerald-500/20">{teams.length} EQ</span>
                            </div>

                            <div className="relative z-10">
                                <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5 opacity-80">Charge Opérationnelle</div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-2xl font-black text-white tabular-nums tracking-tight">{totalPax}</span>
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">PAX TOTAL</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between group-hover:border-white/10 transition-colors relative z-10">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest group-hover:text-blue-400 transition-colors">Analyse Détaillée</span>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Analysis Modal */}
            <DisciplineAnalysisModal
                isOpen={!!selectedAnalysisDiscipline}
                onClose={() => setSelectedAnalysisDiscipline(null)}
                discipline={selectedAnalysisDiscipline || ''}
                teams={selectedAnalysisDiscipline ? teamsByDiscipline[selectedAnalysisDiscipline] : []}
                dailyDurationLimit={dailyDurationLimit}
            />
            {teamData.length === 0 ? (
                <div className="flex-grow flex flex-col items-center justify-center text-center py-24 bg-slate-950/20 rounded-[2rem] border border-white/5 my-8">
                    <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-2xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <p className="text-slate-400 text-sm font-black uppercase tracking-widest max-w-xs leading-loose">
                        {(filterStartDate || filterEndDate || searchTerm || selectedDisciplines.length > 0 || selectedTag !== 'Tous les Tags' || showOverloadedOnly)
                            ? "Silence Radio. Aucun déploiement NE CORRESPOND aux filtres."
                            : "Escouade en attente. Aucune équipe n'a été planifiée pour le moment."}
                    </p>
                </div>
            ) : (
                <div className="flex-grow overflow-x-auto pb-4 custom-scrollbar">
                    <div className="flex gap-6 min-w-max h-full">
                        {sortedDisciplineEntries.map(([discipline, teams]) => (
                            <div key={discipline} className="w-[320px] flex flex-col gap-4 flex-shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="sticky top-0 bg-slate-900 border border-white/10 rounded-2xl p-4 z-20 shadow-2xl overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:bg-blue-500/10 transition-colors"></div>
                                    <h4 className="font-black text-white uppercase tracking-[0.2em] text-xs flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                            {discipline}
                                        </div>
                                        <span className="text-slate-500">{teams.length} EQ</span>
                                    </h4>
                                    <div className="mt-2 flex items-center justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest relative z-10">
                                        <span>Personnel Dédier</span>
                                        <span className="text-emerald-400/80">{teams.reduce((sum, t) => sum + t.effectif, 0)} Pers.</span>
                                    </div>
                                </div>
                                <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-grow min-h-[400px]" style={{ maxHeight: '700px' }}>
                                    {teams.map(team => {
                                        const isRenamingThisTeam = renamingTeam === team.name;
                                        const surchargeAmount = Math.max(0, team.maxDailyWorkload - dailyDurationLimit);

                                        return (
                                            <div key={team.name} className={`p-6 rounded-[2rem] border transition-all duration-500 group/card relative overflow-hidden ${team.status === 'Surchargé'
                                                ? 'bg-red-500/5 border-red-500/30'
                                                : team.status === 'Saturé'
                                                    ? 'bg-blue-500/5 border-blue-500/30'
                                                    : 'bg-slate-950/40 border-white/5 hover:border-white/10'
                                                }`}>
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 blur-3xl rounded-full -translate-y-12 translate-x-12"></div>
                                                {isRenamingThisTeam ? (
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="font-bold text-emerald-400 text-sm truncate">{team.discipline}</span>
                                                        <input
                                                            ref={renameInputRef}
                                                            type="text"
                                                            value={newName}
                                                            onChange={e => setNewName(e.target.value)}
                                                            onKeyDown={e => handleRenameKeyDown(e, team.discipline, team.teamName)}
                                                            className="flex-grow bg-slate-900 border-slate-600 rounded-md px-2 py-1 text-sm text-white"
                                                        />
                                                        <button onClick={() => handleConfirmRename(team.discipline, team.teamName)} className="p-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                                        </button>
                                                        <button onClick={handleCancelRename} className="p-1 rounded bg-slate-600 hover:bg-slate-500 text-white">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <h4 className="font-bold text-emerald-400 text-sm truncate flex justify-between items-center">
                                                            <span title={team.name}>{team.name}</span>
                                                            <button onClick={() => handleStartRename(team.name, team.teamName)} title="Renommer l'équipe" className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-600 transition-colors">
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                            </button>
                                                        </h4>
                                                        <div className="mt-2 mb-1 w-full bg-slate-900 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-500 ${getLoadBarColor(team.loadPercentage)}`}
                                                                style={{ width: `${Math.min(100, team.loadPercentage)}%` }}
                                                            ></div>
                                                        </div>

                                                        {team.tags && team.tags.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-1">
                                                                {team.tags.map(tag => (
                                                                    <span key={tag} className="text-[10px] bg-slate-600 text-emerald-300 px-1.5 py-0.5 rounded-full border border-slate-500">{tag}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-2 gap-4 mt-6">
                                                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 group-hover/card:bg-white/[0.08] transition-colors">
                                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Effectif</div>
                                                        <div className="text-xs font-black text-slate-200">{team.effectif} <span className="text-[10px] text-slate-500 font-bold uppercase ml-1">PAX</span></div>
                                                    </div>
                                                    <div className="bg-white/5 p-3 rounded-2xl border border-white/5 group-hover/card:bg-white/[0.08] transition-colors">
                                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Charge {team.label.replace(/[()]/g, '')}</div>
                                                        <div className="text-xs font-black text-slate-200">{team.totalHours.toFixed(1)} <span className="text-[10px] text-slate-500 font-bold uppercase ml-1">H/H</span></div>
                                                    </div>
                                                    <div className="col-span-2 bg-white/5 p-3 rounded-2xl border border-white/5 group-hover/card:bg-white/[0.08] transition-colors">
                                                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Plage Opérationnelle</div>
                                                        <div className="text-[10px] font-bold text-slate-300 flex items-center gap-2">
                                                            <span className="text-emerald-400/80">{team.firstTaskStart ? team.firstTaskStart.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-600"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                                            <span className="text-emerald-400/80">{team.lastTaskEnd ? team.lastTaskEnd.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                                        </div>
                                                    </div>

                                                    {surchargeAmount > 0 ? (
                                                        <div className="col-span-2 py-2 px-4 bg-red-500/10 rounded-xl border border-red-500/20">
                                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                                                <span className="text-red-400">Surcharge Critique</span>
                                                                <span className="text-red-400 animate-pulse">+{surchargeAmount.toFixed(1)}H</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="col-span-2 py-2 px-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                                                <span className="text-emerald-500">Marge Disponible</span>
                                                                <span className="text-emerald-400">+{(dailyDurationLimit - team.maxDailyWorkload).toFixed(1)}H</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="col-span-2 grid grid-cols-2 gap-3 pt-2">
                                                        <div className={`flex items-center justify-center py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border shadow-lg ${team.status === 'Surchargé' ? 'bg-red-500 text-white shadow-red-900/40 border-red-400' :
                                                            team.status === 'Saturé' ? 'bg-blue-600 text-white shadow-blue-900/40 border-blue-400' :
                                                                'bg-emerald-600 text-white shadow-emerald-900/40 border-emerald-400'
                                                            }`}>
                                                            {team.status}
                                                        </div>
                                                        <button
                                                            onClick={() => onViewTeamTasks({ name: team.name, tasks: team.allScheduledTasks })}
                                                            className="flex items-center justify-center py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/5 transition-all shadow-lg active:scale-95"
                                                        >
                                                            Détails Tâches
                                                        </button>
                                                    </div>
                                                    {team.status === 'Surchargé' && (
                                                        <div className="col-span-2 mt-2 p-4 bg-slate-900/60 rounded-2xl border border-red-500/20 backdrop-blur-md">
                                                            <div className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                                Détail des Surcroîts
                                                            </div>
                                                            <div className="space-y-2">
                                                                {team.overloadedDays.map(od => (
                                                                    <div key={od.day} className="flex justify-between items-center text-[10px] group/day">
                                                                        <span className="font-bold text-slate-500 uppercase tracking-tight group-hover/day:text-slate-300 transition-colors uppercase">{new Date(od.day + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })}</span>
                                                                        <div className="flex items-center gap-2 font-mono">
                                                                            <span className="font-black text-red-400">{od.hours.toFixed(1)}h</span>
                                                                            <span className="text-slate-700">/</span>
                                                                            <span className="text-slate-500 font-bold">{dailyDurationLimit}h</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
