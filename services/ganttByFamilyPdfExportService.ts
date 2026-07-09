
import jsPDF from 'jspdf';
import type { CalculationResults, ScheduledTask, AppParameters } from '../types';

interface DisplayOptions {
    timelineUnit: 'Heures' | 'Jours' | 'Semaines' | 'Mois' | 'Ann\u00e9es';
    timelineInterval: number;
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
];

const hexToRgb = (hex: string): [number, number, number] => {
    const bigint = parseInt(hex.replace('#', ''), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return [r, g, b];
};

const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
};

const formatDateShort = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
};

const formatDateTimeShort = (date: Date): string => {
    return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' à', '');
};

// ── CINEMATIC COVER PAGE ─────────────────────────────────────────────────────
const drawGanttFamilyCoverPage = (
    doc: jsPDF,
    results: CalculationResults,
    parameters: AppParameters,
    title: string,
    filter?: { start: Date; end: Date } | null
) => {
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const DARK: [number, number, number] = [8, 12, 24];
    const PANEL: [number, number, number] = [12, 18, 35];
    const EMERD: [number, number, number] = [16, 185, 129];
    const BLUE: [number, number, number] = [59, 130, 246];
    const PURP: [number, number, number] = [168, 85, 247];
    const ORANG: [number, number, number] = [249, 115, 22];
    const RED: [number, number, number] = [239, 68, 68];
    const TWHT: [number, number, number] = [248, 250, 252];
    const TMUT: [number, number, number] = [148, 163, 184];
    const TSUB: [number, number, number] = [100, 116, 139];

    doc.setFillColor(...DARK); doc.rect(0, 0, W, H, 'F');
    doc.setDrawColor(...EMERD); doc.setLineWidth(0.25);
    for (let i = 0; i <= 14; i++) {
        const x0 = W * 0.55 + i * 13;
        doc.setGState(new (doc as any).GState({ opacity: 0.04 + i * 0.004 }));
        doc.line(x0, 0, x0 + H, H);
    }
    doc.setGState(new (doc as any).GState({ opacity: 1 }));
    const pW = 18;
    doc.setFillColor(...PANEL); doc.rect(0, 0, pW, H, 'F');
    const aW = 3;
    doc.setFillColor(...EMERD); doc.rect(pW - aW, 0, aW, H * 0.40, 'F');
    doc.setFillColor(...BLUE); doc.rect(pW - aW, H * 0.40, aW, H * 0.25, 'F');
    doc.setFillColor(...PURP); doc.rect(pW - aW, H * 0.65, aW, H * 0.20, 'F');
    doc.setFillColor(...ORANG); doc.rect(pW - aW, H * 0.85, aW, H * 0.15, 'F');
    const tbH = 22;
    doc.setFillColor(...PANEL); doc.rect(pW, 0, W - pW, tbH, 'F');
    doc.setFillColor(...EMERD); doc.rect(pW, 0, (W - pW) * 0.55, 2, 'F');
    doc.setFillColor(...BLUE); doc.rect(pW + (W - pW) * 0.55, 0, (W - pW) * 0.45, 2, 'F');
    const lX = pW + 12, lY = tbH / 2;
    doc.setFillColor(...EMERD); doc.circle(lX, lY, 5, 'F');
    doc.setFillColor(...DARK); doc.circle(lX, lY, 3, 'F');
    doc.setFillColor(...EMERD); doc.circle(lX, lY, 1.2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...TWHT);
    doc.text('PlanneX', lX + 8, lY + 4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...EMERD);
    doc.text('I N T E L L I G E N C E   E N G I N E', lX + 8, lY + 8.5);
    const bW = 68;
    doc.setFillColor(...EMERD); doc.roundedRect(W - 14 - bW, 5, bW, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...DARK);
    doc.text('GANTT PAR FAMILLE — PDF', W - 14 - bW / 2, 12.5, { align: 'center' });
    const tY = tbH + 18;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...EMERD);
    doc.text('PLANIFICATION GANTT  /  ORDONNANCEMENT PAR FAMILLE', pW + 14, tY);
    doc.setDrawColor(...EMERD); doc.setLineWidth(0.4);
    doc.line(pW + 14, tY + 2, pW + 14 + 130, tY + 2);
    const mTY = tY + 22;
    const rawTitle = title.toUpperCase()
        .replace(/[éèêë]/g, 'E').replace(/[àâ]/g, 'A').replace(/[îï]/g, 'I')
        .replace(/[ùû]/g, 'U').replace(/ç/g, 'C').replace(/[ôö]/g, 'O')
        .replace(/œ/g, 'OE').replace(/['']/g, "'").replace(/—/g, '-');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(30); doc.setTextColor(...TWHT);
    const tLines = doc.splitTextToSize(rawTitle, W * 0.58 - pW - 14);
    doc.text(tLines, pW + 14, mTY);
    const tBH = tLines.length * 12;
    const ulY = mTY + tBH;
    doc.setFillColor(...EMERD); doc.rect(pW + 14, ulY, 55, 2.5, 'F');
    doc.setFillColor(30, 41, 59); doc.rect(pW + 73, ulY, W - pW - 90, 0.5, 'F');
    const start = filter ? filter.start : new Date(parameters.shutdownStart);
    const end = filter ? filter.end : new Date(parameters.shutdownEnd);
    const perY = ulY + 16;
    const perText = `Periode : ${start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} au ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    doc.setFillColor(15, 23, 42); doc.roundedRect(pW + 14, perY - 6, 155, 11, 2, 2, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...TMUT);
    doc.text(perText, pW + 19, perY + 1.5);
    const totalTasks = results.scheduledTasks.length;
    const totalMH = (results.kpis?.totalManHours || results.scheduledTasks.reduce((s, t) => s + t.manHours, 0)).toFixed(0);
    const totalFamilies = new Set(results.scheduledTasks.map(t => t.family)).size;
    const disciplines = new Set(results.scheduledTasks.map(t => t.discipline)).size;
    const durationH = ((end.getTime() - start.getTime()) / 3600000).toFixed(0);
    const kpis = [
        { l: 'TACHES', v: String(totalTasks), c: EMERD },
        { l: 'FAMILLES', v: String(totalFamilies), c: BLUE },
        { l: 'DISCIPLINES', v: String(disciplines), c: PURP },
        { l: 'CHARGE H-H', v: totalMH, c: ORANG },
        { l: 'DUREE (H)', v: durationH, c: RED },
    ];
    const kpX = W * 0.60, kpW = W - kpX - 14, kpCW = kpW / kpis.length - 2, kpY = tbH + 12;
    kpis.forEach((k, i) => {
        const cx = kpX + i * (kpCW + 2.5);
        doc.setFillColor(15, 23, 42); doc.roundedRect(cx, kpY, kpCW, 36, 2, 2, 'F');
        doc.setFillColor(...k.c); doc.rect(cx, kpY, kpCW, 2, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...TWHT);
        doc.text(k.v, cx + kpCW / 2, kpY + 17, { align: 'center' });
        doc.setFontSize(5.5); doc.setTextColor(...k.c);
        doc.text(k.l, cx + kpCW / 2, kpY + 25, { align: 'center' });
    });
    const secY = Math.max(perY + 22, mTY + tBH + 55);
    doc.setFillColor(15, 23, 42); doc.rect(pW, secY - 1, W - pW, 14, 'F');
    doc.setFillColor(...EMERD); doc.rect(pW, secY - 1, 3, 14, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...EMERD);
    doc.text('INFORMATIONS DU PROJET', pW + 10, secY + 7);
    const td = new Date();
    const gd = `${td.getDate().toString().padStart(2, '0')}/${(td.getMonth() + 1).toString().padStart(2, '0')}/${td.getFullYear()}`;
    const metas = [
        { l: 'Generated', v: gd },
        { l: 'Classification', v: 'USAGE INTERNE' },
        { l: 'Software', v: 'PlanneX Intelligence Engine' },
        { l: 'Version', v: 'v4.0 - Gantt Family Edition' },
        { l: 'Format', v: 'A3 Paysage — jsPDF Render' },
        { l: 'Mode', v: filter ? 'Plage Filtree' : 'Vue Globale' },
    ];
    const mSY = secY + 16, cW2 = (W - pW - 28) / 2;
    metas.forEach((r, i) => {
        const col = i % 2, ri = Math.floor(i / 2);
        const mx = pW + 14 + col * (cW2 + 4), my = mSY + ri * 10;
        if (ri % 2 === 0) { doc.setFillColor(12, 18, 35); doc.rect(mx - 2, my - 5, cW2, 10, 'F'); }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...TSUB); doc.text(r.l.toUpperCase(), mx + 2, my);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(203, 213, 225); doc.text(r.v, mx + 38, my);
    });
    const bBarY = H - 22;
    doc.setFillColor(...PANEL); doc.rect(pW, bBarY, W - pW, 22, 'F');
    doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.3); doc.line(pW, bBarY, W, bBarY);
    const caps: { t: string; c: [number, number, number] }[] = [
        { t: 'PLANNING PAR FAMILLE', c: EMERD },
        { t: 'RAPPORT OFFICIEL', c: BLUE },
        { t: 'USAGE INTERNE', c: PURP },
    ];
    let cX = pW + 14;
    caps.forEach(cap => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5);
        const tw = doc.getTextWidth(cap.t) + 10;
        doc.setFillColor(Math.round(cap.c[0] * 0.15), Math.round(cap.c[1] * 0.15), Math.round(cap.c[2] * 0.15));
        doc.roundedRect(cX, bBarY + 5, tw, 8, 1.5, 1.5, 'F');
        doc.setDrawColor(...cap.c); doc.setLineWidth(0.3);
        doc.roundedRect(cX, bBarY + 5, tw, 8, 1.5, 1.5, 'S');
        doc.setTextColor(...cap.c); doc.text(cap.t, cX + tw / 2, bBarY + 10.5, { align: 'center' });
        cX += tw + 4;
    });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(51, 65, 85);
    doc.text('PAGE DE COUVERTURE', W - 14, bBarY + 11, { align: 'right' });
    doc.setDrawColor(...EMERD); doc.setLineWidth(0.5);
    doc.line(pW + 8, tbH + 4, pW + 13, tbH + 4); doc.line(pW + 8, tbH + 4, pW + 8, tbH + 9);
    doc.line(W - 14, bBarY - 8, W - 19, bBarY - 8); doc.line(W - 14, bBarY - 8, W - 14, bBarY - 13);
};

// ────────────────────────────────────────────────────────────────────────────

export const exportGanttByFamilyPDF = async (
    results: CalculationResults,
    parameters: AppParameters,
    title: string,
    familyOrder: string[],
    displayOptions: DisplayOptions,
    filter?: { start: Date, end: Date } | null,
    contentFilters?: { maintenanceType?: string[], discipline?: string[], manpower?: number }
): Promise<jsPDF> => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    // ── Cover page ──
    drawGanttFamilyCoverPage(doc, results, parameters, title, filter);
    doc.addPage();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // Layout Configuration
    // Increased left column width to accommodate long task names
    const leftColWidth = 130;
    const chartAreaX = margin + leftColWidth;
    const chartAreaWidth = pageWidth - margin - chartAreaX;
    const headerHeight = 25;
    const baseRowHeight = 12; // Base height for a single line row
    const barHeight = 6;
    const fontSizeBody = 8;

    // 1. Data Preparation
    // ---------------------------------------------------------
    let tasksToExport = results.scheduledTasks;

    // Apply Time Filter
    if (filter) {
        const filterStart = filter.start.getTime();
        const filterEnd = filter.end.getTime();
        tasksToExport = tasksToExport.filter(task =>
            task.startTime.getTime() < filterEnd && task.endTime.getTime() > filterStart
        );
    }

    // Apply Content Filters
    if (contentFilters) {
        if (contentFilters.maintenanceType && contentFilters.maintenanceType.length > 0) {
            tasksToExport = tasksToExport.filter(t => t.maintenanceType && contentFilters.maintenanceType!.includes(t.maintenanceType));
        }
        if (contentFilters.discipline && contentFilters.discipline.length > 0) {
            // FIX: Use the correct 'discipline' property for filtering instead of parsing the 'team' property.
            tasksToExport = tasksToExport.filter(t => contentFilters.discipline!.includes(t.discipline));
        }
        if (contentFilters.manpower !== undefined && !isNaN(contentFilters.manpower)) {
            tasksToExport = tasksToExport.filter(t => t.manpower === contentFilters.manpower);
        }
    }

    // --- Grouping by multiDisciplineId and Implicit Coordination ---
    const taskGroups = new Map<string, ScheduledTask[]>();
    tasksToExport.forEach(task => {
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

    const displayTasks: ScheduledTask[] = [];
    taskGroups.forEach((group) => {
        const uniqueDisciplines = new Set(group.map(t => t.discipline));
        if (uniqueDisciplines.size > 1) {
            const main = group[0];
            const combinedManpower = group.reduce((sum, t) => sum + t.manpower, 0);
            const combinedTeams = [...new Set(group.map(t => t.team))].sort().join(', ');

            const groupStart = new Date(Math.min(...group.map(t => t.startTime.getTime())));
            const groupEnd = new Date(Math.max(...group.map(t => t.endTime.getTime())));

            displayTasks.push({
                ...main,
                startTime: groupStart,
                endTime: groupEnd,
                manpower: combinedManpower,
                discipline: 'MULTI-DISCIPLINE', // Special label for coloring
                team: combinedTeams,
            });
        } else {
            displayTasks.push(...group);
        }
    });

    // Sort and Group by Family
    const groupedByFamily: Record<string, ScheduledTask[]> = {};
    displayTasks.forEach(task => {
        const key = task.family || 'Autres';
        if (!groupedByFamily[key]) groupedByFamily[key] = [];
        groupedByFamily[key].push(task);
    });

    // Ensure family order respects input or defaults to alphabetical
    const sortedFamilyKeys = familyOrder.filter(f => groupedByFamily[f]).concat(
        Object.keys(groupedByFamily).filter(f => !familyOrder.includes(f)).sort()
    );

    // Sort tasks within families by start time
    Object.values(groupedByFamily).forEach(group => {
        group.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    });

    // Determine Timeline Range
    let chartStart = new Date(parameters.shutdownStart).getTime();
    let chartEnd = new Date(parameters.shutdownEnd).getTime();

    if (tasksToExport.length > 0) {
        const allStart = tasksToExport.map(t => t.startTime.getTime());
        const allEnd = tasksToExport.map(t => t.endTime.getTime());

        if (filter) {
            chartStart = filter.start.getTime();
            chartEnd = filter.end.getTime();
        } else {
            chartStart = Math.min(chartStart, ...allStart);
            chartEnd = Math.max(chartEnd, ...allEnd);
            // Add a small buffer (2%)
            const buffer = (chartEnd - chartStart) * 0.02;
            chartStart -= buffer;
            chartEnd += buffer;
        }
    }
    const totalDurationMs = chartEnd - chartStart;

    // Determine Colors by Discipline
    const disciplines = [...new Set(tasksToExport.map(t => (t.discipline)))].sort();
    const disciplineColorMap = new Map<string, [number, number, number]>();
    disciplines.forEach((d, i) => {
        disciplineColorMap.set(d, hexToRgb(HIGH_CONTRAST_COLORS[i % HIGH_CONTRAST_COLORS.length]));
    });

    // 2. Drawing Functions
    // ---------------------------------------------------------

    let currentY = margin;
    let pageNumber = 2; // cover page is page 1

    // Helper: Draw Header & Timeline
    const drawPageHeaderAndTimeline = () => {
        // Page Title Background
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(0, 0, pageWidth, headerHeight + margin, 'F');

        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(title.toUpperCase(), margin, margin + 8);

        // Removed generation date to keep it clean as requested

        // Timeline Axis
        const timelineY = margin + headerHeight;

        // Timeline ticks
        const ticks: Date[] = [];
        const tickStartDate = new Date(chartStart);
        tickStartDate.setMinutes(0, 0, 0);

        // Determine grid interval
        const intervalHours = displayOptions.timelineUnit === 'Jours' ? 24 : Math.max(1, displayOptions.timelineInterval);

        while (tickStartDate.getTime() <= chartEnd) {
            ticks.push(new Date(tickStartDate));
            tickStartDate.setHours(tickStartDate.getHours() + intervalHours);
        }

        // Draw Ticks and Grid
        doc.setFontSize(7);
        doc.setLineWidth(0.1);

        ticks.forEach(tick => {
            const x = chartAreaX + ((tick.getTime() - chartStart) / totalDurationMs) * chartAreaWidth;
            if (x < chartAreaX || x > pageWidth - margin) return;

            // Draw text
            let label = "";
            if (displayOptions.timelineUnit === 'Jours' || tick.getHours() === 0) {
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(15, 23, 42);
                label = formatDateShort(tick);
                doc.setDrawColor(203, 213, 225); // darker grid line for day start
                (doc as any).setLineDash([], 0);
            } else {
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(100, 116, 139);
                label = formatTime(tick);
                doc.setDrawColor(226, 232, 240); // lighter grid line
                (doc as any).setLineDash([1, 1], 0); // dotted
            }

            doc.text(label, x, timelineY - 3, { align: 'center' });

            // Draw Vertical Grid Line (extended to bottom of page logic handled later or just draw full height now)
            doc.line(x, timelineY, x, pageHeight - margin);
        });

        // Reset line dash
        (doc as any).setLineDash([], 0);

        // Draw Column Header Background for Task List
        doc.setFillColor(226, 232, 240); // slate-200
        doc.rect(margin, timelineY - 10, leftColWidth, 10, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text("TÂCHE / ÉQUIPEMENT", margin + 2, timelineY - 4);
        doc.text("DURÉE", margin + leftColWidth - 2, timelineY - 4, { align: 'right' });

        return timelineY; // Return Y where rows start
    };

    // Draw Footer
    const drawFooter = (pageNum: number) => {
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 5, { align: 'right' });

        // Legend
        let legendX = margin;
        const sampleDisciplines = Array.from(disciplineColorMap.keys()).slice(0, 8);
        sampleDisciplines.forEach(disc => {
            const color = disciplineColorMap.get(disc)!;
            doc.setFillColor(color[0], color[1], color[2]);
            doc.circle(legendX, pageHeight - 6, 1.5, 'F');
            doc.setTextColor(71, 85, 105);
            doc.text(disc, legendX + 3, pageHeight - 5);
            legendX += doc.getTextWidth(disc) + 10;
        });
        if (disciplines.length > 8) {
            doc.text("...", legendX, pageHeight - 5);
        }
    };

    // 3. Execution Loop
    // ---------------------------------------------------------

    let contentStartY = drawPageHeaderAndTimeline();
    currentY = contentStartY;

    for (const family of sortedFamilyKeys) {
        const tasks = groupedByFamily[family];
        if (!tasks || tasks.length === 0) continue;

        // Calculate Family Summary Dates
        const minFamilyTime = Math.min(...tasks.map(t => t.startTime.getTime()));
        const maxFamilyTime = Math.max(...tasks.map(t => t.endTime.getTime()));
        const familyStartStr = formatDateTimeShort(new Date(minFamilyTime));
        const familyEndStr = formatDateTimeShort(new Date(maxFamilyTime));

        // Check space for Family Header
        if (currentY + 15 > pageHeight - margin) {
            drawFooter(pageNumber);
            doc.addPage();
            pageNumber++;
            contentStartY = drawPageHeaderAndTimeline();
            currentY = contentStartY;
        }

        // Draw Family Header Row
        doc.setFillColor(30, 41, 59); // slate-800
        doc.rect(margin, currentY, pageWidth - (margin * 2), 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');

        // Header Text with Dates
        const headerText = `${family.toUpperCase()} (${tasks.length} tâches)  |  Début : ${familyStartStr}  |  Fin : ${familyEndStr}`;
        doc.text(headerText, margin + 4, currentY + 5.5);
        currentY += 8;

        // Draw Tasks
        for (const task of tasks) {
            // Calculate dynamic height based on text wrapping
            doc.setFontSize(fontSizeBody);
            doc.setFont('helvetica', 'bold');

            // -25 for padding and duration column
            const textMaxWidth = leftColWidth - 25;
            const actionLines = doc.splitTextToSize(task.action, textMaxWidth);

            // Dynamic height: base + (extra lines * 4mm)
            const lineCount = actionLines.length;
            // Add extra padding at bottom for equipment/team line
            const dynamicRowHeight = Math.max(baseRowHeight, (lineCount * 4) + 8);

            // Check space for Task Row
            if (currentY + dynamicRowHeight > pageHeight - margin) {
                drawFooter(pageNumber);
                doc.addPage();
                pageNumber++;
                contentStartY = drawPageHeaderAndTimeline();
                currentY = contentStartY;

                // Re-draw Family Header (continued)
                doc.setFillColor(30, 41, 59);
                doc.rect(margin, currentY, pageWidth - (margin * 2), 6, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(9);
                doc.text(`${family.toUpperCase()} (suite)`, margin + 4, currentY + 4);
                currentY += 6;
            }

            // --- Left Column: Text Info ---
            // Alternating background
            if (Math.round(currentY) % 2 !== 0) {
                doc.setFillColor(248, 250, 252);
                doc.rect(margin, currentY, pageWidth - (margin * 2), dynamicRowHeight, 'F');
            }

            // Task Name (Wrapped)
            doc.setFontSize(fontSizeBody);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 41, 59);
            // Draw lines
            let textY = currentY + 4;
            doc.text(actionLines, margin + 2, textY);

            // Sub-info: Equipment & Team (Bottom of row)
            textY += (lineCount * 4) + 1; // Move below action text
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            const subText = `${task.equipment} • ${task.team}`;
            doc.text(subText, margin + 2, textY);

            // Duration (Right aligned in text column) - VERTICALLY CENTERED
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(`${task.duration.toFixed(1)}h`, margin + leftColWidth - 2, currentY + dynamicRowHeight / 2, { align: 'right', baseline: 'middle' });

            // Horizontal Separator line
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.1);
            doc.line(margin, currentY + dynamicRowHeight, pageWidth - margin, currentY + dynamicRowHeight);

            // Vertical separator between text and chart
            doc.line(chartAreaX, currentY, chartAreaX, currentY + dynamicRowHeight);


            // --- Right Side: Gantt Bar ---
            const startMs = task.startTime.getTime();
            const endMs = task.endTime.getTime();

            // Clamp bar to chart view
            const drawStartMs = Math.max(startMs, chartStart);
            const drawEndMs = Math.min(endMs, chartEnd);

            if (drawEndMs > drawStartMs) {
                const barX = chartAreaX + ((drawStartMs - chartStart) / totalDurationMs) * chartAreaWidth;
                const barW = Math.max(1, ((drawEndMs - drawStartMs) / totalDurationMs) * chartAreaWidth);
                const barY = currentY + (dynamicRowHeight - barHeight) / 2;

                const discipline = task.discipline;
                const color = disciplineColorMap.get(discipline) || [100, 116, 139];

                doc.setFillColor(color[0], color[1], color[2]);
                doc.roundedRect(barX, barY, barW, barHeight, 1, 1, 'F');

                // Smart Labels: Start & End Dates
                const startTimeStr = formatDateTimeShort(task.startTime);
                const endTimeStr = formatDateTimeShort(task.endTime);
                const labelText = `${startTimeStr} - ${endTimeStr}`;

                doc.setFontSize(6);
                const textWidth = doc.getTextWidth(labelText);

                // Logic: If bar is wide enough, put text inside (White). Else put next to it (Dark).
                if (barW > textWidth + 4) {
                    doc.setTextColor(255, 255, 255);
                    doc.text(labelText, barX + barW / 2, barY + barHeight / 2 + 0.5, { align: 'center', baseline: 'middle' });
                } else {
                    doc.setTextColor(71, 85, 105); // slate-600
                    // Draw to the right of the bar with a small margin
                    const textX = Math.min(barX + barW + 2, pageWidth - margin - textWidth); // Prevent right overflow
                    doc.text(labelText, textX, barY + barHeight / 2 + 0.5, { align: 'left', baseline: 'middle' });
                }
            }

            currentY += dynamicRowHeight;
        }

        // Spacer between families
        currentY += 2;
    }

    drawFooter(pageNumber);

    return doc;
};
