import React, { useMemo, useState } from 'react';
import {
    ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2,
    Info, ChevronDown, ChevronUp, Activity, Link2,
    Clock, Anchor, TrendingUp, Network, ArrowLeft,
    RefreshCw, Zap, Target, ArrowRight, CircleDot,
} from 'lucide-react';
import type { SchedulingTaskData } from '../types';

interface ScheduleHealthPageProps {
    tasks: SchedulingTaskData[];
    onBack: () => void;
}

/* ─── constants ─────────────────────────────────────────────── */
const HIGH_FLOAT_THRESHOLD_H = 44 * 8;
const TIME_TOLERANCE_MS = 2 * 60 * 1000;

type Sev = 'critical' | 'warning' | 'good';

interface CheckResult {
    id: string;
    label: string;
    subtitle: string;
    score: number;
    severity: Sev;
    issues: { id: number; name: string; detail: string }[];
    tip: string;
    action: string; // concrete "do this" instruction
    icon: React.ReactNode;
    dcmaPoint: string;
    threshold: string;
    colorVar: string; // css color value
}

/* ─── palette helpers ───────────────────────────────────────── */
const sevColor = (s: Sev) =>
    s === 'good' ? '#10b981' : s === 'warning' ? '#f59e0b' : '#ef4444';

const sevGlow = (s: Sev) =>
    s === 'good'
        ? '0 0 40px rgba(16,185,129,0.25)'
        : s === 'warning'
            ? '0 0 40px rgba(245,158,11,0.25)'
            : '0 0 40px rgba(239,68,68,0.35)';

const sevLabel = (s: Sev) =>
    s === 'good' ? 'Sain' : s === 'warning' ? 'Attention' : 'Critique';

/* ─── Animated Score Arc ─────────────────────────────────────── */
const ScoreArc: React.FC<{ score: number; size: number; stroke: number; color: string }> = ({
    score, size, stroke, color,
}) => {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (score / 100) * circ;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
            <circle cx={size / 2} cy={size / 2} r={r} fill="none"
                stroke={color} strokeWidth={stroke}
                strokeDasharray={circ} strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }} />
            {/* Inner glow circle */}
            <circle cx={size / 2} cy={size / 2} r={r - stroke / 2 - 4} fill="none"
                stroke={color} strokeWidth={1} opacity={0.15} />
        </svg>
    );
};

/* ─── Mini Meter bar ─────────────────────────────────────────── */
const MiniMeter: React.FC<{ score: number; color: string }> = ({ score, color }) => (
    <div className="relative h-2 bg-white/[0.06] rounded-full overflow-hidden w-full">
        <div
            className="absolute left-0 top-0 h-full rounded-full transition-all duration-1000"
            style={{ width: `${score}%`, background: color }} />
    </div>
);

