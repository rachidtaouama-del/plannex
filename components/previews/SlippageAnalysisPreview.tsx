
import React from 'react';
import type { GlobalSlippageEvent } from '../../types';
import { ReportSectionPreview } from './PdfPagePreview';

interface SlippageAnalysisPreviewProps {
    events: GlobalSlippageEvent[];
}

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export const SlippageAnalysisPreview: React.FC<SlippageAnalysisPreviewProps> = ({ events }) => {

    return (
        <ReportSectionPreview title="Analyse du Glissement Global">
            <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-700/50 text-slate-300">
                        <tr>
                            <th className="px-4 py-2 font-semibold">Date</th>
                            <th className="px-4 py-2 font-semibold text-right">Heures Perdues</th>
                            <th className="px-4 py-2 font-semibold">Cause</th>
                            <th className="px-4 py-2 font-semibold">Action Prise</th>
                            <th className="px-4 py-2 font-semibold">Pilote</th>
                            <th className="px-4 py-2 font-semibold">Imputation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {events.map((event) => (
                             <tr key={event.id} className="border-b border-slate-700 last:border-b-0 hover:bg-slate-700/40">
                                <td className="px-4 py-2 whitespace-nowrap">{formatDate(event.eventDate)}</td>
                                <td className="px-4 py-2 text-right font-mono">{event.lostHours.toFixed(2)}</td>
                                <td className="px-4 py-2 text-slate-200">{event.cause}</td>
                                <td className="px-4 py-2">{event.preventiveAction}</td>
                                <td className="px-4 py-2">{event.pilot}</td>
                                <td className="px-4 py-2">{event.imputation || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </ReportSectionPreview>
    );
};