
// FIX: Import 'useEffect' from 'react' to resolve the 'Cannot find name' error.
import React, { useState, useMemo, useEffect } from 'react';
import type { CalculationResults, ScheduledTask, AppParameters } from '../types';
import { GanttModal } from './GanttModal';
import { TeamPlanningExportModal } from './TeamPlanningExportModal';
import { TeamDetailModal, TeamDetailData } from './TeamDetailModal';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie } from 'recharts';

const formatDate = (date: Date) => {
    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const calculatePeakManpowerForTasks = (tasks: ScheduledTask[], dayStart?: number, dayEnd?: number): number => {
    if (tasks.length === 0) return 0;
    const events: { time: number; type: 'start' | 'end'; manpower: number }[] = [];
    tasks.forEach(task => {
        const taskStart = task.startTime.getTime();
        const taskEnd = task.endTime.getTime();
        const start = dayStart ? Math.max(taskStart, dayStart) : taskStart;
        const end = dayEnd ? Math.min(taskEnd, dayEnd) : taskEnd;
        if (start < end) {
            events.push({ time: start, type: 'start', manpower: task.manpower });
            events.push({ time: end, type: 'end', manpower: task.manpower });
        }
    });
    if (events.length === 0) return 0;
    events.sort((a, b) => a.time - b.time || (a.type === 'end' ? -1 : 1));
    let peak = 0, current = 0;
    for (const event of events) {
        if (event.type === 'start') current += event.manpower;
        else current -= event.manpower;
        if (current > peak) peak = current;
    }
    return peak;
};

const DISCIPLINE_COLORS = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899',
    '#06b6d4', '#84cc16', '#f97316', '#6366f1', '#14b8a6', '#e11d48',
    '#a855f7', '#22c55e', '#eab308', '#0ea5e9', '#d946ef', '#64748b'
];

interface TeamScheduleViewProps {
    results: CalculationResults;
    onBack: () => void;
    parameters: AppParameters;
    isColdStopFlow: boolean;
    dailyDurationLimit: number;
}

