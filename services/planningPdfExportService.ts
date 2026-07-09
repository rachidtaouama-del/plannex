
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CalculationResults, ScheduledTask, AppParameters } from '../types';

interface ExportOptions {
    showChronology: boolean;
    showSubtotals: boolean;
    showDashboard?: boolean;
    dashboardOptions?: {
        kpis: boolean;
        charts: boolean;
        hse: boolean; // Retained in interface but won't be rendered
        density: boolean;
        scope: boolean; // Mapped to Maintenance Breakdown
    };
    selectedColumns: { key: string; label: string }[];
    contentFilters?: {
        maintenanceType?: string[];
        discipline?: string[];
        manpower?: number;
    };
}

// ---------------------------------------------------------------------------
// DATA CLEANING UTILITY
// ---------------------------------------------------------------------------
const cleanText = (text: string | number | null | undefined): string => {
    if (text == null) return '';
    let str = String(text);
    str = str.replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    str = str.replace(/&p/g, '').replace(/&nbsp;/g, ' ');
    // eslint-disable-next-line no-control-regex
    str = str.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F\x7F]/g, '');
    return str.trim();
};

const formatDate = (date: Date, withTime: boolean = true): string => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
    if (withTime) { options.hour = '2-digit'; options.minute = '2-digit'; }
    return date.toLocaleString('fr-FR', options);
};

