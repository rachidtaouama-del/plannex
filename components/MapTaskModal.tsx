import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { SchedulingTaskData } from '../types';
import { X, Save, MapPin, Info, ChevronDown } from 'lucide-react';

interface CreatableSearchableSelectProps {
    label: string;
    name: string;
    value: string;
    onChange: (name: string, value: string) => void;
    options: string[];
    placeholder?: string;
    className?: string;
}

const CreatableSearchableSelect: React.FC<CreatableSearchableSelectProps> = ({ label, name, value, onChange, options, placeholder, className }) => {
    const [showOptions, setShowOptions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowOptions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const filteredOptions = useMemo(() => {
        if (!value) return options;
        return options.filter(option =>
            option?.toLowerCase().includes(value.toLowerCase())
        );
    }, [options, value]);

    const handleSelectOption = (option: string) => {
        onChange(name, option);
        setShowOptions(false);
    };

    return (
        <div ref={wrapperRef} className={`relative group ${className}`}>
            <label htmlFor={name} className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 group-focus-within:text-emerald-400 transition-colors">
                {label}
            </label>
            <div className="relative">
                <input
                    type="text"
                    id={name}
                    name={name}
                    value={value}
                    onChange={e => onChange(name, e.target.value)}
                    onFocus={() => setShowOptions(true)}
                    placeholder={placeholder}
                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all text-sm shadow-inner"
                    autoComplete="off"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <ChevronDown size={14} className="text-slate-400" />
                </div>
            </div>
            {showOptions && (
                <div className="absolute top-full mt-2 w-full bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-[80] max-h-48 overflow-y-auto custom-scrollbar backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <div
                                key={option}
                                onClick={() => handleSelectOption(option)}
                                className="px-4 py-2.5 hover:bg-emerald-500/10 cursor-pointer text-slate-300 hover:text-emerald-400 text-sm transition-colors border-b border-white/5 last:border-0"
                            >
                                {option}
                            </div>
                        ))
                    ) : (
                        <div className="px-4 py-3 text-slate-500 text-xs italic">Aucune option. Tapez pour créer...</div>
                    )}
                </div>
            )}
        </div>
    );
};

interface MapTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: SchedulingTaskData) => void;
    editingTask: SchedulingTaskData | null;
    allTasks?: SchedulingTaskData[];
}

const initialTaskState: Partial<SchedulingTaskData> = {
    'GLOBAL TASKS': '',
    'Nom Equipement': '',
    'FAMILLE': '',
    'DISCIPLINE': '',
    'OT': '',
    'AVIS': '',
    'DUREE': 0,
    'EFFECTIF': 0,
    'Heures-Homme': 0,
    'ZONE': '',
    'COMPANY': '',
    'Latitude': '',
    'Longitude': ''
};

export const MapTaskModal: React.FC<MapTaskModalProps> = ({ isOpen, onClose, onSave, editingTask, allTasks = [] }) => {
    const [formData, setFormData] = useState<Partial<SchedulingTaskData>>(initialTaskState);

    const options = useMemo(() => ({
        disciplines: [...new Set(allTasks.map(t => t.DISCIPLINE).filter(Boolean))].sort(),
        zones: [...new Set(allTasks.map(t => t.ZONE).filter(Boolean))].sort(),
        equipment: [...new Set(allTasks.map(t => t['Nom Equipement']).filter(Boolean))].sort(),
        companies: [...new Set(allTasks.map(t => t.COMPANY).filter(Boolean))].sort()
    }), [allTasks]);

    useEffect(() => {
        if (editingTask) {
            setFormData(editingTask);
        } else {
            setFormData(initialTaskState);
        }
    }, [editingTask, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const taskToSave = {
            ...(formData as SchedulingTaskData),
            id: editingTask ? editingTask.id : Math.floor(Math.random() * 1000000),
            isScheduled: editingTask ? editingTask.isScheduled : false
        };
        onSave(taskToSave);
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 lg:p-12 pointer-events-none">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 pointer-events-auto" onClick={onClose}></div>
            <div className="relative w-full max-w-4xl bg-slate-900 border border-emerald-500/20 rounded-[3rem] shadow-[0_0_80px_rgba(16,185,129,0.15)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 pointer-events-auto max-h-[90vh]">
                <div className="p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-widest">{editingTask ? 'Modifier Tâche Map' : 'Nouvelle Tâche Map'}</h3>
                            <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-widest italic">Coordonnées Géographiques & Logistique</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-all text-slate-500 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 overflow-y-auto custom-scrollbar flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Section 1: Identification */}
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <Info size={12} className="text-emerald-500" /> Identification de la Tâche
                            </h4>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Libellé de la Tâche (Global Tasks)</label>
                                    <input
                                        required
                                        name="GLOBAL TASKS"
                                        value={formData['GLOBAL TASKS'] as string}
                                        onChange={handleChange}
                                        className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner"
                                        placeholder="Ex: NETTOYAGE GOULOTTE..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">OT</label>
                                        <input
                                            name="OT"
                                            value={formData.OT as string}
                                            onChange={handleChange}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">AVIS</label>
                                        <input
                                            name="AVIS"
                                            value={formData.AVIS as string}
                                            onChange={handleChange}
                                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500/50"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <CreatableSearchableSelect
                                        label="Discipline"
                                        name="DISCIPLINE"
                                        value={formData.DISCIPLINE as string}
                                        onChange={handleSelectChange}
                                        options={options.disciplines}
                                    />
                                    <CreatableSearchableSelect
                                        label="Zone"
                                        name="ZONE"
                                        value={formData.ZONE as string}
                                        onChange={handleSelectChange}
                                        options={options.zones}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Géolocalisation */}
                        <div className="space-y-6">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <MapPin size={12} className="text-emerald-500" /> Géolocalisation
                            </h4>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 text-emerald-400">Latitude</label>
                                        <input
                                            required
                                            name="Latitude"
                                            type="text"
                                            value={formData.Latitude as string}
                                            onChange={handleChange}
                                            className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner"
                                            placeholder="Ex: 31.7917"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 text-emerald-400">Longitude</label>
                                        <input
                                            required
                                            name="Longitude"
                                            type="text"
                                            value={formData.Longitude as string}
                                            onChange={handleChange}
                                            className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-emerald-500/50 transition-all shadow-inner"
                                            placeholder="Ex: -7.0926"
                                        />
                                    </div>
                                </div>

                                <CreatableSearchableSelect
                                    label="Nom Équipement"
                                    name="Nom Equipement"
                                    value={formData['Nom Equipement'] as string}
                                    onChange={handleSelectChange}
                                    options={options.equipment}
                                />

                                <CreatableSearchableSelect
                                    label="Company"
                                    name="COMPANY"
                                    value={formData.COMPANY as string}
                                    onChange={handleSelectChange}
                                    options={options.companies}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-12 bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/20">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <Info className="text-emerald-400" size={20} />
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed italic">
                            Ces coordonnées seront immédiatement synchronisées avec le module <strong>Live Map & QR Navigation</strong>. Assurez-vous de la précision des points GPS pour garantir une navigation terrain efficace.
                        </p>
                    </div>
                </form>

                <div className="p-8 bg-slate-950/50 border-t border-white/5 flex gap-4">
                    <button onClick={onClose} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl border border-white/5 transition-all active:scale-95 leading-none">Annuler</button>
                    <button onClick={handleSubmit} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase tracking-widest py-4 rounded-2xl transition-all shadow-xl shadow-emerald-900/40 border border-emerald-400/30 active:scale-95 leading-none flex items-center justify-center gap-3">
                        <Save size={16} />
                        <span>Enregistrer la Tâche Map</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
