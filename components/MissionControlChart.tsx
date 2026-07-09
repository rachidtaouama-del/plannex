import React, { useState, useEffect, useRef } from 'react';
import {
    Radar,
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    ResponsiveContainer,
    Tooltip
} from 'recharts';
import {
    Activity,
    Zap,
    Target,
    Clock,
    AlertTriangle,
    TrendingUp,
    Cpu,
    Shield,
    ArrowUpRight,
    CheckCircle2,
    Timer,
    XCircle
} from 'lucide-react';

const radarData = [
    { subject: 'Mechanical', A: 120, fullMark: 150 },
    { subject: 'Instrument', A: 98, fullMark: 150 },
    { subject: 'Electrical', A: 86, fullMark: 150 },
    { subject: 'Piping', A: 99, fullMark: 150 },
    { subject: 'Safety', A: 85, fullMark: 150 },
    { subject: 'Logistics', A: 65, fullMark: 150 },
];

const ganttData = [
    { name: 'Phase 1: Prep', start: 0, duration: 25, status: 'Completed', statusColor: '#10b981', barColor: '#10b981', icon: CheckCircle2 },
    { name: 'Phase 2: Isolation', start: 20, duration: 40, status: 'Active', statusColor: '#34d399', barColor: '#34d399', icon: Activity },
    { name: 'Phase 3: Execution', start: 55, duration: 35, status: 'Pending', statusColor: '#6b7280', barColor: '#059669', icon: Timer },
    { name: 'Phase 4: Inspection', start: 85, duration: 15, status: 'Delayed', statusColor: '#f59e0b', barColor: '#f59e0b', icon: XCircle },
];

