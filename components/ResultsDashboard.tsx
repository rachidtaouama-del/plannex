
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { CalculationResults, ScheduledTask, AppParameters, AIAnalysisResult, CustomCriticalPath } from '../types';
import { GanttModal } from './GanttModal';
import { analyzeScheduleWithAI } from '../services/geminiService';
import { exportHighRiskTasksToPDF } from '../services/highRiskTaskPdfExportService';
import { exportGanttByFamilyPDF } from '../services/ganttPdfExportService';
import { exportPreparationsToPDF } from '../services/preparationsPdfExportService';
import { GanttSettingsModal } from './GanttSettingsModal';
import { PlanningExportModal } from './PlanningExportModal';
import AIAnalysisView from './AIAnalysisView';
import SpecialTasksView from './SpecialTasksView';
import { ProfessionalGanttModal } from './ProfessionalGanttModal';
import { TeamGanttExportModal } from './TeamGanttExportModal';
import { exportGanttByTeamPDF } from '../services/ganttByTeamPdfExportService';
import { DependencyChainModal } from './DependencyChainModal';
import { SuccessorsModal } from './SuccessorsModal';
import { SpecialListFilterModal } from './SpecialListFilterModal';
import { ShiftWorkListModal } from './ShiftWorkListModal';
import { exportShiftWorkToPDF } from '../services/shiftWorkPdfExportService';
import { exportToXLSX } from '../services/specialListXlsxExportService';
import { SmartFamilyGantt } from './SmartFamilyGantt';
import { FamilyDetailedListView } from './FamilyDetailedListView';
import { GanttFilterPanel } from './GanttFilterPanel';
import { exportScaffoldingTasksToPDF } from '../services/scaffoldingTaskPdfExportService';
import { exportHandlingTasksToPDF } from '../services/handlingTaskPdfExportService';
import { exportPermitTasksToPDF } from '../services/permitTaskPdfExportService';
import { PermitTasksPreviewModal } from './PermitTasksPreviewModal';
import { exportSimopsReportToPDF } from '../services/simopsReportPdfExportService';
import { exportTHRReportToPDF } from '../services/thrReportPdfExportService';

// This function assumes the JSZip library is loaded from a CDN.
declare var JSZip: any;

// --- Preview Modal Component for High Risk Tasks PDF ---
interface HighRiskPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: ScheduledTask[];
    onDownload: () => Promise<void>;
    onShare: () => Promise<void>;
    onBack: () => void;
    modalTitle?: string;
}

