
import React, { useState, useEffect, useMemo } from 'react';
import type { AppParameters, CalculationResults } from '../types';
import { exportGanttByTeamPDF } from '../services/ganttByTeamPdfExportService';

declare var JSZip: any;

interface TeamGanttExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onShare: (title: string, order: string[], options: { timelineUnit: 'Heures' | 'Jours', timelineInterval: number }, filter?: { start: Date, end: Date } | null) => Promise<void>;
    onExport: (title: string, order: string[], options: { timelineUnit: 'Heures' | 'Jours', timelineInterval: number }, filter?: { start: Date, end: Date } | null) => Promise<void>;
    title: string;
    setTitle: (title: string) => void;
    teamOrder: string[];
    setTeamOrder: (order: string[]) => void;
    parameters: AppParameters;
    results: CalculationResults;
}

export const TeamGanttExportModal: React.FC<TeamGanttExportModalProps> = ({
    isOpen,
    onClose,
    onExport,
    onShare,
    title,
    setTitle,
    teamOrder,
    setTeamOrder,
    parameters,
    results
}) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [orderInputs, setOrderInputs] = useState<Record<string, string>>({});
    const [localTeamOrder, setLocalTeamOrder] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [timelineUnit, setTimelineUnit] = useState<'Heures' | 'Jours'>('Heures');
    const [timelineInterval, setTimelineInterval] = useState(4);

    const [filterMode, setFilterMode] = useState<'all' | 'range' | 'daily'>('all');
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    const [cycleStartTime, setCycleStartTime] = useState('06:00');
    const [ignoreEmptyDays, setIgnoreEmptyDays] = useState(true);

    useEffect(() => {
        if (isOpen) {
            if (Object.keys(orderInputs).length === 0) setLocalTeamOrder(teamOrder);
            setSearchTerm('');
            setFilterMode('all');
            setCycleStartTime('06:00');
            setIgnoreEmptyDays(true);
            const toDateTimeLocal = (dateStr: string) => {
                const date = new Date(dateStr);
                const tzoffset = date.getTimezoneOffset() * 60000;
                return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
            };
            setRangeStart(toDateTimeLocal(parameters.shutdownStart));
            setRangeEnd(toDateTimeLocal(parameters.shutdownEnd));
        }
    }, [isOpen, teamOrder, parameters]);

    const stats = useMemo(() => ({
        teams: new Set(results.scheduledTasks.map(t => t.team)).size,
        tasks: results.scheduledTasks.length,
        totalMH: results.scheduledTasks.reduce((s, t) => s + t.manHours, 0).toFixed(0),
        disciplines: new Set(results.scheduledTasks.map(t => t.discipline)).size,
    }), [results]);

    const nextAvailableNumber = useMemo(() => {
        const numbers = Object.values(orderInputs).map(v => parseInt(v, 10)).filter(n => !isNaN(n));
        return numbers.length === 0 ? 1 : Math.max(...numbers) + 1;
    }, [orderInputs]);

    if (!isOpen) return null;

    const handleOrderChange = (team: string, value: string) => {
        const newInputs = { ...orderInputs, [team]: value.replace(/[^0-9]/g, '') };
        setOrderInputs(newInputs);
        const sorted = [...localTeamOrder].sort((a, b) => {
            const nA = newInputs[a] ? parseInt(newInputs[a], 10) : Infinity;
            const nB = newInputs[b] ? parseInt(newInputs[b], 10) : Infinity;
            if (nA !== Infinity && nB !== Infinity) return nA === nB ? a.localeCompare(b) : nA - nB;
            if (nA !== Infinity) return -1;
            if (nB !== Infinity) return 1;
            return a.localeCompare(b);
        });
        setLocalTeamOrder(sorted);
    };

    const handleResetOrder = () => {
        setOrderInputs({});
        setLocalTeamOrder([...localTeamOrder].sort((a, b) => a.localeCompare(b)));
    };

    const handleAction = async (actionType: 'download' | 'share') => {
        const finalOrder = localTeamOrder;
        setTeamOrder(finalOrder);
        const isDownload = actionType === 'download';
        if (isDownload) setIsDownloading(true); else setIsSharing(true);
        try {
            const exportOptions = { timelineUnit, timelineInterval };
            if (filterMode === 'all') {
                if (isDownload) await onExport(title, finalOrder, exportOptions, null);
                else await onShare(title, finalOrder, exportOptions, null);
            } else if (filterMode === 'range') {
                if (!rangeStart || !rangeEnd) { alert('Veuillez sélectionner une plage de dates valide.'); return; }
                const filter = { start: new Date(rangeStart), end: new Date(rangeEnd) };
                if (isDownload) await onExport(`${title}_Filtre`, finalOrder, exportOptions, filter);
                else await onShare(`${title}_Filtre`, finalOrder, exportOptions, filter);
            } else if (filterMode === 'daily') {
                if (isDownload) {
                    if (typeof JSZip === 'undefined') { alert("La librairie JSZip n'a pas pu être chargée."); setIsDownloading(false); return; }
                    const [cycleH, cycleM] = cycleStartTime.split(':').map(Number);
                    let cursor = new Date(parameters.shutdownStart);
                    cursor.setHours(cycleH, cycleM, 0, 0);
                    if (cursor.getTime() > new Date(parameters.shutdownStart).getTime()) cursor.setDate(cursor.getDate() - 1);
                    const endTs = new Date(parameters.shutdownEnd).getTime();
                    const batchQueue: { title: string, filter: { start: Date, end: Date } }[] = [];
                    while (cursor.getTime() < endTs) {
                        const shiftStart = new Date(cursor);
                        const shiftEnd = new Date(cursor);
                        shiftEnd.setDate(shiftEnd.getDate() + 1);
                        if (ignoreEmptyDays) {
                            const hasTasks = results.scheduledTasks.some(t => t.startTime.getTime() < shiftEnd.getTime() && t.endTime.getTime() > shiftStart.getTime());
                            if (!hasTasks) { cursor.setDate(cursor.getDate() + 1); continue; }
                        }
                        const dateStr = shiftStart.toLocaleDateString('fr-FR').replace(/\//g, '-');
                        batchQueue.push({ title: `${title} - ${dateStr}`, filter: { start: shiftStart, end: shiftEnd } });
                        cursor.setDate(cursor.getDate() + 1);
                    }
                    if (batchQueue.length === 0) { alert('Aucun fichier à générer.'); setIsDownloading(false); return; }
                    if (batchQueue.length > 10 && !window.confirm(`Générer et compresser ${batchQueue.length} fichiers ?`)) { setIsDownloading(false); return; }
                    const zip = new JSZip();
                    for (const item of batchQueue) {
                        const doc = await exportGanttByTeamPDF(results, parameters, item.title, finalOrder, exportOptions, item.filter);
                        zip.file(`${item.title.replace(/[^a-z0-9]/gi, '_')}.pdf`, doc.output('blob'));
                    }
                    const zipBlob = await zip.generateAsync({ type: 'blob' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(zipBlob);
                    link.download = `${title.replace(/[^a-z0-9]/gi, '_')}_Batch.zip`;
                    document.body.appendChild(link); link.click(); document.body.removeChild(link);
                    URL.revokeObjectURL(link.href);
                } else { alert("Le partage batch n'est pas supporté. Utilisez le téléchargement ZIP."); }
            }
        } catch (e) {
            console.error(`Failed to ${actionType} PDF:`, e);
            if (e instanceof Error) alert(`Erreur: ${e.message}`);
        } finally {
            if (isDownload) setIsDownloading(false); else setIsSharing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex justify-center items-start z-[100] p-4 overflow-y-auto">
            <style>{`
                .gantt-modal-scroll::-webkit-scrollbar { width: 4px; }
                .gantt-modal-scroll::-webkit-scrollbar-track { background: transparent; }
                .gantt-modal-scroll::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.25); border-radius: 10px; }
                .gantt-modal-scroll::-webkit-scrollbar-thumb:hover { background: rgba(16,185,129,0.5); }
                .gantt-modal-scroll { scrollbar-width: thin; scrollbar-color: rgba(16,185,129,0.25) transparent; }
                @keyframes slideUp { from { opacity:0; transform: translateY(24px) scale(0.98); } to { opacity:1; transform: translateY(0) scale(1); } }
                .modal-enter { animation: slideUp 0.35s cubic-bezier(0.16,1,0.3,1); }
            `}</style>

            <div
                className="modal-enter bg-[#070d1a] w-full max-w-5xl my-4 rounded-2xl border border-white/[0.06] shadow-[0_32px_80px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* ── TOP ACCENT ── */}
                <div className="h-[2px] bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-600 flex-shrink-0" />

                {/* ── HEADER ── */}
                <header className="flex items-center justify-between px-7 py-5 border-b border-white/[0.06] bg-[#080d1c] flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                            style={{ background: 'radial-gradient(circle at 30% 30%, rgba(16,185,129,0.25), rgba(16,185,129,0.06))', border: '1px solid rgba(16,185,129,0.2)', boxShadow: '0 0 24px rgba(16,185,129,0.1)' }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="text-emerald-400">
                                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-[15px] font-black text-white tracking-wide uppercase leading-tight">Centre d'Exportation Gantt</h2>
                            <p className="text-[10px] font-semibold text-emerald-500/70 uppercase tracking-[0.2em] mt-0.5">Moteur de Rendu Tactique v4.5</p>
                        </div>
                    </div>

                    {/* Stat pills */}
                    <div className="hidden md:flex items-center gap-2">
                        {[
                            { l: 'TÂCHES', v: stats.tasks, c: 'text-emerald-400' },
                            { l: 'ÉQUIPES', v: stats.teams, c: 'text-cyan-400' },
                            { l: 'DISCIPLINES', v: stats.disciplines, c: 'text-violet-400' },
                            { l: 'H-H TOTAL', v: stats.totalMH, c: 'text-orange-400' },
                        ].map(s => (
                            <div key={s.l} className="flex flex-col items-center px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                                <span className={`text-base font-black leading-none ${s.c}`}>{s.v}</span>
                                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{s.l}</span>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handleAction('share')}
                            disabled={isDownloading || isSharing || !navigator.share || filterMode === 'daily'}
                            className="px-5 py-2.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] text-slate-300 text-[11px] font-bold uppercase tracking-wider transition-all border border-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                            {isSharing ? 'Partage...' : 'Partager'}
                        </button>
                        <button
                            onClick={() => handleAction('download')}
                            disabled={isDownloading || isSharing}
                            className="flex items-center gap-2.5 px-6 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-wider text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ background: 'linear-gradient(135deg, #059669, #0891b2)', boxShadow: '0 4px 20px rgba(5,150,105,0.3)' }}
                        >
                            {isDownloading
                                ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Génération...</>
                                : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                                    {filterMode === 'daily' ? `Télécharger (${stats.teams})` : `Télécharger (${stats.tasks})`}</>
                            }
                        </button>
                        <button
                            onClick={onClose}
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all border border-white/[0.06] hover:border-white/[0.14]"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                        </button>
                    </div>
                </header>

                {/* ── MAIN SCROLLABLE BODY ── */}
                <main className="gantt-modal-scroll overflow-y-auto flex-1 max-h-[calc(100vh-180px)]">
                    <div className="p-7 space-y-5">

                        {/* ── TITLE INPUT ── */}
                        <section>
                            <label htmlFor="gantt-title-team" className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Titre du Rapport</label>
                            <input
                                id="gantt-title-team"
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                className="w-full rounded-xl px-4 py-3 text-white text-[13px] font-semibold bg-[#0d1525] border border-white/[0.08] focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-600"
                                placeholder="Ex : Gantt Maintenance Arrêt 2026..."
                            />
                        </section>

                        {/* ── FILTER SCOPE ── */}
                        <section>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Fenêtre Temporelle du Rapport</p>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'all', label: 'Scope Global', sub: 'Cycle complet de l\'arrêt planifié', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 000 20 14.5 14.5 0 000-20" /><path d="M2 12h20" /></svg> },
                                    { id: 'range', label: 'Fenêtre Précise', sub: 'Filtrer sur une plage horaire', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg> },
                                    { id: 'daily', label: 'Génération Automate', sub: 'Archive ZIP quotidienne', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg> }
                                ].map(mode => (
                                    <button
                                        key={mode.id}
                                        onClick={() => setFilterMode(mode.id as any)}
                                        className={`relative flex-col text-left p-5 rounded-xl border transition-all duration-300 group overflow-hidden ${filterMode === mode.id ? 'bg-emerald-500/[0.08] border-emerald-500/40' : 'bg-[#0d1525] border-white/[0.06] hover:border-white/[0.14]'}`}
                                    >
                                        {filterMode === mode.id && <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />}
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-all ${filterMode === mode.id ? 'bg-emerald-500 text-white' : 'bg-white/[0.05] text-slate-500 group-hover:text-slate-300'}`}>
                                            {mode.icon}
                                        </div>
                                        <div className={`text-[11px] font-black uppercase tracking-wide mb-1 ${filterMode === mode.id ? 'text-emerald-400' : 'text-slate-400'}`}>{mode.label}</div>
                                        <div className="text-[9px] text-slate-600 font-medium">{mode.sub}</div>
                                        {filterMode === mode.id && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-cyan-500" />}
                                    </button>
                                ))}
                            </div>

                            {/* Inline filter config */}
                            <div className="mt-3 bg-[#0d1525] rounded-xl border border-white/[0.06] p-5 min-h-[72px] flex items-center">
                                {filterMode === 'all' && (
                                    <div className="flex items-center gap-4 w-full">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center flex-shrink-0">
                                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-white uppercase tracking-wide">Exportation Intégrale</div>
                                            <p className="text-[10px] text-slate-500 mt-0.5">Toutes les tâches planifiées — du premier au dernier jour.</p>
                                        </div>
                                    </div>
                                )}
                                {filterMode === 'range' && (
                                    <div className="grid grid-cols-2 gap-5 w-full">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Début</span>
                                            </div>
                                            <input type="datetime-local" value={rangeStart} onChange={e => setRangeStart(e.target.value)}
                                                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-emerald-500/50 transition-all" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Fin</span>
                                            </div>
                                            <input type="datetime-local" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)}
                                                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-white font-bold outline-none focus:border-emerald-500/50 transition-all" />
                                        </div>
                                    </div>
                                )}
                                {filterMode === 'daily' && (
                                    <div className="grid grid-cols-2 gap-5 w-full">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Heure Coupure Shift</p>
                                            <input type="time" value={cycleStartTime} onChange={e => setCycleStartTime(e.target.value)}
                                                className="w-full bg-black/40 border border-white/[0.08] rounded-lg px-4 py-2.5 text-sm text-emerald-400 font-black outline-none focus:border-emerald-500/50 text-center transition-all" />
                                        </div>
                                        <label className="flex items-center gap-3 cursor-pointer bg-black/20 rounded-lg px-4 py-2.5 border border-white/[0.05] hover:bg-white/[0.04] transition-all">
                                            <div className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${ignoreEmptyDays ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                                                <input type="checkbox" className="sr-only" checked={ignoreEmptyDays} onChange={e => setIgnoreEmptyDays(e.target.checked)} />
                                                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${ignoreEmptyDays ? 'left-5' : 'left-0.5'}`} />
                                            </div>
                                            <div>
                                                <span className="block text-[10px] font-black text-white uppercase tracking-wider">Ignorer jours vides</span>
                                                <span className="text-[9px] text-slate-500">Exclure shifts sans tâche</span>
                                            </div>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* ── DISPLAY OPTIONS ── */}
                        <section className="grid grid-cols-2 gap-4">
                            <div className="bg-[#0d1525] rounded-xl border border-white/[0.06] p-4">
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Résolution Timeline</p>
                                <div className="flex gap-3">
                                    <select value={timelineUnit} onChange={e => setTimelineUnit(e.target.value as any)}
                                        className="flex-1 bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white font-bold outline-none focus:border-emerald-500/50 transition-all">
                                        <option value="Heures">Heures</option>
                                        <option value="Jours">Jours</option>
                                    </select>
                                    <div className="relative flex-shrink-0">
                                        <input type="number" value={timelineInterval}
                                            onChange={e => setTimelineInterval(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                            className="w-20 bg-black/40 border border-white/[0.08] rounded-lg px-2 py-2 text-sm text-cyan-400 font-black outline-none focus:border-cyan-500/50 text-center transition-all" />
                                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[7px] bg-[#0d1525] px-1 text-cyan-600 font-black uppercase tracking-wider">Pas</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-[#0d1525] rounded-xl border border-white/[0.06] p-4 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400"><path d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <div>
                                    <div className="text-[11px] font-black text-white uppercase tracking-wide">Moteur Prêt</div>
                                    <div className="text-[9px] text-slate-500 mt-0.5">{stats.teams} équipes · {stats.tasks} tâches à exporter</div>
                                </div>
                            </div>
                        </section>

                        {/* ── TEAM ORDERING ── */}
                        <section>
                            <div className="flex items-center justify-between mb-3">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Ordre d'impression des Équipes</p>
                                    <p className="text-[9px] text-slate-600 mt-0.5">Attribuez un numéro pour définir la séquence PDF</p>
                                </div>
                                <button onClick={handleResetOrder}
                                    className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-wider transition-all border border-red-500/20">
                                    Réinitialiser
                                </button>
                            </div>

                            <div className="relative mb-3">
                                <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Rechercher une équipe..."
                                    className="w-full bg-[#0d1525] border border-white/[0.08] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-emerald-500/40 transition-all placeholder:text-slate-600" />
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                            </div>

                            <div className="bg-[#0d1525] rounded-xl border border-white/[0.06] p-4 max-h-56 overflow-y-auto gantt-modal-scroll">
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                                    {localTeamOrder
                                        .filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .map(team => (
                                            <div key={team} className="flex items-center gap-2 p-2.5 bg-white/[0.03] rounded-lg border border-white/[0.05] hover:border-emerald-500/25 hover:bg-emerald-500/[0.04] transition-all group">
                                                <div className="relative flex-shrink-0">
                                                    <input type="number" value={orderInputs[team] || ''} onChange={e => handleOrderChange(team, e.target.value)}
                                                        className="w-9 h-8 text-center bg-black/50 border border-white/[0.08] rounded-md text-xs font-black text-emerald-400 focus:border-emerald-500/50 outline-none transition-all"
                                                        min="1" placeholder="–" />
                                                    <span className="absolute -top-2 inset-x-0 text-center text-[6px] text-slate-600 font-black uppercase">N°</span>
                                                </div>
                                                <span className="truncate text-[10px] font-bold text-slate-400 group-hover:text-slate-200 transition-colors uppercase" title={team}>{team}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        </div>
    );
};
