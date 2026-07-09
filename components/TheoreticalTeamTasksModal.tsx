
import React from 'react';
import type { SchedulingTaskData } from '../types';

interface TheoreticalTeamTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  tasks: SchedulingTaskData[];
}

const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export const TheoreticalTeamTasksModal: React.FC<TheoreticalTeamTasksModalProps> = ({ isOpen, onClose, teamName, tasks }) => {
  if (!isOpen) return null;

  const sortedTasks = [...tasks].sort((a, b) => (a['START DATE']?.getTime() || 0) - (b['START DATE']?.getTime() || 0));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[70] p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-slate-700" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white truncate pr-4">Tâches Théoriques pour : {teamName}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
        </header>
        <main className="p-6 overflow-y-auto">
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-700/50 text-slate-300">
                <tr>
                  <th className="px-3 py-2 font-semibold">Action</th>
                  <th className="px-3 py-2 font-semibold">Équipement</th>
                  <th className="px-3 py-2 font-semibold">Début Estimé</th>
                  <th className="px-3 py-2 font-semibold">Fin Estimée</th>
                  <th className="px-3 py-2 font-semibold text-right">Durée (H)</th>
                  <th className="px-3 py-2 font-semibold text-right">Effectif</th>
                  <th className="px-3 py-2 font-semibold text-right">Heures-Homme</th>
                </tr>
              </thead>
              <tbody>
                {sortedTasks.map(task => (
                  <tr key={task.id} className="border-b border-slate-700 last:border-b-0 hover:bg-slate-700/40">
                    <td className="px-3 py-2 text-slate-200">{task['GLOBAL TASKS']}</td>
                    <td className="px-3 py-2 text-slate-300">{task['Nom Equipement']}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(task['START DATE'])}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDate(task['END DATE'])}</td>
                    <td className="px-3 py-2 text-right font-mono">{task.DUREE.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right font-mono">{task.EFFECTIF}</td>
                    <td className="px-3 py-2 text-right font-mono">{task['Heures-Homme'].toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>
    </div>
  );
};
