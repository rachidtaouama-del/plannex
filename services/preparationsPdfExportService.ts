/**
 * preparationsPdfExportService.ts
 * Premium Préparatifs & PDR Report — Spare Part Readiness Intelligence
 * Design: Task cards with embedded PDR scorecards, criticality flags,
 *         consolidated parts master list, and pre-shutdown checklist.
 */

import jsPDF from 'jspdf';
import type { ScheduledTask, SchedulingTaskData } from '../types';
import { drawProfessionalCoverPage } from './pdfCoverPageService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const safe = (s: string): string =>
    (s || '').replace(/[éèêëàâïîùûçôöüñ—→«»\u00e9\u00e8\u00ea\u00eb\u00e0\u00e2\u00ef\u00ee\u00f9\u00fb\u00e7\u00f4\u00f6\u00fc\u00f1]/gi,
        (c: string) => ({
            é: 'e', è: 'e', ê: 'e', ë: 'e', à: 'a', â: 'a', ï: 'i', î: 'i', ù: 'u', û: 'u', ç: 'c', ô: 'o', ö: 'o', ü: 'u', ñ: 'n',
            '—': '-', '→': '->', '«': '"', '»': '"'
        }[c] || c));

const fmt = (d: Date, withTime = true) => {
    if (!d || isNaN(d.getTime())) return 'N/A';
    const D = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    if (!withTime) return D;
    return `${D} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

// ─── Type color identity ───────────────────────────────────────────────────────
type RGB = [number, number, number];
const getTypeStyle = (type: string): { bg: RGB; text: RGB; label: string; dot: RGB } => {
    const t = (type || '').toLowerCase();
    if (t.includes('consom')) return { bg: [120, 53, 15], text: [253, 186, 116], label: 'CONSOMMABLE', dot: [245, 158, 11] };
    if (t.includes('inter')) return { bg: [76, 29, 149], text: [196, 181, 253], label: 'INTERCHANGEABLE', dot: [168, 85, 247] };
    return { bg: [21, 94, 117], text: [103, 232, 249], label: 'PDR', dot: [6, 182, 212] };
};

// ─── Palette ───────────────────────────────────────────────────────────────────
const C = {
    dark0: [8, 12, 25] as RGB,
    dark1: [12, 18, 38] as RGB,
    dark2: [20, 30, 56] as RGB,
    dark3: [32, 45, 78] as RGB,
    emerald: [16, 185, 129] as RGB,
    cyan: [6, 182, 212] as RGB,
    amber: [245, 158, 11] as RGB,
    red: [239, 68, 68] as RGB,
    purple: [168, 85, 247] as RGB,
    white: [255, 255, 255] as RGB,
    slate400: [148, 163, 184] as RGB,
    slate600: [71, 85, 105] as RGB,
    green: [16, 185, 129] as RGB,
    blue: [59, 130, 246] as RGB,
    indigo: [99, 102, 241] as RGB,
};

const addFooter = (doc: jsPDF, PW: number, PH: number, M: number) => {
    doc.setDrawColor(30, 45, 78);
    doc.setLineWidth(0.3);
    doc.line(M, PH - 14, PW - M, PH - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(80, 100, 150);
    doc.text(safe('PREPARATIFS & PDR | Intelligence Logistique Pre-Arret | Gestion des Pieces de Rechange | PlanneX Intelligence Engine'), M, PH - 9);
    doc.setFillColor(...C.emerald);
    doc.rect(M, PH - 3, PW - M * 2, 1.5, 'F');
};

// ─── Main Export ──────────────────────────────────────────────────────────────
export const exportPreparationsToPDF = async (
    tasks: (SchedulingTaskData | ScheduledTask)[],
    withDates?: boolean,
    customTitle?: string,
    selectedColumns?: string[],
    allTasks?: (SchedulingTaskData | ScheduledTask)[]
): Promise<void> => {

    // Filter tasks that have preparations or PDR items
    const tasksWithPrep = tasks.filter(t => {
        const prepRaw = (t as any).preparatif || (t as any).preparatifs || (t as any)['Preparatifs'] || (t as any)['Préparatifs'];
        const hasPrepText = prepRaw && String(prepRaw).trim() !== '' && String(prepRaw).trim() !== '0';
        const pdrs = (t as any).pdrItems || (t as any).PDRItems || (t as any).spareParts;
        const hasPdr = pdrs && Array.isArray(pdrs) && pdrs.length > 0;
        return !!(hasPrepText || hasPdr);
    });

    if (tasksWithPrep.length === 0) {
        alert('Aucune tache avec des preparatifs (textuels ou PDR) a exporter.');
        return;
    }

    const title = customTitle || 'Rapport Preparatifs & PDR';
    const totalAll = allTasks?.length || tasksWithPrep.length;
    const prepCount = tasksWithPrep.length;
    const prepPct = ((prepCount / Math.max(totalAll, 1)) * 100).toFixed(1);

    const hasCol = (key: string) => !selectedColumns || selectedColumns.includes(key);

    // Aggregate all PDR items (Deduplicated by p.id)
    const uniquePDRs = new Map<string, { pdr: any; tasks: Set<string> }>();
    let totalPDR = 0, totalConsom = 0, totalInter = 0;
    
    tasksWithPrep.forEach(t => {
        const pdrs: any[] = (t as any).pdrItems || (t as any).PDRItems || (t as any).spareParts || [];
        const isScheduled = 'startTime' in t;
        const st = isScheduled ? t as ScheduledTask : null;
        const taskAction = st ? st.action : ((t as any)['GLOBAL TASKS'] || '');
        
        pdrs.forEach(p => {
            const pId = p.id || JSON.stringify(p);
            if (!uniquePDRs.has(pId)) {
                uniquePDRs.set(pId, { pdr: p, tasks: new Set([taskAction]) });
                const tp = (p.type || '').toLowerCase();
                if (tp.includes('consom')) totalConsom++;
                else if (tp.includes('inter')) totalInter++;
                else totalPDR++;
            } else {
                uniquePDRs.get(pId)!.tasks.add(taskAction);
            }
        });
    });
    const totalItems = totalPDR + totalConsom + totalInter;
    const teamsSet = new Set(tasksWithPrep.map(t => (t as any).team || (t as any)['TYPE D\'EQUIPE']).filter(Boolean));

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
    const PW = doc.internal.pageSize.getWidth();
    const PH = doc.internal.pageSize.getHeight();
    const M = 20;

    // ── COVER PAGE ────────────────────────────────────────────────────────────
    drawProfessionalCoverPage(doc, {
        title: safe(title.toUpperCase()),
        category: 'PREPARATION PRE-ARRET',
        subcategory: 'GESTION DES PIECES DE RECHANGE & PREPARATIONS',
        description: safe('Rapport consolide de readiness PDR — Pieces de rechange, Consommables, Interchangeables requis avant demarrage arret'),
        accentColor: C.emerald,
        meta: [
            { label: 'Type de document', value: safe('Rapport Readiness PDR & Preparatifs') },
            { label: 'Taches avec preparatifs', value: `${prepCount} sur ${totalAll} (${prepPct}%)` },
            { label: 'Equipes impliquees', value: `${teamsSet.size} equipe(s)` },
            { label: 'Action requise', value: safe('Validation disponibilite PDR AVANT demarrage — Prevenir tout arret de chantier faute de pieces') },
        ],
        projectName: 'Arret de Maintenance Industrielle',
        classification: 'LOGISTIQUE CRITIQUE - USAGE INTERNE',
        docRef: 'PLX-PDR',
    });

    let Y = M;

    // ── STATS BANNER ──────────────────────────────────────────────────────────
    const BH = 52;
    doc.setFillColor(...C.dark1);
    doc.roundedRect(M, Y, PW - M * 2, BH, 4, 4, 'F');
    doc.setFillColor(...C.emerald);
    doc.roundedRect(M, Y, PW - M * 2, 2.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(60, 120, 100);
    doc.text(safe('TABLEAU DE BORD PDR & PREPARATIFS — READINESS PRE-ARRET'), PW / 2, Y + 11, { align: 'center' });

    const stats: Array<{ v: string; l: string; c: RGB }> = [];
    if (hasCol('kpi_taches_pdr')) stats.push({ v: `${prepCount}`, l: 'TACHES AVEC PDR', c: C.emerald });
    if (hasCol('kpi_pourcent')) stats.push({ v: `${prepPct}%`, l: 'DU PROJET', c: C.emerald });
    if (hasCol('kpi_total_art')) stats.push({ v: `${totalItems}`, l: 'TOTAL ARTICLES', c: C.cyan });
    if (hasCol('kpi_pdr')) stats.push({ v: `${totalPDR}`, l: 'PDR', c: C.blue });
    if (hasCol('kpi_consom')) stats.push({ v: `${totalConsom}`, l: 'CONSOMMABLES', c: C.amber });
    if (hasCol('kpi_inter')) stats.push({ v: `${totalInter}`, l: 'INTERCHANGEABLES', c: C.purple });
    if (hasCol('kpi_equipes')) stats.push({ v: `${teamsSet.size}`, l: 'EQUIPES', c: [52, 211, 153] as RGB });

    if (stats.length > 0) {
        const bW = (PW - M * 2 - 20) / stats.length;
        stats.forEach((s, i) => {
            const bx = M + 10 + i * bW, by = Y + 18;
            doc.setFillColor(...C.dark2); doc.roundedRect(bx, by, bW - 4, 26, 2, 2, 'F');
            doc.setFillColor(...s.c); doc.roundedRect(bx, by, bW - 4, 1.5, 0.5, 0.5, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...s.c);
            doc.text(s.v, bx + (bW - 4) / 2, by + 13, { align: 'center' });
            doc.setFontSize(5.5); doc.setTextColor(70, 100, 85);
            doc.text(s.l, bx + (bW - 4) / 2, by + 20.5, { align: 'center' });
        });
        Y += BH + 8;
    } else {
        Y += 8;
    }

    // ── PLANNING ADVISORY ─────────────────────────────────────────────────────
    doc.setFillColor(240, 253, 248);
    doc.roundedRect(M, Y, PW - M * 2, 20, 2, 2, 'F');
    doc.setFillColor(...C.emerald); doc.rect(M, Y, 4, 20, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(5, 100, 70);
    doc.text(safe('! ACTIONS CRITIQUES — DISPONIBILITE PDR A CONFIRMER AVANT DEMARRAGE :'), M + 7, Y + 8);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(10, 80, 60);
    doc.text(safe('Verifier la disponibilite de chaque piece en stock · Commander les articles manquants  · Confirmer les delais livraison · Identifier les pieces critiques a longue livraison · Affecter un responsable PDR par equipe'), M + 7, Y + 15, { maxWidth: PW - M * 2 - 12 });
    Y += 27;

    // ── SECTION TITLE ─────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(10, 18, 35);
    doc.text(safe('FICHES DE PREPARATIFS PAR TACHE'), M, Y + 5);
    doc.setFillColor(...C.emerald); doc.rect(M, Y + 8, 46, 1.5, 'F');
    doc.setFillColor(200, 225, 210); doc.rect(M + 49, Y + 8.5, PW - M * 2 - 49, 0.4, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 140, 120);
    doc.text(safe(`${prepCount} tache(s) — Triees par famille puis par date — Pieces et preparatifs requis avant execution`), M, Y + 15);
    Y += 22;

    // ── TASK CARDS ────────────────────────────────────────────────────────────
    // Group by family
    const byFamily: Record<string, (SchedulingTaskData | ScheduledTask)[]> = {};
    tasksWithPrep.forEach(t => {
        const key = safe(('family' in t ? (t as ScheduledTask).family : (t as SchedulingTaskData).FAMILLE) || 'Sans Famille');
        if (!byFamily[key]) byFamily[key] = [];
        byFamily[key].push(t);
    });
    const families = Object.keys(byFamily).sort();

    for (const familyName of families) {
        const familyTasks = byFamily[familyName];

        // Family header
        if (Y + 16 > PH - 22) { addFooter(doc, PW, PH, M); doc.addPage(); Y = M; }
        doc.setFillColor(...C.dark2); doc.roundedRect(M, Y, PW - M * 2, 10, 2, 2, 'F');
        doc.setFillColor(...C.emerald); doc.roundedRect(M, Y, 4, 10, 1, 1, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...C.white);
        doc.text(safe(familyName.toUpperCase()), M + 8, Y + 7);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C.slate400);
        doc.text(`${familyTasks.length} tache(s)`, PW - M - 4, Y + 7, { align: 'right' });
        Y += 13;

        for (const task of familyTasks) {
            const isScheduled = 'startTime' in task;
            const st = isScheduled ? task as ScheduledTask : null;
            const rt = !isScheduled ? task as SchedulingTaskData : null;

            const action = safe(st ? st.action : (rt?.['GLOBAL TASKS'] || ''));
            const equipment = safe(st ? st.equipment : (rt?.['Nom Equipement'] || ''));
            const startStr = st ? fmt(st.startTime) : '';
            const endStr = st ? fmt(st.endTime) : '';
            const team = safe((st as any)?.team || '');
            const hh = st ? (st.duration * st.manpower).toFixed(1) : '—';
            const ot = safe(String((st as any)?.ot || rt?.OT || ''));

            const prepRaw = st ? (st.preparatifs || '') : String(rt?.['Préparatifs'] || '');
            const textPreps = prepRaw && prepRaw.trim() && prepRaw.trim() !== '0'
                ? prepRaw.split('<AND>').map((p: string) => p.trim()).filter(Boolean)
                : [];
            const pdrItems: any[] = (task as any).pdrItems || [];

            const totalItemCount = textPreps.length + pdrItems.length;

            // Estimate card height
            const HEADER_H = 18;
            const ROW_H = 9;
            const TABLE_HEAD_H = 8;
            const NOTE_H = textPreps.length > 0 ? Math.min(textPreps.length * 7 + 6, 28) : 0;
            const TABLE_H = pdrItems.length > 0 ? TABLE_HEAD_H + pdrItems.length * ROW_H : 0;
            const CARD_H = HEADER_H + NOTE_H + TABLE_H + 6;

            if (Y + CARD_H > PH - 22) {
                addFooter(doc, PW, PH, M);
                doc.addPage();
                Y = M;
                // Re-draw family header
                doc.setFillColor(...C.dark2); doc.roundedRect(M, Y, PW - M * 2, 10, 2, 2, 'F');
                doc.setFillColor(...C.emerald); doc.roundedRect(M, Y, 4, 10, 1, 1, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...C.white);
                doc.text(safe(familyName.toUpperCase()), M + 8, Y + 7);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C.slate400);
                doc.text(`${familyTasks.length} tache(s) (suite)`, PW - M - 4, Y + 7, { align: 'right' });
                Y += 13;
            }

            // ── CARD ──────────────────────────────────────────────────────────
            // Shadow
            doc.setFillColor(195, 215, 205); doc.roundedRect(M + 0.8, Y + 0.8, PW - M * 2, CARD_H, 2, 2, 'F');
            // Card bg
            doc.setFillColor(248, 252, 250); doc.roundedRect(M, Y, PW - M * 2, CARD_H, 2, 2, 'F');
            // Left strip
            doc.setFillColor(...C.emerald); doc.rect(M, Y, 5, CARD_H, 'F');
            // Header band
            doc.setFillColor(...C.dark1); doc.rect(M + 5, Y, PW - M * 2 - 5, HEADER_H, 'F');

            // Item count badge (top-left)
            const hasItems = totalItemCount > 0;
            doc.setFillColor(...C.emerald); doc.roundedRect(M + 8, Y + 3, 12, 12, 1.5, 1.5, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(0, 0, 0);
            doc.text(String(totalItemCount), M + 14, Y + 11, { align: 'center' });

            // Action text
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...C.white);
            const actionLines = doc.splitTextToSize(action.toUpperCase(), PW - M * 2 - 110);
            doc.text(actionLines.slice(0, 2), M + 24, Y + 8);

            // Equipment chip
            if (equipment) {
                doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(100, 200, 160);
                doc.text(safe(`Equip: ${equipment}`), M + 24, Y + 15.5);
            }

            // Right metadata: OT, dates, HH, team
            const rightX = PW - M - 4;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(...C.emerald);
            if (ot) doc.text(safe(`OT: ${ot}`), rightX, Y + 6, { align: 'right' });
            doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(...C.slate400);
            if (startStr) {
                doc.text(safe(`${startStr}  →  ${endStr}`), rightX, Y + 11, { align: 'right' });
            }
            if (team) doc.text(safe(`Equipe: ${team}`), rightX, Y + 16, { align: 'right' });

            // H-H mini badge
            if (hh !== '—') {
                const hhW = 28, hhH = 10, hhX = rightX - 90;
                doc.setFillColor(10, 60, 45); doc.roundedRect(hhX, Y + 4, hhW, hhH, 1, 1, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...C.emerald);
                doc.text(`${hh} H-H`, hhX + hhW / 2, Y + 10.5, { align: 'center' });
            }

            let cardY = Y + HEADER_H + 2;

            // ── TEXT PREPARATIONS (notes box) ─────────────────────────────────
            if (textPreps.length > 0) {
                const noteH = Math.min(textPreps.length * 7 + 5, 27);
                doc.setFillColor(230, 248, 240); doc.roundedRect(M + 7, cardY, PW - M * 2 - 12, noteH, 1.5, 1.5, 'F');
                doc.setFillColor(80, 200, 140); doc.roundedRect(M + 7, cardY, 3, noteH, 0.5, 0.5, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(5, 100, 70);
                doc.text(safe('NOTES DE PREPARATION :'), M + 13, cardY + 5);
                textPreps.slice(0, 3).forEach((prep, pi) => {
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(20, 80, 55);
                    doc.text(safe(`• ${prep}`), M + 13, cardY + 5 + (pi + 1) * 7, { maxWidth: PW - M * 2 - 22 });
                });
                cardY += noteH + 3;
            }

            // ── PDR ITEMS TABLE ───────────────────────────────────────────────
            if (pdrItems.length > 0) {
                const showType = hasCol('col_type');
                const showQty = hasCol('col_qte');
                const showUnit = hasCol('col_unite');
                const showStatus = hasCol('col_statut');

                const cType = showType ? 45 : 0;
                const cQty = showQty ? 20 : 0;
                const cUnit = showUnit ? 25 : 0;
                const cStatus = showStatus ? 30 : 0;

                const colW = { 
                    type: cType, 
                    designation: PW - M * 2 - 12 - cType - cQty - cUnit - cStatus, 
                    qty: cQty, 
                    unit: cUnit, 
                    status: cStatus 
                };
                const tX = M + 7;
                const tW = PW - M * 2 - 12;

                // Header row
                doc.setFillColor(...C.dark2); doc.roundedRect(tX, cardY, tW, 8, 1, 1, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(...C.slate400);
                let hx = tX + 2;
                if (showType) { doc.text('TYPE', hx + colW.type / 2, cardY + 5.5, { align: 'center' }); hx += colW.type; }
                doc.text('DESIGNATION / REFERENCE PIECE', hx + colW.designation / 2, cardY + 5.5, { align: 'center' }); hx += colW.designation;
                if (showQty) { doc.text('QTE', hx + colW.qty / 2, cardY + 5.5, { align: 'center' }); hx += colW.qty; }
                if (showUnit) { doc.text('UNITE', hx + colW.unit / 2, cardY + 5.5, { align: 'center' }); hx += colW.unit; }
                if (showStatus) { doc.text('STATUT', hx + colW.status / 2, cardY + 5.5, { align: 'center' }); }
                cardY += 8;

                // Item rows
                pdrItems.forEach((item, ri) => {
                    const ts = getTypeStyle(item.type || 'PDR');
                    const rowBg: RGB = ri % 2 === 0 ? [245, 252, 248] : [235, 248, 242];
                    doc.setFillColor(...rowBg); doc.roundedRect(tX, cardY, tW, ROW_H, 0, 0, 'F');

                    let rx = tX + 2;

                    // Type badge
                    if (showType) {
                        doc.setFillColor(...ts.bg); doc.roundedRect(tX + 1, cardY + 1.5, colW.type - 2, ROW_H - 3, 1, 1, 'F');
                        doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(...ts.text);
                        doc.text(ts.label, tX + colW.type / 2, cardY + 5.8, { align: 'center' });
                        rx += colW.type;
                    }
                    
                    // Dot indicator always present (even if Type is hidden)
                    doc.setFillColor(...ts.dot);
                    doc.circle(tX + 3, cardY + ROW_H / 2, 1, 'F');
                    if (!showType) rx += 4;

                    // Designation
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(15, 40, 30);
                    const desig = safe(item.sparePart || item.description || '-');
                    doc.text(desig, rx, cardY + 6, { maxWidth: colW.designation - 4 });
                    rx += colW.designation;

                    // Qty (bold, colored)
                    if (showQty) {
                        doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...ts.dot);
                        doc.text(String(item.qty ?? '-'), rx + colW.qty / 2, cardY + 6.5, { align: 'center' });
                        rx += colW.qty;
                    }

                    // Unit
                    if (showUnit) {
                        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(80, 110, 95);
                        doc.text(safe(item.unite || item.unit || '-'), rx + colW.unit / 2, cardY + 6.5, { align: 'center' });
                        rx += colW.unit;
                    }

                    // Status badge (readiness)
                    if (showStatus) {
                        const ready = item.readiness === 1 || item.statut === 'Disponible' || item.statut === 1;
                        const statFill: RGB = ready ? [16, 185, 129] : [220, 60, 60];
                        const statText: RGB = [255, 255, 255];
                        const statLabel = ready ? 'DISPONIBLE' : 'A VERIFIER';
                        doc.setFillColor(...statFill); doc.roundedRect(rx, cardY + 1.5, colW.status - 2, ROW_H - 3, 1, 1, 'F');
                        doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(...statText);
                        doc.text(statLabel, rx + (colW.status - 2) / 2, cardY + 5.8, { align: 'center' });
                    }

                    cardY += ROW_H;
                });
                cardY += 2;
            }

            Y = Y + CARD_H + 5;
        }
        Y += 4;
    }

    // ── CONSOLIDATED PDR MASTER LIST ─────────────────────────────────────────
    if (uniquePDRs.size > 0) {
        addFooter(doc, PW, PH, M);
        doc.addPage(); Y = M;

        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(10, 18, 35);
        doc.text(safe('LISTE CONSOLIDEE DES PIECES DE RECHANGE'), M, Y + 6);
        doc.setFillColor(...C.emerald); doc.rect(M, Y + 10, 58, 2, 'F');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 140, 120);
        doc.text(safe(`${uniquePDRs.size} article(s) total — Toutes taches confondues — A valider avec le gestionnaire de stock avant demarrage`), M, Y + 16);
        Y += 22;

        // Aggregate by part reference using unique PDRs
        const partMap: Record<string, { type: string; designation: string; totalQty: number; tasks: string[]; statuses: number[] }> = {};
        Array.from(uniquePDRs.values()).forEach(({ pdr, tasks }) => {
            const key = (pdr.sparePart || pdr.description || 'N/A').trim();
            if (!partMap[key]) {
                partMap[key] = { type: pdr.type || 'PDR', designation: key, totalQty: 0, tasks: [], statuses: [] };
            }
            partMap[key].totalQty += Number(pdr.qty || 0);
            tasks.forEach(taskAction => {
                if (!partMap[key].tasks.includes(taskAction)) partMap[key].tasks.push(taskAction);
            });
            partMap[key].statuses.push(pdr.readiness || 0);
        });

        const masterEntries = Object.values(partMap).sort((a, b) => b.totalQty - a.totalQty);

        // Table header
        const showType = hasCol('col_type');
        const showQty = hasCol('col_qte');
        const showStatus = hasCol('col_statut');

        const cType = showType ? 38 : 0;
        const cQty = showQty ? 22 : 0;
        const cStatus = showStatus ? 28 : 0;

        const COL = { type: cType, desig: PW - M * 2 - cType - cQty - 30 - cStatus, qty: cQty, tasks: 30, status: cStatus };
        const tX = M;
        const tW = PW - M * 2;

        const drawMasterHeader = () => {
            doc.setFillColor(...C.dark1); doc.roundedRect(tX, Y, tW, 9, 1, 1, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(...C.slate400);
            let hx = tX + 2;
            if (showType) { doc.text('TYPE', hx + COL.type / 2, Y + 6, { align: 'center' }); hx += COL.type; }
            doc.text('DESIGNATION / REFERENCE', hx + COL.desig / 2, Y + 6, { align: 'center' }); hx += COL.desig;
            if (showQty) { doc.text('QTE TOTALE', hx + COL.qty / 2, Y + 6, { align: 'center' }); hx += COL.qty; }
            doc.text('NB TACHES', hx + COL.tasks / 2, Y + 6, { align: 'center' }); hx += COL.tasks;
            if (showStatus) { doc.text('READINESS', hx + COL.status / 2, Y + 6, { align: 'center' }); }
            Y += 9;
        };
        drawMasterHeader();

        const R_H = 9;
        masterEntries.forEach((entry, ri) => {
            if (Y + R_H > PH - 22) {
                addFooter(doc, PW, PH, M);
                doc.addPage(); Y = M;
                drawMasterHeader();
            }
            const ts = getTypeStyle(entry.type);
            const allReady = entry.statuses.every(s => s === 1);
            const someReady = entry.statuses.some(s => s === 1);
            const readinessColor: RGB = allReady ? C.emerald : someReady ? C.amber : C.red;
            const readinessLabel = allReady ? 'DISPONIBLE' : someReady ? 'PARTIEL' : 'A VERIFIER';

            const rowBg: RGB = ri % 2 === 0 ? [247, 253, 250] : [238, 250, 244];
            doc.setFillColor(...rowBg); doc.rect(tX, Y, tW, R_H, 'F');

            let rx = tX + 2;

            // Type
            if (showType) {
                doc.setFillColor(...ts.bg); doc.roundedRect(tX + 1, Y + 1, COL.type - 2, R_H - 2, 0.8, 0.8, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(...ts.text);
                doc.text(ts.label, tX + COL.type / 2, Y + 6, { align: 'center' });
                rx += COL.type;
            }

            // Designation
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(10, 35, 25);
            doc.text(safe(entry.designation), rx, Y + 6.5, { maxWidth: COL.desig - 4 });
            rx += COL.desig;

            // Total qty
            if (showQty) {
                doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...ts.dot);
                doc.text(String(entry.totalQty), rx + COL.qty / 2, Y + 7, { align: 'center' });
                rx += COL.qty;
            }

            // Nb tasks
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 110, 95);
            doc.text(String(entry.tasks.length), rx + COL.tasks / 2, Y + 7, { align: 'center' });
            rx += COL.tasks;

            // Readiness badge
            if (showStatus) {
                doc.setFillColor(...readinessColor); doc.roundedRect(rx, Y + 1.5, COL.status - 2, R_H - 3, 1, 1, 'F');
                doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(...C.white);
                doc.text(readinessLabel, rx + (COL.status - 2) / 2, Y + 5.8, { align: 'center' });
            }

            Y += R_H;
        });
        Y += 4;
    }

    // ── PREPARATION CHECKLIST ─────────────────────────────────────────────────
    if (Y + 80 > PH - 22) { addFooter(doc, PW, PH, M); doc.addPage(); Y = M; } else Y += 8;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(10, 18, 35);
    doc.text(safe('CHECKLIST VALIDATION PDR & PREPARATIFS'), M, Y + 5);
    doc.setFillColor(...C.emerald); doc.rect(M, Y + 8, 52, 1.5, 'F');
    Y += 18;

    const checklist = [
        { item: safe('Inventaire physique de tous les articles PDR realise en depot'), cat: safe('INVENTAIRE') },
        { item: safe('Stock minimum verifie pour chaque piece critique identifiee'), cat: safe('STOCK') },
        { item: safe('Bons de commande emis pour articles manquants ou en rupture'), cat: safe('COMMANDE') },
        { item: safe('Delais de livraison confirmes avec fournisseurs pour pieces J-critiques'), cat: safe('LIVRAISON') },
        { item: safe('Pieces sensibles stockees dans zone protegee et etiquetees'), cat: safe('STOCKAGE') },
        { item: safe('Responsable PDR par equipe designe et liste communiquee'), cat: safe('RESPONSABLE') },
        { item: safe('Traceabilite des sorties pieces assuree (bon de sortie par tache)'), cat: safe('TRACABILITE') },
        { item: safe('Validation finale disponibilite PDR signee par Chef de Chantier'), cat: safe('VALIDATION') },
    ];
    const COLS = 2;
    const cW = (PW - M * 2 - 8) / COLS;
    checklist.forEach((item, i) => {
        const col = i % COLS, cx = M + col * (cW + 8), cy = Y + Math.floor(i / COLS) * 16;
        doc.setFillColor(240, 253, 246); doc.roundedRect(cx, cy, cW, 13, 1.5, 1.5, 'F');
        doc.setFillColor(...C.emerald); doc.roundedRect(cx, cy, 3, 13, 0.5, 0.5, 'F');
        doc.setDrawColor(190, 230, 210); doc.setLineWidth(0.2); doc.roundedRect(cx, cy, cW, 13, 1.5, 1.5, 'S');
        doc.setDrawColor(...C.emerald); doc.setLineWidth(0.4); doc.roundedRect(cx + 6, cy + 3, 7, 7, 0.8, 0.8, 'S');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(...C.emerald);
        doc.text(item.cat, cx + 16, cy + 6);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(20, 60, 45);
        doc.text(item.item, cx + 16, cy + 10.5, { maxWidth: cW - 20 });
    });

    // ── FOOTER ALL PAGES ──────────────────────────────────────────────────────
    addFooter(doc, PW, PH, M);
    const pageCount = (doc as any).internal.pages.length - 1;
    for (let i = 2; i <= pageCount; i++) {
        doc.setPage(i);
        addFooter(doc, PW, PH, M);
        doc.setFontSize(7); doc.setTextColor(80, 100, 150);
        doc.text(`Page ${i - 1} / ${pageCount - 1}`, PW - M, PH - 8, { align: 'right' });
    }

    doc.save(safe(`${(customTitle || 'Rapport_Preparatifs_PDR').replace(/\s+/g, '_')}.pdf`));
};
