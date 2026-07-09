
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { SchedulingTaskData, ShutdownParams, ScheduledTask, CalculationResults, DataHealthIssue } from '../types';
import { exportPreparationsToPDF } from '../services/preparationsPdfExportService';
import { TheoreticalTeamTasksModal } from './TheoreticalTeamTasksModal';
import { exportToXLSX } from '../services/specialListXlsxExportService';
import { calculateSchedule } from '../services/schedulingService';
import { AdvancedKPIs } from './AdvancedKPIs';

interface CriticalPathModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: SchedulingTaskData[];
}

const formatDateModal = (date: Date | null) => {
  if (!date) return '-';
  return date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

const CriticalPathModal: React.FC<CriticalPathModalProps> = ({ isOpen, onClose, tasks }) => {
  if (!isOpen) return null;

  const { sortedTasks, totalDurationSum } = useMemo(() => {
    const sorted = [...tasks].sort((a, b) => (a['START DATE']?.getTime() || 0) - (b['START DATE']?.getTime() || 0));
    const sum = sorted.reduce((acc, task) => acc + task.DUREE, 0);
    return { sortedTasks: sorted, totalDurationSum: sum };
  }, [tasks]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[70] p-4" onClick={onClose}>
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-700" onClick={e => e.stopPropagation()}>
        <header className="flex justify-between items-center p-4 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">Détail du Chemin Critique Estimé</h2>
            <p className="text-sm text-slate-400">Somme des durées des tâches sur le chemin : <span className="font-bold text-rose-400">{totalDurationSum.toFixed(2)}h</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
        </header>
        <main className="p-6 overflow-y-auto">
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-700/50 text-slate-300">
                <tr>
                  <th className="px-3 py-2 font-semibold">Action</th>
                  <th className="px-3 py-2 font-semibold">Équipement</th>
                  <th className="px-3 py-2 font-semibold">Début</th>
                  <th className="px-3 py-2 font-semibold">Fin</th>
                  <th className="px-3 py-2 font-semibold text-right">Durée (H)</th>
                </tr>
              </thead>
              <tbody>
                {sortedTasks.map(task => (
                  <tr key={task.id} className="border-b border-slate-700 last:border-b-0 hover:bg-slate-700/40">
                    <td className="px-3 py-2 text-slate-200">{task['GLOBAL TASKS']}</td>
                    <td className="px-3 py-2 text-slate-300">{task['Nom Equipement']}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateModal(task['START DATE'])}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateModal(task['END DATE'])}</td>
                    <td className="px-3 py-2 text-right font-mono">{task.DUREE.toFixed(2)}</td>
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

// --- Preview Modal Component for Preparations PDF ---
interface PreparationsPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: SchedulingTaskData[];
  onExport: () => Promise<void>;
  onExportXLSX: () => void;
}

const PreparationsPreviewModal: React.FC<PreparationsPreviewModalProps> = ({ isOpen, onClose, tasks, onExport, onExportXLSX }) => {
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport();
    } catch (e) {
      console.error("Failed to export preparations PDF from preview:", e);
      alert("Une erreur est survenue lors de l'export du PDF des préparatifs.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[80] p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="preparations-preview-title"
    >
      <div
        className="bg-slate-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col border border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
          <h2 id="preparations-preview-title" className="text-xl font-bold text-white flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><line x1="9" y1="12" x2="15" y2="12"></line><line x1="9" y1="16" x2="15" y2="16"></line></svg>
            <span>Liste des Préparatifs J-1</span>
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={onExportXLSX}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors shadow-md text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
              <span>Télécharger XLSX</span>
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors shadow-md text-sm"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Export...</span>
                </>
              ) : ('Télécharger PDF')}
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 transition-colors" aria-label="Fermer">
              &times;
            </button>
          </div>
        </header>
        <main className="p-6 overflow-auto space-y-4">
          <p className="text-slate-300 text-sm">
            Voici la liste des tâches nécessitant des préparatifs spécifiques. Ce document est destiné à être utilisé la veille de l'intervention (J-1) pour s'assurer que tout le matériel et toutes les conditions sont en place.
          </p>
          <div className="overflow-x-auto rounded-md border border-slate-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-700/50 text-slate-300 uppercase">
                <tr>
                  <th className="p-3 font-semibold">Équipement</th>
                  <th className="p-3 font-semibold">Action</th>
                  <th className="p-3 font-semibold">AVIS</th>
                  <th className="p-3 font-semibold">Préparatifs</th>
                </tr>
              </thead>
              <tbody>
                {tasks.sort((a, b) => String(a['Nom Equipement']).localeCompare(String(b['Nom Equipement']))).map(task => (
                  <tr key={task.id} className="border-t border-slate-700">
                    <td className="p-3 text-slate-200">{task['Nom Equipement']}</td>
                    <td className="p-3">{task['GLOBAL TASKS']}</td>
                    <td className="p-3">{task.AVIS || '-'}</td>
                    <td className="p-3 whitespace-pre-wrap">
                      {task['Préparatifs'] ? String(task['Préparatifs']).split('<AND>').map((p, i) => (
                        <div key={i} className="mb-1 last:mb-0">➢ {p.trim()}</div>
                      )) : '-'}
                    </td>
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


export interface ProjectDashboardProps {
  tasks: SchedulingTaskData[];
  shutdownParams: ShutdownParams;
  onModifyParams: () => void;
  onStartScheduling: () => void;
  onBack: () => void;
  // Prop passed from parent to allow rendering the DataHealth status
  results?: CalculationResults;
  onNavigateToPortal?: () => void;
}

interface KpiDetail {
  label: string;
  value: string | number;
  progress?: number;
  color?: string;
}

const KpiCard: React.FC<{
  title: string;
  value: string;
  subtitle?: string;
  valueColor?: string;
  className?: string;
  action?: React.ReactNode;
  details?: KpiDetail[];
}> = ({ title, value, subtitle, valueColor = 'text-white', className = '', action, details }) => (
  <div className={`bg-white/[0.03] border border-white/5 p-8 rounded-[2rem] shadow-2xl relative flex flex-col group transition-all hover:bg-white/[0.05] ${className}`}>
    <div className="flex justify-between items-start mb-6">
      <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{title}</p>
      {action}
    </div>
    <div className="mb-4">
      <p className={`text-3xl font-black italic tracking-tighter ${valueColor}`}>{value}</p>
      {subtitle && <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest mt-2">{subtitle}</p>}
    </div>

    {details && details.length > 0 && (
      <div className="mt-6 pt-6 border-t border-white/5 w-full">
        <div className="max-h-48 overflow-y-auto custom-scrollbar pr-2 space-y-4">
          {details.map((detail, idx) => (
            <div key={idx} className="group/item">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-slate-400 truncate pr-4 uppercase tracking-wider">{detail.label}</span>
                <span className="text-[10px] font-black text-white bg-white/5 px-2 py-1 rounded-lg tabular-nums">{detail.value}</span>
              </div>
              {detail.progress !== undefined && (
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(255,255,255,0.2)] ${detail.color || 'bg-blue-500'}`}
                    style={{ width: `${Math.min(100, Math.max(0, detail.progress))}%` }}
                  ></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);

// --- NEW COMPONENT: Data Health Modal ---
const DataHealthModal: React.FC<{ isOpen: boolean; onClose: () => void; health: CalculationResults['dataHealth'] }> = ({ isOpen, onClose, health }) => {
  if (!isOpen || !health) return null;

  const criticalCount = health.issues.filter(i => i.severity === 'critical').length;
  // const warningCount = health.issues.filter(i => i.severity === 'warning').length; // Unused variable removed

  // Helper to format values for display (truncate long strings, handle objects)
  const formatValue = (v: any) => {
    if (v === null || v === undefined) return '<Vide>';
    const str = String(v);
    return str.length > 20 ? str.substring(0, 20) + '...' : str;
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex justify-center items-center z-[100] p-4 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-slate-900 rounded-lg shadow-2xl w-full max-w-5xl border border-slate-700 overflow-hidden animate-fade-up-fast flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <header className="bg-slate-800 p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-4">
            {health.status === 'clean' ? (
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center animate-pulse">
                <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-white">Rapport d'Intégrité des Données</h2>
              <p className="text-xs text-slate-400">Score de Qualité: <span className={`${health.score > 80 ? 'text-emerald-400' : (health.score > 50 ? 'text-yellow-400' : 'text-red-400')} font-bold`}>{health.score}/100</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 transition-colors">&times;</button>
        </header>

        <div className="p-0 flex-1 overflow-hidden flex flex-col">
          {health.status === 'clean' ? (
            <div className="text-center py-16 px-8">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 mb-6">
                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"></path></svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Données Saines</h3>
              <p className="text-slate-400 max-w-md mx-auto">Aucune anomalie critique détectée. Votre fichier Excel est parfaitement formaté pour le calcul.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="p-4 bg-slate-800/50 border-b border-slate-700 flex-shrink-0">
                <p className="text-sm text-slate-300">
                  PlanneX a détecté <strong>{health.issues.length}</strong> problèmes.
                  {criticalCount > 0 && <span className="ml-1 text-red-400">dont {criticalCount} critique(s).</span>}
                </p>
                <div className="flex gap-4 mt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-red-500/20 border border-red-500/50"></span>
                    <span className="text-slate-400">Critique (Bloquant/Exclu)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-yellow-500/20 border border-yellow-500/50"></span>
                    <span className="text-slate-400">Avertissement (Corrigé Auto)</span>
                  </div>
                </div>
              </div>

              <div className="overflow-auto flex-1">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-900 text-slate-400 uppercase text-xs font-semibold sticky top-0 z-10 shadow-md">
                    <tr>
                      <th className="p-3 w-10 text-center">#</th>
                      <th className="p-3 w-20">Ligne Excel</th>
                      <th className="p-3 w-24">Champ</th>
                      <th className="p-3">Tâche</th>
                      <th className="p-3 text-center">Valeur Origine</th>
                      <th className="p-3 text-center">Valeur Utilisée</th>
                      <th className="p-3">Problème</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {health.issues.map((issue, idx) => (
                      <tr key={idx} className={`hover:bg-slate-800/30 transition-colors ${issue.severity === 'critical' ? 'bg-red-900/10' : ''}`}>
                        <td className="p-3 text-center text-slate-500">{idx + 1}</td>
                        <td className="p-3 font-mono text-slate-300 font-bold">{issue.rowNumber > 0 ? issue.rowNumber : '-'}</td>
                        <td className="p-3 font-semibold text-slate-400">{issue.field}</td>
                        <td className="p-3 text-slate-300 font-medium truncate max-w-[200px]" title={issue.taskName}>{issue.taskName || 'Tâche Inconnue'}</td>
                        <td className="p-3 text-center font-mono text-slate-400 text-xs bg-slate-800/50 rounded mx-1">
                          {formatValue(issue.originalValue)}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`font-mono font-bold px-2 py-1 rounded text-xs ${issue.severity === 'critical' ? 'text-red-500 bg-red-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                            {issue.value}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold border ${issue.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'}`}>
                            {issue.severity === 'critical' && <svg className="w-3 h-3" fill="none" viewBox="0 0 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>}
                            {issue.reason}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        <footer className="p-4 bg-slate-800 border-t border-slate-700 flex justify-end">
          <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-6 rounded-md transition-colors">
            Fermer
          </button>
        </footer>
      </div>
    </div>
  );
}

// --- ADDED EstimationPanel ---
interface EstimationPanelProps {
  tasks: SchedulingTaskData[];
  shutdownParams: ShutdownParams;
  onOpenTheoreticalTasksModal: (data: { teamName: string; tasks: SchedulingTaskData[] }) => void;
}

const EstimationPanel: React.FC<EstimationPanelProps> = ({ tasks, shutdownParams, onOpenTheoreticalTasksModal }) => {
  const teamsData = useMemo(() => {
    const teams: Record<string, SchedulingTaskData[]> = {};
    tasks.forEach(t => {
      const team = t.DISCIPLINE || 'Sans Discipline';
      if (!teams[team]) teams[team] = [];
      teams[team].push(t);
    });

    return Object.entries(teams).map(([name, teamTasks]) => {
      // Simple estimation: sum of durations (assuming sequential if 1 person)
      // But usually we look at total man hours
      const totalManHours = teamTasks.reduce((sum, t) => sum + (t['Heures-Homme'] || t.DUREE * t.EFFECTIF), 0);
      const count = teamTasks.length;
      const maxEffectif = Math.max(0, ...teamTasks.map(t => t.EFFECTIF));

      return { name, count, totalManHours, maxEffectif, tasks: teamTasks };
    }).sort((a, b) => b.totalManHours - a.totalManHours);
  }, [tasks]);

  const start = new Date(shutdownParams.shutdownStart);
  const end = new Date(shutdownParams.shutdownEnd);
  const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">Estimation par Discipline</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="bg-slate-900/50 text-xs uppercase font-semibold text-slate-400">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Discipline</th>
                <th className="px-4 py-3 text-right">Tâches</th>
                <th className="px-4 py-3 text-right">H-H Totales</th>
                <th className="px-4 py-3 text-right rounded-r-lg">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {teamsData.map((team) => (
                <tr key={team.name} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{team.name}</td>
                  <td className="px-4 py-3 text-right">{team.count}</td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-400">{team.totalManHours.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onOpenTheoreticalTasksModal({ teamName: team.name, tasks: team.tasks })}
                      className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded transition-colors"
                    >
                      Voir Tâches
                    </button>
                  </td>
                </tr>
              ))}
              {teamsData.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">
                    Aucune tâche importée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-slate-800 p-6 rounded-lg shadow-lg border border-slate-700">
        <h3 className="text-lg font-bold text-white mb-4">Fenêtre de l'Arrêt</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
            <span className="text-slate-500 block text-xs uppercase tracking-wider mb-1">Début</span>
            <span className="text-white font-mono text-lg">{start.toLocaleString('fr-FR')}</span>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
            <span className="text-slate-500 block text-xs uppercase tracking-wider mb-1">Fin</span>
            <span className="text-white font-mono text-lg">{end.toLocaleString('fr-FR')}</span>
          </div>
          <div className="col-span-1 md:col-span-2 bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-lg border border-slate-700/50 flex justify-between items-center">
            <span className="text-slate-400 text-xs uppercase tracking-wider">Durée Totale Disponible</span>
            <span className="text-2xl font-bold text-white">{durationHours.toFixed(1)} h</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ tasks, shutdownParams, onModifyParams, onStartScheduling, onBack, results, onNavigateToPortal }) => {
  const [isCriticalPathModalOpen, setIsCriticalPathModalOpen] = useState(false);
  const [isPreparationsPreviewOpen, setIsPreparationsPreviewOpen] = useState(false);
  const [theoreticalTasksModalData, setTheoreticalTasksModalData] = useState<{ teamName: string, tasks: SchedulingTaskData[] } | null>(null);
  const [isDataHealthModalOpen, setIsDataHealthModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const tasksWithPreparations = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(t => t['Préparatifs'] && String(t['Préparatifs']).trim() !== '' && String(t['Préparatifs']).trim() !== '0');
  }, [tasks]);

  const handleExportPreparations = async () => {
    if (tasksWithPreparations.length === 0) return;
    try {
      await exportPreparationsToPDF(tasksWithPreparations);
    } catch (e) {
      console.error("Failed to export preparations PDF:", e);
      if (e instanceof Error) {
        alert(e.message);
      } else {
        alert("Une erreur est survenue lors de l'export du PDF des préparatifs.");
      }
    }
  };

  const handleExportPreparationsXLSX = () => {
    if (tasksWithPreparations.length === 0) return;
    exportToXLSX(tasksWithPreparations, `Preparatifs_J-1_${new Date().toISOString().split('T')[0]}`, 'preparations');
  };

  const calculationResults = useMemo(() => {
    // Use the 'results' prop if available, otherwise calculate
    if (results) return results;

    return calculateSchedule(tasks, {
      shutdownStart: shutdownParams.shutdownStart,
      shutdownEnd: shutdownParams.shutdownEnd,
      consignation: 0, deconsignation: 0, combustion: { mode: 'parallel', value: 0 }, demarrage: 0
    }) as CalculationResults;
  }, [tasks, shutdownParams, results]);

  const {
    totalTasks,
    totalManHours,
    shutdownDurationHours,
    scheduledTasksCount,
    advancement,
    createdTeamCount,
    criticalPathEstHours,
    criticalPathTasks,
    disciplineStats,
    dataHealth
  } = useMemo(() => {
    const start = new Date(shutdownParams.shutdownStart);
    const end = new Date(shutdownParams.shutdownEnd);
    const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    const scheduled = tasks.filter(t => t.isScheduled && t['START DATE'] && t['END DATE']);
    const uniqueTeams = new Set(scheduled.map(t => `${t.DISCIPLINE} ${t["TYPE D'EQUIPE"]}`).filter(t => t.trim() !== ''));

    const pinnedTasks = tasks.filter(task => task.isKeyEvent === true);
    const totalPinnedDuration = pinnedTasks.reduce((sum, task) => sum + task.DUREE, 0);

    const stats: Record<string, { totalTasks: number, scheduledTasks: number, manHours: number, teams: Set<string> }> = {};

    tasks.forEach(t => {
      const discipline = t.DISCIPLINE || 'Sans Discipline';
      if (!stats[discipline]) {
        stats[discipline] = { totalTasks: 0, scheduledTasks: 0, manHours: 0, teams: new Set() };
      }
      stats[discipline].totalTasks++;
      const safeHH = (t.DUREE * t.EFFECTIF);
      stats[discipline].manHours += safeHH;

      if (t.isScheduled && t['START DATE'] && t['END DATE']) {
        stats[discipline].scheduledTasks++;
      }
      if (t["TYPE D'EQUIPE"]) {
        stats[discipline].teams.add(t["TYPE D'EQUIPE"]);
      }
    });

    const sortedDisciplines = Object.entries(stats).sort((a, b) => b[1].totalTasks - a[1].totalTasks);

    const taskDetails = sortedDisciplines.map(([d, s]) => ({ label: d, value: s.totalTasks }));
    const manHourDetails = sortedDisciplines.map(([d, s]) => ({ label: d, value: s.manHours.toFixed(0) }));
    const advancementDetails = sortedDisciplines.map(([d, s]) => {
      const p = s.totalTasks > 0 ? (s.scheduledTasks / s.totalTasks) * 100 : 0;
      return { label: d, value: p.toFixed(0) + '%', progress: p, color: p === 100 ? 'bg-emerald-500' : 'bg-blue-500' };
    });
    const teamDetails = sortedDisciplines.map(([d, s]) => ({ label: d, value: s.teams.size }));

    return {
      totalTasks: tasks.length,
      totalManHours: calculationResults.kpis.totalManHours,
      shutdownDurationHours: duration > 0 ? duration : 0,
      scheduledTasksCount: scheduled.length,
      advancement: tasks.length > 0 ? (scheduled.length / tasks.length) * 100 : 0,
      createdTeamCount: uniqueTeams.size,
      criticalPathEstHours: totalPinnedDuration,
      criticalPathTasks: pinnedTasks,
      disciplineStats: {
        tasks: taskDetails,
        manHours: manHourDetails,
        advancement: advancementDetails,
        teams: teamDetails
      },
      dataHealth: calculationResults.dataHealth
    };
  }, [tasks, shutdownParams, calculationResults]);

  return (
    <div className="min-h-screen bg-[#06080C] p-4 sm:p-6 lg:p-8">
      {/* -------------------- ACTIONS HAUT DU DASHBOARD -------------------- */}
      <div className="mb-8 flex justify-end gap-4 relative z-50">
        {dataHealth && dataHealth.status !== 'clean' && (
          <button
            onClick={() => setIsDataHealthModalOpen(true)}
            className="group relative bg-white/[0.03] hover:bg-white/10 text-slate-400 hover:text-red-400 font-black py-3 px-6 rounded-xl border border-white/5 transition-all overflow-hidden text-[10px] uppercase tracking-widest whitespace-nowrap"
          >
            <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500/50 animate-ping"></span>
              <span>Santé Données ({dataHealth.score}%)</span>
            </div>
          </button>
        )}
      </div>

      {/* -------------------- KPIS PRINCIPAUX -------------------- */}
      <AdvancedKPIs tasks={tasks} shutdownParams={shutdownParams} />

      <CriticalPathModal
        isOpen={isCriticalPathModalOpen}
        onClose={() => setIsCriticalPathModalOpen(false)}
        tasks={criticalPathTasks}
      />
      <PreparationsPreviewModal
        isOpen={isPreparationsPreviewOpen}
        onClose={() => setIsPreparationsPreviewOpen(false)}
        tasks={tasksWithPreparations}
        onExport={handleExportPreparations}
        onExportXLSX={handleExportPreparationsXLSX}
      />
      <TheoreticalTeamTasksModal
        isOpen={!!theoreticalTasksModalData}
        onClose={() => setTheoreticalTasksModalData(null)}
        teamName={theoreticalTasksModalData?.teamName || ''}
        tasks={theoreticalTasksModalData?.tasks || []}
      />
      <DataHealthModal
        isOpen={isDataHealthModalOpen}
        onClose={() => setIsDataHealthModalOpen(false)}
        health={dataHealth}
      />
    </div>
  );
};