const statusStyles: Record<string, string> = {
    Completed: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    Active: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
    Pending: 'bg-slate-700/50 text-slate-400 border border-white/5',
    Delayed: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

// Animated counter hook
function useCounter(target: number, duration: number = 1800, start: boolean = false) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (!start) return;
        let startTime: number | null = null;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            setValue(Math.floor(ease * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [target, duration, start]);
    return value;
}

const MissionControlChart: React.FC = () => {
    const [isHovered, setIsHovered] = useState<number | null>(null);
    const [mounted, setMounted] = useState(false);
    const [animStart, setAnimStart] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const efficiency = useCounter(942, 1600, animStart);
    const uptime = useCounter(9998, 2000, animStart);
    const latency = useCounter(24, 1200, animStart);

    useEffect(() => {
        setMounted(true);
        const timer = setTimeout(() => setAnimStart(true), 400);
        return () => clearTimeout(timer);
    }, []);

    if (!mounted) return <div className="h-[580px] w-full bg-slate-900/50 rounded-3xl animate-pulse" />;

    return (
        <div
            ref={containerRef}
            className="relative w-full rounded-2xl overflow-hidden"
            style={{
                background: 'linear-gradient(135deg, #020b18 0%, #030d1a 50%, #020b16 100%)',
                border: '1px solid rgba(16,185,129,0.15)',
                boxShadow: '0 0 80px -20px rgba(16,185,129,0.15), inset 0 1px 0 rgba(255,255,255,0.03)'
            }}
        >
            {/* Subtle grid overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
                style={{ backgroundImage: 'linear-gradient(rgba(16,185,129,1) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,1) 1px, transparent 1px)', backgroundSize: '48px 48px' }}
            />
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)' }} />

            {/* Top status bar */}
            <div className="relative z-10 flex items-center justify-between px-6 py-3 border-b border-white/[0.04]" style={{ background: 'rgba(2,11,24,0.8)' }}>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                        <span className="text-[10px] font-mono font-bold text-emerald-400/80 uppercase tracking-widest">System Online</span>
                    </div>
                    <div className="w-px h-4 bg-white/10" />
                    <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">PlanneX Mission Control v2.4</span>
                </div>
                <div className="flex items-center gap-3">
                    {['SYS', 'NET', 'AI'].map((label, i) => (
                        <div key={label} className="flex items-center gap-1.5">
                            <span className="text-[9px] font-mono text-slate-600 uppercase">{label}</span>
                            <div className="w-8 h-1 rounded-full bg-slate-800 overflow-hidden">
                                <div className="h-full rounded-full bg-emerald-500/60 animate-pulse" style={{ width: `${[78, 45, 92][i]}%`, animationDelay: `${i * 300}ms` }} />
                            </div>
                        </div>
                    ))}
                    <div className="w-px h-4 bg-white/10" />
                    <span className="text-[9px] font-mono text-slate-600">
                        {new Date().toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                </div>
            </div>

            {/* Main content grid */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-0 divide-x divide-white/[0.04]">

                {/* LEFT: Resource Radar Panel */}
                <div className="lg:col-span-5 p-6 flex flex-col gap-5">
                    {/* Panel header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                <Target className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-[11px] font-black text-white uppercase tracking-widest leading-none">Resource Allocation</div>
                                <div className="text-[9px] font-mono text-emerald-500/50 tracking-wider mt-0.5">RADAR_DENSITY_MAP_V4</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.12)' }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase">AI RECOMMENDATION</span>
                        </div>
                    </div>

                    {/* Floating label above chart */}
                    <div className="px-3 py-2 rounded-lg text-[10px] font-bold text-white" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.12)' }}>
                        ⬡ Critical Path Optimization Active
                    </div>

                    {/* Radar Chart */}
                    <div className="flex-1 min-h-[260px] rounded-xl relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(16,185,129,0.04) 0%, transparent 70%)' }} />
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                                <PolarGrid stroke="rgba(16,185,129,0.08)" strokeDasharray="4 4" />
                                <PolarAngleAxis
                                    dataKey="subject"
                                    tick={{ fill: 'rgba(148,163,184,0.6)', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em' }}
                                />
                                <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} stroke="none" />
                                <Radar
                                    name="Teams"
                                    dataKey="A"
                                    stroke="#10b981"
                                    strokeWidth={1.5}
                                    fill="url(#radarGradient)"
                                    fillOpacity={1}
                                    animationBegin={300}
                                    animationDuration={1600}
                                />
                                <defs>
                                    <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
                                        <stop offset="0%" stopColor="#34d399" stopOpacity={0.5} />
                                        <stop offset="100%" stopColor="#059669" stopOpacity={0.2} />
                                    </radialGradient>
                                </defs>
                                <Tooltip
                                    contentStyle={{ background: '#0a1628', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '10px', fontSize: '11px', padding: '8px 12px' }}
                                    itemStyle={{ color: '#34d399', fontWeight: 700 }}
                                    labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Bottom KPI cards */}
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Efficiency Score', value: `${(efficiency / 10).toFixed(1)}`, unit: '', icon: TrendingUp, color: '#10b981' },
                            { label: 'Active Nodes', value: '12', unit: 'LIVE', icon: Cpu, color: '#06b6d4' },
                        ].map((kpi) => (
                            <div key={kpi.label} className="p-4 rounded-xl relative overflow-hidden group" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: `radial-gradient(circle at 50% 50%, ${kpi.color}10 0%, transparent 70%)` }} />
                                <div className="text-[9px] uppercase font-bold tracking-widest mb-2" style={{ color: 'rgba(100,116,139,0.8)' }}>{kpi.label}</div>
                                <div className="flex items-end gap-2">
                                    <span className="text-2xl font-black font-mono" style={{ color: kpi.color, lineHeight: 1 }}>{kpi.value}</span>
                                    {kpi.unit && <span className="text-[9px] font-mono font-black mb-0.5" style={{ color: kpi.color }}>{kpi.unit}</span>}
                                    <kpi.icon className="w-3.5 h-3.5 ml-auto mb-0.5" style={{ color: kpi.color }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* RIGHT: Gantt + HUD Panel */}
                <div className="lg:col-span-7 p-6 flex flex-col gap-5">
                    {/* Panel header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                <Activity className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                                <div className="text-[11px] font-black text-white uppercase tracking-widest leading-none">Real-Time Gantt Engine</div>
                                <div className="text-[9px] font-mono text-emerald-500/50 tracking-wider mt-0.5">ENGINE_STATE: CLUSTERING_ACTIVE</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="w-1 rounded-full bg-emerald-500 animate-pulse" style={{ height: `${[12, 18, 10][i]}px`, animationDelay: `${i * 200}ms`, opacity: 0.4 + i * 0.2 }} />
                            ))}
                        </div>
                    </div>

                    {/* Gantt bars */}
                    <div className="flex-1 rounded-xl p-5 flex flex-col justify-between" style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <div className="space-y-5">
                            {ganttData.map((task, idx) => {
                                const StatusIcon = task.icon;
                                return (
                                    <div
                                        key={task.name}
                                        className="group/task cursor-pointer"
                                        onMouseEnter={() => setIsHovered(idx)}
                                        onMouseLeave={() => setIsHovered(null)}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <StatusIcon className="w-3 h-3" style={{ color: task.statusColor }} />
                                                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">{task.name}</span>
                                            </div>
                                            <span className={`text-[9px] font-mono font-black px-2.5 py-1 rounded-md uppercase tracking-widest transition-all duration-300 ${statusStyles[task.status]} ${isHovered === idx ? 'scale-105' : ''}`}>
                                                {task.status}
                                            </span>
                                        </div>
                                        {/* Bar track */}
                                        <div className="h-2.5 w-full rounded-full overflow-hidden relative" style={{ background: 'rgba(15,23,42,0.8)' }}>
                                            {/* Timeline ticks */}
                                            <div className="absolute inset-0 flex">
                                                {[25, 50, 75].map(tick => (
                                                    <div key={tick} className="absolute top-0 bottom-0 w-px" style={{ left: `${tick}%`, background: 'rgba(255,255,255,0.05)' }} />
                                                ))}
                                            </div>
                                            <div
                                                className="absolute h-full rounded-full transition-all duration-300"
                                                style={{
                                                    left: `${task.start}%`,
                                                    width: `${task.duration}%`,
                                                    background: `linear-gradient(90deg, ${task.barColor}cc, ${task.barColor})`,
                                                    boxShadow: isHovered === idx ? `0 0 12px ${task.barColor}60` : 'none',
                                                    filter: isHovered === idx ? 'brightness(1.2)' : 'brightness(0.9)',
                                                }}
                                            >
                                                {/* Shimmer */}
                                                <div className="absolute inset-0 rounded-full overflow-hidden">
                                                    <div className="absolute inset-0 animate-[shimmer_3s_ease-in-out_infinite] -translate-x-full" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />
                                                </div>
                                            </div>
                                        </div>
                                        {/* Progress label */}
                                        <div className="flex justify-between mt-1">
                                            <span className="text-[8px] font-mono text-slate-700">D+{task.start}</span>
                                            <span className="text-[8px] font-mono text-slate-700">D+{task.start + task.duration}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* HUD metrics row */}
                        <div className="grid grid-cols-3 gap-4 pt-5 mt-2 border-t border-white/[0.04]">
                            {[
                                { label: 'Latency', value: `${latency}ms`, icon: Zap, color: '#facc15' },
                                { label: 'Load', value: '14.8%', icon: Cpu, color: '#06b6d4' },
                                { label: 'Uptime', value: `${(uptime / 100).toFixed(2)}%`, icon: Clock, color: '#10b981' },
                            ].map(metric => (
                                <div key={metric.label} className="group/metric space-y-1.5">
                                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                                        <metric.icon className="w-3 h-3" style={{ color: metric.color }} />
                                        {metric.label}
                                    </div>
                                    <div className="text-xl font-black font-mono" style={{ color: 'white', letterSpacing: '-0.02em' }}>
                                        {metric.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AI Alert Banner */}
                    <div className="flex items-center justify-between p-4 rounded-xl group cursor-pointer transition-all duration-300 hover:scale-[1.01]"
                        style={{ background: 'rgba(251,146,60,0.06)', border: '1px solid rgba(251,146,60,0.18)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 relative" style={{ background: 'rgba(251,146,60,0.1)' }}>
                                <AlertTriangle className="w-4 h-4 text-amber-400" />
                                <span className="absolute top-0 right-0 w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                            </div>
                            <div>
                                <div className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] mb-0.5">Anomaly Detected</div>
                                <div className="text-[13px] font-bold text-white">Critical Path Drift in Phase 3</div>
                            </div>
                        </div>
                        <button className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200 hover:scale-105 active:scale-95"
                            style={{ background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.25)', color: '#fb923c' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(251,146,60,0.9)', e.currentTarget.style.color = '#fff')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(251,146,60,0.15)', e.currentTarget.style.color = '#fb923c')}>
                            View Root Cause
                            <ArrowUpRight className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(300%); }
                }
            `}</style>
        </div>
    );
};

export default MissionControlChart;
