

import React, { useState } from 'react';
import type { EvaluationKpis, AppParameters, EvaluationData, CalculationResults, ChronologyEvent } from '../../types';
import { ReportSectionPreview } from './PdfPagePreview';
import { ChronologyGanttChart } from './ChronologyGanttChart';

interface SummaryPagePreviewProps {
    evaluationKpis: EvaluationKpis;
    parameters: AppParameters;
    evaluationData: EvaluationData;
    setEvaluationData: (data: EvaluationData | ((prevData: EvaluationData) => EvaluationData)) => void;
    results: CalculationResults;
}

const KpiCard: React.FC<{ title: string; value: string; subtitle?: string; valueColor?: string }> = ({ title, value, subtitle, valueColor = 'text-white' }) => (
    <div className="bg-slate-700/50 p-4 rounded-lg shadow-md flex flex-col justify-between text-center">
        <p className="text-slate-400 text-sm font-medium">{title}</p>
        <p className={`text-3xl font-bold mt-2 ${valueColor}`}>{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
    </div>
);

export const SummaryPagePreview: React.FC<SummaryPagePreviewProps> = ({ evaluationKpis, evaluationData, setEvaluationData, parameters }) => {
    
    const [timelineIntervalHours, setTimelineIntervalHours] = useState(4);

    // FIX: Changed completionByTeam to completionByDiscipline to match the EvaluationKpis type.
    // FIX: Removed redundant cast `as string` as the key from `Object.entries` is already a string.
    const disciplineCompletionRows = Object.entries(evaluationKpis.completionByDiscipline)
        .sort(([disciplineA], [disciplineB]) => disciplineA.localeCompare(disciplineB))
        .map(([discipline, data]: [string, { completed: number; total: number }]) => {
            const rate = data.total > 0 ? (data.completed / data.total) * 100 : 0;
            return { discipline, tasks: `${data.completed}/${data.total}`, rate: `${rate.toFixed(0)}%` };
        });

    const handleChronologyChange = (eventId: string, field: keyof ChronologyEvent, value: string) => {
        setEvaluationData(prev => {
            if (!prev) return prev;
            const updatedChronology = prev.chronology.map(event => 
                event.id === eventId ? { ...event, [field]: value } : event
            );
            return { ...prev, chronology: updatedChronology };
        });
    };

    const handleChronologyAdd = () => {
        setEvaluationData(prev => {
            if (!prev) return prev;
            const toDateTimeLocal = (date: Date) => {
                const tzoffset = (new Date()).getTimezoneOffset() * 60000;
                return (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
            };
            // Use the shutdown start date as the default for new events.
            const defaultEventDate = parameters.shutdownStart || toDateTimeLocal(new Date());
            const newEvent: ChronologyEvent = {
                id: crypto.randomUUID(),
                label: 'Nouvel Événement',
                plannedStart: defaultEventDate,
                plannedEnd: defaultEventDate,
                actualStart: defaultEventDate,
                actualEnd: defaultEventDate,
            };
            return { ...prev, chronology: [...prev.chronology, newEvent] };
        });
    };

    const handleChronologyDelete = (eventId: string) => {
        setEvaluationData(prev => {
            if (!prev) return prev;
            return { ...prev, chronology: prev.chronology.filter(e => e.id !== eventId) };
        });
    };

    return (
        <ReportSectionPreview title="Résumé de la Performance">
            <div className="space-y-8">
                <div>
                    <h4 className="text-lg font-semibold text-slate-200 mb-3">Indicateurs Clés</h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard title="Durée Planifiée" value={`${evaluationKpis.plannedShutdownDuration.toFixed(2)}h`} />
                        <KpiCard title="Durée Réelle" value={`${evaluationKpis.actualShutdownDuration.toFixed(2)}h`} />
                        <KpiCard title="Glissement Total" value={`${evaluationKpis.totalSlippage.toFixed(2)}h`} valueColor="text-red-400" />
                        <KpiCard title="Taux de Glissement" value={`${evaluationKpis.slippageRate.toFixed(1)}%`} valueColor={evaluationKpis.slippageRate > 0.1 ? "text-red-400" : "text-green-400"} />
                        <KpiCard title="Taux de Réalisation" value={`${evaluationKpis.completionRate.toFixed(1)}%`} subtitle={`(${evaluationKpis.completedTasks}/${evaluationKpis.totalPlannedTasks})`} valueColor="text-green-400"/>
                        <KpiCard title="Travaux Supplémentaires" value={`${evaluationKpis.supplementaryTasksCount}`} />
                        <KpiCard title="Charge Supplémentaire" value={`${evaluationKpis.supplementaryCharge.toFixed(2)} H-H`} />
                        <KpiCard title="Taux Travaux Supp." value={`${evaluationKpis.supplementaryWorkRate.toFixed(1)}%`} valueColor={evaluationKpis.supplementaryWorkRate > 10 ? 'text-yellow-400' : 'text-white'} subtitle="vs. Planifié" />
                        <KpiCard title="Nombre d'Incidents" value={`${evaluationKpis.incidents}`} valueColor="text-yellow-400" />
                        <KpiCard title="Nombre d'Accidents" value={`${evaluationKpis.accidents}`} valueColor={evaluationKpis.accidents > 0 ? 'text-red-500' : 'text-green-400'} />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-lg font-semibold text-slate-200">Chronologie de l'Arrêt</h4>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Zoom Gantt:</span>
                            <button onClick={() => setTimelineIntervalHours(prev => Math.max(1, Math.ceil(prev / 2)))} className="bg-slate-700 hover:bg-slate-600 text-white font-bold w-7 h-7 rounded-full flex items-center justify-center">-</button>
                            <span className="text-sm font-semibold text-white w-12 text-center">{timelineIntervalHours}h</span>
                            <button onClick={() => setTimelineIntervalHours(prev => Math.min(48, prev * 2))} className="bg-slate-700 hover:bg-slate-600 text-white font-bold w-7 h-7 rounded-full flex items-center justify-center">+</button>
                        </div>
                    </div>
                     <div className="overflow-x-auto rounded-lg border border-slate-700">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-700/50 text-slate-300">
                                <tr>
                                    <th className="px-3 py-2 font-semibold min-w-[200px]">Événement</th>
                                    <th className="px-3 py-2 font-semibold">Date Début Planifiée</th>
                                    <th className="px-3 py-2 font-semibold">Date Fin Planifiée</th>
                                    <th className="px-3 py-2 font-semibold">Date Début Réelle</th>
                                    <th className="px-3 py-2 font-semibold">Date Fin Réelle</th>
                                    <th className="px-3 py-2 font-semibold text-center w-20">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {evaluationData.chronology.map((event) => {
                                    return (
                                        <tr key={event.id} className="border-b border-slate-700 last:border-b-0 hover:bg-slate-700/40">
                                            <td className="px-3 py-1">
                                                <input
                                                    type="text"
                                                    value={event.label}
                                                    onChange={(e) => handleChronologyChange(event.id, 'label', e.target.value)}
                                                    className="bg-slate-700/80 border-slate-600 rounded px-2 py-1 text-xs w-full"
                                                />
                                            </td>
                                            <td className="px-3 py-1 h-[40px]">
                                                <input 
                                                    type="datetime-local" 
                                                    value={event.plannedStart} 
                                                    onChange={(e) => handleChronologyChange(event.id, 'plannedStart', e.target.value)}
                                                    className="bg-slate-700/80 border-slate-600 rounded px-2 py-1 text-xs w-44"
                                                />
                                            </td>
                                            <td className="px-3 py-1 h-[40px]">
                                                <input 
                                                    type="datetime-local" 
                                                    value={event.plannedEnd}
                                                    onChange={(e) => handleChronologyChange(event.id, 'plannedEnd', e.target.value)}
                                                    className="bg-slate-700/80 border-slate-600 rounded px-2 py-1 text-xs w-44"
                                                />
                                            </td>
                                             <td className="px-3 py-1 h-[40px]">
                                                <input 
                                                    type="datetime-local" 
                                                    value={event.actualStart}
                                                    onChange={(e) => handleChronologyChange(event.id, 'actualStart', e.target.value)}
                                                    className="bg-slate-700/80 border-slate-600 rounded px-2 py-1 text-xs w-44"
                                                />
                                            </td>
                                            <td className="px-3 py-1 h-[40px]">
                                                <input 
                                                    type="datetime-local" 
                                                    value={event.actualEnd}
                                                    onChange={(e) => handleChronologyChange(event.id, 'actualEnd', e.target.value)}
                                                    className="bg-slate-700/80 border-slate-600 rounded px-2 py-1 text-xs w-44"
                                                />
                                            </td>
                                            <td className="px-3 py-1 text-center">
                                                <button onClick={() => handleChronologyDelete(event.id)} className="text-red-400 hover:text-red-300 p-1 rounded-full hover:bg-slate-700 transition-colors" title="Supprimer l'événement">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {evaluationData.chronology.length === 0 && (
                                    <tr><td colSpan={6} className="text-center text-slate-500 p-6">Aucun événement de chronologie. Cliquez sur "Ajouter un Événement" pour commencer.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button onClick={handleChronologyAdd} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center transition-colors shadow-md text-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mr-2"><path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" /></svg>
                            Ajouter un Événement
                        </button>
                    </div>
                    <ChronologyGanttChart 
                        chronology={evaluationData.chronology} 
                        parameters={parameters} 
                        evaluationData={evaluationData}
                        timelineIntervalHours={timelineIntervalHours}
                    />
                </div>

                <div>
                    <h4 className="text-lg font-semibold text-slate-200 mb-3">Réalisation par Discipline</h4>
                     <div className="overflow-x-auto rounded-lg border border-slate-700">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-700/50 text-slate-300">
                                <tr>
                                    <th className="px-4 py-2 font-semibold">Discipline</th>
                                    <th className="px-4 py-2 font-semibold text-center">Tâches (Faites/Total)</th>
                                    <th className="px-4 py-2 font-semibold text-right">Taux</th>
                                </tr>
                            </thead>
                            <tbody>
                                {disciplineCompletionRows.map(({ discipline, tasks, rate }) => (
                                    <tr key={discipline} className="border-b border-slate-700 last:border-b-0 hover:bg-slate-700/40">
                                        <td className="px-4 py-2 font-medium text-slate-200">{discipline}</td>
                                        <td className="px-4 py-2 text-center">{tasks}</td>
                                        <td className="px-4 py-2 text-right font-mono">{rate}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </ReportSectionPreview>
    );
};
