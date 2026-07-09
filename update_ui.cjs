const fs = require('fs');

const path = 'c:\\Users\\HP\\Downloads\\copy-of-plannex-account-99.84ra-s\\components\\EvaluationView.tsx';
let src = fs.readFileSync(path, 'utf8');

// 1. Replace EventList and EventDetailModal with IncidentModal and AccidentModal
const modalStartRegex = /interface EventListProps[\s\S]*?const EventDetailModal: React\.FC<EventDetailModalProps> = \(\{[\s\S]*?\}\);[\s]*\};/m;


let nextIndex = src.indexOf('interface EventListProps');
let ModalEndIndex = src.indexOf('const formatDateForInput');

if (nextIndex > -1 && ModalEndIndex > -1) {
    const modalReplString = `
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
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex justify-center items-center z-[70] p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-white/10 overflow-hidden transform scale-100 transition-all duration-300" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-6 border-b border-white/5 bg-gradient-to-r from-amber-500/10 to-orange-600/5">
                    <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-amber-400 to-orange-400 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-amber-400"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        Gestion des Incidents
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 rounded-full p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>
                <div className="p-6">
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-3 custom-scrollbar">
                        {events.length === 0 && (
                            <div className="text-center py-10 bg-slate-800/30 rounded-xl border border-dashed border-white/10">
                                <p className="text-slate-400 font-medium">Aucun incident n'est enregistré.</p>
                                <p className="text-slate-500 text-sm mt-1">Cliquez sur le bouton ci-dessous pour en ajouter un.</p>
                            </div>
                        )}
                        {events.map((item, index) => (
                            <div key={item.id} className="p-5 bg-slate-800/60 rounded-xl border border-white/5 shadow-inner space-y-4 hover:border-amber-500/30 transition-colors group">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-amber-500/90 text-sm tracking-wider uppercase">Incident #{index + 1}</h4>
                                    <button onClick={() => setEvents(prev => prev.filter(e => e.id !== item.id))} className="text-slate-500 hover:text-red-400 p-1 rounded-full opacity-50 group-hover:opacity-100 transition-all hover:bg-slate-700/50">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="col-span-1">
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Horodatage</label>
                                        <input type="datetime-local" value={item.dateTime} onChange={e => setEvents(prev => prev.map(ev => ev.id === item.id ? { ...ev, dateTime: e.target.value } : ev))} className="w-full bg-slate-900 border border-white/10 text-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner" />
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Détails de l'événement</label>
                                        <textarea value={item.description} onChange={e => setEvents(prev => prev.map(ev => ev.id === item.id ? { ...ev, description: e.target.value } : ev))} placeholder="Décrivez l'incident..." rows={2} className="w-full bg-slate-900 border border-white/10 text-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 transition-all shadow-inner resize-none custom-scrollbar" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 flex justify-center">
                        <button onClick={() => setEvents(prev => [...prev, { id: crypto.randomUUID(), dateTime: defaultDateTime || new Date().toISOString().slice(0, 16), description: '' }])} className="bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 font-bold py-2.5 px-6 rounded-xl border border-white/5 shadow-md flex items-center justify-center transition-all w-full md:w-auto">
                            <span className="text-xl mr-2 leading-none">+</span> Ajouter un Incident
                        </button>
                    </div>
                </div>
                <footer className="p-5 border-t border-white/5 bg-slate-800/30 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all border border-white/5">Annuler</button>
                    <button onClick={() => { onSave(events); onClose(); }} className="px-5 py-2.5 text-sm font-bold text-slate-900 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 rounded-xl shadow-lg shadow-orange-500/20 transition-all">Enregistrer Incidents</button>
                </footer>
            </div>
        </div>
    );
};

const AccidentModal: React.FC<SingleEventModalProps> = ({ isOpen, onClose, onSave, initialData, defaultDateTime }) => {
    const [events, setEvents] = useState<EventDetail[]>(initialData);
    useEffect(() => { if (isOpen) setEvents(initialData); }, [isOpen, initialData]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex justify-center items-center z-[70] p-4 animate-in fade-in" onClick={onClose}>
            <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-3xl border border-white/10 overflow-hidden transform scale-100 transition-all duration-300" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-6 border-b border-white/5 bg-gradient-to-r from-red-500/10 to-rose-600/5">
                    <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-red-400 to-rose-500 flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-400"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        Gestion des Accidents
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 rounded-full p-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>
                <div className="p-6">
                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-3 custom-scrollbar">
                        {events.length === 0 && (
                            <div className="text-center py-10 bg-slate-800/30 rounded-xl border border-dashed border-white/10">
                                <p className="text-slate-400 font-medium">Aucun accident n'est enregistré.</p>
                                <p className="text-slate-500 text-sm mt-1">Cliquez sur le bouton ci-dessous pour en ajouter un.</p>
                            </div>
                        )}
                        {events.map((item, index) => (
                            <div key={item.id} className="p-5 bg-slate-800/60 rounded-xl border border-white/5 shadow-inner space-y-4 hover:border-red-500/30 transition-colors group">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold text-red-500/90 text-sm tracking-wider uppercase">Accident #{index + 1}</h4>
                                    <button onClick={() => setEvents(prev => prev.filter(e => e.id !== item.id))} className="text-slate-500 hover:text-red-400 p-1 rounded-full opacity-50 group-hover:opacity-100 transition-all hover:bg-slate-700/50">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                    <div className="col-span-1">
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Horodatage</label>
                                        <input type="datetime-local" value={item.dateTime} onChange={e => setEvents(prev => prev.map(ev => ev.id === item.id ? { ...ev, dateTime: e.target.value } : ev))} className="w-full bg-slate-900 border border-white/10 text-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner" />
                                    </div>
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Détails de l'événement</label>
                                        <textarea value={item.description} onChange={e => setEvents(prev => prev.map(ev => ev.id === item.id ? { ...ev, description: e.target.value } : ev))} placeholder="Décrivez l'accident..." rows={2} className="w-full bg-slate-900 border border-white/10 text-slate-200 rounded-lg px-4 py-2.5 text-sm focus:border-red-500/50 focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner resize-none custom-scrollbar" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 flex justify-center">
                        <button onClick={() => setEvents(prev => [...prev, { id: crypto.randomUUID(), dateTime: defaultDateTime || new Date().toISOString().slice(0, 16), description: '' }])} className="bg-slate-800 hover:bg-slate-700 text-red-500 hover:text-red-400 font-bold py-2.5 px-6 rounded-xl border border-white/5 shadow-md flex items-center justify-center transition-all w-full md:w-auto">
                            <span className="text-xl mr-2 leading-none">+</span> Ajouter un Accident
                        </button>
                    </div>
                </div>
                <footer className="p-5 border-t border-white/5 bg-slate-800/30 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 rounded-xl transition-all border border-white/5">Annuler</button>
                    <button onClick={() => { onSave(events); onClose(); }} className="px-5 py-2.5 text-sm font-bold text-slate-900 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 rounded-xl shadow-lg shadow-rose-500/20 transition-all">Enregistrer Accidents</button>
                </footer>
            </div>
        </div>
    );
};
`;
    src = src.substring(0, nextIndex) + modalReplString + src.substring(ModalEndIndex);
    console.log('Replaced Modals successfully');
}


