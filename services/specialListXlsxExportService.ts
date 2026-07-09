

import type { ScheduledTask, SchedulingTaskData } from '../types';

declare var XLSX: any;

const formatDate = (date: Date | null | undefined): string => {
    if (!date || isNaN(date.getTime())) return 'N/A';
    return date.toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

export const exportToXLSX = (tasks: (ScheduledTask | SchedulingTaskData)[], fileName: string, type: 'highRisk' | 'thr' | 'simops' | 'preparations' | 'shiftWork' | 'scaffolding' | 'handling' | 'pth' | 'pf' | 'pp' | 'pl' | 'pe') => {
    let data: any[] = [];

    if (type === 'highRisk') {
        data = (tasks as ScheduledTask[]).map(t => ({
            'Action': t.action,
            'OT': t.ot || '',
            'Avis': t.avis || '',
            'Équipement': t.equipment,
            'Famille': t.family,
            'Début': formatDate(t.startTime),
            'Fin': formatDate(t.endTime),
            'Personnel': t.manpower,
            'Durée (h)': t.duration.toFixed(2),
            'Risque': 'OUI'
        }));
    } else if (type === 'preparations') {
        const rows: any[] = [];
        tasks.forEach(t => {
            // Build combining text-based preparatifs and PDR items
            const lines: string[] = [];

            // 1. Text-based preparatifs
            const prepRaw = 'preparatifs' in t ? t.preparatifs : (t as any)['Préparatifs'];
            if (prepRaw && String(prepRaw).trim() !== '' && String(prepRaw).trim() !== '0') {
                String(prepRaw).split('<AND>').forEach(p => lines.push(`➢ ${p.trim()}`));
            }

            // 2. Attached readiness items (PDR, Consommables, Interchangeables)
            const pdrs = 'pdrItems' in t ? t.pdrItems : (t as any).pdrItems;
            if (pdrs && Array.isArray(pdrs) && pdrs.length > 0) {
                pdrs.forEach(p => lines.push(`▣ [${p.type || 'PDR'}] ${p.sparePart} (Qt: ${p.qty})`));
            }

            const prepText = lines.join('\n');

            const isScheduled = 'startTime' in t;
            if (isScheduled) {
                const st = t as ScheduledTask;
                rows.push({
                    'Équipement': st.equipment,
                    'Action': st.action,
                    'AVIS': st.avis || '',
                    'Préparatifs': prepText,
                    'Début Planifié': formatDate(st.startTime),
                    'Fin Planifiée': formatDate(st.endTime),
                    'Commentaire Terrain': ''
                });
            } else {
                const rt = t as SchedulingTaskData;
                rows.push({
                    'Équipement': rt['Nom Equipement'],
                    'Action': rt['GLOBAL TASKS'],
                    'AVIS': rt.AVIS || '',
                    'Préparatifs': prepText,
                    'Commentaire Terrain': ''
                });
            }
        });
        data = rows;
    } else if (['shiftWork', 'scaffolding', 'handling', 'pth', 'pf', 'pp', 'pl', 'pe', 'thr', 'simops'].includes(type)) {
        data = (tasks as ScheduledTask[]).map(t => ({
            'Action': t.action,
            'OT': t.ot || '',
            'Avis': t.avis || '',
            'Équipement': t.equipment,
            'Discipline': t.discipline,
            'Équipe': t.team,
            'Type de Maintenance': t.maintenanceType || '',
            'Début': formatDate(t.startTime),
            'Fin': formatDate(t.endTime),
            'Personnel': t.manpower,
            'Durée (h)': t.duration.toFixed(2)
        }));
    }

    if (data.length === 0) return;

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Liste");

    // Configure column widths
    const objectKeys = Object.keys(data[0]);
    worksheet["!cols"] = objectKeys.map(key => {
        if (key === 'Préparatifs') return { wch: 60 };
        if (key === 'Action') return { wch: 50 };
        if (key === 'Équipement') return { wch: 40 };

        const maxLen = data.reduce((acc, row) => {
            const val = String(row[key] || '');
            const lines = val.split('\n');
            const longestLine = Math.max(...lines.map(l => l.length));
            return Math.max(acc, longestLine);
        }, key.length);

        return { wch: Math.min(maxLen + 2, 50) };
    });

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
};