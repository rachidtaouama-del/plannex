
import React, { useState, useEffect, useMemo } from 'react';
import type { AppParameters, CalculationResults } from '../types';

interface GanttSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'view' | 'export';
    onExport: (title: string, order: string[], options: { timelineUnit: 'Heures' | 'Jours' | 'Semaines' | 'Mois' | 'Années', timelineInterval: number }, filter?: { start: Date, end: Date } | null, contentFilters?: { maintenanceType?: string, discipline?: string, manpower?: number }) => Promise<void>;
    onShare: (title: string, order: string[], options: { timelineUnit: 'Heures' | 'Jours' | 'Semaines' | 'Mois' | 'Années', timelineInterval: number }, filter?: { start: Date, end: Date } | null, contentFilters?: { maintenanceType?: string, discipline?: string, manpower?: number }) => Promise<void>;
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
    const [filterMode, setFilterMode] = useState<'all' | 'range'>('all');
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    const [maintTypeFilter, setMaintTypeFilter] = useState<string>('all');
    const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
    const [manpowerFilter, setManpowerFilter] = useState<string>('');

    useEffect(() => {
        if (isOpen) {
            if (Object.keys(orderInputs).length === 0) setLocalFamilyOrder(familyOrder);
            setSearchTerm('');
            setFilterMode('all');
            setMaintTypeFilter('all');
            setDisciplineFilter('all');
            setManpowerFilter('');
            const toDateTimeLocal = (d: string) => {
                const date = new Date(d);
                return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            };
            setRangeStart(toDateTimeLocal(parameters.shutdownStart));
            setRangeEnd(toDateTimeLocal(parameters.shutdownEnd));
        }
    }, [isOpen, familyOrder, parameters]);

    const uniqueMaintenanceTypes = useMemo(() => {
        const types = new Set<string>();
        results.scheduledTasks.forEach(t => { if (t.maintenanceType) types.add(t.maintenanceType); });
        return Array.from(types).sort();
    }, [results.scheduledTasks]);

    const uniqueDisciplines = useMemo(() => {
        const discs = new Set<string>();
        results.scheduledTasks.forEach(t => { const d = t.team.split(' ')[0] || t.team; if (d) discs.add(d); });
        return Array.from(discs).sort();
    }, [results.scheduledTasks]);

    useEffect(() => {
        if (!isOpen || mode === 'view') return;
        let newTitle = 'Gantt de Maintenance';
        if (disciplineFilter !== 'all') newTitle += ` - ${disciplineFilter.toUpperCase()}`;
        if (maintTypeFilter !== 'all') {
            const label = maintTypeFilter.includes('PREV') ? 'PRÉVENTIVE' : maintTypeFilter.includes('CORR') ? 'CORRECTIVE' : maintTypeFilter.toUpperCase();
            newTitle += ` (${label})`;
        }
        if (title.startsWith('Gantt')) setTitle(newTitle);
    }, [disciplineFilter, maintTypeFilter, isOpen, mode]);

    const filteredTasksCount = useMemo(() => {
        let tasks = results.scheduledTasks;
        if (filterMode === 'range' && rangeStart && rangeEnd) {
            const s = new Date(rangeStart).getTime(), e = new Date(rangeEnd).getTime();
            tasks = tasks.filter(t => t.startTime.getTime() < e && t.endTime.getTime() > s);
        }
        if (maintTypeFilter !== 'all') tasks = tasks.filter(t => t.maintenanceType === maintTypeFilter);
        if (disciplineFilter !== 'all') tasks = tasks.filter(t => (t.team.split(' ')[0] || t.team) === disciplineFilter);
        if (manpowerFilter !== '') { const mp = parseInt(manpowerFilter, 10); if (!isNaN(mp)) tasks = tasks.filter(t => t.manpower === mp); }
        return tasks.length;
    }, [results.scheduledTasks, filterMode, rangeStart, rangeEnd, maintTypeFilter, disciplineFilter, manpowerFilter]);

    const relevantFamilies = useMemo(() => {
        if (maintTypeFilter === 'all' && disciplineFilter === 'all' && manpowerFilter === '') return localFamilyOrder;
        const active = new Set<string>();
        results.scheduledTasks.forEach(t => {
            let match = true;
            if (maintTypeFilter !== 'all' && t.maintenanceType !== maintTypeFilter) match = false;
            if (match && disciplineFilter !== 'all' && (t.team.split(' ')[0] || t.team) !== disciplineFilter) match = false;
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
            let filter = null;
            if (filterMode === 'range') {
                if (!rangeStart || !rangeEnd) { alert('Veuillez sélectionner une plage de dates valide.'); return; }
                filter = { start: new Date(rangeStart), end: new Date(rangeEnd) };
            }
            const contentFilters = { maintenanceType: maintTypeFilter, discipline: disciplineFilter, manpower: manpowerFilter ? parseInt(manpowerFilter, 10) : undefined };
            if (isDownload) await onExport(title, finalOrder, { timelineUnit, timelineInterval }, filter, contentFilters);
            else { if (!navigator.share) { alert("La fonction de partage n'est pas supportée."); return; } await onShare(title, finalOrder, { timelineUnit, timelineInterval }, filter, contentFilters); }
        } catch (e) {
            console.error(`Failed to ${actionType} PDF:`, e);
            if (e instanceof Error) alert(`Erreur: ${e.message}`);
        } finally {
            if (isDownload) setIsDownloading(false); else setIsSharing(false);
        }
    };

    const isProcessing = isDownloading || isSharing;
    const isViewMode = mode === 'view';

    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex justify-center items-start z-[100] p-4 overflow-y-auto">
            <style>{`
                .disc-modal-scroll::-webkit-scrollbar { width: 4px; }
                .disc-modal-scroll::-webkit-scrollbar-track { background: transparent; }
                .disc-modal-scroll::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius:10px; }
                .disc-modal-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.6); }
                .disc-modal-scroll { scrollbar-width: thin; scrollbar-color: rgba(99,102,241,0.3) transparent; }
                @keyframes slideUp { from{opacity:0;transform:translateY(24px) scale(0.98)} to{opacity:1;transform:translateY(0) scale(1)} }
                .modal-enter { animation: slideUp 0.35s cubic-bezier(0.16,1,0.3,1); }
            `}</style>

            <div
                className="modal-enter bg-[#070d1a] w-full max-w-6xl my-4 rounded-2xl border border-white/[0.06] shadow-[0_32px_80px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* ── TOP ACCENT ── */}
                <div className="h-[2px] bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500 flex-shrink-0" />

                {/* ── HEADER ── */}
                <header className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06] bg-[#080d1c] flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: 'radial-gradient(circle at 30% 30%, rgba(99,102,241,0.25), rgba(99,102,241,0.06))', border: '1px solid rgba(99,102,241,0.2)', boxShadow: '0 0 24px rgba(99,102,241,0.1)' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-[15px] font-black text-white tracking-wide uppercase leading-tight">
                                {isViewMode ? 'Studio Gantt — Vue' : 'Export Gantt par Discipline'}
                            </h2>
                            <p className="text-[10px] font-semibold text-indigo-400/70 uppercase tracking-[0.2em] mt-0.5">Filtrage Intelligent · Rendu PDF Tactique</p>
                        </div>
                    </div>

                    {/* Stat pills */}
                    {!isViewMode && (
                        <div className="hidden md:flex items-center gap-2">
                            {[
                                { l: 'TÂCHES', v: stats.tasks, c: 'text-emerald-400' },
                                { l: 'FAMILLES', v: stats.families, c: 'text-indigo-400' },
                                { l: 'DISCIPLINES', v: stats.disciplines, c: 'text-fuchsia-400' },
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
                                className="px-6 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-white transition-all"
                                style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', boxShadow: '0 4px 20px rgba(79,70,229,0.3)' }}>
                                Générer la Vue
                            </button>
                        ) : (
                            <>
                                <button onClick={() => handleAction('share')} disabled={isProcessing || !navigator.share}
                                    className="px-4 py-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-slate-300 text-[11px] font-bold uppercase tracking-wider transition-all border border-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                                    {isSharing ? 'Partage...' : 'Partager'}
                                </button>
                                <button onClick={() => handleAction('download')} disabled={isProcessing || filteredTasksCount === 0}
                                    className="flex items-center gap-2.5 px-6 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ background: 'linear-gradient(135deg,#4f46e5,#a21caf)', boxShadow: '0 4px 20px rgba(79,70,229,0.3)' }}>
                                    {isDownloading
                                        ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Génération...</>
                                        : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>Export PDF ({filteredTasksCount})</>
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
                <main className="disc-modal-scroll overflow-y-auto flex-1 max-h-[calc(100vh-180px)]">
                    <div className="p-7 space-y-5">

                        {!isViewMode && (
                            <>
                                {/* ── TITLE ── */}
                                <section>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Titre du Rapport</label>
                                    <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                                        className="w-full rounded-xl px-4 py-3 text-white text-[13px] font-semibold bg-[#0d1525] border border-white/[0.08] focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-600"
                                        placeholder="Ex: Gantt par Discipline — Arrêt 2026..." />
                                </section>

                                {/* ── INTELLIGENT FILTERS ── */}
                                <section>
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Filtrage Intelligent du Contenu</p>
                                        <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 text-[8px] font-black rounded border border-indigo-500/20 uppercase tracking-widest">Auto-Sync Titre</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        {[
                                            {
                                                label: 'Discipline', colorClass: 'text-indigo-400', borderClass: 'hover:border-indigo-500/40',
                                                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>,
                                                content: (
                                                    <select value={disciplineFilter} onChange={e => setDisciplineFilter(e.target.value)}
                                                        className="w-full bg-transparent text-white text-xs font-bold focus:ring-0 outline-none cursor-pointer">
                                                        <option value="all" className="bg-slate-900">Toutes</option>
                                                        {uniqueDisciplines.map(d => <option key={d} value={d} className="bg-slate-900">{d}</option>)}
                                                    </select>
                                                )
                                            },
                                            {
                                                label: 'Type Maintenance', colorClass: 'text-orange-400', borderClass: 'hover:border-orange-500/40',
                                                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-400"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>,
                                                content: (
                                                    <select value={maintTypeFilter} onChange={e => setMaintTypeFilter(e.target.value)}
                                                        className="w-full bg-transparent text-white text-xs font-bold focus:ring-0 outline-none cursor-pointer">
                                                        <option value="all" className="bg-slate-900">Tous</option>
                                                        {uniqueMaintenanceTypes.map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
                                                    </select>
                                                )
                                            },
                                            {
                                                label: 'Effectif (personnes)', colorClass: 'text-fuchsia-400', borderClass: 'hover:border-fuchsia-500/40',
                                                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-fuchsia-400"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>,
                                                content: (
                                                    <input type="number" value={manpowerFilter} onChange={e => setManpowerFilter(e.target.value)}
                                                        placeholder="Tous"
                                                        className="w-full bg-transparent text-white text-xs font-bold focus:ring-0 outline-none placeholder:text-slate-600" />
                                                )
                                            },
                                        ].map((f, i) => (
                                            <div key={i} className={`bg-[#0d1525] rounded-xl border border-white/[0.06] ${f.borderClass} transition-all p-4 group`}>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center">{f.icon}</div>
                                                    <label className={`text-[9px] font-black uppercase tracking-widest ${f.colorClass}`}>{f.label}</label>
                                                </div>
                                                {f.content}
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* ── TIMELINE ── */}
                                <section className="grid grid-cols-2 gap-4">
                                    <div className="bg-[#0d1525] rounded-xl border border-white/[0.06] p-4">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Fenêtre Temporelle</p>
                                        <div className="flex gap-2 p-1 bg-black/30 rounded-lg mb-3">
                                            {(['all', 'range'] as const).map(m => (
                                                <button key={m} onClick={() => setFilterMode(m)}
                                                    className={`flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${filterMode === m ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                                                    {m === 'all' ? 'Vue Intégrale' : 'Plage Précise'}
                                                </button>
                                            ))}
                                        </div>
                                        {filterMode === 'range' && (
                                            <div className="space-y-2">
                                                <div><span className="text-[8px] text-slate-600 uppercase tracking-widest">Début</span>
                                                    <input type="datetime-local" value={rangeStart} onChange={e => setRangeStart(e.target.value)}
                                                        className="w-full mt-1 bg-black/40 border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white font-bold outline-none focus:border-indigo-500/50 transition-all" /></div>
                                                <div><span className="text-[8px] text-slate-600 uppercase tracking-widest">Fin</span>
                                                    <input type="datetime-local" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)}
                                                        className="w-full mt-1 bg-black/40 border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white font-bold outline-none focus:border-indigo-500/50 transition-all" /></div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-[#0d1525] rounded-xl border border-white/[0.06] p-4">
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Résolution Timeline</p>
                                        <div className="flex gap-2 p-1 bg-black/30 rounded-lg mb-3">
                                            {(['Heures','Jours','Semaines','Mois','Années'] as const).map(u => (
                                                <button key={u} onClick={() => setTimelineUnit(u)}
                                                    className={`flex-1 py-2 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${timelineUnit === u ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
                                                    {u}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="relative">
                                            <input type="number" value={timelineInterval}
                                                onChange={e => setTimelineInterval(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                                className="w-full bg-black/40 border border-white/[0.06] rounded-lg px-3 py-2.5 text-sm text-cyan-400 font-black text-center outline-none focus:border-cyan-500/50 transition-all" />
                                            <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] bg-[#0d1525] px-1 text-cyan-600 font-black uppercase tracking-wider">Pas (h)</span>
                                        </div>
                                        <div className="mt-3 flex items-center gap-2 bg-indigo-500/[0.07] rounded-lg px-3 py-2">
                                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse flex-shrink-0" />
                                            <span className="text-[10px] text-indigo-300 font-bold">{filteredTasksCount} tâches dans la sélection</span>
                                        </div>
                                    </div>
                                </section>
                            </>
                        )}

                        {/* ── FAMILY ORDER ── */}
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Ordre des Familles dans le PDF</p>
                                    <p className="text-[9px] text-slate-600 mt-0.5">Numéro = priorité d'impression · Familles actives selon les filtres</p>
                                </div>
                                <button onClick={handleResetOrder}
                                    className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-wider transition-all border border-red-500/20">
                                    Réinitialiser
                                </button>
                            </div>
                            <div className="relative mb-3">
                                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Rechercher une famille..."
                                    className="w-full bg-[#0d1525] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-indigo-500/40 transition-all placeholder:text-slate-600" />
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                            </div>

                            {relevantFamilies.length === 0 ? (
                                <div className="h-40 flex flex-col items-center justify-center bg-[#0d1525] rounded-xl border border-dashed border-white/[0.06]">
                                    <div className="w-10 h-10 rounded-full bg-white/[0.04] flex items-center justify-center mb-2">
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-600"><path d="M9.172 9.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                    <p className="text-slate-600 text-xs font-bold">Aucune famille ne correspond aux filtres actifs</p>
                                </div>
                            ) : (
                                <div className="bg-[#0d1525] rounded-xl border border-white/[0.06] p-4 max-h-72 overflow-y-auto disc-modal-scroll">
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                        {relevantFamilies
                                            .filter(f => f.toLowerCase().includes(searchTerm.toLowerCase()))
                                            .map((family, idx) => (
                                                <div key={family} className="flex items-center gap-2 p-2.5 bg-white/[0.03] rounded-lg border border-white/[0.05] hover:border-indigo-500/25 hover:bg-indigo-500/[0.04] transition-all group">
                                                    <div className="relative flex-shrink-0">
                                                        <input type="number" value={orderInputs[family] || ''} onChange={e => handleOrderChange(family, e.target.value)}
                                                            className="w-9 h-8 text-center bg-black/50 border border-white/[0.08] rounded-md text-xs font-black text-indigo-400 focus:border-indigo-500/50 outline-none transition-all"
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