const TeamScheduleView: React.FC<TeamScheduleViewProps> = ({ results, onBack, parameters, isColdStopFlow, dailyDurationLimit }) => {
    const [ganttModalData, setGanttModalData] = useState<{ title: string; tasks: ScheduledTask[] } | null>(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [detailModalData, setDetailModalData] = useState<TeamDetailData | null>(null);
    const [activeDashboardTab, setActiveDashboardTab] = useState<'workload' | 'tasks' | 'org' | 'histogram'>('workload');

    const handleShowGantt = (title: string, tasks: ScheduledTask[]) => {
        setGanttModalData({ title, tasks });
    };

    const getSubTeamSize = (teamName: string, tasks: ScheduledTask[]): number => {
        if (!tasks || tasks.length === 0) return 2;
        const manpowerSum = tasks.reduce((sum, task) => sum + task.manpower, 0);
        const avgManpower = manpowerSum / tasks.length;
        const definedSizes: Record<string, number> = {
            'Graisseur': 2, 'Instrumentiste': 2, 'Mécanicien': 2,
            'Monteur Echaffaudage': 3, 'Vulcanizer': 2, 'Cleaner': 4,
        };
        return definedSizes[teamName] || Math.max(1, Math.round(avgManpower));
    };

    const groupedData = useMemo(() => {
        const byDiscipline: Record<string, ScheduledTask[]> = {};
        results.scheduledTasks.forEach(task => {
            const discipline = isColdStopFlow ? task.discipline : task.team;
            if (!byDiscipline[discipline]) byDiscipline[discipline] = [];
            byDiscipline[discipline].push(task);
        });
        return Object.entries(byDiscipline)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([disciplineName, disciplineTasks]) => {
                let subTeams;
                if (isColdStopFlow) {
                    const bySubTeam: Record<string, ScheduledTask[]> = {};
                    disciplineTasks.forEach(task => {
                        if (!bySubTeam[task.team]) bySubTeam[task.team] = [];
                        bySubTeam[task.team].push(task);
                    });
                    subTeams = Object.entries(bySubTeam).sort(([a], [b]) => a.localeCompare(b)).map(([teamName, tasks]) => ({ name: teamName, tasks }));
                } else {
                    subTeams = [{ name: disciplineName, tasks: disciplineTasks }];
                }
                const totalPersonnel = subTeams.reduce((acc, team) => {
                    if (team.tasks.length === 0) return acc;
                    return acc + calculatePeakManpowerForTasks(team.tasks);
                }, 0);
                return {
                    disciplineName,
                    kpis: {
                        totalPersonnel,
                        totalManHours: disciplineTasks.reduce((sum, t) => sum + t.manHours, 0),
                        totalDuration: disciplineTasks.reduce((sum, t) => sum + t.duration, 0),
                    },
                    subTeams,
                };
            });
    }, [results, isColdStopFlow]);

    // KPI 1: Workload distribution (H-H) per discipline
    const workloadData = useMemo(() => {
        return groupedData.map((d, i) => ({
            name: d.disciplineName,
            value: parseFloat(d.kpis.totalManHours.toFixed(1)),
            color: DISCIPLINE_COLORS[i % DISCIPLINE_COLORS.length],
        })).sort((a, b) => b.value - a.value);
    }, [groupedData]);

    // KPI 2: Number of tasks per discipline
    const taskCountData = useMemo(() => {
        const byDiscipline: Record<string, number> = {};
        results.scheduledTasks.forEach(task => {
            const d = isColdStopFlow ? task.discipline : task.team;
            byDiscipline[d] = (byDiscipline[d] || 0) + 1;
        });
        return Object.entries(byDiscipline).map(([name, count], i) => ({
            name, count, color: DISCIPLINE_COLORS[i % DISCIPLINE_COLORS.length]
        })).sort((a, b) => b.count - a.count);
    }, [results, isColdStopFlow]);

    // KPI 3: Organizational Structure
    const orgData = useMemo(() => {
        return groupedData.map((d, i) => {
            const teamSizeMap: Record<number, number> = {};
            let totalPeople = 0;
            d.subTeams.forEach(team => {
                const size = getSubTeamSize(d.disciplineName, team.tasks);
                teamSizeMap[size] = (teamSizeMap[size] || 0) + 1;
                totalPeople += size;
            });
            const breakdown = Object.entries(teamSizeMap)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([size, count]) => ({ size: parseInt(size), count }));
            return {
                discipline: d.disciplineName,
                teamCount: d.subTeams.length,
                totalPeople,
                breakdown,
                color: DISCIPLINE_COLORS[i % DISCIPLINE_COLORS.length],
            };
        }).sort((a, b) => b.totalPeople - a.totalPeople);
    }, [groupedData]);

    const getLocalDateKey = (date: Date): string => {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // KPI 4: Daily Staff Histogram
    const dailyStaffHistogram = useMemo(() => {
        if (results.scheduledTasks.length === 0) return { labels: [], data: [], disciplines: [] as string[] };
        const projectStart = new Date(parameters.shutdownStart); projectStart.setHours(0, 0, 0, 0);
        const projectEnd = new Date(Math.max(new Date(parameters.shutdownEnd).getTime(), results.scheduleEndDate.getTime()));
        projectEnd.setHours(23, 59, 59, 999);
        const disciplines = [...new Set(results.scheduledTasks.map(t => isColdStopFlow ? t.discipline : t.team))].sort();
        const labels: string[] = [];
        const data: Record<string, number>[] = [];
        for (let d = new Date(projectStart); d <= projectEnd; d.setDate(d.getDate() + 1)) {
            const dayStart = new Date(d).getTime();
            const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999);
            const dayEndTs = dayEnd.getTime();
            const dayKey = getLocalDateKey(d);
            labels.push(dayKey);
            const dayData: Record<string, number> = {};
            disciplines.forEach(disc => {
                const tasksOnDay = results.scheduledTasks.filter(t => {
                    const td = isColdStopFlow ? t.discipline : t.team;
                    return td === disc && t.startTime.getTime() < dayEndTs && t.endTime.getTime() > dayStart;
                });
                dayData[disc] = calculatePeakManpowerForTasks(tasksOnDay, dayStart, dayEndTs);
            });
            data.push(dayData);
        }
        return { labels, data, disciplines };
    }, [results, parameters, isColdStopFlow]);

    const dailyWorkloadChartData = useMemo(() => {
        if (results.scheduledTasks.length === 0) return { labels: [] as string[], datasets: [] as { label: string; data: number[]; backgroundColor: string }[], maxLoad: 0 };
        const workload: Record<string, Record<string, number>> = {};
        const disciplines = new Set<string>();
        const projectStart = new Date(parameters.shutdownStart); projectStart.setHours(0, 0, 0, 0);
        const projectEnd = new Date(Math.max(new Date(parameters.shutdownEnd).getTime(), results.scheduleEndDate.getTime()));
        projectEnd.setHours(23, 59, 59, 999);
        for (let d = new Date(projectStart); d <= projectEnd; d.setDate(d.getDate() + 1)) {
            workload[getLocalDateKey(d)] = {};
        }
        results.scheduledTasks.forEach(task => {
            const discipline = isColdStopFlow ? task.discipline : task.team;
            disciplines.add(discipline);
            let current = new Date(task.startTime);
            while (current < task.endTime) {
                const dayKey = getLocalDateKey(current);
                const endOfDay = new Date(current); endOfDay.setHours(23, 59, 59, 999);
                const endForThisDay = Math.min(task.endTime.getTime(), endOfDay.getTime());
                const startForThisDay = Math.max(task.startTime.getTime(), current.getTime());
                if (endForThisDay > startForThisDay) {
                    const hoursThisDay = (endForThisDay - startForThisDay) / (1000 * 3600);
                    if (workload[dayKey]) workload[dayKey][discipline] = (workload[dayKey][discipline] || 0) + (hoursThisDay * task.manpower);
                }
                current.setDate(current.getDate() + 1); current.setHours(0, 0, 0, 0);
            }
        });
        const sortedDisciplines = [...disciplines].sort();
        const datasets = sortedDisciplines.map((d, i) => ({ label: d, data: Object.values(workload).map(dayData => dayData[d] || 0), backgroundColor: DISCIPLINE_COLORS[i % DISCIPLINE_COLORS.length] }));
        const maxLoad = Math.max(...Object.values(workload).map(dayData => Object.values(dayData).reduce((s, v) => s + v, 0)));
        return { labels: Object.keys(workload), datasets, maxLoad: Math.max(10, maxLoad) };
    }, [results, parameters, isColdStopFlow]);

    useEffect(() => {
        if (dailyWorkloadChartData.labels.length > 0 && !selectedDate) setSelectedDate(dailyWorkloadChartData.labels[0]);
    }, [dailyWorkloadChartData.labels, selectedDate]);

    const dailyInspectorData = useMemo(() => {
        if (results.scheduledTasks.length === 0) return [];
        const projectStart = new Date(parameters.shutdownStart); projectStart.setHours(0, 0, 0, 0);
        const projectEnd = new Date(Math.max(new Date(parameters.shutdownEnd).getTime(), results.scheduleEndDate.getTime()));
        projectEnd.setHours(23, 59, 59, 999);
        const dailyData: { date: Date, data: { discipline: string, peakManpower: number, totalManpower: number, totalManHours: number, occupancyRate: number, tasks: ScheduledTask[] }[] }[] = [];
        for (let d = new Date(projectStart); d <= projectEnd; d.setDate(d.getDate() + 1)) {
            const dayStart = new Date(d).getTime();
            const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999); const dayEndTs = dayEnd.getTime();
            const tasksOnDay = results.scheduledTasks.filter(task => task.startTime.getTime() < dayEndTs && task.endTime.getTime() > dayStart);
            if (tasksOnDay.length === 0) continue;
            const byDiscipline: Record<string, ScheduledTask[]> = {};
            tasksOnDay.forEach(task => { const discipline = isColdStopFlow ? task.discipline : task.team; if (!byDiscipline[discipline]) byDiscipline[discipline] = []; byDiscipline[discipline].push(task); });
            const dayInspectorData = Object.entries(byDiscipline).map(([discipline, tasks]) => {
                const uniqueTeamsOnDay = new Set(tasks.map(t => t.team));
                let totalManpowerOnDay = 0;
                uniqueTeamsOnDay.forEach(teamName => { const s = tasks.find(t => t.team === teamName); if (s) totalManpowerOnDay += s.manpower; });
                const totalManHoursOnDay = tasks.reduce((sum, task) => {
                    const startForThisDay = Math.max(task.startTime.getTime(), dayStart);
                    const endForThisDay = Math.min(task.endTime.getTime(), dayEndTs);
                    return sum + ((endForThisDay - startForThisDay) / (1000 * 3600)) * task.manpower;
                }, 0);
                const occupancyRate = (dailyDurationLimit > 0 && totalManpowerOnDay > 0) ? (totalManHoursOnDay / (totalManpowerOnDay * dailyDurationLimit)) * 100 : 0;
                return { discipline, peakManpower: calculatePeakManpowerForTasks(tasks, dayStart, dayEndTs), totalManpower: totalManpowerOnDay, totalManHours: totalManHoursOnDay, occupancyRate, tasks };
            }).sort((a, b) => a.discipline.localeCompare(b.discipline));
            dailyData.push({ date: new Date(d), data: dayInspectorData });
        }
        return dailyData;
    }, [results, parameters, isColdStopFlow, dailyDurationLimit]);

    const handleOpenDetailModal = (date: Date, disciplineData: typeof dailyInspectorData[0]['data'][0]) => {
        const dayStart = new Date(date).getTime();
        const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999); const dayEndTs = dayEnd.getTime();
        const teamsOnDay: Record<string, { tasks: ScheduledTask[], manpower: number }> = {};
        disciplineData.tasks.forEach(task => { if (!teamsOnDay[task.team]) teamsOnDay[task.team] = { tasks: [], manpower: task.manpower }; teamsOnDay[task.team].tasks.push(task); });
        const teamDetails = Object.entries(teamsOnDay).map(([teamName, data]) => {
            let workloadHours = 0, workDurationHours = 0;
            const tasksForDay: { id: number; action: string; startTime: Date; endTime: Date; }[] = [];
            data.tasks.forEach(task => {
                const startForThisDay = Math.max(task.startTime.getTime(), dayStart);
                const endForThisDay = Math.min(task.endTime.getTime(), dayEndTs);
                const durationThisDay = (endForThisDay - startForThisDay) / (1000 * 3600);
                if (durationThisDay > 0) { workloadHours += (durationThisDay * data.manpower); workDurationHours += durationThisDay; tasksForDay.push({ id: task.id, action: task.action, startTime: new Date(startForThisDay), endTime: new Date(endForThisDay) }); }
            });
            const occupancyRate = dailyDurationLimit > 0 ? (workloadHours / (data.manpower * dailyDurationLimit)) * 100 : 0;
            return { name: teamName, manpower: data.manpower, workloadHours, workDurationHours, occupancyRate, tasks: tasksForDay.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()) };
        }).sort((a, b) => a.name.localeCompare(b.name));
        setDetailModalData({ date, discipline: disciplineData.discipline, teams: teamDetails });
    };

    const getOccupancyColor = (rate: number) => { if (rate > 100) return 'text-red-400'; if (rate > 85) return 'text-orange-400'; return 'text-emerald-400'; };

    const totalHH = workloadData.reduce((s, d) => s + d.value, 0);
    const totalTasks = results.scheduledTasks.length;
    const totalTeams = groupedData.reduce((s, d) => s + d.subTeams.length, 0);
    const totalPeople = orgData.reduce((s, d) => s + d.totalPeople, 0);

    const dashTabs = [
        { id: 'workload' as const, label: 'Charge H-H', icon: '⚡' },
        { id: 'tasks' as const, label: 'Tâches', icon: '📋' },
        { id: 'org' as const, label: 'Organisation', icon: '🏗️' },
        { id: 'histogram' as const, label: 'Histogramme', icon: '📊' },
    ];

    return (
        <div className="min-h-screen bg-black">
            {/* HERO HEADER */}
            <header className="relative overflow-hidden border-b border-white/5">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-emerald-600/10"></div>
                <div className="relative px-6 py-6 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            </div>
                            <div>
                                <h1 className="text-2xl font-black text-white tracking-tight">Centre de Pilotage des Ressources</h1>
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Dashboard Décisionnel • Planning par Équipe</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsExportModalOpen(true)} className="group bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all text-sm shadow-lg shadow-blue-500/20 active:scale-95">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            Exporter PDF
                        </button>
                        <button onClick={onBack} className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all text-sm border border-white/5 active:scale-95">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Retour
                        </button>
                    </div>
                </div>
            </header>

            <div className="px-6 py-6 space-y-6">
                {/* TOP KPI CARDS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Charge Totale', value: `${totalHH.toFixed(0)}`, unit: 'H-H', gradient: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/20', text: 'text-blue-400' },
                        { label: 'Tâches Planifiées', value: `${totalTasks}`, unit: 'tâches', gradient: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/20', text: 'text-emerald-400' },
                        { label: 'Équipes Mobilisées', value: `${totalTeams}`, unit: 'équipes', gradient: 'from-amber-500/20 to-amber-600/5', border: 'border-amber-500/20', text: 'text-amber-400' },
                        { label: 'Effectif Total', value: `${totalPeople}`, unit: 'personnes', gradient: 'from-purple-500/20 to-purple-600/5', border: 'border-purple-500/20', text: 'text-purple-400' },
                    ].map((kpi, i) => (
                        <div key={i} className={`relative overflow-hidden rounded-2xl border ${kpi.border} bg-gradient-to-br ${kpi.gradient} p-5 group hover:-translate-y-0.5 transition-all`}>
                            <div className="absolute top-0 right-0 w-20 h-20 bg-white/[0.02] rounded-full -translate-y-1/2 translate-x-1/2"></div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{kpi.label}</p>
                            <div className="flex items-baseline gap-2">
                                <span className={`text-3xl font-black ${kpi.text}`}>{kpi.value}</span>
                                <span className="text-xs font-medium text-slate-500">{kpi.unit}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* DASHBOARD TABS */}
                <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden">
                    <div className="flex border-b border-white/5">
                        {dashTabs.map(tab => (
                            <button key={tab.id} onClick={() => setActiveDashboardTab(tab.id)}
                                className={`flex-1 py-4 px-4 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeDashboardTab === tab.id ? 'bg-white/5 text-white border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]'}`}>
                                <span>{tab.icon}</span> {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="p-6">
                        {/* TAB 1: Workload */}
                        {activeDashboardTab === 'workload' && (
                            <div>
                                <h3 className="text-lg font-black text-white mb-1">Répartition de la Charge de Travail (H-H)</h3>
                                <p className="text-xs text-slate-400 mb-6">Distribution des heures-homme par discipline</p>
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    <div className="lg:col-span-2 h-[400px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={workloadData} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                                                <XAxis type="number" stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                <YAxis dataKey="name" type="category" width={120} stroke="#334155" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 12, fontSize: 12 }} itemStyle={{ color: '#f8fafc' }} formatter={(value: number) => [`${value.toFixed(1)} H-H`, 'Charge']} />
                                                <Bar dataKey="value" name="Heures-Homme" radius={[0, 6, 6, 0]} maxBarSize={28}>
                                                    {workloadData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <div className="w-full h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={workloadData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" stroke="none">
                                                        {workloadData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                                    </Pie>
                                                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 12, fontSize: 12 }} itemStyle={{ color: '#f8fafc' }} formatter={(value: number) => [`${value.toFixed(1)} H-H (${((value / totalHH) * 100).toFixed(1)}%)`, '']} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 2: Tasks per Discipline */}
                        {activeDashboardTab === 'tasks' && (
                            <div>
                                <h3 className="text-lg font-black text-white mb-1">Nombre de Tâches par Discipline</h3>
                                <p className="text-xs text-slate-400 mb-6">Répartition du volume de travaux</p>
                                <div className="h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={taskCountData} margin={{ top: 5, right: 30, left: 10, bottom: 60 }}>
                                            <XAxis dataKey="name" stroke="#334155" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} />
                                            <YAxis stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 12 }} itemStyle={{ color: '#f8fafc' }} />
                                            <Bar dataKey="count" name="Tâches" radius={[6, 6, 0, 0]} maxBarSize={50}>
                                                {taskCountData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: Organizational Structure */}
                        {activeDashboardTab === 'org' && (
                            <div>
                                <h3 className="text-lg font-black text-white mb-1">Structure Organisationnelle</h3>
                                <p className="text-xs text-slate-400 mb-6">Nombre d'équipes par discipline et leur répartition</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {orgData.map((d, i) => (
                                        <div key={d.discipline} className="bg-black/40 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></div>
                                                <h4 className="text-sm font-black text-white uppercase tracking-wider">{d.discipline}</h4>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3 mb-4">
                                                <div className="text-center">
                                                    <p className="text-2xl font-black text-white">{d.teamCount}</p>
                                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Équipes</p>
                                                </div>
                                                <div className="text-center border-x border-white/5">
                                                    <p className="text-2xl font-black" style={{ color: d.color }}>{d.totalPeople}</p>
                                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Personnes</p>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-2xl font-black text-slate-300">{d.totalPeople > 0 ? (d.totalPeople / d.teamCount).toFixed(1) : '0'}</p>
                                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Moy/Éq.</p>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                {d.breakdown.map(b => (
                                                    <div key={b.size} className="flex items-center justify-between text-xs bg-white/[0.03] rounded-lg px-3 py-1.5">
                                                        <span className="text-slate-400">{b.count} équipe{b.count > 1 ? 's' : ''} de <span className="font-bold text-white">{b.size}</span> pers.</span>
                                                        <span className="font-mono text-slate-500">= {b.size * b.count}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* TAB 4: Daily Staff Histogram */}
                        {activeDashboardTab === 'histogram' && (
                            <div>
                                <h3 className="text-lg font-black text-white mb-1">Histogramme des Effectifs Journaliers</h3>
                                <p className="text-xs text-slate-400 mb-6">Par discipline — Basé sur les équipes (pic de mobilisation)</p>
                                {dailyStaffHistogram.labels.length > 0 ? (
                                    <>
                                        <div className="h-[350px] mb-6">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={dailyStaffHistogram.labels.map((label, i) => ({ name: new Date(label + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }), ...dailyStaffHistogram.data[i] }))} margin={{ top: 10, right: 20, left: 0, bottom: 30 }}>
                                                    <XAxis dataKey="name" stroke="#334155" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                                    <YAxis stroke="#334155" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                    <RechartsTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: 12, fontSize: 11 }} itemStyle={{ color: '#f8fafc' }} />
                                                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                                                    {dailyStaffHistogram.disciplines.map((disc, i) => (
                                                        <Bar key={disc} dataKey={disc} stackId="a" fill={DISCIPLINE_COLORS[i % DISCIPLINE_COLORS.length]} radius={i === dailyStaffHistogram.disciplines.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                                                    ))}
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b border-white/10">
                                                        <th className="text-left px-3 py-2.5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Jour</th>
                                                        {dailyStaffHistogram.disciplines.map(d => <th key={d} className="px-3 py-2.5 text-slate-400 font-bold uppercase tracking-wider text-[10px] text-center">{d}</th>)}
                                                        <th className="px-3 py-2.5 text-white font-black uppercase tracking-wider text-[10px] text-center">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {dailyStaffHistogram.labels.map((label, i) => {
                                                        const dayTotal = dailyStaffHistogram.disciplines.reduce((s, d) => s + (dailyStaffHistogram.data[i][d] || 0), 0);
                                                        return (
                                                            <tr key={label} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                                                                <td className="px-3 py-2 font-bold text-slate-300">{new Date(label + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}</td>
                                                                {dailyStaffHistogram.disciplines.map(d => (
                                                                    <td key={d} className="px-3 py-2 text-center">
                                                                        {dailyStaffHistogram.data[i][d] > 0 ? (
                                                                            <span className="font-mono font-bold text-white bg-white/5 px-2 py-0.5 rounded">{dailyStaffHistogram.data[i][d]}</span>
                                                                        ) : <span className="text-slate-600">—</span>}
                                                                    </td>
                                                                ))}
                                                                <td className="px-3 py-2 text-center font-black text-emerald-400">{dayTotal}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                ) : <p className="text-slate-400 text-center py-10">Aucune donnée disponible.</p>}
                            </div>
                        )}
                    </div>
                </div>

                {/* EFFECTIF JOURNALIER (kept & redesigned) */}
                <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6">
                    <h3 className="text-lg font-black text-white mb-1 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center"><svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg></span>
                        Effectif Journalier Requis par Discipline (Pic)
                    </h3>
                    <p className="text-xs text-slate-400 mb-6 ml-10">Cliquez sur une discipline pour voir le détail des équipes</p>
                    <div className="space-y-6">
                        {dailyInspectorData.map(({ date, data }) => (
                            <div key={date.toISOString()}>
                                <h4 className="font-bold text-slate-200 mb-3 text-sm flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    {date.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </h4>
                                {data.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                        {data.map((disciplineData) => (
                                            <button key={disciplineData.discipline} onClick={() => handleOpenDetailModal(date, disciplineData)} className="bg-black/40 border border-white/5 hover:border-emerald-500/30 p-4 rounded-2xl text-center transition-all hover:-translate-y-0.5 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-emerald-500/50">
                                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest truncate mb-2" title={disciplineData.discipline}>{disciplineData.discipline}</p>
                                                <p className="text-3xl font-black text-white mb-1 group-hover:text-emerald-400 transition-colors">{disciplineData.peakManpower}</p>
                                                <p className="text-[10px] text-slate-500">pic · {disciplineData.totalManpower} affectés</p>
                                                <p className={`text-[10px] font-bold mt-1 ${getOccupancyColor(disciplineData.occupancyRate)}`}>
                                                    Occ: {disciplineData.occupancyRate.toFixed(0)}%
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                ) : <p className="text-slate-500 text-center text-sm">Aucune tâche planifiée.</p>}
                            </div>
                        ))}
                        {dailyInspectorData.length === 0 && <p className="text-slate-500 text-center py-10">Aucune tâche planifiée pour ce projet.</p>}
                    </div>
                </div>

                {/* DISCIPLINE DETAIL SECTIONS (kept & redesigned) */}
                <div className="space-y-6">
                    {groupedData.map((discipline, idx) => (
                        <div key={discipline.disciplineName} className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden">
                            <div className="p-5 border-b border-white/5">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: DISCIPLINE_COLORS[idx % DISCIPLINE_COLORS.length] }}></div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">{discipline.disciplineName}</h3>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {[
                                        { v: discipline.kpis.totalPersonnel, l: 'Personnes (Pic)', c: 'text-blue-400' },
                                        { v: discipline.kpis.totalManHours.toFixed(1), l: 'Heures-Homme', c: 'text-emerald-400' },
                                        { v: discipline.kpis.totalDuration.toFixed(1), l: 'Durée Planifiée (H)', c: 'text-amber-400' },
                                    ].map((k, i) => (
                                        <div key={i} className="bg-black/30 border border-white/5 rounded-xl p-4 text-center">
                                            <p className={`text-2xl font-black ${k.c}`}>{k.v}</p>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">{k.l}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4 p-5">
                                {discipline.subTeams.map(team => {
                                    const totalTasksInTeam = team.tasks.length;
                                    const totalDurationInTeam = team.tasks.reduce((sum, t) => sum + t.duration, 0);
                                    return (
                                        <div key={team.name} className="bg-black/30 border border-white/5 rounded-2xl p-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="font-bold text-slate-200 text-sm">{team.name} <span className="text-slate-500 font-normal">({getSubTeamSize(discipline.disciplineName, team.tasks)} pers.)</span></h4>
                                                <button onClick={() => handleShowGantt(`Gantt : ${team.name}`, team.tasks)} className="bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 transition-all active:scale-95">
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                                                    Gantt
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-6 text-xs text-slate-500 mb-3 pb-3 border-b border-white/5">
                                                <span className="font-bold">{totalTasksInTeam} tâche{totalTasksInTeam > 1 ? 's' : ''}</span>
                                                <span className="font-bold">{totalDurationInTeam.toFixed(1)}h total</span>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-left text-xs">
                                                    <thead className="text-slate-500">
                                                        <tr><th className="px-3 py-2 font-bold text-[10px] uppercase tracking-wider">Action</th><th className="px-3 py-2 font-bold text-[10px] uppercase tracking-wider">Équipement</th><th className="px-3 py-2 font-bold text-[10px] uppercase tracking-wider">Début</th><th className="px-3 py-2 font-bold text-[10px] uppercase tracking-wider">Fin</th><th className="px-3 py-2 font-bold text-[10px] uppercase tracking-wider text-right">Pers.</th><th className="px-3 py-2 font-bold text-[10px] uppercase tracking-wider text-right">Durée</th></tr>
                                                    </thead>
                                                    <tbody>
                                                        {team.tasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()).map(task => (
                                                            <tr key={task.id} className="border-t border-white/5 hover:bg-white/[0.03] transition-colors">
                                                                <td className="px-3 py-2 text-slate-200 whitespace-normal">{task.action}</td>
                                                                <td className="px-3 py-2 text-slate-400 whitespace-normal">{task.equipment}</td>
                                                                <td className="px-3 py-2 text-slate-400 whitespace-nowrap font-mono">{formatDate(task.startTime)}</td>
                                                                <td className="px-3 py-2 text-slate-400 whitespace-nowrap font-mono">{formatDate(task.endTime)}</td>
                                                                <td className="px-3 py-2 text-right font-mono text-white font-bold">{task.manpower}</td>
                                                                <td className="px-3 py-2 text-right font-mono text-slate-300">{task.duration.toFixed(1)}h</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* COMBINED DISCIPLINE TASKS SECTION */}
                {results.scheduledTasks.filter(t => t.multiDisciplineId).length > 0 && (
                    <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 mt-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Tâches Multi-Disciplines</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Missions combinées nécessitant une coordination inter-équipes</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {Object.values(results.scheduledTasks.filter(t => t.multiDisciplineId).reduce((acc: Record<string, ScheduledTask[]>, task: ScheduledTask) => {
                                if (!acc[task.multiDisciplineId!]) acc[task.multiDisciplineId!] = [];
                                acc[task.multiDisciplineId!].push(task);
                                return acc;
                            }, {})).sort((a: ScheduledTask[], b: ScheduledTask[]) => a[0].startTime.getTime() - b[0].startTime.getTime()).map((missionTasks: ScheduledTask[], index: number) => {
                                const missionStart = new Date(Math.min(...missionTasks.map(t => t.startTime.getTime())));
                                const missionEnd = new Date(Math.max(...missionTasks.map(t => t.endTime.getTime())));
                                const mainTaskName = missionTasks[0].action || 'Mission Combinée';

                                return (
                                    <div key={missionTasks[0].multiDisciplineId || index} className="bg-black/40 border border-purple-500/20 rounded-2xl p-4 overflow-hidden relative">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500/50"></div>
                                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4 pl-3">
                                            <div>
                                                <h4 className="font-black text-slate-200 text-sm whitespace-normal">{mainTaskName}</h4>
                                                <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
                                                    <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>{formatDate(missionStart)}</span>
                                                    <span>→</span>
                                                    <span className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>{formatDate(missionEnd)}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-end gap-2 flex-wrap max-w-sm">
                                                {missionTasks.map((t, idx) => (
                                                    <span key={idx} className="bg-purple-500/10 border border-purple-500/20 text-purple-400 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg">
                                                        {isColdStopFlow ? t.discipline : t.team} ({t.manpower}P)
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="overflow-x-auto pl-3">
                                            <table className="w-full text-left text-xs">
                                                <thead className="text-slate-500 border-b border-white/5">
                                                    <tr>
                                                        <th className="py-2 pr-3 font-bold text-[9px] uppercase tracking-wider">Discipline/Équipe</th>
                                                        <th className="py-2 px-3 font-bold text-[9px] uppercase tracking-wider">Action Spécifique</th>
                                                        <th className="py-2 px-3 font-bold text-[9px] uppercase tracking-wider">Durée</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {missionTasks.map(task => (
                                                        <tr key={task.id} className="border-b border-white/[0.02] last:border-0 hover:bg-white/[0.02] transition-colors">
                                                            <td className="py-2 pr-3 text-slate-300 font-bold text-[10px] uppercase tracking-widest whitespace-nowrap">{isColdStopFlow ? task.discipline : task.team}</td>
                                                            <td className="py-2 px-3 text-slate-400 whitespace-normal">{task.action}</td>
                                                            <td className="py-2 px-3 text-slate-400 font-mono text-right">{task.duration.toFixed(1)}h</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <GanttModal isOpen={!!ganttModalData} onClose={() => setGanttModalData(null)} title={ganttModalData?.title || ''} tasks={ganttModalData?.tasks || []} parameters={parameters} />
            {results && <TeamPlanningExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} results={results} parameters={parameters} isColdStopFlow={isColdStopFlow} />}
            <TeamDetailModal isOpen={!!detailModalData} onClose={() => setDetailModalData(null)} data={detailModalData} />
        </div >
    );
};

export default React.memo(TeamScheduleView);
