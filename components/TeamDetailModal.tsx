import React, { useState } from 'react';

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

const getOccupancyConfig = (rate: number) => {
    if (rate > 100) return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        glow: 'shadow-[0_0_30px_rgba(239,68,68,0.15)]',
        badgeBg: 'bg-red-500/15 border-red-500/30',
        badgeText: 'text-red-400',
        barFrom: 'from-red-500',
        barTo: 'to-red-400',
        numberBg: 'bg-red-500',
        numberShadow: 'shadow-[0_0_20px_rgba(239,68,68,0.5)]',
        label: 'Surcharge',
        dot: 'bg-red-500',
    };
    if (rate > 85) return {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        glow: 'shadow-[0_0_30px_rgba(249,115,22,0.12)]',
        badgeBg: 'bg-orange-500/15 border-orange-500/30',
        badgeText: 'text-orange-400',
        barFrom: 'from-orange-500',
        barTo: 'to-yellow-400',
        numberBg: 'bg-orange-500',
        numberShadow: 'shadow-[0_0_20px_rgba(249,115,22,0.5)]',
        label: 'Chargé',
        dot: 'bg-orange-500',
    };
    return {
        bg: 'bg-emerald-500/5',
        border: 'border-emerald-500/20',
        glow: 'shadow-[0_0_30px_rgba(16,185,129,0.08)]',
        badgeBg: 'bg-emerald-500/15 border-emerald-500/30',
        badgeText: 'text-emerald-400',
        barFrom: 'from-emerald-500',
        barTo: 'to-cyan-400',
        numberBg: 'bg-emerald-500',
        numberShadow: 'shadow-[0_0_20px_rgba(16,185,129,0.5)]',
        label: 'Disponible',
        dot: 'bg-emerald-500',
    };
};

