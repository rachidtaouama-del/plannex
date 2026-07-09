
import React, { useState, useEffect, useMemo } from 'react';
import type { AppParameters, CalculationResults } from '../types';
import { MultiSelectDropdown } from './MultiSelectDropdown';

interface GanttSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'view' | 'export';
    onExport: (title: string, order: string[], options: { timelineUnit: 'Heures' | 'Jours' | 'Semaines' | 'Mois' | 'Années', timelineInterval: number, showChronology: boolean }, exportConfig: { mode: 'global' | 'range' | 'batch', range?: { start: Date, end: Date }, batch?: { cycleStartTime: string, ignoreEmptyDays: boolean } }, contentFilters?: { maintenanceType?: string[], discipline?: string[], manpower?: number }) => Promise<void>;
    onShare: (title: string, order: string[], options: { timelineUnit: 'Heures' | 'Jours' | 'Semaines' | 'Mois' | 'Années', timelineInterval: number, showChronology: boolean }, exportConfig: { mode: 'global' | 'range' | 'batch', range?: { start: Date, end: Date } }, contentFilters?: { maintenanceType?: string[], discipline?: string[], manpower?: number }) => Promise<void>;
    onView: (order: string[]) => void;
    title: string;
    setTitle: (title: string) => void;
    familyOrder: string[];
    setFamilyOrder: (order: string[]) => void;
    parameters: AppParameters;
    results: CalculationResults;
}

