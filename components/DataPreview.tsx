// FIX: Removed concatenated file content from the end of the file.
import React from 'react';
import type { EvaluationData, EvaluationKpis, CalculationResults } from '../types';

const calculateDuration = (startStr: string, endStr: string): number | null => {
    if (!startStr || !endStr) return null;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return null;
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};

const formatDuration = (hours: number | null): string => {
    return hours !== null ? `${hours.toFixed(2)}h` : '-';
};

const KpiCard: React.FC<{ title: string; value: string; subtitle?: string; valueColor?: string }> = ({ title, value, subtitle, valueColor = 'text-white' }) => (
  <div className="bg-slate-900/50 p-4 rounded-lg flex flex-col items-center justify-center text-center h-full">
    <p className="text-sm text-slate-400">{title}</p>
    <p className={`text-4xl font-bold mt-2 ${valueColor}`}>{value}</p>
    {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
  </div>
);


interface DataPreviewProps {
    evaluationData: EvaluationData;
    evaluationKpis: EvaluationKpis;
    results: CalculationResults;
}

export const DataPreview: React.FC<DataPreviewProps> = ({ evaluationData, evaluationKpis, results }) => {
    return (
        <div className="space-y-6 text-slate-300 animate-fade-in">
            {/* --- Performance Summary --- */}
            <section className="bg-slate-800/70 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold text-white mb-4">Résumé de la Performance</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <KpiCard title="Durée Planifiée" value={evaluationKpis.plannedShutdownDuration.toFixed(2) + 'h'} />
                    <KpiCard title="Durée Réelle" value={evaluationKpis.actualShutdownDuration.toFixed(2) + 'h'} />
                    <KpiCard title="Glissement Total" value={evaluationKpis.totalSlippage.toFixed(2) + 'h'} valueColor="text-red-400" />
                    <KpiCard title="Taux de Réalisation" value={evaluationKpis.completionRate.toFixed(1) + '%'} subtitle={`${evaluationKpis.completedTasks} / ${evaluationKpis.totalPlannedTasks}`} valueColor="text-green-400" />
                    <KpiCard title="Travaux Supplémentaires" value={String(evaluationKpis.supplementaryTasksCount)} />
                    <KpiCard title="Charge Supplémentaire" value={evaluationKpis.supplementaryCharge.toFixed(2) + ' H-H'} />
                </div>
            </section>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* --- Completion by Discipline --- */}
                <section className="bg-slate-800/70 p-6 rounded-lg shadow-lg">
                    {/* FIX: Corrected title from "Équipe" to "Discipline". */}
                    <h3 className="text-lg font-semibold text-white mb-4">Taux de Réalisation par Discipline</h3>
                    <div className="space-y-4">
                        {/* FIX: Changed completionByTeam to completionByDiscipline to match the EvaluationKpis type. */}
                        {Object.entries(evaluationKpis.completionByDiscipline).sort(([disciplineA], [disciplineB]) => (disciplineA as string).localeCompare(disciplineB as string)).map(([discipline, data]: [string, { completed: number; total: number }]) => {
                           const rate = data.total > 0 ? (data.completed / data.total) * 100 : 0;
                           return (
                               <div key={discipline} className="flex items-center gap-4">
                                   <span className="font-medium text-slate-300 text-sm w-36 truncate uppercase" title={discipline}>{discipline}</span>
                                   <div className="flex-grow bg-slate-700 rounded-full h-4">
                                      <div className="bg-blue-500 h-4 rounded-full" style={{ width: `${rate}%` }}></div>
                                   </div>
                                   <span className="text-slate-200 font-mono text-sm w-16 text-right">{`${rate.toFixed(0)}%`}</span>
                               </div>
                           );
                        })}
                    </div>
                </section>

                {/* --- Supplementary Tasks --- */}
                <section className="bg-slate-800/70 p-6 rounded-lg shadow-lg">
                    <h3 className="text-lg font-semibold text-white mb-4">Travaux Supplémentaires</h3>
                    <div className="overflow-x-auto max-h-64 rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="text-slate-300 bg-slate-900/50 sticky top-0"><tr>
                                <th className="p-3 font-semibold">Action</th><th className="p-3 font-semibold">Équipement</th><th className="p-3 font-semibold text-right">Charge (H-H)</th>
                            </tr></thead>
                            <tbody className="bg-slate-800">
                                {evaluationData.supplementaryTasks.map(task => (
                                    <tr key={task.id} className="border-b border-slate-700/50">
                                        {/* FIX: Use `task.teamDetails` to correctly display the team names, as `SupplementaryTask` does not have a direct `team` property. */}
                                        <td className="p-3" title={`Équipe: ${task.teamDetails.map(d => d.team).join(', ')}`}>{task.action}</td>
                                        <td className="p-3 text-slate-400">{task.equipment}</td>
                                        {/* FIX: Correctly access the total man-hours from `task.totalManHours` instead of the non-existent `manHours` property. */}
                                        <td className="p-3 text-right font-mono text-slate-200">{task.totalManHours.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {evaluationData.supplementaryTasks.length === 0 && (
                                    <tr><td colSpan={3} className="text-center text-slate-500 p-4">Aucun travail supplémentaire.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            {/* --- Slippage Analysis --- */}
            {evaluationData.globalSlippageEvents.length > 0 && (
                <section className="bg-slate-800/70 p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold text-white mb-4">Analyse du Glissement Global</h3>
                    <div className="overflow-x-auto rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="text-slate-300 bg-slate-900/50"><tr>
                                <th className="p-3 font-semibold">Date</th><th className="p-3 font-semibold text-right">Heures</th><th className="p-3 font-semibold">Cause</th><th className="p-3 font-semibold">Pilote</th>
                            </tr></thead>
                             <tbody className="bg-slate-800">
                                {evaluationData.globalSlippageEvents.sort((a,b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()).map(event => (
                                    <tr key={event.id} className="border-b border-slate-700/50">
                                        <td className="p-3 whitespace-nowrap">{new Date(event.eventDate).toLocaleString('fr-FR')}</td>
                                        <td className="p-3 font-mono text-right">{event.lostHours.toFixed(2)}</td>
                                        <td className="p-3 whitespace-normal" title={event.cause}>{event.cause}</td>
                                        <td className="p-3">{event.pilot}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}

            {/* --- Planned Tasks Follow-up --- */}
            <section className="bg-slate-800/70 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold text-white mb-4">Suivi des Tâches Planifiées</h3>
                <div className="overflow-x-auto max-h-[600px] rounded-lg">
                     <table className="w-full text-left text-sm">
                         <thead className="text-slate-300 bg-slate-900/50 sticky top-0"><tr>
                             <th className="p-3 font-semibold">Action</th><th className="p-3 font-semibold">Début Réel</th><th className="p-3 font-semibold">Fin Réelle</th>
                             <th className="p-3 font-semibold">Statut</th><th className="p-3 font-semibold text-right">Plan.</th><th className="p-3 font-semibold text-right">Réelle</th><th className="p-3 font-semibold text-right">Gliss.</th>
                         </tr></thead>
                         <tbody className="bg-slate-800">
                             {results.scheduledTasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()).map(task => {
                                 const taskData = evaluationData.tasks[task.id];
                                 const actualDuration = calculateDuration(taskData?.actualStart, taskData?.actualEnd);
                                 const slippage = actualDuration !== null ? actualDuration - task.duration : null;
                                 const status = taskData?.status || 'Fait';

                                 const getStatusBadge = () => {
                                     switch(status) {
                                         case 'Fait': return 'bg-green-500/80 text-white';
                                         case 'Non Fait': return 'bg-red-500/80 text-white';
                                         case 'Annuler': return 'bg-amber-500/80 text-white';
                                         default: return 'bg-slate-600 text-slate-200';
                                     }
                                 };

                                 return (
                                     <tr key={task.id} className="border-b border-slate-700/50">
                                         <td className="p-3 text-slate-200 whitespace-normal" title={`${task.team} - ${task.equipment}`}>{task.action}</td>
                                         <td className="p-3 text-xs font-mono whitespace-nowrap">{taskData?.actualStart ? new Date(taskData.actualStart).toLocaleString('fr-FR', {hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'}) : '-'}</td>
                                         <td className="p-3 text-xs font-mono whitespace-nowrap">{taskData?.actualEnd ? new Date(taskData.actualEnd).toLocaleString('fr-FR', {hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit'}) : '-'}</td>
                                         <td className="p-3">
                                           <span className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusBadge()}`}>
                                               {status}
                                           </span>
                                         </td>
                                         <td className="p-3 font-mono text-right">{formatDuration(task.duration)}</td>
                                         <td className="p-3 font-mono text-right">{formatDuration(actualDuration)}</td>
                                         <td className={`p-3 font-mono text-right ${slippage === null ? '' : slippage > 0.01 ? 'text-red-400' : slippage < -0.01 ? 'text-green-400' : ''}`}>{formatDuration(slippage)}</td>
                                     </tr>
                                 );
                             })}
                         </tbody>
                     </table>
                </div>
            </section>
        </div>
    );
};
