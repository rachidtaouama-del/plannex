const fs = require('fs');

const APP_PATH = 'c:\\Users\\HP\\Downloads\\copy-of-plannex-account-99.84ra-s\\App.tsx';
let appContent = fs.readFileSync(APP_PATH, 'utf8');

appContent = appContent.replace(
    /const initializeEvaluationData = \(results: CalculationResults, params: AppParameters\): EvaluationData => \{/,
    `const initializeEvaluationData = (results: CalculationResults, params: AppParameters, isColdStopFlow: boolean): EvaluationData => {`
);

appContent = appContent.replace(
    /const \{ shutdownStart, shutdownEnd, consignation, deconsignation, combustion, demarrage \} = params;\s+const \{ scheduleEndDate \} = results;\s+const p_consignationStart = new Date\(shutdownStart\);\s+const p_workStart = new Date\(p_consignationStart\.getTime\(\) \+ consignation \* 60 \* 1000\);\s+const p_workEnd = scheduleEndDate; \/\/ This is the calculated end of all tasks\s+let p_deconsignationStart, p_deconsignationEnd;\s+let p_combustionStart, p_combustionEnd;\s+const p_demarrageEnd = new Date\(shutdownEnd\);\s+const p_demarrageStart = new Date\(p_demarrageEnd\.getTime\(\) - demarrage \* 60 \* 1000\);\s+if \(combustion\.mode === 'after_deconsignation'\) \{\s+const p_allumageEnd = p_demarrageStart;\s+p_combustionEnd = p_allumageEnd;\s+p_combustionStart = new Date\(p_allumageEnd\.getTime\(\) - combustion\.value \* 60 \* 1000\);\s+p_deconsignationEnd = p_combustionStart;\s+p_deconsignationStart = new Date\(p_deconsignationEnd\.getTime\(\) - deconsignation \* 60 \* 1000\);\s+\} else \{ \/\/ 'parallel'\s+p_deconsignationEnd = p_demarrageStart;\s+p_deconsignationStart = new Date\(p_deconsignationEnd\.getTime\(\) - deconsignation \* 60 \* 1000\);\s+p_combustionEnd = p_demarrageStart;\s+p_combustionStart = new Date\(p_combustionEnd\.getTime\(\) - combustion\.value \* 60 \* 1000\);\s+\}/,
    `const { shutdownStart, shutdownEnd, consignation, deconsignation, combustion, demarrage } = params;
  const { scheduleEndDate } = results;

  const p_consignationStart = new Date(shutdownStart);
  const p_workStart = new Date(p_consignationStart.getTime() + consignation * 60 * 1000);
  const p_workEnd = scheduleEndDate;

  let p_deconsignationStart, p_deconsignationEnd;
  let p_combustionStart, p_combustionEnd;

  const p_demarrageEnd = new Date(shutdownEnd);
  const p_demarrageStart = new Date(p_demarrageEnd.getTime() - demarrage * 60 * 1000);

  if (combustion.mode === 'after_deconsignation') {
    const p_allumageEnd = p_demarrageStart;
    p_combustionEnd = p_allumageEnd;
    p_combustionStart = new Date(p_allumageEnd.getTime() - combustion.value * 60 * 1000);
    p_deconsignationEnd = p_combustionStart;
    p_deconsignationStart = new Date(p_deconsignationEnd.getTime() - deconsignation * 60 * 1000);
  } else {
    p_deconsignationEnd = p_demarrageStart;
    p_deconsignationStart = new Date(p_deconsignationEnd.getTime() - deconsignation * 60 * 1000);
    p_combustionEnd = p_demarrageStart;
    p_combustionStart = new Date(p_combustionEnd.getTime() - combustion.value * 60 * 1000);
  }

  const cheminCritiqueDuration = (p_workEnd.getTime() - p_workStart.getTime()) / (1000 * 60);

  // Initialize Chronology properly
  let initialChronology: ChronologyEvent[] = [];

  if (isColdStopFlow) {
    initialChronology = results.scheduledTasks.filter(t => t.isKeyEvent).map(t => ({
      id: String(t.id),
      label: t.action,
      plannedStart: toDateTimeLocal(t.startTime),
      plannedEnd: toDateTimeLocal(t.endTime),
      actualStart: toDateTimeLocal(t.startTime),
      actualEnd: toDateTimeLocal(t.endTime)
    }));
  } else {
    initialChronology = [
      { id: '-10', label: 'Arrêt de la ligne', plannedStart: toDateTimeLocal(p_consignationStart), plannedEnd: toDateTimeLocal(p_consignationStart), actualStart: toDateTimeLocal(p_consignationStart), actualEnd: toDateTimeLocal(p_consignationStart) },
      { id: '-1', label: 'CONSIGNATION', plannedStart: toDateTimeLocal(p_consignationStart), plannedEnd: toDateTimeLocal(p_workStart), actualStart: toDateTimeLocal(p_consignationStart), actualEnd: toDateTimeLocal(p_workStart) },
      { id: '-11', label: 'Début des travaux', plannedStart: toDateTimeLocal(p_workStart), plannedEnd: toDateTimeLocal(p_workStart), actualStart: toDateTimeLocal(p_workStart), actualEnd: toDateTimeLocal(p_workStart) },
      { id: '-12', label: 'Chemin Critique', plannedStart: toDateTimeLocal(p_workStart), plannedEnd: toDateTimeLocal(p_workEnd), actualStart: toDateTimeLocal(p_workStart), actualEnd: toDateTimeLocal(p_workEnd) },
      { id: '-13', label: 'Fin des travaux', plannedStart: toDateTimeLocal(p_workEnd), plannedEnd: toDateTimeLocal(p_workEnd), actualStart: toDateTimeLocal(p_workEnd), actualEnd: toDateTimeLocal(p_workEnd) },
      { id: '-3', label: 'DECONSIGNATION', plannedStart: toDateTimeLocal(p_deconsignationStart), plannedEnd: toDateTimeLocal(p_deconsignationEnd), actualStart: toDateTimeLocal(p_deconsignationStart), actualEnd: toDateTimeLocal(p_deconsignationEnd) },
      { id: '-2', label: 'ALLUMAGE DE LA CHAMBRE À COMBUSTION', plannedStart: toDateTimeLocal(p_combustionStart), plannedEnd: toDateTimeLocal(p_combustionEnd), actualStart: toDateTimeLocal(p_combustionStart), actualEnd: toDateTimeLocal(p_combustionEnd) },
      { id: '-4', label: 'DEMARRAGE DE LA BOUCLE', plannedStart: toDateTimeLocal(p_demarrageStart), plannedEnd: toDateTimeLocal(p_demarrageEnd), actualStart: toDateTimeLocal(p_demarrageStart), actualEnd: toDateTimeLocal(p_demarrageEnd) }
    ].filter(e => e.plannedStart && e.plannedEnd);
  }`
);

appContent = appContent.replace(
    /chronology: \[\],\s+incidentDetails: \[\],/,
    `chronology: initialChronology,
    incidentDetails: [],`
);

appContent = appContent.replace(
    /const initialEvalData = initializeEvaluationData\(results, params\);/,
    `const initialEvalData = initializeEvaluationData(results, params, isColdStopFlow);`
);

fs.writeFileSync(APP_PATH, appContent, 'utf8');

// For Evaluation persistence: 
// In EvaluationView.tsx, state is managed by App.tsx. The user wants "when he leave the page and back he fund the data".
// The real issue might be: when they reload the page. Since we can't easily persist \`results\` with Date objects via localStorage without parsing it carefully, it's complex.
// Wait, the user's issue might just be that the chronology is NOT saved when they leave the App entirely, OR simply it starts empty. Currently, I populated it.

console.log("Updated initializeEvaluationData to prefill chronology.");
