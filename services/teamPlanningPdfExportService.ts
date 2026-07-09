
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CalculationResults, ScheduledTask, AppParameters } from '../types';

export interface TeamPlanningExportOptions {
    includeDashboard: boolean;
    reportTitle?: string;
    reportSubtitle?: string;
    showGeneratedDate?: boolean;
    histogramStyle?: 'table' | 'cards';
    contentFilters: {
        maintenanceType: string[];
        discipline: string[];
        manpower?: number;
    };
}

// --- SHARED UTILITIES ---
const BRAND_COLORS = {
    navy: [15, 23, 42] as [number, number, number],
    slate700: [51, 65, 85] as [number, number, number],
    slate500: [100, 116, 139] as [number, number, number],
    slate300: [148, 163, 184] as [number, number, number],
    blue: [59, 130, 246] as [number, number, number],
    emerald: [16, 185, 129] as [number, number, number],
    amber: [245, 158, 11] as [number, number, number],
    purple: [139, 92, 246] as [number, number, number],
    red: [239, 68, 68] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
    lightBg: [248, 250, 252] as [number, number, number],
    cardBorder: [226, 232, 240] as [number, number, number],
};

const DISC_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#e11d48', '#a855f7', '#22c55e', '#eab308', '#0ea5e9', '#d946ef', '#64748b'];

const formatDate = (date: Date | string, withTime: boolean = true): string => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'long', year: 'numeric' };
    if (withTime) { options.hour = '2-digit'; options.minute = '2-digit'; }
    return d.toLocaleString('fr-FR', options);
};

const formatDateForTable = (date: Date, withTime: boolean = true): string => {
    if (!date || isNaN(date.getTime())) return 'N/A';
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    if (withTime) { options.hour = '2-digit'; options.minute = '2-digit'; }
    return date.toLocaleString('fr-FR', options);
};

