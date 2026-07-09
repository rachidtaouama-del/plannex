import React, { useMemo } from 'react';
import type { ScheduledTask } from '../types';

interface GanttChartProps {
  tasks: ScheduledTask[];
}

const GanttChart: React.FC<GanttChartProps> = ({ tasks }) => {
    if (!tasks || tasks.length === 0) {
        return <div className="text-slate-400 text-center p-8">Aucune tâche à afficher dans ce groupe.</div>;
    }
    
    // FIX: Explicitly cast 'action' to string to avoid 'unknown' type error during sort.
    const sortedTasks = useMemo(() => [...tasks].sort((a: ScheduledTask,b: ScheduledTask) => a.startTime.getTime() - b.startTime.getTime() || a.action.localeCompare(b.action)), [tasks]);

    const { legendData, actionToColor } = useMemo(() => {
        const COLORS = [
            '#3b82f6', '#22c55e', '#f97316', '#8b5cf6', '#ec4899', 
            '#14b8a6', '#f59e0b', '#6366f1', '#d946ef', '#06b6d4',
            '#ef4444', '#a3e635', '#2dd4bf', '#f472b6', '#fbbf24',
            '#4ade80', '#c084fc', '#fb7185', '#34d399'
        ];
        // FIX: Explicitly cast elements to string to avoid 'unknown' type error during sort.
        // FIX: Explicitly type `uniqueActions` and remove unnecessary `as string` cast to fix potential type inference issues.
        const uniqueActions: string[] = [...new Set(tasks.map(t => t.action))].sort((a: string, b: string) => a.localeCompare(b));
        
        const actionToColor = new Map<string, string>();
        const legendData = uniqueActions.map((action, index) => {
            const color = COLORS[index % COLORS.length];
            actionToColor.set(action, color);
            return { action, color, index: index + 1 };
        });
        return { legendData, actionToColor };
    }, [tasks]);

    const chartStartDate = new Date(Math.min(...sortedTasks.map(t => t.startTime.getTime())));
    const chartEndDate = new Date(Math.max(...sortedTasks.map(t => t.endTime.getTime())));
    
    // Add some padding to the timeline
    chartStartDate.setHours(chartStartDate.getHours() - 1);
    chartEndDate.setHours(chartEndDate.getHours() + 1);

    const totalDurationMs = chartEndDate.getTime() - chartStartDate.getTime();
    
    if (totalDurationMs <= 0) return null;
    
    const ticks: Date[] = [];
    const timeDiffHours = totalDurationMs / (1000 * 60 * 60);
    
    let intervalHours = 1;
    if (timeDiffHours > 72) intervalHours = 12;
    else if (timeDiffHours > 24) intervalHours = 6;
    else if (timeDiffHours > 12) intervalHours = 2;

    const tickStartDate = new Date(chartStartDate);
    tickStartDate.setMinutes(0, 0, 0);

    while (tickStartDate <= chartEndDate) {
        ticks.push(new Date(tickStartDate));
        tickStartDate.setHours(tickStartDate.getHours() + intervalHours);
    }
    
    const ROW_HEIGHT = 40; // in pixels

    return (
        <div className="relative font-sans text-sm">
            {/* Timeline Header */}
            <div className="sticky top-0 z-20 bg-slate-800 pt-2 pb-1">
                <div className="relative h-8 flex">
                     <div className="w-48 lg:w-64 flex-shrink-0 border-r border-slate-700/50"></div>
                     <div className="relative flex-grow h-full">
                        {ticks.map((tick, index) => {
                            const left = ((tick.getTime() - chartStartDate.getTime()) / totalDurationMs) * 100;
                            if (left < 0 || left > 100) return null;
                            
                            const dateStr = tick.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                            const timeStr = tick.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

                            return (
                                <div key={index} className="absolute top-0 h-full" style={{ left: `${left}%` }}>
                                    <span className="absolute -top-5 text-xs text-slate-400 transform -translate-x-1/2 text-center whitespace-pre">
                                        {`${dateStr}\n${timeStr}`}
                                    </span>
                                </div>
                            );
                        })}
                     </div>
                </div>
            </div>

            {/* Chart Body */}
            <div className="relative" style={{ height: sortedTasks.length * ROW_HEIGHT }}>
                 {/* Vertical Grid Lines */}
                 <div className="absolute top-0 left-0 w-full h-full flex">
                    <div className="w-48 lg:w-64 flex-shrink-0 border-r border-slate-700/50"></div>
                     <div className="relative flex-grow h-full">
                        {ticks.map((tick, index) => {
                             const left = ((tick.getTime() - chartStartDate.getTime()) / totalDurationMs) * 100;
                             if (left < 0 || left > 100) return null;
                             return <div key={index} className="absolute top-0 h-full border-l border-slate-700/50" style={{ left: `${left}%` }}></div>
                        })}
                     </div>
                 </div>

                 {/* Rows and Task Bars */}
                 <div className="relative z-10">
                    {sortedTasks.map((task, index) => {
                        const top = index * ROW_HEIGHT;
                        const left = ((task.startTime.getTime() - chartStartDate.getTime()) / totalDurationMs) * 100;
                        const width = Math.max(0.2, ((task.endTime.getTime() - task.startTime.getTime()) / totalDurationMs) * 100);
                        const color = actionToColor.get(task.action) || '#64748b';
                        const legendItem = legendData.find(item => item.action === task.action);
                        const legendIndex = legendItem ? legendItem.index : 0;


                        return (
                            <div 
                                key={task.id} 
                                className="absolute flex items-center" 
                                style={{ top, left: 0, right: 0, height: ROW_HEIGHT }}
                            >
                                <div className="w-48 lg:w-64 flex-shrink-0 pr-4 text-right text-slate-300 truncate" title={task.equipment}>
                                    {task.equipment}
                                </div>
                                <div className="relative flex-grow h-full border-t border-slate-700/50">
                                    <div 
                                        className="absolute top-1/2 -translate-y-1/2 h-[70%] rounded flex items-center justify-center px-2 overflow-hidden hover:opacity-80 cursor-pointer"
                                        style={{ left: `${left}%`, width: `${width}%`, backgroundColor: color }}
                                        title={`${legendIndex}: ${task.action}\nÉquipement: ${task.equipment}\nÉquipe: ${task.team}\nDébut: ${task.startTime.toLocaleString('fr-FR')}\nFin: ${task.endTime.toLocaleString('fr-FR')}\nDurée: ${task.duration.toFixed(2)}h`}
                                    >
                                        {width > 2 && (
                                            <span className="text-white text-xs font-bold select-none">
                                                {legendIndex}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            {legendData.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-700/50">
                    <h4 className="text-base font-semibold text-slate-200 mb-4">Légende des Tâches</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                        {legendData.map((item) => (
                            <div key={item.action} className="flex items-start space-x-3">
                                <div className="flex-shrink-0 pt-0.5">
                                    <div 
                                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                                        style={{ backgroundColor: item.color }}
                                    >
                                        {item.index}
                                    </div>
                                </div>
                                <span className="text-slate-300">{item.action}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GanttChart;