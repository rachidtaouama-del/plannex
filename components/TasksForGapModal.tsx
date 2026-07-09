
import React, { useState, useMemo } from 'react';
import type { SchedulingTaskData } from '../types';

interface TasksForGapModalProps {
    isOpen: boolean;
    onClose: () => void;
    gapDuration: number;
    allTasks: SchedulingTaskData[];
    discipline: string | null;
}

export const TasksForGapModal: React.FC<TasksForGapModalProps> = ({ isOpen, onClose, gapDuration, allTasks, discipline }) => {
    const [copiedTaskId, setCopiedTaskId] = useState<number | null>(null);

    const compatibleTasks = useMemo(() => {
        let tasks = allTasks.filter(task => !task.isScheduled && task.DUREE <= gapDuration);
        
        if (discipline) {
            tasks = tasks.filter(t => t.DISCIPLINE === discipline);
        }

        // Sort by duration descending to show tasks closest to the gap duration first
        return tasks.sort((a, b) => b.DUREE - a.DUREE);
    }, [allTasks, gapDuration, discipline]);

    if (!isOpen) return null;

    const handleCopy = (task: SchedulingTaskData) => {
        navigator.clipboard.writeText(task['GLOBAL TASKS']);
        setCopiedTaskId(task.id);
        setTimeout(() => setCopiedTaskId(null), 2000); // Reset after 2 seconds
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[70] p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-700" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-white">Tâches compatibles {discipline ? `(${discipline})` : ''}</h2>
                        <p className="text-sm text-slate-400">Pour un créneau de {gapDuration.toFixed(2)}h</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
                </header>
                <main className="p-6 overflow-y-auto">
                    <ul className="space-y-2">
                        {compatibleTasks.map(task => (
                            <li key={task.id} className="flex items-center p-3 bg-slate-700 rounded-md">
                                <div className="flex-grow">
                                    <p className="font-semibold text-slate-200">{task['GLOBAL TASKS']}</p>
                                    <p className="text-xs text-slate-400">{task['Nom Equipement']}</p>
                                </div>
                                <div className="text-right mr-4">
                                    <p className="font-mono text-slate-200">{task.DUREE.toFixed(2)}h</p>
                                    <p className="text-xs text-slate-400">{task.DISCIPLINE}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleCopy(task)}
                                    className="bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-1 px-3 rounded w-20 text-center transition-colors"
                                >
                                    {copiedTaskId === task.id ? 'Copié!' : 'Copier'}
                                </button>
                            </li>
                        ))}
                    </ul>
                    {compatibleTasks.length === 0 && <p className="text-center text-slate-400 py-4">Aucune tâche non planifiée {discipline ? `de type ${discipline}` : ''} ne correspond à ce créneau.</p>}
                </main>
            </div>
        </div>
    );
};