const getLocalDateKey = (date: Date): string => {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

const hexToRgb = (hex: string): [number, number, number] => {
    const bigint = parseInt(hex.replace('#', ''), 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
};

const calculateManHoursForDay = (task: ScheduledTask, dayStartTs: number, dayEndTs: number): number => {
    const overlapStart = Math.max(task.startTime.getTime(), dayStartTs);
    const overlapEnd = Math.min(task.endTime.getTime(), dayEndTs);
    return overlapEnd > overlapStart ? ((overlapEnd - overlapStart) / (1000 * 60 * 60)) * task.manpower : 0;
};

const calculateDailyPeakManpower = (tasks: ScheduledTask[], dayStartTs: number, dayEndTs: number): number => {
    if (tasks.length === 0) return 0;
    const events: { time: number; type: 'start' | 'end'; manpower: number }[] = [];
    tasks.forEach(task => {
        const start = Math.max(task.startTime.getTime(), dayStartTs);
        const end = Math.min(task.endTime.getTime(), dayEndTs);
        if (start < end) {
            events.push({ time: start, type: 'start', manpower: task.manpower });
            events.push({ time: end, type: 'end', manpower: task.manpower });
        }
    });
    if (events.length === 0) return 0;
    events.sort((a, b) => a.time - b.time || (a.type === 'end' ? -1 : 1));
    let peak = 0, current = 0;
    for (const event of events) {
        current += event.type === 'start' ? event.manpower : -event.manpower;
        if (current > peak) peak = current;
    }
    return peak;
};

const drawSectionDivider = (doc: jsPDF, y: number, pageWidth: number, margin: number) => {
    doc.setDrawColor(...BRAND_COLORS.cardBorder);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
};

// --- CINEMATIC COVER PAGE ---
const drawTeamPlanningCoverPage = (
    doc: jsPDF,
    results: CalculationResults,
    parameters: AppParameters,
    options?: TeamPlanningExportOptions,
    filter?: { start: Date; end: Date } | null
) => {
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // Color palette
    const DARK: [number, number, number] = [8, 12, 24];
    const PANEL: [number, number, number] = [12, 18, 35];
    const EMERD: [number, number, number] = [16, 185, 129];   // emerald
    const BLUE: [number, number, number] = [59, 130, 246];
    const PURP: [number, number, number] = [168, 85, 247];
    const ORANG: [number, number, number] = [249, 115, 22];
    const RED: [number, number, number] = [239, 68, 68];
    const TWHT: [number, number, number] = [248, 250, 252];
    const TMUT: [number, number, number] = [148, 163, 184];
    const TSUB: [number, number, number] = [100, 116, 139];

    // ── 1. FULL DARK CANVAS
    doc.setFillColor(...DARK);
    doc.rect(0, 0, W, H, 'F');

    // ── 2. DIAGONAL STRIPE TEXTURE (top-right)
    doc.setDrawColor(...EMERD);
    doc.setLineWidth(0.25);
    for (let i = 0; i <= 14; i++) {
        const x0 = W * 0.55 + i * 13;
        doc.setGState(new (doc as any).GState({ opacity: 0.04 + i * 0.004 }));
        doc.line(x0, 0, x0 + H, H);
    }
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    // ── 3. LEFT ACCENT PANEL
    const pW = 18;
    doc.setFillColor(...PANEL);
    doc.rect(0, 0, pW, H, 'F');
    const aW = 3;
    doc.setFillColor(...EMERD); doc.rect(pW - aW, 0, aW, H * 0.40, 'F');
    doc.setFillColor(...BLUE); doc.rect(pW - aW, H * 0.40, aW, H * 0.25, 'F');
    doc.setFillColor(...PURP); doc.rect(pW - aW, H * 0.65, aW, H * 0.20, 'F');
    doc.setFillColor(...ORANG); doc.rect(pW - aW, H * 0.85, aW, H * 0.15, 'F');

    // ── 4. TOP BAR
    const tbH = 22;
    doc.setFillColor(...PANEL);
    doc.rect(pW, 0, W - pW, tbH, 'F');
    // Bi-color top accent line
    doc.setFillColor(...EMERD); doc.rect(pW, 0, (W - pW) * 0.55, 2, 'F');
    doc.setFillColor(...BLUE); doc.rect(pW + (W - pW) * 0.55, 0, (W - pW) * 0.45, 2, 'F');

    // Logo mark
    const lX = pW + 12, lY = tbH / 2;
    doc.setFillColor(...EMERD); doc.circle(lX, lY, 5, 'F');
    doc.setFillColor(...DARK); doc.circle(lX, lY, 3, 'F');
    doc.setFillColor(...EMERD); doc.circle(lX, lY, 1.2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...TWHT);
    doc.text('PlanneX', lX + 8, lY + 4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...EMERD);
    doc.text('I N T E L L I G E N C E   E N G I N E', lX + 8, lY + 8.5);

    // Badge top-right
    const bW = 62;
    doc.setFillColor(...EMERD);
    doc.roundedRect(W - 14 - bW, 5, bW, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...DARK);
    doc.text('CENTRE DE PILOTAGE — PDF', W - 14 - bW / 2, 12.5, { align: 'center' });

    // ── 5. CATEGORY TAG LINE
    const tY = tbH + 18;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...EMERD);
    doc.text('ORDONNANCEMENT DES RESSOURCES  /  PILOTAGE DES ÉQUIPES PAR ARRÊT', pW + 14, tY);
    doc.setDrawColor(...EMERD); doc.setLineWidth(0.4);
    doc.line(pW + 14, tY + 2, pW + 14 + 130, tY + 2);

    // ── 6. MEGA TITLE
    const mTY = tY + 22;
    const rawTitle = (options?.reportTitle || 'CENTRE DE PILOTAGE DES RESSOURCES').toUpperCase()
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

    // Subtitle
    const subY = ulY + 9;
    const subText = (options?.reportSubtitle || '').toUpperCase().replace(/[éèêë]/g, 'E').replace(/[àâ]/g, 'A').replace(/[îï]/g, 'I').replace(/[ùû]/g, 'U').replace(/ç/g, 'C').replace(/œ/g, 'OE');
    if (subText) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...TSUB);
        doc.text(subText, pW + 14, subY);
    }

    // ── 7. PERIOD PILL
    const perY = subY + 14;
    const start = filter ? filter.start : new Date(parameters.shutdownStart);
    const end = filter ? filter.end : new Date(parameters.shutdownEnd);
    const perText = `Periode : ${start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} au ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(pW + 14, perY - 6, 145, 11, 2, 2, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...TMUT);
    doc.text(perText, pW + 19, perY + 1.5);

    // ── 8. KPI STRIP (5 cards — right side)
    const totalTasks = results.scheduledTasks.length;
    const totalMH = results.kpis?.totalManHours || results.scheduledTasks.reduce((s, t) => s + (t.manHours || 0), 0);
    const totalTeams = new Set(results.scheduledTasks.map(t => t.team)).size;
    const durationH = ((end.getTime() - start.getTime()) / 3600000).toFixed(0);
    const disciplines = new Set(results.scheduledTasks.map(t => t.discipline)).size;

    const kpis = [
        { l: 'TACHES', v: String(totalTasks), c: EMERD },
        { l: 'EQUIPES', v: String(totalTeams), c: BLUE },
        { l: 'DISCIPLINES', v: String(disciplines), c: PURP },
        { l: 'CHARGE H-H', v: totalMH.toFixed(0), c: ORANG },
        { l: 'DUREE (H)', v: durationH, c: RED },
    ];
    const kpX = W * 0.60;
    const kpW = W - kpX - 14;
    const kpCW = kpW / kpis.length - 2;
    const kpY = tbH + 12;
    kpis.forEach((k, i) => {
        const cx = kpX + i * (kpCW + 2.5);
        doc.setFillColor(15, 23, 42); doc.roundedRect(cx, kpY, kpCW, 36, 2, 2, 'F');
        doc.setFillColor(...k.c); doc.rect(cx, kpY, kpCW, 2, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...TWHT);
        doc.text(k.v, cx + kpCW / 2, kpY + 17, { align: 'center' });
        doc.setFontSize(5.5); doc.setTextColor(...k.c);
        doc.text(k.l, cx + kpCW / 2, kpY + 25, { align: 'center' });
    });

    // ── 9. SECTION HEADER
    const secY = Math.max(perY + 22, mTY + tBH + 55);
    doc.setFillColor(15, 23, 42); doc.rect(pW, secY - 1, W - pW, 14, 'F');
    doc.setFillColor(...EMERD); doc.rect(pW, secY - 1, 3, 14, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...EMERD);
    doc.text('INFORMATIONS DU PROJET', pW + 10, secY + 7);

    // ── 10. METADATA GRID (2-col)
    const td = new Date();
    const gd = `${td.getDate().toString().padStart(2, '0')}/${(td.getMonth() + 1).toString().padStart(2, '0')}/${td.getFullYear()}`;
    const metas = [
        { l: 'Generated', v: gd },
        { l: 'Classification', v: 'USAGE INTERNE' },
        { l: 'Software', v: 'PlanneX Intelligence Engine' },
        { l: 'Version', v: 'v4.0 - Resource Control Edition' },
        { l: 'Format', v: 'A3 Paysage — jsPDF Render' },
        { l: 'Mode', v: filter ? 'Plage Filtree' : 'Vue Globale' },
    ];
    const mSY = secY + 16;
    const cW2 = (W - pW - 28) / 2;
    metas.forEach((r, i) => {
        const col = i % 2, ri = Math.floor(i / 2);
        const mx = pW + 14 + col * (cW2 + 4), my = mSY + ri * 10;
        if (ri % 2 === 0) { doc.setFillColor(12, 18, 35); doc.rect(mx - 2, my - 5, cW2, 10, 'F'); }
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...TSUB);
        doc.text(r.l.toUpperCase(), mx + 2, my);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(203, 213, 225);
        doc.text(r.v, mx + 38, my);
    });

    // ── 11. BOTTOM CAPSULE BAR
    const bBarY = H - 22;
    doc.setFillColor(...PANEL); doc.rect(pW, bBarY, W - pW, 22, 'F');
    doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.3); doc.line(pW, bBarY, W, bBarY);
    const caps: { t: string; c: [number, number, number] }[] = [
        { t: 'CENTRE DE PILOTAGE', c: EMERD },
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
        doc.setTextColor(...cap.c);
        doc.text(cap.t, cX + tw / 2, bBarY + 10.5, { align: 'center' });
        cX += tw + 4;
    });
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(51, 65, 85);
    doc.text('PAGE DE COUVERTURE', W - 14, bBarY + 11, { align: 'right' });

    // ── 12. CORNER MARKS
    doc.setDrawColor(...EMERD); doc.setLineWidth(0.5);
    doc.line(pW + 8, tbH + 4, pW + 13, tbH + 4);
    doc.line(pW + 8, tbH + 4, pW + 8, tbH + 9);
    doc.line(W - 14, bBarY - 8, W - 19, bBarY - 8);
    doc.line(W - 14, bBarY - 8, W - 14, bBarY - 13);
};



const drawPremiumKpiCard = (doc: jsPDF, x: number, y: number, w: number, h: number, title: string, value: string, unit: string, accentColor: [number, number, number]) => {
    // Card background
    doc.setFillColor(...BRAND_COLORS.lightBg);
    doc.setDrawColor(...BRAND_COLORS.cardBorder);
    doc.roundedRect(x, y, w, h, 2, 2, 'FD');
    // Accent stripe
    doc.setFillColor(...accentColor);
    doc.rect(x, y, 2.5, h, 'F');
    // Title
    doc.setFontSize(7); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...BRAND_COLORS.slate500);
    doc.text(title.toUpperCase(), x + 8, y + 8);
    // Value
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.setTextColor(...accentColor);
    doc.text(value, x + 8, y + 20);
    // Unit on next line
    doc.setFontSize(7); doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND_COLORS.slate500);
    doc.text(unit, x + 8, y + 25);
};

const drawHorizontalBarChart = (doc: jsPDF, x: number, y: number, w: number, h: number, data: { label: string; value: number; color: string }[], chartTitle: string) => {
    // Title
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.navy);
    doc.text(chartTitle, x, y); y += 6;

    const chartData = data.slice(0, 15);
    if (chartData.length === 0) return;
    const maxVal = Math.max(...chartData.map(d => d.value), 1);
    const labelAreaW = 48;
    const chartW = w - labelAreaW - 25;
    const rowHeight = Math.min(h / chartData.length, 10);
    const barHeight = rowHeight * 0.65;

    chartData.forEach((d, i) => {
        const barY = y + (i * rowHeight) + (rowHeight - barHeight) / 2;
        const barW = Math.max(1, (d.value / maxVal) * chartW);
        // Label
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BRAND_COLORS.slate700);
        doc.text(d.label, x + labelAreaW - 3, barY + barHeight / 2, { align: 'right', baseline: 'middle', maxWidth: labelAreaW - 4 });
        // Bar
        const [r, g, b] = hexToRgb(d.color);
        doc.setFillColor(r, g, b);
        doc.roundedRect(x + labelAreaW, barY, barW, barHeight, 1, 1, 'F');
        // Value
        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.slate700);
        doc.text(d.value.toFixed(1), x + labelAreaW + barW + 2, barY + barHeight / 2, { align: 'left', baseline: 'middle' });
    });
};

const drawVerticalBarChart = (doc: jsPDF, x: number, y: number, w: number, h: number, data: { label: string; value: number; color: string }[], chartTitle: string) => {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.navy);
    doc.text(chartTitle, x, y); y += 4;

    const chartData = data.slice(0, 12);
    if (chartData.length === 0) return;
    const maxVal = Math.max(...chartData.map(d => d.value), 1);
    const chartH = h - 15;
    const barSpacing = w / chartData.length;
    const barW = barSpacing * 0.6;

    // Y axis
    doc.setDrawColor(...BRAND_COLORS.cardBorder); doc.setLineWidth(0.2);
    doc.line(x, y, x, y + chartH);
    doc.line(x, y + chartH, x + w, y + chartH);

    chartData.forEach((d, i) => {
        const barH = (d.value / maxVal) * chartH;
        const barX = x + (i * barSpacing) + (barSpacing - barW) / 2;
        const barY = y + chartH - barH;
        const [r, g, b] = hexToRgb(d.color);
        doc.setFillColor(r, g, b);
        doc.roundedRect(barX, barY, barW, barH, 1, 1, 'F');
        // Value on top
        doc.setFontSize(7); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.navy);
        doc.text(String(d.value), barX + barW / 2, barY - 2, { align: 'center' });
        // Label below
        doc.setFontSize(5.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BRAND_COLORS.slate500);
        const labelLines = doc.splitTextToSize(d.label, barSpacing - 2);
        doc.text(labelLines, barX + barW / 2, y + chartH + 3, { align: 'center' });
    });
};

// --- PAGE 1: EXECUTIVE SUMMARY ---
const generateExecutiveSummaryPage = async (doc: jsPDF, results: CalculationResults, parameters: AppParameters, title: string, options?: TeamPlanningExportOptions) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let currentY = margin;

    // Data
    const start = new Date(parameters.shutdownStart);
    const end = new Date(parameters.shutdownEnd);
    const durationDays = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);
    const totalTasks = results.kpis.totalTasks;
    const totalManHours = results.kpis.totalManHours;
    const disciplines = Array.from(new Set(results.scheduledTasks.map(t => t.discipline))).sort();
    const disciplineColorMap = new Map(disciplines.map((d, i) => [d, DISC_COLORS[i % DISC_COLORS.length]]));
    const totalTeams = new Set(results.scheduledTasks.map(t => t.team)).size;
    const totalPeople = disciplines.reduce((sum, disc) => {
        const teams = new Set(results.scheduledTasks.filter(t => t.discipline === disc).map(t => t.team));
        let discPeople = 0;
        teams.forEach(team => {
            const teamTasks = results.scheduledTasks.filter(t => t.team === team);
            discPeople += calculateDailyPeakManpower(teamTasks, 0, Infinity);
        });
        return sum + discPeople;
    }, 0);

    const manHoursByDiscipline = disciplines.map(d => ({
        label: d,
        value: results.scheduledTasks.filter(t => t.discipline === d).reduce((sum, t) => sum + t.manHours, 0),
        color: disciplineColorMap.get(d)!
    })).sort((a, b) => b.value - a.value);

    const taskCountByDiscipline = disciplines.map(d => ({
        label: d,
        value: results.scheduledTasks.filter(t => t.discipline === d).length,
        color: disciplineColorMap.get(d)!
    })).sort((a, b) => b.value - a.value);

    // === HEADER BANNER ===
    doc.setFillColor(...BRAND_COLORS.navy);
    doc.rect(0, 0, pageWidth, 28, 'F');
    // Accent line
    doc.setFillColor(...BRAND_COLORS.emerald);
    doc.rect(0, 28, pageWidth, 1.5, 'F');

    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.white);
    doc.text((options?.reportTitle || 'CENTRE DE PILOTAGE DES RESSOURCES').toUpperCase(), margin, 12);
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BRAND_COLORS.slate300);
    doc.text(`${options?.reportSubtitle || title}  •  Période: ${formatDate(start, false)} au ${formatDate(end, false)}`, margin, 20);

    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.white);
    doc.text('SYNTHÈSE EXÉCUTIVE', pageWidth - margin, 12, { align: 'right' });
    if (options?.showGeneratedDate !== false) {
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BRAND_COLORS.slate300);
        doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - margin, 18, { align: 'right' });
    }

    currentY = 38;

    // === KPI CARDS ROW ===
    const durationHours = durationDays * 24;
    const cardW = (pageWidth - 2 * margin - 4 * 5) / 5;
    const cardH = 28;
    drawPremiumKpiCard(doc, margin, currentY, cardW, cardH, 'Durée', `${durationHours.toFixed(0)}h`, `(${durationDays.toFixed(1)} jours)`, BRAND_COLORS.blue);
    drawPremiumKpiCard(doc, margin + (cardW + 5), currentY, cardW, cardH, 'Tâches', String(totalTasks), 'planifiées', BRAND_COLORS.emerald);
    drawPremiumKpiCard(doc, margin + 2 * (cardW + 5), currentY, cardW, cardH, 'Charge Totale', totalManHours.toFixed(0), 'Heures-Homme', BRAND_COLORS.amber);
    drawPremiumKpiCard(doc, margin + 3 * (cardW + 5), currentY, cardW, cardH, 'Équipes', String(totalTeams), 'mobilisées', BRAND_COLORS.purple);
    drawPremiumKpiCard(doc, margin + 4 * (cardW + 5), currentY, cardW, cardH, 'Effectif', String(totalPeople), 'personnes', BRAND_COLORS.red);
    currentY += 36;

    // === TWO COLUMN LAYOUT ===
    const colGap = 12;
    const leftColW = (pageWidth - 2 * margin - colGap) * 0.50;
    const rightColW = (pageWidth - 2 * margin - colGap) * 0.50;
    const rightColX = margin + leftColW + colGap;

    // LEFT: Workload bar chart
    drawHorizontalBarChart(doc, margin, currentY, leftColW, 100, manHoursByDiscipline, "Répartition de la Charge de Travail (H-H)");

    // RIGHT: Tasks vertical bar chart
    drawVerticalBarChart(doc, rightColX, currentY, rightColW, 100, taskCountByDiscipline, "Nombre de Tâches par Discipline");

    currentY += 110;
    drawSectionDivider(doc, currentY, pageWidth, margin);
    currentY += 6;

    // === SUMMARY TABLE ===
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.navy);
    doc.text("Tableau de Synthèse par Discipline", margin, currentY);
    currentY += 3;

    autoTable(doc, {
        startY: currentY,
        head: [['Discipline', 'Tâches', 'Heures-Homme', 'Équipes', 'Effectif Pic']],
        body: manHoursByDiscipline.map(d => {
            const disc = d.label;
            const teams = new Set(results.scheduledTasks.filter(t => t.discipline === disc).map(t => t.team));
            let people = 0;
            teams.forEach(team => {
                const tt = results.scheduledTasks.filter(t => t.team === team);
                people += calculateDailyPeakManpower(tt, 0, Infinity);
            });
            return [
                disc,
                String(results.scheduledTasks.filter(t => t.discipline === disc).length),
                d.value.toFixed(1),
                String(teams.size),
                String(people)
            ];
        }),
        theme: 'grid',
        headStyles: { fillColor: BRAND_COLORS.navy as any, fontSize: 8, font: 'helvetica', fontStyle: 'bold', textColor: BRAND_COLORS.white as any, cellPadding: 2.5 },
        styles: { fontSize: 8, cellPadding: 2.5, font: 'helvetica' },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        foot: [[
            { content: 'TOTAL', styles: { fontStyle: 'bold' } },
            { content: String(totalTasks), styles: { halign: 'center' as const, fontStyle: 'bold' } },
            { content: totalManHours.toFixed(1), styles: { halign: 'right' as const, fontStyle: 'bold' } },
            { content: String(totalTeams), styles: { halign: 'center' as const, fontStyle: 'bold' } },
            { content: String(totalPeople), styles: { halign: 'center' as const, fontStyle: 'bold' } },
        ]],
        footStyles: { fillColor: [226, 232, 240] as any, textColor: BRAND_COLORS.navy as any, fontSize: 8 }
    });
};

// --- PAGE 2: ORGANIZATIONAL STRUCTURE ---
const generateOrganizationalPage = (doc: jsPDF, results: CalculationResults, parameters: AppParameters) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let currentY = margin;

    // Header
    doc.setFillColor(...BRAND_COLORS.navy);
    doc.rect(0, 0, pageWidth, 22, 'F');
    doc.setFillColor(...BRAND_COLORS.amber);
    doc.rect(0, 22, pageWidth, 1.2, 'F');
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.white);
    doc.text("STRUCTURE ORGANISATIONNELLE", margin, 14);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BRAND_COLORS.slate300);
    doc.text("Répartition des équipes par discipline et composition", pageWidth - margin, 14, { align: 'right' });
    currentY = 30;

    const disciplines = Array.from(new Set(results.scheduledTasks.map(t => t.discipline))).sort();
    const orgData: { discipline: string; teams: string[]; breakdown: { size: number; count: number }[]; totalPeople: number; color: string }[] = [];

    disciplines.forEach((disc, i) => {
        const teams = Array.from(new Set(results.scheduledTasks.filter(t => t.discipline === disc).map(t => t.team)));
        const sizeMap: Record<number, number> = {};
        let totalP = 0;
        teams.forEach(team => {
            const tt = results.scheduledTasks.filter(t => t.team === team);
            const peak = calculateDailyPeakManpower(tt, 0, Infinity);
            sizeMap[peak] = (sizeMap[peak] || 0) + 1;
            totalP += peak;
        });
        const breakdown = Object.entries(sizeMap).map(([s, c]) => ({ size: parseInt(s), count: c })).sort((a, b) => a.size - b.size);
        orgData.push({ discipline: disc, teams, breakdown, totalPeople: totalP, color: DISC_COLORS[i % DISC_COLORS.length] });
    });

    // Draw org cards in a grid with uniform spacing
    const cardCols = 3;
    const cardGap = 8;
    const cardW = (pageWidth - 2 * margin - (cardCols - 1) * cardGap) / cardCols;
    // Compute uniform card height based on max breakdown lines
    const maxBreakdownLines = Math.max(...orgData.map(d => d.breakdown.length), 1);
    const cardH = 22 + maxBreakdownLines * 5 + 4;

    orgData.forEach((d, i) => {
        const col = i % cardCols;
        const row = Math.floor(i / cardCols);
        const cx = margin + col * (cardW + cardGap);
        const cy = currentY + row * (cardH + cardGap);

        if (cy + cardH > doc.internal.pageSize.getHeight() - 20) return;

        // Card
        doc.setFillColor(...BRAND_COLORS.lightBg);
        doc.setDrawColor(...BRAND_COLORS.cardBorder);
        doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'FD');
        // Color indicator
        const [cr, cg, cb] = hexToRgb(d.color);
        doc.setFillColor(cr, cg, cb);
        doc.roundedRect(cx, cy, 3, cardH, 1, 1, 'F');

        // Title
        doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.navy);
        doc.text(d.discipline.toUpperCase(), cx + 8, cy + 7, { maxWidth: cardW - 12 });

        // Stats row
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BRAND_COLORS.slate500);
        doc.text(`${d.teams.length} équipes`, cx + 8, cy + 13);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(cr, cg, cb);
        doc.text(`${d.totalPeople} pers.`, cx + 8 + 30, cy + 13);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(...BRAND_COLORS.slate500);
        doc.text(`Moy: ${d.totalPeople > 0 ? (d.totalPeople / d.teams.length).toFixed(1) : '0'}/éq.`, cx + 8 + 55, cy + 13);

        // Breakdown lines
        let lineY = cy + 20;
        doc.setDrawColor(...BRAND_COLORS.cardBorder);
        doc.line(cx + 6, lineY - 2, cx + cardW - 4, lineY - 2);
        d.breakdown.forEach(b => {
            doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BRAND_COLORS.slate700);
            doc.text(`${b.count} équipe${b.count > 1 ? 's' : ''} de ${b.size} personne${b.size > 1 ? 's' : ''}`, cx + 8, lineY + 2);
            doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.slate500);
            doc.text(`= ${b.size * b.count}`, cx + cardW - 8, lineY + 2, { align: 'right' });
            lineY += 5;
        });
    });
};

// --- PAGE 2.5: MOBILIZATION DASHBOARD ---
const generateMobilizationDashboardPage = (doc: jsPDF, results: CalculationResults, parameters: AppParameters, options?: TeamPlanningExportOptions) => {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = margin;

    // Header
    doc.setFillColor(...BRAND_COLORS.navy);
    doc.rect(0, 0, pageWidth, 22, 'F');
    doc.setFillColor(...BRAND_COLORS.emerald);
    doc.rect(0, 22, pageWidth, 1.2, 'F');
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.white);
    doc.text("PLAN DE MOBILISATION DES RESSOURCES", margin, 14);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BRAND_COLORS.slate300);
    doc.text("Par discipline — Calendrier de mobilisation et recrutements", pageWidth - margin, 14, { align: 'right' });
    currentY = 35;

    // 1. Identify Multi-Discipline tasks to include in math
    const multiDisciplineGroupMap = new Map<string, ScheduledTask[]>();
    const candidateGroups = new Map<string, ScheduledTask[]>();
    for (const t of results.scheduledTasks) {
        if ((t as any).multiDisciplineId) {
            const mid = String((t as any).multiDisciplineId);
            if (!multiDisciplineGroupMap.has(mid)) multiDisciplineGroupMap.set(mid, []);
            multiDisciplineGroupMap.get(mid)!.push(t);
            continue;
        }
        const key = `${t.action.trim()}|${t.equipment.trim()}|${t.startTime.getTime()}|${t.endTime.getTime()}`;
        if (!candidateGroups.has(key)) candidateGroups.set(key, []);
        candidateGroups.get(key)!.push(t);
    }
    for (const [key, group] of candidateGroups) {
        const uniqueDisciplines = new Set(group.map(t => t.discipline));
        if (uniqueDisciplines.size > 1) multiDisciplineGroupMap.set(key, group);
    }

    // 2. Extract Days
    const days: string[] = [];
    const start = new Date(parameters.shutdownStart); start.setHours(0, 0, 0, 0);
    const end = new Date(Math.max(new Date(parameters.shutdownEnd).getTime(), ...results.scheduledTasks.map(t => t.endTime.getTime()))); end.setHours(23, 59, 59, 999);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        days.push(getLocalDateKey(d));
    }

    const disciplines = Array.from(new Set(results.scheduledTasks.map(t => t.discipline))).sort();

    for (const disciplineName of disciplines) {
        if (currentY > doc.internal.pageSize.getHeight() - 80) {
            doc.addPage('a3', 'l');
            currentY = margin;
            
            doc.setFillColor(...BRAND_COLORS.navy);
            doc.rect(0, 0, pageWidth, 14, 'F');
            doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.white);
            doc.text("PLAN DE MOBILISATION DES RESSOURCES (SUITE)", margin, 9);
            currentY = 25;
        }

        const disciplineTasks = results.scheduledTasks.filter(t => t.discipline === disciplineName);
        if (disciplineTasks.length === 0) continue;

        const tableBody: any[][] = [];
        let totalGlobalAEmbaucher = 0;

        for (const dayKey of days) {
            const dayStartTs = new Date(dayKey).getTime();
            const dayEndTs = new Date(dayKey).setHours(23, 59, 59, 999);
            
            const dayTasks = disciplineTasks.filter(t => t.startTime.getTime() < dayEndTs && t.endTime.getTime() > dayStartTs);
            const teamsOnThisDay = Array.from(new Set(dayTasks.map(t => t.team)));
            
            let dejaSurSite = 0;
            let nouveauxArrivants = 0;

            for (const teamName of teamsOnThisDay) {
                const allTeamTasks = disciplineTasks.filter(t => t.team === teamName);
                const firstTaskStart = Math.min(...allTeamTasks.map(t => t.startTime.getTime()));
                const teamTasksOnDay = dayTasks.filter(t => t.team === teamName);
                const teamManpower = teamTasksOnDay[0]?.manpower || 0;
                
                if (firstTaskStart < dayStartTs) {
                    dejaSurSite += teamManpower;
                } else {
                    nouveauxArrivants += teamManpower;
                }
            }

            let multiDisciplineManpower = 0;
            for (const group of multiDisciplineGroupMap.values()) {
                const involvesCurrentDiscipline = group.some(t => t.discipline === disciplineName);
                if (involvesCurrentDiscipline) {
                    const firstTask = group[0];
                    if (firstTask.startTime.getTime() < dayEndTs && firstTask.endTime.getTime() > dayStartTs) {
                        const discManpower = group
                            .filter(t => t.discipline === disciplineName)
                            .reduce((sum, t) => sum + (t.manpower || 0), 0);
                        multiDisciplineManpower += discManpower;
                    }
                }
            }

            const totalActif = dejaSurSite + nouveauxArrivants + multiDisciplineManpower;
            if (totalActif > totalGlobalAEmbaucher) {
                totalGlobalAEmbaucher = totalActif;
            }

            if (totalActif > 0) {
                const dt = new Date(dayKey);
                const dateStr = dt.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
                
                tableBody.push([
                    dateStr,
                    `${dejaSurSite} pers.`,
                    `${nouveauxArrivants} pers.`,
                    `${multiDisciplineManpower} pers.`,
                    `${totalActif} pers.`
                ]);
            }
        }

        const bannerHeight = 16;
        const bannerW = pageWidth - 2 * margin;

        // 1. Draw rounded banner background
        doc.setFillColor(248, 250, 252); // lightBg
        doc.setDrawColor(226, 232, 240); // cardBorder
        doc.roundedRect(margin, currentY, bannerW, bannerHeight, 2, 2, 'FD');

        // 2. Colored accent line on the left
        doc.setFillColor(...BRAND_COLORS.blue);
        doc.roundedRect(margin, currentY, 3, bannerHeight, 1.5, 1.5, 'F');

        // 3. Discipline Name
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.navy);
        doc.text(disciplineName.toUpperCase(), margin + 10, currentY + 10.5);

        // 4. "KPI" Pill for the Total on the right
        const kpiText = `${totalGlobalAEmbaucher} PERS. À EMBAUCHER`;
        doc.setFontSize(9); doc.setFont('helvetica', 'bold');
        const kpiW = doc.getTextWidth(kpiText) + 12;
        
        doc.setFillColor(249, 115, 22); // Orange for high visibility action
        doc.roundedRect(margin + bannerW - kpiW - 4, currentY + 3, kpiW, bannerHeight - 6, (bannerHeight - 6) / 2, (bannerHeight - 6) / 2, 'F');
        
        doc.setTextColor(...BRAND_COLORS.white);
        doc.text(kpiText, margin + bannerW - kpiW / 2 - 4, currentY + 10.2, { align: 'center' });

        currentY += bannerHeight + 6;

        autoTable(doc, {
            startY: currentY,
            margin: { left: margin, right: margin },
            theme: 'plain',
            headStyles: { fontStyle: 'bold', textColor: BRAND_COLORS.slate500 as any, fontSize: 8, cellPadding: { top: 4, bottom: 4, left: 2, right: 2 } },
            head: [['Date', 'Déjà sur site', 'Nouveaux Arrivants (À Embaucher)', 'Multi-Discipline', 'Total Actif']],
            body: tableBody,
            styles: { fontSize: 9, cellPadding: { top: 5, bottom: 5, left: 2, right: 2 }, textColor: BRAND_COLORS.navy as any, font: 'helvetica' },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 80 },
                1: { textColor: BRAND_COLORS.slate500 as any },
                2: { textColor: [249, 115, 22] as any, fontStyle: 'bold' }, // Orange text
                3: { textColor: BRAND_COLORS.slate300 as any },
                4: { fontStyle: 'bold', textColor: BRAND_COLORS.blue as any }
            },
            didDrawCell: data => {
                if (data.row.index === data.table.body.length - 1 || data.section === 'head') {
                    doc.setDrawColor(226, 232, 240);
                    doc.setLineWidth(0.5);
                    doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
                } else if (data.section === 'body') {
                    doc.setDrawColor(241, 245, 249);
                    doc.setLineWidth(0.3);
                    doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height);
                }
            }
        });
        currentY = (doc as any).lastAutoTable.finalY + 15;
    }
};

// --- PAGE 3: DAILY STAFF HISTOGRAM ---
const generateResourceAnalysisPage = (doc: jsPDF, results: CalculationResults, parameters: AppParameters, options?: TeamPlanningExportOptions) => {
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = margin;

    // Header
    doc.setFillColor(...BRAND_COLORS.navy);
    doc.rect(0, 0, pageWidth, 22, 'F');
    doc.setFillColor(...BRAND_COLORS.blue);
    doc.rect(0, 22, pageWidth, 1.2, 'F');
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.white);
    doc.text("HISTOGRAMME DES EFFECTIFS JOURNALIERS", margin, 14);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BRAND_COLORS.slate300);
    doc.text("Par discipline — Basé sur les équipes (pic de mobilisation)", pageWidth - margin, 14, { align: 'right' });
    currentY = 30;

    // Data
    const dailyManpower: Record<string, Record<string, number>> = {};
    const disciplines = new Set<string>();
    const days: string[] = [];
    const start = new Date(parameters.shutdownStart); start.setHours(0, 0, 0, 0);
    const end = new Date(Math.max(new Date(parameters.shutdownEnd).getTime(), ...results.scheduledTasks.map(t => t.endTime.getTime()))); end.setHours(23, 59, 59, 999);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayKey = getLocalDateKey(d); days.push(dayKey); dailyManpower[dayKey] = {};
    }
    results.scheduledTasks.forEach(t => disciplines.add(t.discipline));
    const sortedDisciplines = Array.from(disciplines).sort();
    const colorMap = new Map(sortedDisciplines.map((d, i) => [d, DISC_COLORS[i % DISC_COLORS.length]]));

    days.forEach(dayKey => {
        const dayStart = new Date(dayKey).getTime();
        const dayEndTs = new Date(dayKey).setHours(23, 59, 59, 999);
        const tasksOnDay = results.scheduledTasks.filter(t => t.startTime.getTime() < dayEndTs && t.endTime.getTime() > dayStart);
        const tasksByTeam: Record<string, ScheduledTask[]> = {};
        tasksOnDay.forEach(task => { if (!tasksByTeam[task.team]) tasksByTeam[task.team] = []; tasksByTeam[task.team].push(task); });
        const peakByDiscipline: Record<string, number> = Object.fromEntries(sortedDisciplines.map(d => [d, 0]));
        Object.values(tasksByTeam).forEach(teamTasks => {
            if (teamTasks.length > 0) {
                peakByDiscipline[teamTasks[0].discipline] += calculateDailyPeakManpower(teamTasks, dayStart, dayEndTs);
            }
        });
        dailyManpower[dayKey] = peakByDiscipline;
    });

    // === STACKED BAR CHART ===
    const chartX = margin + 8; const chartY = currentY + 3; const chartW = pageWidth - margin * 2 - 8; const chartH = 80;
    const maxManpower = Math.max(...days.map(day => Object.values(dailyManpower[day]).reduce((a, b) => a + b, 0)), 1) * 1.15;
    const barTotalW = chartW / days.length;
    const barW = barTotalW * 0.7;

    // Y axis grid lines
    doc.setDrawColor(...BRAND_COLORS.cardBorder); doc.setLineWidth(0.15);
    const yAxisSteps = 5;
    for (let i = 0; i <= yAxisSteps; i++) {
        const gridY = chartY + chartH - (i / yAxisSteps) * chartH;
        doc.line(chartX, gridY, chartX + chartW, gridY);
        doc.setFontSize(6); doc.setTextColor(...BRAND_COLORS.slate500);
        doc.text(Math.round((i / yAxisSteps) * maxManpower).toString(), chartX - 2, gridY + 1, { align: 'right' });
    }

    // Bars
    days.forEach((day, i) => {
        let barBottom = chartY + chartH;
        const dayX = chartX + (i * barTotalW) + (barTotalW - barW) / 2;
        sortedDisciplines.forEach(disc => {
            const val = dailyManpower[day][disc] || 0;
            if (val > 0) {
                const barH = (val / maxManpower) * chartH;
                const [r, g, b] = hexToRgb(colorMap.get(disc)!);
                doc.setFillColor(r, g, b);
                doc.rect(dayX, barBottom - barH, barW, barH, 'F');
                barBottom -= barH;
            }
        });
        // Total on top
        const dayTotal = Object.values(dailyManpower[day]).reduce((a, b) => a + b, 0);
        if (dayTotal > 0) {
            doc.setFontSize(5.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.navy);
            doc.text(String(dayTotal), dayX + barW / 2, barBottom - 1.5, { align: 'center' });
        }
        // Date label
        const dt = new Date(day);
        doc.setFontSize(5.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BRAND_COLORS.slate500);
        doc.text(`${dt.getDate().toString().padStart(2, '0')}/${(dt.getMonth() + 1).toString().padStart(2, '0')}`, dayX + barW / 2, chartY + chartH + 4, { align: 'center' });
    });

    // Legend
    currentY = chartY + chartH + 10;
    let legendX = margin;
    sortedDisciplines.forEach(disc => {
        const tw = doc.getTextWidth(disc);
        if (legendX + tw + 12 > pageWidth - margin) { legendX = margin; currentY += 5; }
        const [r, g, b] = hexToRgb(colorMap.get(disc)!);
        doc.setFillColor(r, g, b);
        doc.roundedRect(legendX, currentY - 2, 3, 3, 0.5, 0.5, 'F');
        doc.setFontSize(7); doc.setTextColor(...BRAND_COLORS.slate700);
        doc.text(disc, legendX + 5, currentY);
        legendX += tw + 14;
    });

    currentY += 10;

    // === DETAILED DATA (Cards or Table based on options) ===
    const useCards = options?.histogramStyle === 'cards';

    if (useCards) {
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.navy);
        doc.text('Effectifs par Discipline (Pic Journalier)', margin, currentY);
        currentY += 6;

        days.forEach(day => {
            const dt = new Date(day);
            const dayTotal = Object.values(dailyManpower[day]).reduce((a, b) => a + b, 0);
            if (dayTotal === 0) return;

            if (currentY > doc.internal.pageSize.getHeight() - 45) {
                doc.addPage('a3', 'l');
                currentY = margin;
            }

            doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.navy);
            const dateLabel = dt.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
            doc.text(dateLabel, margin, currentY);
            // Underline the date
            const dateLabelWidth = doc.getTextWidth(dateLabel);
            doc.setDrawColor(...BRAND_COLORS.blue); doc.setLineWidth(0.5);
            doc.line(margin, currentY + 1.5, margin + dateLabelWidth, currentY + 1.5);
            currentY += 6;

            const activeDisciplines = sortedDisciplines.filter(d => (dailyManpower[day][d] || 0) > 0);
            const cols = Math.min(6, activeDisciplines.length);
            const cGap = 4;
            const cW = Math.min((pageWidth - 2 * margin - (cols - 1) * cGap) / cols, 60);
            const cH = 16;

            activeDisciplines.forEach((disc, idx) => {
                const col = idx % cols;
                const row = Math.floor(idx / cols);
                const cx = margin + col * (cW + cGap);
                const cy = currentY + row * (cH + cGap);

                doc.setFillColor(...BRAND_COLORS.lightBg);
                doc.setDrawColor(...BRAND_COLORS.cardBorder);
                doc.roundedRect(cx, cy, cW, cH, 1.5, 1.5, 'FD');

                const [cr, cg, cb] = hexToRgb(colorMap.get(disc)!);
                doc.setFillColor(cr, cg, cb);
                doc.rect(cx, cy, 2, cH, 'F');

                doc.setFontSize(5.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.slate700);
                doc.text(disc.toUpperCase(), cx + 5, cy + 5, { maxWidth: cW - 22 });

                doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.navy);
                doc.text(String(dailyManpower[day][disc] || 0), cx + cW - 4, cy + cH / 2 + 2, { align: 'right' });

                doc.setFontSize(5); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BRAND_COLORS.slate500);
                doc.text('pic', cx + cW - 4, cy + cH - 2, { align: 'right' });
            });

            const totalRows = Math.ceil(activeDisciplines.length / cols);
            currentY += totalRows * (cH + cGap) + 4;
        });
    } else {
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.navy);
        doc.text('Tableau D\u00e9taill\u00e9 des Effectifs (Pic Journalier)', margin, currentY);
        currentY += 3;

        const tableHead = [['Discipline', ...days.map(d => { const dt = new Date(d); return `${dt.getDate()}/${dt.getMonth() + 1}`; })]];
        const tableBody = sortedDisciplines.map(disc => [disc, ...days.map(day => {
            const v = dailyManpower[day][disc] || 0;
            return v > 0 ? String(v) : '-';
        })]);
        tableBody.push(['TOTAL', ...days.map(day => String(Object.values(dailyManpower[day]).reduce((a, b) => a + b, 0)))]);

        autoTable(doc, {
            startY: currentY,
            head: tableHead,
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: BRAND_COLORS.navy as any, fontSize: 7, halign: 'center', textColor: BRAND_COLORS.white as any, cellPadding: 1.5 },
            styles: { fontSize: 7, cellPadding: 1.5, halign: 'center', font: 'helvetica' },
            columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 40 } },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            didParseCell: data => {
                if (data.section === 'body' && data.row.index === tableBody.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [226, 232, 240];
                    data.cell.styles.textColor = BRAND_COLORS.navy;
                }
            }
        });
    }
};

// --- PAGE 4: MULTI-DISCIPLINE COMBINED MISSIONS ---
const generateMultiDisciplinePage = (doc: jsPDF, results: CalculationResults, isColdStopFlow: boolean) => {
    const combinedTasks = results.scheduledTasks.filter(t => t.multiDisciplineId);
    if (combinedTasks.length === 0) return;

    doc.addPage('a3', 'l');
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = margin;

    // Header
    doc.setFillColor(...BRAND_COLORS.navy);
    doc.rect(0, 0, pageWidth, 22, 'F');
    doc.setFillColor(...BRAND_COLORS.purple);
    doc.rect(0, 22, pageWidth, 1.2, 'F');
    doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.white);
    doc.text("TÂCHES MULTI-DISCIPLINES (MISSIONS COMBINÉES)", margin, 14);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BRAND_COLORS.slate300);
    doc.text("Missions nécessitant une coordination inter-équipes", pageWidth - margin, 14, { align: 'right' });
    currentY = 32;

    const groupedByMission: Record<string, ScheduledTask[]> = {};
    combinedTasks.forEach(t => {
        if (!groupedByMission[t.multiDisciplineId!]) groupedByMission[t.multiDisciplineId!] = [];
        groupedByMission[t.multiDisciplineId!].push(t);
    });

    const missionsList = Object.values(groupedByMission).sort((a, b) => a[0].startTime.getTime() - b[0].startTime.getTime());

    for (const missionTasks of missionsList) {
        if (currentY > doc.internal.pageSize.getHeight() - 40) {
            doc.addPage('a3', 'l');
            currentY = margin + 10;
        }

        const missionStart = new Date(Math.min(...missionTasks.map(t => t.startTime.getTime())));
        const missionEnd = new Date(Math.max(...missionTasks.map(t => t.endTime.getTime())));
        const mainTaskName = missionTasks[0].action || 'Mission Combinée';

        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.purple);
        doc.text(mainTaskName.toUpperCase(), margin, currentY);
        currentY += 5;

        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(...BRAND_COLORS.slate500);
        doc.text(`Période: ${formatDate(missionStart)} → ${formatDate(missionEnd)}`, margin, currentY);
        currentY += 4;

        const tableBody = missionTasks.map(t => [
            isColdStopFlow ? t.discipline : t.team,
            t.action,
            formatDateForTable(t.startTime),
            formatDateForTable(t.endTime),
            String(t.manpower),
            t.duration.toFixed(1) + 'h'
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [['Discipline / Équipe', 'Action Spécifique', 'Début', 'Fin', 'Pers.', 'Durée']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: BRAND_COLORS.purple as any, textColor: 255 as any, fontSize: 8, fontStyle: 'bold' },
            styles: { fontSize: 7, cellPadding: 2, font: 'helvetica' },
            columnStyles: { 0: { cellWidth: 50 }, 1: { cellWidth: 'auto' }, 2: { cellWidth: 30 }, 3: { cellWidth: 30 }, 4: { cellWidth: 15, halign: 'right' }, 5: { cellWidth: 15, halign: 'right' } },
            alternateRowStyles: { fillColor: [248, 250, 252] as any }
        });

        currentY = (doc as any).lastAutoTable.finalY + 12;
    }
};

// --- MAIN UNIFIED EXPORT FUNCTION ---
export const exportTeamPlanningToPDF = async (
    results: CalculationResults,
    parameters: AppParameters,
    title: string,
    isColdStopFlow: boolean,
    filter?: { start: Date; end: Date } | null,
    options?: TeamPlanningExportOptions
): Promise<jsPDF> => {
    return new Promise(async (resolve, reject) => {
        try {
            let tasksToExport = results.scheduledTasks;
            if (options?.contentFilters) {
                const { maintenanceType, manpower } = options.contentFilters;
                if (maintenanceType.length > 0) tasksToExport = tasksToExport.filter(t => t.maintenanceType && maintenanceType.includes(t.maintenanceType));
                if (manpower !== undefined && !isNaN(manpower)) tasksToExport = tasksToExport.filter(t => t.manpower === manpower);
            }

            // Dashboard-specific tasks (applies discipline filter as well)
            let dashboardTasksToExport = [...tasksToExport];
            if (options?.contentFilters?.discipline) {
                dashboardTasksToExport = dashboardTasksToExport.filter(t => options.contentFilters.discipline.includes(t.discipline));
            }

            const filteredResults: CalculationResults = {
                ...results,
                scheduledTasks: tasksToExport,
                kpis: { ...results.kpis, totalTasks: tasksToExport.length, totalManHours: tasksToExport.reduce((sum, t) => sum + t.manHours, 0) }
            };

            const dashboardFilteredResults: CalculationResults = {
                ...results,
                scheduledTasks: dashboardTasksToExport,
                kpis: { ...results.kpis, totalTasks: dashboardTasksToExport.length, totalManHours: dashboardTasksToExport.reduce((sum, t) => sum + t.manHours, 0) }
            };

            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });

            // ── COVER PAGE (always first) ──────────────────────────────────────
            drawTeamPlanningCoverPage(doc, filteredResults, parameters, options, filter);

            if (options?.includeDashboard) {
                doc.addPage('a3', 'l');
                await generateExecutiveSummaryPage(doc, dashboardFilteredResults, parameters, title, options);
                doc.addPage('a3', 'l');
                generateOrganizationalPage(doc, dashboardFilteredResults, parameters);
                doc.addPage('a3', 'l');
                generateMobilizationDashboardPage(doc, dashboardFilteredResults, parameters, options);
                doc.addPage('a3', 'l');
                generateResourceAnalysisPage(doc, dashboardFilteredResults, parameters, options);
                generateMultiDisciplinePage(doc, filteredResults, isColdStopFlow);
            }

            // ── DISCIPLINE-FIRST GROUPING ─────────────────────────────────────
            // Multi-discipline tasks (multiDisciplineId is set) are grouped into a
            // dedicated "TÂCHES MULTI-DISCIPLINES" section so the supervisor sees
            // them once, clearly identified.  All single-discipline tasks follow in
            // the normal discipline → team hierarchy.

            const allTasksForRoadmap = filteredResults.scheduledTasks;
            const roadmapMargin = 15;
            const pw = 420;

            // ── 1. Separate multi-discipline tasks ───────────────────────────
            const multiDisciplineGroupMap = new Map<string, ScheduledTask[]>();
            const singleDisciplineTasks: ScheduledTask[] = [];

            // Dynamically group tasks by Action + Equipment + StartTime + EndTime
            // to detect implicitly multi-discipline tasks from Excel imports.
            const candidateGroups = new Map<string, ScheduledTask[]>();

            for (const t of allTasksForRoadmap) {
                // If the task already has a multiDisciplineId, use it as the key
                if ((t as any).multiDisciplineId) {
                    const mid = String((t as any).multiDisciplineId);
                    if (!multiDisciplineGroupMap.has(mid)) multiDisciplineGroupMap.set(mid, []);
                    multiDisciplineGroupMap.get(mid)!.push(t);
                    continue;
                }

                // Otherwise, build a composite key to find matching tasks
                const key = `${t.action.trim()}|${t.equipment.trim()}|${t.startTime.getTime()}|${t.endTime.getTime()}`;
                if (!candidateGroups.has(key)) candidateGroups.set(key, []);
                candidateGroups.get(key)!.push(t);
            }

            // Analyze candidate groups to see if they span multiple disciplines
            for (const [key, group] of candidateGroups) {
                const uniqueDisciplines = new Set(group.map(t => t.discipline));
                if (uniqueDisciplines.size > 1) {
                    // It's a multi-discipline task!
                    multiDisciplineGroupMap.set(key, group);
                } else {
                    // It's a single discipline task (even if multiple teams from the same discipline)
                    singleDisciplineTasks.push(...group);
                }
            }

            // ── 2. Per-discipline pages (single-discipline tasks only) ────────
            const allDisciplines = Array.from(new Set(singleDisciplineTasks.map(t => t.discipline))).sort();

            if (allDisciplines.length > 0) {
                for (const disciplineName of allDisciplines) {
                    // All tasks for this discipline across the whole project, sorted by team then startTime
                    const disciplineTasks = singleDisciplineTasks
                        .filter(t => t.discipline === disciplineName)
                        .sort((a, b) => {
                            const teamCmp = a.team.localeCompare(b.team, undefined, { numeric: true });
                            return teamCmp !== 0 ? teamCmp : a.startTime.getTime() - b.startTime.getTime();
                        });

                    // Unique teams within this discipline (naturally sorted)
                    const teamsInDiscipline = Array.from(new Set(disciplineTasks.map(t => t.team)))
                        .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

                    // ── New page for every discipline ──────────────────────────────
                    doc.addPage('a3', 'l');
                    let currentY = roadmapMargin;

                    // Discipline page header
                    doc.setFillColor(...BRAND_COLORS.navy);
                    doc.rect(0, 0, pw, 18, 'F');
                    doc.setFillColor(...BRAND_COLORS.emerald);
                    doc.rect(0, 18, pw, 1, 'F');
                    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.white);
                    doc.text(disciplineName.toUpperCase(), pw / 2, 11, { align: 'center' });
                    currentY = 24;

                    // Discipline KPI summary bar
                    const discPeakManpower = calculateDailyPeakManpower(disciplineTasks, new Date(parameters.shutdownStart).getTime(), new Date(parameters.shutdownEnd).getTime());
                    const discTotalSumManpower = teamsInDiscipline.reduce((sum, teamName) => {
                        const firstTaskForTeam = disciplineTasks.find(t => t.team === teamName);
                        return sum + (firstTaskForTeam?.manpower || 0);
                    }, 0);
                    const discTotalManHours = disciplineTasks.reduce((s, t) => s + t.manHours, 0);
                    autoTable(doc, {
                        startY: currentY, theme: 'grid',
                        styles: { halign: 'center', fillColor: BRAND_COLORS.lightBg as any, textColor: BRAND_COLORS.navy as any },
                        body: [[
                            { content: `Somme Globale: ${discTotalSumManpower} pers.`, styles: { fontStyle: 'bold', fontSize: 10, textColor: [12, 74, 110] as any } },
                            { content: `Pic Global: ${discPeakManpower} pers.`, styles: { fontStyle: 'bold', fontSize: 10, textColor: [6, 78, 59] as any } },
                            { content: `Charge Totale: ${discTotalManHours.toFixed(1)} H-H`, styles: { fontStyle: 'bold', fontSize: 10 } },
                            { content: `Équipes Actives: ${teamsInDiscipline.length}`, styles: { fontStyle: 'bold', fontSize: 10 } },
                            { content: `Total Tâches: ${disciplineTasks.length}`, styles: { fontStyle: 'bold', fontSize: 10 } },
                        ]]
                    });
                    currentY = (doc as any).lastAutoTable.finalY + 8;

                    // Find all active days for this discipline
                    const minTime = Math.min(...disciplineTasks.map(t => t.startTime.getTime()));
                    const maxTime = Math.max(...disciplineTasks.map(t => t.endTime.getTime()));
                    const activeDays: Date[] = [];
                    const dIter = new Date(minTime);
                    dIter.setHours(0, 0, 0, 0);
                    const dEnd = new Date(maxTime);
                    dEnd.setHours(23, 59, 59, 999);
                    while (dIter.getTime() <= dEnd.getTime()) {
                        activeDays.push(new Date(dIter));
                        dIter.setDate(dIter.getDate() + 1);
                    }

                    // ── Iterate over each active day ──────────────────────────────
                    for (const day of activeDays) {
                        const dayStartTs = day.getTime();
                        const dayEndTs = dayStartTs + 24 * 60 * 60 * 1000 - 1;

                        // Tasks overlapping this specific day
                        const dayTasks = disciplineTasks.filter(t => t.startTime.getTime() <= dayEndTs && t.endTime.getTime() >= dayStartTs);
                        if (dayTasks.length === 0) continue;

                        const dayPeakManpower = calculateDailyPeakManpower(dayTasks, dayStartTs, dayEndTs);

                        // Print Day Header
                        if (currentY > doc.internal.pageSize.getHeight() - 40) { 
                            doc.addPage(); 
                            currentY = roadmapMargin; 
                            
                            // Redraw Sticky Header
                            doc.setFillColor(...BRAND_COLORS.navy);
                            doc.rect(0, 0, pw, 14, 'F');
                            doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.white);
                            doc.text(disciplineName.toUpperCase(), roadmapMargin, 9);
                            doc.text('PlanneX', pw - roadmapMargin, 9, { align: 'right' });
                        }
                        
                        doc.setFillColor(241, 245, 249); // slate-100
                        doc.rect(roadmapMargin, currentY, pw - (roadmapMargin * 2), 12, 'F');
                        
                        doc.setFillColor(...BRAND_COLORS.emerald);
                        doc.rect(roadmapMargin, currentY, 3, 12, 'F');
                        
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(10);
                        doc.setTextColor(...BRAND_COLORS.navy);
                        
                        // Unique teams working ON THIS DAY
                        const teamsOnThisDay = Array.from(new Set(dayTasks.map(t => t.team)))
                            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

                        // Extract Multi-Discipline Tasks for this day that involve THIS discipline
                        const activeMultiTasksOnDay: typeof singleDisciplineTasks[] = [];
                        let multiDisciplineManpower = 0;
                        
                        for (const group of multiDisciplineGroupMap.values()) {
                            const involvesCurrentDiscipline = group.some(t => t.discipline === disciplineName);
                            if (involvesCurrentDiscipline) {
                                const firstTask = group[0];
                                if (firstTask.startTime.getTime() < dayEndTs && firstTask.endTime.getTime() > dayStartTs) {
                                    activeMultiTasksOnDay.push(group);
                                    
                                    const disciplineManpower = group
                                        .filter(t => t.discipline === disciplineName)
                                        .reduce((sum, t) => sum + (t.manpower || 0), 0);
                                        
                                    multiDisciplineManpower += disciplineManpower;
                                }
                            }
                        }

                        let dejaSurSite = 0;
                        let nouveauxArrivants = 0;

                        const dayTotalSumManpower = teamsOnThisDay.reduce((sum, teamName) => {
                            const teamTasks = dayTasks.filter(t => t.team === teamName);
                            const firstTaskForTeam = teamTasks[0];
                            const teamManpower = firstTaskForTeam?.manpower || 0;
                            
                            // Check if team has any task rolling over from yesterday
                            const hasRolloverTask = teamTasks.some(t => t.startTime.getTime() < dayStartTs);
                            
                            if (hasRolloverTask) {
                                dejaSurSite += teamManpower;
                            } else {
                                nouveauxArrivants += teamManpower;
                            }
                            
                            return sum + teamManpower;
                        }, 0);

                        const dayString = day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();
                        doc.text(`${dayString}`, roadmapMargin + 6, currentY + 8);
                        
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(9);
                        
                        // Right-aligned texts (we draw right-to-left)
                        const totalText = `Total: ${dayTotalSumManpower + multiDisciplineManpower} pers.`;
                        const sep1 = `  |  `;
                        const multiText = `Multi-Discipline: ${multiDisciplineManpower} pers.`;
                        const sep2 = `  |  `;
                        const newText = `Nouveaux Arrivants: ${nouveauxArrivants} pers.`;
                        const sep3 = `  |  `;
                        const oldText = `Déjà sur site: ${dejaSurSite} pers.`;
                        
                        const totalWidth = doc.getTextWidth(totalText);
                        const sep1Width = doc.getTextWidth(sep1);
                        const multiWidth = doc.getTextWidth(multiText);
                        const sep2Width = doc.getTextWidth(sep2);
                        const newWidth = doc.getTextWidth(newText);
                        const sep3Width = doc.getTextWidth(sep3);
                        
                        let alignRightX = pw - roadmapMargin - 4;
                        
                        doc.setTextColor(6, 78, 59); // emerald-900 (Total)
                        doc.text(totalText, alignRightX, currentY + 8, { align: 'right' });
                        
                        alignRightX -= totalWidth;
                        doc.setTextColor(71, 85, 105);
                        doc.text(sep1, alignRightX, currentY + 8, { align: 'right' });
                        
                        alignRightX -= sep1Width;
                        doc.setTextColor(180, 83, 9); // amber-700
                        doc.text(multiText, alignRightX, currentY + 8, { align: 'right' });

                        alignRightX -= multiWidth;
                        doc.setTextColor(71, 85, 105);
                        doc.text(sep2, alignRightX, currentY + 8, { align: 'right' });

                        alignRightX -= sep2Width;
                        doc.setTextColor(30, 64, 175); // blue-800 (Blue for new)
                        doc.text(newText, alignRightX, currentY + 8, { align: 'right' });

                        alignRightX -= newWidth;
                        doc.setTextColor(71, 85, 105);
                        doc.text(sep3, alignRightX, currentY + 8, { align: 'right' });

                        alignRightX -= sep3Width;
                        doc.setTextColor(100, 116, 139); // slate-500 (faded grey for already on site)
                        doc.text(oldText, alignRightX, currentY + 8, { align: 'right' });
                        
                        currentY += 16;

                        // ── Iterate each team within this day ───────────────────
                        for (const teamName of teamsOnThisDay) {
                            const teamTasksOnDay = dayTasks
                                .filter(t => t.team === teamName)
                                .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

                            const tableBody = teamTasksOnDay.map(t => {
                                const isMultiDay = t.startTime.getTime() < dayStartTs || t.endTime.getTime() > dayEndTs;
                                const actionPrefix = isMultiDay ? '[CONTINU] ' : '';
                                const hsePrefix = t.isHighRisk ? '(HSE) ' : '';
                                
                                return [
                                    `${actionPrefix}${hsePrefix}${t.action}`,
                                    t.equipment,
                                    formatDateForTable(t.startTime),
                                    formatDateForTable(t.endTime),
                                    t.manpower,
                                    t.duration.toFixed(2)
                                ];
                            });

                            const teamTotalManpower = teamTasksOnDay[0]?.manpower || '?';
                            
                            // Color the team header text if they are a "Nouveau Arrivant"
                            const teamHasRollover = teamTasksOnDay.some(t => t.startTime.getTime() < dayStartTs);
                            const teamHeaderTextColor = teamHasRollover ? 255 : [251, 146, 60]; // white vs orange-400

                            autoTable(doc, {
                                startY: currentY,
                                margin: { top: 22 },
                                theme: 'grid',
                                headStyles: { fontStyle: 'bold', textColor: 255, fontSize: 9 },
                                head: [
                                    [{ content: `${teamName} (${teamTotalManpower} pers.)`, colSpan: 6, styles: { fillColor: BRAND_COLORS.slate700 as any, textColor: teamHeaderTextColor as any } }],
                                    ['Action', 'Equipement', 'Début', 'Fin', 'Pers.', 'Durée (h)']
                                ],
                                body: tableBody,
                                styles: { cellPadding: 2, fontSize: 8 },
                                columnStyles: {
                                    0: { cellWidth: 'auto' },
                                    1: { cellWidth: 100 },
                                    2: { cellWidth: 35 },
                                    3: { cellWidth: 35 },
                                    4: { halign: 'right', cellWidth: 15 },
                                    5: { halign: 'right', cellWidth: 20 }
                                },
                                alternateRowStyles: { fillColor: [248, 250, 252] },
                                didParseCell: data => {
                                    if (data.section === 'head' && data.row.index === 1) {
                                        data.cell.styles.fillColor = [100, 116, 139];
                                        data.cell.styles.textColor = 255;
                                        data.cell.styles.fontStyle = 'bold';
                                    }
                                    if (data.section === 'body') {
                                        const actionText = data.row.raw[0];
                                        const isRollover = typeof actionText === 'string' && actionText.startsWith('[CONTINU]');
                                        const task = teamTasksOnDay[data.row.index];

                                        // 1. Fade the entire row if it's a rollover
                                        if (isRollover) {
                                            data.cell.styles.textColor = [148, 163, 184]; // slate-400
                                            data.cell.styles.fontStyle = 'normal';
                                        }

                                        // 2. Highlight 'Pers.' column
                                        if (data.column.index === 4) {
                                            if (isRollover) {
                                                data.cell.styles.fillColor = [241, 245, 249]; // slate-100 (faded background)
                                                data.cell.styles.textColor = [100, 116, 139]; // slate-500 (faded text)
                                                data.cell.styles.fontStyle = 'normal';
                                            } else {
                                                data.cell.styles.fillColor = [219, 234, 254]; // blue-100 (bright background)
                                                data.cell.styles.textColor = [30, 64, 175]; // blue-800 (bright text)
                                                data.cell.styles.fontStyle = 'bold';
                                            }
                                        }
                                        
                                        // 3. Highlight dates
                                        if (task) {
                                            if (isRollover) {
                                                // If Début is before today
                                                if (data.column.index === 2 && task.startTime.getTime() < dayStartTs) {
                                                    data.cell.styles.textColor = [234, 88, 12]; // orange-600
                                                }
                                            } else {
                                                // If Fin is after today
                                                if (data.column.index === 3 && task.endTime.getTime() > dayEndTs) {
                                                    data.cell.styles.textColor = [147, 51, 234]; // purple-600
                                                    data.cell.styles.fontStyle = 'bold';
                                                }
                                            }
                                        }
                                    }
                                },
                                didDrawPage: () => {
                                    // Sticky header repeated on overflow pages
                                    doc.setFillColor(...BRAND_COLORS.navy);
                                    doc.rect(0, 0, pw, 14, 'F');
                                    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.white);
                                    doc.text(disciplineName.toUpperCase(), roadmapMargin, 9);
                                    doc.text('PlanneX', pw - roadmapMargin, 9, { align: 'right' });
                                }
                            });
                            currentY = (doc as any).lastAutoTable.finalY + 8;
                        }

                        // ── Render Multi-Discipline Tasks for this day ───────────────────
                        if (activeMultiTasksOnDay.length > 0) {
                            const multiTableBody = activeMultiTasksOnDay.map(group => {
                                const firstTask = group[0];
                                const isMultiDay = firstTask.startTime.getTime() < dayStartTs || firstTask.endTime.getTime() > dayEndTs;
                                const actionPrefix = isMultiDay ? '[CONTINU] ' : '';
                                const hsePrefix = firstTask.isHighRisk ? '(HSE) ' : '';
                                
                                const disciplinesInvolved = group.map(t => `${t.discipline} (${t.manpower})`).join(', ');

                                const disciplineManpower = group
                                    .filter(t => t.discipline === disciplineName)
                                    .reduce((sum, t) => sum + (t.manpower || 0), 0);

                                return [
                                    `${actionPrefix}[MULTI] ${hsePrefix}${firstTask.action}\n[Impliqué: ${disciplinesInvolved}]`,
                                    firstTask.equipment,
                                    formatDateForTable(firstTask.startTime),
                                    formatDateForTable(firstTask.endTime),
                                    disciplineManpower,
                                    firstTask.duration.toFixed(2)
                                ];
                            });

                            autoTable(doc, {
                                startY: currentY,
                                margin: { top: 22 },
                                theme: 'grid',
                                headStyles: { fontStyle: 'bold', textColor: 255, fontSize: 9 },
                                head: [
                                    [{ content: `TÂCHES MULTI-DISCIPLINES (Coordination sur ce jour)`, colSpan: 6, styles: { fillColor: BRAND_COLORS.slate700 as any, textColor: [251, 146, 60] as any } }], // orange-400 text
                                    ['Action', 'Equipement', 'Début', 'Fin', 'Total Pers.', 'Durée (h)']
                                ],
                                body: multiTableBody,
                                styles: { cellPadding: 2, fontSize: 8 },
                                columnStyles: {
                                    0: { cellWidth: 'auto' },
                                    1: { cellWidth: 100 },
                                    2: { cellWidth: 35 },
                                    3: { cellWidth: 35 },
                                    4: { halign: 'right', cellWidth: 15 },
                                    5: { halign: 'right', cellWidth: 20 }
                                },
                                alternateRowStyles: { fillColor: [248, 250, 252] },
                                didParseCell: data => {
                                    if (data.section === 'head' && data.row.index === 1) {
                                        data.cell.styles.fillColor = [100, 116, 139]; // slate-500
                                        data.cell.styles.textColor = 255;
                                        data.cell.styles.fontStyle = 'bold';
                                    }
                                    if (data.section === 'body') {
                                        const actionText = data.row.raw[0];
                                        const isRollover = typeof actionText === 'string' && actionText.startsWith('[CONTINU]');
                                        const group = activeMultiTasksOnDay[data.row.index];
                                        const task = group ? group[0] : null;

                                        // Fade rollover
                                        if (isRollover) {
                                            data.cell.styles.textColor = [148, 163, 184];
                                            data.cell.styles.fontStyle = 'normal';
                                        }

                                        // Highlight Pers column
                                        if (data.column.index === 4) {
                                            if (isRollover) {
                                                data.cell.styles.fillColor = [241, 245, 249];
                                                data.cell.styles.textColor = [100, 116, 139];
                                                data.cell.styles.fontStyle = 'normal';
                                            } else {
                                                data.cell.styles.fillColor = [254, 243, 199]; // amber-100
                                                data.cell.styles.textColor = [180, 83, 9]; // amber-700
                                                data.cell.styles.fontStyle = 'bold';
                                            }
                                        }

                                        // Highlight dates
                                        if (task) {
                                            if (isRollover) {
                                                if (data.column.index === 2 && task.startTime.getTime() < dayStartTs) {
                                                    data.cell.styles.textColor = [234, 88, 12]; // orange-600
                                                }
                                            } else {
                                                if (data.column.index === 3 && task.endTime.getTime() > dayEndTs) {
                                                    data.cell.styles.textColor = [147, 51, 234]; // purple-600
                                                    data.cell.styles.fontStyle = 'bold';
                                                }
                                            }
                                        }
                                    }
                                },
                                didDrawPage: () => {
                                    doc.setFillColor(...BRAND_COLORS.navy);
                                    doc.rect(0, 0, pw, 14, 'F');
                                    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.white);
                                    doc.text(disciplineName.toUpperCase(), roadmapMargin, 9);
                                    doc.text('PlanneX', pw - roadmapMargin, 9, { align: 'right' });
                                }
                            });
                            currentY = (doc as any).lastAutoTable.finalY + 8;
                        }
                    }
                }
            }

            // ── 3. Render MULTI-DISCIPLINE page (Last Pages) ─────────────────
            if (multiDisciplineGroupMap.size > 0) {
                doc.addPage('a3', 'l');
                let currentY = roadmapMargin;

                // Section header
                doc.setFillColor(...BRAND_COLORS.navy);
                doc.rect(0, 0, pw, 18, 'F');
                doc.setFillColor(...BRAND_COLORS.purple);
                doc.rect(0, 18, pw, 1.5, 'F');
                doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.white);
                doc.text('TÂCHES MULTI-DISCIPLINES', pw / 2, 11, { align: 'center' });
                currentY = 24;

                // KPI summary bar
                const multiTasks = Array.from(multiDisciplineGroupMap.values()).flat();
                const multiTotalMH = multiTasks.reduce((s, t) => s + t.manHours, 0);
                autoTable(doc, {
                    startY: currentY, theme: 'grid',
                    styles: { halign: 'center', fillColor: BRAND_COLORS.lightBg as any, textColor: BRAND_COLORS.navy as any },
                    body: [[
                        { content: `Groupes Multi-Disciplines: ${multiDisciplineGroupMap.size}`, styles: { fontStyle: 'bold', fontSize: 10 } },
                        { content: `Tâches individuelles: ${multiTasks.length}`, styles: { fontStyle: 'bold', fontSize: 10 } },
                        { content: `Charge Totale: ${multiTotalMH.toFixed(1)} H-H`, styles: { fontStyle: 'bold', fontSize: 10 } },
                    ]]
                });
                currentY = (doc as any).lastAutoTable.finalY + 8;

                // Each multi-discipline group → one table block
                for (const [, groupTasks] of multiDisciplineGroupMap) {
                    // Combined disciplines label (e.g., "Mécanicien · Chaudronnier")
                    const disciplines = Array.from(new Set(groupTasks.map(t => t.discipline))).sort().join(' · ');
                    // Total manpower = sum of each sub-task's headcount
                    const totalManpower = groupTasks.reduce((s, t) => s + (t.manpower || 0), 0);
                    // Sort rows by discipline then startTime
                    const sortedGroup = [...groupTasks].sort((a, b) => {
                        const dc = a.discipline.localeCompare(b.discipline);
                        return dc !== 0 ? dc : a.startTime.getTime() - b.startTime.getTime();
                    });

                    // Build one summary row per unique discipline contribution
                    const tableBody = sortedGroup.map(t => [
                        t.isHighRisk ? `(HSE) ${t.action}` : t.action,
                        t.discipline,
                        t.equipment,
                        formatDateForTable(t.startTime),
                        formatDateForTable(t.endTime),
                        t.manpower,
                        t.duration.toFixed(2),
                    ]);

                    autoTable(doc, {
                        startY: currentY,
                        margin: { top: 22 },
                        theme: 'grid',
                        headStyles: { fontStyle: 'bold', textColor: 255, fontSize: 9 },
                        head: [
                            [{ content: `[ MULTI-DISCIPLINE ] : ${disciplines}   |   Effectif total : ${totalManpower} pers.`, colSpan: 7, styles: { fillColor: BRAND_COLORS.purple as any } }],
                            ['Action', 'Discipline', 'Equipement', 'Début', 'Fin', 'Pers.', 'Durée (h)']
                        ],
                        body: tableBody,
                        styles: { cellPadding: 2, fontSize: 8 },
                        columnStyles: {
                            0: { cellWidth: 'auto' },
                            1: { cellWidth: 45 },
                            2: { cellWidth: 85 },
                            3: { cellWidth: 35 },
                            4: { cellWidth: 35 },
                            5: { halign: 'right', cellWidth: 15 },
                            6: { halign: 'right', cellWidth: 20 }
                        },
                        alternateRowStyles: { fillColor: [248, 248, 255] },
                        didParseCell: data => {
                            if (data.section === 'head' && data.row.index === 1) {
                                data.cell.styles.fillColor = [100, 80, 160];
                                data.cell.styles.textColor = 255;
                                data.cell.styles.fontStyle = 'bold';
                            }
                        },
                        didDrawPage: () => {
                            doc.setFillColor(...BRAND_COLORS.navy);
                            doc.rect(0, 0, pw, 14, 'F');
                            doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(...BRAND_COLORS.white);
                            doc.text('TÂCHES MULTI-DISCIPLINES', roadmapMargin, 9);
                            doc.text('PlanneX', pw - roadmapMargin, 9, { align: 'right' });
                        }
                    });
                    currentY = (doc as any).lastAutoTable.finalY + 6;
                }
            }


            // Page numbering
            const totalPageCount = (doc as any).internal.pages.length;
            for (let i = 1; i <= totalPageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7); doc.setTextColor(...BRAND_COLORS.slate300);
                doc.text('Created by PlanneX', 15, doc.internal.pageSize.getHeight() - 7);
                doc.text(`Page ${i} / ${totalPageCount}`, doc.internal.pageSize.getWidth() - 15, doc.internal.pageSize.getHeight() - 7, { align: 'right' });
            }

            resolve(doc);
        } catch (error) {
            console.error("Error during Team Planning PDF generation:", error);
            reject(error instanceof Error ? error : new Error('Erreur inconnue lors de la génération du PDF.'));
        }
    });
};
