import React from 'react';
import { BookOpen, Download, Shield, Zap, Target, FileText, ArrowRight } from 'lucide-react';

const GridBg = () => (
    <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_70%_50%_at_50%_0%,#000_60%,transparent_100%)]"></div>
    </div>
);

const HCard: React.FC<{ children: React.ReactNode; className?: string; title?: string; titleColor?: string }> = ({ children, className = "", title, titleColor = "emerald" }) => (
    <div className={`bg-slate-900/40 backdrop-blur-xl border border-slate-700/30 rounded-3xl p-8 relative overflow-hidden group hover:border-slate-600/50 transition-all duration-700 ${className}`}>
        {/* Animated Corner Accents */}
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

export const EbookPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#020202] relative overflow-hidden font-sans selection:bg-emerald-500/30">
            <GridBg />

            {/* Ambient Background Glows */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            <main className="relative z-10 pt-32 pb-24 px-4 sm:px-6 lg:px-8">
                <div className="max-w-6xl mx-auto">

                    {/* ═══ HERO SECTION ═══════════════════════════════════ */}
                    <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
                        <div className="space-y-8">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono tracking-[0.3em] uppercase shadow-[0_0_20px_rgba(16,185,129,0.1)]">
                                <BookOpen className="w-3 h-3" />
                                Guide Stratégique 2026
                            </div>
                            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-tight">
                                Maîtrisez le <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 shadow-emerald-500/20">Chemin Critique</span>
                            </h1>
                            <p className="text-xl text-slate-400 leading-relaxed font-light">
                                Découvrez les stratégies avancées pour diviser par deux vos retards d'arrêts techniques grâce à la planification prédictive.
                            </p>

                            <div className="flex flex-wrap gap-4">
                                <a
                                    href="https://media.rachidtaouama.com/wp-content/uploads/2026/03/PlanneX_Ebook.pdf"
                                    download
                                    className="group relative px-8 py-5 bg-emerald-500 text-black font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_50px_rgba(16,185,129,0.5)] active:scale-95 flex items-center gap-3 lg:w-fit justify-center"
                                >
                                    <Download className="w-5 h-5 group-hover:bounce" />
                                    Télécharger l'eBook
                                </a>
                                <button
                                    onClick={() => document.getElementById('details')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="px-8 py-5 bg-slate-900/50 border border-white/10 text-white font-black uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all flex items-center gap-2 lg:w-fit justify-center"
                                >
                                    Sommaire
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="pt-8 border-t border-white/5 flex items-center gap-8 opacity-60">
                                <div className="flex flex-col">
                                    <span className="text-white font-black text-xl">42</span>
                                    <span className="text-[10px] uppercase tracking-widest text-slate-500">Pages Expert</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-white font-black text-xl">PDF</span>
                                    <span className="text-[10px] uppercase tracking-widest text-slate-500">Format Haute Qualité</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-white font-black text-xl">2.4MB</span>
                                    <span className="text-[10px] uppercase tracking-widest text-slate-500">Taille de scan</span>
                                </div>
                            </div>
                        </div>

                        {/* Visual Mockup Container */}
                        <div className="relative group perspective-1000">
                            <div className="absolute -inset-4 bg-emerald-500/20 rounded-[2rem] blur-3xl opacity-30 group-hover:opacity-60 transition duration-1000"></div>

                            <div className="relative aspect-[3/4] bg-slate-900 border border-white/10 rounded-[1.5rem] overflow-hidden shadow-2xl rotate-y-[-10deg] rotate-x-[5deg] group-hover:rotate-0 transition-transform duration-700 ease-out">
                                {/* eBook Cover Design */}
                                <div
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-[2000ms] group-hover:scale-110"
                                    style={{ backgroundImage: `url('https://media.rachidtaouama.com/wp-content/uploads/2026/03/Gemini_Generated_Image_9hu0tg9hu0tg9hu0-scaled.png')` }}
                                ></div>
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60 backdrop-blur-[1px]"></div>
                                <div className="absolute top-0 left-0 w-full h-full p-12 flex flex-col justify-between">
                                    <div>
                                        <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center mb-8 shadow-large shadow-emerald-500/40">
                                            <FileText className="text-black w-6 h-6" />
                                        </div>
                                        <p className="text-emerald-500 font-mono text-[10px] uppercase tracking-[0.4em] mb-4">Edition Whitepaper 2.4.0</p>
                                        <h2 className="text-4xl font-black text-white leading-tight uppercase tracking-tighter">
                                            Command & <br /> Control
                                        </h2>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="h-1 w-20 bg-emerald-500"></div>
                                        <p className="text-slate-400 text-sm font-medium">L'IA appliquée à la logistique de maintenance lourde.</p>
                                        <p className="text-slate-600 text-[10px] font-mono uppercase tracking-widest">PlanneX Intelligence Systems</p>
                                    </div>
                                </div>
                                {/* Holographic finish layer */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none"></div>
                            </div>

                            {/* Floating decorative elements */}
                            <div className="absolute -top-10 -right-10 p-6 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl animate-float">
                                <Zap className="text-emerald-400 w-8 h-8" />
                            </div>
                            <div className="absolute -bottom-10 -left-10 p-6 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl animate-float-delayed">
                                <Shield className="text-blue-400 w-8 h-8" />
                            </div>
                        </div>
                    </div>

                    {/* ═══ ARTICLE SECTION ═════════════════════════════════ */}
                    <div id="details" className="grid lg:grid-cols-12 gap-16 items-start pt-24 border-t border-white/5">

                        {/* Sidebar Sommaire */}
                        <div className="lg:col-span-4 lg:sticky lg:top-32 space-y-6">
                            <HCard title="Dans cet eBook" titleColor="blue">
                                <ul className="space-y-4">
                                    {[
                                        "L'anatomie d'un retard industriel",
                                        "Calcul du chemin critique v3.0",
                                        "Optimisation des co-activités",
                                        "Gestion des imprévus par l'IA",
                                        "KPIs de performance temps réel",
                                        "Checklist de préparation"
                                    ].map((item, i) => (
                                        <li key={i} className="flex items-center gap-3 text-slate-400 hover:text-white transition-colors cursor-pointer group/item">
                                            <span className="text-[10px] font-mono text-blue-500">0{i + 1}</span>
                                            <span className="text-xs uppercase tracking-widest group-hover/item:translate-x-1 transition-transform">{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </HCard>

                            <div className="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                                <Target className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
                                <p className="text-white font-bold mb-2 uppercase tracking-tight">Objectif : Zero Drift</p>
                                <p className="text-slate-400 text-xs leading-relaxed">
                                    Une méthodologie éprouvée sur plus de 150 chantiers majeurs en 2025.
                                </p>
                            </div>
                        </div>

                        {/* Article Content */}
                        <div className="lg:col-span-8 space-y-16">
                            <section>
                                <h2 className="text-4xl font-black text-white mb-8 uppercase tracking-tight">
                                    Pourquoi la planification <span className="text-emerald-400">traditionnelle</span> échoue.
                                </h2>
                                <p className="text-lg text-slate-300 leading-relaxed mb-6">
                                    Dans l'industrie lourde, un retard de 24h peut se chiffrer en millions d'euros. Pourtant, 70% des arrêts techniques ne respectent pas leur planning initial. Cet eBook analyse les causes racines de ces dérives et propose une approche radicalement nouvelle : le <strong>Dynamic Critical Path</strong>.
                                </p>
                                <div className="grid sm:grid-cols-2 gap-8 mt-12">
                                    <div className="p-6 rounded-2xl bg-[#080808] border border-white/5 hover:border-emerald-500/20 transition-all">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-white font-black uppercase tracking-widest text-sm mb-3">Réactivité IA</h3>
                                        <p className="text-slate-500 text-[13px] leading-relaxed">Apprenez comment nos algorithmes recalculent les priorités en millisecondes face aux aléas de terrain.</p>
                                    </div>
                                    <div className="p-6 rounded-2xl bg-[#080808] border border-white/5 hover:border-blue-500/20 transition-all">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4">
                                            <Shield className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-white font-black uppercase tracking-widest text-sm mb-3">Maîtrise du Risque</h3>
                                        <p className="text-slate-500 text-[13px] leading-relaxed">Isoler les tâches à haute criticité et sécuriser les ressources clés avant que le conflit ne survienne.</p>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <HCard>
                                    <div className="space-y-6">
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Accès Immédiat au Savoir</h3>
                                        <p className="text-slate-400 leading-relaxed">
                                            Ce document est une compilation de lessons-learned de chefs de projets, planificateurs et ingénieurs méthode. Pas de théorie abstraite, uniquement de l'ingénierie de planification concrète.
                                        </p>
                                        <div className="pt-4">
                                            <a
                                                href="https://media.rachidtaouama.com/wp-content/uploads/2026/03/PlanneX_Ebook.pdf"
                                                download
                                                className="inline-flex items-center gap-4 bg-white text-black px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-emerald-400 transition-all shadow-[0_20px_40px_-10px_rgba(255,255,255,0.1)] active:scale-95 group"
                                            >
                                                Lancer le téléchargement
                                                <Download className="w-4 h-4 group-hover:translate-y-1 transition-transform" />
                                            </a>
                                        </div>
                                    </div>
                                </HCard>
                            </section>
                        </div>
                    </div>

                </div>
            </main>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(-10deg); }
                    50% { transform: translateY(-20px) rotate(-8deg); }
                }
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0) rotate(0); }
                    50% { transform: translateY(-15px) rotate(5deg); }
                }
                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
                .animate-float-delayed {
                    animation: float-delayed 8s ease-in-out infinite;
                    animation-delay: 1s;
                }
                .perspective-1000 {
                    perspective: 1000px;
                }
                .rotate-y-[-10deg] {
                    transform: rotateY(-18deg) rotateX(8deg);
                }
            `}</style>
        </div>
    );
};
