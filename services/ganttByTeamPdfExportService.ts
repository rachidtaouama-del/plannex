
import jsPDF from 'jspdf';
import type { CalculationResults, ScheduledTask, AppParameters } from '../types';

interface DisplayOptions {
    timelineUnit: 'Heures' | 'Jours' | 'Semaines' | 'Mois' | 'Ann\u00e9es';
    timelineInterval: number;
}

const formatTime = (date: Date): string =>
    date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const formatDateShort = (date: Date): string =>
    date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
const formatDateTimeShort = (date: Date): string =>
    date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(' à', '');

// ── CINEMATIC COVER PAGE ─────────────────────────────────────────────────────
const drawGanttTeamCoverPage = (
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

    // 1. Dark canvas
    doc.setFillColor(...DARK); doc.rect(0, 0, W, H, 'F');

    // 2. Diagonal stripe texture
    doc.setDrawColor(...EMERD); doc.setLineWidth(0.25);
    for (let i = 0; i <= 14; i++) {
        const x0 = W * 0.55 + i * 13;
        doc.setGState(new (doc as any).GState({ opacity: 0.04 + i * 0.004 }));
        doc.line(x0, 0, x0 + H, H);
    }
    doc.setGState(new (doc as any).GState({ opacity: 1 }));

    // 3. Left accent panel
    const pW = 18;
    doc.setFillColor(...PANEL); doc.rect(0, 0, pW, H, 'F');
    const aW = 3;
    doc.setFillColor(...EMERD); doc.rect(pW - aW, 0, aW, H * 0.40, 'F');
    doc.setFillColor(...BLUE); doc.rect(pW - aW, H * 0.40, aW, H * 0.25, 'F');
    doc.setFillColor(...PURP); doc.rect(pW - aW, H * 0.65, aW, H * 0.20, 'F');
    doc.setFillColor(...ORANG); doc.rect(pW - aW, H * 0.85, aW, H * 0.15, 'F');

    // 4. Top bar
    const tbH = 22;
    doc.setFillColor(...PANEL); doc.rect(pW, 0, W - pW, tbH, 'F');
    doc.setFillColor(...EMERD); doc.rect(pW, 0, (W - pW) * 0.55, 2, 'F');
    doc.setFillColor(...BLUE); doc.rect(pW + (W - pW) * 0.55, 0, (W - pW) * 0.45, 2, 'F');

    // Logo
    const lX = pW + 12, lY = tbH / 2;
    doc.setFillColor(...EMERD); doc.circle(lX, lY, 5, 'F');
    doc.setFillColor(...DARK); doc.circle(lX, lY, 3, 'F');
    doc.setFillColor(...EMERD); doc.circle(lX, lY, 1.2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...TWHT);
    doc.text('PlanneX', lX + 8, lY + 4);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...EMERD);
    doc.text('I N T E L L I G E N C E   E N G I N E', lX + 8, lY + 8.5);

    // Badge
    const bW = 68;
    doc.setFillColor(...EMERD); doc.roundedRect(W - 14 - bW, 5, bW, 12, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...DARK);
    doc.text('GANTT PAR EQUIPE — PDF', W - 14 - bW / 2, 12.5, { align: 'center' });

    // 5. Category tag
    const tY = tbH + 18;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...EMERD);
    doc.text('PLANIFICATION GANTT  /  ORDONNANCEMENT PAR EQUIPE', pW + 14, tY);
    doc.setDrawColor(...EMERD); doc.setLineWidth(0.4);
    doc.line(pW + 14, tY + 2, pW + 14 + 130, tY + 2);

    // 6. Mega title
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

    // 7. Period pill
    const start = filter ? filter.start : new Date(parameters.shutdownStart);
    const end = filter ? filter.end : new Date(parameters.shutdownEnd);
    const perY = ulY + 16;
    const perText = `Periode : ${start.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} au ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`;
    doc.setFillColor(15, 23, 42); doc.roundedRect(pW + 14, perY - 6, 155, 11, 2, 2, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...TMUT);
    doc.text(perText, pW + 19, perY + 1.5);

    // 8. KPI strip
    const totalTasks = results.scheduledTasks.length;
    const totalMH = (results.kpis?.totalManHours || results.scheduledTasks.reduce((s, t) => s + t.manHours, 0)).toFixed(0);
    const totalTeams = new Set(results.scheduledTasks.map(t => t.team)).size;
    const disciplines = new Set(results.scheduledTasks.map(t => t.discipline)).size;
    const durationH = ((end.getTime() - start.getTime()) / 3600000).toFixed(0);

    const kpis = [
        { l: 'TACHES', v: String(totalTasks), c: EMERD },
        { l: 'EQUIPES', v: String(totalTeams), c: BLUE },
        { l: 'DISCIPLINES', v: String(disciplines), c: PURP },
        { l: 'CHARGE H-H', v: totalMH, c: ORANG },
        { l: 'DUREE (H)', v: durationH, c: RED },
    ];
    const kpX = W * 0.60, kpW = W - kpX - 14;
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

    // 9. Section header
    const secY = Math.max(perY + 22, mTY + tBH + 55);
    doc.setFillColor(15, 23, 42); doc.rect(pW, secY - 1, W - pW, 14, 'F');
    doc.setFillColor(...EMERD); doc.rect(pW, secY - 1, 3, 14, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...EMERD);
    doc.text('INFORMATIONS DU PROJET', pW + 10, secY + 7);

    // 10. Metadata grid
    const td = new Date();
    const gd = `${td.getDate().toString().padStart(2, '0')}/${(td.getMonth() + 1).toString().padStart(2, '0')}/${td.getFullYear()}`;
    const metas = [
        { l: 'Generated', v: gd },
        { l: 'Classification', v: 'USAGE INTERNE' },
        { l: 'Software', v: 'PlanneX Intelligence Engine' },
        { l: 'Version', v: 'v4.0 - Gantt Control Edition' },
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

    // 11. Bottom capsule bar
    const bBarY = H - 22;
    doc.setFillColor(...PANEL); doc.rect(pW, bBarY, W - pW, 22, 'F');
    doc.setDrawColor(30, 41, 59); doc.setLineWidth(0.3); doc.line(pW, bBarY, W, bBarY);
    const caps: { t: string; c: [number, number, number] }[] = [
        { t: 'GANTT PAR EQUIPE', c: EMERD },
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

    // 12. Corner marks
    doc.setDrawColor(...EMERD); doc.setLineWidth(0.5);
    doc.line(pW + 8, tbH + 4, pW + 13, tbH + 4);
    doc.line(pW + 8, tbH + 4, pW + 8, tbH + 9);
    doc.line(W - 14, bBarY - 8, W - 19, bBarY - 8);
    doc.line(W - 14, bBarY - 8, W - 14, bBarY - 13);
};

// ────────────────────────────────────────────────────────────────────────────

export const exportGanttByTeamPDF = async (
    results: CalculationResults,
    parameters: AppParameters,
    title: string,
    teamOrder: string[],
    displayOptions: DisplayOptions,
    filter?: { start: Date, end: Date } | null
): Promise<jsPDF> => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 10;

    // ── Cover page ──
    drawGanttTeamCoverPage(doc, results, parameters, title, filter);
    doc.addPage();

    // Layout
    const leftColWidth = 140;
    const chartAreaX = margin + leftColWidth;
    const chartAreaWidth = pageWidth - margin - chartAreaX;
    const headerHeight = 20;
    const rowHeight = 14;
    const barHeight = 7;
    const fontSizeBody = 8;

    let tasksToExport = results.scheduledTasks;
    if (filter) {
        const fs = filter.start.getTime(), fe = filter.end.getTime();
        tasksToExport = tasksToExport.filter(t => t.startTime.getTime() < fe && t.endTime.getTime() > fs);
    }

    const groupedByTeam: Record<string, ScheduledTask[]> = {};
    tasksToExport.forEach(task => {
        if (!groupedByTeam[task.team]) groupedByTeam[task.team] = [];
        groupedByTeam[task.team].push(task);
    });

    let chartStart = new Date(parameters.shutdownStart).getTime();
    let chartEnd = new Date(parameters.shutdownEnd).getTime();
    if (tasksToExport.length > 0) {
        if (filter) {
            chartStart = filter.start.getTime();
            chartEnd = filter.end.getTime();
        } else {
            chartStart = Math.min(chartStart, ...tasksToExport.map(t => t.startTime.getTime()));
            chartEnd = Math.max(chartEnd, ...tasksToExport.map(t => t.endTime.getTime()));
            const buf = (chartEnd - chartStart) * 0.02;
            chartStart -= buf; chartEnd += buf;
        }
    }
    const totalDurationMs = chartEnd - chartStart;

    let currentY = margin;
    let pageNumber = 2; // cover is page 1

    const drawTimelineGrid = (startY: number, endY: number) => {
        const intervalHours = displayOptions.timelineUnit === 'Jours' ? 24 : Math.max(1, displayOptions.timelineInterval);
        const tickStartDate = new Date(chartStart); tickStartDate.setMinutes(0, 0, 0);
        doc.setFontSize(7); doc.setLineWidth(0.1);
        while (tickStartDate.getTime() <= chartEnd) {
            const x = chartAreaX + ((tickStartDate.getTime() - chartStart) / totalDurationMs) * chartAreaWidth;
            if (x >= chartAreaX && x <= pageWidth - margin) {
                if (tickStartDate.getHours() === 0) { doc.setDrawColor(180, 180, 180); (doc as any).setLineDash([], 0); }
                else { doc.setDrawColor(230, 230, 230); (doc as any).setLineDash([1, 1], 0); }
                doc.line(x, startY, x, endY);
                (doc as any).setLineDash([], 0);
            }
            tickStartDate.setHours(tickStartDate.getHours() + intervalHours);
        }
    };

    const drawHeader = (teamName: string, teamTasks: ScheduledTask[]) => {
        doc.setFillColor(248, 250, 252); doc.rect(0, 0, pageWidth, headerHeight + margin, 'F');
        doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
        doc.text(`PLAN DE TRAVAIL : ${teamName.toUpperCase()}`, margin, margin + 8);
        const totalHours = teamTasks.reduce((s, t) => s + t.manHours, 0);
        const uniqueEquipments = new Set(teamTasks.map(t => t.equipment)).size;
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
        doc.text(`${teamTasks.length} Tâches  •  ${totalHours.toFixed(1)} Heures-Homme  •  ${uniqueEquipments} Équipements`, margin, margin + 14);
        const timelineY = margin + headerHeight;
        const intervalHours = displayOptions.timelineUnit === 'Jours' ? 24 : Math.max(1, displayOptions.timelineInterval);
        const tickStartDate = new Date(chartStart); tickStartDate.setMinutes(0, 0, 0);
        doc.setFillColor(241, 245, 249); doc.rect(chartAreaX, timelineY - 10, chartAreaWidth, 10, 'F');
        while (tickStartDate.getTime() <= chartEnd) {
            const x = chartAreaX + ((tickStartDate.getTime() - chartStart) / totalDurationMs) * chartAreaWidth;
            if (x >= chartAreaX && x <= pageWidth - margin) {
                let label = '';
                if (tickStartDate.getHours() === 0 || displayOptions.timelineUnit === 'Jours') {
                    doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); label = formatDateShort(tickStartDate);
                } else { doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139); label = formatTime(tickStartDate); }
                doc.setFontSize(7); doc.text(label, x, timelineY - 3, { align: 'center' });
            }
            tickStartDate.setHours(tickStartDate.getHours() + intervalHours);
        }
        doc.setFillColor(226, 232, 240); doc.rect(margin, timelineY - 10, leftColWidth, 10, 'F');
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(71, 85, 105);
        doc.text('SUIVI', margin + 2, timelineY - 3);
        doc.text('DESCRIPTION / ÉQUIPEMENT', margin + 15, timelineY - 3);
        doc.text('DURÉE/PERS', margin + leftColWidth - 2, timelineY - 3, { align: 'right' });
        return timelineY;
    };

    const drawFooter = (pageNum: number) => {
        doc.setFontSize(8); doc.setTextColor(148, 163, 184);
        doc.text(`Page ${pageNum} - ${title}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
        doc.text('Created by PlanneX', margin, pageHeight - 5);
    };

    let isFirstPage = true;
    for (const teamName of teamOrder) {
        const teamTasks = groupedByTeam[teamName];
        if (!teamTasks || teamTasks.length === 0) continue;
        teamTasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        if (!isFirstPage) { doc.addPage(); pageNumber++; }
        isFirstPage = false;
        let contentStartY = drawHeader(teamName, teamTasks);
        currentY = contentStartY;
        drawTimelineGrid(contentStartY, pageHeight - margin);

        for (const task of teamTasks) {
            doc.setFontSize(fontSizeBody); doc.setFont('helvetica', 'bold');
            const textWidth = leftColWidth - 12 - 25;
            const actionLines = doc.splitTextToSize(task.action, textWidth);
            const lineCount = actionLines.length;
            const dynamicRowHeight = Math.max(rowHeight, 6 + (lineCount * 4) + 6);
            if (currentY + dynamicRowHeight > pageHeight - margin) {
                drawFooter(pageNumber); doc.addPage(); pageNumber++;
                contentStartY = drawHeader(`${teamName} (suite)`, teamTasks);
                currentY = contentStartY;
                drawTimelineGrid(contentStartY, pageHeight - margin);
            }
            if (Math.round(currentY) % 2 !== 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, currentY, pageWidth - 2 * margin, dynamicRowHeight, 'F'); }
            doc.setDrawColor(100, 116, 139); doc.setLineWidth(0.3); doc.rect(margin + 2, currentY + 4, 4, 4);
            doc.setTextColor(30, 41, 59); doc.setFontSize(fontSizeBody); doc.setFont('helvetica', 'bold');
            let textY = currentY + 5; doc.text(actionLines, margin + 12, textY);
            textY += (lineCount * 4) + 1;
            doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
            doc.text(`${task.equipment}`, margin + 12, textY);
            doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
            doc.text(`${task.duration.toFixed(1)}h`, margin + leftColWidth - 2, currentY + 5, { align: 'right' });
            doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
            doc.text(`${task.manpower} pers.`, margin + leftColWidth - 2, currentY + 9, { align: 'right' });
            doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.1);
            doc.line(chartAreaX, currentY, chartAreaX, currentY + dynamicRowHeight);
            const startMs = task.startTime.getTime();
            const endMs = task.endTime.getTime();
            const drawStartMs = Math.max(startMs, chartStart);
            const drawEndMs = Math.min(endMs, chartEnd);
            if (drawEndMs > drawStartMs) {
                const barX = chartAreaX + ((drawStartMs - chartStart) / totalDurationMs) * chartAreaWidth;
                const barW = Math.max(1, ((drawEndMs - drawStartMs) / totalDurationMs) * chartAreaWidth);
                const barY = currentY + (dynamicRowHeight - barHeight) / 2;
                const barColor: [number, number, number] = (task.isHighRisk || task.isKeyEvent) ? [239, 68, 68] : [59, 130, 246];
                doc.setFillColor(...barColor); doc.roundedRect(barX, barY, barW, barHeight, 1, 1, 'F');
                const labelText = `${formatDateTimeShort(task.startTime)} - ${formatDateTimeShort(task.endTime)}`;
                doc.setFontSize(6); doc.setTextColor(71, 85, 105);
                const labelX = Math.min(barX + barW + 2, pageWidth - margin - doc.getTextWidth(labelText));
                doc.text(labelText, labelX, barY + barHeight / 2 + 0.5, { align: 'left', baseline: 'middle' });
            }
            doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.1);
            doc.line(margin, currentY + dynamicRowHeight, pageWidth - margin, currentY + dynamicRowHeight);
            currentY += dynamicRowHeight;
        }
        drawFooter(pageNumber);
    }
    return doc;
};
