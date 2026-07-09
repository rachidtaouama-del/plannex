
import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import type { ScheduledTask } from '../types';
import type { Scenario, ScenarioTask } from '../services/scenarioService';

// ─── Types ─────────────────────────────────────────────────────────────────
interface ComparativeGanttChartProps {
    baseline: ScheduledTask[];
    scenario: Scenario | null;
    showBaseline: boolean;
    groupBy: 'family' | 'discipline' | 'flat';
    searchTerm?: string;
    onTaskClick?: (task: ScheduledTask) => void;
}

interface TooltipData {
    task: ScheduledTask;
    scenTask?: ScenarioTask;
    x: number;
    y: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────
const fmt = (d: Date) =>
    d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', '');

const fmtDate = (d: Date) =>
    d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });

const fmtDelay = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    if (hours < 24) return `+${hours.toFixed(1)}h`;
    return `+${(hours / 24).toFixed(1)}j`;
};

// Deterministic but varied colour per discipline string
const disciplineColor = (d: string): string => {
    const PALETTE = [
        '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6',
        '#10b981', '#f59e0b', '#f97316', '#ec4899',
        '#8b5cf6', '#84cc16',
    ];
    let h = 0;
    for (let i = 0; i < d.length; i++) h = (h * 31 + d.charCodeAt(i)) & 0xffffffff;
    return PALETTE[Math.abs(h) % PALETTE.length];
};

const LEFT_COL = 300;
const ROW_H = 48;
const GROUP_H = 36;

