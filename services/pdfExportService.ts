import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type {
    ReportData,
    AppParameters,
    EvaluationData,
    CalculationResults,
    EvaluationKpis,
    ReportPages,
    ChronologyEvent,
    ScheduledTask,
    TaskStatus
} from '../types';

// --- HELPER FUNCTIONS ---

const formatDate = (date: Date | string | null, withTime = true): string => {
    if (!date) return 'N/A';
    try {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isNaN(d.getTime())) return 'N/A';
        const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
        if (withTime) { options.hour = '2-digit'; options.minute = '2-digit'; }
        return d.toLocaleString('fr-FR', options);
    } catch (e) { return 'Date Invalide'; }
};

const calculateDuration = (startStr: string, endStr: string): number | null => {
    if (!startStr || !endStr) return null;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return null;
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};

const addFooter = (doc: jsPDF, margin: number, preparedBy: string = '') => {
    const pageCount = (doc as any).internal.pages.length;
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        if (i === 1) continue; // Skip cover page footer
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text('Created by PlanneX', margin, pageHeight - 10, { align: 'left' });
        if (preparedBy) {
            doc.text(`Réalisé par: ${preparedBy}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
        doc.text(`Page ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }
};

const drawCoverPage = (doc: jsPDF, title: string, preparedBy: string, startDate: string, endDate: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Dark Background
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Decorative blobs (Glassmorphism effect in PDF)
    doc.setFillColor(6, 182, 212, 0.1); // cyan-500 with alpha
    doc.circle(pageWidth, 0, 150, 'F');
    doc.setFillColor(139, 92, 246, 0.05); // purple-500 with alpha
    doc.circle(0, pageHeight, 200, 'F');

    // Branding
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(48);
    doc.setFont('helvetica', 'bold');
    doc.text('PlanneX', 30, 40);

    doc.setDrawColor(34, 211, 238); // cyan-400
    doc.setLineWidth(2);
    doc.line(30, 48, 70, 48);

    // Main Title
    doc.setFontSize(72);
    doc.setTextColor(255, 255, 255);
    const titleLines = doc.splitTextToSize(title.toUpperCase(), pageWidth - 100);
    doc.text(titleLines, 30, 140);

    // Subtitle / Period
    doc.setFontSize(22);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFont('helvetica', 'normal');
    const start = formatDate(startDate, true);
    const end = formatDate(endDate, true);
    doc.text(`Rapport Post-Arrêt : Du ${start} au ${end}`, 30, 175 + (titleLines.length - 1) * 15);

    // Prepared By Box
    if (preparedBy) {
        doc.setFillColor(30, 41, 59); // slate-800
        doc.roundedRect(30, 240, 140, 60, 5, 5, 'F');

        doc.setFontSize(14);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text("RÉALISÉ PAR / SCHEDULER", 42, 258);

        doc.setFontSize(28);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text(preparedBy.toUpperCase(), 42, 285);
    }

    // Decorative graphic
    doc.setDrawColor(6, 182, 212);
    doc.setLineWidth(0.6);
    for (let i = 0; i < 15; i++) {
        doc.line(pageWidth - 80 + (i * 4), 120, pageWidth - 80 + (i * 4), 220);
    }

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`Document officiel généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth - 30, pageHeight - 20, { align: 'right' });
};

const drawPerformanceChart = (doc: jsPDF, startY: number, history: any[], margin: number, pageWidth: number): number => {
    const chartHeight = 100;
    const chartWidth = pageWidth - (margin * 2);
    const gridRows = 5;
    const bottomY = startY + chartHeight - 10;
    const topY = startY + 12;
    const chartAreaHeight = bottomY - topY;
    const chartLeft = margin + 15;
    const chartAreaWidth = chartWidth - 25;

    // Background
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(margin, startY, chartWidth, chartHeight, 4, 4, 'F');

    // Move Title Above Chart
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFont('helvetica', 'bold');
    doc.text("Performance de l'Exécution : Planifié vs Réel", margin, startY - 5);

    // Background
    doc.setFillColor(15, 23, 42); // slate-900
    doc.roundedRect(margin, startY, chartWidth, chartHeight, 4, 4, 'F');

    // Title inside for contrast if needed, but keeping it above as per request.
    // doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.text("Trajectoire de réalisation cumulative", margin + 10, startY + 10);

    // Grid Lines
    doc.setDrawColor(51, 65, 85); // slate-700
    doc.setLineWidth(0.1);
    for (let i = 0; i <= gridRows; i++) {
        const y = bottomY - (i * (chartAreaHeight / gridRows));
        doc.line(chartLeft, y, chartLeft + chartAreaWidth, y);
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(`${i * 20}%`, chartLeft - 2, y + 1, { align: 'right' });
    }

    if (!history || history.length < 2) return startY + chartHeight + 10;

    const getTimeX = (index: number) => chartLeft + (index / (history.length - 1)) * chartAreaWidth;
    const getValY = (val: number) => bottomY - (val / 100) * chartAreaHeight;

    // X-Axis Time Labels
    const numXLabels = Math.min(history.length, 10);
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    for (let i = 0; i < numXLabels; i++) {
        const idx = Math.floor((i / (numXLabels - 1)) * (history.length - 1));
        const item = history[idx];
        if (item) {
            const labelX = getTimeX(idx);
            const date = new Date(item.timestamp);
            const label = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
            doc.text(label, labelX, bottomY + 5, { align: 'center' });
        }
    }

    // Planned Path (Cyan)
    doc.setDrawColor(34, 211, 238);
    doc.setLineWidth(0.5);
    for (let i = 0; i < history.length - 1; i++) {
        doc.line(getTimeX(i), getValY(history[i].planned), getTimeX(i + 1), getValY(history[i + 1].planned));
    }

    // Actual Path (Emerald)
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(1.2);
    for (let i = 0; i < history.length - 1; i++) {
        if (history[i + 1].actual === 0 && i > history.length / 2) break;
        doc.line(getTimeX(i), getValY(history[i].actual), getTimeX(i + 1), getValY(history[i + 1].actual));
    }

    // Legend
    const legendY = startY + 10;
    doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    doc.setDrawColor(34, 211, 238); doc.line(pageWidth - margin - 50, legendY - 1, pageWidth - margin - 45, legendY - 1);
    doc.text("Planifié", pageWidth - margin - 43, legendY);
    doc.setDrawColor(16, 185, 129); doc.line(pageWidth - margin - 30, legendY - 1, pageWidth - margin - 25, legendY - 1);
    doc.text("Réel", pageWidth - margin - 23, legendY);

    return startY + chartHeight + 15;
};

const drawComparativeAnalysis = (doc: jsPDF, startY: number, results: CalculationResults, evaluationData: EvaluationData, margin: number, pageWidth: number): number => {
    const chartHeight = 100;
    const chartGap = 8;
    const chartWidth = (pageWidth - (margin * 2) - (chartGap * 2)) / 3;

    doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text("Analyse Comparative : Planifié vs Supplémentaire", margin, startY);
    startY += 10;

    let globalExtraHH = 0;
    results.scheduledTasks.forEach(t => {
        const evalTask = evaluationData.tasks[t.id];
        if (evalTask?.actualManpower && evalTask.actualManpower > t.manpower) {
            const actualDur = calculateDuration(evalTask.actualStart, evalTask.actualEnd) ?? t.duration;
            globalExtraHH += (evalTask.actualManpower - t.manpower) * actualDur;
        }
    });

    const plannedHH = results.kpis.totalManHours;
    const suppHH = evaluationData.supplementaryTasks.reduce((sum, t) => sum + t.totalManHours, 0);
    const totalHH = plannedHH + suppHH + globalExtraHH;

    // Helper for Legend/Keys
    const drawKeys = (x: number, y: number) => {
        doc.setFontSize(7);
        doc.setFillColor(14, 165, 233); doc.rect(x, y, 3, 3, 'F');
        doc.setTextColor(100, 116, 139); doc.text("Planifié", x + 4, y + 2.5);

        doc.setFillColor(244, 63, 94); doc.rect(x + 18, y, 3, 3, 'F');
        doc.text("Suppl.", x + 22, y + 2.5);

        doc.setFillColor(245, 158, 11); doc.rect(x + 36, y, 3, 3, 'F');
        doc.text("Extra", x + 40, y + 2.5);
    };

    // 1. Charge Globale (H-H)
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, startY, chartWidth, chartHeight, 5, 5, 'F');
    doc.setFontSize(10); doc.setTextColor(148, 163, 184); doc.setFont('helvetica', 'bold');
    doc.text("Charge Globale (H-H)", margin + chartWidth / 2, startY + 10, { align: 'center' });

    // Circular Representation - Donut with Segments
    const centerX = margin + chartWidth / 2;
    const centerY = startY + 50;
    const radius = 25;
    doc.setLineWidth(10);
    doc.setDrawColor(241, 245, 249); doc.circle(centerX, centerY, radius, 'S');

    // Calculate segments (as percentages of 100)
    const pPct = (plannedHH / totalHH) * 100;
    const sPct = (suppHH / totalHH) * 100;
    const ePct = (globalExtraHH / totalHH) * 100;

    let currentStartAngle = -Math.PI / 2;
    const drawArc = (pct: number, color: number[]) => {
        if (pct <= 0.01) return;
        doc.setDrawColor(color[0], color[1], color[2]);
        const segmentCount = Math.max(1, Math.floor(pct * 2));
        const step = (Math.PI * 2 * (pct / 100)) / segmentCount;
        for (let i = 0; i < segmentCount; i++) {
            const a1 = currentStartAngle + i * step;
            const a2 = currentStartAngle + (i + 1) * step;
            doc.line(
                centerX + radius * Math.cos(a1), centerY + radius * Math.sin(a1),
                centerX + radius * Math.cos(a2), centerY + radius * Math.sin(a2)
            );
        }
        currentStartAngle += (Math.PI * 2 * (pct / 100));
    };

    drawArc(pPct, [14, 165, 233]); // Planned Blue
    drawArc(sPct, [225, 29, 72]); // Supp Rose
    drawArc(ePct, [245, 158, 11]); // Extra Amber

    // Values inside the donut
    doc.setFontSize(26); doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold');
    doc.text(`${totalHH.toFixed(0)}`, centerX, centerY + 4, { align: 'center' });
    doc.setFontSize(8); doc.setTextColor(148, 163, 184); doc.setFont('helvetica', 'normal');
    doc.text("Total Heures-Homme", centerX, centerY + 12, { align: 'center' });

    // Legend below
    doc.setFontSize(9); doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold');
    doc.text(`${plannedHH.toFixed(0)}h`, margin + 15, startY + chartHeight - 15);
    doc.setFontSize(7); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal');
    doc.text("PLANIFIÉ", margin + 15, startY + chartHeight - 10);

    doc.setFontSize(9); doc.setTextColor(225, 29, 72); doc.setFont('helvetica', 'bold');
    doc.text(`${suppHH.toFixed(0)}h`, margin + chartWidth / 2, startY + chartHeight - 15, { align: 'center' });
    doc.setFontSize(7); doc.setTextColor(225, 29, 72, 0.6); doc.text("SUPPLÉMENTAIRE", margin + chartWidth / 2, startY + chartHeight - 10, { align: 'center' });

    doc.setFontSize(9); doc.setTextColor(245, 158, 11); doc.setFont('helvetica', 'bold');
    doc.text(`${globalExtraHH.toFixed(0)}h`, margin + chartWidth - 15, startY + chartHeight - 15, { align: 'right' });
    doc.setFontSize(7); doc.setTextColor(245, 158, 11, 0.6); doc.text("EXTRA RÉEL", margin + chartWidth - 15, startY + chartHeight - 10, { align: 'right' });

    // 2. Maintenance (H-H)
    const x2 = margin + chartWidth + chartGap;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x2, startY, chartWidth, chartHeight, 5, 5, 'F');
    doc.setTextColor(148, 163, 184); doc.text("Maintenance (H-H)", x2 + chartWidth / 2, startY + 10, { align: 'center' });

    drawKeys(x2 + 10, startY + 18);

    const mtStats = new Map<string, { planned: number; supp: number; extra: number }>();
    results.scheduledTasks.forEach(t => {
        const mt = t.maintenanceType || 'N/A';
        const s = mtStats.get(mt) || { planned: 0, supp: 0, extra: 0 };
        s.planned += t.manHours;

        const evalT = evaluationData.tasks[t.id];
        if (evalT?.actualManpower && evalT.actualManpower > t.manpower) {
            const actDur = calculateDuration(evalT.actualStart, evalT.actualEnd) ?? t.duration;
            s.extra += (evalT.actualManpower - t.manpower) * actDur;
        }
        mtStats.set(mt, s);
    });
    evaluationData.supplementaryTasks.forEach(t => {
        const mt = t.maintenanceType || 'N/A';
        const s = mtStats.get(mt) || { planned: 0, supp: 0, extra: 0 };
        s.supp += t.totalManHours;
        mtStats.set(mt, s);
    });

    const mtArray = Array.from(mtStats.entries()).sort((a, b) => (b[1].planned + b[1].supp + b[1].extra) - (a[1].planned + a[1].supp + a[1].extra)).slice(0, 4);
    const maxValMT = Math.max(...mtArray.map(d => Math.max(d[1].planned, d[1].supp, d[1].extra))) || 1;

    mtArray.forEach((d, i) => {
        const by = startY + 36 + (i * 18);
        doc.setFontSize(8); doc.setTextColor(71, 85, 105); doc.text(d[0], x2 + 10, by - 2);
        const pW = (d[1].planned / maxValMT) * (chartWidth - 50);
        const sW = (d[1].supp / maxValMT) * (chartWidth - 50);
        const eW = (d[1].extra / maxValMT) * (chartWidth - 50);

        doc.setFillColor(14, 165, 233); doc.rect(x2 + 10, by, pW, 3, 'F');
        doc.setFontSize(7); doc.text(`${d[1].planned.toFixed(0)}h`, x2 + 10 + pW + 2, by + 2.5);

        doc.setFillColor(244, 63, 94); doc.rect(x2 + 10, by + 4, sW, 3, 'F');
        doc.text(`${d[1].supp.toFixed(0)}h`, x2 + 10 + sW + 2, by + 6.5);

        doc.setFillColor(245, 158, 11); doc.rect(x2 + 10, by + 8, eW, 3, 'F');
        doc.text(`${d[1].extra.toFixed(0)}h`, x2 + 10 + eW + 2, by + 10.5);
    });

    // 3. Charge par Discipline (H-H)
    const x3 = x2 + chartWidth + chartGap;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x3, startY, chartWidth, chartHeight, 5, 5, 'F');
    doc.setTextColor(148, 163, 184); doc.text("Charge par Discipline (H-H)", x3 + chartWidth / 2, startY + 10, { align: 'center' });

    drawKeys(x3 + 10, startY + 18);

    const discStats = new Map<string, { planned: number; supp: number; extra: number }>();
    const knownDisciplines = Array.from(new Set(results.scheduledTasks.map(t => t.discipline.toUpperCase())));

    results.scheduledTasks.forEach(t => {
        const d = t.discipline.toUpperCase();
        const s = discStats.get(d) || { planned: 0, supp: 0, extra: 0 };
        s.planned += t.manHours;

        const evalT = evaluationData.tasks[t.id];
        if (evalT?.actualManpower && evalT.actualManpower > t.manpower) {
            const actDur = calculateDuration(evalT.actualStart, evalT.actualEnd) ?? t.duration;
            s.extra += (evalT.actualManpower - t.manpower) * actDur;
        }
        discStats.set(d, s);
    });

    evaluationData.supplementaryTasks.forEach(t => {
        const team = t.teamDetails[0]?.team || 'AUTRE';
        let matchedDisc = 'AUTRE';
        // Try to find a discipline that matches the team name
        for (const knownD of knownDisciplines) {
            if (team.toUpperCase().includes(knownD) || knownD.includes(team.toUpperCase())) {
                matchedDisc = knownD;
                break;
            }
        }
        if (matchedDisc === 'AUTRE') {
            if (team.toLowerCase().includes('méc')) matchedDisc = 'MECANIQUE';
            else if (team.toLowerCase().includes('chaudron')) matchedDisc = 'CHAUDRONNERIE';
            else if (team.toLowerCase().includes('elec')) matchedDisc = 'ELECTRIQUE';
            else if (team.toLowerCase().includes('instrument')) matchedDisc = 'INSTRUMENTATION';
            else if (team.toLowerCase().includes('nettoyage')) matchedDisc = 'NETTOYAGE';
        }
        const s = discStats.get(matchedDisc) || { planned: 0, supp: 0, extra: 0 };
        s.supp += t.totalManHours;
        discStats.set(matchedDisc, s);
    });

    const discArray = Array.from(discStats.entries())
        .sort((a, b) => (b[1].planned + b[1].supp + b[1].extra) - (a[1].planned + a[1].supp + a[1].extra))
        .slice(0, 6); // Show top 6 for better legibility

    const maxValDisc = Math.max(...discArray.map(d => Math.max(d[1].planned, d[1].supp, d[1].extra))) || 1;

    discArray.forEach((d, i) => {
        const itemY = startY + 32 + (i * 11.5); // Increased spacing to 11.5
        doc.setFontSize(7); doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold');
        doc.text(d[0], x3 + 10, itemY - 1);

        const barAreaW = chartWidth - 30;
        const pW = (d[1].planned / maxValDisc) * barAreaW;
        const sW = (d[1].supp / maxValDisc) * barAreaW;
        const eW = (d[1].extra / maxValDisc) * barAreaW;

        // Planned Bar (Sky Blue)
        doc.setFillColor(14, 165, 233);
        doc.roundedRect(x3 + 10, itemY, Math.max(0.2, pW), 1.8, 0.4, 0.4, 'F');
        doc.setFontSize(5.5); doc.setTextColor(100, 116, 139);
        doc.text(`${d[1].planned.toFixed(0)}h`, x3 + 10 + Math.max(0.2, pW) + 2, itemY + 1.4);

        // Supp Bar (Rose)
        doc.setFillColor(244, 63, 94);
        doc.roundedRect(x3 + 10, itemY + 2.5, Math.max(0.2, sW), 1.8, 0.4, 0.4, 'F');
        doc.text(`${d[1].supp.toFixed(0)}h`, x3 + 10 + Math.max(0.2, sW) + 2, itemY + 3.9);

        // Extra Bar (Amber)
        doc.setFillColor(245, 158, 11);
        doc.roundedRect(x3 + 10, itemY + 5, Math.max(0.2, eW), 1.8, 0.4, 0.4, 'F');
        doc.text(`${d[1].extra.toFixed(0)}h`, x3 + 10 + Math.max(0.2, eW) + 2, itemY + 6.4);
    });

    return startY + chartHeight + 15;
};

const drawRadarChart = (doc: jsPDF, x: number, y: number, radius: number, data: { name: string, progress: number }[]) => {
    const numPoints = data.length;
    if (numPoints < 3) return;
    const angleStep = (Math.PI * 2) / numPoints;

    // Draw polar grid
    doc.setLineWidth(0.1);
    doc.setDrawColor(226, 232, 240);
    for (let i = 1; i <= 5; i++) {
        const r = (radius * i) / 5;
        let prevX = x + r * Math.cos(-Math.PI / 2);
        let prevY = y + r * Math.sin(-Math.PI / 2);
        for (let j = 1; j <= numPoints; j++) {
            const ang = j * angleStep - Math.PI / 2;
            const px = x + r * Math.cos(ang);
            const py = y + r * Math.sin(ang);
            doc.line(prevX, prevY, px, py);
            prevX = px; prevY = py;
        }
    }

    // Draw axes and labels
    doc.setFontSize(8);
    for (let i = 0; i < numPoints; i++) {
        const ang = i * angleStep - Math.PI / 2;
        const ax = x + radius * Math.cos(ang);
        const ay = y + radius * Math.sin(ang);
        doc.setDrawColor(226, 232, 240);
        doc.line(x, y, ax, ay);

        const labelRadius = radius + 15;
        const lx = x + labelRadius * Math.cos(ang);
        const ly = y + labelRadius * Math.sin(ang);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'bold');
        doc.text(data[i].name.toUpperCase(), lx, ly - 3, { align: 'center', maxWidth: 40 });
        doc.setFont('helvetica', 'black');
        doc.setTextColor(15, 23, 42);
        doc.text(`${Math.round(data[i].progress)}%`, lx, ly + 2, { align: 'center' });
    }

    // Draw data polygon
    const points = data.map((d, i) => {
        const r = (radius * (Math.max(1, d.progress))) / 100;
        const ang = i * angleStep - Math.PI / 2;
        return { x: x + r * Math.cos(ang), y: y + r * Math.sin(ang) };
    });

    doc.setLineWidth(1);
    doc.setDrawColor(59, 130, 246);
    for (let i = 0; i < points.length; i++) {
        const next = (i + 1) % points.length;
        doc.line(points[i].x, points[i].y, points[next].x, points[next].y);
    }
};

const drawCircularGauge = (doc: jsPDF, centerX: number, centerY: number, radius: number, progress: number, label: string) => {
    // Outer shadow/background
    doc.setLineWidth(4);
    doc.setDrawColor(241, 245, 249);
    doc.circle(centerX, centerY, radius, 'S');

    // Progress arc
    if (progress > 0) {
        doc.setDrawColor(progress === 100 ? 16 : 139, progress === 100 ? 185 : 92, progress === 100 ? 129 : 246);
        const segments = Math.max(1, Math.floor(progress * 1.5));
        const angleStep = (Math.PI * 2) / 100;
        const startAngle = -Math.PI / 2;

        for (let i = 0; i < segments; i++) {
            const a1 = startAngle + i * angleStep;
            const a2 = startAngle + (i + 1) * angleStep;
            doc.line(
                centerX + radius * Math.cos(a1), centerY + radius * Math.sin(a1),
                centerX + radius * Math.cos(a2), centerY + radius * Math.sin(a2)
            );
        }
    }

    // Text items
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${progress.toFixed(1)}%`, centerX, centerY + 2, { align: 'center' });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const labelLines = doc.splitTextToSize(label.toUpperCase(), radius * 2.5);
    doc.text(labelLines, centerX, centerY + radius + 8, { align: 'center' });
};

