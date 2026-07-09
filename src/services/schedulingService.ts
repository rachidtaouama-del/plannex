import type { RawTask, Task, AppParameters, CalculationResults, ScheduledTask, SchedulingTaskData, DataHealthIssue } from '../../types';

// This function assumes the xlsx library is loaded from a CDN.
declare var XLSX: any;

// Helper function to parse numbers that may have different locale formats.
const parseLocaleNumber = (numStr: string | number | null | undefined): number => {
    if (numStr === null || numStr === undefined) return 0;
    if (typeof numStr === 'number') return isNaN(numStr) ? 0 : numStr;

    let s = String(numStr).trim();
    if (s === '') return 0;

    // Step 1: Aggressively clean the string. Keep only digits, dots, commas, and a potential leading minus sign.
    // This strips out units like 'h', currency symbols, etc., which is a common source of parsing errors.
    s = s.replace(/[^\d.,-]/g, '');

    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');

    // Step 2: Standardize to use a dot as the decimal separator.
    if (lastComma > lastDot) {
        // This suggests a European format (e.g., "1.234,56").
        // We remove all dots (thousands separators) and replace the final comma with a dot.
        s = s.replace(/\./g, '').replace(',', '.');
    } else {
        // This suggests a US/UK format (e.g., "1,234.56") or a simple number.
        // We just need to remove the commas (thousands separators).
        s = s.replace(/,/g, '');
    }

    const result = parseFloat(s);
    return isNaN(result) ? 0 : result;
};


