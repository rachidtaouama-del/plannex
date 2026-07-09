import React from 'react';
import type { SupplementaryTask } from '../../types';
import { ReportSectionPreview } from './PdfPagePreview';

interface SupplementaryTasksPreviewProps {
    tasks: SupplementaryTask[];
}

export const SupplementaryTasksPreview: React.FC<SupplementaryTasksPreviewProps> = ({ tasks }) => {
    return (
        <ReportSectionPreview title="Travaux Supplémentaires">
            <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm text-left">
                     <thead className="bg-slate-700/50 text-slate-300">
                        <tr>
                            <th className="px-4 py-2 font-semibold">Action</th>
                            <th className="px-4 py-2 font-semibold">Équipement</th>
                            <th className="px-4 py-2 font-semibold">Équipe(s)</th>
                            <th className="px-4 py-2 font-semibold text-right">Charge (H-H)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tasks.map((task) => (
                            <tr key={task.id} className="border-b border-slate-700 last:border-b-0 hover:bg-slate-700/40">
                                <td className="px-4 py-2 text-slate-200" title={task.maintenanceType}>{task.action}</td>
                                <td className="px-4 py-2">{task.equipment}</td>
                                <td className="px-4 py-2">{task.teamDetails.map(d => d.team).join(', ')}</td>
                                <td className="px-4 py-2 text-right font-mono">{task.totalManHours.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </ReportSectionPreview>
    );
};