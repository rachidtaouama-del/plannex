import React from 'react';

const GridBg = () => (
    <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_60%,transparent_100%)]"></div>
    </div>
);

const HCard: React.FC<{ children: React.ReactNode; className?: string; title?: string; titleColor?: string }> = ({ children, className = "", title, titleColor = "emerald" }) => (
    <div className={`bg-slate-900/40 backdrop-blur-xl border border-slate-700/30 rounded-3xl p-8 relative overflow-hidden group hover:border-slate-600/50 transition-all duration-700 ${className}`}>
        <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-emerald-500/20 rounded-tl-2xl group-hover:border-emerald-500/40 transition-colors"></div>
        <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-emerald-500/20 rounded-tr-2xl group-hover:border-emerald-500/40 transition-colors"></div>
        <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-emerald-500/10 rounded-bl-2xl"></div>
        <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-emerald-500/10 rounded-br-2xl"></div>

        {title && <h4 className={`text-lg font-black text-${titleColor}-400 mb-6 flex items-center gap-3 uppercase tracking-wider`}>
            <span className={`w-1.5 h-6 bg-${titleColor}-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]`}></span>
            {title}
        </h4>}
        <div className="relative z-10">{children}</div>
    </div>
);

const FeatureBadge = ({ label }: { label: string }) => (
    <span className="text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full uppercase tracking-widest">
        {label}
    </span>
);

export const VoirLaDemoPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#020202] relative overflow-hidden font-sans selection:bg-emerald-500/30">
            <GridBg />
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            <main className="relative z-10 pt-32 pb-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono tracking-[0.3em] uppercase mb-8 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            PlanneX System Demonstration
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 uppercase leading-tight">
                            Command the <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500">Complexity</span>
                        </h1>
                        <p className="text-xl text-slate-400 leading-relaxed max-w-2xl mx-auto font-light">
                            Watch how PlanneX transforms thousands of industrial variables into a mathematically perfect action plan.
                        </p>
                    </div>

                    <div className="relative max-w-5xl mx-auto mb-24 group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-emerald-500/20 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-100 transition duration-1000"></div>
                        <div className="relative bg-slate-900 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
                            <div className="absolute top-6 left-6 z-20 hidden md:flex flex-col gap-2">
                                <div className="px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-md text-[9px] font-mono text-emerald-400 uppercase tracking-widest">
                                    Live Stream: 4K_ENC_PRO_05
                                </div>
                                <div className="px-3 py-1 bg-black/40 backdrop-blur-md border border-white/5 rounded-md text-[9px] font-mono text-slate-500">
                                    REC [00:00:PLNX]
                                </div>
                            </div>
                            <video
                                src="https://media.rachidtaouama.com/wp-content/uploads/2026/03/PlanneX-5.mp4"
                                className="w-full aspect-video object-cover"
                                controls
                                poster="https://media.rachidtaouama.com/wp-content/uploads/2026/03/PlanneX-5.mp4#t=1"
                                autoPlay
                                muted
                                playsInline
                            >
                                Your browser does not support video playback.
                            </video>
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500 z-30 opacity-70"></div>
                        </div>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-12 items-start">
                        <div className="lg:col-span-4 lg:sticky lg:top-32 space-y-6">
                            <HCard title="Specifications" titleColor="emerald">
                                <div className="space-y-4">
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                        <span className="text-slate-500 text-xs font-mono uppercase">Module</span>
                                        <span className="text-emerald-400 text-xs font-bold font-mono">Mission Control V5.0</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                        <span className="text-slate-500 text-xs font-mono uppercase">AI Engine</span>
                                        <span className="text-white text-xs font-bold font-mono">NeuralPath Scheduler</span>
                                    </div>
                                    <div className="flex justify-between border-b border-white/5 pb-2">
                                        <span className="text-slate-500 text-xs font-mono uppercase">Compute Time</span>
                                        <span className="text-white text-xs font-bold font-mono">&lt; 1.2s</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500 text-xs font-mono uppercase">Capacity</span>
                                        <span className="text-white text-xs font-bold font-mono">10k+ Tasks</span>
                                    </div>
                                </div>
                            </HCard>

                            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20">
                                <p className="text-blue-400 font-bold text-sm mb-2 uppercase tracking-widest">PlanneX Innovation</p>
                                <p className="text-slate-400 text-xs leading-relaxed italic">
                                    "We don't build schedules, we build operational certainties for high-criticality environments."
                                </p>
                            </div>
                        </div>

                        <div className="lg:col-span-8 space-y-12">
                            <section>
                                <h2 className="text-3xl font-black text-white mb-6 uppercase tracking-tight">
                                    The Architecture of <span className="text-emerald-400">High Performance</span>
                                </h2>
                                <p className="text-slate-300 leading-relaxed mb-6 text-lg">
                                    As you can see in this demonstration, PlanneX is not simply a data visualizer. It is an <strong>operating system for technical shutdowns</strong>. Every movement in the Gantt, every resource modification is instantly recalculated across the entire project.
                                </p>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                            <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                                            Predictive Intelligence
                                        </h3>
                                        <p className="text-slate-400 text-sm leading-relaxed">
                                            The AI constantly analyzes the <strong>"Slippage Potential"</strong>. If a task doesn't start on time, the system predicts the final impact on the plant restart date before the delay even becomes critical.
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                            <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                                            Zero Decision Latency
                                        </h3>
                                        <p className="text-slate-400 text-sm leading-relaxed">
                                            By eliminating manual reports and tedious data entry, PlanneX allows managers to focus on <strong>strategy</strong> rather than data administration.
                                        </p>
                                    </div>
                                </div>
                            </section>

                            <HCard>
                                <div className="flex flex-col md:flex-row gap-8 items-center">
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-black text-white mb-4 uppercase">Instant Free Trial</h3>
                                        <p className="text-slate-400 text-sm leading-relaxed mb-6">
                                            Don't just watch. Test PlanneX's power with your own data. Import your Excel file and see your technical shutdown come alive in seconds.
                                        </p>
                                        <div className="flex flex-wrap gap-3">
                                            <FeatureBadge label="No Credit Card" />
                                            <FeatureBadge label="Unlimited Tasks" />
                                            <FeatureBadge label="AI Optimized" />
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => window.scrollTo(0, 0)}
                                        className="w-full md:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] active:scale-95"
                                    >
                                        Launch the App
                                    </button>
                                </div>
                            </HCard>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