// FIX: The implementation of parseSchedulingFile was incorrect, returning a Promise directly instead of an object with `promise` and `cancel` properties. This caused a destructuring error in SchedulingPage.tsx. The function has been rewritten to match the expected return type.
export const parseSchedulingFile = (file: File): { promise: Promise<{ tasks: SchedulingTaskData[], detectedStartDate: Date | null, detectedEndDate: Date | null }>, cancel: () => void } => {
    let abortHandler: (() => void) | null = null;

    const promise = new Promise<{ tasks: SchedulingTaskData[], detectedStartDate: Date | null, detectedEndDate: Date | null }>((resolve, reject) => {
        const reader = new FileReader();

        abortHandler = () => {
            reader.abort();
        };

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                const headers: string[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];
                const isProgressFile = headers.includes('isScheduled') && headers.includes('START DATE');

                if (isProgressFile) {
                    const progressJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

                    let detectedStartDate: Date | null = null;
                    let detectedEndDate: Date | null = null;

                    const restoredTasks: SchedulingTaskData[] = progressJson.map((row: any, index): SchedulingTaskData => {
                        const startDate = row['START DATE'] ? new Date(row['START DATE']) : null;
                        const endDate = row['END DATE'] ? new Date(row['END DATE']) : null;

                        if (startDate && !isNaN(startDate.getTime())) {
                            if (detectedStartDate === null || startDate < detectedStartDate) {
                                detectedStartDate = startDate;
                            }
                        }
                        if (endDate && !isNaN(endDate.getTime())) {
                            if (detectedEndDate === null || endDate > detectedEndDate) {
                                detectedEndDate = endDate;
                            }
                        }

                        const predecessorIds = (typeof row.predecessor === 'string' && row.predecessor)
                            ? row.predecessor.split(',').map(Number).filter((id: number) => !isNaN(id))
                            : Array.isArray(row.predecessor) ? row.predecessor : [];

                        return {
                            id: row.id ?? index,
                            DUREE: parseLocaleNumber(row.DUREE),
                            DISCIPLINE: String(row.DISCIPLINE || '').trim(),
                            "Nom Equipement": String(row["Nom Equipement"] || '').trim(),
                            FAMILLE: String(row.FAMILLE || '').trim(),
                            "GLOBAL TASKS": String(row["GLOBAL TASKS"] || '').trim(),
                            "Type de Maintenance": String(row["Type de Maintenance"] || ''),
                            EFFECTIF: parseLocaleNumber(row.EFFECTIF),
                            "Heures-Homme": parseLocaleNumber(row["Heures-Homme"]),
                            Préparatifs: String(row.Préparatifs || ''),
                            AVIS: row.AVIS ?? '',
                            OT: row.OT ?? '',
                            "COMMENTAIRE HSE": row["COMMENTAIRE HSE"] ?? '',
                            sequenceOrder: row.sequenceOrder ?? index,
                            isScheduled: String(row.isScheduled).toUpperCase() === 'TRUE',
                            isKeyEvent: String(row.isKeyEvent).toUpperCase() === 'TRUE',
                            "START DATE": startDate && !isNaN(startDate.getTime()) ? startDate : null,
                            "END DATE": endDate && !isNaN(endDate.getTime()) ? endDate : null,
                            DAY: row.DAY ?? null,
                            "TYPE D'EQUIPE": row["TYPE D'EQUIPE"] ?? null,
                            "EQUIPE NUMBER": row["EQUIPE NUMBER"] ?? null,
                            "MAX HOUR": row["MAX HOUR"] ?? null,
                            predecessor: predecessorIds,
                            predecessorsByName: typeof row.predecessorsByName === 'string' ? row.predecessorsByName.split(';') : [],
                            successorsByName: typeof row.successorsByName === 'string' ? row.successorsByName.split(';') : [],
                            multiDisciplineId: row.multiDisciplineId ?? undefined,
                        };
                    });
                    resolve({ tasks: restoredTasks, detectedStartDate, detectedEndDate });
                    return;
                }

                const rawJson: RawTask[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

                const findKey = (potentialNames: string[], availableKeys: string[], flexible: boolean = false): { original: string, normalized: string } | undefined => {
                    const normalize = (str: string): string => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.\-_\s'()]/g, "");
                    const normalizedAvailableKeys = availableKeys.map(k => ({ original: k, normalized: normalize(k) }));
                    for (const pName of potentialNames) {
                        const normalizedPName = normalize(pName);
                        const found = flexible
                            ? normalizedAvailableKeys.find(k => k.normalized.includes(normalizedPName))
                            : normalizedAvailableKeys.find(k => k.normalized === normalizedPName);
                        if (found) return found;
                    }
                    return undefined;
                };

                if (rawJson.length === 0) {
                    reject(new Error("Le fichier Excel semble vide."));
                    return;
                }

                let availableKeys = Object.keys(rawJson[0]);
                const mappings: Record<string, string> = {};

                const keyDefinitions = [
                    { prop: 'DUREE', names: ['duree', 'durée', 'duration'], required: true },
                    { prop: 'DISCIPLINE', names: ['discipline', 'métier'], required: true },
                    { prop: 'Nom Equipement', names: ['nom equipement', 'équipement'], required: true },
                    { prop: 'FAMILLE', names: ['famille', 'family'], required: true },
                    { prop: 'GLOBAL TASKS', names: ['global tasks', 'action', 'tâche'], required: true },
                    { prop: 'Type de Maintenance', names: ['type de maintenance'], required: false },
                    { prop: 'EFFECTIF', names: ['effectif', 'nb pers'], required: true },
                    { prop: 'Heures-Homme', names: ['heures-homme', 'charge hh', 'h-h', 'man hours'], required: true },
                    { prop: 'Préparatifs', names: ['preparatifs', 'préparatifs'], required: false },
                    { prop: 'AVIS', names: ['avis'], required: false },
                    { prop: 'OT', names: ['ot'], required: false },
                    { prop: 'COMMENTAIRE HSE', names: ['commentaire hse', 'hse', 'risk'], required: false, flexible: true },
                    { prop: 'predecessor', names: ['predecessor', 'prédecesseur'], required: false },
                    { prop: 'Successor', names: ['successor', 'successeur'], required: false },
                ];

                const missingRequired: string[] = [];

                keyDefinitions.forEach(def => {
                    const foundKey = findKey(def.names, availableKeys, def.flexible);
                    if (foundKey) {
                        mappings[def.prop] = foundKey.original;
                        availableKeys = availableKeys.filter(k => k !== foundKey.original); // Consume the key
                    } else if (def.required) {
                        missingRequired.push(def.names[0]);
                    }
                });

                if (missingRequired.length > 0) {
                    throw new Error(`Colonnes requises manquantes ou mal nommées : ${missingRequired.join(', ')}`);
                }

                const tasks: SchedulingTaskData[] = rawJson.map((row, index): SchedulingTaskData | null => {
                    const predecessorRaw = mappings.predecessor ? String(row[mappings.predecessor] || '') : '';
                    const predecessorsByName = predecessorRaw.split(/[,;]/).map(s => s.trim()).filter(Boolean);

                    const successorRaw = mappings.Successor ? String(row[mappings.Successor] || '') : '';
                    const successorsByName = successorRaw.split(/[,;]/).map(s => s.trim()).filter(Boolean);

                    const duration = parseLocaleNumber(row[mappings['DUREE']]);
                    if (duration <= 0) return null; // Filter out tasks with no duration

                    const avisVal = mappings['AVIS'] ? row[mappings['AVIS']] : null;
                    const otVal = mappings['OT'] ? row[mappings['OT']] : null;
                    const hseVal = mappings['COMMENTAIRE HSE'] ? row[mappings['COMMENTAIRE HSE']] : null;

                    return {
                        id: index,
                        DUREE: duration,
                        DISCIPLINE: String(row[mappings['DISCIPLINE']] || '').trim(),
                        "Nom Equipement": String(row[mappings['Nom Equipement']] || '').trim(),
                        FAMILLE: String(row[mappings['FAMILLE']] || '').trim(),
                        "GLOBAL TASKS": String(row[mappings['GLOBAL TASKS']] || '').trim(),
                        "Type de Maintenance": mappings['Type de Maintenance'] ? String(row[mappings['Type de Maintenance']] || '').trim() : '',
                        EFFECTIF: Math.max(1, Math.round(parseLocaleNumber(row[mappings['EFFECTIF']]))),
                        "Heures-Homme": parseLocaleNumber(row[mappings['Heures-Homme']]),
                        Préparatifs: mappings['Préparatifs'] ? String(row[mappings['Préparatifs']] || '').trim() : '',
                        AVIS: avisVal != null ? (typeof avisVal === 'string' ? avisVal.trim() : avisVal) : '',
                        OT: otVal != null ? (typeof otVal === 'string' ? otVal.trim() : otVal) : '',
                        "COMMENTAIRE HSE": hseVal != null ? (typeof hseVal === 'string' ? hseVal.trim() : hseVal) : '',
                        sequenceOrder: index,
                        predecessorsByName: predecessorsByName,
                        successorsByName: successorsByName,
                        DAY: null,
                        "TYPE D'EQUIPE": null,
                        "EQUIPE NUMBER": null,
                        "MAX HOUR": null,
                        "START DATE": null,
                        "END DATE": null,
                        predecessor: null,
                        isScheduled: false,
                        isKeyEvent: false,
                    };
                }).filter((t): t is SchedulingTaskData => t !== null);

                // Now map names to IDs
                const actionToIdMap = new Map<string, number>();
                tasks.forEach(task => actionToIdMap.set(task['GLOBAL TASKS'], task.id));

                tasks.forEach(task => {
                    const predecessorIds = (task.predecessorsByName || []).map(name => actionToIdMap.get(name)).filter((id): id is number => id !== undefined);
                    task.predecessor = predecessorIds;

                    (task.successorsByName || []).forEach(name => {
                        const successorId = actionToIdMap.get(name);
                        if (successorId !== undefined) {
                            const successorTask = tasks.find(t => t.id === successorId);
                            if (successorTask && !successorTask.predecessor?.includes(task.id)) {
                                successorTask.predecessor = [...(successorTask.predecessor || []), task.id];
                            }
                        }
                    });
                });

                resolve({ tasks: tasks, detectedStartDate: null, detectedEndDate: null });
            } catch (error) {
                if (error instanceof Error) {
                    reject(error);
                } else {
                    reject(new Error("Erreur inconnue lors du traitement du fichier."));
                }
            }
        };
        reader.onerror = () => reject(new Error("Erreur de lecture du fichier."));
        reader.onabort = () => reject(new Error("Lecture du fichier annulée."));
        reader.readAsArrayBuffer(file);
    });

    return { promise, cancel: () => { if (abortHandler) { abortHandler(); } } };
};

