import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { SchedulingTaskData, CalculationResults, AppParameters, ShutdownParams, ScheduledTask } from '../types';
import { ProfessionalGanttChart } from './ProfessionalGanttChart';
import { AllTeamsStatusModal } from './AllTeamsStatusModal';
import { TeamTasksModal } from './TeamTasksModal';
import { TaskSelector } from './TaskSelector';
import { SchedulingModal } from './SchedulingModal';

// ---- Types ----
interface LiveSchedulingModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasksToEditIds: number[]; // legacy – ignored, we show ALL tasks
    allTasks: SchedulingTaskData[];
    onSave: (updatedTasks: SchedulingTaskData[]) => void;
    scheduledTasks: SchedulingTaskData[];
    shutdownParams: ShutdownParams;
    dailyDurationLimit: number;
    lastTasksByTeam: Map<string, SchedulingTaskData>;
    disciplineColors: Map<string, string>;
    setDisciplineColors: React.Dispatch<React.SetStateAction<Map<string, string>>>;
    timelineOptions: { unit: 'Heures' | 'Jours', interval: number };
    setTimelineOptions: React.Dispatch<React.SetStateAction<{ unit: 'Heures' | 'Jours', interval: number }>>;
    familyOrder: string[];
    setFamilyOrder: React.Dispatch<React.SetStateAction<string[]>>;
    // Full scheduling assistant props (same as SchedulingPage)
    autoStartDate?: string | null;
    availableTags?: string[];
    onApplyScheduling?: (selectedIds: number[], constraints: any) => void;
}

// ---- Helpers ----
const buildResultsFromTasks = (tasks: SchedulingTaskData[]): CalculationResults => {
    const scheduled = tasks.filter(t => t.isScheduled && t['START DATE'] && t['END DATE']);
    return {
        scheduledTasks: scheduled.map(t => ({
            id: t.id,
            action: t['GLOBAL TASKS'],
            equipment: t['Nom Equipement'],
            family: t.FAMILLE,
            team: `${t.DISCIPLINE || ''} ${t["TYPE D'EQUIPE"] || ''}`.trim(),
            discipline: t.DISCIPLINE || '',
            duration: t.DUREE,
            manpower: t.EFFECTIF,
            manHours: t['Heures-Homme'],
            startTime: t['START DATE'] instanceof Date ? t['START DATE'] : new Date(t['START DATE']!),
            endTime: t['END DATE'] instanceof Date ? t['END DATE'] : new Date(t['END DATE']!),
            predecessor: t.predecessor || null,
            predecessorActions: [],
            isLate: false,
            sequenceOrder: t.sequenceOrder,
            hasDeconsignationSuccessor: false,
            imperativeStart: false,
            isHighRisk: (t['COMMENTAIRE HSE'] || '').toString() === '1',
            isKeyEvent: !!t.isKeyEvent,
            ot: (t.OT || '').toString(),
            avis: (t.AVIS || '').toString(),
            preparatifs: t.Préparatifs,
            maintenanceType: t['Type de Maintenance'],
            multiDisciplineId: t.multiDisciplineId,
        })),
        kpis: { totalTasks: 0, totalManHours: 0, shutdownDurationHours: 0, effectiveWorkHours: 0 },
        peakResources: {},
        scheduleEndDate: new Date(),
        maxWorkDate: new Date(),
    };
};

const Highlight: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
    if (!highlight.trim()) return <>{text}</>;
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>
            {parts.map((part, i) =>
                regex.test(part) ? <span key={i} className="bg-yellow-500/50 text-white">{part}</span> : part
            )}
        </span>
    );
};

