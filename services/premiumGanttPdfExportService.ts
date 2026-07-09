import jsPDF from 'jspdf';
import type { CalculationResults, AppParameters, ScheduledTask, CustomCriticalPath } from '../types';
import { generateSubTeamMap } from './schedulingService';

interface GanttItem {
    id: string;
    group: string;
    label: string;
    equipment: string;
    discipline: string;
    start: Date;
    end: Date;
    durationHours: number;
    color: string;
    subTeamName?: string;
    manpower: number;
    manHours: number;
    originalTaskIds: number[];
    isChronology?: boolean;
    isCriticalPath?: boolean;
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

const hexToRgb = (hex: string): [number, number, number] => {
    const bigint = parseInt(hex.replace('#', ''), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

const formatCompactDate = (date: Date): string =>
    date.toLocaleString('fr-FR', { year: '2-digit', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' à', '').replace(',', '');

const formatTime = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const formatDateShort = (date: Date): string => date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

const getPremiumGanttData = (results: CalculationResults, parameters: AppParameters, familyOrder: string[], customCriticalPaths: CustomCriticalPath[], isColdStopFlow: boolean, displayOptions: DisplayOptions, filter?: { start: Date, end: Date } | null) => {
    const taskIdToSubTeamMap = generateSubTeamMap(results, isColdStopFlow);

    // Custom Critical Paths
    const customPathItems: GanttItem[] = customCriticalPaths.map((path): GanttItem | null => {
        const start = new Date(path.start); const end = new Date(path.end);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return null;
        return {
            id: `custom_cp_${path.id}`, group: "CHEMINS CRITIQUES", label: path.name, equipment: "Critique", discipline: "Critique",
            start, end, color: path.color || '#dc2626', subTeamName: 'Chemin Critique', manpower: 0, manHours: 0,
            durationHours: (end.getTime() - start.getTime()) / 3600000, originalTaskIds: [], isCriticalPath: true,
        };
    }).filter((item): item is GanttItem => item !== null);

    // Chronology
    let chronologyItems: GanttItem[] = [];
    if (displayOptions.showChronology) {
        if (isColdStopFlow) {
            chronologyItems = results.scheduledTasks.filter(t => t.isKeyEvent).map((task): GanttItem => ({
                id: `chrono_${task.id}`, group: 'CHRONOLOGIE', label: task.action, equipment: task.equipment, discipline: task.discipline,
                start: task.startTime, end: task.endTime, color: displayOptions.chronologyColor || '#f59e0b',
                subTeamName: task.team, manpower: task.manpower, manHours: task.manHours,
                durationHours: (task.endTime.getTime() - task.startTime.getTime()) / 3600000, originalTaskIds: [task.id], isChronology: true,
            }));
        } else {
            const { shutdownStart, shutdownEnd, consignation, deconsignation, combustion, demarrage } = parameters;
            const p_consignationStart = new Date(shutdownStart);
            const p_workStart = new Date(p_consignationStart.getTime() + consignation * 60 * 1000);
            const p_shutdownEnd = new Date(shutdownEnd);
            const p_demarrageEnd = p_shutdownEnd;
            const p_demarrageStart = new Date(p_demarrageEnd.getTime() - demarrage * 60 * 1000);
            let p_deconsignationStart: Date, p_deconsignationEnd: Date, p_combustionStart: Date, p_combustionEnd: Date;
            if (combustion.mode === 'after_deconsignation') {
                p_combustionEnd = p_demarrageStart;
                p_combustionStart = new Date(p_combustionEnd.getTime() - combustion.value * 60 * 1000);
                p_deconsignationEnd = p_combustionStart;
                p_deconsignationStart = new Date(p_deconsignationEnd.getTime() - deconsignation * 60 * 1000);
            } else {
                p_deconsignationEnd = p_demarrageStart;
                p_deconsignationStart = new Date(p_deconsignationEnd.getTime() - deconsignation * 60 * 1000);
                p_combustionEnd = p_demarrageStart;
                p_combustionStart = new Date(p_combustionEnd.getTime() - combustion.value * 60 * 1000);
            }
            const makeChronoItem = (id: string, label: string, start: Date, end: Date, color: string): GanttItem => ({
                id, group: 'CHRONOLOGIE', label, equipment: 'Système', discipline: 'Exploitation', start, end, color,
                subTeamName: label, manpower: 0, manHours: 0,
                durationHours: (end.getTime() - start.getTime()) / 3600000, originalTaskIds: [], isChronology: true,
            });
            chronologyItems = [
                makeChronoItem('cc', 'Consignation', p_consignationStart, p_workStart, displayOptions.chronologyColor || '#f59e0b'),
                makeChronoItem('ca', 'Allumage Combustion', p_combustionStart, p_combustionEnd, '#facc15'),
                makeChronoItem('cd', 'Déconsignation', p_deconsignationStart, p_deconsignationEnd, displayOptions.chronologyColor || '#f59e0b'),
                makeChronoItem('cm', 'Démarrage Boucle', p_demarrageStart, p_demarrageEnd, '#22c55e'),
            ].filter(item => !isNaN(item.start.getTime()) && !isNaN(item.end.getTime()) && item.start < item.end);
        }
    }

    // Asset Tasks
    let relevantTasks = results.scheduledTasks;
    if (filter) {
        const fStart = filter.start.getTime(), fEnd = filter.end.getTime();
        relevantTasks = relevantTasks.filter(t => t.startTime.getTime() < fEnd && t.endTime.getTime() > fStart);
    }

    const taskGroups = new Map<string, ScheduledTask[]>();
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
            const combinedManHours = tasksInGroup.reduce((sum, t) => sum + (t.manHours || 0), 0);
            const groupStart = new Date(Math.min(...tasksInGroup.map(t => t.startTime.getTime())));
            const groupEnd = new Date(Math.max(...tasksInGroup.map(t => t.endTime.getTime())));

            const subTeamName = [...new Set(tasksInGroup.map(task => taskIdToSubTeamMap.get(task.id)?.name || task.team))].join(', ');

            assetTasks.push({
                id: key,
                group: mainTask.family,
                label: mainTask.action,
                equipment: mainTask.equipment,
                discipline: 'MULTI-DISCIPLINE',
                start: groupStart,
                end: groupEnd,
                durationHours: (groupEnd.getTime() - groupStart.getTime()) / (1000 * 60 * 60),
                color: '#64748b', // Neutral slate for multi-discipline
                subTeamName,
                manpower: combinedManpower,
                manHours: combinedManHours,
                originalTaskIds: tasksInGroup.map(t => t.id),
            });
        } else {
            tasksInGroup.forEach((task, idx) => {
                const subTeamName = taskIdToSubTeamMap.get(task.id)?.name || task.team;
                assetTasks.push({
                    id: `${key}_${idx}`,
                    group: task.family,
                    label: task.action,
                    equipment: task.equipment,
                    discipline: task.discipline,
                    start: task.startTime,
                    end: task.endTime,
                    durationHours: (task.endTime.getTime() - task.startTime.getTime()) / (1000 * 60 * 60),
                    color: displayOptions.disciplineColors.get(task.discipline) || '#64748b',
                    subTeamName,
                    manpower: task.manpower || 0,
                    manHours: task.manHours || 0,
                    originalTaskIds: [task.id],
                });
            });
        }
    });

    const allItems = [...customPathItems, ...chronologyItems, ...assetTasks];

    const groupedItems: Record<string, GanttItem[]> = {};
    allItems.forEach(item => {
        const gk = item.group || "AUTRES";
        if (!groupedItems[gk]) groupedItems[gk] = [];
        groupedItems[gk].push(item);
    });
    Object.values(groupedItems).forEach(g => g.sort((a, b) => a.start.getTime() - b.start.getTime()));

    const foUpper = familyOrder.map(f => f.toUpperCase());
    const sortedGroupNames = Object.keys(groupedItems).sort((a, b) => {
        const order = ["CHEMINS CRITIQUES", "CHRONOLOGIE"];
        const iA = order.indexOf(a.toUpperCase()), iB = order.indexOf(b.toUpperCase());
        if (iA !== -1 && iB !== -1) return iA - iB;
        if (iA !== -1) return -1;
        if (iB !== -1) return 1;
        const fA = foUpper.indexOf(a.toUpperCase()), fB = foUpper.indexOf(b.toUpperCase());
        if (fA !== -1 && fB !== -1) return fA - fB;
        if (fA !== -1) return -1;
        if (fB !== -1) return 1;
        return a.localeCompare(b);
    });

    let chartStart: number, chartEnd: number;
    if (filter) { chartStart = filter.start.getTime(); chartEnd = filter.end.getTime(); }
    else {
        const allDates = allItems.flatMap(item => [item.start.getTime(), item.end.getTime()]).filter(t => !isNaN(t));
        chartStart = allDates.length > 0 ? Math.min(...allDates) : Date.now();
        chartEnd = allDates.length > 0 ? Math.max(...allDates) : Date.now();
        const padding = (chartEnd - chartStart) * 0.02 || 3600000;
        chartStart -= padding; chartEnd += padding;
    }
    return { sortedGroupNames, groupedItems, chartStart, chartEnd, allItems };
};

export const exportPremiumGanttToPDF = async (
    results: CalculationResults, parameters: AppParameters, familyOrder: string[], title: string,
    customCriticalPaths: CustomCriticalPath[], isColdStopFlow: boolean, displayOptions: DisplayOptions,
    filter?: { start: Date, end: Date } | null, headerColor: string = '#0f172a'
): Promise<jsPDF> => {

    const { sortedGroupNames, groupedItems, chartStart, chartEnd, allItems } = getPremiumGanttData(results, parameters, familyOrder, customCriticalPaths, isColdStopFlow, displayOptions, filter);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- Design System ---
    const DARK_BG: [number, number, number] = [15, 23, 42];       // slate-900
    const MEDIUM_BG: [number, number, number] = [30, 41, 59];     // slate-800
    const LIGHT_BG: [number, number, number] = [51, 65, 85];      // slate-700
    const ACCENT: [number, number, number] = [16, 185, 129];      // emerald-500
    const TEXT_WHITE: [number, number, number] = [248, 250, 252];  // slate-50
    const TEXT_MUTED: [number, number, number] = [148, 163, 184];  // slate-400
    const TEXT_SUBTLE: [number, number, number] = [100, 116, 139]; // slate-500
    const GRID_LINE: [number, number, number] = [51, 65, 85];     // slate-700

    const margin = 8;
    const footerHeight = 18;
    const headerAreaHeight = 30;
    const timelineHeaderHeight = 10;
    const leftPaneWidth = 115;
    const chartX = margin + leftPaneWidth;
    const chartWidth = pageWidth - margin - chartX;
    const baseRowHeight = 14;
    const barHeight = 6;
    const familyHeaderHeight = 9;
    const totalDurationMs = chartEnd - chartStart;

    let currentY = margin;
    let pageNumber = 1;
    let isDetailedHeader = true;

    // --- Cover Page (Cinematic Engineering Grade) ---
    const drawCoverPage = () => {
        const W = pageWidth;
        const H = pageHeight;

        // ── 1. FULL-BLEED DARK CANVAS ────────────────────────────────────────
        doc.setFillColor(8, 12, 24);           // near-black navy
        doc.rect(0, 0, W, H, 'F');

        // ── 2. LARGE GEOMETRIC DIAGONAL BANDS (background texture) ───────────
        // Faint diagonal stripe pattern (top-right quadrant)
        const stripeColor: [number, number, number] = [16, 185, 129]; // emerald
        doc.setDrawColor(...stripeColor);
        doc.setLineWidth(0.3);
        for (let i = 0; i <= 14; i++) {
            const x0 = W * 0.55 + i * 12;
            doc.setGState(new (doc as any).GState({ opacity: 0.06 + i * 0.005 }));
            doc.line(x0, 0, x0 + H, H);
        }
        doc.setGState(new (doc as any).GState({ opacity: 1 }));

        // ── 3. LEFT ACCENT PANEL (18mm wide, full height) ────────────────────
        const panelW = 18;
        doc.setFillColor(12, 18, 35);
        doc.rect(0, 0, panelW, H, 'F');

        // Accent gradient strip on panel right edge
        const accentW = 3;
        doc.setFillColor(...ACCENT);
        doc.rect(panelW - accentW, 0, accentW, H * 0.65, 'F');
        doc.setFillColor(59, 130, 246);        // blue-500
        doc.rect(panelW - accentW, H * 0.65, accentW, H * 0.20, 'F');
        doc.setFillColor(168, 85, 247);        // purple-500
        doc.rect(panelW - accentW, H * 0.85, accentW, H * 0.15, 'F');

        // Rotated "PLANNEX" sideways text in left panel
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(30, 45, 70);
        doc.text('PLANNEX', panelW / 2, H / 2 + 20, {
            align: 'center',
            angle: 90
        });

        // ── 4. TOP BAR (full width, 22mm) ─────────────────────────────────────
        const topBarH = 22;
        doc.setFillColor(12, 18, 35);
        doc.rect(panelW, 0, W - panelW, topBarH, 'F');

        // Top accent line (emerald → blue gradient simulated by 2 rects)
        doc.setFillColor(...ACCENT);
        doc.rect(panelW, 0, (W - panelW) * 0.6, 2, 'F');
        doc.setFillColor(59, 130, 246);
        doc.rect(panelW + (W - panelW) * 0.6, 0, (W - panelW) * 0.4, 2, 'F');

        // Logo mark — hexagonal icon
        const logoX = panelW + 12;
        const logoY = topBarH / 2;
        doc.setFillColor(...ACCENT);
        doc.circle(logoX, logoY, 5, 'F');
        doc.setFillColor(8, 12, 24);
        doc.circle(logoX, logoY, 3, 'F');
        doc.setFillColor(...ACCENT);
        doc.circle(logoX, logoY, 1.2, 'F');

        // "PlanneX" wordmark
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(248, 250, 252);
        doc.text('PlanneX', logoX + 8, logoY + 4);

        // "Intelligence Engine" subtitle
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(...ACCENT);
        doc.text('I N T E L L I G E N C E   E N G I N E', logoX + 8, logoY + 8.5);

        // Top-right: document type badge
        doc.setFillColor(...ACCENT);
        const badgeW = 54;
        doc.roundedRect(W - 14 - badgeW, 5, badgeW, 12, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(8, 12, 24);
        doc.text('RAPPORT GANTT OFFICIEL', W - 14 - badgeW / 2, 13, { align: 'center' });

        // ── 5. CATEGORY TAG LINE ───────────────────────────────────────────────
        const tagY = topBarH + 18;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...ACCENT);
        doc.text('PLANIFICATION & ORDONNANCEMENT  /  VISUALISATION DES OPERATIONS', panelW + 14, tagY);

        // Thin underline
        doc.setDrawColor(...ACCENT);
        doc.setLineWidth(0.4);
        doc.line(panelW + 14, tagY + 2, panelW + 14 + 115, tagY + 2);

        // ── 6. MEGA TITLE ─────────────────────────────────────────────────────
        const titleY = tagY + 22;
        const titleText = title.toUpperCase()
            .replace(/[éèêë]/g, 'E').replace(/[àâ]/g, 'A').replace(/[îï]/g, 'I')
            .replace(/[ùû]/g, 'U').replace(/ç/g, 'C').replace(/[ôö]/g, 'O')
            .replace(/œ/g, 'OE').replace(/'/g, "'").replace(/['']/g, "'").replace(/—/g, '-');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(34);
        doc.setTextColor(248, 250, 252);
        const titleLines = doc.splitTextToSize(titleText, W * 0.58 - panelW - 14);
        doc.text(titleLines, panelW + 14, titleY);

        // Thick accent underline
        const titleBlockH = titleLines.length * 14;
        const ulY = titleY + titleBlockH - 2;
        doc.setFillColor(...ACCENT);
        doc.rect(panelW + 14, ulY, 50, 2.5, 'F');
        doc.setFillColor(30, 41, 59);
        doc.rect(panelW + 68, ulY, W - panelW - 28 - 58, 0.5, 'F');

        // ── 7. PERIOD BLOCK ───────────────────────────────────────────────────
        const periodY = ulY + 14;
        const periodText = filter
            ? `Plage : ${formatCompactDate(filter.start)} au ${formatCompactDate(filter.end)}`
            : `Periode : ${formatCompactDate(new Date(parameters.shutdownStart))} au ${formatCompactDate(new Date(parameters.shutdownEnd))}`;

        doc.setFillColor(15, 23, 42);
        doc.roundedRect(panelW + 14, periodY - 6, 130, 11, 2, 2, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(148, 163, 184);
        doc.text(periodText, panelW + 19, periodY + 1.5);

        // ── 8. KPI STRIP (4 cards in a row, right side) ───────────────────────
        const totalTasks = allItems.filter(i => !i.isChronology && !i.isCriticalPath).length;
        const totalFamilies = sortedGroupNames.filter(g => g !== 'CHRONOLOGIE' && g !== 'CHEMINS CRITIQUES').length;
        const totalDisciplines = new Set(allItems.filter(i => !i.isChronology && !i.isCriticalPath).map(i => i.discipline)).size;
        const totalManHours = allItems.filter(i => !i.isChronology && !i.isCriticalPath).reduce((sum, i) => sum + i.manHours, 0);
        const durationH = ((chartEnd - chartStart) / 3600000).toFixed(0);

        const kpis = [
            { label: 'TACHES', value: String(totalTasks), color: ACCENT as [number, number, number] },
            { label: 'FAMILLES', value: String(totalFamilies), color: [59, 130, 246] as [number, number, number] },
            { label: 'DISCIPLINES', value: String(totalDisciplines), color: [168, 85, 247] as [number, number, number] },
            { label: 'CHARGE H-H', value: `${totalManHours.toFixed(0)}`, color: [249, 115, 22] as [number, number, number] },
            { label: 'DUREE (H)', value: durationH, color: [239, 68, 68] as [number, number, number] },
        ];

        const kpiAreaX = W * 0.60;
        const kpiAreaW = W - kpiAreaX - 14;
        const kpiCardW = kpiAreaW / kpis.length - 2;
        const kpiY = topBarH + 12;
        const kpiH = 36;

        kpis.forEach((kpi, i) => {
            const cx = kpiAreaX + i * (kpiCardW + 2.5);

            // Card bg
            doc.setFillColor(15, 23, 42);
            doc.roundedRect(cx, kpiY, kpiCardW, kpiH, 2, 2, 'F');

            // Top color bar
            doc.setFillColor(...kpi.color);
            doc.rect(cx, kpiY, kpiCardW, 2, 'F');

            // Value
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(248, 250, 252);
            doc.text(kpi.value, cx + kpiCardW / 2, kpiY + 18, { align: 'center' });

            // Label
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.5);
            doc.setTextColor(...kpi.color);
            doc.text(kpi.label, cx + kpiCardW / 2, kpiY + 26, { align: 'center' });
        });

        // ── 9. DIVIDER SECTION HEADER ─────────────────────────────────────────
        const secY = Math.max(periodY + 20, titleY + titleBlockH + 50);
        doc.setFillColor(15, 23, 42);
        doc.rect(panelW, secY - 1, W - panelW, 14, 'F');
        doc.setFillColor(...ACCENT);
        doc.rect(panelW, secY - 1, 3, 14, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...ACCENT);
        doc.text('INFORMATIONS DU PROJET', panelW + 10, secY + 7);

        // ── 10. METADATA GRID (2-column) ──────────────────────────────────────
        const today = new Date();
        const genDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;

        const metaRows = [
            { label: 'Generated', value: genDate },
            { label: 'Classification', value: 'USAGE INTERNE' },
            { label: 'Software', value: 'PlanneX Intelligence Engine' },
            { label: 'Version', value: 'v4.0 - Premium Edition' },
            { label: 'Format', value: 'A3 Paysage — jsPDF Render' },
            { label: 'Mode', value: filter ? 'Plage Filtree' : 'Vue Globale' },
        ];

        const metaStartY = secY + 16;
        const colW = (W - panelW - 28) / 2;
        const rowH = 10;

        metaRows.forEach((row, i) => {
            const col = i % 2;
            const rowIdx = Math.floor(i / 2);
            const mx = panelW + 14 + col * (colW + 4);
            const my = metaStartY + rowIdx * rowH;

            // Row bg alternate
            if (rowIdx % 2 === 0) {
                doc.setFillColor(12, 18, 35);
                doc.rect(mx - 2, my - 5, colW, rowH, 'F');
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            doc.text(row.label.toUpperCase(), mx + 2, my);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(203, 213, 225);
            doc.text(row.value, mx + 38, my);
        });

        // ── 11. BOTTOM STATUS CAPSULES ────────────────────────────────────────
        const bottomBarY = H - 22;
        doc.setFillColor(12, 18, 35);
        doc.rect(panelW, bottomBarY, W - panelW, 22, 'F');

        // Thin top separator
        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(0.3);
        doc.line(panelW, bottomBarY, W, bottomBarY);

        const capsules = [
            { text: 'SYSTEME PLANNEX', color: ACCENT as [number, number, number] },
            { text: 'RAPPORT OFFICIEL', color: [59, 130, 246] as [number, number, number] },
            { text: 'CONFIDENTIEL', color: [168, 85, 247] as [number, number, number] },
        ];
        let capsX = panelW + 14;
        capsules.forEach(cap => {
            const tw = doc.getTextWidth(cap.text) + 10;
            doc.setFillColor(cap.color[0] * 0.15 | 0, cap.color[1] * 0.15 | 0, cap.color[2] * 0.15 | 0);
            doc.roundedRect(capsX, bottomBarY + 5, tw, 8, 1.5, 1.5, 'F');
            doc.setDrawColor(...cap.color);
            doc.setLineWidth(0.3);
            doc.roundedRect(capsX, bottomBarY + 5, tw, 8, 1.5, 1.5, 'S');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.5);
            doc.setTextColor(...cap.color);
            doc.text(cap.text, capsX + tw / 2, bottomBarY + 10.5, { align: 'center' });
            capsX += tw + 4;
        });

        // Right: page label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        doc.text('PAGE DE COUVERTURE', W - 14, bottomBarY + 11, { align: 'right' });

        // ── 12. DECORATIVE CORNER MARKS ───────────────────────────────────────
        const cmSize = 5;
        doc.setDrawColor(...ACCENT);
        doc.setLineWidth(0.5);
        // Top-left (after panel)
        doc.line(panelW + 8, topBarH + 4, panelW + 8 + cmSize, topBarH + 4);
        doc.line(panelW + 8, topBarH + 4, panelW + 8, topBarH + 4 + cmSize);
        // Bottom-right
        doc.line(W - 14, bottomBarY - 8, W - 14 - cmSize, bottomBarY - 8);
        doc.line(W - 14, bottomBarY - 8, W - 14, bottomBarY - 8 - cmSize);
    };


    const drawPageBackground = () => {
        doc.setFillColor(...DARK_BG);
        doc.rect(0, 0, pageWidth, pageHeight, 'F');
        doc.setFillColor(...ACCENT);
        doc.rect(0, 0, pageWidth, 1, 'F');
    };

    const drawPageHeader = () => {
        drawPageBackground();

        doc.setFillColor(...MEDIUM_BG);
        doc.rect(0, 0, pageWidth, headerAreaHeight, 'F');
        doc.setFillColor(...ACCENT);
        doc.rect(0, 0, pageWidth, 1, 'F');

        if (isDetailedHeader) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(...TEXT_WHITE);
            doc.text(title.toUpperCase(), margin + 2, 10);

            doc.setFontSize(8);
            doc.setTextColor(...ACCENT);
            doc.text('PlanneX', margin + 2, 17);
        } else {
            // No title on continuing pages as per user request
            doc.setFontSize(8);
            doc.setTextColor(...TEXT_MUTED);
            doc.text(`PLANNING CONTINUATION`, margin + 2, 12);
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...TEXT_MUTED);
        const periodText = filter
            ? `${formatCompactDate(filter.start)} - ${formatCompactDate(filter.end)}`
            : `${formatCompactDate(new Date(parameters.shutdownStart))} - ${formatCompactDate(new Date(parameters.shutdownEnd))}`;
        doc.text(periodText, pageWidth - margin - 2, 10, { align: 'right' });
        doc.text(`Page ${pageNumber}`, pageWidth - margin - 2, 17, { align: 'right' });

        currentY = headerAreaHeight + 2;
        isDetailedHeader = false; // Next calls will be compact
    };

    const drawTimelineHeader = (y: number) => {
        // Left pane header
        doc.setFillColor(...MEDIUM_BG);
        doc.rect(margin, y, leftPaneWidth, timelineHeaderHeight, 'F');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...ACCENT);
        doc.text('TÂCHE / ÉQUIPEMENT', margin + 3, y + 6);
        doc.text('H | PERS', margin + leftPaneWidth - 3, y + 6, { align: 'right' });

        // Timeline background
        doc.setFillColor(20, 30, 48);
        doc.rect(chartX, y, chartWidth, timelineHeaderHeight, 'F');

        // Ticks
        const intervalHours = displayOptions.timelineUnit === 'Jours' ? 24 : Math.max(1, displayOptions.timelineInterval);
        const tickStartDate = new Date(chartStart);
        tickStartDate.setSeconds(0, 0);
        if (displayOptions.timelineUnit === 'Heures') tickStartDate.setMinutes(0);
        else tickStartDate.setHours(0, 0, 0, 0);

        doc.setFontSize(6);
        while (tickStartDate.getTime() <= chartEnd) {
            const x = chartX + ((tickStartDate.getTime() - chartStart) / totalDurationMs) * chartWidth;
            if (x >= chartX && x <= pageWidth - margin) {
                const isDayMark = displayOptions.timelineUnit === 'Jours' || tickStartDate.getHours() === 0;
                const label = isDayMark ? formatDateShort(tickStartDate) : formatTime(tickStartDate);

                if (isDayMark) {
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(...TEXT_WHITE);
                    doc.setDrawColor(60, 75, 95);
                    (doc as any).setLineDash([], 0);
                } else {
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(...TEXT_MUTED);
                    doc.setDrawColor(40, 50, 70);
                    (doc as any).setLineDash([1, 2], 0);
                }
                doc.text(label, x, y + 6, { align: 'center' });
                doc.setLineWidth(0.15);
                doc.line(x, y + timelineHeaderHeight, x, pageHeight - footerHeight);
            }
            if (displayOptions.timelineUnit === 'Jours') tickStartDate.setDate(tickStartDate.getDate() + 1);
            else tickStartDate.setHours(tickStartDate.getHours() + intervalHours);
        }
        (doc as any).setLineDash([], 0);

        // Vertical separator
        doc.setDrawColor(...LIGHT_BG);
        doc.setLineWidth(0.3);
        doc.line(chartX, y, chartX, pageHeight - footerHeight);

        return y + timelineHeaderHeight;
    };

