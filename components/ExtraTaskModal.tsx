import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Calendar, HardHat, Wrench, Factory, FileText, Tag, Banknote, Briefcase } from 'lucide-react';
import { SchedulingTaskData, CostHubEntry } from '../types';
import { MultiSelectDropdown } from './MultiSelectDropdown';

interface ExtraTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: Partial<SchedulingTaskData>) => void;
    costHubEntries: CostHubEntry[];
    existingTasks: any[];
    initialTask?: any;        // When provided, the modal is in edit mode
    defaultStartDate?: string; // ISO string — pre-fills date for new tasks (shutdown start)
    defaultEndDate?: string;   // ISO string — pre-fills date for new tasks (shutdown end)
}

export const ExtraTaskModal: React.FC<ExtraTaskModalProps> = ({
    isOpen, onClose, onSave, costHubEntries, existingTasks, initialTask,
    defaultStartDate, defaultEndDate
}) => {
    // Basic Task Details
    const [action, setAction] = useState('');
    const [equipement, setEquipement] = useState('');
    const [famille, setFamille] = useState('');
    const [zone, setZone] = useState('');
    const [disciplines, setDisciplines] = useState<string[]>([]);
    const [effectifMap, setEffectifMap] = useState<Record<string, number>>({});
    const [avis, setAvis] = useState('');
    const [ot, setOt] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Dynamic Lists for Autocomplete
    const equipments = useMemo(() => [...new Set(existingTasks.map(t => t['Nom Equipement'] || t.equipment).filter(Boolean))].sort(), [existingTasks]);
    const families = useMemo(() => [...new Set(existingTasks.map(t => t.FAMILLE || t.family).filter(Boolean))].sort(), [existingTasks]);
    const allZones = useMemo(() => [...new Set(existingTasks.map(t => t.ZONE).filter(Boolean))].sort(), [existingTasks]);
    const allDisciplines = useMemo(() => {
        const rawDisciplines = existingTasks.flatMap(t => {
            const d = t.DISCIPLINE || t.discipline;
            if (!d) return [];
            return d.split(',').map((s: string) => s.trim());
        });
        return [...new Set(rawDisciplines.filter(Boolean))].sort();
    }, [existingTasks]);
    const companies = useMemo(() => [...new Set(costHubEntries.map(c => c.company).filter(Boolean))].sort(), [costHubEntries]);

    // Subcontractors Array
    const [subcontractors, setSubcontractors] = useState<any[]>([{
        id: Math.random().toString(36).substr(2, 9),
        company: '',
        discipline: '',
        posteNumber: '',
        costType: 'HH',
        qty: 0,
        additionalCost: 0,
        totalPrice: 0,
        posteDescription: ''
    }]);

    // Pre-fill form when editing an existing task, or reset with defaults for new task
    useEffect(() => {
        if (isOpen && initialTask) {
            // ── EDIT MODE ──
            setAction(initialTask.action || '');
            setEquipement(initialTask.equipment || '');
            setFamille(initialTask.famille || '');
            setZone(initialTask.zone || '');
            setAvis(initialTask.avis || '');
            setOt(initialTask.ot || '');
            if (initialTask.startDate) setStartDate(new Date(initialTask.startDate).toISOString().slice(0, 16));
            if (initialTask.endDate) setEndDate(new Date(initialTask.endDate).toISOString().slice(0, 16));

            // Disciplines: the teamDetails[0].team field may be a single combined string
            // like "Electricien, Exploitant, Graisseur" — split it back into individual items
            const rawTeam = initialTask.teamDetails?.[0]?.team || '';
            const splitDisciplines = rawTeam
                ? rawTeam.split(',').map((s: string) => s.trim()).filter(Boolean)
                : [];
            setDisciplines(splitDisciplines);

            // Build effectifMap: each discipline gets manpower of the parent teamDetail
            const manpower = initialTask.teamDetails?.[0]?.manpower || 1;
            const em: Record<string, number> = {};
            if (splitDisciplines.length > 0) {
                splitDisciplines.forEach((d: string) => { em[d] = manpower; });
            } else {
                em['Default'] = manpower;
            }
            setEffectifMap(em);

            // Restore subcontractors
            if (Array.isArray(initialTask.subcontractors) && initialTask.subcontractors.length > 0) {
                setSubcontractors(initialTask.subcontractors);
            } else {
                setSubcontractors([{ id: Math.random().toString(36).substr(2, 9), company: '', discipline: '', posteNumber: '', costType: 'HH', qty: 0, additionalCost: 0, totalPrice: 0, posteDescription: '' }]);
            }
        } else if (isOpen && !initialTask) {
            // ── CREATE MODE — use shutdown period dates as defaults ──
            setAction(''); setEquipement(''); setFamille(''); setZone('');
            setAvis(''); setOt('');
            // Default dates to shutdown period so new tasks are always inside the filter window
            setStartDate(defaultStartDate ? new Date(defaultStartDate).toISOString().slice(0, 16) : '');
            setEndDate(defaultEndDate ? new Date(defaultEndDate).toISOString().slice(0, 16) : '');
            setDisciplines([]); setEffectifMap({});
            setSubcontractors([{ id: Math.random().toString(36).substr(2, 9), company: '', discipline: '', posteNumber: '', costType: 'HH', qty: 0, additionalCost: 0, totalPrice: 0, posteDescription: '' }]);
        }
    }, [isOpen, initialTask, defaultStartDate, defaultEndDate]);

    // Auto-calculate exact duration based on dates (rounded to 2 decimal places)
    const duration = useMemo(() => {
        if (!startDate || !endDate) return 0;
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffMs = end.getTime() - start.getTime();
        const hrs = diffMs / (1000 * 60 * 60);
        return Math.max(0, Math.round(hrs * 100) / 100);
    }, [startDate, endDate]);

    const hhPerDiscipline = useMemo(() => {
        const result: Record<string, number> = {};
        if (disciplines.length === 0) {
            result['Default'] = duration * (effectifMap['Default'] || 1);
        } else {
            disciplines.forEach(d => {
                result[d] = duration * (effectifMap[d] || 1);
            });
        }
        return result;
    }, [duration, disciplines, effectifMap]);

    const totalEffectif = useMemo(() => {
        if (disciplines.length === 0) return effectifMap['Default'] || 1;
        return disciplines.reduce((sum, d) => sum + (effectifMap[d] || 1), 0);
    }, [disciplines, effectifMap]);

    const totalHH = useMemo(() => {
        return Object.values(hhPerDiscipline).reduce((sum, val) => sum + val, 0);
    }, [hhPerDiscipline]);

    // Keep HH quantities in sync with totalHH for subcontractors
    useEffect(() => {
        setSubcontractors(prev => prev.map(sub => {
            if (sub.costType === 'HH') {
                const targetHH = sub.discipline && disciplines.includes(sub.discipline) ? (hhPerDiscipline[sub.discipline] || 0) : totalHH;
                if (sub.qty !== targetHH) {
                    const match = costHubEntries.find(c => 
                        c.company.toUpperCase() === sub.company.toUpperCase() && 
                        String(c.posteNumber) === String(sub.posteNumber)
                    );
                    return { 
                        ...sub, 
                        qty: targetHH, 
                        totalPrice: (targetHH * (match?.priceU || 0)) + sub.additionalCost 
                    };
                }
            }
            return sub;
        }));
    }, [hhPerDiscipline, totalHH, costHubEntries, disciplines]);

    const handleSubcontractorChange = (id: string, field: string, value: any) => {
        setSubcontractors(prev => prev.map(sub => {
            if (sub.id !== id) return sub;

            const updatedSub = { ...sub, [field]: value };
            
            // Auto-fill logic from Cost Hub
            if (field === 'company') {
                const companyEntries = costHubEntries.filter(c => c.company.toUpperCase() === updatedSub.company.toUpperCase());
                if (companyEntries.length > 0) {
                    const hasQT = companyEntries.some(c => c.costType === 'QT' || c.costType === 'POSTE NUMBERS');
                    updatedSub.costType = hasQT ? 'QT' : 'HH';
                } else {
                    updatedSub.costType = 'HH';
                }
            }

            if (field === 'company' || field === 'posteNumber' || field === 'discipline') {
                const match = costHubEntries.find(c => 
                    c.company.toUpperCase() === updatedSub.company.toUpperCase() && 
                    String(c.posteNumber) === String(updatedSub.posteNumber)
                );
                
                const targetHH = updatedSub.discipline && hhPerDiscipline[updatedSub.discipline] !== undefined ? hhPerDiscipline[updatedSub.discipline] : totalHH;
                
                if (match) {
                    updatedSub.posteDescription = match.posteDescription;
                    updatedSub.costType = match.costType === 'HH' || match.costType === 'QT' || match.costType === 'POSTE NUMBERS' ? (match.costType === 'HH' ? 'HH' : 'QT') : updatedSub.costType;
                    updatedSub.qty = updatedSub.costType === 'HH' ? targetHH : updatedSub.qty;
                    updatedSub.priceU = match.priceU || 0;
                    updatedSub.totalPrice = (updatedSub.qty * (updatedSub.priceU || 0)) + updatedSub.additionalCost;
                } else {
                    updatedSub.posteDescription = '';
                    updatedSub.qty = updatedSub.costType === 'HH' ? targetHH : updatedSub.qty;
                    updatedSub.priceU = 0;
                    updatedSub.totalPrice = updatedSub.additionalCost;
                }
            } else if (field === 'qty' || field === 'additionalCost') {
                updatedSub.totalPrice = (updatedSub.qty * (updatedSub.priceU || 0)) + updatedSub.additionalCost;
            }

            return updatedSub;
        }));
    };

    const addSubcontractor = () => {
        setSubcontractors(prev => [...prev, {
            id: Math.random().toString(36).substr(2, 9),
            company: '',
            posteNumber: '',
            costType: 'HH',
            qty: 0,
            priceU: 0,
            additionalCost: 0,
            totalPrice: 0,
            posteDescription: ''
        }]);
    };

    const removeSubcontractor = (id: string) => {
        if (subcontractors.length > 1) {
            setSubcontractors(prev => prev.filter(s => s.id !== id));
        }
    };

    const handleSave = () => {
        const newTask: Partial<SchedulingTaskData> = {
            id: initialTask?.id || Date.now(),
            "GLOBAL TASKS": action,
            "Nom Equipement": equipement,
            FAMILLE: famille,
            DISCIPLINE: disciplines.join(', '),
            ZONE: zone,
            AVIS: avis,
            OT: ot,
            DUREE: duration,
            "START DATE": startDate ? new Date(startDate) : null,
            "END DATE": endDate ? new Date(endDate) : null,
            "Heures-Homme": totalHH,
            QT: 0,
            EFFECTIF: totalEffectif,
            isExtraTask: true,
            isLeadTaskForOT: true,
            subcontractors: subcontractors
        };
        onSave(newTask);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[150] p-4 font-sans overflow-y-auto">
            <div 
                className="bg-slate-950 border border-red-500/20 rounded-3xl w-full max-w-5xl shadow-2xl shadow-red-900/20 flex flex-col my-8 relative overflow-hidden"
            >
                    {/* Glowing Accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-fuchsia-600 via-pink-500 to-orange-500"></div>

                    {/* Header */}
                    <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-fuchsia-950/20">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
                                <Plus className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">Travail Supplémentaire</h2>
                                <p className="text-slate-400 text-sm mt-1">Ajouter une tâche hors-planning et évaluer son impact financier.</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-gradient-to-b from-transparent to-slate-900/50 space-y-8 max-h-[70vh]">
                        
                        {/* Section 1: Informations Générales */}
                        <section className="space-y-6">
                            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                                <FileText className="w-5 h-5 text-fuchsia-400" />
                                <h3 className="text-sm font-black text-white uppercase tracking-widest">Informations Générales</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-2 lg:col-span-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Action (Description)</label>
                                    <input type="text" value={action} onChange={e => setAction(e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-fuchsia-500/50 outline-none" placeholder="Description du travail supplémentaire..." />
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Équipement</label>
                                    <input type="text" list="extra-eq" value={equipement} onChange={e => setEquipement(e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" placeholder="Sélectionner ou saisir..." />
                                    <datalist id="extra-eq">{equipments.map(e => <option key={e} value={e} />)}</datalist>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Famille</label>
                                    <input type="text" list="extra-fam" value={famille} onChange={e => setFamille(e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" placeholder="Sélectionner ou saisir..." />
                                    <datalist id="extra-fam">{families.map(f => <option key={f} value={f} />)}</datalist>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Zone</label>
                                    <input type="text" list="extra-zone" value={zone} onChange={e => setZone(e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" placeholder="Sélectionner ou saisir..." />
                                    <datalist id="extra-zone">{allZones.map(z => <option key={z} value={z} />)}</datalist>
                                </div>
                                
                                <div className="space-y-2 relative">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Discipline(s)</label>
                                    <MultiSelectDropdown options={allDisciplines} selected={disciplines} onChange={setDisciplines} placeholder="Sélectionner les disciplines..." />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">OT</label>
                                    <input type="text" value={ot} onChange={e => setOt(e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm font-mono text-fuchsia-400" placeholder="N° OT..." />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">AVIS</label>
                                    <input type="text" value={avis} onChange={e => setAvis(e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm font-mono" placeholder="N° AVIS..." />
                                </div>

                                <div className="space-y-4 lg:col-span-3 border-t border-white/5 pt-4">
                                    <div className="flex flex-col md:flex-row gap-4">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Date Début</label>
                                            <input type="datetime-local" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-4 text-white text-sm" />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Date Fin</label>
                                            <input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-4 text-white text-sm" />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block mb-3">Effectifs par Discipline</label>
                                        <div className="space-y-3">
                                            {disciplines.length === 0 ? (
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs font-bold text-slate-400 w-32">Par défaut</span>
                                                    <input type="number" min="1" value={effectifMap['Default'] || 1} onChange={e => setEffectifMap(prev => ({...prev, 'Default': parseInt(e.target.value) || 1}))} className="w-24 bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm text-center" />
                                                    <span className="text-xs font-bold text-fuchsia-400">{hhPerDiscipline['Default'] || 0} HH</span>
                                                </div>
                                            ) : (
                                                disciplines.map(d => (
                                                    <div key={d} className="flex items-center gap-4">
                                                        <span className="text-xs font-bold text-white w-32 truncate" title={d}>{d}</span>
                                                        <input type="number" min="1" value={effectifMap[d] || 1} onChange={e => setEffectifMap(prev => ({...prev, [d]: parseInt(e.target.value) || 1}))} className="w-24 bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2 text-white text-sm text-center" />
                                                        <span className="text-xs font-bold text-fuchsia-400">{hhPerDiscipline[d] || 0} HH</span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                        <div className="pt-3 mt-3 border-t border-white/5 flex items-center gap-4">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest w-32">Total</span>
                                            <div className="w-24 bg-white/5 rounded-xl px-3 py-2 text-white font-bold text-sm text-center border border-white/10">{totalEffectif}</div>
                                            <span className="text-sm font-black text-fuchsia-400">{totalHH} HH</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Section 2: Coûts */}
                        <section className="space-y-6 pt-4">
                            <div className="flex items-center justify-between border-b border-white/10 pb-2">
                                <div className="flex items-center gap-2">
                                    <Banknote className="w-5 h-5 text-emerald-400" />
                                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Contrôle des Coûts (Intervenants)</h3>
                                </div>
                                <button onClick={addSubcontractor} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-black uppercase transition-colors">
                                    <Plus className="w-4 h-4" /> Ajouter Entreprise
                                </button>
                            </div>

                            <div className="space-y-4">
                                {subcontractors.map((sub, index) => (
                                    <div 
                                        key={sub.id}
                                        className="bg-slate-900/40 border border-red-500/10 rounded-2xl p-5 relative overflow-hidden"
                                    >
                                            <div className="absolute top-0 left-0 bottom-0 w-1 bg-emerald-500/20"></div>
                                            <div className="flex justify-between items-start mb-4">
                                                <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest ml-2">Intervenant #{index + 1}</h4>
                                                {subcontractors.length > 1 && (
                                                    <button onClick={() => removeSubcontractor(sub.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-4">
                                                <div className="space-y-2 xl:col-span-1">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Entreprise</label>
                                                    <input type="text" list="extra-companies" value={sub.company} onChange={e => handleSubcontractorChange(sub.id, 'company', e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-xs" placeholder="Company..." />
                                                    <datalist id="extra-companies">{companies.map(c => <option key={c} value={c} />)}</datalist>
                                                </div>

                                                <div className="space-y-2 xl:col-span-1">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Discipline</label>
                                                    <select value={sub.discipline} onChange={e => handleSubcontractorChange(sub.id, 'discipline', e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-xs">
                                                        <option value="">(Toutes / Total)</option>
                                                        {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
                                                    </select>
                                                </div>
                                                
                                                <div className="space-y-2 xl:col-span-1">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Poste Number</label>
                                                    <input type="text" value={sub.posteNumber} onChange={e => handleSubcontractorChange(sub.id, 'posteNumber', e.target.value)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-xs" placeholder="N°..." />
                                                </div>

                                                <div className="space-y-2 xl:col-span-1">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantité / Heures</label>
                                                    <div className="flex gap-2">
                                                        <input type="number" value={sub.qty} onChange={e => handleSubcontractorChange(sub.id, 'qty', parseFloat(e.target.value) || 0)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-xs" />
                                                        <div className="bg-black/40 border border-white/5 rounded-xl px-3 py-3 text-[10px] font-bold text-slate-400 flex items-center justify-center">
                                                            {sub.costType}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 xl:col-span-1">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Prix Unitaire</label>
                                                    <div className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-slate-400 font-bold text-xs tabular-nums truncate">
                                                        {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(sub.priceU || 0)}
                                                    </div>
                                                </div>

                                                <div className="space-y-2 xl:col-span-1">
                                                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Add. Cost (MAD)</label>
                                                    <input type="number" value={sub.additionalCost} onChange={e => handleSubcontractorChange(sub.id, 'additionalCost', parseFloat(e.target.value) || 0)} className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-white text-xs" />
                                                </div>

                                                <div className="space-y-2 xl:col-span-1">
                                                    <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest ml-1">Total (Auto)</label>
                                                    <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-emerald-400 font-black text-xs tabular-nums truncate">
                                                        {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(sub.totalPrice)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-3 bg-black/20 rounded-lg p-3 border border-white/5">
                                                <p className="text-[10px] text-slate-400 font-mono">
                                                    <span className="font-black text-red-500 mr-2">AUTO DESC:</span> 
                                                    {sub.posteDescription || 'Poste non configuré...'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </section>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-white/5 bg-slate-900/50 flex justify-between items-center">
                        <div className="text-xs text-slate-400">
                            Durée calculée: <span className="font-black text-white">{duration}H</span>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={onClose} className="px-6 py-3 text-xs font-black text-slate-500 uppercase hover:text-white transition-colors">Annuler</button>
                            <button 
                                onClick={handleSave}
                                disabled={!action || !ot}
                                className="px-8 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-xl shadow-fuchsia-900/40 transition-all"
                            >
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
    );
};
