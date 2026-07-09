import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { loadProjectsFromDB, createProjectInDB, updateProjectInDB, deleteProjectFromDB, loadSessionFromDB, saveSessionToDB } from '../services/projectService';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ProjectMode = 'expert' | 'libre';
export type ProjectStatus = 'en_cours' | 'termine';

export interface ProjectData {
    id: string;
    name: string;
    description: string;
    mode: ProjectMode;
    status: ProjectStatus;
    createdAt: string;
    updatedAt: string;
    hasSessionData?: boolean;
}

interface ProjectHubProps {
    userId?: string;
    onEnterProject: (project: ProjectData) => void;
    onBack: () => void;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const storageKey = (uid?: string) => `planex_projects${uid ? '_' + uid : ''}`;

export const loadProjects = (uid?: string): ProjectData[] => {
    try {
        const raw = localStorage.getItem(storageKey(uid));
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
};

export const saveProjects = (projects: ProjectData[], uid?: string) => {
    try { localStorage.setItem(storageKey(uid), JSON.stringify(projects)); } catch { }
};

export const markProjectHasData = (projectId: string, uid?: string) => {
    const projects = loadProjects(uid);
    const updated = projects.map(p =>
        p.id === projectId ? { ...p, hasSessionData: true, updatedAt: new Date().toISOString() } : p
    );
    saveProjects(updated, uid);
};

const newId = () => `prj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const PROJECTS_PER_PAGE = 20;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const timeAgo = (iso: string) => {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diff = now - then;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `Il y a ${days}j`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `Il y a ${weeks} sem.`;
    return formatDate(iso);
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ status: ProjectStatus; small?: boolean }> = ({ status, small }) => {
    if (status === 'en_cours') return (
        <span className={`inline-flex items-center gap-1.5 font-black uppercase tracking-widest ${small ? 'text-[7px] px-2 py-0.5' : 'text-[8px] px-2.5 py-1'} rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400`}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block flex-shrink-0" />
            En Cours
        </span>
    );
    return (
        <span className={`inline-flex items-center gap-1.5 font-black uppercase tracking-widest ${small ? 'text-[7px] px-2 py-0.5' : 'text-[8px] px-2.5 py-1'} rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400`}>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            Terminé
        </span>
    );
};

const ModeBadge: React.FC<{ mode: ProjectMode }> = ({ mode }) => (
    <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${mode === 'expert' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400' : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'}`}>
        {mode === 'expert' ? 'Experte' : 'Libre'}
    </span>
);

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

const DeleteConfirmModal: React.FC<{ projectName: string; onConfirm: () => void; onClose: () => void }> = ({ projectName, onConfirm, onClose }) => (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-xl z-[300] flex items-center justify-center p-4" onClick={onClose}>
        <div
            className="relative w-full max-w-sm bg-[#0d0f1a] border border-red-500/20 rounded-[2rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8),0_0_60px_rgba(239,68,68,0.08)]"
            style={{ animation: 'phScaleIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both' }}
            onClick={e => e.stopPropagation()}
        >
            <div className="h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
            <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                </div>
                <p className="text-[9px] font-black text-red-500/60 uppercase tracking-[0.4em] mb-2">Action Irréversible</p>
                <h3 className="text-lg font-black text-white tracking-tight mb-3">Supprimer le projet ?</h3>
                <p className="text-slate-500 text-sm font-medium mb-7 leading-relaxed">
                    Le projet <span className="text-white font-black">"{projectName}"</span> et toutes ses données seront définitivement supprimés.
                </p>
                <div className="flex gap-3">
                    <button onClick={onClose}
                        className="flex-1 py-3.5 rounded-2xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                        Annuler
                    </button>
                    <button onClick={() => { onConfirm(); onClose(); }}
                        className="flex-1 py-3.5 rounded-2xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                        Supprimer
                    </button>
                </div>
            </div>
        </div>
    </div>
);

// ─── Modal: Create / Edit ─────────────────────────────────────────────────────

interface ModalProps {
    initial?: Partial<ProjectData>;
    onSave: (data: Pick<ProjectData, 'name' | 'description' | 'mode' | 'status'>) => void;
    onClose: () => void;
}

