import React from 'react';
import type { CalculationResults, EvaluationData } from '../../types';
import { ReportSectionPreview } from './PdfPagePreview';

interface NonCompletedTasksPreviewProps {
    results: CalculationResults;
    evaluationData: EvaluationData;
}

export const NonCompletedTasksPreview: React.FC<NonCompletedTasksPreviewProps> = ({ results, evaluationData }) => {
    const nonCompletedTasks = results.scheduledTasks
        .filter(task => evaluationData.tasks[task.id]?.status === 'Non Fait' && evaluationData.tasks[task.id]?.nonCompletionDetails)
        .map(task => ({
            ...task,
            details: evaluationData.tasks[task.id].nonCompletionDetails!
        }));
    
    if (nonCompletedTasks.length === 0) {
        return null;
    }

    return (
        <ReportSectionPreview title="Analyse des Tâches Non Réalisées">
            <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm text-left">
                     <thead className="bg-slate-700/50 text-slate-300">
                        <tr>
                            <th className="px-4 py-2 font-semibold">Tâche</th>
                            <th className="px-4 py-2 font-semibold">Équipe</th>
                            <th className="px-4 py-2 font-semibold">Cause</th>
                            <th className="px-4 py-2 font-semibold">Contre-Mesure</th>
                            <th className="px-4 py-2 font-semibold">Pilote</th>
                        </tr>
                    </thead>
                    <tbody>
                        {nonCompletedTasks.map((task) => (
                            <tr key={task.id} className="border-b border-slate-700 last:border-b-0 hover:bg-slate-700/40">
                                <td className="px-4 py-2 text-slate-200">
                                    <div className="font-semibold">{task.action}</div>
                                    <div className="text-xs text-slate-400">{task.equipment}</div>
                                </td>
                                <td className="px-4 py-2">{task.team}</td>
                                <td className="px-4 py-2" title={`Criticité: ${task.details.criticality}`}>{task.details.cause}</td>
                                <td className="px-4 py-2">{task.details.counterMeasure}</td>
                                <td className="px-4 py-2">{task.details.pilot}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </ReportSectionPreview>
    );
};
