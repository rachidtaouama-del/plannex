
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ScheduledTask, AppParameters } from '../types';

// Helper to format dates consistently
const formatDate = (date: Date, withTime: boolean = true): string => {
    if (!date || isNaN(date.getTime())) return 'N/A';
    const options: Intl.DateTimeFormatOptions = {
        day: '2-digit', month: '2-digit', year: 'numeric',
    };
    if (withTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    return date.toLocaleString('fr-FR', options);
};

export const exportShiftWorkToPDF = async (
    tasks: ScheduledTask[], 
    title: string, 
    parameters: AppParameters
): Promise<jsPDF> => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 20;
            let currentY = margin;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(22);
            doc.text("LISTE DES TRAVAUX PLANIFIÉS", pageWidth / 2, currentY, { align: 'center' });
            currentY += 8;
            
            doc.setFontSize(16);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(82, 82, 82);
            doc.text(title, pageWidth / 2, currentY, { align: 'center' });
            currentY += 15;

            const groupedByFamily: Record<string, ScheduledTask[]> = {};
            tasks.forEach(task => {
                const key = task.family || 'Sans Famille';
                if (!groupedByFamily[key]) groupedByFamily[key] = [];
                groupedByFamily[key].push(task);
            });

            const sortedFamilies = Object.keys(groupedByFamily).sort();

            for (const familyName of sortedFamilies) {
                const familyTasks = groupedByFamily[familyName];
                
                const sortedFamilyTasks = familyTasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
                
                const tableBody = sortedFamilyTasks.map(t => [
                    t.action,
                    t.ot || '',
                    t.avis || '',
                    t.equipment,
                    t.discipline,
                    t.maintenanceType || '',
                    formatDate(t.startTime),
                    formatDate(t.endTime),
                    t.manpower,
                    t.duration.toFixed(2)
                ]);
                
                if (currentY + 25 > doc.internal.pageSize.getHeight() - margin) {
                    doc.addPage();
                    currentY = margin;
                }

                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text(familyName.toUpperCase(), margin, currentY);
                currentY += 8;

                autoTable(doc, {
                    startY: currentY,
                    head: [['Action', 'OT', 'Avis', 'Équipement', 'Discipline', 'Type de Maintenance', 'Début', 'Fin', 'Pers.', 'Durée (h)']],
                    body: tableBody,
                    theme: 'grid',
                    headStyles: { fillColor: [71, 85, 105], textColor: 255 },
                    styles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
                    columnStyles: {
                        0: { cellWidth: 80 },
                        1: { cellWidth: 30 },
                        2: { cellWidth: 30 },
                        3: { cellWidth: 70 },
                        4: { cellWidth: 30 },
                        5: { cellWidth: 30 },
                        6: { cellWidth: 35 },
                        7: { cellWidth: 35 },
                        8: { cellWidth: 20, halign: 'right' },
                        9: { cellWidth: 20, halign: 'right' }
                    },
                    didDrawPage: (data) => {
                        currentY = data.cursor?.y ? data.cursor.y : margin;
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
        } catch(error) {
            console.error("Error during Shift Work PDF generation:", error);
            reject(error);
        }
    });
};
