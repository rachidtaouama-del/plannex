/**
 * permitTaskPdfExportService.ts
 * Premium Permit PDF Report — individual permit-mission cards per task.
 * Design: Dark mission cards, permit type identity system, safety banners.
 */

import jsPDF from 'jspdf';
import type { AppParameters, ScheduledTask } from '../types';
import { drawProfessionalCoverPage } from './pdfCoverPageService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safe = (s: string): string =>
    (s || '').replace(/[éèêëàâïîùûçôöüñ—→«»]/gi, (c: string) =>
    ({
        é: 'e', è: 'e', ê: 'e', ë: 'e', à: 'a', â: 'a', ï: 'i', î: 'i', ù: 'u', û: 'u', ç: 'c', ô: 'o', ö: 'o', ü: 'u', ñ: 'n',
        '—': '-', '→': '->', '«': '"', '»': '"'
    }[c] || c)
    );

const fmtDate = (date: Date, withTime = true): string => {
    if (!date || isNaN(date.getTime())) return 'N/A';
    const d = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    if (!withTime) return d;
    return `${d} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

// ─── Per-permit-type identity config ──────────────────────────────────────────
interface PermitConfig {
    icon: string;          // Text symbol used as pseudo-icon in PDF
    accentR: number; accentG: number; accentB: number;
    safetyNote: string;
    category: string;
    subcategory: string;
}

const PERMIT_CONFIGS: Record<string, PermitConfig> = {
    pth: {
        icon: '↑', accentR: 220, accentG: 38, accentB: 38,
        safetyNote: 'EPI Anti-chute Obligatoire | Consignation Mecanique | Verification des Harnais avant Execution',
        category: 'SECURITE EN HAUTEUR', subcategory: 'PERMIS TRAVAIL EN HAUTEUR',
    },
    pf: {
        icon: '🔥', accentR: 249, accentG: 115, accentB: 22,
        safetyNote: 'Extincteur a Portee | Surveillance Continue | Zone Degagee de Materiaux Inflammables',
        category: 'SECURITE INCENDIE', subcategory: 'PERMIS DE FEU',
    },
    pp: {
        icon: '⬇', accentR: 168, accentG: 85, accentB: 247,
        safetyNote: 'Detection Gaz Obligatoire | EPI Respiratoire | Ventilation Forcee | Homme de Securite Present',
        category: 'ESPACES CONFINES', subcategory: 'PERMIS DE PENETRATION',
    },
    pl: {
        icon: '⬆', accentR: 59, accentG: 130, accentB: 246,
        safetyNote: 'Zone de Levage Balisee | Elingage Verifie | Chef de Manoeuvre Designe | No-Fly Zone Dessous',
        category: 'OPERATIONS DE LEVAGE', subcategory: 'PERMIS DE LEVAGE',
    },
    pe: {
        icon: '⛏', accentR: 245, accentG: 158, accentB: 11,
        safetyNote: 'Detection des Reseaux Souterrains | Blindage des Fouilles | Perimetre de Securite | Stabilite du Sol',
        category: 'TRAVAUX DE FOUILLE', subcategory: 'PERMIS D\'EXCAVATION',
    },
};

const getConfig = (bannerColor: [number, number, number], permitKey: string, customTitle: string): PermitConfig => {
    const k = permitKey.toLowerCase();
    if (k.includes('hauteur')) return PERMIT_CONFIGS.pth;
    if (k.includes('feu')) return PERMIT_CONFIGS.pf;
    if (k.includes('penetration')) return PERMIT_CONFIGS.pp;
    if (k.includes('levage')) return PERMIT_CONFIGS.pl;
    if (k.includes('excavation')) return PERMIT_CONFIGS.pe;
    return {
        icon: '⚠', accentR: bannerColor[0], accentG: bannerColor[1], accentB: bannerColor[2],
        safetyNote: 'Validation HSE Obligatoire avant execution — Respect strict des consignes de securite',
        category: 'PERMIS & PROCEDURES', subcategory: customTitle.toUpperCase()
    };
};

const addFooter = (doc: jsPDF, PW: number, PH: number, M: number, cfg: PermitConfig) => {
    doc.setDrawColor(210, 220, 235);
    doc.setLineWidth(0.3);
    doc.line(M, PH - 14, PW - M, PH - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(150, 160, 175);
    doc.text(safe(`${cfg.subcategory} | Securite Industrielle | HSE Obligatoire | PlanneX Intelligence Engine`), M, PH - 9);
    doc.setFillColor(cfg.accentR, cfg.accentG, cfg.accentB);
    doc.rect(M, PH - 3, PW - M * 2, 1.5, 'F');
};

// ─── Main export ──────────────────────────────────────────────────────────────
export const exportPermitTasksToPDF = async (
    tasksToExport: ScheduledTask[],
    parameters: AppParameters,
    permitKey: keyof ScheduledTask,
    customTitle: string,
    labelTotal: string,
    labelFound: string,
    labelNotFound: string,
    bannerColor: [number, number, number],
    selectedColumns?: string[],
    allTasks?: ScheduledTask[]
): Promise<jsPDF> => {
    return new Promise((resolve, reject) => {
        const tasks = tasksToExport.filter(task => task[permitKey] === 1);

        if (tasks.length === 0) {
            reject(new Error(`Aucune tache avec ${labelTotal.toLowerCase()} n'a ete trouvee.`));
            return;
        }

        try {
            const cfg = getConfig(bannerColor, String(permitKey), customTitle);
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
            const PW = doc.internal.pageSize.getWidth();
            const PH = doc.internal.pageSize.getHeight();
            const M = 20;

            const globalTasks = allTasks || tasksToExport;
            const totalAll = globalTasks.length;
            const permitCount = tasks.length;
            const pct = ((permitCount / Math.max(totalAll, 1)) * 100).toFixed(1);
            const teamsSet = new Set(tasks.map(t => t.team).filter(Boolean));
            const totalHH = tasks.reduce((s, t) => s + t.duration * t.manpower, 0);
            const byEquip = tasks.reduce<Record<string, number>>((a, t) => { a[t.equipment] = (a[t.equipment] || 0) + 1; return a; }, {});
            const topEquip = Object.entries(byEquip).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
            const shutdownDateStr = fmtDate(new Date(parameters.shutdownStart), false);

            // ── COVER PAGE ──────────────────────────────────────────────────
            drawProfessionalCoverPage(doc, {
                title: safe(customTitle.toUpperCase()),
                category: safe(cfg.category),
                subcategory: safe(cfg.subcategory),
                description: safe(`Inventaire des interventions soumises au ${cfg.subcategory} - Validation HSE obligatoire`),
                accentColor: [cfg.accentR, cfg.accentG, cfg.accentB],
                meta: [
                    { label: 'Type de document', value: safe(`${cfg.subcategory}`) },
                    { label: 'Date de reference', value: shutdownDateStr },
                    { label: safe(labelFound), value: `${permitCount} taches sur ${totalAll} (${pct}%)` },
                    { label: safe(labelNotFound), value: String(totalAll - permitCount) },
                    { label: 'Charge totale', value: `${totalHH.toFixed(1)} H-H impliques` },
                    { label: 'Equipes concernees', value: `${teamsSet.size} equipe(s)` },
                    { label: 'Conditions', value: safe(`${cfg.subcategory} - Validation HSE obligatoire avant debut des travaux`) },
                ],
                dateLabel: `Arret du: ${shutdownDateStr}`,
                projectName: 'Arret de Maintenance Industrielle',
                classification: 'PERMIS - USAGE REGLEMENTAIRE',
                docRef: 'PLX-PRM',
            });

            // Start content page
            let Y = M;

            // ── STATS BANNER ────────────────────────────────────────────────
            const BANNER_H = 50;
            doc.setFillColor(10, 15, 30);
            doc.roundedRect(M, Y, PW - M * 2, BANNER_H, 4, 4, 'F');
            doc.setFillColor(cfg.accentR, cfg.accentG, cfg.accentB);
            doc.roundedRect(M, Y, PW - M * 2, 2.5, 1, 1, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 120, 160);
            doc.text(safe(`TABLEAU DE BORD ${cfg.subcategory.toUpperCase()} — INDICATEURS CLES`), PW / 2, Y + 10, { align: 'center' });

            const stats = [
                { v: `${permitCount}`, l: 'TACHES CONCERNEES', c: [cfg.accentR, cfg.accentG, cfg.accentB] as [number, number, number] },
                { v: `${pct}%`, l: 'DU TOTAL PROJET', c: [cfg.accentR, cfg.accentG, cfg.accentB] as [number, number, number] },
                { v: `${teamsSet.size}`, l: 'EQUIPES', c: [251, 191, 36] as [number, number, number] },
                { v: `${totalHH.toFixed(0)}`, l: 'H-H TOTAL', c: [52, 211, 153] as [number, number, number] },
                { v: `${totalAll}`, l: 'TACHES ANALYSEES', c: [148, 163, 184] as [number, number, number] },
                { v: String(totalAll - permitCount), l: 'SANS PERMIS', c: [71, 85, 105] as [number, number, number] },
            ];
            const bW = (PW - M * 2 - 20) / stats.length;
            stats.forEach((s, i) => {
                const bx = M + 10 + i * bW;
                const by = Y + 17;
                doc.setFillColor(20, 30, 55);
                doc.roundedRect(bx, by, bW - 4, 25, 2, 2, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(15);
                doc.setTextColor(...s.c);
                doc.text(s.v, bx + (bW - 4) / 2, by + 12, { align: 'center' });
                doc.setFontSize(5.5);
                doc.setTextColor(80, 100, 135);
                doc.text(s.l, bx + (bW - 4) / 2, by + 20, { align: 'center' });
            });
            Y += BANNER_H + 8;

            // ── SAFETY WARNING ──────────────────────────────────────────────
            doc.setFillColor(255, 248, 235);
            doc.roundedRect(M, Y, PW - M * 2, 18, 2, 2, 'F');
            doc.setFillColor(cfg.accentR, cfg.accentG, cfg.accentB);
            doc.rect(M, Y, 4, 18, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.5);
            doc.setTextColor(cfg.accentR - 30, cfg.accentG, cfg.accentB);
            doc.text(safe(`! MESURES ${cfg.subcategory.toUpperCase()} :`), M + 7, Y + 7);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(60, 50, 40);
            doc.text(safe(cfg.safetyNote), M + 7, Y + 13, { maxWidth: PW - M * 2 - 12 });
            Y += 25;

            // ── MAIN SECTION HEADER ─────────────────────────────────────────
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(12, 18, 35);
            doc.text(safe(`FICHES PERMIS — ${cfg.subcategory.toUpperCase()}`), M, Y + 5);
            doc.setFillColor(cfg.accentR, cfg.accentG, cfg.accentB);
            doc.rect(M, Y + 8, 50, 1.5, 'F');
            doc.setFillColor(200, 210, 225);
            doc.rect(M + 53, Y + 8.5, PW - M * 2 - 53, 0.4, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.setTextColor(120, 130, 150);
            doc.text(safe(`${permitCount} tache(s) — Triees par equipe — Permis et validation HSE obligatoires`), M, Y + 14);
            Y += 22;

            // ── TASK CARDS (3 per row) ──────────────────────────────────────
            const COLS = 3;
            const CARD_GAP = 5;
            const CARD_W = (PW - M * 2 - CARD_GAP * (COLS - 1)) / COLS;
            const CARD_H = 54;

            const sorted = [...tasks].sort((a, b) => (a.team || '').localeCompare(b.team || '') || a.startTime.getTime() - b.startTime.getTime());

            sorted.forEach((task, idx) => {
                const col = idx % COLS;
                const x = M + col * (CARD_W + CARD_GAP);

                if (col === 0 && idx > 0) {
                    if (Y + CARD_H + 4 > PH - 22) {
                        addFooter(doc, PW, PH, M, cfg);
                        doc.addPage();
                        Y = M;
                    }
                }

                const hh = (task.duration * task.manpower).toFixed(1);

                // Card shadow
                doc.setFillColor(195, 200, 215);
                doc.roundedRect(x + 1, Y + 1, CARD_W, CARD_H, 2, 2, 'F');

                // Card bg
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(x, Y, CARD_W, CARD_H, 2, 2, 'F');

                // Left accent strip
                doc.setFillColor(cfg.accentR, cfg.accentG, cfg.accentB);
                doc.rect(x, Y, 4, CARD_H, 'F');

                // Top dark header
                doc.setFillColor(12, 20, 42);
                doc.rect(x + 4, Y, CARD_W - 4, 13, 'F');

                // Index badge
                doc.setFillColor(cfg.accentR, cfg.accentG, cfg.accentB);
                doc.roundedRect(x + 7, Y + 2, 10, 9, 1, 1, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(7);
                doc.setTextColor(255, 255, 255);
                doc.text(String(idx + 1).padStart(2, '0'), x + 12, Y + 7.5, { align: 'center' });

                // Permit type badge
                doc.setFillColor(cfg.accentR, cfg.accentG, cfg.accentB);
                doc.roundedRect(x + CARD_W - 56, Y + 2.5, 52, 8, 1, 1, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(5.5);
                doc.setTextColor(255, 255, 255);
                doc.text(safe(cfg.subcategory), x + CARD_W - 30, Y + 7.5, { align: 'center' });

                // OT  
                if (task.ot) {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(7);
                    doc.setTextColor(cfg.accentR, cfg.accentG, cfg.accentB);
                    doc.text(safe(`OT: ${task.ot}`), x + 21, Y + 8);
                }

                // ── Action ──────────────────────────────────────────────
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(8);
                doc.setTextColor(12, 18, 35);
                const actionLines = doc.splitTextToSize(safe(task.action.toUpperCase()), CARD_W - 14);
                doc.text(actionLines.slice(0, 2), x + 7, Y + 21);

                // Equipment
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.5);
                doc.setTextColor(80, 100, 130);
                doc.text(safe(`Equip.: ${task.equipment}`), x + 7, Y + 29, { maxWidth: CARD_W - 12 });

                // Discipline chip
                if (task.family) {
                    const chipW = Math.min(doc.getTextWidth(safe(task.family)) + 5, CARD_W / 2);
                    doc.setFillColor(cfg.accentR, cfg.accentG, cfg.accentB);
                    doc.roundedRect(x + 7, Y + 31.5, chipW, 5, 0.8, 0.8, 'F');
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(5.5);
                    doc.setTextColor(255, 255, 255);
                    doc.text(safe(task.family), x + 7 + chipW / 2, Y + 35.2, { align: 'center' });
                }

                // Divider
                doc.setDrawColor(230, 235, 245);
                doc.setLineWidth(0.25);
                doc.line(x + 7, Y + 39, x + CARD_W - 5, Y + 39);

                // Bottom row — team + dates + HH badge
                const teamText = safe(task.team || 'N/A');
                const teamBadgeW = Math.min(doc.getTextWidth(teamText) + 7, CARD_W / 3);
                doc.setFillColor(28, 38, 58);
                doc.roundedRect(x + 7, Y + 41, teamBadgeW, 7, 1, 1, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(6);
                doc.setTextColor(148, 163, 184);
                doc.text(teamText, x + 7 + teamBadgeW / 2, Y + 45.5, { align: 'center', maxWidth: teamBadgeW - 2 });

                // Dates
                const dateX = x + 7 + teamBadgeW + 3;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.5);
                doc.setTextColor(60, 80, 110);
                doc.text(safe(`Debut: ${fmtDate(task.startTime)}`), dateX, Y + 43.5);
                doc.text(safe(`Fin:   ${fmtDate(task.endTime)}`), dateX, Y + 49.5);

                // H-H badge
                const hhX = x + CARD_W - 35;
                doc.setFillColor(cfg.accentR, cfg.accentG, cfg.accentB);
                doc.roundedRect(hhX, Y + 41, 30, 12, 1.5, 1.5, 'F');
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(9);
                doc.setTextColor(255, 255, 255);
                doc.text(`${hh} H`, hhX + 15, Y + 47.5, { align: 'center' });
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(5.5);
                doc.setTextColor(255, 220, 200);
                doc.text(`${task.manpower}p × ${task.duration.toFixed(1)}h`, hhX + 15, Y + 52, { align: 'center' });

                if (col === COLS - 1 || idx === sorted.length - 1) {
                    Y += CARD_H + 5;
                }
            });

            // ── HSE VALIDATION CHECKLIST ──────────────────────────────
            if (Y + 80 > PH - 22) {
                addFooter(doc, PW, PH, M, cfg);
                doc.addPage();
                Y = M;
            } else {
                Y += 8;
            }

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(12, 18, 35);
            doc.text(safe('CHECKLIST DE VALIDATION HSE AVANT EXECUTION'), M, Y + 5);
            doc.setFillColor(cfg.accentR, cfg.accentG, cfg.accentB);
            doc.rect(M, Y + 8, 52, 1.5, 'F');
            Y += 18;

            const checklistItems = [
                { item: safe('Permis de travail dument rempli et signe par toutes les parties prenantes'), cat: safe('DOCUMENTATION') },
                { item: safe('Analyse des risques (JSA/AHA) realisee et communiquee a l\'equipe'), cat: safe('ANALYSE RISQUES') },
                { item: safe('Equipements de Protection Individuelle (EPI) specifiques verifies'), cat: safe('EPI') },
                { item: safe('Mise en securite / Consignation effectuee (LOTO) avant demarrage'), cat: safe('CONSIGNATION') },
                { item: safe('Outillage et equipements inspectes et declares conformes'), cat: safe('INSPECTION') },
                { item: safe('Zone de travail balisee, securisee et degagee de tout obstacle'), cat: safe('ZONE DE TRAVAIL') },
                { item: safe('Superviseur HSE / Surveillant designe, present et identifie'), cat: safe('SUPERVISION') },
                { item: safe('Procedures d\'urgence et d\'evacuation connues de tout le personnel'), cat: safe('URGENCE') }
            ];

            if (permitKey === 'permisPenetration') {
                checklistItems.push({ item: safe('Mesure d\'oxygene et detection de gaz realisees et conformes'), cat: safe('ATMOSPHERE') });
                checklistItems.push({ item: safe('Ventilation forcee et equipements de sauvetage prets a l\'emploi'), cat: safe('SAUVETAGE') });
            } else if (permitKey === 'permisTravailHauteur') {
                checklistItems.push({ item: safe('Harnais de securite inspectes et points d\'ancrage fiables valides'), cat: safe('ANTI-CHUTE') });
                checklistItems.push({ item: safe('Echafaudages dument receptionnes (tag vert)'), cat: safe('ACCES SECURISE') });
            } else if (permitKey === 'permisFeu') {
                checklistItems.push({ item: safe('Environnement degage de tout combustible et protege par baches ignifugees'), cat: safe('PREVENTION INCENDIE') });
                checklistItems.push({ item: safe('Extincteurs adaptes a portee de main et surveillant etincelles designe'), cat: safe('EXTINCTION') });
            } else if (permitKey === 'permisLevage') {
                checklistItems.push({ item: safe('Elingues, manilles et apparaux de levage inspectes et certifies conformes'), cat: safe('MANUTENTION') });
                checklistItems.push({ item: safe('Perimetre balise et cheminement valide (aucun survol de personnel)'), cat: safe('ZONE D\'EXCLUSION') });
            } else if (permitKey === 'permisExcavation') {
                checklistItems.push({ item: safe('Sondage, detection et marquage des reseaux enterres effectues'), cat: safe('RESEAUX SOUTERRAINS') });
                checklistItems.push({ item: safe('Blindage, talutage ou etaiement mis en place pour prevenir les eboulements'), cat: safe('STABILITE DU SOL') });
            }

            const CHK_COLS = 2;
            const CHK_W = (PW - M * 2 - 8) / CHK_COLS;

            checklistItems.forEach((chk, i) => {
                const col = i % CHK_COLS;
                const row = Math.floor(i / CHK_COLS);
                const cx = M + col * (CHK_W + 8);
                const cy = Y + row * 16;

                // Card bg
                doc.setFillColor(248, 250, 252);
                doc.roundedRect(cx, cy, CHK_W, 13, 1.5, 1.5, 'F');
                
                // Left strip
                doc.setFillColor(cfg.accentR, cfg.accentG, cfg.accentB);
                doc.roundedRect(cx, cy, 3, 13, 0.5, 0.5, 'F');

                // Card border
                doc.setDrawColor(220, 230, 240);
                doc.setLineWidth(0.2);
                doc.roundedRect(cx, cy, CHK_W, 13, 1.5, 1.5, 'S');

                // Checkbox outline
                doc.setDrawColor(cfg.accentR, cfg.accentG, cfg.accentB);
                doc.setLineWidth(0.4);
                doc.roundedRect(cx + 6, cy + 3, 7, 7, 0.8, 0.8, 'S');

                // Text
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(5.5);
                doc.setTextColor(cfg.accentR, cfg.accentG, cfg.accentB);
                doc.text(chk.cat, cx + 16, cy + 6);

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(6.5);
                doc.setTextColor(20, 30, 50);
                doc.text(chk.item, cx + 16, cy + 10.5, { maxWidth: CHK_W - 20 });
            });

            Y += Math.ceil(checklistItems.length / CHK_COLS) * 16 + 4;

            // ── FOOTERS + PAGE NUMBERS ──────────────────────────────────────
            addFooter(doc, PW, PH, M, cfg);
            const pageCount = (doc as any).internal.pages.length - 1;
            for (let i = 2; i <= pageCount; i++) {
                doc.setPage(i);
                addFooter(doc, PW, PH, M, cfg);
                doc.setFontSize(7);
                doc.setTextColor(150, 160, 175);
                doc.text(`Page ${i - 1} / ${pageCount - 1}`, PW - M, PH - 8, { align: 'right' });
            }

            resolve(doc);
        } catch (err) {
            console.error('Permit PDF generation error:', err);
            reject(err);
        }
    });
};
