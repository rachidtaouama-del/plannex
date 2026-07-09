import React from 'react';
import type { ReportData, ReportPages, AppParameters, EvaluationData, EvaluationKpis, CalculationResults } from '../types';
import { CoverPagePreview } from './previews/CoverPagePreview';
import { SummaryPagePreview } from './previews/SummaryPagePreview';
import { SupplementaryTasksPreview } from './previews/SupplementaryTasksPreview';
import { SlippageAnalysisPreview } from './previews/SlippageAnalysisPreview';
import { DetailedLogPreview } from './previews/DetailedLogPreview';

interface ReportPreviewProps {
    reportData: ReportData;
    selectedPages: ReportPages;
    parameters: AppParameters;
    evaluationData: EvaluationData;
    evaluationKpis: EvaluationKpis;
    results: CalculationResults;
    setEvaluationData: (data: EvaluationData | ((prevData: EvaluationData) => EvaluationData)) => void;
}

export const ReportPreview: React.FC<ReportPreviewProps> = (props) => {
    return (
        <div className="space-y-8">
            <CoverPagePreview 
                reportData={props.reportData}
                parameters={props.parameters}
                evaluationData={props.evaluationData}
            />

            {props.selectedPages.summary && (
                <SummaryPagePreview 
                    evaluationKpis={props.evaluationKpis}
                    // FIX: Pass missing properties to the SummaryPagePreview component.
                    parameters={props.parameters}
                    evaluationData={props.evaluationData}
                    // FIX: Pass the missing `setEvaluationData` prop to allow for interactive updates.
                    setEvaluationData={props.setEvaluationData}
                    results={props.results}
                />
            )}
            
            {props.selectedPages.supplementaryTasks && props.evaluationData.supplementaryTasks.length > 0 && (
                <SupplementaryTasksPreview 
                    tasks={props.evaluationData.supplementaryTasks}
                />
            )}
            
            {props.selectedPages.slippageAnalysis && props.evaluationData.globalSlippageEvents.length > 0 && (
                <SlippageAnalysisPreview
                    events={props.evaluationData.globalSlippageEvents}
                />
            )}
            
            {props.selectedPages.detailedLog && (
                <DetailedLogPreview
                    results={props.results}
                    evaluationData={props.evaluationData}
                />
            )}
        </div>
    );
};