    const drawFamilyHeader = (y: number, name: string, items: GanttItem[]) => {
        const [r, g, b] = hexToRgb(headerColor);
        // Darker family header with left accent bar
        doc.setFillColor(Math.max(0, r - 10), Math.max(0, g - 10), Math.max(0, b - 10));
        doc.rect(margin, y, pageWidth - 2 * margin, familyHeaderHeight, 'F');

        // Left accent stripe
        doc.setFillColor(...ACCENT);
        doc.rect(margin, y, 2, familyHeaderHeight, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...TEXT_WHITE);

        const dispName = name.toUpperCase() === 'CHEMINS CRITIQUES' && displayOptions.criticalPathsTitle
            ? displayOptions.criticalPathsTitle.toUpperCase() : name.toUpperCase();
        doc.text(`${dispName}  (${items.length})`, margin + 6, y + 6);

        if (displayOptions.showFamilyDetails) {
            const minT = Math.min(...items.map(t => t.start.getTime()));
            const maxT = Math.max(...items.map(t => t.end.getTime()));
            doc.setFontSize(7);
            doc.setTextColor(...TEXT_MUTED);
            doc.text(`${formatCompactDate(new Date(minT))} au ${formatCompactDate(new Date(maxT))}`, pageWidth - margin - 4, y + 6, { align: 'right' });
        }
    };

