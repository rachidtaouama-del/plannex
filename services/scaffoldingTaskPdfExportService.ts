/**
 * scaffoldingTaskPdfExportService.ts
 * Premium Scaffolding Preparation Report
 * Design: Planning intelligence cards with pre-shutdown preparation focus.
 */
import jsPDF from 'jspdf';
import type { AppParameters, ScheduledTask } from '../types';
import { drawProfessionalCoverPage } from './pdfCoverPageService';

// ─── Accent ───────────────────────────────────────────────────────────────────
const AC: [number, number, number] = [6, 182, 212]; // Cyan
const AC2: [number, number, number] = [245, 158, 11]; // Amber secondary

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
    doc.setDrawColor(210, 220, 235);
    doc.setLineWidth(0.3);
    doc.line(M, PH - 14, PW - M, PH - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(150, 160, 175);
    doc.text(safe('ECHAFAUDAGE & ACCES TECHNIQUE | Logistique Structurelle | Planification Avant-Arret | PlanneX Intelligence Engine'), M, PH - 9);
    doc.setFillColor(...AC);
    doc.rect(M, PH - 3, PW - M * 2, 1.5, 'F');
};

// ─── Main export ──────────────────────────────────────────────────────────────
export const exportScaffoldingTasksToPDF = async (
    tasksToExport: ScheduledTask[],
    parameters: AppParameters,
    customTitle?: string,
    selectedColumns?: string[],
    allTasks?: ScheduledTask[]
): Promise<jsPDF> => {
    return new Promise((resolve, reject) => {
        const tasks = tasksToExport.filter(t => t['Scaffolding Required'] === 1);
        if (tasks.length === 0) { reject(new Error("Aucune tache necessitant un echafaudage n'a ete trouvee.")); return; }

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
            const topEquipCount = Math.max(...Object.values(byEquip));
            const shutDate = fmt(new Date(parameters.shutdownStart), false);

            // ── COVER ────────────────────────────────────────────────────────
            drawProfessionalCoverPage(doc, {
                title: safe((customTitle || "Liste des Travaux d'Echafaudage").toUpperCase()),
                category: 'PREPARATION TECHNIQUE', subcategory: 'ECHAFAUDAGE & ACCES STRUCTURE',
                description: safe('Plan de preparation echafaudage — Coordination logistique obligatoire avant demarrage de l\'arret'),
                accentColor: AC,
                meta: [
                    { label: 'Type de document', value: safe("Rapport Preparation Echafaudage") },
                    { label: 'Date de reference', value: shutDate },
                    { label: 'Taches necessite', value: `${count} taches sur ${totalAll} (${pct}%)` },
                    { label: 'Equipes impliquees', value: `${teamsSet.size} equipe(s)` },
                    { label: 'Charge totale H-H', value: `${totalHH.toFixed(1)} H-H` },
                    { label: 'Action requise', value: safe('Coordination echafaudage AVANT demarrage — Acces technique a valider') },
                ],
                dateLabel: `Arret du: ${shutDate}`,
                projectName: 'Arret de Maintenance Industrielle',
                classification: 'PREPARATION TECHNIQUE - USAGE INTERNE',
                docRef: 'PLX-SCF',
            });

            let Y = M;

            // ── STATS BANNER ─────────────────────────────────────────────────
            const BH = 50;
            doc.setFillColor(10, 15, 30);
            doc.roundedRect(M, Y, PW - M * 2, BH, 4, 4, 'F');
            doc.setFillColor(...AC);
            doc.roundedRect(M, Y, PW - M * 2, 2.5, 1, 1, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(100, 120, 160);
            doc.text(safe('TABLEAU DE BORD ECHAFAUDAGE — PREPARATION PRE-ARRET'), PW / 2, Y + 10, { align: 'center' });

            const stats = [
                { v: `${count}`, l: 'TACHES ECHAFAUDAGE', c: AC },
                { v: `${pct}%`, l: 'DU PROJET', c: AC },
                { v: `${teamsSet.size}`, l: 'EQUIPES', c: [251, 191, 36] as [number, number, number] },
                { v: `${totalHH.toFixed(0)}`, l: 'H-H TOTAL', c: [52, 211, 153] as [number, number, number] },
                { v: `${totalAll}`, l: 'TACHES ANALYSEES', c: [148, 163, 184] as [number, number, number] },
                { v: `${Object.keys(byEquip).length}`, l: 'EQUIPEMENTS', c: [99, 102, 241] as [number, number, number] },
            ];
            const bW = (PW - M * 2 - 20) / stats.length;
            stats.forEach((s, i) => {
                const bx = M + 10 + i * bW, by = Y + 17;
                doc.setFillColor(20, 30, 55); doc.roundedRect(bx, by, bW - 4, 25, 2, 2, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...s.c);
                doc.text(s.v, bx + (bW - 4) / 2, by + 12, { align: 'center' });
                doc.setFontSize(5.5); doc.setTextColor(80, 100, 135);
                doc.text(s.l, bx + (bW - 4) / 2, by + 20, { align: 'center' });
            });
            Y += BH + 8;

            // ── PLANNING ADVISORY BANNER ──────────────────────────────────────
            doc.setFillColor(236, 254, 255);
            doc.roundedRect(M, Y, PW - M * 2, 20, 2, 2, 'F');
            doc.setFillColor(...AC); doc.rect(M, Y, 4, 20, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 120, 140);
            doc.text(safe('! PREPARATION ECHAFAUDAGE — ACTIONS A PLANIFIER AVANT DEMARRAGE:'), M + 7, Y + 8);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(20, 80, 100);
            doc.text(safe('Identifier les zones d\'acces difficile · Valider les specifications echafaudage · Commander materiel en avance · Assigner echafaudeurs qualifies · Obtenir autorisation zones'), M + 7, Y + 15, { maxWidth: PW - M * 2 - 12 });
            Y += 27;

            // ── SECTION HEADER ────────────────────────────────────────────────
            doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(12, 18, 35);
            doc.text(safe('FICHES DE TRAVAUX — ECHAFAUDAGE REQUIS'), M, Y + 5);
            doc.setFillColor(...AC); doc.rect(M, Y + 8, 48, 1.5, 'F');
            doc.setFillColor(200, 210, 225); doc.rect(M + 51, Y + 8.5, PW - M * 2 - 51, 0.4, 'F');
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120, 130, 150);
            doc.text(safe(`${count} tache(s) — Triees par date de debut — Echafaudage requis avant execution`), M, Y + 15);
            Y += 23;

            // ── TASK CARDS (3 per row) ────────────────────────────────────────
            const COLS = 3, GAP = 5;
            const CW = (PW - M * 2 - GAP * (COLS - 1)) / COLS;
            const CH = 58;
            const sorted = [...tasks].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

            sorted.forEach((task, idx) => {
                const col = idx % COLS;
                const x = M + col * (CW + GAP);

                if (col === 0 && idx > 0) {
                    if (Y + CH + 4 > PH - 22) { addFooter(doc, PW, PH, M); doc.addPage(); Y = M; }
                }

                const hh = (task.duration * task.manpower).toFixed(1);
                // Days until shutdown
                const shutdownMs = new Date(parameters.shutdownStart).getTime();
                const taskMs = task.startTime.getTime();
                const daysUntil = Math.max(0, Math.floor((taskMs - Date.now()) / 86400000));

                // Shadow
                doc.setFillColor(195, 205, 220); doc.roundedRect(x + 1, Y + 1, CW, CH, 2, 2, 'F');
                // Card
                doc.setFillColor(255, 255, 255); doc.roundedRect(x, Y, CW, CH, 2, 2, 'F');
                // Left strip
                doc.setFillColor(...AC); doc.rect(x, Y, 4.5, CH, 'F');
                // Top header
                doc.setFillColor(10, 18, 40); doc.rect(x + 4.5, Y, CW - 4.5, 14, 'F');

                // #badge
                doc.setFillColor(...AC); doc.roundedRect(x + 7, Y + 2.5, 10, 9, 1, 1, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(255, 255, 255);
                doc.text(String(idx + 1).padStart(2, '0'), x + 12, Y + 8, { align: 'center' });

                // "ECHAFAUDAGE REQUIS" badge top-right
                doc.setFillColor(20, 30, 55); doc.roundedRect(x + CW - 62, Y + 2.5, 58, 9, 1, 1, 'F');
                doc.setFillColor(...AC); doc.roundedRect(x + CW - 62, Y + 2.5, 3, 9, 0.5, 0.5, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(...AC);
                doc.text('ECHAFAUDAGE REQUIS', x + CW - 30, Y + 8, { align: 'center' });

                // Equipment (in header)
                doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(180, 200, 230);
                doc.text(safe(task.equipment), x + 21, Y + 8, { maxWidth: CW - 90 });

                // ── Action ──────────────────────────────────────────────
                doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(10, 18, 40);
                const aLines = doc.splitTextToSize(safe(task.action.toUpperCase()), CW - 14);
                doc.text(aLines.slice(0, 2), x + 7, Y + 23);

                // Family chip
                if (task.family) {
                    const chipW = Math.min(doc.getTextWidth(safe(task.family)) + 6, CW / 2.5);
                    doc.setFillColor(236, 254, 255); doc.roundedRect(x + 7, Y + 30, chipW, 5, 0.8, 0.8, 'F');
                    doc.setDrawColor(...AC); doc.setLineWidth(0.3); doc.roundedRect(x + 7, Y + 30, chipW, 5, 0.8, 0.8, 'S');
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(5); doc.setTextColor(...AC);
                    doc.text(safe(task.family), x + 7 + chipW / 2, Y + 33.5, { align: 'center' });
                }

                // OT
                if (task.ot) {
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(100, 115, 145);
                    const otX = task.family ? x + 7 + Math.min(doc.getTextWidth(safe(task.family || '')) + 6, CW / 2.5) + 4 : x + 7;
                    doc.text(safe(`OT: ${task.ot}`), otX, Y + 33.5);
                }

                // Preparation readiness marker
                const readiness = task.preparatifs && task.preparatifs.trim() !== '' && task.preparatifs.trim() !== '0' ? 'PREPARIS' : 'A PREPARER';
                const readCol: [number, number, number] = readiness === 'PREPARIS' ? [16, 185, 129] : [245, 158, 11];
                doc.setFillColor(...readCol); doc.roundedRect(x + CW - 48, Y + 28, 44, 7, 1, 1, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(255, 255, 255);
                doc.text(readiness, x + CW - 26, Y + 33, { align: 'center' });

                // Divider
                doc.setDrawColor(225, 232, 242); doc.setLineWidth(0.25);
                doc.line(x + 7, Y + 39, x + CW - 5, Y + 39);

                // Bottom: team badge
                const tText = safe(task.team || 'N/A');
                const tBW = Math.min(doc.getTextWidth(tText) + 7, CW / 3.5);
                doc.setFillColor(10, 18, 40); doc.roundedRect(x + 7, Y + 41, tBW, 8, 1, 1, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(148, 163, 184);
                doc.text(tText, x + 7 + tBW / 2, Y + 46, { align: 'center', maxWidth: tBW - 2 });

                // Dates
                const dX = x + 7 + tBW + 3;
                doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(60, 80, 110);
                doc.text(safe(`Debut: ${fmt(task.startTime)}`), dX, Y + 44);
                doc.text(safe(`Fin:   ${fmt(task.endTime)}`), dX, Y + 50);

                // H-H badge
                doc.setFillColor(...AC); doc.roundedRect(x + CW - 35, Y + 41, 30, 14, 1.5, 1.5, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
                doc.text(`${hh}H`, x + CW - 20, Y + 49, { align: 'center' });
                doc.setFont('helvetica', 'normal'); doc.setFontSize(5); doc.setTextColor(200, 240, 255);
                doc.text(`${task.manpower}p x ${task.duration.toFixed(1)}h`, x + CW - 20, Y + 54, { align: 'center' });

                if (col === COLS - 1 || idx === sorted.length - 1) Y += CH + 5;
            });

            // ── TEAM DISTRIBUTION ─────────────────────────────────────────────
            if (Y + 55 > PH - 22) { addFooter(doc, PW, PH, M); doc.addPage(); Y = M; } else Y += 6;

            doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(12, 18, 35);
            doc.text(safe('REPARTITION PAR EQUIPE — CHARGE ECHAFAUDAGE'), M, Y + 5);
            doc.setFillColor(...AC); doc.rect(M, Y + 8, 48, 1.5, 'F');
            Y += 18;

            const byTeam = tasks.reduce<Record<string, { c: number; hh: number }>>((a, t) => {
                const k = t.team || 'Non assigne'; if (!a[k]) a[k] = { c: 0, hh: 0 }; a[k].c++; a[k].hh += t.duration * t.manpower; return a;
            }, {});
            const tEntries = Object.entries(byTeam).sort((a, b) => b[1].c - a[1].c);
            const maxC = tEntries[0]?.[1].c || 1;
            const barW = PW - M * 2 - 95;

            tEntries.forEach(([team, { c, hh }], i) => {
                if (Y + 11 > PH - 22) { addFooter(doc, PW, PH, M); doc.addPage(); Y = M; }
                const ry = Y + i * 11;
                if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(M, ry, PW - M * 2, 11, 'F'); }
                doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(20, 30, 50);
                doc.text(safe(team), M + 3, ry + 8);
                doc.setTextColor(...AC);
                doc.text(`${c} taches`, M + 72, ry + 8, { align: 'right' });
                doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(120, 130, 150);
                doc.text(`${hh.toFixed(1)} H-H`, M + 95, ry + 8, { align: 'right' });
                doc.setFillColor(225, 232, 242); doc.roundedRect(M + 100, ry + 3, barW, 5, 0.5, 0.5, 'F');
                doc.setFillColor(...AC); doc.roundedRect(M + 100, ry + 3, barW * (c / maxC), 5, 0.5, 0.5, 'F');
            });
            Y += tEntries.length * 11 + 6;

            // ── CHECKLIST PAGE ────────────────────────────────────────────────
            if (Y + 70 > PH - 22) { addFooter(doc, PW, PH, M); doc.addPage(); Y = M; }
            else Y += 8;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(12, 18, 35);
            doc.text(safe('CHECKLIST PREPARATION ECHAFAUDAGE'), M, Y + 5);
            doc.setFillColor(...AC); doc.rect(M, Y + 8, 48, 1.5, 'F');
            Y += 18;

            const checklist = [
                { item: 'Visite de site realisee pour chaque zone echafaudage', cat: 'INSPECTION' },
                { item: 'Specifications echafaudage definies (hauteur, charge, type)', cat: 'DEFINITION' },
                { item: 'Bon de commande echafaudage emis et confirme', cat: 'APPROVISIONNEMENT' },
                { item: 'Echafaudeurs certifies identifies et planifies', cat: 'RESSOURCES' },
                { item: 'Materiaux et equipements de protection recus en depot', cat: 'LOGISTIQUE' },
                { item: 'Zones de montage balisees et securisees', cat: 'SECURITE' },
                { item: 'Planning de montage avant J-1 de chaque intervention valide', cat: 'PLANNING' },
                { item: 'Inspection et validation echafaudage avant utilisation', cat: 'VALIDATION' },
            ];

            const COLS2 = 2;
            const cW2 = (PW - M * 2 - 8) / COLS2;
            checklist.forEach((item, i) => {
                const col2 = i % COLS2, cx2 = M + col2 * (cW2 + 8), cy2 = Y + Math.floor(i / COLS2) * 16;
                doc.setFillColor(248, 252, 255); doc.roundedRect(cx2, cy2, cW2, 13, 1.5, 1.5, 'F');
                doc.setFillColor(...AC); doc.roundedRect(cx2, cy2, 3, 13, 0.5, 0.5, 'F');
                doc.setDrawColor(210, 230, 240); doc.setLineWidth(0.2); doc.roundedRect(cx2, cy2, cW2, 13, 1.5, 1.5, 'S');
                // checkbox
                doc.setDrawColor(...AC); doc.setLineWidth(0.4); doc.roundedRect(cx2 + 6, cy2 + 3, 7, 7, 0.8, 0.8, 'S');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(...AC);
                doc.text(safe(item.cat), cx2 + 16, cy2 + 6);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(30, 50, 80);
                doc.text(safe(item.item), cx2 + 16, cy2 + 10.5, { maxWidth: cW2 - 20 });
            });

            // ── FOOTER ALL PAGES ──────────────────────────────────────────────
            addFooter(doc, PW, PH, M);
            const pageCount = (doc as any).internal.pages.length - 1;
            for (let i = 2; i <= pageCount; i++) {
                doc.setPage(i);
                addFooter(doc, PW, PH, M);
                doc.setFontSize(7); doc.setTextColor(150, 160, 175);
                doc.text(`Page ${i - 1} / ${pageCount - 1}`, PW - M, PH - 8, { align: 'right' });
            }

            resolve(doc);
        } catch (err) { console.error('Scaffolding PDF error:', err); reject(err); }
    });
};
