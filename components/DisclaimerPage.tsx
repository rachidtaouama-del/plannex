import React from 'react';
import { AlertTriangle, HardHat, ShieldOff, Scale, Info, ZapOff, ClipboardCheck, ChevronRight } from 'lucide-react';

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

const DisclaimerSection = ({ title, children, icon: Icon, critical = false }: { title: string, children: React.ReactNode, icon?: any, critical?: boolean }) => (
    <section className={`group relative p-8 rounded-3xl bg-slate-900/40 backdrop-blur-xl border transition-all duration-500 overflow-hidden ${critical ? 'border-amber-500/20 hover:border-amber-500/40' : 'border-white/5 hover:border-emerald-500/20'}`}>
        <div className={`absolute -inset-1 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity ${critical ? 'bg-amber-500/5' : 'bg-emerald-500/5'}`}></div>
        <div className="relative z-10">
            {Icon && <SectionIcon icon={Icon} color={critical ? 'amber' : 'emerald'} />}
            <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-tight flex items-center gap-3">
                <span className={`w-1.5 h-6 rounded-full ${critical ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                {title}
            </h2>
            <div className="prose prose-invert prose-emerald max-w-none text-slate-400 leading-relaxed font-medium space-y-4">
                {children}
            </div>
        </div>
    </section>
);

export const DisclaimerPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#020202] relative overflow-hidden font-sans selection:bg-emerald-500/30 pb-32">
            <GridBg />

            {/* Ambient Background Glows */}
            <div className="absolute top-[-5%] left-[-20%] w-[60%] h-[60%] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-5%] right-[-20%] w-[60%] h-[60%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>

            <main className="relative z-10 pt-32 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">

                    {/* ═══ HERO SECTION ═══════════════════════════════════ */}
                    <div className="text-center mb-24">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/5 border border-amber-500/20 text-amber-500 text-[10px] font-mono tracking-[0.3em] uppercase mb-8">
                            <AlertTriangle className="w-3 h-3" />
                            Legal Safety Protocol
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 uppercase leading-none">
                            Avis de <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-emerald-400 to-cyan-400 leading-tight">Non-Responsabilité</span>
                        </h1>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium">
                            Conditions d'utilisation et limitations légales relatives aux algorithmes de planification **PlanneX**.
                        </p>
                    </div>

                    <div className="space-y-12">

                        {/* Summary Intro */}
                        <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 relative overflow-hidden">
                            <ShieldOff className="absolute -bottom-4 -right-4 w-32 h-32 text-amber-500/5 rotate-12" />
                            <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
                                <div className="p-4 bg-amber-500/20 rounded-2xl">
                                    <HardHat className="w-10 h-10 text-amber-500" />
                                </div>
                                <p className="text-lg text-slate-200 leading-relaxed font-bold italic">
                                    "L'intelligence artificielle est un assistant, pas un ingénieur.
                                    La validation humaine sur le terrain reste l'autorité suprême de sécurité."
                                </p>
                            </div>
                        </div>

                        {/* 1. NATURE OF THE TOOL */}
                        <DisclaimerSection title="1. Nature de l'Outil et Fourniture" icon={ZapOff} critical>
                            <p>
                                L'application web **PlanneX** ("l'Outil") est fournie **"en l'état"** et **"selon disponibilité"**, sans aucune garantie d'aucune sorte, expresse ou implicite.
                            </p>
                            <p>
                                Bien que nous nous efforcions d'assurer une disponibilité maximale, nous ne garantissons pas que l'Outil sera exempt d'interruptions, d'erreurs logicielles ou de bugs de calcul liés à la complexité des modèles d'IA sous-jacents.
                            </p>
                        </DisclaimerSection>

                        {/* 2. DATA ACCURACY */}
                        <DisclaimerSection title="2. Exactitude des Données et Algorithmes" icon={Info}>
                            <p>
                                La qualité, la précision et la pertinence des plannings, des chemins critiques et des analyses de co-activités générés par **PlanneX** dépendent exclusivement :
                            </p>
                            <ul className="space-y-4 pt-4">
                                <li className="flex gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                    <p><strong className="text-slate-200">Qualité de l'Input :</strong> De l'exactitude des extraits SAP, CMMS ou fichiers Excel importés.</p>
                                </li>
                                <li className="flex gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                    <p><strong className="text-slate-200">Probabilités Probabilistes :</strong> Les estimations de durée par l'IA sont basées sur des modèles linguistiques et statistiques et ne constituent pas une certitude mathématique.</p>
                                </li>
                            </ul>
                        </DisclaimerSection>

                        {/* 3. JUDGEMENT CALL */}
                        <DisclaimerSection title="3. Responsabilité de Validation" icon={ClipboardCheck}>
                            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 mb-6">
                                <p className="text-slate-200 text-sm font-bold leading-relaxed italic">
                                    **PlanneX** est un système d'aide à la décision (DSS). Il n'est en aucun cas destiné à remplacer le jugement professionnel, l'expertise d'un Shutdown Manager ou l'analyse d'un Ingénieur Méthode qualifié.
                                </p>
                            </div>
                            <p>
                                Il incombe à l'utilisateur de **vérifier, valider et approuver** tous les plannings avant leur mise en œuvre sur des sites industriels (SEVESO, pétrochimie, énergie, etc.) où une erreur de séquence peut entraîner des risques pour la sécurité des personnes et des installations.
                            </p>
                        </DisclaimerSection>

                        {/* 4. LIABILITY LIMITATION */}
                        <DisclaimerSection title="4. Limitation de Responsabilité" icon={Scale} critical>
                            <p>
                                En aucun cas Rachid Taouama ou **PlanneX** ne pourront être tenus responsables de dommages directs ou indirects, y compris mais sans s'y limiter :
                            </p>
                            <div className="grid sm:grid-cols-2 gap-4 mt-6">
                                {[
                                    "Pertes financières ou budgétaires.",
                                    "Retards de chemin critique sur arrêt.",
                                    "Accidents liés à des erreurs de co-activité.",
                                    "Dysfonctionnements de machines.",
                                    "Pertes de données ou de profits.",
                                    "Réclamations de tiers/sous-traitants."
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                                        <ChevronRight className="w-3 h-3 text-amber-500" />
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </DisclaimerSection>

                        {/* 5. INTELLECTUAL PROPERTY */}
                        <div className="p-12 rounded-[3rem] bg-slate-900/60 border border-white/5 text-center">
                            <h3 className="text-white font-black uppercase tracking-widest text-sm mb-6">Mises à Jour Régulières</h3>
                            <p className="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto">
                                Nous nous réservons le droit de modifier cet avis à tout moment. Il est de votre responsabilité de consulter régulièrement cette page pour prendre connaissance des éventuels changements.
                            </p>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
};
