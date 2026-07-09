import React from 'react';
import { Shield, Lock, Eye, Server, RefreshCw, UserCheck, FileText, ChevronRight, Scale, Check, Cpu } from 'lucide-react';

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

const PolicySection = ({ title, children, icon: Icon }: { title: string, children: React.ReactNode, icon?: any }) => (
    <section className="group relative p-8 rounded-3xl bg-slate-900/40 backdrop-blur-xl border border-white/5 hover:border-emerald-500/20 transition-all duration-500 overflow-hidden">
        {/* Subtle hover glow */}
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

export const PrivacyPolicyPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#020202] relative overflow-hidden font-sans selection:bg-emerald-500/30 pb-32">
            <GridBg />

            {/* Ambient Background Glows */}
            <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
            <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

            <main className="relative z-10 pt-32 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">

                    {/* ═══ HERO SECTION ═══════════════════════════════════ */}
                    <div className="text-center mb-24">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono tracking-[0.3em] uppercase mb-8">
                            <Lock className="w-3 h-3" />
                            Data Governance Protocol
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-6 uppercase leading-none">
                            Politique de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Confidentialité</span>
                        </h1>
                        <div className="flex flex-wrap items-center justify-center gap-6 text-[10px] font-mono text-slate-500 uppercase tracking-widest pt-4">
                            <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md">Version 1.2</span>
                            <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md">Effective: 25 Mars 2026</span>
                            <span className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-md">Updated: 25 Mars 2026</span>
                        </div>
                    </div>

                    <div className="space-y-12">
                        {/* Summary Intro */}
                        <div className="p-8 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 relative overflow-hidden">
                            <Shield className="absolute -bottom-4 -right-4 w-32 h-32 text-emerald-500/5 rotate-12" />
                            <p className="text-lg text-slate-200 leading-relaxed font-semibold italic">
                                "Dans un environnement industriel de haute criticité, l'intégrité et la confidentialité des données ne sont pas des options, ce sont des impératifs d'exploitation."
                            </p>
                        </div>

                        {/* 1. INTRODUCTION AND SCOPE */}
                        <PolicySection title="1. Introduction et Champ d'Application" icon={FileText}>
                            <p>
                                Bienvenue sur **PlanneX** ("l'Application," "nous," ou "notre"). PlanneX est une plateforme spécialisée de planification de projets et de gestion de maintenance industrielle, conçue pour optimiser l'efficacité opérationnelle grâce à la classification des tâches par IA, la génération automatisée de rapports et l'analyse documentaire.
                            </p>
                            <p>
                                Cette Politique de Confidentialité constitue la déclaration définitive concernant nos pratiques de collecte, d'utilisation, de stockage et de protection des données. Nous reconnaissons que dans un cadre industriel—spécifiquement au sein de secteurs impliquant des machines lourdes et une gestion de projet à grande échelle (tels que les environnements rencontrés par JESA Group)—la sécurité des données est primordiale.
                            </p>
                        </PolicySection>

                        {/* 2. DATA CONTROLLER AND PROCESSOR ROLES */}
                        <PolicySection title="2. Rôles de Responsable et Sous-traitant" icon={RefreshCw}>
                            <div className="space-y-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <strong className="text-emerald-400 block mb-1">PlanneX en tant que Sous-traitant :</strong>
                                    Lorsque vous téléchargez des données d'entreprise (ex. extraits SAP, journaux de maintenance, manuels techniques), PlanneX agit comme Sous-traitant. La propriété de ces données reste acquise à vous ou à votre employeur.
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <strong className="text-emerald-400 block mb-1">PlanneX en tant que Responsable :</strong>
                                    Nous agissons en tant que Responsable du traitement pour les informations de compte de base (nom, e-mail, identifiants) nécessaires au maintien du service et au support technique.
                                </div>
                            </div>
                        </PolicySection>

                        {/* 3. CATEGORIES OF DATA COLLECTED */}
                        <PolicySection title="3. Catégories de Données Collectées" icon={Eye}>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                        <ChevronRight className="w-4 h-4 text-emerald-500" /> Profil Utilisateur
                                    </h4>
                                    <ul className="text-sm list-disc list-inside space-y-2 pl-2">
                                        <li>Nom complet, email professionnel</li>
                                        <li>Titre du poste (ex. Planificateur, Shutdown Manager)</li>
                                        <li>Données d'authentification chiffrées (Supabase/PostgreSQL)</li>
                                    </ul>
                                </div>
                                <div className="space-y-4">
                                    <h4 className="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                                        <ChevronRight className="w-4 h-4 text-emerald-500" /> Données Industrielles
                                    </h4>
                                    <ul className="text-sm list-disc list-inside space-y-2 pl-2">
                                        <li>Métadonnées de maintenance (IDs équipements, priorités)</li>
                                        <li>Exports de systèmes ERP (SAP, CMMS)</li>
                                        <li>Documentation technique (PDF, Excel, Diagrammes)</li>
                                    </ul>
                                </div>
                            </div>
                        </PolicySection>

                        {/* 4. MECHANISMS OF PROCESSING */}
                        <PolicySection title="4. Mécanismes de Traitement" icon={Cpu}>
                            <p>
                                PlanneX utilise des méthodes computationnelles avancées pour transformer les données brutes en informations exploitables.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                    <p><strong className="text-slate-200">Intelligence Artificielle :</strong> Utilisation de LLM et de modèles de Vision pour extraire des modes opératoires et classifier les tâches.</p>
                                </li>
                                <li className="flex gap-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div>
                                    <p><strong className="text-slate-200">Reporting Automatisé :</strong> Génération de fichiers Excel pour ré-upload SAP et de présentations PDF/PowerPoint pour les comités de direction.</p>
                                </li>
                            </ul>
                        </PolicySection>

                        {/* 6. STORAGE AND SECURITY */}
                        <PolicySection title="6. Stockage et Sécurité de l'Infrastructure" icon={Server}>
                            <div className="grid sm:grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 text-center">
                                    <div className="text-emerald-400 font-bold mb-1">TLS 1.3</div>
                                    <div className="text-[10px] uppercase font-mono text-slate-500 tracking-tighter">En Transit</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 text-center">
                                    <div className="text-emerald-400 font-bold mb-1">AES-256</div>
                                    <div className="text-[10px] uppercase font-mono text-slate-500 tracking-tighter">Au Repos</div>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5 text-center">
                                    <div className="text-emerald-400 font-bold mb-1">RBAC</div>
                                    <div className="text-[10px] uppercase font-mono text-slate-500 tracking-tighter">Accès par Rôles</div>
                                </div>
                            </div>
                            <p className="mt-6 text-sm">
                                Vos données sont hébergées sur des serveurs cloud haute disponibilité (utilisant Supabase et PostgreSQL) avec des sauvegardes quotidiennes automatisées pour garantir la continuité de vos opérations.
                            </p>
                        </PolicySection>

                        {/* 10. USER RIGHTS */}
                        <PolicySection title="10. Droits des Utilisateurs" icon={UserCheck}>
                            <div className="grid md:grid-cols-2 gap-4">
                                {[
                                    { t: "Droit d'Accès", d: "Demandez un résumé complet de vos données." },
                                    { t: "Droit de Rectification", d: "Corrigez toute donnée de projet inexacte." },
                                    { t: "Portabilité", d: "Exportez vos plannings en Excel, PDF ou JSON." },
                                    { t: "Droit à l'Oubli", d: "Effacement définitif de vos données sur demande." }
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-white/5">
                                        <Check className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                                        <div>
                                            <div className="text-white font-bold text-xs uppercase tracking-wider mb-1">{item.t}</div>
                                            <div className="text-[11px] text-slate-500">{item.d}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </PolicySection>

                        {/* 15. CONTACT */}
                        <PolicySection title="15. Contact et Réclamations" icon={Scale}>
                            <p>
                                Pour toute question concernant la protection des données ou pour exercer vos droits, veuillez contacter notre Responsable de la Confidentialité des Données :
                            </p>
                            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 mt-6">
                                <p className="text-white font-black uppercase tracking-widest text-sm mb-2">PlanneX Technical Team</p>
                                <p className="text-emerald-400 font-mono text-xs mb-4">support@planex.ai</p>
                                <p className="text-slate-500 text-[11px] uppercase tracking-widest">Attention: Data Privacy Office</p>
                            </div>
                        </PolicySection>

                    </div>
                </div>
            </main>
        </div>
    );
};
