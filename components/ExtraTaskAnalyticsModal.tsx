import React, { useMemo } from 'react';
import { X, TrendingUp, DollarSign, Activity, Users, Settings, Clock, Package, AlertTriangle, Crosshair } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { SchedulingTaskData } from '../types';

interface ExtraTaskAnalyticsModalProps {
    isOpen: boolean;
    onClose: () => void;
    extraTasks: SchedulingTaskData[];
}

export const ExtraTaskAnalyticsModal: React.FC<ExtraTaskAnalyticsModalProps> = ({ isOpen, onClose, extraTasks }) => {
    
    // Total calculation
    const analytics = useMemo(() => {
        let total = 0, mo = 0, pr = 0, pdr = 0, sc = 0, hd = 0;
        let reasons: Record<string, number> = {};

        extraTasks.forEach(t => {
            const tcost = t['TOTAL TASK COST'] || 0;
            total += tcost;
            mo += (t['Heures-Homme'] || 0) * (t['PRICE FOR HH'] || 0);
            pr += t['MANUAL PRICE'] || 0;
            pdr += t['PDR COST'] || 0;
            sc += t['Scaffolding manual Price'] || 0;
            hd += t['Handling manual Price'] || 0;

            const family = t.FAMILLE || 'Autre';
            reasons[family] = (reasons[family] || 0) + tcost;
        });

        // Calculate distribution for Donut Chart
        const distribution = [
            { name: "Main d'Œuvre", value: mo, color: '#3b82f6' },
            { name: 'Prestation', value: pr, color: '#6366f1' },
            { name: 'Pièces (PDR)', value: pdr, color: '#f59e0b' },
            { name: 'Échafaudage', value: sc, color: '#8b5cf6' },
            { name: 'Manutention', value: hd, color: '#06b6d4' }
        ].filter(d => d.value > 0);

        // Calculate by reason/family for Bar Chart
        const familyData = Object.entries(reasons)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5);

        return { total, mo, pr, pdr, sc, hd, distribution, familyData };
    }, [extraTasks]);

    if (!isOpen) return null;

    const fmt = (val: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MAD', maximumFractionDigits: 0 }).format(val);

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-[200] p-4 sm:p-6 font-sans">
            <div 
                className="bg-[#0b1120] border border-red-500/20 rounded-[2.5rem] w-full max-w-6xl shadow-2xl shadow-red-900/20 overflow-hidden flex flex-col max-h-[90vh]"
            >
                    {/* Header */}
                    <div className="p-8 border-b border-white/5 relative bg-gradient-to-r from-red-950/40 via-transparent to-transparent shrink-0">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-rose-500 to-orange-500"></div>
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-lg shadow-red-900/20">
                                    <AlertTriangle className="w-7 h-7" />
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black text-white tracking-tight uppercase">Impact Budgétaire Extra</h2>
                                    <p className="text-red-400 font-bold uppercase tracking-widest text-[10px] mt-1.5 flex items-center gap-2">
                                        <TrendingUp className="w-3 h-3" />
                                        Travaux Supplémentaires (Scope Creep)
                                    </p>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                        
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-3xl p-6 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><DollarSign className="w-24 h-24 text-red-500" /></div>
                                <h3 className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2 relative z-10">Surcoût Total</h3>
                                <div className="text-4xl font-black text-white tracking-tighter relative z-10">{fmt(analytics.total)}</div>
                                <div className="text-xs font-bold text-red-500/80 mt-2 relative z-10">Non planifié initialement</div>
                            </div>

                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col justify-between group hover:bg-white/[0.04] transition-colors">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Crosshair className="w-3.5 h-3.5 text-blue-400" /> Volume Tâches</h3>
                                <div className="text-3xl font-black text-white mt-4">{extraTasks.length} <span className="text-sm text-slate-500 font-bold">tâches</span></div>
                            </div>

                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col justify-between group hover:bg-white/[0.04] transition-colors">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Users className="w-3.5 h-3.5 text-indigo-400" /> MO Extra</h3>
                                <div className="text-3xl font-black text-white mt-4">{fmt(analytics.mo)}</div>
                            </div>

                            <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col justify-between group hover:bg-white/[0.04] transition-colors">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Package className="w-3.5 h-3.5 text-amber-400" /> Matériel (PDR)</h3>
                                <div className="text-3xl font-black text-white mt-4">{fmt(analytics.pdr)}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            
                            {/* Donut Chart - Distribution */}
                            <div className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-emerald-400" /> Répartition du Surcoût
                                </h3>
                                <div className="flex-1 flex items-center justify-center min-h-[250px]">
                                    {analytics.distribution.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={analytics.distribution}
                                                    cx="50%" cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={90}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {analytics.distribution.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    formatter={(value: number) => fmt(value)}
                                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                                                    itemStyle={{ color: '#f8fafc', fontWeight: 'bold' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="text-slate-600 text-sm font-medium">Aucune donnée de coût disponible.</div>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    {analytics.distribution.map((d, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg p-2">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[9px] text-slate-400 uppercase tracking-wider truncate">{d.name}</div>
                                                <div className="text-xs text-white font-bold">{fmt(d.value)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Bar Chart - By Family */}
                            <div className="bg-black/40 border border-white/5 rounded-3xl p-6 flex flex-col">
                                <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-blue-400" /> Top 5 Familles Impactées
                                </h3>
                                <div className="flex-1 min-h-[250px]">
                                    {analytics.familyData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analytics.familyData} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.5} />
                                                <XAxis type="number" tickFormatter={(v) => `${v/1000}k`} stroke="#64748b" fontSize={10} fontWeight="bold" />
                                                <YAxis type="category" dataKey="name" stroke="#cbd5e1" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                                                <Tooltip 
                                                    formatter={(value: number) => fmt(value)}
                                                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                                                    cursor={{ fill: '#1e293b' }}
                                                />
                                                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={24}>
                                                    {analytics.familyData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#f87171'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-slate-600 text-sm font-medium">Aucune donnée de famille disponible.</div>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
    );
};
