
import type { RawTask, Task, AppParameters, CalculationResults, ScheduledTask, SchedulingTaskData, DataHealthIssue, EvaluationData, TaskStatus, CompanyCost, CostHubEntry, ScaffoldingRecord, HandlingRecord, PermitRecord, SimopsRecord } from '../types';

const toDateTimeLocal = (date: Date): string => {
    if (!date || isNaN(date.getTime())) return '';
    const tzoffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzoffset).toISOString().slice(0, 16);
};

// This function assumes the xlsx library is loaded from a CDN.
declare var XLSX: any;

// Helper function to parse numbers that may have different locale formats.
const parseLocaleNumber = (numStr: string | number | null | undefined): number => {
    if (numStr === null || numStr === undefined) return 0;
    if (typeof numStr === 'number') return isNaN(numStr) ? 0 : numStr;

    let s = String(numStr).trim();
    if (s === '') return 0;

    s = s.replace(/[^\d.,-]/g, '');

    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');

    if (lastComma > lastDot) {
        s = s.replace(/\./g, '').replace(',', '.');
    }

    const result = parseFloat(s);
    return isNaN(result) ? 0 : result;
};

const parseBooleanLike = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined) return -1;
    if (typeof value === 'number') {
        if (value === 1) return 1;
        if (value === 0) return 0;
        return -1;
    }
    if (typeof value === 'boolean') return value ? 1 : 0;
    const s = String(value).trim().toLowerCase();
    if (s === '1' || s === 'oui' || s === 'yes' || s === 'vrai' || s === 'true') return 1;
    if (s === '0' || s === 'non' || s === 'no' || s === 'faux' || s === 'false') return 0;
    return -1;
};