export const calculateSchedule = (tasks: SchedulingTaskData[], params: AppParameters): CalculationResults => {
    const scheduledTasks: ScheduledTask[] = tasks.map((task, index) => {
        const startTime = new Date(new Date(params.shutdownStart).getTime() + index * 1 * 60 * 60 * 1000); // Simple sequential schedule
        const endTime = new Date(startTime.getTime() + task.DUREE * 60 * 60 * 1000);

        return {
            id: task.id,
            action: task['GLOBAL TASKS'],
            team: task.DISCIPLINE,
            // FIX: Added explicit discipline field to match ScheduledTask interface
            discipline: task.DISCIPLINE,
            equipment: task['Nom Equipement'],
            family: task.FAMILLE,
            duration: task.DUREE,
            manHours: task['Heures-Homme'] > 0 ? task['Heures-Homme'] : task.DUREE * task.EFFECTIF,
            manpower: task.EFFECTIF,
            predecessor: task.predecessor || null,
            predecessorActions: (task.predecessor || []).map(pId => tasks.find(pt => pt.id === pId)?.['GLOBAL TASKS'] || ''),
            hasDeconsignationSuccessor: false,
            imperativeStart: false,
            sequenceOrder: task.sequenceOrder ?? index,
            startTime: startTime,
            endTime: endTime,
            isLate: endTime > new Date(params.shutdownEnd),
            ot: String(task.OT),
            avis: String(task.AVIS),
            isHighRisk: String(task['COMMENTAIRE HSE']) === '1',
            preparatifs: task.Préparatifs,
            isKeyEvent: !!task.isKeyEvent,
            maintenanceType: task['Type de Maintenance'],
            multiDisciplineId: task.multiDisciplineId,
        };
    });

    const scheduleEndDate = scheduledTasks.length > 0
        ? new Date(Math.max(...scheduledTasks.map(t => t.endTime.getTime())))
        : new Date(params.shutdownStart);

    const scheduleStartDate = scheduledTasks.length > 0
        ? new Date(Math.min(...scheduledTasks.map(t => t.startTime.getTime())))
        : new Date(params.shutdownStart);

    const effectiveWorkHours = scheduleEndDate.getTime() > scheduleStartDate.getTime()
        ? (scheduleEndDate.getTime() - scheduleStartDate.getTime()) / (1000 * 60 * 60)
        : 0;

    const totalManHours = scheduledTasks.reduce((sum, task) => sum + task.manHours, 0);
    const shutdownDurationHours = (new Date(params.shutdownEnd).getTime() - new Date(params.shutdownStart).getTime()) / (1000 * 60 * 60);

    const peakResources: Record<string, number> = {};
    const disciplines = [...new Set(tasks.map(t => t.DISCIPLINE))];
    disciplines.forEach(d => {
        peakResources[d] = Math.max(0, ...tasks.filter(t => t.DISCIPLINE === d).map(t => t.EFFECTIF));
    });

    return {
        kpis: {
            totalTasks: scheduledTasks.length,
            totalManHours,
            shutdownDurationHours,
            effectiveWorkHours: effectiveWorkHours,
        },
        peakResources,
        scheduledTasks,
        scheduleEndDate,
        maxWorkDate: new Date(params.shutdownEnd),
    };
};