const drawGanttChart = (doc: jsPDF, startY: number, chronology: ChronologyEvent[], margin: number, pageWidth: number, timelineIntervalHours: number): number => {
    const validEvents = chronology.filter(e => (e.plannedStart && e.plannedEnd) || (e.actualStart && e.actualEnd));
    if (validEvents.length === 0) return startY;

    const allDates = validEvents.flatMap(e => [e.plannedStart, e.plannedEnd, e.actualStart, e.actualEnd])
        .filter(Boolean).map(d => new Date(d as string).getTime()).filter(t => !isNaN(t));
    if (allDates.length < 2) return startY;

    let chartMinTime = Math.min(...allDates);
    let chartMaxTime = Math.max(...allDates);
    const totalDuration = (chartMaxTime - chartMinTime) || 3600000;

    const labelAreaWidth = 80;
    const chartAreaX = margin + labelAreaWidth;
    const chartAreaWidth = pageWidth - margin - chartAreaX;
    const rowHeight = 15;
    const timelineHeaderHeight = 12;

    // --- LEGEND (Top Right of Section) ---
    const legendY = startY - 2;
    doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'bold');
    doc.setFillColor(251, 191, 36); doc.rect(pageWidth - margin - 50, legendY - 3, 5, 3, 'F');
    doc.text("Planifié", pageWidth - margin - 43, legendY);
    doc.setFillColor(14, 165, 233); doc.rect(pageWidth - margin - 25, legendY - 3, 5, 3, 'F');
    doc.text("Réel", pageWidth - margin - 18, legendY);

    // --- DRAW TIMELINE HEADER ---
    const ticks: number[] = [];
    const intervalMs = timelineIntervalHours * 3600000;

    let firstTick = Math.ceil(chartMinTime / intervalMs) * intervalMs;
    for (let t = firstTick; t <= chartMaxTime; t += intervalMs) {
        ticks.push(t);
    }

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');

    ticks.forEach(t => {
        const x = chartAreaX + ((t - chartMinTime) / totalDuration) * chartAreaWidth;
        if (x >= chartAreaX && x <= pageWidth - margin) {
            const date = new Date(t);
            const label = date.getHours() === 0 ?
                date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) + ' 00:00' :
                `${date.getHours().toString().padStart(2, '0')}:00`;

            doc.text(label, x, startY + 5, { align: 'center' });

            // Grid line
            doc.setDrawColor(241, 245, 249);
            doc.setLineWidth(0.1);
            doc.line(x, startY + 8, x, startY + timelineHeaderHeight + (validEvents.length * rowHeight));
        }
    });

    const chartStartY = startY + timelineHeaderHeight;

    validEvents.forEach((event, index) => {
        const y = chartStartY + (index * rowHeight);
        doc.setFontSize(9); doc.setTextColor(15, 23, 42);
        doc.text(event.label, margin + 2, y + rowHeight / 2, { baseline: 'middle', maxWidth: labelAreaWidth - 4 });

        const calculateX = (timeStr: string) => chartAreaX + ((new Date(timeStr).getTime() - chartMinTime) / totalDuration) * chartAreaWidth;

        if (event.plannedStart && event.plannedEnd) {
            const x1 = calculateX(event.plannedStart);
            const w = calculateX(event.plannedEnd) - x1;
            // Planned Bar (Amber/Yellow - Solid as shown in UX)
            doc.setFillColor(251, 191, 36); doc.rect(Math.max(chartAreaX, x1), y + 4, Math.max(1, w), 3, 'F');
        }

        if (event.actualStart && event.actualEnd) {
            const x1 = calculateX(event.actualStart);
            const w = calculateX(event.actualEnd) - x1;
            // Actual Bar (Sky Blue)
            doc.setFillColor(14, 165, 233); doc.rect(Math.max(chartAreaX, x1), y + 8, Math.max(1, w), 4, 'F');
        }
        doc.setDrawColor(241, 245, 249); doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);
    });

    return chartStartY + (validEvents.length * rowHeight) + 10;
};

