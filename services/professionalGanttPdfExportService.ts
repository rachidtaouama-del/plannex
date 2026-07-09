import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CalculationResults, AppParameters, ScheduledTask, CustomCriticalPath } from '../types';
import { generateSubTeamMap } from './schedulingService';

interface GanttItem {
    id: string;
    group: string; // Family name
    label: string;
    equipment: string;
    team: string; // For legend mapping
    start: Date;
    end: Date;
    startTimeFormatted: string;
    endTimeFormatted: string;
    durationHours: number;
    color: string;
    subTeamName?: string;
    subTeamSize?: number;
    manpower: number;
    originalTaskIds: number[];
}

interface DisplayOptions {
    timelineUnit: 'Heures' | 'Jours' | 'Semaines' | 'Mois' | 'Ann\u00e9es';
    timelineInterval: number;
    disciplineColors: Map<string, string>;
    showFlow: boolean;
    showChronology: boolean;
    showFamilyDetails: boolean;
    chronologyColor: string;
    headerFontColor: string;
    criticalPathsTitle?: string;
}

// Compact Date Format: 17/12/23 10:15
const formatCompactDate = (date: Date): string => {
    return date.toLocaleString('fr-FR', {
        year: '2-digit',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).replace(' à', '').replace(',', '');
};

const formatTime = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// FIX: Add missing formatDateShort function definition.
const formatDateShort = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
};

