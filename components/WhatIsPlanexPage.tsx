import React, { useState } from 'react';

const GridBg = () => (
    <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_60%,transparent_100%)]"></div>
    </div>
);

const HCard: React.FC<{ children: React.ReactNode; className?: string; title?: string; titleColor?: string }> = ({ children, className = "", title, titleColor = "emerald" }) => (
    <div className={`bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-7 relative overflow-hidden hover:border-slate-600/80 transition-colors duration-500 ${className}`}>
        <div className="absolute top-0 left-0 w-4 h-4 border-l border-t border-emerald-500/25 rounded-tl-lg"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-r border-t border-emerald-500/25 rounded-tr-lg"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-l border-b border-emerald-500/15 rounded-bl-lg"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-emerald-500/15 rounded-br-lg"></div>
        {title && <h4 className={`text-base font-bold text-${titleColor}-400 mb-4 flex items-center gap-2`}>
            <span className={`w-1 h-5 bg-${titleColor}-500 rounded-full`}></span>{title}
        </h4>}
        <div className="relative z-10">{children}</div>
    </div>
);

const Divider = ({ color = 'emerald' }: { color?: string }) => (
    <div className="flex items-center gap-4 my-14">
        <div className="flex-1 h-px bg-white/5"></div>
        <div className="flex gap-1.5">
            {[0.5, 0.25, 0.1].map((o, i) => <div key={i} className={`w-1 h-1 rounded-full`} style={{ background: `rgba(16,185,129,${o})` }}></div>)}
        </div>
        <div className="flex-1 h-px bg-white/5"></div>
    </div>
);

const SectionBadge = ({ num, label, color = '#10b981', subLabel }: { num: string; label: string; color?: string; subLabel?: string }) => (
    <div className="flex items-start gap-5 mb-8">
        <div className="flex-shrink-0 w-14 h-14 rounded-2xl border flex items-center justify-center" style={{ background: `${color}10`, borderColor: `${color}40`, boxShadow: `0 0 20px ${color}15` }}>
            <span className="font-black text-xl font-mono" style={{ color }}>{num}</span>
        </div>
        <div>
            {subLabel && <p className="text-[10px] font-mono uppercase tracking-[0.3em] mb-1" style={{ color }}>{subLabel}</p>}
            <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">{label}</h3>
        </div>
    </div>
);

