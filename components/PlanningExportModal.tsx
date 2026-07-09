
import React, { useState, useEffect, useMemo } from 'react';
import type { CalculationResults, AppParameters, ScheduledTask } from '../types';
import { exportPlanningToPDF } from '../services/planningPdfExportService';
import { ExportPreviewModal, PreviewData } from './ExportPreviewModal';

declare var JSZip: any;

interface PlanningExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    results: CalculationResults;
    parameters: AppParameters;
    specialTasks: ScheduledTask[];
    title: string;
    setTitle: (title: string) => void;
    familyOrder: string[];
    setFamilyOrder: (order: string[]) => void;
}

const AVAILABLE_COLUMNS = [
    { key: 'action', label: 'Action', default: true },
    { key: 'ot', label: 'OT', default: true },
    { key: 'avis', label: 'Avis', default: false },
    { key: 'equipment', label: 'Équipement', default: true },
    { key: 'discipline', label: 'Discipline', default: true },
    { key: 'maintenanceType', label: 'Type Maint.', default: true },
    { key: 'startTime', label: 'Début', default: true },
    { key: 'endTime', label: 'Fin', default: true },
    { key: 'manpower', label: 'Pers.', default: true },
    { key: 'duration', label: 'Durée (h)', default: true },
    { key: 'manHours', label: 'Total H-H', default: true }
];