    const drawTaskRow = (y: number, item: GanttItem, index: number, dynamicRowHeight: number) => {
        // Alternating row backgrounds (dark theme)
        if (index % 2 === 0) {
            doc.setFillColor(18, 28, 47);
        } else {
            doc.setFillColor(22, 33, 55);
        }
        doc.rect(margin, y, pageWidth - 2 * margin, dynamicRowHeight, 'F');

        // Left color indicator bar
        const [cr, cg, cb] = hexToRgb(item.color);
        doc.setFillColor(cr, cg, cb);
        doc.rect(margin, y, 1.5, dynamicRowHeight, 'F');

        const textMaxWidth = leftPaneWidth - 30;

        // Task Name
        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TEXT_WHITE);
        const actionLines = doc.splitTextToSize(item.label, textMaxWidth);
        doc.text(actionLines, margin + 5, y + 5);

        // Sub info: equipment + team + manpower
        if (!item.isCriticalPath) {
            doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
            doc.setTextColor(...TEXT_MUTED);
            const persInfo = item.manpower > 0 ? ` • ${item.manpower} pers.` : '';
            const subInfo = `${item.equipment} • ${item.subTeamName || item.discipline}${persInfo}`;
            const subInfoLines = doc.splitTextToSize(subInfo, textMaxWidth);
            doc.text(subInfoLines, margin + 5, y + 5 + (actionLines.length * 3.5));
        }

