
import React from 'react';

interface WelcomeModalProps {
    username: string;
    onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ username, onClose }) => {
    return (
        <div 
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-80 p-4 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="transform transition-all duration-300 ease-out bg-slate-900 border border-slate-700 p-8 rounded-2xl shadow-2xl text-center max-w-lg w-full mx-4 animate-fade-up-fast"
                onClick={e => e.stopPropagation()}
            >
                <div className="mb-6 flex justify-center">
                    <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center border-2 border-yellow-500/50">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-white mb-4">Bienvenue, <span className="capitalize">{username}</span>!</h2>
                
                <div className="bg-slate-800/50 border-l-4 border-yellow-400 p-4 text-left rounded-lg">
                    <p className="font-semibold text-yellow-300">Attention : Sécurité du Compte</p>
                    <p className="text-slate-300 mt-2 text-sm">
                        Pour des raisons de sécurité, ne partagez pas votre compte. PlanneX suspendra automatiquement tout compte connecté sur plusieurs appareils simultanément.
                    </p>
                </div>

                <div className="mt-8">
                    <button 
                        onClick={onClose}
                        className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-lg transition-colors"
                    >
                        J'ai compris
                    </button>
                </div>
            </div>
        </div>
    );
};
