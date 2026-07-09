import React from 'react';
import type { AIAnalysisResult } from '../types';

const getStatusInfo = (status: AIAnalysisResult['executiveSummary']['status']): { color: string, icon: React.ReactNode, label: string } => {
    switch (status) {
        case 'On Track':
            return { color: 'text-emerald-400', label: 'Sur la bonne voie', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> };
        case 'At Risk':
            return { color: 'text-yellow-400', label: 'À Risque', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> };
        case 'Off Track':
            return { color: 'text-red-500', label: 'Hors Piste', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> };
        default:
            return { color: 'text-slate-400', label: 'Indéterminé', icon: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.79 4 4s-1.79 4-4 4-4-1.79-4-4c0-1.105.448-2.093 1.172-2.828M12 12c0 0 0 0 0 0z" /></svg> };
    }
};

const SectionCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="bg-slate-800 p-6 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
            {icon}
            <h4 className="text-lg font-bold text-white">{title}</h4>
        </div>
        {children}
    </div>
);

const FindingIcon: React.FC<{ type: 'positive' | 'negative' }> = ({ type }) => {
    if (type === 'positive') {
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
    }
    return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
};


const AIAnalysisView: React.FC<{ analysis: AIAnalysisResult, onClear: () => void }> = ({ analysis, onClear }) => {
    const { executiveSummary, keyFindings, recommendations, bottlenecks } = analysis;
    const statusInfo = getStatusInfo(executiveSummary.status);

    return (
        <div className="bg-slate-800/50 border border-blue-500/30 p-6 rounded-lg shadow-lg relative mt-8">
             <button 
                onClick={onClear} 
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 transition-colors"
                aria-label="Fermer l'analyse"
            >
                &times;
            </button>
            <div className="flex items-center space-x-3 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-blue-400"><path d="m12 3-1.9 5.8-5.8 1.9 5.8 1.9 1.9 5.8 1.9-5.8 5.8-1.9-5.8-1.9Z"/><path d="M5 21v-3"/><path d="M19 21v-3"/><path d="M3 12H0"/><path d="M21 12h3"/><path d="M5 3v3"/><path d="M19 3v3"/></svg>
                <h3 className="text-xl font-semibold text-white">Analyse IA & Recommandations</h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Executive Summary */}
                <div className="lg:col-span-2 bg-slate-800 p-6 rounded-lg border-l-4" style={{ borderColor: statusInfo.color.replace('text-', '').replace('-400', '').replace('-500', '') }}>
                    <div className="flex items-center gap-3">
                        <span className={statusInfo.color}>{statusInfo.icon}</span>
                        <h4 className={`text-lg font-bold ${statusInfo.color}`}>{statusInfo.label}</h4>
                    </div>
                    <p className="text-slate-300 mt-2">{executiveSummary.summaryText}</p>
                </div>

                {/* Key Findings */}
                <SectionCard title="Points Clés" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
                    <ul className="space-y-3 text-slate-300">
                        {keyFindings.map((item, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <FindingIcon type={item.type} />
                                <span>{item.finding}</span>
                            </li>
                        ))}
                    </ul>
                </SectionCard>

                {/* Recommendations */}
                 <SectionCard title="Recommandations" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}>
                    <ul className="space-y-3 text-slate-300 list-decimal pl-5">
                        {recommendations.map((rec, index) => <li key={index}>{rec}</li>)}
                    </ul>
                </SectionCard>

                 {/* Bottlenecks */}
                <div className="lg:col-span-2">
                    <SectionCard title="Goulots d'Étranglement Identifiés" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}>
                        <div className="flex flex-wrap gap-3">
                            {bottlenecks.map((b, index) => (
                                <span key={index} className="bg-yellow-900/50 text-yellow-300 text-sm font-semibold px-3 py-1 rounded-full">{b}</span>
                            ))}
                        </div>
                    </SectionCard>
                </div>
            </div>
        </div>
    );
};

export default AIAnalysisView;