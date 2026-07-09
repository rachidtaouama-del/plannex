/**
 * handlingTaskPdfExportService.ts
 * Premium Handling / Manutention Preparation Report
 * Design: Planning intelligence cards — heavy logistics pre-shutdown focus.
 */
import jsPDF from 'jspdf';
import type { AppParameters, ScheduledTask, HandlingRecord } from '../types';
import { drawProfessionalCoverPage } from './pdfCoverPageService';

// ─── Accent ───────────────────────────────────────────────────────────────────
const AC: [number, number, number] = [129, 140, 248]; // Indigo
const AC2: [number, number, number] = [99, 102, 241]; // Darker indigo

const safe = (s: string) =>
    (s || '').replace(/[éèêëàâïîùûçôöüñ—→«»]/gi, (c: string) =>
    ({
        é: 'e', è: 'e', ê: 'e', ë: 'e', à: 'a', â: 'a', ï: 'i', î: 'i', ù: 'u', û: 'u', ç: 'c', ô: 'o', ö: 'o', ü: 'u', ñ: 'n',
        '—': '-', '→': '->', '«': '"', '»': '"'
    }[c] || c));

const fmt = (d: Date, withTime = true) => {
    if (!d || isNaN(d.getTime())) return 'N/A';
    const D = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    if (!withTime) return D;
    return `${D} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const addFooter = (doc: jsPDF, PW: number, PH: number, M: number) => {
    doc.setDrawColor(210, 215, 240);
    doc.setLineWidth(0.3);
    doc.line(M, PH - 14, PW - M, PH - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(150, 155, 190);
    doc.text(safe('MANUTENTION LOURDE | Logistique Pre-Arret | Gestion des Charges | PlanneX Intelligence Engine'), M, PH - 9);
    doc.setFillColor(...AC2);
    doc.rect(M, PH - 3, PW - M * 2, 1.5, 'F');
};

// ─── Main export ──────────────────────────────────────────────────────────────
export const exportHandlingTasksToPDF = async (
    tasksToExport: ScheduledTask[],
    parameters: AppParameters,
    customTitle?: string,
    selectedColumns?: string[],
    allTasks?: ScheduledTask[],
    handlingRecords?: HandlingRecord[]
): Promise<jsPDF> => {
    return new Promise((resolve, reject) => {
        const tasks = tasksToExport.filter(t => t['Handling required'] === 1);
        if (tasks.length === 0) { reject(new Error("Aucune tache necessitant de la manutention n'a ete trouvee.")); return; }

        try {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
            const PW = doc.internal.pageSize.getWidth();
            const PH = doc.internal.pageSize.getHeight();
            const M = 20;

            const globalTasks = allTasks || tasksToExport;
            const totalAll = globalTasks.length;
            const count = tasks.length;
            const pct = ((count / Math.max(totalAll, 1)) * 100).toFixed(1);
            const teamsSet = new Set(tasks.map(t => t.team).filter(Boolean));
            const totalHH = tasks.reduce((s, t) => s + t.duration * t.manpower, 0);
            const byEquip = tasks.reduce<Record<string, number>>((a, t) => { a[t.equipment] = (a[t.equipment] || 0) + 1; return a; }, {});
            const shutDate = fmt(new Date(parameters.shutdownStart), false);

            // ── COVER ────────────────────────────────────────────────────────
            drawProfessionalCoverPage(doc, {
                title: safe((customTitle || 'Liste des Travaux de Manutention').toUpperCase()),
                category: 'PREPARATION LOGISTIQUE', subcategory: 'MANUTENTION & GESTION DES CHARGES',
                description: safe('Plan logistique manutention — Coordination des charges lourdes obligatoire avant demarrage de l\'arret'),
                accentColor: AC2,
                meta: [
                    { label: 'Type de document', value: safe('Rapport Preparation Manutention') },
                    { label: 'Date de reference', value: shutDate },
                    { label: 'Taches concernes', value: `${count} taches sur ${totalAll} (${pct}%)` },
                    { label: 'Equipes impliquees', value: `${teamsSet.size} equipe(s)` },
                    { label: 'Charge totale H-H', value: `${totalHH.toFixed(1)} H-H` },
                    { label: 'Action requise', value: safe('Planification manutention AVANT demarrage — Engins et ressources a valoriser') },
                ],
                dateLabel: `Arret du: ${shutDate}`,
                projectName: 'Arret de Maintenance Industrielle',
                classification: 'PREPARATION LOGISTIQUE - USAGE INTERNE',
                docRef: 'PLX-MAN',
            });

            let Y = M;

            // ── STATS BANNER ─────────────────────────────────────────────────
            const BH = 50;
            doc.setFillColor(10, 15, 30);
            doc.roundedRect(M, Y, PW - M * 2, BH, 4, 4, 'F');
            doc.setFillColor(...AC);
            doc.roundedRect(M, Y, PW - M * 2, 2.5, 1, 1, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(100, 110, 180);
            doc.text(safe('TABLEAU DE BORD MANUTENTION — PREPARATION PRE-ARRET'), PW / 2, Y + 10, { align: 'center' });

            const stats = [
                { v: `${count}`, l: 'TACHES MANUTENTION', c: AC },
                { v: `${pct}%`, l: 'DU PROJET', c: AC },
                { v: `${teamsSet.size}`, l: 'EQUIPES', c: [251, 191, 36] as [number, number, number] },
                { v: `${totalHH.toFixed(0)}`, l: 'H-H TOTAL', c: [52, 211, 153] as [number, number, number] },
                { v: `${totalAll}`, l: 'TACHES ANALYSEES', c: [148, 163, 184] as [number, number, number] },
                { v: `${Object.keys(byEquip).length}`, l: 'EQUIPEMENTS', c: [6, 182, 212] as [number, number, number] },
            ];
            const bW = (PW - M * 2 - 20) / stats.length;
            stats.forEach((s, i) => {
                const bx = M + 10 + i * bW, by = Y + 17;
                doc.setFillColor(18, 22, 52); doc.roundedRect(bx, by, bW - 4, 25, 2, 2, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...s.c);
                doc.text(s.v, bx + (bW - 4) / 2, by + 12, { align: 'center' });
                doc.setFontSize(5.5); doc.setTextColor(80, 90, 155);
                doc.text(s.l, bx + (bW - 4) / 2, by + 20, { align: 'center' });
            });
            Y += BH + 8;

            // ── PLANNING ADVISORY BANNER ──────────────────────────────────────
            doc.setFillColor(245, 244, 255);
            doc.roundedRect(M, Y, PW - M * 2, 20, 2, 2, 'F');
            doc.setFillColor(...AC2); doc.rect(M, Y, 4, 20, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(80, 50, 200);
            doc.text(safe('! PREPARATION MANUTENTION — ACTIONS A PLANIFIER AVANT DEMARRAGE:'), M + 7, Y + 8);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(50, 40, 120);
            doc.text(safe('Identifier les charges lourdes · Planifier les engins de levage · Verifier les capacites de charge · Coordonner les acces · Sequencer les operations pour eviter les conflits'), M + 7, Y + 15, { maxWidth: PW - M * 2 - 12 });
            Y += 27;

            // ── SECTION HEADER ────────────────────────────────────────────────
            doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(12, 18, 35);
            doc.text(safe('FICHES DE TRAVAUX — MANUTENTION REQUISE'), M, Y + 5);
            doc.setFillColor(...AC); doc.rect(M, Y + 8, 48, 1.5, 'F');
            doc.setFillColor(200, 205, 235); doc.rect(M + 51, Y + 8.5, PW - M * 2 - 51, 0.4, 'F');
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 125, 180);
            doc.text(safe(`${count} tache(s) — Triees par equipe puis par date — Manutention lourde requise`), M, Y + 15);
            Y += 23;

            // ── TASK CARDS (3 per row) ────────────────────────────────────────
            const COLS = 3, GAP = 5;
            const CW = (PW - M * 2 - GAP * (COLS - 1)) / COLS;
            const CH = 60;
            const sorted = [...tasks].sort((a, b) => (a.team || '').localeCompare(b.team || '') || a.startTime.getTime() - b.startTime.getTime());

            sorted.forEach((task, idx) => {
                const col = idx % COLS;
                const x = M + col * (CW + GAP);

                if (col === 0 && idx > 0) {
                    if (Y + CH + 4 > PH - 22) { addFooter(doc, PW, PH, M); doc.addPage(); Y = M; }
                }

                const hh = (task.duration * task.manpower).toFixed(1);

                // Shadow
                doc.setFillColor(190, 195, 230); doc.roundedRect(x + 1, Y + 1, CW, CH, 2, 2, 'F');
                // Card
                doc.setFillColor(255, 255, 255); doc.roundedRect(x, Y, CW, CH, 2, 2, 'F');
                // Left strip
                doc.setFillColor(...AC2); doc.rect(x, Y, 4.5, CH, 'F');
                // Top header dark
                doc.setFillColor(12, 14, 50); doc.rect(x + 4.5, Y, CW - 4.5, 15, 'F');

                // #badge
                doc.setFillColor(...AC); doc.roundedRect(x + 7, Y + 3, 10, 9, 1, 1, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(255, 255, 255);
                doc.text(String(idx + 1).padStart(2, '0'), x + 12, Y + 8.5, { align: 'center' });

                // Handling type: first try embedded handlingRecords, then look up by OT from the global handlingRecords array
                const taskAny = task as any;
                const taskOT = String(taskAny.ot || taskAny.OT || '').trim();
                let handType = 'MANUTENTION REQUISE';
                if (taskAny.handlingRecords && taskAny.handlingRecords.length > 0 && taskAny.handlingRecords[0].handlingType) {
                    // Use all handling types joined if multiple
                    handType = taskAny.handlingRecords.map((h: HandlingRecord) => h.handlingType).filter(Boolean).join(' / ') || 'MANUTENTION REQUISE';
                } else if (handlingRecords && handlingRecords.length > 0 && taskOT) {
                    // Fallback: match by OT in the global handlingRecords list
                    const matched = handlingRecords.filter(hr => String(hr.OT).trim() === taskOT && hr.handlingType);
                    if (matched.length > 0) {
                        handType = matched.map(h => h.handlingType).join(' / ');
                    }
                }
                doc.setFillColor(25, 28, 75); doc.roundedRect(x + CW - 70, Y + 3, 66, 9, 1, 1, 'F');
                doc.setFillColor(...AC2); doc.roundedRect(x + CW - 70, Y + 3, 3, 9, 0.5, 0.5, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(...AC);
                doc.text(safe(handType.toUpperCase()), x + CW - 33, Y + 8.5, { align: 'center' });

                // Equipment in header
                doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(180, 185, 230);
                doc.text(safe(task.equipment), x + 21, Y + 8.5, { maxWidth: CW - 100 });

                // ── Action ─────────────────────────────────────────────────
                doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(10, 14, 50);
                const aLines = doc.splitTextToSize(safe(task.action.toUpperCase()), CW - 14);
                doc.text(aLines.slice(0, 2), x + 7, Y + 24);

                // Family chip only (OT removed)
                if (task.family) {
                    const chipW = Math.min(doc.getTextWidth(safe(task.family)) + 6, CW / 2.8);
                    doc.setFillColor(245, 244, 255); doc.roundedRect(x + 7, Y + 31, chipW, 5, 0.8, 0.8, 'F');
                    doc.setDrawColor(...AC2); doc.setLineWidth(0.3); doc.roundedRect(x + 7, Y + 31, chipW, 5, 0.8, 0.8, 'S');
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(5); doc.setTextColor(...AC2);
                    doc.text(safe(task.family), x + 7 + chipW / 2, Y + 34.5, { align: 'center' });
                }

                // Readiness
                const hasPrep = task.preparatifs && task.preparatifs.trim() !== '' && task.preparatifs.trim() !== '0';
                const readCol: [number, number, number] = hasPrep ? [16, 185, 129] : [245, 158, 11];
                const readText = hasPrep ? 'PREPARE' : 'A PREPARER';
                doc.setFillColor(...readCol); doc.roundedRect(x + CW - 48, Y + 30, 44, 7, 1, 1, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(255, 255, 255);
                doc.text(readText, x + CW - 26, Y + 34.8, { align: 'center' });

                // Divider
                doc.setDrawColor(220, 222, 245); doc.setLineWidth(0.25);
                doc.line(x + 7, Y + 40, x + CW - 5, Y + 40);

                // Handling Type badge (replaces team name)
                const htText = safe(handType.toUpperCase());
                const tBW = Math.min(doc.getTextWidth(htText) + 10, CW / 2.2);
                doc.setFillColor(...AC2); doc.roundedRect(x + 7, Y + 42, tBW, 9, 1, 1, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(255, 255, 255);
                doc.text(htText, x + 7 + tBW / 2, Y + 47.5, { align: 'center', maxWidth: tBW - 2 });

                // Dates
                const dX = x + 7 + tBW + 3;
                doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(50, 55, 120);
                doc.text(safe(`Debut: ${fmt(task.startTime)}`), dX, Y + 45);
                doc.text(safe(`Fin:   ${fmt(task.endTime)}`), dX, Y + 51.5);

                // H-H badge
                doc.setFillColor(...AC2); doc.roundedRect(x + CW - 35, Y + 42, 30, 14, 1.5, 1.5, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
                doc.text(`${hh}H`, x + CW - 20, Y + 50, { align: 'center' });
                doc.setFont('helvetica', 'normal'); doc.setFontSize(5); doc.setTextColor(220, 215, 255);
                doc.text(`${task.manpower}p x ${task.duration.toFixed(1)}h`, x + CW - 20, Y + 55, { align: 'center' });

                if (col === COLS - 1 || idx === sorted.length - 1) Y += CH + 5;
            });

            // Removed TEAM DISTRIBUTION section as requested.

            // ── PREPARATION CHECKLIST ─────────────────────────────────────────
            if (Y + 70 > PH - 22) { addFooter(doc, PW, PH, M); doc.addPage(); Y = M; } else Y += 8;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(12, 18, 35);
            doc.text(safe('CHECKLIST PREPARATION MANUTENTION'), M, Y + 5);
            doc.setFillColor(...AC); doc.rect(M, Y + 8, 48, 1.5, 'F');
            Y += 18;

            const checklist = [
                { item: 'Inventaire complet des equipements necessitant manutention realise', cat: 'INVENTAIRE' },
                { item: 'Poids et dimensions de chaque charge identifies et documentes', cat: 'EVALUATION' },
                { item: 'Engins de manutention (chariots, palans, treuils) reserves et disponibles', cat: 'MATERIEL' },
                { item: 'Acces camions et zones de depot identifies et degages', cat: 'ACCES' },
                { item: 'Personnel de manutention certifie planifie et disponible', cat: 'RESSOURCES' },
                { item: 'Procedure de levage et manutention validee par HSE', cat: 'SECURITE' },
                { item: 'Sequencement des operations de manutention etabli sans conflit', cat: 'PLANNING' },
                { item: 'Points de controle et validation a chaque etape critique identifies', cat: 'CONTROLE' },
            ];

            const COLS2 = 2;
            const cW2 = (PW - M * 2 - 8) / COLS2;
            checklist.forEach((item, i) => {
                const col2 = i % COLS2, cx2 = M + col2 * (cW2 + 8), cy2 = Y + Math.floor(i / COLS2) * 16;
                doc.setFillColor(249, 249, 255); doc.roundedRect(cx2, cy2, cW2, 13, 1.5, 1.5, 'F');
                doc.setFillColor(...AC2); doc.roundedRect(cx2, cy2, 3, 13, 0.5, 0.5, 'F');
                doc.setDrawColor(210, 210, 240); doc.setLineWidth(0.2); doc.roundedRect(cx2, cy2, cW2, 13, 1.5, 1.5, 'S');
                doc.setDrawColor(...AC2); doc.setLineWidth(0.4); doc.roundedRect(cx2 + 6, cy2 + 3, 7, 7, 0.8, 0.8, 'S');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(...AC2);
                doc.text(safe(item.cat), cx2 + 16, cy2 + 6);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(30, 35, 90);
                doc.text(safe(item.item), cx2 + 16, cy2 + 10.5, { maxWidth: cW2 - 20 });
            });

            // ── FOOTER ALL PAGES ──────────────────────────────────────────────
            addFooter(doc, PW, PH, M);
            const pageCount = (doc as any).internal.pages.length - 1;
            for (let i = 2; i <= pageCount; i++) {
                doc.setPage(i);
                addFooter(doc, PW, PH, M);
                doc.setFontSize(7); doc.setTextColor(150, 155, 190);
                doc.text(`Page ${i - 1} / ${pageCount - 1}`, PW - M, PH - 8, { align: 'right' });
            }

            resolve(doc);
        } catch (err) { console.error('Handling PDF error:', err); reject(err); }
    });
};
