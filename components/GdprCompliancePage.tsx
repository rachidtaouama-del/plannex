import React from 'react';
import { ShieldAlert, Scale, Fingerprint, Database, Globe, Bell, UserCheck, FileText, Check, ChevronRight, Lock } from 'lucide-react';

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

const GdprSection = ({ title, children, icon: Icon, badge }: { title: string, children: React.ReactNode, icon?: any, badge?: string }) => (
    <section className="group relative p-8 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 hover:border-emerald-500/20 transition-all duration-500 overflow-hidden">
        <div className="absolute -inset-1 bg-emerald-500/5 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div className="relative z-10">
            <div className="flex items-start justify-between mb-6">
                {Icon && <SectionIcon icon={Icon} />}
                {badge && (
                    <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[9px] font-mono text-emerald-400 uppercase tracking-widest">
                        {badge}
                    </span>
                )}
            </div>
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

export const GdprCompliancePage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#020202] relative overflow-hidden font-sans selection:bg-emerald-500/30 pb-32">
            <GridBg />

            {/* Ambient Background Glows */}
            <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            <main className="relative z-10 pt-32 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">

                    {/* ═══ HERO SECTION ═══════════════════════════════════ */}
                    <div className="text-center mb-24">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono tracking-[0.3em] uppercase mb-8">
                            <ShieldAlert className="w-3 h-3" />
                            European Union Regulatory Standards
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 uppercase leading-none">
                            Conformité <br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400 leading-tight">AU RGPD</span>
                        </h1>
                        <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-mono text-slate-500 uppercase tracking-widest pt-4">
                            <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md">Version 1.2</span>
                            <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md text-emerald-400/60 font-black">25 Mars 2026</span>
                        </div>
                    </div>

                    <div className="space-y-12">

                        {/* 1. ENGAGEMENT */}
                        <GdprSection title="1. Engagement de Conformité" icon={Fingerprint} badge="EU 2016/679">
                            <p>
                                La plateforme **PlanneX** s'engage à respecter les principes fondamentaux du Règlement (UE) 2016/679 du Parlement européen et du Conseil du 27 avril 2016 (RGPD). Nous intégrons la protection de la vie privée dès la conception (**Privacy by Design**) et par défaut (**Privacy by Default**).
                            </p>
                        </GdprSection>

                        {/* 2. BASES LÉGALES */}
                        <GdprSection title="2. Bases Légales du Traitement" icon={Scale} badge="Article 6">
                            <p>Conformément à l'Article 6 du RGPD, **PlanneX** traite les données sur les bases suivantes :</p>
                            <div className="grid sm:grid-cols-2 gap-4 mt-6">
                                {[
                                    { t: "Exécution contractuelle", d: "Fournir les services de planification et maintenance." },
                                    { t: "Intérêt légitime", d: "Sécurité du réseau, prévention de la fraude et optimisation des algorithmes d'IA." },
                                    { t: "Obligation légale", d: "Répondre aux exigences de reporting industriel et de sécurité." },
                                    { t: "Consentement", d: "Traitements spécifiques comme l'analyse vocale." }
                                ].map((item, i) => (
                                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-emerald-500/10">
                                        <div className="text-emerald-400 font-bold text-xs uppercase mb-1">{item.t}</div>
                                        <div className="text-[11px] text-slate-500 leading-relaxed">{item.d}</div>
                                    </div>
                                ))}
                            </div>
                        </GdprSection>

                        {/* 3. DROITS DES PERSONNES */}
                        <GdprSection title="3. Droits des Personnes Concernées" icon={UserCheck}>
                            <div className="space-y-4">
                                {[
                                    { id: "3.1", t: "Droit d’accès (Art. 15)", d: "Confirmation du traitement et obtention d'une copie lisible." },
                                    { id: "3.2", t: "Droit de rectification (Art. 16)", d: "Correction immédiate de données inexactes concernant vos plannings." },
                                    { id: "3.3", t: "Droit à l’effacement (Art. 17)", d: "Suppression des données lorsqu'elles ne sont plus nécessaires." },
                                    { id: "3.4", t: "Droit à la portabilité (Art. 20)", d: "Exportation en CSV, JSON ou Excel pour transfert vers d'autres SI (ex: SAP)." },
                                    { id: "3.5", t: "Droit d’opposition (Art. 21)", d: "Opposition au traitement pour des motifs liés à votre situation particulière." }
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4 p-4 rounded-2xl border border-white/5 bg-slate-800/20">
                                        <div className="text-emerald-500 font-mono text-[10px] font-black">{item.id}</div>
                                        <div>
                                            <div className="text-white font-bold text-sm uppercase tracking-wider mb-1">{item.t}</div>
                                            <div className="text-xs text-slate-400">{item.d}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GdprSection>

                        {/* 4. SÉCURITÉ ET INTÉGRITÉ */}
                        <GdprSection title="4. Sécurité et Intégrité des Données" icon={Lock} badge="Article 32">
                            <ul className="space-y-4">
                                <li className="flex gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                    <p><strong className="text-slate-200">Pseudonymisation :</strong> Les identifiants peuvent être pseudonymisés lors des phases d'entraînement des modèles d'IA.</p>
                                </li>
                                <li className="flex gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                    <p><strong className="text-slate-200">Chiffrement :</strong> Utilisation systématique du protocole HTTPS/TLS et chiffrement des bases SQL.</p>
                                </li>
                                <li className="flex gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                    <p><strong className="text-slate-200">Surveillance :</strong> Audits réguliers, tests de pénétration et analyses de vulnérabilité sur toute l'infrastructure.</p>
                                </li>
                            </ul>
                        </GdprSection>

                        {/* 5. REGISTRE */}
                        <GdprSection title="5. Registre des Activités" icon={Database} badge="Article 30">
                            <p>**PlanneX** tient un registre interne détaillant :</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-center">
                                {["Données RH", "Données Techniques", "Analyse Anomalies", "Logs Systèmes"].map((item, i) => (
                                    <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">
                                        {item}
                                    </div>
                                ))}
                            </div>
                        </GdprSection>

                        {/* 7 & 8. TRANSFERS AND VIOLATIONS */}
                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="p-8 rounded-3xl bg-slate-900/40 border border-white/5 space-y-4">
                                <Globe className="w-8 h-8 text-cyan-400 mb-4" />
                                <h3 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-2">
                                    <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                                    7. Transferts Internationaux
                                </h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    En cas de transfert hors EEE (ex: serveur au Maroc ou USA), **PlanneX** s'assure de la signature de **Clauses Contractuelles Types (CCT)** pour un niveau de protection équivalent.
                                </p>
                            </div>
                            <div className="p-8 rounded-3xl bg-slate-900/40 border border-white/5 space-y-4">
                                <Bell className="w-8 h-8 text-amber-500 mb-4" />
                                <h3 className="text-white font-black uppercase text-sm tracking-widest flex items-center gap-2">
                                    <span className="w-1 h-1 rounded-full bg-amber-500"></span>
                                    8. Notification de Violation
                                </h3>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Notification aux autorités (ex: CNDP ou CNIL) sous **72 heures** en cas d'accès non autorisé. Les utilisateurs sont informés immédiatement si le risque est élevé.
                                </p>
                            </div>
                        </div>

                        {/* 9. DPO */}
                        <GdprSection title="9. Délégué à la Protection (DPO)" icon={ShieldAlert}>
                            <p>Compte tenu de l'importance des données industrielles traitées, **PlanneX** a nommé un référent protection des données dédié.</p>
                            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                                <div>
                                    <p className="text-white font-black uppercase tracking-widest text-sm mb-1 italic">Objet : Exercice de droits RGPD</p>
                                    <p className="text-emerald-400 font-mono text-xs">dpo@planex.ai</p>
                                </div>
                                <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] px-4 py-2 border border-white/5 rounded-lg bg-white/5">
                                    DPO Appointed
                                </div>
                            </div>
                        </GdprSection>



                    </div>
                </div>
            </main>
        </div>
    );
};
