
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { SchedulingTaskData } from '../types';
import { TaskSelector } from './TaskSelector';
import { AllTeamsStatusModal } from './AllTeamsStatusModal';
import { TasksForGapModal } from './TasksForGapModal';
import { TeamTasksModal } from './TeamTasksModal';

interface SchedulingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (constraints: {
        teamAssignments: Record<string, string>;
        maxHours: number;
        startDate: string;
        predecessorIds: number[];
        relation: 'FS' | 'SS';
        isCritical: boolean;
        teamTags: Record<string, string[]>;
    }) => void;
    allTasks: SchedulingTaskData[];
    scheduledTasks: SchedulingTaskData[];
    selectedTasks: SchedulingTaskData[];
    defaultStartDate?: string | null;
    autoStartDate?: string | null;
    defaultMaxHours: number;
    lastTasksByTeam: Map<string, SchedulingTaskData>;
    availableTags: string[];
}

const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean }> = ({ active, onClick, children, disabled }) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`flex-1 text-center py-2.5 px-3 rounded-lg transition-all duration-200 text-xs font-bold tracking-wide ${active
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent disabled:opacity-30 disabled:cursor-not-allowed'
            }`}
    >
        {children}
    </button>
);

const GapDisplay: React.FC<{ gap: { start: Date; end: Date; duration: number }; onShowTasks?: () => void }> = ({ gap, onShowTasks }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="flex flex-col mb-1 last:mb-0 border-b border-slate-700/50 pb-1 last:border-0 last:pb-0">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-amber-300 font-bold font-mono text-xs">{gap.duration.toFixed(2)}h</span>
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="text-[10px] text-sky-400 hover:text-sky-300 flex items-center gap-1 focus:outline-none"
                    >
                        {isOpen ? 'Masquer' : 'Détails'}
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
                {onShowTasks && (
                    <button
                        type="button"
                        onClick={onShowTasks}
                        className="text-[10px] bg-amber-600/20 hover:bg-amber-600 text-amber-400 hover:text-white font-semibold py-0.5 px-2 rounded border border-amber-600/30 transition-colors"
                        title="Trouver une tâche pour ce créneau"
                    >
                        Combler
                    </button>
                )}
            </div>
            {isOpen && (
                <div className="mt-1 pl-2 border-l-2 border-slate-600/50 text-[10px] text-slate-400 font-mono bg-slate-800/30 rounded-r p-1.5 animate-fade-in">
                    <div className="flex justify-between items-center mb-0.5">
                        <span>Début:</span>
                        <span className="text-emerald-300">{gap.start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} <span className="text-slate-500 text-[9px]">{gap.start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' })}</span></span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span>Fin:</span>
                        <span className="text-red-300">{gap.end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} <span className="text-slate-500 text-[9px]">{gap.end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'numeric' })}</span></span>
                    </div>
                </div>
            )}
        </div>
    );
};

