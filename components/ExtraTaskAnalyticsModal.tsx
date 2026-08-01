import React, { useMemo, useState } from 'react';
import {
    X, TrendingUp, DollarSign, Users, Package,
    AlertTriangle, Crosshair, HardHat, Truck, Wrench, Zap
} from 'lucide-react';
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface ExtraTaskAnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    extraTasks: any[];
}

const PALETTE = ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#06b6d4', '#10b981', '#ec4899', '#f97316'];

const fmt = (val: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(val);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#080c16]/98 border border-white/10 rounded-2xl px-5 py-4 shadow-2xl backdrop-blur-xl min-w-[180px]">
            {label && <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">{label}</p>}
            {payload.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: p.color || p.fill }} />
                        <span className="text-[10px] text-slate-300 font-bold">{p.name}</span>
                    </div>
                    <span className="text-[11px] font-black text-white">{fmt(p.value)}</span>
                </div>
            ))}
        </div>
    );
};

export const ExtraTaskAnalyticsModal: React.FC<ExtraTaskAnalyticsModalProps> = ({ isOpen, onClose, extraTasks }) => {

    const analytics = useMemo(() => {
        let total = 0, mo = 0, pr = 0, pdr = 0, sc = 0, hd = 0;
        const zones: Record<string, number> = {};
        const families: Record<string, number> = {};

        extraTasks.forEach((t: any) => {
            const tcost = t['TOTAL TASK COST'] || t['TOTAL_COST'] || 0;
            total += tcost;

            if (Array.isArray(t.subcontractors) && t.subcontractors.length > 0) {
                t.subcontractors.forEach((sub: any) => {
                    const subCost = sub.totalPrice || 0;
                    const ct = String(sub.costType || 'HH').toUpperCase();
                    if (ct === 'HH') mo += subCost;
                    else if (ct === 'PRESTATION') pr += subCost;
                    else pdr += subCost;
                });
            } else {
                mo  += (t['Heures-Homme'] || 0) * (t['PRICE FOR HH'] || 0);
            }

            // Database & manual overrides are unconditional 
            pr  += t['MANUAL PRICE'] || 0;
            pdr += t['PDR COST'] || 0;
            sc  += (t['Scaffolding manual Price'] || t['SCAFFOLDING_COST'] || 0);
            hd  += (t['Handling manual Price'] || t['HANDLING_COST'] || 0);

            const zone = t.ZONE || t.zone || 'N/A';
            zones[zone] = (zones[zone] || 0) + tcost;

            const family = t.FAMILLE || t.famille || 'Autre';
            families[family] = (families[family] || 0) + tcost;
        });

        const distribution = [
            { name: "Main d'Oeuvre", value: mo, color: '#3b82f6' },
            { name: 'Prestation', value: pr, color: '#6366f1' },
            { name: 'PDR / Materiel', value: pdr, color: '#f59e0b' },
            { name: 'Echafaudage', value: sc, color: '#8b5cf6' },
            { name: 'Manutention', value: hd, color: '#06b6d4' },
        ].filter(d => d.value > 0);

        const zoneData = Object.entries(zones)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const familyData = Object.entries(families)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        return { total, mo, pr, pdr, sc, hd, distribution, zoneData, familyData };
    }, [extraTasks]);

    // ── Filter state MUST be before any early return (Rules of Hooks) ──
    const [tableSearch, setTableSearch] = useState('');
    const [tableZone, setTableZone] = useState('all');
    const [tableFamille, setTableFamille] = useState('all');

    const allZones = useMemo(() =>
        [...new Set(extraTasks.map((t: any) => t.ZONE || t.zone || '').filter(Boolean))].sort()
    , [extraTasks]);
    const allFamilles = useMemo(() =>
        [...new Set(extraTasks.map((t: any) => t.FAMILLE || t.famille || '').filter(Boolean))].sort()
    , [extraTasks]);
    const filteredTasks = useMemo(() => extraTasks.filter((t: any) => {
        const matchSearch = !tableSearch ||
            (t['GLOBAL TASKS'] || '').toLowerCase().includes(tableSearch.toLowerCase()) ||
            (t['Nom Equipement'] || '').toLowerCase().includes(tableSearch.toLowerCase());
        const matchZone = tableZone === 'all' || (t.ZONE || t.zone) === tableZone;
        const matchFamille = tableFamille === 'all' || (t.FAMILLE || t.famille) === tableFamille;
        return matchSearch && matchZone && matchFamille;
    }), [extraTasks, tableSearch, tableZone, tableFamille]);

    if (!isOpen) return null;

    const costCategories = [
        { label: "Main d'Oeuvre", value: analytics.mo, color: '#3b82f6', bgFrom: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)', icon: <Users className="w-5 h-5" /> },
        { label: 'Prestation', value: analytics.pr, color: '#6366f1', bgFrom: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.2)', icon: <Wrench className="w-5 h-5" /> },
        { label: 'PDR / Materiel', value: analytics.pdr, color: '#f59e0b', bgFrom: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', icon: <Package className="w-5 h-5" /> },
        { label: 'Echafaudage', value: analytics.sc, color: '#8b5cf6', bgFrom: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)', icon: <HardHat className="w-5 h-5" /> },
        { label: 'Manutention', value: analytics.hd, color: '#06b6d4', bgFrom: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)', icon: <Truck className="w-5 h-5" /> },
    ];

    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center z-[300] p-[2vh] font-sans">
            <style>{`
                @keyframes etaSlide { from { opacity:0; transform:translateY(24px) scale(0.98); } to { opacity:1; transform:translateY(0) scale(1); } }
                .eta-modal { animation: etaSlide 0.38s cubic-bezier(.22,1,.36,1) forwards; }
                .eta-scroll::-webkit-scrollbar { width: 4px; }
                .eta-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 10px; }
                .eta-bar { transition: width 1.2s cubic-bezier(.22,1,.36,1); }
            `}</style>

            <div className="eta-modal bg-[#07090f] border border-white/[0.06] rounded-[2rem] shadow-[0_0_100px_-20px_rgba(239,68,68,0.3)]"
                style={{ width: '95vw', height: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

                {/* Top gradient accent */}
                <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-[2rem]"
                    style={{ background: 'linear-gradient(90deg, #ef4444, #f97316, #f59e0b)' }} />

                {/* â•â• HEADER â•â• */}
                <div className="shrink-0 px-10 py-6 border-b border-white/[0.05] flex items-center justify-between"
                    style={{ background: 'linear-gradient(90deg, rgba(239,68,68,0.06) 0%, transparent 60%)' }}>
                    <div className="flex items-center gap-5">
                        <div className="w-13 h-13 rounded-2xl flex items-center justify-center text-red-400"
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', width: 52, height: 52 }}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight uppercase">Impact Budgetaire Extra</h2>
                            <p className="text-[10px] text-red-400 font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                <TrendingUp className="w-3 h-3" /> Travaux Supplementaires â€” Scope Creep Analysis
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-8">
                        <div className="text-right">
                            <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: 'rgba(239,68,68,0.7)' }}>Surcout Total</p>
                            <p className="text-3xl font-black text-white tracking-tight">{fmt(analytics.total)}</p>
                            <p className="text-[10px] text-slate-600 font-bold mt-0.5">{extraTasks.length} tache{extraTasks.length > 1 ? 's' : ''} supplementaire{extraTasks.length > 1 ? 's' : ''}</p>
                        </div>
                        <button onClick={onClose}
                            className="w-11 h-11 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all hover:scale-110"
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* â•â• BODY â•â• */}
                <div className="flex-1 overflow-y-auto eta-scroll" style={{ padding: '2rem 2.5rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

                    {/* â”€â”€ 5 Cost Category Cards â”€â”€ */}
                    <div>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.28em] mb-3 flex items-center gap-2">
                            <Zap className="w-3 h-3 text-yellow-500" /> Detail par Categorie de Cout
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
                            {costCategories.map((cat) => {
                                const pct = analytics.total > 0 ? (cat.value / analytics.total) * 100 : 0;
                                return (
                                    <div key={cat.label} className="rounded-2xl p-5 flex flex-col gap-3 transition-all duration-300 hover:scale-[1.02]"
                                        style={{ background: cat.bgFrom, border: `1px solid ${cat.border}` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ color: cat.color }}>{cat.icon}</span>
                                            <span className="text-[9px] font-black rounded-lg px-2 py-0.5"
                                                style={{ background: `${cat.color}20`, color: cat.color }}>
                                                {pct.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{cat.label}</p>
                                            <p className="text-xl font-black text-white mt-1 leading-none">{fmt(cat.value)}</p>
                                        </div>
                                        <div style={{ height: 5, background: 'rgba(0,0,0,0.4)', borderRadius: 99, overflow: 'hidden' }}>
                                            <div className="h-full eta-bar" style={{ width: `${pct}%`, background: cat.color, borderRadius: 99 }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* â”€â”€ 3-column chart row â”€â”€ */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem', flex: '0 0 auto', minHeight: 320 }}>

                        {/* Donut */}
                        <div className="rounded-2xl p-6 flex flex-col"
                            style={{ background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span style={{ width: 6, height: 18, background: '#8b5cf6', borderRadius: 99, display: 'inline-block' }} />
                                Repartition du Surcout
                            </h3>
                            {analytics.distribution.length > 0 ? (
                                <>
                                    <div style={{ flex: 1, minHeight: 180 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={analytics.distribution} cx="50%" cy="50%"
                                                    innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                                                    {analytics.distribution.map((entry, i) => (
                                                        <Cell key={i} fill={entry.color} stroke="transparent" />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-1.5 mt-2">
                                        {analytics.distribution.map((d, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                                                    <span className="text-[10px] text-slate-400 font-bold">{d.name}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-white">{fmt(d.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    className="text-slate-600 text-sm">Aucune donnee disponible.</div>
                            )}
                        </div>

                        {/* Budget par Famille */}
                        <div className="rounded-2xl p-6 flex flex-col"
                            style={{ background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span style={{ width: 6, height: 18, background: '#ef4444', borderRadius: 99, display: 'inline-block' }} />
                                Budget par Famille
                            </h3>
                            {analytics.familyData.length > 0 ? (
                                <div style={{ flex: 1, minHeight: 200 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.familyData} layout="vertical"
                                            margin={{ top: 0, right: 20, left: 8, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                                            <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)}k`}
                                                stroke="#334155" fontSize={9} fontWeight="bold" />
                                            <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={9}
                                                fontWeight="bold" tickLine={false} axisLine={false} width={95}
                                                tick={{ fill: '#94a3b8' }} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                            <Bar dataKey="value" name="Cout" radius={[0, 6, 6, 0]} barSize={16}>
                                                {analytics.familyData.map((_, i) => (
                                                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    className="text-slate-600 text-sm">Aucune donnee.</div>
                            )}
                        </div>

                        {/* Budget par Zone */}
                        <div className="rounded-2xl p-6 flex flex-col"
                            style={{ background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <h3 className="text-[10px] font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span style={{ width: 6, height: 18, background: '#10b981', borderRadius: 99, display: 'inline-block' }} />
                                Budget par Zone
                            </h3>
                            {analytics.zoneData.length > 0 ? (
                                <div style={{ flex: 1, minHeight: 200 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analytics.zoneData} layout="vertical"
                                            margin={{ top: 0, right: 20, left: 8, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                                            <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)}k`}
                                                stroke="#334155" fontSize={9} fontWeight="bold" />
                                            <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={9}
                                                fontWeight="bold" tickLine={false} axisLine={false} width={95}
                                                tick={{ fill: '#94a3b8' }} />
                                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                                            <Bar dataKey="value" name="Cout" radius={[0, 6, 6, 0]} barSize={16}>
                                                {analytics.zoneData.map((_, i) => (
                                                    <Cell key={i} fill={['#10b981','#06b6d4','#6366f1','#f59e0b','#ec4899'][i % 5]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    className="text-slate-600 text-sm">Aucune donnee de zone.</div>
                            )}
                        </div>
                    </div>

                    {/* Task Detail Table with Filters */}
                    {extraTasks.length > 0 && (
                        <div className="rounded-2xl overflow-hidden"
                            style={{ background: '#0a0e1a', border: '1px solid rgba(255,255,255,0.06)' }}>

                            {/* Table Header + Filter Bar */}
                            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                                    <span style={{ width: 6, height: 18, background: '#f97316', borderRadius: 99, display: 'inline-block' }} />
                                    <h3 className="text-[10px] font-black text-white uppercase tracking-widest">Detail des Taches Supplementaires</h3>
                                    <span className="ml-auto text-[9px] font-black text-slate-600 rounded-lg px-3 py-1"
                                        style={{ background: 'rgba(255,255,255,0.04)' }}>
                                        {filteredTasks.length} / {extraTasks.length} tache{extraTasks.length > 1 ? 's' : ''}
                                    </span>
                                </div>
                                {/* Filter row */}
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    {/* Search input */}
                                    <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
                                        <input
                                            type="text"
                                            placeholder="Rechercher..."
                                            value={tableSearch}
                                            onChange={e => setTableSearch(e.target.value)}
                                            style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '6px 10px 6px 32px', fontSize: 11, color: '#f1f5f9', outline: 'none', boxSizing: 'border-box' }}
                                        />
                                        <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                                    </div>
                                    {/* Zone filter */}
                                    {allZones.length > 0 && (
                                        <select value={tableZone} onChange={e => setTableZone(e.target.value)}
                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '6px 12px', fontSize: 11, color: '#cbd5e1', minWidth: 120 }}>
                                            <option value="all">Toutes zones</option>
                                            {allZones.map(z => <option key={z} value={z}>{z}</option>)}
                                        </select>
                                    )}
                                    {/* Famille filter */}
                                    {allFamilles.length > 0 && (
                                        <select value={tableFamille} onChange={e => setTableFamille(e.target.value)}
                                            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '6px 12px', fontSize: 11, color: '#cbd5e1', minWidth: 140 }}>
                                            <option value="all">Toutes familles</option>
                                            {allFamilles.map(f => <option key={f} value={f}>{f}</option>)}
                                        </select>
                                    )}
                                    {/* Reset filters */}
                                    {(tableSearch || tableZone !== 'all' || tableFamille !== 'all') && (
                                        <button onClick={() => { setTableSearch(''); setTableZone('all'); setTableFamille('all'); }}
                                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '6px 14px', fontSize: 10, fontWeight: 900, color: '#f87171', cursor: 'pointer', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                            Vider
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            {['Designation', 'Equipement', 'Famille', 'Zone', 'H-H', "Main d'Oeuvre", 'PDR / Mat.', 'Total'].map(h => (
                                                <th key={h} style={{ padding: '10px 16px', textAlign: ['Designation','Equipement','Famille','Zone'].includes(h) ? 'left' : 'right', fontSize: 9, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTasks.length === 0 && (
                                            <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#475569', fontSize: 12 }}>Aucun resultat pour ces filtres.</td></tr>
                                        )}
                                        {filteredTasks.map((t: any, i: number) => {
                                            const total = t['TOTAL TASK COST'] || t['TOTAL_COST'] || 0;
                                            let rowMo = 0, rowPdr = 0;
                                            if (Array.isArray(t.subcontractors) && t.subcontractors.length > 0) {
                                                t.subcontractors.forEach((s: any) => {
                                                    if (String(s.costType || 'HH').toUpperCase() === 'HH') rowMo += s.totalPrice || 0;
                                                    else rowPdr += s.totalPrice || 0;
                                                });
                                            } else {
                                                rowMo = (t['Heures-Homme'] || 0) * (t['PRICE FOR HH'] || 0);
                                                rowPdr = t['PDR COST'] || 0;
                                            }
                                            return (
                                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                                                    className="hover:bg-white/[0.02] transition-colors">
                                                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap' }}>{t['GLOBAL TASKS'] || '-'}</td>
                                                    <td style={{ padding: '12px 16px', color: '#94a3b8', textAlign: 'left' }}>{t['Nom Equipement'] || '-'}</td>
                                                    <td style={{ padding: '12px 16px', color: '#94a3b8', textAlign: 'left' }}>{t.FAMILLE || t.famille || '-'}</td>
                                                    <td style={{ padding: '12px 16px', color: '#94a3b8', textAlign: 'left' }}>{t.ZONE || t.zone || '-'}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', color: '#cbd5e1' }}>{(t['Heures-Homme'] || 0).toFixed(2)}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa' }}>{fmt(rowMo)}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#fbbf24' }}>{fmt(rowPdr)}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 900, color: '#34d399' }}>{fmt(total)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                                            <td colSpan={7} style={{ padding: '14px 16px', textAlign: 'right', fontSize: 9, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
                                                Total Surcout
                                            </td>
                                            <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 900, fontSize: 16, color: '#ffffff' }}>{fmt(analytics.total)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