const findKeyHelper = (potentialNames: string[], availableKeys: string[], flexible: boolean = false): { original: string, normalized: string } | undefined => {
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

// ─── Cost Computation ─────────────────────────────────────────────────────────
/**
 * Build a fast lookup map from CostHubEntry[]:
 *   key = "COMPANY||POSTENUMBER" (both uppercased, trimmed)
 */
export const buildCostHubMap = (entries: CostHubEntry[]): Map<string, CostHubEntry> => {
    const map = new Map<string, CostHubEntry>();
    entries.forEach(e => {
        const key = `${String(e.company).toUpperCase().trim()}||${String(e.posteNumber).trim()}`;
        map.set(key, e);
    });
    return map;
};

const costHubLookup = (costHubMap: Map<string, CostHubEntry>, company: string, posteNumber: string | number): CostHubEntry | undefined => {
    const key = `${String(company).toUpperCase().trim()}||${String(posteNumber).trim()}`;
    return costHubMap.get(key);
};

/**
 * Compute all cost fields for a task given the supporting domain records and the Cost Hub.
 */
export const computeTaskCosts = (
    task: SchedulingTaskData,
    costHubMap: Map<string, CostHubEntry>
): void => {
    const company = String(task.COMPANY || '').trim();
    const posteNumber = task['POSTE NUMBER'] ?? '';
    const qty = parseLocaleNumber(task.QT);
    const hh = parseLocaleNumber(task['Heures-Homme']);
    const additionalCost = parseLocaleNumber(task['Additional Cost']);

    // Look up the Cost Hub entry for this task
    const hubEntry = costHubLookup(costHubMap, company, posteNumber);
    const priceU = hubEntry?.priceU ?? parseLocaleNumber(task['PRICE FOR HH']);
    const costType = String(hubEntry?.costType || '').toUpperCase().trim();
    task['POSTE DESCRIPTION'] = hubEntry?.posteDescription ?? String(task['POSTE DESCRIPTION'] || '');
    // Store cost type on task for display in CostControlPage
    task['COST_TYPE'] = costType || 'QT';

    // Task M.O cost: if Cost Type = 'HH' → use Heures-Homme × Price U, else QT × Price U
    const baseQuantity = costType === 'HH' ? hh : qty;
    const taskCost = (baseQuantity * priceU) + additionalCost;
    task['TASK_COST'] = taskCost;

    // Phase 6: Granular separation
    if (costType === 'HH') {
        task['MO_HH_COST'] = taskCost;
        task['PRESTATION_COST'] = 0;
    } else {
        task['MO_HH_COST'] = 0;
        task['PRESTATION_COST'] = taskCost;
    }

    // Scaffolding cost — always calculated separately from its own sheet records
    let scaffoldingCost = 0;
    (task.scaffoldingRecords || []).forEach(sr => {
        const sEntry = costHubLookup(costHubMap, sr.company, sr.posteNumber);
        const sPriceU = sEntry?.priceU ?? 0;
        // Use Cost Hub price if available; otherwise fall back to the pre-computed TOTAL PRICE from the sheet
        const sTotal = sPriceU > 0 ? (sr.QT * sPriceU) : (sr.totalPrice ?? 0);
        sr.totalPrice = sTotal;
        scaffoldingCost += sTotal;
    });
    task['SCAFFOLDING_COST'] = scaffoldingCost;

    // Handling cost — always calculated separately from its own sheet records
    let handlingCost = 0;
    (task.handlingRecords || []).forEach(hr => {
        const hEntry = costHubLookup(costHubMap, hr.company, hr.posteNumber);
        const hPriceU = hEntry?.priceU ?? 0;
        // Use Cost Hub price if available; otherwise fall back to the pre-computed TOTAL PRICE from the sheet
        const hBase = hPriceU > 0 ? (hr.hours * hPriceU) : (hr.totalPrice ?? 0);
        const hTotal = hBase + hr.additionalCost;
        hr.totalPrice = hTotal;
        handlingCost += hTotal;
    });
    task['HANDLING_COST'] = handlingCost;

    // PDR cost
    const pdrCost = (task.pdrItems || []).reduce((sum, p) => sum + (p.totalPrice ?? 0), 0);
    task['PDR COST'] = pdrCost;

    // Grand Total = Task M.O + Scaffolding + Handling + PDR
    task['TOTAL_COST'] = taskCost + scaffoldingCost + handlingCost + pdrCost;
    task['TOTAL TASK COST'] = task['TOTAL_COST'];
};

// ─── Return type ──────────────────────────────────────────────────────────────
type ParseResult = {
    tasks: SchedulingTaskData[];
    mapTasks?: SchedulingTaskData[];
    pdrItems: any[];
    evaluationData?: EvaluationData;
    costData?: CompanyCost[];       // legacy
    costHubEntries: CostHubEntry[];
    scaffoldingRecords: ScaffoldingRecord[];
    handlingRecords: HandlingRecord[];
    permitRecords: PermitRecord[];
    simopsRecords: SimopsRecord[];
    detectedStartDate: Date | null;
    detectedEndDate: Date | null;
};

export const parseSchedulingFile = (file: File): { promise: Promise<ParseResult>, cancel: () => void } => {
    let abortHandler: (() => void) | null = null;

    const promise = new Promise<ParseResult>((resolve, reject) => {
        const reader = new FileReader();

        abortHandler = () => { reader.abort(); };

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // --- STEP 1: PARSE ALL READINESS DATA (PDR, Consommables, Interchangeables) ---
                let parsedPdrItems: any[] = [];

                // Helper to parse a readiness sheet
                const parseReadinessSheet = (sheetName: string, defaultType: string) => {
                    const ws = workbook.Sheets[sheetName];
                    const rawJson: any[] = XLSX.utils.sheet_to_json(ws, { defval: null });
                    return rawJson.map((row, idx) => {
                        const qty = parseLocaleNumber(row['QUANTITE'] || row['QTY'] || row['Qty'] || row['Quantity']);
                        const priceU = parseLocaleNumber(row['PRIX UNITAIRE'] || row['PRICE U'] || row['Price Per Unite'] || row['Price U']);

                        let rawStatus = row['statut'] || row['STATUT'] || row['Statut'] || row['STATUT LOGISTIQUE'] || row['Status'] || row['status'] || 'Awaiting Process';
                        let status: 'Awaiting Process' | 'Active Tenders' | 'Inventory Assets' = 'Awaiting Process';
                        const statusStr = String(rawStatus).trim().toLowerCase();
                        if (statusStr.includes('inventory') || statusStr.includes('assets') || statusStr.includes('stock')) {
                            status = 'Inventory Assets';
                        } else if (statusStr.includes('awaiting') || statusStr.includes('codif')) {
                            status = 'Awaiting Process';
                        } else if (statusStr.includes('tender') || statusStr.includes('active') || statusStr.includes('process')) {
                            status = 'Active Tenders';
                        }

                        let readiness = -1;
                        const rawReadiness = String(row['READINESS'] || row['Readiness'] || row['readiness'] || '').toUpperCase();
                        if (rawReadiness.includes('READY') || rawReadiness === '1' || rawReadiness === 'OUI') readiness = 1;
                        else if (rawReadiness.includes('MISSING') || rawReadiness === '0' || rawReadiness === 'NON') readiness = 0;

                        const criticityKey = Object.keys(row).find(k => k.trim().toLowerCase() === 'criticity' || k.trim().toLowerCase() === 'criticité' || k.trim().toLowerCase() === 'criticite');
                        const rawCriticity = criticityKey ? row[criticityKey] : null;
                        const criticity = rawCriticity !== null && rawCriticity !== undefined ? (Number(rawCriticity) === 1 ? 1 : 0) : 0;

                        return {
                            id: `${defaultType.toLowerCase()}-${idx}-${Date.now()}`,
                            OT: String(row['OT REFERENCE'] || row['OT'] || row['ot'] || ''),
                            sparePart: String(row['DESIGNATION'] || row['SPARE PART'] || row['Spare Part'] || row['spare part'] || row['ARTICLE'] || ''),
                            unite: String(row['UNITE'] || row['Unite'] || row['unite'] || ''),
                            type: String(row['TYPE'] || row['Type'] || row['type'] || defaultType).trim(),
                            qty: qty,
                            priceU: priceU,
                            totalPrice: qty * priceU,
                            readiness: readiness === -1 ? parseBooleanLike(row['Readiness'] || row['readiness']) : readiness,
                            status: status,
                            criticity: criticity,
                            dueDate: (() => {
                                const val = row['DUE DATE (PLANNIFICATION)'] || row['Due Date'] || row['due date'];
                                if (!val) return null;
                                return (val instanceof Date) ? val.toLocaleDateString('fr-FR') : String(val);
                            })(),
                            comment: String(row['COMMENTAIRE'] || row['Comment'] || row['comment'] || row['Observation'] || row['Commentaire'] || ''),
                        };
                    });
                };

                // PDR Sheet
                const pdrSheetName = workbook.SheetNames.find(n =>
                    n.toUpperCase() === 'PDR' || n.toUpperCase() === 'SUIVI DE PDR' || n.toUpperCase() === 'SUIVI PDR'
                );
                if (pdrSheetName) parsedPdrItems.push(...parseReadinessSheet(pdrSheetName, 'PDR'));

                // Consommables Sheet
                const consomSheetName = workbook.SheetNames.find(n =>
                    n.toUpperCase().includes('CONSOMMABLE')
                );
                if (consomSheetName) parsedPdrItems.push(...parseReadinessSheet(consomSheetName, 'Consommable'));

                // Interchangeables Sheet
                const interSheetName = workbook.SheetNames.find(n =>
                    n.toUpperCase().includes('INTERCHANGEABLE')
                );
                if (interSheetName) parsedPdrItems.push(...parseReadinessSheet(interSheetName, 'Interchangeable'));


                // --- STEP 1.5: PARSE COST DATA ---

                // (a) Legacy COSTE sheet (single rate per company) — kept for backward compat
                let parsedCostData: CompanyCost[] = [];
                const costSheetNameLegacy = workbook.SheetNames.find((n: string) =>
                    n.toUpperCase() === 'COSTE' || n.toUpperCase() === 'COUTS'
                );
                if (costSheetNameLegacy) {
                    const rawCostJson: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[costSheetNameLegacy], { defval: null });
                    parsedCostData = rawCostJson.map((row: any) => ({
                        company: String(row['COMPANY'] || row['Company'] || '').trim(),
                        pricePerHour: parseLocaleNumber(row['PRICE PER HOUR'] || row['Price Per Hour'] || row['PRIX PAR HH'] || 0),
                    })).filter((c: CompanyCost) => c.company !== '');
                }

                // (b) New "Cost Hub" sheet (Company + Poste Number + Price U)
                let parsedCostHubEntries: CostHubEntry[] = [];
                const costHubSheetName = workbook.SheetNames.find((n: string) =>
                    n.replace(/\s+/g, '').toUpperCase() === 'COSTHUB' ||
                    n.replace(/\s+/g, '').toUpperCase() === 'COST HUB'.replace(/\s/g, '')
                );
                if (costHubSheetName) {
                    const hubWorksheet = workbook.Sheets[costHubSheetName];
                    const hubHeaders: string[] = XLSX.utils.sheet_to_json(hubWorksheet, { header: 1 })[0] as string[];
                    const rawHubJson: any[] = XLSX.utils.sheet_to_json(hubWorksheet, { defval: null });

                    const hubKeyMappings: Record<string, string> = {};
                    const hubKeyDefs = [
                        { prop: 'company', names: ['company', 'societe'] },
                        { prop: 'costType', names: ['cost type', 'type de cout', 'tarif type'] },
                        { prop: 'posteNumber', names: ['poste number', 'poste num', 'numero poste', 'poste'] },
                        { prop: 'posteDescription', names: ['poste description', 'description', 'libelle poste'] },
                        { prop: 'priceU', names: ['price u', 'prix u', 'unit price', 'prix unitaire', 'price unit'] },
                    ];

                    hubKeyDefs.forEach(def => {
                        const found = findKeyHelper(def.names, hubHeaders);
                        if (found) hubKeyMappings[def.prop] = found.original;
                    });

                    parsedCostHubEntries = rawHubJson.map((row: any): CostHubEntry => {
                        const rawCT = hubKeyMappings.costType ? String(row[hubKeyMappings.costType] || '').trim() : '';
                        // Identify internal cost type for logic but store original for display
                        const costType = rawCT;

                        return {
                            company: hubKeyMappings.company ? String(row[hubKeyMappings.company] || '').trim() : '',
                            costType: costType,
                            posteNumber: hubKeyMappings.posteNumber ? (row[hubKeyMappings.posteNumber] ?? '') : '',
                            posteDescription: hubKeyMappings.posteDescription ? String(row[hubKeyMappings.posteDescription] || '').trim() : '',
                            priceU: hubKeyMappings.priceU ? parseLocaleNumber(row[hubKeyMappings.priceU]) : 0,
                        };
                    }).filter((e: CostHubEntry) => e.company !== '');
                }

                // (c) Scaffolding sheet
                let parsedScaffoldingRecords: ScaffoldingRecord[] = [];
                const scaffSheetName = workbook.SheetNames.find((n: string) =>
                    n.replace(/\s+/g, '').toUpperCase().includes('SCAFFOLDING') ||
                    n.replace(/\s+/g, '').toUpperCase().includes('SCAFOLDING') ||
                    n.replace(/\s+/g, '').toUpperCase().includes('ECHAFAUDAGE')
                );
                if (scaffSheetName) {
                    const rawScaff: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[scaffSheetName], { defval: null });
                    const scaffGetVal = (row: any, ...keys: string[]) => {
                        const norm: Record<string, any> = {};
                        Object.keys(row).forEach(k => { norm[k.trim().toLowerCase()] = row[k]; });
                        for (const key of keys) { const v = norm[key.toLowerCase()]; if (v !== null && v !== undefined) return v; }
                        return null;
                    };
                    parsedScaffoldingRecords = rawScaff.map((row: any): ScaffoldingRecord => ({
                        OT: String(scaffGetVal(row, 'ot', 'o t', 'order', 'order number', 'numero ot', 'n°ot') ?? '').trim(),
                        company: String(scaffGetVal(row, 'company', 'societe', 'société', 'entreprise', 'contractor') ?? '').trim(),
                        readiness: parseBooleanLike(scaffGetVal(row, 'scaffolding readiness', 'readiness', 'pret', 'prêt', 'ready', 'statut') ?? 0),
                        posteNumber: scaffGetVal(row, 'poste number', 'poste num', 'numero poste', 'poste', 'post number', 'post no') ?? '',
                        posteDescription: String(scaffGetVal(row, 'poste description', 'description', 'designation', 'désignation', 'libelle') ?? '').trim() || undefined,
                        QT: parseLocaleNumber(scaffGetVal(row, 'qt', 'qty', 'quantity', 'quantite', 'quantité', 'qte') ?? 0),
                        totalPrice: parseLocaleNumber(scaffGetVal(row, 'total price', 'prix total', 'montant', 'total') ?? 0) || undefined,
                        comment: String(scaffGetVal(row, 'comment', 'commentaire', 'observation', 'remarks', 'note') ?? '').trim() || undefined,
                    })).filter((r: ScaffoldingRecord) => r.OT !== '');
                }

                // (d) Handling sheet
                let parsedHandlingRecords: HandlingRecord[] = [];
                const handlingSheetName = workbook.SheetNames.find((n: string) =>
                    n.toUpperCase().includes('HANDLING') || n.toUpperCase().includes('MANUTENTION')
                );
                if (handlingSheetName) {
                    const rawHandling: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[handlingSheetName], { defval: null });
                    const handGetVal = (row: any, ...keys: string[]) => {
                        const norm: Record<string, any> = {};
                        Object.keys(row).forEach(k => { norm[k.trim().toLowerCase()] = row[k]; });
                        for (const key of keys) { const v = norm[key.toLowerCase()]; if (v !== null && v !== undefined) return v; }
                        return null;
                    };
                    parsedHandlingRecords = rawHandling.map((row: any): HandlingRecord => ({
                        OT: String(handGetVal(row, 'ot', 'o t', 'order', 'order number', 'numero ot', 'n°ot') ?? '').trim(),
                        company: String(handGetVal(row, 'company', 'societe', 'société', 'entreprise', 'contractor') ?? '').trim(),
                        handlingType: String(handGetVal(row, 'handling type', 'handling', 'type manutention', 'type', 'type de manutention') ?? '').trim(),
                        readiness: parseBooleanLike(handGetVal(row, 'handling readiness', 'readiness', 'pret', 'prêt', 'ready', 'statut') ?? 0),
                        posteNumber: handGetVal(row, 'poste number', 'poste num', 'numero poste', 'poste', 'post number', 'post no') ?? '',
                        posteDescription: String(handGetVal(row, 'poste description', 'description', 'designation', 'désignation', 'libelle') ?? '').trim() || undefined,
                        hours: parseLocaleNumber(handGetVal(row, 'hours', 'heures', 'duree', 'durée', 'h', 'hh') ?? 0),
                        additionalCost: parseLocaleNumber(handGetVal(row, 'additional cost', 'cout additionnel', 'coût additionnel', 'cout supp', 'extra cost') ?? 0),
                        totalPrice: parseLocaleNumber(handGetVal(row, 'total price', 'prix total', 'montant', 'total') ?? 0) || undefined,
                        comment: String(handGetVal(row, 'comment', 'commentaire', 'observation', 'remarks', 'note') ?? '').trim() || undefined,
                    })).filter((r: HandlingRecord) => r.OT !== '');
                }

                // (e) Permit Hub sheet
                let parsedPermitRecords: PermitRecord[] = [];
                const permitSheetName = workbook.SheetNames.find((n: string) =>
                    n.replace(/\s+/g, '').toUpperCase().includes('PERMITHUB') ||
                    n.replace(/\s+/g, '').toUpperCase().includes('PERMIT')
                );
                if (permitSheetName) {
                    const rawPermits: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[permitSheetName], { defval: null });
                    const permitGetVal = (row: any, ...keys: string[]) => {
                        const norm: Record<string, any> = {};
                        Object.keys(row).forEach(k => { norm[k.trim().toLowerCase()] = row[k]; });
                        for (const key of keys) { const v = norm[key.toLowerCase()]; if (v !== null && v !== undefined) return v; }
                        return null;
                    };
                    parsedPermitRecords = rawPermits.map((row: any): PermitRecord => ({
                        OT: String(permitGetVal(row, 'ot', 'o t', 'order', 'order number', 'numero ot', 'n°ot') ?? '').trim(),
                        permitName: String(permitGetVal(row, 'permit types', 'permit type', 'permit name', 'permit', 'type permis', 'permis', 'type de permis', 'designation') ?? '').trim(),
                        readiness: parseBooleanLike(permitGetVal(row, 'readiness', 'pret', 'prêt', 'ready', 'statut') ?? 0),
                    })).filter((r: PermitRecord) => r.OT !== '' && r.permitName !== '');
                }

                // (f) SIMOPS sheet
                let parsedSimopsRecords: SimopsRecord[] = [];
                const simopsSheetName = workbook.SheetNames.find((n: string) =>
                    n.toUpperCase().includes('SIMOPS')
                );
                if (simopsSheetName) {
                    const rawSimops: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[simopsSheetName], { defval: null });
                    const simopsGetVal = (row: any, ...keys: string[]) => {
                        const norm: Record<string, any> = {};
                        Object.keys(row).forEach(k => { norm[k.trim().toLowerCase()] = row[k]; });
                        for (const key of keys) { const v = norm[key.toLowerCase()]; if (v !== null && v !== undefined) return v; }
                        return null;
                    };
                    rawSimops.forEach((row: any) => {
                        const ot = String(simopsGetVal(row, 'ot', 'o t', 'order', 'order number', 'numero ot', 'n°ot') ?? '').trim();
                        const simopsOTs = String(simopsGetVal(row, 'simops ot', 'simops_ot', 'simopsot', 'simops ots', 'simops') ?? '').trim();
                        if (!ot || !simopsOTs) return;
                        // Support comma-separated sibling OTs
                        simopsOTs.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean).forEach((sOT: string) => {
                            parsedSimopsRecords.push({ OT: ot, simopsOT: sOT });
                        });
                    });
                }

                // (g) THR sheet — collect all OTs that are THR tasks
                const thrOTSet = new Set<string>();
                const thrSheetName = workbook.SheetNames.find((n: string) =>
                    n.toUpperCase() === 'THR'
                );
                if (thrSheetName) {
                    const rawThr: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[thrSheetName], { defval: null });
                    rawThr.forEach((row: any) => {
                        const norm: Record<string, any> = {};
                        Object.keys(row).forEach(k => { norm[k.trim().toLowerCase()] = row[k]; });
                        const ot = String(norm['ot'] ?? norm['o t'] ?? norm['order'] ?? norm['order number'] ?? norm['numero ot'] ?? '').trim();
                        if (ot) thrOTSet.add(ot);
                    });
                }

                // (h) Task maps sheet

                let parsedMapTasks: SchedulingTaskData[] = [];
                const mapSheetName = workbook.SheetNames.find((n: string) =>
                    n.replace(/\s+/g, '').toUpperCase() === 'TASKMAPS' ||
                    n.replace(/\s+/g, '').toUpperCase() === 'TASK MAPS'.replace(/\s/g, '')
                );
                if (mapSheetName) {
                    const mapWorksheet = workbook.Sheets[mapSheetName];
                    const mapHeaders: string[] = XLSX.utils.sheet_to_json(mapWorksheet, { header: 1 })[0] as string[];
                    const rawMapJson: any[] = XLSX.utils.sheet_to_json(mapWorksheet, { defval: null });

                    const mapMappings: Record<string, string> = {};
                    const mapKeyDefs = [
                        { prop: 'DUREE', names: ['duree', 'durée', 'duration'] },
                        { prop: 'DISCIPLINE', names: ['discipline', 'métier'] },
                        { prop: 'Nom Equipement', names: ['nom equipement', 'équipement'] },
                        { prop: 'FAMILLE', names: ['famille', 'family'] },
                        { prop: 'GLOBAL TASKS', names: ['global tasks', 'action', 'tâche'] },
                        { prop: 'Type de Maintenance', names: ['type de maintenance'] },
                        { prop: 'EFFECTIF', names: ['effectif', 'nb pers'] },
                        { prop: 'OT', names: ['ot'] },
                        { prop: 'AVIS', names: ['avis'] },
                        { prop: 'Heures-Homme', names: ['heures-homme', 'charge hh', 'h-h', 'man hours'] },
                        { prop: 'ZONE', names: ['zone'] },
                        { prop: 'COMPANY', names: ['company', 'societe'] },
                        { prop: 'Latitude', names: ['latitude', 'lat'] },
                        { prop: 'Longitude', names: ['longitude', 'lng', 'long'] },
                        { prop: 'START DATE', names: ['start date', 'date debut', 'date début', 'startdate'] },
                        { prop: 'END DATE', names: ['end date', 'date fin', 'enddate'] },
                    ];

                    mapKeyDefs.forEach(def => {
                        const found = findKeyHelper(def.names, mapHeaders);
                        if (found) mapMappings[def.prop] = found.original;
                    });

                    parsedMapTasks = rawMapJson.map((row: any, index): SchedulingTaskData => ({
                        id: 90000 + index,
                        DUREE: mapMappings.DUREE ? parseLocaleNumber(row[mapMappings.DUREE]) : 0,
                        DISCIPLINE: mapMappings.DISCIPLINE ? String(row[mapMappings.DISCIPLINE] || '').trim() : '',
                        "Nom Equipement": mapMappings['Nom Equipement'] ? String(row[mapMappings['Nom Equipement']] || '').trim() : '',
                        FAMILLE: mapMappings.FAMILLE ? String(row[mapMappings.FAMILLE] || '').trim() : '',
                        "GLOBAL TASKS": mapMappings['GLOBAL TASKS'] ? String(row[mapMappings['GLOBAL TASKS']] || '').trim() : '',
                        "Type de Maintenance": mapMappings['Type de Maintenance'] ? String(row[mapMappings['Type de Maintenance']] || '').trim() : '',
                        EFFECTIF: mapMappings.EFFECTIF ? parseLocaleNumber(row[mapMappings.EFFECTIF]) : 1,
                        "Heures-Homme": mapMappings['Heures-Homme'] ? parseLocaleNumber(row[mapMappings['Heures-Homme']]) : 0,
                        OT: mapMappings.OT ? String(row[mapMappings.OT] || '').trim() : '',
                        AVIS: mapMappings.AVIS ? String(row[mapMappings.AVIS] || '').trim() : '',
                        ZONE: mapMappings.ZONE ? String(row[mapMappings.ZONE] || '').trim() : '',
                        COMPANY: mapMappings.COMPANY ? String(row[mapMappings.COMPANY] || '').trim() : '',
                        Latitude: mapMappings.Latitude ? parseLocaleNumber(row[mapMappings.Latitude]) : null,
                        Longitude: mapMappings.Longitude ? parseLocaleNumber(row[mapMappings.Longitude]) : null,
                        sequenceOrder: index,
                        DAY: null,
                        "TYPE D'EQUIPE": null,
                        "EQUIPE NUMBER": null,
                        "MAX HOUR": null,
                        "START DATE": (() => { const raw = mapMappings['START DATE'] ? row[mapMappings['START DATE']] : null; if (!raw && raw !== 0) return null; if (typeof raw === 'number') { const d = new Date(Math.round((raw - 25569) * 86400 * 1000)); return isNaN(d.getTime()) ? null : d; } try { const d = new Date(String(raw)); return isNaN(d.getTime()) ? null : d; } catch { return null; } })(),
                        "END DATE": (() => { const raw = mapMappings['END DATE'] ? row[mapMappings['END DATE']] : null; if (!raw && raw !== 0) return null; if (typeof raw === 'number') { const d = new Date(Math.round((raw - 25569) * 86400 * 1000)); return isNaN(d.getTime()) ? null : d; } try { const d = new Date(String(raw)); return isNaN(d.getTime()) ? null : d; } catch { return null; } })(),
                        predecessor: null,
                        "COMMENTAIRE HSE": -1,
                        "THR": -1,
                        permisTravailHauteur: -1,
                        permisFeu: -1,
                        permisPenetration: -1,
                        permisLevage: -1,
                        permisExcavation: -1,
                        "MO Required": -1,
                        "MO Readiness": -1,
                        "ADRPT Required": -1,
                        "ADRPT Readiness": -1,
                        Préparatifs: '',
                        "Préparatifs Readiness": -1,
                        isScheduled: false,
                        isKeyEvent: false,
                    })).filter(t => t['GLOBAL TASKS'] !== '');
                }

                // Build OT-indexed lookup maps for fast joining
                const scaffByOT = new Map<string, ScaffoldingRecord[]>();
                parsedScaffoldingRecords.forEach(r => {
                    if (!scaffByOT.has(r.OT)) scaffByOT.set(r.OT, []);
                    scaffByOT.get(r.OT)!.push(r);
                });

                const handlingByOT = new Map<string, HandlingRecord[]>();
                parsedHandlingRecords.forEach(r => {
                    if (!handlingByOT.has(r.OT)) handlingByOT.set(r.OT, []);
                    handlingByOT.get(r.OT)!.push(r);
                });

                const permitByOT = new Map<string, PermitRecord[]>();
                parsedPermitRecords.forEach(r => {
                    if (!permitByOT.has(r.OT)) permitByOT.set(r.OT, []);
                    permitByOT.get(r.OT)!.push(r);
                });

                const simopsByOT = new Map<string, SimopsRecord[]>();
                parsedSimopsRecords.forEach(r => {
                    if (!simopsByOT.has(r.OT)) simopsByOT.set(r.OT, []);
                    simopsByOT.get(r.OT)!.push(r);
                });

                // Pre-build cost hub map for O(1) lookups
                const costHubMap = buildCostHubMap(parsedCostHubEntries);

                // --- STEP 2: PARSE TASK DATA ---
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
                            if (detectedStartDate === null || startDate < detectedStartDate) detectedStartDate = startDate;
                        }
                        if (endDate && !isNaN(endDate.getTime())) {
                            if (detectedEndDate === null || endDate > detectedEndDate) detectedEndDate = endDate;
                        }

                        const predecessorIds = (typeof row.predecessor === 'string' && row.predecessor)
                            ? row.predecessor.split(',').map(Number).filter((id: number) => !isNaN(id))
                            : Array.isArray(row.predecessor) ? row.predecessor : [];

                        const task: SchedulingTaskData = {
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
                            "Préparatifs Readiness": parseBooleanLike(row["Préparatifs Readiness"]),
                            AVIS: row.AVIS ?? '',
                            OT: row.OT ?? '',
                            "COMMENTAIRE HSE": parseBooleanLike(row["COMMENTAIRE HSE"]),
                            "THR": parseBooleanLike(row["THR"]),
                            "Scaffolding Required": parseBooleanLike(row["Scaffolding Required"]),
                            "Scaffolding Readiness": parseBooleanLike(row["Scaffolding Readiness"]),
                            "Handling required": parseBooleanLike(row["Handling required"]),
                            "Handling Readiness": parseBooleanLike(row["Handling Readiness"]),
                            permisTravailHauteur: parseBooleanLike(row.permisTravailHauteur),
                            "permis Travail Hauteur Readiness": parseBooleanLike(row["permis Travail Hauteur Readiness"]),
                            permisFeu: parseBooleanLike(row.permisFeu),
                            "permis Feu Readiness": parseBooleanLike(row["permis Feu Readiness"]),
                            permisPenetration: parseBooleanLike(row.permisPenetration),
                            "permis Penetration Readiness": parseBooleanLike(row["permis Penetration Readiness"]),
                            permisLevage: parseBooleanLike(row.permisLevage),
                            "permis Levage Readiness": parseBooleanLike(row["permis Levage Readiness"]),
                            permisExcavation: parseBooleanLike(row.permisExcavation),
                            "permis Excavation Readiness": parseBooleanLike(row["permis Excavation Readiness"]),
                            "MO Required": parseBooleanLike(row["MO Required"]),
                            "MO Readiness": parseBooleanLike(row["MO Readiness"]),
                            "ADRPT Required": parseBooleanLike(row["ADRPT Required"]),
                            "ADRPT Readiness": parseBooleanLike(row["ADRPT Readiness"]),
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
                            pdrItems: [],
                            // Cost fields
                            ZONE: String(row.ZONE || '').trim(),
                            COMPANY: String(row.COMPANY || row.Societe || '').trim(),
                            "MANUAL PRICE": parseLocaleNumber(row["MANUAL PRICE"]),
                            "Scaffolding manual Price": parseLocaleNumber(row["Scaffolding manual Price"]),
                            "Handling manual Price": parseLocaleNumber(row["Handling manual Price"]),
                            "PRICE FOR HH": parseLocaleNumber(row["PRICE FOR HH"]),
                            // ── Cost Hub lookup keys ────────────────────────────────
                            "POSTE NUMBER": row['Poste Number'] ?? row['posteNumber'] ?? row['POSTE NUMBER'] ?? row['Poste number'] ?? '',
                            QT: parseLocaleNumber(row['Quantité'] ?? row['Quantite'] ?? row['QT'] ?? row['Qt'] ?? 0),
                        };

                        // Link all domain records by OT
                        const taskOtStr = String(task.OT).trim();
                        if (taskOtStr && taskOtStr !== '0' && taskOtStr !== 'null') {
                            task.pdrItems = parsedPdrItems.filter(pdr => String(pdr.OT).trim() === taskOtStr);
                            task.scaffoldingRecords = scaffByOT.get(taskOtStr) ?? [];
                            task.handlingRecords = handlingByOT.get(taskOtStr) ?? [];
                            task.permitRecords = permitByOT.get(taskOtStr) ?? [];
                            task.simopsRecords = simopsByOT.get(taskOtStr) ?? [];
                            // Mark THR from dedicated THR sheet (overrides data column)
                            if (thrOTSet.size > 0 && thrOTSet.has(taskOtStr)) task['THR'] = 1;
                            // Auto-detect scaffolding/handling from linked sheets
                            if (task.scaffoldingRecords.length > 0) task['Scaffolding Required'] = 1;
                            if (task.handlingRecords.length > 0) task['Handling required'] = 1;
                            // Sync permit flags from Permit Hub
                            (task.permitRecords).forEach(pr => {
                                const pn = pr.permitName.toLowerCase();
                                if (pn.includes('hauteur')) { task.permisTravailHauteur = 1; task['permis Travail Hauteur Readiness'] = pr.readiness; }
                                else if (pn.includes('feu')) { task.permisFeu = 1; task['permis Feu Readiness'] = pr.readiness; }
                                else if (pn.includes('penetration') || pn.includes('pénétration')) { task.permisPenetration = 1; task['permis Penetration Readiness'] = pr.readiness; }
                                else if (pn.includes('levage')) { task.permisLevage = 1; task['permis Levage Readiness'] = pr.readiness; }
                                else if (pn.includes('excavation')) { task.permisExcavation = 1; task['permis Excavation Readiness'] = pr.readiness; }
                            });
                            // Compute costs
                            computeTaskCosts(task, costHubMap);
                        } else {
                            task.pdrItems = [];
                            task.scaffoldingRecords = [];
                            task.handlingRecords = [];
                            task.permitRecords = [];
                            task.simopsRecords = [];
                        }

                        return task;
                    });

                    // --- STEP 2: RESTORE EVALUATION DATA FROM SHEETS ---
                    let restoredEvaluation: EvaluationData | undefined = undefined;
                    const evalSheet = workbook.SheetNames.find(n => n.toUpperCase().includes('EVALUATION A CHAUD'));
                    const perfSheet = workbook.SheetNames.find(n => n.toUpperCase().includes('EVALUATION DE L\'ARRET'));
                    const slipSheet = workbook.SheetNames.find(n => n.toUpperCase().includes('EVENEMENTS DE GLISSEMENT'));
                    const chronoSheet = workbook.SheetNames.find(n => n.toUpperCase().includes('CHRONOLOGIE REELLE'));

                    if (evalSheet || perfSheet) {
                        restoredEvaluation = {
                            actualShutdownStart: '',
                            actualShutdownEnd: '',
                            tasks: {},
                            supplementaryTasks: [],
                            globalSlippageEvents: [],
                            chronology: [],
                            incidentDetails: [],
                            accidentDetails: [],
                        };

                        if (evalSheet) {
                            const evalRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[evalSheet]);
                            evalRows.forEach(row => {
                                const id = Number(row.ID);
                                if (!isNaN(id)) {
                                    // Robust date handling
                                    const parseDateStr = (val: any) => {
                                        if (!val) return '';
                                        if (val instanceof Date) return toDateTimeLocal(val);
                                        return String(val).trim();
                                    };

                                    restoredEvaluation!.tasks[id] = {
                                        actualStart: parseDateStr(row["ACTUAL START"]),
                                        actualEnd: parseDateStr(row["ACTUAL END"]),
                                        status: (String(row.STATUS || '').trim() as TaskStatus) || 'À Faire',
                                        actualProgress: Number(row["ACTUAL PROGRESS %"] || 0),
                                        actualRemainingTime: Number(row["REMAINING HOURS"] || 0),
                                        nonCompletionDetails: row["NON-COMPLETION CAUSE"] ? {
                                            cause: String(row["NON-COMPLETION CAUSE"]),
                                            criticality: 'High',
                                            counterMeasure: '',
                                            pilot: String(row.PILOT || '')
                                        } : undefined,
                                        slippageDetails: row["SLIPPAGE CAUSE"] ? {
                                            lostHours: 0,
                                            cause: String(row["SLIPPAGE CAUSE"]).split(';').map(s => s.trim()),
                                            preventiveAction: String(row["ACTION PLAN"] || '').split(';').map(s => s.trim()),
                                            pilot: []
                                        } : undefined,
                                    };
                                }
                            });
                        }

                        if (perfSheet) {
                            const perfRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[perfSheet]);
                            perfRows.forEach(row => {
                                const key = String(row["Performance Hub"]).toUpperCase();
                                if (key.includes("START")) restoredEvaluation!.actualShutdownStart = String(row.Value);
                                if (key.includes("END")) restoredEvaluation!.actualShutdownEnd = String(row.Value);
                                if (key.includes("INCIDENTS")) {
                                    const count = Number(row.Value) || 0;
                                    restoredEvaluation!.incidentDetails = Array(count).fill({ id: 'imported', dateTime: '', description: 'Imported Incident' });
                                }
                                if (key.includes("ACCIDENTS")) {
                                    const count = Number(row.Value) || 0;
                                    restoredEvaluation!.accidentDetails = Array(count).fill({ id: 'imported', dateTime: '', description: 'Imported Accident' });
                                }
                            });
                        }

                        if (slipSheet) {
                            const slipRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[slipSheet]);
                            restoredEvaluation.globalSlippageEvents = slipRows.map((row, i) => ({
                                id: `slip-${i}`,
                                eventDate: row["EVENT DATE"] || '',
                                lostHours: Number(row["LOST HOURS"] || 0),
                                cause: row.CAUSE || '',
                                preventiveAction: row.ACTION || '',
                                pilot: row.PILOT || ''
                            }));
                        }

                        if (chronoSheet) {
                            const chronoRows: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[chronoSheet]);
                            restoredEvaluation.chronology = chronoRows.map((row, i) => ({
                                id: `chrono-${i}`,
                                label: row["EVENT LABEL"] || '',
                                plannedStart: row["PLANNED START"] || '',
                                plannedEnd: row["PLANNED END"] || '',
                                actualStart: row["ACTUAL START"] || '',
                                actualEnd: row["ACTUAL END"] || ''
                            }));
                        }
                    }

                    resolve({
                        tasks: restoredTasks,
                        mapTasks: parsedMapTasks,
                        pdrItems: parsedPdrItems,
                        evaluationData: restoredEvaluation,
                        costData: parsedCostData,
                        costHubEntries: parsedCostHubEntries,
                        scaffoldingRecords: parsedScaffoldingRecords,
                        handlingRecords: parsedHandlingRecords,
                        permitRecords: parsedPermitRecords,
                        simopsRecords: parsedSimopsRecords,
                        detectedStartDate,
                        detectedEndDate,
                    });
                    return;
                }

                const rawJson: RawTask[] = XLSX.utils.sheet_to_json(worksheet, { defval: null });

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
                    { prop: 'Préparatifs Readiness', names: ['preparatifs readiness', 'préparatifs readiness'], required: false },
                    { prop: 'AVIS', names: ['avis', 'notification'], required: false },
                    { prop: 'OT', names: ['ot', 'o t', 'order', 'order number', 'numero ot', 'n°ot', 'n° ot'], required: false },
                    { prop: 'COMMENTAIRE HSE', names: ['commentaire hse', 'hse', 'risk'], required: false, flexible: true },
                    { prop: 'predecessor', names: ['predecessor', 'prédecesseur'], required: false },
                    { prop: 'Successor', names: ['successor', 'successeur'], required: false },
                    { prop: 'THR', names: ['thr', 'travaux a haut risque'], required: false },
                    { prop: 'Scaffolding Required', names: ['echafaudage', 'scaffolding'], required: false, flexible: true },
                    { prop: 'Scaffolding Readiness', names: ['scaffolding readiness', 'echafaudage readiness'], required: false, flexible: true },
                    { prop: 'Handling required', names: ['manutention', 'handling'], required: false, flexible: true },
                    { prop: 'Handling Readiness', names: ['handling readiness', 'manutention readiness'], required: false, flexible: true },
                    { prop: 'permisTravailHauteur', names: ['permis travail hauteur', 'travail en hauteur', 'pth'], required: false, flexible: true },
                    { prop: 'permis Travail Hauteur Readiness', names: ['permis travail hauteur readiness', 'pth readiness'], required: false, flexible: true },
                    { prop: 'permisFeu', names: ['permis feu', 'feu', 'pf'], required: false, flexible: true },
                    { prop: 'permis Feu Readiness', names: ['permis feu readiness', 'pf readiness'], required: false, flexible: true },
                    { prop: 'permisPenetration', names: ['permis penetration', 'pénétration', 'espace clos', 'pp'], required: false, flexible: true },
                    { prop: 'permis Penetration Readiness', names: ['permis penetration readiness', 'pp readiness'], required: false, flexible: true },
                    { prop: 'permisLevage', names: ['permis levage', 'levage', 'pl'], required: false, flexible: true },
                    { prop: 'permis Levage Readiness', names: ['permis levage readiness', 'pl readiness'], required: false, flexible: true },
                    { prop: 'permisExcavation', names: ['permis excavation', 'excavation', 'pe'], required: false, flexible: true },
                    { prop: 'permis Excavation Readiness', names: ['permis excavation readiness', 'pe readiness'], required: false, flexible: true },
                    { prop: 'MO Required', names: ['mo required'], required: false, flexible: true },
                    { prop: 'MO Readiness', names: ['mo readiness'], required: false, flexible: true },
                    { prop: 'ADRPT Required', names: ['adrpt required'], required: false, flexible: true },
                    { prop: 'ADRPT Readiness', names: ['adrpt readiness'], required: false, flexible: true },
                    { prop: 'ZONE', names: ['zone'], required: false },
                    { prop: 'COMPANY', names: ['company', 'societe'], required: false },
                    { prop: 'PRICE FOR HH', names: ['price for hh', 'prix pour hh'], required: false },
                    { prop: 'MANUAL PRICE', names: ['manual price', 'prix manuel'], required: false },
                    { prop: 'Scaffolding manual Price', names: ['scaffolding manual price', 'prix manuel echafaudage'], required: false },
                    { prop: 'Handling manual Price', names: ['handling manual price', 'prix manuel manutention'], required: false },
                    // New multi-sheet columns
                    { prop: 'POSTE NUMBER', names: ['poste number', 'poste num', 'poste no', 'numero poste'], required: false },
                    { prop: 'QT', names: ['qt', 'quantity', 'quantite', 'quantité'], required: false },
                    { prop: 'Additional Cost', names: ['additional cost', 'cout additionnel', 'coût additionnel', 'cout supplementaire'], required: false },
                    { prop: 'POSTE DESCRIPTION', names: ['poste description', 'description poste'], required: false },
                    { prop: 'Latitude', names: ['latitude', 'lat'], required: false },
                    { prop: 'Longitude', names: ['longitude', 'lng', 'long'], required: false },
                ];

                const missingRequired: string[] = [];

                keyDefinitions.forEach(def => {
                    const foundKey = findKeyHelper(def.names, availableKeys, def.flexible);
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
                    const thrVal = mappings['THR'] ? row[mappings['THR']] : null;
                    const scaffoldingVal = mappings['Scaffolding Required'] ? row[mappings['Scaffolding Required']] : null;
                    const handlingVal = mappings['Handling required'] ? row[mappings['Handling required']] : null;
                    const pthVal = mappings['permisTravailHauteur'] ? row[mappings['permisTravailHauteur']] : null;
                    const pfVal = mappings['permisFeu'] ? row[mappings['permisFeu']] : null;
                    const ppVal = mappings['permisPenetration'] ? row[mappings['permisPenetration']] : null;
                    const plVal = mappings['permisLevage'] ? row[mappings['permisLevage']] : null;
                    const peVal = mappings['permisExcavation'] ? row[mappings['permisExcavation']] : null;


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
                        "COMMENTAIRE HSE": parseBooleanLike(hseVal),
                        "THR": parseBooleanLike(thrVal),
                        "Scaffolding Required": parseBooleanLike(scaffoldingVal),
                        "Scaffolding Readiness": parseBooleanLike(mappings['Scaffolding Readiness'] ? row[mappings['Scaffolding Readiness']] : null),
                        "Handling required": parseBooleanLike(handlingVal),
                        "Handling Readiness": parseBooleanLike(mappings['Handling Readiness'] ? row[mappings['Handling Readiness']] : null),
                        permisTravailHauteur: parseBooleanLike(pthVal),
                        "permis Travail Hauteur Readiness": parseBooleanLike(mappings['permis Travail Hauteur Readiness'] ? row[mappings['permis Travail Hauteur Readiness']] : null),
                        permisFeu: parseBooleanLike(pfVal),
                        "permis Feu Readiness": parseBooleanLike(mappings['permis Feu Readiness'] ? row[mappings['permis Feu Readiness']] : null),
                        permisPenetration: parseBooleanLike(ppVal),
                        "permis Penetration Readiness": parseBooleanLike(mappings['permis Penetration Readiness'] ? row[mappings['permis Penetration Readiness']] : null),
                        permisLevage: parseBooleanLike(plVal),
                        "permis Levage Readiness": parseBooleanLike(mappings['permis Levage Readiness'] ? row[mappings['permis Levage Readiness']] : null),
                        permisExcavation: parseBooleanLike(peVal),
                        "permis Excavation Readiness": parseBooleanLike(mappings['permis Excavation Readiness'] ? row[mappings['permis Excavation Readiness']] : null),
                        "MO Required": parseBooleanLike(mappings['MO Required'] ? row[mappings['MO Required']] : null),
                        "MO Readiness": parseBooleanLike(mappings['MO Readiness'] ? row[mappings['MO Readiness']] : null),
                        "ADRPT Required": parseBooleanLike(mappings['ADRPT Required'] ? row[mappings['ADRPT Required']] : null),
                        "ADRPT Readiness": parseBooleanLike(mappings['ADRPT Readiness'] ? row[mappings['ADRPT Readiness']] : null),
                        "Préparatifs Readiness": parseBooleanLike(mappings['Préparatifs Readiness'] ? row[mappings['Préparatifs Readiness']] : null),
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
                        ZONE: mappings['ZONE'] ? String(row[mappings['ZONE']] || '').trim() : '',
                        COMPANY: mappings['COMPANY'] ? String(row[mappings['COMPANY']] || '').trim() : '',
                        "PRICE FOR HH": mappings['PRICE FOR HH'] ? parseLocaleNumber(row[mappings['PRICE FOR HH']]) : 0,
                        "MANUAL PRICE": mappings['MANUAL PRICE'] ? parseLocaleNumber(row[mappings['MANUAL PRICE']]) : 0,
                        "Scaffolding manual Price": mappings['Scaffolding manual Price'] ? parseLocaleNumber(row[mappings['Scaffolding manual Price']]) : 0,
                        "Handling manual Price": mappings['Handling manual Price'] ? parseLocaleNumber(row[mappings['Handling manual Price']]) : 0,
                        "POSTE NUMBER": mappings['POSTE NUMBER'] ? (row[mappings['POSTE NUMBER']] ?? '') : '',
                        QT: mappings['QT'] ? parseLocaleNumber(row[mappings['QT']]) : 0,
                        "Additional Cost": mappings['Additional Cost'] ? parseLocaleNumber(row[mappings['Additional Cost']]) : 0,
                        "POSTE DESCRIPTION": mappings['POSTE DESCRIPTION'] ? String(row[mappings['POSTE DESCRIPTION']] || '').trim() : '',
                        Latitude: mappings['Latitude'] ? parseLocaleNumber(row[mappings['Latitude']]) : null,
                        Longitude: mappings['Longitude'] ? parseLocaleNumber(row[mappings['Longitude']]) : null,
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

                // Link all domain records to tasks by OT
                tasks.forEach(task => {
                    const taskOtStr = String(task.OT).trim();
                    if (taskOtStr && taskOtStr !== '0' && taskOtStr !== 'null') {
                        task.pdrItems = parsedPdrItems.filter(pdr => String(pdr.OT).trim() === taskOtStr);
                        task.scaffoldingRecords = scaffByOT.get(taskOtStr) ?? [];
                        task.handlingRecords = handlingByOT.get(taskOtStr) ?? [];
                        task.permitRecords = permitByOT.get(taskOtStr) ?? [];
                        task.simopsRecords = simopsByOT.get(taskOtStr) ?? [];

                        // Mark THR from dedicated THR sheet (overrides/supplements data column)
                        if (thrOTSet.size > 0 && thrOTSet.has(taskOtStr)) task['THR'] = 1;

                        // --- SYNCHRONIZATION HARDENING ---

                        // Force update flags if records exist in specialized sheets
                        if (task.scaffoldingRecords.length > 0) {
                            task['Scaffolding Required'] = 1;
                            // Check if ALL linked scaffolding is ready
                            const allScaffReady = task.scaffoldingRecords.every(r => r.readiness === 1 || String(r.readiness).toLowerCase() === 'true');
                            task['Scaffolding Readiness'] = allScaffReady ? 1 : 0;
                        }

                        if (task.handlingRecords.length > 0) {
                            task['Handling required'] = 1;
                            const allHandReady = task.handlingRecords.every(r => r.readiness === 1 || String(r.readiness).toLowerCase() === 'true');
                            task['Handling Readiness'] = allHandReady ? 1 : 0;
                        }

                        // Sync permit flags from Permit Hub
                        task.permitRecords.forEach(pr => {
                            const pn = pr.permitName.toLowerCase();
                            const isReady = pr.readiness === 1 || String(pr.readiness).toLowerCase() === 'true' || String(pr.readiness) === '1';

                            if (pn.includes('hauteur') || pn.includes('height')) {
                                task.permisTravailHauteur = 1;
                                task['permis Travail Hauteur Readiness'] = isReady ? 1 : 0;
                            }
                            else if (pn.includes('feu') || pn.includes('hot')) {
                                task.permisFeu = 1;
                                task['permis Feu Readiness'] = isReady ? 1 : 0;
                            }
                            else if (pn.includes('penetration') || pn.includes('pénétration') || pn.includes('confined')) {
                                task.permisPenetration = 1;
                                task['permis Penetration Readiness'] = isReady ? 1 : 0;
                            }
                            else if (pn.includes('levage') || pn.includes('lifting') || pn.includes('handling permit')) {
                                task.permisLevage = 1;
                                task['permis Levage Readiness'] = isReady ? 1 : 0;
                            }
                            else if (pn.includes('excavation')) {
                                task.permisExcavation = 1;
                                task['permis Excavation Readiness'] = isReady ? 1 : 0;
                            }
                        });
                        // Compute costs
                        computeTaskCosts(task, costHubMap);
                    } else {
                        task.pdrItems = [];
                        task.scaffoldingRecords = [];
                        task.handlingRecords = [];
                        task.permitRecords = [];
                        task.simopsRecords = [];
                    }
                });

                resolve({
                    tasks,
                    mapTasks: parsedMapTasks,
                    pdrItems: parsedPdrItems,
                    evaluationData: undefined,
                    costData: parsedCostData,
                    costHubEntries: parsedCostHubEntries,
                    scaffoldingRecords: parsedScaffoldingRecords,
                    handlingRecords: parsedHandlingRecords,
                    permitRecords: parsedPermitRecords,
                    simopsRecords: parsedSimopsRecords,
                    detectedStartDate: null,
                    detectedEndDate: null,
                });
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

    const cancel = (): void => {
        if (abortHandler) {
            abortHandler();
        }
    };
    return { promise, cancel };
};

export const calculateSchedule = (tasks: SchedulingTaskData[], params: AppParameters, costData?: CompanyCost[]): CalculationResults => {
    const issues: DataHealthIssue[] = [];
    const taskMap = new Map<number, SchedulingTaskData>();
    tasks.forEach(t => taskMap.set(t.id, t));

    const scheduledTasks: ScheduledTask[] = tasks.map((task, index) => {
        const startTime = new Date(new Date(params.shutdownStart).getTime() + index * 1 * 60 * 60 * 1000); // Simple sequential schedule
        const endTime = new Date(startTime.getTime() + task.DUREE * 60 * 60 * 1000);

        // --- STRICT DATA HEALTH CHECKS ---
        if (task.DUREE <= 0) {
            issues.push({
                taskId: task.id, rowNumber: task.meta?.rowNumber || 0, taskName: task['GLOBAL TASKS'],
                field: 'DUREE', value: task.DUREE, originalValue: task.meta?.originalDuration,
                reason: 'Durée manquante ou nulle', severity: 'critical'
            });
        } else if (task.meta?.parsingWarnings?.includes('duration_clean')) {
            issues.push({
                taskId: task.id, rowNumber: task.meta?.rowNumber || 0, taskName: task['GLOBAL TASKS'],
                field: 'DUREE', value: task.DUREE, originalValue: task.meta?.originalDuration,
                reason: 'Texte détecté, nombre extrait', severity: 'warning'
            });
        } else if (task.DUREE > 1000) {
            issues.push({
                taskId: task.id, rowNumber: task.meta?.rowNumber || 0, taskName: task['GLOBAL TASKS'],
                field: 'DUREE', value: task.DUREE, originalValue: task.meta?.originalDuration,
                reason: 'Durée excessive (> 1000h)', severity: 'critical'
            });
        }

        let finalManpower = task.EFFECTIF;
        if (finalManpower <= 0) {
            finalManpower = 1;
            issues.push({
                taskId: task.id, rowNumber: task.meta?.rowNumber || 0, taskName: task['GLOBAL TASKS'],
                field: 'EFFECTIF', value: 1, originalValue: task.meta?.originalManpower,
                reason: 'Effectif manquant, défaut (1) appliqué', severity: 'warning'
            });
        } else if (task.meta?.parsingWarnings?.includes('manpower_clean')) {
            issues.push({
                taskId: task.id, rowNumber: task.meta?.rowNumber || 0, taskName: task['GLOBAL TASKS'],
                field: 'EFFECTIF', value: task.EFFECTIF, originalValue: task.meta?.originalManpower,
                reason: 'Texte détecté, nombre extrait', severity: 'warning'
            });
        } else if (finalManpower > 100) {
            issues.push({
                taskId: task.id, rowNumber: task.meta?.rowNumber || 0, taskName: task['GLOBAL TASKS'],
                field: 'EFFECTIF', value: task.EFFECTIF, originalValue: task.meta?.originalManpower,
                reason: 'Effectif suspect (> 100)', severity: 'warning'
            });
        }

        const calculatedManHours = task.DUREE * finalManpower;
        if (calculatedManHours > 10000) {
            issues.push({
                taskId: task.id, rowNumber: task.meta?.rowNumber || 0, taskName: task['GLOBAL TASKS'],
                field: 'Total H-H', value: calculatedManHours.toFixed(2), originalValue: '-',
                reason: 'Total HH aberrant (> 10 000)', severity: 'critical'
            });
        }

        return {
            id: task.id,
            action: task['GLOBAL TASKS'],
            team: `${task.DISCIPLINE} ${task["TYPE D'EQUIPE"]}`.trim(),
            discipline: task.DISCIPLINE,
            equipment: task['Nom Equipement'],
            family: task.FAMILLE,
            duration: task.DUREE,
            manHours: calculatedManHours,
            manpower: finalManpower,
            predecessor: task.predecessor || null,
            predecessorActions: (task.predecessor || []).map(pId => taskMap.get(pId)?.['GLOBAL TASKS'] || ''),
            hasDeconsignationSuccessor: false,
            imperativeStart: false,
            sequenceOrder: task.sequenceOrder ?? index,
            startTime: startTime,
            endTime: endTime,
            isLate: endTime > new Date(params.shutdownEnd),
            ot: String(task.OT),
            avis: String(task.AVIS),
            isHighRisk: task.THR === 1 || task['COMMENTAIRE HSE'] === 1,
            'Scaffolding Required': task['Scaffolding Required'],
            'Scaffolding Readiness': task['Scaffolding Readiness'],
            'Handling required': task['Handling required'],
            'Handling Readiness': task['Handling Readiness'],
            'permis Levage': task.permisLevage,
            'permis Levage Readiness': task['permis Levage Readiness'],
            'permis Travail Hauteur': task.permisTravailHauteur,
            'permis Travail Hauteur Readiness': task['permis Travail Hauteur Readiness'],
            'permis Feu': task.permisFeu,
            'permis Feu Readiness': task['permis Feu Readiness'],
            'permis Penetration': task.permisPenetration,
            'permis Penetration Readiness': task['permis Penetration Readiness'],
            'permis Excavation': task.permisExcavation,
            'permis Excavation Readiness': task['permis Excavation Readiness'],
            'MO Required': task['MO Required'],
            'MO Readiness': task['MO Readiness'],
            'ADRPT Required': task['ADRPT Required'],
            'ADRPT Readiness': task['ADRPT Readiness'],
            permisTravailHauteur: task.permisTravailHauteur,
            permisFeu: task.permisFeu,
            permisPenetration: task.permisPenetration,
            permisLevage: task.permisLevage,
            permisExcavation: task.permisExcavation,
            preparatifs: task.Préparatifs,
            'Préparatifs Readiness': task['Préparatifs Readiness'],
            isKeyEvent: !!task.isKeyEvent,
            maintenanceType: task['Type de Maintenance'],
            multiDisciplineId: task.multiDisciplineId,
            pdrItems: task.pdrItems || [],
            ZONE: task.ZONE,
            COMPANY: task.COMPANY,
        };
    });

    // Second pass to calculate costs with full task data
    const tasksWithCosts = scheduledTasks.map(task => {
        const companyCost = costData?.find(c => c.company === task.COMPANY);
        const manHours = task.manHours;

        let hhPrice = 0;
        if (companyCost) {
            hhPrice = manHours * companyCost.pricePerHour;
        } else {
            // If company not found, it's manual price according to user request
            // We might want to flag this or just use the "PRICE FOR HH" column if it's already filled
            // The user said: "when you don't found the name of the comany in sheet coste mean this task need MANUAL PRICE"
            // And "IF FOR EXEMPLE TASK BE WILL BE DONE BY THE COMPANY TKS AND WHEN TYOU SEARCH FOR THE TKS IN COST SHEET AND YOU DID NOT FIND IT THEN YOU NEED TO UNDERSTAND THAT THIS TASK IS MANUAL PRICING"
            hhPrice = task["PRICE FOR HH"] || 0;
        }

        const pdrCost = task.pdrItems?.reduce((sum, pdr) => sum + (pdr.totalPrice || 0), 0) || 0;
        const manualPrice = task["MANUAL PRICE"] || 0;
        const scaffoldingManualPrice = task["Scaffolding manual Price"] || 0;
        const handlingManualPrice = task["Handling manual Price"] || 0;

        const totalTaskCost = pdrCost + hhPrice + manualPrice + scaffoldingManualPrice + handlingManualPrice;

        return {
            ...task,
            "PRICE FOR HH": hhPrice,
            "PDR COST": pdrCost,
            "MANUAL PRICE": manualPrice,
            "Scaffolding manual Price": scaffoldingManualPrice,
            "Handling manual Price": handlingManualPrice,
            "TOTAL TASK COST": totalTaskCost
        };
    });

    // KPI Calculations (ignoring critical errors from sums where possible, or just summing what we have)
    // For safety, we allow summing even criticals, but the user is warned.
    const totalManHours = tasksWithCosts.reduce((sum, task) => {
        // Exclude extreme anomalies (>10000h) from dashboard total to avoid breaking charts
        if (task.manHours > 10000) return sum;
        return sum + task.manHours;
    }, 0);

    const scheduleEndDate = tasksWithCosts.length > 0 ? new Date(Math.max(...tasksWithCosts.map(t => t.endTime.getTime()))) : new Date(params.shutdownStart);
    const scheduleStartDate = tasksWithCosts.length > 0 ? new Date(Math.min(...tasksWithCosts.map(t => t.startTime.getTime()))) : new Date(params.shutdownStart);
    const effectiveWorkHours = scheduleEndDate.getTime() > scheduleStartDate.getTime() ? (scheduleEndDate.getTime() - scheduleStartDate.getTime()) / 3600000 : 0;
    const shutdownDurationHours = (new Date(params.shutdownEnd).getTime() - new Date(params.shutdownStart).getTime()) / 3600000;

    const peakResources: Record<string, number> = {};
    tasksWithCosts.forEach(t => {
        if (t.discipline) {
            peakResources[t.discipline] = Math.max(peakResources[t.discipline] || 0, t.manpower);
        }
    });

    // Determine Health Score
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    let healthStatus: 'clean' | 'warning' | 'critical' = 'clean';
    if (criticalCount > 0) healthStatus = 'critical';
    else if (issues.length > 0) healthStatus = 'warning';

    const healthScore = Math.max(0, 100 - (issues.length * 5));

    // Gather all PDR items efficiently
    const allPdrItemsMap = new Map<string, any>();
    tasks.forEach(t => {
        if (t.pdrItems) {
            t.pdrItems.forEach((pdr: any) => {
                if (!allPdrItemsMap.has(pdr.id)) {
                    allPdrItemsMap.set(pdr.id, pdr);
                }
            });
        }
    });
    const allPdrItems = Array.from(allPdrItemsMap.values());

    return {
        kpis: {
            totalTasks: tasksWithCosts.length,
            totalManHours,
            shutdownDurationHours,
            effectiveWorkHours,
        },
        peakResources,
        scheduledTasks: tasksWithCosts,
        scheduleEndDate,
        maxWorkDate: new Date(params.shutdownEnd),
        dataHealth: {
            status: healthStatus,
            score: healthScore,
            issues: issues.sort((a, b) => a.rowNumber - b.rowNumber)
        },
        pdrItems: allPdrItems
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
                const tasksInSeq = sequences.get(seqId);
                if (tasksInSeq) {
                    const subTeamInfo = {
                        name: `${teamName} Équipe ${subTeamCounter}`,
                        size: getSubTeamSize(teamName, tasksInSeq)
                    };
                    tasksInSeq.forEach(task => taskIdToSubTeamMap.set(task.id, subTeamInfo));
                }
            });

            if (otherTasks.length > 0) {
                const subTeamInfo = { name: `${teamName} (Autres Tâches)`, size: getSubTeamSize(teamName, otherTasks) };
                otherTasks.forEach(task => taskIdToSubTeamMap.set(task.id, subTeamInfo));
            }
        }
    }
    return taskIdToSubTeamMap;
}