const drawProfessionalGantt = (doc: jsPDF, startY: number, tasks: ScheduledTask[], evaluationData: EvaluationData, margin: number, pageWidth: number, timelineIntervalHours: number): number => {
    if (tasks.length === 0) return startY;

    // Grouping by Family
    const grouped = new Map<string, ScheduledTask[]>();
    tasks.forEach(t => {
        const f = t.family || 'AUTRE';
        if (!grouped.has(f)) grouped.set(f, []);
        grouped.get(f)!.push(t);
    });

    const families = Array.from(grouped.keys()).sort();

    // Timeline calculation
    const allDates = tasks.flatMap(t => {
        const evalTask = evaluationData.tasks[t.id];
        return [
            t.startTime.getTime(),
            t.endTime.getTime(),
            evalTask?.actualStart ? new Date(evalTask.actualStart).getTime() : null,
            evalTask?.actualEnd ? new Date(evalTask.actualEnd).getTime() : null
        ].filter(Boolean) as number[];
    });

    let chartMinTime = Math.min(...allDates);
    let chartMaxTime = Math.max(...allDates);
    const duration = chartMaxTime - chartMinTime || 3600000;

    const labelWidth = 70;
    const chartX = margin + labelWidth;
    const chartW = pageWidth - margin - chartX;
    const rowH = 12;
    const familyH = 10;
    const headerH = 15;

    let currentY = startY;

    // --- SEPARATE TITLE BLOCK ---
    doc.setFontSize(26); doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold');
    doc.text("Master Gantt : Chronologie Complète", margin, currentY);
    currentY += 10;
    doc.setFontSize(14); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'normal');
    doc.text("Visualisation Interactive de l'Exécution du Projet", margin, currentY);
    currentY += 15;

    // --- LEGEND (Above Gantt Header) ---
    const legendX = pageWidth - margin - 150;
    const legendY = currentY - 5;
    doc.setFontSize(8); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'bold');

    doc.setFillColor(16, 185, 129); doc.rect(legendX, legendY - 3, 5, 3, 'F');
    doc.text("Terminée", legendX + 7, legendY);

    doc.setFillColor(239, 68, 68); doc.rect(legendX + 35, legendY - 3, 5, 3, 'F');
    doc.text("Non Réalisée", legendX + 42, legendY);

    doc.setFillColor(249, 115, 22); doc.rect(legendX + 75, legendY - 3, 5, 3, 'F');
    doc.text("Annulée / En Cours", legendX + 82, legendY);

    // Timeline Header
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, currentY, pageWidth - (margin * 2), headerH, 'F');
    doc.setFontSize(10); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
    doc.text("Chronologie Temporelle (H-H)", margin + 5, currentY + 9);

    const ticks: number[] = [];
    const interval = timelineIntervalHours * 3600000;
    for (let t = chartMinTime; t <= chartMaxTime; t += interval) ticks.push(t);

    doc.setFontSize(7); doc.setTextColor(148, 163, 184); doc.setFont('helvetica', 'normal');
    ticks.forEach(t => {
        const x = chartX + ((t - chartMinTime) / duration) * chartW;
        if (x >= chartX && x <= pageWidth - margin) {
            const date = new Date(t);
            doc.text(`${date.getHours()}h`, x, currentY + 13, { align: 'center' });
        }
    });

    currentY += headerH;

    families.forEach(f => {
        const familyTasks = grouped.get(f)!;

        // Section Header
        if (currentY > doc.internal.pageSize.getHeight() - margin - 30) {
            doc.addPage(); currentY = margin + 20;
            // Redraw Header on new page
            doc.setFillColor(15, 23, 42);
            doc.rect(margin, currentY, pageWidth - (margin * 2), headerH, 'F');
            doc.text("Master Gantt (Suite)", margin + 5, currentY + 9);
            currentY += headerH;
        }

        doc.setFillColor(241, 245, 249);
        doc.rect(margin, currentY, pageWidth - (margin * 2), familyH, 'F');
        doc.setFontSize(9); doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold');
        doc.text(f.toUpperCase(), margin + 5, currentY + 6.5);
        currentY += familyH;

        // Draw vertical grid lines for this family section
        doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.1);
        const sectionEndY = currentY + (familyTasks.length * rowH);
        ticks.forEach(t => {
            const x = chartX + ((t - chartMinTime) / duration) * chartW;
            if (x >= chartX && x <= pageWidth - margin) {
                doc.line(x, currentY, x, Math.min(sectionEndY, doc.internal.pageSize.getHeight() - margin));
            }
        });

        familyTasks.forEach(t => {
            if (currentY > doc.internal.pageSize.getHeight() - margin - rowH) {
                doc.addPage(); currentY = margin + 10;
            }

            doc.setFontSize(8); doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'normal');
            doc.text(t.action, margin + 5, currentY + 7, { maxWidth: labelWidth - 10 });

            const getX = (time: number) => chartX + ((time - chartMinTime) / duration) * chartW;
            const evalTask = evaluationData.tasks[t.id];

            // Actual Bar with Color Coding
            if (evalTask?.actualStart) {
                const aX = getX(new Date(evalTask.actualStart).getTime());
                const aW = evalTask.actualEnd ? (getX(new Date(evalTask.actualEnd).getTime()) - aX) : (getX(Date.now()) - aX);

                // Color coding
                if (evalTask.status === 'Fait') doc.setFillColor(16, 185, 129); // Green
                else if (evalTask.status === 'Non Fait') doc.setFillColor(239, 68, 68); // Red
                else if (evalTask.status === 'Annuler') doc.setFillColor(249, 115, 22); // Orange
                else doc.setFillColor(251, 146, 60); // Orange (In progress/default)

                // Use flat rect to remove shadow look
                doc.rect(Math.max(chartX, aX), currentY + 4, Math.max(1, aW), 4, 'F');
            }

            doc.setDrawColor(241, 245, 249); doc.line(margin, currentY + rowH, pageWidth - margin, currentY + rowH);
            currentY += rowH;
        });
        currentY += 5; // Gap between families
    });

    return currentY;
};

