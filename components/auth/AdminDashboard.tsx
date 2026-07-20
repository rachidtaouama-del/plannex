
import React, { useState, useEffect } from 'react';

interface AdminDashboardProps {
    currentUserRole?: string;
    username?: string;
    onNavigateToUserManagement: () => void;
    onNavigateToProjectHub: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUserRole, username, onNavigateToUserManagement, onNavigateToProjectHub }) => {
    const [hoveredCard, setHoveredCard] = useState<string | null>(null);
    const [tick, setTick] = useState(0);
    const [showNotification, setShowNotification] = useState(true);

    useEffect(() => {
        const id = setInterval(() => setTick(t => t + 1), 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => setShowNotification(false), 7000);
        return () => clearTimeout(timer);
    }, []);

    const now = new Date();
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let cards = [
        {
            id: 'users',
            title: 'Gestion des Utilisateurs',
            subtitle: 'Administration complète des accès. Créez, suspendez ou gérez les privilèges des opérateurs de la plateforme.',
            badge: 'USER MGMT',
            accent: '#10b981',
            accentRgb: '16,185,129',
            shadowColor: 'rgba(16,185,129,0.35)',
            onClick: onNavigateToUserManagement,
            delay: '0.15s',
            icon: (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
            ),
        },
        {
            id: 'hub',
            title: 'Project Hub',
            subtitle: "Gérez l'historique de tous vos projets de planification. Créez, consultez, dupliquez et suivez l'avancement de chaque arrêt.",
            badge: 'PROJECT HUB',
            accent: '#6366f1',
            accentRgb: '99,102,241',
            shadowColor: 'rgba(99,102,241,0.35)',
            onClick: onNavigateToProjectHub,
            delay: '0.3s',
            icon: (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
                    <path d="M9 13h6M9 17h4" />
                </svg>
            ),
        },
    ];

    if (currentUserRole !== 'admin') {
        cards = cards.filter(c => c.id !== 'users');
    }

    return (
        <div className="relative flex flex-col items-center justify-center min-h-screen bg-[#020202] overflow-hidden py-20 px-6 font-sans">
            
            {/* ── Sleek Welcome Notification ── */}
            {showNotification && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 80,
                        right: 24,
                        zIndex: 100,
                        background: 'rgba(15, 23, 42, 0.8)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: 16,
                        padding: '16px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(16, 185, 129, 0.1) inset',
                        animation: 'slideInRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards, fadeOutRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) 6.4s forwards',
                    }}
                >
                    <div style={{
                        width: 40, height: 40, borderRadius: 12, background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981'
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>
                    <div>
                        <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>Welcome back</div>
                        <div style={{ color: '#f8fafc', fontSize: 14, fontWeight: 700 }}>{username || 'Operator'}</div>
                    </div>
                    <button 
                        onClick={() => setShowNotification(false)}
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, marginLeft: 8 }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            )}

            {/* ── Animated grid ── */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.025)_1px,transparent_1px)] bg-[size:48px_48px] pointer-events-none" />

            {/* ── Ambient glows ── */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-emerald-500/[0.04] rounded-full blur-[160px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-blue-500/[0.04] rounded-full blur-[160px] pointer-events-none" />

            {/* ── Live Clock strip ── */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
            <div className="absolute top-3 right-6 flex items-center gap-3 z-20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] font-mono">{timeStr}</span>
                <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">LIVE</span>
            </div>

            {/* ── Header ── */}
            <div className="relative z-10 text-center mb-20" style={{ animation: 'fadeInDown 0.8s ease-out both' }}>
                <div className="inline-flex items-center gap-2.5 px-5 py-2 mb-8 rounded-full bg-emerald-500/8 border border-emerald-500/20 backdrop-blur-xl shadow-[0_0_30px_rgba(16,185,129,0.08)]">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-emerald-400 text-[9px] font-black uppercase tracking-[0.4em]">
                        {currentUserRole === 'admin' ? "Console d'Administration" : "Espace de Travail Professionnel"}
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>

                <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter mb-5 leading-none">
                    Portail de{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400 italic">
                        Contrôle
                    </span>
                </h1>

                <div className="flex items-center justify-center gap-3 mb-7">
                    <div className="h-px w-16 bg-gradient-to-r from-transparent to-emerald-500/50" />
                    <div className="h-1 w-24 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)]" />
                    <div className="h-px w-16 bg-gradient-to-l from-transparent to-blue-500/50" />
                </div>

                <p className="text-slate-400 text-lg max-w-xl mx-auto font-medium leading-relaxed">
                    Gérez vos ressources et initiez de nouvelles simulations avec une précision chirurgicale.
                </p>
            </div>

            {/* ── Cards ── */}
            <div className={`relative z-10 w-full ${cards.length === 1 ? 'max-w-xl mx-auto' : 'max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12'}`}>
                {cards.map((card) => {
                    const isHovered = hoveredCard === card.id;
                    return (
                        <div
                            key={card.id}
                            onClick={card.onClick}
                            onMouseEnter={() => setHoveredCard(card.id)}
                            onMouseLeave={() => setHoveredCard(null)}
                            className="group relative cursor-pointer overflow-hidden rounded-[2.5rem] border border-white/[0.06] bg-white/[0.02] backdrop-blur-2xl transition-all duration-700"
                            style={{
                                animation: `fadeInUp 0.8s ease-out ${card.delay} both`,
                                transform: isHovered ? 'translateY(-10px)' : 'translateY(0)',
                                boxShadow: isHovered
                                    ? `0 40px 80px -20px ${card.shadowColor}, 0 0 60px -30px ${card.shadowColor}`
                                    : '0 20px 40px -20px rgba(0,0,0,0.5)',
                                borderColor: isHovered ? `rgba(${card.accentRgb},0.25)` : 'rgba(255,255,255,0.06)',
                            }}
                        >
                            {/* Top accent bar */}
                            <div className="absolute top-0 left-0 right-0 h-px transition-all duration-700"
                                style={{ background: isHovered ? `linear-gradient(90deg, transparent, ${card.accent}, transparent)` : 'transparent' }} />

                            {/* Corner glow */}
                            <div className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none transition-all duration-700 blur-[100px]"
                                style={{ background: isHovered ? `rgba(${card.accentRgb},0.12)` : `rgba(${card.accentRgb},0.03)`, transform: 'translate(40%, -40%)' }} />

                            {/* Scan-line texture */}
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(255,255,255,0.005)_3px,rgba(255,255,255,0.005)_4px)] pointer-events-none" />

                            <div className="relative z-10 p-10 lg:p-12 flex flex-col h-full">
                                {/* Badge */}
                                <div className="flex items-center justify-between mb-10">
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-[0.3em] transition-all duration-500"
                                        style={{
                                            background: `rgba(${card.accentRgb},0.08)`,
                                            borderColor: `rgba(${card.accentRgb},0.2)`,
                                            color: card.accent,
                                        }}>
                                        <div className="w-1 h-1 rounded-full animate-pulse" style={{ background: card.accent }} />
                                        {card.badge}
                                    </div>
                                    {/* Number badge */}
                                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-black text-slate-600">
                                        {card.id === 'users' ? '01' : '02'}
                                    </div>
                                </div>

                                {/* Icon */}
                                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8 transition-all duration-500 relative overflow-hidden"
                                    style={{
                                        background: `rgba(${card.accentRgb},0.08)`,
                                        border: `1.5px solid rgba(${card.accentRgb},${isHovered ? '0.4' : '0.15'})`,
                                        boxShadow: isHovered ? `0 0 40px rgba(${card.accentRgb},0.3)` : 'none',
                                        color: card.accent,
                                        transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                                    }}>
                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                                        style={{ background: `radial-gradient(circle at center, rgba(${card.accentRgb},0.2), transparent 70%)` }} />
                                    <div className="relative z-10">{card.icon}</div>
                                </div>

                                <h3 className="text-2xl lg:text-3xl font-black text-white mb-4 tracking-tight transition-all duration-300 leading-tight"
                                    style={{ color: isHovered ? card.accent : undefined }}>
                                    {card.title}
                                </h3>

                                <p className="text-slate-500 leading-relaxed text-sm mb-auto flex-grow font-medium">
                                    {card.subtitle}
                                </p>

                                {/* Footer CTA */}
                                <div className="mt-10 flex items-center justify-between">
                                    <div className="flex items-center gap-3 font-black text-sm uppercase tracking-[0.2em] transition-all duration-300"
                                        style={{ color: card.accent, transform: isHovered ? 'translateX(6px)' : 'translateX(0)' }}>
                                        <span>Accéder</span>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                    <div className="flex gap-1">
                                        {[0, 1, 2].map(i => (
                                            <div key={i} className="w-3 h-0.5 rounded-full transition-all duration-300"
                                                style={{ background: isHovered ? card.accent : 'rgba(255,255,255,0.1)', opacity: isHovered ? 1 - i * 0.25 : 0.3 }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Footer watermark ── */}
            <div className="relative z-10 mt-20 flex items-center gap-4 opacity-30">
                <div className="h-px w-12 bg-slate-700" />
                <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">PlanneX · Industrial Intelligence Platform · v3.0</span>
                <div className="h-px w-12 bg-slate-700" />
            </div>

            <style>{`
                @keyframes fadeInDown {
                    from { opacity: 0; transform: translateY(-30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(50px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeInScale {
                    from { opacity: 0; transform: scale(0.92) translateY(20px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes fadeOut {
                    from { opacity: 1; visibility: visible; }
                    to { opacity: 0; visibility: hidden; pointer-events: none; }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
                @keyframes slideInRight {
                    from { opacity: 0; transform: translateX(50px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                @keyframes fadeOutRight {
                    from { opacity: 1; transform: translateX(0); }
                    to { opacity: 0; transform: translateX(50px); }
                }
            `}</style>
        </div>
    );
};

export default AdminDashboard;
