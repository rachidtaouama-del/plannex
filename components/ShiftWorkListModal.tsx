
import React, { useMemo } from 'react';
import type { ScheduledTask, AppParameters } from '../types';

interface ShiftWorkListModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: ScheduledTask[];
  onBack: () => void;
  parameters: AppParameters;
}

const formatDate = (date: Date): string => {
    return date.toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

export const ShiftWorkListModal: React.FC<ShiftWorkListModalProps> = ({ isOpen, onClose, tasks, onBack }) => {
    if (!isOpen) return null;

    const groupedTasks = useMemo(() => {
        const byFamily: Record<string, ScheduledTask[]> = {};
        tasks.forEach(task => {
            const family = task.family || 'Sans Famille';
            if (!byFamily[family]) {
                byFamily[family] = [];
            }
            byFamily[family].push(task);
        });
        
        // Sort tasks within each family by start time
        for (const family in byFamily) {
            byFamily[family].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        }

        return Object.entries(byFamily).sort(([a], [b]) => a.localeCompare(b));
    }, [tasks]);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4" 
            onClick={onClose}
        >
            <div 
                className="bg-slate-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[90vh] flex flex-col border border-slate-700" 
                onClick={e => e.stopPropagation()}
            >
                <header className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <span>Liste des Tâches Planifiées</span>
                    </h2>
                    <div className="flex items-center gap-4">
                        <button onClick={onBack} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors shadow-md text-sm">
                            Retour
                        </button>
                        <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 transition-colors" aria-label="Fermer">
                            &times;
                        </button>
                    </div>
                </header>
                <main className="p-6 overflow-auto space-y-8">
                    {groupedTasks.length === 0 ? (
                        <p className="text-slate-400 text-center py-12">Aucune tâche à afficher pour la période sélectionnée.</p>
                    ) : (
                        groupedTasks.map(([familyName, familyTasks]) => (
                            <div key={familyName}>
                                <h3 className="text-lg font-bold text-blue-400 mb-3 border-b-2 border-slate-700 pb-2">{familyName.toUpperCase()}</h3>
                                <div className="overflow-x-auto rounded-md border border-slate-700">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-slate-700/50 text-slate-300 uppercase">
                                            <tr>
                                                <th className="p-3 font-semibold">Action</th>
                                                <th className="p-3 font-semibold">OT</th>
                                                <th className="p-3 font-semibold">Avis</th>
                                                <th className="p-3 font-semibold">Équipement</th>
                                                <th className="p-3 font-semibold">Discipline</th>
                                                <th className="p-3 font-semibold">Type de Maintenance</th>
                                                <th className="p-3 font-semibold">Début</th>
                                                <th className="p-3 font-semibold">Fin</th>
                                                <th className="p-3 font-semibold text-right">Pers.</th>
                                                <th className="p-3 font-semibold text-right">Durée (h)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {familyTasks.map(task => (
                                                <tr key={task.id} className="border-t border-slate-700">
                                                    <td className="p-3 text-slate-200 whitespace-normal">{task.action}</td>
                                                    <td className="p-3">{task.ot}</td>
                                                    <td className="p-3">{task.avis}</td>
                                                    <td className="p-3">{task.equipment}</td>
                                                    <td className="p-3">{task.discipline}</td>
                                                    <td className="p-3">{task.maintenanceType}</td>
                                                    <td className="p-3">{formatDate(task.startTime)}</td>
                                                    <td className="p-3">{formatDate(task.endTime)}</td>
                                                    <td className="p-3 text-right font-mono">{task.manpower}</td>
                                                    <td className="p-3 text-right font-mono">{task.duration.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))
                    )}
                </main>
            </div>
        </div>
    );
};
