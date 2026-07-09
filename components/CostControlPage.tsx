import React, { useMemo, useState } from 'react';
import {
    Filter, Zap, Users, Layers, Settings, TrendingUp, Clock,
    ChevronRight, Briefcase, Target, Package,
    Truck, BookOpen, Search, Activity, RotateCcw, Eye, Tag, BarChart2
} from 'lucide-react';
import {
    ResponsiveContainer,
    PieChart as RechartsPie, Pie, Cell, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    ComposedChart, Line, Area,
} from 'recharts';
import type { SchedulingTaskData, CompanyCost, EvaluationData } from '../types';

interface CostControlPageProps { tasks: SchedulingTaskData[]; costData: CompanyCost[]; evaluationData?: EvaluationData | null; onBack: () => void; }

const PALETTE = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];
const fmt = (v: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(v);
const fmtK = (v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(Math.round(v));

// ─── Tooltip ──────────────────────────────────────────────────────────────────
const Tip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0];
    return (
        <div className="bg-[#09111f]/95 border border-white/10 rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-xl">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{p.name || p.dataKey}</p>
            <p className="text-sm font-black text-white">{typeof p.value === 'number' && p.value > 99 ? fmt(p.value) : p.value}</p>
            {p.payload?.pct !== undefined && <p className="text-[10px] font-bold text-emerald-400">{p.payload.pct?.toFixed(1)}%</p>}
        </div>
    );
};
const MultiTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#09111f]/95 border border-white/10 rounded-2xl px-4 py-3 shadow-2xl backdrop-blur-xl min-w-[160px]">
            {label && <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</p>}
            {payload.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-4 mb-1">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill || '#10b981' }} /><span className="text-[10px] text-slate-300 font-bold">{p.name}</span></div>
                    <span className="text-[10px] font-black text-white">{typeof p.value === 'number' && p.value > 99 ? fmt(p.value) : p.value}</span>
                </div>
            ))}
        </div>
    );
};

// ─── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, sub, accent, badge, pct }: { icon: React.ReactNode; label: string; value: string; sub?: string; accent: string; badge?: string; pct?: number }) => (
    <div className="relative bg-[#0b0d13] border border-white/[0.05] rounded-[1.75rem] p-6 overflow-hidden group hover:border-white/10 transition-all duration-500 shadow-2xl cursor-default"
        style={{ '--a': accent } as any}>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
            style={{ background: `radial-gradient(circle at 0% 0%, ${accent}18, transparent 65%)` }} />
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-all duration-700 pointer-events-none"
            style={{ background: accent }} />
        <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center border border-white/5 bg-white/[0.02] group-hover:scale-110 group-hover:rotate-3 transition-all duration-500"
                    style={{ color: accent, boxShadow: `0 0 24px -6px ${accent}50` }}>
                    {icon}
                </div>
                {badge && <span className="text-[8px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg"
                    style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}25` }}>{badge}</span>}
            </div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{label}</p>
            <h3 className="text-[1.35rem] font-black text-white tracking-tight leading-none mb-2">{value}</h3>
            {pct !== undefined && (
                <div className="h-0.5 bg-white/[0.04] rounded-full overflow-hidden mb-1.5">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accent }} />
                </div>
            )}
            {sub && <p className="text-[9px] font-bold text-slate-600">{sub}</p>}
        </div>
    </div>
);

// ─── Chart Card ──────────────────────────────────────────────────────────────
const ChartCard = ({ title, sub, icon, color, children, className = '' }: { title: string; sub?: string; icon: React.ReactNode; color: string; children: React.ReactNode; className?: string }) => (
    <div className={`bg-[#0b0d13] border border-white/[0.05] rounded-[1.75rem] p-7 shadow-2xl hover:border-white/[0.08] transition-all duration-500 group ${className}`}>
        <div className="flex items-start gap-3 mb-5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white/[0.02] border border-white/5 shrink-0 group-hover:scale-110 transition-all duration-300"
                style={{ color, boxShadow: `0 6px 20px -8px ${color}50` }}>
                {icon}
            </div>
            <div>
                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.22em]">{title}</h3>
                {sub && <p className="text-[8px] font-bold text-slate-600 mt-0.5 uppercase tracking-wider">{sub}</p>}
            </div>
        </div>
        {children}
    </div>
);

