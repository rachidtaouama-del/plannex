
import React, { useState, useEffect, useMemo } from 'react';
import type { AppParameters, ScheduledTask } from '../types';

interface SpecialListFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (filter: { start: Date, end: Date } | null, newDateRange: { start: string, end: string }, customTitle?: string, selectedColumns?: string[]) => void;
    title: string;
    parameters: AppParameters;
    tasks: ScheduledTask[];
    allTasks?: ScheduledTask[];
    onDownloadFiltered: (tasks: ScheduledTask[], newDateRange: { start: string, end: string }, customTitle?: string, selectedColumns?: string[]) => Promise<void>;
    onDownloadXLSX: (tasks: ScheduledTask[], newDateRange: { start: string, end: string }) => void;
    initialRange: { start: string, end: string } | null;
    listType?: 'highRisk' | 'preparations' | 'scaffolding' | 'handling' | 'shiftWork' | 'pth' | 'pf' | 'pp' | 'pl' | 'pe' | 'thr' | 'simops' | null;
}

const toDateTimeLocal = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
};

const COLUMN_OPTIONS: Record<string, { key: string; label: string; default: boolean }[]> = {
    preparations: [
        { key: 'debut', label: 'Début', default: true },
        { key: 'fin', label: 'Fin', default: true },
        { key: 'equipment', label: 'Équipement', default: true },
        { key: 'action', label: 'Action', default: true },
        { key: 'avis', label: 'AVIS', default: true },
        { key: 'preparatifs', label: 'Préparatifs', default: true },
        { key: 'famille', label: 'Famille', default: false },
        { key: 'discipline', label: 'Discipline', default: false },
        { key: 'duree', label: 'Durée (H)', default: false },
        { key: 'effectif', label: 'Effectif', default: false },
        { key: 'col_type', label: 'Col PDR: Type', default: true },
        { key: 'col_qte', label: 'Col PDR: Qté', default: true },
        { key: 'col_unite', label: 'Col PDR: Unité', default: true },
        { key: 'col_statut', label: 'Col PDR: Statut', default: true },
        { key: 'kpi_taches_pdr', label: 'KPI: Tâches avec PDR', default: true },
        { key: 'kpi_pourcent', label: 'KPI: % du projet', default: true },
        { key: 'kpi_total_art', label: 'KPI: Total Articles', default: true },
        { key: 'kpi_pdr', label: 'KPI: PDR', default: true },
        { key: 'kpi_consom', label: 'KPI: Consommables', default: true },
        { key: 'kpi_inter', label: 'KPI: Interchangeables', default: true },
        { key: 'kpi_equipes', label: 'KPI: Équipes', default: true },
    ],
    highRisk: [
        { key: 'action', label: 'Action', default: true },
        { key: 'ot', label: 'OT', default: true },
        { key: 'avis', label: 'Avis', default: true },
        { key: 'equipment', label: 'Équipement', default: true },
        { key: 'team', label: 'Équipe', default: true },
        { key: 'debut', label: 'Début', default: true },
        { key: 'fin', label: 'Fin', default: true },
        { key: 'effectif', label: 'Pers.', default: true },
        { key: 'duree', label: 'Durée (h)', default: true },
        { key: 'famille', label: 'Famille', default: false },
        { key: 'discipline', label: 'Discipline', default: false },
    ],
    scaffolding: [
        { key: 'action', label: 'Action', default: true },
        { key: 'equipment', label: 'Équipement', default: true },
        { key: 'famille', label: 'Famille', default: true },
        { key: 'team', label: 'Équipe', default: true },
        { key: 'debut', label: 'Début', default: true },
        { key: 'fin', label: 'Fin', default: true },
        { key: 'duree', label: 'Durée (h)', default: true },
    ],
    handling: [
        { key: 'action', label: 'Action', default: true },
        { key: 'equipment', label: 'Équipement', default: true },
        { key: 'famille', label: 'Famille', default: true },
        { key: 'team', label: 'Équipe', default: true },
        { key: 'debut', label: 'Début', default: true },
        { key: 'fin', label: 'Fin', default: true },
        { key: 'duree', label: 'Durée (h)', default: true },
    ],
    shiftWork: [],
    pth: [
        { key: 'action', label: 'Action', default: true },
        { key: 'equipment', label: 'Équipement', default: true },
        { key: 'famille', label: 'Famille', default: true },
        { key: 'team', label: 'Équipe', default: true },
        { key: 'debut', label: 'Début', default: true },
        { key: 'fin', label: 'Fin', default: true },
        { key: 'duree', label: 'Durée (h)', default: true },
    ],
    pf: [
        { key: 'action', label: 'Action', default: true },
        { key: 'equipment', label: 'Équipement', default: true },
        { key: 'famille', label: 'Famille', default: true },
        { key: 'team', label: 'Équipe', default: true },
        { key: 'debut', label: 'Début', default: true },
        { key: 'fin', label: 'Fin', default: true },
        { key: 'duree', label: 'Durée (h)', default: true },
    ],
    pp: [
        { key: 'action', label: 'Action', default: true },
        { key: 'equipment', label: 'Équipement', default: true },
        { key: 'famille', label: 'Famille', default: true },
        { key: 'team', label: 'Équipe', default: true },
        { key: 'debut', label: 'Début', default: true },
        { key: 'fin', label: 'Fin', default: true },
        { key: 'duree', label: 'Durée (h)', default: true },
    ],
    pl: [
        { key: 'action', label: 'Action', default: true },
        { key: 'equipment', label: 'Équipement', default: true },
        { key: 'famille', label: 'Famille', default: true },
        { key: 'team', label: 'Équipe', default: true },
        { key: 'debut', label: 'Début', default: true },
        { key: 'fin', label: 'Fin', default: true },
        { key: 'duree', label: 'Durée (h)', default: true },
    ],
    pe: [
        { key: 'action', label: 'Action', default: true },
        { key: 'equipment', label: 'Équipement', default: true },
        { key: 'famille', label: 'Famille', default: true },
        { key: 'team', label: 'Équipe', default: true },
        { key: 'debut', label: 'Début', default: true },
        { key: 'fin', label: 'Fin', default: true },
        { key: 'duree', label: 'Durée (h)', default: true },
    ],
    thr: [
        { key: 'action', label: 'Action', default: true },
        { key: 'ot', label: 'OT', default: true },
        { key: 'equipment', label: 'Équipement', default: true },
        { key: 'team', label: 'Équipe', default: true },
        { key: 'debut', label: 'Début', default: true },
        { key: 'fin', label: 'Fin', default: true },
        { key: 'duree', label: 'Durée (h)', default: true },
        { key: 'discipline', label: 'Discipline', default: false },
    ],
    simops: [
        { key: 'action', label: 'Action', default: true },
        { key: 'ot', label: 'OT', default: true },
        { key: 'equipment', label: 'Équipement', default: true },
        { key: 'team', label: 'Équipe', default: true },
        { key: 'debut', label: 'Début', default: true },
        { key: 'fin', label: 'Fin', default: true },
    ],
};

