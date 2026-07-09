import React, { useState, useMemo } from 'react';
import type { SchedulingTaskData, PDRItem } from '../types';
import {
    ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { Package, Activity, Clock, Filter, Check, TrendingUp, TrendingDown, AlertTriangle, BarChart3, Layers, ShoppingCart, X, ChevronRight } from 'lucide-react';

interface PreparatifManagementProps {
    pdrItems: PDRItem[];
    tasks: SchedulingTaskData[];
    onUpdatePDR: (pdrItems: PDRItem[]) => void;
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function parseFlexDate(val: any): number | null {
    if (!val) return null;
    // Already a JS Date from xlsx
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val.getTime();
    // Excel serial number
    if (typeof val === 'number') {
        const d = new Date((val - 25569) * 86400 * 1000);
        return isNaN(d.getTime()) ? null : d.getTime();
    }
    const s = String(val).trim();
    // ISO / standard
    const d1 = new Date(s);
    if (!isNaN(d1.getTime())) return d1.getTime();
    // DD/MM/YYYY or DD-MM-YYYY or DD/MM/YY
    const parts = s.split(/[-/]/);
    if (parts.length === 3) {
        let year = parseInt(parts[2]);
        if (year < 100) year += 2000;
        const d2 = new Date(year, parseInt(parts[1]) - 1, parseInt(parts[0]));
        if (!isNaN(d2.getTime())) return d2.getTime();
    }
    return null;
}

function fmtPrice(n: number, sym: string) {
    return `${sym} ${n.toLocaleString('fr-FR')}`;
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export const PreparatifManagement: React.FC<PreparatifManagementProps> = ({ pdrItems, tasks, onUpdatePDR }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'not-ready'>('all');
    const [logisticsFilter, setLogisticsFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [selectedCurrency, setSelectedCurrency] = useState('MAD');
    const [activeCommentModal, setActiveCommentModal] = useState<PDRItem | null>(null);
    const [tempComment, setTempComment] = useState('');
    const [timeResolution, setTimeResolution] = useState<number>(24);
    // ── Bulk selection ─────────────────────────
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkStatus, setBulkStatus] = useState<string>('Inventory Assets');
    const [bulkReadiness, setBulkReadiness] = useState<number>(1);
    // ── Modal/Filter state ─────────────────────
    const [criticityFilter, setCriticityFilter] = useState<'all' | 'critical'>('all');
    const [showCriticalModal, setShowCriticalModal] = useState(false);
    const [statusCardModal, setStatusCardModal] = useState<string | null>(null);
    // ── Reusable base Modal wrapper ─────────────────────
    const BaseModal = ({ open, onClose, accentColor, icon, title, subtitle, children }: any) => {
        if (!open) return null;
        return (
            <div className="fixed inset-0 z-[9999] flex flex-col bg-[#030712]/95 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-300"
                style={{ height: '100vh', width: '100vw' }}>
                {/* Glow/Gradient background effects */}
                <div className="absolute inset-x-0 top-0 h-96 opacity-30 pointer-events-none mix-blend-screen" style={{ background: `radial-gradient(100% 100% at 50% -20%, ${accentColor}, transparent 100%)` }} />

                {/* Header */}
                <div className="flex items-center justify-between gap-4 px-6 sm:px-12 py-6 border-b border-white/5 bg-black/40 shrink-0 relative z-10 shadow-xl">
                    <div className="flex items-center gap-5 min-w-0">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xl"
                            style={{ background: `${accentColor}18`, borderColor: `${accentColor}40`, color: accentColor, boxShadow: `0 0 40px ${accentColor}20` }}>
                            {React.cloneElement(icon, { size: 28 })}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-[0.25em]">{title}</h2>
                            <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-widest mt-1.5">{subtitle}</p>
                        </div>
                    </div>
                    {/* CLOSE BUTTON */}
                    <button onClick={onClose}
                        className="shrink-0 w-12 h-12 rounded-2xl border flex items-center justify-center font-black transition-all hover:scale-105 active:scale-95"
                        style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ef4444'; (e.currentTarget as HTMLElement).style.borderColor = '#ef4444'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}>
                        <X size={24} strokeWidth={2.5} />
                    </button>
                </div>
                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-10 relative z-10">
                    <div className="max-w-7xl mx-auto space-y-8 pb-20">
                        {children}
                    </div>
                </div>
            </div>
        );
    };

    // ── Chart label ───────────────────────────
    const RADIAN = Math.PI / 180;
    const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
        const r = innerRadius + (outerRadius - innerRadius) * 0.55;
        const x = cx + r * Math.cos(-midAngle * RADIAN);
        const y = cy + r * Math.sin(-midAngle * RADIAN);
        if (percent < 0.07) return null;
        return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" style={{ fontSize: 9, fontWeight: 900 }}>{`${(percent * 100).toFixed(0)}%`}</text>;
    };

    // ── Critical Modal content ─────────────────────
    const CriticalModal = () => {
        const ca = criticalAnalytics;
        return (
            <BaseModal open={showCriticalModal} onClose={() => setShowCriticalModal(false)}
                accentColor="#ef4444" icon={<AlertTriangle size={20} />}
                title="Pièces Critiques — Analyse" subtitle={`${ca.items.length} pièces critiques · Synthèse des risques logistiques`}>

                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Total Critiques', value: ca.items.length, color: '#ef4444' },
                        { label: 'Prêts', value: ca.ready.length, color: '#10b981' },
                        { label: 'Manquants', value: ca.missing.length, color: '#ef4444' },
                        { label: 'Readiness', value: `${ca.readyPct}%`, color: ca.readyPct >= 70 ? '#10b981' : ca.readyPct >= 40 ? '#f59e0b' : '#ef4444' },
                    ].map((k, i) => (
                        <div key={i} className="rounded-xl border border-white/5 bg-slate-900/60 p-4">
                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1.5">{k.label}</p>
                            <p className="text-2xl sm:text-3xl font-black tracking-tighter" style={{ color: k.color }}>{k.value}</p>
                        </div>
                    ))}
                </div>

                {/* Readiness bar */}
                <div className="bg-slate-900/60 border border-white/5 rounded-xl p-4">
                    <div className="flex justify-between mb-2">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Readiness Critique</p>
                        <p className="text-[8px] font-black text-rose-400">{ca.missing.length} manquantes</p>
                    </div>
                    <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-emerald-500 transition-all duration-1000"
                            style={{ width: `${ca.readyPct}%` }} />
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="bg-slate-900/60 border border-white/5 rounded-xl p-5">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-4">Répartition par Type</p>
                        <div className="flex items-center gap-3">
                            <div style={{ width: 140, height: 140, flexShrink: 0 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={ca.byType} cx="50%" cy="50%" innerRadius={38} outerRadius={65}
                                            dataKey="total" labelLine={false} label={renderPieLabel}>
                                            {ca.byType.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 10 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex-1 space-y-2 min-w-0">
                                {ca.byType.map(t => (
                                    <div key={t.name} className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: t.fill }} />
                                            <span className="text-[8px] font-bold text-slate-400 uppercase truncate">{t.name}</span>
                                        </div>
                                        <span className="text-[9px] font-black text-white shrink-0">{t.total} <span className="text-[7px] text-slate-600">({t.ready}✓)</span></span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="bg-slate-900/60 border border-white/5 rounded-xl p-5">
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-4">Répartition par Statut</p>
                        <div className="h-[140px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={ca.statusData} margin={{ top: 5, right: 5, bottom: 5, left: -25 }} barSize={24}>
                                    <CartesianGrid stroke="#ffffff06" strokeDasharray="4 4" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 8, fontWeight: 900 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: '#475569', fontSize: 8 }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 10 }} />
                                    <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                                        {ca.statusData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Missing parts table */}
                {ca.missing.length > 0 && (
                    <div className="border border-rose-500/10 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-rose-500/5 border-b border-rose-500/10 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Pièces Critiques Manquantes ({ca.missing.length})</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead><tr className="bg-black/40">
                                    {['OT', 'Désignation', 'Type', 'Statut', 'Qté', 'Valeur'].map(h => <th key={h} className="px-4 py-3 text-[7px] font-black text-slate-600 uppercase tracking-widest text-left border-b border-white/5">{h}</th>)}
                                </tr></thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {ca.missing.slice(0, 20).map(item => (
                                        <tr key={item.id} className="hover:bg-rose-500/[0.03] transition-colors">
                                            <td className="px-4 py-2.5 text-[9px] font-black text-white font-mono">#{item.OT}</td>
                                            <td className="px-4 py-2.5 text-[9px] text-slate-400 max-w-[160px] truncate">{item.sparePart}</td>
                                            <td className="px-4 py-2.5 text-[9px] font-bold text-amber-500 uppercase">{item.type || 'PDR'}</td>
                                            <td className="px-4 py-2.5">
                                                <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${item.status === 'Inventory Assets' ? 'bg-emerald-500/10 text-emerald-400' : item.status === 'Active Tenders' ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>{item.status || 'Awaiting'}</span>
                                            </td>
                                            <td className="px-4 py-2.5 text-[9px] font-black text-white tabular-nums">{item.qty}</td>
                                            <td className="px-4 py-2.5 text-[9px] font-black text-sky-400 tabular-nums">{(item.totalPrice || 0).toLocaleString('fr-FR')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {ca.missing.length > 20 && <p className="px-4 py-3 text-[7px] font-bold text-slate-700 uppercase tracking-widest border-t border-white/5">+ {ca.missing.length - 20} autres</p>}
                        </div>
                    </div>
                )}
            </BaseModal>
        );
    };

    // ── Status Card Analytics Modal ─────────────────────
    const StatusCardModal = () => {
        const card = logisticsCards.find(c => c.id === statusCardModal);
        if (!card) return null;
        const items = pdrItems.filter(i =>
            card.id === 'Awaiting Process' ? (!i.status || i.status === 'Awaiting Process') : i.status === card.id
        );
        const readyItems = items.filter(i => i.readiness === 1);
        const missingItems = items.filter(i => i.readiness === 0);
        const readyPct = items.length > 0 ? Math.round((readyItems.length / items.length) * 100) : 0;

        // By type
        const typeColors = ['#0ea5e9', '#f59e0b', '#a78bfa', '#10b981', '#f97316', '#ec4899'];
        const byType: Record<string, number> = {};
        items.forEach(i => { const t = i.type || 'PDR'; byType[t] = (byType[t] || 0) + 1; });
        const typeData = Object.entries(byType).map(([name, value], idx) => ({ name, value, fill: typeColors[idx % typeColors.length] }));

        const totalValue = items.reduce((s, i) => s + (i.totalPrice || 0), 0);
        const criticalInStatus = items.filter(i => i.criticity === 1).length;

        const isInventory = card.id === 'Inventory Assets';

        return (
            <BaseModal open={!!statusCardModal} onClose={() => setStatusCardModal(null)}
                accentColor={card.accent} icon={card.icon}
                title={`${card.label} — Analyse Exclusive`}
                subtitle={`${items.length} articles · Dashboard Logistique`}>

                {/* KPIs */}
                <div className={`grid grid-cols-1 md:grid-cols-2 ${isInventory ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
                    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 shadow-xl relative overflow-hidden group hover:border-white/10 transition-all cursor-default">
                        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, #fff3, transparent)` }} />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Total Articles</p>
                        <p className="text-4xl font-black tracking-tighter text-white">{items.length}</p>
                    </div>

                    {isInventory && (
                        <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 shadow-xl relative overflow-hidden group hover:border-white/10 transition-all cursor-default">
                            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${readyPct >= 70 ? '#10b981' : readyPct >= 40 ? '#f59e0b' : '#ef4444'}80, transparent)` }} />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Readiness Globale</p>
                            <p className="text-4xl font-black tracking-tighter" style={{ color: readyPct >= 70 ? '#10b981' : readyPct >= 40 ? '#f59e0b' : '#ef4444' }}>{readyPct}%</p>
                        </div>
                    )}

                    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 shadow-xl relative overflow-hidden group hover:border-white/10 transition-all cursor-default">
                        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${card.accent}80, transparent)` }} />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Valorisation Globale</p>
                        <p className="text-4xl font-black tracking-tighter truncate" style={{ color: card.accent }}>{totalValue.toLocaleString('fr-FR')}</p>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-6 shadow-xl relative overflow-hidden group hover:border-white/10 transition-all cursor-default">
                        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${criticalInStatus > 0 ? '#ef4444' : '#475569'}80, transparent)` }} />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Articles Critiques</p>
                        <p className="text-4xl font-black tracking-tighter" style={{ color: criticalInStatus > 0 ? '#ef4444' : '#64748b' }}>{criticalInStatus}</p>
                    </div>
                </div>

                {/* Readiness bar - ONLY for Inventory Assets */}
                {isInventory && (
                    <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-6 shadow-xl relative animate-in slide-in-from-bottom-2 duration-500">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Readiness Distribution Dashboard</p>
                            <div className="flex gap-4">
                                <span className="text-[10px] font-black text-white bg-white/5 px-3 py-1 rounded-full"><span className="text-emerald-400 mr-1">{readyItems.length}</span> Prêts</span>
                                <span className="text-[10px] font-black text-white bg-white/5 px-3 py-1 rounded-full"><span className="text-rose-400 mr-1">{items.length - readyItems.length}</span> Manquants</span>
                            </div>
                        </div>
                        <div className="h-4 bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div className="h-full rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${readyPct}%`, backgroundColor: card.accent, boxShadow: `0 0 20px ${card.accent}80` }} />
                        </div>
                    </div>
                )}

                {/* Charts & Manifest */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
                    {/* Type donut */}
                    <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-8 shadow-xl flex flex-col group hover:border-white/10 transition-all">
                        <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
                            <Layers size={18} className="text-slate-500" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Répartition par Catégorie</p>
                        </div>
                        {typeData.length > 0 ? (
                            <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-10">
                                <div style={{ width: 220, height: 220, flexShrink: 0 }} className="relative drop-shadow-2xl">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                                                dataKey="value" labelLine={false} label={renderPieLabel} stroke="rgba(255,255,255,0.05)" strokeWidth={3}>
                                                {typeData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                                            </Pie>
                                            <Tooltip cursor={false} contentStyle={{ background: '#0a0f1a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 11, fontWeight: 900, color: '#fff', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex-1 w-full space-y-4">
                                    {typeData.map(t => (
                                        <div key={t.name} className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] transition-colors shadow-sm">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ background: t.fill, boxShadow: `0 0 10px ${t.fill}80` }} />
                                                <span className="text-[11px] font-bold text-slate-300 uppercase truncate tracking-wide">{t.name}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-sm font-black text-white block leading-tight">{t.value}</span>
                                                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{Math.round((t.value / items.length) * 100)}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : <div className="flex-1 flex flex-col items-center justify-center py-20"><p className="text-xs italic text-slate-600 uppercase font-black tracking-widest bg-black/20 px-6 py-3 rounded-xl border border-white/5">Aucune donnée disponible</p></div>}
                    </div>

                    {/* Financial Manifest */}
                    <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-8 shadow-xl flex flex-col group hover:border-white/10 transition-all">
                        <div className="flex items-center gap-3 mb-8 border-b border-white/5 pb-4">
                            <ShoppingCart size={18} className="text-slate-500" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Financial Manifest Breakdown</p>
                        </div>
                        <div className="flex-1 flex flex-col">
                            <div className="flex-1 space-y-3 overflow-y-auto pr-2" style={{ maxHeight: '250px' }}>
                                {card.budget.byType.map(([type, val], index) => (
                                    <div key={type} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.015] hover:bg-white/[0.04] transition-all group/item"
                                        style={{ animationDelay: `${index * 50}ms` }}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-2 h-2 rounded-full bg-slate-700 group-hover/item:bg-sky-500 group-hover/item:shadow-[0_0_10px_#0ea5e9] transition-all duration-300" />
                                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">{type}</span>
                                        </div>
                                        <span className="text-sm font-black tabular-nums transition-colors" style={{ color: card.accent }}>{fmtPrice(val, currentSymbol)}</span>
                                    </div>
                                ))}
                                {card.budget.byType.length === 0 && (
                                    <div className="py-20 flex justify-center">
                                        <p className="text-[10px] italic text-slate-600 uppercase font-black tracking-widest bg-black/20 px-6 py-3 rounded-xl border border-white/5">Aucune valorisation</p>
                                    </div>
                                )}
                            </div>
                            <div className="pt-8 mt-6 border-t border-white/10 flex items-center justify-between bg-gradient-to-t from-white/[0.02] to-transparent -mx-8 px-8 -mb-8 pb-8 rounded-b-3xl">
                                <div>
                                    <span className="text-xs font-black text-white uppercase tracking-[0.2em] block mb-1">Total Budget Global</span>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Valeur cumulée estimée (TTC)</span>
                                </div>
                                <span className="text-3xl font-black tabular-nums scale-[1.05] origin-right transition-transform" style={{ color: card.accent, textShadow: `0 0 30px ${card.accent}40` }}>
                                    {fmtPrice(card.budget.total, currentSymbol)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </BaseModal>
        );
    };

    const currencies = [
        { code: 'MAD', symbol: 'MAD' },
        { code: 'USD', symbol: '$' },
        { code: 'EUR', symbol: '€' },
        { code: 'GBP', symbol: '£' }
    ];
    const currentSymbol = currencies.find(c => c.code === selectedCurrency)?.symbol || 'MAD';

    // ── KPI Stats ──────────────────────────────
    const stats = useMemo(() => {
        const total = pdrItems.length;
        const ready = pdrItems.filter(i => i.readiness === 1).length;
        const missing = total - ready;
        const totalPrice = pdrItems.reduce((s, i) => s + (i.totalPrice || 0), 0);
        const readyPct = total > 0 ? Math.round((ready / total) * 100) : 0;
        const criticalItems = pdrItems.filter(i => i.criticity === 1 && i.readiness === 0).length;
        const totalCritical = pdrItems.filter(i => i.criticity === 1).length;
        return { total, ready, missing, totalPrice, readyPct, criticalItems, totalCritical };
    }, [pdrItems]);

    // ── Logistics Cards ────────────────────────
    const logisticsCards = useMemo(() => {
        const getItems = (status: string) =>
            status === 'Awaiting Process'
                ? pdrItems.filter(i => !i.status || i.status === 'Awaiting Process')
                : pdrItems.filter(i => i.status === status);

        const getBudget = (status: string) => {
            const items = getItems(status);
            const total = items.reduce((s, i) => s + (i.totalPrice || 0), 0);
            const byType: Record<string, number> = {};
            items.forEach(i => {
                const t = i.type || 'Standard';
                byType[t] = (byType[t] || 0) + (i.totalPrice || 0);
            });
            return { total, byType: Object.entries(byType).sort((a, b) => b[1] - a[1]) };
        };

        return [
            {
                id: 'Inventory Assets',
                label: 'Inventory Assets',
                sublabel: 'Stock disponible',
                count: pdrItems.filter(i => i.status === 'Inventory Assets').length,
                ots: new Set(pdrItems.filter(i => i.status === 'Inventory Assets').map(i => i.OT).filter(Boolean)).size,
                budget: getBudget('Inventory Assets'),
                color: 'emerald' as const,
                icon: <Package size={18} />,
                accent: '#10b981',
                bg: 'from-emerald-500/10 to-transparent',
                border: 'border-emerald-500/20',
                ring: 'ring-emerald-500/20',
            },
            {
                id: 'Active Tenders',
                label: 'Active Tenders',
                sublabel: 'En cours d\'appel d\'offres',
                count: pdrItems.filter(i => i.status === 'Active Tenders').length,
                ots: new Set(pdrItems.filter(i => i.status === 'Active Tenders').map(i => i.OT).filter(Boolean)).size,
                budget: getBudget('Active Tenders'),
                color: 'blue' as const,
                icon: <Activity size={18} />,
                accent: '#0ea5e9',
                bg: 'from-blue-500/10 to-transparent',
                border: 'border-blue-500/20',
                ring: 'ring-blue-500/20',
            },
            {
                id: 'Awaiting Process',
                label: 'Awaiting Process',
                sublabel: 'En attente de traitement',
                count: pdrItems.filter(i => !i.status || i.status === 'Awaiting Process').length,
                ots: new Set(pdrItems.filter(i => !i.status || i.status === 'Awaiting Process').map(i => i.OT).filter(Boolean)).size,
                budget: getBudget('Awaiting Process'),
                color: 'amber' as const,
                icon: <Clock size={18} />,
                accent: '#f59e0b',
                bg: 'from-amber-500/10 to-transparent',
                border: 'border-amber-500/20',
                ring: 'ring-amber-500/20',
            }
        ];
    }, [pdrItems]);

    // ── S-Curve (optimised) ────────────────────
    const scurveData = useMemo(() => {
        // Pre-index task start dates by OT
        const otMap = new Map<string, number>();
        tasks.forEach(t => {
            if (!t.OT || !t['START DATE']) return;
            const ts = parseFlexDate(t['START DATE']);
            if (ts) otMap.set(String(t.OT).trim(), ts);
        });

        // Enrich PDR items with parsed timestamps
        const enriched = pdrItems.map(item => {
            const cleanOT = String(item.OT || '').trim();
            let taskStart = otMap.get(cleanOT);
            if (!taskStart && cleanOT) {
                for (const [ot, ts] of otMap) {
                    if (ot.includes(cleanOT) || cleanOT.includes(ot)) { taskStart = ts; break; }
                }
            }
            return { ...item, taskStartTs: taskStart ?? null, deliveryTs: parseFlexDate(item.dueDate) };
        });

        const allTs: number[] = [];
        enriched.forEach(i => {
            if (i.taskStartTs) allTs.push(i.taskStartTs);
            if (i.deliveryTs) allTs.push(i.deliveryTs);
        });
        if (allTs.length === 0) return [];

        const minDate = Math.min(...allTs);
        const maxDate = Math.max(...allTs);
        const resMs = timeResolution * 3_600_000;
        const timeline: number[] = [];
        for (let t = minDate; t <= maxDate + resMs; t += resMs) timeline.push(t);
        const safe = timeline.slice(0, 800);

        return safe.map(ts => {
            const dateStr = timeResolution < 24
                ? new Date(ts).toLocaleString('fr-FR', { day: '2-digit', hour: '2-digit' }) + 'h'
                : new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

            // ALL linked items at this point in time (demand)
            const linked = enriched.filter(i => i.taskStartTs !== null && i.taskStartTs <= ts);
            const planned = enriched.filter(i => i.deliveryTs !== null && i.deliveryTs <= ts).length;

            const inventory = linked.filter(i =>
                i.readiness === 1 || (i.status && (i.status.includes('Inventory') || i.status.includes('Assets')))
            ).length;
            const tender = linked.filter(i =>
                i.readiness !== 1 && i.status && (i.status.includes('Tender') || i.status.includes('Active'))
            ).length;
            const awaiting = linked.filter(i =>
                i.readiness !== 1 && (!i.status || i.status.includes('Awaiting') || i.status.includes('Process') || i.status.includes('Codif'))
            ).length;
            const required = linked.length;
            // readyCount = items with readiness===1 (strict — reflects live toggle)
            const readyCount = linked.filter(i => i.readiness === 1).length;
            const shortage = required > planned ? required - planned : 0;

            return {
                ts, dateLabel: dateStr,
                'Inventory Assets': inventory,
                'Active Tenders': tender,
                'Awaiting Process': awaiting,
                'Planned Supply': planned,
                'Total Demand': required,
                'Ready Parts': readyCount,
                Shortage: shortage,
                inventory, tender, awaiting, required, planned, readyCount
            };
        });
    }, [pdrItems, tasks, timeResolution]);

    const uniqueTypes = useMemo(() => {
        const t = new Set(pdrItems.map(i => i.type).filter(Boolean));
        return ['all', ...Array.from(t)];
    }, [pdrItems]);

    const uniqueStatuses = useMemo(() => {
        const s = new Set(pdrItems.map(i => i.status || 'Awaiting Process'));
        return ['all', ...Array.from(s)];
    }, [pdrItems]);

    const filteredItems = useMemo(() => pdrItems.filter(item => {
        const search = searchTerm.toLowerCase();
        const matchSearch = String(item.OT).toLowerCase().includes(search) || item.sparePart.toLowerCase().includes(search);
        const matchStatus = statusFilter === 'all' || (statusFilter === 'ready' ? item.readiness === 1 : item.readiness === 0);
        const matchLog = logisticsFilter === 'all' ||
            (logisticsFilter === 'Awaiting Process' ? (!item.status || item.status === 'Awaiting Process') : item.status === logisticsFilter);
        const matchType = typeFilter === 'all' || item.type === typeFilter;
        const matchCriticity = criticityFilter === 'all' || item.criticity === 1;
        return matchSearch && matchStatus && matchLog && matchType && matchCriticity;
    }), [pdrItems, searchTerm, statusFilter, logisticsFilter, typeFilter, criticityFilter]);

    const handleUpdateItem = (id: string, updates: Partial<PDRItem>) => {
        onUpdatePDR(pdrItems.map(item => {
            if (item.id !== id) return item;
            const n = { ...item, ...updates };
            if (updates.qty !== undefined || updates.priceU !== undefined)
                n.totalPrice = (n.qty || 0) * (n.priceU || 0);
            return n;
        }));
    };

    const openCommentModal = (item: PDRItem) => { setActiveCommentModal(item); setTempComment(item.comment || ''); };
    const handleSaveComment = () => { if (activeCommentModal) { handleUpdateItem(activeCommentModal.id, { comment: tempComment }); setActiveCommentModal(null); } };

    // ── Bulk helpers ───────────────────────────
    const toggleSelect = (id: string) => setSelectedIds(prev => {
        const n = new Set(prev);
        n.has(id) ? n.delete(id) : n.add(id);
        return n;
    });
    const toggleSelectAll = () => {
        if (selectedIds.size === filteredItems.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(filteredItems.map(i => i.id)));
    };
    const applyBulkStatus = () => {
        onUpdatePDR(pdrItems.map(i => selectedIds.has(i.id) ? { ...i, status: bulkStatus as any } : i));
        setSelectedIds(new Set());
    };
    const applyBulkReadiness = () => {
        onUpdatePDR(pdrItems.map(i => selectedIds.has(i.id) ? { ...i, readiness: bulkReadiness } : i));
        setSelectedIds(new Set());
    };

    // ── Custom Tooltip ─────────────────────────
    const SCurveTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null;
        const d = payload[0].payload;
        const delta = d.planned - d.required;
        const ok = delta >= 0;
        return (
            <div className="bg-[#0a0f1a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5 min-w-[280px] animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.25em]">Période</p>
                        <p className="text-sm font-black text-white mt-0.5">{label}</p>
                    </div>
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border ${ok ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'}`}>
                        {ok ? '▲' : '▼'} {Math.abs(delta)} UNITS
                    </span>
                </div>

                {/* Supply line */}
                <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-2.5 mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-orange-400 rounded-sm" style={{ clipPath: 'none' }} />
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Planned Capacity</span>
                    </div>
                    <span className="text-base font-black text-orange-400 tabular-nums">{d.planned}</span>
                </div>

                {/* Status breakdown */}
                <div className="space-y-1.5 mb-3">
                    {[
                        { label: 'Inventory Assets', val: d.inventory, color: '#10b981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400' },
                        { label: 'Active Tenders', val: d.tender, color: '#0ea5e9', bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400' },
                        { label: 'Awaiting Process', val: d.awaiting, color: '#f59e0b', bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400' },
                    ].map(row => (
                        <div key={row.label} className={`flex items-center justify-between rounded-lg px-3 py-2 border ${row.bg} ${row.border}`}>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color, boxShadow: `0 0 6px ${row.color}80` }} />
                                <span className="text-[10px] font-bold text-slate-300 uppercase">{row.label}</span>
                            </div>
                            <span className={`text-sm font-black tabular-nums ${row.text}`}>{row.val}</span>
                        </div>
                    ))}
                </div>

                {/* Execution demand */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Execution Demand</p>
                        <p className="text-[8px] text-slate-700 uppercase font-bold">Cumulative</p>
                    </div>
                    <span className="text-xl font-black text-white tabular-nums">{d.required}</span>
                </div>

                {d.Shortage > 0 && (
                    <div className="mt-3 flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2">
                        <AlertTriangle size={12} className="text-rose-400 shrink-0" />
                        <span className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Critical Shortage: {d.Shortage} units</span>
                    </div>
                )}
            </div>
        );
    };

    // ── Critical Analytics ────────────────────────
    const criticalAnalytics = useMemo(() => {
        const items = pdrItems.filter(i => i.criticity === 1);
        const ready = items.filter(i => i.readiness === 1);
        const missing = items.filter(i => i.readiness === 0);

        // By type
        const byType: Record<string, { total: number; ready: number; missing: number; value: number }> = {};
        items.forEach(i => {
            const t = i.type || 'PDR';
            if (!byType[t]) byType[t] = { total: 0, ready: 0, missing: 0, value: 0 };
            byType[t].total++;
            byType[t].value += i.totalPrice || 0;
            if (i.readiness === 1) byType[t].ready++; else byType[t].missing++;
        });

        // By status
        const statusMap: Record<string, number> = { 'Inventory Assets': 0, 'Active Tenders': 0, 'Awaiting Process': 0 };
        items.forEach(i => {
            const s = i.status || 'Awaiting Process';
            if (statusMap[s] !== undefined) statusMap[s]++;
        });

        const typeColors = ['#0ea5e9', '#f59e0b', '#a78bfa', '#10b981', '#f97316', '#ec4899'];
        const typeData = Object.entries(byType).map(([name, v], idx) => ({
            name, ...v, fill: typeColors[idx % typeColors.length]
        }));

        const statusData = [
            { name: 'Inventory', value: statusMap['Inventory Assets'], fill: '#10b981' },
            { name: 'Active Tenders', value: statusMap['Active Tenders'], fill: '#0ea5e9' },
            { name: 'Awaiting', value: statusMap['Awaiting Process'], fill: '#f59e0b' },
        ];

        const totalValue = items.reduce((s, i) => s + (i.totalPrice || 0), 0);
        const readyPct = items.length > 0 ? Math.round((ready.length / items.length) * 100) : 0;

        return { items, ready, missing, byType: typeData, statusData, totalValue, readyPct };
    }, [pdrItems]);


    const StatusPill = ({ status }: { status?: string }) => {
        const s = status || 'Awaiting Process';
        const cfg =
            s === 'Inventory Assets' ? { cls: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400', dot: 'bg-emerald-500' } :
                s === 'Active Tenders' ? { cls: 'bg-blue-500/10 border-blue-500/20 text-blue-400', dot: 'bg-blue-500' } :
                    { cls: 'bg-amber-500/10 border-amber-500/20 text-amber-500', dot: 'bg-amber-500 animate-pulse' };
        return (
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${cfg.cls}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {s}
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 w-full p-4 sm:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <CriticalModal />
            <StatusCardModal />

            {/* ══ KPI Command Bar ══════════════════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {
                        label: 'Total PDR', value: stats.total, unit: 'Pièces',
                        sub: `${stats.ready} Ready · ${stats.missing} Missing`,
                        color: 'text-blue-400', accent: '#3b82f6', icon: <Layers size={16} />,
                    },
                    {
                        label: 'Readiness Rate', value: `${stats.readyPct}%`, unit: 'Global',
                        sub: `${stats.ready} unités prêtes`,
                        color: stats.readyPct >= 70 ? 'text-emerald-400' : stats.readyPct >= 40 ? 'text-amber-400' : 'text-rose-400',
                        accent: stats.readyPct >= 70 ? '#10b981' : stats.readyPct >= 40 ? '#f59e0b' : '#ef4444',
                        icon: <TrendingUp size={16} />,
                        bar: true, barVal: stats.readyPct
                    },
                    {
                        label: 'Valorisation Stock', value: stats.totalPrice.toLocaleString('fr-FR'), unit: currentSymbol,
                        sub: `${pdrItems.filter(i => i.totalPrice > 0).length} articles financés`,
                        color: 'text-amber-400', accent: '#f59e0b', icon: <ShoppingCart size={16} />,
                    },
                    {
                        label: 'Articles Critiques', value: stats.criticalItems, unit: 'Manquants',
                        sub: `${stats.totalCritical} pièces critiques au total`,
                        color: stats.criticalItems > 0 ? 'text-rose-400' : 'text-emerald-400', accent: stats.criticalItems > 0 ? '#ef4444' : '#10b981',
                        icon: <AlertTriangle size={16} />,
                        clickable: true,
                    },
                ].map((kpi, idx) => (
                    <div key={idx}
                        onClick={() => { if ((kpi as any).clickable) setShowCriticalModal(true); }}
                        className={`relative bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5 overflow-hidden group hover:border-white/10 transition-all duration-300 ${(kpi as any).clickable ? 'cursor-pointer hover:-translate-y-1' : ''} ${(kpi as any).clickable ? 'hover:border-rose-500/20' : ''}`}>
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        <div className="flex items-start justify-between mb-3">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{kpi.label}</span>
                            <div className={`${kpi.color} opacity-60`}>{kpi.icon}</div>
                        </div>
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className={`text-3xl font-black tracking-tighter ${kpi.color}`}>{kpi.value}</span>
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{kpi.unit}</span>
                        </div>
                        {(kpi as any).bar && (
                            <div className="my-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${(kpi as any).barVal}%`, backgroundColor: kpi.accent, boxShadow: `0 0 10px ${kpi.accent}60` }} />
                            </div>
                        )}
                        <span className="text-[9px] text-slate-600 font-bold uppercase">{kpi.sub}</span>
                        {(kpi as any).clickable && (
                            <div className="absolute bottom-3 right-3 text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border bg-rose-500/10 border-rose-500/20 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-all">
                                Voir l&apos;analyse
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* ══ Logistics Status Cards ═══════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {logisticsCards.map(card => {
                    const isActive = logisticsFilter === card.id;
                    const pct = stats.total > 0 ? Math.round((card.count / stats.total) * 100) : 0;
                    return (
                        <div
                            key={card.id}
                            onClick={() => {
                                setLogisticsFilter(prev => prev === card.id ? 'all' : card.id);
                            }}
                            className={`relative bg-slate-900/60 backdrop-blur-xl border rounded-2xl p-6 shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1 group overflow-hidden ${logisticsFilter === card.id ? `${card.border} ring-2 ${card.ring} bg-white/[0.04]` : 'border-white/5 hover:border-white/10'}`}
                        >
                            {/* Glow */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                            <div className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${card.accent}60, transparent)` }} />

                            <div className="relative z-10">
                                {/* Header row */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${card.border} bg-black/30`} style={{ color: card.accent }}>
                                            {card.icon}
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">{card.label}</p>
                                            <p className="text-[8px] text-slate-700 font-bold italic">{card.sublabel}</p>
                                        </div>
                                    </div>
                                    {isActive && (
                                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-in zoom-in duration-200">
                                            <Check size={10} strokeWidth={4} className="text-black" />
                                        </div>
                                    )}
                                </div>

                                {/* Big count */}
                                <div className="flex items-baseline gap-2 mb-3">
                                    <span className="text-4xl font-black text-white tracking-tighter" style={{ textShadow: `0 0 30px ${card.accent}40` }}>{card.count}</span>
                                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">PDR · {pct}%</span>
                                </div>

                                {/* Progress bar */}
                                <div className="h-1 bg-slate-800/80 rounded-full overflow-hidden mb-4">
                                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: card.accent, boxShadow: `0 0 8px ${card.accent}80` }} />
                                </div>

                                {/* Budget breakdown */}
                                <div className="space-y-1.5">
                                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2">Financial Manifest</p>
                                    {card.budget.byType.slice(0, 3).map(([type, val]) => (
                                        <div key={type} className="flex justify-between items-center">
                                            <span className="text-[9px] text-slate-500 font-bold truncate pr-2">{type}</span>
                                            <span className="text-[9px] font-black tabular-nums" style={{ color: card.accent }}>{fmtPrice(val, currentSymbol)}</span>
                                        </div>
                                    ))}
                                    {card.budget.byType.length === 0 && (
                                        <span className="text-[9px] italic text-slate-700">Aucune donnée financière</span>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Total Budget</span>
                                    <span className="text-[11px] font-black" style={{ color: card.accent }}>{fmtPrice(card.budget.total, currentSymbol)}</span>
                                </div>
                                <div className="mt-1 flex justify-between items-center">
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Missions (OT)</span>
                                    <span className="text-[11px] font-black text-white">{card.ots} unique</span>
                                </div>
                                {/* Analytics CTA */}
                                <button
                                    onClick={e => { e.stopPropagation(); setStatusCardModal(card.id); }}
                                    className="mt-4 w-full py-2 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 hover:opacity-90 active:scale-95"
                                    style={{ background: `${card.accent}18`, borderColor: `${card.accent}40`, color: card.accent }}>
                                    <BarChart3 size={11} /> Voir l’analyse détaillée
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ══ S-Curve ══════════════════════════════ */}
            <div className="relative bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl overflow-hidden">
                {/* Top accent bar */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-500/40 to-transparent" />

                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                                <BarChart3 size={15} />
                            </div>
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Ready Assets Accumulation</h3>
                        </div>
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest ml-11">
                            S-Curve · Spare Parts Availability vs. Execution Requirements
                        </p>
                    </div>

                    {/* Resolution buttons */}
                    <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl p-1">
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-2">Résolution:</span>
                        {[1, 3, 6, 12, 24].map(h => (
                            <button
                                key={h}
                                onClick={() => setTimeResolution(h)}
                                className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${timeResolution === h ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}
                            >
                                {h}H
                            </button>
                        ))}
                    </div>
                </div>

                {/* Legend strips */}
                <div className="flex flex-wrap gap-4 mb-6 pl-2">
                    {[
                        { label: 'Total Demand', color: '#ef4444', dashed: true },
                        { label: 'Ready Parts', color: '#10b981', dashed: true },
                        { label: 'Inventory Assets', color: '#10b981', area: true },
                        { label: 'Active Tenders', color: '#0ea5e9', area: true },
                        { label: 'Awaiting Process', color: '#f59e0b', area: true },
                        { label: 'Critical Shortage', color: '#ef4444', area: true },
                    ].map(l => (
                        <div key={l.label} className="flex items-center gap-1.5">
                            <div className="relative flex items-center" style={{ width: 24, height: 10 }}>
                                {l.dashed
                                    ? <div style={{ borderTop: `2.5px solid ${l.color}`, width: 24 }} />
                                    : <div style={{ width: 12, height: 8, backgroundColor: `${l.color}30`, border: `1px solid ${l.color}60`, borderRadius: 2 }} />
                                }
                            </div>
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{l.label}</span>
                        </div>
                    ))}
                </div>

                {/* Chart */}
                <div className="h-[360px]">
                    {scurveData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={scurveData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                                <defs>
                                    {[
                                        { id: 'inv', color: '#10b981' },
                                        { id: 'tend', color: '#0ea5e9' },
                                        { id: 'wait', color: '#f59e0b' },
                                    ].map(g => (
                                        <linearGradient key={g.id} id={`sc_${g.id}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={g.color} stopOpacity={0.35} />
                                            <stop offset="95%" stopColor={g.color} stopOpacity={0.03} />
                                        </linearGradient>
                                    ))}
                                </defs>
                                <CartesianGrid stroke="#ffffff08" strokeDasharray="4 4" vertical={false} />
                                <XAxis
                                    dataKey="dateLabel"
                                    tick={{ fill: '#475569', fontSize: 9, fontWeight: 900 }}
                                    axisLine={false} tickLine={false}
                                    interval="preserveStartEnd"
                                />
                                <YAxis
                                    tick={{ fill: '#475569', fontSize: 9 }}
                                    axisLine={false} tickLine={false}
                                />
                                <Tooltip content={<SCurveTooltip />} cursor={{ stroke: '#ffffff10', strokeWidth: 1 }} />

                                {/* Background stacked areas – subdued context */}
                                <Area type="monotone" dataKey="Inventory Assets" stackId="1" stroke="#10b981" strokeWidth={0}
                                    fillOpacity={1} fill="url(#sc_inv)" isAnimationActive animationDuration={1200} legendType="none" />
                                <Area type="monotone" dataKey="Active Tenders" stackId="1" stroke="#0ea5e9" strokeWidth={0}
                                    fillOpacity={1} fill="url(#sc_tend)" isAnimationActive animationDuration={1500} legendType="none" />
                                <Area type="monotone" dataKey="Awaiting Process" stackId="1" stroke="#f59e0b" strokeWidth={0}
                                    fillOpacity={1} fill="url(#sc_wait)" isAnimationActive animationDuration={1800} legendType="none" />

                                {/* Critical shortage zone */}
                                {scurveData.some(d => d.Shortage > 0) && (
                                    <Area name="Critical Shortage" type="stepAfter" dataKey="Shortage"
                                        stroke="#ef444440" strokeWidth={1} fill="#ef4444" fillOpacity={0.08} />
                                )}

                                {/* PRIMARY LINES: Demand (red) and Readiness (green) */}
                                <Line name="Total Demand" type="monotone" dataKey="Total Demand"
                                    stroke="#ef4444" strokeWidth={3} dot={false}
                                    activeDot={{ r: 6, fill: '#ef4444', stroke: '#ef444460', strokeWidth: 4 }}
                                    animationDuration={2000} />
                                <Line name="Ready Parts" type="monotone" dataKey="Ready Parts"
                                    stroke="#10b981" strokeWidth={3} dot={false}
                                    activeDot={{ r: 6, fill: '#10b981', stroke: '#10b98160', strokeWidth: 4 }}
                                    animationDuration={2200} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-700">
                            <div className="w-10 h-10 rounded-xl border border-slate-800 flex items-center justify-center animate-pulse">
                                <BarChart3 size={20} className="opacity-30" />
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-[0.3em]">Initialisation des données S-Curve...</p>
                        </div>
                    )}
                </div>

                {/* Bottom insight strip — computed LIVE from pdrItems, not stale scurveData */}
                {(() => {
                    const totalReady = pdrItems.filter(i => i.readiness === 1).length;
                    const totalItems = pdrItems.length;
                    const missing = totalItems - totalReady;
                    const readyPct = totalItems > 0 ? Math.round((totalReady / totalItems) * 100) : 0;
                    const ok = missing === 0;
                    return (
                        <div className={`mt-6 px-5 py-3 rounded-xl border flex items-center justify-between gap-3 ${ok ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'}`}>
                            <div className="flex items-center gap-3">
                                {ok ? <TrendingUp size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-rose-400" />}
                                <span className={`text-[10px] font-black uppercase tracking-widest ${ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {ok
                                        ? `✓ Tous les articles sont prêts — Readiness 100%`
                                        : `Déficit readiness : ${missing} articles manquants (${readyPct}% prêts)`
                                    }
                                </span>
                            </div>
                            <div className="flex items-center gap-4 shrink-0">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-[9px] font-black text-emerald-400">{totalReady} READY</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                    <span className="text-[9px] font-black text-rose-400">{missing} MISSING</span>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* ══ Filters bar ══════════════════════════ */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4 flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="relative flex-1 min-w-[220px]">
                    <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Recherche OT ou désignation PDR..."
                        className="w-full bg-black/30 border border-white/5 rounded-xl py-2.5 pl-11 pr-4 text-[10px] font-bold text-white uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-sky-500/20 placeholder-slate-700 transition-all" />
                </div>

                {/* Ready filter */}
                <div className="flex bg-black/30 p-1 rounded-xl border border-white/5">
                    {(['all', 'ready', 'not-ready'] as const).map(f => (
                        <button key={f} onClick={() => setStatusFilter(f)}
                            className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === f ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-600 hover:text-slate-400'}`}>
                            {f === 'all' ? 'Tous' : f === 'ready' ? 'Prêt' : 'Manquant'}
                        </button>
                    ))}
                </div>

                {/* Statut dropdown */}
                <div className="flex items-center gap-2 bg-black/30 border border-white/5 rounded-xl px-3 py-2">
                    <Filter size={10} className="text-slate-600" />
                    <select value={logisticsFilter} onChange={e => setLogisticsFilter(e.target.value)}
                        className="bg-transparent border-none text-[10px] font-black text-sky-400 uppercase tracking-widest focus:ring-0 appearance-none cursor-pointer">
                        {uniqueStatuses.map(s => (
                            <option key={s} value={s} className="bg-slate-900 text-slate-300">
                                {s === 'all' ? 'Tous les statuts' : s}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Type dropdown */}
                <div className="flex items-center gap-2 bg-black/30 border border-white/5 rounded-xl px-3 py-2">
                    <Filter size={10} className="text-slate-600" />
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                        className="bg-transparent border-none text-[10px] font-black text-amber-500 uppercase tracking-widest focus:ring-0 appearance-none cursor-pointer">
                        {uniqueTypes.map(t => (
                            <option key={t} value={t} className="bg-slate-900 text-slate-300">
                                {t === 'all' ? 'Tous les types' : t}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Criticity filter toggle */}
                <button
                    onClick={() => setCriticityFilter(prev => prev === 'critical' ? 'all' : 'critical')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${criticityFilter === 'critical' ? 'bg-rose-500 border-rose-400 text-white shadow-lg shadow-rose-500/30 animate-pulse' : 'bg-black/30 border-white/5 text-slate-500 hover:border-rose-500/30 hover:text-rose-400'}`}>
                    <AlertTriangle size={11} />
                    {criticityFilter === 'critical' ? '⚠ CRITIQUE ACTIF' : 'Critiques seulement'}
                    {criticityFilter === 'all' && stats.criticalItems > 0 && (
                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[8px] flex items-center justify-center font-black">{stats.criticalItems}</span>
                    )}
                </button>

                {/* Currency */}
                <div className="flex gap-1 ml-auto">
                    {currencies.map(c => (
                        <button key={c.code} onClick={() => setSelectedCurrency(c.code)}
                            className={`w-9 h-9 rounded-lg text-[9px] font-black transition-all flex items-center justify-center border ${selectedCurrency === c.code ? 'bg-sky-600 border-sky-400 text-white shadow-lg shadow-sky-500/20' : 'bg-white/5 border-white/5 text-slate-600 hover:bg-white/10'}`}>
                            {c.symbol}
                        </button>
                    ))}
                </div>
            </div>

            {/* ══ PDR Table ════════════════════════════ */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl overflow-hidden">
                {/* Table header info */}
                <div className="px-6 py-4 border-b border-white/5 flex flex-wrap items-center gap-4 justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-sky-500 shadow-[0_0_8px_#0ea5e9]" />
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em]">
                            Matrice PDR — {filteredItems.length} articles affichés sur {pdrItems.length}
                        </span>
                    </div>

                    {/* Bulk action bar */}
                    {selectedIds.size > 0 && (
                        <div className="flex flex-wrap items-center gap-3 animate-in slide-in-from-top-2 duration-200">
                            <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest bg-sky-500/10 border border-sky-500/20 px-3 py-1.5 rounded-lg">
                                {selectedIds.size} sélectionné(s)
                            </span>
                            {/* Bulk Readiness */}
                            <div className="flex items-center gap-1 bg-black/40 border border-white/5 rounded-xl p-1">
                                <select value={bulkReadiness} onChange={e => setBulkReadiness(Number(e.target.value))}
                                    className="bg-transparent border-none text-[9px] font-black text-emerald-400 uppercase pl-2 pr-1 focus:ring-0 appearance-none cursor-pointer">
                                    <option value={1} className="bg-slate-900">Ready</option>
                                    <option value={0} className="bg-slate-900">Missing</option>
                                </select>
                                <button onClick={applyBulkReadiness}
                                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black text-[9px] font-black uppercase rounded-lg transition-all active:scale-95">
                                    Appliquer Readiness
                                </button>
                            </div>
                            {/* Bulk Status */}
                            <div className="flex items-center gap-1 bg-black/40 border border-white/5 rounded-xl p-1">
                                <select value={bulkStatus} onChange={e => setBulkStatus(e.target.value)}
                                    className="bg-transparent border-none text-[9px] font-black text-sky-400 uppercase pl-2 pr-1 focus:ring-0 appearance-none cursor-pointer">
                                    <option value="Inventory Assets" className="bg-slate-900">Inventory Assets</option>
                                    <option value="Active Tenders" className="bg-slate-900">Active Tenders</option>
                                    <option value="Awaiting Process" className="bg-slate-900">Awaiting Process</option>
                                </select>
                                <button onClick={applyBulkStatus}
                                    className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-black text-[9px] font-black uppercase rounded-lg transition-all active:scale-95">
                                    Appliquer Statut
                                </button>
                            </div>
                            <button onClick={() => setSelectedIds(new Set())}
                                className="text-[9px] text-slate-600 hover:text-slate-300 font-black uppercase tracking-widest transition-colors">
                                Annuler
                            </button>
                        </div>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-black/30">
                                {/* Checkbox col */}
                                <th className="pl-5 pr-2 py-4 border-b border-white/5">
                                    <input type="checkbox"
                                        checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
                                        onChange={toggleSelectAll}
                                        className="w-3.5 h-3.5 accent-sky-500 cursor-pointer" />
                                </th>
                                {['Readiness', 'Criticité', 'OT Ref', 'Désignation', 'Type', 'Statut Logistique', 'Qté', 'Prix U', 'Total', 'Début Planifié', 'Due Date', 'Commentaire'].map(h => (
                                    <th key={h} className="px-5 py-4 text-[8px] font-black text-slate-600 uppercase tracking-[0.25em] whitespace-nowrap border-b border-white/5">
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {filteredItems.length > 0 ? filteredItems.map(item => {
                                const isReady = item.readiness === 1;
                                const isSelected = selectedIds.has(item.id);
                                const linkedTask = tasks.find(t => String(t.OT).trim() === String(item.OT).trim());
                                const schedDate = linkedTask?.['START DATE'];
                                const isLate = schedDate && item.dueDate && new Date(item.dueDate) > new Date(schedDate as any);

                                return (
                                    <tr key={item.id} className={`group transition-all ${isSelected ? 'bg-sky-500/5 border-l-2 border-sky-500/40' : item.criticity === 1 && !isReady ? 'border-l-2 border-rose-500/40 hover:bg-rose-500/[0.03]' : 'hover:bg-white/[0.025]'}`}>
                                        {/* Checkbox */}
                                        <td className="pl-5 pr-2 py-4">
                                            <input type="checkbox" checked={isSelected}
                                                onChange={() => toggleSelect(item.id)}
                                                className="w-3.5 h-3.5 accent-sky-500 cursor-pointer" />
                                        </td>
                                        {/* Readiness */}
                                        <td className="px-5 py-4 min-w-[120px]">
                                            <div onClick={() => handleUpdateItem(item.id, { readiness: isReady ? 0 : 1 })}
                                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer transition-all hover:scale-105 active:scale-95 select-none ${isReady ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-rose-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.8)]'}`} />
                                                <span className="text-[9px] font-black uppercase tracking-widest">{isReady ? 'READY' : 'MISSING'}</span>
                                            </div>
                                        </td>
                                        {/* Criticity badge */}
                                        <td className="px-3 py-4 whitespace-nowrap">
                                            {item.criticity === 1 ? (
                                                <div className="inline-flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg px-2.5 py-1" title="Pièce critique">
                                                    <AlertTriangle size={9} />
                                                    <span className="text-[8px] font-black uppercase tracking-widest">Critique</span>
                                                </div>
                                            ) : (
                                                <span className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">Standard</span>
                                            )}
                                        </td>
                                        {/* OT */}
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <div>
                                                <p className="text-[8px] text-slate-700 font-black uppercase tracking-widest mb-0.5">Mission ID</p>
                                                <p className="text-[10px] font-black text-white font-mono">#{item.OT}</p>
                                            </div>
                                        </td>
                                        {/* Spare part */}
                                        <td className="px-5 py-4 max-w-[200px]">
                                            <div className="group/cell relative">
                                                <input type="text" defaultValue={item.sparePart}
                                                    onBlur={e => { if (e.target.value !== item.sparePart) handleUpdateItem(item.id, { sparePart: e.target.value }); }}
                                                    className="bg-transparent border-none p-0 text-[10px] font-bold text-slate-300 uppercase tracking-wide w-full focus:ring-0 focus:text-sky-400 transition-colors cursor-text truncate" />
                                                <div className="absolute -bottom-0.5 left-0 w-0 h-px bg-sky-500/50 transition-all group-focus-within/cell:w-full" />
                                            </div>
                                        </td>
                                        {/* Type */}
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">{item.type || 'N/A'}</span>
                                                <span className="text-[8px] text-slate-700 font-bold uppercase">{item.unite || 'UNIT'}</span>
                                            </div>
                                        </td>
                                        {/* Status */}
                                        <td className="px-5 py-4">
                                            <div className="relative group/sel">
                                                <select value={item.status || 'Awaiting Process'}
                                                    onChange={e => handleUpdateItem(item.id, { status: e.target.value as any })}
                                                    className={`text-[9px] font-black uppercase tracking-widest appearance-none bg-transparent border-none cursor-pointer focus:ring-0 pr-4 ${item.status === 'Inventory Assets' ? 'text-emerald-400' : item.status === 'Active Tenders' ? 'text-blue-400' : 'text-amber-500'}`}>
                                                    <option value="Awaiting Process" className="bg-slate-900">Awaiting Process</option>
                                                    <option value="Active Tenders" className="bg-slate-900">Active Tenders</option>
                                                    <option value="Inventory Assets" className="bg-slate-900">Inventory Assets</option>
                                                </select>
                                                <svg className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-30" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 9l-7 7-7-7" /></svg>
                                            </div>
                                        </td>
                                        {/* Qty */}
                                        <td className="px-5 py-4">
                                            <input type="number" defaultValue={item.qty}
                                                onBlur={e => { const v = Number(e.target.value); if (v !== item.qty) handleUpdateItem(item.id, { qty: v }); }}
                                                className="bg-transparent border-none p-0 text-[11px] font-black text-white tabular-nums w-12 focus:ring-0 focus:text-sky-400 transition-colors" />
                                        </td>
                                        {/* Price U */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1">
                                                <span className="text-[8px] text-slate-600">{currentSymbol}</span>
                                                <input type="number" defaultValue={item.priceU}
                                                    onBlur={e => { const v = Number(e.target.value); if (v !== item.priceU) handleUpdateItem(item.id, { priceU: v }); }}
                                                    className="bg-transparent border-none p-0 text-[10px] font-bold text-slate-400 tabular-nums w-20 focus:ring-0 focus:text-sky-400 transition-colors" />
                                            </div>
                                        </td>
                                        {/* Total */}
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <span className="text-[11px] font-black text-amber-400 tabular-nums">{fmtPrice(item.totalPrice || 0, currentSymbol)}</span>
                                        </td>
                                        {/* Projected start */}
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            {schedDate ? (
                                                <div className={`flex items-center gap-1.5 ${isLate ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${isLate ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                                                    <span className="text-[9px] font-black tabular-nums">
                                                        {new Date(schedDate as any).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[9px] text-slate-700 italic">Non planifié</span>
                                            )}
                                        </td>
                                        {/* Due Date */}
                                        <td className="px-5 py-4">
                                            <input type="date" defaultValue={item.dueDate || ''}
                                                onBlur={e => { if (e.target.value !== item.dueDate) handleUpdateItem(item.id, { dueDate: e.target.value }); }}
                                                className="bg-transparent border-none p-0 text-[9px] font-black text-slate-400 tabular-nums w-full focus:ring-0 focus:text-sky-400 transition-colors cursor-pointer" />
                                        </td>
                                        {/* Comment */}
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2">
                                                <input type="text" placeholder="Observation..." defaultValue={item.comment || ''}
                                                    onBlur={e => { if (e.target.value !== item.comment) handleUpdateItem(item.id, { comment: e.target.value }); }}
                                                    className="bg-white/5 border border-white/5 rounded-lg px-2.5 py-1 text-[9px] text-slate-400 placeholder-slate-700 w-32 focus:ring-1 focus:ring-sky-500/20 focus:border-sky-500/20 transition-all" />
                                                <button onClick={() => openCommentModal(item)}
                                                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-white/10 flex items-center justify-center text-slate-600 hover:text-white transition-all shrink-0"
                                                    title="Agrandir">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={11} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-4 text-slate-700">
                                            <div className="w-16 h-16 border border-slate-800 rounded-2xl flex items-center justify-center">
                                                <Package size={28} className="opacity-20" />
                                            </div>
                                            <p className="text-[9px] font-black uppercase tracking-[0.4em]">Aucun enregistrement PDR trouvé</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ══ Footer ═══════════════════════════════ */}
            <div className="flex justify-center">
                <div className="bg-sky-500/5 border border-sky-500/10 px-6 py-3 rounded-xl">
                    <p className="text-[8px] font-bold text-sky-500/50 uppercase tracking-[0.3em] text-center">
                        Plannex PDR Matrix Protocol · Synchronisation temps réel avec le planning tactique
                    </p>
                </div>
            </div>

            {/* ══ Comment Modal ════════════════════════ */}
            {activeCommentModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-slate-950 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-black text-sky-400 uppercase tracking-[0.2em]">Observation Tactique</p>
                                <p className="text-sm font-black text-white mt-0.5 truncate">{activeCommentModal.sparePart}</p>
                            </div>
                            <button onClick={() => setActiveCommentModal(null)}
                                className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <textarea value={tempComment} onChange={e => setTempComment(e.target.value)}
                                placeholder="Saisissez vos observations..."
                                className="w-full bg-black/40 border border-white/5 rounded-xl p-4 text-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500/20 resize-none h-32 font-medium"
                                autoFocus />
                            <div className="flex gap-3 mt-4">
                                <button onClick={() => setActiveCommentModal(null)}
                                    className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest transition-all">
                                    Annuler
                                </button>
                                <button onClick={handleSaveComment}
                                    className="flex-1 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-sky-900/40">
                                    Sauvegarder
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
