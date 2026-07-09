import React, { useMemo, useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, BarChart, Bar, Legend, ReferenceLine
} from 'recharts';
import type { SchedulingTaskData } from '../types';

interface DisciplineAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    discipline: string;
    teams: any[];
    dailyDurationLimit: number;
}

const STATUS_COLORS: Record<string, string> = {
    'Surchargé': '#ef4444',
    'Saturé': '#3b82f6',
    'Occupé': '#f59e0b',
    'Disponible': '#10b981'
};

const STATUS_BG: Record<string, string> = {
    'Surchargé': 'bg-red-500/10 border-red-500/30 text-red-400',
    'Saturé': 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    'Occupé': 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    'Disponible': 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
};

const LOAD_BAR: (pct: number) => string = (pct) => {
    if (pct > 100) return 'bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_12px_rgba(239,68,68,0.5)]';
    if (pct >= 99) return 'bg-gradient-to-r from-blue-600 to-blue-400';
    if (pct >= 80) return 'bg-gradient-to-r from-amber-500 to-amber-300';
    return 'bg-gradient-to-r from-emerald-600 to-emerald-400';
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-slate-950/95 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                {new Date(label).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            {payload.map((p: any) => (
                <div key={p.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-xs font-bold text-white">{p.value?.toFixed(1)} H/H</span>
                </div>
            ))}
        </div>
    );
};

export const DisciplineAnalysisModal: React.FC<DisciplineAnalysisModalProps> = ({
    isOpen, onClose, discipline, teams, dailyDurationLimit
}) => {
    const [activeTab, setActiveTab] = useState<'charts' | 'teams'>('charts');

    const workloadData = useMemo(() => {
        const aggregated: Record<string, number> = {};
        teams.forEach(team => {
            team.allScheduledTasks?.forEach((task: SchedulingTaskData) => {
                const start = new Date(task['START DATE']!);
                const end = new Date(task['END DATE']!);
                let current = new Date(start);
                while (current < end) {
                    const dayKey = current.toISOString().split('T')[0];
                    const endOfDay = new Date(current);
                    endOfDay.setHours(23, 59, 59, 999);
                    const endForThisDay = Math.min(end.getTime(), endOfDay.getTime() + 1);
                    const startForThisDay = Math.max(start.getTime(), current.getTime());
                    if (endForThisDay > startForThisDay) {
                        aggregated[dayKey] = (aggregated[dayKey] || 0) + (endForThisDay - startForThisDay) / 3600000;
                    }
                    current.setDate(current.getDate() + 1);
                    current.setHours(0, 0, 0, 0);
                }
            });
        });
        return Object.entries(aggregated)
            .map(([date, hours]) => ({ date, hours: parseFloat(hours.toFixed(2)) }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [teams]);

    const statusData = useMemo(() => {
        const counts: Record<string, number> = { 'Surchargé': 0, 'Saturé': 0, 'Occupé': 0, 'Disponible': 0 };
        teams.forEach(t => { counts[t.status] = (counts[t.status] || 0) + 1; });
        return Object.entries(counts).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
    }, [teams]);

    const teamPaxData = useMemo(() =>
        teams.map(t => ({ name: t.teamName, pax: t.effectif, hours: parseFloat(t.totalHours.toFixed(1)) }))
            .sort((a, b) => b.hours - a.hours).slice(0, 15),
        [teams]);

    const totalPersonnel = teams.reduce((s, t) => s + t.effectif, 0);
    const totalHours = teams.reduce((s, t) => s + t.totalHours, 0);
    const criticalCount = teams.filter(t => t.status === 'Surchargé').length;
    const avgLoad = teams.length > 0 ? teams.reduce((s, t) => s + t.loadPercentage, 0) / teams.length : 0;

    const sortedTeams = useMemo(() =>
        [...teams].sort((a, b) => b.loadPercentage - a.loadPercentage),
        [teams]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-[#050810] animate-in fade-in duration-300">

            {/* Ambient background orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/5 blur-[120px] rounded-full -translate-y-1/2" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-emerald-600/5 blur-[120px] rounded-full translate-y-1/2" />
                <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-purple-600/4 blur-[100px] rounded-full -translate-y-1/2" />
            </div>

            {/* ── TOP HEADER BAR ── */}
            <header className="relative z-10 flex-shrink-0 flex items-center justify-between px-10 py-5 border-b border-white/5 bg-black/30 backdrop-blur-xl">
                <div className="flex items-center gap-6">
                    {/* Brand mark */}
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                </svg>
                            </div>
                            <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        </div>
                        <div>
                            <div className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.4em] leading-none mb-0.5">PlanneX Engine</div>
                            <div className="text-xl font-black text-white uppercase tracking-[0.15em] leading-none">Analyse de Discipline</div>
                        </div>
                    </div>

                    <div className="w-px h-10 bg-white/5" />

                    {/* Discipline badge */}
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Discipline Active</span>
                        <span className="text-sm font-black text-white uppercase tracking-wider">{discipline}</span>
                    </div>

                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/8 border border-emerald-500/15">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{teams.length} Équipes Opérationnelles</span>
                    </div>
                </div>

                {/* Tab switcher + close */}
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/8 rounded-2xl">
                        {(['charts', 'teams'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${activeTab === tab
                                    ? 'bg-white text-black shadow-lg'
                                    : 'text-slate-500 hover:text-white'
                                    }`}
                            >
                                {tab === 'charts' ? '📊 Vue Analytique' : '👥 Équipes'}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={onClose}
                        className="group w-10 h-10 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-slate-500 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all duration-200"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* ── KPI STRIP ── */}
            <div className="relative z-10 flex-shrink-0 grid grid-cols-4 gap-0 border-b border-white/5 bg-black/20 backdrop-blur-md">
                {[
                    { label: 'Effectif Déployé', value: totalPersonnel, unit: 'PAX', color: 'text-emerald-400', icon: '👥', glow: 'shadow-emerald-500/20' },
                    { label: 'Charge Totale', value: totalHours.toFixed(1), unit: 'H/H', color: 'text-blue-400', icon: '⏱️', glow: 'shadow-blue-500/20' },
                    { label: 'Moyenne Par Équipe', value: (totalPersonnel / (teams.length || 1)).toFixed(1), unit: 'PAX/EQ', color: 'text-purple-400', icon: '📐', glow: 'shadow-purple-500/20' },
                    { label: 'Alertes Critiques', value: criticalCount, unit: 'SURCHARGE', color: criticalCount > 0 ? 'text-red-400' : 'text-emerald-400', icon: criticalCount > 0 ? '🚨' : '✅', glow: criticalCount > 0 ? 'shadow-red-500/20' : 'shadow-emerald-500/20' },
                ].map((kpi, i) => (
                    <div key={i} className={`flex items-center gap-5 px-8 py-5 border-r border-white/5 last:border-none`}>
                        <div className="text-3xl">{kpi.icon}</div>
                        <div>
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{kpi.label}</div>
                            <div className={`font-black tabular-nums ${kpi.color} flex items-baseline gap-2`}>
                                <span className="text-3xl">{kpi.value}</span>
                                <span className="text-[10px] text-slate-500 font-bold">{kpi.unit}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── MAIN CONTENT ── */}
            <div className="relative z-10 flex-grow overflow-hidden">

                {/* ━━━━ CHARTS TAB ━━━━ */}
                {activeTab === 'charts' && (
                    <div className="h-full grid grid-cols-12 gap-0 divide-x divide-white/5 overflow-hidden">

                        {/* LEFT: Workload + Bar chart */}
                        <div className="col-span-8 flex flex-col divide-y divide-white/5 overflow-y-auto custom-scrollbar">

                            {/* Area chart */}
                            <div className="p-8 flex-shrink-0">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                        <h3 className="text-xs font-black text-white uppercase tracking-[0.25em]">Courbe de Charge Temporelle (H/H)</h3>
                                    </div>
                                    {dailyDurationLimit > 0 && (
                                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                            <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Seuil : {dailyDurationLimit}H</span>
                                        </div>
                                    )}
                                </div>
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={workloadData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                            <defs>
                                                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.35} />
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false}
                                                tick={{ fill: '#475569', fontSize: 9, fontWeight: 'bold' }}
                                                tickFormatter={(v) => new Date(v).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                            />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 'bold' }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            {dailyDurationLimit > 0 && (
                                                <ReferenceLine y={dailyDurationLimit} stroke="#f59e0b" strokeDasharray="6 3" strokeWidth={1.5}
                                                    label={{ value: `Max ${dailyDurationLimit}H`, fill: '#f59e0b', fontSize: 9, fontWeight: 'bold', position: 'insideTopRight' }}
                                                />
                                            )}
                                            <Area type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#gradBlue)" dot={false} activeDot={{ r: 5, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Bar chart: hours per team */}
                            <div className="p-8 flex-grow">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                                    <h3 className="text-xs font-black text-white uppercase tracking-[0.25em]">Performance & Effectif par Équipe</h3>
                                    {teams.length > 15 && <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">(Top 15)</span>}
                                </div>
                                <div className="h-[260px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={teamPaxData} barGap={6} margin={{ top: 5, right: 20, bottom: 30, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false}
                                                tick={{ fill: '#475569', fontSize: 8, fontWeight: 'bold' }}
                                                angle={-35} textAnchor="end" interval={0}
                                            />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9 }} />
                                            <Tooltip cursor={{ fill: '#ffffff04' }} contentStyle={{ backgroundColor: '#0a0f1e', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }} itemStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '8px', fontSize: '9px', fontWeight: '900', letterSpacing: '0.1em', textTransform: 'uppercase' }} />
                                            <Bar dataKey="pax" name="Effectif (PAX)" fill="#10b981" radius={[6, 6, 0, 0]} barSize={18} />
                                            <Bar dataKey="hours" name="Heures (H/H)" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={18} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: Donut + Status list */}
                        <div className="col-span-4 flex flex-col divide-y divide-white/5 overflow-y-auto custom-scrollbar">

                            {/* Donut */}
                            <div className="p-7 flex-shrink-0">
                                <div className="flex items-center gap-3 mb-4">
                                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Allocation Statuts</h3>
                                </div>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={statusData} innerRadius={55} outerRadius={80} paddingAngle={6} dataKey="value" stroke="none">
                                                {statusData.map((entry, i) => (
                                                    <Cell key={i} fill={STATUS_COLORS[entry.name] || '#64748b'} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#0a0f1e', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}
                                                itemStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {statusData.map(s => (
                                        <div key={s.name} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${STATUS_BG[s.name] || 'border-white/5 text-slate-400'}`}>
                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[s.name] }} />
                                            <span className="text-[9px] font-black uppercase tracking-wide truncate">{s.name}</span>
                                            <span className="ml-auto text-xs font-black text-white">{s.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Avg load gauge */}
                            <div className="p-7 flex-shrink-0">
                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Charge Moyenne Globale</div>
                                <div className="flex items-baseline gap-3 mb-4">
                                    <span className={`text-4xl font-black tabular-nums ${avgLoad > 100 ? 'text-red-400' : avgLoad > 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                        {Math.round(avgLoad)}
                                    </span>
                                    <span className="text-slate-500 font-bold text-sm">%</span>
                                </div>
                                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ${LOAD_BAR(avgLoad)}`}
                                        style={{ width: `${Math.min(100, avgLoad)}%` }}
                                    />
                                </div>
                                <div className="mt-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                                    {avgLoad > 100 ? '⚠️ Surcharge détectée' : avgLoad > 80 ? '⚠️ Proche de la saturation' : '✅ Charge nominale'}
                                </div>
                            </div>

                            {/* Quick team list */}
                            <div className="flex-grow p-7 overflow-y-auto custom-scrollbar">
                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4">Classement des Équipes</div>
                                <div className="space-y-2">
                                    {sortedTeams.map((team, i) => (
                                        <div key={team.name} className={`p-3 rounded-2xl border transition-all duration-200 ${team.status === 'Surchargé' ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-[8px] font-black text-slate-600 w-4 text-right">{i + 1}</span>
                                                <span className="text-[10px] font-black text-white truncate flex-grow" title={team.name}>{team.teamName}</span>
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${STATUS_BG[team.status] || ''}`}>{team.status}</span>
                                            </div>
                                            <div className="pl-7 flex items-center gap-3">
                                                <div className="flex-grow h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div className={`h-full rounded-full ${LOAD_BAR(team.loadPercentage)}`}
                                                        style={{ width: `${Math.min(100, team.loadPercentage)}%`, transition: 'width 0.8s ease' }} />
                                                </div>
                                                <span className="text-[9px] font-black text-slate-400 w-10 text-right">{Math.round(team.loadPercentage)}%</span>
                                                <span className="text-[9px] font-black text-slate-600">{team.effectif}p</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ━━━━ TEAMS DETAIL TAB ━━━━ */}
                {activeTab === 'teams' && (
                    <div className="h-full overflow-y-auto custom-scrollbar p-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {sortedTeams.map((team, i) => {
                                const overload = Math.max(0, team.maxDailyWorkload - dailyDurationLimit);
                                return (
                                    <div
                                        key={team.name}
                                        className={`relative rounded-[2.5rem] border p-6 flex flex-col gap-4 overflow-hidden transition-all duration-300 hover:scale-[1.01] ${team.status === 'Surchargé'
                                            ? 'bg-red-950/20 border-red-500/25'
                                            : team.status === 'Saturé'
                                                ? 'bg-blue-950/20 border-blue-500/20'
                                                : 'bg-slate-900/50 border-white/8 hover:border-white/15'
                                            }`}
                                    >
                                        {/* Corner rank */}
                                        <div className="absolute top-4 right-4 w-7 h-7 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-[9px] font-black text-slate-600">
                                            #{i + 1}
                                        </div>

                                        {/* Team name + status */}
                                        <div>
                                            <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">{team.discipline}</div>
                                            <div className="text-sm font-black text-white leading-tight pr-8" title={team.teamName}>{team.teamName}</div>
                                            <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg border text-[8px] font-black uppercase tracking-widest ${STATUS_BG[team.status] || ''}`}>
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS_COLORS[team.status] }} />
                                                {team.status}
                                            </div>
                                        </div>

                                        {/* Load bar */}
                                        <div>
                                            <div className="flex justify-between items-center mb-1.5">
                                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Charge</span>
                                                <span className={`text-xs font-black tabular-nums ${team.loadPercentage > 100 ? 'text-red-400' : 'text-slate-300'}`}>{Math.round(team.loadPercentage)}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div className={`h-full rounded-full ${LOAD_BAR(team.loadPercentage)}`}
                                                    style={{ width: `${Math.min(100, team.loadPercentage)}%` }} />
                                            </div>
                                        </div>

                                        {/* Stats grid */}
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-white/3 rounded-xl p-3 border border-white/5">
                                                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Effectif</div>
                                                <div className="text-base font-black text-white">{team.effectif} <span className="text-[9px] text-slate-500">PAX</span></div>
                                            </div>
                                            <div className="bg-white/3 rounded-xl p-3 border border-white/5">
                                                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Charge</div>
                                                <div className="text-base font-black text-white">{team.totalHours.toFixed(1)} <span className="text-[9px] text-slate-500">H/H</span></div>
                                            </div>
                                        </div>

                                        {/* Timeline */}
                                        {(team.firstTaskStart || team.lastTaskEnd) && (
                                            <div className="bg-white/3 rounded-xl p-3 border border-white/5">
                                                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">Plage Opérationnelle</div>
                                                <div className="flex items-center gap-2 text-[9px] font-bold">
                                                    <span className="text-emerald-400">
                                                        {team.firstTaskStart ? team.firstTaskStart.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                                                    </span>
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-600 flex-shrink-0"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                                    <span className="text-blue-400">
                                                        {team.lastTaskEnd ? team.lastTaskEnd.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Overload warning */}
                                        {team.status === 'Surchargé' && overload > 0 && (
                                            <div className="flex items-center justify-between px-3 py-2 bg-red-500/10 rounded-xl border border-red-500/20">
                                                <span className="text-[8px] font-black text-red-400 uppercase tracking-widest">Surcharge Critique</span>
                                                <span className="text-xs font-black text-red-400 animate-pulse">+{overload.toFixed(1)}H</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* ── FOOTER ── */}
            <footer className="relative z-10 flex-shrink-0 flex items-center justify-between px-10 py-4 border-t border-white/5 bg-black/30 backdrop-blur-xl">
                <div className="flex items-center gap-6">
                    <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">PlanneX System Analysis Core v4.2</span>
                    <div className="flex items-center gap-4">
                        {Object.entries(STATUS_COLORS).map(([label, color]) => (
                            <div key={label} className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="flex items-center gap-3 px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all duration-200 active:scale-95"
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    Fermer
                </button>
            </footer>
        </div>
    );
};