const formatHeaderDate = (date: Date): string => {
    const d = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const t = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${d} : ${t}`;
};

const formatShortDate = (date: Date): string => {
    return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const formatNullableDate = (date: Date | null): string => {
    if (!date || isNaN(date.getTime())) return '';
    return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// --- DRAWING HELPERS ---

// ── CINEMATIC COVER PAGE ──────────────────────────────────────────────────────
const drawFamilyPlanningCoverPage = (
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
    const EMER: [number, number, number] = [16, 185, 129];
    const BLUE: [number, number, number] = [59, 130, 246];
    const PURP: [number, number, number] = [168, 85, 247];
    const ORANG: [number, number, number] = [249, 115, 22];
    const RED: [number, number, number] = [239, 68, 68];
    const TWHT: [number, number, number] = [248, 250, 252];
    const TMUT: [number, number, number] = [148, 163, 184];
    const TSUB: [number, number, number] = [100, 116, 139];

    // 1. Dark canvas
    doc.setFillColor(...DARK);
    doc.rect(0, 0, W, H, 'F');

    // 2. Diagonal stripe texture
    doc.setDrawColor(...EMER);
    doc.setLineWidth(0.25);
    for (let i = 0; i <= 14; i++) {
        const x0 = W * 0.55 + i * 13;
        doc.setGState(new (doc as any).GState({ opacity: 0.04 + i * 0.004 }));
        doc.line(x0, 0, x0 + H, H);
    }
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    // 3. Left accent panel
    const pW = 18;
    doc.setFillColor(...PANEL);
    doc.rect(0, 0, pW, H, 'F');
    const aW = 3;
    doc.setFillColor(...EMER); doc.rect(pW - aW, 0, aW, H * 0.40, 'F');
    doc.setFillColor(...BLUE); doc.rect(pW - aW, H * 0.40, aW, H * 0.25, 'F');
    doc.setFillColor(...PURP); doc.rect(pW - aW, H * 0.65, aW, H * 0.20, 'F');
    doc.setFillColor(...ORANG); doc.rect(pW - aW, H * 0.85, aW, H * 0.15, 'F');

    // 4. Top bar
    const tbH = 22;
    doc.setFillColor(...PANEL);
    doc.rect(pW, 0, W - pW, tbH, 'F');
    doc.setFillColor(...EMER); doc.rect(pW, 0, (W - pW) * 0.55, 2, 'F');
    doc.setFillColor(...BLUE); doc.rect(pW + (W - pW) * 0.55, 0, (W - pW) * 0.45, 2, 'F');

    const lX = pW + 12, lY = tbH / 2;
    doc.setFillColor(...EMER); doc.circle(lX, lY, 5, 'F');
    doc.setFillColor(...DARK); doc.circle(lX, lY, 3, 'F');
    doc.setFillColor(...EMER); doc.circle(lX, lY, 1.2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...TWHT);
    doc.text('PlanneX', lX + 8, lY + 4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...EMER);
    doc.text('I N T E L L I G E N C E   E N G I N E', lX + 8, lY + 8.5);

    const bW = 70;
    doc.setFillColor(...EMER);
    doc.roundedRect(W - 14 - bW, 5, bW, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...DARK);
    doc.text('PLANNING PAR FAMILLE — PDF', W - 14 - bW / 2, 12.5, { align: 'center' });

    // 5. Tag line
    const tY = tbH + 18;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...EMER);
    doc.text('PLANIFICATION PAR FAMILLE  /  SUIVI DES INTERVENTIONS PLANIFIEES', pW + 14, tY);
    doc.setDrawColor(...EMER); doc.setLineWidth(0.4);
    doc.line(pW + 14, tY + 2, pW + 14 + 130, tY + 2);

    // 6. Mega title
    const mTY = tY + 22;
    const rawTitle = cleanText(title).toUpperCase()
        .replace(/[éèêë]/g, 'E').replace(/[àâ]/g, 'A').replace(/[îï]/g, 'I')
        .replace(/[ùû]/g, 'U').replace(/ç/g, 'C').replace(/[ôö]/g, 'O')
        .replace(/œ/g, 'OE').replace(/['']/g, "'").replace(/—/g, '-');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(30); doc.setTextColor(...TWHT);
    const tLines = doc.splitTextToSize(rawTitle, W * 0.58 - pW - 14);
    doc.text(tLines, pW + 14, mTY);

    const tBH = tLines.length * 12;
    const ulY = mTY + tBH;
    doc.setFillColor(...EMER); doc.rect(pW + 14, ulY, 55, 2.5, 'F');
    doc.setFillColor(30, 41, 59); doc.rect(pW + 73, ulY, W - pW - 90, 0.5, 'F');

    // 7. Period pill
    const perY = ulY + 14;
    const start = filter ? filter.start : new Date(parameters.shutdownStart);
    const end = filter ? filter.end : new Date(parameters.shutdownEnd);
    const perText = `Periode : ${start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} au ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(pW + 14, perY - 6, 155, 11, 2, 2, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...TMUT);
    doc.text(perText, pW + 19, perY + 1.5);

    // 8. KPI strip (5 cards)
    const totalTasks = results.scheduledTasks.length;
    const totalMH = results.kpis?.totalManHours || results.scheduledTasks.reduce((s, t) => s + (t.manHours || 0), 0);
    const totalFamilies = new Set(results.scheduledTasks.map(t => t.family)).size;
    // Use global pdrItems list (most reliable — always populated by scheduling engine)
    const globalPdrItemsCover: any[] = (results as any).pdrItems || [];
    const totalPDR = globalPdrItemsCover.length > 0
        ? globalPdrItemsCover.length
        : results.scheduledTasks.reduce((s, t) => s + (t.pdrItems?.length || 0), 0);
    const durationH = ((end.getTime() - start.getTime()) / 3600000).toFixed(0);

    const kpis = [
        { l: 'TACHES', v: String(totalTasks), c: EMER },
        { l: 'FAMILLES', v: String(totalFamilies), c: BLUE },
        { l: 'PDR / PREP', v: String(totalPDR), c: PURP },
        { l: 'CHARGE H-H', v: totalMH.toFixed(0), c: ORANG },
        { l: 'DUREE (H)', v: durationH, c: RED },
    ];
    const kpX = W * 0.60;
    const kpW = W - kpX - 14;
    const kpCW = kpW / kpis.length - 2;
    const kpY2 = tbH + 12;
    kpis.forEach((k, i) => {
        const cx = kpX + i * (kpCW + 2.5);
        doc.setFillColor(15, 23, 42); doc.roundedRect(cx, kpY2, kpCW, 36, 2, 2, 'F');
        doc.setFillColor(...k.c); doc.rect(cx, kpY2, kpCW, 2, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(...TWHT);
        doc.text(k.v, cx + kpCW / 2, kpY2 + 17, { align: 'center' });
        doc.setFontSize(5.5); doc.setTextColor(...k.c);
        doc.text(k.l, cx + kpCW / 2, kpY2 + 25, { align: 'center' });
    });

    // 9. Section header
    const secY = Math.max(perY + 22, mTY + tBH + 55);
    doc.setFillColor(15, 23, 42); doc.rect(pW, secY - 1, W - pW, 14, 'F');
    doc.setFillColor(...EMER); doc.rect(pW, secY - 1, 3, 14, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...EMER);
    doc.text('INFORMATIONS DU PROJET', pW + 10, secY + 7);

    // 10. Metadata grid
    const td = new Date();
    const gd = `${td.getDate().toString().padStart(2, '0')}/${(td.getMonth() + 1).toString().padStart(2, '0')}/${td.getFullYear()}`;
    const metas = [
        { l: 'Generated', v: gd },
        { l: 'Classification', v: 'USAGE INTERNE' },
        { l: 'Software', v: 'PlanneX Intelligence Engine' },
        { l: 'Version', v: 'v4.0 - Family Planning Edition' },
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

    // 11. Bottom capsule bar
    const bBarY = H - 22;
    doc.setFillColor(...PANEL); doc.rect(pW, bBarY, W - pW, 22, 'F');
    doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.3); doc.line(pW, bBarY, W, bBarY);
    const caps: { t: string; c: [number, number, number] }[] = [
        { t: 'PLANNING PAR FAMILLE', c: EMER },
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

    // 12. Corner marks
    doc.setDrawColor(...EMER); doc.setLineWidth(0.5);
    doc.line(pW + 8, tbH + 4, pW + 13, tbH + 4);
    doc.line(pW + 8, tbH + 4, pW + 8, tbH + 9);
    doc.line(W - 14, bBarY - 8, W - 19, bBarY - 8);
    doc.line(W - 14, bBarY - 8, W - 14, bBarY - 13);
};

const drawHeader = (doc: jsPDF, title: string, parameters: AppParameters, filter?: { start: Date, end: Date } | null) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFillColor(15, 23, 42); // Slate 900
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(cleanText(title).toUpperCase(), 15, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // Slate 400
    const dateRangeText = filter
        ? `Période du Rapport : ${formatHeaderDate(filter.start)} au ${formatHeaderDate(filter.end)}`
        : `Arrêt Complet : ${formatHeaderDate(new Date(parameters.shutdownStart))} au ${formatHeaderDate(new Date(parameters.shutdownEnd))}`;
    doc.text(dateRangeText, 15, 28);

    doc.setFontSize(12);
    doc.setTextColor(52, 211, 153); // Emerald 400
};

const drawKpiCard = (doc: jsPDF, x: number, y: number, width: number, height: number, title: string, value: string, subtext: string, accentColor: [number, number, number]) => {
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, y, width, height, 2, 2, 'FD');
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.roundedRect(x, y, 2, height, 2, 2, 'F');
    doc.rect(x + 1, y, 1, height, 'F');

    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(cleanText(title).toUpperCase(), x + 6, y + 8);

    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(cleanText(value), x + 6, y + 18);

    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(cleanText(subtext), x + 6, y + 24);
};

const drawPieSlice = (doc: jsPDF, cx: number, cy: number, r: number, startAngle: number, endAngle: number, color: [number, number, number]) => {
    const rad = Math.PI / 180;
    // Robust drawing using triangles for small segments to form arc
    const step = 2; // degrees
    doc.setFillColor(color[0], color[1], color[2]);
    for (let a = startAngle; a < endAngle; a += step) {
        const a2 = Math.min(a + step, endAngle);
        const sx1 = cx + r * Math.cos(-a * rad);
        const sy1 = cy + r * Math.sin(-a * rad);
        const sx2 = cx + r * Math.cos(-a2 * rad);
        const sy2 = cy + r * Math.sin(-a2 * rad);
        doc.triangle(cx, cy, sx1, sy1, sx2, sy2, 'F');
    }
};

const drawDonutChart = (doc: jsPDF, x: number, y: number, radius: number, data: { label: string, val: number, color: [number, number, number] }[], totalValue: number, totalLabel: string) => {
    let startAngle = 0;
    data.forEach(slice => {
        if (totalValue === 0) return;
        const sliceAngle = (slice.val / totalValue) * 360;
        if (sliceAngle > 0) {
            drawPieSlice(doc, x, y, radius, startAngle, startAngle + sliceAngle, slice.color);
            startAngle += sliceAngle;
        }
    });

    // Inner Circle (Hole)
    doc.setFillColor(255, 255, 255);
    doc.circle(x, y, radius * 0.6, 'F');

    // Center Text
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(String(totalValue), x, y + 1, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(totalLabel.toUpperCase(), x, y + 6, { align: 'center' });

    // Legend
    let legendY = y - radius + 5;
    const legendX = x + radius + 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    data.forEach(slice => {
        if (slice.val > 0) {
            doc.setFillColor(slice.color[0], slice.color[1], slice.color[2]);
            doc.rect(legendX, legendY - 3, 4, 4, 'F');
            doc.setTextColor(71, 85, 105);
            const pct = totalValue > 0 ? ((slice.val / totalValue) * 100).toFixed(0) : 0;
            // Format: PREVENTIVE : 101 (90%)
            doc.text(`${slice.label} : ${slice.val} (${pct}%)`, legendX + 6, legendY);
            legendY += 6;
        }
    });
};

const drawVerticalColumnChart = (doc: jsPDF, x: number, y: number, w: number, h: number, data: { label: string, val: number, color: [number, number, number] }[]) => {
    if (data.length === 0) return;

    const maxVal = Math.max(...data.map(d => d.val), 1);
    const yMax = maxVal * 1.1;

    const colWidth = (w / data.length) * 0.7;
    const spacing = (w / data.length) * 0.3;

    // Draw Axis
    doc.setDrawColor(203, 213, 225);
    doc.line(x, y + h, x + w, y + h); // X Axis

    data.forEach((d, i) => {
        const barH = (d.val / yMax) * h;
        const barX = x + (i * (colWidth + spacing)) + (spacing / 2);
        const barY = y + h - barH;

        // Bar
        doc.setFillColor(d.color[0], d.color[1], d.color[2]);
        doc.rect(barX, barY, colWidth, barH, 'F');

        // Value Label on Top
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(d.val.toFixed(1), barX + colWidth / 2, barY - 2, { align: 'center' });

        // X Label (Discipline)
        doc.setFont('helvetica', 'normal');
        let label = d.label;
        if (doc.getTextWidth(label) > colWidth + 5) {
            label = label.substring(0, 5) + '..';
        }

        doc.text(label, barX + colWidth / 2, y + h + 4, { align: 'center' });
    });
};

const drawCapsuleHeader = (doc: jsPDF, x: number, y: number, w: number, h: number, title: string, count: number, start: Date, end: Date) => {
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.roundedRect(x, y, w, h, 2, 2, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(cleanText(title).toUpperCase(), x + 4, y + (h / 2) + 1);

    const titleWidth = doc.getTextWidth(cleanText(title).toUpperCase());

    doc.setFillColor(71, 85, 105); // Slate 600
    const badgeX = x + 4 + titleWidth + 4;
    const badgeText = `${count} Tâches`;
    const badgeW = doc.getTextWidth(badgeText) + 6;
    doc.roundedRect(badgeX, y + 1.5, badgeW, h - 3, 2, 2, 'F');
    doc.setFontSize(8);
    doc.text(badgeText, badgeX + badgeW / 2, y + (h / 2) + 1, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(52, 211, 153); // Emerald 400
    const dateStr = `Début : ${formatShortDate(start)}   |   Fin : ${formatShortDate(end)}`;
    doc.text(dateStr, x + w - 4, y + (h / 2) + 1, { align: 'right' });
};

// ---------------------------------------------------------------------------
// MAIN EXPORT FUNCTION
// ---------------------------------------------------------------------------

export const exportPlanningToPDF = async (
    results: CalculationResults,
    parameters: AppParameters,
    title: string,
    familyOrder: string[],
    specialTasks: ScheduledTask[],
    filter?: { start: Date, end: Date } | null,
    options?: ExportOptions
): Promise<jsPDF> => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            let currentY = margin;

            // ── COVER PAGE (always page 1) ─────────────────────────────────────
            drawFamilyPlanningCoverPage(doc, results, parameters, title, filter);
            doc.addPage('a3', 'l');

            const showChronology = options?.showChronology ?? true;
            const showSubtotals = options?.showSubtotals ?? true;
            const showDashboard = options?.showDashboard ?? false;
            const dashboardOpts = options?.dashboardOptions || { kpis: true, charts: true, hse: true, density: true, scope: true };
            const columns = options?.selectedColumns ?? [
                { key: 'action', label: 'Action' },
                { key: 'ot', label: 'OT' },
                { key: 'equipment', label: 'Équipement' },
                { key: 'discipline', label: 'Discipline' },
                { key: 'startTime', label: 'Début' },
                { key: 'endTime', label: 'Fin' },
                { key: 'duration', label: 'Durée (h)' }
            ];

            let tasksToExport = results.scheduledTasks;
            if (filter) {
                const filterStart = filter.start.getTime();
                const filterEnd = filter.end.getTime();
                tasksToExport = tasksToExport.filter(task =>
                    task.startTime.getTime() < filterEnd && task.endTime.getTime() > filterStart
                );
            }

            if (options?.contentFilters) {
                const { maintenanceType, discipline, manpower } = options.contentFilters;
                if (maintenanceType && maintenanceType.length > 0) {
                    tasksToExport = tasksToExport.filter(t => t.maintenanceType && maintenanceType.includes(t.maintenanceType));
                }
                if (discipline && discipline.length > 0) {
                    tasksToExport = tasksToExport.filter(t => discipline.includes(t.discipline));
                }
                if (manpower !== undefined && !isNaN(manpower)) {
                    tasksToExport = tasksToExport.filter(t => t.manpower === manpower);
                }
            }

            if (showDashboard) {
                drawHeader(doc, title, parameters, filter);
                currentY = 50;

                // --- DATA AGGREGATION ---
                let highRiskCount = 0;
                let tasksWithPDR = 0;
                let totalPDRs = 0;

                const durationByDiscipline: Record<string, number> = {};
                const tasksByDisciplineCount: Record<string, number> = {};
                const tasksByMaintenance: Record<string, number> = {};

                let scaffoldingCount = 0;
                let handlingCount = 0;
                let bothCount = 0;
                let scaffoldingOnlyCount = 0;
                let handlingOnlyCount = 0;

                const familleStats: Record<string, { duration: number, count: number, maxTeamsSize: Map<string, number>, uniqueTeams: Set<string> }> = {};

                // ─── PDR: use global results.pdrItems as authoritative source ───────────
                const globalPdrItems: any[] = (results as any).pdrItems || [];
                totalPDRs = globalPdrItems.length;
                // Build set of OTs that have at least one PDR item
                const otWithPdr = new Set<string>(
                    globalPdrItems.map((p: any) => String(p.OT ?? '').trim()).filter(Boolean)
                );

                tasksToExport.forEach(task => {
                    if (task.isHighRisk) highRiskCount++;

                    // A task "has PDR" if its OT appears in the global pdrItems list,
                    // OR if its own per-task pdrItems is non-empty (already linked),
                    // OR if it has a legacy preparatifs text value.
                    const taskOt = String(task.ot ?? '').trim();
                    const hasPdrGlobal = taskOt && taskOt !== '0' && taskOt !== 'null' && otWithPdr.has(taskOt);
                    const hasPdrTask = (task.pdrItems?.length ?? 0) > 0;
                    const hasPdrPrep = (() => {
                        const p = task.preparatifs;
                        return !!p && String(p).trim() !== '' && String(p).trim() !== '0';
                    })();

                    if (hasPdrGlobal || hasPdrTask || hasPdrPrep) {
                        tasksWithPDR++;
                    }

                    const discipline = task.discipline || 'Général';
                    durationByDiscipline[discipline] = (durationByDiscipline[discipline] || 0) + task.duration;
                    tasksByDisciplineCount[discipline] = (tasksByDisciplineCount[discipline] || 0) + 1;

                    const maintType = task.maintenanceType?.toUpperCase() || 'AUTRES';
                    tasksByMaintenance[maintType] = (tasksByMaintenance[maintType] || 0) + 1;

                    const needsScaffolding = task['Scaffolding Required'] === 1;
                    const needsHandling = task['Handling required'] === 1;
                    if (needsScaffolding) scaffoldingCount++;
                    if (needsHandling) handlingCount++;
                    if (needsScaffolding && needsHandling) bothCount++;
                    if (needsScaffolding && !needsHandling) scaffoldingOnlyCount++;
                    if (!needsScaffolding && needsHandling) handlingOnlyCount++;

                    // Famille Stats (Equipes & Personnes)
                    const fam = task.family || 'Sans Famille';
                    if (!familleStats[fam]) {
                        familleStats[fam] = { duration: 0, count: 0, maxTeamsSize: new Map(), uniqueTeams: new Set() };
                    }
                    familleStats[fam].duration += task.duration;
                    familleStats[fam].count++;

                    if (task.team) {
                        familleStats[fam].uniqueTeams.add(task.team);
                        const curSize = familleStats[fam].maxTeamsSize.get(task.team) || 0;
                        if (task.manpower > curSize) {
                            familleStats[fam].maxTeamsSize.set(task.team, task.manpower);
                        }
                    }
                });

                const totalTasks = tasksToExport.length;
                const totalHours = tasksToExport.reduce((sum, t) => sum + t.manHours, 0);

                if (dashboardOpts.kpis) {
                    const kpiWidth = (pageWidth - (margin * 2) - 15) / 4;
                    const kpiHeight = 28;

                    // Row 1
                    drawKpiCard(doc, margin, currentY, kpiWidth, kpiHeight, "Volume Horaire", `${totalHours.toFixed(0)}`, "Heures-Hommes Totales", [59, 130, 246]);
                    drawKpiCard(doc, margin + kpiWidth + 5, currentY, kpiWidth, kpiHeight, "Volume Tâches", `${totalTasks}`, "Interventions Planifiées", [139, 92, 246]);
                    drawKpiCard(doc, margin + (kpiWidth + 5) * 2, currentY, kpiWidth, kpiHeight, "Pièces de Rechange", `${totalPDRs}`, `issues de ${tasksWithPDR} tâches`, [16, 185, 129]);
                    drawKpiCard(doc, margin + (kpiWidth + 5) * 3, currentY, kpiWidth, kpiHeight, "Sécurité (HSE)", `${highRiskCount}`, "Tâches à Haut Risque (THR)", [239, 68, 68]);

                    currentY += kpiHeight + 5;

                    // Row 2
                    drawKpiCard(doc, margin, currentY, kpiWidth, kpiHeight, "Échafaudage", `${scaffoldingCount}`, `dont ${bothCount} avec manutention`, [34, 211, 238]);
                    drawKpiCard(doc, margin + kpiWidth + 5, currentY, kpiWidth, kpiHeight, "Manutention", `${handlingCount}`, `dont ${bothCount} avec échafaudage`, [129, 140, 248]);

                    const prepTypesCount = Object.keys(tasksByMaintenance).length;
                    drawKpiCard(doc, margin + (kpiWidth + 5) * 2, currentY, kpiWidth, kpiHeight, "Types Maintenance", `${prepTypesCount}`, "Classifications utilisées", [245, 158, 11]);

                    const famCount = Object.keys(familleStats).length;
                    drawKpiCard(doc, margin + (kpiWidth + 5) * 3, currentY, kpiWidth, kpiHeight, "Couverture Familles", `${famCount}`, "Équipements distincts impactés", [168, 85, 247]);

                    currentY += kpiHeight + 15;
                }

                if (dashboardOpts.charts) {
                    const third = (pageWidth - margin * 2) / 3;
                    const chartCenterX1 = margin + (third / 2);
                    const chartCenterX2 = margin + third + (third / 2);
                    const chartCenterX3 = margin + (third * 2) + (third / 2);

                    doc.setTextColor(15, 23, 42); doc.setFontSize(10); doc.setFont('helvetica', 'bold');

                    // Donut 1: Répartition Maintenance
                    const maintColors = [[16, 185, 129], [245, 158, 11], [59, 130, 246], [139, 92, 246], [100, 116, 139]];
                    const maintData = Object.entries(tasksByMaintenance)
                        .map(([label, val], idx) => ({ label, val, color: maintColors[idx % maintColors.length] as [number, number, number] }))
                        .sort((a, b) => b.val - a.val)
                        .slice(0, 5); // top 5

                    doc.text("Répartition Type Maintenance", chartCenterX1, currentY, { align: 'center' });
                    drawDonutChart(doc, chartCenterX1, currentY + 32, 20, maintData, totalTasks, "TÂCHES");

                    // Donut 2: PDR
                    const donutPDRData = [
                        { label: 'Avec PDR', val: tasksWithPDR, color: [59, 130, 246] as [number, number, number] },
                        { label: 'Sans PDR', val: totalTasks - tasksWithPDR, color: [203, 213, 225] as [number, number, number] }
                    ];
                    doc.text("Besoins Pièces de Rechange", chartCenterX2, currentY, { align: 'center' });
                    drawDonutChart(doc, chartCenterX2, currentY + 32, 20, donutPDRData, totalTasks, "TÂCHES");

                    // Donut 3: Logistique
                    const donutLogisticData = [
                        { label: 'Échafaudage', val: scaffoldingOnlyCount, color: [34, 211, 238] as [number, number, number] },
                        { label: 'Manutention', val: handlingOnlyCount, color: [129, 140, 248] as [number, number, number] },
                        { label: 'Les Deux', val: bothCount, color: [167, 139, 250] as [number, number, number] },
                        { label: 'Aucun', val: totalTasks - scaffoldingOnlyCount - handlingOnlyCount - bothCount, color: [203, 213, 225] as [number, number, number] }
                    ];
                    doc.text("Besoins Logistiques", chartCenterX3, currentY, { align: 'center' });
                    drawDonutChart(doc, chartCenterX3, currentY + 32, 20, donutLogisticData, totalTasks, "TÂCHES");

                    currentY += 32 + 20 + 20;

                    // Bar Charts (Side by Side)
                    const colors = [[59, 130, 246], [16, 185, 129], [245, 158, 11], [139, 92, 246], [239, 68, 68], [14, 165, 233], [236, 72, 153], [100, 116, 139]];

                    const durationData = Object.entries(durationByDiscipline)
                        .map(([label, val], idx) => ({ label, val, color: colors[idx % colors.length] as [number, number, number] }))
                        .sort((a, b) => b.val - a.val);

                    const tasksCountData = Object.entries(tasksByDisciplineCount)
                        .map(([label, val], idx) => ({ label, val, color: colors[(idx + 2) % colors.length] as [number, number, number] }))
                        .sort((a, b) => b.val - a.val);

                    doc.setTextColor(15, 23, 42); doc.setFontSize(10); doc.setFont('helvetica', 'bold');

                    const halfChartWidth = (pageWidth - (margin * 2) - 10) / 2;
                    doc.text("Volume Horaire par Discipline (H-H)", margin, currentY);
                    drawVerticalColumnChart(doc, margin, currentY + 8, halfChartWidth, 45, durationData);

                    doc.text("Nombre de Tâches par Discipline", margin + halfChartWidth + 10, currentY);
                    drawVerticalColumnChart(doc, margin + halfChartWidth + 10, currentY + 8, halfChartWidth, 45, tasksCountData);

                    currentY += 45 + 15;
                }

                doc.addPage();
                currentY = margin;

            } else {
                drawHeader(doc, title, parameters, filter);
                currentY = 50;
            }

            if (showChronology) {
                doc.setDrawColor(245, 158, 11);
                doc.setLineWidth(1.5);
                doc.line(margin, currentY, margin, currentY + 8);

                doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
                doc.text("CHRONOLOGIE DE L'ARRÊT", margin + 4, currentY + 6);
                currentY += 15;

                const chronologyTableBody = specialTasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                    .map(task => [cleanText(task.action), formatNullableDate(task.startTime), formatNullableDate(task.endTime), task.duration.toFixed(2)]);


                autoTable(doc, {
                    startY: currentY,
                    head: [['Événement', 'Début Plan.', 'Fin Plan.', 'DURÉE (H)']],
                    body: chronologyTableBody,
                    theme: 'grid',
                    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 10 },
                    styles: { fontSize: 10, cellPadding: 2.5, valign: 'middle' },
                    columnStyles: { 0: { cellWidth: 120 }, 3: { halign: 'right' } },
                    rowPageBreak: 'avoid',
                    didParseCell: (data) => { if (data.section === 'body') data.cell.text = [cleanText(data.cell.raw as string)]; }
                });

                doc.addPage();
                currentY = margin;
            }

            doc.setDrawColor(16, 185, 129);
            doc.setLineWidth(1.5);
            doc.line(margin, currentY, margin, currentY + 8);
            doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
            doc.text("LISTE DES TRAVAUX PLANIFIÉS", margin + 4, currentY + 6);
            currentY += 15;

            const groupedByFamily: Record<string, ScheduledTask[]> = {};
            
            const taskGroups = new Map<string, ScheduledTask[]>();
            tasksToExport.forEach(task => {
                const key = (task.ot && task.action) ? `${task.ot}_${task.action}` : (task.multiDisciplineId || `single_${task.id}`);
                if (!taskGroups.has(key)) taskGroups.set(key, []);
                taskGroups.get(key)!.push(task);
            });

            const mergedTasks: ScheduledTask[] = [];
            taskGroups.forEach(group => {
                const mainTask = group[0];
                if (group.length > 1) {
                    const combinedManpower = group.reduce((sum, t) => sum + (t.manpower || 0), 0);
                    const combinedManHours = group.reduce((sum, t) => sum + (t.manHours || 0), 0);
                    const combinedDisciplines = Array.from(new Set(group.map(t => t.discipline))).join('-');
                    
                    mergedTasks.push({
                        ...mainTask,
                        discipline: combinedDisciplines,
                        manpower: combinedManpower,
                        manHours: combinedManHours
                    });
                } else {
                    mergedTasks.push(mainTask);
                }
            });

            mergedTasks.forEach(task => {
                const key = task.family || 'Autres';
                if (!groupedByFamily[key]) groupedByFamily[key] = [];
                groupedByFamily[key].push(task);
            });

            const tableHead = [columns.map(c => c.label)];
            const mapTaskToRow = (t: ScheduledTask) => columns.map(col => {
                let val = '';
                switch (col.key) {
                    case 'action': val = t.action; break;
                    case 'ot': val = t.ot || ''; break;
                    case 'avis': val = t.avis || ''; break;
                    case 'equipment': val = t.equipment; break;
                    case 'discipline': val = t.discipline; break;
                    case 'team': val = t.team; break;
                    case 'maintenanceType': val = t.maintenanceType || ''; break;
                    case 'startTime': val = formatDate(t.startTime); break;
                    case 'endTime': val = formatDate(t.endTime); break;
                    case 'manpower': val = String(t.manpower); break;
                    case 'duration': val = t.duration.toFixed(2); break;
                    case 'manHours': val = t.manHours.toFixed(2); break;
                    default: val = '';
                }
                return cleanText(val);
            });

            const columnStyles: Record<string, any> = {};
            let firstNumericColIndex = -1;

            columns.forEach((col, index) => {
                if (['duration', 'manpower', 'manHours'].includes(col.key)) {
                    columnStyles[index] = { halign: 'right' };
                    if (firstNumericColIndex === -1) firstNumericColIndex = index;
                } else if (col.key === 'action') {
                    columnStyles[index] = { cellWidth: 80 };
                } else if (col.key === 'equipment') {
                    columnStyles[index] = { cellWidth: 50 };
                }
            });

            for (const familyName of familyOrder) {
                const tasks = groupedByFamily[familyName];
                if (!tasks) continue;

                const sortedFamilyTasks = tasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
                const tableBody = sortedFamilyTasks.map(mapTaskToRow);

                const minStart = new Date(Math.min(...sortedFamilyTasks.map(t => t.startTime.getTime())));
                const maxEnd = new Date(Math.max(...sortedFamilyTasks.map(t => t.endTime.getTime())));

                let tableFoot = undefined;
                if (showSubtotals) {
                    const totalDuration = sortedFamilyTasks.reduce((sum, t) => sum + t.duration, 0);
                    const totalManHours = sortedFamilyTasks.reduce((sum, t) => sum + t.manHours, 0);
                    const durIdx = columns.findIndex(c => c.key === 'duration');
                    const hhIdx = columns.findIndex(c => c.key === 'manHours');
                    if (firstNumericColIndex > 0) {
                        const footerCells = [];
                        footerCells.push({ content: 'TOTAL GROUPE', colSpan: firstNumericColIndex, styles: { halign: 'center', fontStyle: 'bold' } });
                        for (let i = firstNumericColIndex; i < columns.length; i++) {
                            let content = '';
                            if (i === durIdx) content = totalDuration.toFixed(2);
                            if (i === hhIdx) content = totalManHours.toFixed(2);
                            footerCells.push({ content, styles: { halign: 'right', fontStyle: 'bold' } });
                        }
                        tableFoot = [footerCells];
                    }
                }

                if (currentY + 25 > doc.internal.pageSize.getHeight() - margin) {
                    doc.addPage();
                    currentY = margin;
                }

                const capsuleWidth = pageWidth - (margin * 2);
                drawCapsuleHeader(doc, margin, currentY, capsuleWidth, 8, familyName, sortedFamilyTasks.length, minStart, maxEnd);
                currentY += 10;

                autoTable(doc, {
                    startY: currentY,
                    head: tableHead,
                    body: tableBody,
                    foot: tableFoot,
                    theme: 'striped',
                    headStyles: { fillColor: [71, 85, 105], textColor: 255, fontSize: 10 },
                    footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', lineColor: [200, 200, 200], lineWidth: { top: 0.1 } },
                    styles: { fontSize: 9, cellPadding: 2, valign: 'middle', lineColor: [220, 220, 220], lineWidth: 0.1 },
                    columnStyles: columnStyles,
                    rowPageBreak: 'avoid',
                    willDrawCell: (data) => {
                        if (data.section === 'body') {
                            const rowIndex = data.row.index;
                            if (rowIndex < sortedFamilyTasks.length) {
                                const originalTask = sortedFamilyTasks[rowIndex];
                                if (originalTask) {
                                    if (originalTask.maintenanceType?.toLowerCase().includes('corrective')) {
                                        data.cell.styles.fillColor = [254, 226, 226];
                                    }
                                    if (originalTask.isHighRisk && columns[data.column.index].key === 'action') {
                                        data.cell.styles.textColor = [220, 38, 38];
                                        data.cell.styles.fontStyle = 'bold';
                                    }
                                }
                            }
                        }
                    },
                    didDrawPage: (data) => {
                        currentY = data.cursor?.y ? data.cursor.y : margin;
                    },
                    didParseCell: (data) => {
                        if (data.section === 'head' || data.section === 'foot') {
                            if (typeof data.cell.raw === 'string') {
                                data.cell.text = [cleanText(data.cell.raw)];
                            }
                        }
                    }
                });
                currentY = (doc as any).lastAutoTable.finalY + 10;
            }

            const pageCount = (doc as any).internal.pages.length;
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text('Created by PlanneX', margin, pageHeight - 10, { align: 'left' });
                doc.text(`Page ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            }

            resolve(doc);
        } catch (error) {
            console.error("Error during PDF generation:", error);
            reject(error);
        }
    });
};
