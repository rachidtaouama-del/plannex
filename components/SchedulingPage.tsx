import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
    Activity, LayoutDashboard, Calendar, CheckCircle2,
    Package, Wallet, ShieldCheck, BarChart2, ChevronLeft,
    Menu, X, RefreshCw, Settings, House
} from 'lucide-react';
import type {
    SchedulingTaskData, CalculationResults, AppParameters,
    ScheduledTask, ShutdownParams, SchedulingPageState,
    SchedulingFilters, EvaluationData, PDRItem
} from '../types';
import { SchedulingModal } from './SchedulingModal';
import { ResourceStatusPanel } from './ResourceStatusPanel';
import { TeamTasksModal } from './TeamTasksModal';
import { ProjectDashboard } from './ProjectDashboard';
import { ReadinessDashboard } from './ReadinessDashboard';
import { MultiSelectDropdown } from './MultiSelectDropdown';
import { parseSchedulingFile, calculateSchedule } from '../services/schedulingService';
import { EditTaskModal } from './EditTaskModal';
import { AddTaskModal } from './AddTaskModal';
import { DependencyModal } from './DependencyModal';
import { LiveSchedulingModal } from './LiveSchedulingModal';
import { PreparatifManagement } from './PreparatifManagement';
import CostControlPage from './CostControlPage';
import ScheduleHealthPage from './ScheduleHealthPage';
import { CompanyCost } from '../types';

// This function assumes the xlsx library is loaded from a CDN.
declare var XLSX: any;

interface SchedulingPageProps {
    onFinishedScheduling: (results: CalculationResults, params: AppParameters, schedulingState: SchedulingPageState) => void;
    onBack: () => void;
    initialState?: SchedulingPageState | null;
    isScratchMode: boolean;
    initialStep?: 'dashboard' | 'scheduling' | 'readiness' | 'pdr';
    filters: SchedulingFilters;
    setFilters: React.Dispatch<React.SetStateAction<SchedulingFilters>>;
    onNavigateToPortal?: () => void;
    onStateChange?: (state: SchedulingPageState) => void;
    evaluationData?: EvaluationData | null;
    projectName?: string;
}

type SortConfig = { key: keyof SchedulingTaskData | null; direction: 'ascending' | 'descending' };
type SortableKeys = keyof SchedulingTaskData;

const HIGH_CONTRAST_COLORS = [
    '#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00897B',
    '#FDD835', '#D81B60', '#546E7A', '#3949AB', '#039BE5', '#7CB342',
];

const MULTI_DISCIPLINE_PALETTE = [
    { bg: 'bg-indigo-900/30', hover: 'hover:bg-indigo-900/50' },
    { bg: 'bg-purple-900/30', hover: 'hover:bg-purple-900/50' },
    { bg: 'bg-fuchsia-900/30', hover: 'hover:bg-fuchsia-900/50' },
    { bg: 'bg-rose-900/30', hover: 'hover:bg-rose-900/50' },
    { bg: 'bg-violet-900/30', hover: 'hover:bg-violet-900/50' },
    { bg: 'bg-teal-900/30', hover: 'hover:bg-teal-900/50' },
    { bg: 'bg-cyan-900/30', hover: 'hover:bg-cyan-900/50' },
];

// --- Column Definitions Interface ---
interface ColumnDef {
    key: string;
    label: string;
    visible: boolean;
    width: number;
    isSystem?: boolean; // Cannot be hidden
}

const DEFAULT_COLUMNS: ColumnDef[] = [
    { key: 'DUREE', label: 'DUREE', visible: true, width: 70 },
    { key: 'DISCIPLINE', label: 'DISCIPLINE', visible: true, width: 100 },
    { key: 'Nom Equipement', label: 'NOM EQUIPEMENT', visible: false, width: 120 },
    { key: 'FAMILLE', label: 'FAMILLE', visible: false, width: 100 },
    { key: 'Type de Maintenance', label: 'TYPE MAINT.', visible: false, width: 100 },
    { key: 'EFFECTIF', label: 'EFFECTIF', visible: true, width: 70 },
    { key: 'GLOBAL TASKS', label: 'GLOBAL TASKS', visible: true, width: 300, isSystem: true },
    { key: 'Heures-Homme', label: 'H-H', visible: true, width: 70 },
    { key: 'START DATE', label: 'START DATE', visible: true, width: 130 },
    { key: 'END DATE', label: 'END DATE', visible: true, width: 130 },
    { key: 'TYPE D\'EQUIPE', label: "TYPE D'EQUIPE", visible: true, width: 100 },
    { key: 'predecessor', label: 'PRED.', visible: true, width: 80 },
    { key: 'Successor', label: 'SUCC.', visible: false, width: 80 },
    { key: 'OT', label: 'OT', visible: false, width: 80 },
    { key: 'AVIS', label: 'AVIS', visible: false, width: 80 },
    { key: 'Préparatifs', label: 'PRÉPARATIFS', visible: false, width: 150 },
    { key: 'COMMENTAIRE HSE', label: 'HSE', visible: false, width: 80 },
];

const LOADING_MESSAGES = [
    "Initialisation du moteur de parsing...",
    "Allocation de la mémoire tampon...",
    "Lecture du flux de données binaire...",
    "Décodage de la structure XML...",
    "Analyse des dépendances inter-tâches...",
    "Normalisation des formats de date...",
    "Vérification de l'intégrité des colonnes...",
    "Optimisation des index de recherche...",
    "Calcul des jalons clés...",
    "Préparation du rendu graphique..."
];

// --- Missing Components Definitions ---

const Highlight: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
    if (!highlight.trim()) {
        return <>{text}</>;
    }
    const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>
            {parts.map((part, i) =>
                regex.test(part) ? <span key={i} className="bg-yellow-500/50 text-white">{part}</span> : part
            )}
        </span>
    );
};

const NavButton: React.FC<{
    active: boolean;
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    activeColor?: string;
    disabled?: boolean;
}> = ({ active, icon, label, onClick, activeColor = "bg-white text-black", disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`group relative flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed ${active
            ? `${activeColor} shadow-[0_4px_12px_rgba(0,0,0,0.1)]`
            : 'text-slate-500 hover:text-white hover:bg-white/5'
            }`}
    >
        <span className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
            {icon}
        </span>
        <span className="relative">
            {label}
            {active && (
                <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-current rounded-full opacity-20"></span>
            )}
        </span>
    </button>
);

const SchedulingHeader: React.FC<{
    activeStep: 'setup' | 'dashboard' | 'scheduling' | 'readiness' | 'pdr' | 'cost' | 'health';
    onNavigate: (step: 'dashboard' | 'scheduling' | 'readiness' | 'pdr' | 'results' | 'cost' | 'health') => void;
    isResultsEnabled: boolean;
    onModifyParams: () => void;
    onStartScheduling?: () => void;
    onBack: () => void;
    onNavigateToPortal?: () => void;
    progressPercent?: number;
    projectName?: string;
}> = ({ activeStep, onNavigate, isResultsEnabled, onModifyParams, onStartScheduling, onBack, onNavigateToPortal, progressPercent = 0, projectName }) => {
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);
    const menuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="bg-[#0c0c0e]/80 backdrop-blur-3xl border-b border-white/[0.08] px-8 py-5 flex items-center justify-between sticky top-0 z-50 shadow-[0_10px_40px_rgba(0,0,0,0.4)]">
            <div className="flex items-center gap-6">
                <button
                    onClick={onBack}
                    className="group w-11 h-11 flex items-center justify-center rounded-2xl bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 shadow-lg"
                >
                    <ChevronLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
                </button>
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-0.5">PlanneX Engine</span>
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest italic opacity-60">V4.2.0</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-black text-white tracking-tight uppercase italic leading-none">
                            {activeStep === 'dashboard' ? 'Aperçu' : (activeStep === 'setup' ? 'Configuration' : (activeStep === 'readiness' ? 'Readiness' : (activeStep === 'pdr' ? 'PDR' : (activeStep === 'cost' ? 'Gestion Coût' : (activeStep === 'health' ? 'Health Check' : 'Ordonnancement')))))}
                        </h1>
                        {projectName && (
                            <>
                                <span className="text-slate-700">·</span>
                                <span className="text-[11px] font-bold text-indigo-400/70 truncate max-w-[200px]" title={projectName}>{projectName}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="absolute left-1/2 -translate-x-1/2 flex items-center bg-white/[0.02] border border-white/10 rounded-2xl p-1.5 backdrop-blur-3xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                <NavButton
                    active={activeStep === 'dashboard'}
                    icon={<LayoutDashboard className="w-3.5 h-3.5" />}
                    label="Aperçu"
                    onClick={() => onNavigate('dashboard')}
                />
                <NavButton
                    active={activeStep === 'scheduling'}
                    icon={<Calendar className="w-3.5 h-3.5" />}
                    label="Planning"
                    onClick={() => onNavigate('scheduling')}
                />
                <NavButton
                    active={activeStep === 'readiness'}
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    activeColor="text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    label="Readiness"
                    onClick={() => onNavigate('readiness')}
                />
                <NavButton
                    active={activeStep === 'pdr'}
                    icon={<Package className="w-3.5 h-3.5" />}
                    activeColor="text-amber-400 bg-amber-500/10 border-amber-500/20"
                    label="PDR"
                    onClick={() => onNavigate('pdr')}
                />
                <NavButton
                    active={activeStep === 'cost'}
                    icon={<Wallet className="w-3.5 h-3.5" />}
                    activeColor="text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
                    label="Coût"
                    onClick={() => onNavigate('cost')}
                />
                <NavButton
                    active={activeStep === 'health'}
                    icon={<ShieldCheck className="w-3.5 h-3.5" />}
                    activeColor="text-blue-400 bg-blue-500/10 border-blue-500/20"
                    label="Health"
                    onClick={() => onNavigate('health')}
                />
                <NavButton
                    active={false} // results logic is handled specially
                    icon={<BarChart2 className="w-3.5 h-3.5" />}
                    label="Résultat"
                    disabled={!isResultsEnabled}
                    onClick={() => onNavigate('results')}
                />
            </div>

            <div className="flex items-center gap-4">
                {activeStep === 'scheduling' && (
                    <div className="flex items-center gap-3 bg-slate-800/50 px-3 py-1.5 rounded-xl border border-white/5 shadow-inner">
                        <div className="relative w-9 h-9 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <circle cx="18" cy="18" r="16" fill="none" className="stroke-slate-700" strokeWidth="3" />
                                <circle cx="18" cy="18" r="16" fill="none" className="stroke-emerald-500 transition-all duration-1000 ease-out" strokeWidth="3" strokeDasharray={`${progressPercent}, 100`} strokeLinecap="round" />
                            </svg>
                            <span className="absolute text-[8px] font-black text-emerald-400">{Math.round(progressPercent)}%</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[8px] text-slate-400 uppercase tracking-widest leading-tight">Avancement</span>
                            <span className="text-xs font-bold text-white leading-tight">Ordonnancement</span>
                        </div>
                    </div>
                )}
                <div className="flex items-center" ref={menuRef}>
                    <div className="relative">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`w-11 h-11 flex items-center justify-center rounded-2xl border transition-all active:scale-95 shadow-lg ${isMenuOpen ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/20'}`}
                        >
                            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900/95 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden animate-fade-in divide-y divide-white/5 backdrop-blur-xl z-[100]">
                                {onNavigateToPortal && (
                                    <button onClick={() => { onNavigateToPortal(); setIsMenuOpen(false); }} className="w-full text-left px-5 py-3.5 hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest flex items-center justify-between group/item">
                                        <span className="flex items-center gap-2">
                                            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                            Portail de Contrôle
                                        </span>
                                        <svg className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                )}
                                <button onClick={() => { onModifyParams(); setIsMenuOpen(false); }} className="w-full text-left px-5 py-3.5 hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest flex items-center justify-between group/item">
                                    <span className="flex items-center gap-2">
                                        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                        Paramètres
                                    </span>
                                    <svg className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

const SortableHeader: React.FC<{
    columnKey: keyof SchedulingTaskData | 'id';
    title: string;
    sortConfig: SortConfig;
    requestSort: (key: any) => void;
    width?: number;
    className?: string;
    onResize?: (width: number) => void;
}> = ({ columnKey, title, sortConfig, requestSort, width, className, onResize }) => {
    const isSorted = sortConfig.key === columnKey;
    const isResizing = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(width || 100);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isResizing.current = true;
        startX.current = e.pageX;
        startWidth.current = width || 100;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isResizing.current) return;
        const diff = e.pageX - startX.current;
        const newWidth = Math.max(50, startWidth.current + diff);
        if (onResize) onResize(newWidth);
    };

    const handleMouseUp = () => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    return (
        <th
            className={`px-4 py-3 font-black text-[9px] uppercase tracking-[0.2em] relative group select-none transition-colors border-r border-white/5 ${isSorted ? 'text-emerald-400 bg-emerald-500/5' : 'text-slate-500 hover:text-slate-300'} ${className}`}
            style={width ? { width: `${width}px`, maxWidth: `${width}px` } : {}}
        >
            <div className="flex items-center justify-between gap-2 cursor-pointer" onClick={() => requestSort(columnKey)}>
                <span className="truncate">{title}</span>
                <div className={`flex flex-col gap-0.5 transition-opacity ${isSorted ? 'opacity-100' : 'opacity-0 group-hover:opacity-30'}`}>
                    <svg width="6" height="4" viewBox="0 0 6 4" fill="currentColor" className={`${isSorted && sortConfig.direction === 'descending' ? 'text-slate-600' : ''}`}><path d="M3 0L6 4H0L3 0Z" /></svg>
                    <svg width="6" height="4" viewBox="0 0 6 4" fill="currentColor" className={`rotate-180 ${isSorted && sortConfig.direction === 'ascending' ? 'text-slate-600' : ''}`}><path d="M3 0L6 4H0L3 0Z" /></svg>
                </div>
            </div>
            {onResize && (
                <div
                    className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-emerald-500/50 z-20 group-hover:w-px group-hover:bg-white/10"
                    onMouseDown={handleMouseDown}
                />
            )}
        </th>
    );
};

// --- Modals ---

const OverloadConfirmModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; teamNames: string[] }> = ({ isOpen, onClose, onConfirm, teamNames }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 lg:p-12 pointer-events-none">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 pointer-events-auto" onClick={onClose}></div>
            <div className="relative w-full max-w-xl bg-slate-900 border border-red-500/30 rounded-[3rem] shadow-[0_0_80px_rgba(239,68,68,0.2)] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300 pointer-events-auto">
                <div className="p-8 border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-pulse">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-[0.1em]">Surcharge Critique</h3>
                            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest italic opacity-80">Alerte Intégrité Temporelle</p>
                        </div>
                    </div>
                </div>
                <div className="p-8 flex-grow">
                    <p className="text-slate-300 text-sm leading-relaxed mb-6 font-medium">
                        L'ordonnancement proposé entraînera une <span className="text-red-400 font-black">saturation opérationnelle</span> (Dépassement de Charge Max) pour :
                    </p>
                    <div className="bg-slate-950/40 rounded-3xl border border-white/5 p-6 mb-8 max-h-48 overflow-y-auto custom-scrollbar">
                        <ul className="space-y-3">
                            {teamNames.map(name => (
                                <li key={name} className="flex items-center gap-3 text-xs font-black text-slate-200 uppercase tracking-widest">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                    {name}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic text-center">Souhaitez-vous forcer l'application de ce planning malgré les risques de fatigue ?</p>
                </div>
                <div className="p-8 bg-slate-950/50 border-t border-white/5 flex gap-4">
                    <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl border border-white/5 transition-all active:scale-95">Annuler</button>
                    <button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-red-900/40 border border-red-400/30 active:scale-95">Forcer l'Application</button>
                </div>
            </div>
        </div>
    );
};

const ScheduleOverrunWarningModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; tasks: SchedulingTaskData[] }> = ({ isOpen, onClose, onConfirm, tasks }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 lg:p-12 pointer-events-none">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 pointer-events-auto" onClick={onClose}></div>
            <div className="relative w-full max-w-xl bg-slate-900 border border-amber-500/30 rounded-[3rem] shadow-[0_0_80px_rgba(245,158,11,0.2)] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300 pointer-events-auto">
                <div className="p-8 border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.15)] animate-pulse">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-[0.1em]">Alerte de Délais</h3>
                            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest italic opacity-80">Dépassement de Fenêtre d'Arrêt</p>
                        </div>
                    </div>
                </div>
                <div className="p-8 flex-grow">
                    <p className="text-slate-300 text-sm leading-relaxed mb-6 font-medium">
                        Certaines missions tactiques <span className="text-amber-400 font-black">débordent de la date de clôture</span> initialement prévue :
                    </p>
                    <div className="bg-slate-950/40 rounded-3xl border border-white/5 p-6 mb-8 max-h-48 overflow-y-auto custom-scrollbar">
                        <ul className="space-y-3">
                            {tasks.map(t => (
                                <li key={t.id} className="text-[10px] font-black text-slate-200 uppercase tracking-widest flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-0.5"></div>
                                    <span className="truncate">{t['GLOBAL TASKS']}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="p-8 bg-slate-950/50 border-t border-white/5 flex gap-4">
                    <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl border border-white/5 transition-all active:scale-95">Annuler</button>
                    <button onClick={onConfirm} className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-amber-900/40 border border-amber-400/30 active:scale-95">Valider & Continuer</button>
                </div>
            </div>
        </div>
    );
};

const DeleteConfirmModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (mode: 'cascade' | 'shift') => void;
    taskCount: number;
    tasks?: SchedulingTaskData[];
    allTasks?: SchedulingTaskData[];
    taskName?: string;
}> = ({ isOpen, onClose, onConfirm, taskCount, tasks, allTasks, taskName }) => {
    const [selectedOption, setSelectedOption] = useState<'cascade' | 'shift'>('shift');

    // Find all successor tasks for the selected tasks
    const selectedIds = useMemo(() => new Set((tasks || []).map(t => t.id)), [tasks]);
    const successorTasks = useMemo(() => {
        if (!allTasks || !tasks || tasks.length === 0) return [];
        const allSuccessors: SchedulingTaskData[] = [];
        const visited = new Set<number>();
        const queue = [...tasks.map(t => t.id)];
        queue.forEach(id => visited.add(id));
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            const succs = allTasks.filter(t => t.predecessor?.includes(currentId) && !visited.has(t.id));
            for (const s of succs) {
                visited.add(s.id);
                allSuccessors.push(s);
                queue.push(s.id);
            }
        }
        return allSuccessors;
    }, [tasks, allTasks]);

    const hasSuccessors = successorTasks.length > 0;

    // Compute the time shift preview
    const deletedDuration = useMemo(() => (tasks || []).reduce((sum, t) => sum + t.DUREE, 0), [tasks]);

    const formatTime = (date: Date | string | null | undefined) => {
        if (!date) return '--:--';
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 lg:p-12 pointer-events-none">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 pointer-events-auto" onClick={onClose}></div>
            <div className={`relative w-full max-w-2xl bg-slate-900 border rounded-[3rem] shadow-[0_0_80px] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300 pointer-events-auto transition-all duration-500 ${selectedOption === 'cascade'
                ? 'border-red-500/30 shadow-red-900/25'
                : 'border-emerald-500/30 shadow-emerald-900/25'
                }`}>
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex flex-col items-center text-center bg-slate-900/50">
                    <div className={`w-20 h-20 rounded-3xl flex items-center justify-center border mb-6 group transition-all duration-500 ${selectedOption === 'cascade'
                        ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_40px_rgba(239,68,68,0.15)]'
                        : 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.15)]'
                        }`}>
                        {selectedOption === 'cascade' ? (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" className="group-hover:scale-110 transition-transform"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        ) : (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" className="group-hover:scale-110 transition-transform"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        )}
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 italic">Suppression Tactique</h3>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-80 italic">
                        {hasSuccessors ? 'Choisissez le protocole de traitement des successeurs' : "Protocole d'effacement irréversible"}
                    </p>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar max-h-[60vh]">
                    {/* Context */}
                    <p className="text-slate-300 text-xs leading-relaxed mb-6 font-medium text-center">
                        {hasSuccessors ? (
                            <>Vous supprimez <span className={`font-black ${selectedOption === 'cascade' ? 'text-red-400' : 'text-emerald-400'}`}>{taskCount > 1 ? `${taskCount} unités tactiques` : `"${taskName}"`}</span> avec <span className="text-white font-black">{successorTasks.length}</span> tâche{successorTasks.length > 1 ? 's' : ''} successeur{successorTasks.length > 1 ? 's' : ''}.</>
                        ) : (
                            <>Êtes-vous sûr de vouloir supprimer <span className="text-red-400 font-black">{taskCount > 1 ? `${taskCount} unités tactiques` : `"${taskName}"`}</span> ?</>
                        )}
                    </p>

                    {/* Options - only show when there are successors */}
                    {hasSuccessors && (
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            {/* Option 1: Cascade Delete */}
                            <button
                                onClick={() => setSelectedOption('cascade')}
                                className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 group/opt ${selectedOption === 'cascade'
                                    ? 'border-red-500/60 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.1)]'
                                    : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                                    }`}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${selectedOption === 'cascade'
                                        ? 'bg-red-500/20 border-red-500/40'
                                        : 'bg-white/5 border-white/10'
                                        }`}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={selectedOption === 'cascade' ? '#ef4444' : '#64748b'} strokeWidth="2.5"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    </div>
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${selectedOption === 'cascade'
                                        ? 'text-red-400 bg-red-500/10 border-red-500/20'
                                        : 'text-slate-600 bg-white/5 border-white/5'
                                        }`}>Destructif</span>
                                </div>
                                <h4 className={`text-[11px] font-black uppercase tracking-wider mb-2 transition-colors ${selectedOption === 'cascade' ? 'text-white' : 'text-slate-400'
                                    }`}>Supprimer tout</h4>
                                <p className={`text-[9px] leading-relaxed transition-colors ${selectedOption === 'cascade' ? 'text-slate-300' : 'text-slate-600'
                                    }`}>
                                    Supprime cette tâche et les {successorTasks.length} tâche{successorTasks.length > 1 ? 's' : ''} suivante{successorTasks.length > 1 ? 's' : ''}.
                                </p>
                                {/* Radio indicator */}
                                <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedOption === 'cascade'
                                    ? 'border-red-500'
                                    : 'border-white/20'
                                    }`}>
                                    {selectedOption === 'cascade' && <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-in zoom-in duration-200"></div>}
                                </div>
                            </button>

                            {/* Option 2: Shift Forward */}
                            <button
                                onClick={() => setSelectedOption('shift')}
                                className={`relative p-5 rounded-2xl border-2 text-left transition-all duration-300 group/opt ${selectedOption === 'shift'
                                    ? 'border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
                                    : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                                    }`}
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${selectedOption === 'shift'
                                        ? 'bg-emerald-500/20 border-emerald-500/40'
                                        : 'bg-white/5 border-white/10'
                                        }`}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={selectedOption === 'shift' ? '#10b981' : '#64748b'} strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                    </div>
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${selectedOption === 'shift'
                                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                                        : 'text-slate-600 bg-white/5 border-white/5'
                                        }`}>Recommandé</span>
                                </div>
                                <h4 className={`text-[11px] font-black uppercase tracking-wider mb-2 transition-colors ${selectedOption === 'shift' ? 'text-white' : 'text-slate-400'
                                    }`}>Décaler les suivantes</h4>
                                <p className={`text-[9px] leading-relaxed transition-colors ${selectedOption === 'shift' ? 'text-slate-300' : 'text-slate-600'
                                    }`}>
                                    Supprime cette tâche et recale les successeurs automatiquement.
                                </p>
                                {/* Radio indicator */}
                                <div className={`absolute top-4 right-4 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedOption === 'shift'
                                    ? 'border-emerald-500'
                                    : 'border-white/20'
                                    }`}>
                                    {selectedOption === 'shift' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-in zoom-in duration-200"></div>}
                                </div>
                            </button>
                        </div>
                    )}

                    {/* Live Preview Section */}
                    {hasSuccessors && (
                        <div className="bg-slate-950/60 rounded-2xl border border-white/5 p-5 mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Aperçu en temps réel</span>
                            </div>

                            {selectedOption === 'cascade' ? (
                                <div className="space-y-2">
                                    {/* Show deleted tasks */}
                                    {(tasks || []).map(t => (
                                        <div key={`del-${t.id}`} className="flex items-center gap-3 p-2.5 bg-red-500/5 rounded-xl border border-red-500/10 opacity-60">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-[8px] font-black text-red-400 uppercase tracking-widest line-through">ID-{t.id} · {t['GLOBAL TASKS']}</span>
                                                {t['START DATE'] && t['END DATE'] && (
                                                    <span className="text-[8px] text-red-500/60 font-mono line-through">{formatTime(t['START DATE'])} → {formatTime(t['END DATE'])}</span>
                                                )}
                                            </div>
                                            <span className="text-[7px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">SUPPRIMÉE</span>
                                        </div>
                                    ))}
                                    {successorTasks.map(t => (
                                        <div key={`del-succ-${t.id}`} className="flex items-center gap-3 p-2.5 bg-red-500/5 rounded-xl border border-red-500/10 opacity-60">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-[8px] font-black text-red-400 uppercase tracking-widest line-through">ID-{t.id} · {t['GLOBAL TASKS']}</span>
                                                {t['START DATE'] && t['END DATE'] && (
                                                    <span className="text-[8px] text-red-500/60 font-mono line-through">{formatTime(t['START DATE'])} → {formatTime(t['END DATE'])}</span>
                                                )}
                                            </div>
                                            <span className="text-[7px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">SUPPRIMÉE</span>
                                        </div>
                                    ))}
                                    <p className="text-[8px] text-red-400/70 font-bold uppercase tracking-widest text-center mt-3 italic">
                                        {(tasks?.length || 0) + successorTasks.length} tâche{((tasks?.length || 0) + successorTasks.length) > 1 ? 's' : ''} seront supprimées
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {/* Deleted task */}
                                    {(tasks || []).map(t => (
                                        <div key={`shift-del-${t.id}`} className="flex items-center gap-3 p-2.5 bg-red-500/5 rounded-xl border border-red-500/10 opacity-60">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                            <div className="flex flex-col min-w-0 flex-1">
                                                <span className="text-[8px] font-black text-red-400 uppercase tracking-widest line-through">ID-{t.id} · {t['GLOBAL TASKS']}</span>
                                            </div>
                                            <span className="text-[7px] font-black text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">SUPPRIMÉE</span>
                                        </div>
                                    ))}
                                    {/* Shifted tasks */}
                                    {successorTasks.map(t => {
                                        const hasSchedule = t['START DATE'] && t['END DATE'];
                                        const newStart = hasSchedule ? new Date(new Date(t['START DATE']!).getTime() - deletedDuration * 3600000) : null;
                                        const newEnd = hasSchedule ? new Date(new Date(t['END DATE']!).getTime() - deletedDuration * 3600000) : null;
                                        return (
                                            <div key={`shift-${t.id}`} className="flex items-center gap-3 p-2.5 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">ID-{t.id} · {t['GLOBAL TASKS']}</span>
                                                    {hasSchedule && (
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[7px] text-slate-600 font-mono line-through">{formatTime(t['START DATE'])} → {formatTime(t['END DATE'])}</span>
                                                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                                            <span className="text-[7px] text-emerald-400 font-mono font-bold">{formatTime(newStart)} → {formatTime(newEnd)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="text-[7px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">DÉCALÉE</span>
                                            </div>
                                        );
                                    })}
                                    <p className="text-[8px] text-emerald-400/70 font-bold uppercase tracking-widest text-center mt-3 italic">
                                        {successorTasks.length} tâche{successorTasks.length > 1 ? 's' : ''} recalée{successorTasks.length > 1 ? 's' : ''} · -{deletedDuration.toFixed(1)}h
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Selected tasks list (when no successors, show simple list) */}
                    {!hasSuccessors && tasks && tasks.length > 0 && (
                        <div className="space-y-2 mb-6">
                            <h4 className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-3">Unités ciblées :</h4>
                            <div className="grid grid-cols-1 gap-2">
                                {tasks.map(t => (
                                    <div key={t.id} className="flex items-center justify-between gap-4 p-3 bg-black/40 rounded-xl border border-white/5 group/li">
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">ID-{t.id}</span>
                                            <span className="text-[10px] font-bold text-slate-300 truncate">{t['GLOBAL TASKS']}</span>
                                        </div>
                                        <div className="h-6 px-2 flex items-center bg-red-500/10 rounded border border-red-500/20">
                                            <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">{t.DISCIPLINE}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent my-4"></div>
                    <p className={`text-[9px] font-bold uppercase tracking-widest text-center italic p-4 rounded-xl border leading-relaxed transition-all duration-300 ${selectedOption === 'cascade' || !hasSuccessors
                        ? 'text-red-500/80 bg-red-500/5 border-red-500/10'
                        : 'text-emerald-500/80 bg-emerald-500/5 border-emerald-500/10'
                        }`}>
                        {selectedOption === 'cascade' || !hasSuccessors
                            ? 'Cette opération supprimera définitivement les liens de dépendance associés à ces missions.'
                            : 'Les successeurs seront automatiquement décalés pour combler le vide dans la chaîne.'
                        }
                    </p>
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-950/50 flex gap-4 border-t border-white/5">
                    <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-black text-[10px] uppercase tracking-widest py-5 rounded-2xl transition-all active:scale-95 border border-white/5 leading-none">Annuler</button>
                    <button
                        onClick={() => onConfirm(hasSuccessors ? selectedOption : 'cascade')}
                        className={`flex-[1.5] text-white font-black text-[11px] uppercase tracking-widest py-5 rounded-2xl transition-all active:scale-95 leading-none flex items-center justify-center gap-3 ${selectedOption === 'cascade' || !hasSuccessors
                            ? 'bg-red-600 hover:bg-red-500 shadow-xl shadow-red-900/40 border border-red-500/30 shadow-[0_0_20px_rgba(220,38,38,0.2)]'
                            : 'bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-900/40 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                            }`}
                    >
                        {selectedOption === 'cascade' || !hasSuccessors ? (
                            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Exécuter la suppression</>
                        ) : (
                            <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg> Supprimer & Décaler</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const RenameConfirmModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; discipline: string; oldName: string; newName: string }> = ({ isOpen, onClose, onConfirm, discipline, oldName, newName }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 lg:p-12 pointer-events-none">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 pointer-events-auto" onClick={onClose}></div>
            <div className="relative w-full max-w-md bg-slate-900 border border-blue-500/30 rounded-[3rem] shadow-[0_0_80px_rgba(59,130,246,0.2)] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300 pointer-events-auto">
                <div className="p-8 border-b border-white/5 bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.15)]">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-widest">Renommer l'Équipe</h3>
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest italic">{discipline}</p>
                        </div>
                    </div>
                </div>
                <div className="p-8">
                    <div className="flex flex-col items-center gap-6 mb-8">
                        <div className="w-full bg-slate-950/50 rounded-2xl p-4 border border-white/5 flex flex-col items-center">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Identité Actuelle</span>
                            <span className="text-sm font-bold text-red-400/80 line-through tracking-wider">{oldName}</span>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-500 rotate-90"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </div>
                        <div className="w-full bg-blue-500/10 rounded-2xl p-4 border border-blue-500/20 flex flex-col items-center shadow-[0_0_30px_rgba(59,130,246,0.05)]">
                            <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1">Nouvelle Identité</span>
                            <span className="text-lg font-black text-white tracking-widest uppercase">{newName}</span>
                        </div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest italic text-center">Cette action mettra à jour la totalité de l'historique lié à cette unité.</p>
                </div>
                <div className="p-8 bg-slate-950/50 border-t border-white/5 flex gap-4">
                    <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 font-black text-[9px] uppercase tracking-widest py-4 rounded-2xl border border-white/5 transition-all">Annuler</button>
                    <button onClick={onConfirm} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black text-[9px] uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-blue-900/40 border border-blue-400/30 transition-all active:scale-95">Mettre à Jour</button>
                </div>
            </div>
        </div>
    );
};

const DuplicateConfirmModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: (count: number) => void; taskCount: number }> = ({ isOpen, onClose, onConfirm, taskCount }) => {
    const [count, setCount] = useState(1);
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 pointer-events-none">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl pointer-events-auto" onClick={onClose}></div>
            <div className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-white/5 bg-slate-900/50">
                    <h3 className="text-lg font-black text-white uppercase tracking-widest text-center">Dupliquer</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 text-center uppercase tracking-widest">Combien de copies de ces {taskCount} tâche(s) ?</p>
                </div>
                <div className="p-8">
                    <div className="flex flex-col items-center gap-6">
                        <span className="text-6xl font-black text-white bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">{count}</span>
                        <input type="range" min={1} max={10} value={count} onChange={e => setCount(parseInt(e.target.value))} className="w-full accent-white" />
                        <div className="flex justify-between w-full text-[9px] font-black text-slate-600">
                            <span>1</span>
                            <span>10</span>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-slate-950 border-t border-white/5 flex gap-4">
                    <button onClick={onClose} className="flex-1 text-slate-400 text-xs font-bold py-3 hover:bg-white/5 rounded-xl transition-all border border-white/5">Annuler</button>
                    <button onClick={() => onConfirm(count)} className="flex-1 bg-white hover:bg-slate-200 text-black text-xs font-black py-3 rounded-xl transition-all shadow-xl shadow-white/10 active:scale-95">Confirmer</button>
                </div>
            </div>
        </div>
    );
};

const UnlinkConfirmModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: () => void; onConfirmShift?: () => void; text: React.ReactNode; isCombined?: boolean; hasSuccessors?: boolean; }> = ({ isOpen, onClose, onConfirm, onConfirmShift, text, isCombined, hasSuccessors }) => {
    const [selectedOption, setSelectedOption] = useState<'cascade' | 'shift'>('shift');
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 pointer-events-none">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl pointer-events-auto" onClick={onClose}></div>
            <div className={`relative w-full max-w-xl bg-slate-900 border rounded-[3rem] flex flex-col overflow-hidden pointer-events-auto animate-in zoom-in-95 duration-200 transition-all duration-500 ${hasSuccessors && selectedOption === 'shift'
                ? 'border-emerald-500/30 shadow-[0_0_80px_rgba(16,185,129,0.25)]'
                : 'border-red-500/30 shadow-[0_0_80px_rgba(239,68,68,0.25)]'
                }`}>
                <div className="p-8 border-b border-white/5 flex items-center gap-6 bg-slate-900/50">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0 transition-all duration-500 ${hasSuccessors && selectedOption === 'shift'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                        : 'bg-red-500/10 border-red-500/20 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
                        }`}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-1">{isCombined ? 'Délier Mission Tactique' : 'Rupture de Liens'}</h3>
                        <p className={`text-[10px] font-black uppercase tracking-widest italic tracking-wider opacity-80 transition-colors duration-300 ${hasSuccessors && selectedOption === 'shift' ? 'text-emerald-400' : 'text-red-400'
                            }`}>Impact sur l'intégrité de l'ordonnancement</p>
                    </div>
                </div>
                <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {/* Two-Option Selection for tasks with successors */}
                    {hasSuccessors && onConfirmShift && (
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button
                                onClick={() => setSelectedOption('cascade')}
                                className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-300 ${selectedOption === 'cascade'
                                    ? 'border-red-500/60 bg-red-500/10 shadow-[0_0_30px_rgba(239,68,68,0.1)]'
                                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={selectedOption === 'cascade' ? '#ef4444' : '#64748b'} strokeWidth="2.5"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                    <span className={`text-[8px] font-black uppercase tracking-widest ${selectedOption === 'cascade' ? 'text-red-400' : 'text-slate-600'
                                        }`}>Destructif</span>
                                </div>
                                <h4 className={`text-[10px] font-black uppercase tracking-wider mb-1 ${selectedOption === 'cascade' ? 'text-white' : 'text-slate-400'
                                    }`}>Déprogrammer tout</h4>
                                <p className={`text-[8px] leading-relaxed ${selectedOption === 'cascade' ? 'text-slate-300' : 'text-slate-600'
                                    }`}>Déprogramme cette tâche et tous les successeurs.</p>
                                <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedOption === 'cascade' ? 'border-red-500' : 'border-white/20'
                                    }`}>
                                    {selectedOption === 'cascade' && <div className="w-2 h-2 rounded-full bg-red-500"></div>}
                                </div>
                            </button>
                            <button
                                onClick={() => setSelectedOption('shift')}
                                className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-300 ${selectedOption === 'shift'
                                    ? 'border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
                                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={selectedOption === 'shift' ? '#10b981' : '#64748b'} strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                    <span className={`text-[8px] font-black uppercase tracking-widest ${selectedOption === 'shift' ? 'text-emerald-400' : 'text-slate-600'
                                        }`}>Recommandé</span>
                                </div>
                                <h4 className={`text-[10px] font-black uppercase tracking-wider mb-1 ${selectedOption === 'shift' ? 'text-white' : 'text-slate-400'
                                    }`}>Décaler les suivantes</h4>
                                <p className={`text-[8px] leading-relaxed ${selectedOption === 'shift' ? 'text-slate-300' : 'text-slate-600'
                                    }`}>Déprogramme cette tâche, recale les successeurs.</p>
                                <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedOption === 'shift' ? 'border-emerald-500' : 'border-white/20'
                                    }`}>
                                    {selectedOption === 'shift' && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                                </div>
                            </button>
                        </div>
                    )}
                    {text}
                </div>
                <div className="p-8 bg-slate-950/50 flex gap-4 border-t border-white/5">
                    <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[10px] font-black py-5 uppercase tracking-widest rounded-2xl transition-all border border-white/5 active:scale-95 leading-none">Annuler</button>
                    <button
                        onClick={() => {
                            if (hasSuccessors && onConfirmShift && selectedOption === 'shift') {
                                onConfirmShift();
                            } else {
                                onConfirm();
                            }
                        }}
                        className={`flex-[1.5] text-white text-[11px] font-black uppercase tracking-widest py-5 rounded-2xl transition-all active:scale-95 leading-none flex items-center justify-center gap-3 ${hasSuccessors && selectedOption === 'shift'
                            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-xl shadow-emerald-900/40 border border-emerald-500/30'
                            : 'bg-red-600 hover:bg-red-500 shadow-xl shadow-red-900/40 border border-red-500/30'
                            }`}
                    >
                        {hasSuccessors && selectedOption === 'shift' ? (
                            <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7" /></svg> Délier & Décaler</>
                        ) : (
                            <><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Rompre le(s) lien(s)</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const ManpowerConflictModal: React.FC<{ isOpen: boolean; onClose: () => void; onConfirm: (resolutions: Record<string, number>) => void; conflicts: Record<string, number[]> }> = ({ isOpen, onClose, onConfirm, conflicts }) => {
    const [resolutions, setResolutions] = useState<Record<string, number>>({});

    useEffect(() => {
        const init: Record<string, number> = {};
        Object.keys(conflicts).forEach(d => init[d] = Math.max(...conflicts[d]));
        setResolutions(init);
    }, [conflicts]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 lg:p-12 pointer-events-none">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 pointer-events-auto" onClick={onClose}></div>
            <div className="relative w-full max-w-lg bg-slate-900 border border-orange-500/30 rounded-[3rem] shadow-[0_0_80px_rgba(249,115,22,0.2)] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300 pointer-events-auto">
                <div className="p-8 border-b border-white/5 bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.15)]">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5"><path d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8l2 2m0 0l2 2m-2-2l2-2m-2 2L5 12" /></svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-widest">Conflit de PAX</h3>
                            <p className="text-[10px] font-bold text-orange-400 uppercase tracking-widest italic tracking-[0.2em] opacity-80">Arbitrage de Charge Requis</p>
                        </div>
                    </div>
                </div>
                <div className="p-8 overflow-y-auto custom-scrollbar max-h-96">
                    <p className="text-slate-300 text-xs leading-relaxed mb-6 font-medium">
                        Certaines disciplines présentent des <span className="text-orange-400 italic">effectifs hétérogènes</span>. Veuillez harmoniser l'effectif final :
                    </p>
                    <div className="space-y-4">
                        {Object.entries(conflicts).map(([discipline, values]) => (
                            <div key={discipline} className="bg-slate-950/40 border border-white/5 p-5 rounded-3xl group hover:border-orange-500/30 transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{discipline}</span>
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter italic">Source: {values.join(', ')} PAX</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min={Math.min(...values)}
                                        max={Math.max(...values) + 5}
                                        value={resolutions[discipline] || 0}
                                        onChange={e => setResolutions(prev => ({ ...prev, [discipline]: parseInt(e.target.value) || 0 }))}
                                        className="flex-grow h-1.5 bg-slate-800 rounded-full appearance-none cursor-pointer accent-orange-500"
                                    />
                                    <div className="w-16 h-10 bg-black border border-white/5 rounded-xl flex items-center justify-center shadow-inner">
                                        <input
                                            type="number"
                                            value={resolutions[discipline] || 0}
                                            onChange={e => setResolutions(prev => ({ ...prev, [discipline]: parseInt(e.target.value) || 0 }))}
                                            className="w-full bg-transparent text-center text-xs font-black text-orange-400 focus:outline-none tabular-nums"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-8 bg-slate-950/50 border-t border-white/5 flex gap-4">
                    <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl border border-white/5 transition-all">Annuler</button>
                    <button onClick={() => onConfirm(resolutions)} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-orange-900/40 border border-orange-400/30 active:scale-95 transition-all">Valider l'Arbitrage</button>
                </div>
            </div>
        </div>
    );
};

// --- Processing HUD Component ---
const ProcessingHUD: React.FC<{
    isVisible: boolean;
    percent: number;
    currentStep: string;
    logHistory: string[];
    onCancel: () => void;
    isComplete: boolean;
    stats?: { taskCount: number; startDate: string; endDate: string; disciplineCount: number; pdrCount?: number };
    onConfirm: () => void;
}> = ({ isVisible, percent, currentStep, logHistory, onCancel, isComplete, stats, onConfirm }) => {
    const logRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [logHistory]);

    if (!isVisible) return null;

    if (isComplete && stats) {
        return (
            <div className="fixed inset-0 bg-[#020617]/97 backdrop-blur-3xl z-[100] flex flex-col items-center justify-center font-sans" style={{ animation: 'fadeIn 0.6s ease-out both' }}>
                {/* Grid texture */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
                {/* Ambient glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/[0.06] rounded-full blur-[200px] pointer-events-none" />

                <div className="w-full max-w-lg relative z-10" style={{ animation: 'scaleIn 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.15s both' }}>
                    {/* Card */}
                    <div className="bg-white/[0.025] border border-emerald-500/15 rounded-[3rem] overflow-hidden shadow-[0_0_120px_rgba(16,185,129,0.15),0_40px_80px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                        {/* Top accent */}
                        <div className="h-px bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
                        {/* Scan texture */}
                        <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(255,255,255,0.003)_3px,rgba(255,255,255,0.003)_4px)] pointer-events-none rounded-[3rem]" />

                        <div className="p-12 text-center relative">
                            {/* Holographic ring icon */}
                            <div className="flex justify-center mb-8">
                                <div className="relative">
                                    {/* Outer pulse ring */}
                                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping scale-110 opacity-40" />
                                    {/* Middle ring */}
                                    <div className="absolute inset-[-8px] rounded-full border border-emerald-500/20" />
                                    {/* Inner circle */}
                                    <div className="relative w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.4),inset_0_0_30px_rgba(16,185,129,0.1)]">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Title */}
                            <div className="mb-2">
                                <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-[0.5em] mb-3">Moteur d'Orchestration</p>
                                <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic leading-none">Analyse Terminée</h2>
                            </div>
                            <div className="flex items-center justify-center gap-3 my-5">
                                <div className="h-px w-12 bg-gradient-to-r from-transparent to-emerald-500/40" />
                                <div className="h-0.5 w-16 bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
                                <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-500/40" />
                            </div>
                            <p className="text-slate-400 font-medium text-sm mb-10">Les données ont été orchestrées avec succès.</p>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-10">
                                {[
                                    { label: 'Données', value: stats.taskCount, unit: 'tâches', accent: '#10b981', accentRgb: '16,185,129' },
                                    { label: 'Équipes', value: stats.disciplineCount, unit: 'disc.', accent: '#3b82f6', accentRgb: '59,130,246' },
                                    { label: 'PDR', value: stats.pdrCount || 0, unit: 'éléments', accent: '#f59e0b', accentRgb: '245,158,11' },
                                ].map((stat) => (
                                    <div key={stat.label} className="rounded-2xl p-4 relative overflow-hidden"
                                        style={{ background: `rgba(${stat.accentRgb},0.06)`, border: `1px solid rgba(${stat.accentRgb},0.2)` }}>
                                        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${stat.accent}, transparent)` }} />
                                        <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-2" style={{ color: stat.accent }}>{stat.label}</p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-3xl font-black text-white tabular-nums tracking-tighter">{stat.value}</span>
                                        </div>
                                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{stat.unit}</span>
                                    </div>
                                ))}
                            </div>

                            {/* CTA Button */}
                            <button
                                onClick={onConfirm}
                                className="group relative w-full py-5 px-8 rounded-2xl overflow-hidden font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-[0_20px_50px_rgba(16,185,129,0.3)]"
                                style={{ background: 'linear-gradient(135deg, #059669, #10b981, #34d399)' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                <span className="relative z-10 flex items-center justify-center gap-3 text-black">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="5 3 19 12 5 21 5 3" />
                                    </svg>
                                    Lancer l'Environnement
                                </span>
                            </button>

                            <button
                                onClick={onCancel}
                                className="mt-5 text-slate-600 hover:text-red-400 text-[10px] font-black uppercase tracking-[0.3em] transition-colors px-4 py-2 rounded-xl hover:bg-red-500/5 w-full"
                            >
                                Changer de source de données
                            </button>
                        </div>
                    </div>
                </div>

                <style>{`
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes scaleIn { from { opacity: 0; transform: scale(0.9) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                `}</style>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[100] flex flex-col items-center justify-center font-mono animate-[fadeIn_0.5s_ease-out]">
            <div className="w-full max-w-3xl p-12">

                {/* Visual Scanner Intro */}
                <div className="flex flex-col items-center mb-16">
                    <div className="relative w-24 h-24 mb-10">
                        <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
                        <div className="absolute inset-0 border-2 border-emerald-500/50 rounded-full animate-spin-slow"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <svg className="w-10 h-10 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2 tracking-[0.3em] uppercase italic">Processing Engine</h2>
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></div>
                            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                            <div className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                        </div>
                        <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest">{currentStep}</p>
                    </div>
                </div>

                {/* Technical Progress Bar */}
                <div className="relative mb-20 group">
                    <div className="absolute -top-8 left-0 text-[10px] font-black text-slate-500 uppercase tracking-widest">Opération en cours</div>
                    <div className="absolute -top-8 right-0 text-[10px] font-black text-emerald-500 font-mono tracking-widest">{percent.toFixed(1)}%</div>

                    <div className="h-2 w-full bg-slate-900 rounded-full border border-white/5 overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-300 ease-out shadow-[0_0_20px_rgba(16,185,129,0.5)]"
                            style={{ width: `${percent}%` }}
                        ></div>
                    </div>
                    {/* Glowing pulse trailing the progress */}
                    <div
                        className="absolute top-0 bottom-0 w-20 bg-emerald-500/20 blur-xl transition-all duration-300 pointer-events-none"
                        style={{ left: `calc(${percent}% - 40px)` }}
                    ></div>
                </div>

                {/* Terminal Window */}
                <div className="bg-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="bg-white/5 border-b border-white/10 px-6 py-3 flex items-center justify-between">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></div>
                        </div>
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Live Logs &bull; Protocol V4.2</span>
                    </div>
                    <div className="p-6 h-60 overflow-y-auto font-mono text-[11px] leading-relaxed custom-scrollbar bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(0,0,0,0.8)_100%)]" ref={logRef}>
                        {logHistory.map((log, i) => (
                            <div key={i} className="mb-2 text-slate-400 flex items-start group">
                                <span className="text-emerald-500/50 mr-4 font-bold select-none">{String(i + 1).padStart(3, '0')}</span>
                                <span className="group-hover:text-slate-200 transition-colors">{log}</span>
                            </div>
                        ))}
                        <div className="flex items-center gap-1">
                            <span className="text-emerald-500/50 mr-4 font-bold select-none">---</span>
                            <span className="text-emerald-500 animate-pulse italic">Attente de données supplémentaires...</span>
                        </div>
                    </div>
                </div>

                <div className="mt-12 text-center">
                    <button
                        onClick={onCancel}
                        className="text-slate-600 hover:text-red-500 text-[10px] font-black uppercase tracking-[0.4em] transition-all hover:tracking-[0.5em]"
                    >
                        Interrompre l'Analyse
                    </button>
                </div>
            </div>
            <style>{`
                .animate-spin-slow { animation: spin 4s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

const SetupStep: React.FC<{
    onConfirm: (file: File | null, params: ShutdownParams) => void;
    onBack: () => void;
    initialState?: SchedulingPageState | null;
    isScratchMode: boolean;
    isLoading: boolean;
    progressPercent: number;
    progressStep: string;
    progressLog: string[];
    onCancelLoading: () => void;
    isProcessingComplete: boolean;
    processingStats: { taskCount: number; startDate: string; endDate: string; disciplineCount: number } | null;
    onFinishProcessing: () => void;
    error: string | null;
}> = ({
    onConfirm, onBack, initialState, isScratchMode, isLoading,
    progressPercent, progressStep, progressLog, onCancelLoading,
    isProcessingComplete, processingStats, onFinishProcessing,
    error
}) => {
        const [file, setFile] = useState<File | null>(initialState?.currentFile ?? null);
        const [params, setParams] = useState<ShutdownParams>(() => {
            if (initialState?.shutdownParams) {
                return initialState.shutdownParams;
            }

            try {
                const savedParams = localStorage.getItem('planex_last_params');
                if (savedParams) {
                    const parsed = JSON.parse(savedParams);
                    if (parsed.shutdownStart && parsed.shutdownEnd) {
                        return parsed;
                    }
                }
            } catch (e) {
                console.error("Failed to load params from localStorage", e);
            }

            const now = new Date();
            const start = new Date(now);
            start.setHours(start.getHours() + 1, 0, 0, 0);
            const end = new Date(start.getTime() + 48 * 60 * 60 * 1000);

            return {
                shutdownStart: start.toISOString().slice(0, 16),
                shutdownEnd: end.toISOString().slice(0, 16),
                consignation: 30,
                deconsignation: 30,
                combustion: 30,
                workingHoursPerDay: 24,
            };
        });
        const [isDragging, setIsDragging] = useState(false);
        const [isDirty, setIsDirty] = useState(false);
        const [showInfoBanner, setShowInfoBanner] = useState(false);
        const isInitialFile = useRef(!!initialState?.currentFile);
        const [isPdrModalOpen, setIsPdrModalOpen] = useState(false);
        const [editingPdr, setEditingPdr] = useState<PDRItem | undefined>(undefined);

        const handleIconClick = (e: React.MouseEvent) => {
            const container = e.currentTarget.parentElement;
            const input = container?.querySelector('input');
            if (input) {
                input.focus();
                if ('showPicker' in input) {
                    try {
                        (input as any).showPicker();
                    } catch (err) {
                        console.error("showPicker failed, fallback to focus", err);
                    }
                }
            }
        };

        const initialParamsJSON = useMemo(() => JSON.stringify(initialState?.shutdownParams), [initialState]);
        const initialFile = useMemo(() => initialState?.currentFile, [initialState]);

        useEffect(() => {
            if (file && !isScratchMode && !isInitialFile.current) {
                const parseAndSetDates = async () => {
                    try {
                        const { promise } = parseSchedulingFile(file);
                        const { detectedStartDate, detectedEndDate } = await promise;
                        if (detectedStartDate && detectedEndDate) {
                            const toDateTimeLocal = (date: Date) => {
                                const tzoffset = date.getTimezoneOffset() * 60000;
                                return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
                            };
                            setParams(p => ({
                                ...p,
                                shutdownStart: toDateTimeLocal(detectedStartDate),
                                shutdownEnd: toDateTimeLocal(detectedEndDate),
                            }));
                        }
                    } catch (e) {
                        console.error("Silent parse for date detection failed:", e);
                    }
                };
                parseAndSetDates();
            }
        }, [file, isScratchMode]);

        useEffect(() => {
            if (initialState) {
                const paramsChanged = JSON.stringify(params) !== initialParamsJSON;
                const fileChanged = file !== initialFile;
                setIsDirty(paramsChanged || fileChanged);
            } else {
                setIsDirty(true);
            }
        }, [file, params, initialState, initialParamsJSON, initialFile]);

        const totalDurationHours = useMemo(() => {
            try {
                const start = new Date(params.shutdownStart);
                const end = new Date(params.shutdownEnd);
                if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return "0.00";
                return ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2);
            } catch {
                return "0.00";
            }
        }, [params.shutdownStart, params.shutdownEnd]);

        const handleConfirm = () => {
            onConfirm(isScratchMode ? null : file, params);
        };

        const handleCancel = () => {
            onCancelLoading();
            setFile(null);
        };

        const handleFileChange = (files: FileList | null) => {
            if (files && files.length > 0) {
                setFile(files[0]);
                isInitialFile.current = false;
            }
        };

        const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }, []);
        const onDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }, []);
        const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                setFile(e.dataTransfer.files[0]);
                isInitialFile.current = false;
                e.dataTransfer.clearData();
            }
        }, []);

        const isConfirmDisabled = isLoading || (!isScratchMode && !file);
        const buttonText = initialState ? 'Mouvementer le Projet' : (isScratchMode ? 'Générer l\'Espace' : 'Lancer l\'Analyse');

        return (
            <div className="relative flex flex-col min-h-screen bg-[#020617] overflow-x-hidden overflow-y-auto w-full">
                {/* ── Grid texture ── */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.018)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />
                {/* ── Ambient glow ── */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-emerald-500/[0.05] rounded-full blur-[160px] pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[400px] bg-blue-500/[0.03] rounded-full blur-[160px] pointer-events-none" />
                {/* Top accent */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/25 to-transparent" />

                <ProcessingHUD
                    isVisible={isLoading}
                    percent={progressPercent}
                    currentStep={progressStep}
                    logHistory={progressLog}
                    onCancel={handleCancel}
                    isComplete={isProcessingComplete}
                    stats={processingStats || undefined}
                    onConfirm={onFinishProcessing}
                />

                <div className="relative z-10 w-full flex-1 p-8 lg:p-16 xl:p-20" style={{ animation: 'fadeIn 0.7s ease-out both' }}>

                    {error && (
                        <div className="bg-rose-500/8 border border-rose-500/25 rounded-2xl p-4 mb-10 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                            <div className="w-10 h-10 bg-rose-500/15 rounded-xl flex items-center justify-center text-rose-500 shrink-0">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-widest leading-none mb-1">Erreur de Traitement</h4>
                                <p className="text-xs text-rose-200/60 font-medium">{error}</p>
                            </div>
                        </div>
                    )}

                    {showInfoBanner && (
                        <div className="relative bg-blue-500/5 border border-blue-500/15 rounded-3xl p-6 mb-10 overflow-hidden">
                            <button onClick={() => setShowInfoBanner(false)} className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-colors z-20 flex items-center justify-center">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center shrink-0 border border-blue-500/20">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2">Guide de Préparation</h3>
                                    <p className="text-slate-400 text-xs leading-relaxed mb-5">L'expertise de PlanneX repose sur la structure de vos données. Utilisez nos modèles officiels pour une précision chirurgicale.</p>
                                    <div className="flex gap-3">
                                        <a href="https://docs.google.com/spreadsheets/d/1dvFmRefQKUAw77tPppIC2KNMvBlsz7qG/export?format=xlsx" download="PlanneX_Template.xlsx"
                                            className="flex-1 text-center bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-black py-2.5 px-4 rounded-xl transition-all text-[10px] uppercase tracking-widest">Modèle</a>
                                        <a href="https://docs.google.com/spreadsheets/d/1gVBznZJP68oDp8qCvHpNUOrxtnKdl8A1/export?format=xlsx" download="PlanneX_Example.xlsx"
                                            className="flex-1 text-center bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-black py-2.5 px-4 rounded-xl transition-all text-[10px] uppercase tracking-widest">Exemple</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Configuration Header ── */}
                    <div className="text-center mb-14">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-emerald-500/8 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.08)]">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-emerald-400 text-[9px] font-black uppercase tracking-[0.4em]">Étape de Configuration</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tighter mb-3 leading-none">
                            Configuration
                        </h1>
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="h-px w-10 bg-gradient-to-r from-transparent to-emerald-500/40" />
                            <div className="h-0.5 w-12 bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                            <div className="h-px w-10 bg-gradient-to-l from-transparent to-cyan-500/40" />
                        </div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.5em]">Initialisation des paramètres critiques</p>
                    </div>

                    {/* ── Form Content ── */}
                    <div className="max-w-3xl mx-auto space-y-8">

                        {!isScratchMode && (
                            <div className="relative">
                                <div className="flex items-center gap-3 mb-5">
                                    <div className="h-px flex-1 bg-white/5" />
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Matrice de données (.xlsx)</span>
                                    <div className="h-px flex-1 bg-white/5" />
                                </div>
                                {!file ? (
                                    <div
                                        onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
                                        className={`group relative flex flex-col items-center justify-center p-14 rounded-[2rem] transition-all cursor-pointer overflow-hidden border-2 border-dashed ${isDragging
                                            ? 'border-emerald-500 bg-emerald-500/5 shadow-[0_0_40px_rgba(16,185,129,0.2)]'
                                            : 'border-white/8 hover:border-emerald-500/40 hover:bg-white/[0.02] bg-white/[0.01]'
                                            }`}
                                        onClick={() => document.getElementById('file-input-cold')?.click()}
                                    >
                                        {/* Scan sweep */}
                                        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 -translate-y-full group-hover:animate-scan pointer-events-none" />
                                        {/* Corner accents */}
                                        <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-emerald-500/20 group-hover:border-emerald-500/60 transition-colors rounded-tl-lg" />
                                        <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-emerald-500/20 group-hover:border-emerald-500/60 transition-colors rounded-tr-lg" />
                                        <div className="absolute bottom-4 left-4 w-5 h-5 border-b-2 border-l-2 border-emerald-500/20 group-hover:border-emerald-500/60 transition-colors rounded-bl-lg" />
                                        <div className="absolute bottom-4 right-4 w-5 h-5 border-b-2 border-r-2 border-emerald-500/20 group-hover:border-emerald-500/60 transition-colors rounded-br-lg" />

                                        <div className="w-16 h-16 bg-white/[0.04] border border-white/10 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:border-emerald-500/40 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.2)] transition-all duration-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-slate-500 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M12 15v-6m0 0l-3 3m3-3l3 3" />
                                            </svg>
                                        </div>
                                        <span className="text-white font-black uppercase text-[10px] tracking-[0.3em] group-hover:text-emerald-400 transition-colors mb-1.5">Déposer le fichier</span>
                                        <span className="text-slate-600 font-mono text-[9px] uppercase tracking-widest">Ou cliquer pour parcourir · .xlsx .xls</span>
                                        <input id="file-input-cold" type="file" className="hidden" accept=".xlsx, .xls" onChange={(e) => handleFileChange(e.target.files)} />
                                    </div>
                                ) : (
                                    <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-[2rem] flex items-center justify-between gap-4 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-11 h-11 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/25 shrink-0">
                                                <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <div className="truncate">
                                                <p className="font-black text-white text-sm truncate">{file.name}</p>
                                                <p className="text-[9px] text-emerald-500/60 font-mono uppercase tracking-widest">Source validée · Prête à l'analyse</p>
                                            </div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                            className="w-9 h-9 flex items-center justify-center text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all shrink-0">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Date Inputs ── */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <div className="flex items-center gap-2 mb-3 ml-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/60" />
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Activation Système</label>
                                </div>
                                <div className="relative group">
                                    <input
                                        type="datetime-local"
                                        value={params.shutdownStart}
                                        onChange={e => setParams(p => ({ ...p, shutdownStart: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/8 hover:border-emerald-500/25 focus:border-emerald-500/40 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all font-bold placeholder-slate-700 focus:bg-emerald-500/[0.03] focus:shadow-[0_0_30px_rgba(16,185,129,0.08)]"
                                    />
                                    <div onClick={handleIconClick} className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-slate-600 hover:text-emerald-500 transition-colors z-20 p-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-3 ml-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/60" />
                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Clôture Échéancier</label>
                                </div>
                                <div className="relative group">
                                    <input
                                        type="datetime-local"
                                        value={params.shutdownEnd}
                                        onChange={e => setParams(p => ({ ...p, shutdownEnd: e.target.value }))}
                                        className="w-full bg-white/[0.03] border border-white/8 hover:border-blue-500/25 focus:border-blue-500/40 rounded-2xl px-5 py-4 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all font-bold placeholder-slate-700 focus:bg-blue-500/[0.03] focus:shadow-[0_0_30px_rgba(59,130,246,0.08)]"
                                    />
                                    <div onClick={handleIconClick} className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-slate-600 hover:text-blue-400 transition-colors z-20 p-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    </div>
                                </div>
                                <div className="mt-3 flex items-center justify-between px-2">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-700">Durée estimée</span>
                                    <span className="text-[10px] font-black font-mono text-emerald-400/80">{totalDurationHours} H</span>
                                </div>
                            </div>
                        </div>

                        {/* ── Action Row ── */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-8 border-t border-white/5">
                            <button
                                onClick={onBack}
                                className="group flex items-center gap-3 text-slate-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-[0.3em] px-5 py-3.5 rounded-2xl hover:bg-white/5 order-2 sm:order-1 active:scale-95 border border-transparent hover:border-white/8"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                                {initialState ? 'Dashboard' : 'Retour'}
                            </button>

                            <button
                                onClick={handleConfirm}
                                disabled={isConfirmDisabled}
                                className="group relative overflow-hidden text-white font-black py-5 px-10 rounded-2xl transition-all flex justify-center items-center w-full sm:w-64 order-1 sm:order-2 active:scale-95 uppercase tracking-[0.2em] text-xs disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_20px_50px_rgba(16,185,129,0.25)]"
                                style={{ background: isConfirmDisabled ? undefined : 'linear-gradient(135deg, #059669, #10b981)' }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                                {isLoading ? (
                                    <div className="flex items-center gap-3">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                        <span>Syncing...</span>
                                    </div>
                                ) : (
                                    <span className="relative z-10 flex items-center gap-3">
                                        {buttonText}
                                        <svg className="h-4 w-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                <style>{`
                    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                    @keyframes fadeInUp { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
                    @keyframes scan { from { transform: translateY(-100%); } to { transform: translateY(100%); } }
                    .animate-scan { animation: scan 3s linear infinite; }
                    @keyframes shimmer { 100% { transform: translateX(100%); } }
                    .animate-shimmer { animation: shimmer 2s infinite; }
                `}</style>
            </div>
        );
    };

// --- Main Page Component ---
const SchedulingPage: React.FC<SchedulingPageProps> = ({
    onFinishedScheduling,
    onBack,
    initialState,
    isScratchMode,
    initialStep,
    filters,
    setFilters,
    onNavigateToPortal,
    onStateChange,
    evaluationData,
    projectName
}) => {
    const [step, setStep] = useState<'setup' | 'dashboard' | 'scheduling' | 'readiness' | 'pdr' | 'cost' | 'health'>(() => {
        if (initialStep) return initialStep as any;
        // Only go to 'dashboard' if the initial state has shutdownParams.
        // If the session was restored without shutdownParams (e.g. from the new cloud save format
        // that strips scheduling-config fields), fall back to 'setup' so the user can re-upload.
        return (initialState && initialState.shutdownParams) ? 'dashboard' : 'setup';
    });
    const [tasks, setTasks] = useState<SchedulingTaskData[]>(initialState?.tasks ?? []);
    const [pdrItems, setPdrItems] = useState<PDRItem[]>(initialState?.pdrItems ?? []);
    const [history, setHistory] = useState<SchedulingTaskData[][]>([]);
    const [redoHistory, setRedoHistory] = useState<SchedulingTaskData[][]>([]);
    const [shutdownParams, setShutdownParams] = useState<ShutdownParams | null>(initialState?.shutdownParams ?? null);
    const [currentFile, setCurrentFile] = useState<File | null>(initialState?.currentFile ?? null);
    const [dailyDurationLimit, setDailyDurationLimit] = useState(initialState?.dailyDurationLimit ?? 0);
    const [internalEvaluationData, setInternalEvaluationData] = useState<EvaluationData | null>(initialState?.evaluationData || evaluationData || null);
    const [costData, setCostData] = useState<CompanyCost[]>(initialState?.costData ?? []);
    // New multi-sheet domain state
    const [costHubEntries, setCostHubEntries] = useState(initialState?.costHubEntries ?? []);
    const [scaffoldingRecords, setScaffoldingRecords] = useState(initialState?.scaffoldingRecords ?? []);
    const [handlingRecords, setHandlingRecords] = useState(initialState?.handlingRecords ?? []);
    const [permitRecords, setPermitRecords] = useState(initialState?.permitRecords ?? []);
    const [simopsRecords, setSimopsRecords] = useState(initialState?.simopsRecords ?? []);
    const [mapTasks, setMapTasks] = useState<SchedulingTaskData[]>(initialState?.mapTasks ?? []);

    // --- CRITICAL: Sync external state changes (from DataManagementPage) back into local state ---
    // When the user adds/edits/deletes data in the Master Data Center, App.tsx updates schedulingState.
    // Since SchedulingPage is already mounted, its useState hooks won't re-run. These effects bridge that gap.
    useEffect(() => {
        if (initialState?.scaffoldingRecords !== undefined) setScaffoldingRecords(initialState.scaffoldingRecords);
    }, [initialState?.scaffoldingRecords]);

    useEffect(() => {
        if (initialState?.handlingRecords !== undefined) setHandlingRecords(initialState.handlingRecords);
    }, [initialState?.handlingRecords]);

    useEffect(() => {
        if (initialState?.permitRecords !== undefined) setPermitRecords(initialState.permitRecords);
    }, [initialState?.permitRecords]);

    useEffect(() => {
        if (initialState?.simopsRecords !== undefined) setSimopsRecords(initialState.simopsRecords);
    }, [initialState?.simopsRecords]);

    useEffect(() => {
        if (initialState?.costHubEntries !== undefined) setCostHubEntries(initialState.costHubEntries);
    }, [initialState?.costHubEntries]);

    useEffect(() => {
        if (initialState?.pdrItems !== undefined) setPdrItems(initialState.pdrItems);
    }, [initialState?.pdrItems]);

    useEffect(() => {
        if (initialState?.mapTasks !== undefined) setMapTasks(initialState.mapTasks);
    }, [initialState?.mapTasks]);

    // Sync tasks from external changes (DataManagementPage). Safe because when SchedulingPage calls
    // onStateChange with its current tasks, the reference is identical — React won't re-render.
    useEffect(() => {
        if (initialState?.tasks !== undefined) setTasks(initialState.tasks);
    }, [initialState?.tasks]);

    const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean; title: string; message: string }>({
        isOpen: false,
        title: '',
        message: ''
    });

    const showAlert = (title: string, message: string) => {
        setAlertConfig({ isOpen: true, title, message });
    };

    // --- Sync back to global state (debounced 300ms to avoid firing on every keystroke) ---
    const stateChangePendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (!onStateChange || !shutdownParams) return;
        if (stateChangePendingRef.current) clearTimeout(stateChangePendingRef.current);
        stateChangePendingRef.current = setTimeout(() => {
            onStateChange({
                tasks,
                pdrItems,
                shutdownParams,
                currentFile: currentFile || new File([], 'manual_data.xlsx'),
                filters,
                dailyDurationLimit,
                evaluationData: internalEvaluationData || undefined,
                costData,
                costHubEntries,
                scaffoldingRecords,
                handlingRecords,
                permitRecords,
                simopsRecords,
                mapTasks,
            });
        }, 300);
        return () => { if (stateChangePendingRef.current) clearTimeout(stateChangePendingRef.current); };
    }, [tasks, pdrItems, shutdownParams, currentFile, filters, dailyDurationLimit, onStateChange, internalEvaluationData, costData, costHubEntries, scaffoldingRecords, handlingRecords, permitRecords, simopsRecords, mapTasks]);

    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // --- HUD State ---
    const [progressPercent, setProgressPercent] = useState(0);
    const [progressStep, setProgressStep] = useState('');
    const [progressLog, setProgressLog] = useState<string[]>([]);
    const cancelWorkerRef = useRef<(() => void) | null>(null);
    const fakeProgressIntervalRef = useRef<number | null>(null);
    const logCycleIntervalRef = useRef<number | null>(null);

    // --- Success State ---
    const [isProcessingComplete, setIsProcessingComplete] = useState(false);
    const [processingStats, setProcessingStats] = useState<{ taskCount: number; startDate: string; endDate: string; disciplineCount: number; pdrCount?: number } | null>(null);

    // ----------------

    const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
    const [isSchedulingModalOpen, setIsSchedulingModalOpen] = useState(false);
    const [isTeamTasksModalOpen, setIsTeamTasksModalOpen] = useState(false);
    const [viewingTeam, setViewingTeam] = useState<{ name: string; tasks: SchedulingTaskData[] } | null>(null);
    const [overloadWarning, setOverloadWarning] = useState<{ isOpen: boolean; teamNames: string[]; onConfirm: () => void; } | null>(null);
    const [scheduleOverrunWarning, setScheduleOverrunWarning] = useState<{ isOpen: boolean; tasks: SchedulingTaskData[]; onConfirm: () => void; } | null>(null);
    const [taskToEdit, setTaskToEdit] = useState<SchedulingTaskData | null>(null);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [dependencySelectionId, setDependencySelectionId] = useState<number | null>(null);
    const [taskToViewDependencies, setTaskToViewDependencies] = useState<SchedulingTaskData | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'ascending' });
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [duplicateConfirmState, setDuplicateConfirmState] = useState<{ isOpen: boolean; count: number } | null>(null);
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);
    const keyEventHeaderCheckboxRef = useRef<HTMLInputElement>(null);
    const [renameConfirmState, setRenameConfirmState] = useState<{ isOpen: boolean; discipline: string; oldName: string; newName: string; } | null>(null);
    const [isLiveSchedulingOpen, setIsLiveSchedulingOpen] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [manpowerConflict, setManpowerConflict] = useState<{ isOpen: boolean; conflicts: Record<string, number[]>; onConfirm: (resolutions: Record<string, number>) => void; } | null>(null);
    const [unlinkConfirm, setUnlinkConfirm] = useState<{ isOpen: boolean; targetTask: SchedulingTaskData; combinedTasks: SchedulingTaskData[]; successors: SchedulingTaskData[]; forceUnlink: () => void; shiftForwardUnlink: () => void; } | null>(null);

    const [disciplineColors, setDisciplineColors] = useState<Map<string, string>>(new Map());
    const [timelineOptions, setTimelineOptions] = useState<{ unit: 'Heures' | 'Jours', interval: number }>({ unit: 'Heures', interval: 4 });
    const [familyOrder, setFamilyOrder] = useState<string[]>([]);

    // -- Tags State --
    const [tagsByTeam, setTagsByTeam] = useState<Record<string, string[]>>({});
    const [globalAvailableTags, setGlobalAvailableTags] = useState<string[]>([]);

    // --- HOVER TOOLTIP STATE ---
    const [isHoverDetailsEnabled, setIsHoverDetailsEnabled] = useState(false);
    const [hoveredScheduledTask, setHoveredScheduledTask] = useState<SchedulingTaskData | null>(null);
    const [tooltipInitialPos, setTooltipInitialPos] = useState({ x: 0, y: 0 });
    const tooltipRef = useRef<HTMLDivElement>(null);

    // --- COLUMN MANAGEMENT STATE ---
    const [columnDefs, setColumnDefs] = useState<ColumnDef[]>(() => {
        try {
            const saved = localStorage.getItem('planex_column_config_v1');
            if (saved) return JSON.parse(saved);
        } catch (e) { console.error('Failed to load columns', e); }
        return DEFAULT_COLUMNS;
    });
    const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
    const columnMenuRef = useRef<HTMLDivElement>(null);

    // --- VIRTUALIZATION STATE ---
    const [tableScrollTop, setTableScrollTop] = useState(0);
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const ROW_HEIGHT = 45; // Fixed height for rows to simplify virtualization

    // --- Calculated/Memoized State ---

    const scheduledTasks = useMemo(() => tasks.filter(t => t.isScheduled && t['START DATE'] && t['END DATE']), [tasks]);

    const lastTasksByTeam = useMemo(() => {
        const lastMap = new Map<string, SchedulingTaskData>();
        scheduledTasks.forEach(task => {
            if (task.DISCIPLINE && task["TYPE D'EQUIPE"]) {
                const teamKey = `${task.DISCIPLINE} ${task["TYPE D'EQUIPE"]}`;
                const currentLast = lastMap.get(teamKey);
                if (!currentLast || (task['END DATE'] && currentLast['END DATE'] && task['END DATE'] > currentLast['END DATE'])) {
                    lastMap.set(teamKey, task);
                }
            }
        });
        return lastMap;
    }, [scheduledTasks]);

    const autoStartDate = useMemo(() => {
        if (selectedTaskIds.length === 0) return null;
        if (scheduledTasks.length === 0) return shutdownParams?.shutdownStart || null;
        const maxEnd = Math.max(...scheduledTasks.map(t => t['END DATE']!.getTime()));
        return new Date(maxEnd).toISOString().slice(0, 16);
    }, [scheduledTasks, selectedTaskIds, shutdownParams]);

    const { selectedDuration, selectedDisciplineBreakdown } = useMemo(() => {
        let duration = 0;
        const breakdown: Record<string, number> = {};
        tasks.filter(t => selectedTaskIds.includes(t.id)).forEach(t => {
            duration += t.DUREE;
            const disc = t.DISCIPLINE || 'Sans Discipline';
            breakdown[disc] = (breakdown[disc] || 0) + t.DUREE;
        });
        return { selectedDuration: duration, selectedDisciplineBreakdown: breakdown };
    }, [tasks, selectedTaskIds]);

    useEffect(() => {
        try {
            localStorage.setItem('planex_column_config_v1', JSON.stringify(columnDefs));
        } catch (e) { console.error('Failed to save columns', e); }
    }, [columnDefs]);

    useEffect(() => {
        if (tasks.length > 0) {
            const disciplines = [...new Set(tasks.map(t => t.DISCIPLINE).filter(Boolean))].sort();
            const newColorMap = new Map(disciplineColors);
            let updated = false;
            disciplines.forEach((discipline, index) => {
                if (!newColorMap.has(discipline)) {
                    newColorMap.set(discipline, HIGH_CONTRAST_COLORS[(newColorMap.size + index) % HIGH_CONTRAST_COLORS.length]);
                    updated = true;
                }
            });
            if (updated) {
                setDisciplineColors(newColorMap);
            }

            const currentFamilies = new Set(tasks.map(t => t.FAMILLE).filter(Boolean));

            setFamilyOrder(prevOrder => {
                if (prevOrder.length === 0) {
                    return [...currentFamilies].sort();
                }
                const prevOrderSet = new Set(prevOrder);
                const preservedOrder = prevOrder.filter(family => currentFamilies.has(family));
                const newFamilies = [...currentFamilies].filter(family => !prevOrderSet.has(family));
                newFamilies.sort((a, b) => a.localeCompare(b));
                const nextOrder = [...preservedOrder, ...newFamilies];

                if (prevOrder.length === nextOrder.length && prevOrder.every((v, i) => v === nextOrder[i])) {
                    return prevOrder;
                }
                return nextOrder;
            });
        }
    }, [tasks]);

    const tagSuggestions = useMemo(() => {
        const fromTasks = new Set<string>();
        tasks.forEach(t => {
            if (t['Nom Equipement']) fromTasks.add(t['Nom Equipement']);
            if (t.FAMILLE) fromTasks.add(t.FAMILLE);
        });
        return [...Array.from(fromTasks), ...globalAvailableTags].sort();
    }, [tasks, globalAvailableTags]);

    const handleRowMouseEnter = useCallback((task: SchedulingTaskData, e: React.MouseEvent) => {
        if (isHoverDetailsEnabled && task.isScheduled) {
            const offset = 20;
            const x = Math.min(e.clientX + offset, window.innerWidth - 300);
            const y = Math.min(e.clientY + offset, window.innerHeight - 200);
            setTooltipInitialPos({ x, y });
            setHoveredScheduledTask(task);
        }
    }, [isHoverDetailsEnabled]);

    const handleRowMouseMove = useCallback((e: React.MouseEvent) => {
        if (hoveredScheduledTask && tooltipRef.current) {
            const offset = 20;
            const x = Math.min(e.clientX + offset, window.innerWidth - 300);
            const y = Math.min(e.clientY + offset, window.innerHeight - 200);
            tooltipRef.current.style.left = `${x}px`;
            tooltipRef.current.style.top = `${y}px`;
        }
    }, [hoveredScheduledTask]);

    const handleRowMouseLeave = useCallback(() => {
        setHoveredScheduledTask(null);
    }, []);

    const updateTasks = useCallback((updater: (prevTasks: SchedulingTaskData[]) => SchedulingTaskData[]) => {
        setTasks(currentTasks => {
            setHistory(prevHistory => [...prevHistory, currentTasks]);
            setRedoHistory([]);
            return updater(currentTasks);
        });
    }, []);

    const handleUndo = () => {
        if (history.length === 0) return;
        const lastState = history[history.length - 1];
        setTasks(prevTasks => {
            setRedoHistory(prevRedo => [...prevRedo, prevTasks]);
            return lastState;
        });
        setHistory(prevHistory => prevHistory.slice(0, -1));
    };

    const handleRedo = () => {
        if (redoHistory.length === 0) return;
        const redoState = redoHistory[redoHistory.length - 1];
        setTasks(prevTasks => {
            setHistory(prevHistory => [...prevHistory, prevTasks]);
            return redoState;
        });
        setRedoHistory(prevRedo => prevRedo.slice(0, -1));
    };

    const handleDuplicateSelectedTasks = useCallback(() => {
        if (selectedTaskIds.length === 0) return;
        setDuplicateConfirmState({ isOpen: true, count: 1 });
    }, [selectedTaskIds]);

    const confirmDuplicate = useCallback((count: number) => {
        updateTasks(currentTasks => {
            const tasksToDuplicate = currentTasks.filter(t => selectedTaskIds.includes(t.id));
            if (tasksToDuplicate.length === 0) return currentTasks;

            let lastId = Math.max(...currentTasks.map(t => t.id));
            const additions: { index: number, task: SchedulingTaskData }[] = [];

            tasksToDuplicate.forEach(originalTask => {
                for (let i = 0; i < count; i++) {
                    lastId++;
                    const suffix = count > 1 ? ` (copie ${i + 1})` : ` (copie)`;
                    const newTask: SchedulingTaskData = {
                        ...originalTask,
                        id: lastId,
                        'GLOBAL TASKS': `${originalTask['GLOBAL TASKS']}${suffix}`,
                        isScheduled: false,
                        'START DATE': null,
                        'END DATE': null,
                        'TYPE D\'EQUIPE': null,
                        'EQUIPE NUMBER': null,
                        'MAX HOUR': null,
                        isKeyEvent: false,
                        predecessor: [],
                        multiDisciplineId: undefined,
                    };
                    const originalIndex = currentTasks.findIndex(t => t.id === originalTask.id);
                    additions.push({ index: originalIndex !== -1 ? originalIndex + 1 : currentTasks.length, task: newTask });
                }
            });

            const updatedTasks = [...currentTasks];
            additions.sort((a, b) => b.index - a.index).forEach(({ index, task }) => {
                updatedTasks.splice(index, 0, task);
            });

            return updatedTasks;
        });
        setSelectedTaskIds([]);
        setDuplicateConfirmState(null);
    }, [selectedTaskIds, updateTasks]);

    const handleDeleteSelectedTasks = useCallback((mode: 'cascade' | 'shift') => {
        updateTasks(currentTasks => {
            const selectedIdsSet = new Set(selectedTaskIds);

            if (mode === 'cascade') {
                // Find all successors recursively
                const toDelete = new Set(selectedIdsSet);
                const queue = [...selectedTaskIds];
                while (queue.length > 0) {
                    const currentId = queue.shift()!;
                    const succs = currentTasks.filter(t => t.predecessor?.includes(currentId) && !toDelete.has(t.id));
                    for (const s of succs) {
                        toDelete.add(s.id);
                        queue.push(s.id);
                    }
                }
                const remainingTasks = currentTasks.filter(task => !toDelete.has(task.id));
                return remainingTasks.map(task => {
                    if (task.predecessor?.some(id => toDelete.has(id))) {
                        return { ...task, predecessor: task.predecessor.filter(id => !toDelete.has(id)) };
                    }
                    return task;
                });
            }

            // mode === 'shift': Remove only selected tasks, re-link and shift successors
            // Build a map of deleted task predecessors for re-linking
            const deletedTaskPredecessors = new Map<number, number[]>();
            currentTasks.forEach(task => {
                if (selectedIdsSet.has(task.id)) {
                    deletedTaskPredecessors.set(task.id, (task.predecessor || []).filter(id => !selectedIdsSet.has(id)));
                }
            });

            // Calculate total duration of deleted tasks for time shifting
            const deletedDuration = currentTasks
                .filter(t => selectedIdsSet.has(t.id))
                .reduce((sum, t) => sum + t.DUREE, 0);

            // Remove selected tasks
            const remainingTasks = currentTasks.filter(task => !selectedIdsSet.has(task.id));

            // Re-link: for tasks whose predecessors were deleted, inherit the deleted task's predecessors
            let finalTasks = remainingTasks.map(task => {
                if (task.predecessor?.some(id => selectedIdsSet.has(id))) {
                    const newPreds = new Set<number>();
                    (task.predecessor || []).forEach(predId => {
                        if (selectedIdsSet.has(predId)) {
                            // Inherit the deleted task's predecessors
                            (deletedTaskPredecessors.get(predId) || []).forEach(p => newPreds.add(p));
                        } else {
                            newPreds.add(predId);
                        }
                    });
                    return { ...task, predecessor: Array.from(newPreds) };
                }
                return task;
            });

            // Cascade time recalculation (shift successors earlier)
            const affectedIds = new Set<number>();
            // Find direct successors of deleted tasks
            finalTasks.forEach(t => {
                if (t.predecessor?.some(id => selectedIdsSet.has(id)) || (t.predecessor || []).some(id => deletedTaskPredecessors.has(id))) {
                    affectedIds.add(t.id);
                }
            });

            // BFS cascade: recalculate times
            const queue = [...affectedIds];
            const visited = new Set(queue);
            while (queue.length > 0) {
                const currentId = queue.shift()!;
                const taskIdx = finalTasks.findIndex(t => t.id === currentId);
                if (taskIdx === -1) continue;
                const task = finalTasks[taskIdx];

                if (task.isScheduled && task['START DATE'] && task['END DATE']) {
                    let newStart = new Date(0);
                    const preds = task.predecessor || [];
                    if (preds.length > 0) {
                        preds.forEach(predId => {
                            const predTask = finalTasks.find(t => t.id === predId);
                            if (predTask && predTask['END DATE']) {
                                const predEnd = new Date(predTask['END DATE']);
                                if (predEnd.getTime() > newStart.getTime()) {
                                    newStart = predEnd;
                                }
                            }
                        });
                    }

                    if (newStart.getTime() > 0) {
                        const newEnd = new Date(newStart.getTime() + task.DUREE * 3600000);
                        finalTasks[taskIdx] = { ...task, 'START DATE': newStart, 'END DATE': newEnd };
                    }
                }

                // Find successors and cascade
                finalTasks.forEach(t => {
                    if (t.predecessor?.includes(currentId) && !visited.has(t.id)) {
                        visited.add(t.id);
                        queue.push(t.id);
                    }
                });
            }

            return finalTasks;
        });
        setSelectedTaskIds([]);
        setIsDeleteConfirmOpen(false);
    }, [selectedTaskIds, updateTasks]);

    const executeTeamRename = () => {
        if (!renameConfirmState) return;
        const { discipline, oldName, newName } = renameConfirmState;
        updateTasks(currentTasks =>
            currentTasks.map(task => {
                if (task.DISCIPLINE === discipline && task["TYPE D'EQUIPE"] === oldName) {
                    return {
                        ...task,
                        "TYPE D'EQUIPE": newName,
                    };
                }
                return task;
            })
        );
        const oldKey = `${discipline} ${oldName}`;
        const newKey = `${discipline} ${newName}`;
        if (tagsByTeam[oldKey]) {
            setTagsByTeam(prev => {
                const newState = { ...prev };
                newState[newKey] = newState[oldKey];
                delete newState[oldKey];
                return newState;
            });
        }
        setRenameConfirmState(null);
    };

    const handleRenameTeam = (discipline: string, oldPartialName: string, newPartialName: string): boolean => {
        const trimmedNewName = newPartialName.trim();
        if (!trimmedNewName || trimmedNewName === oldPartialName) {
            return false;
        }

        const isDuplicate = tasks.some(t =>
            t.isScheduled &&
            t.DISCIPLINE === discipline &&
            t["TYPE D'EQUIPE"] === trimmedNewName
        );

        if (isDuplicate) {
            showAlert("Nom d'équipe déjà utilisé", `Le nom d'équipe "${trimmedNewName}" existe déjà pour la discipline ${discipline}. Veuillez choisir un nom unique.`);
            return false;
        }

        setRenameConfirmState({
            isOpen: true,
            discipline,
            oldName: oldPartialName,
            newName: trimmedNewName,
        });

        return true;
    };

    const pdrItemsFromTasks = useMemo(() => {
        const items: PDRItem[] = [];
        tasks.forEach(t => {
            if (t.pdrItems) {
                t.pdrItems.forEach(item => items.push(item));
            }
        });
        return items;
    }, [tasks]);

    const allPdrItems = useMemo(() => {
        // Combine global pdrItems with items from tasks
        // Avoid duplicates based on ID if they happen to be in both (though they shouldn't usually)
        const combined = [...pdrItems];
        pdrItemsFromTasks.forEach(item => {
            if (!combined.some(c => c.id === item.id)) {
                combined.push(item);
            }
        });
        return combined;
    }, [pdrItems, pdrItemsFromTasks]);

    const handleExportProgress = useCallback(() => {
        if (!tasks || tasks.length === 0) {
            showAlert("Exportation impossible", "Aucun avancement à exporter.");
            return;
        }

        const exportData = tasks.map(task => {
            const taskToExport: any = { ...task };
            // Formatting and Data Cleaning for Export
            taskToExport["START DATE"] = task["START DATE"] ? task["START DATE"].toISOString() : null;
            taskToExport["END DATE"] = task["END DATE"] ? task["END DATE"].toISOString() : null;
            taskToExport.isScheduled = task.isScheduled ? 'TRUE' : 'FALSE';
            taskToExport.isKeyEvent = task.isKeyEvent ? 'TRUE' : 'FALSE';
            taskToExport.predecessor = Array.isArray(task.predecessor) ? task.predecessor.join(',') : '';
            taskToExport.predecessorsByName = Array.isArray(task.predecessorsByName) ? task.predecessorsByName.join(';') : '';
            taskToExport.successorsByName = Array.isArray(task.successorsByName) ? task.successorsByName.join(';') : '';

            // Remove internal system objects, arrays and redundant calculated fields
            const keysToRemove = [
                'pdrItems', 'scaffoldingRecords', 'handlingRecords', 'permitRecords', 'simopsRecords',
                'meta', 'history', 'isLastForTeam', 'isCritical', 'multiDisciplineId',
                'COST_TYPE', 'TASK_COST', 'MO_HH_COST', 'PRESTATION_COST', 'SCAFFOLDING_COST',
                'HANDLING_COST', 'PDR COST', 'TOTAL_COST', 'TOTAL TASK COST',
                // Domain flags (Note: ADRPT is kept as per user request)
                'Scaffolding Required', 'Scaffolding Readiness', 'Handling required', 'Handling Readiness',
                'permisTravailHauteur', 'permis Travail Hauteur Readiness',
                'permisFeu', 'permis Feu Readiness',
                'permisPenetration', 'permis Penetration Readiness',
                'permisLevage', 'permis Levage Readiness',
                'permisExcavation', 'permis Excavation Readiness',
                // Financial & Geolocation Redundancy
                'PRICE FOR HH', 'MANUAL PRICE', 'Scaffolding manual Price', 'Handling manual Price',
                'POSTE DESCRIPTION', 'Latitude', 'Longitude',
                // Preparation & HSE Redundancy
                'Préparatifs', 'Préparatifs Readiness', 'COMMENTAIRE HSE',
                // Detailed Dependency Fragments (Observed to be empty)
                'predecessorsByName', 'successorsByName'
            ];
            keysToRemove.forEach(key => delete taskToExport[key]);

            // Professional Renaming & Ensuring existence for specific columns
            taskToExport["Poste Number"] = task["POSTE NUMBER"] || '';
            taskToExport["Quantité"] = task.QT !== undefined ? task.QT : 0;
            taskToExport["Additional Cost"] = task["Additional Cost"] || 0;

            // Remove the old/technical versions of these keys
            delete taskToExport.QT;
            delete taskToExport["POSTE NUMBER"];

            return taskToExport;
        });

        // Prepare PDR Export Data - REFINED for full context
        const pdrExportData = allPdrItems.map(pdr => {
            const linkedTask = tasks.find(t => String(t.OT).trim() === String(pdr.OT).trim() || (pdr.OT && t.OT && String(t.OT).includes(String(pdr.OT))));
            return {
                "OT REFERENCE": pdr.OT,
                "DESIGNATION": pdr.sparePart,
                "READINESS": pdr.readiness === 1 ? 'READY' : 'MISSING',
                "STATUT LOGISTIQUE": pdr.status || 'Non défini',
                "UNITE": pdr.unite || 'U',
                "QUANTITE": pdr.qty || 0,
                "PRIX UNITAIRE": pdr.priceU || 0,
                "VALEUR TOTALE": pdr.totalPrice || 0,
                "DUE DATE (PLANNIFICATION)": pdr.dueDate || 'N/A',
                "PROJECTED START (EXECUTION)": linkedTask?.["START DATE"] ? linkedTask["START DATE"].toLocaleString('fr-FR') : 'Non planifié',
                "COMMENTAIRE": pdr.comment || ''
            };
        });

        try {
            const workbook = XLSX.utils.book_new();

            // ── Sheet 1: Avancement Ordonnancement (always) ──────────────────────────────
            const worksheetTasks = XLSX.utils.json_to_sheet(exportData);
            XLSX.utils.book_append_sheet(workbook, worksheetTasks, "Avancement Ordonnancement");

            // ── Sheet 2: Suivi de PDR ─────────────────────────────────────────────────────
            const pdrRows = pdrExportData.length > 0 ? pdrExportData : [{ "OT REFERENCE": "(aucune donnée)", "DESIGNATION": "", "READINESS": "", "STATUT LOGISTIQUE": "", "UNITE": "", "QUANTITE": "", "PRIX UNITAIRE": "", "VALEUR TOTALE": "", "DUE DATE (PLANNIFICATION)": "", "PROJECTED START (EXECUTION)": "", "COMMENTAIRE": "" }];
            const worksheetPDR = XLSX.utils.json_to_sheet(pdrRows);
            worksheetPDR['!cols'] = [{ wch: 18 }, { wch: 45 }, { wch: 12 }, { wch: 22 }, { wch: 10 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 28 }, { wch: 50 }];
            XLSX.utils.book_append_sheet(workbook, worksheetPDR, "Suivi de PDR");

            // ── Sheet 3: Evaluation a Chaud ───────────────────────────────────────────────
            const evaluationExportData = tasks.map(task => {
                const evalTask = internalEvaluationData?.tasks?.[task.id];
                return {
                    "ID": task.id,
                    "OT": task.OT,
                    "TASK NAME": task["GLOBAL TASKS"],
                    "ACTUAL START": evalTask?.actualStart || '',
                    "ACTUAL END": evalTask?.actualEnd || '',
                    "STATUS": evalTask?.status || 'À Faire',
                    "ACTUAL PROGRESS %": evalTask?.actualProgress || 0,
                    "REMAINING HOURS": evalTask?.actualRemainingTime || 0,
                    "NON-COMPLETION CAUSE": evalTask?.nonCompletionDetails?.cause || '',
                    "PILOT": evalTask?.nonCompletionDetails?.pilot || '',
                    "SLIPPAGE CAUSE": evalTask?.slippageDetails?.cause?.join('; ') || '',
                    "ACTION PLAN": evalTask?.slippageDetails?.preventiveAction?.join('; ') || ''
                };
            });
            const worksheetEval = XLSX.utils.json_to_sheet(evaluationExportData.length > 0 ? evaluationExportData : [{ "ID": "", "OT": "(aucune donnée)", "TASK NAME": "", "ACTUAL START": "", "ACTUAL END": "", "STATUS": "", "ACTUAL PROGRESS %": "", "REMAINING HOURS": "", "NON-COMPLETION CAUSE": "", "PILOT": "", "SLIPPAGE CAUSE": "", "ACTION PLAN": "" }]);
            XLSX.utils.book_append_sheet(workbook, worksheetEval, "Evaluation a Chaud");

            // ── Sheet 4: Evaluation de l'Arret ────────────────────────────────────────────
            const perfData = internalEvaluationData ? [
                { "Performance Hub": "ACTUAL SHUTDOWN START", "Value": internalEvaluationData.actualShutdownStart || '' },
                { "Performance Hub": "ACTUAL SHUTDOWN END", "Value": internalEvaluationData.actualShutdownEnd || '' },
                { "Performance Hub": "INCIDENTS COUNT", "Value": internalEvaluationData.incidentDetails?.length || 0 },
                { "Performance Hub": "ACCIDENTS COUNT", "Value": internalEvaluationData.accidentDetails?.length || 0 },
            ] : [{ "Performance Hub": "(aucune donnée)", "Value": "" }];
            const worksheetPerf = XLSX.utils.json_to_sheet(perfData);
            XLSX.utils.book_append_sheet(workbook, worksheetPerf, "Evaluation de l'Arret");

            // Optional sub-sheets only when they have data (they are supplemental, not core)
            if (internalEvaluationData?.globalSlippageEvents && internalEvaluationData.globalSlippageEvents.length > 0) {
                const worksheetSlippage = XLSX.utils.json_to_sheet(internalEvaluationData.globalSlippageEvents.map(e => ({
                    "EVENT DATE": e.eventDate, "LOST HOURS": e.lostHours,
                    "CAUSE": e.cause, "ACTION": e.preventiveAction, "PILOT": e.pilot
                })));
                XLSX.utils.book_append_sheet(workbook, worksheetSlippage, "Evenements de Glissement");
            }
            if (internalEvaluationData?.chronology && internalEvaluationData.chronology.length > 0) {
                const worksheetChrono = XLSX.utils.json_to_sheet(internalEvaluationData.chronology.map(e => ({
                    "EVENT LABEL": e.label, "PLANNED START": e.plannedStart, "PLANNED END": e.plannedEnd,
                    "ACTUAL START": e.actualStart, "ACTUAL END": e.actualEnd
                })));
                XLSX.utils.book_append_sheet(workbook, worksheetChrono, "Chronologie Reelle");
            }

            // ── Sheet 5: Scaffolding ──────────────────────────────────────────────────────
            let scaffRows: any[] = [];
            if (scaffoldingRecords && scaffoldingRecords.length > 0) {
                scaffRows = scaffoldingRecords.map(r => ({ "OT": r.OT, "Company": r.company, "Scaffolding Readiness": r.readiness, "Poste Number": r.posteNumber, "Poste Description": r.posteDescription, "QT": r.QT, "Comment": r.comment }));
            } else {
                tasks.filter(t => (t as any)['Scaffolding Required'] === 1 || (t as any)['Scaffolding Required'] === '1' || String((t as any)['Scaffolding Required']).toUpperCase() === 'TRUE').forEach(t => {
                    scaffRows.push({ "OT": t.OT, "Company": t.COMPANY || "", "Scaffolding Readiness": t['Scaffolding Readiness'] || "", "Poste Number": t['POSTE NUMBER'] || t['Poste Number'] || "", "Poste Description": t['POSTE DESCRIPTION'] || t['Poste Description'] || "", "QT": t.QT || t['Quantité'] || "", "Comment": "" });
                });
            }
            if (scaffRows.length === 0) scaffRows = [{ "OT": "(aucune donnée)", "Company": "", "Scaffolding Readiness": "", "Poste Number": "", "Poste Description": "", "QT": "", "Comment": "" }];
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(scaffRows), "Scaffolding");

            // ── Sheet 6: Handling ─────────────────────────────────────────────────────────
            let handlingRows: any[] = [];
            if (handlingRecords && handlingRecords.length > 0) {
                handlingRows = handlingRecords.map(r => ({ "OT": r.OT, "Company": r.company, "Handling Type": r.handlingType, "Handling Readiness": r.readiness, "Poste Number": r.posteNumber, "Poste Description": r.posteDescription, "Hours": r.hours, "Additional Cost": r.additionalCost, "Comment": r.comment }));
            } else {
                tasks.filter(t => (t as any)['Handling required'] === 1 || (t as any)['Handling required'] === '1' || String((t as any)['Handling required']).toUpperCase() === 'TRUE').forEach(t => {
                    handlingRows.push({ "OT": t.OT, "Company": t.COMPANY || "", "Handling Type": "", "Handling Readiness": t['Handling Readiness'] || "", "Poste Number": t['POSTE NUMBER'] || t['Poste Number'] || "", "Poste Description": t['POSTE DESCRIPTION'] || t['Poste Description'] || "", "Hours": "", "Additional Cost": t['Additional Cost'] || "", "Comment": "" });
                });
            }
            if (handlingRows.length === 0) handlingRows = [{ "OT": "(aucune donnée)", "Company": "", "Handling Type": "", "Handling Readiness": "", "Poste Number": "", "Poste Description": "", "Hours": "", "Additional Cost": "", "Comment": "" }];
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(handlingRows), "Handling");

            // ── Sheet 7: Permit Hub ───────────────────────────────────────────────────────
            let permitRows: any[] = [];
            if (permitRecords && permitRecords.length > 0) {
                permitRows = permitRecords.map(r => ({ "OT": r.OT, "Permit Name": r.permitName, "Readiness": r.readiness }));
            } else {
                tasks.forEach(t => {
                    if (t.permisTravailHauteur === 1 || (t as any)['permis Travail Hauteur'] === 1) permitRows.push({ "OT": t.OT, "Permit Name": "Travail en Hauteur", "Readiness": t['permis Travail Hauteur Readiness'] || "" });
                    if (t.permisFeu === 1 || (t as any)['permis Feu'] === 1) permitRows.push({ "OT": t.OT, "Permit Name": "Permis Feu", "Readiness": t['permis Feu Readiness'] || "" });
                    if (t.permisPenetration === 1 || (t as any)['permis Penetration'] === 1) permitRows.push({ "OT": t.OT, "Permit Name": "Pénétration / Espace Confiné", "Readiness": t['permis Penetration Readiness'] || "" });
                    if (t.permisLevage === 1 || (t as any)['permis Levage'] === 1) permitRows.push({ "OT": t.OT, "Permit Name": "Levage", "Readiness": t['permis Levage Readiness'] || "" });
                    if (t.permisExcavation === 1 || (t as any)['permis Excavation'] === 1) permitRows.push({ "OT": t.OT, "Permit Name": "Excavation", "Readiness": t['permis Excavation Readiness'] || "" });
                });
            }
            if (permitRows.length === 0) permitRows = [{ "OT": "(aucune donnée)", "Permit Name": "", "Readiness": "" }];
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(permitRows), "Permit Hub");

            // ── Sheet 8: SIMOPS ───────────────────────────────────────────────────────────
            let simopsRows: any[] = [];
            if (simopsRecords && simopsRecords.length > 0) {
                simopsRows = simopsRecords.map(r => ({ "OT": r.OT, "SIMOPS OT": r.simopsOT }));
            } else {
                tasks.filter(t => (t as any)['simops ot'] || (t as any)['SIMOPS OT']).forEach(t => {
                    const simopsStr = String((t as any)['simops ot'] || (t as any)['SIMOPS OT']);
                    simopsStr.split(/[,;]/).map(s => s.trim()).filter(Boolean).forEach(sOT => {
                        simopsRows.push({ "OT": t.OT, "SIMOPS OT": sOT });
                    });
                });
            }
            if (simopsRows.length === 0) simopsRows = [{ "OT": "(aucune donnée)", "SIMOPS OT": "" }];
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(simopsRows), "SIMOPS");

            // ── Sheet 9: THR ──────────────────────────────────────────────────────────────
            const thrTasksList = tasks.filter(t => {
                const v = (t as any)['THR'];
                return v === 1 || v === true || v === '1' || String(v).toUpperCase() === 'TRUE' || String(v).toUpperCase() === 'OUI' || t.isHighRisk;
            });
            const thrRows = thrTasksList.length > 0
                ? thrTasksList.map(t => ({ "OT": t.OT }))
                : [{ "OT": "(aucune donnée)" }];
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(thrRows), "THR");

            // ── Sheet 10: Cost Hub ────────────────────────────────────────────────────────
            let costHubRows: any[] = [];
            if (costHubEntries && costHubEntries.length > 0) {
                costHubRows = costHubEntries.map(e => ({ "Company": e.company, "Cost Type": e.costType, "Poste Number": e.posteNumber, "Poste Description": e.posteDescription, "Price U": e.priceU }));
            } else {
                tasks.filter(t => t['PRICE FOR HH']).forEach(t => {
                    costHubRows.push({ "Company": t.COMPANY || "", "Cost Type": "HH", "Poste Number": t['POSTE NUMBER'] || t['Poste Number'] || "", "Poste Description": t['POSTE DESCRIPTION'] || t['Poste Description'] || "", "Price U": t['PRICE FOR HH'] });
                });
            }
            if (costHubRows.length === 0) costHubRows = [{ "Company": "(aucune donnée)", "Cost Type": "", "Poste Number": "", "Poste Description": "", "Price U": "" }];
            XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(costHubRows), "Cost Hub");

            // ── Sheet 11: Task Maps ───────────────────────────────────────────────────────
            if (mapTasks && mapTasks.length > 0) {
                const worksheetMap = XLSX.utils.json_to_sheet(mapTasks.map(task => {
                    const t: any = { ...task };
                    t["START DATE"] = t["START DATE"] instanceof Date ? t["START DATE"].toISOString() : (t["START DATE"] || null);
                    t["END DATE"] = t["END DATE"] instanceof Date ? t["END DATE"].toISOString() : (t["END DATE"] || null);
                    const mapKeysToRemove = [
                        'pdrItems', 'scaffoldingRecords', 'handlingRecords', 'permitRecords', 'simopsRecords',
                        'meta', 'history', 'isLastForTeam', 'isCritical', 'multiDisciplineId',
                        'COST_TYPE', 'TASK_COST', 'MO_HH_COST', 'PRESTATION_COST', 'SCAFFOLDING_COST',
                        'HANDLING_COST', 'PDR COST', 'TOTAL_COST', 'TOTAL TASK COST',
                        'Scaffolding Required', 'Scaffolding Readiness', 'Handling required', 'Handling Readiness',
                        'permisTravailHauteur', 'permis Travail Hauteur Readiness',
                        'permisFeu', 'permis Feu Readiness',
                        'permisPenetration', 'permis Penetration Readiness',
                        'permisLevage', 'permis Levage Readiness',
                        'permisExcavation', 'permis Excavation Readiness',
                        'ADRPT Required', 'ADRPT Readiness',
                        'PRICE FOR HH', 'MANUAL PRICE', 'Scaffolding manual Price', 'Handling manual Price',
                        'POSTE DESCRIPTION', 'Préparatifs', 'Préparatifs Readiness', 'COMMENTAIRE HSE',
                        'MO Required', 'MO Readiness', 'predecessor', 'sequenceOrder',
                        'DAY', "TYPE D'EQUIPE", 'EQUIPE NUMBER', 'MAX HOUR',
                        'isScheduled', 'isKeyEvent', 'predecessorsByName', 'successorsByName'
                    ];
                    mapKeysToRemove.forEach(key => delete t[key]);
                    return t;
                }));
                XLSX.utils.book_append_sheet(workbook, worksheetMap, "Task Maps");
            } else {
                XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet([{ "OT": "(aucune donnée)" }]), "Task Maps");
            }

            XLSX.writeFile(workbook, `PlanneX_Export_Complet_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (e) {
            console.error("Erreur lors de l'exportation:", e);
            showAlert("Erreur d'exportation", "Une erreur est survenue lors de l'exportation du fichier Excel.");
        }
    }, [tasks, allPdrItems, internalEvaluationData, simopsRecords, scaffoldingRecords, handlingRecords, permitRecords, costHubEntries, mapTasks]);


    const { disciplines, equipments, families, maintenanceTypes } = useMemo(() => {
        const d = new Set<string>();
        const e = new Set<string>();
        const f = new Set<string>();
        const m = new Set<string>();
        tasks.forEach(task => {
            if (task.DISCIPLINE) d.add(task.DISCIPLINE);
            if (task['Nom Equipement']) e.add(task['Nom Equipement']);
            if (task.FAMILLE) f.add(task.FAMILLE);
            if (task['Type de Maintenance']) m.add(task['Type de Maintenance']);
        });
        return {
            disciplines: [...d].sort(),
            equipments: [...e].sort(),
            families: [...f].sort(),
            maintenanceTypes: [...m].sort(),
        };
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        const lowercasedSearchTerm = debouncedSearchTerm.toLowerCase().trim();
        const hasSearchTerm = lowercasedSearchTerm !== '';

        return tasks.filter(task => {
            const disciplineMatch = filters.discipline.length === 0 || filters.discipline.includes(task.DISCIPLINE);
            const equipmentMatch = filters.equipment.length === 0 || filters.equipment.includes(task['Nom Equipement']);
            const familyMatch = filters.family.length === 0 || filters.family.includes(task.FAMILLE);
            const typeMatch = filters.maintenanceType.length === 0 || filters.maintenanceType.includes(task['Type de Maintenance']);

            const scheduledStatusMatch =
                (!filters.showScheduledOnly && !filters.showUnscheduledOnly) ||
                (filters.showScheduledOnly && task.isScheduled) ||
                (filters.showUnscheduledOnly && !task.isScheduled);

            const multiDisciplineMatch = !filters.multiDisciplineOnly || !!task.multiDisciplineId;

            let searchMatch = !hasSearchTerm;
            if (hasSearchTerm) {
                searchMatch =
                    (task['GLOBAL TASKS'] && task['GLOBAL TASKS'].toLowerCase().includes(lowercasedSearchTerm)) ||
                    (task['Nom Equipement'] && task['Nom Equipement'].toLowerCase().includes(lowercasedSearchTerm)) ||
                    (task.FAMILLE && task.FAMILLE.toLowerCase().includes(lowercasedSearchTerm));
            }

            return disciplineMatch && equipmentMatch && familyMatch && typeMatch && scheduledStatusMatch && multiDisciplineMatch && searchMatch;
        });
    }, [tasks, filters, debouncedSearchTerm]);

    const requestSort = useCallback((key: SortableKeys) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'ascending' ? 'descending' : 'ascending'
        }));
    }, []);

    const sortedAndFilteredTasks = useMemo(() => {
        let sortableItems = [...filteredTasks];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key!];
                const bValue = b[sortConfig.key!];

                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
                    return sortConfig.direction === 'ascending' ? (aValue === bValue ? 0 : aValue ? -1 : 1) : (aValue === bValue ? 0 : aValue ? 1 : -1);
                }
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
                }
                if (aValue instanceof Date && bValue instanceof Date) {
                    return sortConfig.direction === 'ascending' ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
                }

                const stringA = String(aValue).toLowerCase();
                const stringB = String(bValue).toLowerCase();
                if (stringA < stringB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (stringA > stringB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredTasks, sortConfig]);

    const multiDisciplineColorMap = useMemo(() => {
        const map: Record<string, typeof MULTI_DISCIPLINE_PALETTE[0]> = {};
        const uniqueIds = [...new Set(tasks.map(t => t.multiDisciplineId).filter(Boolean) as string[])];
        uniqueIds.forEach((id, index) => {
            map[id] = MULTI_DISCIPLINE_PALETTE[index % MULTI_DISCIPLINE_PALETTE.length];
        });
        return map;
    }, [tasks]);

    const handleCancelLoading = useCallback(() => {
        if (cancelWorkerRef.current) {
            cancelWorkerRef.current(); // Terminate worker
        }

        // Clear Intervals
        if (fakeProgressIntervalRef.current) clearInterval(fakeProgressIntervalRef.current);
        if (logCycleIntervalRef.current) clearInterval(logCycleIntervalRef.current);

        setIsLoading(false);
        setProgressPercent(0);
        setProgressStep('');
        setProgressLog([]);
        setIsProcessingComplete(false);
        setProcessingStats(null);
    }, []);

    const handleFinishProcessing = useCallback(() => {
        setStep('dashboard');
        setIsLoading(false);
        setIsProcessingComplete(false);
        setProcessingStats(null);
    }, []);


    const handleUpdatePDR = (updatedPDR: PDRItem[]) => {
        setPdrItems(updatedPDR);
        // Sync back to tasks so they have updated readiness
        updateTasks(currentTasks => {
            return currentTasks.map(task => {
                const taskOtStr = String(task.OT).trim();
                if (taskOtStr && taskOtStr !== '0' && taskOtStr !== 'null') {
                    return {
                        ...task,
                        pdrItems: updatedPDR.filter(pdr => String(pdr.OT).trim() === taskOtStr)
                    };
                }
                return task;
            });
        });
    };

    const handleAddTask = useCallback((newTasksData: Omit<SchedulingTaskData, 'id' | 'isScheduled' | 'START DATE' | 'END DATE' | 'TYPE D\'EQUIPE' | 'EQUIPE NUMBER' | 'MAX HOUR' | 'isKeyEvent' | 'predecessor'>[], insertAfterId: number | null) => {
        updateTasks(currentTasks => {
            let lastId = currentTasks.length > 0 ? Math.max(...currentTasks.map(t => t.id)) : -1;
            const newTasks: SchedulingTaskData[] = newTasksData.map((taskData) => {
                lastId++;
                const newTask: SchedulingTaskData = {
                    ...(taskData as any), // Cast to any to avoid type issues with Omit
                    id: lastId,
                    isScheduled: false,
                    'START DATE': null,
                    'END DATE': null,
                    'TYPE D\'EQUIPE': null,
                    'EQUIPE NUMBER': null,
                    'MAX HOUR': null,
                    isKeyEvent: false,
                    predecessor: [],
                    DAY: null,
                    sequenceOrder: null,
                };
                return newTask;
            });

            if (insertAfterId !== null) {
                const insertIndex = currentTasks.findIndex(t => t.id === insertAfterId);
                if (insertIndex !== -1) {
                    const updatedTasks = [...currentTasks];
                    updatedTasks.splice(insertIndex + 1, 0, ...newTasks);
                    return updatedTasks;
                }
            }
            return [...currentTasks, ...newTasks];
        });
        setNotification({ message: `${newTasksData.length} tâche(s) ajoutée(s) avec succès.`, type: 'success' });
        setTimeout(() => setNotification(null), 3000);
        setIsAddTaskModalOpen(false);
    }, [updateTasks]);

    const handleConfirmSetup = useCallback(async (file: File | null, params: ShutdownParams) => {
        setIsLoading(true);
        setProgressPercent(0);
        setProgressStep('INITIALISATION');
        setProgressLog(['Démarrage du processus d\'import...']);

        // Start Fake Progress Interpolation
        if (fakeProgressIntervalRef.current) clearInterval(fakeProgressIntervalRef.current);
        // Start at 0, aim for 85% over ~5-8 seconds roughly
        let currentFakePercent = 0;
        fakeProgressIntervalRef.current = window.setInterval(() => {
            currentFakePercent += (90 - currentFakePercent) * 0.05; // Decaying increment
            if (currentFakePercent > 90) currentFakePercent = 90; // Cap at 90%
            // Only update if worker hasn't reported a higher real percentage
            setProgressPercent(prev => Math.max(prev, currentFakePercent));
        }, 300);

        // Start Log Cycling
        if (logCycleIntervalRef.current) clearInterval(logCycleIntervalRef.current);
        logCycleIntervalRef.current = window.setInterval(() => {
            const randomMsg = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
            setProgressLog(prev => {
                const newLog = [...prev, randomMsg];
                return newLog.slice(-10);
            });
        }, 800);

        try {
            setError(null);
            if (file) {
                // Call the service which now returns {promise, cancel}
                const { promise, cancel } = parseSchedulingFile(file);
                cancelWorkerRef.current = cancel;

                const { tasks: parsedTasks, mapTasks: parsedMapTasks, pdrItems: parsedPdrItems, evaluationData: parsedEval, detectedStartDate, costData: parsedCostData,
                    costHubEntries: parsedCostHubEntries, scaffoldingRecords: parsedScaffoldingRecords,
                    handlingRecords: parsedHandlingRecords, permitRecords: parsedPermitRecords, simopsRecords: parsedSimopsRecords
                } = await promise;

                if (parsedMapTasks && parsedMapTasks.length > 0) {
                    setMapTasks(parsedMapTasks);
                }

                if (parsedCostData) {
                    setCostData(parsedCostData);
                }

                // Store new domain arrays
                if (parsedCostHubEntries) setCostHubEntries(parsedCostHubEntries);
                if (parsedScaffoldingRecords) setScaffoldingRecords(parsedScaffoldingRecords);
                if (parsedHandlingRecords) setHandlingRecords(parsedHandlingRecords);
                if (parsedPermitRecords) setPermitRecords(parsedPermitRecords);
                if (parsedSimopsRecords) setSimopsRecords(parsedSimopsRecords);

                if (parsedPdrItems) {
                    setPdrItems(parsedPdrItems);
                }

                if (parsedEval) {
                    setInternalEvaluationData(parsedEval);
                }

                // Clear intervals upon success
                if (fakeProgressIntervalRef.current) clearInterval(fakeProgressIntervalRef.current);
                if (logCycleIntervalRef.current) clearInterval(logCycleIntervalRef.current);

                let tasksToSet: SchedulingTaskData[] = parsedTasks.map(t => ({
                    ...t,
                    "PDR COST": t.pdrItems?.reduce((sum: number, p: any) => sum + (p.totalPrice || 0), 0) || 0
                }));
                if (detectedStartDate) {
                    const newShutdownStartDate = new Date(params.shutdownStart);
                    if (!isNaN(newShutdownStartDate.getTime())) {
                        const delta = newShutdownStartDate.getTime() - detectedStartDate.getTime();
                        if (Math.abs(delta) > 1000) {
                            tasksToSet = parsedTasks.map(task => {
                                if (task.isScheduled && task['START DATE'] && task['END DATE']) {
                                    return { ...task, 'START DATE': new Date(task['START DATE'].getTime() + delta), 'END DATE': new Date(task['END DATE'].getTime() + delta), } as SchedulingTaskData;
                                }
                                return task;
                            });
                        }
                    }
                }
                setTasks(tasksToSet); setFilters({ discipline: [], equipment: [], family: [], maintenanceType: [], showUnscheduledOnly: false, assignedTeam: [], showScheduledOnly: false }); setSelectedTaskIds([]); setHistory([]); setCurrentFile(file);

                // Reset daily duration limit for new project
                setDailyDurationLimit(0);

                // Set stats for success screen
                const uniqueDisciplines = new Set(tasksToSet.map(t => t.DISCIPLINE)).size;
                setProcessingStats({
                    taskCount: tasksToSet.length,
                    startDate: params.shutdownStart,
                    endDate: params.shutdownEnd,
                    disciplineCount: uniqueDisciplines,
                    pdrCount: parsedPdrItems?.length || 0
                });

            } else if (tasks.length > 0 && shutdownParams && params.shutdownStart !== shutdownParams.shutdownStart) {
                const oldStartDate = new Date(shutdownParams.shutdownStart); const newStartDate = new Date(params.shutdownStart);
                if (isNaN(oldStartDate.getTime()) || isNaN(newStartDate.getTime())) throw new Error("Date invalide.");
                const delta = newStartDate.getTime() - oldStartDate.getTime();
                const updatedTasks = tasks.map(task => { if (task.isScheduled && task['START DATE'] && task['END DATE']) { return { ...task, 'START DATE': new Date(new Date(task['START DATE']).getTime() + delta), 'END DATE': new Date(new Date(task['END DATE']).getTime() + delta), }; } return task; });
                updateTasks(() => updatedTasks);

                // Clear intervals if skipping file load
                if (fakeProgressIntervalRef.current) clearInterval(fakeProgressIntervalRef.current);
                if (logCycleIntervalRef.current) clearInterval(logCycleIntervalRef.current);

                const uniqueDisciplines = new Set(updatedTasks.map(t => t.DISCIPLINE)).size;
                setProcessingStats({
                    taskCount: updatedTasks.length,
                    startDate: params.shutdownStart,
                    endDate: params.shutdownEnd,
                    disciplineCount: uniqueDisciplines
                });
            } else if (isScratchMode && tasks.length === 0) {
                setTasks([]); setFilters({ discipline: [], equipment: [], family: [], maintenanceType: [], showUnscheduledOnly: false, assignedTeam: [], showScheduledOnly: false }); setSelectedTaskIds([]); setHistory([]); setCurrentFile(null);
                // Clear intervals
                if (fakeProgressIntervalRef.current) clearInterval(fakeProgressIntervalRef.current);
                if (logCycleIntervalRef.current) clearInterval(logCycleIntervalRef.current);
                // Reset daily duration limit for new project
                setDailyDurationLimit(0);
                setProcessingStats({
                    taskCount: 0,
                    startDate: params.shutdownStart,
                    endDate: params.shutdownEnd,
                    disciplineCount: 0
                });
            } else {
                // Critical: if we fall through all logic (e.g. user just hit confirm without changes)
                // we must still stop loading
                setIsLoading(false);
            }

            // Ensure intervals are cleared if we skipped specific logic blocks
            if (fakeProgressIntervalRef.current) clearInterval(fakeProgressIntervalRef.current);
            if (logCycleIntervalRef.current) clearInterval(logCycleIntervalRef.current);

            setShutdownParams(params);
            try { localStorage.setItem('planex_last_params', JSON.stringify(params)); } catch (e) { console.error("Failed to save params to localStorage", e); }

            // Ensure stats are populated even if no major changes occurred (e.g. only duration edit)
            setProcessingStats(prev => {
                if (prev) return { ...prev, startDate: params.shutdownStart, endDate: params.shutdownEnd };
                return {
                    taskCount: tasks.length,
                    startDate: params.shutdownStart,
                    endDate: params.shutdownEnd,
                    disciplineCount: new Set(tasks.map(t => t.DISCIPLINE)).size
                };
            });

            if (isScratchMode) {
                setStep('dashboard');
                setIsLoading(false);
                setIsProcessingComplete(false);
                setProcessingStats(null);
                return;
            }

            // Finish animation and show success state
            setProgressPercent(100);
            setProgressStep('TERMINÉ');
            setIsProcessingComplete(true);

        } catch (e) {
            console.error("Critical error in handleConfirmSetup:", e);
            setError(e instanceof Error ? e.message : "Une erreur inconnue est survenue lors de l'analyse.");
            setIsLoading(false);
            setIsProcessingComplete(false);
            if (fakeProgressIntervalRef.current) clearInterval(fakeProgressIntervalRef.current);
            if (logCycleIntervalRef.current) clearInterval(logCycleIntervalRef.current);
        }
    }, [currentFile, shutdownParams, isScratchMode, tasks.length, updateTasks, tasks, setFilters]);

    const handleApplySchedule = useCallback((constraints: {
        teamAssignments: Record<string, string>;
        maxHours: number;
        startDate: string;
        predecessorIds: number[];
        relation: 'FS' | 'SS';
        isCritical: boolean;
        teamTags: Record<string, string[]>;
    }) => {
        const executeScheduling = (resolutions: Record<string, number>) => {
            const harmonizedTasks = tasks.map(task => {
                if (selectedTaskIds.includes(task.id) && resolutions[task.DISCIPLINE]) {
                    const newEffectif = resolutions[task.DISCIPLINE];
                    if (task.EFFECTIF !== newEffectif) {
                        return { ...task, EFFECTIF: newEffectif, 'Heures-Homme': task.DUREE * newEffectif };
                    }
                }
                return task;
            });

            const getHypotheticalTasks = () => {
                const newTasks = JSON.parse(JSON.stringify(harmonizedTasks));
                let operationStartTime;
                if (constraints.predecessorIds.length > 0) {
                    let maxPredecessorEndTime = new Date(0);
                    constraints.predecessorIds.forEach(id => {
                        const predTask = newTasks.find((t: SchedulingTaskData) => t.id === id);
                        if (predTask && predTask['END DATE'] && new Date(predTask['END DATE']).getTime() > maxPredecessorEndTime.getTime()) {
                            maxPredecessorEndTime = new Date(predTask['END DATE']);
                        }
                    });
                    operationStartTime = maxPredecessorEndTime;
                } else {
                    operationStartTime = new Date(constraints.startDate);
                }

                const tasksToSchedule = newTasks.filter((t: SchedulingTaskData) => selectedTaskIds.includes(t.id)).sort((a: SchedulingTaskData, b: SchedulingTaskData) => (a.predecessor?.includes(b.id) ? 1 : b.predecessor?.includes(a.id) ? -1 : 0));

                const teamAssignments = constraints.teamAssignments;
                const newTeamCounters: Record<string, number> = {};
                const teamAssignmentsByName: Record<string, { name: string; number: number }> = {};
                const newTagsMapping: Record<string, string[]> = {};

                Object.keys(teamAssignments).forEach(discipline => {
                    let teamName = '';
                    if (teamAssignments[discipline] === 'Nouvelle Équipe') {
                        if (!newTeamCounters[discipline]) {
                            const existingTeamNumbers = new Set(newTasks.filter((t: SchedulingTaskData) => t.isScheduled && t.DISCIPLINE === discipline && t['EQUIPE NUMBER'] != null).map((t: SchedulingTaskData) => t['EQUIPE NUMBER']!));
                            let newTeamNum = 1;
                            while (existingTeamNumbers.has(newTeamNum)) newTeamNum++;
                            newTeamCounters[discipline] = newTeamNum;
                        }
                        teamName = `Équipe ${newTeamCounters[discipline]}`;
                        teamAssignmentsByName[discipline] = { name: teamName, number: newTeamCounters[discipline] };
                    } else {
                        teamName = teamAssignments[discipline];
                        const number = parseInt(teamName.replace(/[^0-9]/g, ''), 10);
                        teamAssignmentsByName[discipline] = { name: teamName, number };
                    }
                    if (constraints.teamTags && constraints.teamTags[discipline]) {
                        const fullTeamName = `${discipline} ${teamName}`;
                        newTagsMapping[fullTeamName] = constraints.teamTags[discipline];
                    }
                });

                if (Object.keys(newTagsMapping).length > 0) {
                    setTagsByTeam(prev => ({ ...prev, ...newTagsMapping }));
                    const allNewTags = Object.values(newTagsMapping).flat();
                    setGlobalAvailableTags(prev => [...new Set([...prev, ...allNewTags])]);
                }

                let sequentialCursor = new Date(operationStartTime);
                tasksToSchedule.forEach((task: SchedulingTaskData) => {
                    const discipline = task.DISCIPLINE;
                    if (teamAssignmentsByName[discipline]) {
                        const taskPreds = task.predecessor || [];
                        let maxInternalPredEndTime = new Date(0);
                        taskPreds.forEach(predId => {
                            if (selectedTaskIds.includes(predId)) {
                                const predTask = newTasks.find((t: SchedulingTaskData) => t.id === predId);
                                if (predTask && predTask['END DATE'] && new Date(predTask['END DATE']).getTime() > maxInternalPredEndTime.getTime()) {
                                    maxInternalPredEndTime = new Date(predTask['END DATE']);
                                }
                            }
                        });

                        let taskStartTime = (constraints.relation === 'SS')
                            ? Math.max(operationStartTime.getTime(), maxInternalPredEndTime.getTime())
                            : Math.max(sequentialCursor.getTime(), maxInternalPredEndTime.getTime());

                        const currentTaskStartTime = new Date(taskStartTime);
                        const currentTaskEndTime = new Date(currentTaskStartTime.getTime() + task.DUREE * 3600000);
                        const taskIndex = newTasks.findIndex((t: SchedulingTaskData) => t.id === task.id);

                        if (taskIndex !== -1) {
                            const { name, number } = teamAssignmentsByName[discipline];

                            newTasks[taskIndex] = {
                                ...newTasks[taskIndex],
                                isScheduled: true,
                                'MAX HOUR': constraints.maxHours,
                                predecessor: [...new Set([...(newTasks[taskIndex].predecessor || []), ...constraints.predecessorIds])],
                                'TYPE D\'EQUIPE': name,
                                'EQUIPE NUMBER': number,
                                'START DATE': currentTaskStartTime,
                                'END DATE': currentTaskEndTime,
                                isKeyEvent: constraints.isCritical,
                            };
                        }
                        if (constraints.relation === 'FS') {
                            sequentialCursor = currentTaskEndTime;
                        }
                    }
                });

                return {
                    hypotheticalTasks: newTasks.map((t: any) => ({
                        ...t,
                        'START DATE': t['START DATE'] ? new Date(t['START DATE']) : null,
                        'END DATE': t['END DATE'] ? new Date(t['END DATE']) : null,
                    }))
                };
            };

            const applyChanges = () => {
                const { hypotheticalTasks } = getHypotheticalTasks();
                updateTasks(() => hypotheticalTasks);
                setSelectedTaskIds([]);
                setIsSchedulingModalOpen(false);
            };

            const checkResourcesAndApply = (hypotheticalTasks: SchedulingTaskData[]) => {
                const teams: Record<string, SchedulingTaskData[]> = {};
                hypotheticalTasks.filter(t => t.isScheduled && t["TYPE D'EQUIPE"] && t['START DATE'] && t['END DATE']).forEach(task => {
                    const fullTeamName = `${task.DISCIPLINE} ${task["TYPE D'EQUIPE"]}`;
                    if (!teams[fullTeamName]) teams[fullTeamName] = [];
                    teams[fullTeamName].push(task);
                });

                const overloadedTeamNames: string[] = [];
                Object.keys(teams).forEach(teamName => {
                    const teamTasks = teams[teamName];
                    if (!teamTasks) return;
                    const workloadByDay: Record<string, number> = {};
                    teamTasks.forEach(task => {
                        const start = new Date(task['START DATE']!);
                        const end = new Date(task['END DATE']!);
                        let current = new Date(start);
                        while (current < end) {
                            const dayKey = current.toISOString().split('T')[0];
                            const endOfDay = new Date(current);
                            endOfDay.setHours(23, 59, 59, 999);
                            const endForThisDay = Math.min(end.getTime(), endOfDay.getTime() + 1);
                            const startForThisDay = Math.max(start.getTime(), current.getTime());
                            if (endForThisDay > startForThisDay) {
                                const hoursThisDay = (endForThisDay - startForThisDay) / (1000 * 3600);
                                workloadByDay[dayKey] = (workloadByDay[dayKey] || 0) + hoursThisDay;
                            }
                            current.setDate(current.getDate() + 1);
                            current.setHours(0, 0, 0, 0);
                        }
                    });
                    if (dailyDurationLimit > 0 && Object.values(workloadByDay).some(hours => hours > dailyDurationLimit)) {
                        overloadedTeamNames.push(teamName);
                    }
                });

                if (overloadedTeamNames.length > 0) {
                    setOverloadWarning({ isOpen: true, teamNames: overloadedTeamNames, onConfirm: () => { applyChanges(); setOverloadWarning(null); } });
                    setIsSchedulingModalOpen(false);
                } else {
                    applyChanges();
                }
            };

            const { hypotheticalTasks } = getHypotheticalTasks();
            const shutdownEndDate = new Date(shutdownParams!.shutdownEnd);
            const overrunningTasks = hypotheticalTasks.filter(t => selectedTaskIds.includes(t.id) && t['END DATE']! > shutdownEndDate);

            if (overrunningTasks.length > 0) {
                setScheduleOverrunWarning({ isOpen: true, tasks: overrunningTasks, onConfirm: () => { setScheduleOverrunWarning(null); checkResourcesAndApply(hypotheticalTasks); } });
                setIsSchedulingModalOpen(false);
            } else {
                checkResourcesAndApply(hypotheticalTasks);
            }
        };

        const selected = tasks.filter(t => selectedTaskIds.includes(t.id));
        const conflictsByDiscipline: Record<string, number[]> = {};
        const tasksByDiscipline: Record<string, SchedulingTaskData[]> = {};
        selected.forEach(task => {
            if (task.DISCIPLINE) {
                if (!tasksByDiscipline[task.DISCIPLINE]) {
                    tasksByDiscipline[task.DISCIPLINE] = [];
                }
                tasksByDiscipline[task.DISCIPLINE].push(task);
            }
        });

        for (const discipline in tasksByDiscipline) {
            const effectifs = new Set(tasksByDiscipline[discipline].map(t => t.EFFECTIF));
            if (effectifs.size > 1) {
                conflictsByDiscipline[discipline] = Array.from(effectifs);
            }
        }

        if (Object.keys(conflictsByDiscipline).length > 0) {
            setManpowerConflict({ isOpen: true, conflicts: conflictsByDiscipline, onConfirm: (resolutions) => { setManpowerConflict(null); executeScheduling(resolutions); } });
            return;
        }

        executeScheduling({});
    }, [tasks, selectedTaskIds, dailyDurationLimit, shutdownParams, updateTasks, tagsByTeam]);

    const getTaskSuccessorsRecursive = useCallback((taskId: any): SchedulingTaskData[] => {
        // Use the SAME logic as SuccessorsModal: follow the chain sequentially
        // Priority 1: Logical successor (predecessor field)
        // Priority 2: Resource successor (same team, consecutive timing)
        const scheduledTasks = tasks.filter(t => t.isScheduled && t['START DATE'] && t['END DATE']);

        const resultChain: SchedulingTaskData[] = [];
        const processedIds = new Set<number>();
        const startTask = tasks.find(t => t.id === taskId || String(t.id) === String(taskId));
        if (!startTask) return [];

        processedIds.add(startTask.id);
        let currentTask: SchedulingTaskData | undefined = startTask;
        let safetyCounter = 0;

        while (currentTask && safetyCounter < tasks.length) {
            safetyCounter++;
            let nextTask: SchedulingTaskData | undefined;

            // Priority 1: Logical successor (find the earliest scheduled one)
            const logicalSuccessors = scheduledTasks
                .filter(t => t.predecessor?.some((p: any) => String(p) === String(currentTask!.id)) && !processedIds.has(t.id))
                .sort((a, b) => new Date(a['START DATE']!).getTime() - new Date(b['START DATE']!).getTime());

            if (logicalSuccessors.length > 0) {
                nextTask = logicalSuccessors[0];
            }

            // Priority 2: Resource successor (same team, consecutive timing)
            if (!nextTask && currentTask['END DATE'] && currentTask['TYPE D\'EQUIPE']) {
                const currentTeam = `${currentTask.DISCIPLINE} ${currentTask['TYPE D\'EQUIPE']}`;
                const currentEndTime = new Date(currentTask['END DATE']!).getTime();
                const tolerance = 1000 * 60; // 1 minute tolerance

                const potentialResourceSuccessors = scheduledTasks
                    .filter(t =>
                        t.id !== currentTask!.id &&
                        `${t.DISCIPLINE} ${t['TYPE D\'EQUIPE']}` === currentTeam &&
                        Math.abs(new Date(t['START DATE']!).getTime() - currentEndTime) < tolerance &&
                        !processedIds.has(t.id)
                    )
                    .sort((a, b) => new Date(a['START DATE']!).getTime() - new Date(b['START DATE']!).getTime());

                if (potentialResourceSuccessors.length > 0) {
                    nextTask = potentialResourceSuccessors[0];
                }
            }

            if (nextTask) {
                resultChain.push(nextTask);
                processedIds.add(nextTask.id);
                currentTask = nextTask;
            } else {
                currentTask = undefined; // End of chain
            }
        }

        return resultChain;
    }, [tasks]);

    const handleDelier = useCallback((taskIdToUnlink: number) => {
        const targetIdStr = String(taskIdToUnlink);
        const targetTask = tasks.find(t => String(t.id) === targetIdStr);
        if (!targetTask) return;

        const combinedTasks = targetTask.multiDisciplineId
            ? tasks.filter(t => t.multiDisciplineId === targetTask.multiDisciplineId)
            : [targetTask];

        const allTargetIds = combinedTasks.map(t => String(t.id));
        const allSuccessorsSet = new Set<SchedulingTaskData>();
        combinedTasks.forEach(ct => {
            getTaskSuccessorsRecursive(ct.id).forEach(s => allSuccessorsSet.add(s));
        });

        const allSuccessors = Array.from(allSuccessorsSet).filter(s => !allTargetIds.includes(String(s.id)));
        const scheduledImpact = allSuccessors.filter(s => s.isScheduled);

        const forceUnlinkFn = () => {
            const idsToUnlink = new Set([...allTargetIds, ...scheduledImpact.map(s => String(s.id))]);
            updateTasks(currentTasks => {
                return currentTasks.map(task => {
                    if (idsToUnlink.has(String(task.id))) {
                        return {
                            ...task,
                            isScheduled: false,
                            'START DATE': null,
                            'END DATE': null,
                            'TYPE D\'EQUIPE': null,
                            'EQUIPE NUMBER': null,
                            'MAX HOUR': null,
                            isKeyEvent: false
                        };
                    }
                    return task;
                });
            });
            setUnlinkConfirm(null);
        };

        const shiftForwardUnlinkFn = () => {
            updateTasks(currentTasks => {
                // Only unschedule the target tasks (not the successors)
                const targetIdSet = new Set(allTargetIds);
                let updated = currentTasks.map(task => {
                    if (targetIdSet.has(String(task.id))) {
                        return {
                            ...task,
                            isScheduled: false,
                            'START DATE': null,
                            'END DATE': null,
                            'TYPE D\'EQUIPE': null,
                            'EQUIPE NUMBER': null,
                            'MAX HOUR': null,
                            isKeyEvent: false
                        };
                    }
                    return task;
                });

                // Calculate deleted tasks total duration for shifting
                const deletedDuration = combinedTasks.reduce((sum, t) => sum + t.DUREE, 0);

                // Re-link predecessor chains: tasks that had a target as predecessor should inherit target's predecessors
                const deletedPreds = new Map<string, number[]>();
                combinedTasks.forEach(t => {
                    deletedPreds.set(String(t.id), (t.predecessor || []).filter(p => !targetIdSet.has(String(p))));
                });

                updated = updated.map(task => {
                    if (task.predecessor?.some(id => targetIdSet.has(String(id)))) {
                        const newPreds = new Set<number>();
                        (task.predecessor || []).forEach(predId => {
                            if (targetIdSet.has(String(predId))) {
                                (deletedPreds.get(String(predId)) || []).forEach(p => newPreds.add(p));
                            } else {
                                newPreds.add(predId);
                            }
                        });
                        return { ...task, predecessor: Array.from(newPreds) };
                    }
                    return task;
                });

                // BFS cascade: recalculate successor times
                const affectedIds = new Set<number>();
                scheduledImpact.forEach(s => affectedIds.add(s.id));
                const queue = [...affectedIds];
                const visited = new Set(queue);
                while (queue.length > 0) {
                    const currentId = queue.shift()!;
                    const taskIdx = updated.findIndex(t => t.id === currentId);
                    if (taskIdx === -1) continue;
                    const task = updated[taskIdx];
                    if (task.isScheduled && task['START DATE'] && task['END DATE']) {
                        let newStart = new Date(0);
                        const preds = task.predecessor || [];
                        if (preds.length > 0) {
                            preds.forEach(predId => {
                                const predTask = updated.find(t => t.id === predId);
                                if (predTask && predTask['END DATE']) {
                                    const predEnd = new Date(predTask['END DATE']);
                                    if (predEnd.getTime() > newStart.getTime()) newStart = predEnd;
                                }
                            });
                        }
                        if (newStart.getTime() > 0) {
                            const newEnd = new Date(newStart.getTime() + task.DUREE * 3600000);
                            updated[taskIdx] = { ...task, 'START DATE': newStart, 'END DATE': newEnd };
                        }
                    }
                    updated.forEach(t => {
                        if (t.predecessor?.includes(currentId) && !visited.has(t.id)) {
                            visited.add(t.id);
                            queue.push(t.id);
                        }
                    });
                }

                return updated;
            });
            setUnlinkConfirm(null);
        };

        if (combinedTasks.length > 1 || scheduledImpact.length > 0) {
            setUnlinkConfirm({
                isOpen: true,
                targetTask: targetTask,
                combinedTasks: combinedTasks,
                successors: scheduledImpact,
                forceUnlink: forceUnlinkFn,
                shiftForwardUnlink: shiftForwardUnlinkFn
            });
            return;
        }

        forceUnlinkFn();
    }, [updateTasks, tasks, getTaskSuccessorsRecursive]);

    const handleResetAllScheduling = useCallback(() => {
        setIsResetConfirmOpen(true);
    }, []);

    const confirmResetAllScheduling = useCallback(() => {
        updateTasks(currentTasks => {
            return currentTasks.map(task => {
                return {
                    ...task,
                    isScheduled: false,
                    'START DATE': null,
                    'END DATE': null,
                    'TYPE D\'EQUIPE': null,
                    'EQUIPE NUMBER': null,
                    'MAX HOUR': null,
                    isKeyEvent: false
                };
            });
        });
        setSelectedTaskIds([]);
        setIsResetConfirmOpen(false);
    }, [updateTasks]);

    const handleViewTeamTasks = (team: { name: string; tasks: SchedulingTaskData[] }) => {
        setViewingTeam(team);
        setIsTeamTasksModalOpen(true);
    };

    const handleToggleKeyEvent = (taskId: number) => {
        updateTasks(currentTasks =>
            currentTasks.map(task =>
                task.id === taskId ? { ...task, isKeyEvent: !task.isKeyEvent } : task
            )
        );
    };

    const handleOpenEditModal = (task: SchedulingTaskData) => {
        setTaskToEdit(task);
    };

    const handleSaveTask = (updatedTasks: SchedulingTaskData[]) => {
        updateTasks(currentTasks => {
            if (updatedTasks.length === 0) return currentTasks;

            // Use the original task ID being edited to find the location
            const originalTaskId = taskToEdit?.id;
            if (originalTaskId === undefined) return currentTasks;

            const originalTaskIndex = currentTasks.findIndex(t => t.id === originalTaskId);
            if (originalTaskIndex === -1) return currentTasks;

            // Determine the group to replace. If it was a multi-discipline task, replace the whole group.
            const multiId = taskToEdit?.multiDisciplineId;
            const idsToRemove = multiId
                ? currentTasks.filter(t => t.multiDisciplineId === multiId).map(t => t.id)
                : [originalTaskId];

            // Filter out the old group
            const filteredTasks = currentTasks.filter(t => !idsToRemove.includes(t.id));

            // Prepare the new tasks
            let maxId = Math.max(0, ...currentTasks.map(t => t.id));
            const tasksToInsert = updatedTasks.map(t => {
                const newTask = { ...t };

                // Assign ID if it's new
                if (newTask.id === -1) {
                    newTask.id = ++maxId;
                }

                // If scheduled, maintain the start date from the original task being edited
                // (Or from the existing version of itself if it had an ID)
                const existingTask = currentTasks.find(et => et.id === newTask.id);
                const sourceOfTruth = existingTask || taskToEdit;

                if (sourceOfTruth?.isScheduled && sourceOfTruth['START DATE']) {
                    newTask['START DATE'] = sourceOfTruth['START DATE'];
                    newTask['END DATE'] = new Date(sourceOfTruth['START DATE'].getTime() + (newTask.DUREE || 0) * 3600 * 1000);
                    newTask.isScheduled = true;
                    newTask.DAY = sourceOfTruth.DAY;
                    newTask["TYPE D'EQUIPE"] = sourceOfTruth["TYPE D'EQUIPE"];
                    newTask["EQUIPE NUMBER"] = sourceOfTruth["EQUIPE NUMBER"];
                }

                return newTask;
            });

            // Insert at the original position
            const result = [...filteredTasks];
            result.splice(originalTaskIndex, 0, ...tasksToInsert);
            return result;
        });
        setTaskToEdit(null);
    };

    const handleOpenDependencyModal = () => {
        if (dependencySelectionId !== null) {
            const task = tasks.find(t => t.id === dependencySelectionId);
            if (task) {
                setTaskToViewDependencies(task);
            }
        }
    };

    const handleMoveTask = (direction: 'up' | 'down') => {
        if (selectedTaskIds.length === 0) return;
        const visualIndices = selectedTaskIds.map(id => sortedAndFilteredTasks.findIndex(t => t.id === id)).filter(i => i !== -1).sort((a, b) => a - b);
        if (visualIndices.length === 0) return;
        if (direction === 'up' && visualIndices[0] === 0) return;
        if (direction === 'down' && visualIndices[visualIndices.length - 1] === sortedAndFilteredTasks.length - 1) return;

        updateTasks(currentTasks => {
            const newTasks = [...currentTasks];
            const indicesToProcess = direction === 'up' ? visualIndices : [...visualIndices].reverse();

            indicesToProcess.forEach(visualIndex => {
                const swapTargetVisualIndex = direction === 'up' ? visualIndex - 1 : visualIndex + 1;
                const taskToMove = sortedAndFilteredTasks[visualIndex];
                const taskToSwapWith = sortedAndFilteredTasks[swapTargetVisualIndex];
                const realIndex1 = newTasks.findIndex(t => t.id === taskToMove.id);
                const realIndex2 = newTasks.findIndex(t => t.id === taskToSwapWith.id);
                if (realIndex1 !== -1 && realIndex2 !== -1) {
                    [newTasks[realIndex1], newTasks[realIndex2]] = [newTasks[realIndex2], newTasks[realIndex1]];
                }
            });
            return newTasks;
        });
        setSortConfig({ key: null, direction: 'ascending' });
    };

    const selectedTaskVisualIndices = useMemo(() => {
        return selectedTaskIds.map(id => sortedAndFilteredTasks.findIndex(t => t.id === id)).filter(i => i !== -1).sort((a, b) => a - b);
    }, [selectedTaskIds, sortedAndFilteredTasks]);

    const canMoveUp = selectedTaskVisualIndices.length > 0 && selectedTaskVisualIndices[0] > 0;
    const canMoveDown = selectedTaskVisualIndices.length > 0 && selectedTaskVisualIndices[selectedTaskVisualIndices.length - 1] < sortedAndFilteredTasks.length - 1;

    const proceedToResults = () => {
        if (!shutdownParams) return;
        const scheduledTasksForResults: ScheduledTask[] = tasks
            .filter(t => t.isScheduled && t['START DATE'] && t['END DATE'])
            .map(t => ({
                id: t.id,
                action: t['GLOBAL TASKS'],
                team: `${t.DISCIPLINE} ${t["TYPE D'EQUIPE"]}`,
                discipline: t.DISCIPLINE,
                equipment: t['Nom Equipement'],
                family: t.FAMILLE,
                duration: t.DUREE,
                manHours: t['Heures-Homme'] > 0 ? t['Heures-Homme'] : t.DUREE * t.EFFECTIF,
                manpower: t.EFFECTIF,
                predecessor: t.predecessor || null,
                predecessorActions: (t.predecessor || []).map(pId => tasks.find(pt => pt.id === pId)?.['GLOBAL TASKS'] || ''),
                hasDeconsignationSuccessor: false,
                imperativeStart: false,
                startTime: t['START DATE'] as Date,
                endTime: t['END DATE'] as Date,
                isLate: false,
                ot: String(t.OT),
                avis: String(t.AVIS),
                isHighRisk: String(t['COMMENTAIRE HSE']) === '1' || t.THR === 1,
                'Scaffolding Required': t['Scaffolding Required'],
                'Handling required': t['Handling required'],
                permisTravailHauteur: t.permisTravailHauteur,
                permisFeu: t.permisFeu,
                permisPenetration: t.permisPenetration,
                permisLevage: t.permisLevage,
                permisExcavation: t.permisExcavation,
                preparatifs: t.Préparatifs || '',
                isKeyEvent: t.isKeyEvent,
                maintenanceType: t['Type de Maintenance'],
                multiDisciplineId: t.multiDisciplineId,
                sequenceOrder: t.sequenceOrder,
            }));

        const scheduleEndDate = scheduledTasksForResults.length > 0 ? new Date(Math.max(0, ...scheduledTasksForResults.map(t => t.endTime.getTime()))) : new Date(shutdownParams.shutdownStart);
        const scheduleStartDate = scheduledTasksForResults.length > 0 ? new Date(Math.min(...scheduledTasksForResults.map(t => t.startTime.getTime()))) : new Date(shutdownParams.shutdownStart);
        const effectiveWorkHours = (scheduleEndDate.getTime() - scheduleStartDate.getTime()) / (1000 * 60 * 60);
        const totalManHours = tasks.reduce((sum, t) => sum + t['Heures-Homme'], 0);
        const shutdownDurationHours = (new Date(shutdownParams.shutdownEnd).getTime() - new Date(shutdownParams.shutdownStart).getTime()) / (1000 * 60 * 60);

        const events: { time: number; type: 'start' | 'end'; discipline: string; manpower: number; }[] = [];
        scheduledTasksForResults.forEach(task => {
            const discipline = task.discipline || '';
            events.push({ time: task.startTime.getTime(), type: 'start', discipline, manpower: task.manpower });
            events.push({ time: task.endTime.getTime(), type: 'end', discipline, manpower: task.manpower });
        });

        const peakResources: Record<string, number> = {};
        const currentResources: Record<string, number> = {};
        const disciplinesSet = [...new Set(tasks.map(t => t.DISCIPLINE).filter(Boolean))];
        disciplinesSet.forEach(d => {
            peakResources[d] = 0;
            currentResources[d] = 0;
        });

        for (const event of events) {
            if (event.discipline) {
                if (event.type === 'start') {
                    currentResources[event.discipline] = (currentResources[event.discipline] || 0) + event.manpower;
                } else {
                    currentResources[event.discipline] = (currentResources[event.discipline] || 0) - event.manpower;
                }
                if (currentResources[event.discipline] > (peakResources[event.discipline] || 0)) {
                    peakResources[event.discipline] = currentResources[event.discipline];
                }
            }
        }

        const finalResults: CalculationResults = {
            kpis: {
                totalTasks: tasks.length,
                totalManHours: totalManHours,
                shutdownDurationHours,
                effectiveWorkHours: effectiveWorkHours > 0 ? effectiveWorkHours : 0
            },
            peakResources,
            scheduledTasks: scheduledTasksForResults,
            scheduleEndDate,
            maxWorkDate: new Date(shutdownParams.shutdownEnd),
            pdrItems: pdrItems,
            simopsRecords: simopsRecords,
            thrTaskOTs: tasks.filter(t => {
                const v = (t as any)['THR'];
                return v === 1 || v === true || v === '1' || String(v).toUpperCase() === 'TRUE' || String(v).toUpperCase() === 'OUI';
            }).map(t => String(t.OT).trim()).filter(Boolean),

        };

        const finalParams: AppParameters = {
            shutdownStart: shutdownParams.shutdownStart,
            shutdownEnd: shutdownParams.shutdownEnd,
            consignation: shutdownParams.consignation,
            deconsignation: shutdownParams.deconsignation,
            combustion: typeof shutdownParams.combustion === 'number'
                ? { mode: 'parallel', value: shutdownParams.combustion }
                : shutdownParams.combustion,
            demarrage: 0,
        };

        const schedulingState: SchedulingPageState = {
            tasks,
            mapTasks,
            shutdownParams,
            currentFile: currentFile!,
            filters: filters as SchedulingFilters,
            dailyDurationLimit,
            pdrItems: pdrItems,
            evaluationData: internalEvaluationData || undefined,
            costData,
            costHubEntries,
            scaffoldingRecords,
            handlingRecords,
            permitRecords,
            simopsRecords,
        };

        onFinishedScheduling(finalResults, finalParams, schedulingState);
    };

    const handleViewResults = () => {
        if (tasks.length === 0) {
            showAlert("Tâches manquantes", "Veuillez ajouter au moins une tâche avant de voir les résultats.");
            return;
        }
        proceedToResults();
    };

    const getCurrentSchedulingState = useCallback((): SchedulingPageState | null => {
        if (!tasks || !shutdownParams) return null;
        return {
            tasks,
            shutdownParams,
            currentFile: currentFile!,
            filters: filters as SchedulingFilters,
            dailyDurationLimit,
            pdrItems: pdrItems,
            costData
        };
    }, [tasks, shutdownParams, currentFile, filters, dailyDurationLimit]);

    // --- Column Management Functions ---
    const handleColumnResize = (key: string, newWidth: number) => {
        setColumnDefs(prev => prev.map(col => col.key === key ? { ...col, width: newWidth } : col));
    };

    const handleColumnVisibility = (key: string) => {
        setColumnDefs(prev => prev.map(col => col.key === key ? { ...col, visible: !col.visible } : col));
    };

    const calculationResults = useMemo(() => {
        if (!tasks || !shutdownParams) return undefined;

        // The calculateSchedule function expects AppParameters, but we have ShutdownParams.
        // We'll construct a compatible AppParameters object.
        const appParamsForCalc: AppParameters = {
            shutdownStart: shutdownParams.shutdownStart,
            shutdownEnd: shutdownParams.shutdownEnd,
            consignation: shutdownParams.consignation,
            deconsignation: shutdownParams.deconsignation,
            combustion: typeof shutdownParams.combustion === 'number'
                ? { mode: 'parallel', value: shutdownParams.combustion }
                : shutdownParams.combustion,
            demarrage: 0,
        };

        return calculateSchedule(tasks, appParamsForCalc, costData);
    }, [tasks, shutdownParams, costData]);

    const renderCell = (task: SchedulingTaskData, columnKey: string): React.ReactNode => {
        const val = task[columnKey as keyof SchedulingTaskData];
        if (columnKey === 'GLOBAL TASKS' || columnKey === 'Nom Equipement') {
            const textVal = val != null ? String(val) : '';
            return (
                <div className="flex items-center gap-3 truncate max-w-full" title={textVal}>
                    {columnKey === 'GLOBAL TASKS' && task.multiDisciplineId && (
                        <div className="shrink-0 flex items-center justify-center w-5 h-5 rounded-md bg-purple-500/20 border border-purple-500/40" title="Mission Multi-Discipline">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 4v16m8-8H4" /></svg>
                        </div>
                    )}
                    <span className={`truncate ${columnKey === 'GLOBAL TASKS' ? 'font-bold text-slate-200 group-hover:text-white' : 'text-slate-500 font-medium'}`}>
                        <Highlight text={textVal} highlight={searchTerm} />
                    </span>
                </div>
            );
        }
        if (columnKey === 'DUREE' || columnKey === 'Heures-Homme') {
            return (
                <div className="flex items-center gap-1.5 tabular-nums">
                    <span className="font-black text-slate-300">{typeof val === 'number' ? val.toFixed(2) : '0.00'}</span>
                    <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tighter">{columnKey === 'DUREE' ? 'H' : 'H/H'}</span>
                </div>
            );
        }
        if (columnKey === 'START DATE' || columnKey === 'END DATE') {
            if (!(val instanceof Date)) return <span className="text-slate-700">---</span>;
            return (
                <div className="flex flex-col leading-none">
                    <span className={`text-[10px] font-black tabular-nums tracking-tight ${columnKey === 'START DATE' ? 'text-emerald-500/80' : 'text-amber-500/80'}`}>
                        {val.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    </span>
                    <span className="text-[9px] font-bold text-slate-500 tabular-nums">
                        {val.toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            );
        }
        if (columnKey === 'predecessor') {
            const predIds = task.predecessor;
            if (!Array.isArray(predIds) || predIds.length === 0) return <span className="text-slate-700">---</span>;
            return (
                <div className="flex items-center gap-1">
                    <div className="flex -space-x-1">
                        {predIds.slice(0, 3).map(id => (
                            <div key={id} className="w-4 h-4 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-[7px] font-black text-slate-500 shrink-0" title={`ID: ${id}`}>
                                {String(id).slice(-1)}
                            </div>
                        ))}
                    </div>
                    {predIds.length > 3 && <span className="text-[8px] font-black text-slate-600">+{predIds.length - 3}</span>}
                </div>
            );
        }
        if (columnKey === 'EFFECTIF') {
            return (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                    <span className="text-[10px] font-black text-blue-400 tabular-nums">{val}</span>
                    <span className="text-[8px] font-bold text-blue-500 opacity-50 uppercase">Px</span>
                </div>
            );
        }
        if (columnKey === 'DISCIPLINE') {
            return (
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 truncate block">
                    {val}
                </span>
            );
        }
        return val != null ? <span className="text-slate-400 font-medium truncate block">{String(val)}</span> : '';
    };

    // Throttled scroll handler — avoids setState on every pixel
    const rafScrollRef = useRef<number | null>(null);
    const handleTableScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const scrollTop = e.currentTarget.scrollTop;
        if (rafScrollRef.current) cancelAnimationFrame(rafScrollRef.current);
        rafScrollRef.current = requestAnimationFrame(() => {
            setTableScrollTop(scrollTop);
        });
    }, []);

    const schedulableTasksInView = sortedAndFilteredTasks;

    const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const allIds = sortedAndFilteredTasks.map(t => t.id);
            setSelectedTaskIds(prev => Array.from(new Set([...prev, ...allIds])));
        } else {
            const viewIds = new Set(sortedAndFilteredTasks.map(t => t.id));
            setSelectedTaskIds(prev => prev.filter(id => !viewIds.has(id)));
        }
    }, [sortedAndFilteredTasks]);

    const handleToggleAllKeyEvents = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.checked;
        updateTasks(currentTasks => {
            const idsToUpdate = new Set(sortedAndFilteredTasks.map(t => t.id));
            return currentTasks.map(t => idsToUpdate.has(t.id) ? { ...t, isKeyEvent: newValue } : t);
        });
    }, [sortedAndFilteredTasks, updateTasks]);

    const containerHeight = tableContainerRef.current?.clientHeight || 600;
    const totalHeight = sortedAndFilteredTasks.length * ROW_HEIGHT;
    const startIndex = Math.floor(tableScrollTop / ROW_HEIGHT);
    const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT) + 5;
    const visibleTasks = sortedAndFilteredTasks.slice(startIndex, startIndex + visibleCount);
    const paddingTop = startIndex * ROW_HEIGHT;
    const virtualRows = visibleTasks;

    const resourcePanelRef = useRef<HTMLDivElement>(null);

    const scrollToResources = () => {
        resourcePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const scrollToTable = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const scheduledTaskCount = useMemo(() => tasks.filter(t => t.isScheduled).length, [tasks]);
    const schedulingProgressValue = tasks.length > 0 ? (scheduledTaskCount / tasks.length) * 100 : 0;

    const areAllSelected = useMemo(() =>
        sortedAndFilteredTasks.length > 0 && sortedAndFilteredTasks.every(t => selectedTaskIds.includes(t.id)),
        [sortedAndFilteredTasks, selectedTaskIds]);

    const areAllKeyEventsSelected = useMemo(() =>
        sortedAndFilteredTasks.length > 0 && sortedAndFilteredTasks.every(t => t.isKeyEvent),
        [sortedAndFilteredTasks]);

    if (step === 'setup') {
        const stateForSetup = shutdownParams ? getCurrentSchedulingState() : initialState;
        const onBackAction = shutdownParams ? () => setStep('dashboard') : onBack;
        return <SetupStep
            onConfirm={handleConfirmSetup}
            onBack={onBackAction}
            initialState={stateForSetup}
            isScratchMode={isScratchMode}
            isLoading={isLoading}
            progressPercent={progressPercent}
            progressStep={progressStep}
            progressLog={progressLog}
            onCancelLoading={handleCancelLoading}
            isProcessingComplete={isProcessingComplete}
            processingStats={processingStats}
            onFinishProcessing={handleFinishProcessing}
            error={error}
        />;
    }

    return (
        <div className="min-h-screen bg-black text-slate-200">
            {notification && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-600 text-white py-4 px-8 rounded-xl shadow-2xl z-[100] animate-fade-in flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-semibold">{notification.message}</span>
                </div>
            )}
            <SchedulingHeader
                activeStep={step}
                onNavigate={(nextStep) => {
                    if (nextStep === 'results') {
                        if (tasks.length === 0) {
                            showAlert("Tâches manquantes", "Veuillez ajouter au moins une tâche avant de voir les résultats.");
                            return;
                        }
                        handleViewResults();
                    }
                    else setStep(nextStep);
                }}
                isResultsEnabled={tasks.length > 0}
                onModifyParams={() => setStep('setup')}
                onBack={() => {
                    if (step === 'scheduling') {
                        setStep('dashboard');
                    } else if (step === 'dashboard') {
                        setStep('setup');
                    } else {
                        onBack();
                    }
                }}
                progressPercent={schedulingProgressValue}
                onNavigateToPortal={onNavigateToPortal}
                projectName={projectName}
            />
            {/* ... Modal Components ... */}
            <OverloadConfirmModal
                isOpen={overloadWarning?.isOpen || false}
                onClose={() => {
                    setOverloadWarning(null);
                    setIsSchedulingModalOpen(true);
                }}
                onConfirm={() => {
                    overloadWarning?.onConfirm();
                    setOverloadWarning(null);
                }}
                teamNames={overloadWarning?.teamNames || []}
            />
            <ScheduleOverrunWarningModal
                isOpen={scheduleOverrunWarning?.isOpen || false}
                onClose={() => {
                    setScheduleOverrunWarning(null);
                    setIsSchedulingModalOpen(true);
                }}
                onConfirm={() => {
                    scheduleOverrunWarning?.onConfirm();
                    setScheduleOverrunWarning(null);
                }}
                tasks={scheduleOverrunWarning?.tasks || []}
            />
            <DeleteConfirmModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={handleDeleteSelectedTasks}
                taskCount={selectedTaskIds.length}
                tasks={tasks.filter(t => selectedTaskIds.includes(t.id))}
                allTasks={tasks}
                taskName={
                    selectedTaskIds.length === 1
                        ? tasks.find(t => t.id === selectedTaskIds[0])?.['GLOBAL TASKS']
                        : undefined
                }
            />
            <RenameConfirmModal
                isOpen={renameConfirmState?.isOpen || false}
                onClose={() => setRenameConfirmState(null)}
                onConfirm={executeTeamRename}
                discipline={renameConfirmState?.discipline || ''}
                oldName={renameConfirmState?.oldName || ''}
                newName={renameConfirmState?.newName || ''}
            />
            {manpowerConflict?.isOpen && (
                <ManpowerConflictModal
                    isOpen={manpowerConflict.isOpen}
                    onClose={() => setManpowerConflict(null)}
                    onConfirm={manpowerConflict.onConfirm}
                    conflicts={manpowerConflict.conflicts}
                />
            )}

            {/* RESET ALL CONFIRMATION MODAL */}
            {isResetConfirmOpen && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 lg:p-12 pointer-events-none">
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-300 pointer-events-auto" onClick={() => setIsResetConfirmOpen(false)}></div>
                    <div className="relative w-full max-w-md bg-slate-900 border border-red-500/40 rounded-[3rem] shadow-[0_0_100px_rgba(239,68,68,0.3)] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-500 pointer-events-auto">
                        <div className="p-10 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center border border-red-500/30 mb-8 shadow-[0_0_50px_rgba(239,68,68,0.2)] relative">
                                <div className="absolute inset-0 bg-red-500/20 rounded-3xl animate-ping scale-75 opacity-50"></div>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" className="relative z-10"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>

                            <h3 className="text-2xl font-black text-white uppercase tracking-[0.1em] mb-4 italic">Réinitialisation Système</h3>
                            <div className="h-1 w-20 bg-red-500/30 rounded-full mb-6"></div>

                            <p className="text-slate-400 text-sm leading-relaxed mb-8 px-4">
                                Êtes-vous certain de vouloir <span className="text-red-500 font-black">délier l'intégralité</span> des missions tactiques ?
                            </p>

                            <div className="bg-red-500/5 rounded-3xl border border-red-500/20 p-6 mb-2">
                                <p className="text-[10px] font-bold text-red-500/80 uppercase tracking-widest italic leading-relaxed">
                                    Avertissement : Cette action effacera toute l'intelligence de planification générée. Aucun retour en arrière n'est possible via le protocole standard.
                                </p>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-950/80 border-t border-white/5 flex gap-4">
                            <button
                                onClick={() => setIsResetConfirmOpen(false)}
                                className="flex-1 bg-white/5 hover:bg-white/10 text-slate-500 font-black py-4 px-6 rounded-2xl transition-all border border-white/5 uppercase tracking-widest text-[10px] active:scale-95"
                            >
                                Abandonner
                            </button>
                            <button
                                onClick={confirmResetAllScheduling}
                                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-4 px-6 rounded-2xl transition-all shadow-xl shadow-red-900/40 uppercase tracking-widest text-[10px] border border-red-400/30 active:scale-95"
                            >
                                Formater Planning
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isSchedulingModalOpen && <SchedulingModal
                isOpen={isSchedulingModalOpen}
                onClose={() => setIsSchedulingModalOpen(false)}
                onApply={handleApplySchedule}
                allTasks={tasks}
                scheduledTasks={scheduledTasks}
                selectedTasks={tasks.filter(t => selectedTaskIds.includes(t.id))}
                defaultStartDate={shutdownParams?.shutdownStart}
                autoStartDate={autoStartDate}
                defaultMaxHours={dailyDurationLimit}
                lastTasksByTeam={lastTasksByTeam}
                availableTags={tagSuggestions}
            />}
            {isLiveSchedulingOpen && shutdownParams && (
                <LiveSchedulingModal
                    isOpen={isLiveSchedulingOpen}
                    onClose={() => setIsLiveSchedulingOpen(false)}
                    tasksToEditIds={[]}
                    allTasks={tasks}
                    onSave={(updatedTasks) => {
                        updateTasks(() => updatedTasks);
                        setSelectedTaskIds([]);
                        setNotification({ message: 'Planification live enregistrée avec succès.', type: 'success' });
                        setTimeout(() => setNotification(null), 3000);
                    }}
                    scheduledTasks={scheduledTasks}
                    shutdownParams={shutdownParams}
                    dailyDurationLimit={dailyDurationLimit}
                    lastTasksByTeam={lastTasksByTeam}
                    disciplineColors={disciplineColors}
                    setDisciplineColors={setDisciplineColors}
                    timelineOptions={timelineOptions}
                    setTimelineOptions={setTimelineOptions}
                    familyOrder={familyOrder}
                    setFamilyOrder={setFamilyOrder}
                    autoStartDate={autoStartDate}
                    availableTags={tagSuggestions}
                />
            )}
            {taskToEdit && (
                <EditTaskModal
                    isOpen={!!taskToEdit}
                    onClose={() => setTaskToEdit(null)}
                    onSave={handleSaveTask}
                    task={taskToEdit}
                    allTasks={tasks}
                    costHubEntries={costHubEntries}
                />
            )}
            <AddTaskModal
                isOpen={isAddTaskModalOpen}
                onClose={() => setIsAddTaskModalOpen(false)}
                onSave={handleAddTask}
                allTasks={tasks}
                costData={costData}
                costHubEntries={costHubEntries}
            />
            <DependencyModal
                isOpen={!!taskToViewDependencies}
                onClose={() => setTaskToViewDependencies(null)}
                allTasks={tasks}
                taskToView={taskToViewDependencies}
            />
            {viewingTeam && <TeamTasksModal
                isOpen={isTeamTasksModalOpen}
                onClose={() => setIsTeamTasksModalOpen(false)}
                teamName={viewingTeam.name}
                tasks={viewingTeam.tasks}
            />}

            {/* Tooltip Render */}
            {hoveredScheduledTask && isHoverDetailsEnabled && (
                <div
                    ref={tooltipRef}
                    className="fixed z-[10000] pointer-events-none transition-all duration-300 transform scale-100 opacity-100"
                    style={{
                        left: tooltipInitialPos.x,
                        top: tooltipInitialPos.y,
                    }}
                >
                    <div className="bg-slate-900/90 border border-emerald-500/30 rounded-[2rem] p-6 shadow-2xl backdrop-blur-xl max-w-sm animate-in zoom-in-50 duration-200 ring-1 ring-white/10">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="10" /><path d="M12 2v20M2 12h20" /></svg>
                        </div>

                        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-white/5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">ID-{hoveredScheduledTask.id}</span>
                                <span className="text-xs font-black text-white uppercase truncate tracking-tight">
                                    {hoveredScheduledTask['GLOBAL TASKS']}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-[10px]">
                            <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                                <span className="text-slate-500 uppercase font-black tracking-widest text-[7px] mb-1 block">Équipe Tactique</span>
                                <span className="text-emerald-400 font-bold truncate block">
                                    {hoveredScheduledTask.DISCIPLINE} {hoveredScheduledTask["TYPE D'EQUIPE"]}
                                </span>
                            </div>
                            <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                                <span className="text-slate-500 uppercase font-black tracking-widest text-[7px] mb-1 block">Charge Travail</span>
                                <span className="text-white font-bold block">
                                    {hoveredScheduledTask.DUREE.toFixed(2)} h
                                </span>
                            </div>
                            <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                                <span className="text-emerald-500/50 uppercase font-black tracking-widest text-[7px] mb-1 block">T0 - Déploiement</span>
                                <span className="text-white font-bold block whitespace-nowrap">
                                    {hoveredScheduledTask['START DATE']?.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/10">
                                <span className="text-blue-500/50 uppercase font-black tracking-widest text-[7px] mb-1 block">TX - Extraction</span>
                                <span className="text-white font-bold block whitespace-nowrap">
                                    {hoveredScheduledTask['END DATE']?.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        </div>

                        {hoveredScheduledTask.predecessor && hoveredScheduledTask.predecessor.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-1 h-1 rounded-full bg-purple-500"></div>
                                    <span className="text-slate-500 uppercase font-black tracking-[0.2em] text-[7px]">Pre - Réquisits Tactiques</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {hoveredScheduledTask.predecessor.map(predId => {
                                        const predTask = tasks.find(t => t.id === predId);
                                        return (
                                            <div key={predId} className="px-2 py-1 bg-white/[0.03] rounded-lg text-[8px] text-slate-400 border border-white/5 flex items-center gap-2 group/tip">
                                                <div className="w-1 h-1 rounded-full bg-slate-600 transition-colors group-hover/tip:bg-purple-400"></div>
                                                <span className="font-bold">{predTask ? predTask['GLOBAL TASKS'] : `ID: ${predId}`}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                            <div className="flex gap-1">
                                {[1, 2, 3].map(i => <div key={i} className="w-4 h-0.5 bg-emerald-500/20 rounded-full"></div>)}
                            </div>
                            <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Protocol V3.0 Activated</span>
                        </div>
                    </div>
                </div>
            )}

            {duplicateConfirmState && (
                <DuplicateConfirmModal
                    isOpen={duplicateConfirmState.isOpen}
                    onClose={() => setDuplicateConfirmState(null)}
                    onConfirm={confirmDuplicate}
                    taskCount={selectedTaskIds.length}
                />
            )}
            {unlinkConfirm && (
                <UnlinkConfirmModal
                    isOpen={unlinkConfirm.isOpen}
                    onClose={() => setUnlinkConfirm(null)}
                    onConfirm={unlinkConfirm.forceUnlink}
                    onConfirmShift={unlinkConfirm.shiftForwardUnlink}
                    isCombined={unlinkConfirm.combinedTasks.length > 1}
                    hasSuccessors={unlinkConfirm.successors.length > 0}
                    text={
                        <div className="flex flex-col gap-6">
                            {unlinkConfirm.combinedTasks.length > 1 && (
                                <div className="bg-red-500/5 rounded-3xl p-6 border border-red-500/10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                        <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Groupe Multi-Discipline ({unlinkConfirm.combinedTasks.length})</h4>
                                    </div>
                                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-2">
                                        {unlinkConfirm.combinedTasks.map(t => (
                                            <div key={t.id} className="flex items-center justify-between gap-4 p-3 bg-black/40 rounded-xl border border-white/5 group/t">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">ID-{t.id}</span>
                                                    <span className="text-[10px] font-bold text-slate-200 truncate">{t['GLOBAL TASKS']}</span>
                                                </div>
                                                <span className="text-[9px] font-black text-red-400 uppercase tracking-tighter bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">{t.DISCIPLINE}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-4 text-[10px] text-red-400/80 font-medium leading-relaxed italic">
                                        La rupture déprogrammera l'ensemble de ces missions tactiques liées.
                                    </p>
                                </div>
                            )}

                            {unlinkConfirm.successors.length > 0 && (
                                <div className="bg-slate-950/40 rounded-3xl p-6 border border-white/5">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-2 h-2 rounded-full bg-slate-500"></div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Successions Impactées ({unlinkConfirm.successors.length})</h4>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                        {unlinkConfirm.successors.map(t => (
                                            <div key={t.id} className="flex items-center gap-4 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-500"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">ID-{t.id}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 truncate italic">{t['GLOBAL TASKS']}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <p className="mt-4 text-[10px] text-slate-500 font-medium leading-relaxed italic">
                                        Ces tâches perdront leur position temporelle suite à la rupture de la chaîne.
                                    </p>
                                </div>
                            )}

                            <div className="flex flex-col items-center gap-2 mt-2">
                                <p className="text-sm font-bold text-white tracking-wide">Confirmer la déprogrammation tactique ?</p>
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] italic">Action irréversible sur l'agenda actuel</p>
                            </div>
                        </div>
                    }
                />
            )}

            {step === 'dashboard' ? (
                shutdownParams ? (
                    <ProjectDashboard
                        tasks={tasks}
                        shutdownParams={shutdownParams}
                        onModifyParams={() => setStep('setup')}
                        onStartScheduling={() => setStep('scheduling')}
                        onBack={onBack}
                        results={calculationResults}
                        onNavigateToPortal={onNavigateToPortal}
                    />
                ) : (
                    // shutdownParams is null — redirect to setup to re-upload the file
                    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 text-center p-8">
                        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-3">Configuration requise</h2>
                            <p className="text-slate-400 max-w-md">Les paramètres de planification sont manquants. Veuillez téléverser votre fichier de planification pour continuer.</p>
                        </div>
                        <button
                            onClick={() => setStep('setup')}
                            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-emerald-500/30 active:scale-95"
                        >
                            Téléverser le fichier
                        </button>
                    </div>
                )
            ) : step === 'readiness' ? (
                <ReadinessDashboard
                    tasks={tasks}
                    pdrItems={allPdrItems}
                    onTaskUpdate={(taskId, updates) => {
                        updateTasks(current => current.map(t => t.id === taskId ? { ...t, ...updates } : t));
                    }}
                />
            ) : step === 'pdr' ? (
                <PreparatifManagement pdrItems={allPdrItems} tasks={tasks} onUpdatePDR={handleUpdatePDR} />
            ) : step === 'cost' ? (
                <CostControlPage
                    tasks={tasks}
                    costData={costData}
                    evaluationData={internalEvaluationData}
                    onBack={() => setStep('dashboard')}
                />
            ) : step === 'health' ? (
                <ScheduleHealthPage
                    tasks={tasks}
                    onBack={() => setStep('scheduling')}
                />
            ) : (
                <main className="p-4 sm:p-6 lg:p-8 flex flex-col gap-8 w-full">
                    <div className="relative w-full">
                        {dailyDurationLimit <= 0 && (
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-2xl z-50 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-8 border border-white/5 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none"></div>
                                <div className="relative">
                                    <div className="w-24 h-24 bg-emerald-500/10 rounded-3xl flex items-center justify-center border border-emerald-500/20 mb-8 relative group/action active:scale-95 transition-all">
                                        <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse"></div>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-emerald-400 group-hover:scale-110 transition-transform relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-4xl font-black text-white mb-4 uppercase italic tracking-tighter">Action Requise</h3>
                                    <p className="text-slate-400 max-w-sm mx-auto font-medium leading-relaxed mb-10">
                                        Veuillez définir la <span className="text-emerald-400 font-bold px-1.5 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">"Charge max / jour (H)"</span> pour initialiser le moteur d'ordonnancement.
                                    </p>
                                    <button
                                        onClick={scrollToResources}
                                        className="group relative px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-[0.2em] italic rounded-2xl transition-all shadow-2xl shadow-emerald-500/40 active:scale-95 overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                                        <div className="flex items-center gap-3">
                                            <span>Initialiser</span>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="animate-bounce"><path d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}
                        <div className="flex flex-col gap-6 relative">
                            {/* Tactical Filter Control Center */}
                            <div className="bg-slate-900/40 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative group/filter z-40">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover/filter:bg-emerald-500/10 transition-colors duration-1000"></div>

                                <div className="flex flex-col gap-8 relative z-10">
                                    {/* Header & Main Dropdowns */}
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                        <div className="flex-1">                                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                                            <div className="group/field relative">
                                                <span className="absolute -top-2 left-4 px-2 text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-900 border border-white/5 z-20 transition-colors group-hover/field:text-emerald-400">Discipline</span>
                                                <MultiSelectDropdown options={disciplines} selected={filters.discipline} onChange={s => setFilters(f => ({ ...f, discipline: s }))} placeholder="Toutes les Disciplines" />
                                            </div>
                                            <div className="group/field relative">
                                                <span className="absolute -top-2 left-4 px-2 text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-900 border border-white/5 z-20 transition-colors group-hover/field:text-blue-400">Équipement</span>
                                                <MultiSelectDropdown options={equipments} selected={filters.equipment} onChange={s => setFilters(f => ({ ...f, equipment: s }))} placeholder="Tous les Équipements" />
                                            </div>
                                            <div className="group/field relative">
                                                <span className="absolute -top-2 left-4 px-2 text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-900 border border-white/5 z-20 transition-colors group-hover/field:text-purple-400">Famille</span>
                                                <MultiSelectDropdown options={families} selected={filters.family} onChange={s => setFilters(f => ({ ...f, family: s }))} placeholder="Toutes les Familles" />
                                            </div>
                                            <div className="group/field relative">
                                                <span className="absolute -top-2 left-4 px-2 text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-900 border border-white/5 z-20 transition-colors group-hover/field:text-cyan-400">Maintenance</span>
                                                <MultiSelectDropdown options={maintenanceTypes} selected={filters.maintenanceType} onChange={s => setFilters(f => ({ ...f, maintenanceType: s }))} placeholder="Tous les Types" />
                                            </div>
                                        </div>
                                        </div>

                                        {/* Toggles Group */}
                                        <div className="flex flex-row items-center gap-6 bg-black/40 p-3 rounded-2xl border border-white/5 shadow-inner self-start lg:self-auto min-w-fit">
                                            <button
                                                onClick={() => setFilters(f => ({ ...f, showUnscheduledOnly: !f.showUnscheduledOnly, showScheduledOnly: false }))}
                                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border ${filters.showUnscheduledOnly ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-transparent text-slate-500 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <div className={`w-2 h-2 rounded-full ${filters.showUnscheduledOnly ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-600'}`}></div>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Non Ordonnancées</span>
                                            </button>
                                            <div className="w-px h-6 bg-white/5"></div>
                                            <button
                                                onClick={() => setFilters(f => ({ ...f, multiDisciplineOnly: !f.multiDisciplineOnly }))}
                                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all border ${filters.multiDisciplineOnly ? 'bg-purple-500/10 border-purple-500/30 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.1)]' : 'border-transparent text-slate-500 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={`${filters.multiDisciplineOnly ? 'text-purple-400' : 'text-slate-600'}`}><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                                <span className="text-[10px] font-black uppercase tracking-widest">Multi-Discipline</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Advanced Tactical Search */}
                                    <div className="relative group/search">
                                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-blue-500/5 to-purple-500/5 rounded-2xl blur-xl opacity-50 group-hover/search:opacity-100 transition-opacity"></div>
                                        <div className="relative">
                                            <input
                                                type="search"
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                placeholder="SCANNAGE DES MISSIONS, EQUIPEMENTS OU FAMILLES D'ACTIFS..."
                                                className="w-full bg-black/60 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/30 focus:outline-none transition-all font-mono text-[11px] tracking-widest shadow-2xl"
                                            />
                                            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-emerald-500/50 group-hover/search:text-emerald-400 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                </svg>
                                            </div>
                                            <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none">
                                                <kbd className="hidden sm:inline-flex items-center px-2 py-1 bg-white/5 border border-white/5 rounded text-[8px] font-black text-slate-500 uppercase tracking-widest">Ctrl K</kbd>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Bar */}
                            <div className="bg-slate-900/80 backdrop-blur-xl p-4 rounded-t-3xl border-x border-t border-white/10 flex flex-col lg:flex-row justify-between items-center gap-6 relative z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
                                <div className="flex flex-wrap items-center gap-3">
                                    {/* View Group */}
                                    <div className="flex items-center bg-black/40 rounded-2xl p-1.5 border border-white/5 shadow-inner">
                                        <button
                                            onClick={() => setFilters(f => ({ ...f, showScheduledOnly: !f.showScheduledOnly, showUnscheduledOnly: false }))}
                                            title="Filtrer Ordonnancées"
                                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${filters.showScheduledOnly ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 border border-cyan-400/30' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 3v18h18" /><path d="M18 17l-6-6-4 4-5-5" /></svg>
                                        </button>
                                        <button
                                            onClick={() => setIsHoverDetailsEnabled(!isHoverDetailsEnabled)}
                                            title="Aperçu au survol"
                                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isHoverDetailsEnabled ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/30' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                        </button>
                                        <div className="w-px h-6 bg-white/5 mx-1"></div>
                                        <div className="relative" ref={columnMenuRef}>
                                            <button
                                                onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                                                title="Gérer les colonnes"
                                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${isColumnMenuOpen ? 'bg-slate-700 text-white border border-white/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                            >
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 00-2 2" /></svg>
                                            </button>
                                            {isColumnMenuOpen && (
                                                <div className="absolute top-full left-0 mt-3 w-72 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50 p-4 max-h-[60vh] overflow-y-auto animate-in slide-in-from-top-2 fade-in duration-200 backdrop-blur-2xl">
                                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 px-2 border-b border-white/5 pb-2">Inventaire des Colonnes</h4>
                                                    <div className="grid grid-cols-1 gap-1">
                                                        {columnDefs.map(col => (
                                                            <button
                                                                key={col.key}
                                                                onClick={() => !col.isSystem && handleColumnVisibility(col.key)}
                                                                className={`flex items-center gap-3 p-2.5 rounded-xl transition-all text-left group/col ${col.visible ? 'bg-emerald-500/5 text-emerald-100' : 'hover:bg-white/5 text-slate-500'}`}
                                                            >
                                                                <div className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${col.visible ? 'bg-emerald-500 border-emerald-400' : 'border-slate-700 group-hover/col:border-slate-600'}`}>
                                                                    {col.visible && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>}
                                                                </div>
                                                                <span className="text-[10px] font-black uppercase tracking-widest">{col.label}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Group */}
                                    <div className="flex items-center bg-black/40 rounded-2xl p-1.5 border border-white/5 shadow-inner">
                                        <button onClick={() => setIsAddTaskModalOpen(true)} title="Ajouter Mission" className="w-10 h-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all active:scale-95 shadow-lg shadow-emerald-500/10">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 4v16m8-8H4" /></svg>
                                        </button>
                                        <button onClick={handleDuplicateSelectedTasks} disabled={selectedTaskIds.length === 0} title="Dupliquer Sélection" className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m-6 12h8a2 2 0 0 02-2v-8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z" /></svg>
                                        </button>
                                        <button onClick={() => setIsDeleteConfirmOpen(true)} disabled={selectedTaskIds.length === 0} title="Supprimer Sélection" className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-20 disabled:cursor-not-allowed transition-all active:scale-95">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                        <div className="w-px h-6 bg-white/5 mx-1"></div>
                                        <button onClick={handleOpenDependencyModal} disabled={dependencySelectionId === null} title="Maillage Dépendances" className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-95 disabled:opacity-20 ${dependencySelectionId ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                        </button>
                                    </div>

                                    {/* System Group */}
                                    <div className="flex items-center bg-black/40 rounded-2xl p-1.5 border border-white/5 shadow-inner">
                                        <button onClick={handleUndo} disabled={history.length === 0} title="Annuler (Undo)" className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all active:scale-95">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 15l-3-3m0 0l3-3m-3 3h8A5 5 0 0118 18v-3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        </button>
                                        <button onClick={handleRedo} disabled={redoHistory.length === 0} title="Rétablir (Redo)" className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-20 transition-all active:scale-95">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 15l3-3m0 0l-3-3m3 3H8a5 5 0 00-5 5v3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                        </button>
                                        <div className="flex flex-col mx-1">
                                            <button onClick={() => handleMoveTask('up')} disabled={!canMoveUp} className="w-8 h-5 flex items-center justify-center text-slate-600 hover:text-white disabled:opacity-20 transition-all"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M18 15l-6-6-6 6" /></svg></button>
                                            <button onClick={() => handleMoveTask('down')} disabled={!canMoveDown} className="w-8 h-5 flex items-center justify-center text-slate-600 hover:text-white disabled:opacity-20 transition-all"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M6 9l6 6 6-6" /></svg></button>
                                        </div>
                                        <div className="w-px h-6 bg-white/5 mx-1"></div>
                                        <button onClick={handleExportProgress} title="Export Tactique (Excel)" className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all active:scale-95">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        </button>
                                        <button onClick={handleResetAllScheduling} title="Reset Intégral" className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-red-500 hover:bg-red-500/20 transition-all active:scale-95">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Durée Sélectionnée</span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    </div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-black text-white tabular-nums tracking-tighter italic">{selectedDuration.toFixed(2)}</span>
                                        <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">Heures</span>
                                    </div>
                                    <div className="flex gap-4 mt-2 h-2 w-full bg-slate-800 rounded-full overflow-hidden shadow-inner flex-nowrap shrink-0">
                                        {Object.entries(selectedDisciplineBreakdown).map(([disc, dur], idx) => (
                                            <div
                                                key={disc}
                                                className="h-full transition-all duration-1000"
                                                style={{
                                                    width: `${(dur / (selectedDuration || 1)) * 100}%`,
                                                    backgroundColor: HIGH_CONTRAST_COLORS[idx % HIGH_CONTRAST_COLORS.length],
                                                    minWidth: '2px' // Ensures tiny slivers are still somewhat visible
                                                }}
                                                title={`${disc}: ${dur.toFixed(1)}h`}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 -mb-1 max-w-[220px]">
                                        {Object.entries(selectedDisciplineBreakdown).map(([disc, dur], idx) => (
                                            <div key={disc} className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-black/40 hover:bg-white/5 transition-colors cursor-default" title={`${disc}: ${dur.toFixed(1)}H`}>
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: HIGH_CONTRAST_COLORS[idx % HIGH_CONTRAST_COLORS.length] }}></div>
                                                <span className="text-[9px] font-black text-white">{disc}</span>
                                                <span className="text-[9px] font-bold text-slate-400">({dur.toFixed(1)}h)</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {/* Live Scheduling Button */}
                                    <button
                                        onClick={() => setIsLiveSchedulingOpen(true)}
                                        disabled={!shutdownParams}
                                        className="group relative flex items-center gap-2.5 px-5 py-4 bg-indigo-600/20 hover:bg-indigo-600 border border-indigo-500/40 hover:border-indigo-400 disabled:bg-slate-800 disabled:opacity-20 text-indigo-300 hover:text-white rounded-2xl transition-all shadow-lg shadow-indigo-900/20 hover:shadow-indigo-900/40 active:scale-95 overflow-hidden"
                                        title="Ouvrir le mode Live Scheduling avec Gantt en temps réel"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="3" rx="1" /><rect x="3" y="9" width="10" height="3" rx="1" /><rect x="3" y="14" width="14" height="3" rx="1" /></svg>
                                        <span className="text-[9px] font-black uppercase tracking-widest">Live</span>
                                    </button>

                                    <button
                                        onClick={() => setIsLiveSchedulingOpen(true)}
                                        disabled={selectedTaskIds.length === 0}
                                        className="group relative flex items-center gap-3 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:opacity-20 text-white rounded-2xl transition-all shadow-xl shadow-indigo-900/40 active:scale-95 overflow-hidden"
                                        title="Ouvrir le Live Scheduling avec les tâches sélectionnées"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        <span className="text-[10px] font-black uppercase tracking-widest">Assistant ({selectedTaskIds.length})</span>
                                    </button>

                                    <button
                                        onClick={() => setIsSchedulingModalOpen(true)}
                                        disabled={selectedTaskIds.length === 0}
                                        className="group relative flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:opacity-20 text-white rounded-2xl transition-all shadow-xl shadow-emerald-900/40 active:scale-95 overflow-hidden"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                                        <span className="text-[10px] font-black uppercase tracking-widest font-mono">Ordonnancer</span>
                                    </button>

                                    <button onClick={scrollToResources} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 border border-white/5 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all group active:scale-90">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-bounce group-hover:scale-110 transition-transform"><path d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                    </button>
                                </div>
                            </div>

                            {/* Table */}
                            <div
                                className="overflow-auto bg-slate-900 rounded-b-3xl border-x border-b border-white/10 relative custom-scrollbar shadow-2xl"
                                style={{ height: '700px' }}
                                ref={tableContainerRef}
                                onScroll={handleTableScroll}
                            >
                                <table className="text-xs text-left table-auto w-full relative border-separate border-spacing-0">
                                    <thead className="sticky top-0 z-40">
                                        <tr className="bg-slate-900/95 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                                            <th className="p-4 w-12 text-center sticky left-0 bg-slate-900/95 z-50 border-r border-white/5 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
                                                <div className="w-5 h-5 rounded-md border border-white/10 flex items-center justify-center bg-black/40">
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-600"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </div>
                                            </th>
                                            <th className="p-4 w-12 text-center sticky left-12 bg-slate-900/95 z-50 border-r border-white/5 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
                                                <button
                                                    onClick={() => handleSelectAll({ target: { checked: !areAllSelected } } as any)}
                                                    className={`w-6 h-6 rounded-lg border transition-all flex items-center justify-center ${areAllSelected ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-black/40 border-white/10 hover:border-white/30'}`}
                                                >
                                                    {areAllSelected && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>}
                                                </button>
                                            </th>
                                            <SortableHeader columnKey="id" title="Unités Tactiques" sortConfig={sortConfig} requestSort={requestSort} className="sticky left-24 bg-slate-900/95 z-50 w-[160px] shadow-[2px_0_10px_rgba(0,0,0,0.5)]" />
                                            <th className="px-4 py-3 sticky left-[256px] bg-slate-900/95 z-50 w-[100px] border-r border-white/10 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
                                                <div className="flex items-center justify-center gap-3">
                                                    <button
                                                        onClick={() => handleToggleAllKeyEvents({ target: { checked: !areAllKeyEventsSelected } } as any)}
                                                        className={`w-6 h-6 rounded-lg border transition-all flex items-center justify-center ${areAllKeyEventsSelected ? 'bg-amber-500 border-amber-400' : 'bg-black/40 border-white/10 hover:border-white/30'}`}
                                                    >
                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill={areAllKeyEventsSelected ? 'white' : 'currentColor'} stroke="none" className={areAllKeyEventsSelected ? '' : 'text-slate-600'}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                                    </button>
                                                    <SortableHeader columnKey="isKeyEvent" title="KEY" sortConfig={sortConfig} requestSort={requestSort} />
                                                </div>
                                            </th>

                                            {/* Dynamic Columns */}
                                            {columnDefs.filter(col => col.visible).map(col => (
                                                <SortableHeader
                                                    key={col.key}
                                                    columnKey={col.key as keyof SchedulingTaskData}
                                                    title={col.label}
                                                    sortConfig={sortConfig}
                                                    requestSort={requestSort}
                                                    width={col.width}
                                                    onResize={(w) => handleColumnResize(col.key, w)}
                                                />
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.03]">
                                        <tr style={{ height: paddingTop }}></tr>
                                        {virtualRows.map(task => {
                                            const isSelected = selectedTaskIds.includes(task.id);
                                            const groupColors = task.multiDisciplineId ? multiDisciplineColorMap[task.multiDisciplineId] : null;
                                            return (
                                                <tr key={task.id}
                                                    className={`h-[50px] transition-all group/row ${isSelected
                                                        ? 'bg-blue-500/10'
                                                        : groupColors
                                                            ? `${groupColors.bg} ${groupColors.hover}`
                                                            : 'hover:bg-white/[0.02]'
                                                        }`}
                                                    onMouseEnter={(e) => handleRowMouseEnter(task, e)}
                                                    onMouseMove={handleRowMouseMove}
                                                    onMouseLeave={handleRowMouseLeave}
                                                >
                                                    <td className="p-4 w-12 text-center sticky left-0 bg-inherit z-10 border-r border-white/5 transition-colors">
                                                        <input
                                                            type="radio"
                                                            name="dependency-select"
                                                            checked={dependencySelectionId === task.id}
                                                            onChange={() => setDependencySelectionId(task.id)}
                                                            className="w-4 h-4 text-purple-600 bg-black/40 border-white/10 focus:ring-purple-500 accent-purple-500 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="p-4 w-12 text-center sticky left-12 bg-inherit z-10 border-r border-white/5 transition-colors">
                                                        <button
                                                            onClick={() => setSelectedTaskIds(prev => prev.includes(task.id) ? prev.filter(id => id !== task.id) : [...prev, task.id])}
                                                            className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${isSelected ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]' : 'bg-black/20 border-white/5 group-hover/row:border-white/20'}`}
                                                        >
                                                            {isSelected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4"><path d="M5 13l4 4L19 7" /></svg>}
                                                        </button>
                                                    </td>
                                                    <td className="px-4 py-1.5 sticky left-24 bg-inherit z-10 border-r border-white/5 shadow-[2px_0_10px_rgba(0,0,0,0.2)] transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <button
                                                                onClick={() => handleOpenEditModal(task)}
                                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all shadow-lg active:scale-90"
                                                                title="Éditer la mission"
                                                            >
                                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                            </button>
                                                            {(task.isScheduled || getTaskSuccessorsRecursive(task.id).some(s => s.isScheduled)) && (
                                                                <button
                                                                    onClick={() => handleDelier(task.id)}
                                                                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-90"
                                                                    title="Rompre les liens"
                                                                >
                                                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                                                                </button>
                                                            )}
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">ID-{task.id}</span>
                                                                <span className="text-[10px] font-mono font-bold text-slate-400 truncate">{String(task.DISCIPLINE || '').slice(0, 3)}-{String(task.OT || '').slice(-4)}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-1.5 text-center sticky left-[256px] bg-inherit z-10 border-r border-white/10 shadow-[2px_0_10px_rgba(0,0,0,0.2)] transition-colors">
                                                        <button
                                                            onClick={() => handleToggleKeyEvent(task.id)}
                                                            className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${task.isKeyEvent ? 'scale-110 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'text-slate-700 hover:text-slate-500'}`}
                                                        >
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill={task.isKeyEvent ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                                        </button>
                                                    </td>
                                                    {/* Dynamic Cell Rendering */}
                                                    {columnDefs.filter(col => col.visible).map(col => (
                                                        <td key={`${task.id}-${col.key}`} className="px-4 py-1.5 whitespace-nowrap border-r border-white/[0.02]" style={{ maxWidth: `${col.width}px` }}>
                                                            {renderCell(task, col.key)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                        <tr style={{ height: totalHeight - paddingTop - (virtualRows.length * ROW_HEIGHT) }}></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div className="w-full relative" ref={resourcePanelRef}>
                        <ResourceStatusPanel
                            tasks={tasks}
                            dailyDurationLimit={dailyDurationLimit}
                            setDailyDurationLimit={setDailyDurationLimit}
                            onViewTeamTasks={handleViewTeamTasks}
                            onRenameTeam={handleRenameTeam}
                            tagsByTeam={tagsByTeam}
                            shutdownParams={shutdownParams}
                        />
                        <div className="mt-8 flex justify-center w-full">
                            <button onClick={scrollToTable} title="Remonter au planning" className="px-8 py-3 rounded-xl transition-all duration-300 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 font-bold border border-emerald-500/30 shadow-xl flex items-center gap-3 backdrop-blur-sm group">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:-translate-y-1 transition-transform" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                </svg>
                                Remonter au planning
                            </button>
                        </div>
                    </div>
                </main>
            )}

            {alertConfig.isOpen && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-[500] p-4 animate-in fade-in duration-300">
                    <div className="bg-slate-900 border border-white/10 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="h-1 w-full bg-amber-500"></div>
                        <div className="p-8 space-y-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                                <Activity className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white uppercase tracking-tighter italic">{alertConfig.title}</h3>
                                <p className="text-sm text-slate-400 font-medium leading-relaxed mt-2">{alertConfig.message}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAlertConfig(prev => ({ ...prev, isOpen: false }))}
                                className="w-full py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-white/10"
                            >
                                Compris
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default SchedulingPage;