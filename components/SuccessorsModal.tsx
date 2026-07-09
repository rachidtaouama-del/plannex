import React, { useMemo } from 'react';
import type { ScheduledTask } from '../types';

interface SuccessorsModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourceTask: ScheduledTask | null;
    allTasks: ScheduledTask[];
}

const formatDate = (date: Date | null): string => {
    if (!date) return '-';
    return date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const SuccessorsModal: React.FC<SuccessorsModalProps> = ({ isOpen, onClose, sourceTask, allTasks }) => {
    const chain = useMemo(() => {
        if (!sourceTask) return [];

        const resultChain: ScheduledTask[] = [];
        const processedIds = new Set<number>();
        processedIds.add(sourceTask.id);

        let currentTask: ScheduledTask | undefined = sourceTask;
        let safetyCounter = 0;

        while (currentTask && safetyCounter < allTasks.length) {
            safetyCounter++;

            let nextTask: ScheduledTask | undefined;

            const logicalSuccessors = allTasks
                .filter(t => t.predecessor?.includes(currentTask!.id) && !processedIds.has(t.id))
                .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

            if (logicalSuccessors.length > 0) {
                nextTask = logicalSuccessors[0];
            }

            if (!nextTask) {
                const sourceTaskTeam = currentTask.team;
                const sourceTaskEndTime = currentTask.endTime.getTime();
                const tolerance = 1000 * 60;

                const potentialResourceSuccessors = allTasks
                    .filter(task =>
                        task.id !== currentTask!.id &&
                        task.team === sourceTaskTeam &&
                        Math.abs(task.startTime.getTime() - sourceTaskEndTime) < tolerance &&
                        !processedIds.has(task.id)
                    )
                    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

                if (potentialResourceSuccessors.length > 0) {
                    nextTask = potentialResourceSuccessors[0];
                }
            }

            if (nextTask) {
                resultChain.push(nextTask);
                processedIds.add(nextTask.id);
                currentTask = nextTask;
            } else {
                currentTask = undefined;
            }
        }

        return resultChain;
    }, [sourceTask, allTasks]);

    if (!isOpen || !sourceTask) return null;

    const totalHours = chain.reduce((s, t) => s + t.duration, 0);
    const totalMH = chain.reduce((s, t) => s + t.manHours, 0);

    return (
        <div
            className="fixed inset-0 flex justify-center items-center z-[70] p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-5xl max-h-[90vh] flex flex-col rounded-[2rem] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                style={{
                    background: 'linear-gradient(160deg, #09111f 0%, #060d1a 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 0 100px rgba(0,0,0,0.9), 0 0 40px rgba(6,182,212,0.08)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Top accent shimmer */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent pointer-events-none" />
                {/* Corner glow */}
                <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full blur-[80px] pointer-events-none" style={{ background: 'rgba(6,182,212,0.07)' }} />

                {/* ── HEADER ── */}
                <header className="relative z-10 flex items-start justify-between px-8 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-start gap-4 min-w-0 pr-4">
                        {/* Icon */}
                        <div className="relative flex-shrink-0 mt-1">
                            <div className="absolute inset-0 rounded-xl blur-lg opacity-60" style={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)' }} />
                            <div className="relative w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#06b6d4,#3b82f6)' }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.09 8.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21 16z" />
                                </svg>
                            </div>
                        </div>

                        <div className="min-w-0">
                            <p className="text-[9px] font-black text-cyan-500/70 uppercase tracking-[0.4em] mb-1">Chaîne Opérationnelle</p>
                            <h2 className="text-base font-black text-white leading-tight">
                                Tâches Dépendantes de{' '}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">{sourceTask.action}</span>
                            </h2>
                            {/* Stats pill row */}
                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: '#22d3ee' }}>
                                    <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
                                    {chain.length} Successeur{chain.length !== 1 ? 's' : ''}
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#64748b' }}>
                                    {totalHours.toFixed(1)}H Total
                                </div>
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', color: '#64748b' }}>
                                    {totalMH.toFixed(1)} H-H
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 mt-0.5"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#475569' }}
                        onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)';
                            (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
                        }}
                        onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.07)';
                            (e.currentTarget as HTMLButtonElement).style.color = '#475569';
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                </header>

                {/* ── TABLE ── */}
                <main className="relative z-10 overflow-y-auto px-6 py-5">
                    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.025)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    {['#', 'Action & Mission', 'Équipement', 'Début Planifié', 'Fin Planifiée', 'Durée (H)', 'Effectif', 'H-Homme'].map((col, i) => (
                                        <th key={col} className={`px-4 py-3.5 text-[8px] font-black uppercase tracking-[0.3em] text-slate-600 ${i >= 5 ? 'text-right' : ''}`}>
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {chain.length > 0 ? chain.map((task, idx) => (
                                    <tr
                                        key={task.id}
                                        style={{ borderTop: '1px solid rgba(255,255,255,0.03)' }}
                                        onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(6,182,212,0.04)'}
                                        onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                                    >
                                        {/* Index */}
                                        <td className="px-4 py-3.5">
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)', color: '#22d3ee' }}>
                                                {String(idx + 1).padStart(2, '0')}
                                            </div>
                                        </td>
                                        {/* Action */}
                                        <td className="px-4 py-3.5 max-w-[260px]">
                                            <div className="flex items-start gap-2.5">
                                                <div className="mt-1.5 w-1 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: 'rgba(6,182,212,0.5)' }} />
                                                <span className="text-[11px] font-bold text-slate-200 leading-snug">{task.action}</span>
                                            </div>
                                        </td>
                                        {/* Equipment */}
                                        <td className="px-4 py-3.5">
                                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#64748b' }}>
                                                {task.equipment}
                                            </span>
                                        </td>
                                        {/* Start */}
                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <span className="text-[10px] font-black font-mono" style={{ color: '#22d3ee' }}>{formatDate(task.startTime)}</span>
                                        </td>
                                        {/* End */}
                                        <td className="px-4 py-3.5 whitespace-nowrap">
                                            <span className="text-[10px] font-mono text-slate-500">{formatDate(task.endTime)}</span>
                                        </td>
                                        {/* Duration */}
                                        <td className="px-4 py-3.5 text-right">
                                            <span className="text-sm font-black font-mono text-white tabular-nums">{task.duration.toFixed(2)}</span>
                                        </td>
                                        {/* Manpower */}
                                        <td className="px-4 py-3.5 text-right">
                                            <span className="text-sm font-black font-mono text-slate-400 tabular-nums">{task.manpower}</span>
                                        </td>
                                        {/* Man-hours */}
                                        <td className="px-4 py-3.5 text-right">
                                            <span className="text-sm font-black font-mono tabular-nums" style={{ color: '#22d3ee' }}>{task.manHours.toFixed(2)}</span>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Aucune dépendance détectée</p>
                                                    <p className="text-[10px] text-slate-700 mt-1">Aucune tâche logique ou par ressource trouvée.</p>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                            {/* Footer totals */}
                            {chain.length > 0 && (
                                <tfoot>
                                    <tr style={{ borderTop: '2px solid rgba(6,182,212,0.15)', background: 'rgba(6,182,212,0.04)' }}>
                                        <td colSpan={5} className="px-4 py-3.5 text-right">
                                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.35em] italic">Totaux Chaîne</span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-lg font-black font-mono text-white">{totalHours.toFixed(2)}</span>
                                                <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: 'rgba(6,182,212,0.6)' }}>Heures</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <span className="text-lg font-black font-mono text-slate-400">{chain.reduce((s, t) => s + t.manpower, 0)}</span>
                                        </td>
                                        <td className="px-4 py-3.5 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-lg font-black font-mono" style={{ color: '#22d3ee' }}>{totalMH.toFixed(2)}</span>
                                                <span className="text-[7px] font-black uppercase tracking-widest" style={{ color: 'rgba(6,182,212,0.6)' }}>H-H</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
};