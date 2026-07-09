import React from 'react';
import type { ScheduledTask } from '../types';

interface SpecialTasksViewProps {
    tasks: ScheduledTask[];
}

const formatDate = (date: Date | null) => {
    if (!date) return '-';
    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).replace(' ', ' • ');
}

const getTaskAccent = (action: string): { color: string; bg: string; border: string; glow: string; label: string } => {
    const a = action.toUpperCase();
    if (a.includes('CONSIGNATION') && !a.includes('DE'))
        return { color: '#22d3ee', bg: 'rgba(34,211,238,0.07)', border: 'rgba(34,211,238,0.25)', glow: 'rgba(34,211,238,0.15)', label: 'PHASE CONSIGNATION' };
    if (a.includes('DÉCONSIGNATION') || a.includes('DECONSIGNATION'))
        return { color: '#f59e0b', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.25)', glow: 'rgba(245,158,11,0.15)', label: 'PHASE DÉCONSIGNATION' };
    if (a.includes('DEMARRAGE') || a.includes('DÉMARRAGE'))
        return { color: '#a78bfa', bg: 'rgba(167,139,250,0.07)', border: 'rgba(167,139,250,0.25)', glow: 'rgba(167,139,250,0.15)', label: 'DÉMARRAGE BOUCLE' };
    if (a.includes('COMBUSTION') || a.includes('ALLUMAGE'))
        return { color: '#fb923c', bg: 'rgba(251,146,60,0.07)', border: 'rgba(251,146,60,0.25)', glow: 'rgba(251,146,60,0.15)', label: 'COMBUSTION' };
    if (a.includes('CHEMIN CRITIQUE') || a.includes('CRITIQUE'))
        return { color: '#ef4444', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.25)', glow: 'rgba(239,68,68,0.15)', label: 'CHEMIN CRITIQUE' };
    if (a.includes('DÉBUT') || a.includes('DEBÚT') || a.includes('DEBUT'))
        return { color: '#34d399', bg: 'rgba(52,211,153,0.07)', border: 'rgba(52,211,153,0.25)', glow: 'rgba(52,211,153,0.15)', label: 'DÉBUT TRAVAUX' };
    if (a.includes('FIN'))
        return { color: '#f43f5e', bg: 'rgba(244,63,94,0.07)', border: 'rgba(244,63,94,0.25)', glow: 'rgba(244,63,94,0.15)', label: 'FIN TRAVAUX' };
    return { color: '#10b981', bg: 'rgba(16,185,129,0.07)', border: 'rgba(16,185,129,0.25)', glow: 'rgba(16,185,129,0.15)', label: 'JALON' };
};

