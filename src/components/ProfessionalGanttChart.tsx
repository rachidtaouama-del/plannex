// FIX: Removed concatenated file content from the end of the file.
import React, { useMemo, forwardRef, useRef, useEffect, useState } from 'react';
import type { CalculationResults, AppParameters, ScheduledTask, CustomCriticalPath } from '../../types';
import { generateSubTeamMap } from '../services/schedulingService';

interface ProfessionalGanttChartProps {
    results: CalculationResults;
    parameters: AppParameters;
    familyOrder: string[];
    setFamilyOrder: React.Dispatch<React.SetStateAction<string[]>>;
    customCriticalPaths: CustomCriticalPath[];
    isColdStopFlow: boolean;
    taskProgress?: Record<number, number>;
    timelineOptions: { unit: 'Heures' | 'Jours', interval: number };
    disciplineColors: Map<string, string>;
    showFlow: boolean; // Kept in props for HotExecutionReview, but will be false
    filter?: { start: Date, end: Date } | null;
    onTaskBlockSequenceChange?: (taskIds: string[], direction: 'up' | 'down') => void;
}

interface GanttItem {
    id: string;
    group: string; // This will be the Family name
    label: string; // This will be the Action
    equipment: string;
    start: Date;
    end: Date;
    durationHours: number;
    color: string;
    subTeamName?: string;
    sequenceOrder: number | null;
}

const formatTimeForLabel = (date: Date): string => {
    return date.toLocaleString('fr-FR', {
        hour: '2-digit', minute: '2-digit'
    });
};