// ─── Component ───────────────────────────────────────────────────────────────
export const ComparativeGanttChart: React.FC<ComparativeGanttChartProps> = ({
    baseline,
    scenario,
    showBaseline,
    groupBy,
    searchTerm = '',
    onTaskClick,
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [zoom, setZoom] = useState(72); // px per hour
    const [tooltip, setTooltip] = useState<TooltipData | null>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const scenarioColor = scenario?.color ?? '#f59e0b';

    // ── Timeline extents ──────────────────────────────────────────────────────
    const { chartStart, chartEnd } = useMemo(() => {
        const all = baseline.map(t => t.startTime.getTime());
        const allEnd = baseline.map(t => t.endTime.getTime());
        if (scenario) {
            scenario.computedTasks.forEach(t => {
                all.push(t.scenarioStartTime.getTime());
                allEnd.push(t.scenarioEndTime.getTime());
            });
        }
        if (!all.length) return { chartStart: Date.now(), chartEnd: Date.now() + 86400000 };
        const minT = Math.min(...all);
        const maxT = Math.max(...allEnd);
        const pad = (maxT - minT) * 0.015 || 3_600_000;
        return { chartStart: minT - pad, chartEnd: maxT + pad };
    }, [baseline, scenario]);

    const totalMs = chartEnd - chartStart;
    const totalWidth = (totalMs / 3_600_000) * zoom; // px

    // ── Ticks ─────────────────────────────────────────────────────────────────
    const ticks = useMemo(() => {
        const days = totalMs / 86_400_000;
        const tickInterval = days <= 3 ? 6 : days <= 10 ? 12 : days <= 30 ? 24 : 48; // hours
        const out: { date: Date; isMajor: boolean }[] = [];
        const cur = new Date(chartStart);
        cur.setMinutes(0, 0, 0);
        const step = tickInterval * 3_600_000;
        while (cur.getTime() <= chartEnd + step) {
            out.push({ date: new Date(cur), isMajor: cur.getHours() === 0 });
            cur.setTime(cur.getTime() + step);
        }
        return out;
    }, [chartStart, chartEnd, totalMs]);

    // ── Grouping ──────────────────────────────────────────────────────────────
    const groups = useMemo(() => {
        let filtered = searchTerm
            ? baseline.filter(t =>
                t.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.discipline || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.family || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
            : baseline;

        if (groupBy === 'flat') {
            return [{ key: 'ALL', label: 'Toutes les Tâches', tasks: filtered }];
        }

        const map = new Map<string, ScheduledTask[]>();
        filtered.forEach(t => {
            const key = (groupBy === 'family' ? t.family : t.discipline) || 'Autres';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(t);
        });

        return Array.from(map.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, tasks]) => ({
                key,
                label: key,
                tasks: tasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()),
            }));
    }, [baseline, groupBy, searchTerm]);

    // ── Pixel helpers ─────────────────────────────────────────────────────────
    const pxLeft = useCallback(
        (d: Date) => ((d.getTime() - chartStart) / totalMs) * totalWidth,
        [chartStart, totalMs, totalWidth]
    );
    const pxWidth = useCallback(
        (a: Date, b: Date) => Math.max(3, ((b.getTime() - a.getTime()) / totalMs) * totalWidth),
        [totalMs, totalWidth]
    );

    const toggleGroup = (key: string) =>
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col h-full select-none" style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ── Toolbar ── */}
            <div className="flex items-center justify-between px-5 py-3 border-b shrink-0"
                style={{ background: '#080a0e', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-center gap-3">
                    {showBaseline && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                            style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.2)' }}>
                            <div className="w-5 h-2 rounded-sm opacity-50 bg-slate-400" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Baseline</span>
                        </div>
                    )}
                    {scenario && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                            style={{ background: `${scenarioColor}12`, border: `1px solid ${scenarioColor}35` }}>
                            <div className="w-5 h-3 rounded-sm" style={{ background: scenarioColor }} />
                            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: scenarioColor }}>
                                {scenario.name}
                            </span>
                        </div>
                    )}
                    {scenario && scenario.totalDelayDays > 0 && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">
                                +{scenario.totalDelayDays.toFixed(1)}j retard
                            </span>
                        </div>
                    )}
                </div>

                {/* Zoom */}
                <div className="flex items-center gap-3">
                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Zoom</span>
                    <div className="flex items-center gap-1">
                        {[24, 48, 72, 120, 200].map(z => (
                            <button key={z}
                                onClick={() => setZoom(z)}
                                className="px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                style={{
                                    background: zoom === z ? scenarioColor : 'rgba(255,255,255,0.04)',
                                    color: zoom === z ? '#000' : '#64748b',
                                    border: `1px solid ${zoom === z ? scenarioColor : 'rgba(255,255,255,0.07)'}`,
                                }}>
                                {z < 72 ? `×${(z / 24).toFixed(1)}` : zoom === z ? `×${(z / 24).toFixed(1)}` : `×${(z / 24).toFixed(1)}`}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Gantt body ── */}
            <div className="flex flex-col flex-1 overflow-hidden">

                {/* Sticky header row */}
                <div className="flex shrink-0 border-b sticky top-0 z-30"
                    style={{ background: '#080a0e', borderColor: 'rgba(255,255,255,0.06)' }}>
                    {/* Left col header */}
                    <div className="shrink-0 flex items-center px-5 border-r"
                        style={{ width: LEFT_COL, borderColor: 'rgba(255,255,255,0.05)', height: 44 }}>
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.25em]">
                            Tâches ({baseline.length})
                        </span>
                    </div>

                    {/* Timeline ticks */}
                    <div className="flex-1 overflow-hidden relative" style={{ height: 44 }}>
                        <div className="absolute inset-0 overflow-x-hidden" ref={scrollRef}>
                            <div className="relative h-full" style={{ width: totalWidth, minWidth: '100%' }}>
                                {ticks.map((tick, i) => {
                                    const left = pxLeft(tick.date);
                                    if (left < 0 || left > totalWidth) return null;
                                    return (
                                        <div key={i} className="absolute top-0 bottom-0 flex flex-col justify-end pb-2 pl-2"
                                            style={{ left, borderLeft: `1px solid ${tick.isMajor ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)'}` }}>
                                            {tick.isMajor && (
                                                <span className="text-[8px] font-black text-indigo-400 uppercase tracking-tight block mb-0.5 whitespace-nowrap">
                                                    {fmtDate(tick.date)}
                                                </span>
                                            )}
                                            <span className="text-[9px] font-mono font-bold text-slate-500 whitespace-nowrap">
                                                {tick.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Scrollable chart body */}
                <div className="flex-1 overflow-auto"
                    onScroll={e => {
                        if (scrollRef.current) {
                            scrollRef.current.scrollLeft = (e.target as HTMLElement).scrollLeft;
                        }
                    }}>
                    <div className="flex" style={{ minHeight: '100%' }}>

                        {/* Left column (task labels) — sticky */}
                        <div className="shrink-0 sticky left-0 z-20 border-r"
                            style={{ width: LEFT_COL, background: '#080a0e', borderColor: 'rgba(255,255,255,0.06)' }}>
                            {groups.map(group => {
                                const isCollapsed = collapsedGroups.has(group.key);
                                const color = disciplineColor(group.key);
                                return (
                                    <div key={group.key}>
                                        {/* Group header */}
                                        {groupBy !== 'flat' && (
                                            <div
                                                className="flex items-center gap-3 px-4 cursor-pointer transition-colors hover:bg-white/[0.02]"
                                                style={{ height: GROUP_H, background: '#0b0d12', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                                onClick={() => toggleGroup(group.key)}>
                                                <div className="w-1 h-4 rounded-full shrink-0" style={{ background: color }} />
                                                <span className="flex-1 text-[9px] font-black text-white uppercase tracking-widest truncate">
                                                    {group.label}
                                                </span>
                                                <span className="text-[8px] text-slate-600 font-bold shrink-0">{group.tasks.length}</span>
                                                <svg className={`w-3 h-3 text-slate-600 transition-transform shrink-0 ${isCollapsed ? '' : 'rotate-180'}`}
                                                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </div>
                                        )}

                                        {/* Task label rows */}
                                        {!isCollapsed && group.tasks.map(task => {
                                            const isImpacted = scenario?.impactedTaskIds.includes(task.id);
                                            const isModified = scenario && !!scenario.overrides[task.id];
                                            const scT = scenario?.computedTasks.find(t => t.id === task.id);
                                            const dColor = disciplineColor(task.discipline || 'Other');

                                            return (
                                                <div key={task.id}
                                                    className="flex items-center gap-3 px-4 border-b group cursor-pointer transition-colors hover:bg-white/[0.02]"
                                                    style={{ height: ROW_H, borderColor: 'rgba(255,255,255,0.03)' }}
                                                    onClick={() => onTaskClick?.(task)}>
                                                    {/* Status indicator */}
                                                    <div className="w-1.5 h-1.5 rounded-full shrink-0"
                                                        style={{
                                                            background: isModified ? scenarioColor : isImpacted ? '#f97316' : dColor,
                                                            boxShadow: isModified ? `0 0 6px ${scenarioColor}80` : isImpacted ? '0 0 6px #f9731680' : 'none',
                                                        }} />

                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[11px] font-bold text-slate-200 truncate leading-tight" title={task.action}>
                                                            {task.action}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[8px] font-bold uppercase tracking-widest truncate"
                                                                style={{ color: dColor }}>
                                                                {task.discipline}
                                                            </span>
                                                            {isImpacted && scT && (
                                                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                                                                    style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>
                                                                    {fmtDelay(scT.delayHours)}
                                                                </span>
                                                            )}
                                                            {isModified && (
                                                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                                                                    style={{ background: `${scenarioColor}18`, color: scenarioColor }}>
                                                                    modif.
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Right: Gantt bars */}
                        <div className="flex-1 relative" style={{ width: Math.max(totalWidth, 600) }}>

                            {/* Background grid lines */}
                            {ticks.map((tick, i) => {
                                const left = pxLeft(tick.date);
                                return (
                                    <div key={i} className="absolute top-0 bottom-0 pointer-events-none"
                                        style={{
                                            left,
                                            borderLeft: `1px solid ${tick.isMajor ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.025)'}`,
                                        }} />
                                );
                            })}

                            {/* "Now" line based on scenario end vs baseline */}
                            {scenario && (
                                <div className="absolute top-0 bottom-0 z-20 pointer-events-none"
                                    style={{
                                        left: pxLeft(scenario.scenarioEndDate),
                                        borderLeft: `2px dashed ${scenarioColor}80`,
                                    }}>
                                    <div className="absolute top-2 px-2 py-0.5 rounded text-[8px] font-black whitespace-nowrap -translate-x-1/2"
                                        style={{ background: scenarioColor, color: '#000', left: 0 }}>
                                        Fin scénario
                                    </div>
                                </div>
                            )}
                            {baseline.length > 0 && (
                                <div className="absolute top-0 bottom-0 z-20 pointer-events-none"
                                    style={{
                                        left: pxLeft(new Date(Math.max(...baseline.map(t => t.endTime.getTime())))),
                                        borderLeft: '2px dashed rgba(148,163,184,0.3)',
                                    }}>
                                    <div className="absolute top-10 px-2 py-0.5 rounded text-[8px] font-black whitespace-nowrap -translate-x-1/2"
                                        style={{ background: 'rgba(148,163,184,0.2)', color: '#94a3b8', left: 0 }}>
                                        Fin baseline
                                    </div>
                                </div>
                            )}

                            {/* Task rows */}
                            {groups.map(group => {
                                const isCollapsed = collapsedGroups.has(group.key);
                                const color = disciplineColor(group.key);
                                return (
                                    <div key={group.key}>
                                        {/* Group header row spacer */}
                                        {groupBy !== 'flat' && (
                                            <div className="relative border-b"
                                                style={{
                                                    height: GROUP_H,
                                                    background: '#0b0d12',
                                                    borderColor: 'rgba(255,255,255,0.05)',
                                                }}>
                                                {/* Group span bar */}
                                                {group.tasks.length > 0 && (
                                                    <div className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full opacity-20"
                                                        style={{
                                                            left: pxLeft(new Date(Math.min(...group.tasks.map(t => t.startTime.getTime())))),
                                                            width: Math.max(4, pxLeft(new Date(Math.max(...group.tasks.map(t => t.endTime.getTime())))) -
                                                                pxLeft(new Date(Math.min(...group.tasks.map(t => t.startTime.getTime()))))),
                                                            background: color,
                                                        }} />
                                                )}
                                            </div>
                                        )}

                                        {!isCollapsed && group.tasks.map(task => {
                                            const scT = scenario?.computedTasks.find(t => t.id === task.id);
                                            const isImpacted = scenario?.impactedTaskIds.includes(task.id);
                                            const isModified = scenario && !!scenario.overrides[task.id];
                                            const dColor = disciplineColor(task.discipline || 'Other');

                                            const bLeft = pxLeft(task.startTime);
                                            const bW = pxWidth(task.startTime, task.endTime);
                                            const sLeft = scT ? pxLeft(scT.scenarioStartTime) : bLeft;
                                            const sW = scT ? pxWidth(scT.scenarioStartTime, scT.scenarioEndTime) : bW;

                                            // Delay indicator (arrow between bars)
                                            const showDelayArrow = isImpacted && scT && sLeft > bLeft + bW;

                                            return (
                                                <div key={task.id}
                                                    className="relative border-b group cursor-pointer hover:bg-white/[0.015] transition-colors"
                                                    style={{ height: ROW_H, borderColor: 'rgba(255,255,255,0.03)' }}
                                                    onMouseEnter={e => setTooltip({ task, scenTask: scT, x: e.clientX, y: e.clientY })}
                                                    onMouseMove={e => setTooltip(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                                                    onMouseLeave={() => setTooltip(null)}
                                                    onClick={() => onTaskClick?.(task)}>

                                                    {/* ── Baseline bar ─────────────── */}
                                                    {showBaseline && (
                                                        <div className="absolute top-1/2 z-10 rounded-md transition-all"
                                                            style={{
                                                                left: bLeft,
                                                                width: bW,
                                                                height: 10,
                                                                transform: 'translateY(-10px)',
                                                                background: 'rgba(100,116,139,0.35)',
                                                                border: '1px solid rgba(148,163,184,0.25)',
                                                            }} />
                                                    )}

                                                    {/* ── Scenario bar ──────────────── */}
                                                    {scT && (
                                                        <div className="absolute top-1/2 z-20 rounded-md transition-all duration-500"
                                                            style={{
                                                                left: sLeft,
                                                                width: sW,
                                                                height: 18,
                                                                transform: isImpacted ? 'translateY(-50%) translateY(4px)' : 'translateY(-50%)',
                                                                background: isImpacted
                                                                    ? `linear-gradient(90deg, ${scenarioColor}ee, ${scenarioColor}aa)`
                                                                    : `${dColor}cc`,
                                                                border: `1px solid ${isImpacted ? scenarioColor : dColor}`,
                                                                boxShadow: isImpacted
                                                                    ? `0 0 14px ${scenarioColor}50, inset 0 1px 0 rgba(255,255,255,0.25)`
                                                                    : `inset 0 1px 0 rgba(255,255,255,0.15)`,
                                                            }}>
                                                            {/* Shimmer */}
                                                            <div className="absolute inset-x-0 top-0 h-1/2 rounded-t-md pointer-events-none"
                                                                style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%)' }} />
                                                            {/* Label inside bar if wide enough */}
                                                            {sW > 80 && (
                                                                <span className="absolute inset-0 flex items-center px-2 text-[9px] font-black text-white/90 truncate leading-none pointer-events-none">
                                                                    {task.action}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* ── Delay arrow ─────────────── */}
                                                    {showDelayArrow && scT && (
                                                        <svg className="absolute z-15 pointer-events-none"
                                                            style={{
                                                                left: bLeft + bW,
                                                                top: '50%',
                                                                transform: 'translateY(-50%) translateY(4px)',
                                                                width: sLeft - (bLeft + bW),
                                                                height: 18,
                                                                overflow: 'visible',
                                                            }}>
                                                            <defs>
                                                                <marker id={`arrow-${task.id}`} markerWidth="6" markerHeight="6"
                                                                    refX="5" refY="3" orient="auto">
                                                                    <path d="M0,0 L0,6 L6,3 z" fill="#ef4444" />
                                                                </marker>
                                                            </defs>
                                                            <line
                                                                x1="2" y1="9" x2={sLeft - (bLeft + bW) - 4} y2="9"
                                                                stroke="#ef4444"
                                                                strokeWidth="1.5"
                                                                strokeDasharray="4 3"
                                                                markerEnd={`url(#arrow-${task.id})`}
                                                            />
                                                        </svg>
                                                    )}

                                                    {/* ── Modified star badge ─────── */}
                                                    {isModified && scT && (
                                                        <div className="absolute z-30 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                                                            style={{
                                                                left: sLeft + sW - 6,
                                                                top: '50%',
                                                                transform: 'translateY(-50%) translateY(4px)',
                                                                background: scenarioColor,
                                                                boxShadow: `0 0 8px ${scenarioColor}`,
                                                            }}>
                                                            <span className="text-[6px] font-black text-black">✎</span>
                                                        </div>
                                                    )}

                                                    {/* ── Hover highlight stripe ──── */}
                                                    <div className="absolute left-0 right-0 top-0 bottom-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                                        style={{ background: 'rgba(255,255,255,0.012)' }} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tooltip */}
            {tooltip && (
                <div
                    className="fixed z-[200] pointer-events-none"
                    style={{ left: tooltip.x + 18, top: tooltip.y - 10 }}>
                    <div className="rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
                        style={{
                            background: '#0c0f18',
                            border: `1px solid ${scenario ? scenarioColor + '30' : 'rgba(255,255,255,0.1)'}`,
                            width: 300,
                        }}>
                        {/* Header */}
                        <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full shrink-0"
                                    style={{ background: disciplineColor(tooltip.task.discipline || '') }} />
                                <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                                    {tooltip.task.discipline}
                                </span>
                            </div>
                            <p className="text-sm font-black text-white leading-tight">{tooltip.task.action}</p>
                        </div>

                        <div className="p-4 space-y-3">
                            {/* Baseline */}
                            <div>
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-600 mb-1.5">Baseline</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                        <p className="text-[8px] text-slate-600 mb-0.5">Début</p>
                                        <p className="text-[10px] font-black text-slate-300 font-mono">{fmt(tooltip.task.startTime)}</p>
                                    </div>
                                    <div className="p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                        <p className="text-[8px] text-slate-600 mb-0.5">Fin</p>
                                        <p className="text-[10px] font-black text-slate-300 font-mono">{fmt(tooltip.task.endTime)}</p>
                                    </div>
                                </div>
                                <p className="text-[9px] text-slate-500 mt-1.5">Durée: <span className="font-black text-slate-400">{tooltip.task.duration}h</span></p>
                            </div>

                            {/* Scenario */}
                            {tooltip.scenTask && scenario && (
                                <div className="pt-3 border-t" style={{ borderColor: `${scenarioColor}20` }}>
                                    <p className="text-[8px] font-black uppercase tracking-widest mb-1.5" style={{ color: scenarioColor }}>
                                        Scénario · {scenario.name}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="p-2 rounded-lg" style={{ background: `${scenarioColor}0a` }}>
                                            <p className="text-[8px] mb-0.5" style={{ color: scenarioColor + '80' }}>Début</p>
                                            <p className="text-[10px] font-black font-mono" style={{ color: scenarioColor }}>
                                                {fmt(tooltip.scenTask.scenarioStartTime)}
                                            </p>
                                        </div>
                                        <div className="p-2 rounded-lg" style={{ background: `${scenarioColor}0a` }}>
                                            <p className="text-[8px] mb-0.5" style={{ color: scenarioColor + '80' }}>Fin</p>
                                            <p className="text-[10px] font-black font-mono" style={{ color: scenarioColor }}>
                                                {fmt(tooltip.scenTask.scenarioEndTime)}
                                            </p>
                                        </div>
                                    </div>
                                    {tooltip.scenTask.isDelayed && (
                                        <div className="mt-2 flex items-center gap-2 p-2 rounded-lg"
                                            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                                            <svg className="w-3 h-3 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" strokeWidth={2.5}>
                                                <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                                                <path d="M12 9v4M12 17h.01" />
                                            </svg>
                                            <span className="text-[9px] font-black text-red-400">
                                                Retard : {fmtDelay(tooltip.scenTask.delayHours)}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
