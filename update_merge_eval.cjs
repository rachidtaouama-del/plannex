const fs = require('fs');

const APP_PATH = 'c:\\Users\\HP\\Downloads\\copy-of-plannex-account-99.84ra-s\\App.tsx';
let appContent = fs.readFileSync(APP_PATH, 'utf8');

const replacement = `  const handleFinishedScheduling = (
    results: CalculationResults,
    params: AppParameters,
    state: SchedulingPageState
  ) => {
    setSchedulingResults(results);
    setSchedulingParams(params);
    setSchedulingState(state);
    
    setEvaluationData(prev => {
        const initialEvalData = initializeEvaluationData(results, params, isColdStopFlow);
        if (!prev) return initialEvalData;
        
        // Merge tasks
        Object.keys(initialEvalData.tasks).forEach(key => {
            const id = Number(key);
            if (prev.tasks[id]) {
                initialEvalData.tasks[id] = { ...initialEvalData.tasks[id], ...prev.tasks[id] };
            }
        });
        
        // Merge chronology
        const prevChronologyMap = new Map(prev.chronology.map(e => [e.id, e]));
        initialEvalData.chronology = initialEvalData.chronology.map(event => {
            const existing = prevChronologyMap.get(event.id);
            if (existing) {
                return {
                    ...event,
                    actualStart: existing.actualStart || event.actualStart,
                    actualEnd: existing.actualEnd || event.actualEnd,
                    plannedStart: existing.plannedStart || event.plannedStart,
                    plannedEnd: existing.plannedEnd || event.plannedEnd,
                    label: existing.label || event.label
                };
            }
            return event;
        });
        
        // Append user-added events (ids Usually start with 'event-')
        prev.chronology.forEach(event => {
            if (!initialEvalData.chronology.find(e => e.id === event.id)) {
                initialEvalData.chronology.push(event);
            }
        });
        
        initialEvalData.supplementaryTasks = prev.supplementaryTasks;
        initialEvalData.globalSlippageEvents = prev.globalSlippageEvents;
        initialEvalData.incidentDetails = prev.incidentDetails;
        initialEvalData.accidentDetails = prev.accidentDetails;
        
        return initialEvalData;
    });

    setHotReviewState(initialHotReviewState);
    setCustomCriticalPaths([]);
    setIsColdStopFlow(true);
    setActivePage('planner');
    setPlannerSubPage('dashboard');
  };`;

appContent = appContent.replace(
    /const handleFinishedScheduling = \([\s\S]*?setActivePage\('planner'\);\s+setPlannerSubPage\('dashboard'\);\s+\};/m,
    replacement
);

fs.writeFileSync(APP_PATH, appContent, 'utf8');
console.log("Updated handleFinishedScheduling.");
