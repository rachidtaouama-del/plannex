import React, { useEffect, useRef } from 'react';
import ScrollytellingHero from './ScrollytellingHero';
import ComplexitySlider from './ComplexitySlider';
import missionControl from '@/assets/mission_control.png';
import MissionControlChart from './MissionControlChart';
import { Check, X, ArrowRight, Zap, Target, Layout, Shield, Cpu, Activity } from 'lucide-react';

// SVG Icons for features
const CheckIcon = ({ glow = false }: { glow?: boolean }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
        className={`${glow ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'text-emerald-500'}`}
    >
        <path d="M20 6 9 17l-5-5" />
    </svg>
);

const CrossIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-red-500/70">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

// Optimized Feature Module for the technical hub
const FeatureModule: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    specs: string[];
    index: number;
    delay: string;
}> = ({ icon, title, description, specs, index, delay }) => {
    return (
        <div
            className="group relative p-8 rounded-2xl bg-[#080808] border border-white/5 hover:border-emerald-500/40 transition-all duration-500 overflow-hidden scroll-reveal"
            style={{ transitionDelay: delay }}
        >
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

            <div className="relative z-10">
                <div className="flex items-start justify-between mb-6">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:text-white group-hover:bg-emerald-600 transition-all duration-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                        {icon}
                    </div>
                    <span className="text-[10px] font-mono text-slate-800 group-hover:text-emerald-500/40 font-black transition-colors">
                        MODULE_0{index + 1}
                    </span>
                </div>

                <h3 className="text-lg font-black text-white mb-3 tracking-tighter uppercase group-hover:text-emerald-400 transition-colors">{title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm mb-6 group-hover:text-slate-300 transition-colors">
                    {description}
                </p>

                {/* Sub-specs revealed on hover */}
                <div className="space-y-2 pt-4 border-t border-white/5">
                    {specs.map((spec, i) => (
                        <div key={i} className="flex items-center gap-2 opacity-40 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0" style={{ transitionDelay: `${i * 50}ms` }}>
                            <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">{spec}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tactical Corner Accent */}
            <div className="absolute top-0 right-0 w-12 h-12 opacity-10 group-hover:opacity-40 transition-opacity">
                <div className="absolute top-4 right-4 w-4 h-[1px] bg-emerald-500"></div>
                <div className="absolute top-4 right-4 w-[1px] h-4 bg-emerald-500"></div>
            </div>
        </div>
    );
};

const ComparisonCard: React.FC<{
    title: string;
    subtitle: string;
    items: { text: string; success: boolean; ghost?: boolean }[];
    isPrimary?: boolean;
    delay?: string;
}> = ({ title, subtitle, items, isPrimary, delay }) => (
    <div
        className={`relative p-10 rounded-[2.5rem] border transition-all duration-700 scroll-reveal overflow-hidden group/card ${isPrimary
            ? 'bg-[#0a0a0b] border-emerald-500/40 shadow-[0_0_80px_-20px_rgba(16,185,129,0.3)] lg:scale-110 z-20'
            : 'bg-black/40 border-white/5 hover:bg-black/60 hover:border-white/10 z-10'
            }`}
        style={{ transitionDelay: delay }}
    >
        {/* Animated border glow for primary */}
        {isPrimary && (
            <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0 animate-[shimmer_5s_infinite]"></div>
            </div>
        )}

        {/* Tactical HUD Corners */}
        <div className={`absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 rounded-tl-3xl pointer-events-none transition-all duration-500 ${isPrimary ? 'border-emerald-500' : 'border-white/5 group-hover/card:border-white/20'}`}></div>
        <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 rounded-br-3xl pointer-events-none transition-all duration-500 ${isPrimary ? 'border-emerald-500' : 'border-white/5 group-hover/card:border-white/20'}`}></div>

        {isPrimary && (
            <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 px-6 py-2 bg-emerald-600 rounded-b-2xl text-[9px] font-black uppercase tracking-[0.3em] text-white shadow-[0_10px_30px_-5px_rgba(16,185,129,0.5)] whitespace-nowrap z-30">
                Engineered for Performance
            </div>
        )}

        <div className="relative z-10">
            <div className="flex justify-between items-start mb-10">
                <div>
                    <h3 className={`text-3xl font-black mb-2 tracking-tight transition-colors ${isPrimary ? 'text-white' : 'text-slate-500 group-hover/card:text-slate-300'}`}>{title}</h3>
                    <p className={`text-[10px] font-mono uppercase tracking-[0.3em] font-bold ${isPrimary ? 'text-emerald-500' : 'text-slate-600'}`}>{subtitle}</p>
                </div>
                {isPrimary && (
                    <div className="flex gap-1 items-end h-4">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className={`w-1 bg-emerald-500 rounded-full animate-pulse`} style={{ height: `${i * 20}%`, animationDelay: `${i * 100}ms` }}></div>
                        ))}
                    </div>
                )}
            </div>

            <ul className="space-y-6">
                {items.map((item, i) => (
                    <li key={i} className={`flex items-start gap-4 text-sm transition-all duration-300 ${item.ghost ? 'opacity-20 line-through decoration-1 translate-x-1' : 'group-hover/card:translate-x-1'}`}>
                        <div className="mt-1 flex-shrink-0">
                            {item.success ? (
                                <div className="p-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                                    <CheckIcon glow={isPrimary} />
                                </div>
                            ) : (
                                <div className="p-1 rounded bg-red-500/10 border border-red-500/20 opacity-50">
                                    <CrossIcon />
                                </div>
                            )}
                        </div>
                        <span className={`${isPrimary ? 'text-slate-200 font-semibold' : 'text-slate-500 font-medium'} leading-snug`}>{item.text}</span>
                    </li>
                ))}
            </ul>

            {isPrimary && (
                <div className="mt-12 pt-8 border-t border-emerald-500/10 flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Processing Speed</span>
                        <span className="text-xl font-mono font-black text-white">0.03/ms</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">Reliability</span>
                        <span className="text-xl font-mono font-black text-white">99.98%</span>
                    </div>
                </div>
            )}
        </div>
    </div>
);


const LandingPage: React.FC<{ onEnterApp: () => void; setPage: (page: any) => void }> = ({ onEnterApp, setPage }) => {
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        const targets = document.querySelectorAll('.scroll-reveal');
        targets.forEach(target => observer.observe(target));

        return () => targets.forEach(target => observer.unobserve(target));
    }, []);

    return (
        <main className="bg-black">
            <style>{`
                .scroll-reveal {
                    opacity: 0;
                    transform: translateY(30px);
                    transition: all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                .scroll-reveal.visible {
                    opacity: 1;
                    transform: translateY(0);
                }
                .glass-panel {
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                }
            `}</style>

            <ScrollytellingHero onEnterApp={onEnterApp} setPage={setPage} />

            {/* Mission Control Showcase Section */}
            <section className="relative py-28 sm:py-36 overflow-hidden">
                {/* Separator line */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(16,185,129,0.4), transparent)' }} />

                {/* Background radial glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] rounded-full" style={{ background: 'radial-gradient(ellipse, rgba(16,185,129,0.04) 0%, transparent 70%)' }} />
                </div>

                <div className="w-full mx-auto px-6 lg:px-12 2xl:px-24">
                    {/* Section header — two-column on desktop */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-end mb-16 scroll-reveal">
                        {/* Left: heading */}
                        <div>
                            <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.18)' }}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Live Platform Preview</span>
                            </div>
                            <h2 className="text-5xl md:text-6xl font-black leading-[0.95] tracking-tighter uppercase">
                                <span className="text-white">Your </span>
                                <span style={{ background: 'linear-gradient(135deg, #34d399 0%, #10b981 40%, #06b6d4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Mission</span>
                                <br />
                                <span style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Control</span>
                                <span className="text-white"> Panel.</span>
                            </h2>
                        </div>

                        {/* Right: description + bullet features */}
                        <div className="space-y-6">
                            <p className="text-lg text-slate-400 leading-relaxed">
                                Stop guessing. PlanneX provides a real-time, high-fidelity view of your entire project lifecycle—from raw machine logs to executive decision matrices.
                            </p>
                            <ul className="space-y-3">
                                {[
                                    { label: 'Live Gantt engine with sub-second refresh', color: '#10b981' },
                                    { label: 'AI-driven anomaly detection & root cause', color: '#06b6d4' },
                                    { label: 'Multi-discipline resource radar mapping', color: '#34d399' },
                                    { label: 'Phase drift alerts before they cost millions', color: '#f59e0b' },
                                ].map(item => (
                                    <li key={item.label} className="flex items-center gap-3">
                                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: item.color, boxShadow: `0 0 8px ${item.color}80` }} />
                                        <span className="text-sm font-medium text-slate-300">{item.label}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Chart container with layered premium framing */}
                    <div className="relative scroll-reveal">
                        {/* Outer glow layer */}
                        <div className="absolute -inset-4 rounded-3xl pointer-events-none" style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(16,185,129,0.1) 0%, transparent 70%)' }} />
                        {/* Border glow */}
                        <div className="absolute -inset-px rounded-2xl pointer-events-none" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.3), rgba(6,182,212,0.15), rgba(16,185,129,0.1))', WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude', padding: '1px' }} />
                        {/* Corner bracket decorations */}
                        {[['top-0 left-0', 'border-t border-l'], ['top-0 right-0', 'border-t border-r'], ['bottom-0 left-0', 'border-b border-l'], ['bottom-0 right-0', 'border-b border-r']].map(([pos, borders]) => (
                            <div key={pos} className={`absolute ${pos} w-8 h-8 ${borders} border-emerald-500/50 rounded-sm pointer-events-none z-20`} style={{ margin: '-4px' }} />
                        ))}
                        <MissionControlChart />
                    </div>
                </div>
            </section>

            {/* Comparison Section */}
            <section id="comparison" className="py-32 sm:py-48 px-6 bg-[#020202] relative overflow-hidden">
                {/* Background Grid Accent */}
                <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(rgba(16,185,129,1)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,1)_1px,transparent_1px)] bg-[size:100px_100px]"></div>

                <div className="w-full px-6 lg:px-12 2xl:px-24 mx-auto relative z-10">
                    <div className="text-center mb-28 scroll-reveal">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-500/10 border border-slate-500/20 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                            Market Analysis // Efficiency
                        </div>
                        <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tighter uppercase leading-none">
                            Legacy VS. <span className="text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]">Precision</span>
                        </h2>
                        <p className="text-slate-400 text-xl font-medium max-w-3xl mx-auto leading-relaxed">
                            Why the world's leading industrial projects are migrating from bloated legacy software to high-performance planning engines.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-stretch mt-12 pb-12">
                        <ComparisonCard
                            title="Primavera P6"
                            subtitle="The Legacy Standard"
                            delay="0.1s"
                            items={[
                                { text: "UI/UX Complexe & Daté", success: false, ghost: true },
                                { text: "Rapports Difficiles à personnaliser", success: false, ghost: true },
                                { text: "Gestion de projet avancée", success: true },
                                { text: "Analyse IA Non Intégrée", success: false, ghost: true },
                                { text: "Coût Très Élevé", success: false, ghost: true }
                            ]}
                        />

                        <ComparisonCard
                            isPrimary
                            title="PlanneX"
                            subtitle="The Modern Engine"
                            delay="0s"
                            items={[
                                { text: "UI/UX Intuitive & Réactive", success: true },
                                { text: "Intelligence Artificielle Intégrée", success: true },
                                { text: "Dashboards Interactifs Temps Réel", success: true },
                                { text: "Export Multi-Format (PDF/PPT)", success: true },
                                { text: "Gestion Visuelle du Chemin Critique", success: true },
                                { text: "Collaboration Multi-Utilisateurs", success: true }
                            ]}
                        />

                        <ComparisonCard
                            title="MS Project"
                            subtitle="The Desktop Utility"
                            delay="0.2s"
                            items={[
                                { text: "UI/UX Familier mais limité", success: false, ghost: true },
                                { text: "Rapports Statiques", success: false, ghost: true },
                                { text: "Intégration Office Native", success: true },
                                { text: "Absence d'Analyse Prédictive", success: false, ghost: true },
                                { text: "Déploiement Complexe en Cloud", success: false, ghost: true }
                            ]}
                        />
                    </div>
                </div>
            </section>

            {/* Clarity Slider Section */}
            <ComplexitySlider />

            {/* Features Showcase - Reimagined as Technical Core */}
            <section id="features" className="py-32 sm:py-48 px-6 relative overflow-hidden">
                {/* Background Tactical Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="w-full px-6 lg:px-12 2xl:px-24 mx-auto relative z-10">
                    <div className="flex flex-col items-center text-center mb-32 scroll-reveal">
                        <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10">
                            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">System Architecture v2.4</span>
                        </div>
                        <h2 className="text-5xl md:text-8xl font-black text-white mb-8 uppercase tracking-tighter leading-[0.85]">
                            ENGINEERED FOR <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">CHAOS.</span>
                        </h2>
                        <p className="text-slate-400 text-xl leading-relaxed font-medium max-w-2xl">
                            Built to handle thousands of tasks, hundreds of resources, and zero room for error. A hardened planning core for critical environments.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
                        {/* Central Pulse Indicator (Floating between items on Desktop) */}
                        <div className="hidden lg:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-px z-0">
                            <div className="absolute w-[400px] h-[400px] -translate-x-1/2 -translate-y-1/2 border border-emerald-500/10 rounded-full animate-[spin_20s_linear_infinite]"></div>
                            <div className="absolute w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 border border-white/5 rounded-full animate-[spin_35s_linear_infinite_reverse]"></div>
                        </div>

                        <FeatureModule
                            index={0}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M18 12H9" /><path d="M15 9h-3" /><path d="M12 6H9" /></svg>}
                            title="Gantt Charts Dynamic"
                            description="Schedules that breathe. Update dates, dependencies, and resources with instant visual feedback."
                            specs={["Auto-leveling", "Dependency mapping", "Critical path v3"]}
                            delay="0.1s"
                        />
                        <FeatureModule
                            index={1}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3-1.9 5.8-5.8 1.9 5.8 1.9 1.9 5.8 1.9-5.8 5.8-1.9-5.8-1.9Z" /><circle cx="12" cy="12" r="3" /></svg>}
                            title="AI Predictive Engine"
                            description="Automatically detects resource conflicts and bottleneck risks before they impact your milestones."
                            specs={["Risk forecasting", "Clustering logic", "Anomaly alerts"]}
                            delay="0.2s"
                        />
                        <FeatureModule
                            index={2}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
                            title="Executive Reporting"
                            description="One-click boardroom ready reports. Custom PDF and PPT exports formatted for clarity and impact."
                            specs={["One-click export", "Custom templates", "Live sync"]}
                            delay="0.3s"
                        />
                        <FeatureModule
                            index={3}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /></svg>}
                            title="Risk & HSE Monitoring"
                            description="Isolate hazardous tasks and high-risk activities automatically. Ensure compliance with safety tracking."
                            specs={["Co-activity check", "HSE compliance", "Risk heatmaps"]}
                            delay="0.4s"
                        />
                        <FeatureModule
                            index={4}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20V16" /></svg>}
                            title="Post-Stop Evaluation"
                            description="Deep post-mortem analysis. Compare planned vs. actual performance to drive improvement."
                            specs={["Variance analysis", "Lessons learned", "Performance KPI"]}
                            delay="0.5s"
                        />
                        <FeatureModule
                            index={5}
                            icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /></svg>}
                            title="Resource Logistics"
                            description="Manage teams, equipment, and specialty labor with precision. Real-time availability balancing."
                            specs={["Team allocation", "Tool tracking", "Shift management"]}
                            delay="0.6s"
                        />
                    </div>
                </div>
            </section>


            {/* Nuclear CTA Section */}
            <section className="relative py-40 px-6 overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img src={missionControl} alt="Mission Control" className="w-full h-full object-cover opacity-20 filter grayscale" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent"></div>
                </div>

                <div className="relative z-10 max-w-4xl mx-auto text-center scroll-reveal">
                    <h2 className="text-5xl md:text-8xl font-black text-white mb-8 tracking-tighter uppercase leading-none">
                        PLAN WITH <br /> <span className="text-emerald-400">INTENT.</span>
                    </h2>
                    <p className="text-xl md:text-2xl text-slate-400 mb-16 leading-relaxed font-medium">
                        Join the next generation of industrial project managers. <br /> Secure your schedule. Eliminate the drift.
                    </p>

                    <button
                        onClick={onEnterApp}
                        className="group relative inline-flex items-center justify-center px-16 py-6 text-xl font-black text-white transition-all duration-300 bg-emerald-600 rounded-2xl overflow-hidden hover:scale-105 shadow-[0_20px_50px_-10px_rgba(16,185,129,0.5)] active:scale-95"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-white/30 to-emerald-400/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
                        <span className="relative z-10 tracking-widest uppercase">ENTER COMMAND CENTER</span>
                    </button>

                    <div className="mt-12 text-slate-500 font-mono text-[10px] uppercase tracking-[0.3em]">
                        Deployment stable // System online v2.4.0
                    </div>
                </div>
            </section>
        </main>
    );
};

export default LandingPage;