import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

export interface TeamDetailData {
    date: Date;
    discipline: string;
    teams: {
        name: string;
        manpower: number;
        workloadHours: number;
        workDurationHours: number;
        occupancyRate: number;
        tasks: {
            id: number;
            action: string;
            startTime: Date;
            endTime: Date;
        }[];
    }[];
}

interface TeamDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: TeamDetailData | null;
}

const ProgressBar: React.FC<{ progress: number; color: string; }> = ({ progress, color }) => (
    <div className="w-full bg-slate-800/50 rounded-full h-3 overflow-hidden border border-white/5 relative shadow-inner">
        <div
            className={`h-full rounded-full transition-all duration-1000 ease-out relative ${color}`}
            style={{ width: `${Math.min(100, progress)}%` }}
        >
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            {progress > 100 && (
                <div className="absolute inset-0 bg-red-400 animate-[pulse_0.5s_ease-in-out_infinite] opacity-50"></div>
            )}
        </div>
    </div>
);

export const TeamDetailModal: React.FC<TeamDetailModalProps> = ({ isOpen, onClose, data }) => {
    const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

    // --- ANALYTICS PREPARATION ---
    const chartData = useMemo(() => {
        if (!data) return [];
        return data.teams.map(t => ({
            name: t.name.replace(data.discipline, '').trim() || t.name,
            charge: parseFloat(t.workloadHours.toFixed(2)),
            rate: Math.round(t.occupancyRate)
        }));
    }, [data]);

    const pieData = useMemo(() => {
        if (!data) return [];
        const statusCounts = {
            'Surcharge': data.teams.filter(t => t.occupancyRate > 100).length,
            'Optimal': data.teams.filter(t => t.occupancyRate <= 100 && t.occupancyRate > 70).length,
            'Disponible': data.teams.filter(t => t.occupancyRate <= 70).length,
        };
        return Object.entries(statusCounts)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({ name, value }));
    }, [data]);

    const COLORS = {
        'Surcharge': '#ef4444',
        'Optimal': '#3b82f6',
        'Disponible': '#10b981'
    };

    if (!isOpen || !data) return null;

    const getOccupancyInfo = (rate: number): { color: string; textColor: string; shadow: string } => {
        if (rate > 100) return { color: 'bg-red-500', textColor: 'text-red-400', shadow: 'shadow-[0_0_15px_rgba(239,68,68,0.4)]' };
        if (rate > 85) return { color: 'bg-orange-500', textColor: 'text-orange-400', shadow: 'shadow-[0_0_15px_rgba(249,115,22,0.4)]' };
        return { color: 'bg-emerald-500', textColor: 'text-emerald-400', shadow: 'shadow-[0_0_15_rgba(16,185,129,0.4)]' };
    };

    const handleToggle = (teamName: string) => {
        setExpandedTeam(prev => (prev === teamName ? null : teamName));
    };

    const formatDate = (date: Date) => date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const totalManpower = data.teams.reduce((sum, t) => sum + t.manpower, 0);
    const avgOccupancy = data.teams.length > 0 ? (data.teams.reduce((sum, t) => sum + t.occupancyRate, 0) / data.teams.length) : 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8">
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300 pointer-events-auto"
                onClick={onClose}
            ></div>

            <div className="relative w-full max-w-6xl max-h-[90vh] bg-slate-900 border border-white/10 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-500 pointer-events-auto">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[100px] -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none"></div>

                <header className="flex justify-between items-center p-8 border-b border-white/5 relative z-10 bg-slate-900/50 backdrop-blur-md">
                    <div className="flex items-center gap-6">
                        <div className="w-2 h-12 bg-blue-500 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)]"></div>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Opérations Tactiques</span>
                                <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{data.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                            </div>
                            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Détail Radar : {data.discipline}</h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-4 rounded-2xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all border border-white/5 group active:scale-90"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:rotate-90 transition-transform"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                </header>

                <main className="flex-grow overflow-hidden flex flex-col lg:flex-row relative z-10">
                    {/* Left Panel: Analytics & Stats */}
                    <div className="w-full lg:w-[350px] bg-black/20 border-r border-white/5 p-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar">
                        <div>
                            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-6">Expertise & Métriques</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/5">
                                    <span className="block text-[8px] font-black text-slate-500 uppercase mb-1">Effectif Total</span>
                                    <span className="text-xl font-black text-white">{totalManpower} <span className="text-[10px] text-slate-500">PX</span></span>
                                </div>
                                <div className="bg-slate-800/40 p-4 rounded-2xl border border-white/5">
                                    <span className="block text-[8px] font-black text-slate-500 uppercase mb-1">Usage Moyen</span>
                                    <span className={`text-xl font-black ${avgOccupancy > 90 ? 'text-red-400' : 'text-blue-400'}`}>{avgOccupancy.toFixed(0)}%</span>
                                </div>
                            </div>
                        </div>

                        {/* Chart: Bar Workload */}
                        <div className="bg-slate-800/20 p-4 rounded-[2rem] border border-white/5">
                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Charge par Unité (H/H)</h4>
                            <div className="h-[180px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData}>
                                        <XAxis dataKey="name" hide />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #ffffff10', fontSize: '10px' }}
                                        />
                                        <Bar dataKey="charge" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Chart: Status Pie */}
                        <div className="bg-slate-800/20 p-4 rounded-[2rem] border border-white/5">
                            <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Saturation des Équipes</h4>
                            <div className="h-[180px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} dataKey="value" innerRadius={40} outerRadius={60} paddingAngle={4}>
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={(COLORS as any)[entry.name]} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #ffffff10', fontSize: '10px' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-wrap gap-3 mt-2 justify-center">
                                {pieData.map(d => (
                                    <div key={d.name} className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: (COLORS as any)[d.name] }}></div>
                                        <span className="text-[8px] font-bold text-slate-500 uppercase">{d.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel: Team List */}
                    <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                        <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-6">Matrice de Déploiement</h3>
                        <div className="flex flex-col gap-4">
                            {data.teams.map(team => {
                                const { color, textColor, shadow } = getOccupancyInfo(team.occupancyRate);
                                const isExpanded = expandedTeam === team.name;

                                return (
                                    <div
                                        key={team.name}
                                        className={`group bg-slate-800/40 rounded-3xl border border-white/5 transition-all duration-300 hover:border-white/10 ${isExpanded ? 'ring-1 ring-blue-500/30 bg-slate-800/70 shadow-2xl' : ''}`}
                                    >
                                        <button
                                            onClick={() => handleToggle(team.name)}
                                            className="w-full p-6 text-left focus:outline-none"
                                        >
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white ${color} ${shadow}`}>
                                                        {team.name.match(/\d+/)?.[0] || 'EQ'}
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-white text-lg tracking-tight uppercase italic">{team.name}</h3>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-500"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
                                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{team.manpower} personnes</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-8 self-end md:self-auto">
                                                    <div className="text-right">
                                                        <span className="block text-[8px] font-black text-slate-600 uppercase tracking-widest">Charge</span>
                                                        <span className="text-sm font-black text-white tabular-nums">{team.workloadHours.toFixed(2)}<span className="text-[10px] text-slate-500 ml-1 italic font-medium">H/H</span></span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block text-[8px] font-black text-slate-600 uppercase tracking-widest">Durée</span>
                                                        <span className="text-sm font-black text-white tabular-nums">{team.workDurationHours.toFixed(2)}<span className="text-[10px] text-slate-500 ml-1 italic font-medium">H</span></span>
                                                    </div>
                                                    <div className={`text-right px-3 py-1 rounded-lg bg-black/40 border border-white/5 ${shadow.replace('shadow-', 'shadow-inner-')}`}>
                                                        <span className="block text-[8px] font-black text-slate-500 uppercase tracking-widest">Ratio</span>
                                                        <span className={`text-sm font-black tabular-nums transition-colors ${textColor}`}>{team.occupancyRate.toFixed(1)}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <ProgressBar progress={team.occupancyRate} color={color} />
                                        </button>

                                        {isExpanded && (
                                            <div className="px-6 pb-6 pt-2 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Missions de la Période</h4>
                                                </div>
                                                {team.tasks.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {team.tasks.map(task => (
                                                            <div key={task.id} className="bg-black/40 p-4 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors group/task">
                                                                <p className="text-[11px] font-black text-white tracking-wide uppercase leading-tight group-hover/task:text-blue-400 transition-colors">{task.action}</p>
                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-600"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                                                                    <span className="text-[9px] font-black text-slate-500 tracking-[0.1em]">
                                                                        {formatDate(task.startTime)} — {formatDate(task.endTime)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-8 text-center bg-black/20 rounded-2xl border border-dashed border-white/5">
                                                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic tracking-tighter">Silence Radar • Aucune mission active</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {data.teams.length === 0 && (
                                <div className="py-20 text-center">
                                    <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-600"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>
                                    </div>
                                    <p className="text-slate-500 font-black uppercase tracking-widest text-[10px]">Aucune donnée opérationnelle pour ce secteur</p>
                                </div>
                            )}
                        </div>
                    </div>
                </main>

                <footer className="p-6 border-t border-white/5 bg-black/40 flex justify-between items-center relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">Flux de données en temps réel &bull; Module Analytique PlanEx</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-[0.3em] px-12 py-3 rounded-2xl transition-all shadow-xl shadow-blue-500/20 group active:scale-95 border border-blue-400/30"
                    >
                        Terminer Session
                    </button>
                </footer>
            </div>
        </div>
    );
};