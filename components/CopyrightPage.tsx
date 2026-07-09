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

            {/* Ambient Background Glows */}
            <div className="absolute top-[-5%] left-[-20%] w-[60%] h-[60%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-[-5%] right-[-20%] w-[60%] h-[60%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            <main className="relative z-10 pt-32 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">

                    {/* ═══ HERO SECTION ═══════════════════════════════════ */}
                    <div className="text-center mb-24">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono tracking-[0.3em] uppercase mb-8">
                            <Copyright className="w-3 h-3" />
                            Intellectual Property Rights
                        </div>
                        <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter mb-6 uppercase leading-none">
                            AVIS DE <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 leading-tight">COPYRIGHT</span>
                        </h1>


                    </div>

                    <div className="space-y-12">

                        {/* 1. SCOPE OF PROTECTION */}
                        <CopyrightSection title="1. Champ de Protection" icon={ShieldCheck}>
                            <p>
                                L'ensemble du contenu et des matériaux disponibles sur ce site web et au sein de l'application **PlanneX**, incluant sans limitation :
                            </p>
                            <div className="grid grid-cols-2 gap-4 mt-6">
                                {[
                                    { i: Code, t: "Code Source", d: "Architecture logicielle et backend." },
                                    { i: PenTool, t: "UI & UX Design", d: "Concept 'Mission Control' et graphismes." },
                                    { i: Globe, t: "Contenu Web", d: "Textes, articles et documentation." },
                                    { i: Hash, t: "Algorithmes", d: "Moteur de planification IA unique." }
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
                                est la propriété exclusive de **Rachid Taouama** et est protégé par les lois internationales sur le droit d'auteur, les marques et la propriété intellectuelle.
                            </p>
                        </CopyrightSection>

                        {/* 2. PROHIBITED ACTS */}
                        <CopyrightSection title="2. Actes Strictement Interdits" icon={Info}>
                            <div className="bg-red-500/5 border-l-4 border-red-500 p-6 mb-8 rounded-r-2xl">
                                <p className="text-red-400 text-sm font-black uppercase tracking-widest mb-4">Avis de Restriction Légale</p>
                                <p className="text-slate-300 text-sm leading-relaxed m-0">
                                    Toute reproduction, distribution, modification, retransmission, "mirroring", ou publication de tout élément protégé par le droit d'auteur est **strictement interdite** sans le consentement écrit exprès de Rachid Taouama.
                                </p>
                            </div>
                            <ul className="space-y-4">
                                {[
                                    "Extraction non autorisée de données (Scraping).",
                                    "Décompilation ou ingénierie inverse (Reverse Engineering).",
                                    "Utilisation des logos 'PlanneX' à des fins commerciales sans licence.",
                                    "Distribution de rapports modifiés omettant les crédits PlanneX."
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-4 text-slate-400 font-medium">
                                        <ChevronRight className="w-4 h-4 text-emerald-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </CopyrightSection>

                        {/* 3. LICENSING */}
                        <CopyrightSection title="3. Licences et Utilisation" icon={FileText}>
                            <p>
                                L'utilisation de l'Outil **PlanneX** est régie par les Conditions Générales de Vente ou les accords de licence spécifiques signés entre les parties. L'accès à l'application ne confère aucun droit de propriété intellectuelle sur les outils et technologies sous-jacents.
                            </p>
                        </CopyrightSection>

                        {/* Final Note */}
                        <div className="p-12 rounded-[3.5rem] bg-emerald-500/5 border border-emerald-500/10 text-center">
                            <h4 className="text-white font-black uppercase tracking-[0.3em] text-[10px] mb-6">Contact Propriété Intellectuelle</h4>
                            <p className="text-emerald-400 font-mono text-xs mb-2">legal@plannex.ai</p>
                            <p className="text-slate-500 text-[10px] uppercase tracking-widest">Enquête & Contentieux IP</p>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};