const HighRiskPreviewModal: React.FC<HighRiskPreviewModalProps> = ({ isOpen, onClose, tasks, onDownload, onShare, onBack, modalTitle }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [animateIn, setAnimateIn] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setTimeout(() => setAnimateIn(true), 10);
        } else {
            setAnimateIn(false);
            setSearchQuery('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleExport = async () => {
        setIsExporting(true);
        try {
            await onDownload();
        } catch (e) {
            console.error("Failed to export high risk tasks PDF from preview:", e);
            alert("Une erreur est survenue lors de l'export du PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleShare = async () => {
        if (!navigator.share) {
            alert("La fonction de partage n'est pas supportée sur ce navigateur.");
            return;
        }
        setIsSharing(true);
        try {
            await onShare();
        } catch (e) {
            console.error("Failed to share high risk tasks PDF:", e);
        } finally {
            setIsSharing(false);
        }
    };

    const q = searchQuery.toLowerCase();
    const filteredTasks = q
        ? tasks.filter(t =>
            t.action?.toLowerCase().includes(q) ||
            t.equipment?.toLowerCase().includes(q) ||
            t.team?.toLowerCase().includes(q) ||
            t.family?.toLowerCase().includes(q)
        )
        : tasks;
    const sortedTasks = [...filteredTasks].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Stats
    const uniqueTeams = new Set(tasks.map(t => t.team)).size;
    const uniqueFamilies = new Set(tasks.map(t => t.family)).size;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            style={{ transition: 'opacity 0.25s', opacity: animateIn ? 1 : 0 }}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/85 backdrop-blur-xl"
                onClick={onClose}
                style={{ background: 'radial-gradient(ellipse at center, rgba(127,29,29,0.15) 0%, rgba(0,0,0,0.88) 70%)' }}
            />

            <div
                className="relative w-full max-w-6xl flex flex-col max-h-[94vh] overflow-hidden"
                style={{
                    transform: animateIn ? 'scale(1) translateY(0)' : 'scale(0.96) translateY(16px)',
                    transition: 'transform 0.3s cubic-bezier(0.16,1,0.3,1), opacity 0.3s',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* ─── MAIN CARD ─── */}
                <div
                    className="relative flex flex-col flex-1 overflow-hidden rounded-[2rem] border border-red-900/30"
                    style={{
                        background: 'linear-gradient(160deg, #0d0a14 0%, #0a0610 40%, #100510 100%)',
                        boxShadow: '0 0 0 1px rgba(239,68,68,0.08), 0 40px 120px rgba(0,0,0,0.9), 0 0 80px rgba(185,28,28,0.12)',
                    }}
                >
                    {/* Ambient glows */}
                    <div className="absolute pointer-events-none inset-0 overflow-hidden rounded-[2rem]">
                        <div style={{ position: 'absolute', top: '-120px', right: '-80px', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(220,38,38,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: '-100px', left: '-60px', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
                        {/* Top edge highlight */}
                        <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(239,68,68,0.4), transparent)' }} />
                    </div>

                    {/* ─── HEADER ─── */}
                    <header className="relative z-10 flex flex-col gap-5 px-8 pt-7 pb-6" style={{ borderBottom: '1px solid rgba(239,68,68,0.08)' }}>
                        <div className="flex items-start justify-between gap-4">
                            {/* Brand + Title */}
                            <div className="flex items-center gap-5">
                                {/* Icon orb */}
                                <div className="relative flex-shrink-0">
                                    <div style={{ position: 'absolute', inset: '-6px', borderRadius: '50%', background: 'rgba(220,38,38,0.2)', filter: 'blur(12px)' }} />
                                    <div
                                        className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
                                        style={{ background: 'linear-gradient(135deg,#7f1d1d,#dc2626)', boxShadow: '0 0 24px rgba(220,38,38,0.5), inset 0 1px 0 rgba(255,255,255,0.15)' }}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                            <path d="M12 9v4" /><path d="M12 17h.01" />
                                        </svg>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.4em', color: '#ef4444', textTransform: 'uppercase' }}>Risk Management Hub</span>
                                        <span style={{ fontSize: '8px', fontWeight: 900, padding: '1px 8px', borderRadius: '999px', background: 'rgba(220,38,38,0.15)', color: '#f87171', border: '1px solid rgba(220,38,38,0.2)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>CRITIQUE</span>
                                    </div>
                                    <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white', letterSpacing: '-0.04em', textTransform: 'uppercase', lineHeight: 1.1, fontStyle: 'italic' }}>
                                        {modalTitle || 'Liste des Tâches à Haut Risque'}
                                    </h2>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                                <button
                                    onClick={handleShare}
                                    disabled={isSharing || isExporting || !navigator.share}
                                    style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '9px', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', border: '1px solid rgba(14,165,233,0.25)', background: 'rgba(14,165,233,0.08)', color: '#38bdf8', cursor: 'pointer', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { (e.target as HTMLButtonElement).style.background = 'rgba(14,165,233,0.2)'; }}
                                    onMouseLeave={e => { (e.target as HTMLButtonElement).style.background = 'rgba(14,165,233,0.08)'; }}
                                >
                                    {isSharing ? '⏳ Partage...' : '↗ Partager'}
                                </button>
                                <button
                                    onClick={handleExport}
                                    disabled={isExporting || isSharing}
                                    style={{ padding: '8px 20px', borderRadius: '10px', fontSize: '9px', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', background: 'linear-gradient(135deg,#dc2626,#b91c1c)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(220,38,38,0.4)', transition: 'all 0.2s' }}
                                    onMouseEnter={e => { (e.target as HTMLButtonElement).style.boxShadow = '0 6px 28px rgba(220,38,38,0.6)'; }}
                                    onMouseLeave={e => { (e.target as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(220,38,38,0.4)'; }}
                                >
                                    {isExporting ? '⏳ Export...' : '⬇ Télécharger PDF'}
                                </button>
                                <button
                                    onClick={onClose}
                                    style={{ padding: '8px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s', lineHeight: 0 }}
                                    onMouseEnter={e => { (e.target as HTMLButtonElement).style.color = 'white'; (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}
                                    onMouseLeave={e => { (e.target as HTMLButtonElement).style.color = '#64748b'; (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)'; }}
                                >
                                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* ─── STATS BAR ─── */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {[
                                { label: 'Tâches à Risque', value: tasks.length, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
                                { label: 'Équipes Impliquées', value: uniqueTeams, color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)' },
                                { label: 'Familles Concernées', value: uniqueFamilies, color: '#a855f7', bg: 'rgba(168,85,247,0.1)', border: 'rgba(168,85,247,0.2)' },
                            ].map(stat => (
                                <div
                                    key={stat.label}
                                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', borderRadius: '12px', background: stat.bg, border: `1px solid ${stat.border}` }}
                                >
                                    <span style={{ fontSize: '1.4rem', fontWeight: 900, color: stat.color, letterSpacing: '-0.04em', lineHeight: 1 }}>{stat.value}</span>
                                    <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', lineHeight: '1.3' }}>{stat.label}</span>
                                </div>
                            ))}
                            {/* Severity danger banner */}
                            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '12px', background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.15)' }}>
                                <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 8px #ef4444', animation: 'pulse 1.5s infinite' }} />
                                <span style={{ fontSize: '9px', fontWeight: 900, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Surveillance Active Requise</span>
                            </div>
                        </div>

                        {/* ─── ALERT WARNING ─── */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', borderRadius: '14px', background: 'linear-gradient(135deg,rgba(127,29,29,0.25),rgba(154,52,18,0.1))', border: '1px solid rgba(239,68,68,0.15)' }}>
                            <svg className="flex-shrink-0 mt-0.5" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#f87171" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                            <p style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', lineHeight: '1.6', letterSpacing: '0.03em' }}>
                                Ces tâches ont été identifiées comme présentant un risque élevé sur la base des informations HSE.{' '}
                                <span style={{ color: '#f87171', fontWeight: 900 }}>Une vigilance particulière est impérative lors de l'exécution.</span>
                            </p>
                        </div>

                        {/* ─── SEARCH ─── */}
                        <div style={{ position: 'relative' }}>
                            <svg style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Rechercher une tâche, équipe ou équipement..."
                                style={{ width: '100%', padding: '10px 16px 10px 40px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '11px', fontWeight: 600, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                                onFocus={e => { e.target.style.borderColor = 'rgba(239,68,68,0.4)'; }}
                                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                            />
                            {searchQuery && (
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', fontWeight: 900, color: '#ef4444', letterSpacing: '0.1em' }}>
                                    {filteredTasks.length} résultat{filteredTasks.length !== 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </header>

                    {/* ─── TABLE ─── */}
                    <main className="relative z-10 flex-1 overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(220,38,38,0.3) transparent' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(10,6,20,0.98)', backdropFilter: 'blur(10px)' }}>
                                    <tr style={{ borderBottom: '1px solid rgba(239,68,68,0.1)' }}>
                                        {['#', 'Protocole d\'Action', 'Asset / Équipement', 'Équipe Opérationnelle', 'Famille Structurelle', 'Risque'].map((h, i) => (
                                            <th key={h} style={{ padding: '14px 20px', textAlign: i === 0 ? 'center' : 'left', fontSize: '8px', fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.25em', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedTasks.map((task, idx) => {
                                        const isEven = idx % 2 === 0;
                                        return (
                                            <tr
                                                key={task.id}
                                                style={{
                                                    background: isEven ? 'rgba(255,255,255,0.01)' : 'transparent',
                                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                    transition: 'background 0.15s',
                                                }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(220,38,38,0.06)'; }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = isEven ? 'rgba(255,255,255,0.01)' : 'transparent'; }}
                                            >
                                                {/* Row number */}
                                                <td style={{ padding: '14px 20px', textAlign: 'center', width: '48px' }}>
                                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '6px', background: 'rgba(220,38,38,0.1)', color: '#f87171', fontSize: '9px', fontWeight: 900, border: '1px solid rgba(220,38,38,0.15)' }}>{idx + 1}</span>
                                                </td>
                                                {/* Action */}
                                                <td style={{ padding: '14px 20px', maxWidth: '280px' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#f1f5f9', textTransform: 'uppercase', letterSpacing: '-0.02em', lineHeight: 1.3, display: 'block' }}>{task.action}</span>
                                                </td>
                                                {/* Equipment */}
                                                <td style={{ padding: '14px 20px', maxWidth: '160px' }}>
                                                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{task.equipment}</span>
                                                </td>
                                                {/* Team */}
                                                <td style={{ padding: '14px 20px' }}>
                                                    <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '8px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)', fontSize: '10px', fontWeight: 800, color: '#fb923c', whiteSpace: 'nowrap' }}>{task.team}</span>
                                                </td>
                                                {/* Family */}
                                                <td style={{ padding: '14px 20px' }}>
                                                    <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '8px', background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)', fontSize: '9px', fontWeight: 900, color: '#c084fc', letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{task.family}</span>
                                                </td>
                                                {/* Risk badge */}
                                                <td style={{ padding: '14px 20px' }}>
                                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '8px', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)' }}>
                                                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 6px #ef4444', display: 'inline-block', flexShrink: 0 }} />
                                                        <span style={{ fontSize: '8px', fontWeight: 900, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>Haut Risque</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {sortedTasks.length === 0 && (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '60px 20px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                                    <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="rgba(71,85,105,0.5)" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                                                    <span style={{ fontSize: '11px', fontWeight: 900, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.3em' }}>Aucun résultat trouvé</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)' }}>
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#334155', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                {sortedTasks.length} tâche{sortedTasks.length !== 1 ? 's' : ''} affichée{sortedTasks.length !== 1 ? 's' : ''}
                                {searchQuery ? ` sur ${tasks.length} total` : ''}
                            </span>
                            <button
                                onClick={onBack}
                                style={{ padding: '6px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#64748b', fontSize: '9px', fontWeight: 900, letterSpacing: '0.15em', textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.2s' }}
                            >
                                ← Retour
                            </button>
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

// ─── Shared premium list modal shell ────────────────────────────────────────
const PremiumListModal: React.FC<{
    isOpen: boolean; onClose: () => void; onBack: () => void;
    onExport: () => void; isExporting: boolean;
    title: string; subtitle: string; accent: string;
    count: number; teamsCount: number; totalHH: number;
    search: string; setSearch: (v: string) => void;
    children: React.ReactNode;
}> = ({ isOpen, onClose, onBack, onExport, isExporting, title, subtitle, accent, count, teamsCount, totalHH, search, setSearch, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
            <div
                className="relative w-full max-w-6xl bg-[#070b16] border border-white/[0.07] rounded-3xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[92vh] overflow-hidden"
                style={{ animation: 'modalIn .25s cubic-bezier(.16,1,.3,1) forwards' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg,transparent,${accent}80,transparent)` }} />
                <div className="absolute top-0 right-0 w-80 h-80 rounded-full blur-[100px] pointer-events-none opacity-15" style={{ background: accent }} />

                {/* Header */}
                <header className="relative flex items-center justify-between px-8 py-6 border-b border-white/[0.05] flex-shrink-0">
                    <div>
                        <p className="text-[9px] font-black uppercase tracking-[0.5em] mb-1" style={{ color: accent }}>{subtitle}</p>
                        <h2 className="text-2xl font-black text-white tracking-tight leading-none">{title}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={onBack} className="text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.06] transition-all">← Retour</button>
                        <button
                            onClick={onExport} disabled={isExporting}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl text-white transition-all disabled:opacity-50"
                            style={{ background: `linear-gradient(135deg,${accent},${accent}cc)`, boxShadow: `0 0 20px ${accent}40` }}
                        >
                            {isExporting
                                ? <svg className="animate-spin w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                : <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            }
                            {isExporting ? 'Export...' : 'Télécharger PDF'}
                        </button>
                        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-500 hover:text-white border border-white/[0.06] transition-all">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </header>

                {/* Stats + Search */}
                <div className="flex items-center gap-3 px-8 py-4 border-b border-white/[0.04] flex-shrink-0 bg-white/[0.01] flex-wrap">
                    {[{ v: count, l: 'Tâches' }, { v: teamsCount, l: 'Équipes' }, { v: totalHH.toFixed(1) + ' h', l: 'H-H Total' }].map((s, i) => (
                        <div key={i} className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/[0.05] rounded-xl">
                            <span className="text-lg font-black" style={{ color: i === 0 ? accent : '#94a3b8' }}>{s.v}</span>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">{s.l}</span>
                        </div>
                    ))}
                    <div className="ml-auto flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="bg-transparent text-sm text-white placeholder:text-slate-600 focus:outline-none w-36" />
                        {search && <button onClick={() => setSearch('')} className="text-slate-600 hover:text-slate-400"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg></button>}
                    </div>
                </div>

                {/* Table */}
                <main className="flex-1 overflow-hidden flex flex-col">
                    <div className="overflow-y-auto tactical-scrollbar flex-1">{children}</div>
                </main>
            </div>
            <style>{`@keyframes modalIn{from{opacity:0;transform:scale(.97) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
        </div>
    );
};

// --- ScheduledPreparationsModal ---
interface ScheduledPreparationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: ScheduledTask[];
    onBack: () => void;
    customTitle?: string;
    selectedColumns?: string[];
}

const ScheduledPreparationsModal: React.FC<ScheduledPreparationsModalProps> = ({ isOpen, onClose, tasks, onBack, customTitle, selectedColumns }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [search, setSearch] = useState('');
    const accent = '#10b981';

    const handleExport = async () => {
        setIsExporting(true);
        try { await exportPreparationsToPDF(tasks, true, customTitle, selectedColumns); }
        catch (e) { console.error('Failed to export preparations PDF:', e); alert("Une erreur est survenue lors de l'export."); }
        finally { setIsExporting(false); }
    };

    const filtered = useMemo(() => {
        const s = search.toLowerCase();
        const sorted = [...tasks].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        if (!s) return sorted;
        return sorted.filter(t => t.action.toLowerCase().includes(s) || t.equipment.toLowerCase().includes(s) || (t.team || '').toLowerCase().includes(s));
    }, [tasks, search]);

    const teamsSet = new Set(tasks.map(t => t.team).filter(Boolean));
    const totalHH = tasks.reduce((s, t) => s + t.duration * t.manpower, 0);

    return (
        <PremiumListModal
            isOpen={isOpen} onClose={onClose} onBack={onBack}
            onExport={handleExport} isExporting={isExporting}
            title="Liste des Préparatifs" subtitle="Readiness Intelligence · Préparatifs Ordonnancés"
            accent={accent} count={tasks.length} teamsCount={teamsSet.size} totalHH={totalHH}
            search={search} setSearch={setSearch}
        >
            <table className="w-full text-left min-w-[800px]">
                <thead className="sticky top-0 bg-[#070b16] border-b border-white/[0.05]">
                    <tr>{['#', 'Début', 'Fin', 'Action', 'Équipement', 'Préparatifs'].map(h => (
                        <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">{h}</th>
                    ))}</tr>
                </thead>
                <tbody>
                    {filtered.map((task, idx) => (
                        <tr key={task.id} className="group border-t border-white/[0.03] hover:bg-white/[0.025] transition-colors">
                            <td className="px-6 py-4"><span className="w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black" style={{ background: `${accent}20`, color: accent }}>{idx + 1}</span></td>
                            <td className="px-6 py-4 text-[11px] font-bold text-slate-400 whitespace-nowrap">{formatDate(task.startTime)}</td>
                            <td className="px-6 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">{formatDate(task.endTime)}</td>
                            <td className="px-6 py-4 text-[11px] font-bold text-white uppercase tracking-tight leading-snug max-w-[240px]">{task.action}</td>
                            <td className="px-6 py-4 text-[11px] font-bold text-slate-400 max-w-[160px] truncate">{task.equipment}</td>
                            <td className="px-6 py-4">
                                <div className="space-y-1">
                                    {task.preparatifs && task.preparatifs.trim() !== '' && task.preparatifs.trim() !== '0' &&
                                        task.preparatifs.split('<AND>').map((p, i) => (
                                            <div key={`txt-${i}`} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: `${accent}10`, color: accent }}>
                                                <span>➢</span>{p.trim()}
                                            </div>
                                        ))
                                    }
                                    {task.pdrItems && task.pdrItems.map((pdr, i) => (
                                        <div key={`pdr-${i}`} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold ${pdr.type?.toLowerCase().includes('consom') ? 'text-orange-300 bg-orange-500/10' :
                                            pdr.type?.toLowerCase().includes('inter') ? 'text-purple-300 bg-purple-500/10' :
                                                'text-blue-300 bg-blue-500/10'}`}>
                                            <span>◈</span>[{pdr.type || 'PDR'}] {pdr.sparePart} (Qt: {pdr.qty})
                                        </div>
                                    ))}
                                    {(!task.preparatifs || task.preparatifs.trim() === '' || task.preparatifs.trim() === '0') && (!task.pdrItems || task.pdrItems.length === 0) && (
                                        <span className="text-slate-700 text-[10px]">—</span>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {filtered.length === 0 && <tr><td colSpan={6} className="py-20 text-center text-[11px] font-black text-slate-700 uppercase tracking-widest">Aucune tâche trouvée</td></tr>}
                </tbody>
            </table>
        </PremiumListModal>
    );
};

// --- ScaffoldingTasksPreviewModal ---
interface ScaffoldingTasksPreviewModalProps {
    isOpen: boolean; onClose: () => void; tasks: ScheduledTask[];
    onBack: () => void; onDownload: () => Promise<void>;
}

const ScaffoldingTasksPreviewModal: React.FC<ScaffoldingTasksPreviewModalProps> = ({ isOpen, onClose, tasks, onBack, onDownload }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [search, setSearch] = useState('');
    const accent = '#06b6d4';
    const handleExport = async () => { setIsExporting(true); try { await onDownload(); } catch (e) { alert("Une erreur est survenue lors de l'export."); } finally { setIsExporting(false); } };
    const filtered = useMemo(() => {
        const s = search.toLowerCase();
        const sorted = [...tasks].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        if (!s) return sorted;
        return sorted.filter(t => t.action.toLowerCase().includes(s) || t.equipment.toLowerCase().includes(s) || (t.team || '').toLowerCase().includes(s));
    }, [tasks, search]);
    const teamsSet = new Set(tasks.map(t => t.team).filter(Boolean));
    const totalHH = tasks.reduce((s, t) => s + t.duration * t.manpower, 0);
    return (
        <PremiumListModal
            isOpen={isOpen} onClose={onClose} onBack={onBack}
            onExport={handleExport} isExporting={isExporting}
            title="Liste des Travaux d'Échafaudage" subtitle="Structural Logistics Hub · Accès Technique"
            accent={accent} count={tasks.length} teamsCount={teamsSet.size} totalHH={totalHH}
            search={search} setSearch={setSearch}
        >
            <table className="w-full text-left min-w-[700px]">
                <thead className="sticky top-0 bg-[#070b16] border-b border-white/[0.05]">
                    <tr>{['#', 'Début', 'Fin', 'Action', 'Équipement', 'Équipe', 'Durée'].map(h => (
                        <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">{h}</th>
                    ))}</tr>
                </thead>
                <tbody>
                    {filtered.map((task, idx) => (
                        <tr key={task.id} className="group border-t border-white/[0.03] hover:bg-white/[0.025] transition-colors">
                            <td className="px-6 py-4"><span className="w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black" style={{ background: `${accent}20`, color: accent }}>{idx + 1}</span></td>
                            <td className="px-6 py-4 text-[11px] font-bold text-slate-400 whitespace-nowrap">{formatDate(task.startTime)}</td>
                            <td className="px-6 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">{formatDate(task.endTime)}</td>
                            <td className="px-6 py-4 text-[11px] font-bold text-white uppercase tracking-tight leading-snug max-w-[260px]">{task.action}</td>
                            <td className="px-6 py-4 text-[11px] font-bold text-slate-400 max-w-[160px] truncate">{task.equipment}</td>
                            <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest border" style={{ background: `${accent}15`, borderColor: `${accent}30`, color: accent }}>{task.team}</span></td>
                            <td className="px-6 py-4 text-[11px] font-bold text-slate-500">{task.duration.toFixed(1)}h</td>
                        </tr>
                    ))}
                    {filtered.length === 0 && <tr><td colSpan={7} className="py-20 text-center text-[11px] font-black text-slate-700 uppercase tracking-widest">Aucune tâche trouvée</td></tr>}
                </tbody>
            </table>
        </PremiumListModal>
    );
};

// --- HandlingTasksPreviewModal ---
interface HandlingTasksPreviewModalProps {
    isOpen: boolean; onClose: () => void; tasks: ScheduledTask[];
    onBack: () => void; onDownload: () => Promise<void>;
}

const HandlingTasksPreviewModal: React.FC<HandlingTasksPreviewModalProps> = ({ isOpen, onClose, tasks, onBack, onDownload }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [search, setSearch] = useState('');
    const accent = '#818cf8';
    const handleExport = async () => { setIsExporting(true); try { await onDownload(); } catch (e) { alert("Une erreur est survenue lors de l'export."); } finally { setIsExporting(false); } };
    const filtered = useMemo(() => {
        const s = search.toLowerCase();
        const sorted = [...tasks].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        if (!s) return sorted;
        return sorted.filter(t => t.action.toLowerCase().includes(s) || t.equipment.toLowerCase().includes(s) || (t.team || '').toLowerCase().includes(s));
    }, [tasks, search]);
    const teamsSet = new Set(tasks.map(t => t.team).filter(Boolean));
    const totalHH = tasks.reduce((s, t) => s + t.duration * t.manpower, 0);
    return (
        <PremiumListModal
            isOpen={isOpen} onClose={onClose} onBack={onBack}
            onExport={handleExport} isExporting={isExporting}
            title="Liste des Travaux de Manutention" subtitle="Heavy Logistics Hub · Opérations de Levage"
            accent={accent} count={tasks.length} teamsCount={teamsSet.size} totalHH={totalHH}
            search={search} setSearch={setSearch}
        >
            <table className="w-full text-left min-w-[700px]">
                <thead className="sticky top-0 bg-[#070b16] border-b border-white/[0.05]">
                    <tr>{['#', 'Début', 'Fin', 'Action', 'Équipement', 'Équipe', 'Durée'].map(h => (
                        <th key={h} className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.3em] text-slate-600">{h}</th>
                    ))}</tr>
                </thead>
                <tbody>
                    {filtered.map((task, idx) => (
                        <tr key={task.id} className="group border-t border-white/[0.03] hover:bg-white/[0.025] transition-colors">
                            <td className="px-6 py-4"><span className="w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black" style={{ background: `${accent}20`, color: accent }}>{idx + 1}</span></td>
                            <td className="px-6 py-4 text-[11px] font-bold text-slate-400 whitespace-nowrap">{formatDate(task.startTime)}</td>
                            <td className="px-6 py-4 text-[11px] font-bold text-slate-500 whitespace-nowrap">{formatDate(task.endTime)}</td>
                            <td className="px-6 py-4 text-[11px] font-bold text-white uppercase tracking-tight leading-snug max-w-[260px]">{task.action}</td>
                            <td className="px-6 py-4 text-[11px] font-bold text-slate-400 max-w-[160px] truncate">{task.equipment}</td>
                            <td className="px-6 py-4"><span className="px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest border" style={{ background: `${accent}15`, borderColor: `${accent}30`, color: accent }}>{task.team}</span></td>
                            <td className="px-6 py-4 text-[11px] font-bold text-slate-500">{task.duration.toFixed(1)}h</td>
                        </tr>
                    ))}
                    {filtered.length === 0 && <tr><td colSpan={7} className="py-20 text-center text-[11px] font-black text-slate-700 uppercase tracking-widest">Aucune tâche trouvée</td></tr>}
                </tbody>
            </table>
        </PremiumListModal>
    );
};

// --- New Modal for SIMOPS (Simultaneous Operations) — Grouped Pairs View ---
interface SimopsPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: ScheduledTask[];
    simopsRecords: import('../types').SimopsRecord[];
    onDownload: () => Promise<void>;
    onBack: () => void;
}

const SimopsPreviewModal: React.FC<SimopsPreviewModalProps> = ({ isOpen, onClose, tasks, simopsRecords, onDownload, onBack }) => {
    const [isExporting, setIsExporting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    if (!isOpen) return null;

    const handleExport = async () => {
        setIsExporting(true);
        try { await onDownload(); }
        catch (e) {
            console.error("Failed to export SIMOPS PDF:", e);
            alert("Une erreur est survenue lors de l'export.");
        } finally { setIsExporting(false); }
    };

    // Build task lookup map by OT
    const taskByOT = new Map<string, ScheduledTask>();
    tasks.forEach(t => { if (t.ot) taskByOT.set(String(t.ot).trim(), t); });

    // Build deduplicated pairs from simopsRecords
    const seen = new Set<string>();
    const pairs: Array<{ taskA: ScheduledTask | null; otA: string; taskB: ScheduledTask | null; otB: string }> = [];
    simopsRecords.forEach(r => {
        const a = String(r.OT).trim();
        const b = String(r.simopsOT).trim();
        const key = [a, b].sort().join('|');
        if (!seen.has(key)) {
            seen.add(key);
            pairs.push({ taskA: taskByOT.get(a) || null, otA: a, taskB: taskByOT.get(b) || null, otB: b });
        }
    });

    // Filter pairs based on search
    const q = searchQuery.toLowerCase();
    const filteredPairs = q
        ? pairs.filter(p =>
            p.otA.toLowerCase().includes(q) || p.otB.toLowerCase().includes(q) ||
            (p.taskA?.action || '').toLowerCase().includes(q) ||
            (p.taskB?.action || '').toLowerCase().includes(q) ||
            (p.taskA?.equipment || '').toLowerCase().includes(q) ||
            (p.taskB?.equipment || '').toLowerCase().includes(q) ||
            (p.taskA?.team || '').toLowerCase().includes(q) ||
            (p.taskB?.team || '').toLowerCase().includes(q)
        )
        : pairs;

    // Stats
    const teamsSet = new Set<string>();
    filteredPairs.forEach(p => {
        if (p.taskA?.team) teamsSet.add(p.taskA.team);
        if (p.taskB?.team) teamsSet.add(p.taskB.team);
    });

    // Helper: check time overlap
    const hasOverlap = (tA: ScheduledTask | null, tB: ScheduledTask | null) => {
        if (!tA || !tB) return false;
        return tA.startTime < tB.endTime && tA.endTime > tB.startTime;
    };

    const SimopsTaskCard = ({ task, ot, accent }: { task: ScheduledTask | null; ot: string; accent: 'rose' | 'amber' }) => {
        const roseStyle = {
            border: 'rgba(244,63,94,0.3)',
            bg: 'rgba(244,63,94,0.06)',
            glow: '0 0 24px rgba(244,63,94,0.1)',
            badge: 'rgba(244,63,94,0.15)',
            badgeText: '#f43f5e',
            teamBg: 'rgba(244,63,94,0.1)',
            teamText: '#fb7185',
        };
        const amberStyle = {
            border: 'rgba(251,146,60,0.3)',
            bg: 'rgba(251,146,60,0.06)',
            glow: '0 0 24px rgba(251,146,60,0.1)',
            badge: 'rgba(251,146,60,0.15)',
            badgeText: '#f59e0b',
            teamBg: 'rgba(251,146,60,0.1)',
            teamText: '#fbbf24',
        };
        const s = accent === 'rose' ? roseStyle : amberStyle;

        if (!task) {
            return (
                <div className="flex-1 rounded-2xl p-5 border" style={{ background: s.bg, borderColor: s.border, boxShadow: s.glow }}>
                    <div className="mb-3">
                        <span className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: s.badgeText }}>OT {ot}</span>
                    </div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Non planifié / Introuvable</p>
                </div>
            );
        }

        return (
            <div className="flex-1 rounded-2xl p-5 border transition-all duration-300 hover:scale-[1.01]" style={{ background: s.bg, borderColor: s.border, boxShadow: s.glow }}>
                {/* OT Badge */}
                <div className="flex items-start justify-between mb-4">
                    <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.3em]" style={{ background: s.badge, color: s.badgeText }}>
                        OT {ot}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest" style={{ background: s.teamBg, color: s.teamText }}>
                        {task.team}
                    </span>
                </div>

                {/* Action */}
                <p className="text-[12px] font-black text-white uppercase tracking-tight leading-snug mb-3 line-clamp-2">
                    {task.action}
                </p>

                {/* Equipment */}
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 truncate">
                    ⬡ {task.equipment}
                </p>

                {/* Timing */}
                <div className="space-y-1.5 pt-3 border-t" style={{ borderColor: s.border }}>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.badgeText }} />
                        <span className="text-[10px] font-black font-mono text-slate-300">{formatDate(task.startTime)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600 flex-shrink-0" />
                        <span className="text-[10px] font-bold font-mono text-slate-500">{formatDate(task.endTime)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Durée:</span>
                        <span className="text-[9px] font-black" style={{ color: s.badgeText }}>{task.duration.toFixed(1)} h · {task.manpower} pers.</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-black/85 backdrop-blur-lg" onClick={onClose} />
            <div
                className="relative w-full max-w-6xl flex flex-col max-h-[92vh] overflow-hidden"
                style={{
                    background: 'linear-gradient(160deg, rgba(8,11,22,0.98) 0%, rgba(4,6,14,0.99) 100%)',
                    borderRadius: '2.5rem',
                    border: '1px solid rgba(244,63,94,0.2)',
                    boxShadow: '0 0 100px rgba(244,63,94,0.12), 0 0 40px rgba(0,0,0,0.8)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Ambient glows */}
                <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" style={{ background: 'radial-gradient(circle, rgba(244,63,94,0.08) 0%, transparent 70%)' }} />
                <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full pointer-events-none translate-y-1/3 -translate-x-1/4" style={{ background: 'radial-gradient(circle, rgba(251,146,60,0.05) 0%, transparent 70%)' }} />
                {/* Top shimmer */}
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(244,63,94,0.5), transparent)' }} />

                {/* ═══ HEADER ═══ */}
                <header className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center px-10 py-7 border-b" style={{ borderColor: 'rgba(244,63,94,0.1)' }}>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            {/* Pulsing alert dot */}
                            <div className="relative">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]" />
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-400/40 animate-ping absolute inset-0" />
                            </div>
                            <span className="text-[10px] font-black text-rose-500/80 uppercase tracking-[0.45em]">Surveillance Co-activité · Sécurité Industrielle</span>
                        </div>
                        <h2 className="text-[2.2rem] font-black text-white tracking-tighter leading-none uppercase">
                            Rapport <span className="text-transparent" style={{ WebkitTextStroke: '1px rgba(244,63,94,0.7)' }}>SIMOPS</span>
                        </h2>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em] mt-1">Analyse des Opérations Simultanées — Détection des Conflits de Co-activité</p>
                    </div>
                    <div className="flex items-center gap-3 mt-5 md:mt-0 flex-wrap">
                        {/* Search */}
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Rechercher OT, action, équipe..."
                                className="pl-9 pr-4 py-2.5 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', width: '220px' }}
                                onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(244,63,94,0.5)'; }}
                                onBlur={e => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}
                            />
                        </div>
                        <button onClick={onBack} className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>Retour</button>
                        <button
                            onClick={handleExport}
                            disabled={isExporting}
                            className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white rounded-xl transition-all disabled:opacity-40"
                            style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', boxShadow: '0 0 20px rgba(244,63,94,0.4)' }}
                        >
                            {isExporting ? 'Export...' : '↓ PDF'}
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full text-slate-600 hover:text-white transition-colors" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </header>

                {/* ═══ STATS BAR ═══ */}
                <div className="relative z-10 flex items-center gap-8 px-10 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: 'rgba(244,63,94,0.03)' }}>
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em] mb-0.5">Conflits Détectés</span>
                        <span className="text-2xl font-black text-rose-500 leading-none">{filteredPairs.length}</span>
                    </div>
                    <div className="w-px h-8 bg-white/5" />
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em] mb-0.5">Équipes Impliquées</span>
                        <span className="text-2xl font-black text-amber-500 leading-none">{teamsSet.size}</span>
                    </div>
                    <div className="w-px h-8 bg-white/5" />
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em] mb-0.5">Tâches Concernées</span>
                        <span className="text-2xl font-black text-slate-300 leading-none">{filteredPairs.filter(p => p.taskA && p.taskB).length * 2 + filteredPairs.filter(p => !p.taskA || !p.taskB).length}</span>
                    </div>
                    <div className="w-px h-8 bg-white/5" />
                    <div className="flex items-center gap-2 ml-auto">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.15)' }}>
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.25em]">Surveillance Active</span>
                        </div>
                    </div>
                </div>

                {/* ═══ PAIRS LIST ═══ */}
                <main className="relative z-10 flex-1 overflow-y-auto tactical-scrollbar px-8 py-6 space-y-5">
                    {filteredPairs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.15)' }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(244,63,94,0.5)" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                            </div>
                            <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em]">Aucun conflit SIMOPS détecté</p>
                            <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest mt-1">sur la plage sélectionnée</p>
                        </div>
                    ) : (
                        filteredPairs.map((pair, idx) => {
                            const overlap = hasOverlap(pair.taskA, pair.taskB);
                            return (
                                <div key={idx} className="rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.005]" style={{ border: `1px solid ${overlap ? 'rgba(244,63,94,0.25)' : 'rgba(255,255,255,0.06)'}`, background: 'rgba(255,255,255,0.015)' }}>
                                    {/* Group Header */}
                                    <div className="flex items-center justify-between px-6 py-3" style={{ background: overlap ? 'rgba(244,63,94,0.07)' : 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <div className="flex items-center gap-3">
                                            <span className="w-7 h-7 rounded-lg text-[10px] font-black flex items-center justify-center text-slate-500" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                                {String(idx + 1).padStart(2, '0')}
                                            </span>
                                            <span className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-500">Groupe Co-activité</span>
                                            <span className="text-[9px] font-black text-slate-700">·</span>
                                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(244,63,94,0.7)' }}>OT {pair.otA}</span>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(251,146,60,0.7)' }}>OT {pair.otB}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {overlap ? (
                                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg" style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)' }}>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Conflit Actif</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Décalées</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Tasks Side-by-Side */}
                                    <div className="flex flex-col md:flex-row gap-4 p-5 items-stretch">
                                        <SimopsTaskCard task={pair.taskA} ot={pair.otA} accent="rose" />

                                        {/* Center Divider */}
                                        <div className="flex flex-col items-center justify-center gap-2 px-2 flex-shrink-0">
                                            <div className="w-px flex-1 bg-gradient-to-b from-transparent via-white/10 to-transparent hidden md:block" />
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs flex-shrink-0" style={{ background: overlap ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${overlap ? 'rgba(244,63,94,0.3)' : 'rgba(255,255,255,0.08)'}`, color: overlap ? '#f43f5e' : '#475569' }}>
                                                {/* Crossed arrows icon */}
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4" /></svg>
                                            </div>
                                            <div className="w-px flex-1 bg-gradient-to-b from-transparent via-white/10 to-transparent hidden md:block" />
                                        </div>

                                        <SimopsTaskCard task={pair.taskB} ot={pair.otB} accent="amber" />
                                    </div>
                                </div>
                            );
                        })
                    )}
                </main>
            </div>
        </div>
    );
};


const KpiCard: React.FC<{
    title: string;
    value: string | number;
    unit: string;
    gradient: string;
    icon: React.ReactNode;
    shadow: string;
}> = ({ title, value, unit, gradient, icon, shadow }) => (
    <div
        className={`group relative overflow-hidden rounded-3xl border border-white/[0.07] transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${shadow}`}
        style={{ background: 'linear-gradient(145deg, rgba(12,16,26,0.98) 0%, rgba(8,11,20,0.99) 100%)' }}
    >
        {/* Ambient corner glow */}
        <div className={`absolute -top-8 -right-8 w-36 h-36 bg-gradient-to-br ${gradient} rounded-full blur-2xl opacity-15 group-hover:opacity-35 transition-all duration-700 group-hover:scale-110`} />
        {/* Bottom left subtle glow */}
        <div className={`absolute -bottom-4 -left-4 w-24 h-24 bg-gradient-to-tr ${gradient} rounded-full blur-2xl opacity-5 group-hover:opacity-15 transition-all duration-700`} />
        {/* Top shimmer */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        {/* Bottom accent bar */}
        <div className={`absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${gradient} opacity-0 group-hover:opacity-70 transition-all duration-500`} />

        <div className="relative z-10 p-6">
            {/* Icon + dots row */}
            <div className="flex items-start justify-between mb-5">
                <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white group-hover:scale-110 group-hover:shadow-xl transition-all duration-500`}>
                    <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} blur-md opacity-40 group-hover:opacity-70 transition-opacity`} />
                    <div className="relative z-10">{icon}</div>
                </div>
                <div className="flex flex-col items-end gap-1 pt-1.5">
                    <div className="w-1 h-1 rounded-full bg-white/15 group-hover:bg-white/40 transition-colors" />
                    <div className="w-1.5 h-1.5 rounded-full bg-white/10 group-hover:bg-white/30 transition-colors" />
                    <div className="w-1 h-1 rounded-full bg-white/15 group-hover:bg-white/40 transition-colors" />
                </div>
            </div>

            {/* Label */}
            <p className="text-[9px] font-black tracking-[0.4em] text-slate-600 uppercase mb-2 group-hover:text-slate-500 transition-colors">{title}</p>

            {/* Value */}
            <div className="flex items-baseline gap-2.5">
                <span className={`text-[2.6rem] font-black tracking-tighter leading-none text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:${gradient} transition-all duration-500`}>
                    {value}
                </span>
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest group-hover:text-slate-500 transition-colors">{unit}</span>
            </div>
        </div>
    </div>
);

const SidebarMenuSection: React.FC<{ title: string; children: React.ReactNode; defaultOpen?: boolean; isSidebarCollapsed: boolean }> = ({ title, children, defaultOpen = true, isSidebarCollapsed }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    if (isSidebarCollapsed) {
        return (
            <div className="mb-3 text-center">
                <div className="w-6 h-px bg-white/8 mx-auto mb-2" />
                <div className="space-y-1.5">{children}</div>
            </div>
        );
    }
    return (
        <div className="mb-3">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 mb-1.5 rounded-xl hover:bg-white/5 transition-all duration-200 group"
            >
                <div className="flex items-center gap-2">
                    <div className="w-1 h-3.5 rounded-full bg-emerald-500/40 group-hover:bg-emerald-500/70 transition-colors" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.35em] group-hover:text-slate-400 transition-colors">{title}</span>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`text-slate-700 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            {isOpen && <div className="space-y-0.5">{children}</div>}
        </div>
    );
};

const SidebarButton: React.FC<{
    onClick: () => void;
    disabled?: boolean;
    icon: React.ReactNode;
    label: string;
    badge?: React.ReactNode;
    active?: boolean;
    isSidebarCollapsed: boolean;
}> = ({ onClick, disabled, icon, label, badge, active, isSidebarCollapsed }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`group relative w-full flex items-center ${isSidebarCollapsed ? 'justify-center p-3.5' : 'justify-between px-3 py-2.5'
            } rounded-xl transition-all duration-200 disabled:opacity-25 disabled:cursor-not-allowed ${active
                ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-400/30'
                : 'text-slate-500 hover:bg-white/[0.06] hover:text-slate-200 border border-transparent hover:border-white/[0.06]'
            }`}
        title={isSidebarCollapsed ? label : undefined}
    >
        {active && !isSidebarCollapsed && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white rounded-full opacity-70" />
        )}
        <div className={`flex items-center ${isSidebarCollapsed ? '' : 'gap-3 truncate flex-1'}`}>
            <div className={`flex-shrink-0 transition-all duration-200 ${active ? 'text-white' : 'text-slate-600 group-hover:text-emerald-400 group-hover:scale-110'
                }`}>
                {icon}
            </div>
            {!isSidebarCollapsed && (
                <span className={`text-[11px] font-black uppercase tracking-widest truncate transition-colors ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                    }`}>{label}</span>
            )}
        </div>
        {!isSidebarCollapsed && badge && (
            <div className="flex-shrink-0 ml-2">{badge}</div>
        )}
        {isSidebarCollapsed && badge && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)] border border-[#0a0d14]"></span>
        )}
    </button>
);

const formatDate = (date: Date | null | undefined, withTime = true) => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return '-';
    const options: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    };
    if (withTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }
    return date.toLocaleString('fr-FR', options);
}

interface ResultsDashboardProps {
    results: CalculationResults | null;
    isLoading: boolean;
    error: string | null;
    parameters: AppParameters;
    handlingRecords?: import('../types').HandlingRecord[];
    onNavigateToTeamView: () => void;
    onNavigateToEvaluationView: () => void;
    onNavigateToHotReview: () => void;
    onBackToScheduling: () => void;
    isColdStopFlow: boolean;
    customCriticalPaths: CustomCriticalPath[];
    setCustomCriticalPaths: React.Dispatch<React.SetStateAction<CustomCriticalPath[]>>;
    onNavigateToPortal?: () => void;
    onNavigateToDashboard?: () => void;
    onNavigateToReadiness?: () => void;
    onNavigateToWhatIf?: () => void;
    onNavigateToAICopilot?: () => void;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ results, isLoading, error, parameters, handlingRecords, onNavigateToTeamView, onNavigateToEvaluationView, onNavigateToHotReview, onBackToScheduling, isColdStopFlow, customCriticalPaths, setCustomCriticalPaths, onNavigateToPortal, onNavigateToDashboard, onNavigateToReadiness, onNavigateToWhatIf, onNavigateToAICopilot }) => {
    const [ganttModalData, setGanttModalData] = useState<{ title: string; tasks: ScheduledTask[] } | null>(null);
    const [isProfGanttOpen, setIsProfGanttOpen] = useState(false);
    const [isHighRiskPreviewOpen, setIsHighRiskPreviewOpen] = useState(false);
    const [isScheduledPreparationsModalOpen, setIsScheduledPreparationsModalOpen] = useState(false);
    const [isScaffoldingPreviewOpen, setIsScaffoldingPreviewOpen] = useState(false);
    const [scaffoldingTasksForPreview, setScaffoldingTasksForPreview] = useState<ScheduledTask[]>([]);
    const [isHandlingPreviewOpen, setIsHandlingPreviewOpen] = useState(false);
    const [handlingTasksForPreview, setHandlingTasksForPreview] = useState<ScheduledTask[]>([]);
    const [isSimopsPreviewOpen, setIsSimopsPreviewOpen] = useState(false);
    const [simopsTasksForPreview, setSimopsTasksForPreview] = useState<ScheduledTask[]>([]);

    const [isPermitPreviewOpen, setIsPermitPreviewOpen] = useState(false);
    const [permitTasksForPreview, setPermitTasksForPreview] = useState<ScheduledTask[]>([]);
    const [permitTypeForPreview, setPermitTypeForPreview] = useState<'pth' | 'pf' | 'pp' | 'pl' | 'pe' | null>(null);

    const [isPlanningExportModalOpen, setIsPlanningExportModalOpen] = useState(false);
    const [planningExportTitle, setPlanningExportTitle] = useState('Planning de Maintenance par Famille');

    const [isGanttSettingsModalOpen, setIsGanttSettingsModalOpen] = useState(false);
    const [ganttSettingsMode, setGanttSettingsMode] = useState<'view' | 'export'>('view');
    const [ganttTitle, setGanttTitle] = useState('Gantt de Maintenance par Famille');

    const [isTeamGanttExportModalOpen, setIsTeamGanttExportModalOpen] = useState(false);
    const [teamGanttExportTitle, setTeamGanttExportTitle] = useState('Gantt de Maintenance par Équipe');
    const [highlightedTaskId, setHighlightedTaskId] = useState<number | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDependencyModalOpen, setIsDependencyModalOpen] = useState(false);
    const [viewingSuccessorsOf, setViewingSuccessorsOf] = useState<ScheduledTask | null>(null);

    // Consolidated state for ordering
    const [familyOrder, setFamilyOrder] = useState<string[]>([]);
    const [teamOrder, setTeamOrder] = useState<string[]>([]);

    const [specialListFilter, setSpecialListFilter] = useState<{ isOpen: boolean; type: 'highRisk' | 'preparations' | 'shiftWork' | 'scaffolding' | 'handling' | 'pth' | 'pf' | 'pp' | 'pl' | 'pe' | 'thr' | 'simops' | null }>({ isOpen: false, type: null });
    const [highRiskTasksForPreview, setHighRiskTasksForPreview] = useState<ScheduledTask[]>([]);
    const [highRiskModalTitle, setHighRiskModalTitle] = useState<string | undefined>(undefined);
    const [preparationsTasksForPreview, setPreparationsTasksForPreview] = useState<ScheduledTask[]>([]);
    const [specialListDateRange, setSpecialListDateRange] = useState<{ start: string; end: string } | null>(null);
    const [specialListSelectedColumns, setSpecialListSelectedColumns] = useState<string[] | undefined>();
    const [specialListCustomTitle, setSpecialListCustomTitle] = useState<string | undefined>();
    const [isShiftWorkModalOpen, setIsShiftWorkModalOpen] = useState(false);
    const [shiftWorkTasksForPreview, setShiftWorkTasksForPreview] = useState<ScheduledTask[]>([]);

    // VIEW MODE STATE (Gantt vs List)
    const [viewMode, setViewMode] = useState<'gantt' | 'list'>('gantt');

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(true);

    // --- START: NEW FILTERING STATE ---
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const [dateFilter, setDateFilter] = useState<{ start: string; end: string } | null>(null);
    const [disciplineFilter, setDisciplineFilter] = useState<string[]>([]);
    const [familyFilter, setFamilyFilter] = useState<string[]>([]);
    const [equipmentFilter, setEquipmentFilter] = useState<string[]>([]);
    const [teamFilter, setTeamFilter] = useState<string[]>([]);
    // --- END: NEW FILTERING STATE ---

    const toDateTimeLocal = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        const tzoffset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
    };

    // --- START: DERIVED DATA FOR FILTERS & FILTERING LOGIC ---
    const { uniqueDisciplines, uniqueFamilies, uniqueEquipments, uniqueTeams } = useMemo(() => {
        if (!results) return { uniqueDisciplines: [], uniqueFamilies: [], uniqueEquipments: [], uniqueTeams: [] };
        const disciplines = new Set<string>();
        const families = new Set<string>();
        const equipments = new Set<string>();
        const teams = new Set<string>();

        results.scheduledTasks.forEach(task => {
            if (task.discipline) disciplines.add(task.discipline);
            if (task.family) families.add(task.family);
            if (task.equipment) equipments.add(task.equipment);
            if (task.team) teams.add(task.team);
        });

        return {
            uniqueDisciplines: Array.from(disciplines).sort(),
            uniqueFamilies: Array.from(families).sort(),
            uniqueEquipments: Array.from(equipments).sort(),
            uniqueTeams: Array.from(teams).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
        };
    }, [results]);

    const filteredTasks = useMemo(() => {
        if (!results) return [];

        return results.scheduledTasks.filter(task => {
            // Date filter
            if (dateFilter) {
                const taskStart = task.startTime.getTime();
                const taskEnd = task.endTime.getTime();
                const filterStart = new Date(dateFilter.start).getTime();
                const filterEnd = new Date(dateFilter.end).getTime();
                if (taskStart >= filterEnd || taskEnd <= filterStart) {
                    return false;
                }
            }
            // Discipline filter
            if (disciplineFilter.length > 0 && !disciplineFilter.includes(task.discipline)) {
                return false;
            }
            // Family filter
            if (familyFilter.length > 0 && !familyFilter.includes(task.family)) {
                return false;
            }
            // Equipment filter
            if (equipmentFilter.length > 0 && !equipmentFilter.includes(task.equipment)) {
                return false;
            }
            // Team filter
            if (teamFilter.length > 0 && !teamFilter.includes(task.team)) {
                return false;
            }
            // Search term filter
            const lowercasedSearchTerm = searchTerm.toLowerCase();
            if (lowercasedSearchTerm && !(
                task.family.toLowerCase().includes(lowercasedSearchTerm) ||
                task.action.toLowerCase().includes(lowercasedSearchTerm) ||
                task.equipment.toLowerCase().includes(lowercasedSearchTerm)
            )) {
                return false;
            }

            return true;
        });
    }, [results, dateFilter, disciplineFilter, familyFilter, equipmentFilter, teamFilter, searchTerm]);

    const handleClearAllFilters = useCallback(() => {
        setDateFilter(null);
        setDisciplineFilter([]);
        setFamilyFilter([]);
        setEquipmentFilter([]);
        setTeamFilter([]);
    }, []);

    const activeFilterCount = useMemo(() => [
        dateFilter !== null,
        disciplineFilter.length > 0,
        familyFilter.length > 0,
        equipmentFilter.length > 0,
        teamFilter.length > 0,
    ].filter(Boolean).length, [dateFilter, disciplineFilter, familyFilter, equipmentFilter, teamFilter]);
    // --- END: DERIVED DATA FOR FILTERS & FILTERING LOGIC ---


    useEffect(() => {
        if (results) {
            const uniqueFamilies = [...new Set(results.scheduledTasks.map(t => t.family))].sort();
            setFamilyOrder(uniqueFamilies);
            const uniqueTeams = [...new Set(results.scheduledTasks.map(t => t.team))].sort();
            setTeamOrder(uniqueTeams);

            // Set the initial date range when results are loaded
            const initialDateRange = {
                start: toDateTimeLocal(parameters.shutdownStart),
                end: toDateTimeLocal(parameters.shutdownEnd),
            };
            setSpecialListDateRange(initialDateRange);
            setDateFilter(initialDateRange);
        } else {
            setFamilyOrder([]);
            setTeamOrder([]);
            setSpecialListDateRange(null);
        }
    }, [results, parameters]);

    const highRiskTasks = useMemo(() => {
        if (!results) return [];
        return results.scheduledTasks.filter(t => t.isHighRisk);
    }, [results]);
    const highRiskTasksCount = highRiskTasks.length;

    const preparationsTasks = useMemo(() => {
        if (!results) return [];
        const globalPdr = results.pdrItems || [];

        return results.scheduledTasks
            .map(t => {
                // Check if this task already has its PDR items or needs fallback linking
                const hasPdrOnTask = t.pdrItems && t.pdrItems.length > 0;
                let fallbackPdrItems: any[] = [];

                if (!hasPdrOnTask && globalPdr.length > 0) {
                    const ot = String(t.ot || (t as any).OT || '').trim();
                    if (ot && ot !== '0' && ot !== 'null') {
                        fallbackPdrItems = globalPdr.filter(pdr => String(pdr.OT).trim() === ot);
                    }
                }

                // If we found pdr items via fallback, merge them into the object for downstream consumers
                if (fallbackPdrItems.length > 0) {
                    return { ...t, pdrItems: fallbackPdrItems };
                }
                return t;
            })
            .filter(t => {
                // 1. Text-based preparations
                const prepRaw = t.preparatifs || (t as any).Préparatifs;
                const hasPrepText = prepRaw && String(prepRaw).trim() !== '' && String(prepRaw).trim() !== '0';

                // 2. Linked PDR items (either original or from our fallback map above)
                const hasPdr = t.pdrItems && t.pdrItems.length > 0;

                return !!(hasPrepText || hasPdr);
            });
    }, [results]);

    const scaffoldingTasks = useMemo(() => {
        if (!results) return [];
        return results.scheduledTasks.filter(t => t['Scaffolding Required'] === 1);
    }, [results]);
    const scaffoldingTasksCount = scaffoldingTasks.length;

    const handlingTasks = useMemo(() => {
        if (!results) return [];
        return results.scheduledTasks.filter(t => t['Handling required'] === 1);
    }, [results]);
    const handlingTasksCount = handlingTasks.length;

    const pthTasks = useMemo(() => results?.scheduledTasks.filter(t =>
        t.permisTravailHauteur === 1 || (t as any)['permis Travail Hauteur'] === 1
    ) || [], [results]);
    const pthTasksCount = pthTasks.length;

    const pfTasks = useMemo(() => results?.scheduledTasks.filter(t =>
        t.permisFeu === 1 || (t as any)['permis Feu'] === 1
    ) || [], [results]);
    const pfTasksCount = pfTasks.length;

    const ppTasks = useMemo(() => results?.scheduledTasks.filter(t =>
        t.permisPenetration === 1 || (t as any)['permis Penetration'] === 1
    ) || [], [results]);
    const ppTasksCount = ppTasks.length;

    const plTasks = useMemo(() => results?.scheduledTasks.filter(t =>
        t.permisLevage === 1 || (t as any)['permis Levage'] === 1
    ) || [], [results]);
    const plTasksCount = plTasks.length;

    const peTasks = useMemo(() => results?.scheduledTasks.filter(t =>
        t.permisExcavation === 1 || (t as any)['permis Excavation'] === 1
    ) || [], [results]);
    const peTasksCount = peTasks.length;

    // --- THR Tasks (Travaux à Haut Risque) ---
    const thrTasks = useMemo(() => {
        if (!results) return [];
        // Use thrTaskOTs from results if available, otherwise fall back to isHighRisk with THR flag
        if (results.thrTaskOTs && results.thrTaskOTs.length > 0) {
            const thrSet = new Set(results.thrTaskOTs);
            return results.scheduledTasks.filter(t => thrSet.has(String(t.ot || '').trim()));
        }
        // Fallback: filter by isHighRisk (which includes HSE + THR)
        return results.scheduledTasks.filter(t => (t as any)['THR'] === 1 || (t as any)['THR'] === true);
    }, [results]);
    const thrTasksCount = thrTasks.length;

    // --- SIMOPS ---
    const simopsRecordsData = useMemo(() => results?.simopsRecords || [], [results]);
    const simopsCount = simopsRecordsData.length;
    const simopsTasks = useMemo(() => {
        if (!results) return [];
        // Build a set of OTs that appear in the global simopsRecords (same source as badge count)
        const simopsOTSet = new Set(simopsRecordsData.map(r => String(r.OT).trim()));
        // Also include OTs that appear as the "sibling" side (simopsOT)
        simopsRecordsData.forEach(r => simopsOTSet.add(String(r.simopsOT).trim()));
        return results.scheduledTasks.filter(t => {
            const ot = String(t.ot || '').trim();
            return (ot && simopsOTSet.has(ot)) ||
                (t.simopsRecords && t.simopsRecords.length > 0) ||
                (t as any).isSimops;
        });
    }, [results, simopsRecordsData]);

    const keyEventTasks = useMemo(() => {
        if (!results) return [];
        return results.scheduledTasks.filter(task => task.isKeyEvent);
    }, [results]);

    const systematicSpecialTasks = useMemo(() => {
        if (!results || isColdStopFlow) return [];

        const { shutdownStart, shutdownEnd, consignation, deconsignation, combustion, demarrage } = parameters;
        const { scheduleEndDate } = results;

        const p_shutdownEnd = new Date(shutdownEnd);
        const p_demarrageEnd = p_shutdownEnd;
        const p_demarrageStart = new Date(p_demarrageEnd.getTime() - demarrage * 60 * 1000);

        let p_deconsignationStart, p_deconsignationEnd;
        let p_combustionStart, p_combustionEnd;

        if (combustion.mode === 'after_deconsignation') {
            const p_allumageEnd = p_demarrageStart;
            p_combustionEnd = p_allumageEnd;
            p_combustionStart = new Date(p_allumageEnd.getTime() - combustion.value * 60 * 1000);
            p_deconsignationEnd = p_combustionStart;
            p_deconsignationStart = new Date(p_deconsignationEnd.getTime() - deconsignation * 60 * 1000);
        } else { // 'parallel'
            p_deconsignationEnd = p_demarrageStart;
            p_deconsignationStart = new Date(p_deconsignationEnd.getTime() - deconsignation * 60 * 1000);
            p_combustionEnd = p_demarrageStart;
            p_combustionStart = new Date(p_combustionEnd.getTime() - combustion.value * 60 * 1000);
        }

        const p_consignationStart = new Date(shutdownStart);
        const p_workStart = new Date(p_consignationStart.getTime() + consignation * 60 * 1000);
        const p_workEnd = scheduleEndDate;
        const cheminCritiqueDuration = (p_workEnd.getTime() - p_workStart.getTime()) / (1000 * 60);

        const tasks: Partial<ScheduledTask>[] = [
            { id: -10, action: 'Arrêt de la ligne', startTime: p_consignationStart, endTime: p_consignationStart, duration: 0 },
            { id: -1, action: 'CONSIGNATION', startTime: p_consignationStart, endTime: p_workStart, duration: consignation / 60 },
            { id: -11, action: 'Début des travaux', startTime: p_workStart, endTime: p_workStart, duration: 0 },
            { id: -12, action: 'Chemin Critique', startTime: p_workStart, endTime: p_workEnd, duration: cheminCritiqueDuration > 0 ? cheminCritiqueDuration / 60 : 0 },
            { id: -13, action: 'Fin des travaux', startTime: p_workEnd, endTime: p_workEnd, duration: 0 },
            { id: -3, action: 'DECONSIGNATION', startTime: p_deconsignationStart, endTime: p_deconsignationEnd, duration: deconsignation / 60 },
            { id: -2, action: 'ALLUMAGE DE LA CHAMBRE À COMBUSTION', startTime: p_combustionStart, endTime: p_combustionEnd, duration: combustion.value / 60 },
            { id: -4, action: 'DEMARRAGE DE LA BOUCLE', startTime: p_demarrageStart, endTime: p_demarrageEnd, duration: demarrage / 60 },
        ];

        return tasks.filter(t => t.startTime && t.endTime && !isNaN(t.startTime.getTime()) && !isNaN(t.endTime.getTime())) as ScheduledTask[];
    }, [results, parameters, isColdStopFlow]);

    const handleShowGantt = useCallback((title: string, tasks: ScheduledTask[]) => {
        setGanttModalData({ title, tasks });
    }, []);

    const handleTaskScroll = useCallback((taskId: number) => {
        const element = document.getElementById(`task-row-${taskId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedTaskId(taskId);
            setTimeout(() => setHighlightedTaskId(null), 2500);
        }
    }, []);

    const handleExportHighRisk = async () => {
        if (!results) return;
        try {
            const doc = await exportTHRReportToPDF(highRiskTasks, parameters, results.scheduledTasks);
            doc.save('Taches_Haut_Risque.pdf');
        } catch (e) {
            console.error('Failed to export high-risk tasks PDF:', e);
            if (e instanceof Error) { alert(e.message); }
            else { alert("Une erreur est survenue lors de l'export du PDF des taches a haut risque."); }
        }
    };

    const handleDownloadFilteredHighRisk = async (tasksToExport: ScheduledTask[], customTitle?: string, selectedColumns?: string[]) => {
        if (!results) return;
        try {
            // Use the premium THR report for THR-type lists
            const doc = await exportTHRReportToPDF(tasksToExport, parameters, results.scheduledTasks, customTitle);
            doc.save(`${customTitle || 'Taches_Haut_Risque'}.pdf`);
        } catch (e) {
            console.error('Failed to export filtered high-risk tasks PDF:', e);
            if (e instanceof Error) { alert(e.message); }
            else { alert("Une erreur est survenue lors de l'export."); }
        }
    };

    const handleExportSimops = async () => {
        if (!results) return;
        try {
            const doc = await exportSimopsReportToPDF(simopsRecordsData, results.scheduledTasks, parameters);
            doc.save('Rapport_SIMOPS.pdf');
        } catch (e) {
            console.error('Failed to export SIMOPS tasks PDF:', e);
            if (e instanceof Error) { alert(e.message); }
            else { alert("Une erreur est survenue lors de l'export du PDF SIMOPS."); }
        }
    };

    const handleDownloadFilteredPreparations = async (tasksToExport: ScheduledTask[], customTitle?: string, selectedColumns?: string[]) => {
        try {
            await exportPreparationsToPDF(tasksToExport, true, customTitle, selectedColumns, results?.scheduledTasks);
        } catch (e) {
            console.error("Failed to export filtered preparations PDF:", e);
            alert("Une erreur est survenue lors de l'export.");
        }
    };

    const handleDownloadFilteredScaffolding = async (tasksToExport: ScheduledTask[], customTitle?: string, selectedColumns?: string[]) => {
        if (!results) return;
        try {
            const doc = await exportScaffoldingTasksToPDF(tasksToExport, parameters, customTitle, selectedColumns, results.scheduledTasks);
            doc.save(`Travaux_Echafaudage_Filtres.pdf`);
        } catch (e) {
            console.error("Failed to export filtered scaffolding tasks PDF:", e);
            if (e instanceof Error) {
                alert(e.message);
            } else {
                alert("Une erreur est survenue lors de l'export.");
            }
        }
    };

    const handleDownloadFilteredHandling = async (tasksToExport: ScheduledTask[], customTitle?: string, selectedColumns?: string[]) => {
        if (!results) return;
        try {
            const doc = await exportHandlingTasksToPDF(tasksToExport, parameters, customTitle, selectedColumns, results.scheduledTasks, handlingRecords);
            doc.save(`Travaux_Manutention_Filtres.pdf`);
        } catch (e) {
            console.error("Failed to export filtered handling tasks PDF:", e);
            if (e instanceof Error) {
                alert(e.message);
            } else {
                alert("Une erreur est survenue lors de l'export.");
            }
        }
    };

    const handleDownloadFilteredPermit = async (
        tasksToExport: ScheduledTask[],
        permitKey: keyof ScheduledTask,
        customTitle: string,
        labelTotal: string,
        labelFound: string,
        labelNotFound: string,
        bannerColor: [number, number, number],
        selectedColumns?: string[]
    ) => {
        if (!results) return;
        try {
            const doc = await exportPermitTasksToPDF(
                tasksToExport, parameters, permitKey, customTitle,
                labelTotal, labelFound, labelNotFound, bannerColor,
                selectedColumns, results.scheduledTasks
            );
            doc.save(`${customTitle.replace(/\s+/g, '_')}.pdf`);
        } catch (e) {
            console.error(`Failed to export filtered permit tasks PDF for ${permitKey}:`, e);
            if (e instanceof Error) {
                alert(e.message);
            } else {
                alert("Une erreur est survenue lors de l'export.");
            }
        }
    };

    const handleDownloadFilteredShiftWork = async (tasksToExport: ScheduledTask[], filter: { start: Date, end: Date }, customTitle?: string) => {
        if (!results) return;
        try {
            const title = customTitle || `Tâches du ${formatDate(filter.start)} au ${formatDate(filter.end)}`;
            const doc = await exportShiftWorkToPDF(tasksToExport, title, parameters);
            const fileName = (customTitle || `Taches_par_quart_${formatDate(filter.start, false)}_${formatDate(filter.end, false)}`).replace(/[\s/:]/g, '_');
            doc.save(`${fileName}.pdf`);
        } catch (e) {
            console.error("Failed to export filtered shift work PDF:", e);
            if (e instanceof Error) {
                alert(e.message);
            } else {
                alert("Une erreur est survenue lors de l'export.");
            }
        }
    };

    const handleShareHighRisk = async () => {
        if (!results || !navigator.share) return;
        try {
            const doc = await exportHighRiskTasksToPDF(highRiskTasks, parameters, undefined, undefined, results.scheduledTasks);
            const pdfBlob = doc.output('blob');
            const file = new File([pdfBlob], 'Taches_Haut_Risque.pdf', { type: 'application/pdf' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Liste des Tâches à Haut Risque',
                    text: `Ci-joint la liste des tâches à haut risque générée par PlanneX.`
                });
            } else {
                alert("Le partage de fichiers n'est pas supporté sur cet appareil ou ce navigateur.");
            }
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') console.error('Error sharing:', error);
        }
    };

    // overrunningTasks must be computed before any conditional return (React Hooks rule)
    const overrunningTasks = useMemo(() => {
        if (!results) return [];
        const maxEndTime = Math.max(...results.scheduledTasks.map(t => t.endTime.getTime()));
        return results.scheduledTasks.filter(task => task.endTime.getTime() === maxEndTime);
    }, [results]);


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96 bg-slate-800 rounded-lg">
                <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24" stroke="currentColor">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="ml-4 text-lg">Calcul du planning en cours...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-900/50 border border-red-700 text-red-300 p-6 rounded-lg">
                <h3 className="font-bold text-lg mb-2">Erreur</h3>
                <p>{error}</p>
            </div>
        );
    }

    if (!results) {
        return (
            <div className="flex justify-center items-center h-96 bg-slate-800 rounded-lg">
                <p className="text-slate-400 text-lg">Les résultats s'afficheront ici après le calcul.</p>
            </div>
        );
    }

    const { peakResources, scheduledTasks, maxWorkDate } = results;

    // ── Live KPIs ─────────────────────────────────────────────────────────────
    // Recomputed every time scheduledTasks changes (e.g. after a duration edit)
    // so the dashboard always shows the correct values without needing to
    // re-click "Voir Résultats".
    const { kpis, scheduleEndDate } = useMemo(() => {
        if (!scheduledTasks || scheduledTasks.length === 0) {
            return {
                kpis: results.kpis,
                scheduleEndDate: results.scheduleEndDate,
            };
        }
        const liveEndDate = new Date(Math.max(...scheduledTasks.map(t => t.endTime.getTime())));
        const liveStartDate = new Date(Math.min(...scheduledTasks.map(t => t.startTime.getTime())));
        const effectiveWorkHours = (liveEndDate.getTime() - liveStartDate.getTime()) / 3_600_000;
        const totalManHours = scheduledTasks.reduce((sum, t) => sum + (t.manHours ?? t.duration * (t.manpower ?? 1)), 0);
        return {
            kpis: {
                ...results.kpis,
                totalTasks: scheduledTasks.length,
                totalManHours,
                effectiveWorkHours: effectiveWorkHours > 0 ? effectiveWorkHours : 0,
            },
            scheduleEndDate: liveEndDate,
        };
    }, [scheduledTasks, results.kpis, results.scheduleEndDate]);

    const isOvertime = scheduleEndDate > maxWorkDate;
    const overrunHours = isOvertime ? (scheduleEndDate.getTime() - maxWorkDate.getTime()) / (1000 * 60 * 60) : 0;

    const specialTasksToDisplay = isColdStopFlow ? keyEventTasks : systematicSpecialTasks;


    return (
        <div className={`flex flex-col xl:flex-row gap-6 ${isDarkMode ? 'bg-[#080b12] text-white' : 'bg-slate-50 text-slate-900'} min-h-screen transition-colors duration-300 -m-6 p-6`}>
            {/* SIDEBAR MENU */}
            <div className={`flex-shrink-0 flex flex-col gap-4 transition-all duration-500 ease-in-out ${isSidebarCollapsed ? 'w-[72px] hidden md:flex' : 'w-full xl:w-[270px]'}`}>
                <div className="bg-[#0a0d14]/98 backdrop-blur-2xl border border-white/[0.07] p-4 rounded-3xl shadow-[0_0_60px_rgba(0,0,0,0.7)] sticky top-6 overflow-hidden flex flex-col max-h-[calc(100vh-3rem)]" style={{ boxShadow: '0 0 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.04)' }}>

                    {/* Top accent line */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

                    {/* HEADER / TOGGLE */}
                    <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} mb-6 transition-all duration-300`}>
                        {!isSidebarCollapsed && (
                            <div className="flex items-center gap-3">
                                <div className="relative flex-shrink-0">
                                    <div className="absolute inset-0 bg-emerald-500 blur-lg opacity-30 rounded-2xl"></div>
                                    <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-xl shadow-emerald-900/40">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                    </div>
                                </div>
                                <div>
                                    <h1 className="font-black text-xl tracking-tighter text-white leading-none">PlanneX</h1>
                                    <span className="text-[7px] font-black text-emerald-500/80 uppercase tracking-[0.4em] leading-none">Intelligence Engine</span>
                                </div>
                            </div>
                        )}
                        {isSidebarCollapsed && (
                            <div className="relative">
                                <div className="absolute inset-0 bg-emerald-500 blur-lg opacity-20 rounded-xl"></div>
                                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                            className="p-2 rounded-xl bg-white/[0.04] hover:bg-emerald-500/20 text-slate-600 hover:text-emerald-400 transition-all duration-200 border border-white/[0.06] hover:border-emerald-500/30"
                            title={isSidebarCollapsed ? "Développer le menu" : "Réduire le menu"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transform transition-transform duration-500 ${isSidebarCollapsed ? 'rotate-180' : ''}`}><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-1 -mr-1 custom-scrollbar space-y-6">
                        <SidebarMenuSection title="Menu Principal" isSidebarCollapsed={isSidebarCollapsed} defaultOpen>
                            <SidebarButton
                                isSidebarCollapsed={isSidebarCollapsed}
                                icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>}
                                label="Tableau de Bord"
                                active={true}
                                onClick={() => {
                                    if (onNavigateToDashboard) {
                                        onNavigateToDashboard();
                                    } else {
                                        setViewMode('gantt');
                                        handleClearAllFilters();
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }
                                }}
                            />
                            <SidebarButton
                                isSidebarCollapsed={isSidebarCollapsed}
                                icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" /></svg>}
                                label="Ordonnancement (Retour)"
                                onClick={onBackToScheduling}
                            />
                            <SidebarButton
                                isSidebarCollapsed={isSidebarCollapsed}
                                icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>}
                                label="Portail de Contrôle"
                                onClick={onNavigateToPortal || (() => { })}
                            />
                        </SidebarMenuSection>

                        <SidebarMenuSection title="Planification & Rapport" isSidebarCollapsed={isSidebarCollapsed}>
                            <SidebarButton
                                isSidebarCollapsed={isSidebarCollapsed}
                                icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M18 12H9" /><path d="M15 9h-3" /><path d="M12 6H9" /></svg>}
                                label="Voir Gantt Global"
                                onClick={() => setIsProfGanttOpen(true)}
                            />
                            <SidebarButton
                                isSidebarCollapsed={isSidebarCollapsed}
                                icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
                                label="Voir par Équipe"
                                onClick={onNavigateToTeamView}
                            />
                            <SidebarButton
                                isSidebarCollapsed={isSidebarCollapsed}
                                icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m14 11-3 3-7.54-.54M10 13l3-3 7.54.54" /></svg>}
                                label="Analyser Dépendances"
                                onClick={() => setIsDependencyModalOpen(true)}
                            />
                            <SidebarButton
                                isSidebarCollapsed={isSidebarCollapsed}
                                icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>}
                                label="Exporter Planning"
                                onClick={() => setIsPlanningExportModalOpen(true)}
                            />
                            <SidebarButton
                                isSidebarCollapsed={isSidebarCollapsed}
                                icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M18 12H9" /><path d="M15 9h-3" /><path d="M12 6H9" /></svg>}
                                label="Exporter Gantt (Filtres)"
                                onClick={() => { setGanttSettingsMode('export'); setIsGanttSettingsModalOpen(true); }}
                            />
                            <SidebarButton
                                isSidebarCollapsed={isSidebarCollapsed}
                                icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
                                label="Exporter Gantt (Équipe)"
                                onClick={() => setIsTeamGanttExportModalOpen(true)}
                            />
                        </SidebarMenuSection>

                        {onNavigateToReadiness && (
                            <SidebarMenuSection title="Readiness" isSidebarCollapsed={isSidebarCollapsed}>
                                <SidebarButton
                                    isSidebarCollapsed={isSidebarCollapsed}
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>}
                                    label="Shut-down Readiness"
                                    onClick={onNavigateToReadiness}
                                />
                            </SidebarMenuSection>
                        )}

                        {onNavigateToWhatIf && (
                            <SidebarMenuSection title="Simulation" isSidebarCollapsed={isSidebarCollapsed}>
                                <SidebarButton
                                    isSidebarCollapsed={isSidebarCollapsed}
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2v7.31" /><path d="M14 9.3V1.99" /><path d="M8.5 2h7" /><path d="M14 9.3a6.5 6.5 0 1 1-4 0" /><path d="M5.52 16h12.96" /></svg>}
                                    label="What-If Scenario"
                                    onClick={onNavigateToWhatIf}
                                    badge={<span className="text-[8px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)' }}>NEW</span>}
                                />
                            </SidebarMenuSection>
                        )}

                        {onNavigateToAICopilot && (
                            <SidebarMenuSection title="Intelligence IA" isSidebarCollapsed={isSidebarCollapsed}>
                                <SidebarButton
                                    isSidebarCollapsed={isSidebarCollapsed}
                                    icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /><path d="M18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456L18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456Z" /></svg>}
                                    label="Copilot IA"
                                    onClick={onNavigateToAICopilot}
                                    badge={<span className="text-[8px] font-black px-2 py-0.5 rounded-full" style={{ background: 'rgba(6,182,212,0.2)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}>AI</span>}
                                />
                            </SidebarMenuSection>
                        )}

                        <SidebarMenuSection title="Évaluation" isSidebarCollapsed={isSidebarCollapsed}>
                            <SidebarButton
                                isSidebarCollapsed={isSidebarCollapsed}
                                icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>}
                                label="Évaluation à Chaud"
                                onClick={onNavigateToHotReview}
                            />
                            <SidebarButton
                                isSidebarCollapsed={isSidebarCollapsed}
                                icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20V16" /></svg>}
                                label="Évaluer l'Arrêt"
                                onClick={onNavigateToEvaluationView}
                            />
                        </SidebarMenuSection>

                        <SidebarMenuSection title="Listes Spéciales" isSidebarCollapsed={isSidebarCollapsed}>
                            <SidebarButton isSidebarCollapsed={isSidebarCollapsed} onClick={() => {
                                setHighRiskTasksForPreview(thrTasks);
                                setHighRiskModalTitle('Liste THR — Travaux à Haut Risque');
                                setIsHighRiskPreviewOpen(true);
                            }} disabled={thrTasksCount === 0} icon={<span className="w-2.5 h-2.5 rounded-sm bg-red-700 block shadow-sm shadow-red-500/50"></span>} label="THR (T. Haut Risque)" badge={<span className="bg-red-900/40 text-red-400 text-[10px] px-2 py-0.5 rounded-full border border-red-500/20">{thrTasksCount}</span>} />
                            <SidebarButton isSidebarCollapsed={isSidebarCollapsed} onClick={() => { setSimopsTasksForPreview(simopsTasks); setIsSimopsPreviewOpen(true); }} disabled={simopsCount === 0} icon={<span className="w-2.5 h-2.5 rounded-sm bg-yellow-500 block shadow-sm shadow-yellow-500/50"></span>} label="SIMOPS" badge={<span className="bg-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-white/5">{simopsCount}</span>} />
                            <SidebarButton isSidebarCollapsed={isSidebarCollapsed} onClick={() => setSpecialListFilter({ isOpen: true, type: 'preparations' })} disabled={preparationsTasks.length === 0} icon={<span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>} label="Préparatifs" badge={<span className="bg-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-white/5">{preparationsTasks.length}</span>} />
                            <SidebarButton isSidebarCollapsed={isSidebarCollapsed} onClick={() => setSpecialListFilter({ isOpen: true, type: 'scaffolding' })} disabled={scaffoldingTasksCount === 0} icon={<span className="w-2.5 h-2.5 rounded-full bg-cyan-500 block"></span>} label="Échafaudage" badge={<span className="bg-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-white/5">{scaffoldingTasksCount}</span>} />
                            <SidebarButton isSidebarCollapsed={isSidebarCollapsed} onClick={() => setSpecialListFilter({ isOpen: true, type: 'handling' })} disabled={handlingTasksCount === 0} icon={<span className="w-2.5 h-2.5 rounded-full bg-indigo-500 block"></span>} label="Manutention" badge={<span className="bg-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-white/5">{handlingTasksCount}</span>} />
                            <SidebarButton isSidebarCollapsed={isSidebarCollapsed} onClick={() => setSpecialListFilter({ isOpen: true, type: 'shiftWork' })} icon={<span className="w-2.5 h-2.5 rounded-full bg-blue-500 block"></span>} label="Tâches par Quart" badge={<span className="bg-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-white/5">{results.scheduledTasks.length}</span>} />
                        </SidebarMenuSection>

                        <SidebarMenuSection title="Permis & Procédures" defaultOpen={false} isSidebarCollapsed={isSidebarCollapsed}>
                            <SidebarButton isSidebarCollapsed={isSidebarCollapsed} onClick={() => setSpecialListFilter({ isOpen: true, type: 'pth' })} disabled={pthTasksCount === 0} icon={<span className="w-2.5 h-2.5 rounded-sm bg-red-600 block shadow-sm shadow-red-500/50"></span>} label="T. Hauteur" badge={<span className="bg-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-white/5">{pthTasksCount}</span>} />
                            <SidebarButton isSidebarCollapsed={isSidebarCollapsed} onClick={() => setSpecialListFilter({ isOpen: true, type: 'pf' })} disabled={pfTasksCount === 0} icon={<span className="w-2.5 h-2.5 rounded-sm bg-orange-600 block shadow-sm shadow-orange-500/50"></span>} label="Feu" badge={<span className="bg-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-white/5">{pfTasksCount}</span>} />
                            <SidebarButton isSidebarCollapsed={isSidebarCollapsed} onClick={() => setSpecialListFilter({ isOpen: true, type: 'pp' })} disabled={ppTasksCount === 0} icon={<span className="w-2.5 h-2.5 rounded-sm bg-purple-600 block shadow-sm shadow-purple-500/50"></span>} label="Pénétration" badge={<span className="bg-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-white/5">{ppTasksCount}</span>} />
                            <SidebarButton isSidebarCollapsed={isSidebarCollapsed} onClick={() => setSpecialListFilter({ isOpen: true, type: 'pl' })} disabled={plTasksCount === 0} icon={<span className="w-2.5 h-2.5 rounded-sm bg-blue-600 block shadow-sm shadow-blue-500/50"></span>} label="Levage" badge={<span className="bg-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-white/5">{plTasksCount}</span>} />
                            <SidebarButton isSidebarCollapsed={isSidebarCollapsed} onClick={() => setSpecialListFilter({ isOpen: true, type: 'pe' })} disabled={peTasksCount === 0} icon={<span className="w-2.5 h-2.5 rounded-sm bg-amber-600 block shadow-sm shadow-amber-500/50"></span>} label="Excavation" badge={<span className="bg-slate-700/50 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-white/5">{peTasksCount}</span>} />
                        </SidebarMenuSection>

                        <SidebarMenuSection title="Système" isSidebarCollapsed={isSidebarCollapsed}>
                            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center p-3' : 'justify-between p-2.5'} rounded-xl bg-slate-800/80 border border-slate-700/50 opacity-70 cursor-not-allowed`} title="Le mode clair a été désactivé pour conserver l'aspect pro et immersif du tableau de bord.">
                                <div className="flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                                    {!isSidebarCollapsed && <span className="text-sm font-semibold text-slate-300">Sombre (Pro)</span>}
                                </div>
                                {!isSidebarCollapsed && (
                                    <div className={`w-10 h-6 flex items-center bg-emerald-500 rounded-full p-1 transition-colors opacity-50`}>
                                        <div className={"bg-white w-4 h-4 rounded-full shadow-md transform transition-transform translate-x-4"}></div>
                                    </div>
                                )}
                            </div>
                        </SidebarMenuSection>
                    </div>

                </div>
            </div>

            {/* MAIN CONTENT */}
            <div className="flex-1 min-w-0 space-y-8 relative">
                {/* ═══ CINEMATIC PAGE HERO HEADER ═══ */}
                <div className="relative bg-[#080c15]/60 backdrop-blur-xl border border-white/[0.06] rounded-3xl px-8 py-6 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                    {/* Ambient glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/8 blur-[80px] -translate-y-1/2 translate-x-1/4 rounded-full pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/6 blur-[60px] translate-y-1/2 -translate-x-1/4 rounded-full pointer-events-none" />
                    {/* Top shimmer */}
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                    <div className="relative z-10 flex items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="relative">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)]" />
                                    <div className="w-2 h-2 rounded-full bg-emerald-400/30 animate-ping absolute inset-0" />
                                </div>
                                <span className="text-[9px] font-black text-emerald-500/80 uppercase tracking-[0.45em]">Tableau de Bord Opérationnel</span>
                            </div>
                            <h2 className="text-4xl font-black text-white tracking-tighter leading-none">
                                Vue d'Ensemble
                                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 text-3xl mt-0.5">du Planning</span>
                            </h2>
                        </div>
                    </div>
                </div>

                {isOvertime && (
                    <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg flex items-start gap-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 flex-shrink-0 mt-1"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                        <div>
                            <h3 className="font-bold text-red-200">Attention : Dépassement de la durée de l'arrêt !</h3>
                            <p className="mt-1">
                                Le planning calculé se termine le <strong>{formatDate(scheduleEndDate)}</strong>, dépassant la fin prévue ({formatDate(maxWorkDate)}) de <strong>{overrunHours.toFixed(2)} heures</strong>.
                            </p>
                            {overrunningTasks.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-red-800/50">
                                    <p className="text-sm font-semibold text-red-200">La ou les tâches causant ce retard sont :</p>
                                    <ul className="mt-1 space-y-1 text-sm">
                                        {overrunningTasks.map(task => (
                                            <li key={task.id}>
                                                <button
                                                    onClick={() => handleTaskScroll(task.id)}
                                                    className="text-left p-1 rounded transition-colors hover:bg-red-800/50 w-full focus:outline-none focus:ring-2 focus:ring-red-400"
                                                >
                                                    <span className="font-bold"> • {task.action}</span> sur <span className="font-semibold">{task.equipment}</span> (équipe: <span className="font-semibold">{task.team}</span>)
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )
                }

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KpiCard
                        title="Tâches Totales"
                        value={kpis.totalTasks}
                        unit="Missions"
                        gradient="from-blue-400 to-blue-600"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10M18 20V4M6 20V16" /></svg>}
                        shadow="hover:shadow-blue-500/20"
                    />
                    <KpiCard
                        title="Charge Travail"
                        value={kpis.totalManHours.toFixed(1)}
                        unit="H-H"
                        gradient="from-purple-400 to-purple-600"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
                        shadow="hover:shadow-purple-500/20"
                    />
                    <KpiCard
                        title="Opérationnel"
                        value={kpis.effectiveWorkHours.toFixed(1)}
                        unit="Heures"
                        gradient="from-emerald-400 to-emerald-600"
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
                        shadow="hover:shadow-emerald-500/20"
                    />
                    <KpiCard
                        title="Statut Final"
                        value={formatDate(scheduleEndDate, true).split(' ')[1]}
                        unit={formatDate(scheduleEndDate, true).split(' ')[0]}
                        gradient={isOvertime ? "from-red-400 to-red-600" : "from-amber-400 to-amber-600"}
                        icon={<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
                        shadow={isOvertime ? "hover:shadow-red-500/20" : "hover:shadow-amber-500/20"}
                    />
                </div>

                <div className="w-full">
                    <SpecialTasksView tasks={specialTasksToDisplay} />
                </div>

                {/* Search and Task List Control Hub */}
                <div className="mt-12 space-y-6">
                    <div className="bg-slate-900/60 backdrop-blur-xl p-4 rounded-[2rem] border border-white/5 z-20 shadow-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5 pointer-events-none"></div>

                        {/* VIEW MODE & FILTERS SWITCHER */}
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                                <button
                                    onClick={() => setViewMode('gantt')}
                                    className={`group relative flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${viewMode === 'gantt' ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'text-slate-500 hover:text-white'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform duration-300 ${viewMode === 'gantt' ? 'scale-110' : 'group-hover:scale-110'}`}><path d="M3 3v18h18" /><path d="M18 12H9" /><path d="M15 9h-3" /><path d="M12 6H9" /></svg>
                                    Vue Gantt
                                </button>
                                <div className="w-px h-6 bg-white/5 self-center mx-1"></div>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`group relative flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${viewMode === 'list' ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'text-slate-500 hover:text-white'}`}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" className={`transition-transform duration-300 ${viewMode === 'list' ? 'scale-110' : 'group-hover:scale-110'}`}><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                                    Vue Détaillée
                                </button>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-3 px-4 py-2 bg-black/20 rounded-xl border border-white/5">
                                    <div className="flex -space-x-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div>
                                    </div>
                                    <div className="text-[10px] font-black tracking-widest uppercase">
                                        <span className="text-emerald-400">{filteredTasks.length}</span>
                                        <span className="text-slate-600 mx-2">/</span>
                                        <span className="text-slate-400">{results.scheduledTasks.length}</span>
                                        <span className="text-slate-600 ml-2 italic tracking-tighter shadow-sm">Missions</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setIsFilterPanelOpen(true)}
                                    className="group relative flex items-center gap-3 px-8 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] bg-slate-800/50 border border-white/10 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-emerald-500/50 transition-all duration-300 shadow-xl active:scale-95"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" className="group-hover:rotate-180 transition-transform duration-500"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                                    Filtres
                                    {activeFilterCount > 0 && (
                                        <div className="absolute -top-2 -right-2 flex h-6 w-6">
                                            <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></div>
                                            <div className="relative inline-flex rounded-full h-6 w-6 bg-emerald-500 text-white text-[10px] font-black items-center justify-center border-2 border-slate-900 shadow-lg">{activeFilterCount}</div>
                                        </div>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {isFilterPanelOpen && (
                        <GanttFilterPanel
                            dateFilter={dateFilter}
                            setDateFilter={setDateFilter}
                            disciplineFilter={disciplineFilter}
                            setDisciplineFilter={setDisciplineFilter}
                            familyFilter={familyFilter}
                            setFamilyFilter={setFamilyFilter}
                            equipmentFilter={equipmentFilter}
                            setEquipmentFilter={setEquipmentFilter}
                            teamFilter={teamFilter}
                            setTeamFilter={setTeamFilter}
                            uniqueDisciplines={uniqueDisciplines}
                            uniqueFamilies={uniqueFamilies}
                            uniqueEquipments={uniqueEquipments}
                            uniqueTeams={uniqueTeams}
                            onClearAll={handleClearAllFilters}
                            onClose={() => setIsFilterPanelOpen(false)}
                            taskCount={{ visible: filteredTasks.length, total: results.scheduledTasks.length }}
                        />
                    )}

                    {filteredTasks.length > 0 ? (
                        viewMode === 'gantt' ? (
                            <SmartFamilyGantt tasks={filteredTasks} parameters={parameters} onTaskClick={setViewingSuccessorsOf} />
                        ) : (
                            <FamilyDetailedListView
                                tasks={filteredTasks}
                                onViewFamilyGantt={(title, tasks) => handleShowGantt(`Gantt pour : ${title}`, tasks)}
                            />
                        )
                    ) : (
                        <div className="text-center py-16 bg-slate-800 rounded-lg">
                            <h3 className="text-xl font-semibold text-slate-300">Aucun résultat trouvé</h3>
                            <p className="text-slate-400 mt-2">Essayez d'ajuster vos filtres de recherche.</p>
                        </div>
                    )}
                </div>

                <GanttModal isOpen={!!ganttModalData} onClose={() => setGanttModalData(null)} title={ganttModalData?.title || ''} tasks={ganttModalData?.tasks || []} parameters={parameters} />
                <DependencyChainModal isOpen={isDependencyModalOpen} onClose={() => setIsDependencyModalOpen(false)} tasks={results.scheduledTasks} />
                <SuccessorsModal isOpen={!!viewingSuccessorsOf} onClose={() => setViewingSuccessorsOf(null)} sourceTask={viewingSuccessorsOf} allTasks={results.scheduledTasks} />
                <HighRiskPreviewModal isOpen={isHighRiskPreviewOpen} onClose={() => { setIsHighRiskPreviewOpen(false); setHighRiskModalTitle(undefined); }} tasks={highRiskTasksForPreview} onDownload={handleExportHighRisk} onShare={handleShareHighRisk} modalTitle={highRiskModalTitle} onBack={() => { setIsHighRiskPreviewOpen(false); setHighRiskModalTitle(undefined); if (!highRiskModalTitle) setSpecialListFilter({ isOpen: true, type: 'highRisk' }); }} />
                <ScheduledPreparationsModal isOpen={isScheduledPreparationsModalOpen} onClose={() => setIsScheduledPreparationsModalOpen(false)} tasks={preparationsTasksForPreview} customTitle={specialListCustomTitle} selectedColumns={specialListSelectedColumns} onBack={() => { setIsScheduledPreparationsModalOpen(false); setSpecialListFilter({ isOpen: true, type: 'preparations' }); }} />

                <SimopsPreviewModal
                    isOpen={isSimopsPreviewOpen}
                    onClose={() => setIsSimopsPreviewOpen(false)}
                    tasks={simopsTasksForPreview}
                    simopsRecords={simopsRecordsData}
                    onDownload={handleExportSimops}
                    onBack={() => setIsSimopsPreviewOpen(false)}
                />

                <ScaffoldingTasksPreviewModal
                    isOpen={isScaffoldingPreviewOpen}
                    onClose={() => setIsScaffoldingPreviewOpen(false)}
                    tasks={scaffoldingTasksForPreview}
                    onBack={() => { setIsScaffoldingPreviewOpen(false); setSpecialListFilter({ isOpen: true, type: 'scaffolding' }); }}
                    onDownload={() => handleDownloadFilteredScaffolding(scaffoldingTasksForPreview)}
                />
                <HandlingTasksPreviewModal
                    isOpen={isHandlingPreviewOpen}
                    onClose={() => setIsHandlingPreviewOpen(false)}
                    tasks={handlingTasksForPreview}
                    onBack={() => { setIsHandlingPreviewOpen(false); setSpecialListFilter({ isOpen: true, type: 'handling' }); }}
                    onDownload={() => handleDownloadFilteredHandling(handlingTasksForPreview)}
                />

                <PermitTasksPreviewModal
                    isOpen={isPermitPreviewOpen}
                    onClose={() => setIsPermitPreviewOpen(false)}
                    tasks={permitTasksForPreview}
                    onBack={() => { setIsPermitPreviewOpen(false); if (permitTypeForPreview) setSpecialListFilter({ isOpen: true, type: permitTypeForPreview }); }}
                    onDownload={() => {
                        if (permitTypeForPreview === 'pth') return handleDownloadFilteredPermit(permitTasksForPreview, 'permisTravailHauteur', 'Permis Travail Hauteur', 'Permis Travail Hauteur', 'Avec Permis', 'Sans Permis', [220, 38, 38]);
                        if (permitTypeForPreview === 'pf') return handleDownloadFilteredPermit(permitTasksForPreview, 'permisFeu', 'Permis Feu', 'Permis Feu', 'Avec Permis', 'Sans Permis', [234, 88, 12]);
                        if (permitTypeForPreview === 'pp') return handleDownloadFilteredPermit(permitTasksForPreview, 'permisPenetration', 'Permis Pénétration', 'Permis Pénétration', 'Avec Permis', 'Sans Permis', [147, 51, 234]);
                        if (permitTypeForPreview === 'pl') return handleDownloadFilteredPermit(permitTasksForPreview, 'permisLevage', 'Permis Levage', 'Permis Levage', 'Avec Permis', 'Sans Permis', [37, 99, 235]);
                        return handleDownloadFilteredPermit(permitTasksForPreview, 'permisExcavation', 'Permis Excavation', 'Permis Excavation', 'Avec Permis', 'Sans Permis', [180, 83, 9]);
                    }}
                    title={
                        permitTypeForPreview === 'pth' ? 'Liste Permis Travail Hauteur' :
                            permitTypeForPreview === 'pf' ? 'Liste Permis Feu' :
                                permitTypeForPreview === 'pp' ? 'Liste Permis Pénétration' :
                                    permitTypeForPreview === 'pl' ? 'Liste Permis Levage' :
                                        'Liste Permis Excavation'
                    }
                    iconColorClass={
                        permitTypeForPreview === 'pth' ? 'text-red-400' :
                            permitTypeForPreview === 'pf' ? 'text-orange-400' :
                                permitTypeForPreview === 'pp' ? 'text-purple-400' :
                                    permitTypeForPreview === 'pl' ? 'text-blue-400' :
                                        'text-amber-500'
                    }
                    buttonColorClass={
                        permitTypeForPreview === 'pth' ? 'bg-red-500 shadow-lg shadow-red-500/20' :
                            permitTypeForPreview === 'pf' ? 'bg-orange-500 shadow-lg shadow-orange-500/20' :
                                permitTypeForPreview === 'pp' ? 'bg-purple-500 shadow-lg shadow-purple-500/20' :
                                    permitTypeForPreview === 'pl' ? 'bg-blue-500 shadow-lg shadow-blue-500/20' :
                                        'bg-amber-500 shadow-lg shadow-amber-500/20'
                    }
                    buttonHoverColorClass={
                        permitTypeForPreview === 'pth' ? 'hover:bg-red-600' :
                            permitTypeForPreview === 'pf' ? 'hover:bg-orange-600' :
                                permitTypeForPreview === 'pp' ? 'hover:bg-purple-600' :
                                    permitTypeForPreview === 'pl' ? 'hover:bg-blue-600' :
                                        'hover:bg-amber-600'
                    }
                />

                <ShiftWorkListModal
                    isOpen={isShiftWorkModalOpen}
                    onClose={() => setIsShiftWorkModalOpen(false)}
                    tasks={shiftWorkTasksForPreview}
                    onBack={() => {
                        setIsShiftWorkModalOpen(false);
                        setSpecialListFilter({ isOpen: true, type: 'shiftWork' });
                    }}
                    parameters={parameters}
                />
                <PlanningExportModal
                    isOpen={isPlanningExportModalOpen}
                    onClose={() => setIsPlanningExportModalOpen(false)}
                    results={results}
                    parameters={parameters}
                    specialTasks={specialTasksToDisplay}
                    title={planningExportTitle}
                    setTitle={setPlanningExportTitle}
                    familyOrder={familyOrder}
                    setFamilyOrder={setFamilyOrder}
                />
                <GanttSettingsModal isOpen={isGanttSettingsModalOpen} onClose={() => setIsGanttSettingsModalOpen(false)} mode={ganttSettingsMode}
                    onExport={async (title, order, options, exportConfig, contentFilters) => {
                        switch (exportConfig.mode) {
                            case 'global':
                            case 'range': {
                                const doc = await exportGanttByFamilyPDF(results, parameters, title, order, options, exportConfig.range, contentFilters, specialTasksToDisplay);
                                doc.save(`${title}.pdf`);
                                break;
                            }
                            case 'batch': {
                                if (typeof JSZip === 'undefined') {
                                    alert("La librairie de compression (JSZip) n'a pas pu être chargée.");
                                    return;
                                }

                                const { cycleStartTime, ignoreEmptyDays } = exportConfig.batch!;
                                const [cycleH, cycleM] = cycleStartTime.split(':').map(Number);
                                let cursor = new Date(parameters.shutdownStart);
                                cursor.setHours(cycleH, cycleM, 0, 0);
                                if (cursor.getTime() > new Date(parameters.shutdownStart).getTime()) {
                                    cursor.setDate(cursor.getDate() - 1);
                                }
                                const endTs = new Date(parameters.shutdownEnd).getTime();

                                const batchQueue: { title: string, filter: { start: Date, end: Date } }[] = [];

                                while (cursor.getTime() < endTs) {
                                    const shiftStart = new Date(cursor);
                                    const shiftEnd = new Date(cursor);
                                    shiftEnd.setDate(shiftEnd.getDate() + 1);

                                    const hasTasks = results.scheduledTasks.some(t =>
                                        t.startTime.getTime() < shiftEnd.getTime() && t.endTime.getTime() > shiftStart.getTime()
                                    );

                                    if (hasTasks || !ignoreEmptyDays) {
                                        const dateStr = shiftStart.toLocaleDateString('fr-CA'); // YYYY-MM-DD
                                        batchQueue.push({
                                            title: `${title} - ${dateStr}`,
                                            filter: { start: shiftStart, end: shiftEnd }
                                        });
                                    }
                                    cursor.setDate(cursor.getDate() + 1);
                                }

                                if (batchQueue.length === 0) {
                                    alert("Aucun fichier à générer avec les paramètres actuels.");
                                    return;
                                }

                                const zip = new JSZip();
                                for (const item of batchQueue) {
                                    const doc = await exportGanttByFamilyPDF(results, parameters, item.title, order, options, item.filter, contentFilters, specialTasksToDisplay);
                                    const pdfBlob = doc.output('blob');
                                    zip.file(`${item.title.replace(/[^a-z0-9]/gi, '_')}.pdf`, pdfBlob);
                                }

                                const zipBlob = await zip.generateAsync({ type: "blob" });
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(zipBlob);
                                const zipFileName = `${title.replace(/[^a-z0-9]/gi, '_')}_Batch.zip`;
                                link.download = zipFileName;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(link.href);
                                break;
                            }
                        }
                    }}
                    onShare={async (title, order, options, exportConfig, contentFilters) => {
                        if (!navigator.share) return;
                        if (exportConfig.mode === 'batch') {
                            alert("Le partage n'est pas supporté pour le mode Batch.");
                            return;
                        }
                        const doc = await exportGanttByFamilyPDF(results, parameters, title, order, options, exportConfig.range, contentFilters, specialTasksToDisplay);
                        const file = new File([doc.output('blob')], `${title}.pdf`, { type: 'application/pdf' });
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            await navigator.share({ files: [file], title: title });
                        } else {
                            alert("Partage de fichier non supporté.");
                        }
                    }}
                    onView={(order) => { setIsGanttSettingsModalOpen(false); setIsProfGanttOpen(true); setFamilyOrder(order); }}
                    title={ganttTitle} setTitle={setGanttTitle} familyOrder={familyOrder} setFamilyOrder={setFamilyOrder} parameters={parameters}
                    results={results}
                />
                <TeamGanttExportModal
                    isOpen={isTeamGanttExportModalOpen}
                    onClose={() => setIsTeamGanttExportModalOpen(false)}
                    onExport={async (title, order, options, filter) => {
                        const doc = await exportGanttByTeamPDF(results, parameters, title, order, options, filter);
                        doc.save(`${title}.pdf`);
                    }}
                    onShare={async (title, order, options, filter) => {
                        if (!navigator.share) return;
                        const doc = await exportGanttByTeamPDF(results, parameters, title, order, options, filter);
                        const file = new File([doc.output('blob')], `${title}.pdf`, { type: 'application/pdf' });
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            await navigator.share({ files: [file], title: title });
                        } else {
                            alert("Partage de fichier non supporté.");
                        }
                    }}
                    title={teamGanttExportTitle} setTitle={setTeamGanttExportTitle} teamOrder={teamOrder} setTeamOrder={setTeamOrder} parameters={parameters}
                    results={results}
                />
                {isProfGanttOpen && <ProfessionalGanttModal isOpen={isProfGanttOpen} onClose={() => setIsProfGanttOpen(false)} results={results} parameters={parameters} familyOrder={familyOrder} setFamilyOrder={setFamilyOrder} isColdStopFlow={isColdStopFlow} customCriticalPaths={customCriticalPaths} setCustomCriticalPaths={setCustomCriticalPaths} />}

                <SpecialListFilterModal
                    isOpen={specialListFilter.isOpen}
                    onClose={() => setSpecialListFilter({ isOpen: false, type: null })}
                    initialRange={specialListDateRange}
                    listType={specialListFilter.type}
                    allTasks={results.scheduledTasks}
                    onApply={(range, newDateRange, customTitle, selectedColumns) => {
                        setSpecialListDateRange(newDateRange);
                        setSpecialListCustomTitle(customTitle);
                        setSpecialListSelectedColumns(selectedColumns);
                        const type = specialListFilter.type;

                        if (type === 'highRisk') {
                            const filtered = range ? highRiskTasks.filter(t => t.startTime < range.end && t.endTime > range.start) : highRiskTasks;
                            setHighRiskTasksForPreview(filtered);
                            setIsHighRiskPreviewOpen(true);
                        } else if (type === 'preparations') {
                            const filtered = range ? preparationsTasks.filter(t => t.startTime < range.end && t.endTime > range.start) : preparationsTasks;
                            setPreparationsTasksForPreview(filtered);
                            setIsScheduledPreparationsModalOpen(true);
                        } else if (type === 'shiftWork') {
                            const filtered = range ? results.scheduledTasks.filter(t => t.startTime < range.end && t.endTime > range.start) : results.scheduledTasks;
                            setShiftWorkTasksForPreview(filtered);
                            setIsShiftWorkModalOpen(true);
                        } else if (type === 'scaffolding') {
                            const filtered = range ? scaffoldingTasks.filter(t => t.startTime < range.end && t.endTime > range.start) : scaffoldingTasks;
                            setScaffoldingTasksForPreview(filtered);
                            setIsScaffoldingPreviewOpen(true);
                        } else if (type === 'handling') {
                            const filtered = range ? handlingTasks.filter(t => t.startTime < range.end && t.endTime > range.start) : handlingTasks;
                            setHandlingTasksForPreview(filtered);
                            setIsHandlingPreviewOpen(true);
                        } else if (type === 'pth') {
                            const filtered = range ? pthTasks.filter(t => t.startTime < range.end && t.endTime > range.start) : pthTasks;
                            setPermitTasksForPreview(filtered);
                            setPermitTypeForPreview('pth');
                            setIsPermitPreviewOpen(true);
                        } else if (type === 'pf') {
                            const filtered = range ? pfTasks.filter(t => t.startTime < range.end && t.endTime > range.start) : pfTasks;
                            setPermitTasksForPreview(filtered);
                            setPermitTypeForPreview('pf');
                            setIsPermitPreviewOpen(true);
                        } else if (type === 'pp') {
                            const filtered = range ? ppTasks.filter(t => t.startTime < range.end && t.endTime > range.start) : ppTasks;
                            setPermitTasksForPreview(filtered);
                            setPermitTypeForPreview('pp');
                            setIsPermitPreviewOpen(true);
                        } else if (type === 'pl') {
                            const filtered = range ? plTasks.filter(t => t.startTime < range.end && t.endTime > range.start) : plTasks;
                            setPermitTasksForPreview(filtered);
                            setPermitTypeForPreview('pl');
                            setIsPermitPreviewOpen(true);
                        } else if (type === 'pe') {
                            const filtered = range ? peTasks.filter(t => t.startTime < range.end && t.endTime > range.start) : peTasks;
                            setPermitTasksForPreview(filtered);
                            setPermitTypeForPreview('pe');
                            setIsPermitPreviewOpen(true);
                        } else if (type === 'thr') {
                            const filtered = range ? thrTasks.filter(t => t.startTime < range.end && t.endTime > range.start) : thrTasks;
                            setHighRiskTasksForPreview(filtered);
                            setIsHighRiskPreviewOpen(true);
                        } else if (type === 'simops') {
                            const filtered = range ? simopsTasks.filter(t => t.startTime < range.end && t.endTime > range.start) : simopsTasks;
                            setSimopsTasksForPreview(filtered);
                            setIsSimopsPreviewOpen(true);
                        }
                        // Close filter modal
                        setSpecialListFilter({ isOpen: false, type: null });
                    }}

                    title={`Filtrer la ${specialListFilter.type === 'highRisk' ? 'Liste des Tâches à Haut Risque'
                        : specialListFilter.type === 'thr' ? 'Liste THR (Travaux à Haut Risque)'
                            : specialListFilter.type === 'simops' ? 'Rapport SIMOPS'
                                : specialListFilter.type === 'preparations' ? 'Liste des Préparatifs'
                                    : specialListFilter.type === 'scaffolding' ? 'Liste des Travaux Échafaudage'
                                        : specialListFilter.type === 'handling' ? 'Liste des Travaux Manutention'
                                            : specialListFilter.type === 'pth' ? 'Liste Permis Travail Hauteur'
                                                : specialListFilter.type === 'pf' ? 'Liste Permis Feu'
                                                    : specialListFilter.type === 'pp' ? 'Liste Permis Pénétration'
                                                        : specialListFilter.type === 'pl' ? 'Liste Permis Levage'
                                                            : specialListFilter.type === 'pe' ? 'Liste Permis Excavation'
                                                                : 'Liste des Tâches par Quart'
                        }`}
                    tasks={
                        specialListFilter.type === 'highRisk' ? highRiskTasks
                            : specialListFilter.type === 'thr' ? thrTasks
                                : specialListFilter.type === 'simops' ? simopsTasks
                                    : specialListFilter.type === 'preparations' ? preparationsTasks
                                        : specialListFilter.type === 'scaffolding' ? scaffoldingTasks
                                            : specialListFilter.type === 'handling' ? handlingTasks
                                                : specialListFilter.type === 'pth' ? pthTasks
                                                    : specialListFilter.type === 'pf' ? pfTasks
                                                        : specialListFilter.type === 'pp' ? ppTasks
                                                            : specialListFilter.type === 'pl' ? plTasks
                                                                : specialListFilter.type === 'pe' ? peTasks
                                                                    : results.scheduledTasks
                    }
                    onDownloadFiltered={async (filteredTasks, newDateRange, customTitle, selectedColumns) => {
                        setSpecialListDateRange(newDateRange);
                        if (specialListFilter.type === 'highRisk') {
                            await handleDownloadFilteredHighRisk(filteredTasks, customTitle, selectedColumns);
                        } else if (specialListFilter.type === 'preparations') {
                            await handleDownloadFilteredPreparations(filteredTasks, customTitle, selectedColumns);
                        } else if (specialListFilter.type === 'shiftWork') {
                            await handleDownloadFilteredShiftWork(filteredTasks, { start: new Date(newDateRange.start), end: new Date(newDateRange.end) }, customTitle);
                        } else if (specialListFilter.type === 'scaffolding') {
                            await handleDownloadFilteredScaffolding(filteredTasks, customTitle, selectedColumns);
                        } else if (specialListFilter.type === 'handling') {
                            await handleDownloadFilteredHandling(filteredTasks, customTitle, selectedColumns);
                        } else if (specialListFilter.type === 'pth') {
                            await handleDownloadFilteredPermit(filteredTasks, 'permisTravailHauteur', customTitle, 'Permis Travail Hauteur', 'Avec Permis', 'Sans Permis', [220, 38, 38], selectedColumns);
                        } else if (specialListFilter.type === 'pf') {
                            await handleDownloadFilteredPermit(filteredTasks, 'permisFeu', customTitle, 'Permis Feu', 'Avec Permis', 'Sans Permis', [234, 88, 12], selectedColumns);
                        } else if (specialListFilter.type === 'pp') {
                            await handleDownloadFilteredPermit(filteredTasks, 'permisPenetration', customTitle, 'Permis Pénétration', 'Avec Permis', 'Sans Permis', [147, 51, 234], selectedColumns);
                        } else if (specialListFilter.type === 'pl') {
                            await handleDownloadFilteredPermit(filteredTasks, 'permisLevage', customTitle, 'Permis Levage', 'Avec Permis', 'Sans Permis', [37, 99, 235], selectedColumns);
                        } else if (specialListFilter.type === 'pe') {
                            await handleDownloadFilteredPermit(filteredTasks, 'permisExcavation', customTitle, 'Permis Excavation', 'Avec Permis', 'Sans Permis', [180, 83, 9], selectedColumns);
                        } else if (specialListFilter.type === 'thr') {
                            await handleDownloadFilteredHighRisk(filteredTasks, customTitle || 'LISTE THR', selectedColumns);
                        } else if (specialListFilter.type === 'simops') {
                            await handleDownloadFilteredHighRisk(filteredTasks, customTitle || 'RAPPORT SIMOPS', selectedColumns);
                        }
                    }}
                    onDownloadXLSX={(filteredTasks, newDateRange) => {
                        setSpecialListDateRange(newDateRange);
                        const type = specialListFilter.type!;
                        const fileName = specialListFilter.type === 'highRisk' ? 'Taches_Haut_Risque'
                            : specialListFilter.type === 'thr' ? 'Rapport_THR'
                                : specialListFilter.type === 'simops' ? 'Rapport_SIMOPS'
                                    : specialListFilter.type === 'preparations' ? 'Liste_Preparatifs'
                                        : specialListFilter.type === 'scaffolding' ? 'Travaux_Echafaudage'
                                            : specialListFilter.type === 'handling' ? 'Travaux_Manutention'
                                                : specialListFilter.type === 'pth' ? 'Permis_Travail_Hauteur'
                                                    : specialListFilter.type === 'pf' ? 'Permis_Feu'
                                                        : specialListFilter.type === 'pp' ? 'Permis_Penetration'
                                                            : specialListFilter.type === 'pl' ? 'Permis_Levage'
                                                                : specialListFilter.type === 'pe' ? 'Permis_Excavation'
                                                                    : 'Taches_Par_Quart';
                        exportToXLSX(filteredTasks, `${fileName}_${newDateRange.start.split('T')[0]}`, type);
                    }}
                    parameters={parameters}
                />

                {/* Back button moved to top nav (Layout.tsx) */}
            </div>

        </div>
    );
};

export default React.memo(ResultsDashboard);
