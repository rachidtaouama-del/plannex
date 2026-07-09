import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
// FIX: Import EvaluationKpis type.
import type { CalculationResults, AppParameters, ScheduledTask, HotReviewState, SupplementaryTask, TeamDetail, SortableHotReviewKeys, EvaluationData, EvaluatedTaskData, SlippageDetails, TaskStatus, EventDetail, EvaluationKpis, OngoingProgress } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProfessionalGanttChart } from './ProfessionalGanttChart';
import ReactMarkdown from 'react-markdown';
import { ImpactAnalysisModal } from './ImpactAnalysisModal';
import { SuccessorsModal } from './SuccessorsModal';
import { AddTaskOutsideRangeModal } from './AddTaskOutsideRangeModal';
import { exportHotReviewToPDF } from '../services/hotReviewPdfExportService';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
    AreaChart,
    Area,
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    BarChart,
    Bar,
    Cell
} from 'recharts';


declare var html2canvas: any;

interface HotExecutionReviewProps {
    results: CalculationResults;
    parameters: AppParameters;
    evaluationData: EvaluationData;
    setEvaluationData: React.Dispatch<React.SetStateAction<EvaluationData | null>>;
    hotReviewState: HotReviewState;
    setHotReviewState: React.Dispatch<React.SetStateAction<HotReviewState>>;
    onBack: () => void;
    isColdStopFlow: boolean;
    // FIX: Add missing 'evaluationKpis' property to the interface.
    evaluationKpis: EvaluationKpis;
}

const toDateTimeLocalModal = (date: Date): string => {
    if (!date || isNaN(date.getTime())) return '';
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
};

interface EventDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (details: { incidents: EventDetail[], accidents: EventDetail[] }) => void;
    initialIncidents: EventDetail[];
    initialAccidents: EventDetail[];
    defaultDateTime: string;
}

interface EventListProps {
    currentList: EventDetail[];
    activeTab: 'incidents' | 'accidents';
    handleItemChange: (id: string, field: 'dateTime' | 'description', value: string) => void;
    handleItemDelete: (id: string) => void;
}

const EventList: React.FC<EventListProps> = ({ currentList, activeTab, handleItemChange, handleItemDelete }) => (
    <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
        {currentList.length === 0 && <p className="text-slate-400 text-center py-4">Aucun {activeTab === 'incidents' ? 'incident' : 'accident'} à détailler.</p>}
        {currentList.map((item, index) => (
            <div key={item.id} className="p-3 bg-slate-700/50 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                    <label className="block text-sm font-semibold text-slate-300">
                        {activeTab === 'incidents' ? 'Incident' : 'Accident'} #{index + 1}
                    </label>
                    <button
                        type="button"
                        onClick={() => handleItemDelete(item.id)}
                        className="p-1.5 bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white rounded-full transition-colors"
                        aria-label={`Supprimer ${activeTab === 'incidents' ? 'l\'incident' : 'l\'accident'} #${index + 1}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Date et Heure</label>
                        <input
                            type="datetime-local"
                            value={item.dateTime}
                            onChange={(e) => handleItemChange(item.id, 'dateTime', e.target.value)}
                            className="w-full bg-slate-600 border-slate-500 rounded px-2 py-1.5 text-sm"
                        />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-xs text-slate-400 mb-1">Description</label>
                        <textarea
                            value={item.description}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            placeholder="Description de l'événement..."
                            rows={3}
                            className="w-full bg-slate-600 border-slate-500 rounded px-2 py-1.5 text-sm"
                        />
                    </div>
                </div>
            </div>
        ))}
    </div>
);

const EventDetailModal: React.FC<EventDetailModalProps> = ({
    isOpen, onClose, onSave, initialIncidents, initialAccidents, defaultDateTime
}) => {
    const [activeTab, setActiveTab] = useState<'incidents' | 'accidents'>('incidents');
    const [incidents, setIncidents] = useState<EventDetail[]>(initialIncidents);
    const [accidents, setAccidents] = useState<EventDetail[]>(initialAccidents);

    useEffect(() => {
        if (isOpen) {
            setIncidents(initialIncidents);
            setAccidents(initialAccidents);
            // Default to incidents tab, or accidents if there are no incidents but there are accidents
            setActiveTab(initialIncidents.length > 0 ? 'incidents' : 'accidents');
        }
    }, [isOpen, initialIncidents, initialAccidents]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({ incidents, accidents });
        onClose();
    };

    const currentList = activeTab === 'incidents' ? incidents : accidents;
    const setList = activeTab === 'incidents' ? setIncidents : setAccidents;

    const handleItemChange = (id: string, field: 'dateTime' | 'description', value: string) => {
        setList(prevList => prevList.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleItemDelete = (id: string) => {
        setList(prevList => prevList.filter(item => item.id !== id));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[70] p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">Gestion des Incidents / Accidents</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
                </header>
                <div className="p-6">
                    <div className="flex mb-4 border-b border-slate-700">
                        <button onClick={() => setActiveTab('incidents')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'incidents' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'}`}>
                            Incidents ({incidents.length})
                        </button>
                        <button onClick={() => setActiveTab('accidents')} className={`py-2 px-4 text-sm font-medium ${activeTab === 'accidents' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'}`}>
                            Accidents ({accidents.length})
                        </button>
                    </div>
                    <EventList
                        currentList={currentList}
                        activeTab={activeTab}
                        handleItemChange={handleItemChange}
                        handleItemDelete={handleItemDelete}
                    />
                    <div className="flex justify-center mt-4">
                        <button
                            onClick={() => setList(prev => [...prev, { id: crypto.randomUUID(), dateTime: defaultDateTime || toDateTimeLocalModal(new Date()), description: '' }])}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
                        >
                            + Ajouter un {activeTab === 'incidents' ? 'Incident' : 'Accident'}
                        </button>
                    </div>
                </div>
                <footer className="flex justify-end p-4 border-t border-slate-700 space-x-4">
                    <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors">Annuler</button>
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Enregistrer</button>
                </footer>
            </div>
        </div>
    );
};

const KpiCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; onClick?: () => void; }> = ({ title, icon, children, onClick }) => (
    <div
        className={`bg-slate-800 p-6 rounded-lg shadow-lg flex items-center space-x-4 h-full ${onClick ? 'cursor-pointer hover:bg-slate-700 transition-colors' : ''}`}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
        <div className="bg-slate-900 p-3 rounded-full">{icon}</div>
        <div>
            <h3 className="text-sm font-medium text-slate-400">{title}</h3>
            <div className="mt-1">{children}</div>
        </div>
    </div>
);


const HIGH_CONTRAST_COLORS = [
    '#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00897B',
    '#FDD835', '#D81B60', '#546E7A', '#3949AB', '#039BE5', '#7CB342',
    '#F4511E', '#C0CA33', '#6D4C41', '#00ACC1', '#AFB42B', '#5E35B1'
];

const teams = ['Monteur Echaffaudage', 'Cleaner', 'Planificateur', 'Vulcanizer', 'Mécanicien', 'Chaudronnier', 'Electricien', 'Instrumentiste', 'Graisseur'];

const formatDateTime = (date: Date | null | undefined): string => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const DynamicInputList: React.FC<{
    label: string;
    items: string[];
    onItemsChange: (newItems: string[]) => void;
    placeholder: string;
}> = ({ label, items, onItemsChange, placeholder }) => {

    const handleItemChange = (index: number, value: string) => {
        const newItems = [...items];
        newItems[index] = value;
        onItemsChange(newItems);
    };

    const handleAddItem = () => {
        onItemsChange([...items, '']);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length > 1) {
            onItemsChange(items.filter((_, i) => i !== index));
        } else {
            onItemsChange(['']); // Keep one empty field
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">{label}</label>
            <div className="space-y-2">
                {items.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <input
                            type="text"
                            value={item}
                            onChange={(e) => handleItemChange(index, e.target.value)}
                            placeholder={`${placeholder} ${index + 1}`}
                            className="w-full bg-slate-700 border-slate-600 rounded-md px-3 py-2 text-slate-200 text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="p-2 bg-red-600/50 hover:bg-red-600 text-white rounded-md flex-shrink-0"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                    </div>
                ))}
            </div>
            <button type="button" onClick={handleAddItem} className="mt-2 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold py-1 px-3 rounded-md">
                + Ajouter
            </button>
        </div>
    );
};


const SlippageModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (details: SlippageDetails) => void;
    initialDetails?: SlippageDetails;
    slippageHours: number;
}> = ({ isOpen, onClose, onSave, initialDetails, slippageHours }) => {
    const [details, setDetails] = useState<Omit<SlippageDetails, 'lostHours'>>({ cause: [''], preventiveAction: [''], pilot: [''] });

    useEffect(() => {
        setDetails({
            cause: initialDetails?.cause && initialDetails.cause.length > 0 ? initialDetails.cause : [''],
            preventiveAction: initialDetails?.preventiveAction && initialDetails.preventiveAction.length > 0 ? initialDetails.preventiveAction : [''],
            pilot: initialDetails?.pilot && initialDetails.pilot.length > 0 ? initialDetails.pilot : [''],
        });
    }, [initialDetails, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({
            lostHours: slippageHours,
            cause: details.cause.filter(s => s.trim() !== ''),
            preventiveAction: details.preventiveAction.filter(s => s.trim() !== ''),
            pilot: details.pilot.filter(s => s.trim() !== ''),
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[70] p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg border border-slate-700" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white">Analyse de Glissement</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
                </header>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Perte en Heures</label>
                        <div className="w-full bg-slate-900/50 border-slate-600 rounded-md px-3 py-2 text-slate-200 font-mono">{slippageHours.toFixed(2)}h</div>
                    </div>
                    <DynamicInputList
                        label="Cause de Glissement"
                        items={details.cause}
                        onItemsChange={newItems => setDetails(d => ({ ...d, cause: newItems }))}
                        placeholder="Cause"
                    />
                    <DynamicInputList
                        label="Action Prise pour Éviter"
                        items={details.preventiveAction}
                        onItemsChange={newItems => setDetails(d => ({ ...d, preventiveAction: newItems }))}
                        placeholder="Action"
                    />
                    <DynamicInputList
                        label="Pilote de l'Action"
                        items={details.pilot}
                        onItemsChange={newItems => setDetails(d => ({ ...d, pilot: newItems }))}
                        placeholder="Pilote"
                    />
                </div>
                <footer className="flex justify-end p-4 border-t border-slate-700 space-x-4">
                    <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors">Annuler</button>
                    <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors">Enregistrer</button>
                </footer>
            </div>
        </div>
    );
};

const SupplementaryTaskModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: SupplementaryTask) => void;
    taskToEdit: SupplementaryTask | null;
    initialStartDate?: string;
    initialEndDate?: string;
    availableTeams?: string[];
}> = ({ isOpen, onClose, onSave, taskToEdit, initialStartDate, initialEndDate, availableTeams = [] }) => {
    const isEditing = !!taskToEdit;
    const [action, setAction] = useState('');
    const [equipment, setEquipment] = useState('');
    const [maintenanceType, setMaintenanceType] = useState<'Préventive' | 'Corrective'>('Corrective');
    const [teamDetails, setTeamDetails] = useState<TeamDetail[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const duration = useMemo(() => {
        if (!startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0;
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, [startDate, endDate]);

    useEffect(() => {
        setTeamDetails(currentDetails =>
            currentDetails.map(detail => ({
                ...detail,
                duration: duration,
                manHours: detail.manpower * duration,
            }))
        );
    }, [duration]);

    useEffect(() => {
        if (isOpen) {
            if (isEditing && taskToEdit) {
                setAction(taskToEdit.action);
                setEquipment(taskToEdit.equipment);
                setMaintenanceType(taskToEdit.maintenanceType);
                setStartDate(taskToEdit.startDate);
                setEndDate(taskToEdit.endDate);
                setTeamDetails(taskToEdit.teamDetails);
            } else {
                setAction('');
                setEquipment('');
                setMaintenanceType('Corrective');
                setStartDate(initialStartDate || '');
                setEndDate(initialEndDate || '');
                setTeamDetails([]);
            }
        }
    }, [isOpen, isEditing, taskToEdit, initialStartDate, initialEndDate]);

    const handleTeamDetailChange = (index: number, field: 'team' | 'manpower', value: string | number) => {
        setTeamDetails(currentDetails =>
            currentDetails.map((detail, i) => {
                if (i === index) {
                    const updatedDetail = { ...detail };
                    if (field === 'team') {
                        updatedDetail.team = value as string;
                    } else { // manpower
                        updatedDetail.manpower = Number(value) || 0;
                    }
                    updatedDetail.duration = duration;
                    updatedDetail.manHours = updatedDetail.manpower * duration;
                    return updatedDetail;
                }
                return detail;
            })
        );
    };

    const addTeamDetail = () => setTeamDetails([...teamDetails, { team: '', manpower: 1, duration: duration, manHours: duration }]);
    const removeTeamDetail = (index: number) => setTeamDetails(teamDetails.filter((_, i) => i !== index));

    const totalManHours = useMemo(() => teamDetails.reduce((sum, detail) => sum + detail.manHours, 0), [teamDetails]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!startDate || !endDate || duration <= 0) {
            showAlert("Veuillez définir une période de début et de fin valide pour la tâche.");
            return;
        }
        if (teamDetails.some(td => !td.team)) {
            showAlert("Veuillez sélectionner une équipe pour chaque ligne.");
            return;
        }
        onSave({
            id: isEditing && taskToEdit ? taskToEdit.id : crypto.randomUUID(),
            action,
            equipment,
            maintenanceType,
            teamDetails,
            totalManHours,
            startDate,
            endDate,
            duration,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-[150] p-4" onClick={onClose}>
            <div className="bg-slate-900/90 border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                {/* Header Section */}
                <header className="px-8 pt-8 pb-4 flex justify-between items-center relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full"></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-full"></span>
                            {isEditing ? 'Modifier la Tâche' : 'Travail Supplémentaire'}
                        </h2>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1 ml-4">Enregistrement d'un nouvel événement</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 relative z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                    {/* Combined datalist: static teams + project disciplines */}
                    <datalist id="team-discipline-datalist">
                        {Array.from(new Set([...teams, ...availableTeams].filter(Boolean))).map(t => (
                            <option key={t} value={t} />
                        ))}
                    </datalist>

                    <div className="space-y-8 pt-4">
                        {/* Basic Info Group */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Action / Désignation</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={action}
                                        onChange={e => setAction(e.target.value)}
                                        required
                                        placeholder="Décrivez le travail..."
                                        className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder:text-slate-600 font-medium"
                                    />
                                    <div className="absolute inset-0 rounded-2xl bg-blue-400/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity"></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Équipement</label>
                                <input
                                    type="text"
                                    value={equipment}
                                    onChange={e => setEquipment(e.target.value)}
                                    required
                                    placeholder="Nom de la machine..."
                                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                />
                            </div>
                        </div>

                        {/* Maintenance Type & Dates */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Type</label>
                                <div className="flex p-1 bg-slate-800/80 rounded-2xl border border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setMaintenanceType('Corrective')}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${maintenanceType === 'Corrective' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Corrective
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMaintenanceType('Préventive')}
                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${maintenanceType === 'Préventive' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        Préventive
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Début</label>
                                <input
                                    type="datetime-local"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                    required
                                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Fin</label>
                                <input
                                    type="datetime-local"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                    required
                                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-xs"
                                />
                            </div>
                        </div>

                        {/* Team Details Group */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-300">Composition de l'Équipe</label>
                                <div className="h-[1px] flex-1 bg-white/5 mx-4"></div>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Durée: {duration.toFixed(2)}h</span>
                            </div>

                            <div className="space-y-3">
                                {teamDetails.map((detail, index) => {
                                    const allKnownTeams = Array.from(new Set([...teams, ...availableTeams].filter(Boolean)));
                                    const isCustom = detail.team.trim().length > 0 && !allKnownTeams.some(t => t.toLowerCase() === detail.team.trim().toLowerCase());
                                    return (
                                        <div key={index} className={`group p-4 rounded-[1.5rem] border transition-all flex items-center gap-4 relative animate-in slide-in-from-left-4 duration-300 ${isCustom
                                            ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-400/40'
                                            : 'bg-white/5 border-white/5 hover:border-blue-500/30'
                                            }`}>
                                            <div className="flex-1 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Discipline / Équipe</p>
                                                    {isCustom && (
                                                        <span className="text-[8px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                                                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                                                            Personnalisé
                                                        </span>
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    list="team-discipline-datalist"
                                                    value={detail.team}
                                                    onChange={e => handleTeamDetailChange(index, 'team', e.target.value)}
                                                    className={`w-full bg-transparent border-b px-0 py-1 text-sm text-white transition-all font-bold placeholder:font-normal placeholder:text-slate-600 focus:outline-none ${isCustom
                                                        ? 'border-amber-500/40 focus:border-amber-400'
                                                        : 'border-white/10 focus:border-blue-500'
                                                        }`}
                                                    placeholder="Choisir ou saisir une discipline..."
                                                />
                                                {isCustom && (
                                                    <p className="text-[8px] text-amber-500/60 font-medium">
                                                        Discipline personnalisée — non présente dans le planning
                                                    </p>
                                                )}
                                            </div>
                                            <div className="w-20 space-y-2">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Effectif</p>
                                                <input
                                                    type="number"
                                                    value={detail.manpower}
                                                    onChange={e => handleTeamDetailChange(index, 'manpower', e.target.value)}
                                                    min="1"
                                                    className="w-full bg-black/20 border border-white/[0.06] rounded-xl px-3 py-1.5 text-xs text-white text-center font-bold focus:ring-1 focus:ring-blue-500/40 focus:outline-none transition-all"
                                                />
                                            </div>
                                            <div className="w-24 space-y-2">
                                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">Charges</p>
                                                <div className="w-full bg-black/20 rounded-xl px-3 py-1.5 text-[10px] text-blue-400 text-center font-mono font-black border border-blue-500/10">
                                                    {detail.manHours.toFixed(2)} HH
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeTeamDetail(index)}
                                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/10 flex-shrink-0"
                                                title="Supprimer"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                            </button>
                                        </div>
                                    );
                                })}

                                <button
                                    type="button"
                                    onClick={addTeamDetail}
                                    className="w-full py-4 rounded-[1.5rem] border-2 border-dashed border-white/5 text-slate-500 hover:text-blue-400 hover:bg-blue-400/5 hover:border-blue-400/30 transition-all font-black text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-3"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                    Affecter une Nouvelle Équipe
                                </button>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer / Summary Strip */}
                <footer className="px-8 py-6 bg-black/40 border-t border-white/5 flex items-center justify-between relative">
                    <div className="absolute inset-0 bg-blue-500/5 blur-[40px] opacity-50 pointer-events-none"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Charge Totale H-H</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-black text-white font-mono tracking-tighter">{totalManHours.toFixed(2)}</span>
                            <span className="text-blue-400 font-bold text-xs uppercase tracking-widest">Heures-Homme</span>
                        </div>
                    </div>

                    <div className="flex gap-4 relative z-10">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            onClick={(e) => {
                                // Manual submission trigger since button is outside form
                                (document.querySelector('form') as HTMLFormElement)?.requestSubmit();
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-black px-8 py-3 rounded-2xl shadow-xl shadow-blue-900/30 transform hover:-translate-y-0.5 active:translate-y-0 transition-all text-[10px] uppercase tracking-[0.2em]"
                        >
                            {isEditing ? 'Mettre à jour' : 'Confirmer la Tâche'}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};


const StatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
    const styles: Record<string, string> = {
        'À Faire': 'bg-slate-500/20 text-slate-400 border border-slate-500/20',
        'En Cours': 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]',
        'Fait': 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
        'Non Fait': 'bg-red-500/20 text-red-400 border border-red-500/30',
        'Annuler': 'bg-amber-500/20 text-amber-500 border border-amber-500/30',
    };
    return (
        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full transition-all duration-300 ${styles[status] || styles['À Faire']}`}>
            {status}
        </span>
    );
};

const TaskListModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    title: string;
    tasks: ScheduledTask[];
    evaluationData: EvaluationData;
}> = ({ isOpen, onClose, title, tasks, evaluationData }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex justify-center items-center z-[100] p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-8 border-b border-white/5 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-blue-400 border border-white/5">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20" /><path d="m17 7-5 5-5-5" /><path d="m17 13-5 5-5-5" /></svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">{title}</h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">{tasks.length} Tâches répertoriées</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all transform hover:rotate-90"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                        <thead className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px] sticky top-0 bg-slate-900 z-20 py-4">
                            <tr>
                                <th className="px-6 py-4">Désignation de l'Action</th>
                                <th className="px-6 py-4">Statut</th>
                                <th className="px-6 py-4">Réalisé (Début → Fin)</th>
                                <th className="px-6 py-4 text-right">Durée (h)</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {tasks.map(task => {
                                const status = evaluationData.tasks[task.id]?.status || 'À Faire';
                                const actualStart = evaluationData.tasks[task.id]?.actualStart;
                                const actualEnd = evaluationData.tasks[task.id]?.actualEnd;

                                return (
                                    <tr key={task.id} className="group bg-white/2 hover:bg-white/5 transition-all duration-200">
                                        <td className="px-6 py-5 rounded-l-2xl border-y border-l border-white/5 group-hover:border-white/10">
                                            <div className="font-bold text-white group-hover:text-blue-400 transition-colors">{task.action}</div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-1 font-medium">{task.equipment}</div>
                                        </td>
                                        <td className="px-6 py-5 border-y border-white/5 group-hover:border-white/10">
                                            <StatusBadge status={status as any} />
                                        </td>
                                        <td className="px-6 py-5 border-y border-white/5 group-hover:border-white/10 font-mono">
                                            {actualStart || actualEnd ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-xs text-blue-400 font-bold">{actualStart ? new Date(actualStart).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">→ {actualEnd ? new Date(actualEnd).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-600 italic text-xs">Dates non renseignées</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 rounded-r-2xl border-y border-r border-white/5 group-hover:border-white/10 text-right">
                                            <div className="font-mono font-black text-white text-lg">{task.duration.toFixed(2)}<span className="text-[10px] text-slate-500 ml-1">h</span></div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {tasks.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 bg-white/2 rounded-3xl border border-dashed border-white/10 mt-4">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center text-slate-600 mb-4">
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                            </div>
                            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Aucune donnée disponible</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};


const HotExecutionReview: React.FC<HotExecutionReviewProps> = ({ results, parameters, evaluationData, setEvaluationData, hotReviewState, setHotReviewState, onBack, isColdStopFlow, evaluationKpis }) => {
    const { startDate, endDate, dateFilteredTasks, selectedFamily, selectedEquipment, selectedDiscipline, selectedTeam, searchTerm, displayedStartDate, displayedEndDate, slippageAnalysis, sortConfig } = hotReviewState;

    const [evaluationHistory, setEvaluationHistory] = useState<EvaluationData[]>([]);

    const handleUndo = useCallback(() => {
        if (evaluationHistory.length === 0) return;
        setEvaluationData(evaluationHistory[evaluationHistory.length - 1]);
        setEvaluationHistory(prev => prev.slice(0, -1));
    }, [evaluationHistory, setEvaluationData]);

    const pushToHistory = useCallback((data: EvaluationData) => {
        setEvaluationHistory(prev => {
            const newHistory = [...prev, JSON.parse(JSON.stringify(data))];
            if (newHistory.length > 50) return newHistory.slice(-50); // Keep last 50 states
            return newHistory;
        });
    }, []);

    const supplementaryTasksInPeriod = useMemo(() => {
        if (!displayedStartDate || !displayedEndDate) return [];
        const startPeriodTs = new Date(displayedStartDate).getTime();
        const endPeriodTs = new Date(displayedEndDate).getTime();

        return evaluationData.supplementaryTasks.filter(task => {
            const taskStartTs = new Date(task.startDate).getTime();
            const taskEndTs = new Date(task.endDate).getTime();
            return taskStartTs < endPeriodTs && taskEndTs > startPeriodTs;
        });
    }, [evaluationData.supplementaryTasks, displayedStartDate, displayedEndDate]);

    const timeRangeDuration = useMemo(() => {
        if (!displayedStartDate || !displayedEndDate) return 0;
        const start = new Date(displayedStartDate);
        const end = new Date(displayedEndDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, [displayedStartDate, displayedEndDate]);

    const [isDownloading, setIsDownloading] = useState(false);

    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isSuppTaskModalOpen, setIsSuppTaskModalOpen] = useState(false);
    const [ganttStatusFilter, setGanttStatusFilter] = useState<'all' | 'done' | 'in-progress' | 'pending'>('all');
    const [chartIntervalHours, setChartIntervalHours] = useState(6);
    const [ganttFamilyOrder, setGanttFamilyOrder] = useState<string[]>([]);
    const [editingSuppTask, setEditingSuppTask] = useState<SupplementaryTask | null>(null);
    const [viewingTasksInfo, setViewingTasksInfo] = useState<{ title: string; tasks: ScheduledTask[] } | null>(null);
    const [isEditingActionPlan, setIsEditingActionPlan] = useState(true);

    const [isSlippageModalOpen, setIsSlippageModalOpen] = useState(false);
    const [isAddTaskOutsideRangeModalOpen, setIsAddTaskOutsideRangeModalOpen] = useState(false);
    const [editingTaskForSlippage, setEditingTaskForSlippage] = useState<{ id: number, slippageHours: number } | null>(null);

    const [taskForImpactAnalysis, setTaskForImpactAnalysis] = useState<{ task: ScheduledTask, slippage: number } | null>(null);
    const [viewingSuccessorsOf, setViewingSuccessorsOf] = useState<(typeof sortedTasksToDisplay[0]) | null>(null);

    const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
    const [trackingTaskId, setTrackingTaskId] = useState<number | null>(null);
    const [preEditTaskData, setPreEditTaskData] = useState<EvaluatedTaskData | null>(null);
    const [isInspectorModalOpen, setIsInspectorModalOpen] = useState(false);
    const [inspectorName, setInspectorName] = useState('');
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [alertMessage, setAlertMessage] = useState("");
    const [reportTitle, setReportTitle] = useState("Rapport de Quart - Évaluation à Chaud");
    const [toasts, setToasts] = useState<{ id: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }[]>([]);

    const showAlert = (message: string) => {
        setAlertMessage(message);
        setIsAlertModalOpen(true);
    };

    const taskProgressMapForGantt = useMemo(() => {
        const progressMap: Record<number, number> = {};
        const periodEndTs = displayedEndDate ? new Date(displayedEndDate).getTime() : new Date(parameters.shutdownEnd).getTime();
        const nowTimeForReport = periodEndTs;

        results.scheduledTasks.forEach(task => {
            const taskEval = evaluationData.tasks[task.id];
            const status = taskEval?.status || 'À Faire';

            if (status === 'Fait') {
                progressMap[task.id] = 100;
            } else if (status === 'En Cours') {
                if (taskEval?.actualProgress !== undefined) {
                    progressMap[task.id] = taskEval.actualProgress;
                } else {
                    const pStart = task.startTime.getTime();
                    const pEnd = task.endTime.getTime();
                    const totalPlannedDuration = Math.max(0.1, pEnd - pStart);

                    let progressPlanned = 0;
                    if (nowTimeForReport >= pEnd) {
                        progressPlanned = 100;
                    } else if (nowTimeForReport > pStart) {
                        progressPlanned = ((nowTimeForReport - pStart) / totalPlannedDuration) * 100;
                    }
                    progressMap[task.id] = progressPlanned;
                }
            } else if (status === 'À Faire' && (taskEval?.actualProgress || 0) > 0) {
                progressMap[task.id] = taskEval?.actualProgress || 0;
            } else {
                progressMap[task.id] = 0;
            }
        });
        return progressMap;
    }, [results.scheduledTasks, evaluationData.tasks, displayedEndDate, parameters]);

    const filteredGanttResults = useMemo(() => {
        const filteredTasks = results.scheduledTasks.filter(task => {
            const taskEval = evaluationData.tasks[task.id];
            const status = taskEval?.status || 'À Faire';
            const progress = taskEval?.actualProgress || 0;

            if (ganttStatusFilter === 'all') return true;
            if (ganttStatusFilter === 'done') return status === 'Fait' || progress >= 100;
            if (ganttStatusFilter === 'in-progress') return status === 'En Cours' || (progress > 0 && progress < 100);
            if (ganttStatusFilter === 'pending') return status === 'À Faire' && progress === 0;
            return true;
        });
        return { ...results, scheduledTasks: filteredTasks };
    }, [results, evaluationData.tasks, ganttStatusFilter]);

    const addToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => {
            // Avoid flooding with same message
            if (prev.some(t => t.message === message)) return prev;
            return [...prev, { id, message, type }];
        });
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const monitorTaskSlippageDelta = useCallback((taskId: number, oldData: EvaluatedTaskData | undefined, newData: EvaluatedTaskData) => {
        const task = results.scheduledTasks.find(t => t.id === taskId);
        if (!task) return;

        const getSlippage = (data: EvaluatedTaskData | undefined) => {
            if (!data || !data.actualEnd) return 0;
            const end = new Date(data.actualEnd).getTime();
            const originalEnd = task.endTime.getTime();
            return (end - originalEnd) / (1000 * 60 * 60);
        };

        const oldSlippage = getSlippage(oldData);
        const newSlippage = getSlippage(newData);

        if (newSlippage > oldSlippage + 0.1) {
            addToast(`⏰ Alerte Glissement : [${task.action}] prend du retard (+${(newSlippage - oldSlippage).toFixed(1)}h).`, 'warning');
        } else if (newSlippage < oldSlippage - 0.1) {
            if (newSlippage <= 0.01 && oldSlippage > 0.1) {
                addToast(`🚀 Bravo ! L'équipe a rattrapé le glissement sur [${task.action}].`, 'success');
            } else {
                addToast(`⚡ Effort Intense : L'équipe réduit le retard sur [${task.action}] de ${(oldSlippage - newSlippage).toFixed(1)}h.`, 'success');
            }
        }
    }, [results.scheduledTasks, addToast]);

    const handleStartTracking = (taskId: number) => {
        setPreEditTaskData(evaluationData.tasks[taskId] ? JSON.parse(JSON.stringify(evaluationData.tasks[taskId])) : null);
        setTrackingTaskId(taskId);
    };

    const handleCancelTracking = () => {
        if (trackingTaskId !== null) {
            setEvaluationData(prev => {
                if (!prev) return null;
                const newTasks = { ...prev.tasks };
                if (preEditTaskData) {
                    newTasks[trackingTaskId] = preEditTaskData;
                } else {
                    delete newTasks[trackingTaskId];
                }
                return { ...prev, tasks: newTasks };
            });
        }
        setTrackingTaskId(null);
        setPreEditTaskData(null);
    };


    const [now, setNow] = useState(new Date());

    const [isEventDetailModalOpen, setIsEventDetailModalOpen] = useState(false);
    const [showOnlyCurrentInProgress, setShowOnlyCurrentInProgress] = useState(false);

    const handleDownloadPDF = () => {
        if (!displayedStartDate || !displayedEndDate) {
            showAlert("Impossible de générer le rapport. Veuillez charger les tâches pour une période valide.");
            return;
        }
        setIsInspectorModalOpen(true);
    };

    const performExportPDF = async () => {
        if (!inspectorName) {
            showAlert("Veuillez saisir le nom du planificateur.");
            return;
        }

        const reportTitle = "Rapport de Quart - Évaluation à Chaud";
        setIsDownloading(true);
        setIsInspectorModalOpen(false);

        try {
            const doc = await exportHotReviewToPDF(
                reportTitle,
                inspectorName,
                evaluationData,
                hotReviewState,
                teamProgress,
                disciplineProgress,
                {
                    potentialSlippage: kpis.potentialSlippage,
                    globalCompletionRate: kpis.actualGlobalProgress,
                    completionRate: kpis.actualRealizationRate,
                    chargeSuppHH: kpis.supplementaryWorkCharge,
                    progressHistory: kpis.progressHistory,
                    plannedWorkCharge: kpis.plannedWorkCharge,
                    plannedWorkCount: kpis.plannedWorkCount,
                    supplementaryWorkCount: kpis.supplementaryWorkCount,
                    plannedVsSupplementaryChargeRatio: kpis.plannedVsSupplementaryChargeRatio,
                    plannedVsSupplementaryCountRatio: kpis.plannedVsSupplementaryCountRatio,
                    supplementaryResourcesByDiscipline: kpis.supplementaryResourcesByDiscipline,
                    extraWorkCharge: kpis.extraWorkCharge,
                    extraManHoursByDiscipline: kpis.extraManHoursByDiscipline
                },
                highRiskKpi,
                analyzedSlippageTasks,
                sortedTasksToDisplay,
                ongoingTasksProgress,
                now,
                results,
                parameters,
                disciplineColors,
                familyOptions.filter(f => f !== 'all'),
                isColdStopFlow
            );
            const fileName = `${reportTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
            doc.save(fileName);
        } catch (error) {
            console.error("Erreur lors de l'export PDF:", error);
            if (error instanceof Error) {
                showAlert(`Une erreur est survenue lors de la génération du rapport PDF: ${error.message}`);
            } else {
                showAlert("Une erreur est survenue lors de la génération du rapport PDF.");
            }
        } finally {
            setIsDownloading(false);
        }
    };

    useEffect(() => {
        const timerId = setInterval(() => setNow(new Date()), 60000); // Update every minute
        return () => clearInterval(timerId);
    }, []);

    const handleIncidentAccidentChange = (type: 'incidents' | 'accidents') => {
        // This function is now a proxy to open the modal
        setIsEventDetailModalOpen(true);
    };

    const handleSaveEventDetails = (details: { incidents: EventDetail[], accidents: EventDetail[] }) => {
        setEvaluationData(prev => {
            if (!prev) return null;
            return {
                ...prev,
                incidentDetails: details.incidents,
                accidentDetails: details.accidents,
            };
        });
    };

    const toDateTimeLocal = (date: Date): string => {
        if (!date || isNaN(date.getTime())) return '';
        const tzoffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
    };

    const handleResetFilters = () => {
        setHotReviewState(s => ({
            ...s,
            selectedFamily: 'all',
            selectedEquipment: 'all',
            selectedDiscipline: 'all',
            selectedTeam: 'all',
            searchTerm: '',
        }));
    };

    const handleReset = () => {
        setEvaluationData(prev => {
            if (!prev) return null;

            const initialTasks: Record<number, EvaluatedTaskData> = {};
            results.scheduledTasks.forEach(task => {
                initialTasks[task.id] = {
                    actualStart: toDateTimeLocal(task.startTime),
                    actualEnd: toDateTimeLocal(task.endTime),
                    status: 'À Faire',
                };
            });

            return {
                ...prev,
                tasks: initialTasks,
                supplementaryTasks: [],
                globalSlippageEvents: [],
                incidentDetails: [],
                accidentDetails: [],
            };
        });

        setHotReviewState(s => ({
            ...s,
            selectedFamily: 'all',
            selectedEquipment: 'all',
            searchTerm: '',
        }));
    };

    const handleApplyImpactAnalysis = (updatedTasks: { id: number, newStart: Date, newEnd: Date }[]) => {
        setEvaluationData(prev => {
            if (!prev) return null;
            const newTasksData = JSON.parse(JSON.stringify(prev.tasks));
            updatedTasks.forEach(({ id, newStart, newEnd }) => {
                if (newTasksData[id]) {
                    newTasksData[id].actualStart = toDateTimeLocal(newStart);
                    newTasksData[id].actualEnd = toDateTimeLocal(newEnd);
                }
            });
            return { ...prev, tasks: newTasksData };
        });
        setTaskForImpactAnalysis(null);
        setTrackingTaskId(null);
        setPreEditTaskData(null);
    };

    const propagateAllTaskDates = (tasksDataToPropagate: Record<number, EvaluatedTaskData>) => {
        const newTasksData = JSON.parse(JSON.stringify(tasksDataToPropagate));
        const effectiveEndTimes = new Map<number, Date>();

        const chronoSortedTasks = [...results.scheduledTasks].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

        const tasksByTeam = new Map<string, ScheduledTask[]>();
        chronoSortedTasks.forEach(task => {
            if (!tasksByTeam.has(task.team)) {
                tasksByTeam.set(task.team, []);
            }
            tasksByTeam.get(task.team)!.push(task);
        });

        for (const task of chronoSortedTasks) {
            let evalTaskData = newTasksData[task.id];
            if (!evalTaskData) {
                // IMPORTANT: If a task is not in the evaluation data yet, we treat it as 
                // 'À Faire' but we MUST propagate dates through it for an intelligent forecast.
                evalTaskData = {
                    actualStart: toDateTimeLocal(task.startTime),
                    actualEnd: toDateTimeLocal(task.endTime),
                    status: 'À Faire'
                };
                newTasksData[task.id] = evalTaskData;
            }

            let latestPredecessorEndTime = new Date(0);
            if (task.predecessor) {
                for (const predId of task.predecessor) {
                    const predEffectiveEnd = effectiveEndTimes.get(predId);
                    if (predEffectiveEnd && predEffectiveEnd.getTime() > latestPredecessorEndTime.getTime()) {
                        latestPredecessorEndTime = predEffectiveEnd;
                    }
                }
            }

            let resourcePredecessorEndTime = new Date(0);
            const teamTasks = tasksByTeam.get(task.team);
            if (teamTasks) {
                const taskIndexInTeam = teamTasks.findIndex(t => t.id === task.id);
                if (taskIndexInTeam > 0) {
                    const resourcePredTask = teamTasks[taskIndexInTeam - 1];
                    const resourcePredEffectiveEnd = effectiveEndTimes.get(resourcePredTask.id);
                    if (resourcePredEffectiveEnd) {
                        resourcePredecessorEndTime = resourcePredEffectiveEnd;
                    }
                }
            }

            const userActualStart = evalTaskData.actualStart ? new Date(evalTaskData.actualStart) : null;

            const dependencyStartTime = Math.max(latestPredecessorEndTime.getTime(), resourcePredecessorEndTime.getTime());

            let effectiveStart: Date;
            if (userActualStart) {
                effectiveStart = new Date(Math.max(userActualStart.getTime(), dependencyStartTime));
            } else {
                effectiveStart = dependencyStartTime > 0 ? new Date(dependencyStartTime) : task.startTime;
            }

            const userActualEnd = evalTaskData.actualEnd ? new Date(evalTaskData.actualEnd) : null;

            // INTELLIGENT DURATION: Calculate the task's estimated duration based on user edits
            // This preserves "ratrapage" (recoveries) even if predecessors move.
            let intendedDurationMs = task.duration * 60 * 60 * 1000;
            if (userActualStart && userActualEnd) {
                const diff = userActualEnd.getTime() - userActualStart.getTime();
                // For "Fait" we use the exact duration. 
                // For "En Cours" or "À Faire", we use the user-edited duration if valid.
                if (diff > 0) intendedDurationMs = diff;
            }

            let effectiveEnd: Date;
            if (evalTaskData.status === 'Fait') {
                // If finished, the actual record is the absolute truth
                effectiveEnd = userActualEnd || new Date(effectiveStart.getTime() + intendedDurationMs);
            } else {
                // For Ongoing or Future tasks, propagate using the (possibly recovered) duration
                effectiveEnd = new Date(effectiveStart.getTime() + intendedDurationMs);

                // Safety: If the user explicitly set an end date even later than propagation, respect it
                if (userActualEnd && userActualEnd.getTime() > effectiveEnd.getTime()) {
                    effectiveEnd = userActualEnd;
                }
            }

            effectiveEndTimes.set(task.id, effectiveEnd);

            newTasksData[task.id].actualStart = toDateTimeLocal(effectiveStart);
            newTasksData[task.id].actualEnd = toDateTimeLocal(effectiveEnd);
        }
        return newTasksData;
    };

    const handleLocalTaskDateChange = (taskId: number, field: 'actualStart' | 'actualEnd', value: string) => {
        pushToHistory(evaluationData);
        setEvaluationData(prev => {
            if (!prev) return null;
            const newTasksData = { ...prev.tasks };
            if (newTasksData[taskId]) {
                const updatedTask = { ...newTasksData[taskId], [field]: value };
                if (field === 'actualStart' && value) {
                    const originalTask = results.scheduledTasks.find(t => t.id === taskId);
                    if (originalTask) {
                        try {
                            const newStartDate = new Date(value);
                            const durationMs = originalTask.duration * 60 * 60 * 1000;
                            const newEndDate = new Date(newStartDate.getTime() + durationMs);
                            updatedTask.actualEnd = toDateTimeLocal(newEndDate);
                        } catch (e) { /* ignore invalid date string during input */ }
                    }
                }
                newTasksData[taskId] = updatedTask;
                // Monitor the date change impact
                monitorTaskSlippageDelta(taskId, prev.tasks[taskId], updatedTask);
            }
            return { ...prev, tasks: newTasksData };
        });
    };

    const handleApplyChanges = (taskId: number, tasksToUse?: Record<number, EvaluatedTaskData>) => {
        const originalTask = results.scheduledTasks.find(t => t.id === taskId);
        if (!originalTask) return;

        const propagatedTasks = propagateAllTaskDates(tasksToUse || evaluationData.tasks);

        const finalEndDate = new Date(propagatedTasks[taskId].actualEnd);
        const slippage = (finalEndDate.getTime() - originalTask.endTime.getTime()) / (1000 * 60 * 60);

        // INTELLIGENT CONFIRMATION: Show impact analysis for any significant change (Delay OR Recovery)
        if (Math.abs(slippage) > 0.05) {
            setTaskForImpactAnalysis({ task: originalTask, slippage });
        } else {
            setEvaluationData(prev => ({ ...prev!, tasks: propagatedTasks }));
            setTrackingTaskId(null);
            setPreEditTaskData(null);
        }
    };

    const handleResetTaskAndSuccessors = (startTaskId: number) => {
        setEvaluationData(prev => {
            if (!prev) return prev;

            const newTasksData = JSON.parse(JSON.stringify(prev.tasks));
            const tasksToReset = new Set<number>([startTaskId]);
            const queue = [startTaskId];

            while (queue.length > 0) {
                const currentId = queue.shift()!;
                const successors = results.scheduledTasks.filter(t => t.predecessor?.includes(currentId));

                for (const succ of successors) {
                    if (!tasksToReset.has(succ.id)) {
                        tasksToReset.add(succ.id);
                        queue.push(succ.id);
                    }
                }
            }

            tasksToReset.forEach(taskId => {
                const originalTask = results.scheduledTasks.find(t => t.id === taskId);
                if (originalTask) {
                    newTasksData[taskId].actualStart = toDateTimeLocal(originalTask.startTime);
                    newTasksData[taskId].actualEnd = toDateTimeLocal(originalTask.endTime);
                }
            });

            const finalPropagatedTasks = propagateAllTaskDates(newTasksData);

            return { ...prev, tasks: finalPropagatedTasks };
        });
    };

    const handleTaskStatusChange = (taskId: number, newStatus: TaskStatus) => {
        pushToHistory(evaluationData);
        setEvaluationData(prev => {
            if (!prev) return null;
            const newTasksData = JSON.parse(JSON.stringify(prev.tasks));
            if (newTasksData[taskId]) {
                newTasksData[taskId].status = newStatus;
            }
            return { ...prev, tasks: newTasksData };
        });
    };

    const handleBulkStatusChange = (newStatus: TaskStatus) => {
        if (!newStatus || selectedTaskIds.length === 0) return;
        pushToHistory(evaluationData);
        setEvaluationData(prev => {
            if (!prev) return null;
            const newTasksData = { ...prev.tasks };
            selectedTaskIds.forEach(taskId => {
                if (newTasksData[taskId]) {
                    newTasksData[taskId].status = newStatus;
                }
            });
            return { ...prev, tasks: newTasksData };
        });
        setSelectedTaskIds([]);
    };

    const handleAddTaskOutsideRange = (taskIds: number[], status: TaskStatus) => {
        pushToHistory(evaluationData);
        setHotReviewState(prev => ({
            ...prev,
            manuallyIncludedTaskIds: [...new Set([...prev.manuallyIncludedTaskIds, ...taskIds])]
        }));

        setEvaluationData(prev => {
            if (!prev) return null;
            const newTasks = { ...prev.tasks };
            taskIds.forEach(id => {
                if (!newTasks[id]) {
                    const originalTask = results.scheduledTasks.find(t => t.id === id);
                    if (originalTask) {
                        newTasks[id] = {
                            actualStart: toDateTimeLocal(originalTask.startTime),
                            actualEnd: toDateTimeLocal(originalTask.endTime),
                            status: status,
                        };
                    }
                } else {
                    newTasks[id].status = status;
                }
            });
            return { ...prev, tasks: newTasks };
        });

        addToast(`${taskIds.length} tâche(s) ajoutée(s) avec succès`, 'success');
    };

    const handleLoadTasks = () => {
        if (!startDate || !endDate) {
            showAlert("Veuillez sélectionner une période de début et de fin.");
            return;
        }
        const startPeriodTs = new Date(startDate).getTime();
        const endPeriodTs = new Date(endDate).getTime();

        const filtered = results.scheduledTasks.filter(task => {
            const taskStartTs = task.startTime.getTime();
            const taskEndTs = task.endTime.getTime();
            return taskStartTs < endPeriodTs && taskEndTs > startPeriodTs;
        });

        setHotReviewState(s => ({
            ...s,
            dateFilteredTasks: filtered,
            displayedStartDate: s.startDate,
            displayedEndDate: s.endDate,
        }));
    };

    const handleSaveSlippageDetails = (details: SlippageDetails) => {
        if (editingTaskForSlippage) {
            setEvaluationData(prev => {
                if (!prev) return null;
                const newTasks = {
                    ...prev.tasks,
                    [editingTaskForSlippage.id]: {
                        ...prev.tasks[editingTaskForSlippage.id],
                        slippageDetails: details,
                    }
                };
                return { ...prev, tasks: newTasks };
            });
        }
        setIsSlippageModalOpen(false);
        setEditingTaskForSlippage(null);
    };

    const { familyOptions, equipmentOptions, disciplineOptions, teamOptions } = useMemo(() => {
        const families = ['all', ...Array.from(new Set(results.scheduledTasks.map(t => t.family).filter(Boolean) as string[]))].sort();
        const disciplines = ['all', ...Array.from(new Set(results.scheduledTasks.map(t => t.discipline).filter(Boolean) as string[]))].sort();
        const teams = ['all', ...Array.from(new Set(results.scheduledTasks.map(t => t.team).filter(Boolean) as string[]))].sort();

        const filteredTasksForEquip = results.scheduledTasks.filter(t => {
            const familyMatch = selectedFamily === 'all' || t.family === selectedFamily;
            const disciplineMatch = selectedDiscipline === 'all' || t.discipline === selectedDiscipline;
            const teamMatch = selectedTeam === 'all' || t.team === selectedTeam;
            return familyMatch && disciplineMatch && teamMatch;
        });

        const equipments = ['all', ...Array.from(new Set(filteredTasksForEquip.map(t => t.equipment).filter(Boolean) as string[]))].sort();
        return { familyOptions: families, equipmentOptions: equipments, disciplineOptions: disciplines, teamOptions: teams };
    }, [results.scheduledTasks, selectedFamily, selectedDiscipline, selectedTeam]);

    // FIX: Moved 'allTasksInPeriod' useMemo hook before 'kpis' useMemo hook to fix a "used before its declaration" error.
    const allTasksInPeriod = useMemo(() => {
        const lowercasedSearchTerm = searchTerm.toLowerCase();

        // Combine date filtered tasks and manually included tasks
        const manualTasks = results.scheduledTasks.filter(t => hotReviewState.manuallyIncludedTaskIds.includes(t.id));
        const combinedTasks = [...dateFilteredTasks, ...manualTasks.filter(mt => !dateFilteredTasks.some(dt => dt.id === mt.id))];

        return combinedTasks.filter(task => {
            const familyMatch = selectedFamily === 'all' || task.family === selectedFamily;
            const equipmentMatch = selectedEquipment === 'all' || task.equipment === selectedEquipment;
            const disciplineMatch = selectedDiscipline === 'all' || task.discipline === selectedDiscipline;
            const teamMatch = selectedTeam === 'all' || task.team === selectedTeam;
            const searchMatch = lowercasedSearchTerm === '' ||
                (task.ot && String(task.ot).toLowerCase().includes(lowercasedSearchTerm)) ||
                (task.action && task.action.toLowerCase().includes(lowercasedSearchTerm)) ||
                (task.equipment && task.equipment.toLowerCase().includes(lowercasedSearchTerm)) ||
                (task.discipline && task.discipline.toLowerCase().includes(lowercasedSearchTerm)) ||
                (task.team && task.team.toLowerCase().includes(lowercasedSearchTerm));
            return familyMatch && equipmentMatch && disciplineMatch && teamMatch && searchMatch;
        });
    }, [dateFilteredTasks, hotReviewState.manuallyIncludedTaskIds, results.scheduledTasks, selectedFamily, selectedEquipment, selectedDiscipline, selectedTeam, searchTerm]);

    const allFamiliesForGantt = useMemo(() => {
        return Array.from(new Set(allTasksInPeriod.map(t => t.family).filter((f): f is string => !!f))).sort();
    }, [allTasksInPeriod]);

    const totalProjectManHours = useMemo(() => results.kpis.totalManHours, [results.kpis.totalManHours]);
    const totalProjectTasksCount = useMemo(() => results.scheduledTasks.length, [results.scheduledTasks.length]);

    const ongoingTasksProgress = useMemo(() => {
        if (!displayedStartDate || !displayedEndDate) return [];

        const periodStart = new Date(displayedStartDate).getTime();
        const periodEnd = new Date(displayedEndDate).getTime();
        const nowTimeForReport = periodEnd;

        const inProgressTasks: OngoingProgress[] = [];

        // Apply filters to all tasks to identify those that are late or ongoing
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        const filteredAllTasks = results.scheduledTasks.filter(task => {
            const familyMatch = selectedFamily === 'all' || task.family === selectedFamily;
            const equipmentMatch = selectedEquipment === 'all' || task.equipment === selectedEquipment;
            const disciplineMatch = selectedDiscipline === 'all' || task.discipline === selectedDiscipline;
            const teamMatch = selectedTeam === 'all' || task.team === selectedTeam;
            const searchMatch = lowercasedSearchTerm === '' ||
                (task.ot && String(task.ot).toLowerCase().includes(lowercasedSearchTerm)) ||
                (task.action && task.action.toLowerCase().includes(lowercasedSearchTerm)) ||
                (task.equipment && task.equipment.toLowerCase().includes(lowercasedSearchTerm));
            return familyMatch && equipmentMatch && disciplineMatch && teamMatch && searchMatch;
        });

        filteredAllTasks.forEach(task => {
            const evalData = evaluationData.tasks[task.id];
            const actualStartStr = evalData?.actualStart;
            const actualEndStr = evalData?.actualEnd;
            const status = evalData?.status || 'À Faire';

            if (status === 'Fait' || status === 'Annuler' || status === 'Non Fait') return;

            const pStart = task.startTime.getTime();
            const pEnd = task.endTime.getTime();
            const rStart = actualStartStr ? new Date(actualStartStr).getTime() : pStart;
            const rEnd = actualEndStr ? new Date(actualEndStr).getTime() : pEnd;

            if (isNaN(rStart) || isNaN(rEnd)) return;

            // Is it crossing the period end?
            const isOngoingAtPeriodEnd = nowTimeForReport >= rStart && nowTimeForReport < rEnd;
            // Is it a late task from a previous period that is still marked as 'En Cours'?
            const isLateAndEnCours = status === 'En Cours' && rEnd <= nowTimeForReport;
            // Is it a manually included task that is currently marked as 'En Cours'?
            const isManuallyOngoing = hotReviewState.manuallyIncludedTaskIds.includes(task.id) && status === 'En Cours';

            if (isOngoingAtPeriodEnd || isLateAndEnCours || isManuallyOngoing) {
                const totalPlannedDuration = Math.max(0.1, pEnd - pStart);

                // Planned Metrics (Static Reference based on original schedule)
                let progressPlanned = 0;
                if (nowTimeForReport >= pEnd) {
                    progressPlanned = 100;
                } else if (nowTimeForReport > pStart) {
                    progressPlanned = ((nowTimeForReport - pStart) / totalPlannedDuration) * 100;
                }
                const timeLeftPlannedMs = Math.max(0, pEnd - nowTimeForReport);
                const timeLeftPlannedHours = timeLeftPlannedMs / (1000 * 60 * 60);

                // Real Metrics (Actual/Forecast)
                const progressActual = evalData?.actualProgress ?? progressPlanned;
                const timeLeftActual = evalData?.actualRemainingTime ?? timeLeftPlannedHours;
                const actualEnd = new Date(nowTimeForReport + (timeLeftActual * 60 * 60 * 1000));

                // Effective duration contributed in the current shift (for internal tracking)
                const intersectionStart = Math.max(pStart, periodStart);
                const intersectionEnd = Math.min(pEnd, periodEnd);
                const durationInPeriodMs = Math.max(0, intersectionEnd - intersectionStart);

                // NEW COLUMNS DATA
                const realAtteint = task.manHours * (progressActual / 100);
                const tacticalRealization = progressPlanned > 0 ? (progressActual / progressPlanned) * 100 : (progressActual > 0 ? 100 : 0);

                inProgressTasks.push({
                    task: task,
                    durationInPeriod: durationInPeriodMs / (1000 * 60 * 60),
                    progressPlanned: progressPlanned,
                    progressActual: progressActual,
                    timeLeftPlanned: timeLeftPlannedHours,
                    timeLeftActual: timeLeftActual,
                    status: status,
                    actualEnd: actualEnd,
                    realAtteint: realAtteint,
                    tacticalRealization: Math.min(100, tacticalRealization)
                });
            }
        });

        return inProgressTasks.sort((a, b) => a.task.startTime.getTime() - b.task.startTime.getTime());
    }, [results.scheduledTasks, displayedStartDate, displayedEndDate, evaluationData.tasks, selectedFamily, selectedEquipment, selectedDiscipline, selectedTeam, searchTerm, hotReviewState.manuallyIncludedTaskIds]);

    const sortedTasksToDisplay = useMemo(() => {
        const predecessorEndTimes = new Map<number, Date>();
        allTasksInPeriod.forEach(task => {
            const evalData = evaluationData.tasks[task.id];
            if (evalData?.actualEnd) {
                predecessorEndTimes.set(task.id, new Date(evalData.actualEnd));
            }
        });

        const enhancedTasks = allTasksInPeriod.map(task => {
            const evalData = evaluationData.tasks[task.id];
            const actualStartStr = evalData?.actualStart;
            const actualEndStr = evalData?.actualEnd;

            const actualStart = actualStartStr ? new Date(actualStartStr) : task.startTime;
            let actualEnd = actualEndStr ? new Date(actualEndStr) : task.endTime;

            const evaluationPoint = displayedEndDate ? new Date(displayedEndDate).getTime() : now.getTime();

            if (!actualEndStr && evalData?.actualRemainingTime !== undefined) {
                actualEnd = new Date(evaluationPoint + evalData.actualRemainingTime * 60 * 60 * 1000);
            }

            const actualDuration = (actualEnd.getTime() - actualStart.getTime()) / (1000 * 60 * 60);
            const slippage = (actualEnd.getTime() - task.endTime.getTime()) / (1000 * 60 * 60);
            const actualProgress = evalData?.actualProgress;

            let isStartPropagated = false;
            if (task.predecessor && task.predecessor.length > 0) {
                let latestPredEnd = new Date(0);
                task.predecessor.forEach(predId => {
                    const predEndTime = predecessorEndTimes.get(predId);
                    if (predEndTime && predEndTime.getTime() > latestPredEnd.getTime()) {
                        latestPredEnd = predEndTime;
                    }
                });

                if (latestPredEnd.getTime() > 0 && Math.abs(actualStart.getTime() - latestPredEnd.getTime()) < 1000) {
                    if (actualStart.getTime() > task.startTime.getTime()) {
                        isStartPropagated = true;
                    }
                }
            }

            return {
                ...task,
                actualStart: actualStartStr,
                actualEnd: actualEndStr,
                actualDuration,
                actualProgress,
                slippage,
                isStartPropagated
            };
        });

        if (sortConfig.key !== null) {
            enhancedTasks.sort((a, b) => {
                const aValue = a[sortConfig.key! as keyof typeof a];
                const bValue = b[sortConfig.key! as keyof typeof b];

                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;

                if (typeof aValue === 'string' && (a.actualStart === aValue || a.actualEnd === aValue)) {
                    const dateA = new Date(aValue).getTime();
                    const dateB = new Date(bValue as string).getTime();
                    if (isNaN(dateA)) return 1; if (isNaN(dateB)) return -1;
                    return sortConfig.direction === 'ascending' ? dateA - dateB : dateB - dateA;
                }

                if (aValue instanceof Date && bValue instanceof Date) {
                    return sortConfig.direction === 'ascending' ? aValue.getTime() - bValue.getTime() : bValue.getTime() - aValue.getTime();
                }

                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortConfig.direction === 'ascending' ? aValue - bValue : bValue - aValue;
                }

                const stringA = String(aValue).toLowerCase();
                const stringB = String(bValue).toLowerCase();
                if (stringA < stringB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (stringA > stringB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }

        const ongoingIds = new Set(ongoingTasksProgress.map(o => o.task.id));
        return enhancedTasks.filter(t => !ongoingIds.has(t.id));
    }, [allTasksInPeriod, sortConfig, evaluationData, ongoingTasksProgress, now, displayedEndDate]);

    const analyzedSlippageTasks = useMemo(() => {
        return sortedTasksToDisplay
            .filter(task => evaluationData.tasks[task.id]?.slippageDetails && (evaluationData.tasks[task.id]?.slippageDetails?.cause.length ?? 0) > 0)
            .map(task => ({
                ...task,
                details: evaluationData.tasks[task.id].slippageDetails!
            }));
    }, [sortedTasksToDisplay, evaluationData.tasks]);

    const kpis: EvaluationKpis = useMemo(() => {
        const periodStartTs = new Date(displayedStartDate || parameters.shutdownStart).getTime();
        const periodEndTs = new Date(displayedEndDate || parameters.shutdownEnd).getTime();
        const shutdownStartTs = new Date(parameters.shutdownStart).getTime();
        const shutdownEndTs = new Date(parameters.shutdownEnd).getTime();

        const plannedManHoursToDate = results.scheduledTasks.reduce((sum, t) => {
            const taskStart = t.startTime.getTime();
            const taskEnd = t.endTime.getTime();
            let plannedProg = 0;
            if (periodEndTs >= taskEnd) plannedProg = 100;
            else if (periodEndTs > taskStart) {
                plannedProg = ((periodEndTs - taskStart) / (taskEnd - taskStart)) * 100;
            }
            return sum + (t.manHours * (plannedProg / 100));
        }, 0);

        const plannedGlobalProgress = totalProjectManHours > 0
            ? (plannedManHoursToDate / totalProjectManHours) * 100 : 0;

        const actualManHoursDone = results.scheduledTasks.reduce((sum, t) => {
            const evalT = evaluationData.tasks[t.id];
            let progress = 0;

            const ongoingInTable = ongoingTasksProgress.find(o => o.task.id === t.id);

            if (evalT) {
                if (evalT.status === 'Fait') progress = 100;
                else if (evalT.status === 'À Faire') progress = 0;
                else if (evalT.status === 'Non Fait') progress = 0;
                else if (evalT.status === 'Annuler') progress = 0;
                else {
                    // En Cours
                    if (evalT.actualProgress !== undefined) {
                        progress = evalT.actualProgress;
                    } else if (ongoingInTable) {
                        progress = ongoingInTable.progressPlanned;
                    } else {
                        // User hasn't edited progress, and it's not marked ongoing in current view/period logic
                        if (t.endTime.getTime() < periodStartTs) progress = 100;
                        else progress = 0;
                    }
                }
            } else {
                // No user override
                if (ongoingInTable) {
                    progress = ongoingInTable.progressPlanned;
                } else if (t.endTime.getTime() < periodStartTs) {
                    progress = 100;
                } else {
                    progress = 0;
                }
            }
            return sum + (t.manHours * (progress / 100));
        }, 0);

        const actualGlobalProgress = totalProjectManHours > 0
            ? (actualManHoursDone / totalProjectManHours) * 100 : 0;

        const plannedRealizationRate = 100;
        const actualRealizationRate = plannedManHoursToDate > 0
            ? (actualManHoursDone / plannedManHoursToDate) * 100 : 0;

        // INTELLIGENT FORECAST: Propagate all task dependencies in real-time to see global impact
        const forecastedTasks = propagateAllTaskDates(evaluationData.tasks);

        let latestActualEndInProject = 0;
        let criticalTaskName = "";
        Object.entries(forecastedTasks as Record<string, import("../types").EvaluatedTaskData>).forEach(([id, t]) => {
            if (t.actualEnd) {
                const end = new Date(t.actualEnd).getTime();
                if (!isNaN(end) && end > latestActualEndInProject) {
                    latestActualEndInProject = end;
                    const originalTask = results.scheduledTasks.find(st => st.id === Number(id));
                    criticalTaskName = originalTask?.action || "Tâche inconnue";
                }
            }
        });

        const potentialSlippage = (latestActualEndInProject > shutdownEndTs)
            ? (latestActualEndInProject - shutdownEndTs) / (1000 * 60 * 60)
            : 0;

        const timeRangeEvaluated = `${formatDateTime(new Date(periodStartTs))} - ${formatDateTime(new Date(periodEndTs))}`;

        const plannedWorkCharge = allTasksInPeriod.reduce((sum, t) => sum + t.manHours, 0);
        const plannedWorkCount = allTasksInPeriod.length;

        const supplementaryWorkCharge = supplementaryTasksInPeriod.reduce((sum, t) => sum + t.totalManHours, 0);
        const supplementaryWorkCount = supplementaryTasksInPeriod.length;

        // --- CALCULATION OF EXTRA HH (Manpower Overruns on Planned Tasks) ---
        let extraWorkCharge = 0;
        const extraManHoursByDiscipline: Record<string, number> = {};

        allTasksInPeriod.forEach(t => {
            const evalT = evaluationData.tasks[t.id];
            if (evalT?.actualManpower && evalT.actualManpower > t.manpower) {
                const actualStartStr = evalT.actualStart || toDateTimeLocal(t.startTime);
                const actualEndStr = evalT.actualEnd || toDateTimeLocal(t.endTime);
                const start = new Date(actualStartStr).getTime();
                const end = new Date(actualEndStr).getTime();
                const duration = Math.max(0, (end - start) / (1000 * 60 * 60));

                const extra = (evalT.actualManpower - t.manpower) * duration;
                extraWorkCharge += extra;

                const disc = t.discipline || 'Autres';
                extraManHoursByDiscipline[disc] = (extraManHoursByDiscipline[disc] || 0) + extra;
            }
        });

        const plannedVsSupplementaryCountRatio = plannedWorkCount > 0 ? (supplementaryWorkCount / plannedWorkCount) * 100 : 0;
        const totalOverloadCharge = supplementaryWorkCharge + extraWorkCharge;
        const plannedVsSupplementaryChargeRatio = plannedWorkCharge > 0 ? (totalOverloadCharge / plannedWorkCharge) * 100 : 0;
        const plannedVsSupplementaryRateRatio = plannedGlobalProgress > 0 ? (totalOverloadCharge / plannedWorkCharge * 100) : 0;

        const supplementaryManHoursByDiscipline: Record<string, number> = {};
        supplementaryTasksInPeriod.forEach(task => {
            task.teamDetails.forEach(detail => {
                const disc = detail.team;
                supplementaryManHoursByDiscipline[disc] = (supplementaryManHoursByDiscipline[disc] || 0) + detail.manHours;
            });
        });

        const progressHistory: { timestamp: string; planned: number; actual: number; plannedCount: number; actualCount: number; }[] = [];
        const stepMs = chartIntervalHours * 60 * 60 * 1000;
        const totalTaskCount = results.scheduledTasks.length;

        for (let time = shutdownStartTs; time <= shutdownEndTs + stepMs; time += stepMs) {
            let plannedHours = 0;
            let actualHours = 0;
            let plannedTasks = 0;
            let actualTasks = 0;

            results.scheduledTasks.forEach(t => {
                const pStart = t.startTime.getTime();
                const pEnd = t.endTime.getTime();

                if (time >= pEnd) {
                    plannedHours += t.manHours;
                    plannedTasks++;
                } else if (time > pStart) {
                    plannedHours += t.manHours * ((time - pStart) / (pEnd - pStart));
                }

                const evalT = evaluationData.tasks[t.id];
                const status = evalT?.status || 'À Faire';
                const progress = evalT?.actualProgress !== undefined ? evalT.actualProgress : (status === 'Fait' ? 100 : 0);

                // For history, we'd need snapshots, but here we estimate based on final actual dates
                const aStart = evalT?.actualStart ? new Date(evalT.actualStart).getTime() : pStart;
                const aEnd = evalT?.actualEnd ? new Date(evalT.actualEnd).getTime() : pEnd;

                if (time >= aEnd && status === 'Fait') {
                    actualHours += t.manHours;
                    actualTasks++;
                } else if (time > aStart && time < aEnd) {
                    actualHours += t.manHours * ((time - aStart) / (aEnd - aStart));
                }
            });

            progressHistory.push({
                timestamp: new Date(time).toISOString(),
                planned: totalProjectManHours > 0 ? (plannedHours / totalProjectManHours) * 100 : 0,
                actual: totalProjectManHours > 0 ? (actualHours / totalProjectManHours) * 100 : 0,
                plannedCount: plannedTasks,
                actualCount: actualTasks
            });
        }

        return {
            plannedShutdownDuration: (shutdownEndTs - shutdownStartTs) / (1000 * 60 * 60),
            actualShutdownDuration: (latestActualEndInProject - shutdownStartTs) / (1000 * 60 * 60),
            totalSlippage: potentialSlippage,
            completionRate: actualRealizationRate,
            plannedGlobalProgress,
            actualGlobalProgress,
            plannedRealizationRate,
            actualRealizationRate,
            potentialSlippage,
            timeRangeEvaluated,
            plannedWorkCharge,
            supplementaryWorkCharge,
            extraWorkCharge,
            plannedWorkCount,
            supplementaryWorkCount,
            plannedVsSupplementaryCountRatio,
            plannedVsSupplementaryChargeRatio,
            plannedVsSupplementaryRateRatio,
            supplementaryResourcesByDiscipline: supplementaryManHoursByDiscipline,
            extraManHoursByDiscipline,
            progressHistory,
            criticalTaskName,
            completedTasks: results.scheduledTasks.filter(t => {
                const evalT = evaluationData.tasks[t.id];
                if (evalT?.status === 'Fait') return true;
                if (!evalT && t.endTime.getTime() < periodStartTs) return true;
                return false;
            }).length,
            uncompletedTasks: totalProjectTasksCount - results.scheduledTasks.filter(t => {
                const evalT = evaluationData.tasks[t.id];
                if (evalT?.status === 'Fait') return true;
                if (!evalT && t.endTime.getTime() < periodStartTs) return true;
                return false;
            }).length,
            totalPlannedTasks: totalProjectTasksCount,
            supplementaryCharge: supplementaryWorkCharge,
            completionByDiscipline: {},
            completionByTeam: {},
            supplementaryTasksCount: supplementaryWorkCount,
            slippageRate: potentialSlippage,
            supplementaryWorkRate: ((supplementaryWorkCharge + extraWorkCharge) / totalProjectManHours) * 100,
            incidents: (evaluationData.incidentDetails || []).length,
            accidents: (evaluationData.accidentDetails || []).length
        };
    }, [results, evaluationData, parameters, displayedStartDate, displayedEndDate, allTasksInPeriod, supplementaryTasksInPeriod, ongoingTasksProgress, totalProjectManHours, totalProjectTasksCount, chartIntervalHours]);

    const handleConfirmTask = (taskId: number) => {
        pushToHistory(evaluationData);
        setEvaluationData(prev => {
            if (!prev) return null;
            const task = results.scheduledTasks.find(t => t.id === taskId);
            if (!task) return prev;

            const o = ongoingTasksProgress.find(op => op.task.id === taskId);
            if (!o) return prev;

            const currentTask = prev.tasks[taskId] || { actualStart: '', actualEnd: '', status: 'En Cours' };

            // Calculate progress and remaining time values like handleOngoingProgressChange
            const evaluationPoint = displayedEndDate ? new Date(displayedEndDate).getTime() : now.getTime();
            const actualStartStr = currentTask.actualStart || toDateTimeLocal(task.startTime);
            const actualEnd = o.actualEnd ? o.actualEnd : task.endTime;
            const progress = o.progressActual;
            const remaining = o.timeLeftActual;

            const updatedTask: EvaluatedTaskData = {
                ...currentTask,
                actualStart: actualStartStr,
                actualEnd: toDateTimeLocal(actualEnd),
                actualProgress: progress,
                actualRemainingTime: remaining,
                isConfirmed: true,
                status: progress >= 100 ? 'Fait' : 'En Cours'
            };

            const updatedTasks = {
                ...prev.tasks,
                [taskId]: updatedTask
            };

            const propagatedTasks = propagateAllTaskDates(updatedTasks);

            // Trigger impact analysis or direct save
            setTimeout(() => {
                handleApplyChanges(taskId, propagatedTasks);
            }, 0);

            return { ...prev, tasks: propagatedTasks };
        });
    };

    const handleConfirmAllOngoing = () => {
        pushToHistory(evaluationData);
        setEvaluationData(prev => {
            if (!prev) return null;
            const newTasks = { ...prev.tasks };
            ongoingTasksProgress.forEach(o => {
                const taskId = o.task.id;
                const task = o.task;
                const currentTask = newTasks[taskId] || { actualStart: '', actualEnd: '', status: 'En Cours' };

                const actualStartStr = currentTask.actualStart || toDateTimeLocal(task.startTime);
                const actualEnd = o.actualEnd;
                const progress = o.progressActual;
                const remaining = o.timeLeftActual;

                newTasks[taskId] = {
                    ...currentTask,
                    actualStart: actualStartStr,
                    actualEnd: toDateTimeLocal(actualEnd),
                    actualProgress: progress,
                    actualRemainingTime: remaining,
                    isConfirmed: true,
                    status: progress >= 100 ? 'Fait' : 'En Cours'
                };
            });

            const propagatedTasks = propagateAllTaskDates(newTasks);
            return { ...prev, tasks: propagatedTasks };
        });
    };

    const requestSort = (key: SortableHotReviewKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setHotReviewState(s => ({ ...s, sortConfig: { key, direction } }));
    };


    const handleOngoingProgressChange = (taskId: number, field: 'actualProgress' | 'actualRemainingTime', value: number) => {
        const task = results.scheduledTasks.find(t => t.id === taskId);
        if (!task) return;

        pushToHistory(evaluationData);
        setEvaluationData(prev => {
            const currentTask = prev.tasks[taskId] || { actualStart: '', actualEnd: '', status: 'En Cours' };
            const updatedTask = { ...currentTask, [field]: value };

            const evaluationPoint = displayedEndDate ? new Date(displayedEndDate).getTime() : now.getTime();
            const actualStartStr = updatedTask.actualStart;
            const taskStart = actualStartStr ? new Date(actualStartStr).getTime() : task.startTime.getTime();

            // Work done (hours) from start to evaluation point
            const workDoneHours = Math.max(0, (evaluationPoint - taskStart) / (1000 * 60 * 60));
            const plannedDuration = (task.endTime.getTime() - task.startTime.getTime()) / (1000 * 60 * 60);

            if (field === 'actualRemainingTime') {
                // If user enters Remaining Time (R)
                const R = Math.max(0, value);
                // If we have work done, we can estimate progress against the new estimated total duration
                if (workDoneHours > 0) {
                    updatedTask.actualProgress = (workDoneHours / (workDoneHours + R)) * 100;
                } else {
                    // If no work done yet, use planned duration as reference
                    updatedTask.actualProgress = plannedDuration > 0 ? (1 - R / plannedDuration) * 100 : 0;
                }
                // Cap progress between 0 and 99.9 if not finished
                if (R > 0) updatedTask.actualProgress = Math.min(99.9, Math.max(0, updatedTask.actualProgress));
                else updatedTask.actualProgress = 100;
            }
            else if (field === 'actualProgress') {
                // If user enters Progress (P)
                const P = Math.min(100, Math.max(0, value));
                if (P >= 100) {
                    updatedTask.actualRemainingTime = 0;
                    updatedTask.status = 'Fait';
                    if (!updatedTask.actualEnd) {
                        updatedTask.actualEnd = new Date(evaluationPoint).toISOString();
                    }
                } else if (P > 0) {
                    if (workDoneHours > 0) {
                        // Total Duration estimated = Done / (P/100)
                        const estimatedTotal = workDoneHours / (P / 100);
                        updatedTask.actualRemainingTime = Math.max(0, estimatedTotal - workDoneHours);
                    } else {
                        // Use planned duration
                        updatedTask.actualRemainingTime = plannedDuration * (1 - P / 100);
                    }
                } else {
                    // P = 0
                    updatedTask.actualRemainingTime = plannedDuration;
                }
            }

            // Sync status and set confirmed
            updatedTask.isConfirmed = true;

            // Calculate actualEnd for ongoing tasks based on estimated total duration
            if (updatedTask.actualRemainingTime !== undefined && updatedTask.status !== 'Fait') {
                const estimatedEnd = new Date(evaluationPoint + updatedTask.actualRemainingTime * 60 * 60 * 1000);
                updatedTask.actualEnd = toDateTimeLocal(estimatedEnd);
            }

            if (updatedTask.actualProgress !== undefined && updatedTask.actualProgress >= 100) {
                updatedTask.status = 'Fait';
                if (!updatedTask.actualEnd || updatedTask.actualProgress === 100) {
                    updatedTask.actualEnd = toDateTimeLocal(new Date(evaluationPoint));
                }
                updatedTask.actualRemainingTime = 0;
            } else if (updatedTask.actualProgress !== undefined && updatedTask.actualProgress > 0) {
                if (updatedTask.status === 'À Faire' || updatedTask.status === 'Fait') {
                    updatedTask.status = 'En Cours';
                }
            }

            // Monitor if this change affects slippage
            monitorTaskSlippageDelta(taskId, currentTask, updatedTask);

            return {
                ...prev,
                tasks: {
                    ...prev.tasks,
                    [taskId]: updatedTask
                }
            };
        });
    };

    useEffect(() => {
        // Deselect tasks that are no longer visible after filtering
        const visibleIds = new Set(sortedTasksToDisplay.map(t => t.id));
        setSelectedTaskIds(prev => prev.filter(id => visibleIds.has(id)));
    }, [sortedTasksToDisplay]);

    const tasksInProgress = useMemo(() => {
        const nowTime = now.getTime();

        return results.scheduledTasks
            .map(task => {
                const evalData = evaluationData.tasks[task.id];
                return { ...task, actualStart: evalData.actualStart, actualEnd: evalData.actualEnd };
            })
            .filter(task => {
                if (!task.actualStart || !task.actualEnd) return false;
                const actualStartTime = new Date(task.actualStart).getTime();
                const actualEndTime = new Date(task.actualEnd).getTime();
                return nowTime >= actualStartTime && nowTime < actualEndTime;
            })
            .map(task => {
                const actualStartTime = new Date(task.actualStart!).getTime();
                const actualEndTime = new Date(task.actualEnd!).getTime();
                const totalDuration = actualEndTime - actualStartTime;
                const elapsed = nowTime - actualStartTime;
                const progress = totalDuration > 0 ? Math.round((elapsed / totalDuration) * 100) : 0;
                return { ...task, theoreticalProgress: progress };
            })
            .sort((a, b) => new Date(a.actualEnd!).getTime() - new Date(b.actualEnd!).getTime());
    }, [now, results.scheduledTasks, evaluationData.tasks]);

    const highRiskKpi = useMemo(() => {
        // Use allTasksInPeriod which is already filtered for the selected date range
        const highRiskTasksInPeriod = allTasksInPeriod.filter(t => t.isHighRisk);

        if (highRiskTasksInPeriod.length === 0) {
            return { total: 0, completed: 0, progress: 0, tasks: [] as ScheduledTask[] };
        }

        const completedInPeriod = highRiskTasksInPeriod.filter(t => evaluationData.tasks[t.id]?.status === 'Fait').length;

        return {
            total: highRiskTasksInPeriod.length,
            completed: completedInPeriod,
            progress: highRiskTasksInPeriod.length > 0 ? (completedInPeriod / highRiskTasksInPeriod.length) * 100 : 0,
            tasks: highRiskTasksInPeriod, // Also update the task list for the modal
        };
    }, [allTasksInPeriod, evaluationData.tasks]);

    const teamProgress = useMemo(() => {
        const byTeam = new Map<string, { totalManHours: number; completedManHours: number; tasks: ScheduledTask[] }>();
        allTasksInPeriod.forEach(task => {
            if (!byTeam.has(task.team)) {
                byTeam.set(task.team, { totalManHours: 0, completedManHours: 0, tasks: [] });
            }
            const teamData = byTeam.get(task.team)!;
            teamData.totalManHours += task.manHours;
            teamData.tasks.push(task);
            if (evaluationData.tasks[task.id]?.status === 'Fait') {
                teamData.completedManHours += task.manHours;
            }
        });
        return Array.from(byTeam.entries()).map(([name, data]) => ({
            name,
            progress: data.totalManHours > 0 ? (data.completedManHours / data.totalManHours) * 100 : 0,
            tasks: data.tasks,
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [allTasksInPeriod, evaluationData.tasks]);

    const disciplineProgress = useMemo(() => {
        // Global advancement per discipline across the ENTIRE shutdown (not just the current period)
        const byDiscipline = new Map<string, { totalManHours: number; completedManHours: number; tasks: ScheduledTask[] }>();
        results.scheduledTasks.forEach(task => {
            const discipline = task.discipline || 'Autres';
            if (!byDiscipline.has(discipline)) {
                byDiscipline.set(discipline, { totalManHours: 0, completedManHours: 0, tasks: [] });
            }
            const disciplineData = byDiscipline.get(discipline)!;
            disciplineData.totalManHours += task.manHours;
            disciplineData.tasks.push(task);

            const evalT = evaluationData.tasks[task.id];
            if (evalT?.status === 'Fait') {
                disciplineData.completedManHours += task.manHours;
            } else if (evalT?.actualProgress !== undefined && evalT.actualProgress > 0) {
                // Count partial progress for in-progress tasks
                disciplineData.completedManHours += task.manHours * (evalT.actualProgress / 100);
            }
        });
        return Array.from(byDiscipline.entries()).map(([name, data]) => ({
            name,
            progress: data.totalManHours > 0 ? (data.completedManHours / data.totalManHours) * 100 : 0,
            tasks: data.tasks,
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [results.scheduledTasks, evaluationData.tasks]);

    const [disciplineColors, setDisciplineColors] = useState<Map<string, string>>(new Map());
    useEffect(() => {
        const disciplines = [...new Set(results.scheduledTasks.map(t => (t.team.split(' ')[0] || t.team)))].sort();
        const initialColorMap = new Map<string, string>();
        disciplines.forEach((discipline, index) => initialColorMap.set(discipline, HIGH_CONTRAST_COLORS[index % HIGH_CONTRAST_COLORS.length]));
        setDisciplineColors(initialColorMap);
    }, [results.scheduledTasks]);

    const handleSaveSuppTask = (task: SupplementaryTask) => {
        pushToHistory(evaluationData);
        setEvaluationData(prev => {
            if (!prev) return null;
            const existingIndex = prev.supplementaryTasks.findIndex(t => t.id === task.id);
            let updatedTasks: SupplementaryTask[];
            if (existingIndex > -1) {
                updatedTasks = prev.supplementaryTasks.map(t => t.id === task.id ? task : t);
            } else {
                updatedTasks = [...prev.supplementaryTasks, task];
            }
            return { ...prev, supplementaryTasks: updatedTasks };
        });
    };

    const handleDeleteSuppTask = (taskId: string) => {
        // Removed window.confirm as it's blocked in the sandbox
        pushToHistory(evaluationData);
        setEvaluationData(prev => {
            if (!prev) return null;
            return { ...prev, supplementaryTasks: prev.supplementaryTasks.filter(task => task.id !== taskId) };
        });
    };

    const SortIcon: React.FC<{ columnKey: SortableHotReviewKeys }> = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block ml-1 text-slate-500"><path d="M7.5 3L4.5 7H10.5L7.5 3Z" fill="currentColor"></path><path d="M7.5 12L10.5 8H4.5L7.5 12Z" fill="currentColor"></path></svg>;
        if (sortConfig.direction === 'ascending') return <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block ml-1 text-white"><path d="M7.5 3L4.5 7H10.5L7.5 3Z" fill="currentColor"></path></svg>;
        return <svg width="12" height="12" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block ml-1 text-white"><path d="M7.5 12L10.5 8H4.5L7.5 12Z" fill="currentColor"></path></svg>;
    };

    const taskProgressMap = useMemo(() => {
        const progress: Record<number, number> = {};
        allTasksInPeriod.forEach(task => {
            progress[task.id] = evaluationData.tasks[task.id]?.status === 'Fait' ? 100 : 0;
        });
        return progress;
    }, [allTasksInPeriod, evaluationData.tasks]);

    const renderTaskTable = (title: string, tasks: (typeof sortedTasksToDisplay[0])[]) => {
        const [bulkStatus, setBulkStatus] = useState<TaskStatus | ''>('');
        const areAllVisibleSelected = tasks.length > 0 && tasks.every(t => selectedTaskIds.includes(t.id));

        const handleSelectAllInTable = (e: React.ChangeEvent<HTMLInputElement>) => {
            const taskIdsInTable = tasks.map(t => t.id);
            if (e.target.checked) {
                setSelectedTaskIds(prev => [...new Set([...prev, ...taskIdsInTable])]);
            } else {
                setSelectedTaskIds(prev => prev.filter(id => !taskIdsInTable.includes(id)));
            }
        };

        const handleToggleSelect = (taskId: number) => {
            setSelectedTaskIds(prev =>
                prev.includes(taskId)
                    ? prev.filter(id => id !== taskId)
                    : [...prev, taskId]
            );
        };

        return (
            <section className="bg-[#070a12] border border-white/[0.08] rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                        <h3 className="text-xl font-black text-white">{title}</h3>
                        <button
                            onClick={handleUndo}
                            disabled={evaluationHistory.length === 0}
                            className="ml-4 bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-30 disabled:grayscale text-white text-[10px] font-black py-2 px-4 rounded-xl transition-all uppercase tracking-widest flex items-center gap-2 border border-white/10"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h10a5 5 0 0 1 5 5v2" /><path d="M3 10l5-5" /><path d="M3 10l5 5" /></svg>
                            Undo
                        </button>
                    </div>

                    {selectedTaskIds.length > 0 && (
                        <div className="flex items-center gap-4 bg-white/5 p-3 pr-6 rounded-[1.5rem] border border-white/10 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="bg-blue-600 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20">
                                {selectedTaskIds.length} Sélectionnés
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={bulkStatus}
                                    onChange={(e) => setBulkStatus(e.target.value as TaskStatus | '')}
                                    className="bg-white/[0.04] border-none rounded-xl px-4 py-2 text-xs font-bold text-slate-300 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                >
                                    <option value="" disabled>Statut Global...</option>
                                    <option value="À Faire">À Faire</option>
                                    <option value="Fait">Fait</option>
                                    <option value="Non Fait">Non Fait</option>
                                    <option value="Annuler">Annulé</option>
                                </select>
                                <button
                                    onClick={() => handleBulkStatusChange(bulkStatus as TaskStatus)}
                                    disabled={!bulkStatus}
                                    className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-black py-2 px-6 rounded-xl text-[10px] uppercase tracking-widest transition-all disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                                >
                                    Appliquer
                                </button>
                                <button onClick={() => setSelectedTaskIds([])} className="text-slate-500 hover:text-white text-[10px] font-bold uppercase tracking-widest ml-2 transition-colors">
                                    X
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="overflow-auto max-h-[60vh] custom-scrollbar pr-4">
                    <table className="w-full text-left border-separate border-spacing-y-2">
                        <thead className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] sticky top-0 bg-[#070a12] z-20">
                            <tr>
                                <th className="px-4 py-3 w-12 text-center">
                                    <input
                                        type="checkbox"
                                        checked={areAllVisibleSelected}
                                        onChange={handleSelectAllInTable}
                                        className="w-5 h-5 text-blue-600 bg-white/[0.06] border-white/10 rounded-lg focus:ring-blue-500"
                                    />
                                </th>
                                <th className="px-4 py-3 cursor-pointer group" onClick={() => requestSort('ot')}>
                                    <div className="flex items-center gap-1 group-hover:text-blue-400 transition-colors">OT <SortIcon columnKey='ot' /></div>
                                </th>
                                <th className="px-4 py-3 cursor-pointer group min-w-[250px]" onClick={() => requestSort('action')}>
                                    <div className="flex items-center gap-1 group-hover:text-blue-400 transition-colors">Description <SortIcon columnKey='action' /></div>
                                </th>
                                <th className="px-4 py-3">Discipline</th>
                                <th className="px-4 py-3 text-center">Ressources<br /><span className="text-[8px] text-slate-500">P / R</span></th>
                                <th className="px-4 py-3">Statut</th>
                                <th className="px-4 py-3 cursor-pointer group" onClick={() => requestSort('startTime')}>
                                    <div className="flex items-center gap-1 group-hover:text-blue-400 transition-colors">Cible <SortIcon columnKey='startTime' /></div>
                                </th>
                                <th className="px-4 py-3 cursor-pointer group text-right" onClick={() => requestSort('duration')}>
                                    <div className="flex items-center gap-1 justify-end group-hover:text-blue-400 transition-colors">Plan (h) <SortIcon columnKey='duration' /></div>
                                </th>
                                <th className="px-4 py-3 cursor-pointer group" onClick={() => requestSort('actualStart')}>
                                    <div className="flex items-center gap-1 group-hover:text-blue-400 transition-colors">Début Réel <SortIcon columnKey='actualStart' /></div>
                                </th>
                                <th className="px-4 py-3 cursor-pointer group" onClick={() => requestSort('actualEnd')}>
                                    <div className="flex items-center gap-1 group-hover:text-blue-400 transition-colors">Fin Réelle <SortIcon columnKey='actualEnd' /></div>
                                </th>
                                <th className="px-4 py-3 cursor-pointer group text-right" onClick={() => requestSort('slippage')}>
                                    <div className="flex items-center gap-1 justify-end group-hover:text-blue-400 transition-colors">Gliss. <SortIcon columnKey='slippage' /></div>
                                </th>
                                <th className="px-4 py-3 text-center">Analyse</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {tasks.map(task => {
                                const status = evaluationData.tasks[task.id]?.status || 'Fait';
                                const isTracking = trackingTaskId === task.id;
                                return (
                                    <tr key={task.id} className={`bg-white/2 hover:bg-white/5 transition-all group ${task.isStartPropagated ? 'border-l-2 border-blue-500/50' : ''} ${selectedTaskIds.includes(task.id) ? 'bg-blue-500/10' : ''} ${isTracking ? 'bg-blue-500/20' : ''}`}>
                                        <td className="px-4 py-4 text-center rounded-l-2xl">
                                            <input
                                                type="checkbox"
                                                checked={selectedTaskIds.includes(task.id)}
                                                onChange={() => handleToggleSelect(task.id)}
                                                className="w-5 h-5 text-blue-600 bg-white/[0.06] border-white/10 rounded-lg"
                                            />
                                        </td>
                                        <td className="px-4 py-4 font-mono font-bold text-slate-300 group-hover:text-white transition-colors">
                                            {task.ot || '-'}
                                        </td>
                                        <td className="px-4 py-4">
                                            <div
                                                className="font-bold text-white group-hover:text-blue-400 cursor-pointer transition-colors max-w-[300px]"
                                                onClick={() => setViewingSuccessorsOf(task)}
                                            >
                                                {task.action}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{task.equipment}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg border border-white/5">{task.discipline || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            {(() => {
                                                const evalT = evaluationData.tasks[task.id];
                                                const planned = task.manpower;
                                                const actual = evalT?.actualManpower ?? planned;
                                                const hasOverrun = actual > planned;
                                                const actualDuration = (evalT?.actualStart && evalT?.actualEnd)
                                                    ? (new Date(evalT.actualEnd).getTime() - new Date(evalT.actualStart).getTime()) / 3600000
                                                    : task.duration;
                                                const extraHH = hasOverrun ? (actual - planned) * actualDuration : 0;
                                                return (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-[10px] text-slate-400 font-bold">{planned}</span>
                                                            <span className="text-[9px] text-slate-600">/</span>
                                                            <input
                                                                type="number"
                                                                min={1}
                                                                value={actual}
                                                                onChange={e => {
                                                                    const val = parseInt(e.target.value) || planned;
                                                                    setEvaluationData(prev => ({
                                                                        ...prev!,
                                                                        tasks: {
                                                                            ...prev!.tasks,
                                                                            [task.id]: { ...prev!.tasks[task.id], actualManpower: val }
                                                                        }
                                                                    }));
                                                                }}
                                                                className={`w-14 text-center text-xs font-black rounded-lg px-2 py-1 border transition-all bg-white/5 border-white/5 text-slate-200`}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-4 py-4">
                                            <select
                                                value={status}
                                                onChange={(e) => handleTaskStatusChange(task.id, e.target.value as TaskStatus)}
                                                className={`text-[10px] font-black uppercase tracking-widest rounded-lg px-3 py-1.5 border-none focus:ring-2 focus:ring-white/20 appearance-none cursor-pointer w-28 text-center transition-all shadow-sm ${status === 'À Faire' ? 'bg-slate-700/50 text-slate-400' :
                                                    status === 'Fait' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        status === 'Non Fait' ? 'bg-red-500/20 text-red-400' :
                                                            'bg-amber-500/20 text-amber-400'
                                                    }`}
                                            >
                                                <option value="À Faire">À Faire</option>
                                                <option value="Fait">Fait</option>
                                                <option value="Non Fait">Non Fait</option>
                                                <option value="Annuler">Annulé</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-xs font-mono text-slate-300">{formatDateTime(task.startTime)}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">→ {formatDateTime(task.endTime)}</div>
                                        </td>
                                        <td className="px-4 py-4 text-right font-mono font-bold text-slate-300">
                                            {task.duration.toFixed(1)}h
                                        </td>
                                        <td className="px-4 py-4 relative">
                                            {task.isStartPropagated && (
                                                <div className="absolute left-1 top-1/2 -translate-y-1/2 text-blue-500 animate-pulse">
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M13 17l5-5-5-5M6 17l5-5-5-5" /></svg>
                                                </div>
                                            )}
                                            <input
                                                type="datetime-local"
                                                value={task.actualStart || ''}
                                                onChange={e => handleLocalTaskDateChange(task.id, 'actualStart', e.target.value)}
                                                disabled={!isTracking}
                                                className={`bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs font-mono transition-all ${!isTracking ? 'text-slate-300 cursor-not-allowed' : 'text-blue-400 ring-1 ring-blue-500/50 focus:ring-blue-500 shadow-lg shadow-blue-500/10'}`}
                                            />
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="datetime-local"
                                                    value={task.actualEnd || ''}
                                                    onChange={e => handleLocalTaskDateChange(task.id, 'actualEnd', e.target.value)}
                                                    disabled={!isTracking}
                                                    className={`bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-xs font-mono transition-all ${!isTracking ? 'text-slate-300 cursor-not-allowed' : 'text-blue-400 ring-1 ring-blue-500/50 focus:ring-blue-500 shadow-lg shadow-blue-500/10'}`}
                                                />
                                                {isTracking ? (
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleApplyChanges(task.id)} className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white p-2 rounded-lg transition-all border border-emerald-500/30" title="Valider">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                                        </button>
                                                        <button onClick={handleCancelTracking} className="bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white p-2 rounded-lg transition-all border border-red-500/30" title="Annuler">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                        </button>
                                                        <button onClick={() => { handleResetTaskAndSuccessors(task.id); setTrackingTaskId(null); }} className="bg-slate-700/50 hover:bg-slate-600 text-slate-400 p-2 rounded-lg transition-all" title="Réinitialiser Planning">
                                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 12a9 9 0 0 1-9 9c-4.97 0-9-4.03-9-9s4.03-9 9-9" /><path d="M21 3v5h-5" /></svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => handleStartTracking(task.id)} className="opacity-0 group-hover:opacity-100 bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white p-2 rounded-lg transition-all border border-blue-500/30">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m18 15 3-3-3-3" /><path d="M11.5 12H21" /><path d="M3 9h4a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H3V9z" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                        <td className={`px-4 py-4 text-right font-mono font-black ${task.slippage !== null && task.slippage > 0.01 ? 'text-red-400' : (task.slippage !== null && task.slippage < -0.01 ? 'text-emerald-400' : 'text-slate-600')}`}>
                                            {task.slippage !== null ? `${task.slippage > 0 ? '+' : ''}${task.slippage.toFixed(1)}h` : '-'}
                                        </td>
                                        <td className="px-4 py-4 text-center rounded-r-2xl">
                                            {task.slippage !== null && task.slippage > 0.01 && !isTracking && (
                                                <button
                                                    onClick={() => { setEditingTaskForSlippage({ id: task.id, slippageHours: task.slippage! }); setIsSlippageModalOpen(true); }}
                                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${evaluationData.tasks[task.id]?.slippageDetails?.cause ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                                        }`}
                                                >
                                                    {evaluationData.tasks[task.id]?.slippageDetails?.cause ? 'Détails' : 'Analyser'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {tasks.length === 0 && (
                                <tr><td colSpan={10} className="p-20 text-center text-slate-600 italic font-medium">Aucune tâche ne correspond à vos critères de recherche.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        );
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <SuccessorsModal
                isOpen={!!viewingSuccessorsOf}
                onClose={() => setViewingSuccessorsOf(null)}
                sourceTask={viewingSuccessorsOf}
                allTasks={results.scheduledTasks}
            />
            <SlippageModal isOpen={isSlippageModalOpen} onClose={() => setIsSlippageModalOpen(false)} onSave={handleSaveSlippageDetails} initialDetails={editingTaskForSlippage ? evaluationData.tasks[editingTaskForSlippage.id]?.slippageDetails : undefined} slippageHours={editingTaskForSlippage?.slippageHours || 0} />
            <SupplementaryTaskModal isOpen={isSuppTaskModalOpen} onClose={() => { setIsSuppTaskModalOpen(false); setEditingSuppTask(null); }} onSave={handleSaveSuppTask} taskToEdit={editingSuppTask} initialStartDate={hotReviewState.startDate} initialEndDate={hotReviewState.endDate} availableTeams={disciplineOptions.filter(d => d !== 'all')} />

            <AddTaskOutsideRangeModal
                isOpen={isAddTaskOutsideRangeModalOpen}
                onClose={() => setIsAddTaskOutsideRangeModalOpen(false)}
                onAdd={handleAddTaskOutsideRange}
                allTasks={results.scheduledTasks}
                displayedStartDate={displayedStartDate}
                displayedEndDate={displayedEndDate}
            />
            <TaskListModal isOpen={!!viewingTasksInfo} onClose={() => setViewingTasksInfo(null)} title={viewingTasksInfo?.title || ''} tasks={viewingTasksInfo?.tasks || []} evaluationData={evaluationData} />
            <EventDetailModal
                isOpen={isEventDetailModalOpen}
                onClose={() => setIsEventDetailModalOpen(false)}
                onSave={handleSaveEventDetails}
                initialIncidents={evaluationData.incidentDetails || []}
                initialAccidents={evaluationData.accidentDetails || []}
                defaultDateTime={hotReviewState.startDate}
            />
            {taskForImpactAnalysis && (
                <ImpactAnalysisModal
                    isOpen={!!taskForImpactAnalysis}
                    onClose={() => {
                        if (taskForImpactAnalysis) {
                            handleResetTaskAndSuccessors(taskForImpactAnalysis.task.id);
                        }
                        setTaskForImpactAnalysis(null);
                        setTrackingTaskId(null);
                    }}
                    onApply={handleApplyImpactAnalysis}
                    analysisData={taskForImpactAnalysis}
                    allTasks={results.scheduledTasks}
                />
            )}

            <div>
                {/* ═══ COMMAND BAR HEADER ═══ */}
                <header className="mb-8">
                    {/* Top row: title + actions */}
                    <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                        <div className="flex items-center gap-4">
                            <button onClick={onBack} className="group w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all duration-200">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/40 animate-ping absolute inset-0"></div>
                                    </div>
                                    <p className="text-[9px] font-black text-emerald-500/70 uppercase tracking-[0.5em]">Session Active</p>
                                </div>
                                <h1 className="text-3xl font-black text-white tracking-tight leading-none mt-0.5">Évaluation à Chaud</h1>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Centre de Décision · Suivi Opérationnel en Temps Réel</p>
                            </div>
                        </div>

                        {/* Right: Report meta + export */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-3 bg-[#0d111a] border border-white/8 rounded-2xl px-5 py-3 backdrop-blur-xl">
                                <div className="flex flex-col gap-0.5">
                                    <label className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-600">Rapport</label>
                                    <input type="text" value={reportTitle} onChange={(e) => setReportTitle(e.target.value)}
                                        className="bg-transparent border-none focus:ring-0 text-xs font-black text-white p-0 placeholder:text-slate-700 w-52" placeholder="Titre du rapport..." />
                                </div>
                                <div className="w-px h-8 bg-white/8"></div>
                                <div className="flex flex-col gap-0.5">
                                    <label className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-600">Planificateur</label>
                                    <input type="text" value={inspectorName} onChange={(e) => setInspectorName(e.target.value)}
                                        className="bg-transparent border-none focus:ring-0 text-xs font-black text-cyan-400 p-0 placeholder:text-slate-700 w-40" placeholder="Votre nom..." />
                                </div>
                            </div>
                            <button onClick={performExportPDF} disabled={isDownloading}
                                className="relative overflow-hidden bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-black py-3 px-6 rounded-2xl flex items-center gap-3 transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] disabled:opacity-50 group">
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <svg className={`w-4 h-4 relative z-10 ${isDownloading ? 'animate-spin' : 'group-hover:translate-y-0.5 transition-transform'}`} xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                <span className="text-[10px] uppercase tracking-[0.2em] relative z-10">{isDownloading ? 'Génération...' : 'Exporter PDF'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Live KPI ticker strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { label: 'Avancement Réel', value: `${kpis.actualGlobalProgress.toFixed(1)}%`, sub: `Cible: ${kpis.plannedGlobalProgress.toFixed(1)}%`, color: kpis.actualGlobalProgress >= kpis.plannedGlobalProgress ? '#10b981' : '#f59e0b', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
                            { label: 'Glissement', value: `${kpis.potentialSlippage > 0 ? '+' : ''}${kpis.potentialSlippage.toFixed(1)}h`, sub: kpis.potentialSlippage <= 0 ? 'Dans les délais' : 'Retard détecté', color: kpis.potentialSlippage > 0 ? '#ef4444' : '#10b981', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                            { label: 'Tâches Terminées', value: `${kpis.completedTasks}`, sub: `sur ${kpis.totalPlannedTasks} planifiées`, color: '#22d3ee', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
                            { label: 'Incidents / Accidents', value: `${kpis.incidents} / ${kpis.accidents}`, sub: kpis.incidents + kpis.accidents === 0 ? 'Aucun événement' : 'Événements signalés', color: kpis.incidents + kpis.accidents > 0 ? '#f59e0b' : '#10b981', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
                        ].map((kpi, i) => (
                            <div key={i} className="flex items-center gap-4 bg-[#0d111a]/80 border border-white/[0.06] rounded-2xl px-5 py-4 backdrop-blur-xl hover:border-white/10 transition-all group" style={{ boxShadow: `0 0 20px ${kpi.color}08` }}>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${kpi.color}15`, border: `1px solid ${kpi.color}30` }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={kpi.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={kpi.icon} /></svg>
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-slate-600">{kpi.label}</p>
                                    <p className="text-xl font-black leading-none mt-0.5" style={{ color: kpi.color }}>{kpi.value}</p>
                                    <p className="text-[9px] text-slate-600 font-bold mt-0.5 truncate">{kpi.sub}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </header>


                {/* ═══ PERFORMANCE CHART — MISSION CONTROL ═══ */}
                <section className="bg-[#070a12] border border-white/[0.06] rounded-[2rem] p-8 mb-8 shadow-2xl overflow-hidden relative group" style={{ boxShadow: '0 0 80px rgba(16,185,129,0.05), 0 25px 50px rgba(0,0,0,0.6)' }}>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] -mr-32 -mt-32"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 blur-[100px] -ml-32 -mb-32"></div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 relative z-10">
                        <div>
                            <p className="text-[9px] font-black text-emerald-500/70 uppercase tracking-[0.5em] mb-1">Analyse Temporelle</p>
                            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                                <span className="w-1.5 h-8 bg-gradient-to-b from-emerald-400 to-cyan-500 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.6)]"></span>
                                Performance de l'Arrêt : Planifié vs Réel
                            </h2>
                            <p className="text-slate-600 text-xs mt-1 font-bold ml-5">Avancement global cumulé sur la durée totale du projet</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 relative z-10">
                            {/* Interval Selector */}
                            <div className="flex items-center gap-1 bg-[#0d111a] p-1 rounded-xl border border-white/8">
                                {([{ v: 1, l: "1H" }, { v: 3, l: "3H" }, { v: 6, l: "6H" }, { v: 12, l: "12H" }, { v: 24, l: "1D" }, { v: 168, l: "1W" }, { v: 720, l: "1M" }, { v: 8760, l: "1Y" }] as const).map(({ v, l }) => (
                                    <button key={v} onClick={() => setChartIntervalHours(v)}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${chartIntervalHours === v
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                                            : 'text-slate-600 hover:text-slate-400'
                                            }`}>
                                        {l}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-4 bg-[#0d111a] px-5 py-2.5 rounded-xl border border-white/8">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-1 rounded-full bg-cyan-400 opacity-60"></div>
                                    <div className="w-6 h-1 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 6px rgba(34,211,238,0.6)' }}></div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Planifié</span>
                                </div>
                                <div className="w-px h-4 bg-white/10"></div>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 8px rgba(52,211,153,0.8)' }}></div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Réel</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="h-[420px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart key={chartIntervalHours} data={kpis.progressHistory} margin={{ top: 20, right: 20, left: -10, bottom: 10 }}>
                                <defs>
                                    <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.25} />
                                        <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                                        <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                                    </linearGradient>
                                    <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                                        <feMerge>
                                            <feMergeNode in="coloredBlur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                    <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                        <feMerge>
                                            <feMergeNode in="coloredBlur" />
                                            <feMergeNode in="SourceGraphic" />
                                        </feMerge>
                                    </filter>
                                </defs>
                                <CartesianGrid strokeDasharray="1 8" stroke="#ffffff04" vertical={false} />
                                <XAxis
                                    dataKey="timestamp"
                                    stroke="#334155"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={{ stroke: '#1e293b', strokeWidth: 1 }}
                                    dy={12}
                                    tick={{ fill: '#475569', fontWeight: 700, fontFamily: 'monospace' }}
                                    tickFormatter={(val: string) => {
                                        try {
                                            const d = new Date(val);
                                            if (isNaN(d.getTime())) return val;
                                            const dd = String(d.getDate()).padStart(2, '0');
                                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                                            const hh = String(d.getHours()).padStart(2, '0');
                                            const min = String(d.getMinutes()).padStart(2, '0');
                                            return `${dd}/${mm} ${hh}:${min}`;
                                        } catch { return val; }
                                    }}
                                />
                                <YAxis
                                    stroke="#334155"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    dx={-8}
                                    tick={{ fill: '#475569', fontWeight: 700 }}
                                    tickFormatter={(v: number) => `${v}`}
                                />
                                <Tooltip
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            let formattedLabel = label;
                                            try {
                                                const d = new Date(label);
                                                if (!isNaN(d.getTime())) {
                                                    formattedLabel = d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                                                }
                                            } catch { }
                                            return (
                                                <div className="bg-[#070a12] border border-white/10 p-4 rounded-2xl shadow-2xl backdrop-blur-xl" style={{ boxShadow: '0 0 30px rgba(0,0,0,0.8)' }}>
                                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-3 font-mono">{formattedLabel}</p>
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between gap-8">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 6px rgba(34,211,238,0.8)' }}></div>
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Planifié</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-black text-white font-mono">{payload[0]?.payload?.plannedCount ?? '--'} <span className="text-slate-500 text-[10px]">tâches</span></div>
                                                                <div className="text-[10px] text-cyan-400 font-mono">{payload[0]?.payload?.planned?.toFixed(1) ?? '--'}%</div>
                                                            </div>
                                                        </div>
                                                        <div className="h-px bg-white/5"></div>
                                                        <div className="flex items-center justify-between gap-8">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 6px rgba(52,211,153,0.8)' }}></div>
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Réel</span>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-sm font-black text-white font-mono">{payload[0]?.payload?.actualCount ?? '--'} <span className="text-slate-500 text-[10px]">tâches</span></div>
                                                                <div className="text-[10px] text-emerald-400 font-mono">{payload[0]?.payload?.actual?.toFixed(1) ?? '--'}%</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="plannedCount"
                                    stroke="#22d3ee"
                                    strokeWidth={2}
                                    strokeDasharray="6 4"
                                    strokeOpacity={0.7}
                                    fillOpacity={1}
                                    fill="url(#colorPlanned)"
                                    animationDuration={2000}
                                    dot={false}
                                    activeDot={{ r: 5, fill: '#22d3ee', stroke: '#070a12', strokeWidth: 2 }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="actualCount"
                                    stroke="#34d399"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorActual)"
                                    animationDuration={2500}
                                    filter="url(#glowGreen)"
                                    dot={false}
                                    activeDot={{ r: 6, fill: '#34d399', stroke: '#070a12', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* ═══ PRIMARY KPI GRID ═══ */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                    {/* Card 1: Avancement Global */}
                    <div className="bg-[#070a12] border border-white/[0.06] rounded-3xl p-7 shadow-2xl relative overflow-hidden group hover:border-blue-500/20 transition-all duration-500" style={{ boxShadow: '0 0 40px rgba(59,130,246,0.05), 0 20px 40px rgba(0,0,0,0.5)' }}>
                        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/8 rounded-full blur-[80px] -mr-16 -mt-16 group-hover:bg-blue-500/12 transition-all duration-1000"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-500/15 rounded-xl border border-blue-500/20 flex items-center justify-center">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 2v10l4 2" /></svg>
                                    </div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.35em]">Avancement Global</p>
                                </div>
                                <div className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${kpis.actualGlobalProgress >= kpis.plannedGlobalProgress ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                                    {kpis.actualGlobalProgress >= kpis.plannedGlobalProgress ? '✓ En Avance' : `▼ ${(kpis.plannedGlobalProgress - kpis.actualGlobalProgress).toFixed(1)}%`}
                                </div>
                            </div>
                            <div className="space-y-5">
                                <div>
                                    <div className="flex justify-between items-baseline mb-2">
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Planifié</span>
                                        <span className="text-2xl font-black text-cyan-400 font-mono">{kpis.plannedGlobalProgress.toFixed(1)}<span className="text-sm text-cyan-600">%</span></span>
                                    </div>
                                    <div className="h-2 w-full bg-white/[0.04] rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-cyan-700 to-cyan-400 rounded-full transition-all duration-1000" style={{ width: `${kpis.plannedGlobalProgress}%`, boxShadow: '0 0 8px rgba(34,211,238,0.4)' }}></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between items-baseline mb-2">
                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Réel</span>
                                        <span className="text-2xl font-black text-emerald-400 font-mono">{kpis.actualGlobalProgress.toFixed(1)}<span className="text-sm text-emerald-600">%</span></span>
                                    </div>
                                    <div className="h-2 w-full bg-white/[0.04] rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${kpis.actualGlobalProgress}%`, boxShadow: '0 0 10px rgba(52,211,153,0.5)' }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Taux de Réalisation */}
                    <div className="bg-[#070a12] border border-white/[0.06] rounded-3xl p-7 shadow-2xl relative overflow-hidden group hover:border-emerald-500/20 transition-all duration-500" style={{ boxShadow: '0 0 40px rgba(16,185,129,0.05), 0 20px 40px rgba(0,0,0,0.5)' }}>
                        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/8 rounded-full blur-[80px] -mr-16 -mt-16 group-hover:bg-emerald-500/12 transition-all duration-1000"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-emerald-500/15 rounded-xl border border-emerald-500/20 flex items-center justify-center">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                    </div>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.35em]">Taux de Réalisation</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest">Tâches</p>
                                    <p className="text-xs font-black text-white font-mono">{kpis.completedTasks} <span className="text-slate-600">/ {kpis.totalPlannedTasks}</span></p>
                                </div>
                            </div>
                            {/* Large ring visualization */}
                            <div className="flex items-center gap-6">
                                <div className="relative w-28 h-28 flex-shrink-0">
                                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                                        <circle cx="50" cy="50" r="40" fill="none" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round"
                                            strokeDasharray={2 * Math.PI * 40}
                                            strokeDashoffset={2 * Math.PI * 40 * (1 - kpis.plannedRealizationRate / 100)}
                                            opacity="0.25" />
                                        <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="8" strokeLinecap="round"
                                            strokeDasharray={2 * Math.PI * 40}
                                            strokeDashoffset={2 * Math.PI * 40 * (1 - kpis.actualRealizationRate / 100)}
                                            style={{ filter: 'drop-shadow(0 0 6px rgba(16,185,129,0.7))', transition: 'stroke-dashoffset 1.5s ease' }} />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-black text-white">{kpis.actualRealizationRate.toFixed(0)}</span>
                                        <span className="text-[9px] text-slate-500 font-black uppercase">%</span>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">Objectif</p>
                                        <p className="text-lg font-black text-slate-400">{kpis.plannedRealizationRate.toFixed(1)}<span className="text-xs text-slate-600">%</span></p>
                                    </div>
                                    <div className="h-px bg-white/5"></div>
                                    <div>
                                        <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mb-1">Réalisation</p>
                                        <p className="text-lg font-black text-emerald-400">{kpis.actualRealizationRate.toFixed(1)}<span className="text-xs text-emerald-700">%</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Glissement + Incidents */}
                    <div className="bg-[#070a12] border border-white/[0.06] rounded-3xl p-7 shadow-2xl relative overflow-hidden flex flex-col justify-between group hover:border-red-500/10 transition-all duration-500" style={{ boxShadow: kpis.potentialSlippage > 0 ? '0 0 40px rgba(239,68,68,0.06), 0 20px 40px rgba(0,0,0,0.5)' : '0 0 40px rgba(16,185,129,0.05), 0 20px 40px rgba(0,0,0,0.5)' }}>
                        <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] -mr-16 -mt-16 transition-all duration-1000 ${kpis.potentialSlippage > 0 ? 'bg-red-500/8' : 'bg-emerald-500/5'}`}></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-5">
                                <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${kpis.potentialSlippage > 0 ? 'bg-red-500/15 border-red-500/20' : 'bg-emerald-500/15 border-emerald-500/20'}`}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={kpis.potentialSlippage > 0 ? '#ef4444' : '#10b981'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                </div>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.35em]">Pronostic & Plage</p>
                            </div>
                            {/* Slippage big number */}
                            <div className="bg-black/30 rounded-2xl p-5 border border-white/[0.04] mb-4">
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] mb-1">Glissement Potentiel</p>
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-4xl font-black font-mono ${kpis.potentialSlippage > 0 ? 'text-red-500' : 'text-emerald-500'}`} style={{ textShadow: kpis.potentialSlippage > 0 ? '0 0 20px rgba(239,68,68,0.4)' : '0 0 20px rgba(16,185,129,0.4)' }}>
                                        {kpis.potentialSlippage > 0 ? '+' : ''}{kpis.potentialSlippage.toFixed(2)}
                                    </span>
                                    <span className="text-slate-600 font-bold text-sm">heures</span>
                                </div>
                                {kpis.potentialSlippage > 0 && kpis.criticalTaskName && (
                                    <div className="mt-3 flex items-center gap-2 p-3 bg-red-500/8 rounded-xl border border-red-500/15">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" style={{ boxShadow: '0 0 8px rgba(239,68,68,0.6)' }}></div>
                                        <p className="text-[9px] text-red-400 font-black uppercase tracking-widest truncate">{kpis.criticalTaskName}</p>
                                    </div>
                                )}
                                <p className="text-[9px] text-slate-600 mt-2 font-medium">Plage: <span className="text-slate-500 font-mono">{kpis.timeRangeEvaluated}</span></p>
                            </div>
                            {/* Incidents + Accidents */}
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => handleIncidentAccidentChange('incidents')} className="group/inc bg-amber-500/8 hover:bg-amber-500/15 border border-amber-500/15 hover:border-amber-500/30 rounded-2xl p-4 text-left transition-all duration-300">
                                    <p className="text-[8px] font-black text-amber-500/70 uppercase tracking-widest mb-1">Incidents</p>
                                    <p className="text-3xl font-black text-amber-400 font-mono" style={{ textShadow: '0 0 20px rgba(245,158,11,0.3)' }}>{kpis.incidents}</p>
                                    <p className="text-[8px] text-amber-500/40 font-bold mt-1 uppercase tracking-widest group-hover/inc:text-amber-500/60 transition-colors">Voir détails →</p>
                                </button>
                                <button onClick={() => handleIncidentAccidentChange('accidents')} className="group/acc bg-red-500/8 hover:bg-red-500/15 border border-red-500/15 hover:border-red-500/30 rounded-2xl p-4 text-left transition-all duration-300">
                                    <p className="text-[8px] font-black text-red-500/70 uppercase tracking-widest mb-1">Accidents</p>
                                    <p className="text-3xl font-black text-red-400 font-mono" style={{ textShadow: '0 0 20px rgba(239,68,68,0.3)' }}>{kpis.accidents}</p>
                                    <p className="text-[8px] text-red-500/40 font-bold mt-1 uppercase tracking-widest group-hover/acc:text-red-500/60 transition-colors">Voir détails →</p>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Secondary Data: Workload Comparison & Resources */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 mb-8">
                    {/* Workload Ratios */}
                    <div className="xl:col-span-3 bg-[#070a12] border border-white/[0.07] rounded-[2.5rem] p-8 pb-14 shadow-xl">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-black text-white flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
                                Comparaison des Travaux (Sur la Plage)
                            </h3>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-slate-600"></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Planifiés</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Supplémentaires</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* 1. Charge Performance (H-H) */}
                            <div className="bg-white/[0.03] rounded-[2.5rem] p-6 border border-white/10 flex flex-col items-center group hover:bg-white/[0.05] transition-all duration-500 shadow-xl">
                                <p className="text-slate-500 text-[10px] font-black font-mono uppercase tracking-[0.2em] mb-6">Charge de Travail (H-H)</p>

                                <div className="relative w-36 h-36 mb-8 group-hover:scale-105 transition-transform duration-700">
                                    <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                        <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800/50" />
                                        {/* Planned HH */}
                                        <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="12" fill="transparent"
                                            className="text-emerald-500"
                                            strokeDasharray={Math.PI * 128}
                                            strokeDashoffset={isNaN(kpis.plannedWorkCharge / (kpis.plannedWorkCharge + kpis.supplementaryWorkCharge + (kpis.extraWorkCharge || 0))) ? Math.PI * 128 : Math.PI * 128 * (1 - (kpis.plannedWorkCharge / (kpis.plannedWorkCharge + kpis.supplementaryWorkCharge + (kpis.extraWorkCharge || 0))))}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-white tracking-tighter">{(kpis.plannedWorkCharge + kpis.supplementaryWorkCharge + (kpis.extraWorkCharge || 0)).toFixed(0)}</span>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Total H-H</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 w-full">
                                    <div className="flex justify-between items-center bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-2xl border border-white/5 transition-all">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                            <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Planifié</span>
                                        </div>
                                        <span className="text-white font-mono font-black text-sm">{kpis.plannedWorkCharge.toFixed(1)}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-2xl border border-white/5 transition-all">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"></div>
                                            <span className="text-cyan-400 text-[10px] font-black uppercase tracking-wider">Supplémentaire</span>
                                        </div>
                                        <span className="text-white font-mono font-black text-sm">+{kpis.supplementaryWorkCharge.toFixed(1)}</span>
                                    </div>
                                    {kpis.extraWorkCharge !== undefined && kpis.extraWorkCharge > 0 && (
                                        <div className="flex justify-between items-center bg-amber-500/10 hover:bg-amber-500/15 px-4 py-2.5 rounded-2xl border border-amber-500/20 transition-all">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                                                <span className="text-amber-500 text-[10px] font-black uppercase tracking-wider">Extra H-H</span>
                                            </div>
                                            <span className="text-amber-500 font-mono font-black text-sm">+{kpis.extraWorkCharge.toFixed(1)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 2. Volume Ratio (Nombre de Tâches) */}
                            <div className="bg-white/[0.03] rounded-[2.5rem] p-6 border border-white/10 flex flex-col items-center group hover:bg-white/[0.05] transition-all duration-500 shadow-xl">
                                <p className="text-slate-500 text-[10px] font-black font-mono uppercase tracking-[0.2em] mb-6">Volume de Travail</p>

                                <div className="relative w-36 h-36 mb-8 group-hover:scale-105 transition-transform duration-700">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800/50" />
                                        <circle cx="72" cy="72" r="64" stroke="currentColor" strokeWidth="12" fill="transparent"
                                            className="text-purple-500"
                                            strokeDasharray={Math.PI * 128}
                                            strokeDashoffset={isNaN(kpis.plannedWorkCount / (kpis.plannedWorkCount + kpis.supplementaryWorkCount)) ? Math.PI * 128 : Math.PI * 128 * (1 - (kpis.plannedWorkCount / (kpis.plannedWorkCount + kpis.supplementaryWorkCount)))}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-white tracking-tighter">{(kpis.plannedWorkCount + kpis.supplementaryWorkCount)}</span>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Tâches</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3 w-full">
                                    <div className="flex justify-between items-center bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-2xl border border-white/5 transition-all">
                                        <span className="text-slate-400 text-[10px] font-black uppercase tracking-wider">Planifiées</span>
                                        <span className="text-white font-mono font-black text-sm">{kpis.plannedWorkCount}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-purple-500/10 hover:bg-purple-500/15 px-4 py-2.5 rounded-2xl border border-purple-500/20 transition-all">
                                        <span className="text-purple-400 text-[10px] font-black uppercase tracking-wider">Supp.</span>
                                        <span className="text-purple-400 font-mono font-black text-sm">+{kpis.supplementaryWorkCount}</span>
                                    </div>
                                    <div className="mt-2 text-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ratio Impact</span>
                                        <div className="text-xl font-black text-white">{kpis.plannedVsSupplementaryCountRatio.toFixed(1)}%</div>
                                    </div>
                                </div>
                            </div>

                            {/* 3. Redesigned Resource Mix per Discipline */}
                            <div className="bg-white/[0.03] rounded-[2.5rem] p-6 border border-white/10 group hover:bg-white/[0.05] transition-all duration-500 shadow-xl flex flex-col">
                                <p className="text-slate-500 text-[10px] font-black font-mono uppercase tracking-[0.2em] mb-6 text-center">Ressources / Discipline (Supp. & Extra)</p>

                                <div className="flex-1 space-y-5 max-h-[16rem] overflow-y-auto pr-2 custom-scrollbar">
                                    {(() => {
                                        // Build discipline map: supp HH + extra HH
                                        const discMap: Record<string, { supp: number; extra: number }> = {};

                                        // Use data from kpis
                                        Object.entries(kpis.supplementaryResourcesByDiscipline || {}).forEach(([disc, hh]) => {
                                            if (!discMap[disc]) discMap[disc] = { supp: 0, extra: 0 };
                                            discMap[disc].supp += hh as number;
                                        });

                                        Object.entries(kpis.extraManHoursByDiscipline || {}).forEach(([disc, extra]) => {
                                            if (!discMap[disc]) discMap[disc] = { supp: 0, extra: 0 };
                                            discMap[disc].extra += extra as number;
                                        });

                                        const entries = Object.entries(discMap);
                                        if (entries.length === 0) return (
                                            <div className="h-full flex flex-col items-center justify-center opacity-30 mt-12">
                                                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                                <p className="text-slate-500 text-[10px] italic font-black uppercase tracking-tighter">Aucun surplus détecté</p>
                                            </div>
                                        );

                                        const maxHH = Math.max(...entries.map(([, v]) => v.supp + v.extra), 1);

                                        return entries
                                            .sort((a, b) => (b[1].supp + b[1].extra) - (a[1].supp + a[1].extra))
                                            .map(([disc, vals]) => {
                                                const total = vals.supp + vals.extra;
                                                return (
                                                    <div key={disc} className="space-y-1.5 group/item">
                                                        <div className="flex justify-between items-end px-1">
                                                            <span className="text-slate-200 text-[11px] font-black truncate max-w-[120px] group-hover/item:text-blue-400 transition-colors uppercase tracking-tight">{disc}</span>
                                                            <div className="flex items-baseline gap-1.5">
                                                                <span className="text-white font-mono font-black text-xs">{total.toFixed(1)}h</span>
                                                                {(vals.extra > 0 && vals.supp > 0) && (
                                                                    <span className="text-[9px] text-slate-500 font-bold uppercase">({vals.supp.toFixed(0)} S + {vals.extra.toFixed(0)} E)</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex shadow-inner">
                                                            {vals.supp > 0 && (
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 relative group-hover/item:brightness-110 transition-all duration-500"
                                                                    style={{ width: `${(vals.supp / maxHH) * 100}%` }}
                                                                >
                                                                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/item:opacity-100 transition-opacity"></div>
                                                                </div>
                                                            )}
                                                            {vals.extra > 0 && (
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-amber-600 to-amber-400 relative border-l border-white/10 group-hover/item:brightness-110 transition-all duration-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]"
                                                                    style={{ width: `${(vals.extra / maxHH) * 100}%` }}
                                                                >
                                                                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/item:opacity-100 transition-opacity"></div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                    })()}
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/5 flex justify-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">S: Supp.</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">E: Extra</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Summary */}
                    <div className="bg-[#070a12] border border-white/[0.07] rounded-[2.5rem] p-8 shadow-xl flex flex-col gap-6">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden group">
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20" /></svg>
                            </div>
                            <p className="text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-1">Efficacité Plage</p>
                            <p className="text-3xl font-black text-white">{(kpis.actualRealizationRate).toFixed(1)}%</p>
                            <p className="text-[10px] text-emerald-400 mt-2 font-medium">Taux de réalisation des tâches planifiées</p>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-3xl p-6 relative overflow-hidden group">
                            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                                <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
                            </div>
                            <p className="text-blue-500 text-[10px] font-black uppercase tracking-widest mb-1">Impact Travaux Supp.</p>
                            <p className="text-3xl font-black text-white">{kpis.plannedVsSupplementaryChargeRatio.toFixed(1)}%</p>
                            <p className="text-[10px] text-blue-400 mt-2 font-medium">Surcharge H-H par rapport au plan initial</p>
                        </div>
                    </div>
                </div>


                {/* Benchmark Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
                    {/* High Risk Critical Monitoring */}
                    <div className="bg-[#070a12] border border-red-500/10 rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:rotate-12 transition-transform duration-700">
                            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                        </div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-red-500/20 rounded-2xl flex items-center justify-center text-red-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            </div>
                            <h3 className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Sécurité & Risques</h3>
                        </div>
                        <div className="space-y-4">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Tâches à Haut Risque</p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-black text-white">{highRiskKpi.completed}</span>
                                <span className="text-slate-500 font-bold">/ {highRiskKpi.total}</span>
                            </div>
                            <div className="h-2 w-full bg-white/[0.06] rounded-full overflow-hidden">
                                <div className="h-full bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.3)]" style={{ width: `${highRiskKpi.progress}%` }}></div>
                            </div>
                            <button
                                onClick={() => setViewingTasksInfo({ title: "Tâches à Haut Risque (Période)", tasks: highRiskKpi.tasks })}
                                className="w-full mt-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-slate-300 hover:bg-white/10 transition-all uppercase tracking-widest"
                            >
                                Analyser Risques
                            </button>
                        </div>
                    </div>

                    {/* Comparison Benchmarks */}
                    <div className="lg:col-span-3 bg-[#070a12] border border-white/[0.07] rounded-[2.5rem] p-8 shadow-xl">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-black text-white flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-cyan-500 rounded-full"></span>
                                Benchmarking de Planification
                            </h3>
                            <span className="text-[10px] bg-white/5 px-3 py-1 rounded-lg text-slate-400 font-bold uppercase tracking-widest">Analyse Relative</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1: Ratio de Charge */}
                            <div className="p-6 bg-white/[0.03] rounded-[2rem] border border-white/10 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:bg-white/[0.05] transition-all duration-500">
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                                <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4 ml-2">Ratio de Charge (H-H)</span>
                                <div className="flex items-center gap-4 ml-2">
                                    <div className="flex-1">
                                        <div className="text-2xl font-black text-emerald-400">1:{(kpis.plannedVsSupplementaryChargeRatio / 100).toFixed(2)}</div>
                                        <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Surcharge pour 1h planifiée</p>
                                    </div>
                                    <div className={`p-2 rounded-xl ${kpis.plannedVsSupplementaryChargeRatio > 20 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m19 12-7 7-7-7" /><path d="M12 19V5" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Ratio Volume */}
                            <div className="p-6 bg-white/[0.03] rounded-[2rem] border border-white/10 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:bg-white/[0.05] transition-all duration-500">
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.3)]"></div>
                                <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4 ml-2">Ratio Volume (Tasks)</span>
                                <div className="flex items-center gap-4 ml-2">
                                    <div className="flex-1">
                                        <div className="text-2xl font-black text-purple-400">{kpis.plannedVsSupplementaryCountRatio.toFixed(1)}%</div>
                                        <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Accroissement du scope</p>
                                    </div>
                                    <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Index de Variabilité */}
                            <div className="p-6 bg-white/[0.03] rounded-[2rem] border border-white/10 shadow-xl flex flex-col justify-between relative overflow-hidden group hover:bg-white/[0.05] transition-all duration-500">
                                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]"></div>
                                <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4 ml-2">Index de Variabilité</span>
                                <div className="flex items-center gap-4 ml-2">
                                    <div className="flex-1">
                                        <div className="text-2xl font-black text-amber-400">{kpis.plannedVsSupplementaryRateRatio.toFixed(1)}%</div>
                                        <p className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Déviation de la charge prévue</p>
                                    </div>
                                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" /></svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <section className="bg-[#070a12] border border-white/[0.08] rounded-[2.5rem] p-8 mb-8 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
                            <h3 className="text-xl font-black text-white">Travaux Supplémentaires de la Période</h3>
                        </div>
                        <button
                            onClick={() => { setEditingSuppTask(null); setIsSuppTaskModalOpen(true); }}
                            className="bg-purple-600 hover:bg-purple-500 text-white font-black py-2.5 px-6 rounded-2xl shadow-xl shadow-purple-900/40 hover:shadow-purple-500/40 transition-all transform hover:scale-[1.03] active:scale-[0.98] uppercase tracking-[0.2em] text-[10px] flex items-center gap-3"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            Ajouter Travail
                        </button>
                    </div>
                    <div className="overflow-auto max-h-[40vh] custom-scrollbar">
                        <table className="w-full text-left border-separate border-spacing-y-2">
                            <thead className="text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]"><tr>
                                <th className="px-6 py-4">Désignation / Équipement</th>
                                <th className="px-6 py-4">Équipes Mobilisées</th>
                                <th className="px-6 py-4 text-right">Durée (h)</th>
                                <th className="px-6 py-4 text-right">Charge (H-H)</th>
                                <th className="px-6 py-4 text-center">Gestion</th>
                            </tr></thead>
                            <tbody className="text-sm">
                                {supplementaryTasksInPeriod.map(task => (
                                    <tr key={task.id} className="bg-white/5 hover:bg-white/10 transition-colors group">
                                        <td className="px-6 py-4 rounded-l-2xl">
                                            <div className="font-bold text-white group-hover:text-purple-400 transition-colors">{task.action}</div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">{task.equipment}</div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-300">
                                            {task.teamDetails.map(d => d.team).join(', ')}
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-white">{task.duration.toFixed(2)}h</td>
                                        <td className="px-6 py-4 text-right font-mono font-bold text-purple-400">{task.totalManHours.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-center rounded-r-2xl">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => { setEditingSuppTask(task); setIsSuppTaskModalOpen(true); }} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
                                                <button onClick={() => handleDeleteSuppTask(task.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {supplementaryTasksInPeriod.length === 0 && <tr><td colSpan={5} className="p-12 text-center text-slate-600 italic font-medium">Aucun travail supplémentaire répertorié pour cette période.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Filters */}
                <section className="bg-[#070a12] p-6 rounded-[2rem] mb-8 border border-white/[0.08] shadow-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></svg>
                    </div>
                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
                            <h3 className="text-xl font-black text-white">Filtres de Suivi</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div>
                                <label htmlFor="start-date" className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Début Période</label>
                                <input type="datetime-local" id="start-date" value={startDate} onChange={e => setHotReviewState(s => ({ ...s, startDate: e.target.value }))} className="w-full bg-[#0d111a] border border-white/[0.08] rounded-xl px-4 py-2 text-slate-200 focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-xs" />
                            </div>
                            <div>
                                <label htmlFor="end-date" className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Fin Période</label>
                                <input type="datetime-local" id="end-date" value={endDate} onChange={e => setHotReviewState(s => ({ ...s, endDate: e.target.value }))} className="w-full bg-[#0d111a] border border-white/[0.08] rounded-xl px-4 py-2 text-slate-200 focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-xs" />
                            </div>
                            <div className="lg:col-span-2 flex items-end gap-3">
                                <button onClick={handleLoadTasks} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-900/40 uppercase tracking-[0.2em] text-[10px]">
                                    CHARGER & SYNCHRONISER
                                </button>
                                <button
                                    onClick={() => setIsAddTaskOutsideRangeModalOpen(true)}
                                    className="px-6 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white font-black py-2.5 rounded-xl transition-all border border-blue-500/30 uppercase tracking-[0.2em] text-[10px] flex items-center gap-2 whitespace-nowrap"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                                    Ajouter Tâche Hors Plage
                                </button>
                                <button onClick={handleReset} title="Réinitialiser" className="w-12 h-10 bg-white/[0.05] hover:bg-white/[0.1] text-white flex items-center justify-center rounded-xl transition-all border border-white/10">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 1-9 9c-4.97 0-9-4.03-9-9s4.03-9 9-9" /><path d="M21 3v5h-5" /></svg>
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <div>
                                <label htmlFor="discipline-filter" className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Discipline</label>
                                <select id="discipline-filter" value={selectedDiscipline} onChange={e => setHotReviewState(s => ({ ...s, selectedDiscipline: e.target.value }))} className="w-full bg-[#0d111a] border border-white/[0.08] rounded-xl px-3 py-2 text-slate-200 text-xs focus:ring-2 focus:ring-blue-500/50">
                                    {disciplineOptions.map(d => <option key={d} value={d}>{d === 'all' ? 'Toutes les disciplines' : d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="family-filter" className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Famille</label>
                                <select id="family-filter" value={selectedFamily} onChange={e => setHotReviewState(s => ({ ...s, selectedFamily: e.target.value }))} className="w-full bg-[#0d111a] border border-white/[0.08] rounded-xl px-3 py-2 text-slate-200 text-xs focus:ring-2 focus:ring-blue-500/50">
                                    {familyOptions.map(f => <option key={f} value={f}>{f === 'all' ? 'Toutes les familles' : f}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="equipment-filter" className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Équipement</label>
                                <select id="equipment-filter" value={selectedEquipment} onChange={e => setHotReviewState(s => ({ ...s, selectedEquipment: e.target.value }))} className="w-full bg-[#0d111a] border border-white/[0.08] rounded-xl px-3 py-2 text-slate-200 text-xs focus:ring-2 focus:ring-blue-500/50">
                                    {equipmentOptions.map(e => <option key={e} value={e}>{e === 'all' ? 'Tous les équipements' : e}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="team-filter" className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Équipe</label>
                                <select id="team-filter" value={selectedTeam} onChange={e => setHotReviewState(s => ({ ...s, selectedTeam: e.target.value }))} className="w-full bg-[#0d111a] border border-white/[0.08] rounded-xl px-3 py-2 text-slate-200 text-xs focus:ring-2 focus:ring-blue-500/50">
                                    {teamOptions.map(t => <option key={t} value={t}>{t === 'all' ? 'Toutes les équipes' : t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="task-search" className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block">Recherche</label>
                                <div className="relative">
                                    <input type="search" id="task-search" value={searchTerm} onChange={e => setHotReviewState(s => ({ ...s, searchTerm: e.target.value }))} placeholder="OT, action..." className="w-full bg-[#0d111a] border border-white/[0.08] rounded-xl px-4 py-2 text-slate-200 text-xs focus:ring-2 focus:ring-blue-500/50 pl-9" />
                                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={handleResetFilters}
                                    className="w-full bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 font-black py-2 rounded-xl border border-white/[0.08] transition-all uppercase tracking-widest text-[9px] h-[34px] flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    Vider Filtres
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-12 gap-8">
                    <div className="col-span-12">
                        {renderTaskTable("Suivi des Tâches de la Plage", sortedTasksToDisplay)}
                    </div>
                </div>

                {displayedStartDate && (
                    <section className="bg-[#070a12] border border-white/[0.07] rounded-[2.5rem] p-8 mt-8 shadow-xl">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-yellow-500 rounded-full"></span>
                                Suivi des Tâches en Cours
                            </h3>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={handleUndo}
                                    disabled={evaluationHistory.length === 0}
                                    className="bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-30 disabled:grayscale text-white text-[10px] font-black py-2 px-4 rounded-xl transition-all uppercase tracking-widest flex items-center gap-2 border border-white/10"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h10a5 5 0 0 1 5 5v2" /><path d="M3 10l5-5" /><path d="M3 10l5 5" /></svg>
                                    Undo
                                </button>
                                <button
                                    onClick={handleConfirmAllOngoing}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black py-2 px-4 rounded-xl shadow-lg shadow-emerald-900/40 transition-all uppercase tracking-widest flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                                    Tout Confirmer
                                </button>
                                <label className="flex items-center space-x-3 cursor-pointer bg-white/5 px-4 py-2 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={showOnlyCurrentInProgress}
                                        onChange={(e) => setShowOnlyCurrentInProgress(e.target.checked)}
                                        className="w-5 h-5 text-yellow-600 bg-white/[0.06] border-white/10 rounded-lg focus:ring-yellow-500"
                                    />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Filtrer Actives</span>
                                </label>
                            </div>
                        </div>
                        <div className="overflow-auto max-h-[60vh] custom-scrollbar pr-4">
                            <table className="w-full text-left border-separate border-spacing-y-2">
                                <thead className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] sticky top-0 bg-[#070a12] z-20">
                                    <tr>
                                        <th className="px-6 py-4">Action / Équipement</th>
                                        <th className="px-6 py-4">Discipline</th>
                                        <th className="px-6 py-4 text-center">Ressources<br /><span className="text-[8px] text-slate-500">P / R</span></th>
                                        <th className="px-6 py-4">Calendrier</th>
                                        <th className="px-6 py-4">Calendrier <br /><span className="text-emerald-500 text-[8px]">REEL</span></th>
                                        <th className="px-6 py-4 text-right">Durée/Restant <br /><span className="text-[8px] opacity-70">PLANIFIE</span></th>
                                        <th className="px-6 py-4 text-right">Durée/Restant <br /><span className="text-yellow-500 text-[8px]">REEL</span></th>
                                        <th className="px-6 py-4">Avancement <br /><span className="text-[8px] opacity-70">PLANIFIE</span></th>
                                        <th className="px-6 py-4">Avancement <br /><span className="text-blue-400 text-[8px]">REEL %</span></th>
                                        <th className="px-6 py-4">Réel <br /><span className="text-[8px] opacity-70">(Atteint)</span></th>
                                        <th className="px-6 py-4 text-right">Réalisation <br /><span className="text-[8px] opacity-70">Tactique</span></th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {ongoingTasksProgress.length > 0 ? (
                                        ongoingTasksProgress.map(({ task, durationInPeriod, progressPlanned, progressActual, timeLeftPlanned, timeLeftActual, actualEnd, realAtteint, tacticalRealization }) => {
                                            const isTracking = trackingTaskId === task.id;
                                            return (
                                                <tr key={task.id} className={`bg-white/5 hover:bg-white/10 transition-colors group ${isTracking ? 'ring-2 ring-blue-500 bg-blue-500/10' : ''}`}>
                                                    <td className="px-6 py-4 rounded-l-2xl">
                                                        <div className="font-bold text-white mb-1 group-hover:text-yellow-400 transition-colors">{task.action}</div>
                                                        <div className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{task.equipment}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg border border-white/5">{task.discipline || '-'}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {(() => {
                                                            const evalT = evaluationData.tasks[task.id];
                                                            const planned = task.manpower;
                                                            const actual = evalT?.actualManpower ?? planned;
                                                            const hasOverrun = actual > planned;
                                                            const actualDuration = (evalT?.actualStart && evalT?.actualEnd)
                                                                ? (new Date(evalT.actualEnd).getTime() - new Date(evalT.actualStart).getTime()) / 3600000
                                                                : task.duration;
                                                            const extraHH = hasOverrun ? (actual - planned) * actualDuration : 0;
                                                            return (
                                                                <div className="flex flex-col items-center gap-1">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[10px] text-slate-400 font-bold">{planned}</span>
                                                                        <span className="text-[9px] text-slate-600">/</span>
                                                                        <input
                                                                            type="number"
                                                                            min={1}
                                                                            value={actual}
                                                                            onChange={e => {
                                                                                const val = parseInt(e.target.value) || planned;
                                                                                setEvaluationData(prev => ({
                                                                                    ...prev!,
                                                                                    tasks: {
                                                                                        ...prev!.tasks,
                                                                                        [task.id]: { ...prev!.tasks[task.id], actualManpower: val }
                                                                                    }
                                                                                }));
                                                                            }}
                                                                            className={`w-14 text-center text-xs font-black rounded-lg px-2 py-1 border transition-all ${hasOverrun
                                                                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.2)]'
                                                                                : 'bg-white/5 border-white/5 text-slate-200'
                                                                                }`}
                                                                        />
                                                                    </div>
                                                                    {hasOverrun && (
                                                                        <div className="flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                                                            <div className="w-1 h-1 rounded-full bg-amber-400"></div>
                                                                            <span className="text-[9px] font-black text-amber-400">+{extraHH.toFixed(1)}HH</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="text-xs font-mono text-slate-300">{formatDateTime(task.startTime)}</div>
                                                            <div className="text-[10px] font-mono text-slate-500">→ {formatDateTime(task.endTime)}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="text-xs font-mono text-slate-400">{formatDateTime(actualEnd || task.endTime)}</div>
                                                            <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">ESTIMATION FIN</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="font-mono font-bold text-slate-400">{durationInPeriod.toFixed(1)}h</div>
                                                        <div className="text-[10px] font-mono font-black text-slate-500 mt-1">{timeLeftPlanned.toFixed(1)}h</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        {isTracking ? (
                                                            <input
                                                                type="number"
                                                                step="0.1"
                                                                min="0"
                                                                value={evaluationData.tasks[task.id]?.actualRemainingTime ?? timeLeftActual}
                                                                onChange={(e) => handleOngoingProgressChange(task.id, 'actualRemainingTime', parseFloat(e.target.value))}
                                                                className="bg-white/[0.04] border border-yellow-500/50 rounded px-2 py-1 text-xs font-mono text-yellow-400 w-20 text-right focus:ring-1 focus:ring-yellow-500"
                                                            />
                                                        ) : (
                                                            <div className="text-yellow-500 font-mono font-bold">{timeLeftActual.toFixed(1)}h</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="w-full max-w-[120px] flex items-center gap-3">
                                                            <div className="flex-1 bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
                                                                <div className="bg-slate-600 h-full" style={{ width: `${Math.min(100, progressPlanned)}%` }}></div>
                                                            </div>
                                                            <span className="text-[10px] font-mono text-slate-400">{progressPlanned.toFixed(0)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            {isTracking ? (
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    max="100"
                                                                    value={evaluationData.tasks[task.id]?.actualProgress ?? progressActual}
                                                                    onChange={(e) => handleOngoingProgressChange(task.id, 'actualProgress', parseFloat(e.target.value))}
                                                                    className="bg-white/[0.04] border border-blue-500/50 rounded px-2 py-1 text-xs font-mono text-blue-400 w-16 text-right focus:ring-1 focus:ring-blue-500"
                                                                />
                                                            ) : (
                                                                <div className="flex items-center gap-3 w-full max-w-[120px]">
                                                                    <div className="flex-1 bg-white/[0.06] rounded-full h-2 overflow-hidden shadow-inner">
                                                                        <div className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full" style={{ width: `${Math.min(100, progressActual)}%` }}></div>
                                                                    </div>
                                                                    <span className="text-xs font-black text-white">{progressActual.toFixed(0)}%</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-slate-300">
                                                        <div className="flex flex-col">
                                                            <span className="text-[11px] font-bold">{(realAtteint ?? 0).toFixed(1)} <span className="text-[8px] text-slate-500">H-H</span></span>
                                                            <span className="text-[8px] text-slate-500 uppercase">SUR {task.manHours.toFixed(1)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className={`text-sm font-black ${(tacticalRealization ?? 0) >= 100 ? 'text-emerald-400' : (tacticalRealization ?? 0) >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                            {(tacticalRealization ?? 0).toFixed(0)}%
                                                        </div>
                                                        <div className="text-[8px] text-slate-500 uppercase font-black tracking-tighter mt-0.5">VS OBJECTIF</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center rounded-r-2xl">
                                                        <div className="flex justify-center gap-2">
                                                            {!evaluationData.tasks[task.id]?.isConfirmed && (
                                                                <button
                                                                    onClick={() => handleConfirmTask(task.id)}
                                                                    className="bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white p-2 rounded-xl transition-all border border-emerald-500/20"
                                                                    title="Confirmer l'avancement"
                                                                >
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                                                                </button>
                                                            )}
                                                            {isTracking ? (
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => handleApplyChanges(task.id)} className="bg-blue-500 text-white p-2 rounded-xl shadow-lg shadow-blue-500/20 hover:scale-105 transition-transform" title="Valider">
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>
                                                                    </button>
                                                                    <button onClick={handleCancelTracking} className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-xl transition-all border border-white/10" title="Annuler">
                                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button onClick={() => handleStartTracking(task.id)} className="bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white p-2 rounded-xl transition-all border border-white/5">
                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr><td colSpan={8} className="p-16 text-center text-slate-600 italic font-medium">Aucune tâche en cours d'exécution détectée dans cette plage.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 pb-12">
                    <div className="bg-[#070a12] border border-white/[0.07] rounded-[2.5rem] p-8 shadow-xl">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                                <h3 className="text-xl font-black text-white">Avancement par Équipe</h3>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Analyse Période</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar pt-2">
                            {teamProgress.map(team => (
                                <button
                                    key={team.name}
                                    onClick={() => setViewingTasksInfo({ title: `Détails : ${team.name}`, tasks: team.tasks })}
                                    className="group relative bg-white/5 border border-white/5 rounded-3xl p-5 hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300 text-left overflow-hidden shadow-sm"
                                >
                                    {/* Background Glow */}
                                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>

                                    <div className="flex items-center gap-5 relative z-10">
                                        {/* Circular Progress Gauge */}
                                        <div className="relative w-16 h-16 flex-shrink-0">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                                                <circle
                                                    cx="32" cy="32" r="28"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                    fill="transparent"
                                                    strokeDasharray={176}
                                                    strokeDashoffset={176 - (176 * team.progress) / 100}
                                                    className={`${team.progress >= 100 ? 'text-emerald-400' : team.progress >= 80 ? 'text-blue-400' : 'text-slate-500'} transition-all duration-1000 ease-out`}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <div className="absolute inset-0 flex items-center justify-center font-black text-[10px] text-white">
                                                {team.progress.toFixed(0)}%
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1 group-hover:text-blue-400 transition-colors truncate">
                                                {team.name.split(' ')[0]} {/* Category */}
                                            </p>
                                            <h4 className="font-bold text-white text-sm truncate" title={team.name}>
                                                {team.name}
                                            </h4>
                                            <div className="mt-2 flex items-center gap-2">
                                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{team.tasks.length} Tâches</span>
                                                <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                                                <span className="text-[8px] font-bold text-blue-400 uppercase tracking-widest group-hover:underline">Voir Liste</span>
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#070a12] border border-white/[0.07] rounded-[2.5rem] p-8 shadow-xl">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-1.5 h-6 bg-cyan-500 rounded-full"></div>
                                <h3 className="text-xl font-black text-white">Avancement par Discipline</h3>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Analyse par Secteur</p>
                        </div>
                        <div className="h-[350px] w-full mt-4 flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={disciplineProgress}>
                                    <PolarGrid stroke="#ffffff10" />
                                    <PolarAngleAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'black' }} />
                                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                    <Radar
                                        name="Avancement"
                                        dataKey="progress"
                                        stroke="#22d3ee"
                                        fill="#22d3ee"
                                        fillOpacity={0.3}
                                        strokeWidth={3}
                                        animationDuration={1500}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 justify-center pb-2">
                            {disciplineProgress.map(disc => (
                                <button
                                    key={disc.name}
                                    onClick={() => setViewingTasksInfo({ title: `Détails Discipline : ${disc.name}`, tasks: disc.tasks })}
                                    className="px-4 py-1.5 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl hover:bg-cyan-500/20 hover:border-cyan-500/40 hover:scale-105 transition-all active:scale-95 group"
                                >
                                    <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest group-hover:text-cyan-300 transition-colors">{disc.name}: {disc.progress.toFixed(0)}%</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Complete Shutdown Gantt Section */}
                <section className="mt-12 mb-12 bg-[#070a12] border border-white/[0.07] rounded-[3rem] p-1 overflow-hidden shadow-2xl backdrop-blur-sm">
                    <div className="p-8 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-2 h-8 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Master Chronology & Execution Progress</h2>
                            </div>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] ml-5 italic">Vue Chronologique Complète de l'Arrêt</p>
                        </div>

                        <div className="flex items-center gap-2 bg-slate-950/50 p-1.5 rounded-2xl border border-white/5">
                            {[
                                { id: 'all', label: 'Toutes les Tâches', color: 'bg-slate-700' },
                                { id: 'done', label: 'Terminées', color: 'bg-emerald-500' },
                                { id: 'in-progress', label: 'En Cours', color: 'bg-blue-500' },
                                { id: 'pending', label: 'À Faire', color: 'bg-slate-400' }
                            ].map(filter => (
                                <button
                                    key={filter.id}
                                    onClick={() => setGanttStatusFilter(filter.id as any)}
                                    className={`
                                        px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all
                                        ${ganttStatusFilter === filter.id
                                            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/50'
                                            : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}
                                    `}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${filter.color}`}></div>
                                        {filter.label}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="p-4 pt-0">
                        <ProfessionalGanttChart
                            results={filteredGanttResults}
                            parameters={parameters}
                            familyOrder={ganttFamilyOrder}
                            setFamilyOrder={setGanttFamilyOrder}
                            customCriticalPaths={[]}
                            isColdStopFlow={isColdStopFlow}
                            taskProgress={taskProgressMapForGantt}
                            timelineOptions={{ unit: 'Heures', interval: 4 }}
                            disciplineColors={new Map(results.scheduledTasks.map(t => [t.discipline, '#3b82f6']))} // Generic color, individual status colors used in bar
                            showFlow={false}
                            theme="dark"
                            isHoverDetailsEnabled={true}
                            onTaskClick={(task) => setViewingTasksInfo({ title: `Détails : ${task.action}`, tasks: [task] })}
                        />
                    </div>
                </section>

                {/* Custom Alert Modal */}
                {isAlertModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div
                            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
                            onClick={() => setIsAlertModalOpen(false)}
                        ></div>
                        <div className="relative bg-[#070a12] border border-white/[0.08] rounded-[2.5rem] p-8 shadow-2xl max-w-md w-full animate-in zoom-in-95 duration-300">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Attention</h3>
                            </div>

                            <p className="text-slate-300 font-medium mb-8 leading-relaxed">
                                {alertMessage}
                            </p>

                            <button
                                onClick={() => setIsAlertModalOpen(false)}
                                className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl shadow-xl shadow-amber-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest text-xs"
                            >
                                Compris
                            </button>
                        </div>
                    </div>
                )}

                {/* Intel Slippage Toasts */}
                <div className="fixed top-8 right-8 z-[100] flex flex-col gap-3 pointer-events-none">
                    {toasts.map(toast => (
                        <div
                            key={toast.id}
                            className={`
                                px-6 py-4 rounded-[1.5rem] shadow-2xl border flex items-center gap-4 animate-in slide-in-from-right-8 fade-in duration-500 pointer-events-auto backdrop-blur-md
                                ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' :
                                    toast.type === 'warning' ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400' :
                                        toast.type === 'error' ? 'bg-red-500/20 border-red-500/50 text-red-400' :
                                            'bg-blue-500/20 border-blue-500/50 text-blue-400'}
                            `}
                        >
                            <span className="text-sm font-black tracking-tight">{toast.message}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div >
    );
};

export default HotExecutionReview;

