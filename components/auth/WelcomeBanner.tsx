
import React, { useState, useEffect } from 'react';

interface WelcomeBannerProps {
    username: string;
    onClose: () => void;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ username, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        const timer = setTimeout(() => setIsVisible(true), 50);
        return () => clearTimeout(timer);
    }, []);
    
    const handleClose = () => {
        setIsVisible(false);
        // Wait for animation to finish before calling parent onClose
        setTimeout(onClose, 300);
    };

    return (
        <div 
            className={`bg-slate-800 border-l-4 border-emerald-500 rounded-r-lg shadow-lg p-4 flex items-start gap-4 transition-all duration-300 ease-out ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}
            role="alert"
        >
            <div className="flex-shrink-0 text-emerald-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <div className="flex-grow">
                <h3 className="font-bold text-white">Bienvenue, <span className="capitalize">{username}</span>!</h3>
                <p className="text-sm text-slate-300 mt-1">
                    <span className="font-semibold text-yellow-400">Attention :</span> Pour des raisons de sécurité, ne partagez pas votre compte. PlanneX suspendra automatiquement tout compte connecté sur plusieurs appareils simultanément.
                </p>
            </div>
            <div className="flex-shrink-0">
                <button 
                    onClick={handleClose} 
                    className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-700 transition-colors"
                    aria-label="Fermer la bannière"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
};
