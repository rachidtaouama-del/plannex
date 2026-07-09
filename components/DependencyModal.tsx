
import React, { useState, useMemo } from 'react';
import type { SchedulingTaskData } from '../types';

interface DependencyModalProps {
    isOpen: boolean;
    onClose: () => void;
    allTasks: SchedulingTaskData[];
    taskToView: SchedulingTaskData | null;
}

const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return date.toLocaleString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
};

const SearchableTaskList: React.FC<{ title: string; tasks: SchedulingTaskData[]; }> = ({ title, tasks }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredTasks = useMemo(() => {
        if (!searchTerm) return tasks;
        return tasks.filter(task => 
            task['GLOBAL TASKS'].toLowerCase().includes(searchTerm.toLowerCase()) ||
            task['Nom Equipement'].toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [tasks, searchTerm]);

    return (
        <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{title}</label>
            <div className="bg-slate-700 border-slate-600 rounded-md">
                <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full px-3 py-2 text-slate-200 flex justify-between items-center text-left">
                    <span>{tasks.length} tâche(s)</span>
                    <svg className={`w-4 h-4 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                {isOpen && (
                    <div className="p-2 border-t border-slate-600">
                        <input 
                            type="search" 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            placeholder="Rechercher..." 
                            className="w-full bg-slate-900 border-slate-600 rounded px-2 py-1 text-sm text-slate-200 mb-2" 
                        />
                        <ul className="max-h-60 overflow-y-auto text-sm text-slate-200 custom-scrollbar">
                            {filteredTasks.map(task => (
                                <li key={task.id} className="px-3 py-2 rounded hover:bg-slate-600 border-b border-slate-600/50 last:border-0 transition-colors">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="flex-grow min-w-0">
                                            <div className="font-semibold text-slate-200 truncate" title={task['GLOBAL TASKS']}>
                                                {task['GLOBAL TASKS']}
                                            </div>
                                            <div className="text-xs text-slate-400 truncate" title={task['Nom Equipement']}>
                                                {task['Nom Equipement']}
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 text-right">
                                            <div className="text-xs font-mono text-slate-300">
                                                {task['START DATE'] ? formatDate(task['START DATE']) : <span className="text-slate-500 italic">Non planifié</span>}
                                            </div>
                                            {task['END DATE'] && (
                                                <div className="text-xs font-mono text-slate-400">
                                                    → {formatDate(task['END DATE'])}
                                                </div>
                                            )}
                                            <div className="text-xs font-bold text-emerald-400 mt-0.5">
                                                {task.DUREE.toFixed(2)}h
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                            {filteredTasks.length === 0 && <li className="px-2 py-2 text-slate-400 text-center">Aucune tâche trouvée.</li>}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};


export const DependencyModal: React.FC<DependencyModalProps> = ({ isOpen, onClose, allTasks, taskToView }) => {
    
    const { predecessorTasks, successorTasks } = useMemo(() => {
        if (!taskToView) return { predecessorTasks: [], successorTasks: [] };
        
        const predecessors = (taskToView.predecessor || [])
            .map(id => allTasks.find(t => t.id === id))
            .filter((t): t is SchedulingTaskData => !!t);
            
        const successors = allTasks.filter(t => t.predecessor?.includes(taskToView.id));

        return { predecessorTasks: predecessors, successorTasks: successors };

    }, [taskToView, allTasks]);


    if (!isOpen || !taskToView) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[70] p-4" onClick={onClose} role="dialog" aria-modal="true">
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl border border-slate-700" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-bold text-white truncate pr-4">
                        Détails des Dépendances
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
                </header>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1">Tâche</label>
                        <div className="w-full bg-slate-900/50 border-slate-600 rounded-md px-3 py-2 text-slate-200 font-bold" title={taskToView['GLOBAL TASKS']}>
                           <p className="truncate">{taskToView['GLOBAL TASKS']}</p>
                           <p className="text-xs text-slate-400 font-normal truncate">{taskToView['Nom Equipement']}</p>
                           <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-700">
                                <div className="text-xs font-mono text-slate-300">
                                    {taskToView['START DATE'] ? formatDate(taskToView['START DATE']) : '-'} → {taskToView['END DATE'] ? formatDate(taskToView['END DATE']) : '-'}
                                </div>
                                <div className="text-xs font-bold text-emerald-400">{taskToView.DUREE.toFixed(2)}h</div>
                           </div>
                        </div>
                    </div>
                    
                    <SearchableTaskList title="Prédécesseurs (Tâches qui doivent finir avant)" tasks={predecessorTasks} />
                    
                    <SearchableTaskList title="Successeurs (Tâches qui commenceront après)" tasks={successorTasks} />
                    
                    <div className="flex justify-end pt-4 border-t border-slate-700">
                        <button type="button" onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-6 rounded-md transition-colors">
                            Fermer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
