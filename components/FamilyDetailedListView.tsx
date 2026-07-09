
import React, { useState, useMemo, useEffect } from 'react';
import type { ScheduledTask } from '../types';

interface FamilyDetailedListViewProps {
    tasks: ScheduledTask[];
    onViewFamilyGantt: (family: string, tasks: ScheduledTask[]) => void;
}

const formatDate = (date: Date) => {
    return date.toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
};

export const FamilyDetailedListView: React.FC<FamilyDetailedListViewProps> = ({ tasks, onViewFamilyGantt }) => {
    const [expandedFamilies, setExpandedFamilies] = useState<Record<string, boolean>>({});

    const groupedData = useMemo(() => {
        const groups: Record<string, ScheduledTask[]> = {};
        tasks.forEach(task => {
            const family = task.family || 'Autres';
            if (!groups[family]) groups[family] = [];
            groups[family].push(task);
        });

        const sortedFamilies = Object.keys(groups).sort();

        return sortedFamilies.map(family => {
            const familyTasks = groups[family].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
            const totalDuration = familyTasks.reduce((sum, t) => sum + t.duration, 0);
            const totalManHours = familyTasks.reduce((sum, t) => sum + t.manHours, 0);

            return {
                name: family,
                tasks: familyTasks,
                stats: {
                    count: familyTasks.length,
                    duration: totalDuration,
                    manHours: totalManHours
                }
            };
        });
    }, [tasks]);

    // Auto-expand all families on mount and when tasks change
    useEffect(() => {
        if (groupedData.length > 0) {
            const allExpanded: Record<string, boolean> = {};
            groupedData.forEach(g => { allExpanded[g.name] = true; });
            setExpandedFamilies(allExpanded);
        }
    }, [groupedData.length]);

    const toggleFamily = (family: string) => {
        setExpandedFamilies(prev => ({ ...prev, [family]: !prev[family] }));
    };

    if (tasks.length === 0) {
        return (
            <div className="text-center py-20 bg-slate-900/50 rounded-[2rem] border-2 border-slate-800 border-dashed animate-in fade-in duration-700">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5 opacity-50">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><path d="M12 2v20M2 12h20" /></svg>
                </div>
                <p className="text-slate-500 font-black uppercase tracking-widest text-xs">Alerte : Aucune donnée de planning détectée</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {groupedData.map((group, groupIdx) => {
                const isExpanded = expandedFamilies[group.name] ?? true;
                // Cycle through accent colors for families
                const accentColors = [
                    { color: '#22d3ee', bg: 'rgba(34,211,238,0.06)', border: 'rgba(34,211,238,0.2)', badge: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' },
                    { color: '#a78bfa', bg: 'rgba(167,139,250,0.06)', border: 'rgba(167,139,250,0.2)', badge: 'bg-violet-500/10 border-violet-500/20 text-violet-400' },
                    { color: '#34d399', bg: 'rgba(52,211,153,0.06)', border: 'rgba(52,211,153,0.2)', badge: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
                    { color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.2)', badge: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
                    { color: '#fb923c', bg: 'rgba(251,146,60,0.06)', border: 'rgba(251,146,60,0.2)', badge: 'bg-orange-500/10 border-orange-500/20 text-orange-400' },
                    { color: '#818cf8', bg: 'rgba(129,140,248,0.06)', border: 'rgba(129,140,248,0.2)', badge: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' },
                ];
                const accent = accentColors[groupIdx % accentColors.length];

                return (
                    <div
                        key={group.name}
                        className="group/card relative rounded-[2rem] border overflow-hidden transition-all duration-300 shadow-xl"
                        style={{
                            background: isExpanded
                                ? `linear-gradient(135deg, ${accent.bg}, rgba(8,11,18,0.97))`
                                : 'rgba(12,16,24,0.8)',
                            borderColor: isExpanded ? accent.border : 'rgba(255,255,255,0.05)',
                            boxShadow: isExpanded
                                ? `0 0 40px ${accent.bg}, 0 4px 24px rgba(0,0,0,0.5)`
                                : '0 4px 16px rgba(0,0,0,0.4)',
                        }}
                    >
                        {/* Top accent line */}
                        <div
                            className="h-px w-full transition-opacity duration-300"
                            style={{
                                background: `linear-gradient(90deg, transparent, ${accent.color}${isExpanded ? '80' : '30'}, transparent)`,
                            }}
                        />

                        {/* Decorative corner glow */}
                        <div
                            className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] pointer-events-none transition-opacity duration-500"
                            style={{ backgroundColor: `${accent.color}10`, opacity: isExpanded ? 1 : 0 }}
                        />

                        {/* Family Header */}
                        <div
                            className="relative z-10 p-5 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer transition-all duration-300 gap-4"
                            onClick={() => toggleFamily(group.name)}
                        >
                            <div className="flex items-center gap-4">
                                {/* Expand icon */}
                                <div
                                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 border"
                                    style={{
                                        backgroundColor: isExpanded ? `${accent.color}18` : 'rgba(255,255,255,0.03)',
                                        borderColor: isExpanded ? `${accent.color}40` : 'rgba(255,255,255,0.06)',
                                        color: isExpanded ? accent.color : '#475569',
                                        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                </div>

                                <div>
                                    {/* Index pill */}
                                    <div className="flex items-center gap-2 mb-1">
                                        <span
                                            className="text-[8px] font-black uppercase tracking-[0.35em] leading-none"
                                            style={{ color: `${accent.color}70` }}
                                        >Famille #{String(groupIdx + 1).padStart(2, '0')}</span>
                                    </div>
                                    <h3
                                        className="text-base font-black text-white uppercase italic tracking-tighter transition-colors"
                                        style={{ color: isExpanded ? 'white' : '#94a3b8' }}
                                    >
                                        {group.name}
                                    </h3>
                                    {/* Stats badges */}
                                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[9px] font-black tracking-widest uppercase ${accent.badge}`}>
                                            <div className="w-1 h-1 rounded-full opacity-80 animate-pulse" style={{ backgroundColor: accent.color }} />
                                            {group.stats.count} Tâches
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[9px] font-black tracking-widest uppercase text-slate-400">
                                            {group.stats.duration.toFixed(1)}H Total
                                        </div>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[9px] font-black tracking-widest uppercase text-slate-500">
                                            {group.stats.manHours.toFixed(1)} H-H
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                <button
                                    onClick={() => onViewFamilyGantt(group.name, group.tasks)}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 active:scale-95 hover:-translate-y-0.5"
                                    style={{
                                        backgroundColor: `${accent.color}12`,
                                        borderColor: `${accent.color}30`,
                                        color: accent.color,
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${accent.color}25`;
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = `${accent.color}60`;
                                        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 20px ${accent.color}20`;
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = `${accent.color}12`;
                                        (e.currentTarget as HTMLButtonElement).style.borderColor = `${accent.color}30`;
                                        (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 3v18h18" /><path d="M18 12H9" /><path d="M15 9h-3" /><path d="M12 6H9" /></svg>
                                    Voir Gantt
                                </button>
                            </div>
                        </div>

                        {/* Detailed Table */}
                        {isExpanded && (
                            <div className="relative z-10 overflow-x-auto px-4 pb-4 animate-in slide-in-from-top-1 duration-200">
                                <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ backgroundColor: 'rgba(6,9,15,0.7)' }}>
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                                <th className="px-5 py-3.5 text-[8px] font-black tracking-[0.3em] uppercase text-slate-600">Action & Mission</th>
                                                <th className="px-5 py-3.5 text-[8px] font-black tracking-[0.3em] uppercase text-slate-600">Équipe</th>
                                                <th className="px-5 py-3.5 text-[8px] font-black tracking-[0.3em] uppercase text-slate-600">Équipement</th>
                                                <th className="px-5 py-3.5 text-[8px] font-black tracking-[0.3em] uppercase text-slate-600">Début</th>
                                                <th className="px-5 py-3.5 text-[8px] font-black tracking-[0.3em] uppercase text-slate-600">Fin</th>
                                                <th className="px-5 py-3.5 text-[8px] font-black tracking-[0.3em] uppercase text-slate-600 text-right">Main-d'œuvre</th>
                                                <th className="px-5 py-3.5 text-[8px] font-black tracking-[0.3em] uppercase text-right" style={{ color: accent.color }}>Durée (h)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {group.tasks.map((task, idx) => (
                                                <tr
                                                    key={task.id}
                                                    className="group/row transition-all duration-200"
                                                    style={{
                                                        borderTop: '1px solid rgba(255,255,255,0.03)',
                                                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = `${accent.color}08`}
                                                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                                                >
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-start gap-3">
                                                            <div
                                                                className="mt-1 w-1 h-3.5 rounded-full flex-shrink-0 transition-colors"
                                                                style={{ backgroundColor: `${accent.color}40` }}
                                                            />
                                                            <span className="text-[11px] font-black text-slate-200 uppercase tracking-tight leading-snug line-clamp-2 group-hover/row:text-white transition-colors" title={task.action}>
                                                                {task.action}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <div
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black tracking-widest uppercase whitespace-nowrap"
                                                            style={{
                                                                backgroundColor: `${accent.color}10`,
                                                                borderColor: `${accent.color}25`,
                                                                color: accent.color,
                                                            }}
                                                        >
                                                            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: accent.color }} />
                                                            {task.team}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span className="text-[9px] font-bold text-slate-500 whitespace-nowrap bg-white/[0.04] border border-white/[0.06] px-2 py-1 rounded-lg uppercase tracking-wider">
                                                            {task.equipment}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black font-mono tracking-tighter whitespace-nowrap" style={{ color: accent.color }}>
                                                                {formatDate(task.startTime).split(' ')[0]}
                                                            </span>
                                                            <span className="text-[11px] font-black text-slate-300 font-mono">
                                                                {formatDate(task.startTime).split(' ')[1]}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-black font-mono tracking-tighter text-slate-500 whitespace-nowrap">
                                                                {formatDate(task.endTime).split(' ')[0]}
                                                            </span>
                                                            <span className="text-[11px] font-black text-slate-400 font-mono">
                                                                {formatDate(task.endTime).split(' ')[1]}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <span className="text-sm font-black text-slate-500 font-mono tabular-nums group-hover/row:text-slate-300 transition-colors">
                                                            {task.manpower}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-right">
                                                        <span
                                                            className="text-sm font-black font-mono tabular-nums"
                                                            style={{ color: accent.color }}
                                                        >
                                                            {task.duration.toFixed(2)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr style={{ borderTop: `2px solid ${accent.color}20`, backgroundColor: `${accent.color}05` }}>
                                                <td colSpan={5} className="px-5 py-4 text-right">
                                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] italic">Total Famille</span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Séquence</span>
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-xl font-black font-mono leading-none" style={{ color: accent.color }}>
                                                            {group.stats.duration.toFixed(2)}
                                                        </span>
                                                        <span className="text-[7px] font-black uppercase tracking-[0.2em] mt-0.5" style={{ color: `${accent.color}60` }}>Heures</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
