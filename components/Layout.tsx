import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import type { Page, UserAccount } from '../types';
import { getMockUserById, markNotificationsAsRead } from '../services/mockUserService';

interface LayoutProps {
    children: React.ReactNode;
    currentPage: Page;
    setPage: (page: Page) => void;
    isColdStopFlow: boolean;
    isAuthenticated: boolean;
    user: UserAccount | null;
    onLogout: () => void;
    setIsVideoModalOpen: (isOpen: boolean) => void;
    onBack?: () => void;
}

// Custom smooth scroll function for "impressive" slow animation
const smoothScroll = (targetId: string, duration: number) => {
    const target = document.querySelector(targetId);
    if (!target) return;

    const targetPosition = target.getBoundingClientRect().top + window.scrollY;
    const startPosition = window.scrollY;
    const distance = targetPosition - startPosition;
    let startTime: number | null = null;

    const animation = (currentTime: number) => {
        if (startTime === null) startTime = currentTime;
        const timeElapsed = currentTime - startTime;

        // Easing function: easeInOutCubic for a smooth, premium feel
        const ease = (t: number, b: number, c: number, d: number) => {
            t /= d / 2;
            if (t < 1) return c / 2 * t * t * t + b;
            t -= 2;
            return c / 2 * (t * t * t + 2) + b;
        };

        const nextScrollY = ease(timeElapsed, startPosition, distance, duration);
        window.scrollTo(0, nextScrollY);

        if (timeElapsed < duration) {
            requestAnimationFrame(animation);
        } else {
            // Ensure exact final position
            window.scrollTo(0, targetPosition);
        }
    };

    requestAnimationFrame(animation);
};

const NavLink: React.FC<{
    page?: Page;
    setPage?: (page: Page) => void;
    href?: string;
    children: React.ReactNode;
}> = ({ page, setPage, href, children }) => {
    const handleClick = (e: React.MouseEvent) => {
        if (page && setPage) {
            e.preventDefault();
            setPage(page);
        } else if (href) {
            e.preventDefault();
            // Use custom smooth scroll with 3s duration (Very slow and impressive)
            smoothScroll(href, 3000);
        }
    };

    return (
        <a href={href || '#'} onClick={handleClick} className="text-sm font-medium text-slate-300 hover:text-white transition-colors cursor-pointer">
            {children}
        </a>
    );
};

// Terminal Link Component for the Footer
const TerminalLink: React.FC<{
    page?: Page;
    setPage?: (page: Page) => void;
    href?: string;
    children: React.ReactNode;
    onClick?: () => void;
}> = ({ page, setPage, href, children, onClick }) => {
    const handleClick = (e: React.MouseEvent) => {
        if (onClick) {
            e.preventDefault();
            onClick();
        } else if (page && setPage) {
            e.preventDefault();
            setPage(page);
        }
    };

    return (
        <a
            href={href || '#'}
            onClick={handleClick}
            className="group flex items-center text-slate-400 hover:text-emerald-300 transition-colors font-mono text-sm py-1"
        >
            <span className="opacity-0 -ml-3 group-hover:opacity-100 group-hover:ml-0 mr-2 transition-all duration-300 text-emerald-500 font-bold">&gt;</span>
            <span className="group-hover:translate-x-1 transition-transform duration-300">{children}</span>
        </a>
    );
};

