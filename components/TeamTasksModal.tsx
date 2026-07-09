
import React from 'react';
import type { SchedulingTaskData } from '../types';

interface TeamTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  tasks: SchedulingTaskData[];
}

export const TeamTasksModal: React.FC<TeamTasksModalProps> = ({ isOpen, onClose, teamName, tasks }) => {
  if (!isOpen) return null;

  const sortedTasks = [...tasks].sort((a, b) => (a['START DATE']?.getTime() || 0) - (b['START DATE']?.getTime() || 0));

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 lg:p-12 pointer-events-none">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 pointer-events-auto"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-6xl max-h-[85vh] bg-slate-900 border border-white/10 rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-300 pointer-events-auto shadow-2xl">
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse"></div>
              <h2 className="text-xl font-black text-white uppercase tracking-[0.2em]">Rapport Opérationnel</h2>
            </div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
              Détail des Tâches : <span className="text-emerald-400 font-black">{teamName}</span> &bull; {tasks.length} Opérations
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all border border-white/5 active:scale-90"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <main className="flex-grow overflow-y-auto p-6 custom-scrollbar bg-slate-950/20">
          <div className="overflow-hidden rounded-3xl border border-white/5 bg-slate-950/40 backdrop-blur-sm shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5">
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">Action Opérationnelle</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">Équipement</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Début Tactique</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Fin Tactique</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">Durée (H/H)</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">PAX</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedTasks.map(task => (
                  <tr key={task.id} className="group hover:bg-white/[0.03] transition-colors">
                    <td className="px-6 py-5">
                      <div className="text-xs font-black text-slate-200 group-hover:text-white transition-colors uppercase leading-relaxed max-w-md">
                        {task['GLOBAL TASKS']}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500/30"></div>
                        <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tight group-hover:text-blue-400 transition-colors">
                          {task['Nom Equipement']}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="text-[10px] font-black text-emerald-400 tabular-nums uppercase">
                        {task['START DATE'] ? task['START DATE'].toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <div className="text-[10px] font-black text-amber-500 tabular-nums uppercase">
                        {task['END DATE'] ? task['END DATE'].toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="text-xs font-black text-slate-200 tabular-nums">
                        {task.DUREE.toFixed(1)} <span className="text-[8px] text-slate-600 font-bold uppercase ml-1">HRS</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="inline-flex items-center justify-center bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full border border-blue-500/20 text-[10px] font-black tabular-nums">
                        {task.EFFECTIF} <span className="text-[8px] ml-1 opacity-50">PX</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedTasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-600"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Aucune mission tactique identifiée.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </main>

        {/* Footer */}
        <div className="p-8 border-t border-white/5 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-white/5 text-slate-300 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-white/10 hover:text-white border border-white/5 transition-all shadow-lg active:scale-95"
          >
            Fermer le Rapport
          </button>
        </div>
      </div>
    </div>
  );
};
