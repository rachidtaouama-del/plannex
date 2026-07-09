
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { SchedulingTaskData } from '../types';

interface TaskSelectorProps {
    tasks: SchedulingTaskData[];
    selectedIds: number[];
    onChange: (ids: number[]) => void;
    placeholder: string;
    singleSelection?: boolean;
    initialDiscipline?: string;
    initialFamily?: string;
}

export const TaskSelector: React.FC<TaskSelectorProps> = ({ tasks, selectedIds, onChange, placeholder, singleSelection = false, initialDiscipline, initialFamily }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [filters, setFilters] = useState({
        searchTerm: '',
        discipline: initialDiscipline || 'all',
        family: initialFamily || 'all'
    });
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setFilters(f => ({
            ...f,
            discipline: initialDiscipline || 'all',
            family: initialFamily || 'all'
        }));
    }, [initialDiscipline, initialFamily]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filterOptions = useMemo(() => {
        const disciplines = [...new Set(tasks.map(t => t.DISCIPLINE))].sort();
        const families = [...new Set(tasks.map(t => t.FAMILLE))].sort();
        return { disciplines, families };
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task =>
            (filters.discipline === 'all' || task.DISCIPLINE === filters.discipline) &&
            (filters.family === 'all' || task.FAMILLE === filters.family) &&
            ((task['GLOBAL TASKS'] || '').toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
                (task['Nom Equipement'] || '').toLowerCase().includes(filters.searchTerm.toLowerCase()))
        );
    }, [tasks, filters]);

    const handleToggle = (id: number) => {
        if (singleSelection) {
            onChange([id]);
            setIsOpen(false);
        } else {
            onChange(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);
        }
    };

    const displayLabel = useMemo(() => {
        if (selectedIds.length === 0) return placeholder;
        if (selectedIds.length === 1) {
            const task = tasks.find(t => t.id === selectedIds[0]);
            if (task) {
                return `${task['GLOBAL TASKS']} (${task['Nom Equipement']})`;
            }
        }
        return `${selectedIds.length} tâche(s) sélectionnée(s)`;
    }, [selectedIds, tasks, placeholder]);

    return (
        <div ref={dropdownRef} className="relative w-full group">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-white flex justify-between items-center text-left transition-all duration-300 shadow-inner group-hover:border-white/20 ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500/50' : ''}`}
                title={displayLabel}
            >
                <span className={`truncate block w-full pr-4 text-xs font-bold leading-relaxed ${selectedIds.length > 0 ? 'text-white' : 'text-slate-500'}`}>
                    {displayLabel}
                </span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isOpen ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-slate-500 group-hover:bg-white/10 group-hover:text-slate-300'}`}>
                    <svg className={`w-4 h-4 transition-transform duration-300 stroke-[3] ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"></path></svg>
                </div>
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 w-full bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[90] overflow-hidden animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl">
                    <div className="p-4 space-y-3 bg-white/5">
                        <div className="relative group/search">
                            <input
                                type="text"
                                value={filters.searchTerm}
                                onChange={e => setFilters(f => ({ ...f, searchTerm: e.target.value }))}
                                placeholder="Filtrer les tâches..."
                                className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all font-bold"
                                autoFocus
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none group-focus-within/search:text-blue-500/50 transition-colors">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="relative group/disc">
                                <select
                                    value={filters.discipline}
                                    onChange={e => setFilters(f => ({ ...f, discipline: e.target.value }))}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-tighter text-slate-400 appearance-none focus:outline-none focus:border-blue-500/50 cursor-pointer"
                                >
                                    <option value="all">Disciplines (Toutes)</option>
                                    {filterOptions.disciplines.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M6 9l6 6 6-6" /></svg>
                                </div>
                            </div>
                            <div className="relative group/fam">
                                <select
                                    value={filters.family}
                                    onChange={e => setFilters(f => ({ ...f, family: e.target.value }))}
                                    className="w-full bg-slate-950/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-tighter text-slate-400 appearance-none focus:outline-none focus:border-blue-500/50 cursor-pointer"
                                >
                                    <option value="all">Familles (Toutes)</option>
                                    {filterOptions.families.map(f => <option key={f} value={f}>{f}</option>)}
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M6 9l6 6 6-6" /></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <ul className="max-h-60 overflow-y-auto custom-scrollbar bg-slate-900/40">
                        {filteredTasks.map(task => {
                            const isSelected = selectedIds.includes(task.id);
                            return (
                                <li
                                    key={task.id}
                                    onClick={() => handleToggle(task.id)}
                                    className={`px-4 py-3 hover:bg-white/5 cursor-pointer flex items-center justify-between border-b border-white/5 last:border-0 transition-all group/item ${isSelected ? 'bg-blue-500/5' : ''}`}
                                >
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-white/10 group-hover/item:border-white/20'}`}>
                                            {isSelected && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M20 6 9 17l-5-5" /></svg>}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className={`text-[11px] font-bold truncate transition-colors ${isSelected ? 'text-white' : 'text-slate-400 group-hover/item:text-slate-200'}`}>
                                                {task['GLOBAL TASKS']}
                                            </span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] font-black uppercase tracking-tighter text-slate-600 bg-white/5 px-1.5 py-0.5 rounded-md leading-none">{task['Nom Equipement']}</span>
                                                <span className="text-[8px] font-bold text-slate-500/50 uppercase tracking-widest">{task.DISCIPLINE}</span>
                                            </div>
                                        </div>
                                    </div>
                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>}
                                </li>
                            );
                        })}
                        {filteredTasks.length === 0 && (
                            <li className="px-4 py-8 text-center bg-transparent">
                                <div className="flex flex-col items-center gap-2 opacity-20">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21-4.3-4.3" /><circle cx="11" cy="11" r="8" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
                                    <span className="text-[10px] font-black uppercase tracking-widest">Aucun résultat</span>
                                </div>
                            </li>
                        )}
                    </ul>
                    <div className="bg-white/5 p-3 flex justify-between items-center border-t border-white/5">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-2">{filteredTasks.length} Tâches trouvées</span>
                        {selectedIds.length > 0 && (
                            <button onClick={() => onChange([])} className="text-[9px] font-black text-red-400 uppercase tracking-widest hover:text-red-300 px-2 py-1 transition-colors">Réinitialiser</button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