// Replace AddTaskModal styling
const addTaskIndex = src.indexOf('const AddTaskModal: React.FC<{');
const addTaskEnd = src.indexOf('const NonCompletionModal: React.FC<{');

if (addTaskIndex > -1 && addTaskEnd > -1) {
    let addTskBlock = src.substring(addTaskIndex, addTaskEnd);

    // Replace the return block of AddTaskModal
    addTskBlock = addTskBlock.replace(/return \([\s\S]*?\);\s*\};/m, `return (
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
                        {/* Decorative blur element */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>

                        <div className="md:col-span-2">
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 ml-1">Action Requise</label>
                            <input type="text" value={action} onChange={e => setAction(e.target.value)} required className="w-full bg-slate-900/60 border border-white/10 text-slate-200 rounded-xl px-4 py-3 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_0_15px_rgba(6,182,212,0.1)] outline-none placeholder:text-slate-600 font-medium" placeholder="Ex: Remplacement du joint sur ligne principale..." />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 ml-1">Équipement</label>
                            <input type="text" value={equipment} onChange={e => setEquipment(e.target.value)} required className="w-full bg-slate-900/60 border border-white/10 text-slate-200 rounded-xl px-4 py-3 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_0_15px_rgba(6,182,212,0.1)] outline-none placeholder:text-slate-600 font-medium" placeholder="Ex: Pompe P-101A..." />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 ml-1">Type de Maintenance</label>
                            <div className="relative">
                                <select value={maintenanceType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setMaintenanceType(e.target.value as 'Préventive' | 'Corrective')} required className="w-full bg-slate-900/60 border border-white/10 text-slate-200 rounded-xl px-4 py-3 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner outline-none cursor-pointer appearance-none font-medium text-sm">
                                    <option value="Préventive">🛡️ Préventive</option>
                                    <option value="Corrective">🔧 Corrective</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 ml-1">Durée Prévue (H)</label>
                            <div className="relative">
                                <input
                                    type="number" step="0.01" min="0" required
                                    value={duration}
                                    onChange={e => setDuration(Number(e.target.value) || 0)}
                                    className="w-full bg-slate-900/60 border border-white/10 text-slate-200 rounded-xl px-4 py-3 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner outline-none text-xl font-mono font-bold pr-12 focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.6),0_0_15px_rgba(6,182,212,0.1)]"
                                    placeholder="0.00"
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none">
                                    <span className="text-slate-500 font-bold">h</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.15em] mb-2 ml-1 flex justify-between">Équipes Assignées <span className="text-cyan-500/70 normal-case tracking-normal">Ctrl+clic = multiple</span></label>
                            <select
                                multiple
                                value={selectedTeams}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                                    setSelectedTeams(selected);
                                }}
                                required
                                className="w-full bg-slate-900/60 border border-white/10 text-slate-200 rounded-xl p-2 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all shadow-inner custom-scrollbar outline-none font-medium h-[4.5rem]"
                            >
                                {teams.map(team => <option key={team} value={team} className="py-1.5 px-3 mb-1 hover:bg-cyan-500/20 rounded-lg cursor-pointer checked:bg-cyan-600/40 checked:text-cyan-100">{team}</option>)}
                            </select>
                        </div>
                    </div>

                    {teamDetails.length > 0 && <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent my-6"></div>}
                    
                    {teamDetails.length > 0 && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em] mb-4 px-1">Détail des Ressources</h3>
                            <div className="space-y-3">
                                {teamDetails.map(detail => (
                                    <div key={detail.team} className="flex flex-col sm:flex-row items-center justify-between p-4 bg-slate-800/40 rounded-xl border border-white/5 space-y-4 sm:space-y-0 sm:space-x-4 hover:border-cyan-500/30 transition-all shadow-sm hover:shadow-cyan-500/5 group">
                                        <h4 className="font-bold text-slate-200 truncate w-full sm:w-2/5 flex items-center group-hover:text-cyan-100 transition-colors">
                                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-3 shadow-[0_0_8px_rgb(52,211,153)]"></div>
                                            {detail.team}
                                        </h4>
                                        <div className="flex items-center space-x-6 w-full sm:w-3/5 justify-between sm:justify-end">
                                            <div className="flex flex-col items-center">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Effectif</label>
                                                <input
                                                    type="number" step="1" min="1" required
                                                    value={detail.manpower}
                                                    onChange={e => handleTeamDetailChange(detail.team, 'manpower', e.target.value)}
                                                    className="w-24 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-center text-slate-200 font-bold focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all shadow-inner" />
                                            </div>
                                            <div className="text-center w-28">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">Heures-Homme</label>
                                                <div className="w-full bg-slate-900/80 border border-cyan-500/20 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold shadow-inner">
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
                                <span className="text-2xl font-bold text-slate-200">{duration.toFixed(2)}<span className="text-lg text-slate-500 ml-1">h</span></span>
                            </div>
                            <div className="h-12 w-px bg-gradient-to-b from-transparent via-cyan-500/30 to-transparent"></div>
                            <div className="text-right">
                                <span className="block text-[10px] font-black text-cyan-500/80 uppercase tracking-widest mb-1">Charge Totale H-H</span>
                                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-mono drop-shadow-[0_2px_10px_rgba(6,182,212,0.3)]">{totalManHours.toFixed(2)}</span>
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
};`);
    src = src.substring(0, addTaskIndex) + addTskBlock + src.substring(addTaskEnd);
    console.log('Replaced AddTaskModal block.');
}

