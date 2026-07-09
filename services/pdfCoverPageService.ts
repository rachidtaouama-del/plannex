/**
 * pdfCoverPageService.ts
 * Renders a high-fidelity professional cover page.
 * Style: Corporate engineering report — dark left panel, white center, typographic hierarchy.
 * All strings are ASCII-safe (no special Unicode) to avoid jsPDF Helvetica encoding artefacts.
 */

import jsPDF from 'jspdf';

export interface CoverConfig {
    /** Main document title, e.g. "LISTE DES TRAVAUX D'ECHAFAUDAGE" */
    title: string;
    /** Report category shown in the left panel, e.g. "LISTES SPECIALES" */
    category: string;
    /** Sub-category / type label shown below category, e.g. "LOGISTIQUE & ACCES" */
    subcategory: string;
    /** Short description / scope statement (one line) */
    description: string;
    /** Accent color for left panel and title underline [R,G,B] */
    accentColor: [number, number, number];
    /** Metadata rows shown in the lower section: label/value pairs */
    meta: { label: string; value: string }[];
    /** Shutdown / report reference date string */
    dateLabel?: string;
    /** Project / plant name shown at lower left */
    projectName?: string;
    /** Document classification, e.g. "CONFIDENTIEL" | "USAGE INTERNE" */
    classification?: string;
    /** Document reference code, e.g. "PLX-2026-SCF-001" */
    docRef?: string;
}

