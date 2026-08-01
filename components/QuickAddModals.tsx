import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import type { SchedulingTaskData, ScaffoldingRecord, HandlingRecord, SimopsRecord, PermitRecord } from '../types';

// Generic Modal Container
const ModalContainer = ({ isOpen, onClose, title, children }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#0c0c0e] border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-xl font-black text-white italic tracking-wider uppercase">{title}</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-8">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const QuickAddScaffoldingModal = ({ isOpen, onClose, onSave, task }: { isOpen: boolean, onClose: () => void, onSave: (r: ScaffoldingRecord) => void, task: SchedulingTaskData }) => {
    const [data, setData] = useState<Partial<ScaffoldingRecord>>({ OT: String(task.OT || ''), company: '', readiness: 0, posteNumber: 1, QT: 1, totalPrice: 0 });
    return (
        <ModalContainer isOpen={isOpen} onClose={onClose} title="AJOUTER ÉCHAFAUDAGE">
            <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">OT</label>
                    <input disabled value={data.OT} className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-3.5 text-slate-400 text-sm opacity-70" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Company</label>
                    <input value={data.company} onChange={e => setData({...data, company: e.target.value})} placeholder="Company..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm focus:border-indigo-500 focus:bg-white/10 transition-all outline-none" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Poste Number</label>
                    <input type="number" value={data.posteNumber} onChange={e => setData({...data, posteNumber: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm focus:border-indigo-500 focus:bg-white/10 transition-all outline-none" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Quantity (QT)</label>
                    <input type="number" value={data.QT} onChange={e => setData({...data, QT: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm focus:border-indigo-500 focus:bg-white/10 transition-all outline-none" />
                </div>
                <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Poste Description</label>
                    <input value={data.posteDescription || ''} onChange={e => setData({...data, posteDescription: e.target.value})} placeholder="Description..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm focus:border-indigo-500 focus:bg-white/10 transition-all outline-none" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Price (Total)</label>
                    <input type="number" value={data.totalPrice} onChange={e => setData({...data, totalPrice: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm focus:border-indigo-500 focus:bg-white/10 transition-all outline-none font-bold text-emerald-400" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Readiness</label>
                    <select value={data.readiness} onChange={e => setData({...data, readiness: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm focus:border-indigo-500 focus:bg-white/10 transition-all outline-none">
                        <option value={0} className="bg-slate-900">NOT READY (NR)</option>
                        <option value={1} className="bg-slate-900">READY (R)</option>
                    </select>
                </div>
            </div>
            <div className="flex justify-end gap-4">
                <button onClick={onClose} className="px-6 py-3 text-xs font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors">Annuler</button>
                <button onClick={() => { onSave(data as ScaffoldingRecord); onClose(); }} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2"><Save className="w-4 h-4" /> Sauvegarder</button>
            </div>
        </ModalContainer>
    );
};

export const QuickAddHandlingModal = ({ isOpen, onClose, onSave, task }: { isOpen: boolean, onClose: () => void, onSave: (r: HandlingRecord) => void, task: SchedulingTaskData }) => {
    const [data, setData] = useState<Partial<HandlingRecord>>({ OT: String(task.OT || ''), company: '', handlingType: 'GRUE', readiness: 0, posteNumber: 1, hours: 1, additionalCost: 0, totalPrice: 0 });
    return (
        <ModalContainer isOpen={isOpen} onClose={onClose} title="AJOUTER MANUTENTION">
            <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">OT</label>
                    <input disabled value={data.OT} className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-3.5 text-slate-400 text-sm opacity-70" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Handling Type</label>
                    <input value={data.handlingType} onChange={e => setData({...data, handlingType: e.target.value})} placeholder="e.g. GRUE, CHARIOT..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm focus:border-indigo-500 focus:bg-white/10 transition-all outline-none" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Hours</label>
                    <input type="number" value={data.hours} onChange={e => setData({...data, hours: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm focus:border-indigo-500 focus:bg-white/10 transition-all outline-none" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Total Price</label>
                    <input type="number" value={data.totalPrice} onChange={e => setData({...data, totalPrice: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm focus:border-indigo-500 focus:bg-white/10 transition-all outline-none font-bold text-cyan-400" />
                </div>
                <div className="col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Readiness</label>
                    <select value={data.readiness} onChange={e => setData({...data, readiness: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm focus:border-indigo-500 focus:bg-white/10 transition-all outline-none">
                        <option value={0} className="bg-slate-900">NOT READY (NR)</option>
                        <option value={1} className="bg-slate-900">READY (R)</option>
                    </select>
                </div>
            </div>
            <div className="flex justify-end gap-4">
                <button onClick={onClose} className="px-6 py-3 text-xs font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors">Annuler</button>
                <button onClick={() => { onSave(data as HandlingRecord); onClose(); }} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2"><Save className="w-4 h-4" /> Sauvegarder</button>
            </div>
        </ModalContainer>
    );
};

export const QuickAddSimopsModal = ({ isOpen, onClose, onSave, task }: { isOpen: boolean, onClose: () => void, onSave: (r: SimopsRecord) => void, task: SchedulingTaskData }) => {
    const [data, setData] = useState<Partial<SimopsRecord>>({ OT: String(task.OT || ''), simopsOT: '' });
    return (
        <ModalContainer isOpen={isOpen} onClose={onClose} title="AJOUTER SIMOPS">
            <div className="flex flex-col gap-6 mb-8">
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">OT</label>
                    <input disabled value={data.OT} className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-3.5 text-slate-400 text-sm opacity-70" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Simops OT (Sibling)</label>
                    <input value={data.simopsOT} onChange={e => setData({...data, simopsOT: e.target.value})} placeholder="Ex: 400082..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm focus:border-indigo-500 focus:bg-white/10 transition-all outline-none" />
                </div>
            </div>
            <div className="flex justify-end gap-4">
                <button onClick={onClose} className="px-6 py-3 text-xs font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors">Annuler</button>
                <button onClick={() => { onSave(data as SimopsRecord); onClose(); }} className="px-8 py-3 bg-orange-600 hover:bg-orange-500 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2"><Save className="w-4 h-4" /> Sauvegarder</button>
            </div>
        </ModalContainer>
    );
};

export const QuickAddPermitModal = ({ isOpen, onClose, onSave, task }: { isOpen: boolean, onClose: () => void, onSave: (r: PermitRecord) => void, task: SchedulingTaskData }) => {
    const [data, setData] = useState<Partial<PermitRecord>>({ OT: String(task.OT || ''), permitName: '', readiness: 0 });
    return (
        <ModalContainer isOpen={isOpen} onClose={onClose} title="AJOUTER PERMIS">
            <div className="flex flex-col gap-6 mb-8">
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">OT</label>
                    <input disabled value={data.OT} className="w-full bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-3.5 text-slate-400 text-sm opacity-70" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Nom du Permis</label>
                    <input value={data.permitName} onChange={e => setData({...data, permitName: e.target.value})} placeholder="Ex: Permis de feu..." className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm focus:border-indigo-500 focus:bg-white/10 transition-all outline-none" />
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Readiness</label>
                    <select value={data.readiness} onChange={e => setData({...data, readiness: Number(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm focus:border-indigo-500 focus:bg-white/10 transition-all outline-none">
                        <option value={0} className="bg-slate-900">NOT READY (NR)</option>
                        <option value={1} className="bg-slate-900">READY (R)</option>
                    </select>
                </div>
            </div>
            <div className="flex justify-end gap-4">
                <button onClick={onClose} className="px-6 py-3 text-xs font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors">Annuler</button>
                <button onClick={() => { onSave(data as PermitRecord); onClose(); }} className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center gap-2"><Save className="w-4 h-4" /> Sauvegarder</button>
            </div>
        </ModalContainer>
    );
};
