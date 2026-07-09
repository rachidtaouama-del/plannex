
import React, { useMemo, forwardRef, useRef, useEffect, useState, useImperativeHandle, useCallback } from 'react';
import type { CalculationResults, AppParameters, ScheduledTask, CustomCriticalPath } from '../types';
import { generateSubTeamMap } from '../services/schedulingService';

interface ProfessionalGanttChartProps {
    results: CalculationResults;
    parameters: AppParameters;
    familyOrder: string[];
    setFamilyOrder: React.Dispatch<React.SetStateAction<string[]>>;
    customCriticalPaths: CustomCriticalPath[];
    isColdStopFlow: boolean;
    taskProgress?: Record<number, number>;
    timelineOptions: { unit: 'Heures' | 'Jours' | 'Semaines' | 'Mois' | 'Années', interval: number };
    disciplineColors: Map<string, string>;
    showFlow: boolean;
    showChronology?: boolean;
    filter?: { start: Date, end: Date } | null;
    onTaskBlockSequenceChange?: (taskIds: string[], direction: 'up' | 'down') => void;
    isHoverDetailsEnabled?: boolean;
    headerColor?: string;
    headerFontColor?: string;
    chronologyColor?: string;
    criticalPathsTitle?: string;
    onTaskClick?: (task: ScheduledTask) => void;
    theme?: 'light' | 'dark';
    searchTerm?: string;
    orderInputs?: Record<string, string>;
    setOrderInputs?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    selectedTaskIds?: string[];
    setSelectedTaskIds?: React.Dispatch<React.SetStateAction<string[]>>;
    onCapabilitiesChange?: (caps: { canMoveUp: boolean, canMoveDown: boolean, nextAvailableNumber: number }) => void;
    containerHeight?: number; // viewport height in px for virtualization
}

export interface GanttHandle {
    handleResetOrder: () => void;
    handleBlockMove: (direction: 'up' | 'down') => void;
}

interface GanttItem {
    id: string;
    group: string;
    label: string;
    equipment: string;
    start: Date;
    end: Date;
    durationHours: number;
    color: string;
    subTeamName?: string;
    manpower: number;
    sequenceOrder: number | null;
    originalTaskIds: number[];
}

// Virtual row types
interface VirtualRow {
    type: 'header' | 'task';
    groupName: string;
    item?: GanttItem;
    groupStart?: Date;
    groupEnd?: Date;
    groupCount?: number;
    rowIndex: number;
}

const formatTimeForLabel = (date: Date): string => {
    return date.toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    }).replace(',', '');
};

const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
};

const HEADER_HEIGHT = 36;
const ROW_HEIGHT = 44;
const OVERSCAN = 6;