const drawKpiCards = (doc: jsPDF, startY: number, kpis: EvaluationKpis, margin: number, pageWidth: number): number => {
    const cardsPerRow = 5;
    const cardGap = 5;
    const totalKpiWidth = pageWidth - (margin * 2);
    const cardWidth = (totalKpiWidth - ((cardsPerRow - 1) * cardGap)) / cardsPerRow;
    const cardHeight = 30;

    const kpiData = [
        { title: 'Durée Planifiée', value: `${kpis.plannedShutdownDuration.toFixed(2)}h`, color: [15, 23, 42] },
        { title: 'Durée Réelle', value: `${kpis.actualShutdownDuration.toFixed(2)}h`, color: [15, 23, 42] },
        { title: 'Glissement Total', value: `${kpis.totalSlippage.toFixed(2)}h`, color: [220, 38, 38] },
        { title: 'Taux de Glissement', value: `${kpis.slippageRate.toFixed(1)}%`, color: kpis.slippageRate > 0.1 ? [220, 38, 38] : [34, 197, 94] },
        { title: 'Taux de Réalisation', value: `${kpis.completionRate.toFixed(1)}%`, subtitle: `(${kpis.completedTasks}/${kpis.totalPlannedTasks})`, color: [34, 197, 94] },
        { title: 'Travaux Supplémentaires', value: `${kpis.supplementaryTasksCount}`, color: [139, 92, 246] },
        { title: 'Charge Supplémentaire', value: `${kpis.supplementaryCharge.toFixed(2)} H-H`, color: [168, 85, 247] },
        { title: 'Taux Travaux Supp.', value: `${kpis.supplementaryWorkRate.toFixed(1)}%`, subtitle: 'vs. Planifié', color: kpis.supplementaryWorkRate > 10 ? [251, 191, 36] : [15, 23, 42] },
        { title: "Nombre d'Incidents", value: `${kpis.incidents}`, color: [234, 179, 8] },
        { title: "Nombre d'Accidents", value: `${kpis.accidents}`, color: kpis.accidents > 0 ? [239, 68, 68] : [34, 197, 94] },
    ];

    const numRows = Math.ceil(kpiData.length / cardsPerRow);

    kpiData.forEach((kpi, index) => {
        const row = Math.floor(index / cardsPerRow);
        const col = index % cardsPerRow;
        const x = margin + col * (cardWidth + cardGap);
        const y = startY + row * (cardHeight + cardGap);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, cardWidth, cardHeight, 3, 3, 'FD');

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text(kpi.title, x + cardWidth / 2, y + 8, { align: 'center', maxWidth: cardWidth - 6 });

        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
        doc.text(kpi.value, x + cardWidth / 2, y + 19, { align: 'center' });
        doc.setFont('helvetica', 'normal');

        if (kpi.subtitle) {
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(kpi.subtitle, x + cardWidth / 2, y + 25, { align: 'center' });
        }
    });

    return startY + numRows * (cardHeight + cardGap) + 10;
};

