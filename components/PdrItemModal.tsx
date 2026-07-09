import React, { useState, useEffect } from 'react';
import { Package, X, Calendar, PenTool, Hash, DollarSign, Activity } from 'lucide-react';
import type { PDRItem } from '../types';

interface PdrItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (item: PDRItem) => void;
    item?: Partial<PDRItem>;
    ot?: string;
}

export const PdrItemModal: React.FC<PdrItemModalProps> = ({ isOpen, onClose, onSave, item, ot }) => {
    const [formData, setFormData] = useState<Partial<PDRItem>>({
        sparePart: '',
        unite: 'U',
        qty: 1,
        priceU: 0,
        totalPrice: 0,
        readiness: 0,
        dueDate: null,
        comment: '',
        status: 'Awaiting Process'
    });

    useEffect(() => {
        if (item) {
            setFormData({ ...formData, ...item });
        }
    }, [item]);

    if (!isOpen) return null;

    const handleChange = (field: keyof PDRItem, value: any) => {
        setFormData(prev => {
            const newData = { ...prev, [field]: value };
            if (field === 'qty' || field === 'priceU') {
                newData.totalPrice = (Number(newData.qty) || 0) * (Number(newData.priceU) || 0);
            }
            return newData;
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.sparePart) return;

        onSave({
            id: formData.id || crypto.randomUUID(),
            OT: ot || formData.OT || 'NA',
            sparePart: formData.sparePart!,
            unite: formData.unite || 'U',
            qty: formData.qty || 1,
            priceU: formData.priceU || 0,
            totalPrice: formData.totalPrice || 0,
            readiness: formData.readiness || 0,
            dueDate: formData.dueDate || null,
            comment: formData.comment || '',
            status: (formData.status as any) || 'Awaiting Process'
        } as PDRItem);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
            <div
                className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Accent */}
                <div className="h-1.5 w-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-500"></div>

                <header className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">
                                {item?.id ? 'Modifier la Pièce' : 'Ajouter une Pièce'}
                            </h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Configuration Tacticque du Stock (PDR)</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-500 hover:text-white transition-all active:scale-90"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </header>

                <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-black/20 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {/* Main Info */}
                    <div className="space-y-6">
                        <div className="group">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-amber-400 transition-colors">Désignation Spare Part</label>
                            <div className="relative">
                                <PenTool className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                <input
                                    autoFocus
                                    type="text"
                                    required
                                    value={formData.sparePart}
                                    onChange={e => handleChange('sparePart', e.target.value)}
                                    placeholder="Nom technique de la pièce de rechange..."
                                    className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/50 transition-all font-bold placeholder:text-slate-700"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-amber-400 transition-colors">Statut Procurement</label>
                                <select
                                    value={formData.status}
                                    onChange={e => handleChange('status', e.target.value)}
                                    className={`w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-xs font-black uppercase tracking-widest focus:outline-none cursor-pointer transition-all ${formData.status === 'Inventory Assets' ? 'text-emerald-400' :
                                        formData.status === 'Active Tenders' ? 'text-blue-400' : 'text-amber-500'
                                        }`}
                                >
                                    <option value="Awaiting Process">Awaiting Process</option>
                                    <option value="Active Tenders">Active Tenders</option>
                                    <option value="Inventory Assets">Inventory Assets</option>
                                </select>
                            </div>
                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-amber-400 transition-colors">Readiness Control</label>
                                <select
                                    value={formData.readiness}
                                    onChange={e => handleChange('readiness', parseInt(e.target.value))}
                                    className={`w-full bg-slate-950 border border-white/10 rounded-2xl px-5 py-4 text-[10px] font-black uppercase tracking-widest focus:outline-none cursor-pointer transition-all ${formData.readiness === 1 ? 'text-emerald-400' : 'text-rose-500'}`}
                                >
                                    <option value="0">MANQUANT (OUT OF STOCK)</option>
                                    <option value="1">DISPONIBLE (IN STOCK)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Logistics Grid */}
                    <div className="bg-slate-950/40 p-6 rounded-[2rem] border border-white/5 space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="group">
                                <label className="block text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2 ml-1">Quantité</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-700" />
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={formData.qty}
                                        onChange={e => handleChange('qty', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-8 pr-3 py-2.5 text-white text-xs font-mono focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                                    />
                                </div>
                            </div>
                            <div className="group">
                                <label className="block text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2 ml-1">Unité</label>
                                <input
                                    type="text"
                                    value={formData.unite}
                                    onChange={e => handleChange('unite', e.target.value)}
                                    placeholder="Ex: U, SET..."
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs font-black uppercase focus:outline-none"
                                />
                            </div>
                            <div className="group">
                                <label className="block text-[8px] font-black text-emerald-500/50 uppercase tracking-[0.2em] mb-2 ml-1">Price U (MAD)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-emerald-500/50" />
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.priceU}
                                        onChange={e => handleChange('priceU', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-slate-900/50 border border-emerald-500/10 rounded-xl pl-8 pr-3 py-2.5 text-emerald-400 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
                                    />
                                </div>
                            </div>
                            <div className="group">
                                <label className="block text-[8px] font-black text-slate-700 uppercase tracking-[0.2em] mb-2 ml-1">Total (MAD)</label>
                                <div className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-2.5 text-white text-[10px] font-black font-mono flex items-center h-[38px] tabular-nums">
                                    {(formData.totalPrice || 0).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-blue-400">Date de livraison estimée</label>
                                <div className="relative cursor-pointer" onClick={(e) => {
                                    const input = e.currentTarget.querySelector('input');
                                    if (input) {
                                        // Some browsers might need this to open the picker
                                        if ('showPicker' in HTMLInputElement.prototype) {
                                            (input as any).showPicker();
                                        } else {
                                            input.focus();
                                        }
                                    }
                                }}>
                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500/50 pointer-events-none" />
                                    <input
                                        type="date"
                                        value={formData.dueDate || ''}
                                        onChange={e => handleChange('dueDate', e.target.value)}
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl pl-12 pr-6 py-3.5 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
                                    />
                                </div>
                            </div>
                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Statut Logistique</label>
                                <select
                                    value={formData.status || 'Awaiting Process'}
                                    onChange={e => handleChange('status', e.target.value)}
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-6 py-3.5 text-white text-[10px] font-black uppercase focus:outline-none focus:ring-2 focus:ring-amber-500/20 appearance-none cursor-pointer"
                                >
                                    <option value="Awaiting Process">Awaiting Process</option>
                                    <option value="Active Tenders">Active Tenders</option>
                                    <option value="Inventory Assets">Inventory Assets</option>
                                </select>
                            </div>
                            <div className="group md:col-span-2">
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1 group-focus-within:text-emerald-400">Commentaire Logistique</label>
                                <div className="relative">
                                    <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
                                    <input
                                        type="text"
                                        value={formData.comment}
                                        onChange={e => handleChange('comment', e.target.value)}
                                        placeholder="Ex: Commande passée, Ref #..."
                                        className="w-full bg-slate-950 border border-white/10 rounded-xl pl-12 pr-6 py-3.5 text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-800"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                <footer className="p-8 border-t border-white/5 bg-slate-900/50 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all active:scale-95"
                    >
                        Annuler
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-12 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-900/30 active:scale-95 flex items-center gap-2"
                    >
                        {item?.id ? 'Mettre à jour' : 'Confirmer l\'ajout'}
                        <Package className="w-4 h-4" />
                    </button>
                </footer>
            </div>
        </div>
    );
};