export const ProfessionalGanttChart = forwardRef<GanttHandle, ProfessionalGanttChartProps>((props, ref) => {
    const {
        results, parameters, familyOrder, setFamilyOrder, customCriticalPaths, isColdStopFlow, taskProgress,
        timelineOptions, disciplineColors, showFlow, showChronology = true, filter, onTaskBlockSequenceChange,
        isHoverDetailsEnabled = false,
        headerColor = '#0f172a', headerFontColor = '#ffffff', chronologyColor = '#f59e0b',
        criticalPathsTitle = 'CHEMINS CRITIQUES PERSONNALISÉS',
        onTaskClick,
        theme = 'dark',
        searchTerm = '',
        orderInputs = {},
        setOrderInputs,
        selectedTaskIds = [],
        setSelectedTaskIds,
        onCapabilitiesChange,
        containerHeight = 600,
    } = props;

    const isDark = theme === 'dark';

    // ── Tooltip state ────────────────────────────────────────────────────────
    const [hoveredTask, setHoveredTask] = useState<GanttItem | null>(null);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const tooltipRef = useRef<HTMLDivElement>(null);

    // ── Virtual scroll state ─────────────────────────────────────────────────
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const rafRef = useRef<number>(0);

    const handleScroll = useCallback(() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
                setScrollTop(scrollContainerRef.current.scrollTop);
            }
        });
    }, []);

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        el.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            el.removeEventListener('scroll', handleScroll);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [handleScroll]);

    // ── Family ordering ──────────────────────────────────────────────────────
    const allFamilies: string[] = useMemo(() => {
        const familiesSet = new Set<string>();
        results.scheduledTasks.forEach(t => { if (t.family) familiesSet.add(t.family); });
        return Array.from(familiesSet);
    }, [results.scheduledTasks]);

    useEffect(() => {
        if (!setSelectedTaskIds) return;
        const taskGroups = new Map<string, boolean>();
        results.scheduledTasks.forEach(task => {
            const key = task.multiDisciplineId || `single_${task.id}`;
            taskGroups.set(key, true);
        });
        const newTaskIds = new Set(taskGroups.keys());
        setSelectedTaskIds(prev => prev.filter(id => newTaskIds.has(id)));
    }, [results.scheduledTasks, setSelectedTaskIds]);

    const nextAvailableNumber = useMemo(() => {
        const numbers = Object.values(orderInputs).map(val => parseInt(val, 10)).filter(num => !isNaN(num));
        if (numbers.length === 0) return 1;
        return Math.max(...numbers) + 1;
    }, [orderInputs]);

    const handleOrderChange = useCallback((groupName: string, value: string) => {
        if (!setOrderInputs) return;
        const newOrderInputs = { ...orderInputs, [groupName]: value.replace(/[^0-9]/g, '') };
        setOrderInputs(newOrderInputs);
        const newFamilyOrder = [...allFamilies].sort((a, b) => {
            const numA = newOrderInputs[a.toUpperCase()] ? parseInt(newOrderInputs[a.toUpperCase()], 10) : Infinity;
            const numB = newOrderInputs[b.toUpperCase()] ? parseInt(newOrderInputs[b.toUpperCase()], 10) : Infinity;
            if (numA !== Infinity && numB !== Infinity) {
                if (numA === numB) return a.localeCompare(b);
                return numA - numB;
            }
            if (numA !== Infinity) return -1;
            if (numB !== Infinity) return 1;
            return a.localeCompare(b);
        });
        setFamilyOrder(newFamilyOrder);
    }, [setOrderInputs, orderInputs, allFamilies, setFamilyOrder]);

    const handleResetOrder = useCallback(() => {
        if (!setOrderInputs) return;
        setOrderInputs({});
        setFamilyOrder([...allFamilies].sort((a, b) => a.localeCompare(b)));
    }, [setOrderInputs, allFamilies, setFamilyOrder]);

    // ── Main data computation ────────────────────────────────────────────────
    const { ganttData, timeline } = useMemo(() => {
        const customCriticalPathItems: GanttItem[] = customCriticalPaths.map((path): GanttItem | null => {
            const start = new Date(path.start); const end = new Date(path.end);
            if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return null;
            return {
                id: `custom_critique_${path.id}`, group: 'CHEMINS CRITIQUES PERSONNALISÉS',
                label: path.name, equipment: 'Chemin Critique', start, end, color: path.color || '#ef4444',
                subTeamName: 'Chemin Critique', durationHours: (end.getTime() - start.getTime()) / 3600000,
                manpower: 0, sequenceOrder: null, originalTaskIds: [],
            };
        }).filter((item): item is GanttItem => item !== null);

        let chronologyItems: GanttItem[] = [];
        if (showChronology) {
            if (isColdStopFlow) {
                chronologyItems = results.scheduledTasks.filter(t => t.isKeyEvent).map((task): GanttItem => ({
                    id: `chrono_pinned_${task.id}`, group: 'CHRONOLOGIE MAÎTRESSE', label: task.action,
                    equipment: task.equipment, start: task.startTime, end: task.endTime, color: chronologyColor,
                    subTeamName: task.team, durationHours: (task.endTime.getTime() - task.startTime.getTime()) / 3600000,
                    manpower: task.manpower || 0, sequenceOrder: task.sequenceOrder, originalTaskIds: [task.id],
                })).sort((a, b) => a.start.getTime() - b.start.getTime());
            } else {
                const { shutdownStart, shutdownEnd, consignation, deconsignation, combustion, demarrage } = parameters;
                const p_shutdownEnd = new Date(shutdownEnd);
                const p_demarrageEnd = p_shutdownEnd;
                const p_demarrageStart = new Date(p_demarrageEnd.getTime() - demarrage * 60 * 1000);
                let p_deconsignationStart, p_deconsignationEnd, p_combustionStart, p_combustionEnd;
                if (combustion.mode === 'after_deconsignation') {
                    const p_allumageEnd = p_demarrageStart; p_combustionEnd = p_allumageEnd;
                    p_combustionStart = new Date(p_allumageEnd.getTime() - combustion.value * 60 * 1000);
                    p_deconsignationEnd = p_combustionStart;
                    p_deconsignationStart = new Date(p_deconsignationEnd.getTime() - deconsignation * 60 * 1000);
                } else {
                    p_deconsignationEnd = p_demarrageStart;
                    p_deconsignationStart = new Date(p_deconsignationEnd.getTime() - deconsignation * 60 * 1000);
                    p_combustionEnd = p_demarrageStart;
                    p_combustionStart = new Date(p_combustionEnd.getTime() - combustion.value * 60 * 1000);
                }
                const p_consignationStart = new Date(shutdownStart);
                const p_workStart = new Date(p_consignationStart.getTime() + consignation * 60 * 1000);
                const rawItems = [
                    { id: 'chrono_consignation', label: 'CONSIGNATION', start: p_consignationStart, end: p_workStart, color: chronologyColor },
                    { id: 'chrono_allumage', label: 'ALLUMAGE COMBUSTION', start: p_combustionStart, end: p_combustionEnd, color: '#facc15' },
                    { id: 'chrono_deconsignation', label: 'DECONSIGNATION', start: p_deconsignationStart, end: p_deconsignationEnd, color: chronologyColor },
                    { id: 'chrono_demarrage', label: 'DEMARRAGE BOUCLE', start: p_demarrageStart, end: p_demarrageEnd, color: '#22c55e' },
                ];
                chronologyItems = rawItems.filter(item => !isNaN(item.start.getTime()) && !isNaN(item.end.getTime()) && item.start < item.end)
                    .map((item, index) => ({
                        ...item, group: 'CHRONOLOGIE MAÎTRESSE', equipment: item.label, manpower: 0,
                        subTeamName: undefined, durationHours: (item.end.getTime() - item.start.getTime()) / 3600000,
                        sequenceOrder: index, originalTaskIds: [],
                    }));
            }
        }

        const taskIdToSubTeamMap = generateSubTeamMap(results, isColdStopFlow);
        const taskGroups = new Map<string, ScheduledTask[]>();
        results.scheduledTasks.forEach(task => {
            const tk = task as any;
            const familyKey = (task.family || tk.FAMILLE || 'Autres').toUpperCase();
            const groupKey = task.multiDisciplineId || `single_${task.id}`;
            const uniqueKey = `${familyKey}_${groupKey}`;
            if (!taskGroups.has(uniqueKey)) taskGroups.set(uniqueKey, []);
            taskGroups.get(uniqueKey)!.push(task);
        });

        const assetTasks: GanttItem[] = [];
        taskGroups.forEach((tasksInGroup) => {
            const mainTask = tasksInGroup[0];
            const mt = mainTask as any;
            const discipline = mainTask.discipline || mt.DISCIPLINE;
            const subTeamName = tasksInGroup.map(task => {
                const subTeam = taskIdToSubTeamMap.get(task.id);
                return subTeam ? subTeam.name : (task.team || (task as any)["TYPE D'EQUIPE"] || 'Équipe');
            }).join(' + ');
            const times = tasksInGroup.map(t => {
                const ta = t as any;
                const s = t.startTime || ta["START DATE"]; const e = t.endTime || ta["END DATE"];
                return { s: s ? new Date(s).getTime() : 0, e: e ? new Date(e).getTime() : 0 };
            }).filter(t => t.s > 0 && t.e > 0);
            if (times.length === 0) return;
            const groupStart = new Date(Math.min(...times.map(t => t.s)));
            const groupEnd = new Date(Math.max(...times.map(t => t.e)));
            const familyKey = (mainTask.family || mt.FAMILLE || 'Autres').toUpperCase();
            const groupKey = mainTask.multiDisciplineId || `single_${mainTask.id}`;
            assetTasks.push({
                id: `${familyKey}_${groupKey}`,
                group: mainTask.family || mt.FAMILLE || 'Autres',
                label: mainTask.action || mt["GLOBAL TASKS"] || 'Tâche sans nom',
                equipment: mainTask.equipment || mt["Nom Equipement"] || 'Équipement',
                start: groupStart, end: groupEnd,
                durationHours: (groupEnd.getTime() - groupStart.getTime()) / 3600000,
                color: disciplineColors.get(discipline || '') || '#64748b',
                subTeamName, manpower: tasksInGroup.reduce((sum, t) => sum + (t.manpower || (t as any).EFFECTIF || 0), 0),
                sequenceOrder: mainTask.sequenceOrder, originalTaskIds: tasksInGroup.map(t => t.id),
            });
        });

        let allItems = [...customCriticalPathItems, ...chronologyItems, ...assetTasks];
        if (filter) {
            const fStart = filter.start.getTime(), fEnd = filter.end.getTime();
            allItems = allItems.filter(item => item.start.getTime() < fEnd && item.end.getTime() > fStart);
        }

        const groupedItems: Record<string, GanttItem[]> = {};
        allItems.forEach(item => {
            const groupKey = item.group.toUpperCase();
            if (!groupedItems[groupKey]) groupedItems[groupKey] = [];
            groupedItems[groupKey].push(item);
        });

        for (const groupName in groupedItems) {
            if (groupName !== 'CHEMINS CRITIQUES PERSONNALISÉS' && groupName !== 'CHRONOLOGIE MAÎTRESSE') {
                groupedItems[groupName].sort((a, b) => (a.sequenceOrder ?? Infinity) - (b.sequenceOrder ?? Infinity) || a.start.getTime() - b.start.getTime());
            } else if (groupName === 'CHRONOLOGIE MAÎTRESSE') {
                groupedItems[groupName].sort((a, b) => a.start.getTime() - b.start.getTime());
            }
        }

        const familyOrderUpperCase = familyOrder.map(f => f.toUpperCase());
        const sortedGroupNames = Object.keys(groupedItems)
            .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => {
                const order = ['CHEMINS CRITIQUES PERSONNALISÉS', 'CHRONOLOGIE MAÎTRESSE'];
                const indexA = order.indexOf(a), indexB = order.indexOf(b);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                if (indexA !== -1) return -1; if (indexB !== -1) return 1;
                const fA = familyOrderUpperCase.indexOf(a), fB = familyOrderUpperCase.indexOf(b);
                if (fA !== -1 && fB !== -1) return fA - fB;
                if (fA !== -1) return -1; if (fB !== -1) return 1;
                return a.localeCompare(b);
            });

        let chartStart: number, chartEnd: number;
        if (filter) {
            chartStart = filter.start.getTime(); chartEnd = filter.end.getTime();
        } else {
            let minTs = Infinity, maxTs = -Infinity;
            allItems.forEach(item => {
                if (item.start.getTime() < minTs) minTs = item.start.getTime();
                if (item.end.getTime() > maxTs) maxTs = item.end.getTime();
            });
            chartStart = minTs !== Infinity ? minTs : Date.now();
            chartEnd = maxTs !== -Infinity ? maxTs : Date.now() + 3600000;
            const padding = (chartEnd - chartStart) * 0.02 || 3600000;
            chartStart -= padding; chartEnd += padding;
        }

        const totalDuration = chartEnd - chartStart;
        const ticks: { date: Date, isMajor: boolean }[] = [];
        const tickStartDate = new Date(chartStart);
        tickStartDate.setSeconds(0, 0);
        let safety = 0;
        const MAX_TICKS = 500;
        if (timelineOptions.unit === 'Heures') {
            tickStartDate.setMinutes(0);
            const effectiveInterval = Math.max(timelineOptions.interval, Math.ceil((totalDuration / 3600000) / MAX_TICKS));
            const hoursToAdd = effectiveInterval - (tickStartDate.getHours() % effectiveInterval);
            if (hoursToAdd !== effectiveInterval) tickStartDate.setHours(tickStartDate.getHours() + hoursToAdd);
            while (tickStartDate.getTime() <= chartEnd && safety < MAX_TICKS * 2) {
                ticks.push({ date: new Date(tickStartDate), isMajor: true });
                tickStartDate.setHours(tickStartDate.getHours() + effectiveInterval);
                safety++;
            }
        } else if (timelineOptions.unit === 'Semaines') {
            tickStartDate.setHours(0, 0, 0, 0);
            // Align to Monday
            const day = tickStartDate.getDay();
            const diff = day === 0 ? -6 : 1 - day;
            tickStartDate.setDate(tickStartDate.getDate() + diff);
            const weekInterval = Math.max(timelineOptions.interval, Math.ceil((totalDuration / (7 * 86400000)) / MAX_TICKS));
            while (tickStartDate.getTime() <= chartEnd && safety < MAX_TICKS * 2) {
                ticks.push({ date: new Date(tickStartDate), isMajor: true });
                tickStartDate.setDate(tickStartDate.getDate() + weekInterval * 7);
                safety++;
            }
        } else if (timelineOptions.unit === 'Mois') {
            tickStartDate.setDate(1);
            tickStartDate.setHours(0, 0, 0, 0);
            const monthInterval = Math.max(timelineOptions.interval, 1);
            while (tickStartDate.getTime() <= chartEnd && safety < MAX_TICKS * 2) {
                ticks.push({ date: new Date(tickStartDate), isMajor: true });
                tickStartDate.setMonth(tickStartDate.getMonth() + monthInterval);
                safety++;
            }
        } else if (timelineOptions.unit === 'Années') {
            tickStartDate.setMonth(0, 1);
            tickStartDate.setHours(0, 0, 0, 0);
            const yearInterval = Math.max(timelineOptions.interval, 1);
            while (tickStartDate.getTime() <= chartEnd && safety < MAX_TICKS * 2) {
                ticks.push({ date: new Date(tickStartDate), isMajor: true });
                tickStartDate.setFullYear(tickStartDate.getFullYear() + yearInterval);
                safety++;
            }
        } else {
            tickStartDate.setHours(0, 0, 0, 0);
            const effectiveInterval = Math.max(timelineOptions.interval, Math.ceil((totalDuration / 86400000) / MAX_TICKS));
            while (tickStartDate.getTime() <= chartEnd && safety < MAX_TICKS * 2) {
                ticks.push({ date: new Date(tickStartDate), isMajor: true });
                tickStartDate.setDate(tickStartDate.getDate() + effectiveInterval);
                safety++;
            }
        }
        return { ganttData: { sortedGroupNames, groupedItems }, timeline: { chartStart, chartEnd, totalDuration, ticks } };
    }, [results, parameters, familyOrder, customCriticalPaths, isColdStopFlow, timelineOptions, disciplineColors, filter, showChronology, chronologyColor, searchTerm]);

    const { sortedGroupNames, groupedItems } = ganttData;
    const { chartStart, totalDuration, ticks } = timeline;

    // ── Build flat virtual row list ──────────────────────────────────────────
    const virtualRows: VirtualRow[] = useMemo(() => {
        const rows: VirtualRow[] = [];
        let rowIndex = 0;
        sortedGroupNames.forEach(groupName => {
            const items = groupedItems[groupName] || [];
            const groupStart = items.length > 0 ? new Date(Math.min(...items.map(i => i.start.getTime()))) : undefined;
            const groupEnd = items.length > 0 ? new Date(Math.max(...items.map(i => i.end.getTime()))) : undefined;
            rows.push({ type: 'header', groupName, groupStart, groupEnd, groupCount: items.length, rowIndex });
            rowIndex++;
            items.forEach(item => {
                rows.push({ type: 'task', groupName, item, rowIndex });
                rowIndex++;
            });
        });
        return rows;
    }, [sortedGroupNames, groupedItems]);

    const totalHeight = useMemo(() =>
        virtualRows.reduce((sum, row) => sum + (row.type === 'header' ? HEADER_HEIGHT : ROW_HEIGHT), 0),
        [virtualRows]);

    // Row offset lookup: cumulative top position for each row
    const rowOffsets: number[] = useMemo(() => {
        const offsets: number[] = [];
        let cur = 0;
        virtualRows.forEach(row => {
            offsets.push(cur);
            cur += row.type === 'header' ? HEADER_HEIGHT : ROW_HEIGHT;
        });
        return offsets;
    }, [virtualRows]);

    // Compute which rows are visible
    const { visibleRows, offsetY } = useMemo(() => {
        // Timeline header + chart body: scrollTop is within the scrollable chart body
        const viewStart = scrollTop;
        const viewEnd = scrollTop + containerHeight;

        let firstVisible = 0;
        let lastVisible = virtualRows.length - 1;

        for (let i = 0; i < rowOffsets.length; i++) {
            if (rowOffsets[i] + (virtualRows[i].type === 'header' ? HEADER_HEIGHT : ROW_HEIGHT) > viewStart) {
                firstVisible = Math.max(0, i - OVERSCAN);
                break;
            }
        }
        for (let i = firstVisible; i < rowOffsets.length; i++) {
            if (rowOffsets[i] > viewEnd + OVERSCAN * ROW_HEIGHT) {
                lastVisible = i;
                break;
            }
        }

        return {
            visibleRows: virtualRows.slice(firstVisible, lastVisible + 1),
            offsetY: rowOffsets[firstVisible] || 0,
        };
    }, [scrollTop, containerHeight, virtualRows, rowOffsets]);

    // ── Move/capabilities ────────────────────────────────────────────────────
    const { canMoveUp, canMoveDown, selectedFamily } = useMemo(() => {
        if (selectedTaskIds.length === 0 || !groupedItems) return { canMoveUp: false, canMoveDown: false, selectedFamily: null };
        const firstSelectedId = selectedTaskIds[0];
        let fName: string | null = null, fTasks: GanttItem[] | null = null;
        for (const k in groupedItems) {
            if (groupedItems[k].some(i => i.id === firstSelectedId)) { fName = k; fTasks = groupedItems[k]; break; }
        }
        if (!fName || !fTasks || !selectedTaskIds.every(id => fTasks!.some(i => i.id === id))) return { canMoveUp: false, canMoveDown: false, selectedFamily: null };
        const indices = selectedTaskIds.map(id => fTasks!.findIndex(i => i.id === id));
        return { canMoveUp: Math.min(...indices) > 0, canMoveDown: Math.max(...indices) < fTasks.length - 1, selectedFamily: fName };
    }, [selectedTaskIds, groupedItems]);

    useEffect(() => {
        if (onCapabilitiesChange) onCapabilitiesChange({ canMoveUp, canMoveDown, nextAvailableNumber });
    }, [canMoveUp, canMoveDown, nextAvailableNumber, onCapabilitiesChange]);

    const handleBlockMove = useCallback((direction: 'up' | 'down') => {
        if (!onTaskBlockSequenceChange || !selectedFamily || !groupedItems[selectedFamily]) return;
        const sortedIds = [...selectedTaskIds].sort((a, b) =>
            groupedItems[selectedFamily].findIndex(t => t.id === a) - groupedItems[selectedFamily].findIndex(t => t.id === b));
        onTaskBlockSequenceChange(sortedIds, direction);
    }, [onTaskBlockSequenceChange, selectedFamily, groupedItems, selectedTaskIds]);

    useImperativeHandle(ref, () => ({ handleResetOrder, handleBlockMove }));

    const handleCheckboxChange = useCallback((taskId: string, taskFamily: string) => {
        if (['CHEMINS CRITIQUES PERSONNALISÉS', 'CHRONOLOGIE MAÎTRESSE'].includes(taskFamily)) return;
        setSelectedTaskIds!(prev => (prev.length > 0 && taskFamily !== selectedFamily)
            ? [taskId]
            : (prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]));
    }, [setSelectedTaskIds, selectedFamily]);

    const handleBarMouseEnter = useCallback((item: GanttItem, e: React.MouseEvent) => {
        if (!isHoverDetailsEnabled) return;
        setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 });
        setHoveredTask(item);
    }, [isHoverDetailsEnabled]);

    const handleBarMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isHoverDetailsEnabled || !hoveredTask) return;
        setTooltipPos({ x: e.clientX + 15, y: e.clientY + 15 });
    }, [isHoverDetailsEnabled, hoveredTask]);

    const handleBarMouseLeave = useCallback(() => setHoveredTask(null), []);

    const LEFT_COL = 380;
    let lastDisplayedDate: string | null = null;

    // ── Render a single row ──────────────────────────────────────────────────
    const renderRow = useCallback((row: VirtualRow, key: string) => {
        const specialGroups = ['CHEMINS CRITIQUES PERSONNALISÉS', 'CHRONOLOGIE MAÎTRESSE'];
        const isFamily = !specialGroups.includes(row.groupName);

        if (row.type === 'header') {
            return (
                <div
                    key={key}
                    className="flex border-b border-t"
                    style={{
                        height: HEADER_HEIGHT,
                        backgroundColor: headerColor,
                        color: headerFontColor,
                        borderColor: 'rgba(255,255,255,0.06)',
                    }}
                >
                    <div className="flex items-center px-4 relative flex-shrink-0" style={{ width: LEFT_COL, backgroundColor: headerColor }}>
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" style={{ boxShadow: '0 0 12px rgba(99,102,241,0.6)' }}></div>
                        {isFamily && (
                            <input
                                type="text"
                                value={orderInputs[row.groupName] || ''}
                                onChange={(e) => handleOrderChange(row.groupName, e.target.value)}
                                className="w-9 text-center bg-white/10 border border-white/20 rounded mr-3 text-[9px] font-black focus:ring-1 focus:ring-white/30 outline-none"
                                placeholder="#"
                                style={{ color: headerFontColor }}
                            />
                        )}
                        <h3 className="font-black text-[10px] uppercase tracking-widest truncate flex items-center gap-2 flex-1">
                            {row.groupName === 'CHEMINS CRITIQUES PERSONNALISÉS' ? criticalPathsTitle : row.groupName}
                            <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[8px] font-bold opacity-60 normal-case">{row.groupCount}</span>
                        </h3>
                    </div>
                    <div style={{ backgroundColor: headerColor }} className="opacity-30 flex items-center justify-end px-6 flex-1 text-[8px] font-bold tracking-widest uppercase">
                        {row.groupStart && row.groupEnd && `${formatTimeForLabel(row.groupStart)} — ${formatTimeForLabel(row.groupEnd)}`}
                    </div>
                </div>
            );
        }

        const item = row.item!;
        const cStart = Math.max(item.start.getTime(), timeline.chartStart);
        const cEnd = Math.min(item.end.getTime(), timeline.chartEnd);
        const leftPercent = ((cStart - timeline.chartStart) / totalDuration) * 100;
        const widthPercent = Math.max(0.15, ((cEnd - cStart) / totalDuration) * 100);
        const isSelected = selectedTaskIds.includes(item.id);
        const progress = (item.originalTaskIds.length > 0 && taskProgress) ? taskProgress[item.originalTaskIds[0]] : undefined;
        const rgb = hexToRgb(item.color);
        const itemGlow = `0 2px 10px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`;

        return (
            <div
                key={key}
                className={`flex group/row border-b ${isDark ? 'border-white/[0.04]' : 'border-slate-100'} ${isSelected ? (isDark ? 'bg-indigo-500/10' : 'bg-indigo-50') : (isDark ? 'hover:bg-white/[0.025]' : 'hover:bg-slate-50')}`}
                style={{ height: ROW_HEIGHT }}
            >
                <div className="px-4 flex items-center py-2 border-r border-white/5 relative flex-shrink-0" style={{ width: LEFT_COL }}>
                    {onTaskBlockSequenceChange && isFamily && (
                        <input type="checkbox" checked={isSelected} onChange={() => handleCheckboxChange(item.id, row.groupName)}
                            className="w-3.5 h-3.5 rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500 mr-3 flex-shrink-0" />
                    )}
                    {isSelected && <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-indigo-500 ring-2 ring-indigo-500/20"></div>}
                    <div className="flex-1 overflow-hidden flex flex-col justify-center gap-0.5">
                        <div className={`font-bold text-[11px] leading-tight truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`} title={item.label}>
                            {item.label}
                        </div>
                        <div className={`text-[9px] font-medium tracking-wide uppercase truncate ${isDark ? 'text-slate-500' : 'text-slate-500'} flex items-center gap-1.5`}>
                            <span className="truncate">{item.equipment}</span>
                            {item.manpower > 0 && (
                                <span className="flex-shrink-0 flex items-center gap-1 bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-500/20 font-black text-[7.5px]">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                    {item.manpower}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 relative">
                    {progress === undefined ? (
                        <div
                            className="absolute top-1/2 -translate-y-1/2 h-7 rounded-md z-10 cursor-pointer overflow-hidden group/bar"
                            style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, backgroundColor: item.color, boxShadow: itemGlow }}
                            onMouseEnter={(e) => handleBarMouseEnter(item, e)}
                            onMouseMove={handleBarMouseMove}
                            onMouseLeave={handleBarMouseLeave}
                            onClick={() => {
                                if (onTaskClick && item.originalTaskIds.length > 0) {
                                    const t = results.scheduledTasks.find(tx => tx.id === item.originalTaskIds[0]);
                                    if (t) onTaskClick(t);
                                }
                            }}
                        >
                            <div className="absolute inset-x-0 top-0 h-2/5 bg-white/25 blur-[0.5px]"></div>
                            <div className="absolute inset-0 bg-black/0 group-hover/bar:bg-white/15 transition-colors"></div>
                        </div>
                    ) : (
                        <div
                            className="absolute top-1/2 -translate-y-1/2 h-7 rounded-md z-10 cursor-pointer overflow-hidden flex group/bar"
                            style={{ left: `${leftPercent}%`, width: `${widthPercent}%`, boxShadow: progress > 0 ? '0 0 12px rgba(16,185,129,0.25)' : 'none' }}
                            onMouseEnter={(e) => handleBarMouseEnter(item, e)}
                            onMouseMove={handleBarMouseMove}
                            onMouseLeave={handleBarMouseLeave}
                            onClick={() => {
                                if (onTaskClick && item.originalTaskIds.length > 0) {
                                    const t = results.scheduledTasks.find(tx => tx.id === item.originalTaskIds[0]);
                                    if (t) onTaskClick(t);
                                }
                            }}
                        >
                            <div className="h-full bg-emerald-500 relative transition-all duration-500 flex items-center justify-center overflow-hidden" style={{ width: `${progress}%` }}>
                                <div className="absolute inset-x-0 top-0 h-2/5 bg-white/25"></div>
                                {progress > 0 && progress < 100 && (
                                    <span className="relative z-10 text-[9px] font-black text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] px-1">{progress.toFixed(0)}%</span>
                                )}
                            </div>
                            <div className="h-full bg-red-500/40 relative transition-all duration-500" style={{ width: `${100 - progress}%` }}>
                                <div className="absolute inset-x-0 top-0 h-2/5 bg-white/10"></div>
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover/bar:bg-white/10 transition-colors z-20 rounded-md"></div>
                        </div>
                    )}

                    {widthPercent > 8 && (
                        <span
                            className="absolute top-1/2 -translate-y-1/2 font-black text-[8.5px] text-white whitespace-nowrap pointer-events-none select-none"
                            style={{ left: `calc(${leftPercent}% + 8px)`, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                        >
                            {formatTimeForLabel(item.start)} — {formatTimeForLabel(item.end)}
                            <span className="opacity-50 ml-1">({item.durationHours.toFixed(1)}h)</span>
                        </span>
                    )}
                </div>
            </div>
        );
    }, [headerColor, headerFontColor, isDark, LEFT_COL, orderInputs, handleOrderChange, criticalPathsTitle,
        selectedTaskIds, taskProgress, timeline, totalDuration, handleBarMouseEnter, handleBarMouseMove,
        handleBarMouseLeave, onTaskClick, results.scheduledTasks, handleCheckboxChange,
        onTaskBlockSequenceChange, selectedFamily]);

    return (
        <div className={`font-sans text-xs overflow-hidden relative ${isDark ? 'bg-[#0a0f1e] text-slate-200' : 'bg-white text-slate-800'}`}>
            {/* Tooltip */}
            {hoveredTask && isHoverDetailsEnabled && (
                <div
                    ref={tooltipRef}
                    className="fixed z-[200] bg-slate-900/98 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-2xl p-4 text-xs pointer-events-none w-72 text-slate-200 ring-1 ring-white/10"
                    style={{ left: tooltipPos.x, top: tooltipPos.y }}
                >
                    <div className="font-black text-white text-[13px] mb-3 tracking-tight flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: hoveredTask.color }}></div>
                        <span className="truncate">{hoveredTask.label}</span>
                    </div>
                    <div className="space-y-2 pt-2.5 border-t border-white/5">
                        <div className="flex justify-between items-center"><span className="text-slate-500 font-bold uppercase text-[8px]">Équipe</span><span className="font-black text-indigo-400 text-[10px]">{hoveredTask.subTeamName}</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-500 font-bold uppercase text-[8px]">Effectif</span><span className="px-2 py-0.5 bg-blue-500/10 rounded font-black text-blue-400">{hoveredTask.manpower} PERS.</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-500 font-bold uppercase text-[8px]">Début</span><span className="font-mono text-slate-300 text-[10px]">{formatTimeForLabel(hoveredTask.start)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-500 font-bold uppercase text-[8px]">Fin</span><span className="font-mono text-slate-300 text-[10px]">{formatTimeForLabel(hoveredTask.end)}</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-500 font-bold uppercase text-[8px]">Durée</span><span className="py-0.5 px-2 bg-indigo-500/10 rounded font-black text-indigo-400">{hoveredTask.durationHours.toFixed(2)} H</span></div>
                    </div>
                </div>
            )}

            {/* Sticky Timeline Header */}
            <div className={`sticky top-0 z-40 flex border-b ${isDark ? 'bg-[#0a0f1e]/98 border-white/5' : 'bg-white border-slate-200'}`} style={{ height: 48 }}>
                <div
                    className="px-4 flex items-center border-r border-white/5 font-black text-[9px] text-slate-500 uppercase tracking-[0.25em] flex-shrink-0"
                    style={{ width: LEFT_COL }}
                >
                    Interventions
                </div>
                <div className="relative flex-1 overflow-hidden">
                    {ticks.map((tick, index) => {
                        const left = ((tick.date.getTime() - chartStart) / totalDuration) * 100;
                        if (left < 0 || left > 100) return null;
                        const currD = tick.date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
                        const showD = timelineOptions.unit === 'Heures' && lastDisplayedDate !== currD;
                        if (showD) lastDisplayedDate = currD;
                        const tickLabel = timelineOptions.unit === 'Heures'
                            ? tick.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                            : timelineOptions.unit === 'Semaines'
                                ? `S${Math.ceil((tick.date.getDate()) / 7)} ${tick.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`
                                : timelineOptions.unit === 'Mois'
                                    ? tick.date.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
                                    : timelineOptions.unit === 'Années'
                                        ? tick.date.getFullYear().toString()
                                        : tick.date.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' });
                        return (
                            <div key={index} className={`absolute bottom-0 h-full border-l ${isDark ? 'border-white/5' : 'border-slate-200'} flex flex-col justify-end pb-1.5 pl-2`} style={{ left: `${left}%` }}>
                                {showD && <div className="text-indigo-400 font-black text-[8px] uppercase tracking-tight mb-0.5 select-none">{currD}</div>}
                                <div className={`text-[9.5px] font-mono font-bold leading-none ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                    {tickLabel}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Scrollable Chart Body — virtual scroll container */}
            <div
                ref={scrollContainerRef}
                className="overflow-y-auto overflow-x-hidden relative"
                style={{ height: containerHeight }}
            >
                {/* Background grid */}
                <div className="absolute top-0 bottom-0 right-0 z-0 pointer-events-none" style={{ left: LEFT_COL }}>
                    {ticks.map((tick, index) => {
                        const left = ((tick.date.getTime() - chartStart) / totalDuration) * 100;
                        if (left < 0 || left > 100) return null;
                        return <div key={index} className={`absolute top-0 h-full border-l ${isDark ? 'border-white/[0.025]' : 'border-slate-100'}`} style={{ left: `${left}%` }}></div>;
                    })}
                </div>

                {/* Virtual spacer + visible rows */}
                <div className="relative z-10" style={{ height: totalHeight }}>
                    <div style={{ transform: `translateY(${offsetY}px)` }}>
                        {visibleRows.map((row, i) => renderRow(row, `${row.groupName}-${row.type}-${row.item?.id ?? row.rowIndex}-${i}`))}
                    </div>
                </div>
            </div>

            {/* Floating selection capsule */}
            {selectedTaskIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-1 p-1.5 bg-[#0a0f1e]/95 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_25px_50px_rgba(0,0,0,0.6)]">
                    <div className="flex items-center gap-2 px-5 py-2 border-r border-white/5 mr-1">
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)] animate-pulse"></div>
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">{selectedTaskIds.length} tâches</span>
                    </div>
                    <button onClick={() => handleBlockMove('up')} disabled={!canMoveUp}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-white hover:bg-indigo-600 active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-white/5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button onClick={() => handleBlockMove('down')} disabled={!canMoveDown}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-white hover:bg-indigo-600 active:scale-90 disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-white/5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <div className="w-px h-5 bg-white/5 mx-1"></div>
                    <button onClick={handleResetOrder}
                        className="px-5 h-10 flex items-center justify-center rounded-full bg-slate-800 text-[9px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all border border-white/5">
                        Réinitialiser
                    </button>
                </div>
            )}
        </div>
    );
});

ProfessionalGanttChart.displayName = 'ProfessionalGanttChart';
