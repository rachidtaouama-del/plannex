import React from 'react';

interface ReportSectionPreviewProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

export const ReportSectionPreview: React.FC<ReportSectionPreviewProps> = ({ title, children, className }) => {
    return (
        <div className={`bg-slate-800 p-6 rounded-lg shadow-lg ${className}`}>
            <h3 className="text-xl font-bold text-white mb-4 border-b border-slate-700 pb-2">
                {title}
            </h3>
            <div className="text-slate-300">
                {children}
            </div>
        </div>
    );
};
