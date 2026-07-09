import React from 'react';
import type { ReportData, AppParameters, EvaluationData } from '../../types';

interface CoverPagePreviewProps {
    reportData: ReportData;
    parameters: AppParameters;
    evaluationData: EvaluationData;
}

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
}

export const CoverPagePreview: React.FC<CoverPagePreviewProps> = ({ reportData, parameters, evaluationData }) => {
    return (
        <div 
            className="bg-slate-800 shadow-lg rounded-sm mx-auto text-white flex flex-col justify-between p-12 relative overflow-hidden" 
            style={{ width: '210mm', height: '297mm', aspectRatio: '1 / 1.4142' }}
        >
            {reportData.coverImage && (
                <img src={reportData.coverImage} className="absolute inset-0 w-full h-full object-cover z-0" alt="Cover background"/>
            )}
            <div className="absolute inset-0 w-full h-full bg-slate-900 opacity-70 z-10"></div>

            <div className="relative z-20">
                {reportData.logo && (
                    <img src={reportData.logo} className="h-20 w-auto" alt="Company Logo" />
                )}
            </div>

            <div className="relative z-20 text-center">
                <h1 className="text-4xl font-bold">{reportData.title || "Titre du Rapport"}</h1>
                <p className="mt-4 text-lg">
                    Du {formatDate(parameters.shutdownStart)} au {formatDate(parameters.shutdownEnd)}
                </p>
            </div>
            
            <div className="relative z-20 text-center">
                {reportData.preparedBy && (
                    <p>Réalisé par : {reportData.preparedBy}</p>
                )}
                <p className="text-xs text-slate-400 mt-2">
                    Rapport généré le {new Date().toLocaleDateString('fr-FR')}
                </p>
            </div>
        </div>
    );
};
