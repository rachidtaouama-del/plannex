
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { CalculationResults, AppParameters, ScheduledTask } from '../types';
import { drawProfessionalCoverPage } from './pdfCoverPageService';

// Helper to format dates consistently
const formatDate = (date: Date, withTime: boolean = true): string => {
    const options: Intl.DateTimeFormatOptions = {
        day: '2-digit', month: '2-digit', year: 'numeric',
    };
    if (withTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    return date.toLocaleString('fr-FR', options);
};

export const exportHighRiskTasksToPDF = async (
    tasksToExport: ScheduledTask[],
    parameters: AppParameters,
    customTitle?: string,
    selectedColumns?: string[],
    allTasks?: ScheduledTask[]
): Promise<jsPDF> => {
    return new Promise((resolve, reject) => {
        if (tasksToExport.length === 0) {
            reject(new Error("Aucune tâche à haut risque n'a été trouvée."));
            return;
        }

        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            let currentY = margin;

            const title = customTitle || 'Liste des Taches a Haut Risque';
            const globalTasks0 = allTasks || tasksToExport;
            const thrPctCover = ((tasksToExport.length / Math.max(globalTasks0.length, 1)) * 100).toFixed(1);
            const byTypeCover: Record<string, number> = {};
            tasksToExport.forEach(t => { const mt = (t as any).maintenanceType || 'Autre'; byTypeCover[mt] = (byTypeCover[mt] || 0) + 1; });
            const shutdownDateStr = formatDate(new Date(parameters.shutdownStart), false);

            drawProfessionalCoverPage(doc, {
                title: title,
                category: 'LISTES SPECIALES',
                subcategory: 'SECURITE INDUSTRIELLE',
                description: 'Rapport consolide des interventions a haut risque - Surveillance et controle obligatoires',
                accentColor: [220, 38, 38],
                meta: [
                    { label: 'Type de document', value: 'Liste des Taches a Haut Risque (THR)' },
                    { label: 'Date de reference', value: shutdownDateStr },
                    { label: 'Taches THR', value: `${tasksToExport.length} taches sur ${globalTasks0.length} au total (${thrPctCover}%)` },
                    { label: 'Categories', value: Object.keys(byTypeCover).join(', ') || 'Non defini' },
                    { label: 'Statut', value: 'Surveillance et controle HSE obligatoires' },
                ],
                dateLabel: `Arret du: ${shutdownDateStr}`,
                projectName: 'Arret de Maintenance Industrielle',
                classification: 'CONFIDENTIEL - SECURITE',
                docRef: 'PLX-THR',
            });

            const startDate = new Date(parameters.shutdownStart);

            // --- ENHANCED 6 KPI HEADER (RED THEME) ---
            // Use allTasks if provided, otherwise fallback to tasksToExport (which would be wrong, but better than nothing)
            const globalTasks = allTasks || tasksToExport;
            const totalAllTasks = globalTasks.length;
            const thrCount = tasksToExport.length;
            const normalCount = totalAllTasks - thrCount;
            const thrPct = (thrCount / totalAllTasks) * 100;
            const normalPct = (normalCount / totalAllTasks) * 100;

            // Dark container
            doc.setFillColor(15, 23, 42);
            doc.roundedRect(margin, currentY, pageWidth - margin * 2, 75, 4, 4, 'F');

            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(148, 163, 184);
            doc.text('ANALYSE DES RISQUES CRITIQUES — INDICATEURS', pageWidth / 2, currentY + 8, { align: 'center' });

            // --- ROW 1: THE 2 DONUTS ---
            const donutRadius = 12;
            const donutY = currentY + 28;
            const donutGap = 80;
            const donutStartX = (pageWidth / 2) - (donutGap / 2);

            // Donut 1 (THR)
            doc.setDrawColor(51, 65, 85);
            doc.setLineWidth(2);
            doc.circle(donutStartX, donutY, donutRadius, 'S');
            doc.setDrawColor(220, 38, 38); // red-600
            doc.setLineWidth(2.5);
            let segments = 40;
            let anglePerSegment = (thrPct / 100) * 360 / segments;
            for (let i = 0; i < segments; i++) {
                const startAngle = (i * anglePerSegment - 90) * (Math.PI / 180);
                const endAngle = ((i + 1) * anglePerSegment - 90) * (Math.PI / 180);
                doc.line(donutStartX + donutRadius * Math.cos(startAngle), donutY + donutRadius * Math.sin(startAngle), donutStartX + donutRadius * Math.cos(endAngle), donutY + donutRadius * Math.sin(endAngle));
            }
            doc.setFontSize(14); doc.setTextColor(255, 255, 255);
            doc.text(`${thrCount}`, donutStartX, donutY + 1, { align: 'center' });
            doc.setFontSize(7); doc.text(`${thrPct.toFixed(1)}%`, donutStartX, donutY + 5, { align: 'center' });
            doc.text('TÂCHES THR', donutStartX, donutY + 18, { align: 'center' });

            // Donut 2 (Normal)
            const donut2X = donutStartX + donutGap;
            doc.setDrawColor(51, 65, 85);
            doc.setLineWidth(2);
            doc.circle(donut2X, donutY, donutRadius, 'S');
            doc.setDrawColor(51, 65, 85);
            doc.setLineWidth(2.5);
            anglePerSegment = (normalPct / 100) * 360 / segments;
            for (let i = 0; i < segments; i++) {
                const startAngle = (i * anglePerSegment - 90) * (Math.PI / 180);
                const endAngle = ((i + 1) * anglePerSegment - 90) * (Math.PI / 180);
                doc.line(donut2X + donutRadius * Math.cos(startAngle), donutY + donutRadius * Math.sin(startAngle), donut2X + donutRadius * Math.cos(endAngle), donutY + donutRadius * Math.sin(endAngle));
            }
            doc.setFontSize(14); doc.setTextColor(255, 255, 255);
            doc.text(`${normalCount}`, donut2X, donutY + 1, { align: 'center' });
            doc.setFontSize(7); doc.text(`${normalPct.toFixed(1)}%`, donut2X, donutY + 5, { align: 'center' });
            doc.text('TÂCHES NORMALES', donut2X, donutY + 18, { align: 'center' });

            // --- ROW 2: THE 3 BOXES ---
            const boxY = currentY + 52;
            const boxH = 15;
            const boxW = 80;
            const boxGap = 10;
            const totalRowW = (boxW * 3) + (boxGap * 2);
            const boxesStartX = (pageWidth / 2) - (totalRowW / 2);

            // Box 1
            doc.setFillColor(30, 41, 59);
            doc.roundedRect(boxesStartX, boxY, boxW, boxH, 2, 2, 'F');
            doc.setFontSize(14); doc.setTextColor(255, 255, 255);
            doc.text(`${thrCount}`, boxesStartX + boxW / 2, boxY + 8, { align: 'center' });
            doc.setFontSize(7); doc.setTextColor(148, 163, 184);
            doc.text('TÂCHES THR', boxesStartX + boxW / 2, boxY + 12, { align: 'center' });

            // Box 2
            doc.setFillColor(30, 41, 59);
            doc.roundedRect(boxesStartX + boxW + boxGap, boxY, boxW, boxH, 2, 2, 'F');
            doc.setFontSize(14); doc.setTextColor(34, 211, 238);
            doc.text(`${thrPct.toFixed(1)}%`, boxesStartX + boxW + boxGap + boxW / 2, boxY + 8, { align: 'center' });
            doc.setFontSize(7); doc.setTextColor(148, 163, 184);
            doc.text('DU TOTAL GLOBAL', boxesStartX + boxW + boxGap + boxW / 2, boxY + 12, { align: 'center' });

            // Box 3
            doc.setFillColor(30, 41, 59);
            doc.roundedRect(boxesStartX + (boxW + boxGap) * 2, boxY, boxW, boxH, 2, 2, 'F');
            doc.setFontSize(14); doc.setTextColor(255, 255, 255);
            doc.text(`${totalAllTasks}`, boxesStartX + (boxW + boxGap) * 2 + boxW / 2, boxY + 8, { align: 'center' });
            doc.setFontSize(7); doc.setTextColor(148, 163, 184);
            doc.text('TÂCHES TOTALES', boxesStartX + (boxW + boxGap) * 2 + boxW / 2, boxY + 12, { align: 'center' });

            currentY += 85;

            // --- TABLE SECTION ---
            const colMap: Record<string, { header: string; getter: (t: any) => string; width?: number; halign?: string }> = {
                action: { header: 'Action', getter: t => t.action, width: 90 },
                ot: { header: 'OT', getter: t => t.ot || '', width: 30 },
                avis: { header: 'Avis', getter: t => t.avis || '', width: 30 },
                equipment: { header: 'Équipement', getter: t => t.equipment, width: 80 },
                team: { header: 'Équipe', getter: t => t.team, width: 40 },
                debut: { header: 'Début', getter: t => formatDate(t.startTime), width: 35 },
                fin: { header: 'Fin', getter: t => formatDate(t.endTime), width: 35 },
                effectif: { header: 'Pers.', getter: t => t.manpower, width: 20, halign: 'right' },
                duree: { header: 'Durée (h)', getter: t => t.duration.toFixed(2), width: 20, halign: 'right' },
                famille: { header: 'Famille', getter: t => t.family || '', width: 40 },
                discipline: { header: 'Discipline', getter: t => t.discipline || '', width: 40 },
            };

            const defaultCols = ['action', 'ot', 'avis', 'equipment', 'team', 'debut', 'fin', 'effectif', 'duree'];
            const cols = selectedColumns && selectedColumns.length > 0 ? selectedColumns : defaultCols;

            const activeColDefs = cols.filter(c => colMap[c]).map(c => colMap[c]);
            const tableHeader = activeColDefs.map(c => c.header);
            const columnStyles: Record<number, any> = {};
            activeColDefs.forEach((c, i) => {
                const style: any = {};
                if (c.width) style.cellWidth = c.width;
                if (c.halign) style.halign = c.halign;
                columnStyles[i] = style;
            });

            const tableBody = tasksToExport
                .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                .map(t => activeColDefs.map(c => c.getter(t)));

            autoTable(doc, {
                startY: currentY,
                head: [tableHeader],
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [192, 28, 28], textColor: 255 },
                styles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
                columnStyles: columnStyles,
            });

            const pageCount = (doc as any).internal.pages.length;
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
                doc.text('Created by PlanneX', margin, pageHeight - 10, { align: 'left' });
                doc.text(`Page ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            }

            resolve(doc);
        } catch (error) {
            console.error("Error during High-Risk PDF generation:", error);
            reject(error);
        }
    });
};
