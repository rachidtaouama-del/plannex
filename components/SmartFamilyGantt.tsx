
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { ScheduledTask, AppParameters } from '../types';

interface SmartFamilyGanttProps {
    tasks: ScheduledTask[];
    parameters: AppParameters;
    onTaskClick?: (task: ScheduledTask) => void;
}

const HIGH_CONTRAST_COLORS = [
    '#3b82f6', // Blue
    '#22c55e', // Green
    '#f97316', // Orange
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f59e0b', // Amber
    '#6366f1', // Indigo
    '#ef4444', // Red
    '#84cc16', // Lime
    '#06b6d4', // Cyan
    '#d946ef', // Fuchsia
    '#64748b', // Slate
    '#8b5cf6', // Violet
    '#10b981', // Emerald
    '#f43f5e', // Rose
];

const getDisciplineColor = (discipline: string, colorMap: Map<string, string>) => {
    if (!colorMap.has(discipline)) {
        const color = HIGH_CONTRAST_COLORS[colorMap.size % HIGH_CONTRAST_COLORS.length];
        colorMap.set(discipline, color);
    }
    return colorMap.get(discipline)!;
};

// Zoom is now handled by "Steps" (time intervals between ticks)
const MIN_ZOOM_STEP = 1;
const MAX_ZOOM_STEP = 48;
const STEP_PX_WIDTH = 120; // Fixed width per graphical "step" on the timeline

