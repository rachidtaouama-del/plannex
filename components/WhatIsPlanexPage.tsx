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
                            Qu'est-ce que <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">PlanneX</span> ?
                        </h1>
                        <div className="h-px w-20 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent mx-auto mb-7"></div>
                        <p className="text-lg text-slate-400 leading-relaxed max-w-3xl mx-auto">
                            Un moteur d'ordonnancement industriel de nouvelle génération, propulsé par l'IA, conçu pour transformer la complexité des arrêts techniques en clarté exécutive totale.
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
                                Guide de Référence Industriel
                            </div>
                            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase leading-none mb-4">
                                Maîtriser l'Arrêt :<br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Le Guide Définitif PlanneX</span>
                            </h2>
                            <p className="text-slate-400 max-w-2xl mx-auto leading-relaxed mb-6">Du chaos industriel brut à la commande stratégique totale — le cadre complet qui révolutionne la planification des arrêts techniques.</p>
                            <div className="flex items-center justify-center gap-6 text-[10px] font-mono text-slate-600 uppercase tracking-widest">
                                <span>Mars 2026</span><span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                <span>Lecture : ~12 min</span><span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                <span>Expert-Level</span>
                            </div>
                        </div>
                    </div>

                    {/* ─── I. THE HIGH-STAKES LANDSCAPE ─────────────── */}
                    <SectionBadge num="I" subLabel="Contexte Stratégique" label="Le Terrain de Jeu à Enjeux Extrêmes" color="#10b981" />
                    <div className="grid lg:grid-cols-3 gap-5 mb-8">
                        <div className="lg:col-span-2">
                            <HCard>
                                <p className="text-slate-300 leading-relaxed mb-4 text-sm">
                                    Dans les environnements industriels haute pression — raffineries, centrales électriques, usines de fabrication massives — le temps est la devise la plus volatile. Nous ne mesurons pas les retards en heures ; nous les mesurons en <span className="text-emerald-400 font-semibold">"évaporation de capital" à des millions par minute.</span>
                                </p>
                                <p className="text-slate-400 leading-relaxed text-sm">
                                    Les outils traditionnels, bien que familiers, n'ont jamais été conçus pour gérer l'ingestion de données haute densité et les interdépendances extrêmes d'un arrêt industriel moderne. Ils forcent les chefs de projet dans le rôle de <strong className="text-white">commis de saisie de données</strong>, plutôt que de commandants stratégiques.
                                </p>
                            </HCard>
                        </div>
                        <div>
                            <HCard className="h-full flex flex-col justify-center bg-gradient-to-br from-red-950/40 to-slate-900/60 border-red-500/20">
                                <div className="text-center">
                                    <div className="text-5xl font-black text-red-400 font-mono mb-2">1:1</div>
                                    <p className="text-red-400/70 text-[10px] font-mono uppercase tracking-widest font-bold mb-3">Ratio Critique</p>
                                    <p className="text-slate-500 text-xs leading-relaxed">1 heure de retard sur le Chemin Critique = 1 heure perdue sur la date finale. Sans exception.</p>
                                </div>
                            </HCard>
                        </div>
                    </div>

                    {/* Legacy vs Reality table */}
                    <div className="overflow-x-auto rounded-2xl border border-white/8 mb-8">
                        <table className="w-full text-xs">
                            <thead><tr className="bg-white/4 border-b border-white/8">
                                <th className="text-left p-4 text-slate-500 font-mono uppercase tracking-widest">Limitations des Outils Legacy</th>
                                <th className="text-left p-4 text-slate-500 font-mono uppercase tracking-widest">Réalité Industrielle</th>
                            </tr></thead>
                            <tbody>
                                {[
                                    ["Interface rigide & courbe d'apprentissage abrupte — rapports lents et datés.", "Complexité extrême : des milliers de 'chainages' (connexions logiques) interdépendants."],
                                    ["Pourcentages vagues : \"80% terminé\" — zéro certitude mathématique pour la logique du planning.", "Conséquences financières élevées : chaque minute d'arrêt représente une perte de revenus irrécupérable."],
                                    ["Gantts statiques illisibles : occultent le chemin critique et ignorent les risques en temps réel.", "Environnement dynamique : un retard sur la 'colonne vertébrale' du projet déclenche une cascade."],
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
                            Ce déficit technique des outils existants crée une <strong className="text-white">latence dangereuse dans l'intervention</strong> et force les dirigeants à gérer à l'intuition plutôt qu'à la visibilité opérationnelle.
                        </p>
                    </div>

                    <Divider color="emerald" />

                    {/* ─── II. SOFTWARE COMPARISON ────────────────────── */}
                    <SectionBadge num="II" subLabel="Rapport Comparatif" label="L'Audit des Outils : PlanneX vs. les Solutions Legacy" color="#3b82f6" />
                    <HCard className="mb-6">
                        <p className="text-slate-400 text-sm leading-relaxed mb-0">Un audit rigoureux des systèmes legacy révèle que, bien qu'ils aient servi de piliers historiques, leurs limitations structurelles créent désormais des <span className="text-white font-semibold">angles morts opérationnels critiques</span> pour les managers modernes.</p>
                    </HCard>
                    <div className="overflow-x-auto rounded-2xl border border-white/8 mb-8">
                        <table className="w-full text-xs">
                            <thead><tr className="bg-white/4 border-b border-white/8">
                                <th className="text-left p-4 text-slate-500 font-mono uppercase tracking-widest">Critère</th>
                                <th className="text-left p-4 text-red-400/70 font-mono uppercase tracking-widest">MS Project</th>
                                <th className="text-left p-4 text-orange-400/70 font-mono uppercase tracking-widest">Primavera P6</th>
                                <th className="text-left p-4 text-emerald-400 font-mono uppercase tracking-widest">PlanneX ✓</th>
                            </tr></thead>
                            <tbody>
                                {[
                                    ["UI/UX", "Familier mais limité; interface rigide.", "Complexe, daté, courbe d'apprentissage notoire.", "Intuitif, moderne et architecture opérationnelle agile."],
                                    ["Rapports", "Standards; faible flexibilité.", "Difficile à personnaliser; expertise spécialisée requise.", "Dashboards interactifs avec filtres exécutifs et drill-down."],
                                    ["IA", "Inexistant ou superficiel.", "Non intégré; manque d'intelligence prédictive.", "IA embarquée pour optimisation et recommandations prédictives."],
                                    ["Données", "Manuel et fastidieux.", "Complexe, saisie multi-étapes.", "Édition live, co-pilote IA, télémétrie en temps réel."],
                                    ["Coût", "Modéré (abonnement).", "Élevé, complexe, souvent limité en licences.", "Abordable, flexible, adapté à l'entreprise moderne."],
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
                            Notre mandat central est l'<strong className="text-white">évolution du chef de projet</strong> : passer de la saisie de données manuelle à la supervision stratégique de haut niveau grâce à PlanneX.
                        </p>
                    </div>

                    <Divider color="blue" />

                    {/* ─── PILLAR I ────────────────────────────────────── */}
                    <SectionBadge num="I" subLabel="Pilier Fondamental" label="Planification Intelligente — Le Jumeau Numérique" color="#10b981" />
                    <HCard className="mb-6">
                        <p className="text-slate-300 text-sm leading-relaxed mb-3">
                            Un plan maître n'est pas un document statique ; c'est la fondation essentielle de la gestion des risques. La première étape est la construction du <span className="text-emerald-400 font-semibold">Jumeau Numérique</span> — un modèle numérique complet qui sert de source de vérité unique. Il permet la <strong className="text-white">simulation préventive</strong> de l'arrêt complet, identifiant les goulots <em>avant</em> qu'ils ne se manifestent sur le terrain.
                        </p>
                    </HCard>

                    {/* Dual mode tabs */}
                    <div className="mb-6">
                        <div className="flex gap-2 mb-5">
                            {["IA Co-pilote (Automatique)", "Contrôle Expert (Manuel)"].map((t, i) => (
                                <button key={i} onClick={() => setActiveTab(i)} className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === i ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-white/5 text-slate-500 hover:text-white border border-white/10'}`}>{t}</button>
                            ))}
                        </div>
                        <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                            {activeTab === 0 ? (
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
                                        <span className="text-emerald-400 font-black text-sm uppercase tracking-widest">IA Co-pilote — Mode Actif</span>
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed mb-3">Le système exploite l'IA pour analyser des <strong className="text-white">milliers de permutations en quelques secondes</strong>, identifiant la séquence de tâches la plus rapide pour minimiser la durée totale du projet. Cela redéfinit le rôle du planificateur : il passe de la saisie manuelle à la supervision stratégique de haut niveau.</p>
                                    <div className="flex flex-wrap gap-2">
                                        {["Optimisation algorithmique", "Séquences optimales automatiques", "Surveillance stratégique"].map((t, i) => (
                                            <span key={i} className="text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full uppercase tracking-widest">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-2.5 h-2.5 bg-blue-400 rounded-full"></div>
                                        <span className="text-blue-400 font-black text-sm uppercase tracking-widest">Contrôle Expert — Mode Tactique</span>
                                    </div>
                                    <p className="text-slate-300 text-sm leading-relaxed mb-3">Pour les professionnels expérimentés nécessitant une <strong className="text-white">précision chirurgicale</strong>, ce mode fournit un commandement manuel absolu sur les séquences et les timings. Il garantit que les nuances spécifiques du site et l'intuition professionnelle sont pleinement respectées.</p>
                                    <div className="flex flex-wrap gap-2">
                                        {["Commandement granulaire", "Autorité totale", "Nuance terrain intégrée"].map((t, i) => (
                                            <span key={i} className="text-[10px] font-mono bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1 rounded-full uppercase tracking-widest">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <HCard title="Le Gantt Dynamique — La Carte Vivante du Projet" titleColor="emerald">
                        <p className="text-slate-400 text-sm leading-relaxed mb-4">
                            Contrairement aux documents statiques du passé, le Gantt de PlanneX est une <strong className="text-white">carte interactive vivante</strong>. Via la "propagation d'impact automatisée," les utilisateurs font glisser des éléments pour voir l'<span className="text-emerald-400">effet d'entraînement en temps réel</span> d'un changement sur l'ensemble du planning.
                        </p>
                        <div className="grid sm:grid-cols-3 gap-3 mt-4">
                            {[
                                { icon: "⚡", label: "Optimisation IA", desc: "Identifie la séquence la plus rapide et les affectations de ressources optimales." },
                                { icon: "🗓️", label: "Ancrage Réel", desc: "Intègre des calendriers réels (3x8, 2x10) — un guide d'exécution faisable, pas une fantasie." },
                                { icon: "🗺️", label: "Filtrage Spatial", desc: "Filtrage par zones de la centrale ou shifts pour un contrôle localisé et isolé." }
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
                    <SectionBadge num="II" subLabel="Pilier Opérationnel" label="Suivi à Chaud — Connecter le Plan à la Réalité" color="#f59e0b" />
                    <div className="grid md:grid-cols-2 gap-6 mb-6">
                        <HCard>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-2.5 h-2.5 bg-red-500 rounded-full"></div>
                                <span className="text-red-400 font-black text-xs uppercase tracking-widest">Interdit chez PlanneX</span>
                            </div>
                            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 mb-3">
                                <p className="text-red-400 text-3xl font-black font-mono text-center mb-1">80%</p>
                                <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest text-center">Pourcentage "terminé"</p>
                            </div>
                            <p className="text-slate-500 text-xs leading-relaxed">Estimation subjective humaine. Brise la logique du planning. Aucune base mathématique fiable pour les prévisions. <strong className="text-red-400">Supprimé définitivement.</strong></p>
                        </HCard>
                        <HCard className="border-emerald-500/20 bg-emerald-500/3">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full shadow-[0_0_6px_rgba(16,185,129,0.8)]"></div>
                                <span className="text-emerald-400 font-black text-xs uppercase tracking-widest">La Métrique de Vérité</span>
                            </div>
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-3">
                                <p className="text-emerald-400 font-black font-mono text-center mb-1 text-sm">Heures Restantes</p>
                                <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest text-center">Durée Restante (Hours)</p>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">Nombre <strong className="text-white">mathématiquement pur</strong>. Identifie exactement les heures de travail restantes. Élimine toute ambiguïté. Fondation fiable pour chaque calcul de planning.</p>
                        </HCard>
                    </div>
                    <HCard title="Calcul du Glissement en Direct — La Télémétrie du Terrain" titleColor="amber">
                        <p className="text-slate-400 text-sm mb-5 leading-relaxed">Lorsque la réalité dévie du plan, le système emploie un processus de télémétrie rigoureux :</p>
                        <div className="space-y-3">
                            {[
                                { n: "01", c: "amber", label: "Rapport Terrain (Check-In/Check-Out)", desc: "Un chef d'équipe signale un retard via le système — données objectives, pas d'interprétation." },
                                { n: "02", c: "orange", label: "Calcul du Glissement en Direct", desc: "Le système mesure instantanément l'effet d'entraînement de ce retard spécifique sur toutes les tâches dépendantes." },
                                { n: "03", c: "emerald", label: "Impact sur la Date Finale & Chemin Critique", desc: "Recalcul immédiat de la date limite finale et du chemin critique — données terrain vers mission control." }
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
                    <SectionBadge num="III" subLabel="Pilier Décisionnel" label="Pilotage Stratégique — Mission Control" color="#a855f7" />
                    <div className="grid lg:grid-cols-2 gap-7 mb-6">
                        <HCard title="Focus Absolu sur le Chemin Critique" titleColor="purple">
                            <p className="text-slate-400 text-sm leading-relaxed mb-4">La colonne vertébrale du projet est le <span className="text-white font-semibold">Chemin Critique</span> — la chaîne la plus longue de tâches dépendantes avec <strong className="text-red-400">zéro slack</strong>. La mathématique est absolue :</p>
                            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-center mb-4">
                                <p className="text-red-400 font-black font-mono text-sm">1h de retard = 1h de glissement final</p>
                            </div>
                            <p className="text-slate-400 text-xs leading-relaxed">PlanneX maintient un <strong className="text-white">highlight visuel permanent</strong> sur ce chemin. Les alertes instantanées notifient les managers <em>à la microseconde</em> où une tâche critique dévie — maximisant la fenêtre de réaction pour réallouer les ressources.</p>
                        </HCard>
                        <HCard title="Les 3 KPIs Prédictifs du Dashboard Exécutif" titleColor="purple">
                            <div className="space-y-4">
                                {[
                                    { n: "1", c: "emerald", label: "Taux d'Avancement", desc: "Vue d'ensemble de l'état global d'achèvement du projet. Bilan de santé de haut niveau." },
                                    { n: "2", c: "blue", label: "Total Homme-Heures (HH)", desc: "Suivi granulaire de la consommation de ressources vs budget — par discipline (mécanique, électrique, etc.)." },
                                    { n: "3", c: "amber", label: "Potentiel Glissement ★", desc: "Le \"Game Changer\". Métrique prédictive (ex: \"+32h\") basée sur les tendances actuelles — permet l'intervention AVANT l'échec.", highlight: true }
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
                                <th className="text-left p-4 text-slate-500 font-mono uppercase tracking-widest">Définition Stratégique</th>
                                <th className="text-left p-4 text-slate-500 font-mono uppercase tracking-widest">Valeur Opérationnelle</th>
                            </tr></thead>
                            <tbody>
                                {[
                                    ["Taux d'Avancement", "État d'achèvement de l'architecture complète du projet.", "Bilan de santé de la vélocité projet."],
                                    ["Total HH", "Consommation de ressources vs budget financier.", "Responsabilité financière et ressources."],
                                    ["Potentiel Glissement", "Métrique prédictive basée sur les performances actuelles.", "Intervention proactive avant que les déviations deviennent des échecs critiques."],
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
                                <p className="text-[10px] font-mono text-emerald-500 uppercase tracking-[0.3em] font-bold mb-2">Synthèse Finale</p>
                                <h3 className="text-3xl font-black text-white tracking-tight mb-3">Le Cycle Vertueux de la Commande Totale</h3>
                                <p className="text-slate-400 text-sm leading-relaxed max-w-2xl mx-auto">Les données terrain en temps réel informent le Mission Control, qui affine en permanence le plan maître — un système auto-correcteur en boucle fermée de l'excellence opérationnelle.</p>
                            </div>

                            {/* Cycle arrows visual */}
                            <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
                                {["PLANIFIER", "→", "SUIVRE", "→", "PILOTER", "→", "OPTIMISER"].map((item, i) => (
                                    <span key={i} className={item === "→" ? "text-slate-600 font-mono text-lg" : "text-[10px] font-black font-mono px-4 py-2 rounded-xl uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"}>{item}</span>
                                ))}
                            </div>

                            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                                {[
                                    { n: "01", v: "PLANIFIER", e: "📡", desc: "Construire le Jumeau Numérique en ingérant tâches, ressources et calendriers de quarts réels." },
                                    { n: "02", v: "OPTIMISER", e: "⚡", desc: "L'IA scanne des milliers de possibilités pour identifier la séquence d'achèvement la plus rapide." },
                                    { n: "03", v: "SUIVRE", e: "🔍", desc: "Suivi à Chaud avec les Heures Restantes — données mathématiquement pures du terrain." },
                                    { n: "04", v: "PILOTER", e: "🎯", desc: "Œil infaillible sur le Chemin Critique via le Dashboard Exécutif prédictif et les alertes instantanées." }
                                ].map(item => (
                                    <div key={item.n} className="bg-black/40 border border-white/8 rounded-2xl p-5 hover:border-emerald-500/30 transition-all duration-300 hover:-translate-y-1 group cursor-default">
                                        <div className="text-2xl mb-2">{item.e}</div>
                                        <p className="text-[9px] font-mono text-slate-700 tracking-widest mb-1">ÉTAPE {item.n}</p>
                                        <p className="text-emerald-400 font-black text-xs uppercase tracking-wider mb-2 group-hover:text-emerald-300 transition-colors">{item.v}</p>
                                        <p className="text-slate-500 text-[11px] leading-relaxed group-hover:text-slate-400 transition-colors">{item.desc}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="grid md:grid-cols-3 gap-4 mb-10">
                                {[
                                    { from: "Intuition", to: "Décisions basées sur les données", icon: "🧠" },
                                    { from: "Réactif (Firefighting)", to: "Proactif (Glissement Prédictif)", icon: "🔮" },
                                    { from: "Commis de saisie", to: "Architecte stratégique", icon: "👤" }
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
                                    "La transition du suivi manuel de la complexité physique à l'utilisation de l'IA pour un contrôle intégré total représente un <strong className="text-slate-300">changement de paradigme dans les opérations industrielles</strong> — nous sommes passés d'enregistrer l'histoire à <em>prédire et façonner activement</em> les résultats de nos projets les plus complexes."
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