const formatDateTime = (date: Date) =>
    date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const TeamDetailModal: React.FC<TeamDetailModalProps> = ({ isOpen, onClose, data }) => {
    const [expandedTeam, setExpandedTeam] = useState<string | null>(null);

    if (!isOpen || !data) return null;

    const totalManpower = data.teams.reduce((sum, t) => sum + t.manpower, 0);
    const avgOccupancy = data.teams.length > 0
        ? data.teams.reduce((sum, t) => sum + t.occupancyRate, 0) / data.teams.length
        : 0;
    const totalWorkload = data.teams.reduce((sum, t) => sum + t.workloadHours, 0);
    const overloadedCount = data.teams.filter(t => t.occupancyRate > 100).length;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-10">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/85 backdrop-blur-2xl animate-in fade-in duration-300 pointer-events-auto"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 fade-in duration-400 pointer-events-auto">

                {/* Ambient glow layers */}
                <div className="absolute -top-20 -right-20 w-80 h-80 bg-blue-500/8 blur-[120px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-500/6 blur-[100px] rounded-full pointer-events-none" />

                {/* Glass container */}
                <div className="relative w-full h-full bg-gradient-to-b from-slate-900/95 to-slate-950/98 border border-white/[0.08] rounded-[2rem] shadow-[0_40px_120px_rgba(0,0,0,0.9)] backdrop-blur-xl overflow-hidden flex flex-col">

                    {/* Top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />

                    {/* ── HEADER ── */}
                    <header className="flex-shrink-0 flex items-start justify-between px-8 pt-8 pb-6 relative z-10">
                        <div className="flex items-start gap-5">
                            {/* Icon accent */}
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.15)] flex-shrink-0 mt-0.5">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                    <circle cx="9" cy="7" r="4" />
                                    <path d="M23 21v-2a4 4 0 00-3-3.87" />
                                    <path d="M16 3.13a4 4 0 010 7.75" />
                                </svg>
                            </div>

                            <div>
                                <div className="flex items-center gap-2.5 mb-2">
                                    <span className="text-[9px] font-black text-blue-400/80 uppercase tracking-[0.45em]">Opérations Tactiques</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                                        {data.date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                    </span>
                                </div>
                                <h2 className="text-[1.6rem] font-black text-white uppercase tracking-tight leading-none">
                                    {data.discipline}
                                </h2>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">Matrice de Déploiement</p>
                            </div>
                        </div>

                        {/* Right: Metric badges + close */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                            {/* Metric: Effectif */}
                            <div className="flex flex-col items-center px-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-2xl backdrop-blur-sm">
                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.25em] mb-0.5">Effectif</span>
                                <span className="text-base font-black text-white tabular-nums">{totalManpower} <span className="text-[10px] text-slate-500 font-bold">px</span></span>
                            </div>
                            {/* Metric: Charge */}
                            <div className="flex flex-col items-center px-4 py-2.5 bg-white/[0.04] border border-white/[0.07] rounded-2xl backdrop-blur-sm">
                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.25em] mb-0.5">Charge Tot.</span>
                                <span className="text-base font-black text-white tabular-nums">{totalWorkload.toFixed(1)} <span className="text-[10px] text-slate-500 font-bold">H/H</span></span>
                            </div>
                            {/* Metric: Usage Moyen */}
                            <div className={`flex flex-col items-center px-4 py-2.5 border rounded-2xl backdrop-blur-sm ${avgOccupancy > 90 ? 'bg-red-500/10 border-red-500/25' : 'bg-emerald-500/10 border-emerald-500/25'}`}>
                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.25em] mb-0.5">Usage Moy.</span>
                                <span className={`text-base font-black tabular-nums ${avgOccupancy > 90 ? 'text-red-400' : 'text-emerald-400'}`}>{avgOccupancy.toFixed(0)}<span className="text-[10px] font-bold">%</span></span>
                            </div>
                            {overloadedCount > 0 && (
                                <div className="flex flex-col items-center px-4 py-2.5 bg-red-500/10 border border-red-500/25 rounded-2xl backdrop-blur-sm">
                                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-[0.25em] mb-0.5">Surcharge</span>
                                    <span className="text-base font-black text-red-400 tabular-nums">{overloadedCount} <span className="text-[10px] font-bold">eq.</span></span>
                                </div>
                            )}

                            {/* Close */}
                            <button
                                onClick={onClose}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.07] text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all active:scale-90 ml-1"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </header>

                    {/* Separator */}
                    <div className="mx-8 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent flex-shrink-0" />

                    {/* ── TEAM LIST ── */}
                    <main className="flex-1 overflow-y-auto custom-scrollbar px-8 py-6 relative z-10">
                        {data.teams.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 py-20">
                                <div className="w-16 h-16 rounded-3xl bg-slate-800/50 border border-white/5 flex items-center justify-center">
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-600">
                                        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                                    </svg>
                                </div>
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Aucune donnée opérationnelle</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-3">
                                {data.teams.map((team, idx) => {
                                    const cfg = getOccupancyConfig(team.occupancyRate);
                                    const isExpanded = expandedTeam === team.name;
                                    const teamNumber = team.name.match(/\d+/)?.[0] || String(idx + 1);

                                    return (
                                        <div
                                            key={team.name}
                                            className={`group rounded-2xl border transition-all duration-300 overflow-hidden
                                                ${isExpanded
                                                    ? `${cfg.bg} ${cfg.border} ${cfg.glow}`
                                                    : 'bg-white/[0.025] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1] hover:shadow-[0_4px_24px_rgba(0,0,0,0.4)]'
                                                }`}
                                        >
                                            {/* Card Header Row */}
                                            <button
                                                onClick={() => setExpandedTeam(prev => prev === team.name ? null : team.name)}
                                                className="w-full px-5 py-4 flex items-center gap-4 text-left focus:outline-none"
                                            >
                                                {/* Team Number Badge */}
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-sm flex-shrink-0 transition-transform duration-300 group-hover:scale-105 ${cfg.numberBg} ${cfg.numberShadow}`}>
                                                    {teamNumber}
                                                </div>

                                                {/* Team Name + Manpower */}
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-black text-white text-sm tracking-wide uppercase truncate leading-tight group-hover:text-blue-100 transition-colors">
                                                        {team.name}
                                                    </h3>
                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-slate-600">
                                                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                                                        </svg>
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{team.manpower} personnes</span>
                                                    </div>
                                                </div>

                                                {/* Stats */}
                                                <div className="flex items-center gap-4 flex-shrink-0">
                                                    <div className="text-right">
                                                        <span className="block text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Charge</span>
                                                        <span className="text-sm font-black text-white tabular-nums">{team.workloadHours.toFixed(2)}<span className="text-[9px] text-slate-500 ml-0.5">H/H</span></span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="block text-[8px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Durée</span>
                                                        <span className="text-sm font-black text-white tabular-nums">{team.workDurationHours.toFixed(2)}<span className="text-[9px] text-slate-500 ml-0.5">H</span></span>
                                                    </div>
                                                    {/* Ratio badge */}
                                                    <div className={`min-w-[72px] px-3 py-2 rounded-xl border text-center ${cfg.badgeBg}`}>
                                                        <span className="block text-[7px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">Ratio</span>
                                                        <span className={`text-sm font-black tabular-nums ${cfg.badgeText}`}>{team.occupancyRate.toFixed(1)}%</span>
                                                    </div>
                                                    {/* Status pill */}
                                                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/30 border border-white/5">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{cfg.label}</span>
                                                    </div>
                                                    {/* Chevron */}
                                                    <svg
                                                        width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                                        className={`text-slate-600 transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-180 text-blue-400' : ''}`}
                                                    >
                                                        <path d="M6 9l6 6 6-6" />
                                                    </svg>
                                                </div>
                                            </button>

                                            {/* Progress bar */}
                                            <div className="px-5 pb-4">
                                                <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/[0.04]">
                                                    <div
                                                        className={`h-full rounded-full bg-gradient-to-r ${cfg.barFrom} ${cfg.barTo} transition-all duration-1000 ease-out relative`}
                                                        style={{ width: `${Math.min(100, team.occupancyRate)}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 rounded-full" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded: Task List */}
                                            {isExpanded && (
                                                <div className="px-5 pb-5 pt-1 border-t border-white/[0.06] animate-in slide-in-from-top-2 duration-300">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Missions de la Période · {team.tasks.length} tâche{team.tasks.length !== 1 ? 's' : ''}</span>
                                                    </div>
                                                    {team.tasks.length > 0 ? (
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                                            {team.tasks.map(task => (
                                                                <div
                                                                    key={task.id}
                                                                    className="flex items-start gap-3 p-3.5 rounded-xl bg-black/30 border border-white/[0.05] hover:border-blue-500/25 hover:bg-blue-500/5 transition-all duration-200 group/task"
                                                                >
                                                                    <div className="w-1 h-full min-h-[24px] rounded-full bg-blue-500/40 flex-shrink-0 mt-0.5" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-[10px] font-black text-slate-200 uppercase tracking-wide leading-tight group-hover/task:text-blue-300 transition-colors truncate">
                                                                            {task.action}
                                                                        </p>
                                                                        <div className="flex items-center gap-1.5 mt-1.5">
                                                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-600 flex-shrink-0">
                                                                                <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                                                                            </svg>
                                                                            <span className="text-[8px] font-black text-slate-600 font-mono tracking-wide">
                                                                                {formatDateTime(task.startTime)} — {formatDateTime(task.endTime)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="py-6 text-center bg-black/20 rounded-xl border border-dashed border-white/5">
                                                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Silence Radar · Aucune mission active</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </main>

                    {/* ── FOOTER ── */}
                    <div className="mx-8 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent flex-shrink-0" />
                    <footer className="flex-shrink-0 flex items-center justify-between px-8 py-4 relative z-10">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.7)] animate-pulse" />
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">
                                Flux temps réel · PlanneX Analytics
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex items-center gap-2.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-[9px] uppercase tracking-[0.3em] rounded-xl transition-all shadow-lg shadow-blue-900/40 border border-blue-400/20"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                            Terminer Session
                        </button>
                    </footer>
                </div>
            </div>
        </div>
    );
};