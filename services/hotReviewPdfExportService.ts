import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EvaluationData, HotReviewState, ScheduledTask, CalculationResults, AppParameters, SlippageDetails, OngoingProgress } from '../types';

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

const drawKpiCard = (doc: jsPDF, x: number, y: number, width: number, height: number, title: string, value: string, subtitle = '', valueColor: [number, number, number] = [15, 23, 42]) => {
    // Card Shadow-like background
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(x + 1, y + 1, width, height, 4, 4, 'F');

    // Main Card
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, y, width, height, 4, 4, 'FD');

    // Left Accent Bar
    doc.setFillColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.roundedRect(x, y, 2.5, height, 4, 4, 'F');
    // Overdraw the right edge of the accent bar roundness to make it straight
    doc.rect(x + 1.5, y, 1, height, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(title.toUpperCase(), x + 8, y + 10, { align: 'left' });

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(valueColor[0], valueColor[1], valueColor[2]);
    doc.text(value, x + 8, y + 24, { align: 'left' });

    doc.setFont('helvetica', 'normal');
    if (subtitle) {
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(subtitle, x + 8, y + 32, { align: 'left', maxWidth: width - 15 });
    }
};

const drawProgressBar = (doc: jsPDF, x: number, y: number, width: number, height: number, progress: number, color: [number, number, number]) => {
    doc.setFillColor(226, 232, 240); // slate-200
    doc.roundedRect(x, y, width, height, height / 2, height / 2, 'F');
    if (progress > 0) {
        doc.setFillColor(color[0], color[1], color[2]);
        doc.roundedRect(x, y, width * (Math.min(100, progress) / 100), height, height / 2, height / 2, 'F');
    }
};

