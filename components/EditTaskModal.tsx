import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { SchedulingTaskData, CostHubEntry } from '../types';
import { Activity, XCircle, CheckCircle, ShieldCheck } from 'lucide-react';

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
            option.toLowerCase().includes(value.toLowerCase())
        );
    }, [options, value]);

    const handleSelectOption = (option: string) => {
        onChange(name, option);
        setShowOptions(false);
    };

    return (
        <div ref={wrapperRef} className={`relative group ${className}`}>
            <label htmlFor={name} className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1 group-focus-within:text-blue-400 transition-colors">
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
                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-sm shadow-inner"
                    autoComplete="off"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" /></svg>
                </div>
            </div>
            {showOptions && (
                <div className="absolute top-full mt-2 w-full bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-[80] max-h-48 overflow-y-auto custom-scrollbar backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map(option => (
                            <div
                                key={option}
                                onClick={() => handleSelectOption(option)}
                                className="px-4 py-2.5 hover:bg-white/5 cursor-pointer text-slate-300 hover:text-white text-sm transition-colors border-b border-white/5 last:border-0"
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

interface EditTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedTasks: SchedulingTaskData[]) => void;
    task: SchedulingTaskData | null;
    allTasks: SchedulingTaskData[];
    costHubEntries?: CostHubEntry[];
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({ isOpen, onClose, onSave, task, allTasks, costHubEntries }) => {
    const [formData, setFormData] = useState<Partial<SchedulingTaskData>>({});
    const [mode, setMode] = useState<'single' | 'multi'>('single');
    const [multiDisciplineData, setMultiDisciplineData] = useState<{ id: string; discipline: string; effectif: number }[]>([]);

    useEffect(() => {
        if (task) {
            setFormData({ ...task });
            // If the task is already part of a multi-discipline group, start in single mode
            // (editing individual tasks of a group is handled one by one)
            setMode('single');
            setMultiDisciplineData([]);
        }
    }, [task]);

    // Auto-fill logic for Cost Hub fields
    useEffect(() => {
        const company = String(formData['COMPANY'] || '').trim().toUpperCase();
        const posteNum = String(formData['POSTE NUMBER'] || '').trim();

        if (!posteNum) {
            // Clear description when Poste Number is deleted
            setFormData(prev => ({ ...prev, 'POSTE DESCRIPTION': '' }));
            return;
        }

        if (company && posteNum && costHubEntries) {
            const match = costHubEntries.find(c =>
                c.company.toUpperCase() === company &&
                String(c.posteNumber) === posteNum
            );
            setFormData(prev => ({
                ...prev,
                'POSTE DESCRIPTION': match ? match.posteDescription : '',
                'COST_TYPE': match ? (match.costType || 'QT') : prev['COST_TYPE'],
                'Price U': match ? (match.priceU || 0) : prev['Price U']
            }));
        }
    }, [formData['COMPANY'], formData['POSTE NUMBER'], costHubEntries]);

    const { families, disciplines, equipments, companies, zones } = useMemo(() => ({
        families: [...new Set(allTasks.map(t => t.FAMILLE).filter(Boolean))].sort(),
        disciplines: [...new Set(allTasks.map(t => t.DISCIPLINE).filter(Boolean))].sort(),
        equipments: [...new Set(allTasks.map(t => t['Nom Equipement']).filter(Boolean))].sort(),
        companies: [...new Set(allTasks.map(t => t.COMPANY).filter(Boolean))].sort(),
        zones: [...new Set(allTasks.map(t => t.ZONE).filter(Boolean))].sort(),
    }), [allTasks]);

    if (!isOpen || !task) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let processedValue: string | number = value;

        const numericSelects = [
            'DUREE', 'EFFECTIF', 'Heures-Homme', 'QT', 'Additional Cost', 'COMMENTAIRE HSE',
            'MO Required', 'MO Readiness', 'ADRPT Required', 'ADRPT Readiness'
        ];

        if (type === 'number' || numericSelects.includes(name)) {
            processedValue = Number(value);
            if (isNaN(processedValue as number)) processedValue = 0;
        }

        setFormData(prev => {
            const newData = {
                ...prev,
                [name]: processedValue,
            };

            if (name === 'DUREE' || name === 'EFFECTIF') {
                const duration = name === 'DUREE' ? (processedValue as number) : (prev.DUREE || 0);
                const manpower = name === 'EFFECTIF' ? (processedValue as number) : (prev.EFFECTIF || 0);
                newData['Heures-Homme'] = parseFloat((duration * manpower).toFixed(2));
            }

            return newData;
        });
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (mode === 'single') {
            onSave([formData as SchedulingTaskData]);
        } else {
            // Multi-discipline mode: update current task + create new sub-tasks
            if (multiDisciplineData.length === 0 || multiDisciplineData.some(d => !d.discipline)) {
                return; // Validation: all disciplines must be filled
            }
            const multiDisciplineId = (formData as any).multiDisciplineId || crypto.randomUUID();
            const updatedTasks: SchedulingTaskData[] = multiDisciplineData.map((item, idx) => ({
                ...(formData as SchedulingTaskData),
                id: idx === 0 ? (formData.id as number) : -1, // Keep original id for first, -1 for new ones
                DISCIPLINE: item.discipline,
                EFFECTIF: item.effectif,
                'Heures-Homme': parseFloat(((formData.DUREE || 0) * item.effectif).toFixed(2)),
                multiDisciplineId,
            }));
            onSave(updatedTasks);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center z-[70] p-4 animate-in fade-in duration-300 overflow-y-auto">
            <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-4xl border border-white/10 my-auto animate-in zoom-in-95 duration-500 flex flex-col max-h-[95vh]">
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-600 via-cyan-400 to-emerald-500 shrink-0"></div>

                <header className="flex justify-between items-center p-8 pb-4 shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight uppercase">Modifier la Tâche</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 shrink-0">Standardisation Master Data Center</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all active:scale-95 group">
                        <XCircle className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                    </button>
                </header>

                <form id="edit-task-form" onSubmit={handleSubmit} className="p-8 pt-4 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
                    {/* SECTION: IDENTIFICATION */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="px-3 py-1 bg-slate-800 rounded-lg border border-white/10 text-[10px] font-black text-slate-500 tabular-nums">
                                TASK ID #{formData.id}
                            </div>
                            <div className="h-px grow bg-white/5"></div>
                        </div>

                        <div className="group">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Action</label>
                            <textarea
                                name="GLOBAL TASKS"
                                value={formData['GLOBAL TASKS'] || ''}
                                onChange={handleChange}
                                required
                                rows={3}
                                className="w-full bg-slate-800/50 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all text-sm shadow-inner resize-none font-bold"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <CreatableSearchableSelect label="Équipement" name="Nom Equipement" value={formData['Nom Equipement'] || ''} onChange={handleSelectChange} options={equipments} />
                            <CreatableSearchableSelect label="Famille" name="FAMILLE" value={formData['FAMILLE'] || ''} onChange={handleSelectChange} options={families} />
                            <CreatableSearchableSelect label="Zone" name="ZONE" value={formData['ZONE'] || ''} onChange={handleSelectChange} options={zones} />
                        </div>
                    </div>

                    {/* SECTION: TECHNICAL PARAMS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white/5 p-8 rounded-[2rem] border border-white/5 shadow-xl">
                        <div className="space-y-6">
                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Type de Maintenance</label>
                                <select name="Type de Maintenance" value={formData['Type de Maintenance']} onChange={handleChange} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none cursor-pointer">
                                    <option value="PREVENTIVE">PREVENTIVE</option>
                                    <option value="CORRECTIVE">CORRECTIVE</option>
                                    <option value="AMELIORATIVE">AMELIORATIVE</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="group">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Durée (Hrs)</label>
                                    <input type="number" step="0.1" name="DUREE" value={formData['DUREE']} onChange={handleChange} required className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white outline-none font-mono" />
                                </div>
                                <div className="group">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Effectif</label>
                                    <input type="number" name="EFFECTIF" value={formData['EFFECTIF']} onChange={handleChange} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Unique / Multi toggle — same as AddTaskModal */}
                            <div className="bg-slate-950/60 p-1.5 rounded-2xl flex gap-1.5 border border-white/5 shadow-inner">
                                <button type="button" onClick={() => setMode('single')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'single' ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}>Unique</button>
                                <button type="button" onClick={() => { setMode('multi'); if (multiDisciplineData.length === 0) setMultiDisciplineData([{ id: crypto.randomUUID(), discipline: formData['DISCIPLINE'] || '', effectif: formData['EFFECTIF'] as number || 1 }]); }} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'multi' ? 'bg-emerald-500 text-white' : 'text-slate-500'}`}>Multi</button>
                            </div>

                            {mode === 'single' ? (
                                <CreatableSearchableSelect label="Discipline" name="DISCIPLINE" value={formData['DISCIPLINE'] || ''} onChange={handleSelectChange} options={disciplines} />
                            ) : (
                                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                                    {multiDisciplineData.map((item, idx) => (
                                        <div key={item.id} className="grid grid-cols-[1fr_70px_auto] gap-2 items-end">
                                            <CreatableSearchableSelect label={`Disc. ${idx + 1}`} name={`disc-${item.id}`} value={item.discipline} onChange={(_, v) => setMultiDisciplineData(prev => prev.map(d => d.id === item.id ? { ...d, discipline: v } : d))} options={disciplines} />
                                            <input type="number" value={item.effectif} onChange={e => setMultiDisciplineData(prev => prev.map(d => d.id === item.id ? { ...d, effectif: parseInt(e.target.value) || 1 } : d))} className="bg-slate-900 border border-white/10 rounded-xl px-2 py-2 text-white text-xs font-mono" />
                                            <button type="button" onClick={() => setMultiDisciplineData(prev => prev.filter(d => d.id !== item.id))} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><XCircle size={14} /></button>
                                        </div>
                                    ))}
                                    <button type="button" onClick={() => setMultiDisciplineData(prev => [...prev, { id: crypto.randomUUID(), discipline: '', effectif: 1 }])} className="w-full py-2 border border-dashed border-white/10 text-slate-500 hover:text-white text-[10px] uppercase font-black">+ Ajouter</button>
                                </div>
                            )}

                            <div className="group">
                                <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 ml-1">Charge Totale (H-H)</label>
                                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-emerald-400 font-black text-sm font-mono">
                                    {mode === 'single'
                                        ? `${formData['Heures-Homme'] || 0} H-H`
                                        : `${multiDisciplineData.reduce((sum, d) => sum + (formData.DUREE || 0) * d.effectif, 0).toFixed(2)} H-H`
                                    }
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: ADMIN & HSE */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-slate-950/40 p-6 rounded-[2rem] border border-white/5 shadow-inner space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Numéro AVIS</label>
                                    <input type="text" name="AVIS" value={formData['AVIS']} onChange={handleChange} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-white font-mono" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Numéro OT</label>
                                    <input type="text" name="OT" value={formData['OT']} onChange={handleChange} className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2 text-white font-mono" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_red]"></div>
                                    Risque Élevé (HSE)
                                </label>
                                <select name="COMMENTAIRE HSE" value={formData['COMMENTAIRE HSE']} onChange={handleChange} className={`w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm ${formData['COMMENTAIRE HSE'] === 1 ? 'text-red-400 font-bold border-red-500/30' : 'text-white'}`}>
                                    <option value="0">NON</option>
                                    <option value="1">OUI</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: BUDGET & COST CONTROL */}
                    <div className="bg-slate-950/60 p-8 rounded-[2.5rem] border border-white/5 relative group">
                        <div className="flex items-center gap-4 mb-8">
                            <Activity className="w-5 h-5 text-emerald-400" />
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Contrôle des Coûts</h3>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">Poste Budgétaire & Tarification company</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <CreatableSearchableSelect label="Entreprise (COMPANY)" name="COMPANY" value={formData['COMPANY'] || ''} onChange={handleSelectChange} options={companies} />
                                <div className="group">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Poste Number</label>
                                    <input type="text" name="POSTE NUMBER" value={formData['POSTE NUMBER']} onChange={handleChange} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono" placeholder="Ex: 12345..." />
                                </div>
                                <div className="group">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Quantité (QT)</label>
                                    <input type="number" name="QT" value={formData['QT']} onChange={handleChange} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono" />
                                </div>
                                <div className="group">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Additional Cost (€)</label>
                                    <input type="number" name="Additional Cost" value={formData['Additional Cost']} onChange={handleChange} className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white font-mono" />
                                </div>
                            </div>

                            <div className="group pt-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Poste Description (Auto)</label>
                                <div className="bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-blue-400 font-bold text-xs min-h-[56px] flex items-start shadow-inner leading-relaxed">
                                    {formData['POSTE DESCRIPTION'] || 'Poste non configuré'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: PERMIS & HSE (Simplified) */}
                    <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative group">
                        <div className="flex items-center gap-4 mb-8">
                            <ShieldCheck className="w-5 h-5 text-emerald-400 transition-transform group-hover:scale-110" />
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-wider">Permis & HSE</h3>
                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1 leading-none">Conformité et Procédures</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-slate-950/40 p-6 rounded-[2rem] border border-white/5 transition-all hover:border-blue-500/20">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">Mode Opératoire (MO)</label>
                                    <div className={`w-2 h-2 rounded-full ${formData['MO Required'] === 1 ? 'bg-blue-400 animate-pulse' : 'bg-slate-700'}`}></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[8px] text-slate-500 uppercase font-black mb-1.5 ml-1">Requirement</label>
                                        <select name="MO Required" value={formData['MO Required']} onChange={handleChange} className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-[10px] font-black text-white cursor-pointer hover:bg-slate-800 transition-colors">
                                            <option value="0">NON REQUIS</option>
                                            <option value="1">REQUIS</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[8px] text-slate-500 uppercase font-black mb-1.5 ml-1">Readiness</label>
                                        <select name="MO Readiness" value={formData['MO Readiness']} onChange={handleChange} disabled={formData['MO Required'] === 0} className={`w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-[10px] font-black cursor-pointer hover:bg-slate-800 transition-colors ${formData['MO Readiness'] === 1 ? 'text-emerald-400' : 'text-amber-500'} disabled:opacity-30 disabled:grayscale`}>
                                            <option value="0">EN ATTENTE</option>
                                            <option value="1">VALIDÉ (PRÊT)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-950/40 p-6 rounded-[2rem] border border-white/5 transition-all hover:border-emerald-500/20">
                                <div className="flex items-center justify-between mb-4">
                                    <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">ADRPT</label>
                                    <div className={`w-2 h-2 rounded-full ${formData['ADRPT Required'] === 1 ? 'bg-emerald-400 animate-pulse' : 'bg-slate-700'}`}></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[8px] text-slate-500 uppercase font-black mb-1.5 ml-1">Requirement</label>
                                        <select name="ADRPT Required" value={formData['ADRPT Required']} onChange={handleChange} className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-[10px] font-black text-white cursor-pointer hover:bg-slate-800 transition-colors">
                                            <option value="0">NON REQUIS</option>
                                            <option value="1">REQUIS</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[8px] text-slate-500 uppercase font-black mb-1.5 ml-1">Readiness</label>
                                        <select name="ADRPT Readiness" value={formData['ADRPT Readiness']} onChange={handleChange} disabled={formData['ADRPT Required'] === 0} className={`w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-[10px] font-black cursor-pointer hover:bg-slate-800 transition-colors ${formData['ADRPT Readiness'] === 1 ? 'text-emerald-400' : 'text-amber-500'} disabled:opacity-30 disabled:grayscale`}>
                                            <option value="0">EN ATTENTE</option>
                                            <option value="1">VALIDÉ (PRÊT)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                <footer className="p-8 pt-4 flex justify-end gap-4 bg-slate-900/80 border-t border-white/5 backdrop-blur-md shrink-0">
                    <button onClick={onClose} className="px-8 py-3 rounded-2xl bg-white/5 text-slate-400 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all">Annuler</button>
                    <button form="edit-task-form" type="submit" className="px-10 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-400 text-white font-black text-[10px] uppercase tracking-widest shadow-xl transition-all hover:scale-[1.02] flex items-center gap-2">
                        <span>Mettre à Jour</span>
                        <CheckCircle size={14} />
                    </button>
                </footer>
            </div>
        </div>
    );
};