// 3. Update the state hooks
src = src.replace(/const \[isEventDetailModalOpen, setIsEventDetailModalOpen\] = useState\(false\);/,
    `const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
    const [isAccidentModalOpen, setIsAccidentModalOpen] = useState(false);`
);

// 4. Update Modal usage
src = src.replace(/<EventDetailModal[\s\S]*?onClose=\{\(\) => setIsEventDetailModalOpen\(false\)\}[\s\S]*?\/>/,
    `<IncidentModal
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
            />`);

// 5. Update KPI Cards onClick
src = src.replace(/title="Incidents"\s*onClick=\{\(\) => setIsEventDetailModalOpen\(true\)\}/, 'title="Incidents" onClick={() => setIsIncidentModalOpen(true)}');
src = src.replace(/title="Accidents"\s*onClick=\{\(\) => setIsEventDetailModalOpen\(true\)\}/, 'title="Accidents" onClick={() => setIsAccidentModalOpen(true)}');

// 6. Insert new KPI charts after the PieChart section
const pieChartEndRegex = /<\/PieChart>\s*<\/ResponsiveContainer>\s*<\/div>\s*<\/div>/;

let pieChartMatch = src.match(pieChartEndRegex);
if (pieChartMatch) {
    const insertPos = pieChartMatch.index + pieChartMatch[0].length;
    const chartsHtml = `
                    {/* Réalisation par Discipline */}
                    <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-700/60 col-span-1 md:col-span-2 lg:col-span-2 shadow-xl hover:shadow-cyan-500/10 transition-shadow">
                        <p className="text-xs font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-300 flex items-center gap-2 mb-4 uppercase tracking-widest">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-cyan-400"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg> 
                            Réalisation / Discipline
                        </p>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={Object.entries(evaluationKpis.completionByDiscipline).sort((a,b)=> (b[1].completed/b[1].total) - (a[1].completed/a[1].total)).slice(0, 10).map(([name, data]) => ({ name, completed: data.total > 0 ? (data.completed/data.total)*100 : 0 }))} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <XAxis type="number" hide domain={[0, 100]} />
                                    <YAxis type="category" dataKey="name" width={120} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                                    <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [\`\${value.toFixed(1)}%\`, 'Réalisation']} />
                                    <Bar dataKey="completed" fill="url(#colorCyan)" radius={[0, 4, 4, 0]} barSize={12}>
                                    </Bar>
                                    <defs>
                                        <linearGradient id="colorCyan" x1="0" y1="0" x2="1" y2="0">
                                          <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.8}/>
                                          <stop offset="100%" stopColor="#3b82f6" stopOpacity={1}/>
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    {/* Réalisation par Equipe */}
                    <div className="bg-slate-900/50 backdrop-blur-xl p-6 rounded-2xl border border-slate-700/60 col-span-1 md:col-span-2 lg:col-span-2 shadow-xl hover:shadow-purple-500/10 transition-shadow">
                        <p className="text-xs font-black bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-fuchsia-300 flex items-center gap-2 mb-4 uppercase tracking-widest">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-purple-400"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> 
                            Réalisation / Equipe
                        </p>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={Object.entries(evaluationKpis.completionByTeam).sort((a,b)=> (b[1].completed/b[1].total) - (a[1].completed/a[1].total)).slice(0, 10).map(([name, data]) => ({ name, completed: data.total > 0 ? (data.completed/data.total)*100 : 0 }))} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                                    <XAxis type="number" hide domain={[0, 100]} />
                                    <YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }} />
                                    <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value: number) => [\`\${value.toFixed(1)}%\`, 'Réalisation']} />
                                    <Bar dataKey="completed" fill="url(#colorPurple)" radius={[0, 4, 4, 0]} barSize={12} />
                                    <defs>
                                        <linearGradient id="colorPurple" x1="0" y1="0" x2="1" y2="0">
                                          <stop offset="0%" stopColor="#c084fc" stopOpacity={0.8}/>
                                          <stop offset="100%" stopColor="#ec4899" stopOpacity={1}/>
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>`;
    src = src.substring(0, insertPos) + chartsHtml + src.substring(insertPos);
    console.log("Injected charts into UI.");
} else {
    console.log("Could not find pie chart to append to.");
}

fs.writeFileSync(path, src, 'utf8');
console.log("EvaluationView.tsx updated!");
