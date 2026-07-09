import React, { useState, useMemo } from 'react';
import type { ScheduledTask, TaskStatus } from '../types';

interface AddTaskOutsideRangeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (taskIds: number[], status: TaskStatus) => void;
    allTasks: ScheduledTask[];
    displayedStartDate: string;
    displayedEndDate: string;
}

export const AddTaskOutsideRangeModal: React.FC<AddTaskOutsideRangeModalProps> = ({
    isOpen,
    onClose,
    onAdd,
    allTasks,
    displayedStartDate,
    displayedEndDate,
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
    const [selectedStatus, setSelectedStatus] = useState<TaskStatus>('À Faire');

    // Filters
    const [selectedEquipment, setSelectedEquipment] = useState('all');
    const [selectedTeam, setSelectedTeam] = useState('all');
    const [selectedDiscipline, setSelectedDiscipline] = useState('all');

    const tasksOutsideRange = useMemo(() => {
        if (!displayedStartDate || !displayedEndDate) return [];

        const startRange = new Date(displayedStartDate).getTime();
        const endRange = new Date(displayedEndDate).getTime();

        return allTasks.filter(task => {
            const taskStart = task.startTime.getTime();
            const taskEnd = task.endTime.getTime();

            // Task is outside if it doesn't overlap with the range at all
            return (taskEnd <= startRange || taskStart >= endRange);
        });
    }, [allTasks, displayedStartDate, displayedEndDate]);

    const { equipmentOptions, teamOptions, disciplineOptions } = useMemo(() => {
        const equipments = ['all', ...Array.from(new Set(tasksOutsideRange.map(t => t.equipment).filter(Boolean) as string[]))].sort();
        const teams = ['all', ...Array.from(new Set(tasksOutsideRange.map(t => t.team).filter(Boolean) as string[]))].sort();
        const disciplines = ['all', ...Array.from(new Set(tasksOutsideRange.map(t => t.discipline).filter(Boolean) as string[]))].sort();

        return { equipmentOptions: equipments, teamOptions: teams, disciplineOptions: disciplines };
    }, [tasksOutsideRange]);

    const filteredTasks = useMemo(() => {
        const lowerSearch = searchTerm.toLowerCase();
        return tasksOutsideRange.filter(task => {
            const matchesSearch = !searchTerm ||
                task.action.toLowerCase().includes(lowerSearch) ||
                (task.ot && String(task.ot).toLowerCase().includes(lowerSearch)) ||
                (task.equipment && task.equipment.toLowerCase().includes(lowerSearch));

            const matchesEquipment = selectedEquipment === 'all' || task.equipment === selectedEquipment;
            const matchesTeam = selectedTeam === 'all' || task.team === selectedTeam;
            const matchesDiscipline = selectedDiscipline === 'all' || task.discipline === selectedDiscipline;

            return matchesSearch && matchesEquipment && matchesTeam && matchesDiscipline;
        });
    }, [tasksOutsideRange, searchTerm, selectedEquipment, selectedTeam, selectedDiscipline]);

    const formatDateTime = (date: Date) => {
        return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (!isOpen) return null;

    const handleToggleTask = (taskId: number) => {
        setSelectedTaskIds(prev =>
            prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
        );
    };

    const handleAdd = () => {
        if (selectedTaskIds.length === 0) return;
        onAdd(selectedTaskIds, selectedStatus);
        setSelectedTaskIds([]);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center z-[150] p-4" onClick={onClose}>
            <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <header className="px-8 pt-8 pb-4 flex justify-between items-center relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full"></div>
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-gradient-to-b from-emerald-400 to-teal-500 rounded-full"></span>
                            Ajouter des Tâches Hors Plage
                        </h2>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1 ml-4">
                            Inclusion manuelle de tâches prévues à d'autres dates
                        </p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-white/5 relative z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>

                {/* Filters */}
                <div className="px-8 py-4 bg-white/2 border-y border-white/5 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Recherche</label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Action, OT..."
                            className="w-full bg-slate-800 border border-white/5 rounded-xl px-4 py-2 text-xs text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Discipline</label>
                        <select
                            value={selectedDiscipline}
                            onChange={e => setSelectedDiscipline(e.target.value)}
                            className="w-full bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        >
                            {disciplineOptions.map(d => <option key={d} value={d}>{d === 'all' ? 'Toutes' : d}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Équipe</label>
                        <select
                            value={selectedTeam}
                            onChange={e => setSelectedTeam(e.target.value)}
                            className="w-full bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        >
                            {teamOptions.map(t => <option key={t} value={t}>{t === 'all' ? 'Toutes' : t}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Équipement</label>
                        <select
                            value={selectedEquipment}
                            onChange={e => setSelectedEquipment(e.target.value)}
                            className="w-full bg-slate-800 border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:ring-2 focus:ring-emerald-500/50 outline-none"
                        >
                            {equipmentOptions.map(e => <option key={e} value={e}>{e === 'all' ? 'Tous' : e}</option>)}
                        </select>
                    </div>
                </div>

                {/* Task List */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="grid grid-cols-1 gap-3">
                        {filteredTasks.map(task => (
                            <div
                                key={task.id}
                                onClick={() => handleToggleTask(task.id)}
                                className={`
                  group p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-4
                  ${selectedTaskIds.includes(task.id)
                                        ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                                        : 'bg-white/2 border-white/5 hover:border-white/20'}
                `}
                            >
                                <div className={`
                  w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all
                  ${selectedTaskIds.includes(task.id)
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : 'border-white/10 bg-slate-800 group-hover:border-emerald-500/50'}
                `}>
                                    {selectedTaskIds.includes(task.id) && (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex flex-col">
                                            <h4 className="font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">{task.action}</h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-lg">Cible:</span>
                                                <span className="text-[10px] font-mono text-slate-500">{formatDateTime(task.startTime)}</span>
                                                <span className="text-slate-700">→</span>
                                                <span className="text-[10px] font-mono text-slate-500">{formatDateTime(task.endTime)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-3 items-center mt-2">
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-white/5 px-2 py-0.5 rounded-lg">{task.ot || 'No OT'}</span>
                                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">{task.equipment}</span>
                                        <span className="text-[9px] font-black uppercase tracking-wider text-blue-400/70">{task.team}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-black text-white">{task.duration.toFixed(1)}h</div>
                                    <div className="text-[9px] text-slate-500 font-bold uppercase">{task.manHours.toFixed(1)} HH</div>
                                </div>
                            </div>
                        ))}
                        {filteredTasks.length === 0 && (
                            <div className="text-center py-12 text-slate-500 italic">
                                Aucune tâche trouvée en dehors de la plage.
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <footer className="px-8 py-6 bg-black/40 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5">Statut pour les tâches ajoutées</p>
                            <div className="flex p-1 bg-slate-800 rounded-xl border border-white/5">
                                {(['À Faire', 'En Cours', 'Fait'] as TaskStatus[]).map(status => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => setSelectedStatus(status)}
                                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedStatus === status ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {selectedTaskIds.length > 0 && (
                            <div className="animate-in fade-in slide-in-from-left-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total sélectionné</p>
                                <p className="text-xl font-black text-emerald-400">{selectedTaskIds.length} <span className="text-[10px] text-slate-500 tracking-normal">Tâches</span></p>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                        >
                            Annuler
                        </button>
                        <button
                            onClick={handleAdd}
                            disabled={selectedTaskIds.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black px-8 py-3 rounded-2xl shadow-xl shadow-emerald-900/30 transform hover:-translate-y-0.5 active:translate-y-0 transition-all text-[10px] uppercase tracking-[0.2em]"
                        >
                            Ajouter à la Sélection
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};