const getSubTeamSize = (teamName: string, tasks: ScheduledTask[]): number => {
    if (!tasks || tasks.length === 0) return 2;
    const manpowerSum = tasks.reduce((sum, task) => sum + task.manpower, 0);
    const avgManpower = manpowerSum / tasks.length;
    const definedSizes: Record<string, number> = {
        'Graisseur': 2, 'Instrumentiste': 2, 'Mécanicien': 2,
        'Monteur Echaffaudage': 3, 'Vulcanizer': 2, 'Cleaner': 4,
    };
    return definedSizes[teamName] || Math.max(1, Math.round(avgManpower));
};

export function generateSubTeamMap(results: CalculationResults, isColdStopFlow: boolean): Map<number, { name: string; size: number }> {
    const taskIdToSubTeamMap = new Map<number, { name: string; size: number }>();

    if (isColdStopFlow) {
        results.scheduledTasks.forEach(task => {
            taskIdToSubTeamMap.set(task.id, { name: task.team, size: task.manpower });
        });
    } else {
        const tasksByTeam: Record<string, ScheduledTask[]> = {};
        results.scheduledTasks.forEach(task => {
            if (!tasksByTeam[task.team]) tasksByTeam[task.team] = [];
            tasksByTeam[task.team].push(task);
        });

        for (const teamName in tasksByTeam) {
            const teamTasks = tasksByTeam[teamName];
            const sequences = new Map<number, ScheduledTask[]>();
            const otherTasks: ScheduledTask[] = [];

            teamTasks.forEach(task => {
                // FIX: Changed 'sequenceId' to 'sequenceOrder' to match the 'ScheduledTask' type.
                // Also changed check to '!= null' to correctly handle sequenceOrder being 0.
                if (task.sequenceOrder != null) {
                    if (!sequences.has(task.sequenceOrder)) sequences.set(task.sequenceOrder, []);
                    sequences.get(task.sequenceOrder)!.push(task);
                } else {
                    otherTasks.push(task);
                }
            });

            let subTeamCounter = 0;
            const sortedSequenceKeys = Array.from(sequences.keys()).sort((a, b) => a - b);

            sortedSequenceKeys.forEach(seqId => {
                subTeamCounter++;
                const tasksInSeq = sequences.get(seqId)!;
                const subTeamInfo = { name: `${teamName} Équipe ${subTeamCounter}`, size: getSubTeamSize(teamName, tasksInSeq) };
                tasksInSeq.forEach(task => taskIdToSubTeamMap.set(task.id, subTeamInfo));
            });

            if (otherTasks.length > 0) {
                const subTeamInfo = { name: `${teamName} (Autres Tâches)`, size: getSubTeamSize(teamName, otherTasks) };
                otherTasks.forEach(task => taskIdToSubTeamMap.set(task.id, subTeamInfo));
            }
        }
    }
    return taskIdToSubTeamMap;
}