export const drawProfessionalCoverPage = (doc: jsPDF, cfg: CoverConfig): void => {
    const pw = doc.internal.pageSize.getWidth();  // 420mm (A3 landscape)
    const ph = doc.internal.pageSize.getHeight(); // 297mm

    const AC = cfg.accentColor;

    // ─────────────────────────────────────────────────────────────────────────
    // 1.  BACKGROUND
    // ─────────────────────────────────────────────────────────────────────────
    // Full page white/light base
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 0, pw, ph, 'F');

    // ─────────────────────────────────────────────────────────────────────────
    // 2.  LEFT DARK PANEL  (full height, 72mm wide)
    // ─────────────────────────────────────────────────────────────────────────
    const panelW = 72;
    doc.setFillColor(12, 18, 35);
    doc.rect(0, 0, panelW, ph, 'F');

    // Accent strip on right edge of panel
    doc.setFillColor(...AC);
    doc.rect(panelW - 3, 0, 3, ph, 'F');

    // PlanneX logo area at top of panel
    const logoY = 22;
    // Logo circle
    doc.setFillColor(...AC);
    doc.circle(panelW / 2 - 1.5, logoY, 11, 'F');
    doc.setFillColor(12, 18, 35);
    doc.circle(panelW / 2 - 1.5, logoY, 7, 'F');
    // P letter
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...AC);
    doc.text('P', panelW / 2 - 1.5, logoY + 4, { align: 'center' });

    // "PlanneX" text below logo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('PlanneX', panelW / 2 - 1.5, logoY + 17, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(...AC);
    doc.text('Intelligence Engine', panelW / 2 - 1.5, logoY + 22, { align: 'center' });

    // Thin divider
    doc.setDrawColor(30, 40, 65);
    doc.setLineWidth(0.3);
    doc.line(8, logoY + 28, panelW - 11, logoY + 28);

    // Category labels (rotated simulation: stacked centered text)
    const catY = 95;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...AC);
    // Split category into words for vertical stacking effect
    const catWords = cfg.category.split(' ');
    catWords.forEach((word, i) => {
        doc.text(word, panelW / 2 - 1.5, catY + i * 9, { align: 'center' });
    });

    // Subcategory label
    const subcatY = catY + catWords.length * 9 + 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 120, 155);
    const subcatWords = cfg.subcategory.split(' ');
    subcatWords.forEach((word, i) => {
        doc.text(word, panelW / 2 - 1.5, subcatY + i * 6.5, { align: 'center' });
    });

    // Diamond decorative element
    const dmY = ph / 2 + 10;
    doc.setFillColor(...AC);
    const dmS = 3;
    doc.line(panelW / 2 - 1.5, dmY - dmS, panelW / 2 - 1.5 + dmS, dmY);
    doc.line(panelW / 2 - 1.5 + dmS, dmY, panelW / 2 - 1.5, dmY + dmS);
    doc.line(panelW / 2 - 1.5, dmY + dmS, panelW / 2 - 1.5 - dmS, dmY);
    doc.line(panelW / 2 - 1.5 - dmS, dmY, panelW / 2 - 1.5, dmY - dmS);

    // Classification label near bottom of panel
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(80, 100, 130);
    const cls = (cfg.classification || 'USAGE INTERNE').toUpperCase();
    doc.text(cls, panelW / 2 - 1.5, ph - 18, { align: 'center', maxWidth: panelW - 16 });

    // Date in panel
    if (cfg.dateLabel) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(80, 100, 130);
        const dateStr = cfg.dateLabel.replace(/[éèêëàâïîùûç]/gi, c =>
            ({ é: 'e', è: 'e', ê: 'e', ë: 'e', à: 'a', â: 'a', ï: 'i', î: 'i', ù: 'u', û: 'u', ç: 'c' }[c] || c));
        doc.text(dateStr, panelW / 2 - 1.5, ph - 10, { align: 'center', maxWidth: panelW - 16 });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3.  RIGHT CONTENT AREA
    // ─────────────────────────────────────────────────────────────────────────
    const contentX = panelW + 20;
    const contentW = pw - panelW - 30;

    // ── TOP ACCENT BAR (full width of right area) ────────────────────────────
    doc.setFillColor(...AC);
    doc.rect(panelW, 0, pw - panelW, 3, 'F');

    // ── Document ref & generated date (top-right) ────────────────────────────
    const topInfoY = 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(120, 130, 150);
    if (cfg.docRef) {
        doc.text(`Ref: ${cfg.docRef}`, pw - 14, topInfoY, { align: 'right' });
    }
    const today = new Date();
    const genDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    doc.text(`Genere le: ${genDate}`, pw - 14, topInfoY + 7, { align: 'right' });

    // ── MAIN TITLE BLOCK (vertically centered in upper half) ─────────────────
    const titleCenterY = ph * 0.38;

    // Small overline label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...AC);
    const overline = `${cfg.category.toUpperCase()}  /  ${cfg.subcategory.toUpperCase()}`;
    doc.text(overline, contentX, titleCenterY - 30);

    // Thin horizontal rule under overline
    doc.setDrawColor(...AC);
    doc.setLineWidth(0.5);
    doc.line(contentX, titleCenterY - 26, contentX + 60, titleCenterY - 26);

    // Title (large, bold, dark)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(29);
    doc.setTextColor(12, 18, 35);
    const titleLines = doc.splitTextToSize(cfg.title.toUpperCase(), contentW);
    doc.text(titleLines, contentX, titleCenterY - 14);

    // Thick accent underline below title
    const titleH = titleLines.length * 16;
    const ulY = titleCenterY - 14 + titleH - 10;
    doc.setFillColor(...AC);
    doc.rect(contentX, ulY, 40, 2.5, 'F');
    doc.setFillColor(200, 210, 230);
    doc.rect(contentX + 42, ulY, contentW - 42, 0.5, 'F');

    // Description text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 95, 115);
    const safeDesc = cfg.description.replace(/[éèêëàâïîùûç—→]/gi, c =>
        ({ é: 'e', è: 'e', ê: 'e', ë: 'e', à: 'a', â: 'a', ï: 'i', î: 'i', ù: 'u', û: 'u', ç: 'c', '—': '-', '→': '->' }[c] || c));
    doc.text(safeDesc, contentX, ulY + 12);

    // ─────────────────────────────────────────────────────────────────────────
    // 4.  METADATA TABLE (lower section)
    // ─────────────────────────────────────────────────────────────────────────
    const metaStartY = ph * 0.60;

    // Section header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(120, 130, 150);
    doc.text('INFORMATIONS DU DOCUMENT', contentX, metaStartY - 3);
    doc.setDrawColor(200, 210, 230);
    doc.setLineWidth(0.3);
    doc.line(contentX, metaStartY, contentX + contentW, metaStartY);

    // Metadata rows (2-column layout: label | value)
    const rowH = 10;
    cfg.meta.forEach((row, i) => {
        const ry = metaStartY + 6 + i * rowH;
        // Alternate row shading
        if (i % 2 === 0) {
            doc.setFillColor(238, 242, 248);
            doc.rect(contentX, ry - 5, contentW, rowH, 'F');
        }
        // Label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(80, 95, 115);
        doc.text(row.label.toUpperCase(), contentX + 4, ry);
        // Separator dot
        doc.setTextColor(...AC);
        doc.text(':', contentX + 68, ry);
        // Value
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(12, 18, 35);
        const safeVal = row.value.replace(/[éèêëàâïîùûç—→]/gi, c =>
            ({ é: 'e', è: 'e', ê: 'e', ë: 'e', à: 'a', â: 'a', ï: 'i', î: 'i', ù: 'u', û: 'u', ç: 'c', '—': '-', '→': '->' }[c] || c));
        doc.text(safeVal, contentX + 72, ry, { maxWidth: contentW - 75 });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 5.  BOTTOM FOOTER BAR
    // ─────────────────────────────────────────────────────────────────────────
    // Thin gray separator line
    const footerY = ph - 20;
    doc.setDrawColor(200, 210, 230);
    doc.setLineWidth(0.3);
    doc.line(contentX, footerY, pw - 14, footerY);

    // Left: project name
    const proj = (cfg.projectName || 'Arret de Maintenance Industrielle').toUpperCase();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(12, 18, 35);
    doc.text(proj, contentX, footerY + 8);

    // Right: "Page de Couverture"
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(160, 170, 185);
    doc.text('Page de Couverture', pw - 14, footerY + 8, { align: 'right' });

    // Bottom accent line
    doc.setFillColor(...AC);
    doc.rect(panelW, ph - 2, pw - panelW, 2, 'F');

    // ─────────────────────────────────────────────────────────────────────────
    // 6.  DECORATIVE GEOMETRIC ELEMENT (bottom-right)
    // ─────────────────────────────────────────────────────────────────────────
    const geoX = pw - 55;
    const geoY = ph - 75;
    const geoAlpha = 0.06; // very subtle

    const drawGeoRect = (x: number, y: number, w: number, h: number, r: number, g: number, b: number) => {
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(0.4);
        doc.rect(x, y, w, h, 'S');
    };
    drawGeoRect(geoX, geoY, 38, 38, ...AC);
    drawGeoRect(geoX + 5, geoY + 5, 38, 38, ...AC);
    drawGeoRect(geoX + 10, geoY + 10, 38, 38, ...AC);
    doc.setFillColor(...AC);
    doc.circle(geoX + 38, geoY + 38, 6, 'F');

    // ─────────────────────────────────────────────────────────────────────────
    // 7.  ADD NEW PAGE so content starts fresh
    // ─────────────────────────────────────────────────────────────────────────
    doc.addPage();
};