// Helper to get local date string YYYY-MM-DD to avoid UTC shift issues
const getLocalDateKey = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const PlanningExportModal: React.FC<PlanningExportModalProps> = ({
    isOpen,
    onClose,
    results,
    parameters,
    specialTasks,
    title,
    setTitle,
    familyOrder,
    setFamilyOrder
}) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [orderInputs, setOrderInputs] = useState<Record<string, string>>({});
    const [localFamilyOrder, setLocalFamilyOrder] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [filterMode, setFilterMode] = useState<'all' | 'range' | 'daily'>('all');
    const [rangeStart, setRangeStart] = useState('');
    const [rangeEnd, setRangeEnd] = useState('');

    // Cycle Management
    const [cycleStartTime, setCycleStartTime] = useState('06:00');
    const [ignoreEmptyDays, setIgnoreEmptyDays] = useState(true);

    // Advanced Content Filters
    const [maintTypeFilter, setMaintTypeFilter] = useState<string>('all');
    const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
    const [manpowerFilter, setManpowerFilter] = useState<string>('');

    // Export Options
    const [showChronology, setShowChronology] = useState(true);
    const [showSubtotals, setShowSubtotals] = useState(true);

    // Dashboard & Granular Options
    const [showDashboard, setShowDashboard] = useState(false); // Default: NO
    const [dashboardOptions, setDashboardOptions] = useState({
        kpis: true,
        charts: true, // Includes Manpower Chart
        hse: true,
        density: true,
        scope: true // Renamed conceptually to "Maintenance Distribution" but key stays for compatibility
    });

    const [selectedColumnKeys, setSelectedColumnKeys] = useState<string[]>(
        AVAILABLE_COLUMNS.filter(c => c.default).map(c => c.key)
    );

    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (Object.keys(orderInputs).length === 0) {
                setLocalFamilyOrder(familyOrder);
            }
            setSearchTerm('');
            setFilterMode('all');
            setIsPreviewModalOpen(false);
            setPreviewData(null);

            // Reset advanced filters
            setMaintTypeFilter('all');
            setDisciplineFilter('all');
            setManpowerFilter('');

            // Reset Dashboard Options
            setShowDashboard(false);
            setDashboardOptions({ kpis: true, charts: true, hse: true, density: true, scope: true });

            // Reset cycle defaults
            setCycleStartTime('06:00');
            setIgnoreEmptyDays(true);

            const start = new Date(parameters.shutdownStart);
            const end = new Date(parameters.shutdownEnd);
            const toDateTimeLocal = (date: Date) => {
                const tzoffset = date.getTimezoneOffset() * 60000;
                return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
            };
            setRangeStart(toDateTimeLocal(start));
            setRangeEnd(toDateTimeLocal(end));
        }
    }, [isOpen, familyOrder, parameters]);

    const uniqueMaintenanceTypes = useMemo(() => {
        const types = new Set<string>();
        results.scheduledTasks.forEach(t => {
            if (t.maintenanceType) types.add(t.maintenanceType);
        });
        return Array.from(types).sort();
    }, [results.scheduledTasks]);

    const uniqueDisciplines = useMemo(() => {
        const discs = new Set<string>();
        results.scheduledTasks.forEach(t => {
            const disc = t.team.split(' ')[0] || t.team;
            if (disc) discs.add(disc);
        });
        return Array.from(discs).sort();
    }, [results.scheduledTasks]);

    const nextAvailableNumber = useMemo(() => {
        const numbers = Object.values(orderInputs)
            .map(val => parseInt(val, 10))
            .filter(num => !isNaN(num));
        if (numbers.length === 0) return 1;
        return Math.max(...numbers) + 1;
    }, [orderInputs]);

    if (!isOpen) return null;

    const handleOrderChange = (family: string, value: string) => {
        const newOrderInputs = { ...orderInputs, [family]: value.replace(/[^0-9]/g, '') };
        setOrderInputs(newOrderInputs);

        const sorted = [...localFamilyOrder].sort((a: string, b: string) => {
            const numA = newOrderInputs[a] ? parseInt(newOrderInputs[a], 10) : Infinity;
            const numB = newOrderInputs[b] ? parseInt(newOrderInputs[b], 10) : Infinity;
            if (numA !== Infinity && numB !== Infinity) {
                if (numA === numB) return a.localeCompare(b);
                return numA - numB;
            }
            if (numA !== Infinity) return -1;
            if (numB !== Infinity) return 1;
            return a.localeCompare(b);
        });

        setLocalFamilyOrder(sorted);
    };

    const handleResetOrder = () => {
        setOrderInputs({});
        setLocalFamilyOrder([...localFamilyOrder].sort((a, b) => a.localeCompare(b)));
    };

    const toggleDashboardOption = (key: keyof typeof dashboardOptions) => {
        setDashboardOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const applyContentFilters = (tasks: ScheduledTask[]): ScheduledTask[] => {
        return tasks.filter(t => {
            if (maintTypeFilter !== 'all') {
                if (t.maintenanceType !== maintTypeFilter) return false;
            }
            if (disciplineFilter !== 'all') {
                if (t.discipline !== disciplineFilter) return false;
            }
            if (manpowerFilter !== '') {
                const mp = parseInt(manpowerFilter, 10);
                if (!isNaN(mp) && t.manpower !== mp) return false;
            }
            return true;
        });
    };

    const getCycleOffsetMs = () => {
        const [hours, minutes] = cycleStartTime.split(':').map(Number);
        return (hours * 3600 * 1000) + (minutes * 60 * 1000);
    };

    const generatePreview = () => {
        const totalTasksInProject = results.scheduledTasks.length;
        let baseTasks = applyContentFilters(results.scheduledTasks);
        let finalTasks = baseTasks;
        let chartData: { label: string; value: number; color?: string; isOverloaded?: boolean }[] = [];
        let chartType: 'families' | 'days' = 'families';
        let warnings: string[] = [];
        let dailyResourceData: PreviewData['dailyResourceData'] = [];

        // Filter Logic
        if (filterMode === 'range') {
            const start = new Date(rangeStart).getTime();
            const end = new Date(rangeEnd).getTime();
            finalTasks = baseTasks.filter(t => t.startTime.getTime() < end && t.endTime.getTime() > start);
        } else if (filterMode === 'daily') {
            chartType = 'days';
        }

        if (finalTasks.length === 0) {
            warnings.push("Attention : Vos filtres actuels ne retournent aucun résultat.");
        }

        // Health Check Logic
        const healthStats = { missingDuration: 0, missingManpower: 0, outOfBounds: 0 };
        const shutdownEndTs = new Date(parameters.shutdownEnd).getTime();
        finalTasks.forEach(t => {
            if (t.duration <= 0) healthStats.missingDuration++;
            if (t.manpower <= 0) healthStats.missingManpower++;
            if (t.endTime.getTime() > shutdownEndTs) healthStats.outOfBounds++;
        });

        // Chart Data: Total Man-Hours per Discipline (Vertical Bar Chart)
        if (chartType === 'families') {
            const discManHours: Record<string, number> = {};
            finalTasks.forEach(t => {
                const disc = t.team.split(' ')[0] || 'Général';
                discManHours[disc] = (discManHours[disc] || 0) + t.manHours;
            });
            chartData = Object.entries(discManHours)
                .map(([label, value]) => ({ label, value, color: 'bg-indigo-500' }))
                .sort((a, b) => b.value - a.value); // Sort Descending
        } else {
            // Daily task count chart (existing logic for 'daily' mode preview)
            const counts: Record<string, number> = {};
            const cycleOffset = getCycleOffsetMs();
            const tasksToChart = filterMode === 'daily' ? baseTasks : finalTasks;

            tasksToChart.forEach(t => {
                const shiftedStart = new Date(t.startTime.getTime() - cycleOffset);
                const shiftedEnd = new Date(t.endTime.getTime() - cycleOffset);
                let current = new Date(shiftedStart);
                current.setHours(0, 0, 0, 0);
                while (current <= shiftedEnd) {
                    const dayKey = getLocalDateKey(current);
                    counts[dayKey] = (counts[dayKey] || 0) + 1;
                    current.setDate(current.getDate() + 1);
                }
            });
            chartData = Object.entries(counts)
                .sort((a, b) => a[0].localeCompare(b[0]))
                .map(([dateStr, value]) => ({
                    label: new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
                    value,
                    color: 'bg-blue-500',
                }));
        }

        // --- STACKED HISTOGRAM: SUM BY ACTIVE TEAMS, NOT TASKS ---
        const resourceUsage: Record<string, Record<string, number>> = {};
        const disciplines = new Set<string>();

        const start = new Date(parameters.shutdownStart); start.setHours(0, 0, 0, 0);
        const end = new Date(parameters.shutdownEnd); end.setHours(23, 59, 59, 999);
        const actualEnd = finalTasks.length > 0 ? new Date(Math.max(end.getTime(), ...finalTasks.map(t => t.endTime.getTime()))) : end;
        actualEnd.setHours(23, 59, 59, 999);

        for (let d = new Date(start); d <= actualEnd; d.setDate(d.getDate() + 1)) {
            resourceUsage[getLocalDateKey(d)] = {};
        }

        const activeTeamsPerDay: Record<string, Record<string, number>> = {};

        finalTasks.forEach(task => {
            const disc = task.team.split(' ')[0] || task.team;
            disciplines.add(disc);
            const teamName = task.team;

            let cursor = new Date(task.startTime);
            while (cursor < task.endTime) {
                const dayKey = getLocalDateKey(cursor);

                if (resourceUsage[dayKey]) {
                    if (!activeTeamsPerDay[dayKey]) activeTeamsPerDay[dayKey] = {};
                    const currentRecorded = activeTeamsPerDay[dayKey][teamName] || 0;
                    if (task.manpower > currentRecorded) {
                        activeTeamsPerDay[dayKey][teamName] = task.manpower;
                    }
                }
                cursor.setDate(cursor.getDate() + 1);
                cursor.setHours(0, 0, 0, 0);
            }
        });

        Object.entries(activeTeamsPerDay).forEach(([dayKey, teamsMap]) => {
            Object.entries(teamsMap).forEach(([teamName, count]) => {
                const disc = teamName.split(' ')[0] || teamName;
                resourceUsage[dayKey][disc] = (resourceUsage[dayKey][disc] || 0) + count;
            });
        });

        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#64748b'];
        const sortedDisciplines = Array.from(disciplines).sort();

        dailyResourceData = Object.entries(resourceUsage).map(([date, values]) => {
            return {
                date,
                disciplines: sortedDisciplines.map((disc, idx) => ({
                    name: disc,
                    value: values[disc] || 0,
                    color: colors[idx % colors.length]
                })).filter(d => d.value > 0)
            };
        }).sort((a, b) => a.date.localeCompare(b.date));


        // Maintenance Type Stats for Donut
        const maintCounts: Record<string, number> = {};
        finalTasks.forEach(t => {
            const type = t.maintenanceType?.toUpperCase() || 'AUTRES';
            maintCounts[type] = (maintCounts[type] || 0) + 1;
        });
        const total = finalTasks.length;

        const getColor = (type: string) => {
            if (type.includes('PREV') || type.includes('PRÉV')) return '#10b981';
            if (type.includes('CORR')) return '#f59e0b';
            if (type.includes('SYS')) return '#3b82f6';
            if (type.includes('MOD') || type.includes('NEUF')) return '#8b5cf6';
            return '#64748b';
        };

        const maintenanceStats = Object.entries(maintCounts).map(([label, count]) => ({
            label,
            count,
            percentage: total > 0 ? (count / total) * 100 : 0,
            color: getColor(label)
        })).sort((a, b) => b.count - a.count);


        const totalManHours = finalTasks.reduce((sum, t) => sum + t.manHours, 0);
        const uniqueFamilies = new Set(finalTasks.map(t => t.family)).size;
        const estPages = Math.ceil(finalTasks.length / 18) + uniqueFamilies + (showChronology ? 1 : 0) + (showDashboard ? 1 : 0);

        const data: PreviewData = {
            totalTasksInProject,
            totalTasks: finalTasks.length,
            totalManHours,
            familyCount: uniqueFamilies,
            estimatedPages: estPages,
            chartData,
            chartType,
            maintenanceStats,
            sampleTasks: finalTasks.slice(0, 5) as ScheduledTask[],
            warnings,
            healthStats,
            dailyResourceData
        };

        setPreviewData(data);
        setIsPreviewModalOpen(true);
    };


    const handleAction = async (actionType: 'download' | 'share') => {
        const finalOrder = localFamilyOrder;
        setFamilyOrder(finalOrder);

        const sortedSelectedColumns = AVAILABLE_COLUMNS
            .filter(col => selectedColumnKeys.includes(col.key))
            .map(col => ({ key: col.key, label: col.label }));

        const isDownload = actionType === 'download';
        if (isDownload) setIsDownloading(true); else setIsSharing(true);

        try {
            const contentFilters = {
                maintenanceType: maintTypeFilter !== 'all' ? [maintTypeFilter] : undefined,
                discipline: disciplineFilter !== 'all' ? [disciplineFilter] : undefined,
                manpower: manpowerFilter ? parseInt(manpowerFilter, 10) : undefined
            };

            const options = {
                showChronology,
                showSubtotals,
                showDashboard,
                dashboardOptions,
                selectedColumns: sortedSelectedColumns,
                contentFilters
            };

            if (filterMode === 'all') {
                const doc = await exportPlanningToPDF(results, parameters, title, finalOrder, specialTasks, null, options);
                if (isDownload) doc.save(`${title}.pdf`);
                else await shareDoc(doc, `${title}.pdf`);

            } else if (filterMode === 'range') {
                if (!rangeStart || !rangeEnd) {
                    alert("Veuillez sélectionner une plage de dates valide.");
                    return;
                }
                const filter = { start: new Date(rangeStart), end: new Date(rangeEnd) };
                const doc = await exportPlanningToPDF(results, parameters, title, finalOrder, specialTasks, filter, options);
                if (isDownload) doc.save(`${title}_Filtre.pdf`);
                else await shareDoc(doc, `${title}_Filtre.pdf`);

            } else if (filterMode === 'daily') {
                const filteredBaseTasks = applyContentFilters(results.scheduledTasks);

                if (filteredBaseTasks.length === 0) {
                    alert("Aucune tâche ne correspond à vos filtres.");
                    return;
                }

                const minStart = Math.min(...filteredBaseTasks.map(t => t.startTime.getTime()));
                const maxEnd = Math.max(...filteredBaseTasks.map(t => t.endTime.getTime()));

                const [cycleH, cycleM] = cycleStartTime.split(':').map(Number);

                let cursor = new Date(minStart);
                cursor.setHours(cycleH, cycleM, 0, 0);
                if (cursor.getTime() > minStart) {
                    cursor.setDate(cursor.getDate() - 1);
                }

                const filesToGenerate: { date: Date, filter: { start: Date, end: Date }, count: number }[] = [];

                while (cursor.getTime() < maxEnd) {
                    const shiftStart = new Date(cursor);
                    const shiftEnd = new Date(cursor);
                    shiftEnd.setDate(shiftEnd.getDate() + 1);

                    const tasksInShift = filteredBaseTasks.filter(t =>
                        t.startTime.getTime() < shiftEnd.getTime() && t.endTime.getTime() > shiftStart.getTime()
                    );

                    if (tasksInShift.length > 0 || !ignoreEmptyDays) {
                        filesToGenerate.push({
                            date: new Date(shiftStart),
                            filter: { start: shiftStart, end: shiftEnd },
                            count: tasksInShift.length
                        });
                    }
                    cursor.setDate(cursor.getDate() + 1);
                }

                if (filesToGenerate.length === 0) {
                    alert("Aucun fichier à générer avec les paramètres actuels.");
                    return;
                }

                if (isDownload) {
                    if (typeof JSZip === 'undefined') {
                        alert("La librairie de compression (JSZip) n'a pas pu être chargée. Veuillez vérifier votre connexion internet et réessayer.");
                        return;
                    }
                    if (filesToGenerate.length > 20) {
                        if (!window.confirm(`Vous allez compresser ${filesToGenerate.length} fichiers PDF dans une archive ZIP. Continuer ?`)) {
                            setIsDownloading(false);
                            return;
                        }
                    }

                    const zip = new JSZip();

                    for (const fileData of filesToGenerate) {
                        const y = fileData.date.getFullYear();
                        const m = (fileData.date.getMonth() + 1).toString().padStart(2, '0');
                        const d = fileData.date.getDate().toString().padStart(2, '0');
                        const dateStr = `${y}-${m}-${d}`;

                        const shiftTitle = `${title} - ${dateStr}`;
                        const doc = await exportPlanningToPDF(results, parameters, shiftTitle, finalOrder, specialTasks, fileData.filter, options);
                        const pdfBlob = doc.output('blob');
                        zip.file(`${title.replace(/[^a-z0-9]/gi, '_')}_${dateStr}.pdf`, pdfBlob);
                    }

                    const zipBlob = await zip.generateAsync({ type: "blob" });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(zipBlob);
                    const zipFileName = `${title.replace(/[^a-z0-9]/gi, '_')}_Batch_${new Date().toISOString().split('T')[0]}.zip`;
                    link.download = zipFileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(link.href);

                } else { // Share
                    alert("Le partage de plusieurs fichiers en batch n'est pas supporté. Veuillez utiliser le téléchargement pour obtenir une archive ZIP.");
                }
            }
            if (actionType !== 'download') {
                onClose();
            }
        } finally {
            if (isDownload) setIsDownloading(false); else setIsSharing(false);
        }
    };

    const shareDoc = async (doc: any, fileName: string) => {
        const file = new File([doc.output('blob')], fileName, { type: 'application/pdf' });
        await shareFiles([file], title);
    };

    const shareFiles = async (files: File[], title: string) => {
        if (!navigator.share) {
            alert("La fonction de partage n'est pas supportée sur ce navigateur.");
            return;
        }
        try {
            if (navigator.canShare && navigator.canShare({ files })) {
                await navigator.share({ files, title: title });
            } else {
                alert("Le partage de fichiers n'est pas supporté.");
            }
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') console.error('Share error:', error);
        }
    };

    return (
        <>
            <ExportPreviewModal
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                data={previewData}
                selectedColumns={AVAILABLE_COLUMNS.filter(col => selectedColumnKeys.includes(col.key))}
            />
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                <style>{`
                  .red-scrollbar::-webkit-scrollbar { width: 8px; }
                  .red-scrollbar::-webkit-scrollbar-track { background: transparent; }
                  .red-scrollbar::-webkit-scrollbar-thumb { background-color: #3b82f6; border-radius: 20px; border: 2px solid #1e293b; }
                  .red-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #2563eb; }
                  .red-scrollbar { scrollbar-width: thin; scrollbar-color: #3b82f6 transparent; }
              `}</style>
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] border border-slate-700/50 flex flex-col overflow-hidden ring-1 ring-white/10" onClick={e => e.stopPropagation()}>
                    <header className="flex justify-between items-center px-6 py-5 border-b border-slate-700/50 bg-slate-900/50 flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/20 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white tracking-wide">Exporter le Planning par Famille</h2>
                                <p className="text-sm text-slate-400">Configurez et générez un rapport PDF détaillé par famille d'équipements</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => handleAction('share')}
                                disabled={isDownloading || isSharing || !navigator.share || filterMode === 'daily'}
                                className="font-bold py-2 px-5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 hover:border-sky-500/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                title={filterMode === 'daily' ? "Le partage de plusieurs fichiers n'est pas supporté. Veuillez télécharger l'archive ZIP." : "Partager le PDF"}
                            >
                                {isSharing ? (
                                    <><span className="w-4 h-4 rounded-full border-2 border-sky-400 border-t-transparent animate-spin"></span> Partage...</>
                                ) : (
                                    <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg> Partager</>
                                )}
                            </button>
                            <button
                                onClick={() => handleAction('download')}
                                disabled={isDownloading || isSharing}
                                className="font-bold py-2 px-6 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isDownloading ? (
                                    <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span> Création...</>
                                ) : (
                                    <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> {filterMode === 'daily' ? 'Télécharger (.zip)' : 'Télécharger'}</>
                                )}
                            </button>
                            <div className="h-8 w-px bg-slate-700 mx-1"></div>
                            <button onClick={onClose} className="text-slate-400 hover:text-red-400 p-2 rounded-lg hover:bg-slate-800 transition-colors" aria-label="Fermer">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </div>
                    </header>
                    <main className="p-6 flex-1 overflow-y-auto red-scrollbar bg-slate-900/30">

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                            {/* LEFT COLUMN: Setup */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Titre */}
                                <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                                    <label htmlFor="planning-title" className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">Titre du Document</label>
                                    <input id="planning-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full bg-slate-900/80 border border-slate-600 rounded-lg px-4 py-3 text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                                </div>

                                {/* Période */}
                                <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                                    <label className="block text-sm font-bold text-slate-300 mb-3 uppercase tracking-wider">Période d'Exportation</label>
                                    <div className="grid grid-cols-3 gap-3 mb-4">
                                        <button onClick={() => setFilterMode('all')} className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${filterMode === 'all' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'}`}>
                                            <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <span className="text-xs font-bold">Projet Complet</span>
                                        </button>

                                        <button onClick={() => setFilterMode('range')} className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${filterMode === 'range' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'}`}>
                                            <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            <span className="text-xs font-bold">Plage Définie</span>
                                        </button>

                                        <button onClick={() => setFilterMode('daily')} className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${filterMode === 'daily' ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:border-slate-600'}`}>
                                            <svg className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                                            <span className="text-xs font-bold">Batch Quotidien</span>
                                        </button>
                                    </div>

                                    <div className="bg-slate-900/80 rounded-xl border border-slate-700/80 p-5 mt-2 transition-all">
                                        {filterMode === 'all' && (
                                            <div className="text-center py-2">
                                                <p className="text-blue-400 font-medium">Exportation Totale</p>
                                                <p className="text-xs text-slate-400 mt-2">Le rapport généré inclura toutes les tâches planifiées du projet du premier au dernier jour.</p>
                                            </div>
                                        )}

                                        {filterMode === 'range' && (
                                            <div className="grid grid-cols-2 gap-6">
                                                <div>
                                                    <label htmlFor="range-start" className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Date début (Inclus)</label>
                                                    <input id="range-start" type="datetime-local" value={rangeStart} onChange={e => setRangeStart(e.target.value)} className="w-full bg-slate-800 border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
                                                </div>
                                                <div>
                                                    <label htmlFor="range-end" className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">Date fin (Exclus)</label>
                                                    <input id="range-end" type="datetime-local" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} className="w-full bg-slate-800 border-slate-600 rounded-lg px-3 py-2 text-sm text-white" />
                                                </div>
                                            </div>
                                        )}

                                        {filterMode === 'daily' && (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                                                    <div>
                                                        <label htmlFor="cycle-start" className="text-sm font-bold text-white block">Heure de coupure (Shift)</label>
                                                        <p className="text-[10px] text-slate-400">Heure de début d'une journée de travail</p>
                                                    </div>
                                                    <input
                                                        id="cycle-start"
                                                        type="time"
                                                        value={cycleStartTime}
                                                        onChange={e => setCycleStartTime(e.target.value)}
                                                        className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-emerald-400 font-bold w-28 text-center"
                                                    />
                                                </div>
                                                <label className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors">
                                                    <div>
                                                        <span className="text-sm font-bold text-white block">Ignorer jours inactifs</span>
                                                        <span className="text-[10px] text-slate-400 block mt-0.5">Ne pas générer de rapport pour les jours sans tâche</span>
                                                    </div>
                                                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${ignoreEmptyDays ? 'bg-blue-600' : 'bg-slate-600'}`}>
                                                        <input type="checkbox" className="sr-only" checked={ignoreEmptyDays} onChange={e => setIgnoreEmptyDays(e.target.checked)} />
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${ignoreEmptyDays ? 'translate-x-6' : 'translate-x-1'}`} />
                                                    </div>
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Filtres Optionnels */}
                                <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                                    <label className="block text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Filtres de Contenu Supplémentaires</label>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Discipline</label>
                                            <select value={disciplineFilter} onChange={e => setDisciplineFilter(e.target.value)} className="w-full bg-slate-900/80 border border-slate-600/80 rounded-lg text-sm px-3 py-2 text-slate-200 focus:border-blue-500 outline-none">
                                                <option value="all">Toutes disciplines</option>
                                                {uniqueDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Type Maintenance</label>
                                            <select value={maintTypeFilter} onChange={e => setMaintTypeFilter(e.target.value)} className="w-full bg-slate-900/80 border border-slate-600/80 rounded-lg text-sm px-3 py-2 text-slate-200 focus:border-blue-500 outline-none">
                                                <option value="all">Tous types</option>
                                                {uniqueMaintenanceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Effectif requis</label>
                                            <input type="number" value={manpowerFilter} onChange={e => setManpowerFilter(e.target.value)} placeholder="Ignorer" className="w-full bg-slate-900/80 border border-slate-600/80 rounded-lg text-sm px-3 py-2 text-slate-200 focus:border-blue-500 outline-none placeholder:text-slate-600" />
                                        </div>
                                    </div>
                                </div>

                                <button type="button" onClick={generatePreview} className="text-sm bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold py-3.5 px-4 rounded-xl w-full shadow-lg shadow-sky-900/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-95 border border-sky-400/20">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    Vérifier le contenu avant exportation (HUD)
                                </button>
                            </div>

                            {/* RIGHT COLUMN: Display & Layout */}
                            <div className="space-y-6">
                                <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                                    <label className="block text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Mise en page</label>

                                    <div className="space-y-4">
                                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                                            <label className="flex items-center justify-between cursor-pointer group">
                                                <div>
                                                    <span className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">Tableau de Bord Exécutif</span>
                                                    <span className="block text-xs text-slate-400 mt-0.5">Ajoute une page d'analyse complète en tête</span>
                                                </div>
                                                <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showDashboard ? 'bg-blue-600' : 'bg-slate-600'}`}>
                                                    <input type="checkbox" className="sr-only" checked={showDashboard} onChange={e => setShowDashboard(e.target.checked)} />
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showDashboard ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </div>
                                            </label>

                                            {showDashboard && (
                                                <div className="mt-4 pt-4 border-t border-slate-700/50 grid grid-cols-1 gap-2.5 animate-fade-in pl-1">
                                                    {[
                                                        { key: 'kpis' as const, label: 'Chiffres Clés' },
                                                        { key: 'charts' as const, label: 'Effectifs & Graphiques' },
                                                        { key: 'density' as const, label: 'Densité & Matrice' },
                                                        { key: 'scope' as const, label: 'Répartition Maint.' }
                                                    ].map(opt => (
                                                        <label key={opt.key} className="flex items-center gap-3 cursor-pointer group/opt">
                                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${dashboardOptions[opt.key] ? 'bg-blue-500 border-blue-500' : 'bg-slate-800 border-slate-500'}`}>
                                                                {dashboardOptions[opt.key] && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                            </div>
                                                            <input type="checkbox" className="sr-only" checked={dashboardOptions[opt.key]} onChange={() => toggleDashboardOption(opt.key)} />
                                                            <span className="text-sm text-slate-300 group-hover/opt:text-white transition-colors">{opt.label}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <label className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 cursor-pointer group">
                                            <div>
                                                <span className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">Chronologie Maîtresse</span>
                                                <span className="block text-xs text-slate-400 mt-0.5">Lister les événements vitaux de l'arrêt</span>
                                            </div>
                                            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showChronology ? 'bg-amber-500' : 'bg-slate-600'}`}>
                                                <input type="checkbox" className="sr-only" checked={showChronology} onChange={e => setShowChronology(e.target.checked)} />
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showChronology ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </div>
                                        </label>

                                        <label className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 cursor-pointer group">
                                            <div>
                                                <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Sous-totaux par Groupe</span>
                                                <span className="block text-xs text-slate-400 mt-0.5">Calculer durées et HH / famille</span>
                                            </div>
                                            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showSubtotals ? 'bg-emerald-500' : 'bg-slate-600'}`}>
                                                <input type="checkbox" className="sr-only" checked={showSubtotals} onChange={e => setShowSubtotals(e.target.checked)} />
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showSubtotals ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider">Colonnes</label>
                                        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">{selectedColumnKeys.length} sél.</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {AVAILABLE_COLUMNS.map(col => {
                                            const isActive = selectedColumnKeys.includes(col.key);
                                            return (
                                                <button
                                                    key={col.key}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedColumnKeys(prev => prev.includes(col.key) ? prev.filter(k => k !== col.key) : [...prev, col.key]);
                                                    }}
                                                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${isActive ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'bg-slate-900 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-500'}`}
                                                >
                                                    {col.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Ordre des familles en bas */}
                        <div className="mt-6 bg-slate-800/50 p-5 rounded-xl border border-slate-700/50">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-300 uppercase tracking-wider">Ordre d'impression des Familles</label>
                                    <p className="text-xs text-slate-400 mt-1">Saisissez un numéro pour réorganiser les pages PDF. Laissez vide pour alphabétique.</p>
                                </div>
                                <button onClick={handleResetOrder} className="text-xs font-bold text-red-400 bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-md transition-colors">
                                    Réinitialiser
                                </button>
                            </div>
                            <div className="relative mb-4">
                                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Rechercher une équipement/famille..." className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none transition-all" />
                                <svg className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 bg-slate-900/40 p-3 rounded-lg border border-slate-700/40 max-h-[160px] overflow-y-auto red-scrollbar">
                                {localFamilyOrder
                                    .filter(family => family.toLowerCase().includes(searchTerm.toLowerCase()))
                                    .map((family, i) => (
                                        <div key={family} className="flex items-center p-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 rounded-lg group transition-colors">
                                            <input type="text" value={orderInputs[family] || ''} onChange={(e) => handleOrderChange(family, e.target.value)} className="w-10 text-center bg-slate-900 border border-slate-600 rounded px-1 py-1 mr-3 text-xs font-mono text-emerald-400 focus:ring-1 focus:ring-emerald-500 outline-none" placeholder={String(i + 1)} />
                                            <span className="truncate text-xs font-bold text-slate-300 group-hover:text-white" title={family}>{family}</span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
};