const Header: React.FC<{
    currentPage: Page;
    setPage: (page: Page) => void;
    isAuthenticated: boolean;
    user: UserAccount | null;
    onLogout: () => void;
    onEnterApp: () => void;
    setIsVideoModalOpen: (isOpen: boolean) => void;
    onBack?: () => void;
}> = ({ currentPage, setPage, isAuthenticated, user, onLogout, onEnterApp, setIsVideoModalOpen, onBack }) => {

    const isInfoPage = ['landing', 'what-is', 'about', 'contact', 'privacy', 'disclaimer', 'gdpr', 'copyright', 'pricing', 'voir-la-demo', 'ebook'].includes(currentPage);

    // Notifications state
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    useEffect(() => {
        if (isAuthenticated && user) {
            // Initial fetch
            const initUser = getMockUserById(user.id);
            if (initUser) setNotifications(initUser.notifications || []);

            const interval = setInterval(() => {
                const freshUser = getMockUserById(user.id);
                if (freshUser) {
                    setNotifications(freshUser.notifications || []);
                }
            }, 3000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, user]);

    const handleMarkAsRead = () => {
        if (user) {
            markNotificationsAsRead(user.id);
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }
    };
    const handleBack = () => {
        switch (currentPage) {
            case 'project_selection':
                setPage('landing');
                break;
            case 'scheduling':
                setPage('project_selection');
                break;
            case 'planner':
                setPage('scheduling');
                break;
            case 'hot_execution_review':
                setPage('planner');
                break;
            default:
                setPage('landing');
                break;
        }
    };

    if (isInfoPage) {
        return (
            <header className="absolute top-6 left-6 md:left-10 z-50">
                <button onClick={() => setPage('landing')} className="group flex items-center gap-3 focus:outline-none">
                    <div className="relative w-10 h-10 flex items-center justify-center">
                        {/* Breathing Glow Background */}
                        <div className="absolute inset-0 bg-emerald-500/20 blur-md rounded-full animate-pulse"></div>
                        {/* Hexagon Icon */}
                        <svg className="relative w-8 h-8 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <span className="text-2xl md:text-3xl font-bold tracking-tight text-white drop-shadow-md">
                        Planne<span className="text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">X</span>
                    </span>
                </button>
            </header>
        );
    }

    return (
        <header className="relative py-4 px-6 md:px-12 bg-black/40 backdrop-blur-xl border-b border-white/5">
            <div className="max-w-[1920px] mx-auto flex justify-between items-center">
                <button
                    onClick={() => setPage('landing')}
                    className="group flex items-center gap-3 focus:outline-none"
                >
                    <div className="relative w-10 h-10 flex items-center justify-center">
                        <div className="absolute inset-0 bg-emerald-500/10 blur-md rounded-full group-hover:bg-emerald-500/20 transition-colors"></div>
                        <svg className="relative w-7 h-7 text-emerald-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                        </svg>
                    </div>
                    <span className="text-2xl font-black tracking-tighter text-white">
                        Planne<span className="text-emerald-400">X</span>
                    </span>
                </button>

                <div className="flex items-center gap-6">
                    {isAuthenticated && !isInfoPage && !['admin_dashboard', 'project_hub', 'user_management'].includes(currentPage) && (
                        <nav className="hidden xl:flex items-center bg-white/[0.03] border border-white/5 rounded-2xl p-1.5 backdrop-blur-md">
                            {/* Icon-only Back button */}
                            {onBack && (
                                <button
                                    onClick={onBack}
                                    title="Retour"
                                    className="w-9 h-9 flex items-center justify-center rounded-xl mr-1 text-slate-400 hover:text-white hover:bg-white/10 transition-all group"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                            )}
                            <button
                                onClick={() => setPage('live_navigation')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === 'live_navigation' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 mr-1' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 mr-1'}`}
                            >
                                Live Map & QR
                            </button>
                            <button
                                onClick={() => setPage('data_management')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentPage === 'data_management' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
                            >
                                Base de Données
                            </button>
                        </nav>
                    )}
                    {isAuthenticated ? (
                        <>
                            {/* Notification Bell */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                                    className="relative p-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    <Bell className="w-5 h-5" />
                                    {notifications.filter(n => !n.read).length > 0 && (
                                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-black rounded-full animate-pulse"></span>
                                    )}
                                </button>

                                {isNotifOpen && (
                                    <div className="absolute top-full right-0 mt-4 w-80 bg-[#0a0f18]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in slide-in-from-top-2">
                                        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
                                            <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                                <Bell className="w-3 h-3 text-emerald-500" />
                                                Notifications
                                            </h4>
                                            {notifications.some(n => !n.read) && (
                                                <button onClick={handleMarkAsRead} className="text-[9px] font-bold text-emerald-500 hover:text-emerald-400 uppercase tracking-widest">
                                                    Tout marquer lu
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-[350px] overflow-y-auto scrollbar-hide divide-y divide-white/5">
                                            {notifications.length === 0 ? (
                                                <div className="p-6 text-center text-slate-500 text-xs">Aucune notification</div>
                                            ) : (
                                                [...notifications].reverse().map(notif => (
                                                    <div key={notif.id} className={`p-4 transition-colors ${notif.read ? 'opacity-60 hover:opacity-100' : 'bg-emerald-500/[0.02]'}`}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                                                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{notif.from === 'admin' ? 'Message Admin' : 'Système'}</span>
                                                            </div>
                                                            <span className="text-[9px] text-slate-500 font-mono text-right shrink-0">{new Date(notif.date).toLocaleDateString()}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-300 leading-relaxed">{notif.message}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-4 bg-slate-900/50 border border-slate-800 p-1.5 pr-4 rounded-full">
                                {user?.picture ? (
                                    <img src={user.picture} alt="" className="w-8 h-8 rounded-full object-cover border border-emerald-500/30" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-emerald-500/20">
                                        {(user?.firstName || user?.username)?.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <div className="flex flex-col">
                                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none mb-1">
                                        {user?.role === 'admin' ? 'Système Admin' : user?.role}
                                    </span>
                                    <span className="text-sm text-slate-200 font-bold leading-none">{user?.firstName || user?.username}</span>
                                </div>
                                <div className="h-4 w-[1px] bg-slate-800 mx-2"></div>
                                <button
                                    onClick={onLogout}
                                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-red-400 transition-colors"
                                >
                                    Quitter
                                </button>
                            </div>
                        </>
                    ) : (
                        <button
                            onClick={handleBack}
                            className="group flex items-center gap-2 px-6 py-2 bg-slate-900 border border-slate-800 rounded-full text-sm font-bold text-slate-300 hover:text-white hover:border-slate-700 transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Retour
                        </button>
                    )}
                </div>
            </div>
        </header >
    );
};

const Footer: React.FC<{ setPage: (page: Page) => void; setIsVideoModalOpen: (isOpen: boolean) => void; }> = ({ setPage, setIsVideoModalOpen }) => {
    return (
        <footer className="relative bg-[#020202] pt-24 pb-0 overflow-hidden font-sans border-t border-white/5 mt-auto">
            {/* Ambient System Grid Background */}
            <div className="absolute inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.05)_0%,transparent_70%)]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent)]"></div>
            </div>

            {/* Tactical High-Gloss Top Border Accent */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent"></div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/4 h-[1px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_20px_rgba(16,185,129,0.8)]"></div>

            <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-12 gap-16 mb-24">

                {/* Brand & Intel (col-span-5) */}
                <div className="lg:col-span-5 flex flex-col items-start pr-0 lg:pr-12 border-b lg:border-b-0 lg:border-r border-white/5 pb-10 lg:pb-0">
                    <button onClick={() => setPage('landing')} className="group flex items-center gap-4 focus:outline-none mb-8">
                        <div className="relative w-12 h-12 flex items-center justify-center bg-black border border-white/10 rounded-xl overflow-hidden group-hover:border-emerald-500/50 transition-colors duration-500">
                            <div className="absolute inset-0 bg-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <svg className="relative w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform duration-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                            </svg>
                        </div>
                        <span className="text-3xl font-black tracking-tighter text-white">
                            Planne<span className="text-emerald-400">X</span>
                        </span>
                    </button>

                    <p className="text-slate-400 text-sm leading-relaxed mb-10 max-w-sm">
                        Conçu pour le chaos industriel. Le moteur de planification ultime transformant la complexité des machines en une clarté exécutive à toute épreuve.
                    </p>


                </div>

                {/* Navigation Matrices (col-span-7) */}
                <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-3 gap-12 pt-4">
                    <div className="flex flex-col">
                        <h4 className="flex items-center gap-3 text-[10px] font-black tracking-[0.2em] text-white uppercase mb-8">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-sm shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                            Produit
                        </h4>
                        <ul className="space-y-4">
                            <li><TerminalLink page="what-is" setPage={setPage}>Qu'est-ce que PlanneX ?</TerminalLink></li>
                            <li><TerminalLink page="voir-la-demo" setPage={setPage}>Voir la démo</TerminalLink></li>
                            <li><TerminalLink page="pricing" setPage={setPage}>Tarifs</TerminalLink></li>
                            <li className="pt-2">
                                <button onClick={() => setPage('ebook')} className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[10px] uppercase tracking-widest px-3 py-2 rounded-md inline-flex items-center gap-2 hover:bg-emerald-500 hover:text-white transition-all duration-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                    Télécharger l'E-book
                                </button>
                            </li>
                        </ul>
                    </div>
                    <div className="flex flex-col">
                        <h4 className="flex items-center gap-3 text-[10px] font-black tracking-[0.2em] text-white uppercase mb-8">
                            <span className="w-1.5 h-1.5 bg-slate-500 rounded-sm"></span>
                            Entreprise
                        </h4>
                        <ul className="space-y-4">
                            <li><TerminalLink page="about" setPage={setPage}>À Propos</TerminalLink></li>
                            <li><TerminalLink page="contact" setPage={setPage}>Contact</TerminalLink></li>
                        </ul>
                    </div>
                    <div className="flex flex-col">
                        <h4 className="flex items-center gap-3 text-[10px] font-black tracking-[0.2em] text-white uppercase mb-8">
                            <span className="w-1.5 h-1.5 bg-slate-500 rounded-sm"></span>
                            Légal
                        </h4>
                        <ul className="space-y-4">
                            <li><TerminalLink page="privacy" setPage={setPage}>Confidentialité</TerminalLink></li>
                            <li><TerminalLink page="gdpr" setPage={setPage}>Conformité RGPD</TerminalLink></li>
                            <li><TerminalLink page="disclaimer" setPage={setPage}>Avertissement</TerminalLink></li>
                            <li><TerminalLink page="copyright" setPage={setPage}>Copyright</TerminalLink></li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Tactical Bottom Bar */}
            <div className="relative z-10 border-t border-white/5 bg-black">
                <div className="w-full max-w-[1400px] mx-auto px-6 lg:px-12 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-8 text-[10px] font-mono uppercase tracking-widest text-slate-500">
                        <span className="flex items-center gap-2 text-slate-400">
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M14.83 14.83a4 4 0 1 1 0-5.66" /></svg>
                            {new Date().getFullYear()} Rachid Taouama
                        </span>
                    </div>

                </div>
            </div>

            {/* Corner Bracket Decorators */}
            <div className="absolute top-0 left-0 w-16 h-16 pointer-events-none opacity-20">
                <div className="absolute top-0 left-0 w-[1px] h-full bg-gradient-to-b from-white to-transparent"></div>
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-white to-transparent"></div>
            </div>
            <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-20">
                <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-white to-transparent"></div>
                <div className="absolute top-0 right-0 w-full h-[1px] bg-gradient-to-l from-white to-transparent"></div>
            </div>
        </footer>
    );
};


const Layout: React.FC<LayoutProps> = ({ children, currentPage, setPage, isColdStopFlow, isAuthenticated, user, onLogout, setIsVideoModalOpen, onBack }) => {
    const isInfoPage = ['landing', 'what-is', 'about', 'contact', 'privacy', 'disclaimer', 'gdpr', 'copyright', 'pricing', 'voir-la-demo', 'ebook'].includes(currentPage);

    return (
        <div className="flex flex-col min-h-screen bg-black text-slate-200">
            <Header currentPage={currentPage} setPage={setPage} isAuthenticated={isAuthenticated} user={user} onLogout={onLogout} onEnterApp={() => setPage('project_selection')} setIsVideoModalOpen={setIsVideoModalOpen} onBack={onBack} />
            <main className={`flex-grow flex flex-col ${isInfoPage && currentPage !== 'landing' ? 'pt-24' : ''}`}>
                {children}
            </main>
            {isInfoPage && <Footer setPage={setPage} setIsVideoModalOpen={setIsVideoModalOpen} />}
        </div>
    );
};

export default Layout;