const ProjectModal: React.FC<ModalProps> = ({ initial, onSave, onClose }) => {
    const [name, setName] = useState(initial?.name || '');
    const [description, setDescription] = useState(initial?.description || '');
    const [mode, setMode] = useState<ProjectMode>(initial?.mode || 'expert');
    const [status, setStatus] = useState<ProjectStatus>(initial?.status || 'en_cours');
    const isEdit = !!initial?.id;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSave({ name: name.trim(), description: description.trim(), mode, status });
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[200] flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="relative w-full max-w-lg bg-[#070d1c] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.7)]"
                style={{ animation: 'phScaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-[0.4em] mb-1">Project Hub</p>
                            <h2 className="text-xl font-black text-white tracking-tight">{isEdit ? 'Modifier le Projet' : 'Nouveau Projet'}</h2>
                        </div>
                        <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 text-slate-500 hover:text-white transition-all flex items-center justify-center border border-white/8">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-2">Nom du Projet *</label>
                            <input autoFocus value={name} onChange={e => setName(e.target.value)}
                                placeholder="Ex: Arrêt Raffinerie Q2 2026"
                                className="w-full bg-white/[0.03] border border-white/8 hover:border-emerald-500/25 focus:border-emerald-500/40 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium placeholder-slate-700"
                                required />
                        </div>

                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-2">Description</label>
                            <textarea value={description} onChange={e => setDescription(e.target.value)}
                                placeholder="Notes sur ce projet…" rows={3}
                                className="w-full bg-white/[0.03] border border-white/8 hover:border-white/15 focus:border-emerald-500/40 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all font-medium placeholder-slate-700 resize-none" />
                        </div>

                        <div>
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-3">Mode de Planification</label>
                            <div className="grid grid-cols-2 gap-3">
                                {([['expert', 'Planification Experte', 'Import GMAO · Excel', '#3b82f6', '59,130,246'], ['libre', 'Création Libre', 'Feuille blanche', '#06b6d4', '6,182,212']] as const).map(([m, label, sub, accent, rgb]) => (
                                    <button key={m} type="button" onClick={() => setMode(m as ProjectMode)}
                                        className="relative p-4 rounded-2xl border text-left transition-all duration-300 overflow-hidden"
                                        style={{
                                            background: mode === m ? `rgba(${rgb},0.08)` : 'rgba(255,255,255,0.02)',
                                            borderColor: mode === m ? `rgba(${rgb},0.4)` : 'rgba(255,255,255,0.08)',
                                            boxShadow: mode === m ? `0 0 30px rgba(${rgb},0.15)` : 'none',
                                        }}>
                                        {mode === m && <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />}
                                        <p className="text-[11px] font-black text-white mb-0.5">{label}</p>
                                        <p className="text-[9px] font-bold text-slate-600">{sub}</p>
                                        {mode === m && (
                                            <span className="absolute top-3 right-3 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: accent }}>
                                                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {isEdit && (
                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] block mb-2">Statut</label>
                                <div className="flex gap-3">
                                    {([['en_cours', 'En Cours'], ['termine', 'Terminé']] as const).map(([s, label]) => (
                                        <button key={s} type="button" onClick={() => setStatus(s as ProjectStatus)}
                                            className="flex-1 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all"
                                            style={{
                                                background: status === s ? (s === 'en_cours' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)') : 'rgba(255,255,255,0.03)',
                                                borderColor: status === s ? (s === 'en_cours' ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.4)') : 'rgba(255,255,255,0.08)',
                                                color: status === s ? (s === 'en_cours' ? '#f59e0b' : '#10b981') : '#475569',
                                            }}>{label}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={onClose}
                                className="flex-1 py-3.5 rounded-2xl border border-white/8 bg-white/[0.03] hover:bg-white/[0.06] text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95">
                                Annuler
                            </button>
                            <button type="submit"
                                className="flex-[2] py-3.5 rounded-2xl text-black text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 relative overflow-hidden"
                                style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
                                disabled={!name.trim()}>
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
                                <span className="relative z-10">{isEdit ? 'Enregistrer' : 'Créer le Projet'}</span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

// ─── Project Card (Premium) ───────────────────────────────────────────────────

interface CardProps {
    project: ProjectData;
    onEnter: () => void;
    onEdit: () => void;
    onRequestDelete: () => void;
    onDuplicate: () => void;
    onStatusToggle: () => void;
    index: number;
}

const ProjectCard: React.FC<CardProps> = ({ project, onEnter, onEdit, onRequestDelete, onDuplicate, onStatusToggle, index }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const accent = project.mode === 'expert' ? { color: '#3b82f6', rgb: '59,130,246' } : { color: '#06b6d4', rgb: '6,182,212' };
    const hasData = project.hasSessionData;

    return (
        <div
            className="group relative rounded-[1.5rem] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_30px_80px_rgba(0,0,0,0.6)] flex flex-col"
            style={{
                background: 'linear-gradient(145deg, rgba(255,255,255,0.035) 0%, rgba(255,255,255,0.012) 100%)',
                border: '1px solid rgba(255,255,255,0.07)',
                animation: `phFadeInUp 0.5s ease ${0.05 * index}s both`,
            }}
        >
            {/* Top accent line */}
            <div className="h-[2px] transition-opacity duration-500"
                style={{ background: `linear-gradient(90deg, transparent 5%, ${accent.color}60 30%, ${accent.color}40 70%, transparent 95%)` }} />

            {/* Glow on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none rounded-[1.5rem]"
                style={{ boxShadow: `inset 0 0 80px rgba(${accent.rgb},0.04), 0 0 40px rgba(${accent.rgb},0.06)` }} />

            <div className="relative p-5 flex flex-col flex-1 gap-3">
                {/* Header row: badges + menu */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <ModeBadge mode={project.mode} />
                        {hasData && (
                            <span className="text-[6px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1">
                                <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /></svg>
                                Sauvegardé
                            </span>
                        )}
                    </div>

                    {/* 3-dot menu */}
                    <div className="relative flex-shrink-0">
                        <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
                            className="w-7 h-7 rounded-lg bg-white/[0.04] hover:bg-white/10 text-slate-600 hover:text-white flex items-center justify-center transition-all border border-white/[0.06]"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                            </svg>
                        </button>
                        {menuOpen && (
                            <>
                                <div className="fixed inset-0 z-[50]" onClick={() => setMenuOpen(false)} />
                                <div className="absolute right-0 top-full mt-1 w-44 bg-[#0c1428]/95 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[60] backdrop-blur-2xl"
                                    style={{ animation: 'phFadeIn 0.15s ease both' }}>
                                    {[
                                        { label: 'Modifier', icon: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7', action: () => { onEdit(); setMenuOpen(false); }, color: 'text-slate-300' },
                                        { label: 'Dupliquer', icon: 'M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m-6 12h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2z', action: () => { onDuplicate(); setMenuOpen(false); }, color: 'text-blue-400' },
                                    ].map(item => (
                                        <button key={item.label} onClick={item.action}
                                            className={`w-full text-left px-4 py-3 text-[11px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors flex items-center gap-3 ${item.color}`}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                                            {item.label}
                                        </button>
                                    ))}
                                    <div className="h-px bg-white/5" />
                                    <button
                                        onClick={() => { setMenuOpen(false); onRequestDelete(); }}
                                        className="w-full text-left px-4 py-3 text-[11px] font-black uppercase tracking-widest hover:bg-red-500/10 text-red-400 transition-colors flex items-center gap-3"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                            <path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                        </svg>
                                        Supprimer
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Project name */}
                <h3 className="text-[15px] font-black text-white tracking-tight leading-snug line-clamp-2 group-hover:text-white/95 transition-colors">
                    {project.name}
                </h3>

                {/* Description */}
                {project.description && (
                    <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2 font-medium">{project.description}</p>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Footer: status + dates + enter */}
                <div className="border-t border-white/[0.06] pt-3 space-y-2.5">
                    {/* Date info row */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                            <span className="text-[9px] font-bold text-slate-600">{formatDate(project.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            <span className="text-[9px] font-bold text-slate-500" title={`Dernière modification: ${new Date(project.updatedAt).toLocaleString('fr-FR')}`}>
                                {timeAgo(project.updatedAt)}
                            </span>
                        </div>
                    </div>

                    {/* Action row */}
                    <div className="flex items-center justify-between">
                        <button onClick={(e) => { e.stopPropagation(); onStatusToggle(); }}
                            className="cursor-pointer hover:scale-105 transition-transform">
                            <StatusBadge status={project.status} small />
                        </button>
                        <button onClick={onEnter}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 group/btn hover:shadow-lg"
                            style={{
                                background: `linear-gradient(135deg, rgba(${accent.rgb},0.15), rgba(${accent.rgb},0.08))`,
                                border: `1px solid rgba(${accent.rgb},0.3)`,
                                color: accent.color,
                            }}>
                            {hasData ? 'Reprendre' : 'Ouvrir'}
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="group-hover/btn:translate-x-0.5 transition-transform"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── Pagination ───────────────────────────────────────────────────────────────

const Pagination: React.FC<{ currentPage: number; totalPages: number; onPageChange: (p: number) => void }> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const pages: (number | '...')[] = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
            pages.push(i);
        } else if (pages[pages.length - 1] !== '...') {
            pages.push('...');
        }
    }

    return (
        <div className="flex items-center justify-center gap-2 mt-10" style={{ animation: 'phFadeIn 0.5s ease 0.3s both' }}>
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/8 text-slate-500 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
            </button>

            {pages.map((p, i) =>
                p === '...' ? (
                    <span key={`e${i}`} className="text-slate-700 text-xs font-bold px-1">…</span>
                ) : (
                    <button
                        key={p}
                        onClick={() => onPageChange(p)}
                        className={`w-9 h-9 rounded-xl text-[11px] font-black transition-all ${currentPage === p
                            ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.15)]'
                            : 'bg-white/[0.03] border border-white/8 text-slate-500 hover:text-white hover:bg-white/[0.06]'
                            }`}
                    >
                        {p}
                    </button>
                )
            )}

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/8 text-slate-500 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
            </button>
        </div>
    );
};

// ─── Main: ProjectHub ─────────────────────────────────────────────────────────

const ProjectHub: React.FC<ProjectHubProps> = ({ userId, onEnterProject, onBack }) => {
    const [projects, setProjects] = useState<ProjectData[]>(() => loadProjects(userId));
    const [isLoading, setIsLoading] = useState(true);
    const [modal, setModal] = useState<{ mode: 'create' | 'edit'; project?: ProjectData } | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ProjectData | null>(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
    const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'name'>('date_desc');
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        loadProjectsFromDB().then(async cloudProjects => {
            const localProjects = loadProjects(userId);
            const cloudIds = new Set(cloudProjects.map(p => p.id));
            const toMigrate = localProjects.filter(p => !cloudIds.has(p.id));
            const migrated: ProjectData[] = [];
            for (const p of toMigrate) {
                try {
                    const created = await createProjectInDB({ name: p.name, description: p.description, mode: p.mode, status: p.status });
                    if (created) {
                        try {
                            const oldSession = localStorage.getItem(`planex_session_${p.id}`);
                            if (oldSession) {
                                localStorage.setItem(`planex_session_${created.id}`, oldSession);
                                localStorage.removeItem(`planex_session_${p.id}`);
                            }
                            const oldDraft = localStorage.getItem(`planex_draft_${p.id}`);
                            if (oldDraft) {
                                localStorage.setItem(`planex_draft_${created.id}`, oldDraft);
                                localStorage.removeItem(`planex_draft_${p.id}`);
                            }
                        } catch { }
                        migrated.push({ ...created, hasSessionData: p.hasSessionData });
                    }
                } catch { migrated.push(p); }
            }
            const merged = [...cloudProjects, ...migrated];
            if (merged.length > 0) {
                setProjects(merged);
                saveProjects(merged, userId);
            }
        }).catch(() => { }).finally(() => setIsLoading(false));
    }, [userId]);

    const persist = useCallback((updated: ProjectData[]) => {
        setProjects(updated);
        saveProjects(updated, userId);
    }, [userId]);

    const handleCreate = (data: Pick<ProjectData, 'name' | 'description' | 'mode' | 'status'>) => {
        const now = new Date().toISOString();
        const tempId = newId();
        const optimistic: ProjectData = { id: tempId, ...data, hasSessionData: false, createdAt: now, updatedAt: now };
        persist([optimistic, ...projects]);
        setModal(null);
        createProjectInDB(data).then(created => {
            if (created) {
                setProjects(prev => {
                    const updated = prev.map(p => p.id === tempId ? created : p);
                    saveProjects(updated, userId);
                    return updated;
                });
            }
        }).catch(() => { });
    };

    const handleEdit = (data: Pick<ProjectData, 'name' | 'description' | 'mode' | 'status'>) => {
        if (!modal?.project) return;
        const updated = projects.map(p =>
            p.id === modal.project!.id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
        );
        persist(updated);
        setModal(null);
        updateProjectInDB(modal.project.id, { name: data.name, description: data.description, status: data.status }).catch(() => { });
    };

    const handleDelete = (id: string) => {
        persist(projects.filter(p => p.id !== id));
        try { localStorage.removeItem(`planex_session_${id}`); } catch { }
        deleteProjectFromDB(id).catch(() => { });
    };

    const handleDuplicate = (id: string) => {
        const src = projects.find(p => p.id === id);
        if (!src) return;
        const now = new Date().toISOString();
        const tempId = newId();
        const copy: ProjectData = { ...src, id: tempId, name: src.name + ' (Copie)', status: 'en_cours', hasSessionData: src.hasSessionData, createdAt: now, updatedAt: now };

        try {
            const srcSession = localStorage.getItem(`planex_session_${id}`);
            if (srcSession) localStorage.setItem(`planex_session_${tempId}`, srcSession);
            const srcDraft = localStorage.getItem(`planex_draft_${id}`);
            if (srcDraft) localStorage.setItem(`planex_draft_${tempId}`, srcDraft);
        } catch { }

        persist([copy, ...projects]);

        createProjectInDB({ name: copy.name, description: copy.description, mode: copy.mode, status: copy.status }).then(async (created) => {
            if (created) {
                try {
                    const tempSession = localStorage.getItem(`planex_session_${tempId}`);
                    if (tempSession) {
                        localStorage.setItem(`planex_session_${created.id}`, tempSession);
                        localStorage.removeItem(`planex_session_${tempId}`);
                    }
                    const tempDraft = localStorage.getItem(`planex_draft_${tempId}`);
                    if (tempDraft) {
                        localStorage.setItem(`planex_draft_${created.id}`, tempDraft);
                        localStorage.removeItem(`planex_draft_${tempId}`);
                    }
                } catch { }

                try {
                    const cloudSession = await loadSessionFromDB(id);
                    if (cloudSession) {
                        await saveSessionToDB(created.id, cloudSession);
                        created = { ...created, hasSessionData: true };
                    }
                } catch { }

                const finalCreated = { ...created, hasSessionData: src.hasSessionData };
                setProjects(prev => {
                    const updated = prev.map(p => p.id === tempId ? finalCreated : p);
                    saveProjects(updated, userId);
                    return updated;
                });
            }
        }).catch(() => { });
    };

    const handleStatusToggle = (id: string) => {
        const updated = projects.map(p =>
            p.id === id ? { ...p, status: p.status === 'en_cours' ? 'termine' as const : 'en_cours' as const, updatedAt: new Date().toISOString() } : p
        );
        persist(updated);
    };

    const filtered = useMemo(() => {
        let result = [...projects];
        if (statusFilter !== 'all') result = result.filter(p => p.status === statusFilter);
        if (search.trim()) result = result.filter(p =>
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.description.toLowerCase().includes(search.toLowerCase())
        );
        if (sortBy === 'date_desc') result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        else if (sortBy === 'date_asc') result.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
        else result.sort((a, b) => a.name.localeCompare(b.name));
        return result;
    }, [projects, search, statusFilter, sortBy]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PROJECTS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginatedProjects = filtered.slice((safePage - 1) * PROJECTS_PER_PAGE, safePage * PROJECTS_PER_PAGE);

    // Reset to page 1 when filters change
    useEffect(() => { setCurrentPage(1); }, [search, statusFilter, sortBy]);

    const stats = useMemo(() => ({
        total: projects.length,
        enCours: projects.filter(p => p.status === 'en_cours').length,
        termine: projects.filter(p => p.status === 'termine').length,
    }), [projects]);

    const statCards = [
        { key: 'total', label: 'Total Projets', value: stats.total, accent: '#818cf8', rgb: '129,140,248', icon: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z' },
        { key: 'enCours', label: 'En Cours', value: stats.enCours, accent: '#fbbf24', rgb: '251,191,36', icon: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z', pulse: true },
        { key: 'termine', label: 'Terminés', value: stats.termine, accent: '#34d399', rgb: '52,211,153', icon: 'M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
    ];

    return (
        <div className="relative min-h-screen bg-[#020408] text-white font-sans overflow-x-hidden">
            {/* Ambient backgrounds */}
            <div className="fixed inset-0 bg-[linear-gradient(rgba(99,102,241,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.012)_1px,transparent_1px)] bg-[size:56px_56px] pointer-events-none" />
            <div className="fixed top-[-200px] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-indigo-500/[0.035] rounded-full blur-[200px] pointer-events-none" />
            <div className="fixed bottom-[-150px] right-[-100px] w-[600px] h-[500px] bg-violet-500/[0.025] rounded-full blur-[180px] pointer-events-none" />
            <div className="fixed top-1/3 left-[-100px] w-[400px] h-[400px] bg-emerald-500/[0.02] rounded-full blur-[160px] pointer-events-none" />
            <div className="fixed top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent z-30" />

            <div className="relative z-10 w-full mx-auto px-6 md:px-12 2xl:px-24 py-10">
                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10" style={{ animation: 'phFadeInDown 0.6s ease both' }}>
                    <div className="flex items-center gap-5">
                        <button onClick={onBack}
                            className="group w-11 h-11 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-slate-500 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-500/8 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all flex-shrink-0">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-0.5 transition-transform"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.6)]" />
                                <span className="text-[9px] font-black text-indigo-400/70 uppercase tracking-[0.4em]">Portail de Contrôle</span>
                            </div>
                            <h1 className="text-3xl font-black tracking-tight leading-none">
                                Project <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-300 to-purple-400 italic">Hub</span>
                            </h1>
                        </div>
                    </div>
                    <button onClick={() => setModal({ mode: 'create' })}
                        className="group flex items-center gap-2.5 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 hover:shadow-[0_8px_32px_rgba(16,185,129,0.2)]"
                        style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="group-hover:rotate-90 transition-transform duration-300"><path d="M12 5v14M5 12h14" /></svg>
                        Nouveau Projet
                    </button>
                </div>

                {/* ── Stats ── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8" style={{ animation: 'phFadeInUp 0.6s ease 0.1s both' }}>
                    {statCards.map((s) => (
                        <div key={s.key}
                            className="group/stat relative rounded-2xl border overflow-hidden transition-all duration-500 cursor-default hover:-translate-y-1 hover:shadow-lg"
                            style={{
                                background: 'linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                                borderColor: 'rgba(255,255,255,0.06)',
                            }}>
                            <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover/stat:opacity-100 transition-opacity duration-500" style={{ background: `linear-gradient(90deg, transparent, ${s.accent}, transparent)` }} />
                            <div className="p-5 flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-500"
                                    style={{ background: `rgba(${s.rgb},0.1)`, border: `1px solid rgba(${s.rgb},0.2)`, color: s.accent }}>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d={s.icon} />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-[0.3em] mb-0.5" style={{ color: s.accent }}>{s.label}</p>
                                    <div className="flex items-baseline gap-1.5">
                                        <span className="text-3xl font-black text-white tabular-nums">{s.value}</span>
                                        {(s as any).pulse && s.value > 0 && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0 mb-1" />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ── Toolbar ── */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6" style={{ animation: 'phFadeInUp 0.6s ease 0.2s both' }}>
                    <div className="relative flex-1">
                        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un projet…"
                            className="w-full bg-white/[0.03] border border-white/8 hover:border-white/15 focus:border-indigo-500/40 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all font-medium placeholder-slate-700" />
                    </div>
                    <div className="flex gap-2">
                        {([['all', 'Tous'], ['en_cours', 'En Cours'], ['termine', 'Terminés']] as const).map(([val, label]) => (
                            <button key={val} onClick={() => setStatusFilter(val)}
                                className="px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border"
                                style={{
                                    background: statusFilter === val ? 'rgba(129,140,248,0.12)' : 'rgba(255,255,255,0.02)',
                                    borderColor: statusFilter === val ? 'rgba(129,140,248,0.4)' : 'rgba(255,255,255,0.08)',
                                    color: statusFilter === val ? '#a5b4fc' : '#475569',
                                }}>{label}</button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                            className="bg-white/[0.03] border border-white/8 hover:border-white/15 focus:border-indigo-500/40 rounded-xl px-3 py-2.5 text-slate-400 text-[9px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-indigo-500/20 transition-all cursor-pointer">
                            <option value="date_desc">Plus récent</option>
                            <option value="date_asc">Plus ancien</option>
                            <option value="name">Nom A→Z</option>
                        </select>
                        {filtered.length > 0 && (
                            <span className="text-[9px] font-bold text-slate-600 whitespace-nowrap">
                                {filtered.length} projet{filtered.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Project Grid ── */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32" style={{ animation: 'phFadeIn 0.5s ease both' }}>
                        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin mb-4" />
                        <p className="text-sm font-bold text-slate-600">Chargement des projets…</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 text-center" style={{ animation: 'phFadeIn 0.5s ease both' }}>
                        <div className="w-20 h-20 rounded-3xl bg-white/[0.03] border border-white/8 flex items-center justify-center mb-6">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" /></svg>
                        </div>
                        <p className="text-lg font-black text-slate-600 tracking-tight mb-2">{search || statusFilter !== 'all' ? 'Aucun projet trouvé' : 'Aucun projet créé'}</p>
                        <p className="text-slate-700 text-sm font-medium mb-6">{search || statusFilter !== 'all' ? "Essayez d'ajuster vos filtres" : 'Créez votre premier projet pour commencer.'}</p>
                        {!search && statusFilter === 'all' && (
                            <button onClick={() => setModal({ mode: 'create' })}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl border border-indigo-500/30 bg-indigo-500/8 text-indigo-400 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500/15 transition-all active:scale-95">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                                Créer un Projet
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4" style={{ animation: 'phFadeInUp 0.6s ease 0.25s both' }}>
                            {paginatedProjects.map((project, i) => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    index={i}
                                    onEnter={() => onEnterProject(project)}
                                    onEdit={() => setModal({ mode: 'edit', project })}
                                    onRequestDelete={() => setDeleteTarget(project)}
                                    onDuplicate={() => handleDuplicate(project.id)}
                                    onStatusToggle={() => handleStatusToggle(project.id)}
                                />
                            ))}
                            {/* New project card - only on last page */}
                            {safePage === totalPages && (
                                <button onClick={() => setModal({ mode: 'create' })}
                                    className="group relative rounded-[1.5rem] border-2 border-dashed border-white/[0.06] hover:border-indigo-500/30 bg-transparent hover:bg-indigo-500/[0.03] transition-all duration-500 flex flex-col items-center justify-center gap-3 py-12 min-h-[200px]"
                                    style={{ animation: `phFadeInUp 0.5s ease ${0.05 * paginatedProjects.length}s both` }}>
                                    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 group-hover:border-indigo-500/30 group-hover:bg-indigo-500/8 flex items-center justify-center transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" className="group-hover:stroke-indigo-400 group-hover:rotate-90 transition-all duration-300"><path d="M12 5v14M5 12h14" /></svg>
                                    </div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-700 group-hover:text-indigo-400 transition-colors">Nouveau Projet</span>
                                </button>
                            )}
                        </div>

                        <Pagination
                            currentPage={safePage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </>
                )}
            </div>

            {/* ── Modals ── */}
            {modal && (
                <ProjectModal
                    initial={modal.project}
                    onSave={modal.mode === 'create' ? handleCreate : handleEdit}
                    onClose={() => setModal(null)}
                />
            )}
            {deleteTarget && (
                <DeleteConfirmModal
                    projectName={deleteTarget.name}
                    onConfirm={() => handleDelete(deleteTarget.id)}
                    onClose={() => setDeleteTarget(null)}
                />
            )}

            <style>{`
                @keyframes phFadeInDown { from { opacity:0; transform:translateY(-20px); } to { opacity:1; transform:translateY(0); } }
                @keyframes phFadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
                @keyframes phFadeIn { from { opacity:0; } to { opacity:1; } }
                @keyframes phScaleIn { from { opacity:0; transform:scale(0.9) translateY(12px); } to { opacity:1; transform:scale(1) translateY(0); } }
                .line-clamp-2 { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
            `}</style>
        </div>
    );
};

export default ProjectHub;
