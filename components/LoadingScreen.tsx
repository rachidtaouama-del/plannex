import React, { useState } from 'react';

interface LoadingScreenProps {
    onSelectColdStop: () => void;
    onStartFromScratch: () => void;
    onBack: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onSelectColdStop, onStartFromScratch, onBack }) => {
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#020202] overflow-hidden font-sans">
            {/* ── Grid texture ── */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.025)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

            {/* ── Ambient glows ── */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-emerald-500/[0.04] rounded-full blur-[160px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[400px] bg-cyan-500/[0.03] rounded-full blur-[160px] pointer-events-none" />

            {/* ── Top bar line ── */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

            {/* ── Back Button ── */}
            <button
                onClick={onBack}
                className="absolute top-8 left-8 md:top-10 md:left-10 group flex items-center gap-3 text-slate-500 hover:text-white transition-all z-20"
            >
                <div className="w-11 h-11 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover:border-emerald-500/40 group-hover:bg-emerald-500/8 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] group-hover:text-emerald-400 transition-colors">Retour</span>
            </button>

            {/* ── Step indicator ── */}
            <div className="absolute top-10 right-10 flex items-center gap-2 z-20">
                <div className="flex items-center gap-1.5">
                    <div className="w-6 h-1 rounded-full bg-emerald-500" />
                    <div className="w-3 h-1 rounded-full bg-white/10" />
                    <div className="w-3 h-1 rounded-full bg-white/10" />
                </div>
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Étape 1/3</span>
            </div>

            {/* ── Header ── */}
            <div className="relative z-10 text-center mb-16 px-6" style={{ animation: 'fadeInDown 0.7s ease-out both' }}>
                <div className="inline-flex items-center gap-2.5 px-5 py-2 mb-7 rounded-full bg-emerald-500/8 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_25px_rgba(16,185,129,0.08)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400 text-[9px] font-black uppercase tracking-[0.4em]">Nouveau Projet</span>
                </div>

                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter mb-4 leading-none">
                    Initialisation{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400 italic">
                        du Projet
                    </span>
                </h1>

                <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-emerald-500/40" />
                    <div className="h-0.5 w-16 bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-500/40" />
                </div>

                <p className="text-slate-400 text-base max-w-lg mx-auto font-medium leading-relaxed">
                    Sélectionnez la méthodologie de l'espace de travail pour votre nouvel ordonnancement.
                </p>
            </div>

            {/* ── Cards ── */}
            <div className="relative z-10 w-full max-w-6xl px-6 grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">

                {/* ── Card 1: Planification Experte ── */}
                {[
                    {
                        id: 'expert',
                        onClick: onSelectColdStop,
                        badge: 'IMPORT DONNÉES',
                        delay: '0.15s',
                        accent: '#10b981',
                        accentRgb: '16,185,129',
                        numberLabel: '01',
                        title: 'Planification Experte',
                        description: 'Importez une liste de tâches formatée (GMAO, fichier Excel) et construisez le planning visuellement via notre interface interactive. Recommandé pour les arrêts majeurs et complexes.',
                        footerTag: 'GMAO · EXCEL · IMPORT',
                        icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        ),
                    },
                    {
                        id: 'libre',
                        onClick: onStartFromScratch,
                        badge: 'FEUILLE BLANCHE',
                        delay: '0.3s',
                        accent: '#3b82f6',
                        accentRgb: '59,130,246',
                        numberLabel: '02',
                        title: 'Création Libre',
                        description: "Démarrez avec une feuille blanche. Idéal pour concevoir des prototypes rapides, des plannings partiels ou lorsque l'export de votre système d'information n'est pas disponible.",
                        footerTag: 'SCRATCH · PROTOTYPAGE · RAPIDE',
                        icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                        ),
                    }
                ].map((card) => {
                    const isHovered = hoveredCard === card.id;
                    return (
                        <div
                            key={card.id}
                            onClick={card.onClick}
                            onMouseEnter={() => setHoveredCard(card.id)}
                            onMouseLeave={() => setHoveredCard(null)}
                            className="group relative cursor-pointer overflow-hidden rounded-[2.5rem] border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl flex flex-col transition-all duration-700"
                            style={{
                                animation: `fadeInUp 0.8s ease-out ${card.delay} both`,
                                transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
                                boxShadow: isHovered
                                    ? `0 40px 80px -20px rgba(${card.accentRgb},0.35), 0 0 0 1px rgba(${card.accentRgb},0.2)`
                                    : '0 20px 40px -20px rgba(0,0,0,0.5)',
                                borderColor: isHovered ? `rgba(${card.accentRgb},0.25)` : '',
                            }}
                        >
                            {/* Top accent line */}
                            <div className="absolute top-0 left-0 right-0 h-px transition-all duration-700"
                                style={{ background: isHovered ? `linear-gradient(90deg, transparent, ${card.accent}, transparent)` : 'transparent' }} />

                            {/* Corner glow */}
                            <div className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none transition-all duration-700 blur-[100px]"
                                style={{ background: isHovered ? `rgba(${card.accentRgb},0.1)` : `rgba(${card.accentRgb},0.03)`, transform: 'translate(40%, -40%)' }} />

                            {/* Scan-line shimmer on hover */}
                            <div className="absolute inset-0 -translate-y-full group-hover:translate-y-0 transition-none group-hover:animate-none pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                style={{ background: `linear-gradient(180deg, rgba(${card.accentRgb},0.04) 0%, transparent 60%)` }} />

                            {/* Scan texture */}
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(255,255,255,0.004)_3px,rgba(255,255,255,0.004)_4px)] pointer-events-none" />

                            <div className="relative z-10 p-10 lg:p-12 flex flex-col h-full">
                                {/* Top row */}
                                <div className="flex items-center justify-between mb-10">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-[0.3em] transition-all duration-500"
                                        style={{ background: `rgba(${card.accentRgb},0.08)`, border: `1px solid rgba(${card.accentRgb},0.2)`, color: card.accent }}>
                                        <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: card.accent }} />
                                        {card.badge}
                                    </div>
                                    <span className="text-[11px] font-black text-slate-700">{card.numberLabel}</span>
                                </div>

                                {/* Icon */}
                                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8 relative overflow-hidden transition-all duration-500"
                                    style={{
                                        background: `rgba(${card.accentRgb},0.08)`,
                                        border: `1.5px solid rgba(${card.accentRgb},${isHovered ? '0.4' : '0.15'})`,
                                        boxShadow: isHovered ? `0 0 40px rgba(${card.accentRgb},0.3)` : 'none',
                                        color: card.accent,
                                        transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                                    }}>
                                    {card.icon}
                                </div>

                                {/* Title */}
                                <h2 className="text-2xl lg:text-3xl font-black tracking-tight mb-4 transition-all duration-300"
                                    style={{ color: isHovered ? card.accent : '#ffffff' }}>
                                    {card.title}
                                </h2>

                                {/* Desc */}
                                <p className="text-slate-500 leading-relaxed text-sm flex-grow font-medium mb-10">
                                    {card.description}
                                </p>

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-6 border-t border-white/5 transition-colors duration-300"
                                    style={{ borderColor: isHovered ? `rgba(${card.accentRgb},0.15)` : '' }}>
                                    <span className="text-[8px] font-black uppercase tracking-[0.25em] transition-all duration-300"
                                        style={{ color: isHovered ? card.accent : 'rgba(255,255,255,0.15)' }}>
                                        {card.footerTag}
                                    </span>
                                    <div className="flex items-center gap-2.5 font-black text-xs uppercase tracking-[0.2em] transition-all duration-300"
                                        style={{ color: card.accent, transform: isHovered ? 'translateX(4px)' : 'translateX(0)' }}>
                                        Sélectionner
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Footer ── */}
            <div className="relative z-10 mt-16 flex items-center gap-4 opacity-25">
                <div className="h-px w-10 bg-slate-700" />
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">PlanneX · Sélectionnez une méthodologie pour continuer</span>
                <div className="h-px w-10 bg-slate-700" />
            </div>

            <style>{`
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-25px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(40px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default LoadingScreen;