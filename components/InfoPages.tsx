import React, { useState, useEffect, useRef } from 'react';
import { WhatIsPlanexPage } from './WhatIsPlanexPage';
import { AboutUsPage } from './AboutUsPage';
import { ContactUsPage } from './ContactUsPage';
import { VoirLaDemoPage } from './VoirLaDemoPage';
import { EbookPage } from './EbookPage';
import { PrivacyPolicyPage } from './PrivacyPolicyPage';
import { GdprCompliancePage } from './GdprCompliancePage';
import { DisclaimerPage } from './DisclaimerPage';
import { CopyrightPage } from './CopyrightPage';
import { PricingPage as PricingComponent } from './PricingPage';

export const WhatIsPlanex: React.FC = () => <WhatIsPlanexPage />;
export const AboutUs: React.FC = () => <AboutUsPage />;
export const ContactUs: React.FC = () => <ContactUsPage />;
export const VoirLaDemo: React.FC = () => <VoirLaDemoPage />;
export const Ebook: React.FC = () => <EbookPage />;

// --- Shared Components for the HUD Design System ---

const GridBackground = () => (
    <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
    </div>
);

const PageContainer: React.FC<{ title: React.ReactNode; badge?: string; children: React.ReactNode; className?: string }> = ({ title, badge, children, className }) => (
    <div className="min-h-screen bg-[#020202] relative overflow-hidden font-sans">
        <GridBackground />
        <main className="relative z-10 pt-32 pb-24 px-4 sm:px-8 lg:px-12 w-full">
            <div className="w-full max-w-[1600px] mx-auto">
                <div className="text-center mb-16">
                    {badge && (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-emerald-400 text-xs font-mono tracking-widest uppercase mb-6 animate-fade-in">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            {badge}
                        </div>
                    )}
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-6 drop-shadow-2xl">
                        {title}
                    </h1>
                    <div className="h-px w-24 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent mx-auto"></div>
                </div>
                <div className={`text-slate-300 ${className}`}>
                    {children}
                </div>
            </div>
        </main>
    </div>
);

const HudCard: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = "", title }) => (
    <div className={`bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl p-8 relative overflow-hidden group hover:border-slate-600/80 transition-colors duration-500 ${className}`}>
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-l border-t border-emerald-500/30 rounded-tl-lg"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-r border-t border-emerald-500/30 rounded-tr-lg"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-l border-b border-emerald-500/30 rounded-bl-lg"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-r border-b border-emerald-500/30 rounded-br-lg"></div>

        {title && <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-1 h-6 bg-emerald-500 rounded-full"></span>
            {title}
        </h3>}

        <div className="relative z-10">{children}</div>
    </div>
);

// --- Individual Page Components ---

export const VideoModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex justify-center items-center z-[100] p-4" onClick={onClose}>
            <div className="relative w-full max-w-5xl border border-slate-700 rounded-2xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500 animate-gradient-x"></div>
                <video
                    src="https://media.rachidtaouama.com/wp-content/uploads/2026/03/PlanneX-5.mp4"
                    controls
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-auto"
                >
                    Votre navigateur ne supporte pas la vidéo.
                </video>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white bg-black/50 hover:bg-red-600/80 backdrop-blur rounded-full w-10 h-10 flex items-center justify-center transition-all border border-white/10"
                >
                    &times;
                </button>
            </div>
        </div>
    );
};








export const PrivacyPolicy: React.FC = () => <PrivacyPolicyPage />;

export const Disclaimer: React.FC = () => <DisclaimerPage />;

export const GDPRCompliance: React.FC = () => <GdprCompliancePage />;

export const CopyrightNotice: React.FC = () => <CopyrightPage />;

export const PricingPage: React.FC<{ setPage?: (page: any) => void }> = ({ setPage }) => <PricingComponent setPage={setPage} />;
