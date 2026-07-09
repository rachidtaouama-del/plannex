import React, { useState } from 'react';
import { Shield, Zap, Globe, Cpu, Lock, Server, Mail, User, ChevronDown, ChevronRight, Check, AlertTriangle, Building2, Sparkles, Star } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const Pill: React.FC<{ children: React.ReactNode; color?: 'emerald' | 'blue' | 'amber' | 'red' }> = ({ children, color = 'emerald' }) => {
    const colors = {
        emerald: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
        blue: 'bg-blue-500/10 border-blue-500/25 text-blue-400',
        amber: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
        red: 'bg-red-500/10 border-red-500/25 text-red-400',
    };
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-[0.3em] ${colors[color]}`}>
            <span className="w-1 h-1 rounded-full bg-current animate-pulse" />
            {children}
        </span>
    );
};

const FeatureRow: React.FC<{ children: React.ReactNode; accent?: string }> = ({ children, accent = 'emerald' }) => (
    <div className="flex items-start gap-3 py-3 border-b border-white/[0.04] last:border-0">
        <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-${accent}-500/10 border border-${accent}-500/20`}>
            <Check className={`w-3 h-3 text-${accent}-400`} />
        </div>
        <span className="text-sm text-slate-300 font-medium leading-snug">{children}</span>
    </div>
);

const ContactLink: React.FC<{ href: string; label: string; sub?: string }> = ({ href, label, sub }) => (
    <a href={href}
        className="group flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/25 hover:bg-emerald-500/[0.04] transition-all duration-300">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/20 transition-all">
            <Mail className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
            <p className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors truncate">{label}</p>
            {sub && <p className="text-[10px] text-slate-600 font-medium uppercase tracking-widest">{sub}</p>}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-700 group-hover:text-emerald-500 ml-auto flex-shrink-0 transition-all group-hover:translate-x-0.5" />
    </a>
);

// ─── FAQ Accordion ────────────────────────────────────────────────────────────

const faqs = [
    {
        q: "Comment PlanneX est-il tarifé ?",
        a: "PlanneX adopte un modèle de tarification 100% personnalisé. Chaque entreprise a des besoins uniques en termes de taille d'équipes, de volume de projets, de personnalisation et d'intégrations internes. Nous évaluons votre contexte opérationnel et proposons une offre adaptée à votre réalité industrielle."
    },
    {
        q: "Pourquoi PlanneX n'intègre pas SAP ou d'autres ERP ?",
        a: "PlanneX est une plateforme souveraine avec sa propre base de données propriétaire. Nous ne permettons délibérément aucune intégration à des tiers (SAP, Oracle, etc.) pour garantir la sécurité maximale de vos données sensibles, prévenir les failles de synchronisation et assurer une performance optimale. Vos projets restent exclusivement sur nos serveurs sécurisés."
    },
    {
        q: "Où sont hébergées les données de nos projets ?",
        a: "Toutes vos données industrielles sont exclusivement hébergées sur les serveurs PlanneX. Aucun projet, aucune tâche, aucune ressource ne transite par des services cloud tiers. Nous contrôlons l'infrastructure de A à Z pour vous garantir une confidentialité absolue et une disponibilité maximale."
    },
    {
        q: "Peut-on personnaliser PlanneX pour notre organisation ?",
        a: "Absolument. C'est même notre proposition de valeur principale. PlanneX est livré comme une solution clé-en-main intégralement adaptée à votre organisation : nomenclature interne, flux de validation, logique métier, rapports aux couleurs de votre entreprise, et bien plus. Aucune concession. Un outil qui parle votre langage industriel."
    },
    {
        q: "Quel est le processus pour devenir client ?",
        a: "Contactez-nous via nos adresses email officielles. Notre équipe analyse votre contexte (taille d'arrêt, disciplines, volume de tâches, nombre d'utilisateurs), réalise un audit de vos besoins, et vous soumet une proposition commerciale détaillée avec une démonstration personnalisée sur votre propre environnement."
    },
    {
        q: "Y a-t-il une période d'essai ou de pilote ?",
        a: "Oui. Selon votre profil, nous proposons un programme pilote structuré sur vos données réelles, accompagné par notre équipe technique, afin que vous puissiez mesurer la valeur de PlanneX sur un vrai arrêt avant tout engagement définitif."
    },
    {
        q: "PlanneX propose-t-il un partenariat commercial ?",
        a: "Nous sommes ouverts à des partenariats stratégiques avec des sociétés d'ingénierie, des consultants industriels ou des intégrateurs de solutions. Toute demande de partenariat doit être adressée directement à notre équipe fondatrice via contact@rachidtaouama.com."
    },
];

const FaqItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className={`border rounded-2xl overflow-hidden transition-all duration-300 ${open ? 'border-emerald-500/20 bg-emerald-500/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
            <button className="w-full flex items-center justify-between p-6 text-left gap-4" onClick={() => setOpen(!open)}>
                <span className={`text-sm font-black tracking-tight transition-colors ${open ? 'text-emerald-300' : 'text-white'}`}>{q}</span>
                <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-emerald-400' : 'text-slate-600'}`} />
            </button>
            {open && (
                <div className="px-6 pb-6 -mt-1">
                    <p className="text-sm text-slate-400 leading-relaxed font-medium">{a}</p>
                </div>
            )}
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export const PricingPage: React.FC<{ setPage?: (page: any) => void }> = ({ setPage }) => {
    return (
        <div className="min-h-screen bg-[#020202] text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden">
            {/* ── Background ── */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.018)_1px,transparent_1px)] bg-[size:52px_52px]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[160px]" />
                <div className="absolute bottom-1/4 right-0 w-[600px] h-[500px] bg-indigo-500/[0.03] rounded-full blur-[160px]" />
            </div>

            <div className="relative z-10">
                {/* ─────────────────────────────────────────────
                    HERO
                ───────────────────────────────────────────── */}
                <section className="w-full mx-auto px-6 lg:px-12 2xl:px-24 pt-40 pb-28 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/8 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-[0.4em] mb-10">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Plateforme Industrielle · Tarification Sur Mesure
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>

                    <h1 className="text-6xl md:text-8xl lg:text-9xl font-black tracking-tighter uppercase leading-[0.85] mb-8">
                        Une Seule<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 via-emerald-300 to-cyan-400">
                            Solution.
                        </span>
                    </h1>

                    <p className="text-xl md:text-2xl text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed mb-6">
                        PlanneX n'est pas un abonnement SaaS générique. C'est une plateforme industrielle de planification déployée <span className="text-white font-black">exclusivement dans votre organisation</span>, configurée selon vos processus, et protégée sur nos serveurs souverains.
                    </p>
                    <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                        Chaque contrat est unique. Chaque déploiement est sur mesure. Chaque euro investi génère un ROI mesurable dès le premier arrêt.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
                        <a href="mailto:membership@plannex.ai"
                            className="group relative flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] text-black overflow-hidden transition-all active:scale-95 shadow-[0_20px_60px_rgba(16,185,129,0.3)]"
                            style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                            <Mail className="w-4 h-4 relative z-10" />
                            <span className="relative z-10">Demander un Devis</span>
                        </a>
                        <button onClick={() => setPage?.('contact')}
                            className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] text-slate-300 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all active:scale-95">
                            <Building2 className="w-4 h-4" />
                            Parler à un Expert
                        </button>
                    </div>
                </section>

                {/* ─────────────────────────────────────────────
                    DATA SOVEREIGNTY BANNER
                ───────────────────────────────────────────── */}
                <section className="w-full mx-auto px-6 lg:px-12 2xl:px-24 mb-28">
                    <div className="relative rounded-[2rem] overflow-hidden border border-red-500/15 bg-gradient-to-r from-red-950/20 via-[#0a0614]/50 to-red-950/20 p-8 md:p-10">
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent" />
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/25 flex items-center justify-center flex-shrink-0 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                                <AlertTriangle className="w-6 h-6 text-red-400" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <Pill color="red">Politique Officielle</Pill>
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight mb-2">
                                    Aucune Intégration Tierce Autorisée
                                </h3>
                                <p className="text-slate-400 text-sm leading-relaxed font-medium">
                                    PlanneX <span className="text-white font-black">ne s'intègre à aucun système externe</span> — ni SAP, ni Oracle, ni Salesforce, ni aucun ERP, CMMS ou cloud tiers. Cette décision est délibérée et non négociable. Votre base de données industrielle reste exclusivement sur nos serveurs sécurisés, hors de portée de toute application externe. Zéro vecteur d'exposition. Zéro compromis sur la souveraineté de vos données.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─────────────────────────────────────────────
                    THREE VALUE PILLARS
                ───────────────────────────────────────────── */}
                <section className="w-full mx-auto px-6 lg:px-12 2xl:px-24 mb-28">
                    <div className="text-center mb-16">
                        <Pill>Modèle d'Acquisition</Pill>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white mt-4 mb-4">
                            Pourquoi un Modèle<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Entièrement Personnalisé ?</span>
                        </h2>
                        <p className="text-slate-500 text-lg font-medium max-w-2xl mx-auto">
                            Parce qu'aucun arrêt de maintenance ne ressemble à un autre. Parce qu'aucune équipe industrielle ne mérite un outil générique.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                icon: <Cpu className="w-6 h-6" />,
                                accent: '16,185,129',
                                color: '#10b981',
                                tag: 'Déploiement',
                                title: 'Adapté à Votre Organisation',
                                text: 'PlanneX est livré comme un vrai produit clé-en-main : nomenclature interne, workflows de validation, rapports aux couleurs de votre entreprise, règles métier spécifiques à votre secteur. Ce n\'est pas un template. C\'est votre outil.',
                                items: ['Configuration des disciplines internes', 'Logique métier personnalisée', 'Rapports branding entreprise', 'Formation sur-mesure des équipes'],
                            },
                            {
                                icon: <Server className="w-6 h-6" />,
                                accent: '99,102,241',
                                color: '#6366f1',
                                tag: 'Sécurité',
                                title: 'Vos Données. Nos Serveurs. Personne d\'Autre.',
                                text: 'Chaque projet, chaque tâche, chaque ressource est hébergée exclusivement sur l\'infrastructure PlanneX. Nous contrôlons l\'intégralité de la chaîne de données. Aucun tiers. Aucune fuite. Aucun compromis.',
                                items: ['Serveurs dédiés par client', 'Chiffrement AES-256 de bout en bout', 'Sauvegardes automatisées sécurisées', 'Audit de sécurité sur demande'],
                            },
                            {
                                icon: <Star className="w-6 h-6" />,
                                accent: '245,158,11',
                                color: '#f59e0b',
                                tag: 'Partenariat',
                                title: 'Un Contrat à Votre Mesure',
                                text: 'Le prix de PlanneX reflète la réalité de votre déploiement : taille des arrêts, nombre d\'utilisateurs, niveau de personnalisation, support nécessaire. Pas de plan générique. Pas de case à cocher. Une conversation. Une proposition. Un accord.',
                                items: ['Tarification basée sur votre contexte', 'Pilote sur données réelles disponible', 'Engagement progressif possible', 'ROI mesurable dès le 1er arrêt'],
                            },
                        ].map(card => (
                            <div key={card.tag} className="relative rounded-[2rem] border border-white/[0.06] bg-white/[0.02] p-8 flex flex-col hover:border-white/10 transition-all duration-500 group overflow-hidden">
                                <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                    style={{ background: `linear-gradient(90deg, transparent, ${card.color}, transparent)` }} />
                                <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[100px] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                                    style={{ background: `rgba(${card.accent},0.06)`, transform: 'translate(30%,-30%)' }} />

                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 flex-shrink-0"
                                    style={{ background: `rgba(${card.accent},0.1)`, border: `1.5px solid rgba(${card.accent},0.25)`, color: card.color }}>
                                    {card.icon}
                                </div>
                                <div className="mb-1">
                                    <span className="text-[9px] font-black uppercase tracking-[0.3em]" style={{ color: card.color }}>{card.tag}</span>
                                </div>
                                <h3 className="text-xl font-black text-white tracking-tight leading-snug mb-4">{card.title}</h3>
                                <p className="text-slate-500 text-sm leading-relaxed font-medium mb-6 flex-1">{card.text}</p>
                                <div className="pt-6 border-t border-white/[0.05] space-y-2">
                                    {card.items.map(item => (
                                        <div key={item} className="flex items-center gap-2.5">
                                            <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: card.color }} />
                                            <span className="text-xs text-slate-400 font-medium">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ─────────────────────────────────────────────
                    WHAT'S INCLUDED
                ───────────────────────────────────────────── */}
                <section className="w-full mx-auto px-6 lg:px-12 2xl:px-24 mb-28">
                    <div className="rounded-[2rem] border border-white/[0.06] bg-white/[0.015] overflow-hidden">
                        <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/[0.06]">
                            <div className="p-10 lg:p-14">
                                <div className="mb-8">
                                    <Pill>Inclus dans Chaque Déploiement</Pill>
                                    <h2 className="text-3xl font-black text-white tracking-tight mt-4 mb-3">Ce Que PlanneX Vous Apporte</h2>
                                    <p className="text-slate-500 text-sm font-medium">Quel que soit votre contrat, ces capacités font partie du cœur de la plateforme.</p>
                                </div>
                                <div className="space-y-0 divide-y divide-white/[0.04]">
                                    {[
                                        'Planification Dynamique Gantt 3.0 — Interactif, temps réel',
                                        'Moteur IA NeuralPath Scheduler — Ordonnancement automatisé',
                                        'Analyse du Chemin Critique — Visualisation et alertes',
                                        'Dashboard Mission Control 4K — Vue opérationnelle complète',
                                        'Exports PDF & PPTX Board-Ready — Présentations décisionnelles',
                                        'Gestion des Co-activités Industrielles — Prévention des conflits',
                                        'Alertes de Glissement Temps Réel — Détection proactive',
                                        'Suivi des Pièces de Rechange (PDR) — Logistique intégrée',
                                        'Évaluation à Chaud Post-Arrêt — Analyse de performance',
                                        'Navigation Carte & QR — Guidage terrain équipes',
                                        'Tableau de Bord Readiness — Taux de préparation global',
                                        'Support Technique Dédié — Accompagnement continu',
                                    ].map(f => (
                                        <FeatureRow key={f}>{f}</FeatureRow>
                                    ))}
                                </div>
                            </div>
                            <div className="p-10 lg:p-14">
                                <div className="mb-8">
                                    <Pill color="blue">Personnalisation Avancée</Pill>
                                    <h2 className="text-3xl font-black text-white tracking-tight mt-4 mb-3">Ce Que Nous Configurons Pour Vous</h2>
                                    <p className="text-slate-500 text-sm font-medium">Les éléments adaptés spécifiquement à votre organisation dans le cadre du déploiement entreprise.</p>
                                </div>
                                <div className="space-y-0 divide-y divide-white/[0.04]">
                                    {[
                                        'Nomenclature interne (disciplines, unités, zones)',
                                        'Règles métier et flux de validation personnalisés',
                                        'Rapports PDF aux couleurs et logo de l\'entreprise',
                                        'Comptes utilisateurs illimités avec gestion des rôles',
                                        'Domaine exclusif et marque blanche optionnelle',
                                        'Serveurs dédiés — aucune ressource partagée',
                                        'Formation personnalisée des équipes planification',
                                        'Intégration avec vos propres référentiels GMAO internes',
                                        'Sauvegardes périodiques et archivage des projets',
                                        'SLA de disponibilité garanti par contrat',
                                        'Tableau de bord analytique historique multi-arrêts',
                                        'Accès API interne (sur demande, selon contrat)',
                                    ].map(f => (
                                        <FeatureRow key={f} accent="blue">{f}</FeatureRow>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─────────────────────────────────────────────
                    RULES & TERMS
                ───────────────────────────────────────────── */}
                <section className="w-full mx-auto px-6 lg:px-12 2xl:px-24 mb-28">
                    <div className="text-center mb-14">
                        <Pill color="amber">Règles & Conditions Commerciales</Pill>
                        <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-white mt-4 mb-3">
                            La Transparence<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">comme Principe</span>
                        </h2>
                        <p className="text-slate-500 text-lg font-medium max-w-xl mx-auto">Ce que vous devez savoir avant tout engagement avec PlanneX.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                            {
                                icon: <Building2 className="w-5 h-5" />,
                                title: 'Réservé aux Entreprises',
                                text: 'PlanneX est une solution exclusivement B2B. Elle est conçue pour des organisations industrielles, des sociétés d\'ingénierie, des équipes de maintenance et des contractants spécialisés. Les souscriptions individuelles ne sont pas disponibles.',
                                color: '16,185,129',
                            },
                            {
                                icon: <Lock className="w-5 h-5" />,
                                title: 'Aucune Intégration Tierce',
                                text: 'PlanneX n\'est connecté à aucun système externe. SAP, Oracle, Maximo, MS Project ou tout autre logiciel tiers ne peuvent interagir directement avec la plateforme. La ségrégation totale des données est une condition non négociable.',
                                color: '239,68,68',
                            },
                            {
                                icon: <Shield className="w-5 h-5" />,
                                title: 'Données Hébergées par PlanneX',
                                text: 'L\'intégralité de vos projets, ressources, tâches, chronogrammes et rapports est hébergée sur nos serveurs. Vous pouvez exporter vos données à tout moment. Aucun tiers ne peut accéder à votre espace sans votre consentement explicite.',
                                color: '99,102,241',
                            },
                            {
                                icon: <Sparkles className="w-5 h-5" />,
                                title: 'Tarification Toujours Sur Mesure',
                                text: 'Il n\'existe pas de grille tarifaire publique fixe pour PlanneX. Le prix est établi en fonction de la taille de votre organisation, du volume d\'arrêts, du niveau de personnalisation requis et des engagements de support souhaités.',
                                color: '245,158,11',
                            },
                            {
                                icon: <User className="w-5 h-5" />,
                                title: 'Partenariats Sélectifs',
                                text: 'PlanneX sélectionne ses partenaires commerciaux avec soin. Les sociétés souhaitant revendre, intégrer ou recommander PlanneX à leurs clients doivent soumettre une demande formelle à l\'équipe fondatrice. Les partenariats non sollicités ne sont pas acceptés.',
                                color: '6,182,212',
                            },
                            {
                                icon: <Zap className="w-5 h-5" />,
                                title: 'Propriété Intellectuelle Protégée',
                                text: 'Le codebase, les algorithmes, les modèles IA et la base de données de PlanneX sont la propriété exclusive de Rachid Taouama. Toute reproduction, extraction ou ingénierie inverse est formellement interdite et fera l\'objet de poursuites légales.',
                                color: '236,72,153',
                            },
                        ].map(rule => (
                            <div key={rule.title} className="group p-6 rounded-[1.5rem] bg-white/[0.02] border border-white/[0.06] hover:border-white/10 transition-all duration-300 flex flex-col">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 flex-shrink-0"
                                    style={{ background: `rgba(${rule.color},0.08)`, border: `1.5px solid rgba(${rule.color},0.2)`, color: `rgb(${rule.color})` }}>
                                    {rule.icon}
                                </div>
                                <h4 className="font-black text-white text-sm tracking-tight mb-2">{rule.title}</h4>
                                <p className="text-slate-500 text-xs leading-relaxed font-medium flex-1">{rule.text}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ─────────────────────────────────────────────
                    FAQ
                ───────────────────────────────────────────── */}
                <section className="max-w-4xl mx-auto px-6 mb-28">
                    <div className="text-center mb-14">
                        <Pill>Questions Fréquentes</Pill>
                        <h2 className="text-4xl font-black tracking-tighter text-white mt-4 mb-3">
                            Tout ce que vous<br />devez savoir.
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {faqs.map(faq => <FaqItem key={faq.q} {...faq} />)}
                    </div>
                </section>

                {/* ─────────────────────────────────────────────
                    CONTACT SECTION
                ───────────────────────────────────────────── */}
                <section className="max-w-5xl mx-auto px-6 mb-28">
                    <div className="relative rounded-[2.5rem] overflow-hidden border border-emerald-500/15 p-12 lg:p-20 text-center">
                        {/* Background glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/30 via-[#020617] to-indigo-950/20" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/[0.06] rounded-full blur-[100px] pointer-events-none" />
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/15 to-transparent" />

                        <div className="relative z-10">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/8 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-[0.4em] mb-8">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Discutons de Votre Projet
                            </div>
                            <h2 className="text-5xl md:text-6xl font-black tracking-tighter text-white mb-6 leading-[0.9]">
                                Prêt à Transformer
                                <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-emerald-300 to-cyan-400">
                                    Vos Arrêts ?
                                </span>
                            </h2>
                            <p className="text-lg text-slate-400 font-medium max-w-2xl mx-auto mb-14 leading-relaxed">
                                Contactez notre équipe pour une analyse personnalisée de vos besoins. Nous vous répondons sous 24 heures ouvrables avec une proposition adaptée à votre réalité industrielle.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-3xl mx-auto text-left mb-12">
                                <div>
                                    <p className="text-[9px] font-black text-emerald-500/70 uppercase tracking-[0.4em] mb-4">Équipe Commerciale & Support</p>
                                    <div className="space-y-3">
                                        <ContactLink href="mailto:membership@plannex.ai" label="membership@plannex.ai" sub="Partenariats & Souscriptions" />
                                        <ContactLink href="mailto:support@plannex.ai" label="support@plannex.ai" sub="Support Technique & Questions" />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-indigo-400/70 uppercase tracking-[0.4em] mb-4">Fondateur & Direction</p>
                                    <div className="space-y-3">
                                        <ContactLink href="mailto:contact@rachidtaouama.com" label="contact@rachidtaouama.com" sub="Rachid Taouama — Fondateur" />
                                        <ContactLink href="mailto:rachid.taouama@gmail.com" label="rachid.taouama@gmail.com" sub="Contact Direct Fondateur" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <a href="mailto:membership@plannex.ai"
                                    className="group relative flex items-center gap-3 px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] text-black overflow-hidden transition-all active:scale-95 shadow-[0_20px_60px_rgba(16,185,129,0.35)]"
                                    style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                                    <Mail className="w-4 h-4 relative z-10" />
                                    <span className="relative z-10">Contacter PlanneX</span>
                                </a>
                                <button onClick={() => setPage?.('contact')}
                                    className="px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.25em] text-slate-300 border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all active:scale-95">
                                    Page Contact
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ─────────────────────────────────────────────
                    TRUST BAR
                ───────────────────────────────────────────── */}
                <section className="w-full mx-auto px-6 lg:px-12 2xl:px-24 pb-24">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { icon: <Shield className="w-5 h-5" />, label: 'Données 100% Sécurisées', sub: 'Chiffrement AES-256', color: '16,185,129' },
                            { icon: <Server className="w-5 h-5" />, label: 'Serveurs Souverains', sub: 'Hébergement dédié', color: '99,102,241' },
                            { icon: <Globe className="w-5 h-5" />, label: 'Zéro Intégration Tierce', sub: 'Architecture fermée & sûre', color: '245,158,11' },
                            { icon: <Zap className="w-5 h-5" />, label: 'Support Réactif', sub: 'Réponse < 24h ouvrables', color: '6,182,212' },
                        ].map(t => (
                            <div key={t.label} className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                                    style={{ background: `rgba(${t.color},0.08)`, border: `1.5px solid rgba(${t.color},0.2)`, color: `rgb(${t.color})` }}>
                                    {t.icon}
                                </div>
                                <p className="text-white font-black text-xs tracking-tight mb-0.5">{t.label}</p>
                                <p className="text-slate-600 text-[10px] font-medium uppercase tracking-widest">{t.sub}</p>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};