export const ProfessionalGanttChart = forwardRef<HTMLDivElement, ProfessionalGanttChartProps>(({
    results, parameters, familyOrder, setFamilyOrder, customCriticalPaths, isColdStopFlow, taskProgress,
    timelineOptions, disciplineColors, showFlow, filter, onTaskBlockSequenceChange
}, ref) => {

    const [orderInputs, setOrderInputs] = useState<Record<string, string>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

    // FIX: Changed to a more robust implementation to prevent type inference issues.
    // This creates a Set of strings and converts it to an array, guaranteeing a `string[]` type.
    const allFamilies: string[] = useMemo(() => {
        const familiesSet = new Set<string>();
        results.scheduledTasks.forEach(t => {
            if (t.family) {
                familiesSet.add(t.family);
            }
        });
        return Array.from(familiesSet);
    }, [results.scheduledTasks]);

    useEffect(() => {
        // When tasks change, filter out any selected IDs that no longer exist in the new task list.
        // This preserves selection during re-ordering.
        const taskGroups = new Map<string, boolean>();
        results.scheduledTasks.forEach(task => {
            const key = task.multiDisciplineId || `single_${task.id}`;
            taskGroups.set(key, true);
        });
        const newTaskIds = new Set(taskGroups.keys());

        setSelectedTaskIds(prev => prev.filter(id => newTaskIds.has(id)));
    }, [results.scheduledTasks]);

    const nextAvailableNumber = useMemo(() => {
        const numbers = Object.values(orderInputs)
            .map(val => parseInt(val, 10))
            .filter(num => !isNaN(num));
        if (numbers.length === 0) return 1;
        return Math.max(...numbers) + 1;
    }, [orderInputs]);

    const handleOrderChange = (groupName: string, value: string) => {
        const newOrderInputs = { ...orderInputs, [groupName]: value.replace(/[^0-9]/g, '') };
        setOrderInputs(newOrderInputs);

        // FIX: Explicitly typed the sort callback parameters 'a' and 'b' to resolve 'unknown' type error.
        const newFamilyOrder = [...allFamilies].sort((a: string, b: string) => {
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
    };

    const handleResetOrder = () => {
        setOrderInputs({});
        // Revert to alphabetical order
        // FIX: Explicitly typed the sort callback parameters 'a' and 'b' to resolve 'unknown' type error.
        const alphabeticalOrder = [...allFamilies].sort((a: string, b: string) => a.localeCompare(b));
        setFamilyOrder(alphabeticalOrder);
    };

    const { ganttData, timeline } = useMemo(() => {
        const customCriticalPathItems: GanttItem[] = customCriticalPaths.map((path): GanttItem | null => {
            const start = new Date(path.start); const end = new Date(path.end);
            if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return null;
            return {
                id: `custom_critique_${path.id}`,
                group: 'CHEMINS CRITIQUES PERSONNALISÉS',
                label: path.name,
                equipment: 'Chemin Critique',
                start, end, color: path.color || '#ef4444',
                subTeamName: 'Chemin Critique',
                durationHours: (end.getTime() - start.getTime()) / 3600000,
                sequenceOrder: null,
            };
        }).filter((item): item is GanttItem => item !== null);

        let chronologyItems: GanttItem[] = [];
        if (isColdStopFlow) {
            const pinnedTasks = results.scheduledTasks.filter(t => t.isKeyEvent).map((task): GanttItem => ({
                id: `chrono_pinned_${task.id}`, group: 'CHRONOLOGIE MAÎTRESSE', label: task.action,
                equipment: task.equipment,
                start: task.startTime, end: task.endTime, color: '#f59e0b',
                subTeamName: task.team,
                durationHours: (task.endTime.getTime() - task.startTime.getTime()) / 3600000,
                sequenceOrder: task.sequenceOrder,
            }));
            chronologyItems = [...pinnedTasks].sort((a, b) => a.start.getTime() - b.start.getTime());
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

            const rawChronoItems: Omit<GanttItem, 'durationHours' | 'equipment' | 'sequenceOrder'>[] = [
                { id: 'chrono_consignation', group: 'CHRONOLOGIE MAÎTRESSE', label: 'CONSIGNATION', start: p_consignationStart, end: p_workStart, color: '#f59e0b' },
                { id: 'chrono_allumage', group: 'CHRONOLOGIE MAÎTRESSE', label: 'ALLUMAGE DE LA CHAMBRE À COMBUSTION', start: p_combustionStart, end: p_combustionEnd, color: '#facc15' },
                { id: 'chrono_deconsignation', group: 'CHRONOLOGIE MAÎTRESSE', label: 'DECONSIGNATION', start: p_deconsignationStart, end: p_deconsignationEnd, color: '#f59e0b' },
                { id: 'chrono_demarrage', group: 'CHRONOLOGIE MAÎTRESSE', label: 'DEMARRAGE DE LA BOUCLE', start: p_demarrageStart, end: p_demarrageEnd, color: '#22c55e' },
            ];

            chronologyItems = rawChronoItems
                .filter(item => !isNaN(item.start.getTime()) && !isNaN(item.end.getTime()) && item.start < item.end)
                .map((item, index) => ({ ...item, equipment: item.label, durationHours: (item.end.getTime() - item.start.getTime()) / 3600000, sequenceOrder: index }));
        }

        const taskIdToSubTeamMap = generateSubTeamMap(results, isColdStopFlow);

        const taskGroups = new Map<string, ScheduledTask[]>();
        results.scheduledTasks.forEach(task => {
            const key = task.multiDisciplineId || `single_${task.id}`;
            if (!taskGroups.has(key)) {
                taskGroups.set(key, []);
            }
            taskGroups.get(key)!.push(task);
        });

        const assetTasks: GanttItem[] = [];
        taskGroups.forEach((tasksInGroup, key) => {
            const mainTask = tasksInGroup[0];
            const discipline = (mainTask.team.split(' ')[0] || mainTask.team);

            const subTeamName = tasksInGroup.map(task => {
                const subTeam = taskIdToSubTeamMap.get(task.id) || { name: task.team, size: task.manpower };
                return subTeam.name;
            }).join(', ');

            assetTasks.push({
                id: key,
                group: mainTask.family,
                label: mainTask.action,
                equipment: mainTask.equipment,
                start: mainTask.startTime,
                end: mainTask.endTime,
                durationHours: (mainTask.endTime.getTime() - mainTask.startTime.getTime()) / (1000 * 60 * 60),
                color: disciplineColors.get(discipline) || '#64748b',
                subTeamName: subTeamName,
                sequenceOrder: mainTask.sequenceOrder,
            });
        });

        let allItems = [...customCriticalPathItems, ...chronologyItems, ...assetTasks];

        if (filter) {
            const filterStart = filter.start.getTime();
            const filterEnd = filter.end.getTime();
            allItems = allItems.filter(item => item.start.getTime() < filterEnd && item.end.getTime() > filterStart);
        }

        const groupedItems: Record<string, GanttItem[]> = {};
        allItems.forEach(item => {
            const groupKey = item.group.toUpperCase();
            if (!groupedItems[groupKey]) groupedItems[groupKey] = [];
            groupedItems[groupKey].push(item);
        });

        for (const groupName in groupedItems) {
            if (groupName !== 'CHEMINS CRITIQUES PERSONNALISÉS' && groupName !== 'CHRONOLOGIE MAÎTRESSE') {
                groupedItems[groupName].sort((a, b) => {
                    const orderA = a.sequenceOrder ?? Infinity;
                    const orderB = b.sequenceOrder ?? Infinity;
                    if (orderA !== orderB) {
                        return orderA - orderB;
                    }
                    return a.start.getTime() - b.start.getTime();
                });
            } else if (groupName === 'CHRONOLOGIE MAÎTRESSE') {
                groupedItems[groupName].sort((a, b) => a.start.getTime() - b.start.getTime());
            }
        }

        const familyOrderUpperCase = familyOrder.map(f => f.toUpperCase());
        const allGroupKeys = Object.keys(groupedItems);

        const sortedGroupNames = allGroupKeys.sort((a, b) => {
            const order = ['CHEMINS CRITIQUES PERSONNALISÉS', 'CHRONOLOGIE MAÎTRESSE'];
            const indexA = order.indexOf(a);
            const indexB = order.indexOf(b);

            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;

            const familyIndexA = familyOrderUpperCase.indexOf(a);
            const familyIndexB = familyOrderUpperCase.indexOf(b);

            if (familyIndexA !== -1 && familyIndexB !== -1) return familyIndexA - familyIndexB;
            if (familyIndexA !== -1) return -1;
            if (familyIndexB !== -1) return 1;

            return a.localeCompare(b);
        });

        let chartStart, chartEnd;
        if (filter) {
            chartStart = filter.start.getTime();
            chartEnd = filter.end.getTime();
        } else {
            const allDates = allItems.flatMap(item => [item.start.getTime(), item.end.getTime()]);
            chartStart = allDates.length > 0 ? Math.min(...allDates) : Date.now();
            chartEnd = allDates.length > 0 ? Math.max(...allDates) : Date.now() + 3600000;
            const padding = (chartEnd - chartStart) * 0.02 || 3600000;
            chartStart -= padding;
            chartEnd += padding;
        }

        const totalDuration = chartEnd - chartStart;

        const ticks: { date: Date, isMajor: boolean }[] = [];
        const tickStartDate = new Date(chartStart);
        tickStartDate.setSeconds(0, 0);

        if (timelineOptions.unit === 'Heures') {
            tickStartDate.setMinutes(0);
            while (tickStartDate.getTime() <= chartEnd) {
                ticks.push({ date: new Date(tickStartDate), isMajor: true });
                tickStartDate.setHours(tickStartDate.getHours() + timelineOptions.interval);
            }
        } else { // Jours
            tickStartDate.setHours(0, 0, 0, 0);
            while (tickStartDate.getTime() <= chartEnd) {
                ticks.push({ date: new Date(tickStartDate), isMajor: true });
                tickStartDate.setDate(tickStartDate.getDate() + timelineOptions.interval);
            }
        }

        return { ganttData: { sortedGroupNames, groupedItems }, timeline: { chartStart, chartEnd, totalDuration, ticks } };
    }, [results, parameters, familyOrder, customCriticalPaths, isColdStopFlow, timelineOptions, disciplineColors, showFlow, filter]);

    const { sortedGroupNames, groupedItems } = ganttData;
    const { chartStart, chartEnd, totalDuration, ticks } = timeline;

    const { canMoveUp, canMoveDown, selectedFamily } = useMemo(() => {
        if (selectedTaskIds.length === 0 || !groupedItems) return { canMoveUp: false, canMoveDown: false, selectedFamily: null };
        const firstSelectedId = selectedTaskIds[0];
        let familyName: string | null = null;
        let familyTasks: GanttItem[] | null = null;
        for (const groupKey in groupedItems) {
            if (groupedItems[groupKey].some(item => item.id === firstSelectedId)) {
                familyName = groupKey; familyTasks = groupedItems[groupKey]; break;
            }
        }
        if (!familyName || !familyTasks) return { canMoveUp: false, canMoveDown: false, selectedFamily: null };
        const allInSameFamily = selectedTaskIds.every(id => familyTasks!.some(item => item.id === id));
        if (!allInSameFamily) return { canMoveUp: false, canMoveDown: false, selectedFamily: null };
        const indices = selectedTaskIds.map(id => familyTasks!.findIndex(item => item.id === id));
        const minIndex = Math.min(...indices); const maxIndex = Math.max(...indices);
        return { canMoveUp: minIndex > 0, canMoveDown: maxIndex < familyTasks.length - 1, selectedFamily: familyName };
    }, [selectedTaskIds, groupedItems]);

    const handleBlockMove = (direction: 'up' | 'down') => {
        if (!onTaskBlockSequenceChange) return;
        if (selectedFamily && groupedItems[selectedFamily]) {
            const familyTasks = groupedItems[selectedFamily];
            const sortedSelectedIds = [...selectedTaskIds].sort((a, b) =>
                familyTasks.findIndex(t => t.id === a) - familyTasks.findIndex(t => t.id === b)
            );
            onTaskBlockSequenceChange(sortedSelectedIds, direction);
        }
    };

    const handleCheckboxChange = (taskId: string, taskFamily: string) => {
        const specialGroups = ['CHEMINS CRITIQUES PERSONNALISÉS', 'CHRONOLOGIE MAÎTRESSE'];
        if (specialGroups.includes(taskFamily)) return;

        setSelectedTaskIds(prev => {
            const currentSelectedFamily = selectedFamily;
            if (prev.length > 0 && taskFamily !== currentSelectedFamily) return [taskId]; // Reset selection for new family
            return prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId];
        });
    };

    const LEFT_COL_WIDTH = 400;
    const ROW_HEIGHT = 36;

    let lastDisplayedDate: string | null = null;

    return (
        <div ref={ref} className="bg-white font-sans rounded text-xs min-w-[1200px] text-slate-800 relative">
            <div className="sticky top-0 z-20 bg-white py-2 grid h-32" style={{ gridTemplateColumns: `${LEFT_COL_WIDTH}px 1fr` }}>
                <div className="border-b-2 border-slate-300 px-2 pb-2 flex flex-col justify-end">
                    <div className="mb-2">
                        <label htmlFor="family-search" className="sr-only">Rechercher une famille</label>
                        <div className="relative">
                            <input
                                id="family-search"
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Rechercher une famille..."
                                className="w-full bg-slate-100 border border-slate-300 rounded-md pl-8 pr-2 py-1.5 text-sm text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                            <div className="text-xs text-emerald-600 font-bold">
                                Prochain numéro disponible : {nextAvailableNumber}
                            </div>
                            <div className="flex items-center gap-2">
                                {onTaskBlockSequenceChange && (
                                    <div className="flex items-center gap-1 border-l border-slate-300 pl-2">
                                        <button onClick={() => handleBlockMove('up')} disabled={!canMoveUp} className="p-1 rounded text-slate-600 disabled:text-slate-300 hover:bg-slate-200 disabled:cursor-not-allowed">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                                        </button>
                                        <button onClick={() => handleBlockMove('down')} disabled={!canMoveDown} className="p-1 rounded text-slate-600 disabled:text-slate-300 hover:bg-slate-200 disabled:cursor-not-allowed">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                )}
                                <button
                                    onClick={handleResetOrder}
                                    title="Réinitialiser l'ordre par défaut"
                                    className="text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded border border-red-200 transition-colors"
                                >
                                    Réinitialiser
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="font-bold text-slate-600">Actif / Tâche</div>
                </div>
                <div className="relative border-b-2 border-slate-300 h-full">
                    {ticks.map((tick, index) => {
                        const left = ((tick.date.getTime() - chartStart) / totalDuration) * 100;
                        if (left < -0.1 || left > 100.1) return null;
                        const currentDateStr = tick.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
                        const showDate = timelineOptions.unit === 'Heures' && lastDisplayedDate !== currentDateStr;
                        if (showDate) lastDisplayedDate = currentDateStr;
                        return (
                            <div key={index} className="absolute bottom-0 h-1/2 border-l border-slate-300/50" style={{ left: `${left}%` }}>
                                <span className="absolute bottom-1 left-1 text-xs text-slate-800 font-bold whitespace-nowrap transform -translate-x-1/2">
                                    {showDate && <div className="text-slate-500 text-[10px] mb-1">{currentDateStr}</div>}
                                    {timelineOptions.unit === 'Heures' ? tick.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : tick.date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="relative">
                <div className="absolute top-0 bottom-0 right-0 z-0" style={{ left: `${LEFT_COL_WIDTH}px` }}>
                    {ticks.map((tick, index) => {
                        const left = ((tick.date.getTime() - chartStart) / totalDuration) * 100;
                        if (left < -0.1 || left > 100.1) return null;
                        return <div key={index} className="absolute top-0 h-full border-l border-slate-200" style={{ left: `${left}%` }}></div>
                    })}
                </div>

                <div className="relative z-10">
                    {sortedGroupNames
                        .filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((groupName) => {
                            const specialGroups = ['CHEMINS CRITIQUES PERSONNALISÉS', 'CHRONOLOGIE MAÎTRESSE'];
                            const isFamilyGroup = !specialGroups.includes(groupName);

                            return (
                                <div key={groupName} className="border-b border-slate-200 last:border-b-0">
                                    <div className="grid bg-slate-100 sticky top-0 z-10" style={{ gridTemplateColumns: `${LEFT_COL_WIDTH}px 1fr`, height: '28px' }}>
                                        <div className="p-2 border-r border-slate-200 flex items-center">
                                            {isFamilyGroup && (
                                                <input
                                                    type="text"
                                                    pattern="[0-9]*"
                                                    value={orderInputs[groupName] || ''}
                                                    onChange={(e) => handleOrderChange(groupName, e.target.value)}
                                                    className="w-12 text-center bg-slate-200 border border-slate-300 rounded-md px-1 py-0.5 mr-3 text-sm font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                                    placeholder="#"
                                                    onClick={e => e.stopPropagation()}
                                                />
                                            )}
                                            <h3 className="font-bold text-sm text-slate-700 uppercase truncate" title={groupName}>{groupName}</h3>
                                        </div>
                                        <div></div>
                                    </div>
                                    {groupedItems[groupName]?.map((item) => {
                                        const clampedStart = Math.max(item.start.getTime(), chartStart); const clampedEnd = Math.min(item.end.getTime(), chartEnd);
                                        const left = ((clampedStart - chartStart) / totalDuration) * 100;
                                        const width = Math.max(0.1, ((clampedEnd - clampedStart) / totalDuration) * 100);
                                        const taskIdMatch = item.id.match(/^task_(\d+)$/);
                                        const taskId = taskIdMatch ? parseInt(taskIdMatch[1], 10) : null;
                                        const progress = (taskId !== null && taskProgress) ? taskProgress[taskId] : undefined;

                                        let labelText;
                                        if (item.group === 'CHEMINS CRITIQUES PERSONNALISÉS' || item.group === 'CHRONOLOGIE MAÎTRESSE') {
                                            labelText = `${formatTimeForLabel(item.start)}-${formatTimeForLabel(item.end)} (${item.durationHours.toFixed(1)}h)`;
                                        } else {
                                            labelText = `[${item.subTeamName}] ${formatTimeForLabel(item.start)}-${formatTimeForLabel(item.end)} (${item.durationHours.toFixed(1)}h)`;
                                        }

                                        const textWidthApproximation = labelText.length * 4.5;
                                        const barPixelWidth = (width / 100) * (ref && typeof ref !== 'function' && ref.current ? ref.current.clientWidth - LEFT_COL_WIDTH : 800);
                                        const isLabelInside = textWidthApproximation < barPixelWidth - 10;

                                        return (
                                            <div key={item.id} id={`gantt-item-${item.id}`} className={`grid hover:bg-slate-50 ${selectedTaskIds.includes(item.id) ? 'bg-blue-100' : ''}`} style={{ gridTemplateColumns: `${LEFT_COL_WIDTH}px 1fr`, minHeight: `${ROW_HEIGHT}px` }}>
                                                <div className="px-2 border-r border-slate-200 flex items-center py-2">
                                                    {onTaskBlockSequenceChange && isFamilyGroup && (
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTaskIds.includes(item.id)}
                                                            onChange={() => handleCheckboxChange(item.id, groupName)}
                                                            className="w-4 h-4 text-emerald-600 bg-slate-100 border-slate-400 rounded focus:ring-emerald-500 mr-3 flex-shrink-0"
                                                            onClick={e => e.stopPropagation()}
                                                        />
                                                    )}
                                                    <div className="leading-snug flex-grow overflow-hidden">
                                                        <div className="font-bold text-slate-800 truncate" title={item.equipment}>{item.equipment}</div>
                                                        <div className="text-slate-600 text-[11px] truncate" title={item.label}>{item.label}</div>
                                                    </div>
                                                </div>
                                                <div className="relative">
                                                    <div
                                                        className="absolute h-5 rounded top-1/2 -translate-y-1/2 z-0"
                                                        // FIX: The 'taskProgress' prop is an object, not a function. The parentheses have been removed to correctly check for its existence.
                                                        style={{ left: `${left}%`, width: `${width}%`, backgroundColor: item.color, opacity: taskProgress ? 0.3 : 1 }}
                                                    >
                                                        {isLabelInside && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white text-[10px] font-bold whitespace-nowrap">{labelText}</span>}
                                                    </div>
                                                    {progress !== undefined && (
                                                        <div className="h-5 absolute top-1/2 -translate-y-1/2 rounded z-10" style={{ left: `${left}%`, width: `${width * (progress / 100)}%`, backgroundColor: item.color }}></div>
                                                    )}
                                                    {!isLabelInside &&
                                                        <span className="absolute top-1/2 -translate-y-1/2 text-slate-500 text-[10px] whitespace-nowrap" style={{ left: `calc(${left}% + ${width}% + 8px)` }} aria-hidden="true">
                                                            {labelText}
                                                        </span>
                                                    }
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        })}
                </div>
            </div>
        </div>
    );
});