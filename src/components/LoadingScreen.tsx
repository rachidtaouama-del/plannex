import React, { useState, useCallback } from 'react';
import type { CalculationResults, AppParameters, UserAccount } from '../../types';
import { parseSchedulingFile, calculateSchedule } from '../services/schedulingService';


interface LoadingScreenProps {
    onSelectColdStop: () => void;
    onStartFromScratch: () => void;
    onBack: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onSelectColdStop, onStartFromScratch, onBack }) => {

    return (
        <>
            <div className="flex flex-col items-center justify-center min-h-screen text-center p-4 bg-slate-950 relative">
                <button
                    onClick={onBack}
                    className="animated-gradient-button absolute top-4 left-4 text-white flex items-center gap-2 transition-all duration-300 bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2 rounded-full shadow-lg transform hover:scale-105"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="font-semibold">Retour</span>
                </button>

                <h2 className="text-3xl font-bold text-white mb-12 fade-up-item">Démarrer la Planification</h2>
                <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8">
                    <div className="fade-up-item" style={{ animationDelay: '0.2s' }}>
                        <div
                            onClick={onSelectColdStop}
                            className="group bg-slate-800/50 p-10 rounded-xl border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 transition-all duration-300 cursor-pointer text-center h-full flex flex-col justify-center"
                        >
                            <div className="flex justify-center mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400 group-hover:text-emerald-400" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white">Planification Manuelle Assistée</h3>
                            <p className="text-slate-400 mt-2 text-base max-w-xs mx-auto">Importez une liste de tâches et construisez votre planning visuellement.</p>
                        </div>
                    </div>
                    <div className="fade-up-item" style={{ animationDelay: '0.4s' }}>
                        <div
                            onClick={onStartFromScratch}
                            className="group bg-slate-800/50 p-10 rounded-xl border border-slate-700 hover:border-emerald-500 hover:bg-slate-800 transition-all duration-300 cursor-pointer text-center h-full flex flex-col justify-center"
                        >
                            <div className="flex justify-center mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400 group-hover:text-emerald-400" fill="none" viewBox="0 0 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white">Commencer de Zéro</h3>
                            <p className="text-slate-400 mt-2 text-base max-w-xs mx-auto">Créez votre planning en ajoutant les tâches manuellement, une par une.</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default LoadingScreen;