const formatDateTimeShort = (date: Date): string => {
    return date.toLocaleString('fr-FR', { year: '2-digit', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' à', '').replace(',', '');
};

// Prepare data structure for the renderer
const getGanttData = (results: CalculationResults, parameters: AppParameters, familyOrder: string[], customCriticalPaths: CustomCriticalPath[], isColdStopFlow: boolean, displayOptions: DisplayOptions, filter?: { start: Date, end: Date } | null) => {

    // 1. Custom Critical Paths
    const customPathItems: GanttItem[] = customCriticalPaths.map((path): GanttItem | null => {
        const start = new Date(path.start); const end = new Date(path.end);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return null;
        return {
            id: `custom_critique_${path.id}`,
            group: "CHEMINS CRITIQUES PERSONNALISÉS",
            label: path.name,
            equipment: "Chemin Critique",
            team: "Chemin Critique",
            start, end,
            color: path.color || '#dc2626',
            subTeamName: 'Chemin Critique', subTeamSize: 0, manpower: 0,
            startTimeFormatted: formatCompactDate(start), endTimeFormatted: formatCompactDate(end),
            durationHours: (end.getTime() - start.getTime()) / 3600000,
            originalTaskIds: [],
        };
    }).filter((item): item is GanttItem => item !== null);

    // 2. Master Chronology
    let chronologyItems: GanttItem[] = [];
    if (displayOptions.showChronology) {
        if (isColdStopFlow) {
            const pinnedTasks = results.scheduledTasks
                .filter(t => t.isKeyEvent)
                .map((task): GanttItem => ({
                    id: `chrono_pinned_${task.id}`, group: 'CHRONOLOGIE MAÎTRESSE', label: task.action,
                    equipment: task.equipment,
                    team: 'Jalon',
                    start: task.startTime, end: task.endTime, color: displayOptions.chronologyColor || '#f59e0b',
                    subTeamName: task.team, subTeamSize: task.manpower, manpower: task.manpower,
                    startTimeFormatted: formatCompactDate(task.startTime), endTimeFormatted: formatCompactDate(task.endTime),
                    durationHours: (task.endTime.getTime() - task.startTime.getTime()) / 3600000,
                    originalTaskIds: [task.id]
                }));
            chronologyItems = [...pinnedTasks].sort((a, b) => a.start.getTime() - b.start.getTime());
        } else {
            const { shutdownStart, shutdownEnd, consignation, deconsignation, combustion, demarrage } = parameters;
            const p_consignationStart = new Date(shutdownStart);
            const p_workStart = new Date(p_consignationStart.getTime() + consignation * 60 * 1000);

            // Re-calculate other dates as they are not passed in
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

            chronologyItems = [
                { id: 'chrono_consignation', group: 'CHRONOLOGIE MAÎTRESSE', label: 'Consignation', equipment: 'Système', team: 'Exploitation', start: p_consignationStart, end: p_workStart, color: displayOptions.chronologyColor || '#f59e0b', subTeamName: 'Consignation', subTeamSize: 0, manpower: 0, startTimeFormatted: formatCompactDate(p_consignationStart), endTimeFormatted: formatCompactDate(p_workStart), durationHours: (p_workStart.getTime() - p_consignationStart.getTime()) / 3600000, originalTaskIds: [-1] },
                { id: 'chrono_allumage', group: 'CHRONOLOGIE MAÎTRESSE', label: 'ALLUMAGE DE LA CHAMBRE À COMBUSTION', equipment: 'Système', team: 'Exploitation', start: p_combustionStart, end: p_combustionEnd, color: '#facc15', subTeamName: 'Combustion', subTeamSize: 0, manpower: 0, startTimeFormatted: formatCompactDate(p_combustionStart), endTimeFormatted: formatCompactDate(p_combustionEnd), durationHours: (p_combustionEnd.getTime() - p_combustionStart.getTime()) / 3600000, originalTaskIds: [-2] },
                { id: 'chrono_deconsignation', group: 'CHRONOLOGIE MAÎTRESSE', label: 'DECONSIGNATION', equipment: 'Système', team: 'Exploitation', start: p_deconsignationStart, end: p_deconsignationEnd, color: displayOptions.chronologyColor || '#f59e0b', subTeamName: 'Déconsignation', subTeamSize: 0, manpower: 0, startTimeFormatted: formatCompactDate(p_deconsignationStart), endTimeFormatted: formatCompactDate(p_deconsignationEnd), durationHours: (p_deconsignationEnd.getTime() - p_deconsignationStart.getTime()) / 3600000, originalTaskIds: [-3] },
                { id: 'chrono_demarrage', group: 'CHRONOLOGIE MAÎTRESSE', label: 'DEMARRAGE DE LA BOUCLE', equipment: 'Système', team: 'Exploitation', start: p_demarrageStart, end: p_demarrageEnd, color: '#22c55e', subTeamName: 'Démarrage', subTeamSize: 0, manpower: 0, startTimeFormatted: formatCompactDate(p_demarrageStart), endTimeFormatted: formatCompactDate(p_demarrageEnd), durationHours: (p_demarrageEnd.getTime() - p_demarrageStart.getTime()) / 3600000, originalTaskIds: [-4] }
            ].filter(item => !isNaN(item.start.getTime()) && !isNaN(item.end.getTime()) && item.start < item.end);
        }
    }

    // 3. Asset Tasks (The meat of the schedule)
    const taskIdToSubTeamMap = generateSubTeamMap(results, isColdStopFlow);
    const taskGroups = new Map<string, ScheduledTask[]>();

    let relevantTasks = results.scheduledTasks;
    if (filter) {
        const filterStart = filter.start.getTime();
        const filterEnd = filter.end.getTime();
        relevantTasks = relevantTasks.filter(task =>
            task.startTime.getTime() < filterEnd && task.endTime.getTime() > filterStart
        );
    }

    relevantTasks.forEach(task => {
        if ((task as any).multiDisciplineId) {
            const key = `multi_${(task as any).multiDisciplineId}`;
            if (!taskGroups.has(key)) taskGroups.set(key, []);
            taskGroups.get(key)!.push(task);
            return;
        }

        const compositeKey = `${task.action.trim()}|${task.equipment.trim()}|${task.startTime.getTime()}|${task.endTime.getTime()}`;
        if (!taskGroups.has(compositeKey)) taskGroups.set(compositeKey, []);
        taskGroups.get(compositeKey)!.push(task);
    });

    const assetTasks: GanttItem[] = [];
    taskGroups.forEach((tasksInGroup, key) => {
        const uniqueDisciplines = new Set(tasksInGroup.map(t => t.discipline));
        const isMultiDiscipline = uniqueDisciplines.size > 1 || key.startsWith('multi_');

        if (isMultiDiscipline) {
            const mainTask = tasksInGroup[0];
            const combinedManpower = tasksInGroup.reduce((sum, t) => sum + (t.manpower || 0), 0);
            const groupStart = new Date(Math.min(...tasksInGroup.map(t => t.startTime.getTime())));
            const groupEnd = new Date(Math.max(...tasksInGroup.map(t => t.endTime.getTime())));

            const subTeamName = [...new Set(tasksInGroup.map(task => taskIdToSubTeamMap.get(task.id)?.name || task.team))].join(', ');

            assetTasks.push({
                id: key,
                group: mainTask.family,
                label: mainTask.action,
                equipment: mainTask.equipment,
                team: 'MULTI-DISCIPLINE', 
                start: groupStart,
                end: groupEnd,
                startTimeFormatted: formatCompactDate(groupStart),
                endTimeFormatted: formatCompactDate(groupEnd),
                durationHours: (groupEnd.getTime() - groupStart.getTime()) / (1000 * 60 * 60),
                color: '#64748b', // Neutral slate for multi-discipline
                subTeamName: subTeamName,
                subTeamSize: 0,
                manpower: combinedManpower,
                originalTaskIds: tasksInGroup.map(t => t.id)
            });
        } else {
            // Single discipline tasks remain independent rows
            tasksInGroup.forEach((task, idx) => {
                const subTeamName = taskIdToSubTeamMap.get(task.id)?.name || task.team;
                assetTasks.push({
                    id: `${key}_${idx}`,
                    group: task.family,
                    label: task.action,
                    equipment: task.equipment,
                    team: task.discipline,
                    start: task.startTime,
                    end: task.endTime,
                    startTimeFormatted: formatCompactDate(task.startTime),
                    endTimeFormatted: formatCompactDate(task.endTime),
                    durationHours: (task.endTime.getTime() - task.startTime.getTime()) / (1000 * 60 * 60),
                    color: displayOptions.disciplineColors.get(task.discipline) || '#64748b',
                    subTeamName: subTeamName,
                    subTeamSize: 0,
                    manpower: task.manpower || 0,
                    originalTaskIds: [task.id]
                });
            });
        }
    });

    const allItems = [...customPathItems, ...chronologyItems, ...assetTasks];

    // Group items by Family
    const groupedItems: Record<string, GanttItem[]> = {};
    allItems.forEach(item => {
        const groupKey = item.group || "AUTRES";
        if (!groupedItems[groupKey]) groupedItems[groupKey] = [];
        groupedItems[groupKey].push(item);
    });

    // Sort items within groups
    Object.values(groupedItems).forEach(group => {
        if (group[0]?.group !== "CHEMINS CRITIQUES PERSONNALISÉS") {
            group.sort((a, b) => a.start.getTime() - b.start.getTime());
        }
    });

    const familyOrderUpperCase = familyOrder.map(f => f.toUpperCase());
    const allGroupKeys = Object.keys(groupedItems);

    const sortedGroupNames = allGroupKeys.sort((a, b) => {
        const order = ["CHEMINS CRITIQUES PERSONNALISÉS", 'CHRONOLOGIE MAÎTRESSE'];
        const indexA = order.indexOf(a.toUpperCase());
        const indexB = order.indexOf(b.toUpperCase());
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;

        const familyIndexA = familyOrderUpperCase.indexOf(a.toUpperCase());
        const familyIndexB = familyOrderUpperCase.indexOf(b.toUpperCase());

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
        const allDates = allItems.flatMap(item => [item.start.getTime(), item.end.getTime()]).filter(t => !isNaN(t));
        chartStart = allDates.length > 0 ? Math.min(...allDates) : Date.now();
        chartEnd = allDates.length > 0 ? Math.max(...allDates) : Date.now();
        const padding = (chartEnd - chartStart) * 0.02 || 3600000;
        chartStart -= padding;
        chartEnd += padding;
    }

    return { sortedGroupNames, groupedItems, chartStart, chartEnd };
};

export const exportProfessionalGanttToPDF = async (
    results: CalculationResults,
    parameters: AppParameters,
    familyOrder: string[],
    title: string,
    customCriticalPaths: CustomCriticalPath[],
    isColdStopFlow: boolean,
    displayOptions: DisplayOptions,
    filter?: { start: Date, end: Date } | null,
    headerColor: string = '#1e293b'
): Promise<jsPDF> => {

    const { sortedGroupNames, groupedItems, chartStart, chartEnd } = getGanttData(results, parameters, familyOrder, customCriticalPaths, isColdStopFlow, displayOptions, filter);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 10;
    const footerHeight = 15;
    const headerHeight = 20;
    const textColumnWidth = 110;
    const durationColumnWidth = 20;
    const leftPaneWidth = textColumnWidth + durationColumnWidth;
    const chartX = margin + leftPaneWidth;
    const chartWidth = pageWidth - margin - chartX;

    const baseRowHeight = 12; // Minimum height
    const barHeight = 5;
    const familyHeaderHeight = 8;
    const totalDurationMs = chartEnd - chartStart;

    let currentY = margin;
    let pageNumber = 1;
    let isDetailedHeader = true;

    const hexToRgb = (hex: string): [number, number, number] => {
        const bigint = parseInt(hex.replace('#', ''), 16);
        return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
    };

    const drawTitle = () => {
        if (!isDetailedHeader) {
            // Compact Header for continuing pages - removed title text as per user request
            doc.setFillColor(241, 245, 249);
            doc.rect(margin, margin, pageWidth - 2 * margin, 8, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(`PLANNING CONTINUATION`, margin + 5, margin + 5.5);
            currentY = margin + 10;
            return;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42);
        doc.text(title.toUpperCase(), pageWidth / 2, margin + 8, { align: 'center' });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        const periodText = filter
            ? `Période : ${formatCompactDate(filter.start)} au ${formatCompactDate(filter.end)}`
            : `Période du Projet : ${formatCompactDate(new Date(parameters.shutdownStart))} au ${formatCompactDate(new Date(parameters.shutdownEnd))}`;
        doc.text(periodText, pageWidth / 2, margin + 14, { align: 'center' });

        currentY = margin + headerHeight + 5;
        isDetailedHeader = false;
    };

    const drawTimelineHeader = (y: number) => {
        const intervalHours = displayOptions.timelineUnit === 'Jours' ? 24 : Math.max(1, displayOptions.timelineInterval);
        const tickStartDate = new Date(chartStart);
        tickStartDate.setSeconds(0, 0);
        if (displayOptions.timelineUnit === 'Heures') tickStartDate.setMinutes(0);
        else tickStartDate.setHours(0, 0, 0, 0);

        doc.setFillColor(241, 245, 249);
        doc.rect(margin, y, pageWidth - 2 * margin, 10, 'F');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text("TÂCHE / ÉQUIPEMENT", margin + 2, y + 6);
        doc.text("DURÉE/PERS", margin + leftPaneWidth - 2, y + 6, { align: 'right' });

        doc.setDrawColor(203, 213, 225);
        doc.line(chartX, y, chartX, pageHeight - footerHeight);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');

        while (tickStartDate.getTime() <= chartEnd) {
            const x = chartX + ((tickStartDate.getTime() - chartStart) / totalDurationMs) * chartWidth;

            if (x >= chartX && x <= pageWidth - margin) {
                let label = "";
                if (displayOptions.timelineUnit === 'Jours' || tickStartDate.getHours() === 0) {
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(15, 23, 42);
                    label = formatDateShort(tickStartDate);
                    doc.setDrawColor(203, 213, 225);
                    (doc as any).setLineDash([], 0);
                } else {
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(100, 116, 139);
                    label = formatTime(tickStartDate);
                    doc.setDrawColor(226, 232, 240);
                    (doc as any).setLineDash([1, 1], 0);
                }

                doc.setTextColor(51, 65, 85);
                doc.text(label, x, y + 6, { align: 'center' });
                doc.line(x, y + 10, x, pageHeight - footerHeight);
            }

            if (displayOptions.timelineUnit === 'Jours') tickStartDate.setDate(tickStartDate.getDate() + 1);
            else tickStartDate.setHours(tickStartDate.getHours() + intervalHours);
        }
        (doc as any).setLineDash([], 0);

        return y + 10;
    };

    const drawFamilyHeader = (y: number, name: string, items: GanttItem[]) => {
        const [r, g, b] = hexToRgb(headerColor);
        doc.setFillColor(r, g, b);
        doc.rect(margin, y, pageWidth - 2 * margin, familyHeaderHeight, 'F');

        const [fr, fg, fb] = hexToRgb(displayOptions.headerFontColor);
        doc.setTextColor(fr, fg, fb);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');

        if (displayOptions.showFamilyDetails) {
            const displayName = name.toUpperCase() === 'CHEMINS CRITIQUES PERSONNALISÉS' && displayOptions.criticalPathsTitle
                ? displayOptions.criticalPathsTitle.toUpperCase()
                : name.toUpperCase();
            const leftText = `${displayName}  (${items.length} tâches)`;
            doc.text(leftText, margin + 4, y + 5.5);

            const minFamilyTime = Math.min(...items.map(t => t.start.getTime()));
            const maxFamilyTime = Math.max(...items.map(t => t.end.getTime()));
            const familyStartStr = formatDateTimeShort(new Date(minFamilyTime));
            const familyEndStr = formatDateTimeShort(new Date(maxFamilyTime));
            const rightText = `Début : ${familyStartStr} | Fin : ${familyEndStr}`;

            doc.setFontSize(8);
            doc.text(rightText, pageWidth - margin - 4, y + 5.5, { align: 'right' });

        } else {
            doc.text(name.toUpperCase(), margin + 4, y + 5.5);
        }
    };

    const drawFooter = (pageNum: number) => {
        // Bottom-most text
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
        doc.text("Created by PlanneX", margin, pageHeight - 5);

        // Legend
        doc.setFontSize(7);
        const allDisciplines = Array.from(displayOptions.disciplineColors.keys());
        const legendRightBoundary = pageWidth - margin;
        let legendX = margin;
        let legendY = pageHeight - 15; // Start legend higher up

        allDisciplines.forEach(disc => {
            if (!disc) return;
            const textWidth = doc.getTextWidth(disc);
            const itemWidth = 3 + textWidth + 7;

            if (legendX + itemWidth > legendRightBoundary) {
                legendX = margin;
                legendY += 5;
            }

            if (legendY > pageHeight - 8) return; // Stop before overlapping bottom text

            const colorHex = displayOptions.disciplineColors.get(disc)!;
            const colorRgb = hexToRgb(colorHex);
            doc.setFillColor(colorRgb[0], colorRgb[1], colorRgb[2]);
            doc.circle(legendX + 1.5, legendY - 0.5, 1.5, 'F');
            doc.setTextColor(71, 85, 105);
            doc.text(disc, legendX + 4, legendY);
            legendX += itemWidth;
        });
        // FIX: Cannot find name 'disciplines'. Did you mean 'allDisciplines'?
        if (allDisciplines.length > 8) {
            doc.text("...", legendX, pageHeight - 5);
        }
    };

    const drawTaskRow = (y: number, item: GanttItem, index: number, dynamicRowHeight: number) => {
        if (index % 2 !== 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(margin, y, pageWidth - 2 * margin, dynamicRowHeight, 'F');
        }

        const textMaxWidth = textColumnWidth - 4;
        doc.setFontSize(8); doc.setFont('helvetica', 'bold');
        const actionLines = doc.splitTextToSize(item.label, textMaxWidth);

        const isCustomCriticalPath = item.group === 'CHEMINS CRITIQUES PERSONNALIS\u00c9S';

        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 41, 59);
        doc.text(actionLines, margin + 2, y + 5);

        if (!isCustomCriticalPath) {
            doc.setFontSize(7); doc.setFont('helvetica', 'normal');
            const persInfo = item.manpower > 0 ? ` • ${item.manpower} pers.` : '';
            const subInfo = `${item.equipment} • ${item.subTeamName}${persInfo}`;
            const subInfoLines = doc.splitTextToSize(subInfo, textMaxWidth);
            doc.setTextColor(100, 116, 139);
            doc.text(subInfoLines, margin + 2, y + 5 + (actionLines.length * 4));
        }

        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
        doc.text(`${item.durationHours.toFixed(1)}h`, margin + leftPaneWidth - 2, y + dynamicRowHeight / 2, { align: 'right', baseline: 'middle' });

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.1);
        doc.line(chartX, y, chartX, y + dynamicRowHeight);

        const startMs = item.start.getTime();
        const endMs = item.end.getTime();
        const drawStartMs = Math.max(startMs, chartStart);
        const drawEndMs = Math.min(endMs, chartEnd);

        if (drawEndMs > drawStartMs) {
            const barX = chartX + ((drawStartMs - chartStart) / totalDurationMs) * chartWidth;
            const barW = ((drawEndMs - drawStartMs) / totalDurationMs) * chartWidth;
            const barY = y + (dynamicRowHeight - barHeight) / 2;

            const [r, g, b] = hexToRgb(item.color);
            doc.setFillColor(r, g, b);
            doc.roundedRect(barX, barY, Math.max(1, barW), barHeight, 1, 1, 'F');

            const labelText = `${formatDateTimeShort(item.start)} - ${formatDateTimeShort(item.end)}`;
            doc.setFontSize(6);
            const textWidth = doc.getTextWidth(labelText);

            doc.setTextColor(71, 85, 105);
            const spaceOnRight = chartWidth - ((barX - chartX) + barW);
            const spaceOnLeft = barX - chartX;
            if (spaceOnRight > textWidth + 2) {
                // Place on the right
                const textX = barX + barW + 1.5;
                doc.text(labelText, textX, barY + barHeight / 2 + 0.5, { align: 'left', baseline: 'middle' });
            } else if (spaceOnLeft > textWidth + 2) {
                // Place on the left
                const textX = barX - 1.5;
                doc.text(labelText, textX, barY + barHeight / 2 + 0.5, { align: 'right', baseline: 'middle' });
            } else {
                // Fallback: place on the right
                const textX = barX + barW + 1.5;
                doc.text(labelText, textX, barY + barHeight / 2 + 0.5, { align: 'left', baseline: 'middle' });
            }
        }
    };

    // ── COVER PAGE ────────────────────────────────────────────────────────────
    const drawCoverPage = () => {
        const W = pageWidth;
        const H = pageHeight;
        const ACCENT_C: [number, number, number] = [16, 185, 129];   // emerald-500
        const BLUE_C: [number, number, number] = [59, 130, 246];   // blue-500
        const PURP_C: [number, number, number] = [168, 85, 247];   // purple-500
        const DARK_C: [number, number, number] = [8, 12, 24];
        const PANEL_C: [number, number, number] = [12, 18, 35];
        const TEXT_W: [number, number, number] = [248, 250, 252];
        const TEXT_M: [number, number, number] = [148, 163, 184];

        // ── 1. FULL DARK BG ───────────────────────────────────────────────────
        doc.setFillColor(...DARK_C);
        doc.rect(0, 0, W, H, 'F');

        // ── 2. DIAGONAL STRIPE TEXTURE (top-right) ────────────────────────────
        doc.setDrawColor(...ACCENT_C);
        doc.setLineWidth(0.25);
        for (let i = 0; i <= 14; i++) {
            const x0 = W * 0.55 + i * 12;
            doc.setGState(new (doc as any).GState({ opacity: 0.05 + i * 0.004 }));
            doc.line(x0, 0, x0 + H, H);
        }
        doc.setGState(new (doc as any).GState({ opacity: 1 }));

        // ── 3. LEFT ACCENT PANEL ──────────────────────────────────────────────
        const pW = 18;
        doc.setFillColor(...PANEL_C);
        doc.rect(0, 0, pW, H, 'F');
        const aW = 3;
        doc.setFillColor(...ACCENT_C); doc.rect(pW - aW, 0, aW, H * 0.65, 'F');
        doc.setFillColor(...BLUE_C); doc.rect(pW - aW, H * 0.65, aW, H * 0.20, 'F');
        doc.setFillColor(...PURP_C); doc.rect(pW - aW, H * 0.85, aW, H * 0.15, 'F');

        // ── 4. TOP BAR ────────────────────────────────────────────────────────
        const tbH = 22;
        doc.setFillColor(...PANEL_C);
        doc.rect(pW, 0, W - pW, tbH, 'F');
        doc.setFillColor(...ACCENT_C); doc.rect(pW, 0, (W - pW) * 0.6, 2, 'F');
        doc.setFillColor(...BLUE_C); doc.rect(pW + (W - pW) * 0.6, 0, (W - pW) * 0.4, 2, 'F');

        // Logo mark
        const lX = pW + 12, lY = tbH / 2;
        doc.setFillColor(...ACCENT_C); doc.circle(lX, lY, 5, 'F');
        doc.setFillColor(...DARK_C); doc.circle(lX, lY, 3, 'F');
        doc.setFillColor(...ACCENT_C); doc.circle(lX, lY, 1.2, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...TEXT_W);
        doc.text('PlanneX', lX + 8, lY + 4);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...ACCENT_C);
        doc.text('I N T E L L I G E N C E   E N G I N E', lX + 8, lY + 8.5);

        // Badge
        const bW = 50;
        doc.setFillColor(...ACCENT_C);
        doc.roundedRect(W - 14 - bW, 5, bW, 12, 2, 2, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...DARK_C);
        doc.text('RAPPORT GANTT OFFICIEL', W - 14 - bW / 2, 12.5, { align: 'center' });

        // ── 5. TAG LINE ───────────────────────────────────────────────────────
        const tY = tbH + 18;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...ACCENT_C);
        doc.text('PLANIFICATION & ORDONNANCEMENT  /  VISUALISATION DES OPERATIONS', pW + 14, tY);
        doc.setDrawColor(...ACCENT_C); doc.setLineWidth(0.4);
        doc.line(pW + 14, tY + 2, pW + 14 + 115, tY + 2);

        // ── 6. MEGA TITLE ─────────────────────────────────────────────────────
        const mTitleY = tY + 22;
        const safeTitle = title.toUpperCase()
            .replace(/[éèêë]/g, 'E').replace(/[àâ]/g, 'A').replace(/[îï]/g, 'I')
            .replace(/[ùû]/g, 'U').replace(/ç/g, 'C').replace(/[ôö]/g, 'O')
            .replace(/œ/g, 'OE').replace(/['']/g, "'").replace(/—/g, '-');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(34); doc.setTextColor(...TEXT_W);
        const tLines = doc.splitTextToSize(safeTitle, W * 0.58 - pW - 14);
        doc.text(tLines, pW + 14, mTitleY);

        const tBH = tLines.length * 14;
        const ulY2 = mTitleY + tBH - 2;
        doc.setFillColor(...ACCENT_C); doc.rect(pW + 14, ulY2, 50, 2.5, 'F');
        doc.setFillColor(30, 41, 59); doc.rect(pW + 68, ulY2, W - pW - 86, 0.5, 'F');

        // ── 7. PERIOD PILL ────────────────────────────────────────────────────
        const perY = ulY2 + 14;
        const perText = filter
            ? `Plage : ${formatDateTimeShort(filter.start)} au ${formatDateTimeShort(filter.end)}`
            : `Periode : ${formatDateTimeShort(new Date(parameters.shutdownStart))} au ${formatDateTimeShort(new Date(parameters.shutdownEnd))}`;
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(pW + 14, perY - 6, 130, 11, 2, 2, 'F');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...TEXT_M);
        doc.text(perText, pW + 19, perY + 1.5);

        // ── 8. KPI CARDS — 5 cards matching Premium ───────────────────────────
        const allItems2 = [...Object.values(groupedItems).flat()];
        const assetItems2 = allItems2.filter((it: any) => it.group !== 'CHRONOLOGIE MAÎTRESSE' && it.group !== 'CHEMINS CRITIQUES PERSONNALISÉS');
        const totalDisc2 = new Set(assetItems2.map((it: any) => it.team)).size;
        const totalMH2 = assetItems2.reduce((s: number, it: any) => s + (it.manpower * it.durationHours || 0), 0);
        const kpis2 = [
            { l: 'TACHES', v: String(assetItems2.length), c: ACCENT_C },
            { l: 'FAMILLES', v: String(Object.keys(groupedItems).length - (groupedItems['CHRONOLOGIE MAÎTRESSE'] ? 1 : 0) - (groupedItems['CHEMINS CRITIQUES PERSONNALISÉS'] ? 1 : 0)), c: BLUE_C },
            { l: 'DISCIPLINES', v: String(totalDisc2), c: PURP_C },
            { l: 'CHARGE H-H', v: totalMH2.toFixed(0), c: [249, 115, 22] as [number, number, number] },
            { l: 'DUREE (H)', v: ((chartEnd - chartStart) / 3600000).toFixed(0), c: [239, 68, 68] as [number, number, number] },
        ];
        const kpX = W * 0.60;
        const kpW = W - kpX - 14;
        const kpCW = kpW / kpis2.length - 2;
        const kpY2 = tbH + 12;
        kpis2.forEach((k, i) => {
            const cx = kpX + i * (kpCW + 2.5);
            doc.setFillColor(15, 23, 42); doc.roundedRect(cx, kpY2, kpCW, 36, 2, 2, 'F');
            doc.setFillColor(...k.c); doc.rect(cx, kpY2, kpCW, 2, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...TEXT_W);
            doc.text(k.v, cx + kpCW / 2, kpY2 + 18, { align: 'center' });
            doc.setFontSize(5.5); doc.setTextColor(...k.c);
            doc.text(k.l, cx + kpCW / 2, kpY2 + 26, { align: 'center' });
        });

        // ── 9. SECTION HEADER ─────────────────────────────────────────────────
        const secY2 = Math.max(perY + 20, mTitleY + tBH + 50);
        doc.setFillColor(15, 23, 42); doc.rect(pW, secY2 - 1, W - pW, 14, 'F');
        doc.setFillColor(...ACCENT_C); doc.rect(pW, secY2 - 1, 3, 14, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...ACCENT_C);
        doc.text('INFORMATIONS DU PROJET', pW + 10, secY2 + 7);

        // ── 10. METADATA GRID ─────────────────────────────────────────────────
        const td = new Date();
        const gd = `${td.getDate().toString().padStart(2, '0')}/${(td.getMonth() + 1).toString().padStart(2, '0')}/${td.getFullYear()}`;
        const metas = [
            { l: 'Generated', v: gd },
            { l: 'Classification', v: 'USAGE INTERNE' },
            { l: 'Software', v: 'PlanneX Intelligence Engine' },
            { l: 'Version', v: 'v4.0 - Classic Edition' },
            { l: 'Format', v: 'A3 Paysage - jsPDF Render' },
            { l: 'Mode', v: filter ? 'Plage Filtree' : 'Vue Globale' },
        ];
        const mSY = secY2 + 16;
        const cW2 = (W - pW - 28) / 2;
        metas.forEach((r, i) => {
            const col = i % 2, ri = Math.floor(i / 2);
            const mx = pW + 14 + col * (cW2 + 4), my = mSY + ri * 10;
            if (ri % 2 === 0) { doc.setFillColor(12, 18, 35); doc.rect(mx - 2, my - 5, cW2, 10, 'F'); }
            doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(100, 116, 139);
            doc.text(r.l.toUpperCase(), mx + 2, my);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(203, 213, 225);
            doc.text(r.v, mx + 36, my);
        });

        // ── 11. BOTTOM CAPSULE BAR ────────────────────────────────────────────
        const bBarY = H - 22;
        doc.setFillColor(...PANEL_C); doc.rect(pW, bBarY, W - pW, 22, 'F');
        doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.3); doc.line(pW, bBarY, W, bBarY);
        const caps = [
            { t: 'SYSTEME PLANNEX', c: ACCENT_C },
            { t: 'RAPPORT OFFICIEL', c: BLUE_C },
            { t: 'USAGE INTERNE', c: PURP_C },
        ];
        let cX = pW + 14;
        caps.forEach(cap => {
            doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5);
            const tw = doc.getTextWidth(cap.t) + 10;
            doc.setFillColor(Math.round(cap.c[0] * 0.15), Math.round(cap.c[1] * 0.15), Math.round(cap.c[2] * 0.15));
            doc.roundedRect(cX, bBarY + 5, tw, 8, 1.5, 1.5, 'F');
            doc.setDrawColor(...cap.c); doc.setLineWidth(0.3);
            doc.roundedRect(cX, bBarY + 5, tw, 8, 1.5, 1.5, 'S');
            doc.setTextColor(...cap.c);
            doc.text(cap.t, cX + tw / 2, bBarY + 10.5, { align: 'center' });
            cX += tw + 4;
        });
        doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(51, 65, 85);
        doc.text('PAGE DE COUVERTURE', W - 14, bBarY + 11, { align: 'right' });

        // ── 12. CORNER MARKS ─────────────────────────────────────────────────
        doc.setDrawColor(...ACCENT_C); doc.setLineWidth(0.5);
        doc.line(pW + 8, tbH + 4, pW + 13, tbH + 4);
        doc.line(pW + 8, tbH + 4, pW + 8, tbH + 9);
        doc.line(W - 14, bBarY - 8, W - 19, bBarY - 8);
        doc.line(W - 14, bBarY - 8, W - 14, bBarY - 13);
    };

    // Render cover, then start Gantt on fresh page
    drawCoverPage();
    doc.addPage();
    pageNumber++;

    drawTitle();
    currentY = drawTimelineHeader(currentY);


    for (const groupName of sortedGroupNames) {
        const items = groupedItems[groupName];
        if (!items || items.length === 0) continue;

        if (currentY + familyHeaderHeight + baseRowHeight > pageHeight - footerHeight) {
            drawFooter(pageNumber);
            doc.addPage();
            pageNumber++;
            currentY = margin + 10;
            currentY = drawTimelineHeader(currentY);
        }

        drawFamilyHeader(currentY, groupName, items);
        currentY += familyHeaderHeight;

        items.forEach((item, idx) => {
            const textMaxWidth = textColumnWidth - 4;
            doc.setFontSize(8);
            const actionLines = doc.splitTextToSize(item.label, textMaxWidth);
            const isCustomCriticalPath = item.group === 'CHEMINS CRITIQUES PERSONNALIS\u00c9S';
            let subInfoLinesCount = 0;
            if (!isCustomCriticalPath) {
                doc.setFontSize(7);
                const persInfo = item.manpower > 0 ? ` • ${item.manpower} pers.` : '';
                const subInfo = `${item.equipment} • ${item.subTeamName}${persInfo}`;
                const subInfoLines = doc.splitTextToSize(subInfo, textMaxWidth);
                subInfoLinesCount = subInfoLines.length;
            }
            const dynamicRowHeight = Math.max(baseRowHeight, (actionLines.length * 4) + (subInfoLinesCount * 3) + 6);

            if (currentY + dynamicRowHeight > pageHeight - footerHeight) {
                drawFooter(pageNumber);
                doc.addPage();
                pageNumber++;
                currentY = margin + 10;
                currentY = drawTimelineHeader(currentY);
                drawFamilyHeader(currentY, `${groupName} (suite)`, items);
                currentY += familyHeaderHeight;
            }
            drawTaskRow(currentY, item, idx, dynamicRowHeight);
            currentY += dynamicRowHeight;
        });

        currentY += 2;
    }

    drawFooter(pageNumber);
    return doc;
};
