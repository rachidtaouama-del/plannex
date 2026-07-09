
import React from 'react';
import type { CalculationResults, EvaluationData } from '../../types';
import { ReportSectionPreview } from './PdfPagePreview';

interface DetailedLogPreviewProps {
    results: CalculationResults;
    evaluationData: EvaluationData;
}

const calculateDuration = (startStr: string, endStr: string): number | null => {
    if (!startStr || !endStr) return null;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return null;
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};

export const DetailedLogPreview: React.FC<DetailedLogPreviewProps> = ({ results, evaluationData }) => {
    const tableRows = results.scheduledTasks
        .sort((a,b) => a.startTime.getTime() - b.startTime.getTime())
        .map(task => {
            const evalTask = evaluationData.tasks[task.id];
            const actualDuration = calculateDuration(evalTask.actualStart, evalTask.actualEnd);
            const slippage = actualDuration !== null ? actualDuration - task.duration : null;

            return {
                id: task.id,
                action: task.action,
                equipment: task.equipment,
                team: task.team,
                status: evalTask.status,
                plannedDuration: task.duration.toFixed(2),
                actualDuration: actualDuration?.toFixed(2) ?? '-',
                slippage: slippage?.toFixed(2) ?? '-'
            };
    });

    return (
        <ReportSectionPreview title="Suivi Détaillé des Tâches Planifiées">
             <div className="overflow-x-auto rounded-lg border border-slate-700 max-h-[700px]">
                <table className="w-full text-sm text-left">
                     <thead className="bg-slate-700/50 text-slate-300 sticky top-0">
                        <tr>
                            <th className="px-4 py-2 font-semibold">Action</th>
                            <th className="px-4 py-2 font-semibold">Équipement</th>
                            <th className="px-4 py-2 font-semibold">Statut</th>
                            <th className="px-4 py-2 font-semibold text-right">Plan. (h)</th>
                            <th className="px-4 py-2 font-semibold text-right">Réelle (h)</th>
                            <th className="px-4 py-2 font-semibold text-right">Gliss. (h)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {tableRows.map((row) => (
                             <tr key={row.id} className={`hover:bg-slate-700/40 ${
                                row.status === 'Non Fait' ? 'bg-red-500/10' : 
                                row.status === 'Annuler' ? 'bg-yellow-500/10' : ''
                             }`}>
                                <td className="px-4 py-2 text-slate-200" title={row.team}>{row.action}</td>
                                <td className="px-4 py-2">{row.equipment}</td>
                                <td className="px-4 py-2">
                                     <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                        row.status === 'Fait' ? 'bg-green-500/20 text-green-300' :
                                        row.status === 'Non Fait' ? 'bg-red-500/20 text-red-300' :
                                        row.status === 'Annuler' ? 'bg-yellow-500/20 text-yellow-300' : ''
                                     }`}>
                                        {row.status}
                                    </span>
                                </td>
                                <td className="px-4 py-2 text-right font-mono">{row.plannedDuration}</td>
                                <td className="px-4 py-2 text-right font-mono">{row.actualDuration}</td>
                                <td className={`px-4 py-2 text-right font-mono ${
                                    parseFloat(row.slippage) > 0.01 ? 'text-red-400' : 
                                    parseFloat(row.slippage) < -0.01 ? 'text-green-400' : ''
                                }`}>
                                    {row.slippage}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </ReportSectionPreview>
    );
};