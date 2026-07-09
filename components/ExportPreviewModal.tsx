import React, { useMemo, useState } from 'react';
import type { ScheduledTask } from '../types';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
    AreaChart,
    Area
} from 'recharts';

export interface PreviewData {
    totalTasksInProject: number;
    totalTasks: number; // Filtered
    totalManHours: number;
    familyCount: number;
    estimatedPages: number;
    chartData: { label: string; value: number; color?: string; isOverloaded?: boolean }[];
    chartType: 'families' | 'days';
    maintenanceStats: { label: string; count: number; color: string; percentage: number }[];
    sampleTasks: ScheduledTask[];
    warnings: string[];
    healthStats: {
        missingDuration: number;
        missingManpower: number;
        outOfBounds: number;
    };
    dailyResourceData?: { date: string; disciplines: { name: string; value: number; color: string }[] }[];
}

interface ExportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: PreviewData | null;
    selectedColumns: { key: string; label: string }[];
}

// --- SUB-COMPONENTS ---

const HealthHUD: React.FC<{ stats: PreviewData['healthStats']; warnings: string[] }> = ({ stats, warnings }) => {
    const totalIssues = stats.missingDuration + stats.missingManpower + stats.outOfBounds;
    const score = Math.max(5, 100 - (totalIssues * 5) - (warnings.length * 2));

    const color = score > 85 ? 'text-emerald-400' : score > 60 ? 'text-yellow-400' : 'text-red-400';
    const bg = score > 85 ? 'bg-emerald-500' : score > 60 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-current opacity-5 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2"></div>

            <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-white/5 flex flex-col items-center justify-center relative">
                    <svg className="absolute -inset-2 rotate-[-90deg]" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/5" />
                        <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" className={color} strokeDasharray={`${score * 2.82}, 282`} strokeLinecap="round" />
                    </svg>
                    <span className={`text-3xl font-black italic tracking-tighter ${color}`}>{score}%</span>
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest -mt-1">Intégrité</span>
                </div>
            </div>

            <div className="flex-1 space-y-4">
                <div>
                    <h3 className="text-lg font-black text-white italic uppercase tracking-tighter leading-none mb-1">Système de Validation de Données</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Diagnostic pré-export // Moteur de vérification v4.0</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {totalIssues === 0 && warnings.length === 0 ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/10">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                            Flux Prêt pour Validation Finale
                        </div>
                    ) : (
                        <>
                            {stats.missingManpower > 0 && <span className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-widest rounded-lg">Manque Effectif ({stats.missingManpower})</span>}
                            {stats.missingDuration > 0 && <span className="px-3 py-1.5 bg-red-400/10 border border-red-400/20 text-red-300 text-[9px] font-black uppercase tracking-widest rounded-lg">Durée Nulle ({stats.missingDuration})</span>}
                            {stats.outOfBounds > 0 && <span className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[9px] font-black uppercase tracking-widest rounded-lg">Anomalie Temporelle ({stats.outOfBounds})</span>}
                        </>
                    )}
                </div>
            </div>

            <div className="md:border-l md:border-white/5 pl-8 hidden lg:block">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status Global</span>
                    <span className={`text-xs font-black uppercase tracking-[0.2em] ${score > 85 ? 'text-emerald-400' : 'text-orange-400'}`}>
                        {score > 85 ? 'OPÉRATIONNEL' : 'ACTION REQUISE'}
                    </span>
                    <div className="flex gap-1 mt-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className={`w-3 h-1 rounded-full ${i < (score / 20) ? bg : 'bg-white/10'}`}></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const AnalyticsKPI: React.FC<{ label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string }> = ({ label, value, sub, icon, color }) => (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-3 group transition-all duration-500 hover:border-white/20 hover:bg-white/[0.07]">
        <div className="flex items-center justify-between">
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white shadow-lg`}>
                {icon}
            </div>
            <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">ACTIF</span>
            </div>
        </div>
        <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">{label}</p>
            <h4 className="text-2xl font-black text-white italic tracking-tighter leading-none">{value}</h4>
            {sub && <p className="text-[10px] font-medium text-slate-500 mt-1 leading-tight">{sub}</p>}
        </div>
    </div>
);

const ChartBar: React.FC<{ label: string; value: number; max: number; color?: string; isOverloaded?: boolean }> = ({ label, value, max, color = "bg-blue-500", isOverloaded }) => {
    const percentage = Math.max(0, (value / max) * 100);
    const finalColor = isOverloaded ? 'bg-red-500' : color;
    return (
        <div className="flex flex-col gap-1 mb-2 text-xs group">
            <div className="flex justify-between text-slate-300">
                <span className={`truncate pr-2 ${isOverloaded ? 'text-red-300 font-bold' : ''}`}>{label}</span>
                <span className="font-mono opacity-70">{value.toFixed(0)}</span>
            </div>
            <div className="w-full bg-slate-700/50 h-1.5 rounded-full overflow-hidden relative">
                <div className={`h-full rounded-full transition-all duration-500 ${finalColor}`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

const ResourceAnalyticalChart: React.FC<{ data: PreviewData['dailyResourceData'] }> = ({ data }) => {
    if (!data || data.length === 0) return <p className="text-slate-500 text-xs italic text-center py-8">Aucune donnée temporelle.</p>;

    const transformedData = data.map(day => {
        const payload: any = { date: new Date(day.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) };
        day.disciplines.forEach(d => payload[d.name] = d.value);
        return payload;
    });

    const disciplines = Array.from(new Set(data.flatMap(d => d.disciplines.map(disc => disc.name))));

    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={transformedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                        {data[0].disciplines.map((d, i) => (
                            <linearGradient key={d.name} id={`color${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={d.color} stopOpacity={0.8} />
                                <stop offset="95%" stopColor={d.color} stopOpacity={0} />
                            </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }}
                    />
                    <RechartsTooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                    />
                    {data[0].disciplines.map((d, i) => (
                        <Area
                            key={d.name}
                            type="monotone"
                            dataKey={d.name}
                            stackId="1"
                            stroke={d.color}
                            fillOpacity={1}
                            fill={`url(#color${i})`}
                        />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

const ResourceMatrixTable: React.FC<{ data: PreviewData['dailyResourceData'] }> = ({ data }) => {
    if (!data || data.length === 0) return null;
    const allDisciplines = Array.from(new Set(data.flatMap(d => d.disciplines.map(disc => disc.name)))).sort();
    const dates = data.map(d => d.date);
    const dailyTotals = data.map(d => d.disciplines.reduce((sum, item) => sum + item.value, 0));

    return (
        <div className="overflow-x-auto scrollbar-hide mt-2 border border-white/5 rounded-2xl bg-black/20">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-white/5">
                        <th className="p-4 sticky left-0 bg-slate-900 z-20 border-r border-white/5 font-black text-[9px] uppercase tracking-widest text-slate-500 min-w-[140px]">Discipline</th>
                        {dates.map(date => (
                            <th key={date} className="p-2 text-center min-w-[45px] border-l border-white/5 font-black text-[9px] uppercase tracking-tighter text-slate-500">
                                {new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="text-slate-300">
                    {allDisciplines.map((disc, idx) => (
                        <tr key={disc} className={`${idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'} hover:bg-white/[0.05] transition-colors group`}>
                            <td className="p-4 font-bold text-[10px] uppercase text-slate-300 sticky left-0 bg-slate-900 md:bg-inherit border-r border-white/5 z-10 truncate italic tracking-tight">
                                {disc}
                            </td>
                            {data.map((dayData, i) => {
                                const val = dayData.disciplines.find(d => d.name === disc)?.value || 0;
                                return (
                                    <td key={i} className={`p-2 text-center border-l border-white/5 font-mono text-xs ${val === 0 ? 'text-white/5' : 'text-white font-black group-hover:text-cyan-400'}`}>
                                        {val === 0 ? '·' : val}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                    <tr className="bg-cyan-500/10 font-black text-white border-t border-cyan-500/20">
                        <td className="p-4 sticky left-0 bg-slate-900 md:bg-transparent z-10 border-r border-white/5 text-cyan-400 text-[9px] uppercase tracking-[0.2em] italic">Saturation Totale</td>
                        {dailyTotals.map((total, i) => (
                            <td key={i} className="p-2 text-center border-l border-white/5 font-mono text-xs text-cyan-400">
                                {total}
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    );
};

const AdvancedDonut: React.FC<{ data: PreviewData['maintenanceStats'], total: number }> = ({ data, total }) => {
    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={8}
                        dataKey="count"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${entry.label}`} fill={entry.color} stroke="none" />
                        ))}
                    </Pie>
                    <RechartsTooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '10px', fontWeight: 'bold' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

// --- MAIN COMPONENT ---

export const ExportPreviewModal: React.FC<ExportPreviewModalProps> = ({ isOpen, onClose, data, selectedColumns }) => {
    const [viewMode, setViewMode] = useState<'chart' | 'matrix'>('chart');
    const [isSampleOpen, setIsSampleOpen] = useState(false);

    if (!isOpen || !data) return null;

    const maxChartValue = Math.max(...data.chartData.map(d => d.value), 1);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex justify-center items-center z-[100] p-4 animate-in fade-in duration-300" onClick={onClose}>
            <div
                className="bg-slate-900 border border-white/10 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Visual Accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent"></div>

                {/* Header */}
                <header className="px-10 py-8 border-b border-white/5 bg-black/20 flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-400"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none mb-1">Centre de Contrôle Export</h2>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Audit analytique avant génération finale</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5 hover:rotate-90 duration-300"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-10 space-y-10 scrollbar-hide">
                    {/* 1. Health HUD */}
                    <HealthHUD stats={data.healthStats} warnings={data.warnings} />

                    {/* 2. Advanced KPIs Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <AnalyticsKPI
                            label="Flux Tâches"
                            value={data.totalTasks}
                            sub="SEGMENTS FILTRÉS"
                            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 12l2 2 4-4" /></svg>}
                            color="bg-cyan-600 shadow-cyan-500/20"
                        />
                        <AnalyticsKPI
                            label="Intensité H-H"
                            value={data.totalManHours.toFixed(0)}
                            sub="CHARGE GLOBALE ESTIMÉE"
                            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                            color="bg-indigo-600 shadow-indigo-500/20"
                        />
                        <AnalyticsKPI
                            label="Complexité"
                            value={data.familyCount}
                            sub="UNITÉS TECHNIQUES"
                            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>}
                            color="bg-purple-600 shadow-purple-500/20"
                        />
                        <AnalyticsKPI
                            label="Scope Papier"
                            value={`~${data.estimatedPages}`}
                            sub="FORMAT A3 // MASTER"
                            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
                            color="bg-emerald-600 shadow-emerald-500/20"
                        />
                    </div>

                    {/* 3. Main Resource Visual (Bento Grid Main Item) */}
                    {/* 3. Main Analytical Hub */}
                    <div className="bg-white/5 rounded-[2.5rem] border border-white/10 overflow-hidden flex flex-col h-[450px] shadow-2xl relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent"></div>
                        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                            <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.4em] flex items-center gap-4">
                                <span className="w-10 h-px bg-cyan-500/30"></span>
                                Saturation & Analyse des Ressources
                            </h3>
                            <div className="flex bg-white/5 rounded-2xl p-1 border border-white/10">
                                <button
                                    onClick={() => setViewMode('chart')}
                                    className={`px-6 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${viewMode === 'chart' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-white'}`}
                                >
                                    Clinique
                                </button>
                                <button
                                    onClick={() => setViewMode('matrix')}
                                    className={`px-6 py-2 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest ${viewMode === 'matrix' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-500 hover:text-white'}`}
                                >
                                    Matrice
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 p-8 relative overflow-hidden">
                            {viewMode === 'chart' ? (
                                <div className="h-full flex flex-col">
                                    {data.dailyResourceData ? (
                                        <ResourceAnalyticalChart data={data.dailyResourceData} />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full opacity-30 gap-4">
                                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 12H3m18 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            <p className="text-xs font-black uppercase tracking-widest">Absence de données temporelles</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="h-full overflow-auto scrollbar-hide">
                                    {data.dailyResourceData ? (
                                        <ResourceMatrixTable data={data.dailyResourceData} />
                                    ) : (
                                        <div className="flex items-center justify-center h-full opacity-30">
                                            <p className="text-xs font-black uppercase tracking-widest">Matrice indisponible</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 4. Split Visuals */}
                    {/* 4. Cross-Sectional Analytics */}
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Maintenance Breakdown */}
                        <div className="bg-white/5 rounded-[2.5rem] border border-white/10 p-8 flex flex-col items-center">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8 w-full">Corrélation Maintenance</h3>
                            <div className="flex items-center gap-12 w-full h-[180px]">
                                <div className="w-1/2 h-full relative">
                                    <AdvancedDonut data={data.maintenanceStats} total={data.totalTasks} />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-2xl font-black italic text-white leading-none">{data.totalTasks}</span>
                                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Gisement</span>
                                    </div>
                                </div>
                                <div className="flex-1 space-y-4">
                                    {data.maintenanceStats.map((item, idx) => (
                                        <div key={idx} className="flex flex-col gap-1.5 translate-y-2">
                                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }}></div>
                                                    <span className="text-slate-300">{item.label}</span>
                                                </div>
                                                <span className="text-white italic">{item.percentage.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color }}></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Unit Breakdown */}
                        <div className="bg-white/5 rounded-[2.5rem] border border-white/10 p-8 flex flex-col">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6">
                                {data.chartType === 'families' ? 'Intensité par Discipline (H-H)' : 'Densité Opérationnelle par Jour'}
                            </h3>
                            <div className="flex-1 overflow-y-auto scrollbar-hide pr-2 space-y-4">
                                {data.chartData.map((item) => (
                                    <div key={item.label} className="group">
                                        <div className="flex justify-between items-end mb-1.5">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider group-hover:text-cyan-400 transition-colors italic">{item.label}</span>
                                            <span className="font-mono text-[11px] font-black text-white italic tracking-tighter opacity-70">{item.value.toFixed(0)}</span>
                                        </div>
                                        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden relative">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${item.isOverloaded ? 'bg-red-500' : (item.color || 'bg-cyan-500')}`}
                                                style={{ width: `${Math.max(5, (item.value / maxChartValue) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* 5. Terminal: Sample Data Overlay */}
                    <div className="bg-black/40 rounded-[2.5rem] border border-white/5 p-8 relative">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></div>
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Audit des Échantillons ({data.sampleTasks.length} LIGNES)</h3>
                            </div>
                            <button
                                onClick={() => setIsSampleOpen(!isSampleOpen)}
                                className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                            >
                                {isSampleOpen ? 'RÉDUIRE LOG' : 'DÉPLOYER ANALYSE'}
                            </button>
                        </div>

                        {isSampleOpen && (
                            <div className="bg-black/60 rounded-3xl border border-white/5 overflow-hidden animate-in slide-in-from-top-4 duration-500">
                                <div className="overflow-x-auto scrollbar-hide">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/10 bg-white/[0.02]">
                                                {selectedColumns.map(col => (
                                                    <th key={col.key} className="px-6 py-4 font-black text-[9px] uppercase tracking-widest text-slate-500 whitespace-nowrap">{col.label}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {data.sampleTasks.map(task => (
                                                <tr key={task.id} className="hover:bg-cyan-500/5 transition-colors group">
                                                    {selectedColumns.map(col => {
                                                        const val = (task as any)[col.key];
                                                        let displayVal = val;
                                                        if (val instanceof Date) displayVal = val.toLocaleString('fr-FR');
                                                        if (typeof val === 'number') displayVal = val.toFixed(2);
                                                        return (
                                                            <td key={col.key} className="px-6 py-3 whitespace-nowrap max-w-[250px] truncate text-[11px] font-bold text-slate-400 group-hover:text-white transition-colors" title={String(displayVal)}>
                                                                {displayVal || '-'}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Footer Action */}
                <footer className="px-10 py-8 bg-black/40 border-t border-white/5 flex justify-between items-center relative z-20">
                    <div className="flex flex-col">
                        <h4 className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.4em] leading-none mb-2">PlanneX Export Module v4.2</h4>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Diagnostic Intégrité : VALIDÉ // Prêt pour Exportation</p>
                    </div>

                    <button
                        onClick={onClose}
                        className="group relative inline-flex items-center justify-center px-12 py-4 text-xs font-black text-white transition-all duration-300 bg-emerald-600 rounded-2xl hover:bg-emerald-500 hover:scale-105 active:scale-95 shadow-[0_10px_40px_rgba(16,185,129,0.3)] uppercase tracking-[0.2em] italic"
                    >
                        <span className="relative flex items-center gap-3">
                            Lancer l'Exportation PDF
                            <svg className="w-5 h-5 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                        </span>
                    </button>
                </footer>
            </div>
        </div>
    );
};