const DEFAULT_TITLES: Record<string, string> = {
    preparations: 'Liste des Préparatifs',
    highRisk: 'LISTE DES TÂCHES À HAUT RISQUE',
    thr: 'LISTE THR — TRAVAUX À HAUT RISQUE',
    simops: 'RAPPORT SIMOPS — OPÉRATIONS SIMULTANÉES',
    scaffolding: "LISTE DES TRAVAUX D'ÉCHAFAUDAGE",
    handling: 'LISTE DES TÂCHES DE MANUTENTION',
    shiftWork: 'LISTE DES TÂCHES SHIFT',
    pth: 'LISTE PERMIS TRAVAIL HAUTEUR',
    pf: 'LISTE PERMIS FEU',
    pp: 'LISTE PERMIS PÉNÉTRATION',
    pl: 'LISTE PERMIS LEVAGE',
    pe: 'LISTE PERMIS EXCAVATION',
};

// Per-type accent palette
const TYPE_PALETTE: Record<string, { accent: string; accentText: string; accentBg: string; accentBorder: string; glow: string; icon: React.ReactNode }> = {
    preparations: {
        accent: '#10b981', accentText: 'text-emerald-400', accentBg: 'bg-emerald-500/15', accentBorder: 'border-emerald-500/30',
        glow: 'bg-emerald-500',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></svg>,
    },
    highRisk: {
        accent: '#ef4444', accentText: 'text-red-400', accentBg: 'bg-red-500/15', accentBorder: 'border-red-500/30',
        glow: 'bg-red-500',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>,
    },
    thr: {
        accent: '#ef4444', accentText: 'text-red-400', accentBg: 'bg-red-500/15', accentBorder: 'border-red-500/30',
        glow: 'bg-red-500',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>,
    },
    scaffolding: {
        accent: '#06b6d4', accentText: 'text-cyan-400', accentBg: 'bg-cyan-500/15', accentBorder: 'border-cyan-500/30',
        glow: 'bg-cyan-500',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>,
    },
    handling: {
        accent: '#818cf8', accentText: 'text-indigo-400', accentBg: 'bg-indigo-500/15', accentBorder: 'border-indigo-500/30',
        glow: 'bg-indigo-500',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></svg>,
    },
    shiftWork: {
        accent: '#3b82f6', accentText: 'text-blue-400', accentBg: 'bg-blue-500/15', accentBorder: 'border-blue-500/30',
        glow: 'bg-blue-500',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    },
    pth: {
        accent: '#ef4444', accentText: 'text-red-400', accentBg: 'bg-red-500/15', accentBorder: 'border-red-500/30',
        glow: 'bg-red-600',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22V12" /><path d="m15 3-3 9-3-9" /><path d="M6 6h12" /></svg>,
    },
    pf: {
        accent: '#f97316', accentText: 'text-orange-400', accentBg: 'bg-orange-500/15', accentBorder: 'border-orange-500/30',
        glow: 'bg-orange-500',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>,
    },
    pp: {
        accent: '#a855f7', accentText: 'text-purple-400', accentBg: 'bg-purple-500/15', accentBorder: 'border-purple-500/30',
        glow: 'bg-purple-500',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>,
    },
    pl: {
        accent: '#3b82f6', accentText: 'text-blue-400', accentBg: 'bg-blue-500/15', accentBorder: 'border-blue-500/30',
        glow: 'bg-blue-600',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M2 12h20" /></svg>,
    },
    pe: {
        accent: '#f59e0b', accentText: 'text-amber-400', accentBg: 'bg-amber-500/15', accentBorder: 'border-amber-500/30',
        glow: 'bg-amber-500',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m2 22 1-1h3l9-9" /><path d="M3 21v-3l9-9" /><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8-2.4 2.4-1-1 3.4-3.4" /></svg>,
    },
    simops: {
        accent: '#eab308', accentText: 'text-yellow-400', accentBg: 'bg-yellow-500/15', accentBorder: 'border-yellow-500/30',
        glow: 'bg-yellow-500',
        icon: <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>,
    },
};

