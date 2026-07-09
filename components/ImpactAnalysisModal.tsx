
import React, { useMemo } from 'react';
import type { ScheduledTask } from '../types';

interface ImpactAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (updatedTasks: { id: number, newStart: Date, newEnd: Date }[]) => void;
    analysisData: { task: ScheduledTask, slippage: number };
    allTasks: ScheduledTask[];
}

interface ImpactedTask {
    id: number;
    action: string;
    equipment: string;
    teams: string[];
    isCoActivity: boolean;
    originalStart: Date;
    originalEnd: Date;
    projectedStart: Date;
    projectedEnd: Date;
    slippage: number; // in hours
    linkToNext?: 'logical' | 'resource' | 'mixed';
    blockId: string;
    // FIX: Add originalTaskIds to the interface to handle co-activities correctly.
    originalTaskIds: number[];
}

const formatDate = (date: Date) => date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const LinkArrow: React.FC<{ linkType: ImpactedTask['linkToNext'] }> = ({ linkType }) => {
    if (!linkType) return null;
    const typeMap = {
        logical: { label: "Lien Logique", color: "border-sky-500" },
        resource: { label: "Lien Ressource", color: "border-amber-500" },
        mixed: { label: "Lien Mixte (Logique & Ressource)", color: "border-fuchsia-500" },
    };
    const info = typeMap[linkType];
    return (
        <div className="flex justify-center items-center h-8 my-1" title={info.label}>
            <div className={`h-full border-l-2 ${info.color} ${linkType === 'resource' ? 'border-dashed' : ''}`}></div>
        </div>
    );
};

