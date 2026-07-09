/**
 * simopsReportPdfExportService.ts
 * Premium SIMOPS (Simultaneous Operations) PDF Report
 * Design: Grouped conflict pairs — each OT <-> SIMOPS OT shown as a dual-card panel
 * Safety-first language, rose/amber palette, industrial precision.
 */

import jsPDF from 'jspdf';
import type { AppParameters, ScheduledTask, SimopsRecord } from '../types';
import { drawProfessionalCoverPage } from './pdfCoverPageService';

// ─── Safe text helper (no accented chars in Helvetica) ──────────────────────
const safe = (s: string): string =>
    s.replace(/[éèêëàâïîùûçôöüñ—→«»]/gi, (c) =>
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

const hasOverlap = (a: ScheduledTask, b: ScheduledTask) =>
    a.startTime < b.endTime && a.endTime > b.startTime;

// ─────────────────────────────────────────────────────────────────────────────
//  Main export function
// ─────────────────────────────────────────────────────────────────────────────
export const exportSimopsReportToPDF = (
    simopsRecords: SimopsRecord[],
    allScheduledTasks: ScheduledTask[],
    parameters: AppParameters,
): Promise<jsPDF> => {
    return new Promise((resolve, reject) => {
        if (simopsRecords.length === 0) {
            reject(new Error('Aucun enregistrement SIMOPS trouve.'));
            return;
        }
        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
            const PW = doc.internal.pageSize.getWidth();   // 420mm
            const PH = doc.internal.pageSize.getHeight();  // 297mm
            const M = 20;  // margin

            // ── Build task lookup & dedup pairs ─────────────────────────────
            const taskByOT = new Map<string, ScheduledTask>();
            allScheduledTasks.forEach(t => { if (t.ot) taskByOT.set(String(t.ot).trim(), t); });

            type Pair = { otA: string; taskA: ScheduledTask | null; otB: string; taskB: ScheduledTask | null };
            const seen = new Set<string>();
            const pairs: Pair[] = [];
            simopsRecords.forEach(r => {
                const a = String(r.OT).trim();
                const b = String(r.simopsOT).trim();
                const key = [a, b].sort().join('|');
                if (!seen.has(key)) {
                    seen.add(key);
                    pairs.push({ otA: a, taskA: taskByOT.get(a) || null, otB: b, taskB: taskByOT.get(b) || null });
                }
            });

            const activeConflicts = pairs.filter(p => p.taskA && p.taskB && hasOverlap(p.taskA, p.taskB)).length;
            const teamsSet = new Set<string>();
            pairs.forEach(p => { if (p.taskA?.team) teamsSet.add(p.taskA.team); if (p.taskB?.team) teamsSet.add(p.taskB.team); });
            const shutdownDateStr = fmtDate(new Date(parameters.shutdownStart), false);

            // ── COVER PAGE ───────────────────────────────────────────────────
            drawProfessionalCoverPage(doc, {
                title: 'RAPPORT SIMOPS — OPERATIONS SIMULTANEES',
                category: 'SECURITE INDUSTRIELLE',
                subcategory: 'CO-ACTIVITE & RISQUES',
                description: 'Analyse des interventions en co-activite — Surveillance et coordination obligatoires',
                accentColor: [220, 38, 38],
                meta: [
                    { label: 'Type de document', value: 'Rapport SIMOPS — Operations Simultanees' },
                    { label: 'Date de reference', value: shutdownDateStr },
                    { label: 'Groupes de conflits', value: `${pairs.length} paire(s) de co-activite identifiee(s)` },
                    { label: 'Conflits actifs (chevauchement)', value: `${activeConflicts} sur ${pairs.length} (execution simultanee)` },
                    { label: 'Equipes impliquees', value: `${teamsSet.size} equipe(s)` },
                    { label: 'Statut', value: 'Coordination HSE obligatoire — Vigilance renforcee' },
                ],
                dateLabel: `Arret du: ${shutdownDateStr}`,
                projectName: 'Arret de Maintenance Industrielle',
                classification: 'CONFIDENTIEL — SECURITE',
                docRef: 'PLX-SIMOPS',
            });

            // ── PAGE 2+: CONTENT START ───────────────────────────────────────
            let Y = M;

            // ── STATS BANNER ──────────────────────────────────────────────────
            const BANNER_H = 52;
            // Dark background
            doc.setFillColor(10, 15, 30);
            doc.roundedRect(M, Y, PW - M * 2, BANNER_H, 4, 4, 'F');
            // Red top bar
            doc.setFillColor(220, 38, 38);
            doc.roundedRect(M, Y, PW - M * 2, 2.5, 1, 1, 'F');

            // Banner title
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(100, 120, 160);
            doc.text('TABLEAU DE BORD CO-ACTIVITE — INDICATEURS SIMOPS', PW / 2, Y + 11, { align: 'center' });

            // Stat boxes
            const stats = [
                { label: 'GROUPES SIMOPS', value: `${pairs.length}`, color: [255, 255, 255] as [number, number, number] },
                { label: 'CONFLITS ACTIFS', value: `${activeConflicts}`, color: [244, 63, 94] as [number, number, number] },
                { label: 'OPERATIONS DECALEES', value: `${pairs.length - activeConflicts}`, color: [52, 211, 153] as [number, number, number] },
                { label: 'EQUIPES CONCERNEES', value: `${teamsSet.size}`, color: [251, 191, 36] as [number, number, number] },
                { label: 'OT REFERENCES', value: `${simopsRecords.length}`, color: [129, 140, 248] as [number, number, number] },
            ];
            const boxW = (PW - M * 2 - 20) / stats.length;
            stats.forEach((st, i) => {
                const bx = M + 10 + i * boxW;
                const by = Y + 18;
                doc.setFillColor(20, 30, 55);
                doc.roundedRect(bx, by, boxW - 4, 26, 2, 2, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(18);
                doc.setTextColor(...st.color);
                doc.text(st.value, bx + (boxW - 4) / 2, by + 13, { align: 'center' });
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6);
                doc.setTextColor(80, 100, 135);
                doc.text(st.label, bx + (boxW - 4) / 2, by + 21, { align: 'center' });
            });

            Y += BANNER_H + 10;

            // ── SAFETY WARNING BOX ────────────────────────────────────────────
            doc.setFillColor(255, 245, 245);
            doc.roundedRect(M, Y, PW - M * 2, 16, 2, 2, 'F');
            doc.setFillColor(220, 38, 38);
            doc.roundedRect(M, Y, 4, 16, 1, 1, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(180, 20, 20);
            doc.text('! AVERTISSEMENT SECURITE :', M + 8, Y + 6.5);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(80, 40, 40);
            doc.text(
                safe('Les operations ci-dessous sont identifiees comme simultanees. Le chef d\'equipe doit coordonner avec les equipes adjacentes avant toute intervention.'),
                M + 58, Y + 6.5, { maxWidth: PW - M * 2 - 65 }
            );
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(180, 20, 20);
            doc.text(safe('Vigilance | Coordination | Permis de Travail Obligatoire'), M + 8, Y + 13);
            Y += 22;

            // ── SECTION TITLE ─────────────────────────────────────────────────
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(12, 18, 35);
            doc.text(safe('ANALYSE DES GROUPES DE CO-ACTIVITE'), M, Y + 5);
            doc.setFillColor(220, 38, 38);
            doc.rect(M, Y + 8, 40, 1.5, 'F');
            doc.setFillColor(200, 210, 225);
            doc.rect(M + 43, Y + 8.5, PW - M * 2 - 43, 0.4, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(120, 130, 150);
            doc.text(safe(`${pairs.length} groupe(s) de co-activite detectes — Trier par date de debut`), M, Y + 14);
            Y += 20;

            // ── PAIR CARDS ────────────────────────────────────────────────────
            const CARD_H = 60;
            const DIVIDER_W = 18;
            const TASK_W = (PW - M * 2 - DIVIDER_W) / 2;

            const drawTaskPanel = (
                x: number, y: number, w: number, h: number,
                task: ScheduledTask | null, ot: string,
                accent: [number, number, number], bg: [number, number, number],
                label: 'OPERATION A' | 'OPERATION B'
            ) => {
                // Card background
                doc.setFillColor(...bg);
                doc.roundedRect(x, y, w, h, 2, 2, 'F');
                // Left color strip
                doc.setFillColor(...accent);
                doc.rect(x, y, 3, h, 'F');
                // Top label bar
                doc.setFillColor(accent[0], accent[1], accent[2]);
                doc.setFillColor(Math.min(accent[0] + 20, 255), Math.max(accent[1] - 10, 0), Math.max(accent[2] - 10, 0));

                // Operation label
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.5);
                doc.setTextColor(...accent);
                doc.text(label, x + 7, y + 7);

                // OT badge
                const badgeX = x + w - 32;
                doc.setFillColor(accent[0], accent[1], accent[2]);
                doc.roundedRect(badgeX, y + 3, 28, 7, 1, 1, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6);
                doc.setTextColor(255, 255, 255);
                doc.text(safe(`OT: ${ot}`), badgeX + 14, y + 7.5, { align: 'center' });

                // Thin separator
                doc.setDrawColor(accent[0], accent[1], accent[2]);
                doc.setLineWidth(0.25);
                doc.line(x + 7, y + 12, x + w - 5, y + 12);

                if (!task) {
                    doc.setFont('helvetica', 'bolditalic');
                    doc.setFontSize(7);
                    doc.setTextColor(150, 160, 175);
                    doc.text(safe('Tache non planifiee / introuvable dans le planning'), x + 7, y + 25, { maxWidth: w - 14 });
                    return;
                }

                // Action (truncated)
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(15, 23, 42);
                const actionLines = doc.splitTextToSize(safe(task.action.toUpperCase()), w - 14);
                doc.text(actionLines.slice(0, 2), x + 7, y + 19);

                // Equipment
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.5);
                doc.setTextColor(80, 100, 130);
                doc.text(safe(`Equipement: ${task.equipment}`), x + 7, y + 30, { maxWidth: w - 14 });

                // Team badge inline
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.5);
                doc.setTextColor(...accent);
                doc.text(safe(`Equipe: ${task.team}`), x + 7, y + 37);

                // Divider
                doc.setDrawColor(210, 218, 230);
                doc.setLineWidth(0.2);
                doc.line(x + 7, y + 41, x + w - 5, y + 41);

                // Date row
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.5);
                doc.setTextColor(60, 80, 110);
                doc.text(safe(`Debut: ${fmtDate(task.startTime)}`), x + 7, y + 47);
                doc.text(safe(`Fin:   ${fmtDate(task.endTime)}`), x + 7, y + 53);

                // Duration / manpower
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6.5);
                doc.setTextColor(...accent);
                doc.text(safe(`${task.duration.toFixed(1)} h — ${task.manpower} pers.`), x + w - 5, y + 53, { align: 'right' });
            };

            const drawDivider = (x: number, y: number, h: number, conflict: boolean) => {
                const cx = x + DIVIDER_W / 2;
                // Vertical lines
                doc.setDrawColor(conflict ? 220 : 180, conflict ? 38 : 200, conflict ? 38 : 200);
                doc.setLineWidth(0.3);
                doc.line(cx, y + 6, cx, y + h / 2 - 8);
                doc.line(cx, y + h / 2 + 8, cx, y + h - 6);

                // Circle icon
                doc.setFillColor(conflict ? 220 : 16, conflict ? 38 : 185, conflict ? 38 : 129);
                doc.circle(cx, y + h / 2, 6, 'F');
                // ↕ arrows
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(255, 255, 255);
                doc.text('!', cx, y + h / 2 + 3, { align: 'center' });
            };

            pairs.forEach((pair, idx) => {
                const isConflict = !!(pair.taskA && pair.taskB && hasOverlap(pair.taskA, pair.taskB));

                // Check page break
                if (Y + CARD_H + 30 > PH - 20) {
                    addPageFooter(doc, PW, PH, M);
                    doc.addPage();
                    Y = M;
                }

                // ── GROUP HEADER ──────────────────────────────────────────────
                // Header bar
                doc.setFillColor(isConflict ? 220 : 30, isConflict ? 38 : 41, isConflict ? 38 : 59);
                doc.rect(M, Y, PW - M * 2, 9, 'F');

                // Group number
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.setTextColor(255, 255, 255);
                doc.text(safe(`GROUPE ${String(idx + 1).padStart(2, '0')} — CO-ACTIVITE  |  OT ${pair.otA}  <->  OT ${pair.otB}`), M + 5, Y + 6);

                // Status badge
                const badgeText = isConflict ? '! CONFLIT ACTIF — EXECUTION SIMULTANEE' : 'OPERATIONS DECALEES';
                const badgeColor = isConflict ? [244, 63, 94] as [number, number, number] : [52, 211, 153] as [number, number, number];
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6);
                doc.setTextColor(...badgeColor);
                doc.text(safe(badgeText), PW - M - 5, Y + 6, { align: 'right' });

                Y += 10;

                // ── TASK PANELS ────────────────────────────────────────────────
                const taskY = Y;
                // Panel A (rose/red)
                drawTaskPanel(
                    M, taskY, TASK_W, CARD_H,
                    pair.taskA, pair.otA,
                    [220, 38, 38], [255, 248, 248],
                    'OPERATION A'
                );
                // Divider
                drawDivider(M + TASK_W, taskY, CARD_H, isConflict);
                // Panel B (amber/orange)
                drawTaskPanel(
                    M + TASK_W + DIVIDER_W, taskY, TASK_W, CARD_H,
                    pair.taskB, pair.otB,
                    [217, 119, 6], [255, 251, 240],
                    'OPERATION B'
                );

                Y += CARD_H + 6;

                // ── SAFETY NOTE (for active conflicts only) ────────────────────
                if (isConflict) {
                    doc.setFillColor(255, 240, 240);
                    doc.roundedRect(M, Y, PW - M * 2, 10, 1, 1, 'F');
                    doc.setFillColor(220, 38, 38);
                    doc.rect(M, Y, 2.5, 10, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(6.5);
                    doc.setTextColor(180, 20, 20);
                    doc.text('ACTION REQUISE:', M + 6, Y + 4.5);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(100, 50, 50);
                    doc.text(
                        safe('Coordonner les equipes avant execution. Permis de travail SIMOPS obligatoire. Informer le Responsable HSE.'),
                        M + 35, Y + 4.5, { maxWidth: PW - M * 2 - 38 }
                    );
                    Y += 14;
                } else {
                    Y += 2;
                }
            });

            // ── FINAL PAGE FOOTER ──────────────────────────────────────────────
            addPageFooter(doc, PW, PH, M);

            // ── PAGE NUMBERS ───────────────────────────────────────────────────
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
            console.error('SIMOPS PDF generation error:', err);
            reject(err);
        }
    });
};

const addPageFooter = (doc: jsPDF, PW: number, PH: number, M: number) => {
    doc.setDrawColor(210, 220, 235);
    doc.setLineWidth(0.3);
    doc.line(M, PH - 14, PW - M, PH - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(150, 160, 175);
    doc.text(safe('Rapport SIMOPS — Operations Simultanees | Securite Industrielle | Coordination obligatoire | PlanneX Intelligence Engine'), M, PH - 9);
    doc.setFillColor(220, 38, 38);
    doc.rect(M, PH - 3, PW - M * 2, 1.5, 'F');
};