        // Duration + Manpower info (right of left pane)
        doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        doc.setTextColor(...ACCENT);
        doc.text(`${item.durationHours.toFixed(1)}h`, margin + leftPaneWidth - 15, y + dynamicRowHeight / 2 - 1, { align: 'right', baseline: 'middle' });

        if (item.manpower > 0) {
            doc.setFontSize(6); doc.setFont('helvetica', 'normal');
            doc.setTextColor(...TEXT_MUTED);
            doc.text(`${item.manpower}p`, margin + leftPaneWidth - 3, y + dynamicRowHeight / 2 - 1, { align: 'right', baseline: 'middle' });
        }

        // Subtle row bottom line
        doc.setDrawColor(40, 50, 70);
        doc.setLineWidth(0.1);
        doc.line(margin, y + dynamicRowHeight, pageWidth - margin, y + dynamicRowHeight);

        // Vertical separator
        doc.setDrawColor(...LIGHT_BG);
        doc.setLineWidth(0.2);
        doc.line(chartX, y, chartX, y + dynamicRowHeight);

        // --- Gantt Bar ---
        const startMs = item.start.getTime();
        const endMs = item.end.getTime();
        const drawStartMs = Math.max(startMs, chartStart);
        const drawEndMs = Math.min(endMs, chartEnd);