export const SmartFamilyGantt: React.FC<SmartFamilyGanttProps> = ({ tasks, parameters, onTaskClick }) => {
    const [zoomStep, setZoomStep] = useState(1); // Interval between ticks (1h or 1d by default)
    const [zoomUnit, setZoomUnit] = useState<'hours' | 'days'>('hours');
    const [expandedFamilies, setExpandedFamilies] = useState<Record<string, boolean>>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoveredTask, setHoveredTask] = useState<ScheduledTask | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [isLegendOpen, setIsLegendOpen] = useState(false);

    // --- START: NEW ZOOM & PANNING STATE ---
    const [zoomValueInput, setZoomValueInput] = useState(zoomStep.toString());
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ scrollLeft: 0, clientX: 0 });
    // --- END: NEW ZOOM & PANNING STATE ---

    // --- Interactive Reordering & Sorting State ---
    const [customFamilyOrder, setCustomFamilyOrder] = useState<string[]>([]);
    const [customTaskOrder, setCustomTaskOrder] = useState<Record<string, number[]>>({});
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // 1. Memoize basic grouping and timeline bounds
    const { groupedTasks, chartStart, chartEnd, totalDuration, timelineWidth, disciplineColorMap, allDisciplines } = useMemo(() => {
        if (tasks.length === 0) {
            return {
                groupedTasks: {},
                chartStart: new Date(),
                chartEnd: new Date(),
                totalDuration: 0,
                timelineWidth: 0,
                disciplineColorMap: new Map(),
                allDisciplines: []
            };
        }

        // Group by Multi-Discipline grouping logic
        const taskGroups = new Map<string, ScheduledTask[]>();
        tasks.forEach(task => {
            const key = task.multiDisciplineId || `single_${task.id}`;
            if (!taskGroups.has(key)) taskGroups.set(key, []);
            taskGroups.get(key)!.push(task);
        });

        // Convert groups to "Display Tasks"
        const displayTasks: ScheduledTask[] = [];
        taskGroups.forEach((group) => {
            const main = group[0];
            const combinedManpower = group.reduce((sum, t) => sum + t.manpower, 0);
            const combinedDisciplines = [...new Set(group.map(t => t.discipline))].join(' + ');

            displayTasks.push({
                ...main,
                manpower: combinedManpower,
                discipline: combinedDisciplines,
                team: combinedDisciplines,
            });
        });

        // Group by Family
        const grouped: Record<string, ScheduledTask[]> = {};
        displayTasks.forEach(task => {
            const fam = task.family || 'Autres';
            if (!grouped[fam]) grouped[fam] = [];
            grouped[fam].push(task);
        });

        // Default Sort tasks within families (by start time)
        Object.keys(grouped).forEach(family => {
            grouped[family].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        });

        // Determine timeline bounds
        const allStartTimes = displayTasks.map(t => t.startTime.getTime());
        const allEndTimes = displayTasks.map(t => t.endTime.getTime());

        let minTime = Math.min(...allStartTimes);
        let maxTime = Math.max(...allEndTimes);

        // Add buffer
        const start = new Date(minTime);
        start.setHours(start.getHours() - 2);
        const end = new Date(maxTime);
        end.setHours(end.getHours() + 2);

        const duration = end.getTime() - start.getTime();
        const durationHours = duration / (1000 * 60 * 60);

        // Derive pixels per hour based on step width
        const pixelsPerHour = zoomUnit === 'hours'
            ? STEP_PX_WIDTH / zoomStep
            : STEP_PX_WIDTH / (zoomStep * 24);

        const width = durationHours * pixelsPerHour;

        const colorMap = new Map<string, string>();
        const disciplines = Array.from(new Set(displayTasks.map(t => t.discipline || t.team.split(' ')[0] || t.team))).sort();

        // Pre-fill color map
        disciplines.forEach(d => getDisciplineColor(d, colorMap));

        return {
            groupedTasks: grouped,
            chartStart: start,
            chartEnd: end,
            totalDuration: duration,
            timelineWidth: width,
            disciplineColorMap: colorMap,
            allDisciplines: disciplines
        };
    }, [tasks, parameters, zoomStep, zoomUnit]);

    // 2. Initialize or Sync Order State when Data Changes
    useEffect(() => {
        const families = Object.keys(groupedTasks).sort();

        let initialFamilyOrder = families;
        const savedFamilyOrderStr = localStorage.getItem('plannex_smart_gantt_family_order');
        if (savedFamilyOrderStr) {
            try {
                const savedFamilyOrder = JSON.parse(savedFamilyOrderStr);
                const filteredSaved = savedFamilyOrder.filter((f: string) => families.includes(f));
                const missing = families.filter(f => !filteredSaved.includes(f));
                initialFamilyOrder = [...filteredSaved, ...missing];
            } catch (e) {
                console.error("Error parsing saved family order", e);
            }
        }
        setCustomFamilyOrder(initialFamilyOrder);

        const initialTaskOrders: Record<string, number[]> = {};
        const savedTaskOrderStr = localStorage.getItem('plannex_smart_gantt_task_order');
        let parsedSavedTaskOrder: Record<string, number[]> = {};
        if (savedTaskOrderStr) {
            try {
                parsedSavedTaskOrder = JSON.parse(savedTaskOrderStr);
            } catch (e) {
                console.error("Error parsing saved task order", e);
            }
        }

        families.forEach(f => {
            const currentTasksIds = groupedTasks[f].map(t => t.id);
            const savedTasksForF = parsedSavedTaskOrder[f];
            if (savedTasksForF) {
                const filteredSavedIds = savedTasksForF.filter((id: number) => currentTasksIds.includes(id));
                const missingIds = currentTasksIds.filter(id => !filteredSavedIds.includes(id));
                initialTaskOrders[f] = [...filteredSavedIds, ...missingIds];
            } else {
                initialTaskOrders[f] = currentTasksIds;
            }
        });
        setCustomTaskOrder(initialTaskOrders);

        const savedSortDir = localStorage.getItem('plannex_smart_gantt_sort_dir');
        if (savedSortDir === 'asc' || savedSortDir === 'desc') {
            setSortDirection(savedSortDir);
        }

        // Initialize all families as expanded
        const initialExpanded: Record<string, boolean> = {};
        families.forEach(f => initialExpanded[f] = true);
        setExpandedFamilies(prev => ({ ...initialExpanded, ...prev }));
    }, [groupedTasks]);

    // Save orders to localStorage when they change
    useEffect(() => {
        if (customFamilyOrder.length > 0) {
            localStorage.setItem('plannex_smart_gantt_family_order', JSON.stringify(customFamilyOrder));
        }
    }, [customFamilyOrder]);

    useEffect(() => {
        if (Object.keys(customTaskOrder).length > 0) {
            localStorage.setItem('plannex_smart_gantt_task_order', JSON.stringify(customTaskOrder));
        }
    }, [customTaskOrder]);

    useEffect(() => {
        localStorage.setItem('plannex_smart_gantt_sort_dir', sortDirection);
    }, [sortDirection]);

    // --- START: NEW ZOOM & PANNING LOGIC ---
    useEffect(() => {
        setZoomValueInput(zoomStep.toString());
    }, [zoomStep]);

    const handleZoomValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setZoomValueInput(e.target.value);
    };

    const handleZoomValueBlur = () => {
        let val = parseInt(zoomValueInput);
        if (isNaN(val) || val < MIN_ZOOM_STEP) {
            val = MIN_ZOOM_STEP;
        } else if (val > MAX_ZOOM_STEP) {
            val = MAX_ZOOM_STEP;
        }
        setZoomStep(val);
        setZoomValueInput(val.toString());
    };

    const handleZoomToFit = () => {
        if (tasks.length === 0 || !containerRef.current) return;
        const ganttAreaWidth = containerRef.current.clientWidth - 380;
        if (ganttAreaWidth <= 0) return;

        const minTime = Math.min(...tasks.map(t => t.startTime.getTime()));
        const maxTime = Math.max(...tasks.map(t => t.endTime.getTime()));
        const tasksDurationHours = (maxTime - minTime) / (1000 * 60 * 60) + 4;
        if (tasksDurationHours <= 0) return;

        if (zoomUnit === 'hours') {
            const optimalStep = Math.max(1, Math.ceil(tasksDurationHours / (ganttAreaWidth / STEP_PX_WIDTH)));
            setZoomStep(Math.min(optimalStep, MAX_ZOOM_STEP));
        } else {
            const tasksDurationDays = tasksDurationHours / 24;
            const optimalStep = Math.max(1, Math.ceil(tasksDurationDays / (ganttAreaWidth / STEP_PX_WIDTH)));
            setZoomStep(Math.min(optimalStep, MAX_ZOOM_STEP));
        }
    };

    // Auto-fit on mount
    const hasAutoFit = useRef(false);
    useEffect(() => {
        if (tasks.length > 0 && containerRef.current && !hasAutoFit.current) {
            hasAutoFit.current = true;
            requestAnimationFrame(() => {
                handleZoomToFit();
            });
        }
    }, [tasks.length]);

    const handleWheel = (e: React.WheelEvent) => {
        if (e.ctrlKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 1 : -1;
            setZoomStep(prev => Math.max(MIN_ZOOM_STEP, Math.min(MAX_ZOOM_STEP, prev + delta)));
        }
    };

    const handlePanMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setIsPanning(true);
        if (containerRef.current) {
            containerRef.current.style.cursor = 'grabbing';
            panStartRef.current = {
                scrollLeft: containerRef.current.scrollLeft,
                clientX: e.clientX,
            };
        }
    };

    const handlePanMouseUp = () => {
        setIsPanning(false);
        if (containerRef.current) {
            containerRef.current.style.cursor = 'grab';
        }
    };

    const handlePanMouseMove = (e: React.MouseEvent) => {
        if (!isPanning || !containerRef.current) return;
        e.preventDefault();
        const dx = e.clientX - panStartRef.current.clientX;
        containerRef.current.scrollLeft = panStartRef.current.scrollLeft - dx;
    };
    // --- END: NEW ZOOM & PANNING LOGIC ---

    // --- START: NEW SORTING & NAVIGATION LOGIC ---
    const handleSortByDate = () => {
        const familyStartTimes = new Map<string, number>();
        Object.entries(groupedTasks).forEach(([family, tasks]) => {
            if (tasks.length > 0) {
                const minTime = Math.min(...tasks.map(t => t.startTime.getTime()));
                familyStartTimes.set(family, minTime);
            }
        });

        const sortedFamilies = [...customFamilyOrder].sort((a, b) => {
            const timeA = familyStartTimes.get(a) ?? Infinity;
            const timeB = familyStartTimes.get(b) ?? Infinity;
            if (sortDirection === 'asc') {
                return timeA - timeB;
            } else {
                return timeB - timeA;
            }
        });

        setCustomFamilyOrder(sortedFamilies);
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        handleGoToStart();
    };

    const handleGoToStart = () => {
        if (containerRef.current) {
            containerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        }
    };
    // --- END: NEW SORTING & NAVIGATION LOGIC ---

    // 3. Helper to get tasks for a family based on current order state
    const getTasksForFamily = (family: string) => {
        const defaultTasks = groupedTasks[family] || [];
        const orderIds = customTaskOrder[family];

        if (!orderIds || orderIds.length !== defaultTasks.length) {
            return defaultTasks;
        }

        const taskMap = new Map(defaultTasks.map(t => [t.id, t]));
        return orderIds.map(id => taskMap.get(id)).filter((t): t is ScheduledTask => !!t);
    };

    // 4. Reordering Handlers
    const moveFamily = (index: number, direction: 'up' | 'down') => {
        setCustomFamilyOrder(prev => {
            const newOrder = [...prev];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex >= 0 && targetIndex < newOrder.length) {
                [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
            }
            return newOrder;
        });
    };

    const moveTask = (family: string, index: number, direction: 'up' | 'down') => {
        setCustomTaskOrder(prev => {
            const currentOrder = prev[family] || [];
            const newOrder = [...currentOrder];
            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex >= 0 && targetIndex < newOrder.length) {
                [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
            }
            return { ...prev, [family]: newOrder };
        });
    };


    const ticks = useMemo(() => {
        const result = [];
        const current = new Date(chartStart);

        if (zoomUnit === 'hours') {
            current.setHours(0, 0, 0, 0);
            while (current < chartEnd) {
                if (current >= chartStart) {
                    result.push(new Date(current));
                }
                current.setHours(current.getHours() + zoomStep);
            }
        } else {
            current.setHours(0, 0, 0, 0);
            while (current < chartEnd) {
                if (current >= chartStart) {
                    result.push(new Date(current));
                }
                current.setDate(current.getDate() + zoomStep);
            }
        }
        return result;
    }, [chartStart, chartEnd, zoomStep, zoomUnit]);

    const toggleFamily = (family: string) => {
        setExpandedFamilies(prev => ({ ...prev, [family]: !prev[family] }));
    };

    const handleMouseMove = (e: React.MouseEvent, task: ScheduledTask) => {
        setHoveredTask(task);
        const x = e.clientX + 20;
        const y = e.clientY + 20;
        setTooltipPos({ x, y });
    };

    return (
        <div className="flex flex-col h-full rounded-[2rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] relative select-none"
            style={{ background: 'linear-gradient(180deg, #09111f 0%, #060e1a 100%)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
            {/* Top accent shimmer */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent pointer-events-none z-50" />

            {/* ─── TOOLBAR ─── */}
            <div className="flex items-center justify-between px-5 py-3 z-30 flex-shrink-0 gap-4"
                style={{ background: 'rgba(5,10,20,0.95)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
                {/* Left: Title + Actions */}
                <div className="flex items-center gap-4">
                    {/* Title block */}
                    <div className="flex items-center gap-3 pr-4" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="relative w-7 h-7 rounded-xl flex-shrink-0" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                            <div className="absolute inset-0 rounded-xl blur-md opacity-50" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }} />
                            <div className="relative w-full h-full flex items-center justify-center">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 3v18h18" /><path d="M18 9H9" /><path d="M15 5h-3" /><path d="M12 13H9" />
                                </svg>
                            </div>
                        </div>
                        <div className="hidden md:block">
                            <span className="block text-[7px] font-black text-slate-700 uppercase tracking-[0.3em] leading-none">Planification</span>
                            <span className="block text-[11px] font-black text-slate-300 uppercase tracking-widest leading-none mt-0.5">Vue Gantt Interactif</span>
                        </div>
                    </div>

                    {/* Sort button */}
                    <button
                        onClick={handleSortByDate}
                        className={`group flex items-center gap-2 rounded-xl px-3.5 py-2 text-[10px] font-black uppercase tracking-widest transition-all duration-200 border ${sortDirection === 'desc'
                                ? 'bg-blue-500/15 border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                                : 'bg-white/[0.04] border-white/[0.06] text-slate-500 hover:text-slate-300 hover:bg-white/[0.07] hover:border-white/10'
                            }`}
                        title={`Trier par date (${sortDirection === 'asc' ? 'ascendant' : 'descendant'})`}
                    >
                        {sortDirection === 'asc' ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v18" /><path d="m4 17 4 4 4-4" /><path d="M16 4h5" /><path d="M16 8h4" /><path d="M16 12h3" /><path d="M16 16h2" /></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v18" /><path d="m4 7 4-4 4 4" /><path d="M16 4h5" /><path d="M16 8h4" /><path d="M16 12h3" /><path d="M16 16h2" /></svg>
                        )}
                        Trier par Date
                    </button>

                    {/* Go to start button */}
                    <button
                        onClick={handleGoToStart}
                        className="group flex items-center gap-2 rounded-xl px-3.5 py-2 text-[10px] font-black uppercase tracking-widest transition-all duration-200 border bg-white/[0.04] border-white/[0.06] text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20"
                        title="Aller au début de la chronologie"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></svg>
                        Aller au début
                    </button>
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-3">
                    {/* Legend */}
                    <div className="relative">
                        <button
                            onClick={() => setIsLegendOpen(!isLegendOpen)}
                            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[10px] font-black uppercase tracking-widest transition-all duration-200 border ${isLegendOpen
                                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                                    : 'bg-white/[0.04] border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/10'
                                }`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12" /></svg>
                            Légende
                        </button>

                        {isLegendOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border shadow-2xl p-4 z-[100] animate-in fade-in zoom-in-95 duration-150"
                                style={{ background: 'rgba(6,10,18,0.98)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 0 50px rgba(0,0,0,0.8)' }}
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500">Couleurs des Équipes</span>
                                    <button onClick={() => setIsLegendOpen(false)} className="w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-colors flex items-center justify-center text-sm">&times;</button>
                                </div>
                                <div className="grid grid-cols-1 gap-2.5 max-h-60 overflow-y-auto pr-1">
                                    {allDisciplines.map(discipline => (
                                        <div key={discipline} className="flex items-center gap-3 group">
                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-lg" style={{ backgroundColor: disciplineColorMap.get(discipline), boxShadow: `0 0 8px ${disciplineColorMap.get(discipline)}80` }}></div>
                                            <span className="text-[11px] font-bold text-slate-400 group-hover:text-white transition-colors truncate">{discipline}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Zoom controls */}
                    <div className="flex items-center gap-2 p-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {/* Unit selector */}
                        <div className={`relative flex items-center rounded-lg px-3 py-1.5 min-w-[90px] transition-colors ${zoomUnit === 'days' ? 'bg-indigo-500/15 border border-indigo-500/30' : 'bg-white/[0.04] border border-white/[0.06]'}`}>
                            <select
                                value={zoomUnit}
                                onChange={(e) => setZoomUnit(e.target.value as 'hours' | 'days')}
                                className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none w-full cursor-pointer appearance-none pr-4"
                                style={{ color: zoomUnit === 'days' ? '#818cf8' : '#64748b' }}
                            >
                                <option value="hours" className="bg-slate-900 text-white">Heures</option>
                                <option value="days" className="bg-slate-900 text-white">Jours</option>
                            </select>
                            <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={zoomUnit === 'days' ? '#818cf8' : '#475569'} strokeWidth="4"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </div>

                        <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.05)' }} />

                        {/* Fit to screen */}
                        <button
                            onClick={handleZoomToFit}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 transition-all"
                            title="Ajuster à l'écran"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>
                        </button>

                        {/* Go to start icon button */}
                        <button
                            onClick={handleGoToStart}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all"
                            title="Aller au début"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m11 17-5-5 5-5" /><path d="m18 17-5-5 5-5" /></svg>
                        </button>

                        <div className="w-px h-6" style={{ background: 'rgba(255,255,255,0.05)' }} />

                        {/* Step input */}
                        <div className="flex items-center gap-2 px-1">
                            <span className={`text-[9px] font-black uppercase tracking-widest transition-colors ${zoomStep !== 1 ? 'text-blue-400' : 'text-slate-700'}`}>Pas</span>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={zoomValueInput}
                                    onChange={handleZoomValueChange}
                                    onBlur={handleZoomValueBlur}
                                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                                    className={`w-14 text-center py-1.5 text-[10px] font-black font-mono text-white appearance-none pr-5 outline-none rounded-lg transition-all ${zoomStep !== 1
                                            ? 'shadow-[0_0_12px_rgba(59,130,246,0.2)] border-blue-500/40'
                                            : 'border-white/[0.06]'
                                        }`}
                                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${zoomStep !== 1 ? 'rgba(59,130,246,0.4)' : 'rgba(255,255,255,0.06)'}` }}
                                    min={MIN_ZOOM_STEP}
                                    max={MAX_ZOOM_STEP}
                                />
                                <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-black pointer-events-none ${zoomStep !== 1 ? 'text-blue-500' : 'text-slate-700'}`}>
                                    {zoomUnit === 'hours' ? 'h' : 'j'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ─── SCROLLABLE CANVAS ─── */}
            <div
                className="flex-1 overflow-auto relative"
                ref={containerRef}
                onWheel={handleWheel}
                style={{ height: '600px', cursor: isPanning ? 'grabbing' : 'grab' }}
                onMouseDown={handlePanMouseDown}
                onMouseUp={handlePanMouseUp}
                onMouseLeave={handlePanMouseUp}
                onMouseMove={handlePanMouseMove}
            >
                <div className="min-w-full inline-block align-middle relative">
                    {/* ─── Timeline header ─── */}
                    <div className="sticky top-0 z-20 flex h-11 shadow-xl"
                        style={{ background: 'rgba(4,8,16,0.98)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                    >
                        {/* Label column */}
                        <div className="sticky left-0 z-30 w-[280px] sm:w-[380px] min-w-[280px] flex items-center px-5 shadow-[4px_0_20px_rgba(0,0,0,0.5)]"
                            style={{ background: 'rgba(4,8,16,0.98)', borderRight: '1px solid rgba(255,255,255,0.04)' }}
                        >
                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.35em]">Tâche / Équipement</span>
                        </div>

                        {/* Tick marks */}
                        <div className="relative h-full" style={{ width: timelineWidth }}>
                            {ticks.map((tick, i) => {
                                const left = ((tick.getTime() - chartStart.getTime()) / totalDuration) * timelineWidth;
                                const isDayStart = tick.getHours() === 0;
                                const isUnitDay = zoomUnit === 'days';

                                return (
                                    <div key={i} className={`absolute bottom-0 pl-1.5 flex flex-col justify-end pb-1 ${isDayStart || isUnitDay ? 'border-l border-white/10' : 'border-l border-white/[0.04]'} h-full`} style={{ left }}>
                                        {(isDayStart || isUnitDay) && (
                                            <div className="text-[10px] font-black mb-0.5" style={{ color: '#10b981' }}>
                                                {tick.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                                            </div>
                                        )}
                                        {!isUnitDay && (
                                            <div className={`text-[9px] font-mono ${isDayStart ? 'text-slate-400' : 'text-slate-700'}`}>
                                                {tick.getHours()}h
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ─── Grid + rows ─── */}
                    <div className="relative">
                        {/* Tick grid lines */}
                        <div className="absolute inset-0 pointer-events-none z-0" style={{ left: '380px', width: timelineWidth }}>
                            {ticks.map((tick, i) => {
                                const left = ((tick.getTime() - chartStart.getTime()) / totalDuration) * timelineWidth;
                                const isDayStart = tick.getHours() === 0;
                                const isUnitDay = zoomUnit === 'days';
                                return (
                                    <div key={i}
                                        className={`absolute top-0 bottom-0 border-l ${isDayStart || isUnitDay ? 'border-white/[0.07]' : 'border-white/[0.025]'}`}
                                        style={{ left }}
                                    />
                                );
                            })}
                            {/* Now line */}
                            {(() => {
                                const now = new Date();
                                if (now >= chartStart && now <= chartEnd) {
                                    const nowLeft = ((now.getTime() - chartStart.getTime()) / totalDuration) * timelineWidth;
                                    return (
                                        <>
                                            <div className="absolute top-0 bottom-0 border-l-2 z-10" style={{ left: nowLeft, borderColor: 'rgba(239,68,68,0.5)' }} />
                                            <div className="absolute top-0 px-2 py-0.5 text-[8px] font-black text-white rounded-b-lg" style={{ left: nowLeft, transform: 'translateX(-50%)', background: '#ef4444' }}>LIVE</div>
                                        </>
                                    );
                                }
                                return null;
                            })()}
                        </div>

                        {/* Family rows */}
                        {customFamilyOrder.map((family, fIndex) => {
                            const isExpanded = expandedFamilies[family];
                            const familyTasks = getTasksForFamily(family);
                            // Cycle accent colors for family headers
                            const familyAccents = ['rgba(59,130,246,', 'rgba(34,197,94,', 'rgba(249,115,22,', 'rgba(168,85,247,', 'rgba(236,72,153,', 'rgba(20,184,166,', 'rgba(245,158,11,', 'rgba(99,102,241,'];
                            const accentBase = familyAccents[fIndex % familyAccents.length];

                            return (
                                <React.Fragment key={family}>
                                    {/* Family header row */}
                                    <div className="flex sticky left-0 z-10 group/header transition-all duration-150"
                                        style={{
                                            background: isExpanded
                                                ? `linear-gradient(90deg, ${accentBase}0.12) 0%, rgba(5,10,20,0.95) 100%)`
                                                : 'rgba(5,10,20,0.90)',
                                            borderBottom: `1px solid ${accentBase}0.12)`,
                                        }}
                                    >
                                        <div className="sticky left-0 w-[280px] sm:w-[380px] min-w-[280px] border-r px-3 py-2.5 flex items-center gap-2 shadow-[4px_0_20px_rgba(0,0,0,0.5)] z-10"
                                            style={{
                                                background: isExpanded
                                                    ? `linear-gradient(90deg, ${accentBase}0.1) 0%, rgba(4,8,16,0.97) 100%)`
                                                    : 'rgba(4,8,16,0.97)',
                                                borderColor: 'rgba(255,255,255,0.04)',
                                                borderLeft: isExpanded ? `2px solid ${accentBase}0.6)` : '2px solid transparent',
                                            }}
                                        >
                                            {/* Reorder arrows */}
                                            <div className="flex flex-col gap-0.5 opacity-0 group-hover/header:opacity-100 transition-opacity p-0.5 rounded-lg"
                                                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                                            >
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveFamily(fIndex, 'up'); }}
                                                    disabled={fIndex === 0}
                                                    className="p-0.5 rounded hover:scale-110 transition-transform disabled:opacity-0"
                                                    style={{ color: `${accentBase}1)` }}
                                                    title="Monter la famille"
                                                >
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); moveFamily(fIndex, 'down'); }}
                                                    disabled={fIndex === customFamilyOrder.length - 1}
                                                    className="p-0.5 rounded hover:scale-110 transition-transform disabled:opacity-0"
                                                    style={{ color: `${accentBase}1)` }}
                                                    title="Descendre la famille"
                                                >
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                                </button>
                                            </div>

                                            {/* Expand toggle + family name */}
                                            <div className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0" onClick={() => toggleFamily(family)}>
                                                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                                                    style={{
                                                        background: isExpanded ? `${accentBase}0.2)` : 'rgba(255,255,255,0.04)',
                                                        border: `1px solid ${isExpanded ? `${accentBase}0.4)` : 'rgba(255,255,255,0.06)'}`,
                                                        color: isExpanded ? `${accentBase}1)` : '#475569',
                                                    }}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
                                                        className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                                    >
                                                        <path d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                                <span className="text-[11px] font-black uppercase tracking-wider truncate transition-colors"
                                                    style={{ color: isExpanded ? 'rgba(226,232,240,1)' : '#64748b' }}
                                                >
                                                    {family}
                                                </span>
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0"
                                                    style={{
                                                        background: `${accentBase}0.12)`,
                                                        border: `1px solid ${accentBase}0.25)`,
                                                        color: `${accentBase}0.9)`,
                                                    }}
                                                >
                                                    {familyTasks.length}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex-grow" />
                                    </div>

                                    {/* Task rows */}
                                    {isExpanded && familyTasks.map((task, tIndex) => {
                                        const startX = ((task.startTime.getTime() - chartStart.getTime()) / totalDuration) * timelineWidth;
                                        const endX = ((task.endTime.getTime() - chartStart.getTime()) / totalDuration) * timelineWidth;
                                        const width = Math.max(3, endX - startX);
                                        const discipline = task.discipline || task.team.split(' ')[0] || task.team;
                                        const barColor = getDisciplineColor(discipline, disciplineColorMap);

                                        return (
                                            <div key={task.id} className="flex border-b group h-[46px] relative transition-colors duration-150"
                                                style={{ borderColor: 'rgba(255,255,255,0.025)' }}
                                                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)'}
                                                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                                            >
                                                {/* Task label panel */}
                                                <div className="sticky left-0 w-[280px] sm:w-[380px] min-w-[280px] px-3 py-2 flex items-center shadow-[4px_0_20px_rgba(0,0,0,0.5)] z-10 gap-2"
                                                    style={{ background: 'rgba(4,8,16,0.97)', borderRight: '1px solid rgba(255,255,255,0.03)' }}
                                                >
                                                    {/* Reorder arrows */}
                                                    <div className="flex flex-col gap-0.5 -ml-1 mr-0.5 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}
                                                    >
                                                        <button
                                                            onClick={() => moveTask(family, tIndex, 'up')}
                                                            disabled={tIndex === 0}
                                                            className="p-0.5 rounded hover:scale-110 transition-transform disabled:opacity-0 text-blue-500 hover:text-blue-400"
                                                            title="Monter la tâche"
                                                        >
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                                                        </button>
                                                        <button
                                                            onClick={() => moveTask(family, tIndex, 'down')}
                                                            disabled={tIndex === familyTasks.length - 1}
                                                            className="p-0.5 rounded hover:scale-110 transition-transform disabled:opacity-0 text-blue-500 hover:text-blue-400"
                                                            title="Descendre la tâche"
                                                        >
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                                        </button>
                                                    </div>

                                                    <div className="flex flex-col justify-center min-w-0 flex-1">
                                                        <div
                                                            className="text-[11px] font-bold text-slate-400 truncate cursor-pointer hover:text-white transition-colors leading-tight"
                                                            onClick={() => onTaskClick && onTaskClick(task)}
                                                            title={task.action}
                                                        >
                                                            {task.action}
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                            <span className="truncate max-w-[80px] sm:max-w-[120px] text-[9px] text-slate-600" title={task.equipment}>{task.equipment}</span>
                                                            <span className="w-0.5 h-0.5 rounded-full bg-slate-800" />
                                                            <span className="text-[9px] font-black truncate" style={{ color: barColor }}>{task.team}</span>
                                                            <span className="flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md text-slate-400"
                                                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)' }}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                                                                {task.manpower}
                                                            </span>
                                                            <span className="ml-auto font-mono text-[9px] font-black text-slate-700 tabular-nums">{task.duration.toFixed(1)}h</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Bar canvas */}
                                                <div className="relative h-full" style={{ width: timelineWidth }}>
                                                    <div
                                                        className="absolute top-1/2 -translate-y-1/2 rounded-lg cursor-pointer group/bar transition-all duration-150 hover:scale-y-[1.35]"
                                                        style={{
                                                            left: startX,
                                                            width: width,
                                                            height: '16px',
                                                            backgroundColor: barColor,
                                                            boxShadow: `0 0 10px ${barColor}50, 0 2px 6px rgba(0,0,0,0.5)`,
                                                        }}
                                                        onMouseEnter={(e) => handleMouseMove(e, task)}
                                                        onMouseMove={(e) => handleMouseMove(e, task)}
                                                        onMouseLeave={() => setHoveredTask(null)}
                                                        onClick={() => onTaskClick && onTaskClick(task)}
                                                    >
                                                        {/* Shine overlay */}
                                                        <div className="absolute inset-0 rounded-lg" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 60%)' }} />
                                                        {/* Hover glow */}
                                                        <div className="absolute inset-0 rounded-lg opacity-0 group-hover/bar:opacity-100 transition-opacity" style={{ background: 'rgba(255,255,255,0.15)' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ─── TOOLTIP ─── */}
            {hoveredTask && (
                <div
                    className="fixed z-50 pointer-events-none max-w-xs animate-in fade-in duration-100"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    <div className="rounded-2xl border shadow-2xl p-4"
                        style={{ background: 'rgba(4,8,18,0.98)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: `0 0 50px rgba(0,0,0,0.8), 0 0 20px ${getDisciplineColor(hoveredTask.discipline || hoveredTask.team.split(' ')[0] || hoveredTask.team, disciplineColorMap)}30` }}
                    >
                        {/* Color indicator */}
                        <div className="flex items-center gap-2.5 mb-3 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: getDisciplineColor(hoveredTask.discipline || hoveredTask.team.split(' ')[0] || hoveredTask.team, disciplineColorMap), boxShadow: `0 0 8px ${getDisciplineColor(hoveredTask.discipline || hoveredTask.team.split(' ')[0] || hoveredTask.team, disciplineColorMap)}` }}
                            />
                            <div className="text-[11px] font-black text-white leading-snug">{hoveredTask.action}</div>
                        </div>
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">{hoveredTask.equipment}</div>
                        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider">Équipe</span>
                            <span className="text-[10px] font-black" style={{ color: getDisciplineColor(hoveredTask.discipline || hoveredTask.team.split(' ')[0] || hoveredTask.team, disciplineColorMap) }}>{hoveredTask.team}</span>

                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider">Effectif</span>
                            <span className="text-[10px] font-black text-emerald-400">{hoveredTask.manpower} Personnes</span>

                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider">Début</span>
                            <span className="text-[10px] font-mono font-bold text-cyan-400">{hoveredTask.startTime.toLocaleString('fr-FR')}</span>

                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider">Fin</span>
                            <span className="text-[10px] font-mono font-bold text-blue-400">{hoveredTask.endTime.toLocaleString('fr-FR')}</span>

                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-wider">Durée</span>
                            <span className="text-[10px] font-black text-white font-mono">{hoveredTask.duration.toFixed(2)}h</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
