import React from 'react';
import { Copyright, ShieldCheck, Code, Globe, PenTool, Hash, Info, FileText, ChevronRight } from 'lucide-react';

const GridBg = () => (
    <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_60%,transparent_100%)]"></div>
    </div>
);

const SectionIcon = ({ icon: Icon, color = "emerald" }: { icon: any, color?: string }) => (
    <div className={`w-12 h-12 rounded-xl bg-${color}-500/10 border border-${color}-500/20 flex items-center justify-center text-${color}-400 mb-6 shadow-xl shadow-${color}-500/5`}>
        <Icon className="w-6 h-6" />
    </div>
);

const CopyrightSection = ({ title, children, icon: Icon }: { title: string, children: React.ReactNode, icon?: any }) => (
    <section className="group relative p-8 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 hover:border-emerald-500/20 transition-all duration-500 overflow-hidden">
        <div className="absolute -inset-1 bg-emerald-500/5 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative z-10">
            {Icon && <SectionIcon icon={Icon} />}
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                {title}
            </h2>
            <div className="prose prose-invert prose-emerald max-w-none text-slate-400 leading-relaxed font-medium space-y-4">
                {children}
            </div>
        </div>
    </section>
);

export const CopyrightPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#020202] relative overflow-hidden font-sans selection:bg-emerald-500/30 pb-32">
            <GridBg />
            <div className="absolute top-[-5%] left-[-20%] w-[60%] h-[60%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-[-5%] right-[-20%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            <main className="relative z-10 pt-32 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    <div className="text-center mb-24">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono tracking-[0.3em] uppercase mb-8">
                            <Copyright className="w-3 h-3" />
                            Intellectual Property Rights
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-6 uppercase leading-none">
                            COPYRIGHT <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 leading-tight">NOTICE</span>
                        </h1>
                    </div>

                    <div className="space-y-12">
                        <CopyrightSection title="1. Scope of Protection" icon={ShieldCheck}>
                            <p>
                                All content and materials available on this website and within the **PlanneX** application, including without limitation:
                            </p>
                            <div className="grid grid-cols-2 gap-4 mt-6">
                                {[
                                    { i: Code, t: "Source Code", d: "Software architecture and backend." },
                                    { i: PenTool, t: "UI & UX Design", d: "'Mission Control' concept and graphics." },
                                    { i: Globe, t: "Web Content", d: "Texts, articles, and documentation." },
                                    { i: Hash, t: "Algorithms", d: "Unique AI planning engine." }
                                ].map((item, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-slate-800/40 border border-white/5 flex gap-4">
                                        <item.i className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                        <div>
                                            <div className="text-white font-bold text-xs uppercase mb-1">{item.t}</div>
                                            <div className="text-[10px] text-slate-500 leading-tight">{item.d}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-6">
                                is the exclusive property of **Rachid Taouama** and is protected by international copyright, trademark, and intellectual property laws.
                            </p>
                        </CopyrightSection>

                        <CopyrightSection title="2. Strictly Prohibited Acts" icon={Info}>
                            <div className="bg-red-500/5 border-l-4 border-red-500 p-6 mb-8 rounded-r-2xl">
                                <p className="text-red-400 text-sm font-black uppercase tracking-widest mb-4">Legal Restriction Notice</p>
                                <p className="text-slate-300 text-sm leading-relaxed m-0">
                                    Any reproduction, distribution, modification, retransmission, mirroring, or publication of any copyrighted element is **strictly prohibited** without the express written consent of Rachid Taouama.
                                </p>
                            </div>
                            <ul className="space-y-4">
                                {[
                                    "Unauthorized data extraction (Scraping).",
                                    "Decompilation or reverse engineering.",
                                    "Use of 'PlanneX' logos for commercial purposes without license.",
                                    "Distribution of modified reports omitting PlanneX credits."
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-4 text-slate-400 font-medium">
                                        <ChevronRight className="w-4 h-4 text-emerald-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </CopyrightSection>

                        <CopyrightSection title="3. Licensing and Usage" icon={FileText}>
                            <p>
                                Use of the **PlanneX** Tool is governed by the General Terms of Sale or specific license agreements signed between the parties. Access to the application does not confer any intellectual property rights over the underlying tools and technologies.
                            </p>
                        </CopyrightSection>

                        <div className="p-12 rounded-[3.5rem] bg-emerald-500/5 border border-emerald-500/10 text-center">
                            <h4 className="text-white font-black uppercase tracking-[0.3em] text-[10px] mb-6">Intellectual Property Contact</h4>
                            <p className="text-emerald-400 font-mono text-xs mb-2">legal@plannex.ai</p>
                            <p className="text-slate-500 text-[10px] uppercase tracking-widest">IP Inquiry & Litigation</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