// ─── Ranked List (replaces bar charts for large datasets) ────────────────────
const RankedList = ({ data, color, total, maxRows = 12 }: { data: { name: string; value: number }[]; color: string; total: number; maxRows?: number }) => {
    const [expanded, setExpanded] = useState(false);
    const shown = expanded ? data : data.slice(0, maxRows);
    return (
        <div>
            <div className="space-y-1.5 max-h-[320px] overflow-y-auto tactical-scrollbar pr-1">
                {shown.map((d, i) => {
                    const pct = total > 0 ? (d.value / total) * 100 : 0;
                    return (
                        <div key={d.name} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-black/20 hover:bg-white/[0.03] transition-all group/row border border-white/[0.02] hover:border-white/[0.05]">
                            <span className="text-[8px] font-black text-slate-700 w-4 text-right shrink-0">#{i + 1}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-[9px] font-black text-slate-300 truncate group-hover/row:text-white transition-colors uppercase tracking-tight">{d.name}</p>
                                <div className="mt-1 h-0.5 bg-black/40 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-1000"
                                        style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 4px ${color}60` }} />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[8px] font-black text-white tabular-nums">{fmtK(d.value)}</span>
                                <span className="text-[7px] font-black px-1.5 py-0.5 rounded tabular-nums"
                                    style={{ backgroundColor: `${color}18`, color }}>{pct.toFixed(1)}%</span>
                            </div>
                        </div>
                    );
                })}
            </div>
            {data.length > maxRows && (
                <button onClick={() => setExpanded(v => !v)}
                    className="mt-2 w-full text-center text-[8px] font-black uppercase tracking-widest text-slate-700 hover:text-slate-400 transition-colors py-1">
                    {expanded ? '↑ Réduire' : `↓ Voir ${data.length - maxRows} de plus`}
                </button>
            )}
        </div>
    );
};

// ─── Dual-view: Famille + Discipline in one card ──────────────────────────────
const DualPivotCard = ({ title, sub, icon, color, famData, discData, totalFam, totalDisc }: {
    title: string; sub: string; icon: React.ReactNode; color: string;
    famData: { name: string; value: number }[]; discData: { name: string; value: number }[];
    totalFam: number; totalDisc: number;
}) => {
    const [pivot, setPivot] = useState<'famille' | 'discipline'>('famille');
    const data = pivot === 'famille' ? famData : discData;
    const total = pivot === 'famille' ? totalFam : totalDisc;
    return (
        <ChartCard title={title} sub={sub} icon={icon} color={color}>
            <div className="flex items-center gap-1 bg-black/30 border border-white/[0.04] rounded-xl p-1 mb-4 w-fit">
                {(['famille', 'discipline'] as const).map(k => (
                    <button key={k} onClick={() => setPivot(k)}
                        className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                        style={pivot === k ? { backgroundColor: color, color: '#000' } : { color: '#475569' }}>
                        {k === 'famille' ? 'Famille' : 'Discipline'}
                    </button>
                ))}
            </div>
            <RankedList data={data} color={color} total={total} />
        </ChartCard>
    );
};

// ─── Budget S-Curve Tooltip ──────────────────────────────────────────────────
const SCurveTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const pl = payload[0]?.payload || {};
    return (
        <div className="bg-[#09111f]/98 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-xl min-w-[240px]">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 pb-2 border-b border-white/5">{label}</p>
            <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="w-2 h-0.5 bg-red-400 rounded" style={{ borderTop: '2px dashed #f87171' }} /><span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Planifié Cumulé</span></div>
                    <span className="text-[10px] font-black text-white tabular-nums">{fmt(pl.planned ?? 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><div className="w-2 h-0.5 bg-emerald-400 rounded" /><span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Exécuté Cumulé</span></div>
                    <span className="text-[10px] font-black text-emerald-400 tabular-nums">{fmt(pl.executed ?? 0)}</span>
                </div>
            </div>
            {(pl.execMo > 0 || pl.execSc > 0 || pl.execHd > 0 || pl.execPdr > 0) && (
                <div className="border-t border-white/5 pt-3 space-y-1.5">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">Détail Exécuté</p>
                    {[['Main d\'Œuvre', pl.execMo, '#3b82f6'], ['Échafaudage', pl.execSc, '#8b5cf6'], ['Manutention', pl.execHd, '#06b6d4'], ['PDR', pl.execPdr, '#f59e0b']].map(([lbl, val, col]: any) => val > 0 ? (
                        <div key={lbl} className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full" style={{ background: col }} /><span className="text-[8px] font-bold text-slate-500">{lbl}</span></div>
                            <span className="text-[8px] font-black tabular-nums" style={{ color: col }}>{fmtK(val)}</span>
                        </div>
                    ) : null)}
                </div>
            )}
            {(pl.gap > 0) && <p className="text-[8px] font-bold text-red-400/80 mt-3 pt-2 border-t border-white/5">Écart: {fmtK(pl.gap)}</p>}
        </div>
    );
};

// ─── Helpers ───────────────────────────────────────────────────────────
const getWeekNum = (d: Date) => {
    const oneJan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d.getTime() - oneJan.getTime()) / 86400000) + oneJan.getDay() + 1) / 7);
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CostControlPage({ tasks, costData, evaluationData, onBack }: CostControlPageProps) {
    const [search, setSearch] = useState('');
    const [fZone, setFZone] = useState('all');
    const [fEquip, setFEquip] = useState('all');
    const [fFamille, setFFamille] = useState('all');
    const [fDisc, setFDisc] = useState('all');
    const [fMaint, setFMaint] = useState('all');
    const [dateStart, setDateStart] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [showLegend, setShowLegend] = useState(true);
    const [famSearch, setFamSearch] = useState('');
    const [dPivot, setDPivot] = useState<'mo' | 'pr'>('mo');
    const [scRes, setScRes] = useState<'1H' | '6H' | '12H' | '1D' | '1W' | '1M' | '1Y'>('1W');

    // ── S-Curve computation ──────────────────────────────────────────────────
    const scurveData = useMemo(() => {
        // Gather all tasks with valid date ranges
        const dated = tasks.filter(t => t['START DATE'] && t['END DATE']);
        if (dated.length === 0) return [];

        const allDates = dated.flatMap(t => [new Date(t['START DATE'] as Date), new Date(t['END DATE'] as Date)]);
        const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
        const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

        // Build bucket boundaries
        const buckets: Date[] = [];
        const cur = new Date(minDate);
        const stepMs: Record<string, number> = {
            '1H': 60 * 60 * 1000,
            '6H': 6 * 60 * 60 * 1000,
            '12H': 12 * 60 * 60 * 1000,
            '1D': 24 * 60 * 60 * 1000,
        };
        if (stepMs[scRes]) {
            cur.setMinutes(0, 0, 0);
            while (cur <= maxDate) { buckets.push(new Date(cur)); cur.setTime(cur.getTime() + stepMs[scRes]); }
        } else if (scRes === '1W') {
            cur.setHours(0, 0, 0, 0);
            while (cur <= maxDate) { buckets.push(new Date(cur)); cur.setDate(cur.getDate() + 7); }
        } else if (scRes === '1M') {
            cur.setDate(1); cur.setHours(0, 0, 0, 0);
            while (cur <= maxDate) { buckets.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1); }
        } else {
            // 1Y
            cur.setMonth(0, 1); cur.setHours(0, 0, 0, 0);
            while (cur <= maxDate) { buckets.push(new Date(cur)); cur.setFullYear(cur.getFullYear() + 1); }
        }
        if (buckets.length === 0 || (buckets[buckets.length - 1] < maxDate)) buckets.push(new Date(maxDate));

        const fmtBucket = (d: Date) => {
            if (scRes === '1H' || scRes === '6H' || scRes === '12H')
                return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            if (scRes === '1D')
                return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            if (scRes === '1W')
                return `S${getWeekNum(d)} ${d.getFullYear()}`;
            if (scRes === '1Y')
                return String(d.getFullYear());
            return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
        };

        let cumPlanned = 0, cumExec = 0;
        let cumExecMo = 0, cumExecSc = 0, cumExecHd = 0, cumExecPdr = 0;

        return buckets.map(bEnd => {
            // Recalc from scratch for this bucket cutoff (accurate, avoids double-count)
            let pSum = 0, eSum = 0, eMo = 0, eSc = 0, eHd = 0, ePdr = 0;
            dated.forEach(t => {
                const tEnd = new Date(t['END DATE'] as Date);
                if (tEnd <= bEnd) {
                    const tot = (t['TOTAL_COST'] as number) || 0;
                    pSum += tot;
                    const evalTask = evaluationData?.tasks?.[t.id];
                    if (evalTask?.status === 'Fait') {
                        eSum += tot;
                        eMo += (t['MO_HH_COST'] as number) || (t['PRESTATION_COST'] as number) || 0;
                        eSc += (t['SCAFFOLDING_COST'] as number) || 0;
                        eHd += (t['HANDLING_COST'] as number) || 0;
                        ePdr += (t['PDR COST'] as number) || 0;
                    }
                }
            });

            return {
                label: fmtBucket(bEnd),
                planned: pSum,
                executed: eSum,
                execMo: eMo,
                execSc: eSc,
                execHd: eHd,
                execPdr: ePdr,
                gap: pSum - eSum,
            };
        });
    }, [tasks, evaluationData, scRes]);

    const hasFilters = fZone !== 'all' || fEquip !== 'all' || fFamille !== 'all' || fDisc !== 'all' || fMaint !== 'all' || !!dateStart || !!dateEnd;
    const resetFilters = () => { setFZone('all'); setFEquip('all'); setFFamille('all'); setFDisc('all'); setFMaint('all'); setDateStart(''); setDateEnd(''); };
    const uv = (k: keyof SchedulingTaskData) => Array.from(new Set(tasks.map(t => t[k]).filter(Boolean))).sort() as string[];

    const tf = useMemo(() => tasks.filter(t => {
        const ms = !search || t['GLOBAL TASKS']?.toLowerCase().includes(search.toLowerCase()) || String(t.OT).includes(search);
        const mz = fZone === 'all' || t.ZONE === fZone;
        const me = fEquip === 'all' || t['Nom Equipement'] === fEquip;
        const mf = fFamille === 'all' || t.FAMILLE === fFamille;
        const md = fDisc === 'all' || t.DISCIPLINE === fDisc;
        const mm = fMaint === 'all' || t['Type de Maintenance'] === fMaint;
        const d = t.START_DATE ? new Date(t.START_DATE) : null;
        const mdate = (!dateStart || (d && d >= new Date(dateStart))) && (!dateEnd || (d && d <= new Date(dateEnd)));
        return ms && mz && me && mf && md && mm && mdate;
    }), [tasks, search, fZone, fEquip, fFamille, fDisc, fMaint, dateStart, dateEnd]);

    const ca = useMemo(() => {
        let mo = 0, pr = 0, pdr = 0, sc = 0, hd = 0, tot = 0;
        const famB: Record<string, number> = {}, famPdr: Record<string, number> = {}, famSc: Record<string, number> = {}, famHd: Record<string, number> = {};
        const discp: Record<string, number> = {}, discMo: Record<string, number> = {}, discPr: Record<string, number> = {}, discSc: Record<string, number> = {}, discHd: Record<string, number> = {};
        const compPr: Record<string, number> = {}, compMo: Record<string, number> = {};
        const zoneB: Record<string, number> = {};

        tf.forEach(t => {
            const isHH = String(t['COST_TYPE']).toUpperCase() === 'HH';
            const _mo = (t['MO_HH_COST'] as number) || 0;
            const _pr = isHH ? 0 : ((t['PRESTATION_COST'] as number) || (t['TASK_COST'] as number) || 0);
            const _pdr = (t['PDR COST'] as number) || 0;
            const _sc = (t['SCAFFOLDING_COST'] as number) || 0;
            const _hd = (t['HANDLING_COST'] as number) || 0;
            const _tot = (t['TOTAL_COST'] as number) || (_mo + _pr + _pdr + _sc + _hd);
            mo += _mo; pr += _pr; pdr += _pdr; sc += _sc; hd += _hd; tot += _tot;
            const fam = t.FAMILLE || 'N/A';
            famB[fam] = (famB[fam] || 0) + _tot;
            famPdr[fam] = (famPdr[fam] || 0) + _pdr;
            famSc[fam] = (famSc[fam] || 0) + _sc;
            famHd[fam] = (famHd[fam] || 0) + _hd;
            const disc = t.DISCIPLINE || 'N/A';
            discp[disc] = (discp[disc] || 0) + _pdr;
            discMo[disc] = (discMo[disc] || 0) + _mo;
            discPr[disc] = (discPr[disc] || 0) + _pr;
            discSc[disc] = (discSc[disc] || 0) + _sc;
            discHd[disc] = (discHd[disc] || 0) + _hd;
            const co = t.COMPANY || 'N/A';
            compPr[co] = (compPr[co] || 0) + _pr;
            compMo[co] = (compMo[co] || 0) + _mo;
            const z = t.ZONE || 'N/A';
            zoneB[z] = (zoneB[z] || 0) + _tot;
        });
        return { mo, pr, pdr, sc, hd, tot, famB, famPdr, famSc, famHd, discp, discMo, discPr, discSc, discHd, compPr, compMo, zoneB };
    }, [tf]);

    // ── Derived sorted lists ───────────────────────────────────────────────────
    const toSorted = (r: Record<string, number>) =>
        Object.entries(r).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));

    const donutGlobal = [
        { name: "Main d'Œuvre", value: ca.mo },
        { name: "Prestation", value: ca.pr },
        { name: 'PDR', value: ca.pdr },
        { name: 'Échafaudage', value: ca.sc },
        { name: 'Manutention', value: ca.hd },
    ].filter(d => d.value > 0).map(d => ({ ...d, pct: (d.value / (ca.tot || 1)) * 100 }));

    const compMoSorted = toSorted(ca.compMo);
    const compPrSorted = toSorted(ca.compPr);
    const famBSorted = toSorted(ca.famB);
    const zoneSorted = toSorted(ca.zoneB);

    // PDR
    const famPdrSorted = toSorted(ca.famPdr);
    const discPdrSorted = toSorted(ca.discp);
    // Scaffolding
    const famScSorted = toSorted(ca.famSc);
    const discScSorted = toSorted(ca.discSc);
    // Handling
    const famHdSorted = toSorted(ca.famHd);
    const discHdSorted = toSorted(ca.discHd);
    // MO + Pr by discipline
    const discMoSorted = toSorted(ca.discMo);
    const discPrSorted = toSorted(ca.discPr);

    // ── Zone combined data (bar + share) ──────────────────────────────────────
    const zoneBarData = zoneSorted.map(z => ({ name: z.name, Budget: z.value, pct: ca.tot > 0 ? +((z.value / ca.tot) * 100).toFixed(1) : 0 }));

    const FilterSelect = ({ label, value, onChange, options, placeholder }: { label: string; value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) => {
        const active = value !== 'all';
        return (
            <div className="space-y-1.5">
                <label className={`text-[8px] font-black uppercase tracking-[0.2em] ml-1 transition-colors ${active ? 'text-emerald-400' : 'text-slate-600'}`}>{label}</label>
                <div className={`relative rounded-xl transition-all duration-300 ${active ? 'ring-1 ring-emerald-500/40' : ''}`}>
                    <select value={value} onChange={e => onChange(e.target.value)}
                        className={`w-full border rounded-xl px-4 py-3 text-[10px] font-bold outline-none cursor-pointer transition-all appearance-none pr-8 ${active ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/5' : 'border-white/5 text-slate-300 bg-[#11131a]'}`}>
                        <option value="all">{placeholder}</option>
                        {options.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <div className={`absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full pointer-events-none ${active ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#06080c] text-white font-sans">
            <style>{`
                @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
                @keyframes scaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
                .anim-1{animation:fadeUp .45s ease forwards}
                .anim-2{animation:fadeUp .45s .07s ease forwards;opacity:0}
                .anim-3{animation:fadeUp .45s .14s ease forwards;opacity:0}
                .anim-4{animation:fadeUp .45s .21s ease forwards;opacity:0}
                .anim-5{animation:fadeUp .45s .28s ease forwards;opacity:0}
                .anim-6{animation:scaleIn .55s .35s ease forwards;opacity:0}
                .tactical-scrollbar::-webkit-scrollbar{width:3px;height:3px}
                .tactical-scrollbar::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.07);border-radius:10px}
                .custom-scrollbar::-webkit-scrollbar{width:3px;height:3px}
                .custom-scrollbar::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.07);border-radius:10px}
                select option{background:#0d0f14;color:#cbd5e1}
            `}</style>

            {/* ── Sticky Header ── */}
            <div className="sticky top-0 z-50 bg-[#06080c]/90 backdrop-blur-2xl border-b border-white/[0.04] px-8 py-4">
                <div className="w-full mx-auto flex items-center justify-between px-6 lg:px-12 2xl:px-24">
                    <div className="flex items-center gap-5">
                        <button onClick={onBack} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] text-slate-400 hover:text-white transition-all group">
                            <ChevronRight className="w-4 h-4 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                        </button>
                        <div>
                            <h1 className="text-lg font-black tracking-[0.22em] uppercase text-white">FINANCIAL <span className="text-emerald-400">COMMAND</span></h1>
                            <p className="text-[8px] text-slate-600 uppercase tracking-[0.3em] font-black mt-0.5">Budgetary Intelligence Center · Decision Making</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-3">
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Options</span>
                        <div className="w-px h-4 bg-white/10" />
                        <label className="flex items-center gap-2 cursor-pointer" onClick={() => setShowLegend(v => !v)}>
                            <div className={`w-8 h-4 rounded-full relative transition-all duration-300 ${showLegend ? 'bg-emerald-500' : 'bg-white/10'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all duration-300 ${showLegend ? 'left-4' : 'left-0.5'}`} />
                            </div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Légende</span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="w-full mx-auto px-6 lg:px-12 2xl:px-24 py-10 space-y-10">

                {/* ══════════════════════════════════════════════════════════
                    BUDGET S-CURVE — Planned vs Executed
                ══════════════════════════════════════════════════════════ */}
                {scurveData.length > 0 && (() => {
                    const totalPlanned = scurveData[scurveData.length - 1]?.planned ?? 0;
                    const totalExecuted = scurveData[scurveData.length - 1]?.executed ?? 0;
                    const execRate = totalPlanned > 0 ? (totalExecuted / totalPlanned) * 100 : 0;
                    const doneCount = tasks.filter(t => evaluationData?.tasks?.[t.id]?.status === 'Fait').length;
                    return (
                        <div className="bg-[#0b0d13] border border-white/[0.05] rounded-[1.75rem] overflow-hidden shadow-2xl anim-1">
                            {/* Card Header */}
                            <div className="px-8 pt-7 pb-5 border-b border-white/[0.04] flex items-center justify-between gap-6 flex-wrap">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-[11px] font-black text-white uppercase tracking-[0.25em]">Courbe S — Budget Financier</h2>
                                        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-wider mt-0.5">Planifié Cumulé vs Exécuté Cumulé · lié à l'Évaluation à Chaud</p>
                                    </div>
                                </div>
                                {/* KPI strip */}
                                <div className="flex items-center gap-4">
                                    {[
                                        { label: 'Budget Total', val: fmtK(totalPlanned), color: '#f87171' },
                                        { label: 'Exécuté', val: fmtK(totalExecuted), color: '#10b981' },
                                        { label: 'Taux Exécution', val: `${execRate.toFixed(1)}%`, color: execRate >= 80 ? '#10b981' : execRate >= 50 ? '#f59e0b' : '#f87171' },
                                        { label: 'Tâches Faites', val: String(doneCount), color: '#8b5cf6' },
                                    ].map(k => (
                                        <div key={k.label} className="text-center px-4 py-2 rounded-xl bg-black/30 border border-white/[0.03] min-w-[80px]">
                                            <p className="text-[7px] font-black uppercase tracking-widest text-slate-700 mb-0.5">{k.label}</p>
                                            <p className="text-sm font-black" style={{ color: k.color }}>{k.val}</p>
                                        </div>
                                    ))}
                                    {/* Resolution selector */}
                                    <div className="flex items-center gap-1 bg-black/40 border border-white/[0.04] rounded-xl p-1">
                                        {(['1H', '6H', '12H', '1D', '1W', '1M', '1Y'] as const).map(r => (
                                            <button key={r} onClick={() => setScRes(r)}
                                                className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                                                style={scRes === r
                                                    ? { backgroundColor: '#10b981', color: '#000', boxShadow: '0 0 12px -2px #10b98150' }
                                                    : { color: '#475569' }}>
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Chart */}
                            <div className="px-4 pt-6 pb-4 h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={scurveData} margin={{ left: 10, right: 24, top: 8, bottom: 8 }}>
                                        <defs>
                                            <linearGradient id="execGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                                            </linearGradient>
                                            <linearGradient id="gapGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#f87171" stopOpacity={0.15} />
                                                <stop offset="100%" stopColor="#f87171" stopOpacity={0.02} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                        <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 8, fontWeight: 900 }} axisLine={false} tickLine={false}
                                            interval={Math.max(0, Math.floor(scurveData.length / 12) - 1)} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 8 }} tickFormatter={fmtK} width={58} />
                                        <Tooltip content={<SCurveTip />} cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }} />
                                        {/* Gap fill area (planned - executed) */}
                                        <Area type="monotone" dataKey="planned" name="Planifié" stroke="none" fill="url(#gapGrad)" fillOpacity={1} />
                                        {/* Executed fill area */}
                                        <Area type="monotone" dataKey="executed" name="Exécuté" stroke="none" fill="url(#execGrad)" fillOpacity={1} />
                                        {/* Planned line */}
                                        <Line type="monotone" dataKey="planned" name="Planifié" stroke="#f87171" strokeWidth={2.5}
                                            strokeDasharray="6 3" dot={false} activeDot={{ r: 5, fill: '#f87171', strokeWidth: 0 }} />
                                        {/* Executed line */}
                                        <Line type="monotone" dataKey="executed" name="Exécuté" stroke="#10b981" strokeWidth={2.5}
                                            dot={false} activeDot={{ r: 5, fill: '#10b981', strokeWidth: 0, filter: 'drop-shadow(0 0 6px #10b981)' }} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Legend strip */}
                            <div className="px-8 pb-6 flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke="#f87171" strokeWidth="2" strokeDasharray="5,3" /></svg>
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Planifié Cumulé</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-0.5 rounded" style={{ backgroundColor: '#10b981', boxShadow: '0 0 4px #10b981' }} />
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Exécuté Cumulé</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-5 h-2 rounded opacity-40" style={{ backgroundColor: '#f87171' }} />
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Écart (Gap)</span>
                                </div>
                                <div className="ml-auto text-[8px] font-black text-slate-700 uppercase tracking-widest">
                                    Hover pour détail · Résolution: {scRes}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* ── KPI CARDS ── */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 anim-1">
                    {[
                        { icon: <Zap className="w-5 h-5" />, label: 'Budget Total', value: fmt(ca.tot), sub: `${tf.length} tâches`, accent: '#10b981', badge: 'CAPEX', pct: 100 },
                        { icon: <Users className="w-5 h-5" />, label: "Main d'Œuvre", value: fmt(ca.mo), sub: `${((ca.mo / (ca.tot || 1)) * 100).toFixed(1)}% budget`, accent: '#3b82f6', badge: 'HH', pct: (ca.mo / (ca.tot || 1)) * 100 },
                        { icon: <Layers className="w-5 h-5" />, label: 'Prestation', value: fmt(ca.pr), sub: `${((ca.pr / (ca.tot || 1)) * 100).toFixed(1)}% budget`, accent: '#6366f1', badge: 'POSTE', pct: (ca.pr / (ca.tot || 1)) * 100 },
                        { icon: <Settings className="w-5 h-5" />, label: 'PDR', value: fmt(ca.pdr), sub: `${((ca.pdr / (ca.tot || 1)) * 100).toFixed(1)}% budget`, accent: '#f59e0b', badge: 'MAT', pct: (ca.pdr / (ca.tot || 1)) * 100 },
                        { icon: <TrendingUp className="w-5 h-5" />, label: 'Échafaudage', value: fmt(ca.sc), sub: `${((ca.sc / (ca.tot || 1)) * 100).toFixed(1)}% budget`, accent: '#8b5cf6', pct: (ca.sc / (ca.tot || 1)) * 100 },
                        { icon: <Clock className="w-5 h-5" />, label: 'Manutention', value: fmt(ca.hd), sub: `${((ca.hd / (ca.tot || 1)) * 100).toFixed(1)}% budget`, accent: '#06b6d4', pct: (ca.hd / (ca.tot || 1)) * 100 },
                    ].map((c, i) => <KpiCard key={i} {...c} />)}
                </div>

                {/* ── FILTER BAR ── */}
                <div className={`relative border rounded-[1.75rem] p-7 shadow-xl anim-2 overflow-hidden transition-all duration-500 ${hasFilters ? 'bg-[#0c1210] border-emerald-500/15' : 'bg-[#0b0d13] border-white/[0.04]'}`}>
                    {hasFilters && <div className="absolute inset-0 bg-emerald-500/[0.025] pointer-events-none rounded-[1.75rem]" />}
                    <div className="flex items-center justify-between mb-5 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border ${hasFilters ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-white/5 bg-white/[0.02]'}`}>
                                <Filter className={`w-4 h-4 ${hasFilters ? 'text-emerald-400' : 'text-slate-600'}`} />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.22em]">Paramètres d'Analyse</h3>
                                <p className="text-[8px] text-slate-700 uppercase tracking-wider mt-0.5">Filtrage multidimensionnel</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {hasFilters && (
                                <button onClick={resetFilters} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-[9px] font-black uppercase tracking-widest">
                                    <RotateCcw className="w-3 h-3" /> Réinitialiser
                                </button>
                            )}
                            <div className={`px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest flex items-center gap-2 ${hasFilters ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/[0.03] border-white/5 text-slate-600'}`}>
                                <Activity className="w-3.5 h-3.5" />{tf.length} Tâches
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 relative z-10">
                        <FilterSelect label="Zone" value={fZone} onChange={setFZone} options={uv('ZONE')} placeholder="Toutes Zones" />
                        <FilterSelect label="Équipement" value={fEquip} onChange={setFEquip} options={uv('Nom Equipement')} placeholder="Tous Équipements" />
                        <FilterSelect label="Famille" value={fFamille} onChange={setFFamille} options={uv('FAMILLE')} placeholder="Toutes Familles" />
                        <FilterSelect label="Discipline" value={fDisc} onChange={setFDisc} options={uv('DISCIPLINE')} placeholder="Toutes Disciplines" />
                        <FilterSelect label="Maintenance" value={fMaint} onChange={setFMaint} options={uv('Type de Maintenance')} placeholder="Tous Types" />
                        <div className="space-y-1.5">
                            <label className={`text-[8px] font-black uppercase tracking-[0.2em] ml-1 ${dateStart ? 'text-emerald-400' : 'text-slate-600'}`}>Début</label>
                            <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)}
                                className={`w-full border rounded-xl px-4 py-3 text-[10px] font-bold outline-none transition-all bg-transparent [&::-webkit-calendar-picker-indicator]:invert-[0.5] ${dateStart ? 'border-emerald-500/40 text-emerald-300' : 'border-white/5 text-slate-300 bg-[#11131a]'}`} />
                        </div>
                        <div className="space-y-1.5">
                            <label className={`text-[8px] font-black uppercase tracking-[0.2em] ml-1 ${dateEnd ? 'text-emerald-400' : 'text-slate-600'}`}>Fin</label>
                            <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)}
                                className={`w-full border rounded-xl px-4 py-3 text-[10px] font-bold outline-none transition-all bg-transparent [&::-webkit-calendar-picker-indicator]:invert-[0.5] ${dateEnd ? 'border-emerald-500/40 text-emerald-300' : 'border-white/5 text-slate-300 bg-[#11131a]'}`} />
                        </div>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    ROW 1 — Budget Architecture: Donut + Cost-by-Company ranked list
                ═══════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 anim-3">

                    {/* Répartition Globale — 5-slice donut + inline legend */}
                    <ChartCard title="Répartition Globale" sub="Architecture du budget par composante" icon={<BarChart2 className="w-4 h-4" />} color="#0ea5e9">
                        <div className="h-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <RechartsPie>
                                    <Pie data={donutGlobal} cx="50%" cy="48%" innerRadius={70} outerRadius={105} paddingAngle={5} dataKey="value" stroke="none">
                                        {donutGlobal.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                                    </Pie>
                                    <Tooltip content={<Tip />} />
                                </RechartsPie>
                            </ResponsiveContainer>
                        </div>
                        {showLegend && (
                            <div className="space-y-1.5 mt-3">
                                {donutGlobal.map((d, i) => (
                                    <div key={d.name} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.02] transition-colors">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">{d.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-white tabular-nums">{fmtK(d.value)}</span>
                                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded" style={{ backgroundColor: `${PALETTE[i % PALETTE.length]}18`, color: PALETTE[i % PALETTE.length] }}>{d.pct.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ChartCard>

                    {/* MO par prestataire — ranked list */}
                    <ChartCard title="Main d'Œuvre — par Prestataire" sub="Coût HH consolidé par société" icon={<Users className="w-4 h-4" />} color="#3b82f6">
                        <RankedList data={compMoSorted} color="#3b82f6" total={ca.mo} />
                    </ChartCard>

                    {/* Prestation par prestataire — ranked horizontal bars */}
                    <ChartCard title="Prestation — par Prestataire" sub="Forfait poste par société" icon={<Target className="w-4 h-4" />} color="#6366f1">
                        <RankedList data={compPrSorted} color="#6366f1" total={ca.pr} />
                    </ChartCard>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    ROW 2 — Budget par Famille (full-width ranked) + Zone (combined)
                ═══════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 anim-4">

                    {/* Budget par Famille — searchable ranked list, scales to hundreds */}
                    {(() => {
                        const filtered = famBSorted.filter(f => f.name.toLowerCase().includes(famSearch.toLowerCase()));
                        const summary = [
                            { label: 'Familles', val: famBSorted.length, color: '#94a3b8' },
                            { label: 'Top Famille', val: famBSorted[0]?.name.slice(0, 12) || '—', color: '#10b981' },
                            { label: 'Top Budget', val: famBSorted[0] ? fmtK(famBSorted[0].value) : '—', color: '#10b981' },
                        ];
                        return (
                            <ChartCard title="Budget par Famille" sub="Toutes familles · tri par budget décroissant" icon={<Briefcase className="w-4 h-4" />} color="#10b981">
                                {/* Summary strip */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    {summary.map(s => (
                                        <div key={s.label} className="rounded-xl p-2 text-center bg-black/20 border border-white/[0.03]">
                                            <p className="text-[7px] font-black uppercase tracking-widest text-slate-700 mb-0.5">{s.label}</p>
                                            <p className="text-xs font-black truncate" style={{ color: s.color }}>{s.val}</p>
                                        </div>
                                    ))}
                                </div>
                                {/* Search */}
                                <div className="relative mb-3">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-700" />
                                    <input value={famSearch} onChange={e => setFamSearch(e.target.value)} placeholder="Rechercher famille..."
                                        className="w-full bg-black/30 border border-white/[0.04] rounded-xl pl-7 pr-3 py-2 text-[9px] font-bold text-slate-300 placeholder-slate-700 outline-none focus:border-white/10" />
                                </div>
                                <RankedList data={filtered} color="#10b981" total={ca.tot} maxRows={10} />
                            </ChartCard>
                        );
                    })()}

                    {/* Zone — single chart: bar (budget) + inline % share */}
                    <ChartCard title="Budget par Zone" sub="Concentration spatiale + part relative" icon={<Layers className="w-4 h-4" />} color="#8b5cf6">
                        {/* ComposedChart: bars for absolute + line for cumulative % */}
                        <div className="h-[200px] mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={zoneBarData} margin={{ left: -10, right: 16 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 8, fontWeight: 900 }} axisLine={false} tickLine={false} />
                                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 8 }} tickFormatter={fmtK} />
                                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 8 }} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                                    <Tooltip content={<MultiTip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                                    <Bar yAxisId="left" dataKey="Budget" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={28} fillOpacity={0.85} />
                                    <Line yAxisId="right" type="monotone" dataKey="pct" name="Part %" stroke="#ec4899" strokeWidth={2} dot={{ fill: '#ec4899', r: 3 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Ranked zone list below chart */}
                        <RankedList data={zoneSorted} color="#8b5cf6" total={ca.tot} maxRows={6} />
                    </ChartCard>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    ROW 3 — PDR: dual-pivot card + Scaffolding dual-pivot
                ═══════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 anim-4">
                    <DualPivotCard
                        title="Budget PDR" sub="Pièces de rechange · Famille ou Discipline"
                        icon={<Package className="w-4 h-4" />} color="#f59e0b"
                        famData={famPdrSorted} discData={discPdrSorted}
                        totalFam={ca.pdr} totalDisc={ca.pdr}
                    />
                    <DualPivotCard
                        title="Échafaudage" sub="Coûts structurels · Famille ou Discipline"
                        icon={<TrendingUp className="w-4 h-4" />} color="#8b5cf6"
                        famData={famScSorted} discData={discScSorted}
                        totalFam={ca.sc} totalDisc={ca.sc}
                    />
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    ROW 4 — Manutention dual-pivot + MO/Pr by Discipline
                ═══════════════════════════════════════════════════════════ */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 anim-5">
                    <DualPivotCard
                        title="Manutention" sub="Logistique & levage · Famille ou Discipline"
                        icon={<Truck className="w-4 h-4" />} color="#06b6d4"
                        famData={famHdSorted} discData={discHdSorted}
                        totalFam={ca.hd} totalDisc={ca.hd}
                    />
                    {/* MO + Prestation by discipline combined */}
                    {(() => {
                        const dData = dPivot === 'mo' ? discMoSorted : discPrSorted;
                        const dTotal = dPivot === 'mo' ? ca.mo : ca.pr;
                        const dColor = dPivot === 'mo' ? '#3b82f6' : '#6366f1';
                        return (
                            <ChartCard title="Main d'Œuvre & Prestation" sub="Vue par discipline technique" icon={<Users className="w-4 h-4" />} color="#3b82f6">
                                <div className="flex items-center gap-1 bg-black/30 border border-white/[0.04] rounded-xl p-1 mb-4 w-fit">
                                    {([['mo', "Main d'Œuvre"], ['pr', 'Prestation']] as const).map(([k, lbl]) => (
                                        <button key={k} onClick={() => setDPivot(k)}
                                            className="px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                                            style={dPivot === k ? { backgroundColor: dColor, color: '#000' } : { color: '#475569' }}>
                                            {lbl}
                                        </button>
                                    ))}
                                </div>
                                <RankedList data={dData} color={dColor} total={dTotal} />
                            </ChartCard>
                        );
                    })()}
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    TRANSACTION JOURNAL
                ═══════════════════════════════════════════════════════════ */}
                <div className="bg-[#0b0d13] border border-white/[0.05] rounded-[1.75rem] overflow-hidden shadow-2xl anim-6">
                    <div className="px-8 py-5 border-b border-white/[0.04] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <BookOpen className="w-4 h-4 text-slate-600" />
                            <div>
                                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.22em]">Journal des Transactions</h3>
                                <p className="text-[8px] text-slate-700 uppercase tracking-wider mt-0.5">Détail granulaire · {tf.length} enregistrements</p>
                            </div>
                        </div>
                        <div className="bg-white/[0.02] border border-white/5 rounded-xl px-5 py-2.5 flex items-center gap-3">
                            <Search className="w-3.5 h-3.5 text-slate-600" />
                            <input type="text" placeholder="Rechercher OT ou Tâche..." className="bg-transparent border-none outline-none text-[10px] font-bold text-white placeholder:text-slate-700 min-w-[180px]" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                    </div>
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/[0.015]">
                                    {['#', 'Task / OT', 'Famille · Zone', 'Type', 'Qté', 'MO / Prestation', 'PDR', 'Scaff', 'Manut', 'Total MAD'].map((h, i) => (
                                        <th key={h} className={`px-5 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 ${i > 4 ? 'text-right' : ''}`}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.02]">
                                {tf.slice(0, 200).map((t, idx) => {
                                    const isHH = String(t['COST_TYPE']).toUpperCase() === 'HH';
                                    const mo = isHH ? (t['MO_HH_COST'] as number || 0) : 0;
                                    const pr = !isHH ? ((t['PRESTATION_COST'] as number) || (t['TASK_COST'] as number) || 0) : 0;
                                    const valMP = isHH ? mo : pr;
                                    const pdr = (t['PDR COST'] as number || 0);
                                    const sc = (t['SCAFFOLDING_COST'] as number || 0);
                                    const hd = (t['HANDLING_COST'] as number || 0);
                                    const tot = (t['TOTAL_COST'] as number || 0);
                                    const highCost = tot > (ca.tot / tf.length) * 3;
                                    return (
                                        <tr key={t.id || idx} className={`hover:bg-white/[0.02] transition-colors ${highCost ? 'border-l-2' : ''}`}
                                            style={highCost ? { borderLeftColor: '#f59e0b' } : {}}>
                                            <td className="px-5 py-4 text-[9px] font-black text-slate-700 tabular-nums">{idx + 1}</td>
                                            <td className="px-5 py-4">
                                                <p className="text-[10px] font-black text-white uppercase tracking-tight truncate max-w-[240px]">{t['GLOBAL TASKS']}</p>
                                                <div className="flex gap-2 mt-0.5">
                                                    <span className="text-[8px] font-black text-slate-600 bg-white/[0.04] px-1.5 py-0.5 rounded">OT {t.OT}</span>
                                                    <span className="text-[8px] font-bold text-slate-700">{t.COMPANY}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-[9px] font-bold text-slate-400 truncate max-w-[140px]">{t.FAMILLE || '—'}</p>
                                                <p className="text-[8px] font-bold text-slate-600">{t.ZONE || '—'}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-wider border ${isHH ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                                    {isHH ? 'H·H' : 'POSTE'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-[10px] font-bold text-slate-500 tabular-nums">{isHH ? `${t['Heures-Homme'] || 0}h` : `${t.QT || 0}`}</td>
                                            <td className="px-5 py-4 text-right text-[10px] font-black text-white tabular-nums">{fmt(valMP)}</td>
                                            <td className="px-5 py-4 text-right text-[10px] font-bold tabular-nums" style={{ color: '#f59e0b' }}>{fmt(pdr)}</td>
                                            <td className="px-5 py-4 text-right text-[10px] font-bold tabular-nums" style={{ color: '#8b5cf6' }}>{fmt(sc)}</td>
                                            <td className="px-5 py-4 text-right text-[10px] font-bold tabular-nums" style={{ color: '#06b6d4' }}>{fmt(hd)}</td>
                                            <td className="px-5 py-4 text-right tabular-nums">
                                                <span className={`text-sm font-black ${highCost ? 'text-amber-400' : 'text-emerald-400'}`}>{fmt(tot)}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-white/[0.015] border-t border-white/[0.05]">
                                <tr>
                                    <td colSpan={5} className="px-5 py-5 text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Consolidation · {tf.length} tâches</td>
                                    <td className="px-5 py-5 text-right text-[10px] font-black text-white tabular-nums">{fmt(ca.mo + ca.pr)}</td>
                                    <td className="px-5 py-5 text-right text-[10px] font-black tabular-nums" style={{ color: '#f59e0b' }}>{fmt(ca.pdr)}</td>
                                    <td className="px-5 py-5 text-right text-[10px] font-black tabular-nums" style={{ color: '#8b5cf6' }}>{fmt(ca.sc)}</td>
                                    <td className="px-5 py-5 text-right text-[10px] font-black tabular-nums" style={{ color: '#06b6d4' }}>{fmt(ca.hd)}</td>
                                    <td className="px-5 py-5 text-right text-base font-black text-emerald-400 tabular-nums">{fmt(ca.tot)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
