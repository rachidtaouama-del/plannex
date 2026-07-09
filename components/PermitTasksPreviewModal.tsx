import React, { useState, useMemo } from 'react';
import type { ScheduledTask } from '../types';

const fmt = (date: Date, withTime = true): string => {
    if (!date || isNaN(date.getTime())) return 'N/A';
    const d = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    if (!withTime) return d;
    return `${d} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

interface PermitTasksPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: ScheduledTask[];
    onBack: () => void;
    onDownload: () => Promise<void>;
    title: string;
    iconColorClass: string;
    buttonColorClass: string;
    buttonHoverColorClass: string;
}

// Map the Tailwind color class to a CSS hex accent + gradient for the premium look
const resolveAccent = (iconColorClass: string): { hex: string; rgb: string } => {
    if (iconColorClass.includes('red')) return { hex: '#ef4444', rgb: '239,68,68' };
    if (iconColorClass.includes('orange')) return { hex: '#f97316', rgb: '249,115,22' };
    if (iconColorClass.includes('amber') || iconColorClass.includes('yellow')) return { hex: '#f59e0b', rgb: '245,158,11' };
    if (iconColorClass.includes('purple')) return { hex: '#a855f7', rgb: '168,85,247' };
    if (iconColorClass.includes('blue') || iconColorClass.includes('sky')) return { hex: '#3b82f6', rgb: '59,130,246' };
    if (iconColorClass.includes('emerald') || iconColorClass.includes('green')) return { hex: '#10b981', rgb: '16,185,129' };
    if (iconColorClass.includes('cyan')) return { hex: '#06b6d4', rgb: '6,182,212' };
    return { hex: '#94a3b8', rgb: '148,163,184' };
};

export const PermitTasksPreviewModal: React.FC<PermitTasksPreviewModalProps> = ({
    isOpen, onClose, tasks, onBack, onDownload, title, iconColorClass,
}) => {
    const [isExporting, setIsExporting] = useState(false);
    const [search, setSearch] = useState('');

    const { hex: accent, rgb } = resolveAccent(iconColorClass);

    const filtered = useMemo(() => {
        const s = search.toLowerCase().trim();
        const sorted = [...tasks].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        if (!s) return sorted;
        return sorted.filter(t =>
            t.action.toLowerCase().includes(s) ||
            t.equipment.toLowerCase().includes(s) ||
            (t.team || '').toLowerCase().includes(s)
        );
    }, [tasks, search]);

    const teamsSet = useMemo(() => new Set(tasks.map(t => t.team).filter(Boolean)), [tasks]);
    const totalHH = useMemo(() => tasks.reduce((s, t) => s + t.duration * t.manpower, 0), [tasks]);

    if (!isOpen) return null;

    const handleExport = async () => {
        setIsExporting(true);
        try { await onDownload(); }
        catch (e) { console.error(`Failed to export PDF for ${title}:`, e); alert("Une erreur est survenue lors de l'export."); }
        finally { setIsExporting(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
            <div
                className="relative w-full max-w-6xl bg-[#070b16] border border-white/[0.07] rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[92vh] overflow-hidden"
                style={{ animation: 'modalIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Shimmer top */}
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}80, transparent)` }} />
                {/* Ambient glow */}
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] pointer-events-none opacity-15" style={{ background: accent }} />

                {/* ── HEADER ─────────────────────────────────────────────── */}
                <header className="relative flex items-center justify-between px-8 py-6 border-b border-white/[0.05] flex-shrink-0">
                    <div className="flex items-center gap-4">
                        {/* Icon */}
                        <div className="p-3 rounded-2xl border" style={{ background: `${accent}20`, borderColor: `${accent}40`, color: accent }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-[0.5em] mb-0.5" style={{ color: accent }}>Autorisation d'Accès · Permis de Travail</p>
                            <h2 className="text-2xl font-black text-white tracking-tight leading-none">{title}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.06] transition-all">
                            ← Retour
                        </button>
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl text-white transition-all disabled:opacity-50"
                            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)`, boxShadow: `0 0 20px ${accent}40` }}
                        >
                            {isExporting ? (
                                <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            )}
                            {isExporting ? 'Export...' : 'Télécharger PDF'}
                        </button>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-500 hover:text-white border border-white/[0.06] transition-all">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </header>

                {/* ── STATS BAR ──────────────────────────────────────────── */}
                <div className="flex items-center gap-4 px-8 py-4 border-b border-white/[0.04] flex-shrink-0 bg-white/[0.01]">
                    {[
                        { v: tasks.length, l: 'Tâches concernées', col: accent },
                        { v: teamsSet.size, l: 'Équipes impliquées', col: '#94a3b8' },
                        { v: totalHH.toFixed(1) + ' h', l: 'Charge totale H-H', col: '#94a3b8' },
                    ].map((s, i) => (
                        <div key={i} className="flex items-center gap-2.5 px-4 py-2 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                            <span className="text-lg font-black" style={{ color: s.col }}>{s.v}</span>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">{s.l}</span>
                        </div>
                    ))}
                    {/* Spacer + Search */}
                    <div className="ml-auto flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Rechercher..."
                            className="bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none w-40"
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="text-slate-600 hover:text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>
                </div>

                {/* ── TABLE ──────────────────────────────────────────────── */}
                <main className="flex-1 overflow-hidden flex flex-col">
                    <div className="overflow-y-auto tactical-scrollbar flex-1">
                        <table className="w-full text-left min-w-[700px]">
                            <thead className="sticky top-0 bg-[#070b16] border-b border-white/[0.05]">
                                <tr>
                                    {['#', 'Début', 'Fin', 'Action', 'Équipement', 'Équipe', 'Durée'].map(h => (
                                        <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((task, idx) => (
                                    <tr key={task.id} className="group border-t border-white/[0.03] hover:bg-white/[0.025] transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black" style={{ background: `${accent}20`, color: accent }}>{idx + 1}</span>
                                        </td>
                                        <td className="px-6 py-4 text-[11px] font-bold text-slate-400 whitespace-nowrap">{fmt(task.startTime)}</td>
                                        <td className="px-6 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">{fmt(task.endTime)}</td>
                                        <td className="px-6 py-4 text-[11px] font-bold text-white uppercase tracking-tight leading-snug max-w-[260px]">{task.action}</td>
                                        <td className="px-6 py-4 text-[11px] font-bold text-slate-400 max-w-[160px] truncate">{task.equipment}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest border" style={{ background: `${accent}15`, borderColor: `${accent}30`, color: accent }}>
                                                {task.team}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-[11px] font-bold text-slate-500">{task.duration.toFixed(1)}h</td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr><td colSpan={7} className="py-20 text-center text-[11px] font-black text-slate-700 uppercase tracking-widest">Aucune tâche trouvée</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
            <style>{`@keyframes modalIn{from{opacity:0;transform:scale(0.97) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
        </div>
    );
};