const addFooter = (doc: jsPDF, margin: number, inspectorName: string) => {
    const pageCount = (doc as any).internal.pages.length;
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        if (i === 1) continue; // Skip cover page footer if preferred, or keep it.
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.setFont('helvetica', 'normal');
        doc.text('Généré par PlanneX Copilot IA', margin, pageHeight - 10, { align: 'left' });
        doc.text(`Planificateur: ${inspectorName}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Page ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });

        // Bottom border line
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    }
};

const drawCoverPage = (doc: jsPDF, title: string, inspectorName: string, startDate: string, endDate: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Dark Background Gradient Side (simulated)
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Abstract circles/blobs for design
    doc.setFillColor(16, 185, 129, 0.1); // emerald-500 with alpha
    doc.circle(pageWidth, 0, 100, 'F');
    doc.setFillColor(59, 130, 246, 0.05); // blue-500 with alpha
    doc.circle(0, pageHeight, 150, 'F');

    // Branding
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(40);
    doc.setFont('helvetica', 'bold');
    doc.text('PlanneX', 30, 40);

    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(2);
    doc.line(30, 45, 60, 45);

    // Main Title
    doc.setFontSize(60);
    doc.setTextColor(255, 255, 255);
    doc.text("RAPPORT D'ÉVALUATION", 30, 120);
    doc.text("À CHAUD", 30, 145);

    // Subtitle / Period
    doc.setFontSize(18);
    doc.setTextColor(148, 163, 184); // slate-400
    const start = new Date(startDate).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const end = new Date(endDate).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    doc.text(`Période de Suivi: ${start} au ${end}`, 30, 165);

    // Inspector Info Box
    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(30, 220, 120, 50, 5, 5, 'F');

    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text("PLANIFICATEUR / RESPONSABLE", 40, 235);

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.text(inspectorName.toUpperCase(), 40, 255);

    // Decorative right-side graphic
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(0.5);
    for (let i = 0; i < 10; i++) {
        doc.line(pageWidth - 60 + (i * 3), 100, pageWidth - 60 + (i * 3), 200);
    }
};

const drawPerformanceChart = (doc: jsPDF, x: number, y: number, width: number, height: number, history: any[]) => {
    if (!history || history.length < 2) return;

    // Chart Background
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, y, width, height, 5, 5, 'FD');

    const paddingX = 15;
    const paddingY = 15;
    const chartW = width - (paddingX * 2);
    const chartH = height - (paddingY * 2) - 5;
    const originX = x + paddingX;
    const originY = y + height - paddingY - 5;

    const maxY = 100;

    // Title
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("PERFORMANCE DE L'ARRÊT : PLANIFIÉ VS RÉEL (AVANCEMENT %)", x + (width / 2), y + 10, { align: 'center' });

    // Grid Lines
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    for (let i = 0; i <= 4; i++) {
        const lineY = originY - (chartH * (i / 4));
        doc.line(originX, lineY, originX + chartW, lineY);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(`${i * 25}%`, originX - 3, lineY + 1, { align: 'right' });
    }

    // Prepare points
    const pPoints = history.map((p, i) => ({
        x: originX + (chartW * (i / (history.length - 1))),
        y: originY - (chartH * (Math.min(100, p.planned) / 100))
    }));

    const aPoints = history.map((p, i) => {
        if (p.actual === undefined || p.actual === null) return null;
        return {
            x: originX + (chartW * (i / (history.length - 1))),
            y: originY - (chartH * (Math.min(100, p.actual) / 100))
        };
    }).filter(p => p !== null) as { x: number, y: number }[];

    // Functions to draw areas using triangles for trapezoids
    const drawFilledPath = (points: { x: number, y: number }[], fillColor: [number, number, number]) => {
        doc.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
        for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            // Trapezoid as 2 triangles
            doc.triangle(p1.x, originY, p1.x, p1.y, p2.x, p2.y, 'F');
            doc.triangle(p1.x, originY, p2.x, originY, p2.x, p2.y, 'F');
        }
    };

    // Draw Planned Area (Cyan-ish)
    drawFilledPath(pPoints, [236, 252, 255]);
    doc.setDrawColor(34, 211, 238);
    doc.setLineWidth(0.8);
    for (let i = 0; i < pPoints.length - 1; i++) doc.line(pPoints[i].x, pPoints[i].y, pPoints[i + 1].x, pPoints[i + 1].y);

    // Draw Actual Area (Emerald-ish)
    if (aPoints.length > 1) {
        drawFilledPath(aPoints, [236, 253, 245]);
        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(1.4);
        for (let i = 0; i < aPoints.length - 1; i++) doc.line(aPoints[i].x, aPoints[i].y, aPoints[i + 1].x, aPoints[i + 1].y);
    }

    // Legend
    const legY = originY + 12;
    doc.setFillColor(34, 211, 238);
    doc.roundedRect(originX + 10, legY - 3, 5, 2.5, 1, 1, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("PLANIFIE", originX + 17, legY - 1);

    doc.setFillColor(16, 185, 129);
    doc.roundedRect(originX + 50, legY - 3, 5, 2.5, 1, 1, 'F');
    doc.text("REEL", originX + 57, legY - 1);

    // Time Labels
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    if (history.length > 0) {
        doc.text(history[0].timestamp, originX, originY + 5);
        doc.text(history[history.length - 1].timestamp, originX + chartW, originY + 5, { align: 'right' });
    }
};
const drawCircularGauge = (doc: jsPDF, x: number, y: number, radius: number, progress: number, color: [number, number, number], title: string, value: string, planValue = '', suppValue = '', extraValue = '') => {
    const centerX = x + radius;
    const centerY = y + radius;

    // Track Background
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(4);
    doc.circle(centerX, centerY, radius, 'S');

    // Progress Arc (Solid)
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(4);

    if (progress > 0) {
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + (Math.min(100, progress) / 100) * 2 * Math.PI;
        const segments = 100;
        const step = (endAngle - startAngle) / segments;

        for (let i = 0; i < segments; i++) {
            const a1 = startAngle + i * step;
            const a2 = a1 + step;
            const x1 = centerX + radius * Math.cos(a1);
            const y1 = centerY + radius * Math.sin(a1);
            const x2 = centerX + radius * Math.cos(a2);
            const y2 = centerY + radius * Math.sin(a2);
            doc.line(x1, y1, x2, y2);
        }
    }

    // Puck
    const lastAngle = (Math.min(100, progress) / 100) * 2 * Math.PI - Math.PI / 2;
    const puckX = centerX + radius * Math.cos(lastAngle);
    const puckY = centerY + radius * Math.sin(lastAngle);
    doc.setFillColor(color[0], color[1], color[2]);
    doc.circle(puckX, puckY, 2, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.circle(puckX, puckY, 1, 'S');

    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
    doc.text(value, centerX, centerY + 1, { align: 'center' });
    doc.setFontSize(6.5); doc.setTextColor(100, 116, 139);
    doc.text(title.toUpperCase(), centerX, centerY + 6, { align: 'center' });

    if (planValue || suppValue || extraValue) {
        doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
        let offset = 24;
        if (planValue) {
            doc.setTextColor(16, 185, 129); // green
            doc.text(`P: ${planValue}`, centerX, centerY + offset, { align: 'center' });
            offset += 4;
        }
        if (suppValue) {
            doc.setTextColor(239, 68, 68); // red
            doc.text(`S: ${suppValue}`, centerX, centerY + offset, { align: 'center' });
            offset += 4;
        }
        if (extraValue) {
            doc.setTextColor(153, 27, 27); // dark red
            doc.text(`E: ${extraValue}`, centerX, centerY + offset, { align: 'center' });
        }
    }
};

const drawRadarChart = (doc: jsPDF, x: number, y: number, radius: number, data: { name: string; value: number }[]) => {
    const centerX = x + radius;
    const centerY = y + radius;
    const numAxes = data.length;
    const step = (2 * Math.PI) / numAxes;

    doc.setLineWidth(0.1);
    doc.setDrawColor(203, 213, 225); // slate-300
    for (let i = 1; i <= 5; i++) {
        const r = (radius / 5) * i;
        for (let j = 0; j < numAxes; j++) {
            const ax1 = centerX + r * Math.cos(j * step - Math.PI / 2);
            const ay1 = centerY + r * Math.sin(j * step - Math.PI / 2);
            const ax2 = centerX + r * Math.cos((j + 1) * step - Math.PI / 2);
            const ay2 = centerY + r * Math.sin((j + 1) * step - Math.PI / 2);
            doc.line(ax1, ay1, ax2, ay2);
        }
    }

    doc.setFontSize(7.5);
    data.forEach((item, j) => {
        const ax = centerX + radius * Math.cos(j * step - Math.PI / 2);
        const ay = centerY + radius * Math.sin(j * step - Math.PI / 2);
        doc.setDrawColor(226, 232, 240);
        doc.line(centerX, centerY, ax, ay);
        const labelR = radius + 8;
        const lx = centerX + labelR * Math.cos(j * step - Math.PI / 2);
        const ly = centerY + labelR * Math.sin(j * step - Math.PI / 2);
        let align: 'center' | 'left' | 'right' = 'center';
        if (lx < centerX - 5) align = 'right';
        else if (lx > centerX + 5) align = 'left';
        doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold');
        doc.text(item.name.toUpperCase(), lx, ly, { align });
        doc.setFontSize(7); doc.setTextColor(148, 163, 184); doc.setFont('helvetica', 'normal');
        doc.text(`${item.value.toFixed(1)}%`, lx, ly + 3.5, { align });
    });

    doc.setLineWidth(0.8);
    doc.setDrawColor(59, 130, 246); // blue-500
    for (let j = 0; j < numAxes; j++) {
        const r1 = (radius * data[j].value) / 100;
        const ax1 = centerX + r1 * Math.cos(j * step - Math.PI / 2);
        const ay1 = centerY + r1 * Math.sin(j * step - Math.PI / 2);
        const nextJ = (j + 1) % numAxes;
        const r2 = (radius * data[nextJ].value) / 100;
        const ax2 = centerX + r2 * Math.cos(nextJ * step - Math.PI / 2);
        const ay2 = centerY + r2 * Math.sin(nextJ * step - Math.PI / 2);
        doc.line(ax1, ay1, ax2, ay2);
    }
};

const drawComparisonWorkSection = (doc: jsPDF, x: number, y: number, width: number, kpis: any, startDate: string, endDate: string) => {
    const height = 110; // Increased to prevent label overflow and ensure "P, S, E" labels aren't cut off
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, y, width, height, 8, 8, 'FD');

    // Section Title with dynamic range
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const rangeText = `Comparaison des Travaux (${formatDate(startDate, true)} AU ${formatDate(endDate, true)})`;
    doc.text(rangeText, x + 12, y + 12);

    // Legend - perfectly aligned inside the box
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);

    doc.setFillColor(16, 185, 129); // green
    doc.circle(x + width - 110, y + 10, 1.5, 'F');
    doc.text("Planifiés", x + width - 105, y + 11.5);

    doc.setFillColor(100, 116, 139); // Neutral slate-500 instead of red
    doc.circle(x + width - 70, y + 10, 1.5, 'F');
    doc.text("Supp.", x + width - 65, y + 11.5);

    doc.setFillColor(153, 27, 27); // dark red
    doc.circle(x + width - 40, y + 10, 1.5, 'F');
    doc.text("Extra", x + width - 35, y + 11.5);

    const cardW = (width - 50) / 4;
    const startX = x + 10;
    const startY = y + 20;
    const innerPadding = 10;

    // Helper: draw labels above/below chart instead of directly under if requested
    // "don't interact ... with the chart" -> removing the detail labels from under circular gauge

    // Card 1: Charge
    doc.setFontSize(8); doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'bold');
    doc.text("CHARGE (H-H)", startX + cardW / 2, startY + 2, { align: 'center' });

    // Total HH including extra
    const totalHH = kpis.plannedWorkCharge + kpis.chargeSuppHH + (kpis.extraWorkCharge || 0);
    const impactRatio = totalHH > 0 ? ((kpis.chargeSuppHH + (kpis.extraWorkCharge || 0)) / kpis.plannedWorkCharge) * 100 : 0;

    drawCircularGauge(
        doc,
        startX + cardW / 2 - 18,
        startY + 10,
        18,
        Math.min(100, impactRatio),
        [249, 115, 22],
        "Charge Totale",
        `${totalHH.toFixed(0)} HH`,
        `${kpis.plannedWorkCharge.toFixed(1)} HH`,
        `${kpis.chargeSuppHH.toFixed(1)} HH`,
        `${(kpis.extraWorkCharge || 0).toFixed(1)} HH`
    );

    // Card 2: Volume
    doc.text("VOLUME (NOMBRE)", startX + cardW + innerPadding + cardW / 2, startY + 2, { align: 'center' });
    drawCircularGauge(
        doc,
        startX + cardW + innerPadding + cardW / 2 - 18,
        startY + 10,
        18,
        Math.min(100, kpis.plannedVsSupplementaryCountRatio),
        [139, 92, 246],
        "Ratio Volume",
        `${kpis.plannedVsSupplementaryCountRatio.toFixed(1)}%`,
        `${kpis.plannedWorkCount}`,
        `${kpis.supplementaryWorkCount}`
    );

    // Card 3: Efficacité
    drawKpiCard(doc, startX + (cardW + innerPadding) * 2, startY + 8, cardW, 40, "EFFICACITÉ PLAGE", `${kpis.completionRate.toFixed(1)}%`, "Taux de réalisation des tâches planifiées", [16, 185, 129]);

    // Card 4: Impact Travaux Supp.
    drawKpiCard(doc, startX + (cardW + innerPadding) * 3, startY + 8, cardW, 40, "IMPACT TRAVAUX SUPP.", `${kpis.plannedVsSupplementaryChargeRatio.toFixed(1)}%`, "Surcharge H-H par rapport au plan initial", [59, 130, 246]);

    return y + height;
};

const drawBenchmarkingSection = (doc: jsPDF, x: number, y: number, width: number, kpis: any) => {
    const height = 65;
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(x, y, width, height, 8, 8, 'FD');

    // Icon accent (Title)
    doc.setFillColor(6, 182, 212); // Cyan-500
    doc.roundedRect(x + 10, y + 10, 1.5, 8, 1, 1, 'F');

    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); // Slate-900
    doc.text("Benchmarking de Planification", x + 16, y + 16);

    doc.setFillColor(226, 232, 240); // slate-200 accent
    doc.roundedRect(x + width - 45, y + 10, 35, 8, 4, 4, 'F');
    doc.setFontSize(8); doc.setTextColor(71, 85, 105); // slate-600
    doc.text("ANALYSE RELATIVE", x + width - 27.5, y + 15.5, { align: 'center' });

    const cardStartX = x + 10;
    const cardY = y + 25;
    const cardW = (width - 40) / 3;
    const cardH = 30;

    // Card 1: Ratio de Charge
    doc.setFillColor(255, 255, 255); // white card
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardStartX, cardY, cardW, cardH, 5, 5, 'FD');
    // Accent bar
    doc.setFillColor(16, 185, 129); // Emerald
    doc.roundedRect(cardStartX, cardY, 2, cardH, 5, 5, 'F');
    doc.rect(cardStartX + 1, cardY, 1, cardH, 'F'); // flatten edge

    doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text("RATIO DE CHARGE (H-H)", cardStartX + 10, cardY + 10);
    doc.setFontSize(18); doc.setTextColor(16, 185, 129); // Emerald metric
    const surchargeRate = (kpis.chargeSuppHH / kpis.plannedWorkCharge).toFixed(2);
    doc.text(`1:${surchargeRate}`, cardStartX + 10, cardY + 22);
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text(`Surcharge pour 1h planifiée`, cardStartX + 10, cardY + 27);

    // Card 2: Ratio Volume
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardStartX + cardW + 10, cardY, cardW, cardH, 5, 5, 'FD');
    // Accent bar
    doc.setFillColor(139, 92, 246); // Purple
    doc.roundedRect(cardStartX + cardW + 10, cardY, 2, cardH, 5, 5, 'F');
    doc.rect(cardStartX + cardW + 11, cardY, 1, cardH, 'F');

    doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text("RATIO VOLUME (TASKS)", cardStartX + cardW + 20, cardY + 10);
    doc.setFontSize(18); doc.setTextColor(139, 92, 246); // Purple metric
    const volumeIncrease = ((kpis.supplementaryWorkCount / kpis.plannedWorkCount) * 100).toFixed(1);
    doc.text(`${volumeIncrease}%`, cardStartX + cardW + 20, cardY + 22);
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text(`Accroissement du scope`, cardStartX + cardW + 20, cardY + 27);

    // Card 3: Variabilité
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardStartX + (cardW + 10) * 2, cardY, cardW, cardH, 5, 5, 'FD');
    // Accent bar
    doc.setFillColor(245, 158, 11); // Amber
    doc.roundedRect(cardStartX + (cardW + 10) * 2, cardY, 2, cardH, 5, 5, 'F');
    doc.rect(cardStartX + (cardW + 10) * 2 + 1, cardY, 1, cardH, 'F');

    doc.setFontSize(8); doc.setTextColor(100, 116, 139);
    doc.text("INDEX DE VARIABILITÉ", cardStartX + (cardW + 10) * 2 + 10, cardY + 10);
    doc.setFontSize(18); doc.setTextColor(245, 158, 11); // Amber metric
    const variability = (Math.abs(kpis.plannedWorkCharge - (kpis.plannedWorkCharge + kpis.chargeSuppHH + (kpis.extraWorkCharge || 0))) / kpis.plannedWorkCharge * 100).toFixed(1);
    doc.text(`${variability}%`, cardStartX + (cardW + 10) * 2 + 10, cardY + 22);
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text(`Déviation de la charge prévue`, cardStartX + (cardW + 10) * 2 + 10, cardY + 27);

    return y + height;
};

// --- PDF GENERATION SERVICE ---

export const exportHotReviewToPDF = async (
    reportTitle: string,
    inspectorName: string,
    evaluationData: EvaluationData,
    hotReviewState: HotReviewState,
    teamProgress: { name: string; progress: number }[],
    disciplineProgress: { name: string; progress: number }[],
    localKpis: {
        potentialSlippage: number;
        globalCompletionRate: number;
        completionRate: number;
        chargeSuppHH: number;
        progressHistory: any[];
        plannedWorkCharge: number;
        plannedWorkCount: number;
        supplementaryWorkCount: number;
        plannedVsSupplementaryChargeRatio: number;
        plannedVsSupplementaryCountRatio: number;
        supplementaryResourcesByDiscipline: Record<string, number>;
        extraWorkCharge?: number;
        extraManHoursByDiscipline?: Record<string, number>;
    },
    highRiskKpi: { progress: number; total?: number; completed?: number; tasks?: import('../types').ScheduledTask[] },
    analysisTasks: (ScheduledTask & { slippage?: number; details: SlippageDetails })[],
    completedTasksToDisplay: (ScheduledTask & { actualStart?: string; actualEnd?: string; actualDuration?: number; slippage?: number })[],
    ongoingTasks: OngoingProgress[],
    now: Date,
    results: CalculationResults,
    parameters: AppParameters,
    disciplineColors: Map<string, string>,
    familyOrder: string[],
    isColdStopFlow: boolean
): Promise<jsPDF> => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- PAGE 1: COVER ---
    drawCoverPage(doc, reportTitle, inspectorName, hotReviewState.displayedStartDate, hotReviewState.displayedEndDate);

    // --- PAGE 2: EXECUTIVE SUMMARY (KPIs) ---
    doc.addPage();
    let currentY = 25;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text("EXECUTIVE SUMMARY", margin, currentY);

    // Period Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.setFont('helvetica', 'normal');
    currentY += 8;
    doc.text(`Évaluation de la période du ${formatDate(hotReviewState.displayedStartDate)} au ${formatDate(hotReviewState.displayedEndDate)}`, margin, currentY);

    // Decorative line
    doc.setDrawColor(16, 185, 129);
    doc.setLineWidth(1.5);
    doc.line(margin, currentY + 4, margin + 40, currentY + 4);

    currentY += 15;

    // --- Performance Chart ---
    const chartWidth = pageWidth - (margin * 2);
    const chartHeight = 80;
    drawPerformanceChart(doc, margin, currentY, chartWidth, chartHeight, localKpis.progressHistory);

    currentY += chartHeight + 15;

    // --- KPI Section ---
    const supplementaryTasksInPeriod = evaluationData.supplementaryTasks.filter(task => {
        if (!task.startDate || !task.endDate) return false;
        const taskStartTs = new Date(task.startDate).getTime();
        const taskEndTs = new Date(task.endDate).getTime();
        const periodEnd = new Date(hotReviewState.displayedEndDate).getTime();
        const periodStart = new Date(hotReviewState.displayedStartDate).getTime();
        return taskStartTs < periodEnd && taskEndTs > periodStart;
    });

    const periodDurationHours = (new Date(hotReviewState.displayedEndDate).getTime() - new Date(hotReviewState.displayedStartDate).getTime()) / (1000 * 60 * 60);

    const kpiData: { title: string; value: string; subtitle?: string; valueColor: [number, number, number]; }[] = [
        { title: "Avancement Global", value: `${localKpis.globalCompletionRate.toFixed(1)}%`, subtitle: "Progrès de l'arrêt complet", valueColor: [16, 185, 129] },
        { title: 'Taux Réalisation', value: `${localKpis.completionRate.toFixed(1)}%`, subtitle: "Cible vs Réel sur la plage", valueColor: [59, 130, 246] },
        { title: 'Glissement Potentiel', value: `${localKpis.potentialSlippage.toFixed(1)} h`, subtitle: "Impact sur le chemin critique", valueColor: localKpis.potentialSlippage > 0 ? [239, 68, 68] : [16, 185, 129] },
        { title: 'Charge de Travail', value: `${localKpis.chargeSuppHH.toFixed(1)} HH`, subtitle: "Total man-hours sur la plage", valueColor: [139, 92, 246] },
        { title: 'Travaux Supp.', value: `${supplementaryTasksInPeriod.length}`, subtitle: "Inclus sur la plage", valueColor: [249, 115, 22] },
        { title: 'Incidents / Accidents', value: `${evaluationData.incidentDetails.length} / ${evaluationData.accidentDetails.length}`, subtitle: "Sécurité & Environnement", valueColor: evaluationData.accidentDetails.length > 0 ? [239, 68, 68] : [234, 179, 8] },
        { title: 'Tâches à Haut Risque', value: `${highRiskKpi.completed || 0} / ${highRiskKpi.total || 0}`, subtitle: "Tâches sensibles", valueColor: [153, 27, 27] },
    ];

    const cardsPerRow = 4; // Adjusted to fit 7 items elegantly (4 and 3)
    const cardGap = 8;
    const totalKpiWidth = pageWidth - (margin * 2);
    const cardWidth = (totalKpiWidth - ((cardsPerRow - 1) * cardGap)) / cardsPerRow;
    const cardHeight = 40;
    const kpiStartX = margin;
    const numRows = Math.ceil(kpiData.length / cardsPerRow);

    kpiData.forEach((kpi, index) => {
        const row = Math.floor(index / cardsPerRow);
        const col = index % cardsPerRow;
        const x = kpiStartX + col * (cardWidth + cardGap);
        const y = currentY + row * (cardHeight + cardGap);
        drawKpiCard(doc, x, y, cardWidth, cardHeight, kpi.title, kpi.value, kpi.subtitle, kpi.valueColor);
    });
    currentY += numRows * (cardHeight + cardGap) + 20;

    // --- Slippage Analysis Table ---
    if (analysisTasks.length > 0) {
        if (currentY > pageHeight - margin - 40) { doc.addPage(); currentY = margin + 10; }
        doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42); doc.text("Analyse des Risques & Glissements", margin, currentY);
        currentY += 12;

        const slippageBody = analysisTasks.map(task => [
            `${task.action}\n(Eq: ${task.equipment})`,
            `${task.slippage?.toFixed(1)} h`,
            task.details.cause.join('\n'),
            task.details.preventiveAction.join('\n'),
            task.details.pilot.join('\n')
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [['Tâche Impactée', 'Retard', 'Cause(s) Identified', 'Mesure(s) de Rattrapage', 'Intervenant / Pilote']],
            body: slippageBody,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], fontSize: 10, cellPadding: 4, halign: 'center' },
            styles: { fontSize: 9, cellPadding: 4, valign: 'middle' },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 70 },
                1: { halign: 'center', fontStyle: 'bold', textColor: [239, 68, 68], cellWidth: 25 },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 'auto' },
                4: { cellWidth: 40 }
            }
        });
        currentY = (doc as any).lastAutoTable.finalY + 20;
    }

    // --- PAGE 3: TABLES ---
    if (currentY > pageHeight - margin - 100) { doc.addPage(); currentY = margin + 10; }

    // Comparative Section
    currentY = drawComparisonWorkSection(doc, margin, currentY, pageWidth - margin * 2, localKpis, hotReviewState.displayedStartDate, hotReviewState.displayedEndDate);
    currentY += 15;

    // Benchmarking Section (NEW)
    currentY = drawBenchmarkingSection(doc, margin, currentY, pageWidth - margin * 2, localKpis);
    currentY += 15;

    // --- FINAL PAGE: PROGRESS PERFORMANCE ---
    if (teamProgress.length > 0 || disciplineProgress.length > 0) {
        doc.addPage();
        currentY = margin + 10;

        const drawRadarChart = (doc: jsPDF, x: number, y: number, radius: number, data: { name: string; value: number }[]) => {
            const centerX = x + radius;
            const centerY = y + radius;
            const numAxes = data.length;
            const step = (2 * Math.PI) / numAxes;

            // 1. Draw Grid (Concentric Polygons)
            doc.setLineWidth(0.1);
            doc.setDrawColor(203, 213, 225); // slate-300
            for (let i = 1; i <= 5; i++) {
                const r = (radius / 5) * i;
                for (let j = 0; j < numAxes; j++) {
                    const ax1 = centerX + r * Math.cos(j * step - Math.PI / 2);
                    const ay1 = centerY + r * Math.sin(j * step - Math.PI / 2);
                    const ax2 = centerX + r * Math.cos((j + 1) * step - Math.PI / 2);
                    const ay2 = centerY + r * Math.sin((j + 1) * step - Math.PI / 2);
                    doc.line(ax1, ay1, ax2, ay2);
                }
            }

            // 2. Draw Axes and Labels
            doc.setFontSize(7.5);
            data.forEach((item, j) => {
                const ax = centerX + radius * Math.cos(j * step - Math.PI / 2);
                const ay = centerY + radius * Math.sin(j * step - Math.PI / 2);

                doc.setDrawColor(226, 232, 240); // slate-200
                doc.line(centerX, centerY, ax, ay);

                const labelR = radius + 8;
                const lx = centerX + labelR * Math.cos(j * step - Math.PI / 2);
                const ly = centerY + labelR * Math.sin(j * step - Math.PI / 2);

                let align: 'center' | 'left' | 'right' = 'center';
                if (lx < centerX - 5) align = 'right';
                else if (lx > centerX + 5) align = 'left';

                doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold');
                doc.text(item.name.toUpperCase(), lx, ly, { align });
                doc.setFontSize(7); doc.setTextColor(148, 163, 184); doc.setFont('helvetica', 'normal');
                doc.text(`${item.value.toFixed(1)}%`, lx, ly + 3.5, { align });
            });

            // 3. Draw Data Polygon (Stroke only for reliability)
            doc.setLineWidth(0.8);
            doc.setDrawColor(59, 130, 246); // blue-500
            for (let j = 0; j < numAxes; j++) {
                const r1 = (radius * data[j].value) / 100;
                const ax1 = centerX + r1 * Math.cos(j * step - Math.PI / 2);
                const ay1 = centerY + r1 * Math.sin(j * step - Math.PI / 2);

                const nextJ = (j + 1) % numAxes;
                const r2 = (radius * data[nextJ].value) / 100;
                const ax2 = centerX + r2 * Math.cos(nextJ * step - Math.PI / 2);
                const ay2 = centerY + r2 * Math.sin(nextJ * step - Math.PI / 2);

                doc.line(ax1, ay1, ax2, ay2);
            }
        };

        // Header
        doc.setFillColor(15, 23, 42);
        doc.roundedRect(margin, currentY, 15, 10, 2, 2, 'F');
        doc.setFontSize(28); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
        doc.text("ANALYSE DE PERFORMANCE PAR UNITÉ", margin + 20, currentY + 7);
        currentY += 25;

        // 1. Radar Chart Section for Disciplines
        if (disciplineProgress.length > 3) {
            doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
            doc.text("Portrait de Complétion par Discipline (Analyse Polaire)", margin, currentY);
            currentY += 7;

            // Subtitle exactly below the title
            doc.setFontSize(10); doc.setTextColor(71, 85, 105); doc.setFont('helvetica', 'normal');
            doc.text("Cet axe polaire visualise l'expertise opérationnelle et le respect des engagements par discipline.", margin, currentY);

            const radarY = currentY + 15;
            const radarRadius = 55; // Slightly reduced to fit better
            const radarX = margin + (pageWidth - margin * 2) / 4;

            drawRadarChart(doc, radarX, radarY, radarRadius, disciplineProgress.map(d => ({ name: d.name, value: d.progress })));

            currentY = radarY + radarRadius * 2 + 30;
        }

        // 2. Performance Grid Section for Teams
        // (Deactivated per user request to reduce report page count)
        if (false && teamProgress.length > 0) {
            if (currentY > pageHeight - margin - 100) { doc.addPage(); currentY = margin + 10; }

            doc.setFontSize(18); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
            doc.text("Tableau de Bord des Équipes", margin, currentY);
            currentY += 15;

            const cardsPerRow = 5;
            const cardGap = 8;
            const cardWidth = (pageWidth - margin * 2 - (cardsPerRow - 1) * cardGap) / cardsPerRow;
            const cardHeight = 65;

            teamProgress.forEach((team, index) => {
                const row = Math.floor(index / cardsPerRow) % 10; // Simple modulo for height check logic
                const col = index % cardsPerRow;

                let cardX = margin + col * (cardWidth + cardGap);
                let cardY = currentY + row * (cardHeight + cardGap);

                // Simple page break check
                if (cardY > pageHeight - margin - cardHeight) {
                    doc.addPage();
                    currentY = margin + 10;
                    cardY = currentY;
                }

                // Draw Card Container
                doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240);
                doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 5, 5, 'FD');

                // Draw Gauge
                const gaugeRadius = 18;
                const progressColor: [number, number, number] = team.progress > 90 ? [16, 185, 129] : (team.progress > 50 ? [59, 130, 246] : [249, 115, 22]);
                drawCircularGauge(
                    doc,
                    cardX + cardWidth / 2 - gaugeRadius,
                    cardY + 10,
                    gaugeRadius,
                    team.progress,
                    progressColor,
                    "Score",
                    `${team.progress.toFixed(1)}%`
                );

                // Team Name Label
                doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(51, 65, 85);
                doc.text(team.name.toUpperCase(), cardX + cardWidth / 2, cardY + cardHeight - 8, { align: 'center', maxWidth: cardWidth - 10 });
            });
        }
    }



    if (ongoingTasks.length > 0) {
        if (currentY > pageHeight - margin - 80) { doc.addPage(); currentY = margin + 10; }

        doc.setFillColor(15, 23, 42); // slate-900 header block
        doc.roundedRect(margin, currentY, 10, 8, 2, 2, 'F');
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Suivi Operational : Travaux en Cours", margin + 15, currentY + 6);
        currentY += 15;

        autoTable(doc, {
            startY: currentY,
            theme: 'grid',
            headStyles: {
                fillColor: [15, 23, 42],
                fontSize: 8,
                cellPadding: 3,
                halign: 'center',
                valign: 'middle',
                fontStyle: 'bold'
            },
            styles: { fontSize: 8, cellPadding: 3, valign: 'middle' },
            head: [[
                'Action / Équipement',
                'Discipline',
                'Calendrier (P/R)',
                'Durée P/R',
                'Ressources P/R',
                'Avancement PLANIFIE',
                'Avancement REEL %',
                'Charge Réelle',
                'Réalisation Tactique'
            ]],
            body: ongoingTasks.map(item => {
                const resultsTask = results.scheduledTasks.find(t => t.id === item.task.id);
                const evalTask = evaluationData.tasks[item.task.id];
                const manpowerP = resultsTask?.manpower || 0;
                const manpowerR = evalTask?.actualManpower || manpowerP;

                return [
                    `${item.task.action.toUpperCase()}\n(${item.task.equipment})`,
                    item.task.discipline.toUpperCase(),
                    `${formatDate(item.task.startTime, true)}\n-> ${formatDate(item.actualEnd || item.task.endTime, true)}`,
                    `${item.task.duration.toFixed(1)}h / ${(item.actualDuration || item.task.duration).toFixed(1)}h`,
                    `${manpowerP} / ${manpowerR}`,
                    item.progressPlanned,
                    item.progressActual,
                    `${(item.realAtteint ?? 0).toFixed(1)} HH`,
                    `${(item.tacticalRealization ?? 0).toFixed(0)}%`
                ];
            }),
            columnStyles: {
                0: { fontStyle: 'bold', textColor: [30, 41, 59] },
                1: { halign: 'center', fontSize: 7, cellWidth: 28 }, // Increased width
                2: { cellWidth: 35, fontStyle: 'bold', textColor: [100, 116, 139], fontSize: 7, halign: 'center' },
                3: { cellWidth: 25, halign: 'center', textColor: [100, 116, 139] },
                4: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
                5: { cellWidth: 40 },
                6: { cellWidth: 40 },
                7: { cellWidth: 25, halign: 'right', fontSize: 7, fontStyle: 'bold' },
                8: { cellWidth: 25, halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] }
            },
            willDrawCell: (data) => {
                if (data.section === 'body' && (data.column.index === 5 || data.column.index === 6)) {
                    data.cell.text = [''];
                }
            },
            didDrawCell: (data) => {
                const posX = data.cell.x + data.cell.padding('left');
                const posY = data.cell.y + data.cell.height / 2;

                if (data.section === 'body' && data.column.index === 4) {
                    const text = data.cell?.text?.[0];
                    if (text && typeof text === 'string' && text.includes('/')) {
                        const parts = text.split('/');
                        const p = parseFloat(parts[0]);
                        const r = parseFloat(parts[1]);
                        if (r > p) {
                            doc.setTextColor(100, 116, 139); // Slate-500 instead of Red
                            doc.setFont('helvetica', 'normal'); // Normal instead of Bold
                            doc.text(text, data.cell.x + data.cell.width / 2, posY, { align: 'center' });
                        }
                    }
                }

                if (data.section === 'body') {
                    if (data.column.index === 5) {
                        const progress = data.cell.raw as number;
                        drawProgressBar(doc, data.cell.x + 4, data.cell.y + 6, data.cell.width - 15, 4, progress, [148, 163, 184]);
                        doc.setFontSize(7); doc.setTextColor(100, 116, 139); doc.setFont('helvetica', 'bold');
                        doc.text(`${Math.round(progress)}%`, data.cell.x + data.cell.width - 2, data.cell.y + 9, { align: 'right' });
                    }
                    if (data.column.index === 6) {
                        const progress = data.cell.raw as number;
                        drawProgressBar(doc, data.cell.x + 4, data.cell.y + 6, data.cell.width - 15, 4, progress, [59, 130, 246]);
                        doc.setFontSize(7); doc.setTextColor(59, 130, 246); doc.setFont('helvetica', 'bold');
                        doc.text(`${Math.round(progress)}%`, data.cell.x + data.cell.width - 2, data.cell.y + 9, { align: 'right' });
                    }
                }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 8) {
                    const value = parseFloat(String(data.cell.raw));
                    if (value >= 100) data.cell.styles.textColor = [16, 185, 129];
                    else if (value >= 80) data.cell.styles.textColor = [234, 179, 8];
                    else data.cell.styles.textColor = [239, 68, 68];
                }
            }
        });
        currentY = (doc as any).lastAutoTable.finalY + 20;
    }

    // --- Completed Tasks ---
    if (completedTasksToDisplay.length > 0) {
        if (currentY > pageHeight - margin - 60) { doc.addPage(); currentY = margin + 10; }

        doc.setFillColor(15, 23, 42); // slate-900 header block
        doc.roundedRect(margin, currentY, 10, 8, 2, 2, 'F');
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Performances : Travaux Terminés", margin + 15, currentY + 6);
        currentY += 15;

        const taskBody = completedTasksToDisplay.map(task => {
            const resultsTask = results.scheduledTasks.find(t => t.id === task.id);
            const evalTask = evaluationData.tasks[task.id];
            const manpowerP = resultsTask?.manpower || 0;
            const manpowerR = evalTask?.actualManpower || manpowerP;

            return [
                task.ot || '-',
                task.action,
                task.discipline.toUpperCase(),
                `${manpowerP} / ${manpowerR}`,
                formatDate(task.startTime),
                formatDate(task.actualEnd || null),
                (task.actualDuration || 0).toFixed(1),
                task.slippage?.toFixed(1) || '-'
            ];
        });

        autoTable(doc, {
            startY: currentY,
            head: [['OT', 'Description', 'Discipline', 'Ressources P/R', 'Début Prévu', 'Fin Réelle', 'Durée (h)', 'Delta (h)']],
            body: taskBody,
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42], fontSize: 10, cellPadding: 3 },
            styles: { fontSize: 8.5, cellPadding: 3, valign: 'middle' },
            columnStyles: {
                0: { fontStyle: 'bold' },
                1: { cellWidth: 'auto' },
                2: { halign: 'center', fontSize: 7, cellWidth: 28 }, // Increased width
                3: { halign: 'center', fontStyle: 'bold' },
                6: { halign: 'right', fontStyle: 'bold' },
                7: { halign: 'right', fontStyle: 'bold' }
            },
            didDrawCell: (data) => {
                if (data.section === 'body' && data.column.index === 3) {
                    const text = data.cell?.text?.[0];
                    if (text && typeof text === 'string' && text.includes('/')) {
                        const parts = text.split('/');
                        const p = parseFloat(parts[0]);
                        const r = parseFloat(parts[1]);
                        if (r > p) {
                            doc.setTextColor(100, 116, 139); // Slate-500
                            doc.setFont('helvetica', 'normal');
                            doc.text(text, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, { align: 'center' });
                        }
                    }
                }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 7) {
                    const value = parseFloat(String(data.cell.raw));
                    if (value > 0.1) data.cell.styles.textColor = [239, 68, 68];
                    if (value < -0.1) data.cell.styles.textColor = [16, 185, 129];
                }
            }
        });
        currentY = (doc as any).lastAutoTable.finalY + 20;
    }

    // --- PAGE 4: Supplementary & Safety ---
    if (supplementaryTasksInPeriod.length > 0) {
        if (currentY > pageHeight - margin - 80) { doc.addPage(); currentY = margin + 10; }

        doc.setFillColor(15, 23, 42); // slate-900 header block
        doc.roundedRect(margin, currentY, 10, 8, 2, 2, 'F');
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Travaux Hors-Planning (Supplémentaires)", margin + 15, currentY + 6);
        currentY += 15;

        autoTable(doc, {
            startY: currentY,
            head: [['Désignation', 'Équipement', 'Détails Disciplines & Effectifs', 'Charge Totale (HH)']],
            body: supplementaryTasksInPeriod.map(task => [
                task.action.toUpperCase(),
                task.equipment,
                task.teamDetails.map(d => `${d.team.toUpperCase()}\n> ${d.manpower} Pers. | ${d.manHours.toFixed(1)} HH`).join('\n\n'),
                { content: task.totalManHours.toFixed(1), styles: { halign: 'right', fontStyle: 'bold' } }
            ]),
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], fontSize: 10, cellPadding: 3, halign: 'center' },
            styles: { fontSize: 8.5, cellPadding: 4, valign: 'middle' },
            columnStyles: {
                0: { cellWidth: 70, fontStyle: 'bold' },
                1: { cellWidth: 50 },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 35, fontStyle: 'bold', textColor: [59, 130, 246] }
            }
        });
        currentY = (doc as any).lastAutoTable.finalY + 20;
    }


    // --- Tâches à Haut Risque (NEW) ---
    if (highRiskKpi && highRiskKpi.tasks && highRiskKpi.tasks.length > 0) {
        if (currentY > pageHeight - margin - 80) { doc.addPage(); currentY = margin + 10; }

        doc.setFillColor(153, 27, 27); // Dark red header block
        doc.roundedRect(margin, currentY, 10, 8, 2, 2, 'F');
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Tâches à Haut Risque (Période)", margin + 15, currentY + 6);
        currentY += 15;

        autoTable(doc, {
            startY: currentY,
            head: [['Désignation de L\'action', 'Équipement', 'Statut', 'Période (Début -> Fin)', 'Durée (h)']],
            body: highRiskKpi.tasks.map(task => {
                const evalTask = evaluationData.tasks[task.id];
                const status = evalTask?.status || 'À Faire';
                return [
                    task.action.toUpperCase(),
                    task.equipment || '-',
                    status,
                    `${formatDate(evalTask?.actualStart || task.startTime)} -> ${formatDate(evalTask?.actualEnd || task.endTime)}`,
                    (evalTask?.actualDuration || task.duration).toFixed(2)
                ];
            }),
            theme: 'grid',
            headStyles: { fillColor: [153, 27, 27], fontSize: 10, cellPadding: 3, halign: 'center' },
            styles: { fontSize: 8.5, cellPadding: 4, valign: 'middle' },
            columnStyles: {
                0: { cellWidth: 70, fontStyle: 'bold' },
                1: { cellWidth: 50 },
                2: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
                3: { cellWidth: 'auto', halign: 'center' },
                4: { cellWidth: 30, halign: 'center', fontStyle: 'bold' }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 2) {
                    if (data.cell.raw === 'Fait') {
                        data.cell.styles.textColor = [16, 185, 129];
                    } else if (data.cell.raw === 'En Cours') {
                        data.cell.styles.textColor = [59, 130, 246];
                    } else {
                        data.cell.styles.textColor = [100, 116, 139];
                    }
                }
            }
        });
        currentY = (doc as any).lastAutoTable.finalY + 20;
    }

    // Accidents
    if (evaluationData.incidentDetails.length > 0 || evaluationData.accidentDetails.length > 0) {
        if (currentY > pageHeight - margin - 80) { doc.addPage(); currentY = margin + 10; }

        doc.setFillColor(15, 23, 42); // slate-900 header block
        doc.roundedRect(margin, currentY, 10, 8, 2, 2, 'F');
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text("Sécurité & Événements Clés", margin + 15, currentY + 6);
        currentY += 15;

        const eventBody = [
            ...evaluationData.incidentDetails.map(i => ['INCIDENT', formatDate(i.dateTime), i.description]),
            ...evaluationData.accidentDetails.map(a => ['ACCIDENT', formatDate(a.dateTime), a.description])
        ];

        autoTable(doc, {
            startY: currentY,
            head: [['Type', 'Horodateur', 'Description des faits']],
            body: eventBody,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], fontSize: 10, cellPadding: 3 },
            styles: { fontSize: 9, cellPadding: 4 },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 30 },
                1: { cellWidth: 45 }
            },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 0 && data.cell.raw === 'ACCIDENT') {
                    data.cell.styles.textColor = [153, 27, 27];
                    data.cell.styles.fillColor = [254, 226, 226];
                }
            }
        });
        currentY = (doc as any).lastAutoTable.finalY + 20;
    }

    addFooter(doc, margin, inspectorName);
    return doc;
};