export const SpecialTasksView: React.FC<SpecialTasksViewProps> = ({ tasks }) => {
    if (!tasks) return null;

    const sortedTasks = [...tasks].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    if (sortedTasks.length === 0) {
        return (
            <div className="relative bg-[#080b12]/80 backdrop-blur-2xl border border-white/5 p-10 rounded-[2.5rem] shadow-[0_0_60px_rgba(0,0,0,0.6)] overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[100px] -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none" />
                <div className="text-center py-16">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="absolute inset-0 bg-emerald-500/10 rounded-full blur-xl animate-pulse" />
                        <div className="relative w-24 h-24 bg-slate-900/80 rounded-full flex items-center justify-center border border-white/5">
                            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                    </div>
                    <h4 className="text-xl font-black text-white uppercase italic tracking-tight mb-2">Silence Opérationnel</h4>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] max-w-xs mx-auto leading-relaxed">
                        Aucun jalon stratégique n'a été verrouillé pour ce planning.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative bg-[#080b12]/80 backdrop-blur-2xl border border-white/[0.06] rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.7)] overflow-hidden">
            {/* Top shimmer line */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[120px] -translate-y-1/2 translate-x-1/3 rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/5 blur-[100px] translate-y-1/2 -translate-x-1/3 rounded-full pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 p-8 pb-0">
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        {/* Icon block */}
                        <div className="relative flex-shrink-0">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M12 22V12M12 12L2 7l10-5 10 5-10 5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                                </svg>
                            </div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#080b12] shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                        </div>
                        <div>
                            <span className="block text-[9px] font-black text-emerald-500/80 uppercase tracking-[0.45em] mb-0.5">Planification Opérationnelle</span>
                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter leading-none">Chronologie Critique</h3>
                            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mt-0.5">Événements Clés & Jalons Stratégiques</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-500/[0.08] rounded-2xl border border-emerald-500/20 backdrop-blur">
                            <div className="relative">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <div className="w-2 h-2 rounded-full bg-emerald-400/40 animate-ping absolute inset-0" />
                            </div>
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{sortedTasks.length} Jalons Détectés</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline body */}
            <div className="relative z-10 p-8">
                {/* Center spine line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/40 via-white/5 to-transparent -translate-x-1/2 pointer-events-none hidden lg:block" />

                <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-x-12 lg:gap-y-5">
                    {sortedTasks.map((task, idx) => {
                        const accent = getTaskAccent(task.action);
                        const isLeft = idx % 2 === 0;
                        const isDurationTask = task.duration > 0;

                        return (
                            <div
                                key={task.id}
                                className={`group relative flex flex-col transition-all duration-500 hover:-translate-y-0.5 ${isLeft ? 'lg:pr-6' : 'lg:pl-6 lg:mt-10'}`}
                            >
                                {/* Card */}
                                <div
                                    className="relative rounded-2xl border overflow-hidden transition-all duration-500"
                                    style={{
                                        background: `linear-gradient(135deg, ${accent.bg}, rgba(8,11,18,0.95))`,
                                        borderColor: accent.border,
                                        boxShadow: `0 0 40px ${accent.glow}, 0 4px 20px rgba(0,0,0,0.5)`,
                                    }}
                                >
                                    {/* Top shimmer */}
                                    <div className="h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${accent.color}60, transparent)` }} />

                                    <div className="p-5">
                                        {/* Row 1: Number + Label + Duration */}
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div className="flex items-center gap-3">
                                                {/* Numbered bubble */}
                                                <div
                                                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm border"
                                                    style={{
                                                        backgroundColor: `${accent.color}18`,
                                                        borderColor: `${accent.color}40`,
                                                        color: accent.color,
                                                    }}
                                                >
                                                    {String(idx + 1).padStart(2, '0')}
                                                </div>
                                                <div>
                                                    <span className="block text-[8px] font-black uppercase tracking-[0.3em] mb-0.5" style={{ color: `${accent.color}80` }}>{accent.label}</span>
                                                    <h4 className="text-[11px] font-black text-white uppercase tracking-tight leading-tight group-hover:translate-x-0.5 transition-transform">
                                                        {task.action}
                                                    </h4>
                                                </div>
                                            </div>
                                            {isDurationTask && (
                                                <div
                                                    className="flex-shrink-0 px-2.5 py-1.5 rounded-xl border text-center min-w-[56px]"
                                                    style={{ backgroundColor: `${accent.color}12`, borderColor: `${accent.color}30` }}
                                                >
                                                    <span className="block text-[7px] font-black uppercase tracking-wider mb-0.5" style={{ color: `${accent.color}80` }}>Durée</span>
                                                    <span className="text-sm font-black font-mono leading-none" style={{ color: accent.color }}>
                                                        {task.duration.toFixed(1)}<span className="text-[9px] ml-0.5">H</span>
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Row 2: Timeline dates */}
                                        <div className="grid grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: `${accent.color}15` }}>
                                            <div>
                                                <span className="block text-[7px] font-black text-slate-600 uppercase tracking-[0.25em] mb-1">Début</span>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: accent.color }} />
                                                    <span className="text-[10px] font-black font-mono tracking-tight whitespace-nowrap" style={{ color: accent.color }}>
                                                        {formatDate(task.startTime)}
                                                    </span>
                                                </div>
                                            </div>
                                            {task.endTime && task.endTime.getTime() !== task.startTime.getTime() && (
                                                <div>
                                                    <span className="block text-[7px] font-black text-slate-600 uppercase tracking-[0.25em] mb-1">Fin</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                                                        <span className="text-[10px] font-black font-mono tracking-tight text-slate-400 whitespace-nowrap">
                                                            {formatDate(task.endTime)}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Connector dot to center spine (desktop only) */}
                                <div
                                    className={`hidden lg:block absolute top-5 w-3 h-3 rounded-full border-2 border-[#080b12] shadow-lg ${isLeft ? '-right-1.5' : '-left-1.5'}`}
                                    style={{ backgroundColor: accent.color, boxShadow: `0 0 10px ${accent.color}` }}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SpecialTasksView;