        if (drawEndMs > drawStartMs) {
            const barX = chartX + ((drawStartMs - chartStart) / totalDurationMs) * chartWidth;
            const barW = Math.max(1.5, ((drawEndMs - drawStartMs) / totalDurationMs) * chartWidth);
            const barY = y + (dynamicRowHeight - barHeight) / 2;

            // Bar shadow (subtle)
            doc.setFillColor(0, 0, 0);
            doc.setGState(new (doc as any).GState({ opacity: 0.25 }));
            doc.roundedRect(barX + 0.3, barY + 0.5, barW, barHeight, 1.5, 1.5, 'F');
            doc.setGState(new (doc as any).GState({ opacity: 1 }));

            // Main bar with gradient effect (darker at bottom)
            doc.setFillColor(cr, cg, cb);
            doc.roundedRect(barX, barY, barW, barHeight, 1.5, 1.5, 'F');

            // Highlight line at top of bar
            doc.setFillColor(Math.min(255, cr + 40), Math.min(255, cg + 40), Math.min(255, cb + 40));
            doc.rect(barX + 1, barY, barW - 2, 0.8, 'F');

            // Date Label
            const labelText = `${formatCompactDate(item.start)} - ${formatCompactDate(item.end)}`;
            doc.setFontSize(5.5);
            const textWidth = doc.getTextWidth(labelText);

            const spaceRight = chartWidth - ((barX - chartX) + barW);
            const spaceLeft = barX - chartX;

            doc.setTextColor(...TEXT_MUTED);
            doc.setFont('helvetica', 'normal');

            if (spaceRight > textWidth + 2) {
                doc.text(labelText, barX + barW + 1.5, barY + barHeight / 2 + 0.5, { align: 'left', baseline: 'middle' });
            } else if (spaceLeft > textWidth + 2) {
                doc.text(labelText, barX - 1.5, barY + barHeight / 2 + 0.5, { align: 'right', baseline: 'middle' });
            } else {
                doc.text(labelText, barX + barW + 1.5, barY + barHeight / 2 + 0.5, { align: 'left', baseline: 'middle' });
            }
        }
    };

    const drawFooter = () => {
        const footerY = pageHeight - footerHeight;
        doc.setFillColor(...MEDIUM_BG);
        doc.rect(0, footerY, pageWidth, footerHeight, 'F');
        doc.setFillColor(...ACCENT);
        doc.rect(0, footerY, pageWidth, 0.5, 'F');

        // Legend
        const allDisciplines = Array.from(displayOptions.disciplineColors.keys());
        let legendX = margin + 2;
        const legendLineY = footerY + 5;

        doc.setFontSize(6);
        allDisciplines.forEach(disc => {
            if (!disc) return;
            const textWidth = doc.getTextWidth(disc);
            const itemWidth = 4 + textWidth + 5;
            if (legendX + itemWidth > pageWidth - 60) return;

            const colorHex = displayOptions.disciplineColors.get(disc)!;
            const [lr, lg, lb] = hexToRgb(colorHex);
            doc.setFillColor(lr, lg, lb);
            doc.roundedRect(legendX, legendLineY - 2, 3, 3, 0.5, 0.5, 'F');
            doc.setTextColor(...TEXT_MUTED);
            doc.text(disc, legendX + 4, legendLineY);
            legendX += itemWidth;
        });

        // Copyright + page
        doc.setFontSize(6.5);
        doc.setTextColor(...TEXT_SUBTLE);
        doc.text('Created by PlanneX', margin, footerY + 13);
        doc.setTextColor(...TEXT_MUTED);
        doc.text(`Page ${pageNumber}`, pageWidth - margin, footerY + 13, { align: 'right' });

        // Bottom accent
        doc.setFillColor(...ACCENT);
        doc.rect(0, pageHeight - 0.8, pageWidth, 0.8, 'F');
    };

    // === Render ===

    // 1. Cover page
    drawCoverPage();

    // 2. Gantt pages
    doc.addPage();
    pageNumber++;
    drawPageHeader();
    currentY = drawTimelineHeader(currentY);

    for (const groupName of sortedGroupNames) {
        const items = groupedItems[groupName];
        if (!items || items.length === 0) continue;

        if (currentY + familyHeaderHeight + baseRowHeight > pageHeight - footerHeight) {
            drawFooter();
            doc.addPage();
            pageNumber++;
            drawPageHeader();
            currentY = drawTimelineHeader(currentY);
        }

        drawFamilyHeader(currentY, groupName, items);
        currentY += familyHeaderHeight;

        items.forEach((item, idx) => {
            const textMaxWidth = leftPaneWidth - 30;
            doc.setFontSize(7.5);
            const actionLines = doc.splitTextToSize(item.label, textMaxWidth);
            let subInfoLinesCount = 0;
            if (!item.isCriticalPath) {
                doc.setFontSize(6.5);
                const persInfo = item.manpower > 0 ? ` • ${item.manpower} pers.` : '';
                const subInfo = `${item.equipment} • ${item.subTeamName || item.discipline}${persInfo}`;
                const subInfoLines = doc.splitTextToSize(subInfo, textMaxWidth);
                subInfoLinesCount = subInfoLines.length;
            }
            const dynamicRowHeight = Math.max(baseRowHeight, (actionLines.length * 3.5) + (subInfoLinesCount * 3) + 7);

            if (currentY + dynamicRowHeight > pageHeight - footerHeight) {
                drawFooter();
                doc.addPage();
                pageNumber++;
                drawPageHeader();
                currentY = drawTimelineHeader(currentY);
                drawFamilyHeader(currentY, `${groupName} (suite)`, items);
                currentY += familyHeaderHeight;
            }
            drawTaskRow(currentY, item, idx, dynamicRowHeight);
            currentY += dynamicRowHeight;
        });
        currentY += 1.5;
    }

    drawFooter();
    return doc;
};
