import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import type { SchedulingTaskData, CostHubEntry, SimopsRecord, PDRItem, ScaffoldingRecord, HandlingRecord, PermitRecord } from '../types';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: SchedulingTaskData;
    onSave: (record: any) => void;
}

interface CostModalProps extends BaseModalProps {
    costHubEntries: CostHubEntry[];
}

export const QuickAddSimopsModal: React.FC<BaseModalProps> = ({ isOpen, onClose, task, onSave }) => {
    const [newSimops, setNewSimops] = useState<Partial<SimopsRecord>>({
        OT: String(task.OT || ''),
        simopsOT: ''
    });

    if (!isOpen) return null;

    const handleSaveSimops = () => {
        onSave({
            id: Date.now().toString(),
            OT: newSimops.OT,
            simopsOT: newSimops.simopsOT,
            dateAdded: new Date().toISOString()
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[500] p-4 md:p-6 animate-in fade-in duration-300">
            <div className="bg-slate-950 border border-white/5 rounded-[2rem] md:rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center bg-orange-600/10">
                    <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Ajouter SIMOPS</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
                </div>
                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">OT</label>
                            <input type="text" value={newSimops.OT} disabled className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-slate-500 text-sm cursor-not-allowed" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">SIMOPS OT (Sibling)</label>
                            <input type="text" value={newSimops.simopsOT} onChange={e => setNewSimops({ ...newSimops, simopsOT: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-2 focus:ring-orange-500/20" placeholder="Ex: 400082..." />
                        </div>
                    </div>
                </div>
                <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/30 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Annuler</button>
                    <button onClick={handleSaveSimops} className="px-8 py-4 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-orange-900/40">Ajouter</button>
                </div>
            </div>
        </div>
    );
};

export const QuickAddPdrModal: React.FC<BaseModalProps> = ({ isOpen, onClose, task, onSave }) => {
    const [newPDR, setNewPDR] = useState<Partial<PDRItem>>({
        OT: String(task.OT || ''),
        sparePart: '',
        type: '',
        unite: '',
        qty: 0,
        priceU: 0,
        totalPrice: 0,
        readiness: 0,
        dueDate: '',
        status: 'Inventory Assets',
        comment: ''
    });

    if (!isOpen) return null;

    const handleSavePDR = () => {
        onSave({
            id: Date.now().toString(),
            ...newPDR
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[500] p-4 md:p-6 animate-in fade-in duration-300">
            <div className="bg-slate-950 border border-white/5 rounded-[2rem] md:rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center bg-amber-600/10">
                    <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Ajouter PDR (Pièce de Rechange)</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
                </div>
                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">ID / OT REF</label>
                            <input type="text" value={newPDR.OT} disabled className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-slate-500 text-sm cursor-not-allowed" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Spare Part Name</label>
                            <input type="text" value={newPDR.sparePart} onChange={e => setNewPDR({ ...newPDR, sparePart: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Type</label>
                            <input type="text" list="pdr-types" value={newPDR.type} onChange={e => setNewPDR({ ...newPDR, type: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" placeholder="Ex: Consomable, PDR..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Unité</label>
                            <input type="text" list="pdr-unites" value={newPDR.unite} onChange={e => setNewPDR({ ...newPDR, unite: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" placeholder="Ex: PSC, LTR..." />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantité (QTY)</label>
                            <input type="number" value={newPDR.qty} onChange={e => {
                                const qty = parseFloat(e.target.value) || 0;
                                setNewPDR({ ...newPDR, qty, totalPrice: qty * (newPDR.priceU || 0) });
                            }} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prix Unitaire (PRICE U)</label>
                            <input type="number" value={newPDR.priceU} onChange={e => {
                                const priceU = parseFloat(e.target.value) || 0;
                                setNewPDR({ ...newPDR, priceU, totalPrice: (newPDR.qty || 0) * priceU });
                            }} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1">Total Price (Auto)</label>
                            <div className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-blue-400 text-sm font-black tabular-nums">
                                {new Intl.NumberFormat('fr-FR').format((newPDR.qty || 0) * (newPDR.priceU || 0))} MAD
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Availability (Readiness)</label>
                            <select value={newPDR.readiness} onChange={e => setNewPDR({ ...newPDR, readiness: parseInt(e.target.value) })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase text-amber-500 tracking-widest appearance-none transition-all">
                                <option value="0">NOT IN STOCK</option>
                                <option value="1">READY / STOCK</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Due Date</label>
                            <input type="text" value={newPDR.dueDate || ''} onChange={e => setNewPDR({ ...newPDR, dueDate: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" placeholder="Ex: 12-mai-26" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Logistics Status</label>
                            <select value={newPDR.status} onChange={e => setNewPDR({ ...newPDR, status: e.target.value as any })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase text-amber-500 tracking-widest appearance-none">
                                <option value="Inventory Assets">Inventory Assets</option>
                                <option value="Active Tenders">Active Tenders</option>
                                <option value="Awaiting Process">Awaiting Process</option>
                            </select>
                        </div>
                    </div>
                    <div className="mt-6 space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Commentaire</label>
                        <textarea value={newPDR.comment || ''} onChange={e => setNewPDR({ ...newPDR, comment: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm italic h-24 resize-none" />
                    </div>
                </div>
                <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/30 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Annuler</button>
                    <button onClick={handleSavePDR} className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-amber-900/40">Sauvegarder</button>
                </div>
            </div>
        </div>
    );
};

export const QuickAddScaffoldingModal: React.FC<CostModalProps> = ({ isOpen, onClose, task, onSave, costHubEntries }) => {
    const [newScaffolding, setNewScaffolding] = useState<Partial<ScaffoldingRecord>>({
        OT: String(task.OT || ''),
        company: '',
        posteNumber: '',
        QT: 0,
        totalPrice: 0,
        readiness: 0,
        comment: '',
        posteDescription: ''
    });

    if (!isOpen) return null;

    const handleSaveScaffolding = () => {
        onSave({
            id: Date.now().toString(),
            ...newScaffolding
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[500] p-4 md:p-6 animate-in fade-in duration-300">
            <div className="bg-slate-950 border border-white/5 rounded-[2rem] md:rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center bg-indigo-600/10">
                    <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Ajouter Échafaudage</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
                </div>
                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">OT</label>
                            <input type="text" value={newScaffolding.OT} disabled className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-slate-500 text-sm cursor-not-allowed" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Company</label>
                            <input
                                type="text"
                                list="add-scaffolding-companies"
                                value={newScaffolding.company}
                                onChange={e => {
                                    const company = e.target.value;
                                    const match = costHubEntries.find(c => c.company.toUpperCase() === company.toUpperCase() && String(c.posteNumber) === String(newScaffolding.posteNumber));
                                    setNewScaffolding({
                                        ...newScaffolding,
                                        company,
                                        posteDescription: match ? match.posteDescription : newScaffolding.posteDescription,
                                        totalPrice: match ? (newScaffolding.QT || 0) * (match.priceU || 0) : newScaffolding.totalPrice
                                    });
                                }}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-2 focus:ring-indigo-500/20"
                                placeholder="Sélectionner ou saisir..."
                            />
                            <datalist id="add-scaffolding-companies">
                                {[...new Set(costHubEntries.map(c => c.company))].sort().map(co => (
                                    <option key={co} value={co} />
                                ))}
                            </datalist>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Poste Number</label>
                            <input
                                type="text"
                                value={newScaffolding.posteNumber}
                                onChange={e => {
                                    const posteNumber = e.target.value;
                                    if (!posteNumber) {
                                        setNewScaffolding({ ...newScaffolding, posteNumber: '', posteDescription: '', totalPrice: 0 });
                                    } else {
                                        const match = costHubEntries.find(c => c.company.toUpperCase() === (newScaffolding.company || '').toUpperCase() && String(c.posteNumber) === posteNumber);
                                        setNewScaffolding({
                                            ...newScaffolding,
                                            posteNumber,
                                            posteDescription: match ? match.posteDescription : newScaffolding.posteDescription,
                                            totalPrice: match ? (newScaffolding.QT || 0) * (match.priceU || 0) : newScaffolding.totalPrice
                                        });
                                    }
                                }}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-2 focus:ring-indigo-500/20"
                                placeholder="Ex: 12345..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantity (QT)</label>
                            <input
                                type="number"
                                value={newScaffolding.QT}
                                onChange={e => {
                                    const QT = parseFloat(e.target.value) || 0;
                                    const match = costHubEntries.find(c => c.company.toUpperCase() === (newScaffolding.company || '').toUpperCase() && String(c.posteNumber) === String(newScaffolding.posteNumber));
                                    setNewScaffolding({ ...newScaffolding, QT, totalPrice: match ? QT * (match.priceU || 0) : 0 });
                                }}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Price</label>
                            <div className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-indigo-400 font-black text-sm tabular-nums">
                                {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(newScaffolding.totalPrice || 0)} MAD
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Readiness</label>
                            <select value={newScaffolding.readiness} onChange={e => setNewScaffolding({ ...newScaffolding, readiness: parseInt(e.target.value) })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase text-indigo-500 tracking-widest appearance-none transition-all">
                                <option value="0">PLANIFIÉ (P)</option>
                                <option value="1">PRÊT (R)</option>
                            </select>
                        </div>
                        <div className="md:col-span-1 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Commentaire</label>
                            <input
                                type="text"
                                value={newScaffolding.comment || ''}
                                onChange={e => setNewScaffolding({ ...newScaffolding, comment: e.target.value })}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm italic"
                                placeholder="Observations..."
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <span>Poste Description</span>
                                <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-black">AUTO</span>
                            </label>
                            <div className="w-full bg-slate-900/30 border border-blue-500/10 rounded-2xl px-5 py-4 text-blue-400 text-sm font-bold min-h-[56px] leading-relaxed">
                                {newScaffolding.posteDescription || <span className="text-slate-600 italic font-normal">Entrez Company + Poste Number pour auto-remplir...</span>}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/30 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Annuler</button>
                    <button onClick={handleSaveScaffolding} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-indigo-900/40">Ajouter</button>
                </div>
            </div>
        </div>
    );
};

export const QuickAddHandlingModal: React.FC<CostModalProps> = ({ isOpen, onClose, task, onSave, costHubEntries }) => {
    const [newHandling, setNewHandling] = useState<Partial<HandlingRecord>>({
        OT: String(task.OT || ''),
        company: '',
        handlingType: '',
        posteNumber: '',
        hours: 0,
        additionalCost: 0,
        totalPrice: 0,
        readiness: 0,
        comment: '',
        posteDescription: ''
    });

    if (!isOpen) return null;

    const handleSaveHandling = () => {
        onSave({
            id: Date.now().toString(),
            ...newHandling
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[500] p-4 md:p-6 animate-in fade-in duration-300">
            <div className="bg-slate-950 border border-white/5 rounded-[2rem] md:rounded-[3rem] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center bg-purple-600/10">
                    <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Ajouter Manutention</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
                </div>
                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">OT</label>
                            <input type="text" value={newHandling.OT} disabled className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-slate-500 text-sm cursor-not-allowed" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Company</label>
                            <input
                                type="text"
                                list="add-handling-companies"
                                value={newHandling.company}
                                onChange={e => {
                                    const company = e.target.value;
                                    const match = costHubEntries.find(c => c.company.toUpperCase() === company.toUpperCase() && String(c.posteNumber) === String(newHandling.posteNumber));
                                    setNewHandling({ 
                                        ...newHandling, 
                                        company, 
                                        posteDescription: match ? match.posteDescription : newHandling.posteDescription,
                                        totalPrice: (match ? (newHandling.hours || 0) * (match.priceU || 0) : 0) + (newHandling.additionalCost || 0)
                                    });
                                }}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-2 focus:ring-purple-500/20"
                                placeholder="Sélectionner ou saisir..."
                            />
                            <datalist id="add-handling-companies">
                                {[...new Set(costHubEntries.map(c => c.company))].sort().map(co => (
                                    <option key={co} value={co} />
                                ))}
                            </datalist>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Handling Type</label>
                            <input type="text" value={newHandling.handlingType} onChange={e => setNewHandling({ ...newHandling, handlingType: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Poste Number</label>
                            <input
                                type="text"
                                value={newHandling.posteNumber}
                                onChange={e => {
                                    const posteNumber = e.target.value;
                                    if (!posteNumber) {
                                        setNewHandling({ ...newHandling, posteNumber: '', posteDescription: '', totalPrice: newHandling.additionalCost || 0 });
                                    } else {
                                        const match = costHubEntries.find(c => c.company.toUpperCase() === (newHandling.company || '').toUpperCase() && String(c.posteNumber) === posteNumber);
                                        setNewHandling({ 
                                            ...newHandling, 
                                            posteNumber, 
                                            posteDescription: match ? match.posteDescription : newHandling.posteDescription,
                                            totalPrice: (match ? (newHandling.hours || 0) * (match.priceU || 0) : 0) + (newHandling.additionalCost || 0)
                                        });
                                    }
                                }}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:ring-2 focus:ring-purple-500/20"
                                placeholder="Ex: 12345..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Hours</label>
                            <input
                                type="number"
                                value={newHandling.hours}
                                onChange={e => {
                                    const hours = parseFloat(e.target.value) || 0;
                                    const match = costHubEntries.find(c => c.company.toUpperCase() === (newHandling.company || '').toUpperCase() && String(c.posteNumber) === String(newHandling.posteNumber));
                                    setNewHandling({
                                        ...newHandling,
                                        hours,
                                        totalPrice: (match ? hours * (match.priceU || 0) : 0) + (newHandling.additionalCost || 0)
                                    });
                                }}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Additional Cost</label>
                            <input
                                type="number"
                                value={newHandling.additionalCost}
                                onChange={e => {
                                    const additionalCost = parseFloat(e.target.value) || 0;
                                    const match = costHubEntries.find(c => c.company.toUpperCase() === (newHandling.company || '').toUpperCase() && String(c.posteNumber) === String(newHandling.posteNumber));
                                    setNewHandling({
                                        ...newHandling,
                                        additionalCost,
                                        totalPrice: (match ? (newHandling.hours || 0) * (match.priceU || 0) : 0) + additionalCost
                                    });
                                }}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest ml-1">Total Price (Auto)</label>
                            <div className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-emerald-400 font-black text-sm tabular-nums">
                                {new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2 }).format(newHandling.totalPrice || 0)} MAD
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Readiness</label>
                            <select value={newHandling.readiness} onChange={e => setNewHandling({ ...newHandling, readiness: parseInt(e.target.value) })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase text-purple-500 tracking-widest appearance-none">
                                <option value="0">PLANIFIÉ (P)</option>
                                <option value="1">PRÊT (R)</option>
                            </select>
                        </div>
                        <div className="md:col-span-1 space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Commentaire</label>
                            <input
                                type="text"
                                value={newHandling.comment || ''}
                                onChange={e => setNewHandling({ ...newHandling, comment: e.target.value })}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm italic"
                                placeholder="Observations..."
                            />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <span>Poste Description</span>
                                <span className="text-[8px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-black">AUTO</span>
                            </label>
                            <div className="w-full bg-slate-900/30 border border-purple-500/10 rounded-2xl px-5 py-4 text-purple-300 text-sm font-bold min-h-[56px] leading-relaxed">
                                {newHandling.posteDescription || <span className="text-slate-600 italic font-normal">Entrez Company + Poste Number pour auto-remplir...</span>}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/30 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Annuler</button>
                    <button onClick={handleSaveHandling} className="px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-purple-900/40">Ajouter</button>
                </div>
            </div>
        </div>
    );
};

export const QuickAddPermitModal: React.FC<BaseModalProps> = ({ isOpen, onClose, task, onSave }) => {
    const [newPermit, setNewPermit] = useState<Partial<PermitRecord>>({
        OT: String(task.OT || ''),
        permitName: '',
        readiness: 0
    });

    if (!isOpen) return null;

    const handleSavePermit = () => {
        onSave({
            id: Date.now().toString(),
            ...newPermit
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[500] p-4 md:p-6 animate-in fade-in duration-300">
            <div className="bg-slate-950 border border-white/5 rounded-[2rem] md:rounded-[3rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-500 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 md:p-8 border-b border-white/5 bg-slate-900/50 flex justify-between items-center bg-sky-600/10">
                    <h2 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Ajouter Permis</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><Plus className="w-8 h-8 rotate-45" /></button>
                </div>
                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/20 text-white">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">OT</label>
                            <input type="text" value={newPermit.OT} disabled className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-slate-500 text-sm cursor-not-allowed" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Permit Name</label>
                            <input type="text" value={newPermit.permitName} onChange={e => setNewPermit({ ...newPermit, permitName: e.target.value })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Readiness</label>
                            <select value={newPermit.readiness} onChange={e => setNewPermit({ ...newPermit, readiness: parseInt(e.target.value) })} className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase text-sky-500 tracking-widest appearance-none">
                                <option value="0">EN ATTENTE (P)</option>
                                <option value="1">VALIDÉ (R)</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="p-6 md:p-8 border-t border-white/5 bg-slate-900/30 flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-3 text-[10px] font-black text-slate-500 uppercase">Annuler</button>
                    <button onClick={handleSavePermit} className="px-8 py-4 bg-sky-600 hover:bg-sky-500 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-xl shadow-sky-900/40">Ajouter</button>
                </div>
            </div>
        </div>
    );
};