const defaultPalette = TYPE_PALETTE.shiftWork;

export const SpecialListFilterModal: React.FC<SpecialListFilterModalProps> = ({
    isOpen, onClose, onApply, title, parameters, tasks, allTasks,
    onDownloadFiltered, onDownloadXLSX, initialRange, listType
}) => {
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [customTitle, setCustomTitle] = useState('');
    const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

    const isShiftWork = listType === 'shiftWork';
    const isPreparations = listType === 'preparations';
    const isHighRisk = listType === 'highRisk' || listType === 'thr';
    const isScaffolding = listType === 'scaffolding';
    const isHandling = listType === 'handling';
    const isPermit = ['pth', 'pf', 'pp', 'pl', 'pe'].includes(listType as string);
    const hasAdvancedOptions = isPreparations || isHighRisk || isScaffolding || isHandling || isPermit;

    const palette = (listType && TYPE_PALETTE[listType]) ? TYPE_PALETTE[listType] : defaultPalette;

    const prevListType = React.useRef<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (initialRange) {
                setRangeStart(initialRange.start);
                setRangeEnd(initialRange.end);
            } else if (parameters) {
                setRangeStart(toDateTimeLocal(parameters.shutdownStart));
                setRangeEnd(toDateTimeLocal(parameters.shutdownEnd));
            }
            if (listType !== prevListType.current) {
                if (listType && DEFAULT_TITLES[listType]) setCustomTitle(DEFAULT_TITLES[listType]);
                if (listType && COLUMN_OPTIONS[listType]) {
                    setSelectedColumns(COLUMN_OPTIONS[listType].filter(c => c.default).map(c => c.key));
                }
                prevListType.current = listType || null;
            }
        }
    }, [isOpen, initialRange, parameters, listType]);

    const filteredTasks = useMemo(() => {
        if (!rangeStart || !rangeEnd) return [];
        try {
            const start = new Date(rangeStart).getTime();
            const end = new Date(rangeEnd).getTime();
            if (isNaN(start) || isNaN(end) || end < start) return [];
            return tasks.filter(t => t.startTime.getTime() < end && t.endTime.getTime() > start);
        } catch { return []; }
    }, [tasks, rangeStart, rangeEnd]);

    const totalHH = useMemo(() => filteredTasks.reduce((s, t) => s + t.duration * t.manpower, 0), [filteredTasks]);
    const teamsSet = useMemo(() => new Set(filteredTasks.map(t => t.team).filter(Boolean)), [filteredTasks]);

    if (!isOpen) return null;

    const handleApplyFiltered = () => {
        if (!rangeStart || !rangeEnd) { alert('Veuillez sélectionner une plage de dates valide.'); return; }
        const start = new Date(rangeStart);
        const end = new Date(rangeEnd);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) { alert('La plage de dates est invalide.'); return; }
        onApply({ start, end }, { start: rangeStart, end: rangeEnd }, customTitle, selectedColumns.length > 0 ? selectedColumns : undefined);
    };

    const handleApplyAll = () => {
        const s = toDateTimeLocal(parameters.shutdownStart);
        const e = toDateTimeLocal(parameters.shutdownEnd);
        onApply(null, { start: s, end: e }, customTitle, selectedColumns.length > 0 ? selectedColumns : undefined);
    };

    const handleDownload = async () => {
        if (!rangeStart || !rangeEnd) { alert('Veuillez sélectionner une plage de dates valide.'); return; }
        setIsDownloading(true);
        try { await onDownloadFiltered(filteredTasks, { start: rangeStart, end: rangeEnd }, customTitle, selectedColumns.length > 0 ? selectedColumns : undefined); }
        catch { alert('Une erreur est survenue pendant le téléchargement.'); }
        finally { setIsDownloading(false); }
    };

    const handleDownloadXlsxClick = () => {
        if (!rangeStart || !rangeEnd) { alert('Veuillez sélectionner une plage de dates valide.'); return; }
        onDownloadXLSX(filteredTasks, { start: rangeStart, end: rangeEnd });
    };

    const toggleColumn = (key: string) =>
        setSelectedColumns(prev => prev.includes(key) ? prev.filter(c => c !== key) : [...prev, key]);

    const columnOptions = listType ? COLUMN_OPTIONS[listType] || [] : [];

    // Short subtitle
    const subtitle = listType === 'preparations' ? 'Gestion des Préparatifs'
        : listType === 'scaffolding' ? 'Logistique Structural'
            : listType === 'handling' ? 'Opérations de Manutention'
                : listType === 'shiftWork' ? 'Organisation par Quart'
                    : listType === 'pth' ? 'Permis Travail en Hauteur'
                        : listType === 'pf' ? 'Permis de Feu'
                            : listType === 'pp' ? 'Permis de Pénétration'
                                : listType === 'pl' ? 'Permis de Levage'
                                    : listType === 'pe' ? 'Permis d\'Excavation'
                                        : listType === 'thr' || listType === 'highRisk' ? 'Travaux à Haut Risque'
                                            : listType === 'simops' ? 'Opérations Simultanées'
                                                : 'Configuration';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/75 backdrop-blur-xl" />

            <div
                className="relative w-full max-w-3xl bg-[#080d1a] border border-white/[0.07] rounded-3xl shadow-[0_30px_80px_rgba(0,0,0,0.7)] flex flex-col max-h-[92vh] overflow-hidden"
                style={{ animation: 'modalIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Top accent shimmer line */}
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${palette.accent}80, transparent)` }} />
                {/* Ambient glow top-right */}
                <div className={`absolute top-0 right-0 w-72 h-72 ${palette.glow}/10 blur-[80px] rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none`} />

                {/* ── HEADER ────────────────────────────────────────────────── */}
                <header className="relative flex items-start justify-between px-8 pt-8 pb-6 flex-shrink-0">
                    <div className="flex items-start gap-4">
                        {/* Icon badge */}
                        <div className={`flex-shrink-0 p-3 rounded-2xl ${palette.accentBg} border ${palette.accentBorder}`} style={{ color: palette.accent }}>
                            {palette.icon}
                        </div>
                        <div>
                            <p className={`text-[9px] font-black uppercase tracking-[0.5em] ${palette.accentText} mb-1`}>{subtitle}</p>
                            <h2 className="text-2xl font-black text-white leading-tight tracking-tight">{title}</h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex-shrink-0 ml-4 w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-all border border-white/5"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </header>

                {/* Divider */}
                <div className="mx-8 h-px bg-white/[0.05]" />

                {/* ── BODY ──────────────────────────────────────────────────── */}
                <main className="flex-1 overflow-y-auto px-8 py-6 space-y-5 tactical-scrollbar">

                    {/* Live stats strip */}
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { v: filteredTasks.length, l: 'Tâches filtrées', col: palette.accent },
                            { v: totalHH.toFixed(1) + ' h', l: 'Charge H-H', col: '#94a3b8' },
                            { v: teamsSet.size, l: 'Équipes', col: '#94a3b8' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white/[0.03] border border-white/[0.06] rounded-2xl px-4 py-3 flex flex-col gap-1">
                                <span className="text-xl font-black" style={{ color: s.col }}>{s.v}</span>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{s.l}</span>
                            </div>
                        ))}
                    </div>

                    {/* PDF Title field */}
                    {(hasAdvancedOptions || isShiftWork) && (
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">
                                Titre du rapport PDF
                            </label>
                            <input
                                type="text"
                                value={customTitle}
                                onChange={e => setCustomTitle(e.target.value)}
                                className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white font-semibold focus:outline-none transition-all placeholder:text-slate-600"
                                style={{ '--tw-ring-color': palette.accent } as React.CSSProperties}
                                onFocus={e => e.target.style.borderColor = palette.accent + '60'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                placeholder="Titre du rapport..."
                            />
                        </div>
                    )}

                    {/* Date Range */}
                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={palette.accent} strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Plage de dates</label>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">Début</label>
                                <input
                                    id="range-start-special"
                                    type="datetime-local"
                                    value={rangeStart}
                                    onChange={e => setRangeStart(e.target.value)}
                                    className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-all"
                                    onFocus={e => e.target.style.borderColor = palette.accent + '60'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                />
                            </div>
                            <div>
                                <label className="block text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2">Fin</label>
                                <input
                                    id="range-end-special"
                                    type="datetime-local"
                                    value={rangeEnd}
                                    onChange={e => setRangeEnd(e.target.value)}
                                    className="w-full bg-black/30 border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none transition-all"
                                    onFocus={e => e.target.style.borderColor = palette.accent + '60'}
                                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Column selection */}
                    {hasAdvancedOptions && columnOptions.length > 0 && (
                        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={palette.accent} strokeWidth="2.5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Colonnes du rapport</label>
                                </div>
                                <span className="text-[9px] font-bold text-slate-600">{selectedColumns.length}/{columnOptions.length} sélectionnées</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {columnOptions.map(col => {
                                    const active = selectedColumns.includes(col.key);
                                    return (
                                        <button
                                            key={col.key}
                                            onClick={() => toggleColumn(col.key)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-200 border ${active
                                                ? `${palette.accentBg} ${palette.accentBorder} ${palette.accentText}`
                                                : 'bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/20'
                                                }`}
                                        >
                                            {active && (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                            )}
                                            {col.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </main>

                {/* ── FOOTER ────────────────────────────────────────────────── */}
                <div className="mx-8 h-px bg-white/[0.05]" />
                <footer className="flex items-center justify-between px-8 py-5 gap-3 flex-shrink-0">
                    {/* "Show all" ghost button */}
                    <button
                        onClick={handleApplyAll}
                        className="text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.06] transition-all"
                    >
                        {isShiftWork ? 'Toutes les Tâches' : 'Toute la liste'}
                    </button>

                    <div className="flex items-center gap-2">
                        {/* XLSX */}
                        {!isShiftWork && (
                            <button
                                onClick={handleDownloadXlsxClick}
                                disabled={filteredTasks.length === 0}
                                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                Excel
                            </button>
                        )}
                        {/* PDF */}
                        <button
                            onClick={handleDownload}
                            disabled={isDownloading || filteredTasks.length === 0}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-600/60 text-slate-300 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            {isDownloading ? (
                                <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                            )}
                            PDF
                        </button>
                        {/* Primary CTA */}
                        <button
                            onClick={handleApplyFiltered}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-6 py-2.5 rounded-xl text-white transition-all shadow-lg"
                            style={{ background: `linear-gradient(135deg, ${palette.accent}, ${palette.accent}cc)`, boxShadow: `0 0 20px ${palette.accent}40` }}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                            Afficher ({filteredTasks.length})
                        </button>
                    </div>
                </footer>
            </div>
            <style>{`@keyframes modalIn{from{opacity:0;transform:scale(0.96) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
        </div>
    );
};