/* ─── Check Card ─────────────────────────────────────────────── */
const CheckCard: React.FC<{ check: CheckResult; rank: number }> = ({ check, rank }) => {
    const [open, setOpen] = useState(false);
    const color = check.colorVar;
    const isBad = check.severity !== 'good';

    return (
        <div
            className="rounded-3xl overflow-hidden transition-all duration-500 group cursor-pointer"
            style={{
                background: '#0c0c0e',
                border: `1px solid ${isBad ? color + '30' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: isBad ? sevGlow(check.severity) : 'none',
            }}
            onClick={() => check.issues.length > 0 && setOpen(o => !o)}
        >
            {/* Top accent line */}
            <div className="h-1 w-full" style={{ background: isBad ? `linear-gradient(90deg, ${color}60, ${color}20, transparent)` : 'rgba(255,255,255,0.04)' }} />

            <div className="p-7">
                {/* Header row */}
                <div className="flex items-start gap-5">
                    {/* Score arc */}
                    <div className="relative shrink-0 w-20 h-20 flex items-center justify-center">
                        <ScoreArc score={check.score} size={80} stroke={7} color={color} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xl font-black text-white leading-none">{check.score}</span>
                            <span className="text-[8px] font-bold text-slate-500">/100</span>
                        </div>
                    </div>

                    {/* Labels */}
                    <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[8px] font-black uppercase tracking-[0.3em] px-2.5 py-1 rounded-full border"
                                style={{
                                    color,
                                    background: color + '15',
                                    borderColor: color + '35',
                                }}>
                                {sevLabel(check.severity)}
                            </span>
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.25em]">{check.dcmaPoint}</span>
                        </div>
                        <h3 className="text-base font-black text-white uppercase tracking-tight leading-tight">{check.label}</h3>
                        <p className="text-xs text-slate-500 mt-1 font-medium">{check.subtitle}</p>
                    </div>

                    {/* Icon + toggle */}
                    <div className="shrink-0 flex flex-col items-end gap-3">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                            style={{ background: color + '15', border: `1px solid ${color}25` }}>
                            {check.icon}
                        </div>
                        {check.issues.length > 0 && (
                            <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-white transition-colors">
                                <span className="text-[10px] font-black" style={{ color }}>{check.issues.length}</span>
                                <span className="text-[9px] text-slate-500">issue{check.issues.length > 1 ? 's' : ''}</span>
                                {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </div>
                        )}
                        {check.issues.length === 0 && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        )}
                    </div>
                </div>

                {/* Progress bar */}
                <div className="mt-5">
                    <MiniMeter score={check.score} color={color} />
                </div>

                {/* Action box (always visible if bad) */}
                {isBad && (
                    <div className="mt-5 flex items-start gap-3 p-4 rounded-2xl"
                        style={{ background: color + '09', border: `1px solid ${color}20` }}>
                        <Zap className="w-4 h-4 shrink-0 mt-0.5" style={{ color }} />
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest mb-0.5" style={{ color }}>
                                Action requise
                            </p>
                            <p className="text-xs text-slate-300 leading-relaxed font-medium">{check.action}</p>
                        </div>
                    </div>
                )}

                {/* Tip (always shown if healthy) */}
                {!isBad && (
                    <div className="mt-5 flex items-start gap-2 p-3 rounded-xl bg-white/[0.025] border border-white/[0.04]">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-500" />
                        <p className="text-[10px] text-slate-400 leading-relaxed">{check.tip}</p>
                    </div>
                )}
            </div>

            {/* Expanded issue list */}
            {open && check.issues.length > 0 && (
                <div style={{ borderTop: `1px solid ${color}20` }}>
                    <div className="px-7 py-4 flex items-center justify-between"
                        style={{ background: color + '07' }}>
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color }}>
                            Tâches affectées — {check.issues.length} résultats
                        </span>
                        <span className="text-[8px] text-slate-600">Cliquer pour masquer</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {check.issues.map((iss, i) => (
                            <div key={iss.id}
                                className="flex items-center gap-4 px-7 py-3.5 border-b transition-colors hover:bg-white/[0.025]"
                                style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                <span className="text-[9px] font-black text-slate-600 w-6 shrink-0">#{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-white uppercase truncate">{iss.name}</p>
                                    <p className="text-[9px] text-slate-500 mt-0.5">{iss.detail}</p>
                                </div>
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─── MAIN PAGE ──────────────────────────────────────────────── */
const ScheduleHealthPage: React.FC<ScheduleHealthPageProps> = ({ tasks, onBack }) => {
    const [animKey, setAnimKey] = useState(0);
    const [activeIssueFilter, setActiveIssueFilter] = useState<'all' | 'critical' | 'warning' | 'good'>('all');

    const checks = useMemo((): CheckResult[] => {
        const total = tasks.length;
        if (total === 0) return [];

        /* ── implicit time-chain detection ── */
        const endTimeById = new Map<number, number>();
        const tasksByStartMinute = new Map<number, number[]>();

        tasks.forEach(t => {
            if (t['END DATE']) endTimeById.set(t.id, new Date(t['END DATE']).getTime());
            if (t['START DATE']) {
                const bucket = Math.round(new Date(t['START DATE']).getTime() / 60000) * 60000;
                if (!tasksByStartMinute.has(bucket)) tasksByStartMinute.set(bucket, []);
                tasksByStartMinute.get(bucket)!.push(t.id);
            }
        });

        const hasImplicitSuccessor = new Set<number>();
        const hasImplicitPredecessor = new Set<number>();

        tasks.forEach(t => {
            const endMs = endTimeById.get(t.id);
            if (endMs === undefined) return;
            for (let delta = -TIME_TOLERANCE_MS; delta <= TIME_TOLERANCE_MS; delta += 60000) {
                const bucket = Math.round((endMs + delta) / 60000) * 60000;
                (tasksByStartMinute.get(bucket) ?? []).forEach(otherId => {
                    if (otherId === t.id) return;
                    const other = tasks.find(x => x.id === otherId);
                    if (!other?.['START DATE']) return;
                    const otherStart = new Date(other['START DATE']).getTime();
                    if (Math.abs(otherStart - endMs) <= TIME_TOLERANCE_MS) {
                        hasImplicitSuccessor.add(t.id);
                        hasImplicitPredecessor.add(otherId);
                    }
                });
            }
        });

        /* ── 1. Missing Predecessors ── */
        const noPred = tasks.filter(t =>
            (!t.predecessor || (Array.isArray(t.predecessor) && t.predecessor.length === 0)) &&
            !hasImplicitPredecessor.has(t.id)
        );
        const noPredPct = Math.round(((total - noPred.length) / total) * 100);

        /* ── 2. Missing Successors ── */
        const taskIds = new Set(tasks.map(t => t.id));
        const hasSuc = new Set<number>();
        tasks.forEach(t => {
            if (Array.isArray(t.predecessor)) {
                t.predecessor.forEach(pid => { if (taskIds.has(pid)) hasSuc.add(pid); });
            }
        });
        const noSuc = tasks.filter(t => !hasSuc.has(t.id) && !hasImplicitSuccessor.has(t.id));
        const noSucPct = Math.round(((total - noSuc.length) / total) * 100);

        /* ── 3. Unscheduled ── */
        const noDates = tasks.filter(t => !t['START DATE'] || !t['END DATE']);
        const noDatesPct = Math.round(((total - noDates.length) / total) * 100);

        /* ── 4. High Float ── */
        const highFloat = tasks.filter(t => (t.DUREE || 0) * (t['MAX HOUR'] || 8) > HIGH_FLOAT_THRESHOLD_H);
        const highFloatPct = Math.round(((total - highFloat.length) / total) * 100);

        /* ── 5. Hard Constraints ── */
        const hardConstr = tasks.filter(t =>
            t['START DATE'] !== null &&
            (!t.predecessor || (Array.isArray(t.predecessor) && t.predecessor.length === 0)) &&
            !hasImplicitPredecessor.has(t.id)
        );
        const hardConstrPct = Math.round(((total - hardConstr.length) / total) * 100);

        /* ── 6. Zero Duration ── */
        const zeroDur = tasks.filter(t => !t.DUREE || t.DUREE <= 0);
        const zeroDurPct = Math.round(((total - zeroDur.length) / total) * 100);

        const makeSev = (s: number): Sev => s >= 85 ? 'good' : s >= 60 ? 'warning' : 'critical';

        return [
            {
                id: 'pred', dcmaPoint: 'DCMA #1',
                label: 'Prédécesseurs Manquants',
                subtitle: 'Tâches sans lien entrant — Dangling Start',
                score: noPredPct, severity: makeSev(noPredPct),
                colorVar: sevColor(makeSev(noPredPct)),
                issues: noPred.map(t => ({
                    id: t.id, name: t['GLOBAL TASKS'],
                    detail: `${t.DISCIPLINE || 'N/A'} · ${(t.DUREE || 0).toFixed(1)} j · Sans lien logique entrant ni contigu temporel`,
                })),
                tip: 'Cette tâche est correctement ancrée logiquement dans le planning.',
                action: 'Ouvrir chaque tâche listée ci-dessous → ajouter un prédécesseur via "Dépendances". Utiliser des liens Fin→Début (FS) pour garantir la propagation automatique des retards.',
                icon: <Link2 className="w-4 h-4" style={{ color: sevColor(makeSev(noPredPct)) }} />,
                threshold: '< 5% de tâches sans lien entrant',
            },
            {
                id: 'suc', dcmaPoint: 'DCMA #2',
                label: 'Successeurs Manquants',
                subtitle: 'Tâches sans lien sortant — Dangling Finish',
                score: noSucPct, severity: makeSev(noSucPct),
                colorVar: sevColor(makeSev(noSucPct)),
                issues: noSuc.map(t => ({
                    id: t.id, name: t['GLOBAL TASKS'],
                    detail: `${t.DISCIPLINE || 'N/A'} · Ne déclenche aucune tâche · Retard invisible`,
                })),
                tip: 'Toutes les tâches sont liées à un successeur logique ou temporel.',
                action: 'Pour chaque tâche listée, assigner une tâche suivante via "Dépendances". Sans successeur, un retard ne se propage pas — il devient une surprise de dernière minute.',
                icon: <Network className="w-4 h-4" style={{ color: sevColor(makeSev(noSucPct)) }} />,
                threshold: '< 5% de tâches sans lien sortant',
            },
            {
                id: 'sched', dcmaPoint: 'DCMA #6',
                label: 'Tâches Non Ordonnancées',
                subtitle: 'Activités sans fenêtre temporelle calculée',
                score: noDatesPct, severity: makeSev(noDatesPct),
                colorVar: sevColor(makeSev(noDatesPct)),
                issues: noDates.map(t => ({
                    id: t.id, name: t['GLOBAL TASKS'],
                    detail: `${t.DISCIPLINE || 'N/A'} · Pas de date de début ni de fin`,
                })),
                tip: 'Toutes les tâches disposent d\'une fenêtre temporelle calculée.',
                action: 'Lancer le moteur d\'ordonnancement sur les tâches listées. Vérifier que les ressources et les contraintes de durée sont correctement saisies avant relance.',
                icon: <Clock className="w-4 h-4" style={{ color: sevColor(makeSev(noDatesPct)) }} />,
                threshold: '0% de tâches hors planning',
            },
            {
                id: 'float', dcmaPoint: 'DCMA #9',
                label: 'Marge Excessive (High Float)',
                subtitle: `Durée > ${Math.round(HIGH_FLOAT_THRESHOLD_H / 8)} j sans contrainte logique`,
                score: highFloatPct, severity: makeSev(highFloatPct),
                colorVar: sevColor(makeSev(highFloatPct)),
                issues: highFloat.map(t => ({
                    id: t.id, name: t['GLOBAL TASKS'],
                    detail: `Durée : ${t.DUREE} j · Tâche probablement sous-contrainte`,
                })),
                tip: 'Aucune tâche ne présente de marge excessive non justifiée.',
                action: 'Vérifier si ces tâches sont réellement longues ou mal découpées. Si découpables, créer des sous-tâches. Si justifiées, ajouter des jalons intermédiaires.',
                icon: <TrendingUp className="w-4 h-4" style={{ color: sevColor(makeSev(highFloatPct)) }} />,
                threshold: '< 5% avec durée > 44 jours',
            },
            {
                id: 'hard', dcmaPoint: 'DCMA #11',
                label: 'Contraintes Fixes sans Logique',
                subtitle: 'Date forcée manuellement sans lien amont',
                score: hardConstrPct, severity: makeSev(hardConstrPct),
                colorVar: sevColor(makeSev(hardConstrPct)),
                issues: hardConstr.map(t => ({
                    id: t.id, name: t['GLOBAL TASKS'],
                    detail: `Date imposée manuellement · ${t.DISCIPLINE || 'N/A'} · Sans amont logique`,
                })),
                tip: 'Aucune contrainte forcée non justifiée détectée dans le planning.',
                action: 'Supprimer la date fixe "Must Start On" et la remplacer par un lien Fin→Début depuis la tâche amont réelle. Cela rend le planning dynamique et self-correcting.',
                icon: <Anchor className="w-4 h-4" style={{ color: sevColor(makeSev(hardConstrPct)) }} />,
                threshold: '< 5% de contraintes manuelles',
            },
            {
                id: 'zero', dcmaPoint: 'DCMA #4',
                label: 'Tâches à Durée Zéro',
                subtitle: 'Activités sans durée (jalons non déclarés)',
                score: zeroDurPct, severity: makeSev(zeroDurPct),
                colorVar: sevColor(makeSev(zeroDurPct)),
                issues: zeroDur.map(t => ({
                    id: t.id, name: t['GLOBAL TASKS'],
                    detail: `DUREE = 0 · H-H : ${t['Heures-Homme'] || 0} · ${t.DISCIPLINE || 'N/A'}`,
                })),
                tip: 'Toutes les tâches ont une durée positive valide.',
                action: 'Si c\'est une vraie tâche, saisir la durée réelle. Si c\'est un jalon (date-clé sans travail), le déclarer explicitement comme tel dans le type de tâche.',
                icon: <Activity className="w-4 h-4" style={{ color: sevColor(makeSev(zeroDurPct)) }} />,
                threshold: '0% de durées nulles (hors jalons)',
            },
        ];
    }, [tasks, animKey]);

    const overallScore = useMemo(() =>
        checks.length === 0 ? 0 : Math.round(checks.reduce((s, c) => s + c.score, 0) / checks.length),
        [checks]);

    const overallSev: Sev = overallScore >= 85 ? 'good' : overallScore >= 60 ? 'warning' : 'critical';
    const overallColor = sevColor(overallSev);

    const criticalChecks = checks.filter(c => c.severity === 'critical');
    const warningChecks = checks.filter(c => c.severity === 'warning');
    const goodChecks = checks.filter(c => c.severity === 'good');
    const totalIssues = checks.reduce((s, c) => s + c.issues.length, 0);

    const filteredChecks = activeIssueFilter === 'all' ? checks
        : checks.filter(c => c.severity === activeIssueFilter);

    const overallLabel =
        overallSev === 'good' ? 'Planning Sain' :
            overallSev === 'warning' ? 'À Optimiser' : 'Planning Fragile';

    return (
        <div className="min-h-screen bg-[#060608] text-white font-sans">
            <style>{`
                @keyframes hcFadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
                @keyframes hcGlow { 0%,100%{opacity:0.6} 50%{opacity:1} }
                .hc-up { animation: hcFadeUp 0.5s ease forwards; }
                .hc-u1{animation-delay:.05s;opacity:0}.hc-u2{animation-delay:.1s;opacity:0}
                .hc-u3{animation-delay:.15s;opacity:0}.hc-u4{animation-delay:.2s;opacity:0}
                .hc-u5{animation-delay:.25s;opacity:0}.hc-u6{animation-delay:.3s;opacity:0}
                .hc-pulse{animation:hcGlow 2s ease-in-out infinite}
            `}</style>

            {/* ══ STICKY HEADER ══ */}
            <div className="sticky top-0 z-40 border-b" style={{
                background: 'rgba(6,6,8,0.92)',
                backdropFilter: 'blur(24px)',
                borderColor: `${overallColor}25`,
            }}>
                <div className="max-w-[1400px] mx-auto px-8 py-4 flex items-center gap-5">
                    <button onClick={onBack}
                        className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <ArrowLeft className="w-4 h-4 text-slate-400" />
                    </button>

                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                        style={{ background: overallColor + '18', border: `1px solid ${overallColor}40` }}>
                        <ShieldCheck className="w-5 h-5" style={{ color: overallColor }} />
                    </div>

                    <div>
                        <p className="text-[8px] font-black uppercase tracking-[0.45em]" style={{ color: overallColor }}>
                            Schedule Audit · DCMA Standard
                        </p>
                        <h1 className="text-lg font-black text-white tracking-tighter uppercase italic -mt-0.5">
                            Health Check
                        </h1>
                    </div>

                    <div className="ml-auto flex items-center gap-3">
                        {/* Live pill */}
                        <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="w-1.5 h-1.5 rounded-full hc-pulse" style={{ background: overallColor }} />
                            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
                                {tasks.length} tâches · Score {overallScore}/100
                            </span>
                        </div>

                        <button onClick={() => setAnimKey(k => k + 1)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                            <RefreshCw className="w-3.5 h-3.5" />
                            Relancer
                        </button>

                        <button onClick={onBack}
                            className="px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                            style={{ background: overallColor, color: overallSev === 'good' ? '#000' : '#fff', border: `1px solid ${overallColor}80` }}>
                            Retour Planning
                        </button>
                    </div>
                </div>
            </div>

            <div key={animKey} className="max-w-[1400px] mx-auto px-8 py-10 space-y-10">

                {tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-48 text-center">
                        <ShieldAlert className="w-20 h-20 mb-6" style={{ color: 'rgba(255,255,255,0.1)' }} />
                        <p className="text-2xl font-black text-slate-600 uppercase tracking-widest">Aucune tâche à auditer</p>
                        <p className="text-slate-700 mt-2">Importez un planning pour lancer l'audit automatique.</p>
                    </div>
                ) : <>

                    {/* ══ HERO PANEL ══ */}
                    <div className="hc-up hc-u1 relative rounded-[2.5rem] overflow-hidden p-10"
                        style={{
                            background: `radial-gradient(ellipse at 20% 50%, ${overallColor}10 0%, transparent 55%), #0c0c0e`,
                            border: `1px solid ${overallColor}25`,
                            boxShadow: sevGlow(overallSev),
                        }}>

                        {/* Decorative bg arc */}
                        <div className="absolute right-0 top-0 w-96 h-96 opacity-5 pointer-events-none"
                            style={{ background: `radial-gradient(circle, ${overallColor}, transparent 70%)` }} />

                        <div className="relative flex flex-col lg:flex-row items-center gap-12">

                            {/* Score section */}
                            <div className="flex flex-col items-center gap-5 shrink-0">
                                <div className="relative">
                                    <ScoreArc score={overallScore} size={220} stroke={16} color={overallColor} />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-6xl font-black text-white tracking-tighter leading-none">{overallScore}</span>
                                        <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">/100</span>
                                    </div>
                                </div>
                                <div className="px-6 py-2.5 rounded-full text-sm font-black uppercase tracking-widest"
                                    style={{ background: overallColor + '20', border: `1px solid ${overallColor}45`, color: overallColor }}>
                                    {overallSev === 'good' ? '✓' : overallSev === 'warning' ? '⚠' : '✗'} {overallLabel}
                                </div>
                            </div>

                            {/* Summary content */}
                            <div className="flex-1 w-full">
                                <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight mb-3">
                                    Score Global<br />de Santé Planning
                                </h2>
                                <p className="text-base text-slate-400 mb-8 leading-relaxed max-w-xl">
                                    Audit automatique basé sur les standards internationaux de scheduling.
                                    {totalIssues > 0
                                        ? <> <span style={{ color: overallColor }} className="font-bold">{totalIssues} anomalie{totalIssues > 1 ? 's' : ''}</span> détectée{totalIssues > 1 ? 's' : ''} — consultez les correctifs ci-dessous.</>
                                        : <> <span className="text-emerald-400 font-bold">Aucune anomalie</span> — votre planning respecte les standards de qualité.</>
                                    }
                                </p>

                                {/* KPI row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                                    {[
                                        { label: 'Tâches', val: tasks.length, c: '#64748b' },
                                        { label: 'Critiques', val: criticalChecks.length, c: '#ef4444' },
                                        { label: 'Attention', val: warningChecks.length, c: '#f59e0b' },
                                        { label: 'Réussis', val: goodChecks.length, c: '#10b981' },
                                    ].map(m => (
                                        <div key={m.label} className="rounded-2xl p-5 text-center transition-all hover:scale-105"
                                            style={{ background: m.c + '0d', border: `1px solid ${m.c}25` }}>
                                            <p className="text-3xl font-black text-white mb-1">{m.val}</p>
                                            <p className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: m.c }}>{m.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Per-check bars */}
                                <div className="space-y-3">
                                    {checks.map(c => (
                                        <div key={c.id} className="flex items-center gap-4">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight w-52 shrink-0 truncate">{c.label}</span>
                                            <div className="flex-1">
                                                <MiniMeter score={c.score} color={c.colorVar} />
                                            </div>
                                            <span className="text-xs font-black w-9 text-right" style={{ color: c.colorVar }}>{c.score}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Issues badge */}
                            {totalIssues > 0 && (
                                <div className="shrink-0 flex flex-col items-center gap-3">
                                    <div className="relative w-32 h-32 flex items-center justify-center rounded-full"
                                        style={{
                                            background: totalIssues > 10 ? '#ef444412' : '#f59e0b12',
                                            border: `2px solid ${totalIssues > 10 ? '#ef444440' : '#f59e0b40'}`,
                                        }}>
                                        <div className="absolute inset-0 rounded-full hc-pulse"
                                            style={{ background: totalIssues > 10 ? '#ef444408' : '#f59e0b08' }} />
                                        <div className="text-center">
                                            <span className="text-4xl font-black text-white block">{totalIssues}</span>
                                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">anomalies</span>
                                        </div>
                                    </div>
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">
                                        À corriger<br />en priorité
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ══ FILTER TABS ══ */}
                    <div className="hc-up hc-u2 flex flex-wrap items-center gap-3">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mr-2">Filtrer :</span>
                        {([
                            { k: 'all', label: `Tous les checks (${checks.length})`, color: '#64748b' },
                            { k: 'critical', label: `Critiques (${criticalChecks.length})`, color: '#ef4444' },
                            { k: 'warning', label: `Attention (${warningChecks.length})`, color: '#f59e0b' },
                            { k: 'good', label: `Sains (${goodChecks.length})`, color: '#10b981' },
                        ] as const).map(tab => (
                            <button key={tab.k}
                                onClick={() => setActiveIssueFilter(tab.k)}
                                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                                style={{
                                    background: activeIssueFilter === tab.k ? tab.color + '20' : 'rgba(255,255,255,0.04)',
                                    border: `1px solid ${activeIssueFilter === tab.k ? tab.color + '50' : 'rgba(255,255,255,0.07)'}`,
                                    color: activeIssueFilter === tab.k ? tab.color : '#64748b',
                                }}>
                                {tab.label}
                            </button>
                        ))}

                        <div className="ml-auto flex items-center gap-2 text-[8px] font-black text-slate-700 uppercase tracking-widest">
                            <CircleDot className="w-3 h-3" />
                            DCMA 14-Point Schedule Assessment Standard
                        </div>
                    </div>

                    {/* ══ CHECK CARDS ══ */}
                    <div className="hc-up hc-u3 grid grid-cols-1 lg:grid-cols-2 gap-5">
                        {filteredChecks.map((c, i) => (
                            <div key={c.id}
                                className={`hc-up hc-u${Math.min(i + 3, 6)}`}
                                style={{ animationDelay: `${i * 0.06}s` }}>
                                <CheckCard check={c} rank={i + 1} />
                            </div>
                        ))}
                    </div>

                    {/* ══ ACTION PLAN ══ */}
                    {(criticalChecks.length > 0 || warningChecks.length > 0) && (
                        <div className="hc-up hc-u5 rounded-3xl p-8"
                            style={{ background: '#0c0c0e', border: '1px solid rgba(255,255,255,0.07)' }}>

                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                                    style={{ background: '#f59e0b12', border: '1px solid #f59e0b30' }}>
                                    <Target className="w-6 h-6 text-amber-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Plan d'Action Prioritaire</h3>
                                    <p className="text-xs text-slate-500">Étapes concrètes pour atteindre un score de 100/100</p>
                                </div>
                                <div className="ml-auto text-right">
                                    <p className="text-3xl font-black text-white">{criticalChecks.length + warningChecks.length}</p>
                                    <p className="text-[9px] text-slate-500 uppercase tracking-widest">correctifs requis</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {[...criticalChecks, ...warningChecks].map((c, i) => (
                                    <div key={c.id}
                                        className="flex items-start gap-5 p-5 rounded-2xl transition-all hover:scale-[1.01]"
                                        style={{ background: c.colorVar + '08', border: `1px solid ${c.colorVar}25` }}>
                                        {/* Step number */}
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-xl font-black"
                                            style={{ background: c.colorVar + '20', color: c.colorVar, border: `1px solid ${c.colorVar}40` }}>
                                            {i + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-black text-white uppercase tracking-tight">{c.label}</p>
                                                <span className="text-[8px] px-2 py-0.5 rounded-full font-black uppercase"
                                                    style={{ background: c.colorVar + '20', color: c.colorVar }}>
                                                    {c.issues.length} tâche{c.issues.length > 1 ? 's' : ''}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400 leading-relaxed">{c.action}</p>
                                        </div>
                                        <div className="shrink-0 flex flex-col items-end gap-2">
                                            <span className="text-2xl font-black" style={{ color: c.colorVar }}>{c.score}</span>
                                            <span className="text-[8px] text-slate-600">score actuel</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Progress toward 100 */}
                            <div className="mt-8 p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Progression vers le score parfait</span>
                                    <span className="text-xs font-black text-white">{overallScore}/100 → <span className="text-emerald-400">100/100</span></span>
                                </div>
                                <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <div className="absolute h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${overallScore}%`, background: `linear-gradient(90deg, ${overallColor}, ${overallColor}80)` }} />
                                    <div className="absolute right-0 h-full w-px" style={{ background: '#10b981' }} />
                                </div>
                                <div className="flex justify-between mt-2">
                                    <span className="text-[8px] text-slate-600">Score actuel</span>
                                    <span className="text-[8px] text-emerald-500 font-bold">Objectif : 100</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ══ ALL GREEN STATE ══ */}
                    {criticalChecks.length === 0 && warningChecks.length === 0 && (
                        <div className="hc-up hc-u5 rounded-3xl p-12 text-center"
                            style={{ background: '#10b98109', border: '1px solid #10b98125' }}>
                            <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Planning Exemplaire</h3>
                            <p className="text-slate-400">Tous les checks DCMA sont au vert. Votre planning respecte les standards de qualité industrielle.</p>
                        </div>
                    )}

                </>}
            </div>
        </div>
    );
};

export default ScheduleHealthPage;