export const exportToPDF = async (
    reportData: ReportData,
    parameters: AppParameters,
    evaluationData: EvaluationData,
    results: CalculationResults,
    evaluationKpis: EvaluationKpis,
    selectedPages: ReportPages,
    timelineIntervalHours: number = 2
): Promise<jsPDF> => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let currentY = margin;

    // Page 1: Stylish Cover Page
    drawCoverPage(doc, reportData.title, reportData.preparedBy, parameters.shutdownStart, parameters.shutdownEnd);

    if (selectedPages.performanceChart) {
        doc.addPage();
        currentY = margin;
        currentY = drawPerformanceChart(doc, currentY, evaluationKpis.progressHistory || [], margin, pageWidth);
    }

    if (selectedPages.kpiCards || selectedPages.comparativeAnalysis || selectedPages.chronologySection) {
        if (!selectedPages.performanceChart) {
            doc.addPage();
            currentY = margin;
        }

        doc.setTextColor(15, 23, 42);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text("Résumé de la Performance & KPIs", margin, currentY);
        currentY += 12;

        if (selectedPages.kpiCards) {
            currentY = drawKpiCards(doc, currentY, evaluationKpis, margin, pageWidth);
        }

        if (selectedPages.comparativeAnalysis) {
            if (currentY > pageHeight - margin - 100) { doc.addPage(); currentY = margin; }
            currentY = drawComparativeAnalysis(doc, currentY, results, evaluationData, margin, pageWidth);
        }

        if (selectedPages.chronologySection) {
            if (currentY > pageHeight - margin - 80) { doc.addPage(); currentY = margin; }
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text("Chronologie de l'Arrêt", margin, currentY);
            currentY += 8;
            currentY = drawGanttChart(doc, currentY, evaluationData.chronology, margin, pageWidth, timelineIntervalHours);

            // Detailed Chronology Table
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text("Détails de la Chronologie", margin, currentY);
            currentY += 6;

            const chronologyTableBody = evaluationData.chronology.map(event => {
                const pDuration = calculateDuration(event.plannedStart, event.plannedEnd);
                const aDuration = calculateDuration(event.actualStart, event.actualEnd);
                const slippage = (aDuration !== null && pDuration !== null) ? (aDuration - pDuration) : 0;

                return [
                    event.label,
                    formatDate(event.plannedStart),
                    formatDate(event.plannedEnd),
                    formatDate(event.actualStart),
                    formatDate(event.actualEnd),
                    slippage !== 0 ? `${slippage.toFixed(2)}h` : '-'
                ];
            });

            autoTable(doc, {
                startY: currentY,
                head: [['Événement', 'Début Planifié', 'Fin Planifiée', 'Début Réelle', 'Fin Réelle', 'Écart']],
                body: chronologyTableBody,
                theme: 'grid',
                headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
                styles: { fontSize: 9, cellPadding: 3, halign: 'center' },
                columnStyles: {
                    0: { halign: 'left', fontStyle: 'bold', cellWidth: 80 }
                },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 5) {
                        const val = data.cell.raw as string;
                        if (val && typeof val === 'string' && !val.includes('-')) {
                            const num = parseFloat(val);
                            if (num > 0.1) data.cell.styles.textColor = [220, 38, 38]; // Red
                            else if (num < -0.1) data.cell.styles.textColor = [16, 185, 129]; // Green
                        }
                    }
                }
            });
            currentY = (doc as any).lastAutoTable.finalY + 15;
        }

        const checkNewPage = (heightNeeded: number) => {
            if (currentY + heightNeeded > pageHeight - margin) {
                doc.addPage();
                currentY = margin;
            }
        };

        const addSection = (title: string, tableHead: any[], tableBody: any[][], columnStyles = {}, headStyles = {}, didParseCell?: (data: any) => void) => {
            checkNewPage(25);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(title, margin, currentY);
            currentY += 12;
            autoTable(doc, {
                startY: currentY, head: [tableHead], body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [71, 85, 105], fontSize: 10, ...headStyles },
                styles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
                didDrawPage: (data) => { currentY = data.cursor?.y ?? margin; },
                columnStyles: columnStyles,
                didParseCell
            });
            currentY = (doc as any).lastAutoTable.finalY + 15;
        };

        if (selectedPages.supplementaryTasks && evaluationData.supplementaryTasks.length > 0) {
            addSection(
                "Travaux Supplémentaires",
                ['Action', 'Équipement', 'Type', 'Équipes (Détail HH)', 'Total (H-H)'],
                evaluationData.supplementaryTasks.map(t => [
                    t.action,
                    t.equipment,
                    t.maintenanceType,
                    t.teamDetails.map(d => `${d.team}: ${d.manHours}h`).join('\n'),
                    t.totalManHours.toFixed(2)
                ]),
                { 3: { fontSize: 8 } }
            );
        }

        const nonFaitTasks = results.scheduledTasks.filter(task => evaluationData.tasks[task.id]?.status === 'Non Fait');
        if (nonFaitTasks.length > 0) {
            addSection(
                "Analyse des Travaux Non Réalisés",
                ['Action', 'Équipement', 'Équipe', 'Cause identifiée', 'Criticité', 'Contre-mesure', 'Pilote'],
                nonFaitTasks.map(t => {
                    const details = evaluationData.tasks[t.id]?.nonCompletionDetails;
                    return [t.action, t.equipment, t.team, details?.cause || 'N/A', details?.criticality || 'N/A', details?.counterMeasure || 'N/A', details?.pilot || 'N/A'];
                }),
                {},
                { fillColor: [185, 28, 28] }
            );
        }

        const annuleTasks = results.scheduledTasks.filter(task => evaluationData.tasks[task.id]?.status === 'Annuler');
        if (annuleTasks.length > 0) {
            addSection(
                "Travaux Annulés",
                ['Action', 'Équipement', 'Équipe', 'Raison'],
                annuleTasks.map(t => [t.action, t.equipment, t.team, evaluationData.tasks[t.id]?.nonCompletionDetails?.cause || 'Décision technique']),
                {},
                { fillColor: [100, 116, 139] }
            );
        }

        if (selectedPages.slippageAnalysis && evaluationData.globalSlippageEvents.length > 0) {
            addSection(
                "Analyse du Glissement Global",
                ['Date', 'Heures', 'Cause', 'Action Prise', 'Pilote', 'Imputation'],
                evaluationData.globalSlippageEvents.map(e => [formatDate(e.eventDate), e.lostHours.toFixed(2), e.cause, e.preventiveAction, e.pilot, e.imputation || '-']),
                { 0: { cellWidth: 40 }, 1: { cellWidth: 20, halign: 'right' }, 2: { cellWidth: 'auto' }, 3: { cellWidth: 'auto' }, 4: { cellWidth: 30 }, 5: { cellWidth: 30 } }
            );
        }

        if (evaluationData.incidentDetails.length > 0 || evaluationData.accidentDetails.length > 0) {
            addSection(
                "Incidents et Accidents",
                ['Type', 'Date et Heure', 'Description'],
                [
                    ...evaluationData.incidentDetails.map(i => ['Incident', formatDate(i.dateTime), i.description]),
                    ...evaluationData.accidentDetails.map(a => ['Accident', formatDate(a.dateTime), a.description])
                ],
                { 0: { cellWidth: 30 }, 1: { cellWidth: 40 }, 2: { cellWidth: 'auto' } },
                { fillColor: [234, 179, 8] },
                (data) => {
                    if (data.section === 'body' && data.column.index === 0 && data.cell.raw === 'Accident') {
                        data.cell.styles.fillColor = [254, 202, 202];
                        data.cell.styles.textColor = [153, 27, 27];
                    }
                }
            );
        }

        if (selectedPages.detailedLog) {
            const faitTasks = results.scheduledTasks.filter(task => evaluationData.tasks[task.id]?.status === 'Fait');
            if (faitTasks.length > 0) {
                addSection(
                    "Suivi Détaillé des Tâches Réalisées",
                    ['OT', 'Description', 'Discipline', 'Ressources (P/R)', 'Début Réel', 'Fin Réel', 'Durée Planifiée', 'Durée Réelle', 'Glissement (h)'],
                    faitTasks.sort((a, b) => new Date(evaluationData.tasks[a.id].actualStart).getTime() - new Date(evaluationData.tasks[b.id].actualStart).getTime())
                        .map(task => {
                            const evalTask = evaluationData.tasks[task.id];
                            const actualDuration = calculateDuration(evalTask.actualStart, evalTask.actualEnd);
                            const slippage = actualDuration !== null ? actualDuration - task.duration : null;
                            const resourcesStr = `${task.manpower} / ${evalTask.actualManpower ?? task.manpower}`;
                            return [
                                task.ot || '-',
                                task.action,
                                task.discipline || '-',
                                resourcesStr,
                                formatDate(evalTask.actualStart),
                                formatDate(evalTask.actualEnd),
                                task.duration.toFixed(2),
                                actualDuration?.toFixed(2) ?? '-',
                                slippage?.toFixed(2) ?? '-'
                            ];
                        }),
                    {
                        0: { cellWidth: 18 },
                        2: { cellWidth: 30 },
                        3: { cellWidth: 25, halign: 'center' },
                        6: { halign: 'right' },
                        7: { halign: 'right' },
                        8: { halign: 'right' }
                    },
                    { fontSize: 8, fillColor: [22, 101, 52] },
                    (data) => {
                        if (data.section === 'body' && data.column.index === 8) {
                            const value = parseFloat(String(data.cell.raw));
                            if (value > 0.01) data.cell.styles.textColor = [220, 38, 38];
                            if (value < -0.01) data.cell.styles.textColor = [22, 163, 74];
                        }
                    }
                );
            }
        }
    }

    // 4. RÉALISATION PAR DISCIPLINE (Radar Chart)
    if (selectedPages.disciplineAnalysis) {
        doc.addPage();
        currentY = margin;
        doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
        doc.text("Portrait de Complétion par Discipline (Analyse Polaire)", margin, currentY);
        currentY += 10;
        doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(100, 116, 139);
        doc.text("Cet axe polaire visualise l'expertise opérationnelle et le respect des engagements par discipline.", margin, currentY);
        currentY += 50;

        const radarData = Object.entries(evaluationKpis.completionByDiscipline)
            .map(([name, data]: [string, any]) => ({ name, progress: data.total > 0 ? (data.completed / data.total) * 100 : 0 }));
        drawRadarChart(doc, margin + (pageWidth - margin * 2) / 2, currentY + 60, 80, radarData);
        currentY += 150;
    }

    // 5. RÉALISATION PAR ÉQUIPE (Circular Gauges)
    if (selectedPages.teamGauges) {
        doc.addPage();
        currentY = margin;
        doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
        doc.text("Tableau de Bord des Équipes", margin, currentY);
        currentY += 30;

        const teamGaugeData = Object.entries(evaluationKpis.completionByTeam)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([name, data]: [string, any]) => ({ name, progress: data.total > 0 ? (data.completed / data.total) * 100 : 0 }));

        const gaugesPerRow = 5;
        const availableWidth = pageWidth - margin * 2;
        const gaugeGapX = availableWidth / gaugesPerRow;
        const gaugeGapY = 70;

        let gaugesOnCurrentPage = 0;
        let dashboardStartY = currentY;

        teamGaugeData.forEach((team) => {
            const row = Math.floor(gaugesOnCurrentPage / gaugesPerRow);
            const col = gaugesOnCurrentPage % gaugesPerRow;
            const gx = margin + (col * gaugeGapX) + (gaugeGapX / 2);
            const gy = dashboardStartY + (row * gaugeGapY) + 20;

            if (gy > pageHeight - margin - 40) {
                doc.addPage();
                dashboardStartY = margin + 20;
                gaugesOnCurrentPage = 0;

                // Recalculate for the first item on new page
                const newGx = margin + (0 * gaugeGapX) + (gaugeGapX / 2);
                const newGy = dashboardStartY + (0 * gaugeGapY) + 20;
                drawCircularGauge(doc, newGx, newGy, 14, team.progress, team.name);
                gaugesOnCurrentPage = 1;
            } else {
                drawCircularGauge(doc, gx, gy, 14, team.progress, team.name);
                gaugesOnCurrentPage++;
            }
        });
    }

    // 6. Master Gantt at the End
    if (selectedPages.masterGantt) {
        doc.addPage();
        currentY = margin;
        currentY = drawProfessionalGantt(doc, currentY, results.scheduledTasks, evaluationData, margin, pageWidth, timelineIntervalHours);
    }

    addFooter(doc, margin, reportData.preparedBy);
    return doc;
};