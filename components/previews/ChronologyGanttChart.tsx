

import React from 'react';
import type { ChronologyEvent, AppParameters, EvaluationData } from '../../types';

interface ChronologyGanttChartProps {
    chronology: ChronologyEvent[];
    parameters: AppParameters;
    evaluationData: EvaluationData;
    timelineIntervalHours: number;
}

const formatTooltip = (event: ChronologyEvent, type: 'planned' | 'actual'): string => {
    const start = type === 'planned' ? event.plannedStart : event.actualStart;
    const end = type === 'planned' ? event.plannedEnd : event.actualEnd;
    if (!start || !end) return event.label;

    const startDate = new Date(start);
    const endDate = new Date(end);

    return `${event.label} (${type})
Début: ${startDate.toLocaleString('fr-FR')}
Fin: ${endDate.toLocaleString('fr-FR')}`;
};

export const ChronologyGanttChart: React.FC<ChronologyGanttChartProps> = ({ chronology, parameters, evaluationData, timelineIntervalHours }) => {
    if (!chronology || chronology.length === 0) return null;

    const allBoundDates = [
        parameters.shutdownStart,
        parameters.shutdownEnd,
        evaluationData.actualShutdownStart,
        evaluationData.actualShutdownEnd
    ].filter(Boolean).map(d => new Date(d as string).getTime());

    const allEventDates = chronology.flatMap(e => [
        e.plannedStart, e.plannedEnd, e.actualStart, e.actualEnd
    ]).filter(Boolean).map(d => new Date(d as string).getTime());

    const allDates = [...allBoundDates, ...allEventDates].filter(d => !isNaN(d));
    if (allDates.length < 2) return null;

    let chartMinTime = Math.min(...allDates);
    let chartMaxTime = Math.max(...allDates);

    // Add padding
    const padding = (chartMaxTime - chartMinTime) * 0.05 || 3600000; // 5% padding or 1hr fallback
    chartMinTime -= padding;
    chartMaxTime += padding;

    const totalDuration = chartMaxTime - chartMinTime;
    if (totalDuration <= 0) return null;

    // Timeline Ticks Calculation
    const ticks: Date[] = [];
    const MAX_TICKS = 500; // Prevent performance issues with huge date ranges
    const totalDurationHours = totalDuration / (1000 * 60 * 60);

    // Dynamically adjust interval to keep tick count reasonable
    let effectiveIntervalHours = timelineIntervalHours;
    if ((totalDurationHours / effectiveIntervalHours) > MAX_TICKS) {
        effectiveIntervalHours = Math.ceil(totalDurationHours / MAX_TICKS);
    }

    const tickStartDate = new Date(chartMinTime);
    tickStartDate.setMinutes(0, 0, 0);

    // Align to the next even hour interval
    const hoursToAdd = effectiveIntervalHours - (tickStartDate.getHours() % effectiveIntervalHours);
    if (hoursToAdd !== effectiveIntervalHours) {
        tickStartDate.setHours(tickStartDate.getHours() + hoursToAdd);
    }

    let safety = 0; // Safety break to prevent potential infinite loops
    while (tickStartDate.getTime() <= chartMaxTime && safety < MAX_TICKS * 2) {
        ticks.push(new Date(tickStartDate));
        tickStartDate.setHours(tickStartDate.getHours() + effectiveIntervalHours);
        safety++;
    }

    const calculateBarPosition = (start: string | null, end: string | null) => {
        if (!start || !end) return { left: '0%', width: '0%' };
        const startTime = new Date(start).getTime();
        const endTime = new Date(end).getTime();
        if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) return { left: '0%', width: '0%' };

        const left = ((startTime - chartMinTime) / totalDuration) * 100;
        const width = ((endTime - startTime) / totalDuration) * 100;
        return {
            left: `${left}%`,
            width: `${Math.max(0.1, width)}%`
        };
    };

    return (
        <div className="mt-8 p-6 bg-slate-800/40 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>
            <h5 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-yellow-400 mb-6 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>
                Gantt de Chronologie
            </h5>

            {/* Timeline Header */}
            <div className="relative h-10 flex text-xs text-slate-400">
                <div className="w-1/3 flex-shrink-0 border-r border-white/5"></div>
                <div className="relative flex-grow h-full">
                    {ticks.map((tick, index) => {
                        const left = ((tick.getTime() - chartMinTime) / totalDuration) * 100;
                        if (left < 0 || left > 100) return null;

                        const isMidnight = tick.getHours() === 0;

                        return (
                            <div key={index} className="absolute top-0 h-full" style={{ left: `${left}%` }}>
                                <div className={`transform -translate-x-1/2 text-center whitespace-nowrap ${isMidnight ? 'font-bold text-slate-200' : ''}`}>
                                    {isMidnight && (
                                        <div className="mb-1">{tick.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</div>
                                    )}
                                    <div>{tick.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Chart Body */}
            <div className="relative space-y-1">
                {/* Vertical Grid Lines */}
                <div className="absolute inset-0 z-0">
                    <div className="flex h-full">
                        <div className="w-1/3 flex-shrink-0 border-r border-white/5"></div>
                        <div className="relative flex-grow h-full">
                            {ticks.map((tick, index) => {
                                const left = ((tick.getTime() - chartMinTime) / totalDuration) * 100;
                                if (left < 0 || left > 100) return null;
                                return <div key={index} className="absolute top-0 h-full border-l border-white/5" style={{ left: `${left}%` }}></div>
                            })}
                        </div>
                    </div>
                </div>

                {/* Rows and Bars */}
                {chronology.map(event => (
                    <div key={event.id} className="relative flex items-center h-12 z-10">
                        <div className="w-1/3 pr-4 text-right text-xs font-medium text-slate-300 truncate" title={event.label}>
                            {event.label}
                        </div>
                        <div className="w-2/3 relative h-full">
                            {(() => {
                                const plannedBar = calculateBarPosition(event.plannedStart, event.plannedEnd);
                                const actualBar = calculateBarPosition(event.actualStart, event.actualEnd);
                                return (
                                    <>
                                        {/* Planned Bar */}
                                        {plannedBar.width !== '0%' && (
                                            <div
                                                className="absolute bg-gradient-to-r from-amber-400 to-yellow-500 h-2.5 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.5)] border border-yellow-300/20 transition-all hover:brightness-110"
                                                style={{ top: 'calc(50% - 10px)', ...plannedBar }}
                                                title={formatTooltip(event, 'planned')}
                                            ></div>
                                        )}
                                        {/* Actual Bar */}
                                        {actualBar.width !== '0%' && (
                                            <div
                                                className="absolute bg-gradient-to-r from-blue-500 to-cyan-400 h-3.5 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)] border border-cyan-300/20 transition-all z-10 hover:brightness-110"
                                                style={{ top: 'calc(50% + 2px)', ...actualBar }}
                                                title={formatTooltip(event, 'actual')}
                                            ></div>
                                        )}
                                    </>
                                )
                            })()}
                        </div>
                    </div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end mt-4 space-x-4 text-xs text-slate-400">
                <div className="flex items-center"><div className="w-4 h-3 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 shadow-[0_0_5px_rgba(251,191,36,0.5)] mr-2"></div>Planifié</div>
                <div className="flex items-center"><div className="w-4 h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_5px_rgba(59,130,246,0.5)] mr-2"></div>Réel</div>
            </div>
        </div>
    );
};
