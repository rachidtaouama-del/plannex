/**
 * thrReportPdfExportService.ts
 * Premium THR (Travaux a Haut Risque) PDF Report
 * Design: Individual risk-mission cards per task — safety-first visual hierarchy,
 * red/dark palette, industrial precision.
 */

import jsPDF from 'jspdf';
import type { AppParameters, ScheduledTask } from '../types';
import { drawProfessionalCoverPage } from './pdfCoverPageService';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const safe = (s: string): string =>
    (s || '').replace(/[éèêëàâïîùûçôöüñ—→«»]/gi, (c) =>
    ({
        é: 'e', è: 'e', ê: 'e', ë: 'e',
        à: 'a', â: 'a', ï: 'i', î: 'i',
        ù: 'u', û: 'u', ç: 'c', ô: 'o',
        ö: 'o', ü: 'u', ñ: 'n',
        '—': '-', '→': '->', '«': '"', '»': '"',
    }[c] || c)
    );

const fmtDate = (date: Date, withTime = true): string => {
    const d = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    if (!withTime) return d;
    const t = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    return `${d} ${t}`;
};

// Compute a risk label from fields
const getRiskLevel = (task: ScheduledTask): { label: string; color: [number, number, number]; bg: [number, number, number] } => {
    const hh = task.duration * task.manpower;
    if (hh >= 8 || task.manpower >= 5)
        return { label: 'RISQUE CRITIQUE', color: [255, 255, 255], bg: [185, 28, 28] };
    if (hh >= 4 || task.manpower >= 3)
        return { label: 'RISQUE ELEVE', color: [255, 255, 255], bg: [220, 38, 38] };
    return { label: 'RISQUE MODERE', color: [255, 255, 255], bg: [239, 68, 68] };
};