export const GanttSettingsModal: React.FC<GanttSettingsModalProps> = ({
    isOpen, onClose, mode, onExport, onShare, onView,
    title, setTitle, familyOrder, setFamilyOrder, parameters, results
}) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [orderInputs, setOrderInputs] = useState<Record<string, string>>({});
    const [localFamilyOrder, setLocalFamilyOrder] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [timelineUnit, setTimelineUnit] = useState<'Heures' | 'Jours' | 'Semaines' | 'Mois' | 'Années'>('Heures');
    const [timelineInterval, setTimelineInterval] = useState(4);
    const [filterMode, setFilterMode] = useState<'global' | 'range' | 'batch'>('global');
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    const [cycleStartTime, setCycleStartTime] = useState('06:00');
    const [ignoreEmptyDays, setIgnoreEmptyDays] = useState(true);
    const [maintTypeFilter, setMaintTypeFilter] = useState<string[]>([]);
    const [disciplineFilter, setDisciplineFilter] = useState<string[]>([]);
    const [manpowerFilter, setManpowerFilter] = useState<string>('');
    const [showChronology, setShowChronology] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (Object.keys(orderInputs).length === 0) setLocalFamilyOrder(familyOrder);
            setSearchTerm('');
            setFilterMode('global');
            setMaintTypeFilter([]);
            setDisciplineFilter([]);
            setManpowerFilter('');
            setShowChronology(false);
            const toDateTimeLocal = (d: string) => {
                const date = new Date(d);
                return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            };
            setRangeStart(toDateTimeLocal(parameters.shutdownStart));
            setRangeEnd(toDateTimeLocal(parameters.shutdownEnd));
        }
    }, [isOpen, familyOrder, parameters]);

    const uniqueMaintenanceTypes = useMemo(() => {
        const s = new Set<string>();
        results.scheduledTasks.forEach(t => { if (t.maintenanceType) s.add(t.maintenanceType); });
        return Array.from(s).sort();
    }, [results.scheduledTasks]);

    const uniqueDisciplines = useMemo(() => {
        const s = new Set<string>();
        results.scheduledTasks.forEach(t => { const d = t.discipline || t.team.split(' ')[0] || t.team; if (d) s.add(d); });
        return Array.from(s).sort();
    }, [results.scheduledTasks]);

    useEffect(() => {
        if (!isOpen || mode === 'view') return;
        let base = title.split(' - ')[0];
        if (!base.toLowerCase().includes('gantt')) base = 'Gantt de Maintenance';
        let suffix = '';
        if (disciplineFilter.length === 1) suffix = ` - ${disciplineFilter[0].toUpperCase()}`;
        else if (disciplineFilter.length > 1) suffix = ' - MULTI-DISCIPLINES';
        if (maintTypeFilter.length === 1) {
            const lbl = maintTypeFilter[0].includes('PREV') ? 'PRÉVENTIVE' : maintTypeFilter[0].includes('CORR') ? 'CORRECTIVE' : maintTypeFilter[0].toUpperCase();
            suffix += ` (${lbl})`;
        } else if (maintTypeFilter.length > 1) suffix += ' (MULTI-TYPES)';
        setTitle(base + suffix);
    }, [disciplineFilter, maintTypeFilter, isOpen, mode, setTitle]);

    const filteredTasksCount = useMemo(() => {
        let tasks = results.scheduledTasks;
        if (filterMode === 'range' && rangeStart && rangeEnd) {
            const s = new Date(rangeStart).getTime(), e = new Date(rangeEnd).getTime();
            tasks = tasks.filter(t => t.startTime.getTime() < e && t.endTime.getTime() > s);
        }
        if (maintTypeFilter.length > 0) tasks = tasks.filter(t => t.maintenanceType && maintTypeFilter.includes(t.maintenanceType));
        if (disciplineFilter.length > 0) tasks = tasks.filter(t => disciplineFilter.includes(t.discipline || t.team.split(' ')[0] || t.team));
        if (manpowerFilter !== '') { const mp = parseInt(manpowerFilter, 10); if (!isNaN(mp)) tasks = tasks.filter(t => t.manpower === mp); }
        return tasks.length;
    }, [results.scheduledTasks, filterMode, rangeStart, rangeEnd, maintTypeFilter, disciplineFilter, manpowerFilter]);

    const relevantFamilies = useMemo(() => {
        if (maintTypeFilter.length === 0 && disciplineFilter.length === 0 && manpowerFilter === '') return localFamilyOrder;
        const active = new Set<string>();
        results.scheduledTasks.forEach(t => {
            let match = true;
            if (maintTypeFilter.length > 0 && (!t.maintenanceType || !maintTypeFilter.includes(t.maintenanceType))) match = false;
            if (match && disciplineFilter.length > 0 && !disciplineFilter.includes(t.discipline || t.team.split(' ')[0] || t.team)) match = false;
            if (match && manpowerFilter !== '') { const mp = parseInt(manpowerFilter, 10); if (!isNaN(mp) && t.manpower !== mp) match = false; }
            if (match) active.add(t.family);
        });
        return localFamilyOrder.filter(f => active.has(f));
    }, [localFamilyOrder, maintTypeFilter, disciplineFilter, manpowerFilter, results.scheduledTasks]);

    const nextAvailableNumber = useMemo(() => {
        const nums = Object.values(orderInputs).map(v => parseInt(v, 10)).filter(n => !isNaN(n));
        return nums.length === 0 ? 1 : Math.max(...nums) + 1;
    }, [orderInputs]);

    const stats = useMemo(() => ({
        tasks: results.scheduledTasks.length,
        families: new Set(results.scheduledTasks.map(t => t.family)).size,
        disciplines: uniqueDisciplines.length,
        totalMH: results.scheduledTasks.reduce((s, t) => s + t.manHours, 0).toFixed(0),
    }), [results, uniqueDisciplines]);

    if (!isOpen) return null;

    const handleOrderChange = (family: string, value: string) => {
        const ni = { ...orderInputs, [family]: value.replace(/[^0-9]/g, '') };
        setOrderInputs(ni);
        const sorted = [...localFamilyOrder].sort((a, b) => {
            const nA = ni[a] ? parseInt(ni[a], 10) : Infinity;
            const nB = ni[b] ? parseInt(ni[b], 10) : Infinity;
            if (nA !== Infinity && nB !== Infinity) return nA === nB ? a.localeCompare(b) : nA - nB;
            if (nA !== Infinity) return -1; if (nB !== Infinity) return 1;
            return a.localeCompare(b);
        });
        setLocalFamilyOrder(sorted);
    };

    const handleResetOrder = () => {
        setOrderInputs({});
        setLocalFamilyOrder([...localFamilyOrder].sort((a, b) => a.localeCompare(b)));
    };

    const handleAction = async (actionType: 'download' | 'share' | 'view') => {
        const finalOrder = localFamilyOrder;
        setFamilyOrder(finalOrder);
        if (actionType === 'view') { onView(finalOrder); return; }
        const isDownload = actionType === 'download';
        if (isDownload) setIsDownloading(true); else setIsSharing(true);
        try {
            const exportConfig: any = { mode: filterMode };
            if (filterMode === 'range') {
                if (!rangeStart || !rangeEnd) { alert('Veuillez sélectionner une plage de dates valide.'); return; }
                exportConfig.range = { start: new Date(rangeStart), end: new Date(rangeEnd) };
            } else if (filterMode === 'batch') {
                exportConfig.batch = { cycleStartTime, ignoreEmptyDays };
            }
            const contentFilters = {
                maintenanceType: maintTypeFilter.length > 0 ? maintTypeFilter : undefined,
                discipline: disciplineFilter.length > 0 ? disciplineFilter : undefined,
                manpower: manpowerFilter ? parseInt(manpowerFilter, 10) : undefined
            };
            const options = { timelineUnit, timelineInterval, showChronology };
            if (isDownload) {
                await onExport(title, finalOrder, options, exportConfig, contentFilters);
            } else {
                if (filterMode === 'batch') { alert("Partage non supporté en mode Batch."); return; }
                if (!navigator.share) { alert("Partage non supporté sur ce navigateur."); return; }
                await onShare(title, finalOrder, options, exportConfig, contentFilters);
            }
        } catch (e) {
            console.error(`Failed to ${actionType} PDF:`, e);
            if (e instanceof Error) alert(`Erreur: ${e.message}`);
        } finally {
            if (isDownload) setIsDownloading(false); else setIsSharing(false);
        }
    };

    const isProcessing = isDownloading || isSharing;
    const isViewMode = mode === 'view';

    const filterModes = [
        { id: 'global', label: 'Scope Global', sub: 'Cycle complet de l\'arrêt', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20" /></svg> },
        { id: 'range', label: 'Fenêtre Précise', sub: 'Plage horaire ciblée', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> },
        { id: 'batch', label: 'Génération Automate', sub: 'Archive ZIP par cycle', icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg> },
    ] as const;

    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex justify-center items-start z-[100] p-4 overflow-y-auto">
            <style>{`
                .gs-scroll::-webkit-scrollbar { width: 4px; }
                .gs-scroll::-webkit-scrollbar-track { background: transparent; }
                .gs-scroll::-webkit-scrollbar-thumb { background: rgba(6,182,212,0.25); border-radius:10px; }
                .gs-scroll::-webkit-scrollbar-thumb:hover { background: rgba(6,182,212,0.5); }
                .gs-scroll { scrollbar-width:thin; scrollbar-color:rgba(6,182,212,0.25) transparent; }
                @keyframes slideUp { from{opacity:0;transform:translateY(24px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
                .gs-enter { animation: slideUp 0.35s cubic-bezier(0.16,1,0.3,1); }
            `}</style>

            <div
                className="gs-enter bg-[#070d1a] w-full max-w-5xl my-4 rounded-2xl border border-white/[0.06] shadow-[0_32px_80px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* ── TOP ACCENT ── */}
                <div className="h-[2px] bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-500 flex-shrink-0" />

                {/* ── HEADER ── */}
                <header className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06] bg-[#080d1c] flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'radial-gradient(circle at 30% 30%, rgba(6,182,212,0.25), rgba(6,182,212,0.06))', border: '1px solid rgba(6,182,212,0.2)', boxShadow: '0 0 24px rgba(6,182,212,0.1)' }}>
                            {isViewMode
                                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-cyan-400"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-cyan-400"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                            }
                        </div>
                        <div>
                            <h2 className="text-[15px] font-black text-white tracking-wide uppercase leading-tight">
                                {isViewMode ? 'Studio Gantt — Configuration' : 'Centre d\'Exportation Gantt'}
                            </h2>
                            <p className="text-[10px] font-semibold text-cyan-500/70 uppercase tracking-[0.2em] mt-0.5">Moteur de Rendu Tactique v4.5 — Famille & Discipline</p>
                        </div>
                    </div>

                    {/* Stat pills */}
                    {!isViewMode && (
                        <div className="hidden md:flex items-center gap-2">
                            {[
                                { l: 'TÂCHES', v: stats.tasks, c: 'text-emerald-400' },
                                { l: 'FAMILLES', v: stats.families, c: 'text-cyan-400' },
                                { l: 'DISCIPLINES', v: stats.disciplines, c: 'text-violet-400' },
                                { l: 'H-H TOTAL', v: stats.totalMH, c: 'text-orange-400' },
                            ].map(s => (
                                <div key={s.l} className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                                    <span className={`text-base font-black leading-none ${s.c}`}>{s.v}</span>
                                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{s.l}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        {isViewMode ? (
                            <button onClick={() => handleAction('view')} disabled={isProcessing}
                                className="px-6 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-white"
                                style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)', boxShadow: '0 4px 20px rgba(8,145,178,0.3)' }}>
                                Afficher le Projet
                            </button>
                        ) : (
                            <>
                                <button onClick={() => handleAction('share')} disabled={isProcessing || !navigator.share || filterMode === 'batch'}
                                    className="px-4 py-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-slate-300 text-[11px] font-bold uppercase tracking-wider transition-all border border-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                                    {isSharing ? 'Partage...' : 'Partager'}
                                </button>
                                <button onClick={() => handleAction('download')} disabled={isProcessing || (filterMode !== 'batch' && filteredTasksCount === 0)}
                                    className="flex items-center gap-2.5 px-6 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ background: 'linear-gradient(135deg,#0891b2,#059669)', boxShadow: '0 4px 20px rgba(8,145,178,0.3)' }}>
                                    {isDownloading
                                        ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Génération...</>
                                        : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                                            {filterMode === 'batch' ? 'Télécharger Archive (.zip)' : `Export PDF (${filteredTasksCount})`}</>
                                    }
                                </button>
                            </>
                        )}
                        <button onClick={onClose}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-red-500/10 transition-all border border-white/[0.06] hover:border-red-500/30">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                    </div>
                </header>

                {/* ── BODY ── */}
                <main className="gs-scroll overflow-y-auto flex-1 max-h-[calc(100vh-180px)]">
                    <div className="p-7 space-y-5">

                        {!isViewMode && (
                            <>
                                {/* TITLE */}
                                <section>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Titre du Rapport</label>
                                    <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                                        className="w-full rounded-xl px-4 py-3 text-white text-[13px] font-semibold bg-[#0d1525] border border-white/[0.08] focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all placeholder:text-slate-600"
                                        placeholder="Ex: Gantt de Maintenance par Famille — Arrêt 2026..." />
                                </section>

                                {/* CONTENT FILTERS */}
                                <section className="bg-[#0d1525] rounded-xl border border-white/[0.06] overflow-hidden">
                                    <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                                        <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-cyan-400"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>
                                        </div>
                                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.25em]">Filtrage du Contenu</h3>
                                        <span className="ml-auto px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[8px] font-black rounded border border-emerald-500/20 uppercase tracking-widest">Auto-Sync</span>
                                    </div>
                                    <div className="p-5 grid grid-cols-3 gap-4">
                                        {[
                                            {
                                                label: 'Discipline', dot: 'bg-blue-500',
                                                body: <MultiSelectDropdown options={uniqueDisciplines} selected={disciplineFilter} onChange={setDisciplineFilter} placeholder="Flux Intégral" />
                                            },
                                            {
                                                label: 'Typologie Maint.', dot: 'bg-orange-500',
                                                body: <MultiSelectDropdown options={uniqueMaintenanceTypes} selected={maintTypeFilter} onChange={setMaintTypeFilter} placeholder="Tous les protocoles" />
                                            },
                                            {
                                                label: 'Effectif Seuil', dot: 'bg-violet-500',
                                                body: <input type="number" value={manpowerFilter} onChange={e => setManpowerFilter(e.target.value)}
                                                    placeholder="Standard"
                                                    className="w-full bg-black/30 border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-600" />
                                            },
                                        ].map((f, i) => (
                                            <div key={i}>
                                                <label className="flex items-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />
                                                    {f.label}
                                                </label>
                                                {f.body}
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* TEMPORAL SCOPE */}
                                <section>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Fenêtre Temporelle du Rapport</p>
                                    <div className="grid grid-cols-3 gap-3">
                                        {filterModes.map(m => (
                                            <button key={m.id} onClick={() => setFilterMode(m.id as any)}
                                                className={`relative flex flex-col text-left p-5 rounded-xl border transition-all duration-300 group overflow-hidden ${filterMode === m.id ? 'bg-cyan-500/[0.07] border-cyan-500/40' : 'bg-[#0d1525] border-white/[0.06] hover:border-white/[0.14]'}`}>
                                                {filterMode === m.id && <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />}
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-all ${filterMode === m.id ? 'bg-cyan-500 text-white' : 'bg-white/[0.05] text-slate-500 group-hover:text-slate-300'}`}>
                                                    {m.icon}
                                                </div>
                                                <div className={`text-[11px] font-black uppercase tracking-wide mb-1 ${filterMode === m.id ? 'text-cyan-400' : 'text-slate-400'}`}>{m.label}</div>
                                                <div className="text-[9px] text-slate-600 font-medium">{m.sub}</div>
                                                {filterMode === m.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-emerald-500" />}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Inline config per mode */}
                                    <div className="mt-3 bg-[#0d1525] rounded-xl border border-white/[0.06] p-5 min-h-[72px] flex items-center">
                                        {filterMode === 'global' && (
                                            <div className="flex items-center gap-4 w-full">
                                                <div className="w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center flex-shrink-0">
                                                    <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full animate-pulse" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-white uppercase tracking-wide">Flux de Données Intégral</div>
                                                    <p className="text-[10px] text-slate-500 mt-0.5">La totalité de la chronologie projet — sans aucune coupure logique.</p>
                                                </div>
                                            </div>
                                        )}
                                        {filterMode === 'range' && (
                                            <div className="grid grid-cols-2 gap-5 w-full">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500" /><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Activation Flux</span></div>
                                                    <input type="datetime-local" value={rangeStart} onChange={e => setRangeStart(e.target.value)} className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-cyan-500/50 transition-all" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500" /><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cessation Flux</span></div>
                                                    <input type="datetime-local" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-cyan-500/50 transition-all" />
                                                </div>
                                            </div>
                                        )}
                                        {filterMode === 'batch' && (
                                            <div className="grid grid-cols-2 gap-5 w-full">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Start-Point Relatif (Cycle)</p>
                                                    <input type="time" value={cycleStartTime} onChange={e => setCycleStartTime(e.target.value)}
                                                        className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-orange-400 font-black text-center outline-none focus:border-orange-500/50 transition-all" />
                                                </div>
                                                <label className="flex items-center gap-3 cursor-pointer bg-black/20 rounded-lg px-4 py-2.5 border border-white/[0.05] hover:bg-white/[0.04] transition-all">
                                                    <div className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${ignoreEmptyDays ? 'bg-orange-600' : 'bg-slate-700'}`}>
                                                        <input type="checkbox" className="sr-only" checked={ignoreEmptyDays} onChange={e => setIgnoreEmptyDays(e.target.checked)} />
                                                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${ignoreEmptyDays ? 'left-5' : 'left-0.5'}`} />
                                                    </div>
                                                    <div>
                                                        <span className="block text-[10px] font-black text-white uppercase tracking-wider">Optimisation Énergie</span>
                                                        <span className="text-[9px] text-slate-500">Exclure les cycles inactifs</span>
                                                    </div>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* OPTIONS ROW */}
                                <section className="grid grid-cols-2 gap-4">
                                    {/* Timeline resolution */}
                                    <div className="bg-[#0d1525] rounded-xl border border-white/[0.06] p-4">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Résolution Temporelle</p>
                                        <div className="flex gap-3">
                                            <select value={timelineUnit} onChange={e => setTimelineUnit(e.target.value as any)}
                                                className="flex-1 bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white font-bold outline-none focus:border-cyan-500/50 transition-all">
                                                <option value="Heures">Heures</option>
                                                <option value="Jours">Jours</option>
                                                <option value="Semaines">Semaines</option>
                                                <option value="Mois">Mois</option>
                                                <option value="Années">Années</option>
                                            </select>
                                            <div className="relative flex-shrink-0">
                                                <input type="number" value={timelineInterval}
                                                    onChange={e => setTimelineInterval(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                                    className="w-20 bg-black/40 border border-white/[0.08] rounded-lg px-2 py-2 text-sm text-cyan-400 font-black outline-none focus:border-cyan-500/50 text-center transition-all" />
                                                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] bg-[#0d1525] px-1 text-cyan-600 font-black uppercase tracking-wider">Pas</span>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Intelligence PDF */}
                                    <div className="bg-[#0d1525] rounded-xl border border-white/[0.06] p-4">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Intelligence PDF</p>
                                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-black/20 rounded-lg border border-white/[0.05] hover:bg-white/[0.04] transition-all group">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${showChronology ? 'bg-emerald-500 text-white shadow-lg' : 'bg-white/[0.05] text-slate-500 group-hover:text-slate-300'}`}>
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20M5 5l7 7 7-7M5 12l7 7 7-7" /></svg>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <input type="checkbox" checked={showChronology} onChange={e => setShowChronology(e.target.checked)}
                                                        className="w-4 h-4 rounded accent-emerald-500" />
                                                    <span className="text-[10px] font-black text-white uppercase tracking-wider">Chronologie Maîtresse</span>
                                                </div>
                                                <p className="text-[9px] text-slate-500 mt-0.5 ml-6">Injecter le séquençage global en en-tête PDF</p>
                                            </div>
                                        </label>
                                    </div>
                                </section>
                            </>
                        )}

                        {/* FAMILY ORDER */}
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Stratégie de Tri des Familles</p>
                                    <p className="text-[9px] text-slate-600 mt-0.5">Next Sequence ID: <span className="text-cyan-600 font-black">{nextAvailableNumber}</span> · Numéro = priorité d'impression</p>
                                </div>
                                <button onClick={handleResetOrder}
                                    className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-wider transition-all border border-red-500/20">
                                    Purge Automate
                                </button>
                            </div>
                            <div className="relative mb-3">
                                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Cibler une famille technique..."
                                    className="w-full bg-[#0d1525] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-cyan-500/40 transition-all placeholder:text-slate-600" />
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                            </div>

                            {relevantFamilies.length === 0 ? (
                                <div className="h-40 flex flex-col items-center justify-center bg-[#0d1525] rounded-xl border border-dashed border-white/[0.06]">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-600 mb-2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    <p className="text-slate-600 text-xs font-black uppercase tracking-wide">Aucun segment détecté pour ce filtrage</p>
                                </div>
                            ) : (
                                <div className="bg-[#0d1525] rounded-xl border border-white/[0.06] p-4 max-h-72 overflow-y-auto gs-scroll">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                        {relevantFamilies
                                            .filter(f => f.toLowerCase().includes(searchTerm.toLowerCase()))
                                            .map((family, idx) => (
                                                <div key={family} className="flex items-center gap-2 p-2.5 bg-white/[0.03] rounded-lg border border-white/[0.05] hover:border-cyan-500/25 hover:bg-cyan-500/[0.04] transition-all group">
                                                    <div className="relative flex-shrink-0">
                                                        <input type="number" value={orderInputs[family] || ''} onChange={e => handleOrderChange(family, e.target.value)}
                                                            className="w-9 h-8 text-center bg-black/50 border border-white/[0.08] rounded-md text-xs font-black text-cyan-400 focus:border-cyan-500/50 outline-none transition-all"
                                                            min="1" placeholder={String(idx + 1)} />
                                                        <span className="absolute -top-2 inset-x-0 text-center text-[6px] text-slate-600 font-black uppercase">N°</span>
                                                    </div>
                                                    <span className="truncate text-[10px] font-bold text-slate-400 group-hover:text-slate-200 transition-colors uppercase" title={family}>{family}</span>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
};
