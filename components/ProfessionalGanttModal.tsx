
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import type { CalculationResults, AppParameters, CustomCriticalPath, ScheduledTask } from '../types';
import { ProfessionalGanttChart, GanttHandle } from './ProfessionalGanttChart';
import { exportProfessionalGanttToPDF } from '../services/professionalGanttPdfExportService';
import { exportPremiumGanttToPDF } from '../services/premiumGanttPdfExportService';

declare var JSZip: any;

interface ProfessionalGanttModalProps {
    isOpen: boolean;
    onClose: () => void;
    results: CalculationResults;
    parameters: AppParameters;
    familyOrder: string[];
    setFamilyOrder: React.Dispatch<React.SetStateAction<string[]>>;
    isColdStopFlow: boolean;
    customCriticalPaths: CustomCriticalPath[];
    setCustomCriticalPaths: React.Dispatch<React.SetStateAction<CustomCriticalPath[]>>;
}

const HIGH_CONTRAST_COLORS = [
    '#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00897B',
    '#FDD835', '#D81B60', '#546E7A', '#3949AB', '#039BE5', '#7CB342',
    '#F4511E', '#C0CA33', '#6D4C41', '#00ACC1', '#AFB42B', '#5E35B1'
];

export const ProfessionalGanttModal: React.FC<ProfessionalGanttModalProps> = ({
    isOpen, onClose, results, parameters, familyOrder, setFamilyOrder,
    isColdStopFlow, customCriticalPaths, setCustomCriticalPaths
}) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [ganttTitle, setGanttTitle] = useState("Gantt Global de l'Arrêt");
    const [criticalPathsTitle, setCriticalPathsTitle] = useState('Chemins Critiques Personnalisés');
    const [ganttVersion, setGanttVersion] = useState<'classic' | 'premium'>('premium');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'options' | 'critical' | 'style'>('options');

    const [displayTasks, setDisplayTasks] = useState<ScheduledTask[]>([]);

    // Measure available Gantt height
    const [ganttHeight, setGanttHeight] = useState(window.innerHeight - 56); // 56px top bar
    const headerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const recalc = () => {
            const hh = headerRef.current?.offsetHeight || 56;
            setGanttHeight(window.innerHeight - hh);
        };
        recalc();
        window.addEventListener('resize', recalc);
        return () => window.removeEventListener('resize', recalc);
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            const tasksWithOrder = results.scheduledTasks.map((task, index) => ({
                ...task, sequenceOrder: task.sequenceOrder ?? index,
            }));
            setDisplayTasks(tasksWithOrder);
        }
    }, [isOpen, results.scheduledTasks]);

    const displayResults = useMemo(() => ({
        ...results, scheduledTasks: displayTasks,
    }), [displayTasks, results]);

    const handleTaskBlockSequenceChange = useCallback((taskIds: string[], direction: 'up' | 'down') => {
        setDisplayTasks(currentTasks => {
            let allTasks = [...currentTasks];
            if (taskIds.length === 0) return allTasks;
            const firstTaskInfo = allTasks.find(t => (t.multiDisciplineId || `single_${t.id}`) === taskIds[0]);
            if (!firstTaskInfo || !firstTaskInfo.family) return allTasks;
            const familyName = firstTaskInfo.family;
            const familyTasks = allTasks.filter(t => t.family === familyName).sort((a, b) => (a.sequenceOrder ?? a.id) - (b.sequenceOrder ?? b.id));
            let newFamilyOrder = [...familyTasks];
            if (taskIds.length === 1) {
                const taskId = taskIds[0];
                const currentIndex = newFamilyOrder.findIndex(t => (t.multiDisciplineId || `single_${t.id}`) === taskId);
                if (direction === 'up' && currentIndex > 0)
                    [newFamilyOrder[currentIndex], newFamilyOrder[currentIndex - 1]] = [newFamilyOrder[currentIndex - 1], newFamilyOrder[currentIndex]];
                else if (direction === 'down' && currentIndex < newFamilyOrder.length - 1)
                    [newFamilyOrder[currentIndex], newFamilyOrder[currentIndex + 1]] = [newFamilyOrder[currentIndex + 1], newFamilyOrder[currentIndex]];
            }
            const familyTasksWithNewOrder = newFamilyOrder.map((task, index) => ({ ...task, sequenceOrder: task.sequenceOrder !== null ? index : null }));
            const familyMap = new Map(familyTasksWithNewOrder.map(t => [(t.multiDisciplineId || `single_${t.id}`), t]));
            return allTasks.map(t => t.family === familyName ? (familyMap.get(t.multiDisciplineId || `single_${t.id}`) || t) : t) as ScheduledTask[];
        });
    }, []);

    const [timelineUnit, setTimelineUnit] = useState<'Heures' | 'Jours' | 'Semaines' | 'Mois' | 'Années'>('Heures');
    const [timelineInterval, setTimelineInterval] = useState(4);
    const [disciplineColors, setDisciplineColors] = useState<Map<string, string>>(new Map());
    const [showChronology, setShowChronology] = useState(true);
    const [showFamilyDetails, setShowFamilyDetails] = useState(true);
    const [chronologyColor, setChronologyColor] = useState('#f59e0b');
    const [headerColor, setHeaderColor] = useState('#0d1424');
    const [headerFontColor, setHeaderFontColor] = useState('#ffffff');
    const [viewMode, setViewMode] = useState<'global' | 'range' | 'batch'>('global');
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');
    const [cycleStartTime, setCycleStartTime] = useState('06:00');
    const [searchTerm, setSearchTerm] = useState('');
    const [orderInputs, setOrderInputs] = useState<Record<string, string>>({});
    const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
    const [ganttCapabilities, setGanttCapabilities] = useState({ canMoveUp: false, canMoveDown: false, nextAvailableNumber: 1 });
    const ganttRef = useRef<GanttHandle>(null);

    useEffect(() => {
        if (isOpen) {
            const disciplines = [...new Set(results.scheduledTasks.map(t => t.discipline))].sort((a, b) => a.localeCompare(b));
            const initialColorMap = new Map<string, string>();
            disciplines.forEach((discipline, index) => initialColorMap.set(discipline, HIGH_CONTRAST_COLORS[index % HIGH_CONTRAST_COLORS.length]));
            setDisciplineColors(initialColorMap);
            const toDateTimeLocal = (dateStr: string) => {
                const date = new Date(dateStr);
                return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            };
            setRangeStart(toDateTimeLocal(parameters.shutdownStart));
            setRangeEnd(toDateTimeLocal(parameters.shutdownEnd));
            setViewMode('global');
        }
    }, [isOpen, results, parameters]);

    useEffect(() => {
        if (viewMode === 'global' || viewMode === 'batch') {
            const durationHours = (new Date(parameters.shutdownEnd).getTime() - new Date(parameters.shutdownStart).getTime()) / 3600000;
            // Auto-set a sensible default only on first open (when unit is still the initial 'Heures')
            if (durationHours > 720) { setTimelineUnit('Semaines'); setTimelineInterval(1); }
            else if (durationHours > 72) { setTimelineUnit('Jours'); setTimelineInterval(1); }
            else { setTimelineUnit('Heures'); setTimelineInterval(4); }
        }
    }, [viewMode]);

    const currentFilter = useMemo(() => {
        if (viewMode !== 'range' || !rangeStart || !rangeEnd) return null;
        return { start: new Date(rangeStart), end: new Date(rangeEnd) };
    }, [viewMode, rangeStart, rangeEnd]);

    const taskCounts = useMemo(() => {
        const total = results.scheduledTasks.length;
        if (!currentFilter) return { total, visible: total };
        const s = currentFilter.start.getTime(), e = currentFilter.end.getTime();
        return { total, visible: results.scheduledTasks.filter(t => t.startTime.getTime() < e && t.endTime.getTime() > s).length };
    }, [results.scheduledTasks, currentFilter]);

    if (!isOpen) return null;

    const handleAddPath = () => {
        setCustomCriticalPaths(prev => [...prev, { id: crypto.randomUUID(), name: `Chemin Critique ${prev.length + 1}`, start: parameters.shutdownStart, end: parameters.shutdownEnd, color: '#dc2626' }]);
    };
    const handleRemovePath = (id: string) => setCustomCriticalPaths(prev => prev.filter(p => p.id !== id));
    const handlePathChange = (id: string, field: 'name' | 'start' | 'end' | 'color', value: string) => {
        setCustomCriticalPaths(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    };
    const handleColorChange = (disciplineName: string, color: string) => {
        setDisciplineColors(prev => new Map(prev).set(disciplineName, color));
    };

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const displayOptions = { timelineUnit, timelineInterval, disciplineColors, showFlow: false, showChronology, showFamilyDetails, chronologyColor, headerFontColor, criticalPathsTitle };
            if (viewMode === 'batch') {
                if (typeof JSZip === 'undefined') { alert("La librairie JSZip n'a pas pu être chargée."); setIsDownloading(false); return; }
                const start = new Date(parameters.shutdownStart).getTime();
                const end = new Date(parameters.shutdownEnd).getTime();
                const [cycleH, cycleM] = cycleStartTime.split(':').map(Number);
                let cursor = new Date(start);
                cursor.setHours(cycleH, cycleM, 0, 0);
                if (cursor.getTime() > start) cursor.setDate(cursor.getDate() - 1);
                const batchQueue: { title: string, filter: { start: Date, end: Date } }[] = [];
                while (cursor.getTime() < end) {
                    const shiftStart = new Date(cursor); const shiftEnd = new Date(cursor);
                    shiftEnd.setDate(shiftEnd.getDate() + 1);
                    if (results.scheduledTasks.some(t => t.startTime.getTime() < shiftEnd.getTime() && t.endTime.getTime() > shiftStart.getTime())) {
                        batchQueue.push({ title: `${ganttTitle} - ${shiftStart.toLocaleDateString('fr-FR').replace(/\//g, '-')}`, filter: { start: shiftStart, end: shiftEnd } });
                    }
                    cursor.setDate(cursor.getDate() + 1);
                }
                if (batchQueue.length === 0) { alert("Aucun fichier à générer."); setIsDownloading(false); return; }
                const zip = new JSZip();
                for (const item of batchQueue) {
                    const exportFn = ganttVersion === 'premium' ? exportPremiumGanttToPDF : exportProfessionalGanttToPDF;
                    const doc = await exportFn(displayResults, parameters, familyOrder, item.title, customCriticalPaths, isColdStopFlow, displayOptions, item.filter, headerColor);
                    zip.file(`${item.title.replace(/[^a-z0-9]/gi, '_')}.pdf`, doc.output('blob'));
                }
                const zipBlob = await zip.generateAsync({ type: "blob" });
                const link = document.createElement('a'); link.href = URL.createObjectURL(zipBlob);
                link.download = `${ganttTitle.replace(/[^a-z0-9]/gi, '_')}_Batch.zip`;
                document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
            } else {
                const exportFn = ganttVersion === 'premium' ? exportPremiumGanttToPDF : exportProfessionalGanttToPDF;
                const doc = await exportFn(displayResults, parameters, familyOrder, ganttTitle, customCriticalPaths, isColdStopFlow, displayOptions, currentFilter, headerColor);
                doc.save(`${ganttTitle}.pdf`);
            }
        } catch (err) { console.error(err); alert("Erreur lors de la création du PDF."); }
        finally { setIsDownloading(false); }
    };

    const handleShare = async () => {
        if (!navigator.share) { alert("Partage non supporté."); return; }
        if (viewMode === 'batch') { alert("Partage non supporté en mode Batch."); return; }
        setIsSharing(true);
        try {
            const displayOptions = { timelineUnit, timelineInterval, disciplineColors, showFlow: false, showChronology, showFamilyDetails, chronologyColor, headerFontColor, criticalPathsTitle };
            const exportFn = ganttVersion === 'premium' ? exportPremiumGanttToPDF : exportProfessionalGanttToPDF;
            const doc = await exportFn(displayResults, parameters, familyOrder, ganttTitle, customCriticalPaths, isColdStopFlow, displayOptions, currentFilter, headerColor);
            const file = new File([doc.output('blob')], `${ganttTitle}.pdf`, { type: 'application/pdf' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: ganttTitle });
            else alert("Partage de PDF non supporté par ce navigateur.");
        } catch (err) { if (err instanceof Error && err.name !== 'AbortError') alert(`Erreur de partage : ${(err as Error).message}`); }
        finally { setIsSharing(false); }
    };

    const isProcessing = isDownloading || isSharing;

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-[#020817] overflow-hidden">

            {/* ── TOP BAR ─────────────────────────────────────────────────── */}
            <header
                ref={headerRef}
                className="flex-shrink-0 flex items-center gap-3 px-4 h-14 bg-[#020817]/95 backdrop-blur-xl border-b border-white/[0.06] z-50"
                style={{ boxShadow: '0 1px 0 rgba(99,102,241,0.15), 0 4px 20px rgba(0,0,0,0.4)' }}
            >
                {/* Logo + Title */}
                <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <input
                        type="text"
                        value={ganttTitle}
                        onChange={(e) => setGanttTitle(e.target.value)}
                        className="bg-transparent border-0 text-[13px] font-black text-white focus:ring-0 w-56 placeholder:text-slate-600 outline-none hover:text-indigo-200 transition-colors"
                        placeholder="Titre du Gantt..."
                    />
                    {ganttVersion === 'premium' && (
                        <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-fuchsia-600 to-indigo-600 text-[8px] font-black text-white uppercase tracking-[0.15em]">Premium</span>
                    )}
                </div>

                {/* Divider */}
                <div className="h-5 w-px bg-white/10 flex-shrink-0"></div>

                {/* Status indicator */}
                <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500 flex-shrink-0">
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${ganttVersion === 'premium' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></div>
                    <span className="hidden sm:block">Engine</span>
                </div>

                {/* Divider */}
                <div className="h-5 w-px bg-white/10 flex-shrink-0"></div>

                {/* View mode switcher */}
                <div className="flex items-center gap-1 p-0.5 bg-white/5 rounded-lg border border-white/5 flex-shrink-0">
                    {(['global', 'range', 'batch'] as const).map(m => (
                        <button key={m} onClick={() => setViewMode(m)}
                            className={`px-2.5 py-1.5 rounded-md text-[8.5px] font-black uppercase tracking-wider transition-all ${viewMode === m ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>
                            {m === 'global' ? 'Global' : m === 'range' ? 'Plage' : 'Batch'}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative flex-shrink-0 hidden lg:block">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Rechercher famille..."
                        className="bg-white/5 border border-white/10 rounded-lg pl-7 pr-3 py-1.5 text-[10px] text-slate-300 placeholder-slate-600 outline-none focus:ring-1 focus:ring-indigo-500 w-44 transition-all"
                    />
                    <svg className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>

                {/* Spacer */}
                <div className="flex-1"></div>

                {/* Sequence controls */}
                <div className="flex items-center gap-1 px-3 py-1.5 bg-black/20 rounded-lg border border-white/5 flex-shrink-0">
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mr-1">Séq.</span>
                    <span className="text-white font-mono text-[10px] bg-indigo-600 px-1.5 rounded">{ganttCapabilities.nextAvailableNumber}</span>
                    <div className="h-4 w-px bg-white/10 mx-1"></div>
                    <button onClick={() => ganttRef.current?.handleBlockMove('up')} disabled={!ganttCapabilities.canMoveUp}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 transition-all">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                    </button>
                    <button onClick={() => ganttRef.current?.handleBlockMove('down')} disabled={!ganttCapabilities.canMoveDown}
                        className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-20 transition-all">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </button>
                    <div className="h-4 w-px bg-white/10 mx-1"></div>
                    <button onClick={() => ganttRef.current?.handleResetOrder()} className="text-[7.5px] font-black uppercase tracking-wider text-red-400 hover:text-red-300 px-1 transition-all">Reset</button>
                </div>

                {/* Task count badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex-shrink-0 hidden md:flex">
                    <span className="text-indigo-400 font-black text-[11px]">{taskCounts.visible}</span>
                    <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">/ {taskCounts.total}</span>
                </div>

                {/* Settings toggle */}
                <button
                    onClick={() => setDrawerOpen(!drawerOpen)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-all flex-shrink-0 ${drawerOpen ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'}`}
                    title="Paramètres"
                >
                    <svg className={`w-4 h-4 transition-transform duration-300 ${drawerOpen ? 'rotate-45' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                </button>

                <div className="h-5 w-px bg-white/10 flex-shrink-0"></div>

                {/* Share */}
                <button
                    onClick={handleShare}
                    disabled={isProcessing || !navigator.share || viewMode === 'batch'}
                    className="hidden sm:flex h-9 px-4 items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 font-black text-[9px] uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-40 flex-shrink-0"
                >
                    {isSharing ? <div className="animate-spin w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full" /> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>}
                    Partager
                </button>

                {/* Download */}
                <button
                    onClick={handleDownload}
                    disabled={isProcessing}
                    className={`h-9 px-5 flex items-center gap-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all shadow-lg relative overflow-hidden group flex-shrink-0 ${ganttVersion === 'premium' ? 'bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white disabled:grayscale disabled:opacity-50`}
                >
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    {isDownloading ? <div className="animate-spin w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full" /> : <svg className="w-3.5 h-3.5 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                    <span className="relative z-10">{viewMode === 'batch' ? 'ZIP' : `Générer`}</span>
                </button>

                {/* Close */}
                <button onClick={onClose}
                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-slate-500 hover:text-white hover:bg-red-500/15 hover:border-red-500/30 transition-all flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </header>

            {/* ── RANGE PICKER SUB-BAR (only in range mode) ───────────────── */}
            {viewMode === 'range' && (
                <div className="flex-shrink-0 flex items-center gap-4 px-4 py-2 bg-indigo-500/5 border-b border-indigo-500/20 z-40">
                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex-shrink-0">Plage :</span>
                    <input type="datetime-local" value={rangeStart} onChange={e => setRangeStart(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg text-[10px] text-slate-300 px-3 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500" />
                    <span className="text-slate-600 text-[10px]">→</span>
                    <input type="datetime-local" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg text-[10px] text-slate-300 px-3 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500" />
                    <span className="ml-auto text-[9px] text-indigo-400 font-black">{taskCounts.visible} tâches dans cette plage</span>
                </div>
            )}
            {viewMode === 'batch' && (
                <div className="flex-shrink-0 flex items-center gap-4 px-4 py-2 bg-fuchsia-500/5 border-b border-fuchsia-500/20 z-40">
                    <span className="text-[9px] font-black text-fuchsia-400 uppercase tracking-widest">Début de cycle :</span>
                    <input type="time" value={cycleStartTime} onChange={e => setCycleStartTime(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg text-[10px] text-fuchsia-400 px-3 py-1.5 font-black" />
                    <span className="text-[9px] text-slate-500 italic">Génère un PDF par shift de 24h</span>
                </div>
            )}

            {/* ── MAIN GANTT AREA ──────────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden relative">
                {/* Subtle canvas background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(99,102,241,0.04) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(217,70,239,0.03) 0%, transparent 50%)' }}></div>
                </div>

                <ProfessionalGanttChart
                    ref={ganttRef}
                    results={displayResults}
                    parameters={parameters}
                    familyOrder={familyOrder}
                    setFamilyOrder={setFamilyOrder}
                    customCriticalPaths={customCriticalPaths}
                    isColdStopFlow={isColdStopFlow}
                    timelineOptions={{ unit: timelineUnit, interval: timelineInterval }}
                    disciplineColors={disciplineColors}
                    showFlow={false}
                    showChronology={showChronology}
                    filter={currentFilter}
                    onTaskBlockSequenceChange={handleTaskBlockSequenceChange}
                    headerColor={headerColor}
                    headerFontColor={headerFontColor}
                    chronologyColor={chronologyColor}
                    criticalPathsTitle={criticalPathsTitle}
                    theme={ganttVersion === 'premium' ? 'dark' : 'light'}
                    searchTerm={searchTerm}
                    orderInputs={orderInputs}
                    setOrderInputs={setOrderInputs}
                    selectedTaskIds={selectedTaskIds}
                    setSelectedTaskIds={setSelectedTaskIds}
                    onCapabilitiesChange={setGanttCapabilities}
                    containerHeight={ganttHeight - (viewMode !== 'global' ? 40 : 0)}
                    isHoverDetailsEnabled={true}
                />
            </div>

            {/* ── SETTINGS DRAWER (slides up from bottom) ──────────────────── */}
            <div
                className={`absolute bottom-0 left-0 right-0 z-[60] transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${drawerOpen ? 'translate-y-0' : 'translate-y-full'}`}
                style={{ maxHeight: '75vh' }}
            >
                {/* Drawer backdrop */}
                {drawerOpen && <div className="fixed inset-0 z-[-1] bg-black/40" onClick={() => setDrawerOpen(false)}></div>}

                <div className="bg-[#0a0f1e] border-t border-white/10 shadow-[0_-20px_60px_rgba(0,0,0,0.7)] flex flex-col" style={{ maxHeight: '75vh' }}>
                    {/* Drawer handle + tabs */}
                    <div className="flex items-center px-6 pt-3 pb-0 gap-6 border-b border-white/5 flex-shrink-0">
                        <div className="w-8 h-1 rounded-full bg-white/20 flex-shrink-0 cursor-pointer mx-auto absolute left-1/2 -translate-x-1/2 top-2" onClick={() => setDrawerOpen(false)}></div>
                        <div className="flex items-center gap-0 pt-2">
                            {(['options', 'critical', 'style'] as const).map(tab => (
                                <button key={tab} onClick={() => setActiveTab(tab)}
                                    className={`px-5 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === tab ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}>
                                    {tab === 'options' ? 'Options' : tab === 'critical' ? 'Chemins Critiques' : 'Design'}
                                </button>
                            ))}
                        </div>
                        <div className="ml-auto flex-shrink-0">
                            <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg bg-white/5 text-slate-500 hover:text-white transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Tab content */}
                    <div className="overflow-y-auto p-6 pb-8 flex-1">
                        {activeTab === 'options' && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                                {/* Timeline scale */}
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block">Échelle Temporelle</label>
                                    <div className="flex gap-2">
                                        <select value={timelineUnit} onChange={e => setTimelineUnit(e.target.value as any)}
                                            className="flex-1 bg-slate-900 border border-slate-700/60 rounded-xl text-xs text-slate-300 px-3 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500 appearance-none">
                                            <option value="Heures">Zoom Horaire</option>
                                            <option value="Jours">Vue Journalière</option>
                                            <option value="Semaines">Vue Hebdomadaire</option>
                                            <option value="Mois">Vue Mensuelle</option>
                                            <option value="Années">Vue Annuelle</option>
                                        </select>
                                        <input type="number" value={timelineInterval}
                                            onChange={e => setTimelineInterval(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                            className="w-16 bg-slate-900 border border-slate-700/60 rounded-xl text-xs text-slate-300 px-3 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500 text-center font-bold" />
                                    </div>
                                </div>

                                {/* Toggles */}
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block">Contenu</label>
                                    <div className="space-y-2">
                                        <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors">
                                            <span className="text-[11px] text-slate-300 font-medium">Chronologie Maîtresse</span>
                                            <input type="checkbox" checked={showChronology} onChange={e => setShowChronology(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500" />
                                        </label>
                                        <label className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 cursor-pointer hover:bg-slate-800 transition-colors">
                                            <span className="text-[11px] text-slate-300 font-medium">Détails Familles</span>
                                            <input type="checkbox" checked={showFamilyDetails} onChange={e => setShowFamilyDetails(e.target.checked)} className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500" />
                                        </label>
                                    </div>
                                </div>

                                {/* Gantt Version */}
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block">Thème PDF</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(['classic', 'premium'] as const).map(v => (
                                            <button key={v} onClick={() => setGanttVersion(v)}
                                                className={`p-3 rounded-xl border-2 transition-all ${ganttVersion === v ? (v === 'classic' ? 'bg-emerald-600/10 border-emerald-500' : 'bg-indigo-600/10 border-indigo-500') : 'bg-slate-900/20 border-slate-800 hover:border-slate-700'}`}>
                                                <div className={`w-full h-4 rounded mb-2 ${v === 'classic' ? 'bg-white' : 'bg-slate-800'} flex items-center justify-center`}>
                                                    <div className={`w-8 h-1.5 rounded ${v === 'classic' ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${ganttVersion === v ? (v === 'classic' ? 'text-emerald-400' : 'text-indigo-400') : 'text-slate-600'}`}>{v === 'classic' ? 'Épuré' : 'Premium'}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Colors */}
                                <div className="space-y-3">
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block">Couleurs</label>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                                            <span className="text-[11px] text-slate-300 font-medium">En-têtes PDF</span>
                                            <input type="color" value={headerColor} onChange={e => setHeaderColor(e.target.value)} className="w-7 h-7 rounded-md bg-transparent border-0 p-0 cursor-pointer" />
                                        </div>
                                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                                            <span className="text-[11px] text-slate-300 font-medium">Chronologie</span>
                                            <input type="color" value={chronologyColor} onChange={e => setChronologyColor(e.target.value)} className="w-7 h-7 rounded-md bg-transparent border-0 p-0 cursor-pointer" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'critical' && (
                            <div className="space-y-4 max-w-3xl">
                                <div className="flex items-center justify-between">
                                    <input type="text" value={criticalPathsTitle} onChange={e => setCriticalPathsTitle(e.target.value)}
                                        className="bg-slate-900 border border-slate-700 rounded-xl text-xs text-indigo-400 px-4 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500 font-bold w-80 placeholder:text-slate-600"
                                        placeholder="Nom de cette section..." />
                                    <button onClick={handleAddPath} className="px-4 py-2.5 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all text-xs font-black flex items-center gap-2">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                        Ajouter
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {customCriticalPaths.length === 0 && (
                                        <div className="col-span-2 flex flex-col items-center justify-center py-10 text-center bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                                            <p className="text-[11px] text-slate-500 font-medium">Aucun chemin personnalisé défini.</p>
                                        </div>
                                    )}
                                    {customCriticalPaths.map(path => (
                                        <div key={path.id} className="group p-4 bg-slate-900/60 rounded-2xl border border-slate-700/60 space-y-3 relative hover:border-indigo-500/40 transition-colors">
                                            <button onClick={() => handleRemovePath(path.id)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 transition-all rounded-lg hover:bg-red-500/10">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                            <div className="flex items-center gap-2">
                                                <input type="color" value={path.color} onChange={e => handlePathChange(path.id, 'color', e.target.value)} className="w-6 h-6 rounded bg-transparent border-0 p-0 cursor-pointer" />
                                                <input type="text" value={path.name} onChange={e => handlePathChange(path.id, 'name', e.target.value)} className="flex-1 bg-transparent text-xs text-slate-200 font-bold outline-none border-b border-transparent hover:border-slate-600 focus:border-indigo-500 transition-colors" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div><label className="text-[8px] font-bold text-slate-500 uppercase px-1">Début</label>
                                                    <input type="datetime-local" value={path.start} onChange={e => handlePathChange(path.id, 'start', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg text-[9px] text-slate-300 px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500" /></div>
                                                <div><label className="text-[8px] font-bold text-slate-500 uppercase px-1">Fin</label>
                                                    <input type="datetime-local" value={path.end} onChange={e => handlePathChange(path.id, 'end', e.target.value)} className="w-full bg-slate-900 border border-slate-800 rounded-lg text-[9px] text-slate-300 px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-500" /></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'style' && (
                            <div className="space-y-4">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] block">Couleurs par Discipline</label>
                                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                                    {Array.from(disciplineColors.keys()).map(disciplineName => (
                                        <div key={disciplineName} className="flex items-center gap-2 p-2 rounded-xl bg-slate-900/40 border border-slate-800/60 hover:bg-slate-800/40 transition-colors">
                                            <input type="color" value={disciplineColors.get(disciplineName)} onChange={e => handleColorChange(disciplineName, e.target.value)} className="w-5 h-5 rounded bg-transparent border-0 p-0 cursor-pointer" />
                                            <span className="text-[8.5px] text-slate-400 font-black uppercase truncate" title={disciplineName}>{disciplineName}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom status bar */}
            <div className="flex-shrink-0 h-6 bg-[#020817]/80 border-t border-white/[0.04] flex items-center px-4 gap-4">
                <span className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em]">SYSTÈME PLANNEX ENGINE V4.0</span>
                <div className="ml-auto flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">Prêt pour production</span>
                    </div>
                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-wider">{taskCounts.total} tâches • {ganttVersion === 'premium' ? 'Mode Premium' : 'Mode Épuré'}</span>
                </div>
            </div>
        </div>
    );
};