// ─────────────────────────────────────────────────────────────────────────────
//  Main export function
// ─────────────────────────────────────────────────────────────────────────────
export const exportTHRReportToPDF = (
    thrTasks: ScheduledTask[],
    parameters: AppParameters,
    allTasks?: ScheduledTask[],
    customTitle?: string,
): Promise<jsPDF> => {
    return new Promise((resolve, reject) => {
        if (thrTasks.length === 0) {
            reject(new Error('Aucune tache THR trouvee.'));
            return;
        }
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
            const PW = doc.internal.pageSize.getWidth();   // 420mm
            const PH = doc.internal.pageSize.getHeight();  // 297mm
            const M = 20;

            const totalTasks = (allTasks || thrTasks).length;
            const thrCount = thrTasks.length;
            const thrPct = ((thrCount / Math.max(totalTasks, 1)) * 100).toFixed(1);
            const shutdownDateStr = fmtDate(new Date(parameters.shutdownStart), false);

            // Stats
            const totalHH = thrTasks.reduce((s, t) => s + t.duration * t.manpower, 0);
            const teamsSet = new Set(thrTasks.map(t => t.team).filter(Boolean));
            const criticalCount = thrTasks.filter(t => {
                const r = getRiskLevel(t);
                return r.label === 'RISQUE CRITIQUE';
            }).length;

            const families = thrTasks.reduce<Record<string, number>>((acc, t) => {
                const f = t.family || 'Autre';
                acc[f] = (acc[f] || 0) + 1;
                return acc;
            }, {});

            // ── COVER PAGE ────────────────────────────────────────────────────
            drawProfessionalCoverPage(doc, {
                title: customTitle || 'LISTE THR — TRAVAUX A HAUT RISQUE',
                category: 'SECURITE INDUSTRIELLE',
                subcategory: 'RISQUES CRITIQUES',
                description: 'Rapport des interventions a haut risque — Vigilance et controles HSE obligatoires',
                accentColor: [220, 38, 38],
                meta: [
                    { label: 'Type de document', value: 'Liste THR — Travaux a Haut Risque' },
                    { label: 'Date de reference', value: shutdownDateStr },
                    { label: 'Taches THR', value: `${thrCount} taches sur ${totalTasks} au total (${thrPct}%)` },
                    { label: 'Charge totale', value: `${totalHH.toFixed(1)} H-H impliques dans les THR` },
                    { label: 'Equipes concernees', value: `${teamsSet.size} equipe(s)` },
                    { label: 'Taches critiques', value: `${criticalCount} tache(s) a risque critique identifiee(s)` },
                    { label: 'Statut', value: 'Surveillance et controle HSE obligatoires — Permis de travail requis' },
                ],
                dateLabel: `Arret du: ${shutdownDateStr}`,
                projectName: 'Arret de Maintenance Industrielle',
                classification: 'CONFIDENTIEL — SECURITE',
                docRef: 'PLX-THR',
            });

            // ─────────────────────────────────────────────────────────────────
            // PAGE 2+: CONTENT
            // ─────────────────────────────────────────────────────────────────
            let Y = M;

            // ── STATS BANNER ──────────────────────────────────────────────────
            const BANNER_H = 52;
            doc.setFillColor(10, 15, 30);
            doc.roundedRect(M, Y, PW - M * 2, BANNER_H, 4, 4, 'F');
            doc.setFillColor(220, 38, 38);
            doc.roundedRect(M, Y, PW - M * 2, 2.5, 1, 1, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(100, 120, 160);
            doc.text('ANALYSE DES RISQUES CRITIQUES — INDICATEURS THR', PW / 2, Y + 11, { align: 'center' });

            const statItems = [
                { v: `${thrCount}`, l: 'TACHES THR', c: [255, 255, 255] as [number, number, number] },
                { v: `${thrPct}%`, l: 'DU TOTAL GLOBAL', c: [244, 63, 94] as [number, number, number] },
                { v: `${criticalCount}`, l: 'RISQUE CRITIQUE', c: [251, 113, 133] as [number, number, number] },
                { v: `${teamsSet.size}`, l: 'EQUIPES', c: [251, 191, 36] as [number, number, number] },
                { v: `${totalHH.toFixed(0)}`, l: 'H-H TOTAL', c: [52, 211, 153] as [number, number, number] },
                { v: `${totalTasks}`, l: 'TACHES TOTALES', c: [148, 163, 184] as [number, number, number] },
            ];
            const bW = (PW - M * 2 - 20) / statItems.length;
            statItems.forEach((st, i) => {
                const bx = M + 10 + i * bW;
                const by = Y + 18;
                doc.setFillColor(20, 30, 55);
                doc.roundedRect(bx, by, bW - 4, 26, 2, 2, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(17);
                doc.setTextColor(...st.c);
                doc.text(st.v, bx + (bW - 4) / 2, by + 13, { align: 'center' });
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(5.5);
                doc.setTextColor(80, 100, 135);
                doc.text(st.l, bx + (bW - 4) / 2, by + 21, { align: 'center' });
            });
            Y += BANNER_H + 8;

            // ── HSE WARNING STRIP ─────────────────────────────────────────────
            doc.setFillColor(255, 243, 243);
            doc.roundedRect(M, Y, PW - M * 2, 16, 2, 2, 'F');
            doc.setFillColor(220, 38, 38);
            doc.rect(M, Y, 4, 16, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(185, 25, 25);
            doc.text('! AVERTISSEMENT HSE :', M + 8, Y + 6.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(80, 40, 40);
            doc.text(
                safe('Les taches suivantes sont classees a haut risque (THR). Tout chef d\'equipe doit prendre connaissance de ces fichiers, obtenir les permis de travail et assurer une surveillance renforcee.'),
                M + 52, Y + 6.5, { maxWidth: PW - M * 2 - 56 }
            );
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(185, 25, 25);
            doc.text(safe('Permis de Travail | Consignation | EPI Obligatoires | Controle HSE Avant Execution'), M + 8, Y + 13);
            Y += 22;

            // ── SECTION TITLE ─────────────────────────────────────────────────
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(12, 18, 35);
            doc.text(safe('FICHES MISSION — TRAVAUX A HAUT RISQUE'), M, Y + 5);
            doc.setFillColor(220, 38, 38);
            doc.rect(M, Y + 8, 50, 1.5, 'F');
            doc.setFillColor(200, 210, 225);
            doc.rect(M + 53, Y + 8.5, PW - M * 2 - 53, 0.4, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(120, 130, 150);
            doc.text(safe(`${thrCount} tache(s) — Triees par date de debut — Vigilance obligatoire`), M, Y + 14);
            Y += 22;

            // ── TASK CARDS ────────────────────────────────────────────────────
            // 2 cards per row
            const CARDS_PER_ROW = 2;
            const CARD_GAP = 6;
            const CARD_W = (PW - M * 2 - CARD_GAP * (CARDS_PER_ROW - 1)) / CARDS_PER_ROW;
            const CARD_H = 56;

            const sorted = [...thrTasks].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

            sorted.forEach((task, idx) => {
                const col = idx % CARDS_PER_ROW;
                const x = M + col * (CARD_W + CARD_GAP);

                // Page break check (start of new row)
                if (col === 0 && idx > 0) {
                    if (Y + CARD_H + 4 > PH - 22) {
                        addFooter(doc, PW, PH, M);
                        doc.addPage();
                        Y = M;
                    }
                }

                const risk = getRiskLevel(task);
                const hh = (task.duration * task.manpower).toFixed(1);

                // Card shadow (offset rect)
                doc.setFillColor(200, 205, 215);
                doc.roundedRect(x + 1, Y + 1, CARD_W, CARD_H, 2, 2, 'F');

                // Card background
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(x, Y, CARD_W, CARD_H, 2, 2, 'F');

                // Left risk strip (full height)
                doc.setFillColor(...risk.bg);
                doc.rect(x, Y, 4, CARD_H, 'F');

                // ── TOP HEADER BAR ─────────────────────────────────────────────
                doc.setFillColor(15, 23, 42);
                doc.rect(x + 4, Y, CARD_W - 4, 13, 'F');

                // Card index badge
                doc.setFillColor(...risk.bg);
                doc.roundedRect(x + 7, Y + 2, 10, 9, 1, 1, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.setTextColor(255, 255, 255);
                doc.text(String(idx + 1).padStart(2, '0'), x + 12, Y + 7.5, { align: 'center' });

                // Risk badge
                doc.setFillColor(...risk.bg);
                doc.roundedRect(x + CARD_W - 58, Y + 2.5, 54, 8, 1, 1, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6);
                doc.setTextColor(...risk.color);
                doc.text(risk.label, x + CARD_W - 31, Y + 7.5, { align: 'center' });

                // OT number
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.setTextColor(244, 63, 94);
                doc.text(safe(`OT: ${task.ot || 'SANS OT'}`), x + 21, Y + 8);

                // ── ACTION TITLE ───────────────────────────────────────────────
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8.5);
                doc.setTextColor(12, 18, 35);
                const actionLines = doc.splitTextToSize(safe(task.action.toUpperCase()), CARD_W - 14);
                doc.text(actionLines.slice(0, 2), x + 7, Y + 22);

                // ── EQUIPMENT ROW ──────────────────────────────────────────────
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.5);
                doc.setTextColor(80, 100, 130);
                doc.text(safe(`Equipement : ${task.equipment}`), x + 7, Y + 30, { maxWidth: CARD_W - 12 });

                // Discipline / family chips
                const chips: Array<{ text: string; col: [number, number, number] }> = [];
                if (task.family) chips.push({ text: safe(task.family), col: [99, 102, 241] });
                if (task.discipline) chips.push({ text: safe(task.discipline), col: [20, 184, 166] });
                let chipX = x + 7;
                chips.slice(0, 3).forEach(chip => {
                    const chipW = doc.getTextWidth(chip.text) + 5;
                    doc.setFillColor(chip.col[0], chip.col[1], chip.col[2]);
                    doc.roundedRect(chipX, Y + 32.5, chipW, 5, 0.8, 0.8, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(5.5);
                    doc.setTextColor(255, 255, 255);
                    doc.text(chip.text, chipX + chipW / 2, Y + 36.2, { align: 'center' });
                    chipX += chipW + 2.5;
                });

                // ── DIVIDER ────────────────────────────────────────────────────
                doc.setDrawColor(230, 235, 245);
                doc.setLineWidth(0.25);
                doc.line(x + 7, Y + 40, x + CARD_W - 5, Y + 40);

                // ── BOTTOM INFO ROW ────────────────────────────────────────────
                // Team pill
                const teamText = safe(task.team || 'N/A');
                const teamBadgeW = Math.min(doc.getTextWidth(teamText) + 7, CARD_W / 3);
                doc.setFillColor(30, 41, 59);
                doc.roundedRect(x + 7, Y + 42, teamBadgeW, 7, 1, 1, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6);
                doc.setTextColor(148, 163, 184);
                doc.text(teamText, x + 7 + teamBadgeW / 2, Y + 46.5, { align: 'center', maxWidth: teamBadgeW - 3 });

                // Dates (center)
                const dateStartX = x + 7 + teamBadgeW + 4;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.5);
                doc.setTextColor(60, 80, 110);
                doc.text(safe(`Debut: ${fmtDate(task.startTime)}`), dateStartX, Y + 44.5);
                doc.text(safe(`Fin:   ${fmtDate(task.endTime)}`), dateStartX, Y + 50.5);

                // H-H badge (far right)
                const hhText = `${hh} H-H`;
                const hhBadgeX = x + CARD_W - 35;
                doc.setFillColor(220, 38, 38);
                doc.roundedRect(hhBadgeX, Y + 42, 30, 12, 1.5, 1.5, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(255, 255, 255);
                doc.text(hhText, hhBadgeX + 15, Y + 48.5, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(5.5);
                doc.setTextColor(255, 200, 200);
                doc.text(`${task.manpower} pers. x ${task.duration.toFixed(1)}h`, hhBadgeX + 15, Y + 53, { align: 'center' });

                // Advance row if last in row or last card
                if (col === CARDS_PER_ROW - 1 || idx === sorted.length - 1) {
                    Y += CARD_H + 5;
                }
            });

            // ── DISTRIBUTION BY FAMILY TABLE ──────────────────────────────────
            if (Y + 50 > PH - 22) {
                addFooter(doc, PW, PH, M);
                doc.addPage();
                Y = M;
            } else {
                Y += 6;
            }

            // Section header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(12, 18, 35);
            doc.text(safe('SYNTHESE PAR FAMILLE / DISCIPLINE'), M, Y + 5);
            doc.setFillColor(220, 38, 38);
            doc.rect(M, Y + 8, 40, 1.5, 'F');
            Y += 14;

            const familyEntries = Object.entries(families).sort((a, b) => b[1] - a[1]);
            const totalFam = familyEntries.reduce((s, [, n]) => s + n, 0);
            const barMaxW = PW - M * 2 - 100;
            const rowH = 10;

            familyEntries.forEach(([fam, count], i) => {
                if (Y + rowH > PH - 22) {
                    addFooter(doc, PW, PH, M);
                    doc.addPage();
                    Y = M;
                }
                const pct = (count / Math.max(totalFam, 1)) * 100;
                const rowY = Y + i * rowH;

                // Alternating bg
                if (i % 2 === 0) {
                    doc.setFillColor(248, 250, 252);
                    doc.rect(M, rowY, PW - M * 2, rowH, 'F');
                }

                // Family name
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.setTextColor(20, 30, 50);
                doc.text(safe(fam), M + 3, rowY + 7);

                // Count
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.setTextColor(220, 38, 38);
                doc.text(`${count}`, M + 60, rowY + 7, { align: 'right' });

                // Pct
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.5);
                doc.setTextColor(120, 130, 150);
                doc.text(`${pct.toFixed(0)}%`, M + 75, rowY + 7, { align: 'right' });

                // Bar
                doc.setFillColor(230, 232, 238);
                doc.roundedRect(M + 80, rowY + 3, barMaxW, 4.5, 0.5, 0.5, 'F');
                doc.setFillColor(220, 38, 38);
                doc.roundedRect(M + 80, rowY + 3, barMaxW * (pct / 100), 4.5, 0.5, 0.5, 'F');

                Y += familyEntries.length > 1 ? 0 : rowH;
            });
            Y += familyEntries.length * rowH + 4;

            // ── FINAL FOOTER & PAGE NUMBERS ────────────────────────────────────
            addFooter(doc, PW, PH, M);
            const pageCount = (doc as any).internal.pages.length - 1;
            for (let i = 2; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(150, 160, 175);
                doc.text('Created by PlanneX', M, PH - 8);
                doc.text(`Page ${i - 1} / ${pageCount - 1}`, PW - M, PH - 8, { align: 'right' });
            }

            resolve(doc);
        } catch (err) {
            console.error('THR PDF generation error:', err);
            reject(err);
        }
    });
};

const addFooter = (doc: jsPDF, PW: number, PH: number, M: number) => {
    doc.setDrawColor(210, 220, 235);
    doc.setLineWidth(0.3);
    doc.line(M, PH - 14, PW - M, PH - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(150, 160, 175);
    doc.text(
        safe('THR — Travaux a Haut Risque | Securite Industrielle | Permis & EPI Obligatoires | PlanneX Intelligence Engine'),
        M, PH - 9
    );
    doc.setFillColor(220, 38, 38);
    doc.rect(M, PH - 3, PW - M * 2, 1.5, 'F');
};
