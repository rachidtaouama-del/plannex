

import React, { useState, useMemo, useEffect } from 'react';
import type { CalculationResults, AppParameters, EvaluationData, EvaluatedTaskData, SupplementaryTask, TaskStatus, ScheduledTask, NonCompletionDetails, SlippageDetails, GlobalSlippageEvent, ReportData, EvaluationKpis, TeamDetail, ChronologyEvent, EventDetail } from '../types';
import { ChronologyGanttChart } from './previews/ChronologyGanttChart';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, Tooltip } from 'recharts';
import { exportToPDF } from '../services/pdfExportService';
import { ProfessionalGanttChart } from './ProfessionalGanttChart';


// FIX: Added EventDetailModal and its dependencies to resolve 'Cannot find name' error.
interface EventDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (details: { incidents: EventDetail[], accidents: EventDetail[] }) => void;
    initialIncidents: EventDetail[];
    initialAccidents: EventDetail[];
    defaultDateTime: string;
}


interface SingleEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (events: EventDetail[]) => void;
    initialData: EventDetail[];
    defaultDateTime: string;
}

const IncidentModal: React.FC<SingleEventModalProps> = ({ isOpen, onClose, onSave, initialData, defaultDateTime }) => {
    const [events, setEvents] = useState<EventDetail[]>(initialData);
    useEffect(() => { if (isOpen) setEvents(initialData); }, [isOpen, initialData]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex justify-center items-center z-[70] p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-[#0a0d14] rounded-[2rem] shadow-[0_0_80px_rgba(245,158,11,0.15)] w-full max-w-3xl border border-amber-500/20 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent border-b border-white/5">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-amber-500/60 uppercase tracking-[0.4em]">Sécurité HSE</p>
                                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Gestion des Incidents</h2>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>
                    <div className="mt-4">
                        <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">{events.length} Enregistré{events.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>
                <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
                    {events.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-14 gap-4 opacity-40">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            <p className="text-slate-500 font-black uppercase text-xs tracking-widest text-center">Aucun incident enregistré</p>
                        </div>
                    )}
                    {events.map((item, index) => (
                        <div key={item.id} className="group bg-[#111520]/80 border border-white/[0.07] hover:border-amber-500/30 rounded-[1.5rem] overflow-hidden transition-all">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-amber-500/[0.04]">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-[10px] font-black text-amber-400">{index + 1}</span>
                                    <span className="text-[10px] font-black text-amber-400/70 uppercase tracking-[0.3em]">Incident #{index + 1}</span>
                                </div>
                                <button onClick={() => setEvents(prev => prev.filter(e => e.id !== item.id))} className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Horodatage</label>
                                    <input type="datetime-local" value={item.dateTime} onChange={e => setEvents(prev => prev.map(ev => ev.id === item.id ? { ...ev, dateTime: e.target.value } : ev))} className="w-full bg-black/40 border border-white/5 text-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-amber-500/50 outline-none transition-all" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Détails de l'événement</label>
                                    <textarea value={item.description} onChange={e => setEvents(prev => prev.map(ev => ev.id === item.id ? { ...ev, description: e.target.value } : ev))} placeholder="Décrivez l'incident en détail..." rows={2} className="w-full bg-black/40 border border-white/5 text-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-amber-500/50 outline-none transition-all resize-none" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="px-6 py-5 border-t border-white/5 bg-black/20 flex items-center justify-between gap-3">
                    <button onClick={() => setEvents(prev => [...prev, { id: crypto.randomUUID(), dateTime: defaultDateTime || new Date().toISOString().slice(0, 16), description: '' }])} className="flex items-center gap-2 px-5 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Ajouter un Incident
                    </button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 text-sm font-black text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 uppercase tracking-widest">Annuler</button>
                        <button onClick={() => { onSave(events); onClose(); }} className="px-6 py-2.5 text-sm font-black text-black bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all active:scale-95 uppercase tracking-widest">Enregistrer</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const AccidentModal: React.FC<SingleEventModalProps> = ({ isOpen, onClose, onSave, initialData, defaultDateTime }) => {
    const [events, setEvents] = useState<EventDetail[]>(initialData);
    useEffect(() => { if (isOpen) setEvents(initialData); }, [isOpen, initialData]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex justify-center items-center z-[70] p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-[#0a0d14] rounded-[2rem] shadow-[0_0_80px_rgba(239,68,68,0.15)] w-full max-w-3xl border border-red-500/20 overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="relative px-8 pt-8 pb-6 bg-gradient-to-br from-red-500/10 via-transparent to-transparent border-b border-white/5">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-400/60 to-transparent" />
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><path d="M12 9v4" /><path d="M10.363 3.591 2.257 17.125a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.635-2.87L13.636 3.59a1.914 1.914 0 0 0-3.273 0Z" /><path d="M12 17h.01" /></svg>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-red-500/60 uppercase tracking-[0.4em]">Sécurité Critique</p>
                                <h2 className="text-2xl font-black text-white tracking-tight uppercase">Gestion des Accidents</h2>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                        <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest">{events.length} Enregistré{events.length !== 1 ? 's' : ''}</span>
                        {events.length > 0 && <span className="px-3 py-1 rounded-full bg-red-600/20 border border-red-600/30 text-red-300 text-[10px] font-black uppercase tracking-widest animate-pulse">⚠ Déclaration obligatoire</span>}
                    </div>
                </div>
                <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
                    {events.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-14 gap-4 opacity-40">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1"><path d="M12 9v4" /><path d="M10.363 3.591 2.257 17.125a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.635-2.87L13.636 3.59a1.914 1.914 0 0 0-3.273 0Z" /><path d="M12 17h.01" /></svg>
                            <p className="text-slate-500 font-black uppercase text-xs tracking-widest text-center">Aucun accident enregistré</p>
                        </div>
                    )}
                    {events.map((item, index) => (
                        <div key={item.id} className="group bg-[#111520]/80 border border-white/[0.07] hover:border-red-500/30 rounded-[1.5rem] overflow-hidden transition-all">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 bg-red-500/[0.04]">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-[10px] font-black text-red-400">{index + 1}</span>
                                    <span className="text-[10px] font-black text-red-400/70 uppercase tracking-[0.3em]">Accident #{index + 1}</span>
                                </div>
                                <button onClick={() => setEvents(prev => prev.filter(e => e.id !== item.id))} className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5">
                                <div>
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Horodatage</label>
                                    <input type="datetime-local" value={item.dateTime} onChange={e => setEvents(prev => prev.map(ev => ev.id === item.id ? { ...ev, dateTime: e.target.value } : ev))} className="w-full bg-black/40 border border-white/5 text-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-red-500/50 outline-none transition-all" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Détails de l'événement</label>
                                    <textarea value={item.description} onChange={e => setEvents(prev => prev.map(ev => ev.id === item.id ? { ...ev, description: e.target.value } : ev))} placeholder="Décrivez l'accident en détail..." rows={2} className="w-full bg-black/40 border border-white/5 text-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-red-500/50 outline-none transition-all resize-none" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="px-6 py-5 border-t border-white/5 bg-black/20 flex items-center justify-between gap-3">
                    <button onClick={() => setEvents(prev => [...prev, { id: crypto.randomUUID(), dateTime: defaultDateTime || new Date().toISOString().slice(0, 16), description: '' }])} className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-black text-xs uppercase tracking-widest rounded-xl transition-all active:scale-95">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        Ajouter un Accident
                    </button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 text-sm font-black text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/5 uppercase tracking-widest">Annuler</button>
                        <button onClick={() => { onSave(events); onClose(); }} className="px-6 py-2.5 text-sm font-black text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.3)] transition-all active:scale-95 uppercase tracking-widest">Enregistrer</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
const formatDateForInput = (date: Date): string => {
    if (!date || isNaN(date.getTime())) return '';
    const tzoffset = date.getTimezoneOffset() * 60000; //offset in milliseconds
    const localISOTime = new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
    return localISOTime;
};

// Helper to calculate duration in hours between two date strings
const calculateDuration = (startStr: string, endStr: string): number | null => {
    if (!startStr || !endStr) return null;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return null;
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};

// Helper to format duration for display
const formatDuration = (hours: number | null): string => {
    return hours !== null ? `${hours.toFixed(2)}h` : '-';
};

const DeleteConfirmModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex justify-center items-center z-[100] p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-slate-900 border border-white/10 rounded-[2rem] shadow-[0_0_50px_-12px_rgba(244,63,94,0.3)] w-full max-w-md overflow-hidden transform scale-100 transition-all duration-300 ring-1 ring-white/5" onClick={e => e.stopPropagation()}>
                <div className="h-2 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-500"></div>
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20 group animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">{title}</h3>
                    <p className="text-slate-400 text-sm font-medium leading-relaxed">{message}</p>
                </div>
                <div className="grid grid-cols-2 border-t border-white/5 bg-slate-900/50">
                    <button onClick={onClose} className="p-6 text-sm font-black text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all uppercase tracking-widest border-r border-white/5 outline-none">
                        Annuler
                    </button>
                    <button onClick={() => { onConfirm(); onClose(); }} className="p-6 text-sm font-black text-rose-500 hover:text-white hover:bg-rose-600 transition-all uppercase tracking-widest outline-none">
                        Supprimer
                    </button>
                </div>
            </div>
        </div>
    );
};

const teams = ['Monteur Echaffaudage', 'Cleaner', 'Planificateur', 'Vulcanizer', 'Mécanicien', 'Chaudronnier', 'Electricien', 'Instrumentiste', 'Graisseur'];

const AddTaskModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: SupplementaryTask) => void;
    taskToEdit: SupplementaryTask | null;
    parameters: AppParameters;
    availableEquipments: string[];
    availableDisciplines: string[];
    results: CalculationResults;
}> = ({ isOpen, onClose, onSave, taskToEdit, parameters, availableEquipments, availableDisciplines, results }) => {
    const isEditing = !!taskToEdit;

    const [action, setAction] = useState('');
    const [equipment, setEquipment] = useState('');
    const [maintenanceType, setMaintenanceType] = useState<string>('Préventive');
    const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
    const [teamDetails, setTeamDetails] = useState<TeamDetail[]>([]);
    const [duration, setDuration] = useState(0);
    const [customTeam, setCustomTeam] = useState('');

    useEffect(() => {
        if (isOpen) {
            if (isEditing && taskToEdit) {
                setAction(taskToEdit.action);
                setEquipment(taskToEdit.equipment);
                setMaintenanceType(taskToEdit.maintenanceType);
                setTeamDetails(taskToEdit.teamDetails);
                setSelectedTeams(taskToEdit.teamDetails.map(d => d.team));
                setDuration(taskToEdit.duration);
            } else {
                setAction('');
                setEquipment('');
                setMaintenanceType('Préventive');
                setTeamDetails([]);
                setSelectedTeams([]);
                setDuration(0);
            }
        }
    }, [isOpen, isEditing, taskToEdit]);

    useEffect(() => {
        const existingDetails = new Map(teamDetails.map(d => [d.team, d]));
        const newDetails = selectedTeams.map(team =>
            existingDetails.get(team) || { team, manpower: 1, duration: 0, manHours: 0 }
        );
        setTeamDetails(newDetails);
    }, [selectedTeams]);

    useEffect(() => {
        setTeamDetails(currentDetails =>
            currentDetails.map(detail => ({
                ...detail,
                duration: duration,
                manHours: detail.manpower * duration,
            }))
        );
    }, [duration]);

    const handleTeamDetailChange = (teamName: string, field: 'manpower', value: string) => {
        const numericValue = Number(value) || 0;
        setTeamDetails(currentDetails =>
            currentDetails.map(detail => {
                if (detail.team === teamName) {
                    const updatedDetail = { ...detail, [field]: numericValue };
                    updatedDetail.duration = duration;
                    updatedDetail.manHours = updatedDetail.manpower * duration;
                    return updatedDetail;
                }
                return detail;
            })
        );
    };

    const toggleTeam = (team: string) => {
        setSelectedTeams(prev =>
            prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
        );
    };

    const handleAddCustomTeam = () => {
        if (customTeam.trim() && !selectedTeams.includes(customTeam.trim())) {
            setSelectedTeams(prev => [...prev, customTeam.trim()]);
            setCustomTeam('');
        }
    };

    const totalManHours = useMemo(() => {
        return teamDetails.reduce((sum, detail) => sum + detail.manHours, 0);
    }, [teamDetails]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (duration <= 0) {
            alert("Veuillez définir une durée valide pour la tâche.");
            return;
        }
        if (teamDetails.length === 0) {
            alert("Veuillez sélectionner au moins une équipe.");
            return;
        }
        onSave({
            id: isEditing && taskToEdit ? taskToEdit.id : crypto.randomUUID(),
            action,
            equipment,
            maintenanceType,
            teamDetails,
            totalManHours,
            duration,
        });
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex justify-center items-center z-[70] p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-slate-900 rounded-3xl shadow-[0_0_100px_-20px_rgba(6,182,212,0.3)] w-full max-w-3xl border border-white/10 overflow-hidden transform scale-100 transition-all duration-300" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-6 border-b border-white/5 bg-gradient-to-r from-cyan-500/10 to-blue-600/5">
                    <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-cyan-400"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        {isEditing ? 'Modifier le Travail Spécial' : 'Ajouter un Travail Supplémentaire'}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 rounded-full p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>
                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 ml-1">Action Requise</label>
                            <input type="text" value={action} onChange={e => setAction(e.target.value)} required className="w-full bg-slate-900/60 border border-white/10 text-slate-200 rounded-xl px-4 py-3 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_0_15px_rgba(6,182,212,0.1)] outline-none placeholder:text-slate-600 font-medium" placeholder="Ex: Remplacement du joint sur ligne principale..." />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 ml-1">Équipement</label>
                            <input
                                list="equipment-list"
                                type="text"
                                value={equipment}
                                onChange={e => setEquipment(e.target.value)}
                                required
                                className="w-full bg-slate-900/60 border border-white/10 text-slate-200 rounded-xl px-4 py-3 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_0_15px_rgba(6,182,212,0.1)] outline-none placeholder:text-slate-600 font-medium"
                                placeholder="Rechercher ou saisir un équipement..."
                            />
                            <datalist id="equipment-list">
                                {availableEquipments.map(eq => <option key={eq} value={eq} />)}
                            </datalist>
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 ml-1">Type de Maintenance</label>
                            <div className="relative group">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500/50 group-focus-within:text-cyan-400 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>
                                </span>
                                <input
                                    list="maintenance-list"
                                    type="text"
                                    value={maintenanceType}
                                    onChange={e => setMaintenanceType(e.target.value as any)}
                                    required
                                    className="w-full bg-slate-900/60 border border-white/10 text-slate-200 rounded-xl pl-10 pr-4 py-3 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner outline-none font-medium text-sm"
                                    placeholder="Sélectionner ou saisir..."
                                />
                                <datalist id="maintenance-list">
                                    {Array.from(new Set(results.scheduledTasks.map(t => t.maintenanceType).filter(Boolean))).map(mt => (
                                        <option key={mt} value={mt} />
                                    ))}
                                    <option value="Préventive" />
                                    <option value="Corrective" />
                                    <option value="Curative" />
                                    <option value="Réglementaire" />
                                </datalist>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 ml-1">Durée Prévue (H)</label>
                            <div className="relative">
                                <input
                                    type="number" step="0.01" min="0" required
                                    value={duration}
                                    onChange={e => setDuration(Number(e.target.value) || 0)}
                                    className="w-full bg-slate-900/60 border border-white/10 text-slate-200 rounded-xl px-4 py-3 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner outline-none text-xl font-mono font-bold pr-12 focus:shadow-[inset_0_2px_4_rgba(0,0,0,0.6),0_0_15px_rgba(6,182,212,0.1)]"
                                    placeholder="0.00"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                                    <span className="text-slate-500 font-bold">h</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 ml-1">Équipes Assignées</label>
                            <div className="space-y-3">
                                <div className="flex flex-wrap gap-2 max-h-[120px] overflow-y-auto p-2 bg-slate-900/30 rounded-xl border border-white/5 custom-scrollbar">
                                    {availableDisciplines.concat(selectedTeams.filter(t => !availableDisciplines.includes(t))).map(team => (
                                        <button
                                            key={team}
                                            type="button"
                                            onClick={() => toggleTeam(team)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${selectedTeams.includes(team)
                                                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                                                : 'bg-slate-800/50 border-white/5 text-slate-400 hover:border-white/10 hover:bg-slate-800'
                                                }`}
                                        >
                                            {team}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={customTeam}
                                        onChange={e => setCustomTeam(e.target.value)}
                                        placeholder="Ajouter une autre discipline..."
                                        className="flex-grow bg-slate-900/60 border border-white/10 text-slate-300 rounded-xl px-4 py-2 text-xs focus:border-cyan-500/30 outline-none transition-all placeholder:text-slate-600"
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomTeam(); } }}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddCustomTeam}
                                        className="bg-slate-800 hover:bg-slate-700 text-cyan-400 p-2 rounded-xl border border-white/10 transition-all font-bold text-xs"
                                    >
                                        + Ajouter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {teamDetails.length > 0 && <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent my-6"></div>}

                    {teamDetails.length > 0 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] mb-4 px-1">Détail des Ressources</h3>
                            <div className="space-y-2">
                                {teamDetails.map(detail => (
                                    <div key={detail.team} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-white/5 hover:border-cyan-500/30 transition-all shadow-sm group">
                                        <div className="flex items-center gap-3 w-1/2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgb(52,211,153)]"></div>
                                            <h4 className="font-bold text-slate-200 truncate text-sm group-hover:text-cyan-100">{detail.team}</h4>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="flex flex-col items-center">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Effectif</label>
                                                <input
                                                    type="number" step="1" min="1" required
                                                    value={detail.manpower}
                                                    onChange={e => handleTeamDetailChange(detail.team, 'manpower', e.target.value)}
                                                    className="w-16 bg-slate-900 border border-white/10 rounded-lg py-1 text-center text-slate-200 font-bold focus:border-cyan-500/50 outline-none transition-all text-xs" />
                                            </div>
                                            <div className="text-center w-20">
                                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 block">H-H</label>
                                                <div className="w-full bg-slate-900/80 border border-cyan-500/10 rounded-lg py-1 text-cyan-300 font-mono font-bold text-xs">
                                                    {detail.manHours.toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {totalManHours > 0 && (
                        <div className="mt-8 p-6 bg-gradient-to-br from-slate-800 to-slate-900 border border-cyan-500/20 rounded-2xl flex justify-between items-center shadow-lg transform transition-all hover:scale-[1.01] animate-in fade-in zoom-in-95 duration-500">
                            <div>
                                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Durée Évaluée</span>
                                <span className="text-xl font-bold text-slate-200">{duration.toFixed(2)}<span className="text-sm text-slate-500 ml-1">h</span></span>
                            </div>
                            <div className="h-10 w-px bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent"></div>
                            <div className="text-right">
                                <span className="block text-[10px] font-black text-cyan-500/80 uppercase tracking-widest mb-1">Charge Totale H-H</span>
                                <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-mono drop-shadow-[0_2px_10px_rgba(6,182,212,0.3)]">{totalManHours.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-6 gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-white/5">Annuler</button>
                        <button type="submit" className="px-8 py-3 text-sm font-black text-slate-900 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] transition-all outline-none border-none uppercase tracking-wider">
                            {isEditing ? 'Confirmer' : 'Enregistrer la Tâche'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const NonCompletionModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (details: NonCompletionDetails) => void;
    initialDetails?: NonCompletionDetails;
}> = ({ isOpen, onClose, onSave, initialDetails }) => {
    const [details, setDetails] = useState<NonCompletionDetails>(initialDetails || { cause: '', criticality: '', counterMeasure: '', pilot: '' });

    useEffect(() => {
        setDetails(initialDetails || { cause: '', criticality: '', counterMeasure: '', pilot: '' });
    }, [initialDetails, isOpen]);

    if (!isOpen) return null;

    const handleSave = () => onSave(details);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setDetails(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center z-[100] p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-slate-900 border border-white/10 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                <header className="p-8 pb-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -tr-10 -mr-10"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-white tracking-tighter uppercase">Analyse de Non-Réalisation</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Documentation détaillée de l'écart d'exécution</p>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all flex items-center justify-center group">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:rotate-90 transition-transform"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </header>

                <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Cause Racine</label>
                            <textarea
                                name="cause"
                                value={details.cause}
                                onChange={handleChange}
                                placeholder="Expliquez pourquoi la tâche n'a pas été réalisée..."
                                className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-4 py-3 text-slate-200 text-sm focus:border-red-500/50 outline-none transition-all min-h-[100px] shadow-inner"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Criticité</label>
                                <select
                                    name="criticality"
                                    value={details.criticality}
                                    onChange={e => setDetails(prev => ({ ...prev, criticality: e.target.value }))}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 text-sm focus:border-red-500/50 outline-none transition-all shadow-inner"
                                >
                                    <option value="">Sélectionner...</option>
                                    <option value="Basse">Basse</option>
                                    <option value="Moyenne">Moyenne</option>
                                    <option value="Haute">Haute</option>
                                    <option value="Critique">Critique</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Pilote / Responsable</label>
                                <input
                                    type="text"
                                    name="pilot"
                                    value={details.pilot}
                                    onChange={handleChange}
                                    placeholder="Nom du responsable..."
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-slate-200 text-sm focus:border-red-500/50 outline-none transition-all shadow-inner"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] ml-1">Contre-Mesure / Plan d'Action</label>
                            <textarea
                                name="counterMeasure"
                                value={details.counterMeasure}
                                onChange={handleChange}
                                placeholder="Quelles actions ont été prises pour pallier ce manque ?"
                                className="w-full bg-slate-950/50 border border-white/10 rounded-2xl px-4 py-3 text-slate-200 text-sm focus:border-red-500/50 outline-none transition-all min-h-[80px] shadow-inner"
                            />
                        </div>
                    </div>
                </div>

                <footer className="p-8 bg-slate-950/30 border-t border-white/5 flex gap-4">
                    <button
                        onClick={onClose}
                        className="flex-1 px-6 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all border border-white/5 active:scale-95 uppercase text-xs tracking-widest"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-[1.5] px-6 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black transition-all shadow-[0_4px_20px_rgba(225,29,72,0.3)] active:scale-95 uppercase text-xs tracking-[0.2em]"
                    >
                        Enregistrer l'Analyse
                    </button>
                </footer>
            </div>
        </div>
    );
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" onClick={onClose}>
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

const SlippageEventFormModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: Omit<GlobalSlippageEvent, 'id'> & { id?: string }) => void;
    eventToEdit: GlobalSlippageEvent | null;
    parameters: AppParameters;
}> = ({ isOpen, onClose, onSave, eventToEdit, parameters }) => {
    const isEditing = !!eventToEdit;

    const getInitialState = () => {
        if (isEditing && eventToEdit) return { ...eventToEdit, lostHours: String(eventToEdit.lostHours) };
        return {
            eventDate: formatDateForInput(new Date(parameters.shutdownStart)),
            lostHours: '0',
            cause: '',
            preventiveAction: '',
            pilot: '',
            imputation: ''
        };
    };

    const [event, setEvent] = useState(getInitialState());
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    useEffect(() => {
        setEvent(getInitialState());
        setTouched({});
    }, [eventToEdit, isOpen, parameters]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...event, lostHours: Number(event.lostHours) || 0 });
        onClose();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEvent(prev => ({ ...prev, [name]: value }));
        setTouched(prev => ({ ...prev, [name]: true }));
    };

    const isFormValid = event.cause.trim().length > 0 && Number(event.lostHours) > 0;

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex justify-center items-center z-[100] p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col border border-white/10 overflow-hidden transform scale-100 transition-all duration-500 shadow-cyan-500/10" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-8 border-b border-white/5 bg-gradient-to-r from-emerald-500/10 via-cyan-500/5 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 shadow-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">{isEditing ? "Modifier l'Événement" : 'Nouvelle Cause de Glissement'}</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Analyse des écarts de performance</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-all bg-slate-800 hover:bg-slate-700 rounded-full p-2.5 hover:rotate-90">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>

                <div className="p-8 space-y-8 bg-slate-900/50 overflow-y-auto flex-1 custom-scrollbar">
                    {!isFormValid && (
                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl animate-pulse">
                            <div className="flex gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-400 shrink-0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider leading-relaxed">Veuillez renseigner la cause et la durée pour valider l'analyse.</p>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Date Événement</label>
                                <input
                                    type="datetime-local"
                                    name="eventDate"
                                    value={event.eventDate}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-slate-950/50 border border-white/5 text-slate-200 rounded-2xl px-5 py-4 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all outline-none font-bold text-sm shadow-inner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Heures Perdues</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        name="lostHours"
                                        value={event.lostHours}
                                        onChange={handleChange}
                                        required
                                        className={`w-full bg-slate-950/50 border ${touched.lostHours && Number(event.lostHours) <= 0 ? 'border-red-500/50' : 'border-white/5'} text-slate-200 rounded-2xl px-5 py-4 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all outline-none font-black text-lg font-mono shadow-inner`}
                                    />
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 font-black">h</span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Analyse de la Cause</label>
                            <textarea
                                name="cause"
                                value={event.cause}
                                onChange={handleChange}
                                required
                                placeholder="Décrivez l'origine précise du glissement..."
                                className={`w-full bg-slate-950/50 border ${touched.cause && event.cause.trim() === '' ? 'border-red-500/50' : 'border-white/5'} text-slate-200 rounded-2xl px-5 py-4 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all outline-none text-sm min-h-[100px] shadow-inner resize-none font-medium placeholder:text-slate-700`}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Action de Remédiation</label>
                            <textarea
                                name="preventiveAction"
                                value={event.preventiveAction}
                                onChange={handleChange}
                                placeholder="Plan d'action prévu..."
                                className="w-full bg-slate-950/50 border border-white/5 text-slate-200 rounded-2xl px-5 py-4 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all outline-none text-sm min-h-[100px] shadow-inner resize-none font-medium placeholder:text-slate-700"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Responsable (Pilote)</label>
                                <input type="text" name="pilot" value={event.pilot} onChange={handleChange} className="w-full bg-slate-950/50 border border-white/5 text-slate-200 rounded-2xl px-5 py-4 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all outline-none font-bold text-sm shadow-inner" placeholder="Nom du responsable..." />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Imputation / Affectation</label>
                                <input type="text" name="imputation" value={event.imputation || ''} onChange={handleChange} className="w-full bg-slate-950/50 border border-white/5 text-slate-200 rounded-2xl px-5 py-4 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 transition-all outline-none font-bold text-sm shadow-inner" placeholder="Code ou centre de coût..." />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 gap-4">
                            <button type="button" onClick={onClose} className="px-8 py-4 text-xs font-black text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-2xl transition-all border border-white/5 uppercase tracking-widest">Annuler</button>
                            <button
                                type="submit"
                                disabled={!isFormValid}
                                className={`px-10 py-4 text-xs font-black text-slate-900 rounded-2xl shadow-xl transition-all border-none uppercase tracking-widest ${isFormValid ? 'bg-gradient-to-r from-emerald-400 to-cyan-500 hover:scale-105 active:scale-95 shadow-cyan-500/20' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}
                            >
                                {isEditing ? 'Mettre à jour' : 'Valider l\'Analyse'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

const SlippageLogModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    events: GlobalSlippageEvent[];
    totalSlippageHours: number;
    onAddNew: () => void;
    onEdit: (event: GlobalSlippageEvent) => void;
    onDelete: (eventId: string) => void;
}> = ({ isOpen, onClose, events, totalSlippageHours, onAddNew, onEdit, onDelete }) => {
    if (!isOpen) return null;

    const analyzedHours = events.reduce((sum, event) => sum + event.lostHours, 0);
    const unexplainedHours = Math.max(0, totalSlippageHours - analyzedHours);
    const justificationRate = totalSlippageHours > 0 ? (analyzedHours / totalSlippageHours) * 100 : 100;

    return (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl flex justify-center items-center z-50 p-4 animate-in fade-in duration-500" onClick={onClose}>
            <div className="bg-slate-900 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] w-full max-w-5xl max-h-[90vh] flex flex-col border border-white/10 overflow-hidden relative group" onClick={e => e.stopPropagation()}>
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 blur-[120px] -mr-48 -mt-48"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-500/5 blur-[120px] -ml-48 -mb-48"></div>

                <header className="flex justify-between items-center p-10 border-b border-white/5 relative z-10">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                            </div>
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Analyse du Glissement Global</h2>
                        </div>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-[0.4em] ml-16 italic opacity-80">Justification et décomposition des temps d'arrêt</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-all bg-slate-800 hover:bg-slate-700 rounded-full p-3 hover:scale-110">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>

                <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-slate-800/40 p-8 rounded-[2rem] border border-white/5 text-center relative overflow-hidden group/card transition-all hover:bg-slate-800/60">
                            <div className="absolute top-0 left-0 w-full h-1 bg-red-500/30"></div>
                            <p className="text-4xl font-black text-red-400 tracking-tighter mb-2 group-hover/card:scale-110 transition-transform">{totalSlippageHours.toFixed(2)}<span className="text-xl ml-1 opacity-50">h</span></p>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Glissement Total</p>
                        </div>
                        <div className="bg-slate-800/40 p-8 rounded-[2rem] border border-white/5 text-center relative overflow-hidden group/card transition-all hover:bg-slate-800/60">
                            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/30"></div>
                            <p className="text-4xl font-black text-white tracking-tighter mb-2 group-hover/card:scale-110 transition-transform">{analyzedHours.toFixed(2)}<span className="text-xl ml-1 opacity-50">h</span></p>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Total Analysé</p>
                        </div>
                        <div className="bg-slate-800/40 p-8 rounded-[2rem] border border-white/5 text-center relative overflow-hidden group/card transition-all hover:bg-slate-800/60">
                            <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/30"></div>
                            <p className={`text-4xl font-black tracking-tighter mb-2 group-hover/card:scale-110 transition-transform ${unexplainedHours > 0.01 ? 'text-amber-400' : 'text-emerald-400'}`}>{unexplainedHours.toFixed(2)}<span className="text-xl ml-1 opacity-50">h</span></p>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Écart Non Justifié</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Journal des Causes ({events.length})</h3>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-bold text-slate-500 uppercase">Taux de Justification</span>
                                <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                    <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-1000" style={{ width: `${justificationRate}%` }}></div>
                                </div>
                                <span className="text-xs font-black text-white font-mono">{justificationRate.toFixed(1)}%</span>
                            </div>
                        </div>

                        <div className="bg-slate-950/40 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-inner backdrop-blur-sm">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Heure</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Durée</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Description de la Cause</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pilote</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()).map(event => (
                                        <tr key={event.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors group/row">
                                            <td className="p-6">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-200 font-bold">{new Date(event.eventDate).toLocaleDateString('fr-FR')}</span>
                                                    <span className="text-[10px] text-slate-500 font-bold font-mono uppercase tracking-tighter">{new Date(event.eventDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <span className="bg-red-500/10 text-red-400 px-3 py-1 rounded-full font-black font-mono text-xs border border-red-500/20">{event.lostHours.toFixed(2)}h</span>
                                            </td>
                                            <td className="p-6 max-w-xs">
                                                <p className="text-slate-300 font-medium truncate group-hover/row:whitespace-normal group-hover/row:overflow-visible transition-all cursor-help" title={event.cause}>{event.cause}</p>
                                            </td>
                                            <td className="p-6">
                                                <span className="text-slate-400 font-bold italic">{event.pilot || 'N/A'}</span>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex justify-center items-center gap-4">
                                                    <button onClick={() => onEdit(event)} className="p-2 text-cyan-400 hover:bg-cyan-400/10 rounded-xl transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg></button>
                                                    <button onClick={() => onDelete(event.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {events.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="p-20 text-center">
                                                <div className="flex flex-col items-center gap-4 opacity-30">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-500"><path d="M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                                                    <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Aucune cause de glissement analysée</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <footer className="p-8 border-t border-white/5 bg-slate-900/50 flex justify-between items-center relative z-10">
                    <button onClick={onAddNew} className="bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-900 font-black py-4 px-10 rounded-2xl shadow-xl shadow-cyan-500/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-xs">Ajouter une Analyse</button>
                    <button onClick={onClose} className="bg-slate-800 hover:bg-slate-700 text-white font-black py-4 px-10 rounded-2xl transition-all border border-white/5 uppercase tracking-widest text-xs">Fermer la Console</button>
                </footer>
            </div>
        </div>
    );
};

interface EvaluationViewProps {
    results: CalculationResults;
    parameters: AppParameters;
    evaluationData: EvaluationData;
    setEvaluationData: React.Dispatch<React.SetStateAction<EvaluationData>>;
    evaluationKpis: EvaluationKpis;
    onBack: () => void;
    user: UserAccount | null;
}

const SectionToggle: React.FC<{
    selected: boolean;
    onToggle: () => void;
    label?: string;
    className?: string;
}> = ({ selected, onToggle, label = "Inclure dans le rapport", className = "" }) => (
    <div
        className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all cursor-pointer group select-none backdrop-blur-md ${selected
            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
            : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10 hover:bg-white/10'
            } ${className}`}
        onClick={onToggle}
    >
        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${selected
            ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-110'
            : 'bg-slate-950 border-white/10 group-hover:border-slate-500'
            }`}>
            {selected && (
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-slate-950"><polyline points="20 6 9 17 4 12" /></svg>
            )}
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{label}</span>
    </div>
);

const KpiCard: React.FC<{ title: string; children: React.ReactNode; onClick?: () => void; icon?: React.ReactNode; gradient?: string }> = ({ title, children, onClick, icon, gradient = 'from-blue-500/10 to-purple-500/10' }) => (
    <div
        className={`group relative overflow-hidden bg-[#0D0F14]/60 backdrop-blur-3xl p-6 rounded-[2rem] border border-white/5 flex flex-col justify-between text-left min-h-[140px] shadow-2xl transition-all duration-500 ${onClick
            ? 'cursor-pointer hover:border-emerald-500/30 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/5 hover:ring-emerald-500/20'
            : 'hover:border-white/20 hover:-translate-y-1'
            }`}
        onClick={onClick}
    >
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-1000`}></div>
        <div className="absolute top-0 right-0 p-4 opacity-[0.15] group-hover:opacity-40 transition-all duration-700 group-hover:scale-125 group-hover:rotate-12">
            {icon}
        </div>
        <div className="relative z-10 space-y-1 h-full flex flex-col">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">{title}</p>
            <div className="flex-grow flex flex-col justify-end">
                {children}
            </div>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    </div>
);


const EvaluationView: React.FC<EvaluationViewProps> = ({
    results,
    parameters,
    onBack,
    evaluationData,
    setEvaluationData,
    evaluationKpis,
    user,
}) => {
    const [chartInterval, setChartInterval] = useState<number>(1); // Default 1H
    const [isNotificationVisible, setIsNotificationVisible] = useState(false);
    const [notificationMsg, setNotificationMsg] = useState('');
    const [reportSelection, setReportSelection] = useState<ReportPages>({
        performanceChart: true,
        kpiCards: true,
        comparativeAnalysis: true,
        chronologySection: true,
        supplementaryTasks: true,
        slippageAnalysis: true,
        nonCompletedTasks: true,
        detailedLog: true,
        disciplineAnalysis: true,
        teamGauges: true,
        masterGantt: true, // Default checked as requested
    });

    const [reportTitle, setReportTitle] = useState<string>("RAPPORT D'ÉVALUATION DE L'ARRÊT TECHNIQUE");
    const [preparedBy, setPreparedBy] = useState<string>("");

    useEffect(() => {
        if (user && !preparedBy) {
            setPreparedBy(user.username);
        }
    }, [user]);

    const disciplineColors = useMemo(() => {
        const colors = new Map<string, string>();
        results.scheduledTasks.forEach(t => {
            if (!colors.has(t.discipline)) {
                // Generate or assign a color based on discipline
                colors.set(t.discipline, '#3b82f6');
            }
        });
        return colors;
    }, [results.scheduledTasks]);

    const [timelineIntervalHours, setTimelineIntervalHours] = useState(4);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
    const [isNonCompletionModalOpen, setIsNonCompletionModalOpen] = useState(false);
    const [isSlippageModalOpen, setIsSlippageModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<{ id: number, slippageHours?: number } | null>(null);
    const [editingSuppTask, setEditingSuppTask] = useState<SupplementaryTask | null>(null);
    const [selectedFamily, setSelectedFamily] = useState<string>('all');
    const [selectedEquipment, setSelectedEquipment] = useState<string>('all');

    const [isSlippageLogModalOpen, setIsSlippageLogModalOpen] = useState(false);
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [editingSlippageEvent, setEditingSlippageEvent] = useState<GlobalSlippageEvent | null>(null);
    const [isSlippageEventFormOpen, setIsSlippageEventFormOpen] = useState(false);
    const [shiftConfirmation, setShiftConfirmation] = useState<string | null>(null);
    const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
    const [isAccidentModalOpen, setIsAccidentModalOpen] = useState(false);
    const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [bulkStatus, setBulkStatus] = useState<TaskStatus | ''>('');
    const [viewingTasksInfo, setViewingTasksInfo] = useState<{ title: string; tasks: ScheduledTask[] } | null>(null);

    const [ganttStatusFilter, setGanttStatusFilter] = useState<'all' | 'done' | 'in-progress' | 'pending'>('all');
    const [ganttFamilyOrder, setGanttFamilyOrder] = useState<string[]>([]);

    const [tableSearchTerm, setTableSearchTerm] = useState('');
    const [tableCurrentPage, setTableCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
    const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
    const [taskToDelete, setTaskToDelete] = useState<string | number | null>(null);
    const tasksPerPage = 50;


    useEffect(() => {
        setSelectedEquipment('all');
    }, [selectedFamily]);

    const earliestOriginalTaskStart = useMemo(() => {
        if (!results.scheduledTasks || results.scheduledTasks.length === 0) return new Date();
        const earliestTime = Math.min(...results.scheduledTasks.map(t => t.startTime.getTime()));
        return new Date(earliestTime);
    }, [results.scheduledTasks]);

    const teamProgress = useMemo(() => {
        const byTeam = new Map<string, { totalManHours: number; completedManHours: number; tasks: ScheduledTask[] }>();
        results.scheduledTasks.forEach(task => {
            if (!byTeam.has(task.team)) {
                byTeam.set(task.team, { totalManHours: 0, completedManHours: 0, tasks: [] });
            }
            const progress = evaluationData.tasks[task.id]?.status === 'Fait' ? 100 : (evaluationData.tasks[task.id]?.actualProgress || 0);
            const teamData = byTeam.get(task.team)!;
            teamData.totalManHours += task.manHours;
            teamData.completedManHours += (task.manHours * (progress / 100));
            teamData.tasks.push(task);
        });
        return Array.from(byTeam.entries()).map(([name, data]) => ({
            name,
            progress: data.totalManHours > 0 ? (data.completedManHours / data.totalManHours) * 100 : 0,
            tasks: data.tasks,
        })).sort((a, b) => a.name.localeCompare(b.name));
    }, [results.scheduledTasks, evaluationData.tasks]);

    const justificationStatus = useMemo(() => {
        const totalSlippage = evaluationKpis.totalSlippage;
        const analyzedHours = evaluationData.globalSlippageEvents.reduce((sum, event) => sum + event.lostHours, 0);

        const rate = totalSlippage > 0.01 ? Math.min(100, (analyzedHours / totalSlippage) * 100) : 100;
        const remainingHours = Math.max(0, totalSlippage - analyzedHours);

        return {
            rate: Number(rate.toFixed(1)),
            remainingHours: Number(remainingHours.toFixed(2)),
            remainingPercent: Math.max(0, 100 - rate).toFixed(1),
            isComplete: rate >= 99.9,
            totalSlippage
        };
    }, [evaluationKpis.totalSlippage, evaluationData.globalSlippageEvents]);

    const disciplineMetrics = useMemo(() => {
        const start = earliestOriginalTaskStart;
        const end = new Date(parameters.shutdownEnd);
        const now = new Date();
        const refTime = now > end ? end : (now < start ? start : now);

        const metrics = new Map<string, {
            totalHH: number;
            actualHH: number;
            targetHH: number;
            totalTasks: number;
            doneTasks: number;
        }>();

        results.scheduledTasks.forEach(task => {
            const d = task.discipline || 'AUTRE';
            if (!metrics.has(d)) {
                metrics.set(d, { totalHH: 0, actualHH: 0, targetHH: 0, totalTasks: 0, doneTasks: 0 });
            }
            const m = metrics.get(d)!;
            m.totalHH += task.manHours;
            m.totalTasks += 1;

            const evalTask = evaluationData.tasks[task.id];
            const progress = evalTask?.status === 'Fait' ? 100 : (evalTask?.actualProgress || 0);
            m.actualHH += task.manHours * (progress / 100);
            if (evalTask?.status === 'Fait') m.doneTasks += 1;

            // Target progress calculation at this instant
            const taskStart = task.startTime.getTime();
            const taskEnd = task.endTime.getTime();
            let targetProg = 0;
            if (refTime.getTime() >= taskEnd) targetProg = 100;
            else if (refTime.getTime() > taskStart) {
                targetProg = ((refTime.getTime() - taskStart) / (taskEnd - taskStart)) * 100;
            }
            m.targetHH += task.manHours * (targetProg / 100);
        });

        return Array.from(metrics.entries()).map(([name, data]) => {
            const actualPct = data.totalHH > 0 ? (data.actualHH / data.totalHH) * 100 : 0;
            const targetPct = data.totalHH > 0 ? (data.targetHH / data.totalHH) * 100 : 0;
            const delayHH = data.targetHH - data.actualHH;
            const isDelayed = delayHH > 0.1;

            return {
                name,
                actualPct,
                targetPct,
                delayHH,
                isDelayed,
                totalHH: data.totalHH,
                actualHH: data.actualHH,
                totalTasks: data.totalTasks,
                doneTasks: data.doneTasks,
                progress: actualPct // Compatibility for radar chart
            };
        }).sort((a, b) => b.totalHH - a.totalHH);
    }, [results.scheduledTasks, evaluationData.tasks, parameters.shutdownStart, parameters.shutdownEnd, earliestOriginalTaskStart]);

    const disciplineProgress = disciplineMetrics; // Alias for compatibility

    const uniqueEquipments = useMemo(() => Array.from(new Set(results.scheduledTasks.map(t => t.equipment))).sort(), [results.scheduledTasks]);
    const uniqueDisciplines = useMemo(() => Array.from(new Set(results.scheduledTasks.map(t => t.discipline))).sort(), [results.scheduledTasks]);

    const maintenanceTypeData = useMemo(() => {
        const stats = new Map<string, { planned: number; supp: number; extra: number }>();
        results.scheduledTasks.forEach(t => {
            const mt = t.maintenanceType || 'N/A';
            const s = stats.get(mt) || { planned: 0, supp: 0, extra: 0 };
            s.planned += t.manHours;
            // Extra HH from actual manpower > planned manpower
            const evalTask = evaluationData.tasks[t.id];
            if (evalTask?.actualManpower != null && evalTask.actualManpower > t.manpower) {
                const actualDur = calculateDuration(evalTask.actualStart, evalTask.actualEnd) ?? t.duration;
                const extraHH = (evalTask.actualManpower - t.manpower) * actualDur;
                if (extraHH > 0) s.extra += extraHH;
            }
            stats.set(mt, s);
        });
        evaluationData.supplementaryTasks.forEach(t => {
            const mt = t.maintenanceType || 'N/A';
            const s = stats.get(mt) || { planned: 0, supp: 0, extra: 0 };
            s.supp += t.totalManHours;
            stats.set(mt, s);
        });
        return Array.from(stats.entries()).map(([name, data]) => ({
            name,
            planned: data.planned,
            supp: data.supp,
            extra: data.extra,
            total: data.planned + data.supp + data.extra
        })).sort((a, b) => b.total - a.total);
    }, [results.scheduledTasks, evaluationData.supplementaryTasks, evaluationData.tasks]);

    const supplementaryComparisonData = useMemo(() => {
        // Global Comparison
        const plannedCharge = results.kpis.totalManHours;
        const plannedCount = results.scheduledTasks.length;
        const suppCharge = evaluationData.supplementaryTasks.reduce((sum, t) => sum + t.totalManHours, 0);
        const suppCount = evaluationData.supplementaryTasks.length;

        // Extra HH from actual manpower overruns on planned tasks
        let globalExtraHH = 0;

        // Discipline Comparison
        const disciplineStats = new Map<string, { plannedCharge: number; plannedCount: number; suppCharge: number; suppCount: number; extraCharge: number }>();

        results.scheduledTasks.forEach(t => {
            if (!disciplineStats.has(t.discipline)) {
                disciplineStats.set(t.discipline, { plannedCharge: 0, plannedCount: 0, suppCharge: 0, suppCount: 0, extraCharge: 0 });
            }
            const stat = disciplineStats.get(t.discipline)!;
            stat.plannedCharge += t.manHours;
            stat.plannedCount += 1;

            // Compute extra HH if actual manpower > planned
            const evalTask = evaluationData.tasks[t.id];
            if (evalTask?.actualManpower != null && evalTask.actualManpower > t.manpower) {
                const actualDur = calculateDuration(evalTask.actualStart, evalTask.actualEnd) ?? t.duration;
                const extraHH = (evalTask.actualManpower - t.manpower) * actualDur;
                if (extraHH > 0) {
                    stat.extraCharge += extraHH;
                    globalExtraHH += extraHH;
                }
            }
        });

        const getDisciplineFromTeam = (teamName: string): string => {
            if (!teamName) return 'AUTRE';
            const lower = teamName.toLowerCase();

            // Try direct match from planned tasks first
            const samplePlanned = results.scheduledTasks.find(pt => pt.team.toLowerCase() === lower || pt.discipline.toLowerCase() === lower);
            if (samplePlanned) return samplePlanned.discipline;

            if (lower.includes('méc') || lower.includes('mecanicien')) return 'MECANIQUE';
            if (lower.includes('vulcan')) return 'VULCANISATION';
            if (lower.includes('chaudron')) return 'CHAUDRONNERIE';
            if (lower.includes('electri')) return 'ELECTRIQUE';
            if (lower.includes('instru')) return 'INSTRUMENTATION';
            if (lower.includes('cleaner') || lower.includes('nettoy')) return 'NETTOYAGE';
            if (lower.includes('scaffold') || lower.includes('echaff')) return 'SCAFFOLDING';
            if (lower.includes('graiss')) return 'GRAISSAGE';
            if (lower.includes('sapem')) return 'SAPEM';
            if (lower.includes('product')) return 'PRODUCTION';
            if (lower.includes('pompe')) return 'MECANIQUE';
            if (lower.includes('peintur') || lower.includes('paint')) return 'PEINTURE';
            if (lower.includes('logist')) return 'LOGISTIQUE';

            return 'AUTRE';
        };

        evaluationData.supplementaryTasks.forEach(t => {
            t.teamDetails.forEach(td => {
                const discipline = getDisciplineFromTeam(td.team);

                if (!disciplineStats.has(discipline)) {
                    disciplineStats.set(discipline, { plannedCharge: 0, plannedCount: 0, suppCharge: 0, suppCount: 0, extraCharge: 0 });
                }
                const stat = disciplineStats.get(discipline)!;
                stat.suppCharge += td.manHours;
            });

            const primaryTeam = t.teamDetails[0]?.team;
            const primaryDiscipline = getDisciplineFromTeam(primaryTeam);
            if (!disciplineStats.has(primaryDiscipline)) {
                disciplineStats.set(primaryDiscipline, { plannedCharge: 0, plannedCount: 0, suppCharge: 0, suppCount: 0, extraCharge: 0 });
            }
            disciplineStats.get(primaryDiscipline)!.suppCount += 1;
        });

        const discData = Array.from(disciplineStats.entries()).map(([name, stats]) => ({
            name,
            plannedCharge: stats.plannedCharge,
            suppCharge: stats.suppCharge,
            extraCharge: stats.extraCharge,
            plannedCount: stats.plannedCount,
            suppCount: stats.suppCount
        })).sort((a, b) => b.plannedCharge - a.plannedCharge);

        return {
            global: [
                { name: 'Planifié', charge: plannedCharge, count: plannedCount },
                { name: 'Supplémentaire', charge: suppCharge, count: suppCount },
                { name: 'Extra HH (Réel)', charge: globalExtraHH, count: 0 }
            ],
            disciplines: discData,
            globalExtraHH
        };
    }, [results.scheduledTasks, results.kpis.totalManHours, evaluationData.supplementaryTasks, evaluationData.tasks]);

    const handleExportPdf = async () => {
        setIsExportingPdf(true);
        try {
            const reportData: ReportData = {
                coverImage: null,
                logo: null,
                title: reportTitle,
                preparedBy: preparedBy,
            };

            // Mapping selected sections remains the same but uses state

            const doc = await exportToPDF(reportData, parameters, evaluationData, results, evaluationKpis, reportSelection, timelineIntervalHours);
            doc.save(`${reportTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
        } catch (error) {
            console.error("Failed to export PDF:", error);
            alert("Une erreur est survenue lors de la génération du PDF.");
        } finally {
            setIsExportingPdf(false);
        }
    };


    const filteredGanttResults = useMemo(() => {
        const filteredTasks = results.scheduledTasks.filter(task => {
            const taskEval = evaluationData.tasks[task.id];
            const status = taskEval?.status || 'À Faire';
            const progress = taskEval?.actualProgress || (status === 'Fait' ? 100 : 0);

            if (ganttStatusFilter === 'all') return true;
            if (ganttStatusFilter === 'done') return status === 'Fait' || progress >= 100;
            if (ganttStatusFilter === 'in-progress') return status === 'En Cours' || (progress > 0 && progress < 100);
            if (ganttStatusFilter === 'pending') return status === 'À Faire' && progress === 0;
            return true;
        });
        return { ...results, scheduledTasks: filteredTasks };
    }, [results, evaluationData.tasks, ganttStatusFilter]);

    const taskProgressMapForGantt = useMemo(() => {
        const progressMap: Record<number, number> = {};
        results.scheduledTasks.forEach(task => {
            const taskEval = evaluationData.tasks[task.id];
            const status = taskEval?.status || 'À Faire';
            if (status === 'Fait') progressMap[task.id] = 100;
            else if (taskEval?.actualProgress !== undefined) progressMap[task.id] = taskEval.actualProgress;
            else progressMap[task.id] = 0;
        });
        return progressMap;
    }, [results.scheduledTasks, evaluationData.tasks]);

    const filteredProgressHistory = useMemo(() => {
        if (!evaluationKpis.progressHistory) return [];
        // Filtering based on chartInterval (hours)
        // Since stepMs in App.tsx is 1 hour, we can just skip points.
        return evaluationKpis.progressHistory.filter((_, index) => index % chartInterval === 0 || index === evaluationKpis.progressHistory!.length - 1);
    }, [evaluationKpis.progressHistory, chartInterval]);

    const handleGlobalDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setEvaluationData(prev => ({ ...prev, [name]: value }));
    };

    const handleApplyDateShift = () => {
        if (!evaluationData.actualShutdownStart || !earliestOriginalTaskStart) {
            alert("Veuillez définir une date de début valide.");
            return;
        }
        const newActualStart = new Date(evaluationData.actualShutdownStart);
        if (isNaN(newActualStart.getTime())) {
            alert("La date de début entrée est invalide.");
            return;
        }

        const offset = newActualStart.getTime() - earliestOriginalTaskStart.getTime();
        const taskMap = new Map(results.scheduledTasks.map(t => [t.id, t]));

        setEvaluationData(prev => {
            const newTasks: Record<number, EvaluatedTaskData> = {};
            Object.entries(prev.tasks).forEach(([taskIdStr, taskData]) => {
                const taskId = parseInt(taskIdStr, 10);
                const originalTask = taskMap.get(taskId);
                if (originalTask) {
                    const newActualTaskStart = new Date(originalTask.startTime.getTime() + offset);
                    const newActualTaskEnd = new Date(originalTask.endTime.getTime() + offset);

                    newTasks[taskId] = {
                        ...taskData,
                        actualStart: formatDateForInput(newActualTaskStart),
                        actualEnd: formatDateForInput(newActualTaskEnd),
                    };
                } else {
                    newTasks[taskId] = taskData;
                }
            });

            return { ...prev, tasks: newTasks };
        });

        const newStartDateStr = newActualStart.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        setShiftConfirmation(`Le planning a été décalé avec succès. La première tâche commence maintenant le ${newStartDateStr}.`);

        setTimeout(() => {
            setShiftConfirmation(null);
        }, 5000); // Hide message after 5 seconds
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

    const handleTaskDataChange = (taskId: number, field: keyof EvaluatedTaskData, value: string | number) => {
        setEvaluationData(prev => {
            if (!prev || !prev.tasks[taskId]) return prev;

            const existingTask = prev.tasks[taskId];
            const updatedTask = { ...existingTask, [field]: value };

            if (field === 'status' && value === 'Fait') {
                delete updatedTask.nonCompletionDetails;
            }

            return {
                ...prev,
                tasks: {
                    ...prev.tasks,
                    [taskId]: updatedTask
                }
            };
        });
    };

    const handleSaveSuppTask = (task: SupplementaryTask) => {
        setEvaluationData(prev => {
            const existingIndex = prev.supplementaryTasks.findIndex(t => t.id === task.id);
            let updatedTasks: SupplementaryTask[];

            if (existingIndex > -1) {
                updatedTasks = prev.supplementaryTasks.map(t => t.id === task.id ? task : t);
            } else {
                updatedTasks = [...prev.supplementaryTasks, task];
            }
            return { ...prev, supplementaryTasks: updatedTasks };
        });
        setIsAddTaskModalOpen(false);
        setEditingSuppTask(null);
    };

    const handleDeleteSuppTask = (taskId: string) => {
        setEvaluationData(prev => ({
            ...prev,
            supplementaryTasks: prev.supplementaryTasks.filter(task => task.id !== taskId)
        }));
    };

    const handleSaveNonCompletionDetails = (details: NonCompletionDetails) => {
        if (editingTask) {
            setEvaluationData(prev => {
                const newTasks = {
                    ...prev.tasks,
                    [editingTask.id]: {
                        ...prev.tasks[editingTask.id],
                        nonCompletionDetails: details,
                    }
                };
                return { ...prev, tasks: newTasks };
            });
        }
        setIsNonCompletionModalOpen(false);
        setEditingTask(null);
    };

    const handleSaveSlippageDetails = (details: SlippageDetails) => {
        if (editingTask) {
            setEvaluationData(prev => {
                const newTasks = {
                    ...prev.tasks,
                    [editingTask.id]: {
                        ...prev.tasks[editingTask.id],
                        slippageDetails: details,
                    }
                };
                return { ...prev, tasks: newTasks };
            });
        }
        setIsSlippageModalOpen(false);
        setEditingTask(null);
    };

    const handleSaveGlobalSlippageEvent = (eventData: Omit<GlobalSlippageEvent, 'id'> & { id?: string }) => {
        setEvaluationData(prev => {
            const events = [...prev.globalSlippageEvents];
            if (eventData.id) { // Editing existing
                const index = events.findIndex(e => e.id === eventData.id);
                if (index > -1) {
                    events[index] = { ...events[index], ...eventData, id: eventData.id };
                }
                setNotificationMsg("Analyse mise à jour avec succès.");
            } else { // Adding new
                events.push({ ...eventData, id: crypto.randomUUID() } as GlobalSlippageEvent);
                setNotificationMsg("Nouvelle cause de glissement enregistrée.");
            }
            setIsNotificationVisible(true);
            setTimeout(() => setIsNotificationVisible(false), 4000);
            return { ...prev, globalSlippageEvents: events };
        });
    };

    const handleDeleteGlobalSlippageEvent = (eventId: string) => {
        setEvaluationData(prev => ({
            ...prev,
            globalSlippageEvents: prev.globalSlippageEvents.filter(e => e.id !== eventId)
        }));
    };

    const { familyList, equipmentList, filteredAndSortedTasks, totalTaskPages } = useMemo(() => {
        const allFamilies = results.scheduledTasks.map(task => task.family);
        const uniqueFamilies = ['all', ...Array.from(new Set(allFamilies)).sort()];

        let tasks = results.scheduledTasks;

        if (selectedFamily !== 'all') {
            tasks = tasks.filter(task => task.family === selectedFamily);
        }

        const allEquipmentInFamily = tasks.map(task => task.equipment);
        const uniqueEquipment = ['all', ...Array.from(new Set(allEquipmentInFamily)).sort()];

        if (selectedEquipment !== 'all') {
            tasks = tasks.filter(task => task.equipment === selectedEquipment);
        }

        if (statusFilter !== 'all') {
            tasks = tasks.filter(t => (evaluationData.tasks[t.id]?.status || 'À Faire') === statusFilter);
        }

        if (disciplineFilter !== 'all') {
            tasks = tasks.filter(t => t.discipline === disciplineFilter);
        }

        const searchLower = tableSearchTerm.toLowerCase();
        const searchFiltered = tasks.filter(t =>
            t.action.toLowerCase().includes(searchLower) ||
            t.equipment.toLowerCase().includes(searchLower) ||
            t.team.toLowerCase().includes(searchLower)
        );

        const sorted = searchFiltered.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        const totalPages = Math.ceil(sorted.length / tasksPerPage);

        return {
            familyList: uniqueFamilies,
            equipmentList: uniqueEquipment,
            filteredAndSortedTasks: sorted,
            totalTaskPages: totalPages
        };
    }, [results.scheduledTasks, selectedFamily, selectedEquipment, tableSearchTerm, statusFilter, disciplineFilter, evaluationData.tasks]);

    const paginatedTasks = useMemo(() => {
        const start = (tableCurrentPage - 1) * tasksPerPage;
        return filteredAndSortedTasks.slice(start, start + tasksPerPage);
    }, [filteredAndSortedTasks, tableCurrentPage]);

    const handleChronologyChange = (eventId: string, field: keyof ChronologyEvent, value: string) => {
        setEvaluationData(prev => {
            if (!prev) return prev;
            const updatedChronology = prev.chronology.map(event =>
                event.id === eventId ? { ...event, [field]: value } : event
            );
            return { ...prev, chronology: updatedChronology };
        });
    };

    const handleChronologyAdd = () => {
        setEvaluationData(prev => {
            if (!prev) return prev;
            // Use the shutdown start date as the default for new events.
            const defaultEventDate = parameters.shutdownStart || formatDateForInput(new Date());

            const newEvent: ChronologyEvent = {
                id: crypto.randomUUID(),
                label: 'Nouvel Événement',
                plannedStart: defaultEventDate,
                plannedEnd: defaultEventDate,
                actualStart: defaultEventDate,
                actualEnd: defaultEventDate,
            };
            return { ...prev, chronology: [...prev.chronology, newEvent] };
        });
    };

    const handleChronologyDelete = (eventId: string) => {
        setEvaluationData(prev => {
            if (!prev) return prev;
            return { ...prev, chronology: prev.chronology.filter(e => e.id !== eventId) };
        });
    };

    const handleMoveChronology = (eventId: string, direction: 'up' | 'down') => {
        setEvaluationData(prev => {
            if (!prev) return prev;
            const newChronology = [...prev.chronology];
            const index = newChronology.findIndex(e => e.id === eventId);
            if (index === -1) return prev;

            const targetIndex = direction === 'up' ? index - 1 : index + 1;
            if (targetIndex < 0 || targetIndex >= newChronology.length) return prev;

            // Swap items
            const temp = newChronology[index];
            newChronology[index] = newChronology[targetIndex];
            newChronology[targetIndex] = temp;

            return { ...prev, chronology: newChronology };
        });
    };

    const handleSortChronologyByDate = () => {
        setEvaluationData(prev => {
            if (!prev) return prev;
            const sorted = [...prev.chronology].sort((a, b) => {
                const dateA = new Date(a.plannedStart || 0).getTime();
                const dateB = new Date(b.plannedStart || 0).getTime();
                return dateA - dateB;
            });
            return { ...prev, chronology: sorted };
        });
    };

    const handleBulkStatusChange = () => {
        if (!bulkStatus || selectedTaskIds.length === 0) return;
        setEvaluationData(prev => {
            if (!prev) return null;
            const newTasksData = { ...prev.tasks };
            selectedTaskIds.forEach(taskId => {
                if (newTasksData[taskId]) {
                    newTasksData[taskId] = {
                        ...newTasksData[taskId],
                        status: bulkStatus
                    };
                    if (bulkStatus === 'Fait') {
                        delete newTasksData[taskId].nonCompletionDetails;
                    }
                }
            });
            return { ...prev, tasks: newTasksData };
        });
        setSelectedTaskIds([]);
        setBulkStatus('');
    };

    return (
        <div className="space-y-6">
            <AddTaskModal
                isOpen={isAddTaskModalOpen}
                onClose={() => { setIsAddTaskModalOpen(false); setEditingSuppTask(null); }}
                onSave={handleSaveSuppTask}
                taskToEdit={editingSuppTask}
                parameters={parameters}
                availableEquipments={uniqueEquipments}
                availableDisciplines={uniqueDisciplines}
                results={results}
            />
            <DeleteConfirmModal
                isOpen={taskToDelete !== null}
                onClose={() => setTaskToDelete(null)}
                onConfirm={() => taskToDelete && handleDeleteSuppTask(taskToDelete as string)}
                title="Suppression Critique"
                message="Êtes-vous sûr de vouloir supprimer définitivement ce travail supplémentaire ? Cette action est irréversible."
            />
            <NonCompletionModal
                isOpen={isNonCompletionModalOpen}
                onClose={() => setIsNonCompletionModalOpen(false)}
                initialDetails={editingTask ? evaluationData.tasks[editingTask.id]?.nonCompletionDetails : undefined}
                onSave={handleSaveNonCompletionDetails}
            />
            <SlippageLogModal
                isOpen={isSlippageLogModalOpen}
                onClose={() => setIsSlippageLogModalOpen(false)}
                events={evaluationData.globalSlippageEvents}
                totalSlippageHours={evaluationKpis.totalSlippage}
                onAddNew={() => {
                    setEditingSlippageEvent(null);
                    setIsSlippageEventFormOpen(true);
                }}
                onEdit={(event) => {
                    setEditingSlippageEvent(event);
                    setIsSlippageEventFormOpen(true);
                }}
                onDelete={handleDeleteGlobalSlippageEvent}
            />
            <SlippageEventFormModal
                isOpen={isSlippageEventFormOpen}
                onClose={() => setIsSlippageEventFormOpen(false)}
                onSave={(eventData) => {
                    handleSaveGlobalSlippageEvent(eventData);
                    setIsSlippageEventFormOpen(false);
                }}
                eventToEdit={editingSlippageEvent}
                parameters={parameters}
            />
            <IncidentModal
                isOpen={isIncidentModalOpen}
                onClose={() => setIsIncidentModalOpen(false)}
                onSave={events => handleSaveEventDetails({ incidents: events, accidents: evaluationData.accidentDetails })}
                initialData={evaluationData.incidentDetails}
                defaultDateTime={formatDateForInput(new Date(parameters.shutdownStart))}
            />
            <AccidentModal
                isOpen={isAccidentModalOpen}
                onClose={() => setIsAccidentModalOpen(false)}
                onSave={events => handleSaveEventDetails({ incidents: evaluationData.incidentDetails, accidents: events })}
                initialData={evaluationData.accidentDetails}
                defaultDateTime={formatDateForInput(new Date(parameters.shutdownStart))}
            />
            <SlippageModal
                isOpen={isSlippageModalOpen}
                onClose={() => setIsSlippageModalOpen(false)}
                initialDetails={editingTask ? evaluationData.tasks[editingTask.id]?.slippageDetails : undefined}
                onSave={handleSaveSlippageDetails}
                slippageHours={editingTask?.slippageHours || 0}
            />

            {/* Notification Toast */}
            {isNotificationVisible && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-500">
                    <div className="bg-slate-900/90 backdrop-blur-xl border border-emerald-500/30 px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                        </div>
                        <div>
                            <p className="text-sm font-black text-white uppercase tracking-wider">{notificationMsg}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Mise à jour du système confirmée</p>
                        </div>
                    </div>
                </div>
            )}
            <header className="flex items-center justify-between flex-wrap gap-6 bg-[#0D0F14]/80 backdrop-blur-2xl p-6 rounded-[2.5rem] border border-white/5 shadow-2xl relative z-10 ring-1 ring-white/5">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5 group">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">Console d'Évaluation</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Post-Execution Analytics & Industrial Readiness</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleExportPdf}
                        disabled={isExportingPdf}
                        className="bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 text-white font-black py-4 px-10 rounded-2xl flex items-center justify-center transition-all shadow-[0_10px_30px_rgba(147,51,234,0.3)] active:scale-95 group uppercase text-[11px] tracking-widest border border-purple-400/20"
                    >
                        {isExportingPdf ? (
                            <svg className="animate-spin h-5 w-5 text-white mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-3 group-hover:scale-110 group-hover:rotate-6 transition-transform"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        )}
                        {isExportingPdf ? 'Génération...' : 'Exporter le Rapport Final (PDF)'}
                    </button>
                </div>
            </header>

            {!justificationStatus.isComplete && justificationStatus.totalSlippage > 0.01 && (
                <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/40 backdrop-blur-xl border border-amber-500/20 p-6 rounded-[2rem] flex items-center justify-between gap-6 relative overflow-hidden group/warning transition-all hover:bg-amber-900/50 shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl -tr-10 -mr-10"></div>
                    <div className="flex items-center gap-6 relative z-10">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.1)] group-hover/warning:scale-110 transition-transform">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                        </div>
                        <div className="space-y-1">
                            <p className="text-lg font-black text-white tracking-tight uppercase">Justification du glissement incomplète</p>
                            <p className="text-sm font-medium text-amber-200/70">Il reste <span className="text-amber-400 font-black">{justificationStatus.remainingPercent}%</span> (<span className="text-amber-400 font-bold">{justificationStatus.remainingHours}h</span>) de glissement global non documenté.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsSlippageLogModalOpen(true)}
                        className="px-8 py-4 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-black text-xs uppercase tracking-widest rounded-2xl border border-amber-500/30 transition-all active:scale-95 flex items-center gap-2 group/btn whitespace-nowrap"
                    >
                        Compléter l'analyse
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover/btn:translate-x-1 transition-transform"><polyline points="9 18 15 12 9 6" /></svg>
                    </button>
                </div>
            )}

            <section className="bg-[#0D0F14]/60 backdrop-blur-3xl rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group transition-all duration-500">
                <button
                    onClick={() => setIsConfigOpen(prev => !prev)}
                    className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-all group/btn"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" /></svg>
                        </div>
                        <div className="text-left">
                            <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-[0.4em]">Paramètres globaux</p>
                            <h3 className="text-lg font-black text-white uppercase tracking-tight">Configuration &amp; Identification</h3>
                        </div>
                    </div>
                    <div className={`w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 transition-all duration-300 ${isConfigOpen ? 'rotate-180' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                </button>

                {isConfigOpen && (
                    <div className="px-8 pb-8 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Titre du Rapport</label>
                                <input
                                    type="text"
                                    value={reportTitle}
                                    onChange={(e) => setReportTitle(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all placeholder:text-slate-700 shadow-inner"
                                    placeholder="Titre du document..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Responsable</label>
                                <input
                                    type="text"
                                    value={preparedBy}
                                    onChange={(e) => setPreparedBy(e.target.value)}
                                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-white focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all placeholder:text-slate-700 shadow-inner"
                                    placeholder="Nom du planificateur..."
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="actualShutdownStart" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Début Réel</label>
                                <input id="actualShutdownStart" type="datetime-local" name="actualShutdownStart" value={evaluationData.actualShutdownStart} onChange={handleGlobalDateChange} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-white focus:border-emerald-500/50 outline-none transition-all shadow-inner" />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="actualShutdownEnd" className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Fin Réelle</label>
                                <input id="actualShutdownEnd" type="datetime-local" name="actualShutdownEnd" value={evaluationData.actualShutdownEnd} onChange={handleGlobalDateChange} className="w-full bg-slate-950/50 border border-white/5 rounded-2xl px-5 py-3.5 text-sm font-bold text-white focus:border-emerald-500/5 outline-none transition-all shadow-inner" />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-500"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                                Utilisez l'alignement pour synchroniser le planning prévisionnel sur le démarrage réel enregistré.
                            </p>
                            <button
                                onClick={handleApplyDateShift}
                                className="bg-emerald-600/20 hover:bg-emerald-500/30 text-emerald-400 font-black px-6 py-3 rounded-xl border border-emerald-500/30 flex items-center gap-3 transition-all active:scale-95 uppercase text-[10px] tracking-[0.2em] shadow-[0_0_20px_rgba(16,185,129,0.1)] group/btn"
                            >
                                Synchroniser Planning
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover/btn:rotate-180 transition-transform duration-700"><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h5" /><path d="M17.5 17.5 16 16.25V14" /><path d="M22 16a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" /></svg>
                            </button>
                        </div>

                        {shiftConfirmation && (
                            <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-[11px] font-black uppercase tracking-widest animate-in slide-in-from-top-2 text-center flex items-center justify-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                                {shiftConfirmation}
                            </div>
                        )}
                    </div>
                )}
            </section>

            <section className="bg-[#0D0F14]/80 backdrop-blur-xl border border-white/[0.08] rounded-[2.5rem] overflow-hidden relative group shadow-[0_40px_80px_rgba(0,0,0,0.4)]">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/[0.07] blur-[150px] -mr-64 -mt-64 pointer-events-none transition-all duration-1000 group-hover:bg-emerald-500/[0.12]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan-500/[0.04] blur-[150px] -ml-64 -mb-64 pointer-events-none" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent pointer-events-none" />

                {/* ─── Chart Header ─── */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center px-8 pt-8 pb-0 gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.9)]" />
                            <div className="w-3 h-3 rounded-full bg-emerald-400/30 animate-ping absolute inset-0" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-emerald-500/80 uppercase tracking-[0.4em] mb-0.5">Live Monitoring</p>
                            <h3 className="text-2xl font-black text-white tracking-tight uppercase leading-none">Performance de l'Exécution</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 italic">Planifié vs Réel · Trajectoire cumulative de réalisation</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-end md:items-center gap-4">
                        <SectionToggle
                            selected={reportSelection.performanceChart}
                            onToggle={() => setReportSelection(prev => ({ ...prev, performanceChart: !prev.performanceChart }))}
                        />
                        {/* Interval selector — Readiness style */}
                        <div className="flex items-center gap-1 bg-black/40 border border-white/[0.06] rounded-xl p-1">
                            {([{v:1,l:"1H"},{v:3,l:"3H"},{v:6,l:"6H"},{v:12,l:"12H"},{v:24,l:"1D"},{v:168,l:"1W"},{v:720,l:"1M"},{v:8760,l:"1Y"}] as const).map(({v,l}) => (
                                <button
                                    key={v}
                                    onClick={() => setChartInterval(v)}
                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${chartInterval === v
                                        ? 'bg-emerald-500 text-black shadow-[0_0_14px_rgba(16,185,129,0.5)]'
                                        : 'text-slate-600 hover:text-slate-300'}`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                        {/* Legend */}
                        <div className="flex items-center gap-5 bg-black/20 px-4 py-2.5 rounded-xl border border-white/[0.05]">
                            <div className="flex items-center gap-2">
                                <div className="w-7 border-t-2 border-dashed border-cyan-400/70" />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Planifié</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-7 border-t-[3px] border-emerald-500" style={{ boxShadow: '0 0 6px rgba(16,185,129,0.6)' }} />
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Réel</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── Chart Area ─── */}
                <div className="w-full h-[440px] relative z-10 mt-6 px-4 pb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredProgressHistory} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                            <defs>
                                <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.12} />
                                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.01} />
                                </linearGradient>
                                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.01} />
                                </linearGradient>
                                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                    <feGaussianBlur stdDeviation="3" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" stroke="#ffffff03" vertical={false} />
                            <XAxis
                                dataKey="timestamp"
                                stroke="#475569"
                                tickLine={false}
                                axisLine={{ stroke: 'rgba(255,255,255,0.05)' }}
                                dy={12}
                                interval="preserveStartEnd"
                                tick={{ fontWeight: 900, fill: '#475569', fontSize: 9 }}
                                tickFormatter={(val) => {
                                    try {
                                        const d = typeof val === 'number' ? new Date(val) : new Date(String(val));
                                        if (isNaN(d.getTime())) return String(val);
                                        const day = d.getDate().toString().padStart(2, '0');
                                        const month = (d.getMonth() + 1).toString().padStart(2, '0');
                                        const hour = d.getHours().toString().padStart(2, '0');
                                        const min = d.getMinutes().toString().padStart(2, '0');
                                        return `${day}/${month} ${hour}:${min}`;
                                    } catch { return String(val); }
                                }}
                            />
                            <YAxis stroke="#475569" tickLine={false} axisLine={{ stroke: 'rgba(255,255,255,0.05)' }} dx={-10} tick={{ fontWeight: 900, fill: '#475569', fontSize: 9 }} domain={[0, 100]} unit="%" />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        const pVal = payload[0].payload.planned || 0;
                                        const aVal = payload[0].payload.actual || 0;
                                        const diff = (aVal - pVal).toFixed(1);
                                        const isNegative = Number(diff) < -0.1;
                                        const isPositive = Number(diff) > 0.1;

                                        let formattedLabel = '';
                                        try {
                                            const d = typeof label === 'number' ? new Date(label) : new Date(String(label));
                                            if (!isNaN(d.getTime())) {
                                                const dd = d.getDate().toString().padStart(2, '0');
                                                const mm = (d.getMonth() + 1).toString().padStart(2, '0');
                                                const yy = d.getFullYear().toString().slice(-2);
                                                const hh = d.getHours().toString().padStart(2, '0');
                                                const mn = d.getMinutes().toString().padStart(2, '0');
                                                formattedLabel = `${dd}/${mm}/${yy}  ${hh}:${mn}`;
                                            }
                                        } catch { /* noop */ }
                                        if (!formattedLabel) formattedLabel = String(label);

                                        return (
                                            <div className="bg-[#080c14]/95 border border-white/15 p-6 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl min-w-[240px] ring-1 ring-white/10">
                                                <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-3">
                                                    <div>
                                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] mb-0.5">Date · Heure</p>
                                                        <p className="text-sm font-black text-white">{formattedLabel}</p>
                                                    </div>
                                                    <span className={`text-[10px] font-black px-3 py-1 rounded-full border transition-all ${isNegative ? 'bg-red-500/10 border-red-500/20 text-red-400' : isPositive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}>
                                                        {isPositive ? '+' : ''}{diff}%
                                                    </span>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center group/item">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 border-t-2 border-dashed border-cyan-400/80" />
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Planifié</span>
                                                        </div>
                                                        <span className="text-base font-black text-cyan-300">{pVal.toFixed(1)}%</span>
                                                    </div>
                                                    <div className="flex justify-between items-center group/item">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 border-t-[3px] border-emerald-500" />
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Réel</span>
                                                        </div>
                                                        <span className={`text-base font-black ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>{aVal.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                                {isNegative && (
                                                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2 text-red-500/70">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Alerte Glissement Détecté</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Area type="monotone" dataKey="planned" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#colorPlanned)" strokeDasharray="8 6" dot={false} />
                            <Area type="monotone" dataKey="actual" stroke="#10B981" strokeWidth={5} fillOpacity={1} fill="url(#colorActual)" animationDuration={2500} filter="url(#glow)" dot={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

            </section>

            {/* ═══════════════ KPI DASHBOARD ═══════════════ */}
            <section className="relative">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_14px_rgba(168,85,247,0.9)]" />
                                <div className="w-3 h-3 rounded-full bg-purple-400/30 animate-ping absolute inset-0" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-purple-400/80 uppercase tracking-[0.4em]">Mission Intelligence</p>
                                <h3 className="text-xl font-black text-white tracking-tight uppercase leading-none">Tableau de Bord KPI</h3>
                            </div>
                        </div>
                    </div>
                    <SectionToggle
                        selected={reportSelection.kpiCards}
                        onToggle={() => setReportSelection(prev => ({ ...prev, kpiCards: !prev.kpiCards }))}
                    />
                </div>

                {/* KPI Grid — 5 cols top row, 5 cols bottom row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">

                    {/* 1 — Durée Planifiée */}
                    <KpiCard
                        title="Durée Planifiée"
                        gradient="from-cyan-500/10 to-blue-500/10"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                    >
                        <p className="text-3xl font-black text-cyan-400 tracking-tighter leading-none">
                            {evaluationKpis.plannedShutdownDuration.toFixed(1)}<span className="text-base ml-1 opacity-50 font-bold">h</span>
                        </p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2">Durée cible de l'arrêt</p>
                    </KpiCard>

                    {/* 2 — Durée Réelle */}
                    {(() => {
                        const diff = evaluationKpis.actualShutdownDuration - evaluationKpis.plannedShutdownDuration;
                        const isOver = diff > 0;
                        return (
                            <KpiCard
                                title="Durée Réelle"
                                gradient={isOver ? "from-red-500/10 to-rose-500/10" : "from-emerald-500/10 to-green-500/10"}
                                icon={<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={isOver ? "#ef4444" : "#10b981"} strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /><circle cx="12" cy="12" r="3" fill={isOver ? "#ef4444" : "#10b981"} fillOpacity="0.3" /></svg>}
                            >
                                <p className={`text-3xl font-black tracking-tighter leading-none ${isOver ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {evaluationKpis.actualShutdownDuration.toFixed(1)}<span className="text-base ml-1 opacity-50 font-bold">h</span>
                                </p>
                                <div className={`mt-2 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest ${isOver ? 'text-red-500/70' : 'text-emerald-500/70'}`}>
                                    {isOver ? '▲' : '▼'} {Math.abs(diff).toFixed(1)}h vs planifié
                                </div>
                            </KpiCard>
                        );
                    })()}

                    {/* 3 — Glissement Total */}
                    <KpiCard
                        title="Glissement Total"
                        gradient="from-orange-500/10 to-red-500/10"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>}
                        onClick={() => setIsSlippageLogModalOpen(true)}
                    >
                        <p className="text-3xl font-black text-orange-400 tracking-tighter leading-none">
                            {evaluationKpis.totalSlippage.toFixed(2)}<span className="text-base ml-1 opacity-50 font-bold">h</span>
                        </p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2 flex items-center gap-1">
                            <span className="text-orange-500/60">↗</span> Cliquer pour analyser
                        </p>
                    </KpiCard>

                    {/* 4 — Taux de Glissement */}
                    {(() => {
                        const rate = evaluationKpis.slippageRate;
                        const color = rate < 5 ? '#10b981' : rate < 15 ? '#f59e0b' : '#ef4444';
                        const label = rate < 5 ? 'Nominal' : rate < 15 ? 'Attention' : 'Critique';
                        return (
                            <KpiCard
                                title="Taux de Glissement"
                                gradient={rate < 5 ? "from-emerald-500/10 to-green-500/10" : rate < 15 ? "from-amber-500/10 to-yellow-500/10" : "from-red-500/10 to-rose-500/10"}
                                icon={<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>}
                            >
                                <p className="text-3xl font-black tracking-tighter leading-none" style={{ color }}>
                                    {rate.toFixed(1)}<span className="text-base ml-0.5 opacity-50 font-bold">%</span>
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="h-1.5 flex-1 bg-black/40 rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(rate * 3, 100)}%`, backgroundColor: color }} />
                                    </div>
                                    <span className="text-[8px] font-black uppercase tracking-widest" style={{ color }}>{label}</span>
                                </div>
                            </KpiCard>
                        );
                    })()}

                    {/* 5 — Taux de Réalisation */}
                    {(() => {
                        const rate = evaluationKpis.completionRate;
                        const color = rate >= 90 ? '#10b981' : rate >= 70 ? '#f59e0b' : '#ef4444';
                        const circumference = 2 * Math.PI * 20;
                        const dash = (Math.min(rate, 100) / 100) * circumference;
                        return (
                            <KpiCard
                                title="Taux de Réalisation"
                                gradient={rate >= 90 ? "from-emerald-500/10 to-green-500/10" : rate >= 70 ? "from-amber-500/10 to-yellow-500/10" : "from-red-500/10 to-rose-500/10"}
                                icon={<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="relative w-12 h-12 flex-shrink-0">
                                        <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
                                            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
                                            <circle cx="24" cy="24" r="20" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
                                                strokeDasharray={`${dash} ${circumference}`}
                                                style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dasharray 2s ease' }} />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-[11px] font-black" style={{ color }}>{Math.round(rate)}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-2xl font-black tracking-tighter leading-none" style={{ color }}>
                                            {rate.toFixed(1)}<span className="text-sm ml-0.5 opacity-50 font-bold">%</span>
                                        </p>
                                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-1">
                                            {evaluationKpis.completedTasks}/{evaluationKpis.totalPlannedTasks} tâches
                                        </p>
                                    </div>
                                </div>
                            </KpiCard>
                        );
                    })()}

                    {/* 6 — Travaux Supplémentaires */}
                    <KpiCard
                        title="Travaux Supplémentaires"
                        gradient="from-pink-500/10 to-rose-500/10"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f472b6" strokeWidth="1.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
                    >
                        <p className="text-3xl font-black text-pink-400 tracking-tighter leading-none">
                            {evaluationKpis.supplementaryTasksCount}<span className="text-base ml-1 opacity-50 font-bold">tâches</span>
                        </p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2">Non planifiées détectées</p>
                    </KpiCard>

                    {/* 7 — Charge Supplémentaire */}
                    <KpiCard
                        title="Charge Supplémentaire"
                        gradient="from-violet-500/10 to-purple-500/10"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>}
                    >
                        <p className="text-3xl font-black text-violet-400 tracking-tighter leading-none">
                            {evaluationKpis.supplementaryCharge.toFixed(1)}<span className="text-base ml-1 opacity-50 font-bold">H-H</span>
                        </p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2">Heures-homme ajoutées</p>
                    </KpiCard>

                    {/* 8 — Taux Travaux Supp. */}
                    {(() => {
                        const rate = evaluationKpis.supplementaryWorkRate;
                        const color = rate < 10 ? '#10b981' : rate < 25 ? '#f59e0b' : '#ef4444';
                        return (
                            <KpiCard
                                title="Taux Travaux Supp."
                                gradient="from-fuchsia-500/10 to-pink-500/10"
                                icon={<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>}
                            >
                                <p className="text-3xl font-black tracking-tighter leading-none" style={{ color }}>
                                    {rate.toFixed(1)}<span className="text-base ml-0.5 opacity-50 font-bold">%</span>
                                </p>
                                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2">vs. Planifié</p>
                            </KpiCard>
                        );
                    })()}

                    {/* 9 — Incidents */}
                    <KpiCard
                        title="Nombre d'Incidents"
                        gradient="from-amber-500/10 to-yellow-500/10"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>}
                        onClick={() => setIsIncidentModalOpen(true)}
                    >
                        <p className={`text-3xl font-black tracking-tighter leading-none ${evaluationKpis.incidents > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {evaluationKpis.incidents}
                        </p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2 flex items-center gap-1">
                            {evaluationKpis.incidents > 0 ? <span className="text-amber-500/60">↗</span> : <span className="text-emerald-500/60">✓</span>}
                            {evaluationKpis.incidents > 0 ? 'Cliquer pour détailler' : 'Aucun incident'}
                        </p>
                    </KpiCard>

                    {/* 10 — Accidents */}
                    <KpiCard
                        title="Nombre d'Accidents"
                        gradient="from-red-600/10 to-rose-600/10"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5"><path d="M12 9v4" /><path d="M10.363 3.591 2.257 17.125a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.635-2.87L13.636 3.59a1.914 1.914 0 0 0-3.273 0Z" /><path d="M12 17h.01" /></svg>}
                        onClick={() => setIsAccidentModalOpen(true)}
                    >
                        <p className={`text-3xl font-black tracking-tighter leading-none ${evaluationKpis.accidents > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {evaluationKpis.accidents}
                        </p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2 flex items-center gap-1">
                            {evaluationKpis.accidents > 0 ? <span className="text-red-500/60">⚠</span> : <span className="text-emerald-500/60">✓</span>}
                            {evaluationKpis.accidents > 0 ? 'Cliquer pour détailler' : 'Aucun accident'}
                        </p>
                    </KpiCard>

                </div>
            </section>

            {/* Performance Execution Chart Section — PREMIUM REDESIGN */}
            {/* COMPARATIVES SECTION: Planned vs Supplementary */}
            <div className="mt-20 mb-12 space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-6 relative z-10 px-4">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-1.5 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full shadow-[0_0_20px_rgba(34,211,238,0.5)]"></div>
                        <div className="space-y-1">
                            <h4 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Analyse Comparative Profonde</h4>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Structure de la charge : Planifié vs Supplémentaire</p>
                        </div>
                    </div>
                    <SectionToggle
                        selected={reportSelection.comparativeAnalysis}
                        onToggle={() => setReportSelection(prev => ({ ...prev, comparativeAnalysis: !prev.comparativeAnalysis }))}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Global Charge Breakdown */}
                    <div className="bg-[#0D0F14]/60 rounded-[3rem] border border-white/5 p-10 backdrop-blur-3xl hover:border-cyan-500/20 transition-all group relative overflow-hidden shadow-2xl ring-1 ring-white/5">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-15 transition-all duration-700 group-hover:scale-110">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-cyan-400"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>
                        </div>
                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-12 relative z-10">Répartition Charge (H-H)</h5>
                        <div className="h-[280px] relative mt-4 z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={supplementaryComparisonData.global.filter(d => d.charge > 0)}
                                        innerRadius={80}
                                        outerRadius={105}
                                        paddingAngle={3}
                                        dataKey="charge"
                                        stroke="none"
                                        cornerRadius={12}
                                        animationBegin={300}
                                        animationDuration={2500}
                                    >
                                        <Cell fill="url(#plannedGrad)" filter="drop-shadow(0 0 12px rgba(56, 189, 248, 0.3))" />
                                        <Cell fill="url(#suppGrad)" filter="drop-shadow(0 0 12px rgba(251, 113, 133, 0.3))" />
                                        <Cell fill="url(#extraGrad)" filter="drop-shadow(0 0 12px rgba(251, 191, 36, 0.3))" />
                                    </Pie>
                                    <defs>
                                        <linearGradient id="plannedGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#38bdf8" />
                                            <stop offset="100%" stopColor="#0284c7" />
                                        </linearGradient>
                                        <linearGradient id="suppGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#fb7185" />
                                            <stop offset="100%" stopColor="#be123c" />
                                        </linearGradient>
                                        <linearGradient id="extraGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#fbbf24" />
                                            <stop offset="100%" stopColor="#d97706" />
                                        </linearGradient>
                                    </defs>
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const total = supplementaryComparisonData.global.reduce((a, b) => a + (b.charge || 0), 0);
                                                const val = payload[0].value as number;
                                                const percent = ((val / total) * 100).toFixed(1);
                                                return (
                                                    <div className="bg-[#080c14]/95 backdrop-blur-2xl border border-white/10 p-5 rounded-[1.5rem] shadow-2xl scale-110 outline-none ring-1 ring-white/10">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <div className="w-3 h-3 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: payload[0].payload.fill, color: payload[0].payload.fill }}></div>
                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{payload[0].name}</p>
                                                        </div>
                                                        <div className="flex items-baseline gap-2">
                                                            <p className="text-2xl font-black text-white">{val.toFixed(1)}h</p>
                                                            <p className="text-sm font-black text-emerald-400">{percent}%</p>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total</p>
                                <p className="text-2xl font-black text-white">{(supplementaryComparisonData.global.reduce((a, b) => a + (b.charge || 0), 0)).toFixed(0)}<span className="text-xs ml-0.5 opacity-50">H</span></p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-12 pt-8 border-t border-white/5">
                            {supplementaryComparisonData.global.map((d, i) => (
                                <div key={d.name} className="space-y-1 text-center">
                                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{d.name}</p>
                                    <p className={`text-sm font-black ${i === 1 ? 'text-rose-400' : i === 2 ? 'text-amber-400' : 'text-cyan-400'}`}>{d.charge.toFixed(0)}<span className="text-[8px] ml-0.5 opacity-50">H</span></p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Maintenance Type Breakdown */}
                    <div className="bg-[#0D0F14]/60 rounded-[3rem] border border-white/5 p-10 backdrop-blur-3xl hover:border-amber-500/20 transition-all group overflow-hidden relative shadow-2xl ring-1 ring-white/5">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-15 transition-all duration-700 group-hover:scale-110">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-amber-400"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 1 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.77 3.77z" /></svg>
                        </div>
                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-12 relative z-10 flex justify-between items-center">
                            Maintenance (H-H)
                        </h5>
                        <div className="h-[280px] z-10 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={maintenanceTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }} barGap={0}>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,255,255,0.03)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: '900' }} interval={0} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9 }} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                return (
                                                    <div className="bg-[#080c14]/95 border border-white/10 p-5 rounded-[1.5rem] shadow-2xl backdrop-blur-xl">
                                                        <p className="text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">{label}</p>
                                                        {payload.map((p: any) => (
                                                            <div key={p.name} className="flex items-center justify-between gap-6 mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: p.color, color: p.color }}></div>
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.name}</span>
                                                                </div>
                                                                <span className="text-sm font-black text-white">{p.value.toFixed(1)}h</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar name="Planifié" dataKey="planned" stackId="main" fill="url(#plannedGrad)" barSize={32} />
                                    <Bar name="Supplémentaire" dataKey="supp" stackId="main" fill="url(#suppGrad)" barSize={32} />
                                    <Bar name="Extra HH (Réel)" dataKey="extra" stackId="main" fill="url(#extraGrad)" radius={[6, 6, 0, 0]} barSize={32} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="flex items-center justify-center gap-6 mt-8">
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-sky-500"></div><span className="text-[8px] font-black text-slate-500 uppercase">Planifié</span></div>
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div><span className="text-[8px] font-black text-slate-500 uppercase">Suppl.</span></div>
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500"></div><span className="text-[8px] font-black text-slate-500 uppercase">Extra</span></div>
                        </div>
                    </div>

                    {/* Charge by Discipline Comparison */}
                    <div className="bg-[#0D0F14]/60 rounded-[3rem] border border-white/5 p-10 backdrop-blur-3xl hover:border-emerald-500/20 transition-all group overflow-hidden relative shadow-2xl ring-1 ring-white/5">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-15 transition-all duration-700 group-hover:scale-110">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-emerald-400"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" /></svg>
                        </div>
                        <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-12 relative z-10">Charge par Discipline (H-H)</h5>
                        <div className="h-[320px] relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={supplementaryComparisonData.disciplines.filter(d => d.plannedCharge > 0 || d.suppCharge > 0 || d.extraCharge > 0).slice(0, 8)}
                                    layout="vertical"
                                    margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
                                    barGap={0}
                                >
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: '900' }}
                                        width={75}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const total = payload.reduce((a: any, b: any) => a + (b.value || 0), 0);
                                                return (
                                                    <div className="bg-[#080c14]/95 border border-white/10 p-5 rounded-[1.5rem] shadow-2xl backdrop-blur-xl">
                                                        <p className="text-[10px] font-black text-slate-500 mb-3 uppercase tracking-widest">{label}</p>
                                                        {payload.map((p: any) => (
                                                            <div key={p.name} className="flex items-center justify-between gap-6 mb-2">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
                                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.name}</span>
                                                                </div>
                                                                <span className="text-[10px] font-black text-white">{p.value.toFixed(1)}h</span>
                                                            </div>
                                                        ))}
                                                        <div className="mt-3 pt-3 border-t border-white/5 flex justify-between items-center">
                                                            <span className="text-[9px] font-black text-slate-500 tracking-widest">TOTAL</span>
                                                            <span className="text-xs font-black text-emerald-400">{total.toFixed(1)}h</span>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar name="Planifié" dataKey="plannedCharge" stackId="discipline" fill="url(#plannedGrad)" barSize={20} />
                                    <Bar name="Supplémentaire" dataKey="suppCharge" stackId="discipline" fill="url(#suppGrad)" barSize={20} />
                                    <Bar name="Extra HH (Réel)" dataKey="extraCharge" stackId="discipline" fill="url(#extraGrad)" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>


            <section className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-white/5 shadow-xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-amber-300 flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        Chronologie de l'Arrêt
                    </h3>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleSortChronologyByDate}
                            className="flex items-center gap-2 px-3 h-10 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-xl border border-white/5 transition-all group"
                            title="Trier par date"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-180 transition-transform duration-500"><path d="m3 16 4 4 4-4" /><path d="M7 20V4" /><path d="m21 8-4-4-4 4" /><path d="M17 4v16" /></svg>
                            <span className="text-xs font-bold uppercase tracking-widest">Trier</span>
                        </button>
                        <div className="flex items-center gap-2 h-10 px-3 bg-slate-800/50 rounded-xl border border-white/5">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Zoom:</span>
                            <button onClick={() => setTimelineIntervalHours(prev => Math.max(1, Math.ceil(prev / 2)))} className="bg-slate-700 hover:bg-slate-600 text-white font-bold w-6 h-6 rounded-lg flex items-center justify-center text-xs">-</button>
                            <span className="text-xs font-black text-white w-8 text-center">{timelineIntervalHours}h</span>
                            <button onClick={() => setTimelineIntervalHours(prev => Math.min(48, prev * 2))} className="bg-slate-700 hover:bg-slate-600 text-white font-bold w-6 h-6 rounded-lg flex items-center justify-center text-xs">+</button>
                        </div>
                        <SectionToggle
                            selected={reportSelection.chronologySection}
                            onToggle={() => setReportSelection(prev => ({ ...prev, chronologySection: !prev.chronologySection }))}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-700">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-800/80 backdrop-blur-md text-slate-300 border-b border-white/10">
                            <tr>
                                <th className="px-3 py-2 font-semibold min-w-[200px]">Événement</th>
                                <th className="px-3 py-2 font-semibold">Date Début Planifiée</th>
                                <th className="px-3 py-2 font-semibold">Date Fin Planifiée</th>
                                <th className="px-3 py-2 font-semibold">Date Début Réelle</th>
                                <th className="px-3 py-2 font-semibold">Date Fin Réelle</th>
                                <th className="px-3 py-2 font-semibold text-center w-28">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {evaluationData.chronology.map(event => (
                                <tr key={event.id} className="border-b border-slate-700 last:border-b-0 hover:bg-slate-700/40">
                                    <td className="px-3 py-1"><input type="text" value={event.label} onChange={(e) => handleChronologyChange(event.id, 'label', e.target.value)} className="bg-slate-800/60 border border-white/10 rounded-lg px-3 py-1.5 w-full text-slate-200 focus:bg-slate-700/80 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all hover:bg-slate-800" /></td>
                                    <td className="px-3 py-1"><input type="datetime-local" value={event.plannedStart} onChange={(e) => handleChronologyChange(event.id, 'plannedStart', e.target.value)} className="bg-slate-800/60 border border-white/10 rounded-lg px-3 py-1.5 w-44 text-slate-200 text-xs focus:bg-slate-700/80 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all hover:bg-slate-800" /></td>
                                    <td className="px-3 py-1"><input type="datetime-local" value={event.plannedEnd} onChange={(e) => handleChronologyChange(event.id, 'plannedEnd', e.target.value)} className="bg-slate-800/60 border border-white/10 rounded-lg px-3 py-1.5 w-44 text-slate-200 text-xs focus:bg-slate-700/80 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all hover:bg-slate-800" /></td>
                                    <td className="px-3 py-1"><input type="datetime-local" value={event.actualStart} onChange={(e) => handleChronologyChange(event.id, 'actualStart', e.target.value)} className="bg-slate-800/60 border border-white/10 rounded-lg px-3 py-1.5 w-44 text-slate-200 text-xs focus:bg-slate-700/80 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all hover:bg-slate-800" /></td>
                                    <td className="px-3 py-1"><input type="datetime-local" value={event.actualEnd} onChange={(e) => handleChronologyChange(event.id, 'actualEnd', e.target.value)} className="bg-slate-800/60 border border-white/10 rounded-lg px-3 py-1.5 w-44 text-slate-200 text-xs focus:bg-slate-700/80 focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all hover:bg-slate-800" /></td>
                                    <td className="px-3 py-1 flex items-center justify-center gap-1">
                                        <div className="flex flex-col gap-0.5">
                                            <button
                                                onClick={() => handleMoveChronology(event.id, 'up')}
                                                className="text-slate-400 hover:text-emerald-400 p-0.5 rounded-md hover:bg-slate-700 disabled:opacity-20 disabled:pointer-events-none transition-all"
                                                title="Monter"
                                                disabled={evaluationData.chronology.indexOf(event) === 0}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleMoveChronology(event.id, 'down')}
                                                className="text-slate-400 hover:text-emerald-400 p-0.5 rounded-md hover:bg-slate-700 disabled:opacity-20 disabled:pointer-events-none transition-all"
                                                title="Descendre"
                                                disabled={evaluationData.chronology.indexOf(event) === evaluationData.chronology.length - 1}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                            </button>
                                        </div>
                                        <button onClick={() => handleChronologyDelete(event.id)} className="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-red-500/10 transition-colors" title="Supprimer l'événement">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="flex justify-end mt-4">
                    <button onClick={handleChronologyAdd} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors shadow-md text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
                        Ajouter un Événement
                    </button>
                </div>
                <ChronologyGanttChart
                    chronology={evaluationData.chronology}
                    parameters={parameters}
                    evaluationData={evaluationData}
                    timelineIntervalHours={timelineIntervalHours}
                />
            </section>

            <section className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-pink-400"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 relative z-10">
                    <div className="space-y-2 flex-grow">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-8 bg-gradient-to-b from-pink-400 to-rose-600 rounded-full"></div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Travaux Supplémentaires</h3>
                        </div>
                        <p className="text-slate-400 text-sm font-medium italic ml-5">Tâches non planifiées identifiées lors de l'exécution de l'arrêt</p>
                    </div>
                    <SectionToggle
                        selected={reportSelection.supplementaryTasks}
                        onToggle={() => setReportSelection(prev => ({ ...prev, supplementaryTasks: !prev.supplementaryTasks }))}
                    />
                    <button
                        onClick={() => { setEditingSuppTask(null); setIsAddTaskModalOpen(true); }}
                        className="bg-gradient-to-r from-pink-500 to-rose-600 text-white font-black py-3 px-8 rounded-2xl shadow-xl shadow-rose-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-widest text-[10px]"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Ajouter un Travail
                    </button>
                </div>

                <div className="bg-slate-950/40 rounded-[2rem] border border-white/5 overflow-hidden shadow-inner backdrop-blur-sm">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/3">Description de l'Action</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Équipement</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Équipes & Disciplines</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Charge (H-H)</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {evaluationData.supplementaryTasks.map(task => (
                                <tr key={task.id} className="hover:bg-white/[0.02] transition-colors group/row">
                                    <td className="p-6">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-slate-200 font-bold group-hover/row:text-pink-100 transition-colors uppercase text-xs tracking-tight">{task.action}</span>
                                            <span className="text-[10px] text-slate-600 font-bold font-mono tracking-tighter uppercase">{task.maintenanceType} • {task.id.slice(0, 8)}</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className="bg-slate-800/80 text-slate-400 px-3 py-1.5 rounded-xl text-[10px] font-black border border-white/5 group-hover/row:border-pink-500/20 transition-all uppercase">{task.equipment}</span>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex flex-wrap justify-center gap-2">
                                            {task.teamDetails.map(td => (
                                                <div key={td.team} className="flex flex-col items-center">
                                                    <span className="bg-pink-500/10 text-pink-400 px-2.5 py-1 rounded-lg text-[9px] font-black border border-pink-500/10 group-hover/row:bg-pink-500/20 transition-all uppercase">{td.team}</span>
                                                    <span className="text-[10px] text-slate-500 font-bold font-mono mt-1">{td.manHours.toFixed(1)}h</span>
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="p-6 text-right">
                                        <span className="text-white font-mono font-black text-sm drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">{task.totalManHours.toFixed(2)}</span>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex justify-center items-center gap-4">
                                            <button
                                                onClick={() => { setEditingSuppTask(task); setIsAddTaskModalOpen(true); }}
                                                className="p-2.5 text-cyan-400 hover:bg-cyan-400/10 rounded-xl transition-all hover:scale-110 active:scale-90"
                                                title="Modifier le travail"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => setTaskToDelete(task.id)}
                                                className="p-2.5 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all hover:scale-110 active:scale-90"
                                                title="Supprimer définitivement"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {evaluationData.supplementaryTasks.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-24 text-center">
                                        <div className="flex flex-col items-center gap-6 opacity-20">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-500"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" /><line x1="9" y1="15" x2="15" y2="15" /></svg>
                                            <div>
                                                <p className="text-lg font-black uppercase tracking-[0.2em] text-slate-500">Aucun travail supplémentaire répertorié</p>
                                                <p className="text-sm font-bold text-slate-600 mt-2">Utilisez le bouton 'Ajouter' pour enregistrer de nouveaux travaux</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* TRAVAUX NON RÉALISÉS & ANNULÉS TABLES */}
            <div className="flex justify-between items-center mb-6 px-4">
                <div className="flex items-center gap-4">
                    <div className="w-2 h-10 bg-gradient-to-b from-red-600 to-orange-500 rounded-full shadow-[0_0_20px_rgba(220,38,38,0.4)]"></div>
                    <h2 className="text-3xl font-black text-white tracking-tighter uppercase whitespace-nowrap">Analyse des Écarts</h2>
                </div>
                <div className="flex items-center gap-4">
                    <SectionToggle
                        selected={reportSelection.slippageAnalysis}
                        onToggle={() => setReportSelection(prev => ({ ...prev, slippageAnalysis: !prev.slippageAnalysis }))}
                        label="Inclure Glissement"
                    />
                    <SectionToggle
                        selected={reportSelection.nonCompletedTasks}
                        onToggle={() => setReportSelection(prev => ({ ...prev, nonCompletedTasks: !prev.nonCompletedTasks }))}
                        label="Inclure Non Réalisés"
                    />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                {/* Travaux Non Faits */}
                <section className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-red-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </div>
                    <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-8 bg-gradient-to-b from-red-500 to-rose-700 rounded-full"></div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Travaux Non Réalisés</h3>
                        </div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-5 opacity-70">Tâches planifiées non effectuées</p>
                    </div>
                    <div className="bg-slate-950/40 rounded-[2rem] border border-white/5 overflow-hidden shadow-inner">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="p-4 font-black text-slate-500 uppercase tracking-widest">Action</th>
                                    <th className="p-4 font-black text-slate-500 uppercase tracking-widest text-center">Équipement</th>
                                    <th className="p-4 font-black text-slate-500 uppercase tracking-widest text-center">Cause</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {results.scheduledTasks.filter(t => (evaluationData.tasks[t.id]?.status || 'À Faire') === 'Non Fait').length > 0 ? (
                                    results.scheduledTasks.filter(t => (evaluationData.tasks[t.id]?.status || 'À Faire') === 'Non Fait').map(task => (
                                        <tr key={task.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="p-4 font-bold text-slate-300">{task.action}</td>
                                            <td className="p-4 text-center">
                                                <span className="bg-slate-800 text-slate-400 px-2 py-1 rounded-lg text-[9px] font-black border border-white/5 uppercase">{task.equipment}</span>
                                            </td>
                                            <td className="p-4 text-center italic text-red-400/80 font-bold">
                                                {evaluationData.tasks[task.id]?.nonCompletionDetails?.cause || 'N/A'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="p-12 text-center text-slate-600 font-black uppercase tracking-widest opacity-30">Aucun travail non réalisé</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Travaux Annulés */}
                <section className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                    </div>
                    <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-8 bg-gradient-to-b from-slate-500 to-slate-800 rounded-full"></div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Travaux Annulés</h3>
                        </div>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-5 opacity-70">Tâches définitivement supprimées de l'arrêt</p>
                    </div>
                    <div className="bg-slate-950/40 rounded-[2rem] border border-white/5 overflow-hidden shadow-inner">
                        <table className="w-full text-left text-[11px]">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="p-4 font-black text-slate-500 uppercase tracking-widest">Action</th>
                                    <th className="p-4 font-black text-slate-500 uppercase tracking-widest text-center">Équipement</th>
                                    <th className="p-4 font-black text-slate-500 uppercase tracking-widest text-center">Raison</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {results.scheduledTasks.filter(t => (evaluationData.tasks[t.id]?.status || 'À Faire') === 'Annuler').length > 0 ? (
                                    results.scheduledTasks.filter(t => (evaluationData.tasks[t.id]?.status || 'À Faire') === 'Annuler').map(task => (
                                        <tr key={task.id} className="hover:bg-white/[0.02] transition-colors">
                                            <td className="p-4 font-bold text-slate-400 italic line-through">{task.action}</td>
                                            <td className="p-4 text-center">
                                                <span className="bg-slate-800 text-slate-500 px-2 py-1 rounded-lg text-[9px] font-black border border-white/5 uppercase opacity-50">{task.equipment}</span>
                                            </td>
                                            <td className="p-4 text-center italic text-slate-500 font-bold">
                                                {evaluationData.tasks[task.id]?.nonCompletionDetails?.cause || 'Arbitrage technique'}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="p-12 text-center text-slate-600 font-black uppercase tracking-widest opacity-30">Aucun travail annulé</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <section className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10 -translate-x-1/4 translate-y-1/4"></div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 relative z-10">
                    <div className="space-y-2 flex-grow">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-8 bg-gradient-to-b from-blue-400 to-indigo-600 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.3)]"></div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Suivi des Tâches Planifiées</h3>
                        </div>
                        <p className="text-slate-400 text-sm font-medium italic ml-5">Base de données complète de l'arrêt technique avec statut d'exécution détaillé</p>
                    </div>
                    <SectionToggle
                        selected={reportSelection.detailedLog}
                        onToggle={() => setReportSelection(prev => ({ ...prev, detailedLog: !prev.detailedLog }))}
                    />

                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                        <div className="relative group w-full md:w-64">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                            </div>
                            <input
                                type="text"
                                placeholder="Rechercher une tâche..."
                                value={tableSearchTerm}
                                onChange={(e) => { setTableSearchTerm(e.target.value); setTableCurrentPage(1); }}
                                className="w-full bg-slate-950/50 border border-white/10 text-white rounded-2xl pl-12 pr-4 py-3 outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium text-sm shadow-inner"
                            />
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value as any); setTableCurrentPage(1); }}
                                className="bg-slate-950/50 border border-white/10 text-white rounded-2xl px-4 py-3 outline-none focus:border-blue-500/50 transition-all font-black text-[10px] uppercase tracking-widest cursor-pointer shadow-inner"
                            >
                                <option value="all">Tous les Statuts</option>
                                <option value="À Faire">À Faire</option>
                                <option value="En Cours">En Cours</option>
                                <option value="Fait">Fait</option>
                                <option value="Non Fait">Non Fait</option>
                                <option value="Annuler">Annuler</option>
                            </select>

                            <select
                                value={disciplineFilter}
                                onChange={(e) => { setDisciplineFilter(e.target.value); setTableCurrentPage(1); }}
                                className="bg-slate-950/50 border border-white/10 text-white rounded-2xl px-4 py-3 outline-none focus:border-blue-500/50 transition-all font-black text-[10px] uppercase tracking-widest cursor-pointer shadow-inner"
                            >
                                <option value="all">Toutes Disciplines</option>
                                {uniqueDisciplines.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>

                            <div className="h-10 w-px bg-white/5 mx-2 hidden md:block"></div>

                            <select value={selectedFamily} onChange={(e) => { setSelectedFamily(e.target.value); setTableCurrentPage(1); }} className="bg-slate-950/50 border border-white/10 text-white rounded-2xl px-4 py-3 outline-none focus:border-blue-500/50 transition-all font-black text-[10px] uppercase tracking-widest cursor-pointer shadow-inner">
                                {familyList.map(f => <option key={f} value={f}>{f === 'all' ? 'Familles' : f}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                {selectedTaskIds.length > 0 && (
                    <div className="bg-blue-500/10 backdrop-blur-md p-4 rounded-3xl mb-8 flex flex-col sm:flex-row items-center justify-between border border-blue-500/30 animate-in slide-in-from-top-4 duration-500 shadow-[0_10px_40px_rgba(59,130,246,0.1)] gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                            </div>
                            <div>
                                <p className="text-white font-black text-lg tracking-tight leading-none">{selectedTaskIds.length} Tâche(s) sélectionnée(s)</p>
                                <p className="text-blue-400/60 text-[10px] uppercase font-bold tracking-widest mt-1">Mode d'édition groupée activé</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-grow sm:flex-grow-0">
                                <select
                                    value={bulkStatus}
                                    onChange={(e) => setBulkStatus(e.target.value as TaskStatus | '')}
                                    className="w-full bg-slate-900 border border-white/10 rounded-2xl px-6 py-3 text-sm font-bold text-white appearance-none focus:border-blue-500/50 outline-none transition-all cursor-pointer pr-12"
                                >
                                    <option value="" disabled>Changer statut en...</option>
                                    <option value="À Faire">À Faire</option>
                                    <option value="Fait">Fait</option>
                                    <option value="Non Fait">Non Fait</option>
                                    <option value="Annuler">Annuler</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                            </div>
                            <button
                                onClick={handleBulkStatusChange}
                                disabled={!bulkStatus}
                                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black uppercase text-xs tracking-widest transition-all shadow-lg active:scale-95 disabled:grayscale disabled:opacity-50 disabled:cursor-not-allowed group flex items-center gap-2"
                            >
                                {bulkStatus ? 'Appliquer' : 'Sélectionner'}
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="group-hover:translate-x-1 transition-transform"><polyline points="9 18 15 12 9 6" /></svg>
                            </button>
                            <button
                                onClick={() => setSelectedTaskIds([])}
                                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all flex items-center justify-center group border border-white/5"
                                title="Annuler la sélection"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:rotate-90 transition-transform"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    </div>
                )}
                <div className="overflow-x-auto max-h-[70vh]">
                    <table className="w-full text-left text-sm">
                        <thead className="text-slate-300 bg-slate-900/80 backdrop-blur-md sticky top-0 border-b border-white/10 shadow-sm z-10">
                            <tr>
                                <th className="p-2 w-10 text-center"><input type="checkbox" onChange={(e) => setSelectedTaskIds(e.target.checked ? filteredAndSortedTasks.map(t => t.id) : [])} checked={filteredAndSortedTasks.length > 0 && selectedTaskIds.length === filteredAndSortedTasks.length} className="w-4 h-4 text-emerald-600 bg-slate-800 border-slate-500 rounded" /></th>
                                <th className="p-2 font-semibold">Action</th>
                                <th className="p-2 font-semibold text-center">Discipline</th>
                                <th className="p-2 font-semibold text-center" title="Ressources planifiées / Ressources réelles (éditable)">Ressources</th>
                                <th className="p-2 font-semibold text-right" title="HH planifiées / HH réelles">HH (Plan. / Réel)</th>
                                <th className="p-2 font-semibold">Statut</th>
                                <th className="p-2 font-semibold">Début Réel</th>
                                <th className="p-2 font-semibold">Fin Réelle</th>
                                <th className="p-2 font-semibold text-center">Analyse</th>
                                <th className="p-2 font-semibold text-right">Durée Plan.</th>
                                <th className="p-2 font-semibold text-right">Durée Réelle</th>
                                <th className="p-2 font-semibold text-right">Glissement (h)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedTasks.map(task => {
                                const evalTask = evaluationData.tasks[task.id];
                                if (!evalTask) return null;

                                const actualDuration = calculateDuration(evalTask.actualStart, evalTask.actualEnd);
                                const slippage = actualDuration !== null ? actualDuration - task.duration : null;

                                return (
                                    <tr key={task.id} className={`border-t border-slate-700/50 transition-all hover:bg-slate-800/80 ${selectedTaskIds.includes(task.id) ? 'bg-blue-900/50' : ''}`}>
                                        <td className="p-2 text-center"><input type="checkbox" checked={selectedTaskIds.includes(task.id)} onChange={() => setSelectedTaskIds(prev => prev.includes(task.id) ? prev.filter(id => id !== task.id) : [...prev, task.id])} className="w-4 h-4 text-emerald-600 bg-slate-800 border-slate-500 rounded" /></td>
                                        <td className="p-2 whitespace-normal">{task.action} <span className="text-xs text-slate-400">({task.equipment})</span></td>
                                        <td className="p-2 text-center">
                                            <span className="inline-block bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide whitespace-nowrap">
                                                {task.discipline || task.team || '—'}
                                            </span>
                                        </td>
                                        {/* EDITABLE RESSOURCES CELL */}
                                        <td className="p-2 text-center">
                                            {(() => {
                                                const actualMp = evalTask.actualManpower;
                                                const hasOverrun = actualMp != null && actualMp > task.manpower;
                                                return (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <div className="flex items-center gap-1">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                                            <span className="text-[10px] font-bold text-slate-400">{task.manpower}</span>
                                                        </div>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step={1}
                                                            value={actualMp ?? ''}
                                                            placeholder={String(task.manpower)}
                                                            onChange={e => {
                                                                const v = e.target.value === '' ? undefined : Number(e.target.value);
                                                                handleTaskDataChange(task.id, 'actualManpower', v as any);
                                                            }}
                                                            title="Ressources réelles utilisées"
                                                            className={`w-14 text-center text-[11px] font-black rounded-lg px-1.5 py-0.5 border outline-none transition-all ${hasOverrun
                                                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 focus:border-amber-400'
                                                                : 'bg-slate-800/60 border-white/10 text-emerald-300 focus:border-emerald-500'
                                                                }`}
                                                        />
                                                        {hasOverrun && (
                                                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">+{(actualMp! - task.manpower)} réel</span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        {/* HH CELL: planned + real if overrun */}
                                        <td className="p-2 text-right font-mono">
                                            {(() => {
                                                const actualMp = evalTask.actualManpower;
                                                const actualDur = calculateDuration(evalTask.actualStart, evalTask.actualEnd) ?? task.duration;
                                                const realHH = actualMp != null ? actualMp * actualDur : null;
                                                const hasOverrun = realHH !== null && realHH > task.manHours;
                                                return (
                                                    <div className="flex flex-col items-end gap-0.5">
                                                        <span className="text-slate-300 text-xs">{task.manHours.toFixed(2)}h</span>
                                                        {hasOverrun && (
                                                            <span className="text-amber-400 text-xs font-black" title="HH réelles = Ressources réelles × Durée réelle">
                                                                {realHH!.toFixed(2)}h
                                                                <span className="text-[9px] text-red-400 ml-1">+{(realHH! - task.manHours).toFixed(2)}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="p-2 text-center">
                                            <select
                                                value={evalTask.status}
                                                onChange={(e) => handleTaskDataChange(task.id, 'status', e.target.value)}
                                                className={`text-xs font-bold border-transparent rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-center appearance-none cursor-pointer ${evalTask.status === 'À Faire' ? 'bg-slate-600 hover:bg-slate-500 text-white' :
                                                    evalTask.status === 'Fait' ? 'bg-green-600 hover:bg-green-500 text-white' :
                                                        evalTask.status === 'Non Fait' ? 'bg-red-600 hover:bg-red-500 text-white' :
                                                            'bg-yellow-500 hover:bg-yellow-400 text-black'
                                                    }`}
                                            >
                                                <option value="À Faire">À Faire</option>
                                                <option value="Fait">Fait</option>
                                                <option value="Non Fait">Non Fait</option>
                                                <option value="Annuler">Annuler</option>
                                            </select>
                                        </td>
                                        <td className="p-2"><input type="datetime-local" value={evalTask.actualStart} onChange={e => handleTaskDataChange(task.id, 'actualStart', e.target.value)} className="bg-slate-700 border-slate-600 rounded px-2 py-1 text-sm w-44" /></td>
                                        <td className="p-2"><input type="datetime-local" value={evalTask.actualEnd} onChange={e => handleTaskDataChange(task.id, 'actualEnd', e.target.value)} className="bg-slate-700 border-slate-600 rounded px-2 py-1 text-sm w-44" /></td>
                                        <td className="p-2 text-center">
                                            {evalTask.status === 'Non Fait' ? (
                                                <button onClick={() => { setEditingTask({ id: task.id }); setIsNonCompletionModalOpen(true); }} className="text-blue-400 hover:underline text-xs">{evalTask.nonCompletionDetails ? 'Voir/Éditer' : 'Analyser'}</button>
                                            ) : (slippage !== null && slippage > 0.01) ? (
                                                <button onClick={() => { setEditingTask({ id: task.id, slippageHours: slippage }); setIsSlippageModalOpen(true); }} className="text-blue-400 hover:underline text-xs">{evalTask.slippageDetails ? 'Voir/Éditer' : 'Analyser'}</button>
                                            ) : '-'}
                                        </td>
                                        <td className="p-2 text-right font-mono">{formatDuration(task.duration)}</td>
                                        <td className="p-2 text-right font-mono">{formatDuration(actualDuration)}</td>
                                        <td className={`p-2 text-right font-mono font-bold ${slippage !== null && slippage > 0.01 ? 'text-red-400' : (slippage !== null && slippage < -0.01 ? 'text-green-400' : '')}`}>
                                            {formatDuration(slippage)}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalTaskPages > 1 && (
                    <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">
                            Affichage de <span className="text-cyan-400">{(tableCurrentPage - 1) * tasksPerPage + 1}</span> à <span className="text-cyan-400">{Math.min(tableCurrentPage * tasksPerPage, filteredAndSortedTasks.length)}</span> sur <span className="text-white">{filteredAndSortedTasks.length}</span> tâches
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setTableCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={tableCurrentPage === 1}
                                className="p-2 rounded-xl bg-slate-800 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6" /></svg>
                            </button>

                            <div className="flex items-center gap-1">
                                {Array.from({ length: Math.min(5, totalTaskPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalTaskPages <= 5) pageNum = i + 1;
                                    else if (tableCurrentPage <= 3) pageNum = i + 1;
                                    else if (tableCurrentPage >= totalTaskPages - 2) pageNum = totalTaskPages - 4 + i;
                                    else pageNum = tableCurrentPage - 2 + i;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setTableCurrentPage(pageNum)}
                                            className={`w-10 h-10 rounded-xl text-[10px] font-black transition-all ${tableCurrentPage === pageNum ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20 scale-110' : 'bg-slate-800 text-slate-500 hover:text-white hover:bg-slate-700'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                onClick={() => setTableCurrentPage(prev => Math.min(totalTaskPages, prev + 1))}
                                disabled={tableCurrentPage === totalTaskPages}
                                className="p-2 rounded-xl bg-slate-800 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6" /></svg>
                            </button>
                        </div>
                    </div>
                )}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12 mb-12">
                {/* Réalisation par Discipline - Radar Chart */}
                <div className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/5 shadow-2xl shadow-cyan-500/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-cyan-400"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                    </div>
                    <div className="flex justify-between items-start mb-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-10 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.4)]"></div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Réalisation par Discipline</h3>
                            </div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] ml-6 opacity-70">Analyse radiale de complétion par discipline</p>
                        </div>
                        <SectionToggle
                            selected={reportSelection.disciplineAnalysis}
                            onToggle={() => setReportSelection(prev => ({ ...prev, disciplineAnalysis: !prev.disciplineAnalysis }))}
                        />
                    </div>

                    <div className="h-[400px] w-full flex items-center justify-center p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={disciplineProgress}>
                                <PolarGrid stroke="rgba(255,255,255,0.05)" />
                                <PolarAngleAxis
                                    dataKey="name"
                                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '900', letterSpacing: '0.1em' }}
                                />
                                <PolarRadiusAxis
                                    angle={30}
                                    domain={[0, 100]}
                                    tick={{ fill: '#64748b', fontSize: 8 }}
                                    axisLine={false}
                                />
                                <Radar
                                    name="Avancement"
                                    dataKey="progress"
                                    stroke="#22d3ee"
                                    strokeWidth={3}
                                    fill="url(#radarGradient)"
                                    fillOpacity={0.6}
                                />
                                <defs>
                                    <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.2} />
                                    </linearGradient>
                                </defs>
                                <RechartsTooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-slate-900/90 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl">
                                                    <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                                                    <p className="text-xl font-black text-white">{payload[0].value.toFixed(1)}%</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Réalisation par Équipe - Modern Grid */}
                <div className="bg-slate-900/50 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/5 shadow-2xl shadow-purple-500/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-purple-400"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    </div>
                    <div className="flex justify-between items-start mb-10">
                        <div className="space-y-2">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-10 bg-gradient-to-b from-purple-400 to-indigo-600 rounded-full shadow-[0_0_15px_rgba(168,85,247,0.4)]"></div>
                                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Réalisation par Équipe</h3>
                            </div>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em] ml-6 opacity-70">Analyse de performance par unité d'intervention</p>
                        </div>
                        <SectionToggle
                            selected={reportSelection.teamGauges}
                            onToggle={() => setReportSelection(prev => ({ ...prev, teamGauges: !prev.teamGauges }))}
                        />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 overflow-y-auto max-h-[460px] pr-4 custom-scrollbar">
                        {teamProgress.map((tp) => (
                            <div key={tp.name} className="bg-slate-800/20 border border-white/5 p-5 rounded-3xl hover:bg-slate-800/40 hover:border-purple-500/30 transition-all group/card relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 opacity-10 group-hover/card:scale-110 transition-transform">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                </div>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4 pr-6 h-6 leading-tight">{tp.name}</span>

                                <div className="flex items-center gap-4">
                                    <div className="relative flex-shrink-0">
                                        <svg className="w-16 h-16 transform -rotate-90">
                                            <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-900/50" />
                                            <circle
                                                cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="6" fill="transparent"
                                                strokeDasharray={175.92}
                                                strokeDashoffset={175.92 - (175.92 * tp.progress / 100)}
                                                className={`${tp.progress === 100 ? 'text-emerald-500' : 'text-purple-500'} transition-all duration-1000 ease-out`}
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-xs font-black text-white">{Math.round(tp.progress)}%</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-black text-slate-300">STATUT</span>
                                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${tp.progress === 100 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                            {tp.progress === 100 ? 'Validé' : 'En Cours'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Global Master Gantt Chart - NEW HIGH DESIGN */}
            <section className="mt-12 mb-12 bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-[3rem] p-1 overflow-hidden shadow-2xl relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

                <div className="p-10 pb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="flex-grow">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="w-2.5 h-10 bg-gradient-to-b from-blue-600 to-cyan-500 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.4)]"></div>
                            <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Master Gantt : Chronologie Complète</h2>
                        </div>
                        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em] ml-6 opacity-70">Visualisation Interactive de l'Exécution du Projet</p>
                    </div>

                    <SectionToggle
                        selected={reportSelection.masterGantt}
                        onToggle={() => setReportSelection(prev => ({ ...prev, masterGantt: !prev.masterGantt }))}
                        className="mb-4 lg:mb-0"
                    />

                    <div className="flex items-center gap-3 bg-black/50 p-2 rounded-[2rem] border border-white/5 shadow-2xl backdrop-blur-xl">
                        {[
                            { id: 'all', label: 'Tout', color: 'bg-slate-600' },
                            { id: 'done', label: 'Terminé', color: 'bg-emerald-500' },
                            { id: 'in-progress', label: 'En Cours', color: 'bg-blue-500' },
                            { id: 'pending', label: 'À Faire', color: 'bg-slate-400' }
                        ].map(filter => (
                            <button
                                key={filter.id}
                                onClick={() => setGanttStatusFilter(filter.id as any)}
                                className={`
                                    px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-3
                                    ${ganttStatusFilter === filter.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105'
                                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'}
                                `}
                            >
                                <div className={`w-2 h-2 rounded-full ${filter.color} ${ganttStatusFilter === filter.id ? 'animate-pulse bg-white' : ''}`}></div>
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6 pt-0 min-h-[500px]">
                    <div className="bg-slate-950/40 rounded-[2.5rem] border border-white/5 p-4 shadow-inner backdrop-blur-sm overflow-hidden">
                        <ProfessionalGanttChart
                            results={filteredGanttResults}
                            parameters={parameters}
                            familyOrder={ganttFamilyOrder}
                            setFamilyOrder={setGanttFamilyOrder}
                            customCriticalPaths={[]}
                            isColdStopFlow={true}
                            taskProgress={taskProgressMapForGantt}
                            timelineOptions={{ unit: 'Heures', interval: 6 }}
                            disciplineColors={disciplineColors}
                            showFlow={false}
                            theme="dark"
                            isHoverDetailsEnabled={true}
                        />
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-blue-500/5 to-transparent pointer-events-none"></div>
            </section>
        </div>
    );
};

export default EvaluationView;