export const WhatIsPlanexPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState(0);

    return (
        <div className="min-h-screen bg-[#020202] relative overflow-hidden font-sans">
            <GridBg />
            <main className="relative z-10 pt-32 pb-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">

                    {/* ═══ PAGE HERO ═══════════════════════════════════ */}
                    <div className="text-center mb-20">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono tracking-widest uppercase mb-6">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            System Overview
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-5 uppercase leading-none">
                            What is <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">PlanneX</span>?
                        </h1>
                        <div className="h-px w-20 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent mx-auto mb-7"></div>
                        <p className="text-lg text-slate-400 leading-relaxed max-w-3xl mx-auto">
                            A next-generation industrial scheduling engine, powered by AI, designed to transform the complexity of technical shutdowns into total executive clarity.
                        </p>
                    </div>




                    {/* ═══════════════════════════════════════════════════
                        THE DEFINITIVE GUIDE
                    ═══════════════════════════════════════════════════ */}
                    <div className="relative text-center mb-20 py-14 px-6 rounded-3xl border border-white/5 overflow-hidden">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_50%,rgba(16,185,129,0.05),transparent)] pointer-events-none"></div>
                        <div className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 border-emerald-500/40 rounded-tl-xl"></div>
                        <div className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 border-emerald-500/40 rounded-tr-xl"></div>
                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/15 text-emerald-400 text-[10px] font-mono tracking-widest uppercase mb-5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Industrial Reference Guide
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none mb-4">
                                Mastering the Shutdown:<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">The Definitive PlanneX Guide</span>
                            </h2>
                            <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed mb-6">From raw industrial chaos to total strategic command — the complete framework that revolutionizes shutdown planning.</p>
                            <div className="flex items-center justify-center gap-6 text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                                <span>March 2026</span><span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                <span>Read: ~12 min</span><span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                <span>Expert-Level</span>
                            </div>
                        </div>
                    </div>

                    {/* ─── I. THE HIGH-STAKES LANDSCAPE ─────────────── */}
                    <SectionBadge num="I" subLabel="Strategic Context" label="The High-Stakes Landscape" color="#10b981" />
                    <div className="grid lg:grid-cols-3 gap-5 mb-8">
                        <div className="lg:col-span-2">
                            <HCard>
                                <p className="text-slate-300 leading-relaxed mb-4 text-sm">
                                    In high-pressure industrial environments — refineries, power plants, massive manufacturing facilities — time is the most volatile currency. We don't measure delays in hours; we measure them in <span className="text-emerald-400 font-semibold">"capital evaporation" at millions per minute.</span>
                                </p>
                                <p className="text-slate-400 leading-relaxed text-sm">
                                    Traditional tools, while familiar, were never designed to handle the high-density data ingestion and extreme interdependencies of a modern industrial shutdown. They force project managers into the role of <strong className="text-white">data entry clerks</strong>, rather than strategic commanders.
                                </p>
                            </HCard>
                        </div>
                        <div>
                            <HCard className="h-full flex flex-col justify-center bg-gradient-to-br from-red-950/40 to-slate-900/60 border-red-500/20">
                                <div className="text-center">
                                    <div className="text-5xl font-black text-red-400 font-mono mb-2">1:1</div>
                                    <p className="text-red-400/70 text-[10px] font-mono uppercase tracking-widest font-bold mb-3">Critical Ratio</p>
                                    <p className="text-slate-500 text-xs leading-relaxed">1 hour of delay on the Critical Path = 1 hour lost on the final date. No exceptions.</p>
                                </div>
                            </HCard>
                        </div>
                    </div>

                    {/* Legacy vs Reality table */}
                    <div className="overflow-x-auto rounded-2xl border border-white/8 mb-8">
                        <table className="w-full text-xs">
                            <thead><tr className="bg-white/4 border-b border-white/8">
                                <th className="text-left p-4 text-slate-500 font-mono uppercase tracking-widest">Legacy Tool Limitations</th>
                                <th className="text-left p-4 text-slate-500 font-mono uppercase tracking-widest">Industrial Reality</th>
                            </tr></thead>
                            <tbody>
                                {[
                                    ["Rigid interface & steep learning curve — slow and outdated reports.", "Extreme complexity: thousands of 'logical links' (dependencies) interconnected."],
                                    ["Vague percentages: \"80% complete\" — zero mathematical certainty for scheduling logic.", "High financial consequences: every minute of downtime represents irrecoverable revenue loss."],
                                    ["Unreadable static Gantts: obscure the critical path and ignore real-time risks.", "Dynamic environment: a delay on the project's 'backbone' triggers a cascade."],
                                ].map(([a, b], i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                                        <td className="p-4 text-red-400/80 leading-relaxed">{a}</td>
                                        <td className="p-4 text-slate-300 leading-relaxed">{b}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="border-l-4 border-red-500/60 pl-6 py-2 bg-red-500/5 rounded-r-2xl mb-6">
                        <p className="text-slate-300 italic text-sm leading-relaxed">
                            This technical deficit in existing tools creates a <strong className="text-white">dangerous latency in intervention</strong> and forces leaders to manage by intuition rather than operational visibility.
                        </p>
                    </div>

                    <Divider color="emerald" />

                    {/* ─── II. SOFTWARE COMPARISON ────────────────────── */}
                    <SectionBadge num="II" subLabel="Comparative Report" label="The Tool Audit: PlanneX vs. Legacy Solutions" color="#3b82f6" />
                    <HCard className="mb-6">
                        <p className="text-slate-400 text-sm leading-relaxed mb-0">A rigorous audit of legacy systems reveals that, while they have served as historical pillars, their structural limitations now create <span className="text-white font-semibold">critical operational blind spots</span> for modern managers.</p>
                    </HCard>
                    <div className="overflow-x-auto rounded-2xl border border-white/8 mb-8">
                        <table className="w-full text-xs">
                            <thead><tr className="bg-white/4 border-b border-white/8">
                                <th className="text-left p-4 text-slate-500 font-mono uppercase tracking-widest">Criteria</th>
                                <th className="text-left p-4 text-red-400/70 font-mono uppercase tracking-widest">MS Project</th>
                                <th className="text-left p-4 text-orange-400/70 font-mono uppercase tracking-widest">Primavera P6</th>
                                <th className="text-left p-4 text-emerald-400 font-mono uppercase tracking-widest">PlanneX ✓</th>
                            </tr></thead>
                            <tbody>
                                {[
                                    ["UI/UX", "Familiar but limited; rigid interface.", "Complex, dated, notoriously steep learning curve.", "Intuitive, modern, and agile operational architecture."],
                                    ["Reports", "Standard; low flexibility.", "Difficult to customize; specialized expertise required.", "Interactive dashboards with executive filters and drill-down."],
                                    ["AI", "Non-existent or superficial.", "Not integrated; lacks predictive intelligence.", "Embedded AI for optimization and predictive recommendations."],
                                    ["Data", "Manual and tedious.", "Complex, multi-step data entry.", "Live editing, AI co-pilot, real-time telemetry."],
                                    ["Cost", "Moderate (subscription).", "High, complex, often license-limited.", "Affordable, flexible, designed for the modern enterprise."],
                                ].map(([c, ms, p6, px], i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                                        <td className="p-4 text-white font-semibold">{c}</td>
                                        <td className="p-4 text-red-400/80 leading-relaxed">{ms}</td>
                                        <td className="p-4 text-orange-400/70 leading-relaxed">{p6}</td>
                                        <td className="p-4 text-emerald-400 leading-relaxed font-medium">{px}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="border-l-4 border-blue-500 pl-6 py-2 bg-blue-500/5 rounded-r-2xl">
                        <p className="text-slate-300 italic text-sm leading-relaxed">
                            Our core mandate is the <strong className="text-white">evolution of the project manager</strong>: transitioning from manual data entry to high-level strategic oversight powered by PlanneX.
                        </p>
                    </div>

                    <Divider color="blue" />

                    {/* ─── PILLAR I ────────────────────────────────────── */}
                    <SectionBadge num="I" subLabel="Core Pillar" label="Intelligent Planning — The Digital Twin" color="#10b981" />
                    <HCard className="mb-6">
                        <p className="text-slate-300 text-sm leading-relaxed mb-3">
                            A master plan is not a static document; it is the essential foundation of risk management. The first step is building the <span className="text-emerald-400 font-semibold">Digital Twin</span> — a complete digital model that serves as the single source of truth. It enables <strong className="text-white">preventive simulation</strong> of the entire shutdown, identifying bottlenecks <em>before</em> they manifest on the ground.
                        </p>
                    </HCard>

                    {/* Dual mode tabs */}
                    <div className="mb-6">
                        <div className="flex gap-2 mb-5">
                            {["AI Co-pilot (Automatic)", "Expert Control (Manual)"].map((t, i) => (
                                <button key={i} onClick={() => setActiveTab(i)} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === i ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-slate-500 hover:text-white border border-white/10'}`}>{t}</button>
                            ))}
                        </div>
                        <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                            {activeTab === 0 ? (
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                                        <span className="text-emerald-400 font-black text-sm uppercase tracking-widest">AI Co-pilot — Active Mode</span>
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed mb-3">The system leverages AI to analyze <strong className="text-white">thousands of permutations in seconds</strong>, identifying the fastest task sequence to minimize total project duration. This redefines the planner's role: shifting from manual data entry to high-level strategic oversight.</p>
                                    <div className="flex flex-wrap gap-2">
                                        {["Algorithmic optimization", "Automatic optimal sequences", "Strategic oversight"].map((t, i) => (
                                            <span key={i} className="text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full uppercase tracking-widest">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-2.5 h-2.5 bg-blue-400 rounded-full"></div>
                                        <span className="text-blue-400 font-black text-sm uppercase tracking-widest">Expert Control — Tactical Mode</span>
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed mb-3">For experienced professionals requiring <strong className="text-white">surgical precision</strong>, this mode provides absolute manual command over sequences and timings. It ensures that site-specific nuances and professional intuition are fully respected.</p>
                                    <div className="flex flex-wrap gap-2">
                                        {["Granular command", "Total authority", "Field nuance integrated"].map((t, i) => (
                                            <span key={i} className="text-[10px] font-mono bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full uppercase tracking-widest">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <HCard title="The Dynamic Gantt — The Living Project Map" titleColor="emerald">
                        <p className="text-slate-400 text-sm leading-relaxed mb-4">
                            Unlike the static documents of the past, PlanneX's Gantt is a <strong className="text-white">living interactive map</strong>. Through "automated impact propagation," users drag elements to see the <span className="text-emerald-400">real-time ripple effect</span> of a change across the entire schedule.
                        </p>
                        <div className="grid sm:grid-cols-3 gap-3 mt-4">
                            {[
                                { icon: "⚡", label: "AI Optimization", desc: "Identifies the fastest sequence and optimal resource assignments." },
                                { icon: "🗓️", label: "Real-World Anchoring", desc: "Integrates real calendars (3x8, 2x10) — a feasible execution guide, not a fantasy." },
                                { icon: "🗺️", label: "Spatial Filtering", desc: "Filter by plant zones or shifts for localized, isolated control." }
                            ].map((item, i) => (
                                <div key={i} className="p-4 rounded-xl bg-black/30 border border-white/5 hover:border-emerald-500/20 transition-colors">
                                    <div className="text-2xl mb-2">{item.icon}</div>
                                    <p className="text-emerald-400 font-bold text-xs mb-1.5">{item.label}</p>
                                    <p className="text-slate-500 text-xs leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </HCard>

                    <Divider color="amber" />

                    {/* ─── PILLAR II ────────────────────────────────────── */}
                    <SectionBadge num="II" subLabel="Operational Pillar" label="Hot Tracking — Connecting the Plan to Reality" color="#f59e0b" />
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <HCard>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                                <span className="text-red-400 font-black text-xs uppercase tracking-widest">Banned in PlanneX</span>
                            </div>
                            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 mb-3">
                                <p className="text-red-400 text-3xl font-black font-mono text-center mb-1">80%</p>
                                <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest text-center">"Complete" Percentage</p>
                            </div>
                            <p className="text-slate-500 text-xs leading-relaxed">Subjective human estimation. Breaks scheduling logic. No reliable mathematical basis for forecasting. <strong className="text-red-400">Permanently removed.</strong></p>
                        </HCard>
                        <HCard className="border-emerald-500/20 bg-emerald-500/3">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.8)]"></div>
                                <span className="text-emerald-400 font-black text-xs uppercase tracking-widest">The Truth Metric</span>
                            </div>
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-3">
                                <p className="text-emerald-400 font-black font-mono text-center mb-1 text-sm">Remaining Hours</p>
                                <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest text-center">Remaining Duration (Hours)</p>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">A <strong className="text-white">mathematically pure</strong> number. Identifies exactly the remaining work hours. Eliminates all ambiguity. Reliable foundation for every scheduling calculation.</p>
                        </HCard>
                    </div>
                    <HCard title="Live Slippage Calculation — Field Telemetry" titleColor="amber">
                        <p className="text-slate-400 text-sm mb-5 leading-relaxed">When reality deviates from the plan, the system employs a rigorous telemetry process:</p>
                        <div className="space-y-3">
                            {[
                                { n: "01", c: "amber", label: "Field Report (Check-In/Check-Out)", desc: "A team leader reports a delay through the system — objective data, no interpretation." },
                                { n: "02", c: "orange", label: "Live Slippage Calculation", desc: "The system instantly measures the ripple effect of this specific delay on all dependent tasks." },
                                { n: "03", c: "emerald", label: "Final Date & Critical Path Impact", desc: "Immediate recalculation of the final deadline and critical path — field data to mission control." }
                            ].map(item => (
                                <div key={item.n} className="flex items-start gap-4 p-4 bg-black/30 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                    <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                                        <span className="text-amber-400 font-black text-[10px] font-mono">{item.n}</span>
                                    </div>
                                    <div>
                                        <p className="text-white font-bold text-sm mb-1">{item.label}</p>
                                        <p className="text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </HCard>

                    <Divider color="purple" />

                    {/* ─── PILLAR III ───────────────────────────────────── */}
                    <SectionBadge num="III" subLabel="Decision Pillar" label="Strategic Command — Mission Control" color="#a855f7" />
                    <div className="grid lg:grid-cols-2 gap-7 mb-6">
                        <HCard title="Absolute Focus on the Critical Path" titleColor="purple">
                            <p className="text-slate-400 text-sm leading-relaxed mb-4">The project's backbone is the <span className="text-white font-semibold">Critical Path</span> — the longest chain of dependent tasks with <strong className="text-red-400">zero slack</strong>. The mathematics are absolute:</p>
                            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-center mb-4">
                                <p className="text-red-400 font-black font-mono text-sm">1h delay = 1h of final slippage</p>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">PlanneX maintains a <strong className="text-white">permanent visual highlight</strong> on this path. Instant alerts notify managers <em>the microsecond</em> a critical task deviates — maximizing the reaction window to reallocate resources.</p>
                        </HCard>
                        <HCard title="The 3 Predictive KPIs of the Executive Dashboard" titleColor="purple">
                            <div className="space-y-4">
                                {[
                                    { n: "1", c: "emerald", label: "Progress Rate", desc: "Overview of the project's overall completion status. High-level health check." },
                                    { n: "2", c: "blue", label: "Total Man-Hours (HH)", desc: "Granular tracking of resource consumption vs budget — by discipline (mechanical, electrical, etc.)." },
                                    { n: "3", c: "amber", label: "Slippage Potential ★", desc: "The \"Game Changer\". Predictive metric (e.g., \"+32h\") based on current trends — enables intervention BEFORE failure.", highlight: true }
                                ].map(kpi => (
                                    <div key={kpi.n} className={`flex gap-4 p-3.5 rounded-xl ${(kpi as any).highlight ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-white/3 border border-white/5'}`}>
                                        <div className={`flex-shrink-0 w-8 h-8 rounded-lg bg-${kpi.c}-500/20 border border-${kpi.c}-500/30 flex items-center justify-center text-${kpi.c}-400 font-black text-sm font-mono`}>{kpi.n}</div>
                                        <div>
                                            <p className={`text-${kpi.c}-400 font-black text-xs mb-1`}>{kpi.label}</p>
                                            <p className="text-slate-500 text-[11px] leading-relaxed">{kpi.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </HCard>
                    </div>
                    <div className="overflow-x-auto rounded-2xl border border-white/8 mb-6">
                        <table className="w-full text-xs">
                            <thead><tr className="bg-white/4 border-b border-white/8">
                                <th className="text-left p-4 text-slate-500 font-mono uppercase tracking-widest">KPI</th>
                                <th className="text-left p-4 text-slate-500 font-mono uppercase tracking-widest">Strategic Definition</th>
                                <th className="text-left p-4 text-slate-500 font-mono uppercase tracking-widest">Operational Value</th>
                            </tr></thead>
                            <tbody>
                                {[
                                    ["Progress Rate", "Completion status of the project's complete architecture.", "Project velocity health check."],
                                    ["Total HH", "Resource consumption vs financial budget.", "Financial accountability and resources."],
                                    ["Slippage Potential", "Predictive metric based on current performance.", "Proactive intervention before deviations become critical failures."],
                                ].map(([a, b, c], i) => (
                                    <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                                        <td className="p-4 text-purple-400 font-semibold">{a}</td>
                                        <td className="p-4 text-slate-400 leading-relaxed">{b}</td>
                                        <td className="p-4 text-slate-300 leading-relaxed">{c}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <Divider color="emerald" />

                    {/* ─── VIRTUOUS CYCLE ────────────────────────────── */}
                    <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 p-10 md:p-14 mb-14"
                        style={{ background: 'linear-gradient(135deg, rgba(2,20,15,0.95) 0%, #020202 50%, rgba(2,10,25,0.95) 100%)' }}>
                        <div className="absolute -top-20 -right-20 w-72 h-72 bg-emerald-500/8 rounded-full blur-[100px] pointer-events-none"></div>
                        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-blue-500/8 rounded-full blur-[100px] pointer-events-none"></div>
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.015)_1px,transparent_1px)] bg-[size:40px_40px] rounded-3xl pointer-events-none"></div>
                        <div className="absolute top-4 left-4 w-5 h-5 border-t-2 border-l-2 border-emerald-500/40 rounded-tl-xl pointer-events-none"></div>
                        <div className="absolute top-4 right-4 w-5 h-5 border-t-2 border-r-2 border-emerald-500/40 rounded-tr-xl pointer-events-none"></div>
                        <div className="relative z-10">
                            <div className="text-center mb-10">
                                <p className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.3em] font-bold mb-2">Final Synthesis</p>
                                <h3 className="text-3xl font-black text-white tracking-tight mb-3">The Virtuous Cycle of Total Command</h3>
                                <p className="text-slate-400 text-sm leading-relaxed max-w-2xl mx-auto">Real-time field data informs Mission Control, which continuously refines the master plan — a self-correcting closed-loop system of operational excellence.</p>
                            </div>

                            {/* Cycle arrows visual */}
                            <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
                                {["PLAN", "→", "TRACK", "→", "COMMAND", "→", "OPTIMIZE"].map((item, i) => (
                                    <span key={i} className={item === "→" ? "text-slate-600 font-mono text-lg" : "text-[10px] font-black font-mono px-4 py-2 rounded-xl uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"}>{item}</span>
                                ))}
                            </div>

                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                                {[
                                    { n: "01", v: "PLAN", e: "📡", desc: "Build the Digital Twin by ingesting tasks, resources, and real shift calendars." },
                                    { n: "02", v: "OPTIMIZE", e: "⚡", desc: "AI scans thousands of possibilities to identify the fastest completion sequence." },
                                    { n: "03", v: "TRACK", e: "🔍", desc: "Hot Tracking with Remaining Hours — mathematically pure field data." },
                                    { n: "04", v: "COMMAND", e: "🎯", desc: "Unfailing focus on the Critical Path via the predictive Executive Dashboard and instant alerts." }
                                ].map(item => (
                                    <div key={item.n} className="bg-black/40 border border-white/8 rounded-2xl p-5 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1 group cursor-default">
                                        <div className="text-2xl mb-2">{item.e}</div>
                                        <p className="text-[9px] font-mono text-slate-700 tracking-widest mb-1">STEP {item.n}</p>
                                        <p className="text-emerald-400 font-black text-xs uppercase tracking-wider mb-2 group-hover:text-emerald-300 transition-colors">{item.v}</p>
                                        <p className="text-slate-500 text-[11px] leading-relaxed group-hover:text-slate-400 transition-colors">{item.desc}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid md:grid-cols-3 gap-4 mb-10">
                                {[
                                    { from: "Intuition", to: "Data-driven decisions", icon: "🧠" },
                                    { from: "Reactive (Firefighting)", to: "Proactive (Predictive Slippage)", icon: "🔮" },
                                    { from: "Data entry clerk", to: "Strategic architect", icon: "👤" }
                                ].map((item, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white/3 border border-white/5 text-center">
                                        <div className="text-2xl mb-2">{item.icon}</div>
                                        <p className="text-red-400/70 text-[10px] font-mono line-through mb-1">{item.from}</p>
                                        <p className="text-emerald-400 text-xs font-bold">{item.to}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-8 border-t border-white/5 text-center">
                                <p className="text-slate-500 text-sm italic leading-relaxed max-w-3xl mx-auto">
                                    "The transition from manually tracking physical complexity to using AI for total integrated control represents a <strong className="text-slate-300">paradigm shift in industrial operations</strong> — we've moved from recording history to <em>actively predicting and shaping</em> the outcomes of our most complex projects."
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default WhatIsPlanexPage;