// ---- Filter Dropdown ----
const FilterDropdown: React.FC<{
    label: string; options: string[]; value: string; onChange: (v: string) => void;
}> = ({ label, options, value, onChange }) => (
    <div className="flex flex-col gap-1 min-w-[140px]">
        <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">{label}</span>
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all hover:border-white/20"
        >
            {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    </div>
);

// ---- Status Badge ----
const StatusBadge: React.FC<{ isScheduled: boolean }> = ({ isScheduled }) => (
    isScheduled
        ? <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Planifiée</span>
        : <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest bg-slate-700/60 text-slate-500 border border-slate-700">En attente</span>
);

// ======= MAIN COMPONENT =======
export const LiveSchedulingModal: React.FC<LiveSchedulingModalProps> = ({
    isOpen, onClose, allTasks, onSave,
    scheduledTasks, shutdownParams, dailyDurationLimit, lastTasksByTeam,
    disciplineColors, setDisciplineColors, timelineOptions, setTimelineOptions,
    familyOrder, setFamilyOrder,
    autoStartDate, availableTags = [],
}) => {
    // ---- Local task state (mirrors parent but editable live) ----
    const [localTasks, setLocalTasks] = useState<SchedulingTaskData[]>([]);

    // ---- Selection ----
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    // ---- Filters ----
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDiscipline, setFilterDiscipline] = useState('TOUTES LES DISCIPLINES');
    const [filterEquipement, setFilterEquipement] = useState('TOUS LES ÉQUIPEMENTS');
    const [filterFamille, setFilterFamille] = useState('TOUTES LES FAMILLES');
    const [filterMaintenance, setFilterMaintenance] = useState('TOUS LES TYPES');
    const [filterStatus, setFilterStatus] = useState<'all' | 'unscheduled' | 'scheduled'>('all');

    // ---- Gantt options ----
    const [filterMode, setFilterMode] = useState<'all' | 'range'>('all');
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    const [isHoverEnabled, setIsHoverEnabled] = useState(false);

    // ---- Scheduling assistant (reuse existing SchedulingModal) ----
    const [isAssistantOpen, setIsAssistantOpen] = useState(false);

    // ---- Team tasks modal ----
    const [viewingTeamData, setViewingTeamData] = useState<{ name: string; tasks: SchedulingTaskData[] } | null>(null);

    // ---- Notification ----
    const [notification, setNotification] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

    // ---- Gantt Container Ref for Auto-Scrolling ----
    const ganttContainerRef = useRef<HTMLDivElement>(null);

    // ---- Panel Collapse State ----
    const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

    // Sync localTasks from parent
    useEffect(() => {
        if (isOpen) {
            const mapped = JSON.parse(JSON.stringify(allTasks)).map((t: any, idx: number) => ({
                ...t,
                'START DATE': t['START DATE'] ? new Date(t['START DATE']) : null,
                'END DATE': t['END DATE'] ? new Date(t['END DATE']) : null,
                sequenceOrder: t.sequenceOrder ?? idx,
            }));
            setLocalTasks(mapped);
            setSelectedIds([]);
            setSearchTerm('');
            setFilterDiscipline('TOUTES LES DISCIPLINES');
            setFilterEquipement('TOUS LES ÉQUIPEMENTS');
            setFilterFamille('TOUTES LES FAMILLES');
            setFilterMaintenance('TOUS LES TYPES');
            setFilterStatus('all');

            const toDateTimeLocal = (dateStr: string) => {
                const date = new Date(dateStr);
                const tzoffset = date.getTimezoneOffset() * 60000;
                return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
            };
            setRangeStart(toDateTimeLocal(shutdownParams.shutdownStart));
            setRangeEnd(toDateTimeLocal(shutdownParams.shutdownEnd));
        }
    }, [isOpen, allTasks, shutdownParams]);

    // ---- Filter Options ----
    const disciplines = useMemo(() => ['TOUTES LES DISCIPLINES', ...Array.from(new Set(allTasks.map(t => t.DISCIPLINE).filter(Boolean))).sort()], [allTasks]);
    const equipements = useMemo(() => ['TOUS LES ÉQUIPEMENTS', ...Array.from(new Set(allTasks.map(t => t['Nom Equipement']).filter(Boolean))).sort()], [allTasks]);
    const familles = useMemo(() => ['TOUTES LES FAMILLES', ...Array.from(new Set(allTasks.map(t => t.FAMILLE).filter(Boolean))).sort()], [allTasks]);
    const maintenances = useMemo(() => ['TOUS LES TYPES', ...Array.from(new Set(allTasks.map(t => t['Type de Maintenance']).filter(Boolean))).sort()], [allTasks]);

    // ---- Filtered tasks ----
    const filteredTasks = useMemo(() => {
        return localTasks.filter(t => {
            if (filterDiscipline !== 'TOUTES LES DISCIPLINES' && t.DISCIPLINE !== filterDiscipline) return false;
            if (filterEquipement !== 'TOUS LES ÉQUIPEMENTS' && t['Nom Equipement'] !== filterEquipement) return false;
            if (filterFamille !== 'TOUTES LES FAMILLES' && t.FAMILLE !== filterFamille) return false;
            if (filterMaintenance !== 'TOUS LES TYPES' && t['Type de Maintenance'] !== filterMaintenance) return false;
            if (filterStatus === 'unscheduled' && t.isScheduled) return false;
            if (filterStatus === 'scheduled' && !t.isScheduled) return false;
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                const haystack = [t['GLOBAL TASKS'], t.DISCIPLINE, t['Nom Equipement'], t.FAMILLE].join(' ').toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [localTasks, filterDiscipline, filterEquipement, filterFamille, filterMaintenance, filterStatus, searchTerm]);

    // ---- Selection helpers ----
    const allFilteredSelected = filteredTasks.length > 0 && filteredTasks.every(t => selectedIds.includes(t.id));
    const someFilteredSelected = filteredTasks.some(t => selectedIds.includes(t.id)) && !allFilteredSelected;

    const toggleSelectAll = () => {
        if (allFilteredSelected) {
            setSelectedIds(prev => prev.filter(id => !filteredTasks.some(t => t.id === id)));
        } else {
            setSelectedIds(prev => [...new Set([...prev, ...filteredTasks.map(t => t.id)])]);
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // ---- Gantt results ----
    const ganttResults = useMemo(() => buildResultsFromTasks(localTasks), [localTasks]);

    const currentFilter = useMemo(() => {
        if (filterMode === 'range' && rangeStart && rangeEnd) {
            return { start: new Date(rangeStart), end: new Date(rangeEnd) };
        }
        return null;
    }, [filterMode, rangeStart, rangeEnd]);

    const parameters = useMemo((): AppParameters => ({
        shutdownStart: shutdownParams.shutdownStart, shutdownEnd: shutdownParams.shutdownEnd,
        consignation: shutdownParams.consignation, deconsignation: shutdownParams.deconsignation,
        combustion: { mode: 'parallel', value: shutdownParams.combustion }, demarrage: 0,
    }), [shutdownParams]);

    const handleTaskBlockSequenceChange = (taskIds: string[], direction: 'up' | 'down') => {
        setLocalTasks(currentTasks => {
            const allT = [...currentTasks];
            const firstTaskInfo = allT.find(t => (t.multiDisciplineId || `single_${t.id}`) === taskIds[0]);
            if (!firstTaskInfo || !firstTaskInfo.FAMILLE) return allT;
            const familyName = firstTaskInfo.FAMILLE;
            const familyTasks = allT.filter(t => t.FAMILLE === familyName).sort((a, b) => (a.sequenceOrder ?? Infinity) - (b.sequenceOrder ?? Infinity));
            const indices = taskIds.map(id => familyTasks.findIndex(t => (t.multiDisciplineId || `single_${t.id}`) === id));
            if (indices.some(i => i === -1)) return allT;
            const minIndex = Math.min(...indices);
            const maxIndex = Math.max(...indices);
            if (maxIndex - minIndex + 1 !== taskIds.length) return allT;
            const newFamilyOrder = [...familyTasks];
            if (direction === 'up' && minIndex > 0) {
                const block = newFamilyOrder.splice(minIndex, taskIds.length);
                newFamilyOrder.splice(minIndex - 1, 0, ...block);
            } else if (direction === 'down' && maxIndex < newFamilyOrder.length - 1) {
                const block = newFamilyOrder.splice(minIndex, taskIds.length);
                newFamilyOrder.splice(minIndex + 1, 0, ...block);
            } else { return allT; }
            const familyMap = new Map(newFamilyOrder.map((task, index) => [(task.multiDisciplineId || `single_${task.id}`), { ...task, sequenceOrder: index }]));
            return allT.map(t => (t.FAMILLE === familyName ? familyMap.get(t.multiDisciplineId || `single_${t.id}`) || t : t));
        });
    };

    // ---- Apply scheduling from assistant ----
    const handleApplyFromAssistant = (constraints: {
        teamAssignments: Record<string, string>;
        maxHours: number;
        startDate: string;
        predecessorIds: number[];
        relation: 'FS' | 'SS';
        isCritical: boolean;
        teamTags: Record<string, string[]>;
    }) => {
        const selectedTasksToSchedule = localTasks.filter(t => selectedIds.includes(t.id));
        if (selectedTasksToSchedule.length === 0) return;

        let tasksCopy: SchedulingTaskData[] = JSON.parse(JSON.stringify(localTasks)).map((t: any) => ({
            ...t,
            'START DATE': t['START DATE'] ? new Date(t['START DATE']) : null,
            'END DATE': t['END DATE'] ? new Date(t['END DATE']) : null,
        }));

        const operationStartTime = new Date(constraints.startDate);
        const tasksToScheduleIds = new Set(selectedIds);
        const sortedSelected = tasksCopy
            .filter((t: SchedulingTaskData) => tasksToScheduleIds.has(t.id))
            .sort((a: SchedulingTaskData, b: SchedulingTaskData) => (a.sequenceOrder ?? a.id) - (b.sequenceOrder ?? b.id));

        const newTeamCounters: Record<string, number> = {};
        const teamAssignmentsByName: Record<string, { name: string; number: number }> = {};
        Object.keys(constraints.teamAssignments).forEach(discipline => {
            const assignment = constraints.teamAssignments[discipline];
            if (assignment === 'Nouvelle Équipe') {
                if (!newTeamCounters[discipline]) {
                    const existingNumbers = new Set(tasksCopy.filter((t: SchedulingTaskData) => t.isScheduled && t.DISCIPLINE === discipline && t['EQUIPE NUMBER'] != null).map((t: SchedulingTaskData) => t['EQUIPE NUMBER']!));
                    let num = 1;
                    while (existingNumbers.has(num)) num++;
                    newTeamCounters[discipline] = num;
                }
                teamAssignmentsByName[discipline] = { name: `Équipe ${newTeamCounters[discipline]}`, number: newTeamCounters[discipline] };
            } else {
                const num = parseInt(assignment.replace(/[^0-9]/g, ''), 10);
                teamAssignmentsByName[discipline] = { name: assignment, number: num };
            }
        });

        let sequentialCursor = new Date(operationStartTime);
        sortedSelected.forEach((task: SchedulingTaskData) => {
            const discipline = task.DISCIPLINE;
            if (!teamAssignmentsByName[discipline]) return;
            const taskPreds = task.predecessor || [];
            let maxInternalPredEndTime = new Date(0);
            if (constraints.relation === 'FS') {
                taskPreds.forEach(predId => {
                    if (tasksToScheduleIds.has(predId)) {
                        const predTask = tasksCopy.find((t: SchedulingTaskData) => t.id === predId);
                        if (predTask && predTask['END DATE'] && new Date(predTask['END DATE']).getTime() > maxInternalPredEndTime.getTime()) {
                            maxInternalPredEndTime = new Date(predTask['END DATE']);
                        }
                    }
                });
            }
            let taskStartTime: number;
            if (constraints.relation === 'SS') {
                taskStartTime = Math.max(operationStartTime.getTime(), maxInternalPredEndTime.getTime());
            } else {
                taskStartTime = Math.max(sequentialCursor.getTime(), maxInternalPredEndTime.getTime());
            }
            const currentTaskStartTime = new Date(taskStartTime);
            const currentTaskEndTime = new Date(currentTaskStartTime.getTime() + task.DUREE * 3600000);
            const taskIndex = tasksCopy.findIndex((t: SchedulingTaskData) => t.id === task.id);
            if (taskIndex !== -1) {
                const { name, number } = teamAssignmentsByName[discipline];
                tasksCopy[taskIndex] = {
                    ...tasksCopy[taskIndex],
                    isScheduled: true,
                    'START DATE': currentTaskStartTime,
                    'END DATE': currentTaskEndTime,
                    'MAX HOUR': constraints.maxHours,
                    predecessor: [...new Set([...(tasksCopy[taskIndex].predecessor || []), ...constraints.predecessorIds])],
                    "TYPE D'EQUIPE": name,
                    'EQUIPE NUMBER': number,
                    isKeyEvent: constraints.isCritical,
                };
            }
            if (constraints.relation === 'FS') sequentialCursor = currentTaskEndTime;
        });

        // Cascade to successors
        const queue = [...selectedIds];
        const visited = new Set<number>(queue);
        while (queue.length > 0) {
            const currentTaskId = queue.shift()!;
            const successors = tasksCopy.filter((t: SchedulingTaskData) => t.predecessor?.includes(currentTaskId));
            for (const successor of successors) {
                if (visited.has(successor.id) || !successor.isScheduled) continue;
                let newStart = new Date(0);
                if (successor.predecessor && successor.predecessor.length > 0) {
                    successor.predecessor.forEach((predId: number) => {
                        const predTask = tasksCopy.find((t: SchedulingTaskData) => t.id === predId);
                        if (predTask && predTask['END DATE'] && new Date(predTask['END DATE']).getTime() > newStart.getTime()) {
                            newStart = new Date(predTask['END DATE']);
                        }
                    });
                }
                if (newStart.getTime() > 0) {
                    const idx = tasksCopy.findIndex((t: SchedulingTaskData) => t.id === successor.id);
                    tasksCopy[idx]['START DATE'] = newStart;
                    tasksCopy[idx]['END DATE'] = new Date(newStart.getTime() + successor.DUREE * 3600000);
                    queue.push(successor.id);
                    visited.add(successor.id);
                }
            }
        }

        setLocalTasks(tasksCopy);
        setIsAssistantOpen(false);
        setNotification({ msg: `${selectedIds.length} tâche(s) planifiée(s) avec succès.`, type: 'success' });
        setTimeout(() => setNotification(null), 3000);
    };

    const handleSaveAndClose = () => {
        onSave(localTasks);
        setNotification({ msg: 'Modifications enregistrées.', type: 'success' });
        setTimeout(() => {
            setNotification(null);
            onClose();
        }, 1000);
    };

    const handleColorChange = (disciplineName: string, color: string) => {
        setDisciplineColors(prev => new Map(prev).set(disciplineName, color));
    };

    // ---- Stats ----
    const selectedDuration = useMemo(() => {
        return localTasks.filter(t => selectedIds.includes(t.id)).reduce((sum, t) => sum + t.DUREE, 0);
    }, [localTasks, selectedIds]);

    const selectedBreakdown = useMemo(() => {
        const breakdown: Record<string, number> = {};
        localTasks.filter(t => selectedIds.includes(t.id)).forEach(t => {
            const d = t.DISCIPLINE || 'N/A';
            breakdown[d] = (breakdown[d] || 0) + t.DUREE;
        });
        return breakdown;
    }, [localTasks, selectedIds]);

    const localScheduledTasks = useMemo(() => localTasks.filter(t => t.isScheduled && t['START DATE'] && t['END DATE']), [localTasks]);

    // Auto-scroll logic: scroll Gantt to start when a new task is scheduled
    useEffect(() => {
        if (ganttContainerRef.current) {
            // A short timeout ensures the new UI layout is applied before scrolling
            setTimeout(() => {
                if (ganttContainerRef.current) {
                    ganttContainerRef.current.scrollLeft = 0;
                    ganttContainerRef.current.scrollTop = 0;
                }
            }, 100);
        }
    }, [localScheduledTasks.length]);

    if (!isOpen) return null;

    const selectedForAssistant = localTasks.filter(t => selectedIds.includes(t.id));

    return (
        <div className="fixed inset-0 z-[70] bg-slate-950 flex flex-col animate-in fade-in duration-200">

            {/* ============ TOP BAR ============ */}
            <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-white/5 bg-slate-950/95 backdrop-blur-xl relative z-10">
                <div className="flex items-center gap-5">
                    {/* Logo/Brand */}
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5">
                                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                        <div>
                            <h1 className="text-xs font-black text-white uppercase tracking-[0.25em]">Live Scheduling</h1>
                            <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-[0.2em] opacity-80">Mode Ordonnancement Temps Réel</p>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-8 w-px bg-white/5"></div>

                    {/* Stats chips */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.03] rounded-xl border border-white/5">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-500"></div>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{localTasks.length} MISSIONS</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/5 rounded-xl border border-emerald-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{localScheduledTasks.length} PLANIFIÉES</span>
                        </div>
                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 rounded-xl border border-indigo-500/30 animate-in fade-in duration-200">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                                <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">{selectedIds.length} SÉLECTIONNÉES · {selectedDuration.toFixed(2)}H</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-3">
                    {/* Gantt filter */}
                    <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-1.5">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Gantt:</span>
                        <button onClick={() => setFilterMode('all')} className={`text-[9px] px-2 py-1 rounded-lg font-black transition-all ${filterMode === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Complet</button>
                        <button onClick={() => setFilterMode('range')} className={`text-[9px] px-2 py-1 rounded-lg font-black transition-all ${filterMode === 'range' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>Fenêtre</button>
                        {filterMode === 'range' && (
                            <div className="flex items-center gap-1 ml-1">
                                <input type="datetime-local" value={rangeStart} onChange={e => setRangeStart(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[8px] text-slate-300 w-36 focus:outline-none" />
                                <span className="text-slate-600 text-[9px]">→</span>
                                <input type="datetime-local" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[8px] text-slate-300 w-36 focus:outline-none" />
                            </div>
                        )}
                    </div>

                    {/* Zoom */}
                    <div className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-xl px-3 py-1.5">
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Zoom:</span>
                        <select value={timelineOptions.unit} onChange={e => setTimelineOptions(prev => ({ ...prev, unit: e.target.value as 'Heures' | 'Jours' }))} className="bg-transparent text-[9px] text-slate-300 font-black focus:outline-none">
                            <option value="Heures">H</option>
                            <option value="Jours">J</option>
                        </select>
                        <input type="number" value={timelineOptions.interval} min={1} onChange={e => setTimelineOptions(prev => ({ ...prev, interval: Math.max(1, parseInt(e.target.value, 10) || 1) }))} className="bg-transparent w-8 text-center text-[9px] text-slate-300 font-black focus:outline-none" />
                    </div>



                    {/* Hover toggle */}
                    <label className="flex items-center gap-2 cursor-pointer px-3 py-1.5 bg-white/[0.03] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-all group">
                        <input type="checkbox" checked={isHoverEnabled} onChange={e => setIsHoverEnabled(e.target.checked)} className="w-3.5 h-3.5 accent-indigo-500" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">Survol</span>
                    </label>

                    {/* Divider */}
                    <div className="h-8 w-px bg-white/5"></div>

                    {/* Assistant button */}
                    <button
                        onClick={() => setIsAssistantOpen(true)}
                        disabled={selectedIds.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:opacity-30 text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-900/40 active:scale-95 disabled:cursor-not-allowed"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        Assistant {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                    </button>

                    {/* Save & Close */}
                    <button
                        onClick={handleSaveAndClose}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-900/40 active:scale-95"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7" /></svg>
                        Sauvegarder
                    </button>

                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-slate-500 hover:text-white hover:bg-white/10 transition-all text-lg font-black">
                        ✕
                    </button>
                </div>
            </header>

            {/* ============ BODY: split pane ============ */}
            <div className="flex-1 flex overflow-hidden">

                {/* ===== LEFT: Task List ===== */}
                <div
                    className={`${isLeftPanelCollapsed ? 'w-0 opacity-0 border-r-0' : 'w-[44%] xl:w-[40%] border-r border-white/5'} flex flex-col bg-slate-950 overflow-hidden transition-all duration-300 ease-in-out`}
                >

                    {/* Filters */}
                    <div className="flex-shrink-0 px-4 pt-4 pb-3 space-y-3 border-b border-white/5 bg-slate-950/80">
                        {/* Search */}
                        <div className="relative">
                            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                placeholder="Scannage des missions, équipements ou familles..."
                                className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">✕</button>
                            )}
                        </div>

                        {/* Filter dropdowns */}
                        <div className="flex flex-wrap gap-2">
                            <FilterDropdown label="Discipline" options={disciplines} value={filterDiscipline} onChange={setFilterDiscipline} />
                            <FilterDropdown label="Équipement" options={equipements} value={filterEquipement} onChange={setFilterEquipement} />
                            <FilterDropdown label="Famille" options={familles} value={filterFamille} onChange={setFilterFamille} />
                            <FilterDropdown label="Maintenance" options={maintenances} value={filterMaintenance} onChange={setFilterMaintenance} />

                            {/* Status filter */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Statut</span>
                                <div className="flex gap-1">
                                    {(['all', 'unscheduled', 'scheduled'] as const).map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setFilterStatus(s)}
                                            className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${filterStatus === s
                                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                                : 'bg-black/40 border-white/10 text-slate-500 hover:text-slate-200 hover:border-white/20'
                                                }`}
                                        >
                                            {s === 'all' ? 'Tout' : s === 'unscheduled' ? 'En attente' : 'Planifiées'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Selection summary */}
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                {filteredTasks.length} RÉSULTAT{filteredTasks.length !== 1 ? 'S' : ''}
                            </span>
                            {selectedIds.length > 0 && (
                                <button onClick={() => setSelectedIds([])} className="text-[9px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-wider transition-colors">
                                    Désélectionner tout ({selectedIds.length})
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Task Table */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-xs border-separate border-spacing-0">
                            <thead className="sticky top-0 z-10">
                                <tr className="bg-slate-900/95 backdrop-blur-xl">
                                    <th className="w-8 px-3 py-3 border-b border-white/5">
                                        <input
                                            type="checkbox"
                                            checked={allFilteredSelected}
                                            ref={el => { if (el) el.indeterminate = someFilteredSelected; }}
                                            onChange={toggleSelectAll}
                                            className="w-3.5 h-3.5 rounded accent-indigo-500"
                                        />
                                    </th>
                                    <th className="px-3 py-3 text-left border-b border-white/5">
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Mission</span>
                                    </th>
                                    <th className="px-2 py-3 text-right border-b border-white/5 w-16">
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Durée</span>
                                    </th>
                                    <th className="px-2 py-3 text-center border-b border-white/5 w-20">
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Statut</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.map((task, idx) => {
                                    const isSelected = selectedIds.includes(task.id);
                                    const disciplineColor = disciplineColors.get(task.DISCIPLINE || '') || '#6366f1';
                                    return (
                                        <tr
                                            key={task.id}
                                            onClick={() => toggleSelect(task.id)}
                                            className={`group/row cursor-pointer border-b border-white/[0.03] transition-all duration-100 ${isSelected
                                                ? 'bg-indigo-500/10 border-indigo-500/20'
                                                : 'hover:bg-white/[0.02]'
                                                }`}
                                        >
                                            <td className="px-3 py-2.5">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelect(task.id)}
                                                    onClick={e => e.stopPropagation()}
                                                    className="w-3.5 h-3.5 rounded accent-indigo-500"
                                                />
                                            </td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1 h-3 rounded-sm shrink-0" style={{ backgroundColor: disciplineColor + '99' }}></div>
                                                        <span className="text-[10px] font-bold text-slate-200 leading-tight line-clamp-1 group-hover/row:text-white transition-colors">
                                                            <Highlight text={task['GLOBAL TASKS'] || ''} highlight={searchTerm} />
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 pl-3">
                                                        <span className="text-[8px] text-slate-600 font-bold uppercase tracking-wider">{task.DISCIPLINE}</span>
                                                        {task['Nom Equipement'] && <span className="text-[8px] text-slate-700">· {task['Nom Equipement']}</span>}
                                                    </div>
                                                    {task.isScheduled && task['START DATE'] && task['END DATE'] && (
                                                        <div className="flex items-center gap-1.5 pl-3 mt-0.5">
                                                            <span className="text-[8px] font-mono text-emerald-500">
                                                                {task['START DATE'].toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            <span className="text-slate-700 text-[8px]">→</span>
                                                            <span className="text-[8px] font-mono text-blue-400">
                                                                {task['END DATE'].toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                            {task["TYPE D'EQUIPE"] && (
                                                                <span className="text-[7px] font-black text-slate-600 bg-white/5 px-1.5 py-0.5 rounded">
                                                                    {task["TYPE D'EQUIPE"]}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2.5 text-right">
                                                <span className={`text-[11px] font-black font-mono tabular-nums ${isSelected ? 'text-indigo-300' : 'text-slate-400'}`}>
                                                    {task.DUREE.toFixed(2)}<span className="text-[8px] text-slate-600 ml-0.5">h</span>
                                                </span>
                                            </td>
                                            <td className="px-2 py-2.5 text-center">
                                                <StatusBadge isScheduled={task.isScheduled} />
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredTasks.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center opacity-30">
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                                                </div>
                                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Aucune mission trouvée</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Bottom action bar */}
                    {selectedIds.length > 0 && (
                        <div className="flex-shrink-0 px-4 py-3 bg-slate-950/90 border-t border-indigo-500/20 flex items-center justify-between animate-in slide-in-from-bottom duration-200">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest">
                                    {selectedIds.length} SÉLECTIONNÉE{selectedIds.length > 1 ? 'S' : ''} · {selectedDuration.toFixed(2)}H TOTAL
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {Object.entries(selectedBreakdown).map(([disc, dur]) => (
                                    <div key={disc} className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg border border-white/5">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: disciplineColors.get(disc) || '#6366f1' }}></div>
                                        <span className="text-[8px] font-black text-slate-400 uppercase">{disc}</span>
                                        <span className="text-[8px] font-black text-slate-300">{dur.toFixed(1)}h</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ===== RIGHT: Live Gantt ===== */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                    {/* Gantt label */}
                    <div className="flex-shrink-0 px-5 py-2.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Gantt Live</span>
                            </div>

                            <button
                                onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-sm ${isLeftPanelCollapsed
                                    ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-500'
                                    : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-500'
                                    }`}
                            >
                                {isLeftPanelCollapsed ? (
                                    <>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
                                        Afficher Tâches
                                    </>
                                ) : (
                                    <>
                                        Plein Écran
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="flex items-center gap-3 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                            <span>{localScheduledTasks.length} tâches planifiées</span>
                        </div>
                    </div>

                    {/* Gantt chart */}
                    <div ref={ganttContainerRef} className="flex-1 overflow-auto gantt-scroll-container p-2">
                        {localScheduledTasks.length > 0 ? (
                            <ProfessionalGanttChart
                                results={ganttResults}
                                parameters={parameters}
                                familyOrder={familyOrder}
                                setFamilyOrder={setFamilyOrder}
                                customCriticalPaths={[]}
                                isColdStopFlow={true}
                                timelineOptions={timelineOptions}
                                disciplineColors={disciplineColors}
                                showFlow={false}
                                showChronology={false}
                                filter={currentFilter}
                                onTaskBlockSequenceChange={handleTaskBlockSequenceChange}
                                isHoverDetailsEnabled={isHoverEnabled}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-5 opacity-30 pointer-events-none">
                                <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center">
                                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-400">
                                        <rect x="3" y="4" width="18" height="3" rx="1" /><rect x="3" y="9" width="10" height="3" rx="1" /><rect x="3" y="14" width="14" height="3" rx="1" /><rect x="3" y="19" width="7" height="3" rx="1" />
                                    </svg>
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-black text-slate-500 uppercase tracking-widest mb-1">Gantt Vide</p>
                                    <p className="text-xs text-slate-400">Planifiez des tâches pour les voir apparaître ici</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ============ SCHEDULING ASSISTANT MODAL ============ */}
            <SchedulingModal
                isOpen={isAssistantOpen}
                onClose={() => setIsAssistantOpen(false)}
                onApply={handleApplyFromAssistant}
                allTasks={localTasks}
                scheduledTasks={localScheduledTasks}
                selectedTasks={selectedForAssistant}
                defaultStartDate={shutdownParams.shutdownStart}
                autoStartDate={autoStartDate}
                defaultMaxHours={dailyDurationLimit || 12}
                lastTasksByTeam={lastTasksByTeam}
                availableTags={availableTags}
            />

            {/* ============ TEAM TASKS MODAL ============ */}
            <TeamTasksModal
                isOpen={!!viewingTeamData}
                onClose={() => setViewingTeamData(null)}
                teamName={viewingTeamData?.name || ''}
                tasks={viewingTeamData?.tasks || []}
            />

            {/* ============ NOTIFICATION ============ */}
            {notification && (
                <div className={`fixed bottom-6 right-6 z-[200] px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl animate-in slide-in-from-bottom duration-300 flex items-center gap-3 ${notification.type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-900/50' : 'bg-red-600 text-white shadow-red-900/50'}`}>
                    {notification.type === 'success' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 9v2m0 4h.01" /></svg>
                    )}
                    {notification.msg}
                </div>
            )}
        </div>
    );
};