export const ImpactAnalysisModal: React.FC<ImpactAnalysisModalProps> = ({ isOpen, onClose, onApply, analysisData, allTasks }) => {

    const impactChain = useMemo((): ImpactedTask[] => {
        if (!analysisData) return [];

        const { task: startTask, slippage } = analysisData;

        const tasksById = new Map(allTasks.map(t => [t.id, t]));

        // FIX: Group tasks by co-activity to correctly resolve dependencies for multi-discipline tasks.
        const taskGroups = new Map<string, ScheduledTask[]>();
        allTasks.forEach(task => {
            const key = task.multiDisciplineId || `single_${task.id}`;
            if (!taskGroups.has(key)) taskGroups.set(key, []);
            taskGroups.get(key)!.push(task);
        });

        // --- Pre-calculate resource dependencies ---
        const tasksByTeam = new Map<string, ScheduledTask[]>();
        allTasks.forEach(task => {
            if (!tasksByTeam.has(task.team)) tasksByTeam.set(task.team, []);
            tasksByTeam.get(task.team)!.push(task);
        });
        tasksByTeam.forEach(teamTasks => teamTasks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime()));

        const resourceSuccessorMap = new Map<number, number>();
        tasksByTeam.forEach(teamTasks => {
            for (let i = 0; i < teamTasks.length - 1; i++) {
                const currentTaskEnd = teamTasks[i].endTime.getTime();
                const nextTaskStart = teamTasks[i + 1].startTime.getTime();
                if (Math.abs(nextTaskStart - currentTaskEnd) < 1000 * 60) { // 1 minute tolerance
                    resourceSuccessorMap.set(teamTasks[i].id, teamTasks[i + 1].id);
                }
            }
        });
        const resourcePredecessorMap = new Map<number, number>();
        resourceSuccessorMap.forEach((succId, predId) => resourcePredecessorMap.set(succId, predId));


        // --- Propagate delays ---
        const impactMap = new Map<number, Omit<ImpactedTask, 'linkToNext'>>();
        const projectedEndTimes = new Map<number, Date>();

        const startTaskBlockId = startTask.multiDisciplineId || `single_${startTask.id}`;
        const startTaskGroup = taskGroups.get(startTaskBlockId) || [];

        const initialProjectedEnd = new Date(startTask.endTime.getTime() + slippage * 3600000);
        projectedEndTimes.set(startTask.id, initialProjectedEnd);

        impactMap.set(startTask.id, {
            id: startTask.id,
            action: startTask.action,
            equipment: startTask.equipment,
            teams: [startTask.team],
            isCoActivity: !!startTask.multiDisciplineId,
            originalStart: startTask.startTime,
            originalEnd: startTask.endTime,
            projectedStart: new Date(initialProjectedEnd.getTime() - startTask.duration * 3600000),
            projectedEnd: initialProjectedEnd,
            slippage,
            blockId: startTaskBlockId,
            originalTaskIds: startTaskGroup.map(t => t.id),
        });

        const queue: ScheduledTask[] = [startTask];
        const inQueue = new Set<number>([startTask.id]);
        let head = 0;

        while (head < queue.length) {
            const currentTask = queue[head++];

            const logicalSuccessors = allTasks.filter(t => t.predecessor?.includes(currentTask.id));
            const resourceSuccessorId = resourceSuccessorMap.get(currentTask.id);
            const resourceSuccessor = resourceSuccessorId ? tasksById.get(resourceSuccessorId) : undefined;
            const allSuccessors = [...new Set([...logicalSuccessors, resourceSuccessor].filter((t): t is ScheduledTask => !!t))];

            for (const successor of allSuccessors) {

                let latestPredecessorEndTime = 0;

                // Get all predecessors of the successor (logical and resource)
                const logicalPreds = successor.predecessor || [];
                const resourcePred = resourcePredecessorMap.get(successor.id);
                const allPredIds = [...new Set([...logicalPreds, resourcePred].filter((id): id is number => id !== undefined))];

                allPredIds.forEach(predId => {
                    const predProjectedEnd = projectedEndTimes.get(predId)?.getTime();
                    const predOriginalEnd = tasksById.get(predId)?.endTime.getTime();
                    const effectivePredEnd = predProjectedEnd || predOriginalEnd;
                    if (effectivePredEnd && effectivePredEnd > latestPredecessorEndTime) {
                        latestPredecessorEndTime = effectivePredEnd;
                    }
                });

                const newStartTimeMs = Math.max(latestPredecessorEndTime, successor.startTime.getTime());
                const newEndTimeMs = newStartTimeMs + successor.duration * 3600000;

                const currentProjectedEndMs = projectedEndTimes.get(successor.id)?.getTime() || 0;

                if (newEndTimeMs > currentProjectedEndMs) {
                    const newEndTime = new Date(newEndTimeMs);
                    const newSlippage = (newEndTimeMs - successor.endTime.getTime()) / 3600000;

                    const successorBlockId = successor.multiDisciplineId || `single_${successor.id}`;
                    const successorGroup = taskGroups.get(successorBlockId) || [];

                    impactMap.set(successor.id, {
                        id: successor.id,
                        action: successor.action,
                        equipment: successor.equipment,
                        teams: [successor.team],
                        isCoActivity: !!successor.multiDisciplineId,
                        originalStart: successor.startTime,
                        originalEnd: successor.endTime,
                        projectedStart: new Date(newStartTimeMs),
                        projectedEnd: newEndTime,
                        slippage: newSlippage,
                        blockId: successorBlockId,
                        originalTaskIds: successorGroup.map(t => t.id),
                    });

                    projectedEndTimes.set(successor.id, newEndTime);

                    if (!inQueue.has(successor.id)) {
                        queue.push(successor);
                        inQueue.add(successor.id);
                    }
                }
            }
        }

        // --- Finalize chain with link types ---
        const impactResult = Array.from(impactMap.values()).sort((a, b) => a.projectedStart.getTime() - b.projectedStart.getTime());
        const finalChain: ImpactedTask[] = [];
        for (let i = 0; i < impactResult.length; i++) {
            const current = impactResult[i];
            const next = impactResult[i + 1];
            let linkToNext: ImpactedTask['linkToNext'];

            if (next) {
                const nextTask = tasksById.get(next.id)!;
                // FIX: Property 'originalTaskIds' does not exist on type 'Omit<ImpactedTask, "linkToNext">'.
                // Added the property to the type and populated it.
                const isLogical = nextTask.predecessor?.some(pId => current.originalTaskIds.includes(pId));
                // FIX: Property 'originalTaskIds' does not exist on type 'Omit<ImpactedTask, "linkToNext">'.
                // Added the property to the type and populated it.
                const isResource = resourceSuccessorMap.get(current.id) === next.id || current.originalTaskIds.some(oId => resourceSuccessorMap.get(oId) === next.id);

                if (isLogical && isResource) linkToNext = 'mixed';
                else if (isLogical) linkToNext = 'logical';
                else if (isResource) linkToNext = 'resource';
            }
            finalChain.push({ ...current, linkToNext });
        }

        return finalChain;

    }, [analysisData, allTasks]);

    const handleApplyClick = () => {
        const updates = impactChain.map(task => ({
            id: task.id,
            newStart: task.projectedStart,
            newEnd: task.projectedEnd
        }));
        onApply(updates);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-[80] p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-700" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h2 className="text-xl font-black text-white flex items-center gap-3">
                        {analysisData.slippage > 0 ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                        )}
                        {analysisData.slippage > 0 ? "Analyse d'Impact : Glissement Detected" : "Confirmation : Ratrapage & Optimisation"}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
                </header>
                <main className="p-6 overflow-y-auto space-y-2">
                    {impactChain.map((task, index) => (
                        <React.Fragment key={task.id}>
                            <div className={`p-3 rounded-md border ${index === 0 ? 'border-yellow-500 bg-yellow-900/20' : 'border-slate-700 bg-slate-900/50'}`}>
                                <div className="flex justify-between items-start gap-4">
                                    <div>
                                        <p className="font-semibold text-slate-200">{task.action}</p>
                                        <p className="text-xs text-slate-400">{task.equipment}</p>
                                    </div>
                                    <div className={`text-right flex-shrink-0 font-bold px-2 py-0.5 rounded ${task.slippage > 0 ? 'bg-red-900/50 text-red-300' : 'bg-emerald-900/50 text-emerald-300'}`}>
                                        {task.slippage > 0 ? `Retard: +${task.slippage.toFixed(2)}h` : `Gain: ${task.slippage.toFixed(2)}h`}
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-700/50 grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <p className="font-semibold text-slate-400 mb-1">Planning Initial</p>
                                        <p className="font-mono text-slate-300">{formatDate(task.originalStart)}</p>
                                        <p className="font-mono text-slate-300">→ {formatDate(task.originalEnd)}</p>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-yellow-300 mb-1">Planning Projeté</p>
                                        <p className="font-mono text-yellow-400 font-bold">{formatDate(task.projectedStart)}</p>
                                        <p className="font-mono text-yellow-400 font-bold">→ {formatDate(task.projectedEnd)}</p>
                                    </div>
                                </div>
                            </div>
                            {index < impactChain.length - 1 && <LinkArrow linkType={task.linkToNext} />}
                        </React.Fragment>
                    ))}
                </main>
                <footer className="flex justify-end p-4 border-t border-slate-700 gap-4">
                    <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Fermer
                    </button>
                    <button onClick={handleApplyClick} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-md transition-colors">
                        Appliquer ce Scénario
                    </button>
                </footer>
            </div>
        </div>
    );
};