// Tag Input Component inside SchedulingModal to avoid circular dependencies or props drilling if extracted too far
const TagInput: React.FC<{
    tags: string[];
    onAddTag: (tag: string) => void;
    onRemoveTag: (tag: string) => void;
    suggestions: string[];
}> = ({ tags, onAddTag, onRemoveTag, suggestions }) => {
    const [inputValue, setInputValue] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredSuggestions = useMemo(() => {
        if (!inputValue) return suggestions;
        return suggestions.filter(s => s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s));
    }, [suggestions, inputValue, tags]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (inputValue.trim()) {
                onAddTag(inputValue.trim());
                setInputValue('');
            }
        }
    };

    return (
        <div ref={wrapperRef} className="relative mt-2">
            <div className="flex flex-wrap gap-2 mb-2">
                {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-xs px-2 py-1 rounded-full border border-emerald-500/30">
                        {tag}
                        <button onClick={() => onRemoveTag(tag)} className="hover:text-white">&times;</button>
                    </span>
                ))}
            </div>
            <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder="Ajouter Tag (Ex: Lundi, Moteur)"
                className="w-full bg-slate-700/50 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-colors"
            />
            {showSuggestions && filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                    {filteredSuggestions.map(tag => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => { onAddTag(tag); setInputValue(''); setShowSuggestions(false); }}
                            className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export const SchedulingModal: React.FC<SchedulingModalProps> = ({ isOpen, onClose, onApply, allTasks, scheduledTasks, selectedTasks, defaultStartDate, autoStartDate, defaultMaxHours, lastTasksByTeam, availableTags }) => {
    const [teamAssignments, setTeamAssignments] = useState<Record<string, string>>({});
    const [teamTags, setTeamTags] = useState<Record<string, string[]>>({});
    const [maxHours, setMaxHours] = useState(8.0);
    const [manualStartDate, setManualStartDate] = useState('');
    const [predecessorIds, setPredecessorIds] = useState<number[]>([]);
    const [relation, setRelation] = useState<'FS' | 'SS'>('FS');
    const [schedulingMode, setSchedulingMode] = useState<'auto' | 'manual' | 'dependency'>('dependency');
    const [isCritical, setIsCritical] = useState(false);
    const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({});
    const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
    const [predecessorWarning, setPredecessorWarning] = useState(false);

    const [isTasksForGapModalOpen, setIsTasksForGapModalOpen] = useState(false);
    const [currentGapDuration, setCurrentGapDuration] = useState(0);
    const [currentGapDiscipline, setCurrentGapDiscipline] = useState<string | null>(null);
    const [isAllTeamsStatusModalOpen, setAllTeamsStatusModalOpen] = useState(false);

    // State for viewing team tasks
    const [viewingTeamTasksData, setViewingTeamTasksData] = useState<{ name: string; tasks: SchedulingTaskData[] } | null>(null);

    const involvedDisciplines = useMemo(() => {
        // Keep order of appearance (no sort) to match table visually
        return [...new Set(selectedTasks.map(t => t.DISCIPLINE).filter(Boolean))];
    }, [selectedTasks]);

    const existingTeamsByDiscipline = useMemo(() => {
        const teams: Record<string, string[]> = {};
        scheduledTasks.forEach(task => {
            if (task.isScheduled && task.DISCIPLINE && task["TYPE D'EQUIPE"]) {
                if (!teams[task.DISCIPLINE]) {
                    teams[task.DISCIPLINE] = [];
                }
                if (!teams[task.DISCIPLINE].includes(task["TYPE D'EQUIPE"])) {
                    teams[task.DISCIPLINE].push(task["TYPE D'EQUIPE"]);
                }
            }
        });
        // Sort the teams numerically if possible
        for (const discipline in teams) {
            teams[discipline].sort((a, b) => {
                const numA = parseInt(a.replace(/[^0-9]/g, ''), 10);
                const numB = parseInt(b.replace(/[^0-9]/g, ''), 10);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }
                return a.localeCompare(b);
            });
        }
        return teams;
    }, [scheduledTasks]);

    useEffect(() => {
        if (isOpen) {
            const baseDate = defaultStartDate ? new Date(defaultStartDate) : new Date();
            if (!defaultStartDate) {
                baseDate.setHours(9, 0, 0, 0);
            }
            baseDate.setMinutes(baseDate.getMinutes() - baseDate.getTimezoneOffset());
            setManualStartDate(baseDate.toISOString().slice(0, 16));

            if (autoStartDate) setSchedulingMode('dependency');
            else setSchedulingMode('manual');

            setMaxHours(defaultMaxHours);
            setPredecessorIds([]);
            setRelation('FS');
            setIsCritical(false);
            setExpandedTasks({});

            // Modified to always default to 'Nouvelle Équipe'
            const initialAssignments = involvedDisciplines.reduce((acc, discipline) => {
                acc[discipline] = 'Nouvelle Équipe';
                return acc;
            }, {} as Record<string, string>);
            setTeamAssignments(initialAssignments);
            setTeamTags({}); // Reset tags
        }
    }, [isOpen, defaultStartDate, autoStartDate, defaultMaxHours, involvedDisciplines]);

    const effectiveStartDate = useMemo(() => {
        switch (schedulingMode) {
            case 'auto': return autoStartDate;
            case 'manual': return manualStartDate;
            case 'dependency': {
                if (predecessorIds.length === 0) return null; // No start date until a predecessor is chosen
                let maxPredecessorEndTime = new Date(0);
                predecessorIds.forEach(id => {
                    const predTask = allTasks.find(t => t.id === id);
                    if (predTask && predTask['END DATE'] && predTask['END DATE'].getTime() > maxPredecessorEndTime.getTime()) {
                        maxPredecessorEndTime = predTask['END DATE'];
                    }
                });
                if (maxPredecessorEndTime.getTime() === 0) return null;
                const d = new Date(maxPredecessorEndTime);
                d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
                return d.toISOString().slice(0, 16);
            }
            default: return null;
        }
    }, [schedulingMode, autoStartDate, manualStartDate, predecessorIds, allTasks]);

    // Calculate Projected Dates for Preview (Detailed per task)
    // Also derive the full time range for availability check
    const { previewDates, timeRange } = useMemo(() => {
        const info: Record<string, Array<{ name: string; start: Date; end: Date; duration: number; manpower: number }>> = {};
        let minStart = Infinity;
        let maxEnd = -Infinity;

        if (!effectiveStartDate || selectedTasks.length === 0) return { previewDates: info, timeRange: null };

        involvedDisciplines.forEach(d => info[d] = []);

        // Sort tasks to simulate execution order
        const sortedTasks = [...selectedTasks].sort((a, b) =>
            (a.predecessor?.includes(b.id) ? 1 : b.predecessor?.includes(a.id) ? -1 : 0)
        );

        let globalCursor = new Date(effectiveStartDate).getTime();

        // Initial Availability per discipline (team)
        const teamCursors: Record<string, number> = {};

        involvedDisciplines.forEach(discipline => {
            const teamName = teamAssignments[discipline];
            let avail = globalCursor;

            // If assigning to an existing team, start after their last task
            if (teamName && teamName !== 'Nouvelle Équipe') {
                const teamTasks = scheduledTasks.filter(t =>
                    t.isScheduled &&
                    t.DISCIPLINE === discipline &&
                    t["TYPE D'EQUIPE"] === teamName &&
                    t['END DATE']
                );
                if (teamTasks.length > 0) {
                    const maxEnd = Math.max(...teamTasks.map(t => t['END DATE']!.getTime()));
                    if (maxEnd > avail) avail = maxEnd;
                }
            }
            teamCursors[discipline] = avail;
        });

        // Simulate scheduling
        sortedTasks.forEach(task => {
            const discipline = task.DISCIPLINE;
            if (teamCursors[discipline] === undefined) return;

            // Task starts at the later of: Global Cursor (from previous task in sequence) OR Team Availability
            const startTime = Math.max(globalCursor, teamCursors[discipline]);
            const endTime = startTime + task.DUREE * 3600000;

            if (startTime < minStart) minStart = startTime;
            if (endTime > maxEnd) maxEnd = endTime;

            info[discipline].push({
                name: task['GLOBAL TASKS'],
                start: new Date(startTime),
                end: new Date(endTime),
                duration: task.DUREE,
                manpower: task.EFFECTIF
            });

            // Update cursors
            teamCursors[discipline] = endTime; // Team is busy until end of this task

            // Update global cursor for next task if sequential
            if (relation === 'FS') {
                globalCursor = endTime;
            }
            // If SS, globalCursor stays put, but teamCursor ensures tasks for the same team don't overlap
        });

        const range = (minStart !== Infinity && maxEnd !== -Infinity) ? { start: new Date(minStart), end: new Date(maxEnd) } : null;

        return { previewDates: info, timeRange: range };
    }, [involvedDisciplines, teamAssignments, effectiveStartDate, selectedTasks, scheduledTasks, relation]);


    const teamSchedulingInfo = useMemo(() => {
        const info: Record<string, { availability: number; gaps: { start: Date; end: Date; duration: number }[]; tasks: SchedulingTaskData[]; manpower: number }> = {};

        const allKnownTeams = new Set<string>();
        lastTasksByTeam.forEach((_, key) => allKnownTeams.add(key));
        scheduledTasks.forEach(task => {
            if (task.isScheduled && task["TYPE D'EQUIPE"]) {
                allKnownTeams.add(`${task.DISCIPLINE} ${task["TYPE D'EQUIPE"]}`);
            }
        });
        Object.values(teamAssignments).forEach((teamName, index) => {
            const discipline = involvedDisciplines[index];
            if (discipline && teamName !== 'Nouvelle Équipe') {
                allKnownTeams.add(`${discipline} ${teamName}`);
            }
        });

        allKnownTeams.forEach(fullTeamName => {
            const teamTasks = scheduledTasks.filter(t => t.isScheduled && t["TYPE D'EQUIPE"] && `${t.DISCIPLINE} ${t["TYPE D'EQUIPE"]}` === fullTeamName);

            const totalDuration = teamTasks.reduce((sum, task) => sum + task.DUREE, 0);
            const availability = maxHours - totalDuration;
            const manpower = teamTasks.length > 0 ? Math.max(...teamTasks.map(t => t.EFFECTIF)) : 0;

            const sortedTeamTasks = teamTasks.sort((a, b) => (a['START DATE']?.getTime() || 0) - (b['START DATE']?.getTime() || 0));
            const gaps: { start: Date; end: Date; duration: number }[] = [];
            for (let i = 0; i < sortedTeamTasks.length - 1; i++) {
                const currentTaskEnd = sortedTeamTasks[i]['END DATE'];
                const nextTaskStart = sortedTeamTasks[i + 1]['START DATE'];

                if (currentTaskEnd && nextTaskStart) {
                    const gapMillis = nextTaskStart.getTime() - currentTaskEnd.getTime();

                    if (gapMillis > 5 * 60 * 1000) { // Gaps over 5 minutes
                        gaps.push({
                            start: currentTaskEnd,
                            end: nextTaskStart,
                            duration: gapMillis / (1000 * 3600),
                        });
                    }
                }
            }

            info[fullTeamName] = { availability, gaps, tasks: teamTasks, manpower };
        });

        return info;
    }, [scheduledTasks, maxHours, lastTasksByTeam, teamAssignments, involvedDisciplines]);

    const potentialPredecessors = useMemo(() => {
        // A predecessor must be a task that is already scheduled.
        return scheduledTasks;
    }, [scheduledTasks]);

    const selectedPredecessors = useMemo(() => {
        return allTasks.filter(t => predecessorIds.includes(t.id));
    }, [allTasks, predecessorIds]);


    if (!isOpen) return null;

    const handleTeamAssignmentChange = (discipline: string, value: string) => {
        setTeamAssignments(prev => ({ ...prev, [discipline]: value }));
    };

    const handleAddTag = (discipline: string, tag: string) => {
        setTeamTags(prev => {
            const current = prev[discipline] || [];
            if (current.includes(tag)) return prev;
            return { ...prev, [discipline]: [...current, tag] };
        });
    };

    const handleRemoveTag = (discipline: string, tag: string) => {
        setTeamTags(prev => {
            const current = prev[discipline] || [];
            return { ...prev, [discipline]: current.filter(t => t !== tag) };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validate: predecessor is required when using dependency mode
        if (schedulingMode === 'dependency' && predecessorIds.length === 0) {
            setPredecessorWarning(true);
            return;
        }

        let finalStartDate = '';
        switch (schedulingMode) {
            case 'auto': finalStartDate = autoStartDate || new Date().toISOString(); break;
            case 'manual': finalStartDate = manualStartDate; break;
            case 'dependency': finalStartDate = effectiveStartDate || new Date().toISOString(); break;
        }

        onApply({
            teamAssignments,
            maxHours,
            startDate: finalStartDate,
            predecessorIds: schedulingMode === 'dependency' ? predecessorIds : [],
            relation,
            isCritical,
            teamTags
        });
    };

    const handleShowTasksForGap = (duration: number, discipline: string) => {
        setCurrentGapDuration(duration);
        setCurrentGapDiscipline(discipline);
        setIsTasksForGapModalOpen(true);
    };

    const toggleTaskExpansion = (taskId: number) => {
        setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
    };

    const formatDatePreview = (date: Date) => date.toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose} role="dialog" aria-modal="true">
            <TasksForGapModal
                isOpen={isTasksForGapModalOpen}
                onClose={() => setIsTasksForGapModalOpen(false)}
                gapDuration={currentGapDuration}
                allTasks={allTasks}
                discipline={currentGapDiscipline}
            />
            <AllTeamsStatusModal
                isOpen={isAllTeamsStatusModalOpen}
                onClose={() => setAllTeamsStatusModalOpen(false)}
                allScheduledTasks={scheduledTasks}
                involvedDisciplines={involvedDisciplines}
                maxHours={maxHours}
                schedulingDate={effectiveStartDate}
                checkAvailabilityInterval={timeRange}
                hasStartDate={!!effectiveStartDate}
                onViewTeamDetails={(teamName, tasks) => {
                    setViewingTeamTasksData({ name: teamName, tasks });
                }}
            />
            <TeamTasksModal
                isOpen={!!viewingTeamTasksData}
                onClose={() => setViewingTeamTasksData(null)}
                teamName={viewingTeamTasksData?.name || ''}
                tasks={viewingTeamTasksData?.tasks || []}
            />
            <div
                className="relative w-full max-w-2xl bg-[#080d1a] border border-white/[0.07] rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.85)] my-4 flex flex-col max-h-[92vh]"
                style={{ animation: 'modalIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Shimmer top border */}
                <div className="absolute top-0 left-0 right-0 h-px rounded-t-3xl" style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.4), transparent)' }} />
                {/* Very subtle emerald tint — top right only, barely visible */}
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[140px] pointer-events-none" style={{ background: 'rgba(16,185,129,0.04)' }} />


                {/* ── HEADER ───────────────────────────────────────────────── */}
                <header className="relative flex items-center justify-between px-7 py-5 border-b border-white/[0.06] flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.2em] uppercase" style={{ color: '#10b981' }}>Planification Intelligente</p>
                            <h2 className="text-lg font-bold text-white">Assistant d'Ordonnancement</h2>
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
                <form onSubmit={handleSubmit} className="relative px-7 py-5 space-y-5 overflow-y-auto flex-grow custom-scrollbar">
                    {/* Task overview accordion */}
                    <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                            className="w-full flex justify-between items-center px-4 py-3 bg-white/[0.04] hover:bg-white/[0.07] text-left transition-all"
                            aria-expanded={isOverviewExpanded}
                            aria-controls="task-overview-panel"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                </div>
                                <span className="text-sm font-semibold text-slate-200">Aperçu des Tâches à Ordonnancer</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">{selectedTasks.length} en attente</span>
                            </div>
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${isOverviewExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <div
                            id="task-overview-panel"
                            className="transition-all duration-300 ease-in-out overflow-hidden"
                            style={{ maxHeight: isOverviewExpanded ? '20rem' : '0px', opacity: isOverviewExpanded ? 1 : 0 }}
                        >
                            <div className="pt-2 px-3 pb-3 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                {selectedTasks.map(task => (
                                    <div key={task.id} className="bg-white/[0.03] p-3 rounded-xl border border-white/[0.06] hover:border-emerald-500/20 transition-all">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white font-semibold truncate text-sm" title={task['GLOBAL TASKS']}>{task['GLOBAL TASKS']}</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">{task.DISCIPLINE}</p>
                                            </div>
                                            <div className="text-right ml-4 flex-shrink-0">
                                                <p className="font-mono text-emerald-400 font-bold text-sm">{task.DUREE.toFixed(2)}h</p>
                                                <p className="text-[10px] text-slate-500">{task.EFFECTIF} pers.</p>
                                            </div>
                                        </div>
                                        <div className="mt-2 pt-2 border-t border-white/[0.05]">
                                            <button
                                                type="button"
                                                onClick={() => toggleTaskExpansion(task.id)}
                                                className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                                            >
                                                {expandedTasks[task.id] ? 'Masquer les détails' : 'Voir plus de détails'}
                                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-3.5 w-3.5 transition-transform ${expandedTasks[task.id] ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                            </button>
                                            <div
                                                className="transition-all duration-300 ease-in-out overflow-hidden"
                                                style={{ maxHeight: expandedTasks[task.id] ? '250px' : '0px' }}
                                            >
                                                <div className="mt-2 space-y-1.5 text-xs text-slate-400 pt-2">
                                                    {task['Nom Equipement'] && <div className="grid grid-cols-[120px_1fr] gap-2"><span className="font-semibold text-slate-500 truncate">Équipement</span><span className="text-slate-300">{task['Nom Equipement']}</span></div>}
                                                    {task.FAMILLE && <div className="grid grid-cols-[120px_1fr] gap-2"><span className="font-semibold text-slate-500 truncate">Famille</span><span className="text-slate-300">{task.FAMILLE}</span></div>}
                                                    {task['Type de Maintenance'] && <div className="grid grid-cols-[120px_1fr] gap-2"><span className="font-semibold text-slate-500 truncate">Type Maint.</span><span className="text-slate-300">{task['Type de Maintenance']}</span></div>}
                                                    {task.OT && <div className="grid grid-cols-[120px_1fr] gap-2"><span className="font-semibold text-slate-500 truncate">OT</span><span className="text-slate-300">{task.OT}</span></div>}
                                                    {task.AVIS && <div className="grid grid-cols-[120px_1fr] gap-2"><span className="font-semibold text-slate-500 truncate">Avis</span><span className="text-slate-300">{task.AVIS}</span></div>}
                                                    {task['Préparatifs'] && String(task['Préparatifs']).trim() !== '' && String(task['Préparatifs']).trim() !== '0' && (
                                                        <div className="grid grid-cols-[120px_1fr] gap-2 items-start">
                                                            <span className="font-semibold text-slate-500 truncate">Préparatifs</span>
                                                            <div className="text-slate-300 whitespace-pre-wrap font-mono text-[11px] bg-slate-800/50 p-2 rounded">{String(task['Préparatifs']).split('<AND>').map(p => `• ${p.trim()}`).join('\n')}</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>


                    {/* ── TEAM ASSIGNMENT SECTION ───────────────────────── */}
                    <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-white/[0.03]">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-lg bg-sky-500/20 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <span className="text-sm font-semibold text-slate-200">Assignation des Équipes & Tags</span>
                            </div>
                            <button type="button" onClick={() => setAllTeamsStatusModalOpen(true)} className="flex items-center gap-1.5 text-xs bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 font-bold py-1.5 px-3 rounded-lg border border-sky-500/30 transition-all">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                Voir disponibilités
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            {involvedDisciplines.map(discipline => {
                                const assignment = teamAssignments[discipline] || 'Nouvelle Équipe';
                                const fullTeamName = `${discipline} ${assignment}`;
                                const teamInfo = teamSchedulingInfo[fullTeamName];
                                const previewList = previewDates[discipline];
                                const currentDisciplineTags = teamTags[discipline] || [];

                                const tasksForThisDiscipline = selectedTasks.filter(t => t.DISCIPLINE === discipline);
                                const totalDurationForDiscipline = tasksForThisDiscipline.reduce((sum, task) => sum + task.DUREE, 0);
                                const requiredManpower = tasksForThisDiscipline.length > 0 ? Math.max(...tasksForThisDiscipline.map(t => t.EFFECTIF)) : 0;

                                let bestFitTeam = null;
                                let minWastedTime = Infinity;
                                const existingTeams = existingTeamsByDiscipline[discipline] || [];
                                existingTeams.forEach(team => {
                                    const info = teamSchedulingInfo[`${discipline} ${team}`];
                                    if (info && info.availability >= totalDurationForDiscipline) {
                                        const waste = info.availability - totalDurationForDiscipline;
                                        if (waste < minWastedTime) { minWastedTime = waste; bestFitTeam = team; }
                                    }
                                });

                                let manpowerWarning = null;
                                if (assignment !== 'Nouvelle Équipe' && teamInfo && teamInfo.manpower > 0 && requiredManpower > 0) {
                                    if (teamInfo.manpower !== requiredManpower) {
                                        manpowerWarning = (
                                            <div className="mt-2 text-[11px] text-amber-300 flex items-start gap-1.5 bg-amber-950/40 p-2 rounded-xl border border-amber-500/20">
                                                <span className="text-base leading-none">⚠️</span>
                                                <div><span className="font-bold">Attention :</span> L'effectif de l'équipe ({teamInfo.manpower} p.) ne correspond pas à celui de la tâche ({requiredManpower} p.).</div>
                                            </div>
                                        );
                                    }
                                }

                                return (
                                    <div key={discipline} className="bg-white/[0.03] p-4 rounded-2xl border border-white/[0.07] hover:border-white/[0.12] transition-all">
                                        <div className="grid grid-cols-3 items-start gap-4 mb-3">
                                            <div className="col-span-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-1 h-8 rounded-full bg-gradient-to-b from-emerald-400 to-teal-600" />
                                                    <label htmlFor={`team-assign-${discipline}`} className="block text-sm font-bold text-white truncate" title={discipline}>{discipline}</label>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20" title="Nombre de tâches">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                                                        <span className="text-[10px] font-bold text-blue-300">{tasksForThisDiscipline.length}</span>
                                                    </div>
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20" title="Durée totale">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                                        <span className="text-[10px] font-bold text-emerald-300">{Number(totalDurationForDiscipline.toFixed(1))}h</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-span-2 space-y-2">
                                                <select
                                                    id={`team-assign-${discipline}`}
                                                    value={assignment}
                                                    onChange={e => handleTeamAssignmentChange(discipline, e.target.value)}
                                                    className="w-full border border-white/[0.1] rounded-xl px-3 py-2.5 text-slate-200 text-sm focus:ring-1 focus:ring-emerald-500 focus:outline-none focus:border-emerald-500/50 transition-all"
                                                    style={{ backgroundColor: '#0f1629', color: '#e2e8f0' }}
                                                >
                                                    <option value="Nouvelle Équipe" style={{ backgroundColor: '#0f1629', color: '#e2e8f0' }}>Nouvelle Équipe</option>
                                                    {existingTeams.map(team => {
                                                        const fullTeamOptionName = `${discipline} ${team}`;
                                                        const info = teamSchedulingInfo[fullTeamOptionName];
                                                        let label = team;
                                                        if (info) {
                                                            const remaining = info.availability;
                                                            const needed = totalDurationForDiscipline;
                                                            const isAvailable = remaining >= needed;
                                                            const isBestFit = team === bestFitTeam;
                                                            if (isBestFit) label = `⭐ ${team} (Reste: ${remaining.toFixed(2)}h)`;
                                                            else if (isAvailable) label = `✅ ${team} (Reste: ${remaining.toFixed(2)}h)`;
                                                            else label = `❌ ${team} (Reste: ${remaining.toFixed(2)}h, Manque: ${(needed - remaining).toFixed(2)}h)`;
                                                        }
                                                        return <option key={team} value={team} style={{ backgroundColor: '#0f1629', color: '#e2e8f0' }}>{label}</option>;
                                                    })}
                                                </select>
                                                <TagInput
                                                    tags={currentDisciplineTags}
                                                    onAddTag={(tag) => handleAddTag(discipline, tag)}
                                                    onRemoveTag={(tag) => handleRemoveTag(discipline, tag)}
                                                    suggestions={availableTags}
                                                />
                                                {manpowerWarning}
                                            </div>
                                        </div>

                                        {/* Preview Dates Block */}
                                        {previewList && previewList.length > 0 && (
                                            <div className="bg-slate-800/50 p-2 rounded border border-slate-600/50 mb-2 max-h-60 overflow-y-auto custom-scrollbar">
                                                <div className="grid grid-cols-1 gap-2">
                                                    {previewList.map((p, idx) => (
                                                        <div key={idx} className="text-xs border-b border-slate-700/50 pb-2 last:border-0 last:pb-0">
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="text-slate-300 font-medium truncate flex-grow" title={p.name}>{p.name}</span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                                                {/* Manpower */}
                                                                <div className="flex items-center gap-1 bg-slate-700/50 px-1.5 py-0.5 rounded" title="Effectif">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                                                                    </svg>
                                                                    <span className="font-mono font-bold text-white">{p.manpower}</span>
                                                                </div>
                                                                {/* Duration */}
                                                                <div className="flex items-center gap-1 bg-slate-700/50 px-1.5 py-0.5 rounded" title="Durée">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                    <span className="font-mono font-bold text-white">{p.duration.toFixed(2)}h</span>
                                                                </div>
                                                                {/* Dates */}
                                                                <div className="flex items-center gap-1 ml-auto">
                                                                    <span className="text-emerald-400 font-mono">{formatDatePreview(p.start)}</span>
                                                                    <span className="text-slate-500">→</span>
                                                                    <span className="text-blue-400 font-mono">{formatDatePreview(p.end)}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {assignment !== 'Nouvelle Équipe' && teamInfo && (
                                            <div className="grid grid-cols-3 gap-4 mt-2">
                                                <div className="col-start-1 col-span-3 p-2 bg-slate-700/50 rounded-md text-xs space-y-2">
                                                    <div className="flex justify-between items-start">
                                                        <div className="border-l-2 border-emerald-400 pl-2">
                                                            <p className="text-slate-400 font-semibold">Disponibilité (Projetée)</p>
                                                            <p className={`font-bold ${(teamInfo.availability - totalDurationForDiscipline) >= 0 ? 'text-emerald-300' : 'text-red-400'}`}>Reste : {(teamInfo.availability - totalDurationForDiscipline).toFixed(2)} h</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewingTeamTasksData({ name: fullTeamName, tasks: teamInfo.tasks })}
                                                            className="text-xs bg-blue-600/30 text-blue-300 hover:bg-blue-600/50 font-bold py-1 px-2 rounded transition-colors"
                                                        >
                                                            Voir les tâches
                                                        </button>
                                                    </div>
                                                    {teamInfo.gaps && teamInfo.gaps.length > 0 && (
                                                        <div className="border-l-2 border-amber-400 pl-2 space-y-1 mt-2">
                                                            <p className="text-slate-400 font-semibold text-xs">Périodes creuses (GAPs)</p>
                                                            {teamInfo.gaps.map((gap, index) => (
                                                                <GapDisplay
                                                                    key={index}
                                                                    gap={gap}
                                                                    onShowTasks={gap.duration >= 0.5 ? () => handleShowTasksForGap(gap.duration, discipline) : undefined}
                                                                />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── MAX HOURS ────────────────────────────────────────── */}
                    <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border-b border-white/[0.06]">
                            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <span className="text-sm font-semibold text-slate-200">Max Heures/Jour (par équipe)</span>
                            <span className="ml-auto text-sm font-bold text-indigo-300 bg-indigo-500/10 px-3 py-0.5 rounded-lg border border-indigo-500/20">{maxHours}h</span>
                        </div>
                        <div className="px-4 py-3">
                            <input
                                type="number"
                                step="0.1"
                                value={maxHours}
                                readOnly
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-slate-400 cursor-not-allowed text-sm"
                            />
                        </div>
                    </div>

                    {/* ── STRATÉGIE DE DÉMARRAGE ────────────────────────── */}
                    <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border-b border-white/[0.06]">
                            <div className="w-6 h-6 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <span className="text-sm font-semibold text-slate-200">Stratégie de Démarrage</span>
                        </div>
                        <div className="p-3">
                            <div className="flex gap-2 p-1 bg-black/20 rounded-xl">
                                <TabButton active={schedulingMode === 'auto'} onClick={() => { }} disabled={true}>Suivre la Dernière Tâche (Auto)</TabButton>
                                <TabButton active={schedulingMode === 'manual'} onClick={() => setSchedulingMode('manual')}>Date Spécifique</TabButton>
                                <TabButton active={schedulingMode === 'dependency'} onClick={() => setSchedulingMode('dependency')}>Dépendance (Prédécesseur)</TabButton>
                            </div>
                        </div>
                    </div>

                    {schedulingMode !== 'dependency' && (
                        <div className="rounded-2xl border border-white/[0.07] p-4">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Début de l'Ordonnancement</label>
                            <input
                                type="datetime-local"
                                value={schedulingMode === 'auto' ? (autoStartDate || '') : manualStartDate}
                                onChange={e => setManualStartDate(e.target.value)}
                                readOnly={schedulingMode === 'auto'}
                                disabled={schedulingMode === 'auto'}
                                required={schedulingMode === 'manual'}
                                className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none transition-all ${schedulingMode === 'auto'
                                    ? 'bg-white/[0.03] border-white/[0.06] text-slate-400 italic cursor-not-allowed'
                                    : 'bg-white/[0.06] border-white/[0.1] text-slate-200 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500/50'
                                    }`}
                            />
                        </div>
                    )}

                    {schedulingMode === 'dependency' && (
                        <div className={`rounded-2xl border p-4 transition-all ${predecessorWarning && predecessorIds.length === 0 ? 'border-red-500/50 bg-red-500/[0.04] shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'border-white/[0.07]'}`}>
                            <label className="block text-xs font-bold uppercase tracking-wider mb-3">
                                <span className="text-slate-200">Prédécesseur</span>
                                <span className="text-red-400 ml-1">*</span>
                                <span className="text-red-400/80 text-[10px] ml-2 normal-case tracking-normal font-semibold">(Obligatoire)</span>
                            </label>
                            <TaskSelector
                                tasks={allTasks.filter(t => t.isScheduled)}
                                selectedIds={predecessorIds}
                                onChange={(ids) => { setPredecessorIds(ids); if (ids.length > 0) setPredecessorWarning(false); }}
                                placeholder="Sélectionner les prédécesseurs..."
                            />
                            {predecessorWarning && predecessorIds.length === 0 && (
                                <div className="mt-3 flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2.5" style={{ animation: 'modalIn 0.2s ease both' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <p className="text-xs font-bold text-red-300">Veuillez sélectionner au moins un prédécesseur pour utiliser la stratégie Dépendance.</p>
                                </div>
                            )}
                            {selectedPredecessors.length > 0 && (
                                <div className="mt-3 space-y-2 bg-black/20 p-3 rounded-xl border border-white/[0.06]">
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Détails des Prédécesseurs :</p>
                                    {selectedPredecessors.map(pred => (
                                        <div key={pred.id} className="text-xs bg-white/[0.03] p-3 rounded-xl border-l-2 border-blue-500 flex justify-between items-center">
                                            <div>
                                                <div className="font-bold text-slate-200">{pred['GLOBAL TASKS']}</div>
                                                <div className="text-slate-400 mt-0.5">{pred.DISCIPLINE} {pred["TYPE D'EQUIPE"]}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-slate-400 text-[10px]">Fin :</div>
                                                <div className="font-mono text-emerald-400 font-bold">
                                                    {pred['END DATE'] ? pred['END DATE'].toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── RELATION TYPE ────────────────────────────────── */}
                    <div className="rounded-2xl border border-white/[0.07] overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.03] border-b border-white/[0.06]">
                            <div className="w-6 h-6 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                </svg>
                            </div>
                            <span className="text-sm font-semibold text-slate-200">Relation (Dépendance)</span>
                        </div>
                        <div className="p-3">
                            <div className="flex gap-2 p-1 bg-black/20 rounded-xl">
                                <TabButton active={relation === 'FS'} onClick={() => setRelation('FS')}>Tâches en SÉRIE (Fin → Début)</TabButton>
                                <TabButton active={relation === 'SS'} onClick={() => setRelation('SS')}>Tâches en PARALLÈLE (Début → Début)</TabButton>
                            </div>
                        </div>
                    </div>

                    {/* ── KEY EVENT ────────────────────────────────────────── */}
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isCritical}
                                onChange={(e) => setIsCritical(e.target.checked)}
                                className="w-5 h-5 text-amber-500 bg-transparent border-amber-500/50 rounded focus:ring-amber-500 focus:ring-offset-0"
                            />
                            <div>
                                <span className="font-bold text-amber-300 text-sm">Marquer comme Événement Clé</span>
                                <p className="text-[11px] text-amber-400/60 mt-0.5">Sera mis en évidence sur le Gantt comme étape critique</p>
                            </div>
                        </label>
                    </div>

                    {/* ── SUBMIT ───────────────────────────────────────────── */}
                    <div className="flex justify-end pt-2 pb-1">
                        <button
                            type="submit"
                            className="flex items-center gap-2.5 font-bold py-3 px-8 rounded-2xl text-sm text-white transition-all duration-200 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:scale-[1.02] active:scale-[0.98]"
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            CALCULER ET APPLIQUER
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
