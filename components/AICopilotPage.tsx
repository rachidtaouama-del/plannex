import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { CalculationResults, AppParameters, EvaluationData, SchedulingPageState } from '../types';
import { GoogleGenAI } from '@google/genai';

// --- TYPES ---
interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
}

interface AICopilotPageProps {
    results: CalculationResults;
    parameters: AppParameters;
    evaluationData: EvaluationData | null;
    schedulingState?: SchedulingPageState | null;
    onBack: () => void;
}

type AIProvider = 'gemini' | 'cohere' | 'huggingface' | 'groq' | 'openrouter';

// --- API KEYS ---
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const COHERE_API_KEY = import.meta.env.VITE_COHERE_API_KEY || '';
const HF_API_KEY = import.meta.env.VITE_HF_API_KEY || '';
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';

const OPENROUTER_MODELS = [
    { id: 'google/gemma-3-4b-it:free', label: 'Gemma 3 4B', badge: 'Google' },
    { id: 'google/gemma-3n-e2b-it:free', label: 'Gemma 3n E2B', badge: 'Google' },
    { id: 'google/gemma-3n-e4b-it:free', label: 'Gemma 3n E4B', badge: 'Google' },
    { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super 120B', badge: 'NVIDIA' },
    { id: 'nvidia/nemotron-3-nano-30b-a3b:free', label: 'Nemotron 3 Nano 30B', badge: 'NVIDIA' },
    { id: 'nvidia/nemotron-nano-12b-v2-vl:free', label: 'Nemotron Nano 12B VL', badge: 'NVIDIA' },
    { id: 'nvidia/nemotron-nano-9b-v2:free', label: 'Nemotron Nano 9B', badge: 'NVIDIA' },
    { id: 'nvidia/llama-nemotron-embed-vl-1b-v2:free', label: 'Nemotron Embed 1B VL', badge: 'NVIDIA' },
    { id: 'openai/gpt-oss-120b:free', label: 'GPT OSS 120B', badge: 'OpenAI' },
    { id: 'openai/gpt-oss-20b:free', label: 'GPT OSS 20B', badge: 'OpenAI' },
    { id: 'arcee-ai/trinity-large-preview:free', label: 'Trinity Large', badge: 'Arcee' },
    { id: 'stepfun/step-3.5-flash:free', label: 'Step 3.5 Flash', badge: 'Stepfun' },
    { id: 'z-ai/glm-4.5-air:free', label: 'GLM 4.5 Air', badge: 'Z-AI' },
    { id: 'liquid/lfm-2.5-1.2b-thinking:free', label: 'LFM 2.5 Thinking', badge: 'Liquid' },
    { id: 'liquid/lfm-2.5-1.2b-instruct:free', label: 'LFM 2.5 Instruct', badge: 'Liquid' },
];

// --- COHERE REST API HELPER ---
const callCohereChat = async (message: string, systemPrompt: string, context: string, history: { role: string; content: string }[]): Promise<string> => {
    const chatHistory = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
    }));

    const response = await fetch('https://api.cohere.com/v2/chat', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${COHERE_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'command-a-03-2025',
            messages: [
                { role: 'system', content: systemPrompt + '\n\nCONTEXTE DU PROJET:\n' + context },
                ...chatHistory,
                { role: 'user', content: message },
            ],
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || `Cohere API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    // v2 response: data.message.content is an array of content blocks
    const contentBlocks = data?.message?.content;
    if (Array.isArray(contentBlocks) && contentBlocks.length > 0) {
        return contentBlocks.map((b: any) => b.text || '').join('');
    }
    return data?.message?.content?.[0]?.text || data?.text || "Je n'ai pas pu générer de réponse.";
};

// --- HUGGING FACE REST API HELPER ---
const callHuggingFaceChat = async (message: string, systemPrompt: string, context: string, history: { role: string; content: string }[]): Promise<string> => {
    const chatHistory = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
    }));

    const response = await fetch('https://router.huggingface.co/novita/v3/openai/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HF_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'deepseek/deepseek-v3-0324',
            messages: [
                { role: 'system', content: systemPrompt + '\n\nCONTEXTE DU PROJET:\n' + context },
                ...chatHistory,
                { role: 'user', content: message },
            ],
            max_tokens: 2048,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || errorData?.error || `HuggingFace API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "Je n'ai pas pu générer de réponse.";
};

// --- GROQ REST API HELPER ---
const callGroqChat = async (message: string, systemPrompt: string, context: string, history: { role: string; content: string }[]): Promise<string> => {
    const chatHistory = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
    }));

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: systemPrompt + '\n\nCONTEXTE DU PROJET:\n' + context },
                ...chatHistory,
                { role: 'user', content: message },
            ],
            temperature: 0.2,
            max_tokens: 2048,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error?.message || errorData?.error || `Groq API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || "Je n'ai pas pu générer de réponse.";
};

// --- OPENROUTER REST API HELPER ---
const callOpenRouterChat = async (message: string, systemPrompt: string, context: string, history: { role: string; content: string }[], modelId: string): Promise<string> => {
    // Truncate context to protect against free model context limits (≈8K chars ≈ ~2K tokens safe)
    const MAX_CTX = 8000;
    const safeContext = context.length > MAX_CTX ? context.slice(0, MAX_CTX) + '\n... [contexte tronqué pour limites du modèle]' : context;

    // Many free models on OpenRouter reject the 'system' role → inject as a user prefix instead
    const systemBlock = `[INSTRUCTIONS SYSTÈME]\n${systemPrompt}\n\n[CONTEXTE DU PROJET]\n${safeContext}\n[FIN DES INSTRUCTIONS]\n\nQuestion de l'utilisateur : `;

    const chatHistory = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
    }));

    const buildMessages = (includeSystem: boolean) => {
        if (includeSystem) {
            return [
                { role: 'system', content: systemPrompt + '\n\nCONTEXTE DU PROJET:\n' + safeContext },
                ...chatHistory,
                { role: 'user', content: message },
            ];
        }
        // Fallback: merge everything into the first user message
        return [
            ...chatHistory,
            { role: 'user', content: systemBlock + message },
        ];
    };

    const doFetch = async (messages: object[], maxTokens: number | null) => {
        const body: Record<string, unknown> = { model: modelId, messages };
        if (maxTokens) body.max_tokens = maxTokens;

        return fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://plannex.app',
                'X-Title': 'PlanneX Copilot IA',
            },
            body: JSON.stringify(body),
        });
    };

    const extractError = async (res: Response): Promise<string> => {
        try {
            const d = await res.json();
            return d?.error?.message || d?.error?.metadata?.raw || JSON.stringify(d?.error) || `HTTP ${res.status}`;
        } catch { return `HTTP ${res.status} ${res.statusText}`; }
    };

    // Attempt 1: with system role + max_tokens
    let response = await doFetch(buildMessages(true), 1024);
    if (!response.ok) {
        const err1 = await extractError(response);
        console.warn('OpenRouter attempt 1 failed:', err1, '— retrying without system role');

        // Attempt 2: without system role (user-prefix style)
        response = await doFetch(buildMessages(false), 1024);
        if (!response.ok) {
            const err2 = await extractError(response);
            console.warn('OpenRouter attempt 2 failed:', err2, '— retrying without max_tokens');

            // Attempt 3: without system role AND without max_tokens constraint
            response = await doFetch(buildMessages(false), null);
            if (!response.ok) {
                const err3 = await extractError(response);
                throw new Error(`OpenRouter (${modelId}): ${err3}`);
            }
        }
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error(`OpenRouter n'a retourné aucune réponse pour le modèle ${modelId}. Essayez un autre modèle.`);
    return content;
};

const buildProjectContext = (results: CalculationResults, parameters: AppParameters, evaluationData: EvaluationData | null, schedulingState?: SchedulingPageState | null): string => {
    const { kpis, peakResources, scheduleEndDate, maxWorkDate, scheduledTasks } = results;
    const isOvertime = scheduleEndDate > maxWorkDate;
    const overrunHours = isOvertime ? (scheduleEndDate.getTime() - maxWorkDate.getTime()) / (1000 * 60 * 60) : 0;

    // ── Discipline / Family / Equipment summary ───────────────────
    const disciplineSummary: Record<string, { count: number; totalHH: number; teams: Set<string> }> = {};
    const familySummary: Record<string, number> = {};
    const equipmentSummary: Record<string, number> = {};
    scheduledTasks.forEach(t => {
        if (!disciplineSummary[t.discipline]) disciplineSummary[t.discipline] = { count: 0, totalHH: 0, teams: new Set() };
        disciplineSummary[t.discipline].count++;
        disciplineSummary[t.discipline].totalHH += t.manHours;
        disciplineSummary[t.discipline].teams.add(t.team);
        familySummary[t.family] = (familySummary[t.family] || 0) + 1;
        if (t.equipment) equipmentSummary[t.equipment] = (equipmentSummary[t.equipment] || 0) + 1;
    });

    // ── Cost data (from raw tasks in schedulingState) ─────────────
    const rawTasks = schedulingState?.tasks || [];
    let totalBudget = 0, totalMO = 0, totalPrestation = 0, totalPDR = 0, totalScaff = 0, totalHandling = 0;
    const costByZone: Record<string, number> = {};
    const costByDisc: Record<string, number> = {};
    const costByFam: Record<string, number> = {};
    const taskCostLines: string[] = [];
    rawTasks.forEach(t => {
        const tot = (t['TOTAL_COST'] as number) || 0;
        const mo = (t['MO_HH_COST'] as number) || 0;
        const pr = (t['PRESTATION_COST'] as number) || 0;
        const pdr = (t['PDR COST'] as number) || 0;
        const sc = (t['SCAFFOLDING_COST'] as number) || 0;
        const hd = (t['HANDLING_COST'] as number) || 0;
        totalBudget += tot; totalMO += mo; totalPrestation += pr; totalPDR += pdr; totalScaff += sc; totalHandling += hd;
        const zone = t.ZONE || 'N/A'; costByZone[zone] = (costByZone[zone] || 0) + tot;
        const disc = t.DISCIPLINE || 'N/A'; costByDisc[disc] = (costByDisc[disc] || 0) + tot;
        const fam = t.FAMILLE || 'N/A'; costByFam[fam] = (costByFam[fam] || 0) + tot;
        if (tot > 0) taskCostLines.push(`OT:${t.OT}|Tâche:${t['GLOBAL TASKS']}|Total:${tot.toFixed(0)} MAD|MO:${mo.toFixed(0)}|PDR:${pdr.toFixed(0)}|Scaff:${sc.toFixed(0)}|Manu:${hd.toFixed(0)}|Zone:${zone}|Fam:${t.FAMILLE}`);
    });

    // ── PDR (Spare Parts) ─────────────────────────────────────────
    const pdrItems = schedulingState?.pdrItems || [];
    const pdrReady = pdrItems.filter(p => p.readiness === 1).length;
    const pdrCritical = pdrItems.filter(p => p.criticity === 1).length;
    const pdrByStatus: Record<string, number> = {};
    pdrItems.forEach(p => { const s = p.status || 'Unknown'; pdrByStatus[s] = (pdrByStatus[s] || 0) + 1; });
    const pdrLines = pdrItems.slice(0, 100).map(p =>
        `OT:${p.OT}|Part:${p.sparePart}|Qty:${p.qty}|Ready:${p.readiness === 1 ? 'YES' : 'NO'}|Status:${p.status || '?'}|Criticity:${p.criticity === 1 ? 'CRITICAL' : 'STD'}|Prix:${p.totalPrice || 0}`
    );

    // ── Readiness parameters ──────────────────────────────────────
    const readinessParams = [
        { key: 'MO Required', readKey: 'MO Readiness', label: 'Main d\'Œuvre' },
        { key: 'Scaffolding Required', readKey: 'Scaffolding Readiness', label: 'Échafaudage' },
        { key: 'Handling required', readKey: 'Handling Readiness', label: 'Manutention' },
        { key: 'permis Levage', readKey: 'permis Levage Readiness', label: 'Permis Levage' },
        { key: 'permis Travail Hauteur', readKey: 'permis Travail Hauteur Readiness', label: 'Permis Hauteur' },
        { key: 'permis Feu', readKey: 'permis Feu Readiness', label: 'Permis Feu' },
        { key: 'permis Penetration', readKey: 'permis Penetration Readiness', label: 'Permis Pénétration' },
        { key: 'permis Excavation', readKey: 'permis Excavation Readiness', label: 'Permis Excavation' },
        { key: 'ADRPT Required', readKey: 'ADRPT Readiness', label: 'Work Instruction/ADRPT' },
    ];
    const readinessSummary = readinessParams.map(rp => {
        const required = rawTasks.filter(t => Number(t[rp.key]) === 1).length;
        const ready = rawTasks.filter(t => Number(t[rp.key]) === 1 && Number(t[rp.readKey]) === 1).length;
        const pct = required > 0 ? ((ready / required) * 100).toFixed(1) : 'N/A';
        return `${rp.label}: ${ready}/${required} prêts (${pct}%)`;
    });
    // PDR readiness specifically
    const pdrReadinessPct = pdrItems.length > 0 ? ((pdrReady / pdrItems.length) * 100).toFixed(1) : 'N/A';
    readinessSummary.unshift(`Spare Parts (PDR): ${pdrReady}/${pdrItems.length} prêts (${pdrReadinessPct}%)`);

    // ── Health Check (DCMA-style) ─────────────────────────────────
    const total = scheduledTasks.length;
    const taskIds = new Set(scheduledTasks.map(t => t.id));
    const hasSuc = new Set<number>();
    scheduledTasks.forEach(t => { if (Array.isArray(t.predecessor)) t.predecessor.forEach(pid => { if (taskIds.has(pid)) hasSuc.add(pid); }); });
    const noPred = scheduledTasks.filter(t => !t.predecessor || (Array.isArray(t.predecessor) && t.predecessor.length === 0)).length;
    const noSuc = scheduledTasks.filter(t => !hasSuc.has(t.id)).length;
    const noDates = scheduledTasks.filter(t => !t.startTime || !t.endTime).length;
    const zeroDur = scheduledTasks.filter(t => !t.duration || t.duration <= 0).length;

    // ── Evaluation context ────────────────────────────────────────
    let evalContext = '';
    if (evaluationData) {
        const completedCount = Object.values(evaluationData.tasks).filter(t => t.status === 'Fait').length;
        const inProgressCount = Object.values(evaluationData.tasks).filter(t => t.status === 'En Cours').length;
        const cancelledCount = Object.values(evaluationData.tasks).filter(t => t.status === 'Annuler').length;
        const suppHH = evaluationData.supplementaryTasks.reduce((s, t) => s + t.totalManHours, 0);
        const completionPct = total > 0 ? ((completedCount / total) * 100).toFixed(1) : '0';
        evalContext = `
--- PAGE ÉVALUATION À CHAUD ---
- Taux d'Avancement: ${completionPct}% (${completedCount}/${total} tâches Faites)
- En Cours: ${inProgressCount} | Annulées: ${cancelledCount}
- Travaux Supplémentaires: ${evaluationData.supplementaryTasks.length} tâches (${suppHH.toFixed(1)} HH)
- Incidents: ${evaluationData.incidentDetails.length} | Accidents: ${evaluationData.accidentDetails.length}
- Début Réel Arrêt: ${evaluationData.actualShutdownStart || 'Non renseigné'}
- Fin Réelle Arrêt: ${evaluationData.actualShutdownEnd || 'Non renseigné'}
`;
    }

    // ── Task list (capped for token efficiency) ───────────────────
    const taskLimit = 500;
    const taskLines = scheduledTasks.slice(0, taskLimit).map(t =>
        `ID:${t.id}|OT:${t.ot || '-'}|${t.action}|Eq:${t.equipment}|Fam:${t.family}|Disc:${t.discipline}|Team:${t.team}|Start:${t.startTime?.toLocaleString('fr-FR')}|End:${t.endTime?.toLocaleString('fr-FR')}|Dur:${t.duration}h|HH:${t.manHours}|n:${t.manpower}${t.isLate ? ' RETARD' : ''}`
    );

    return `
=== CONTEXTE COMPLET PROJET ARRÊT INDUSTRIEL ===

--- PAGE APERÇU / PARAMÈTRES ---
Début Planifié: ${new Date(parameters.shutdownStart).toLocaleString('fr-FR')}
Fin Planifiée: ${new Date(parameters.shutdownEnd).toLocaleString('fr-FR')}
Fin Calculée Planning: ${scheduleEndDate.toLocaleString('fr-FR')}
Statut: ${isOvertime ? `EN RETARD ${overrunHours.toFixed(1)}h` : 'DANS LES TEMPS'}
Durée Totale: ${kpis.shutdownDurationHours.toFixed(1)}h | HH Total: ${kpis.totalManHours.toFixed(1)}

--- PAGE PLANNING (${kpis.totalTasks} tâches) ---
Pic Ressources: ${Object.entries(peakResources).map(([t, c]) => `${t}:${c}p`).join(', ')}
Disciplines: ${Object.entries(disciplineSummary).map(([d, v]) => `${d}(${v.count}t/${v.totalHH.toFixed(0)}HH)`).join(', ')}
Familles Top5: ${Object.entries(familySummary).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([f, c]) => `${f}:${c}`).join(', ')}
Équipements Top10: ${Object.entries(equipmentSummary).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([e, c]) => `${e}:${c}`).join(', ')}

--- PAGE READINESS (Prêt-à-l'emploi) ---
${readinessSummary.join('\n')}

--- PAGE PDR — SPARE PARTS (${pdrItems.length} articles) ---
Prêts: ${pdrReady}/${pdrItems.length} (${pdrReadinessPct}%) | Critiques: ${pdrCritical}
Statuts: ${Object.entries(pdrByStatus).map(([s, n]) => `${s}:${n}`).join(', ')}
${pdrLines.slice(0, 60).join('\n')}
${pdrItems.length > 60 ? `... et ${pdrItems.length - 60} autres PDR` : ''}

--- PAGE COÛT / BUDGET ---
Budget Total: ${totalBudget.toFixed(0)} MAD
Main d'Œuvre: ${totalMO.toFixed(0)} MAD (${totalBudget > 0 ? ((totalMO / totalBudget) * 100).toFixed(1) : 0}%)
Prestation: ${totalPrestation.toFixed(0)} MAD (${totalBudget > 0 ? ((totalPrestation / totalBudget) * 100).toFixed(1) : 0}%)
PDR: ${totalPDR.toFixed(0)} MAD | Échafaudage: ${totalScaff.toFixed(0)} MAD | Manutention: ${totalHandling.toFixed(0)} MAD
Budget/Zone: ${Object.entries(costByZone).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([z, c]) => `${z}:${c.toFixed(0)}`).join(', ')}
Budget/Discipline: ${Object.entries(costByDisc).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([d, c]) => `${d}:${c.toFixed(0)}`).join(', ')}
Coûts par tâche (top 50):
${taskCostLines.slice(0, 50).join('\n')}

--- PAGE HEALTH CHECK (DCMA) ---
Sans prédécesseur: ${noPred}/${total} (${((noPred / Math.max(total, 1)) * 100).toFixed(1)}%)
Sans successeur: ${noSuc}/${total} (${((noSuc / Math.max(total, 1)) * 100).toFixed(1)}%)
Sans dates: ${noDates}/${total}
Durée zéro: ${zeroDur}/${total}
Statut global: ${isOvertime ? 'EN RETARD' : 'OK'}

--- PAGE RÉSULTAT / ÉVALUATION ---
${evalContext || 'Aucune évaluation à chaud renseignée.'}

--- LISTE DÉTAILLÉE PLANNING (${scheduledTasks.length > taskLimit ? `${taskLimit}/${scheduledTasks.length}` : scheduledTasks.length} tâches) ---
${taskLines.join('\n')}
${scheduledTasks.length > taskLimit ? `... +${scheduledTasks.length - taskLimit} tâches` : ''}
`;
};


const SYSTEM_INSTRUCTION = `Tu es PlanneX Copilot IA, expert en planification d'arrêts industriels.

RÈGLES ABSOLUES:
- Réponds TOUJOURS en français
- Sois ULTRA-CONCIS: max 5 bullet points ou 3 lignes pour les réponses simples
- Donne des chiffres EXACTS issus du contexte — JAMAIS d'estimations génériques
- Si la donnée est dans le contexte, cite-la directement sans préambule
- Commence ta réponse directement par l'information, pas par "Bien sûr" ou "Voici"
- Pour les coûts: utilise les champs TOTAL_COST, MO_HH_COST, PDR COST, SCAFFOLDING_COST, HANDLING_COST du contexte PAGE COÛT
- Pour la readiness: utilise la section PAGE READINESS du contexte
- Pour le planning: utilise la section LISTE DÉTAILLÉE PLANNING
- Utilise des tableaux markdown quand il y a plusieurs valeurs à comparer
- Si une info manque dans le contexte, dis-le en 1 ligne`;

// --- MARKDOWN RENDERER (simple) ---
const renderMarkdown = (text: string): string => {
    let html = text
        // Bold
        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Inline code
        .replace(/`([^`]+)`/g, '<code class="bg-slate-700/50 px-1.5 py-0.5 rounded text-cyan-300 text-xs font-mono">$1</code>')
        // Headers
        .replace(/^### (.*$)/gm, '<h3 class="text-lg font-black text-white mt-4 mb-2">$1</h3>')
        .replace(/^## (.*$)/gm, '<h2 class="text-xl font-black text-white mt-5 mb-3">$1</h2>')
        .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-black text-white mt-6 mb-3">$1</h1>')
        // Horizontal rules
        .replace(/^---$/gm, '<hr class="border-white/10 my-4" />')
        // Unordered lists
        .replace(/^- (.*$)/gm, '<li class="ml-4 list-disc list-inside text-slate-300">$1</li>')
        .replace(/^• (.*$)/gm, '<li class="ml-4 list-disc list-inside text-slate-300">$1</li>')
        // Tables (basic)
        .replace(/\|(.+)\|/g, (match) => {
            const cells = match.split('|').filter(c => c.trim() !== '');
            if (cells.every(c => c.trim().match(/^[-:]+$/))) return '<tr class="border-b border-white/5"></tr>';
            const cellHtml = cells.map(c => `<td class="px-3 py-2 text-sm">${c.trim()}</td>`).join('');
            return `<tr class="border-b border-white/5 hover:bg-white/5 transition-colors">${cellHtml}</tr>`;
        })
        // Line breaks
        .replace(/\n\n/g, '</p><p class="mb-3">')
        .replace(/\n/g, '<br/>');

    // Wrap in paragraph tags
    html = `<p class="mb-3">${html}</p>`;

    // Clean up consecutive list items into a single ul
    html = html.replace(/(<li[^>]*>.*?<\/li>(?:<br\/>)?)+/g, (match) => {
        return `<ul class="my-2 space-y-1">${match.replace(/<br\/>/g, '')}</ul>`;
    });

    return html;
};


// --- MAIN COMPONENT ---
const AICopilotPage: React.FC<AICopilotPageProps> = ({ results, parameters, evaluationData, schedulingState, onBack }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isContextReady, setIsContextReady] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<AIProvider>('gemini');
    const [selectedOpenRouterModel, setSelectedOpenRouterModel] = useState(OPENROUTER_MODELS[0].id);
    const [orModelSearch, setOrModelSearch] = useState('');
    const [showOrModelPicker, setShowOrModelPicker] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    // Build project context once – full data from all pages
    const projectContext = useMemo(() => {
        return buildProjectContext(results, parameters, evaluationData, schedulingState);
    }, [results, parameters, evaluationData, schedulingState]);

    // Simulate context loading animation
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsContextReady(true);
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: `Bonjour ! 👋 Je suis **PlanneX Copilot IA**, votre assistant expert en planification d'arrêt industriel.

J'ai analysé l'intégralité de votre projet :
- **${results.kpis.totalTasks} tâches** planifiées
- **${results.kpis.totalManHours.toFixed(0)} heures-homme** au total
- **${Object.keys(results.peakResources).length} équipes** mobilisées

Posez-moi n'importe quelle question sur votre arrêt. Je peux analyser les risques, optimiser les ressources, identifier les goulots d'étranglement, ou fournir un résumé exécutif.`,
                timestamp: new Date(),
            }]);
        }, 2000);
        return () => clearTimeout(timer);
    }, [results]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Auto-resize textarea
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setInputValue(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
    };

    // --- GEMINI CALL ---
    const callGemini = async (content: string, conversationHistory: string): Promise<string> => {
        const MODELS = ['gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-2.0-flash'];
        const MAX_RETRIES = 2;
        let lastError: any = null;

        for (const model of MODELS) {
            for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
                try {
                    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
                    const fullPrompt = `CONTEXTE DU PROJET:\n${projectContext}\n\nHISTORIQUE DE CONVERSATION:\n${conversationHistory}\n\nNOUVELLE QUESTION DE L'UTILISATEUR:\n${content}`;

                    const response = await ai.models.generateContent({
                        model,
                        contents: fullPrompt,
                        config: { systemInstruction: SYSTEM_INSTRUCTION }
                    });
                    return response.text || "Je n'ai pas pu générer de réponse.";
                } catch (error: any) {
                    lastError = error;
                    const errorStr = error?.message || JSON.stringify(error) || '';
                    const is429 = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('quota');
                    if (is429 && attempt < MAX_RETRIES) {
                        await new Promise(r => setTimeout(r, (attempt + 1) * 3000));
                        continue;
                    }
                    if (is429) break;
                    break;
                }
            }
        }
        throw lastError || new Error('Gemini API failed');
    };

    const sendMessage = useCallback(async (content: string) => {
        if (!content.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: content.trim(),
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        if (inputRef.current) inputRef.current.style.height = 'auto';

        const conversationHistory = messages
            .filter(m => m.role !== 'system')
            .slice(-10)
            .map(m => `${m.role === 'user' ? 'UTILISATEUR' : 'ASSISTANT'}: ${m.content}`)
            .join('\n\n');

        const chatHistory = messages
            .filter(m => m.role !== 'system')
            .slice(-10)
            .map(m => ({ role: m.role, content: m.content }));

        try {
            let aiResponse: string;

            if (selectedProvider === 'gemini') {
                try {
                    aiResponse = await callGemini(content.trim(), conversationHistory);
                } catch (geminiError: any) {
                    const errMsg = geminiError?.message || JSON.stringify(geminiError) || '';
                    const isQuota = errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('RESOURCE_EXHAUSTED');
                    if (isQuota) {
                        console.warn('Gemini quota exceeded, trying Cohere fallback...');
                        try {
                            aiResponse = await callCohereChat(content.trim(), SYSTEM_INSTRUCTION, projectContext, chatHistory);
                            aiResponse = `*🔄 Basculé automatiquement sur Cohere (quota Gemini épuisé)*\n\n${aiResponse}`;
                        } catch {
                            console.warn('Cohere also failed, trying HuggingFace fallback...');
                            aiResponse = await callHuggingFaceChat(content.trim(), SYSTEM_INSTRUCTION, projectContext, chatHistory);
                            aiResponse = `*🔄 Basculé automatiquement sur HuggingFace (Gemini + Cohere indisponibles)*\n\n${aiResponse}`;
                        }
                    } else {
                        throw geminiError;
                    }
                }
            } else if (selectedProvider === 'cohere') {
                aiResponse = await callCohereChat(content.trim(), SYSTEM_INSTRUCTION, projectContext, chatHistory);
            } else if (selectedProvider === 'groq') {
                aiResponse = await callGroqChat(content.trim(), SYSTEM_INSTRUCTION, projectContext, chatHistory);
            } else if (selectedProvider === 'openrouter') {
                aiResponse = await callOpenRouterChat(content.trim(), SYSTEM_INSTRUCTION, projectContext, chatHistory, selectedOpenRouterModel);
            } else {
                // HuggingFace selected
                aiResponse = await callHuggingFaceChat(content.trim(), SYSTEM_INSTRUCTION, projectContext, chatHistory);
            }

            const assistantMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: aiResponse,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error: any) {
            console.error('AI Chat Error:', error);
            const errorContent = error?.message || 'Erreur inconnue';
            const errorMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: `⚠️ **Erreur de communication avec l'IA (${selectedProvider.toUpperCase()}).**\n\n${errorContent}\n\nEssayez de basculer vers un autre fournisseur en utilisant le sélecteur dans l'en-tête.`,
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, messages, projectContext, selectedProvider, selectedOpenRouterModel]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(inputValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(inputValue);
        }
    };

    // --- PROVIDER META ---
    const providerMeta: Record<AIProvider, { label: string; model: string; icon: string; color: string; glow: string; border: string; bg: string; textColor: string; desc: string; }> = {
        gemini: { label: 'Gemini', model: 'gemini-2.0-flash', icon: '✶', color: 'from-blue-500 to-indigo-500', glow: 'shadow-blue-500/30', border: 'border-blue-500/30', bg: 'bg-blue-500/10', textColor: 'text-blue-400', desc: 'Google DeepMind' },
        cohere: { label: 'Cohere', model: 'command-a-03-2025', icon: '◆', color: 'from-purple-500 to-violet-500', glow: 'shadow-purple-500/30', border: 'border-purple-500/30', bg: 'bg-purple-500/10', textColor: 'text-purple-400', desc: 'Command-A Series' },
        huggingface: { label: 'HuggingFace', model: 'deepseek-v3', icon: '🤗', color: 'from-amber-500 to-orange-500', glow: 'shadow-amber-500/30', border: 'border-amber-500/30', bg: 'bg-amber-500/10', textColor: 'text-amber-400', desc: 'DeepSeek v3 · Novita' },
        groq: { label: 'Groq', model: 'llama-3.3-70b', icon: '⚡', color: 'from-emerald-500 to-teal-500', glow: 'shadow-emerald-500/30', border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', textColor: 'text-emerald-400', desc: 'Llama 3.3 70B · Ultra Fast' },
        openrouter: { label: 'OpenRouter', model: '26 modèles free', icon: '🌐', color: 'from-rose-500 to-orange-500', glow: 'shadow-rose-500/30', border: 'border-rose-500/30', bg: 'bg-rose-500/10', textColor: 'text-rose-400', desc: 'Multi-Model Router' },
    };

    const currentMeta = providerMeta[selectedProvider];

    // --- LOADING SCREEN ---
    if (!isContextReady) {
        return (
            <div className="fixed inset-0 bg-[#040608] flex flex-col items-center justify-center overflow-hidden">
                {/* Ambient Background */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)' }} />
                    <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.05) 0%, transparent 70%)' }} />
                </div>

                {/* Orbital Rings */}
                <div className="relative w-48 h-48 mb-12">
                    <div className="absolute inset-0 rounded-full border border-cyan-500/10" style={{ animation: 'spin 8s linear infinite' }} />
                    <div className="absolute inset-4 rounded-full border border-emerald-500/10" style={{ animation: 'spin 5s linear infinite reverse' }} />
                    <div className="absolute inset-0 rounded-full border-t border-cyan-400/40" style={{ animation: 'spin 3s linear infinite' }} />
                    <div className="absolute inset-4 rounded-full border-b border-emerald-400/30" style={{ animation: 'spin 4s linear infinite reverse' }} />
                    {/* Center Core */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative w-20 h-20">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 blur-xl animate-pulse" />
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 flex items-center justify-center backdrop-blur-xl">
                                <svg className="w-8 h-8 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    {/* Orbiting Dots */}
                    {[0, 1, 2, 3].map(i => (
                        <div key={i} className="absolute inset-0" style={{ transform: `rotate(${i * 90}deg)`, animation: 'spin 6s linear infinite', animationDelay: `${i * -1.5}s` }}>
                            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                    ))}
                </div>

                <div className="text-center space-y-3 mb-10">
                    <h2 className="text-3xl font-black text-white tracking-tight">Initialisation du <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">Copilot IA</span></h2>
                    <p className="text-slate-500 text-sm font-medium">Analyse de <span className="text-white font-bold">{results.kpis.totalTasks} tâches</span> · <span className="text-white font-bold">{results.kpis.totalManHours.toFixed(0)} H-H</span></p>
                </div>

                {/* Steps */}
                <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest">
                    {['Chargement contexte', 'Analyse planning', 'Prêt'].map((step, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full border border-cyan-500/30 bg-cyan-500/10 flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: `${i * 0.5}s` }} />
                            </div>
                            <span className="text-slate-500">{step}</span>
                            {i < 2 && <span className="text-white/10 ml-2">············</span>}
                        </div>
                    ))}
                </div>

                {/* Progress Track */}
                <div className="mt-10 w-80 space-y-2">
                    <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.6)]" style={{ animation: 'loading 2s ease-in-out forwards' }} />
                    </div>
                </div>

                <style>{`
                    @keyframes loading { from { width: 0%; } to { width: 100%; } }
                    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                `}</style>
            </div>
        );
    }

    // --- MAIN CHAT UI ---
    return (
        <div className="fixed inset-0 bg-[#040608] flex overflow-hidden" style={{ fontFamily: 'Inter, sans-serif' }}>
            <style>{`
                @keyframes message-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .message-anim { animation: message-in 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .chat-scroll::-webkit-scrollbar { width: 4px; }
                .chat-scroll::-webkit-scrollbar-track { background: transparent; }
                .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 99px; }
                .chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.1); }
            `}</style>

            {/* Ambient Background Glows */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full" style={{ background: `radial-gradient(circle, ${selectedProvider === 'gemini' ? 'rgba(59,130,246,0.04)' : selectedProvider === 'cohere' ? 'rgba(168,85,247,0.04)' : selectedProvider === 'huggingface' ? 'rgba(245,158,11,0.04)' : selectedProvider === 'groq' ? 'rgba(16,185,129,0.04)' : 'rgba(244,63,94,0.04)'} 0%, transparent 70%)`, transition: 'background 0.8s ease' }} />
                <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.03) 0%, transparent 70%)' }} />
            </div>

            {/* ===== LEFT SIDEBAR ===== */}
            <div className="relative z-10 w-72 flex-shrink-0 h-full flex flex-col border-r border-white/[0.04] bg-white/[0.01] backdrop-blur-xl overflow-y-auto chat-scroll">

                {/* === BACK BUTTON === */}
                <button
                    onClick={onBack}
                    className="group flex items-center gap-3 w-full px-5 py-4 border-b border-white/[0.04] hover:bg-white/[0.03] transition-all duration-200"
                >
                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-white/10 group-hover:border-white/20 transition-all duration-200 group-hover:-translate-x-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-white transition-colors">
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <div className="text-[11px] font-black text-slate-300 group-hover:text-white transition-colors">Retour au Dashboard</div>
                        <div className="text-[8px] text-slate-700 font-bold uppercase tracking-widest">PlanneX Mission Control</div>
                    </div>
                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600">
                            <path d="m15 18-6-6 6-6" />
                        </svg>
                    </div>
                </button>

                {/* === RÉSULTATS BUTTON === */}
                <button
                    onClick={onBack}
                    className="group flex items-center gap-3 w-full px-5 py-3.5 border-b border-white/[0.04] hover:bg-emerald-500/[0.06] transition-all duration-200"
                >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:border-emerald-500/40 transition-all duration-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                            <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
                        </svg>
                    </div>
                    <div className="text-left">
                        <div className="text-[11px] font-black text-emerald-400 group-hover:text-emerald-300 transition-colors">Voir les Résultats</div>
                        <div className="text-[8px] text-slate-700 font-bold uppercase tracking-widest">Dashboard Résultats</div>
                    </div>
                    <div className="ml-auto">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500/40 group-hover:text-emerald-400 transition-colors">
                            <path d="m9 18 6-6-6-6" />
                        </svg>
                    </div>
                </button>

                <div className="p-5 flex flex-col flex-1">
                    {/* Logo */}
                    <div className="flex items-center gap-2 mb-6">
                        <div className={`w-7 h-7 rounded-xl bg-gradient-to-br ${currentMeta.color} flex items-center justify-center shadow-lg transition-all duration-300`}>
                            <svg className="w-3.5 h-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-sm font-black text-white tracking-tight">Copilot IA</div>
                            <div className="text-[8px] text-slate-700 uppercase tracking-widest font-bold">PlanneX Intelligence</div>
                        </div>
                    </div>

                    {/* Session Status Card */}
                    <div className={`mb-5 p-4 rounded-2xl border ${currentMeta.border} ${currentMeta.bg} relative overflow-hidden flex-shrink-0`}>
                        <div className="absolute inset-0" style={{ background: `radial-gradient(circle at top right, ${selectedProvider === 'gemini' ? 'rgba(59,130,246,0.08)' : selectedProvider === 'cohere' ? 'rgba(168,85,247,0.08)' : selectedProvider === 'huggingface' ? 'rgba(245,158,11,0.08)' : selectedProvider === 'groq' ? 'rgba(16,185,129,0.08)' : 'rgba(244,63,94,0.08)'}, transparent)` }} />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <div className={`w-1.5 h-1.5 rounded-full ${currentMeta.textColor.replace('text-', 'bg-')} animate-pulse`} />
                                <span className={`text-[9px] font-black uppercase tracking-widest ${currentMeta.textColor}`}>Session Active</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <div className="text-[8px] text-slate-600 font-bold uppercase mb-0.5">Tâches</div>
                                    <div className="text-lg font-black text-white">{results.kpis.totalTasks}</div>
                                </div>
                                <div>
                                    <div className="text-[8px] text-slate-600 font-bold uppercase mb-0.5">H-H Total</div>
                                    <div className="text-lg font-black text-white">{results.kpis.totalManHours.toFixed(0)}</div>
                                </div>
                                <div className="col-span-2">
                                    <div className="text-[8px] text-slate-600 font-bold uppercase mb-0.5">Messages</div>
                                    <div className="text-sm font-black text-white">{messages.filter(m => m.role === 'user').length} échanges</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Provider Selection Label */}
                    <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3 px-1">Moteur IA</div>

                    {/* Provider Cards */}
                    <div className="space-y-2">
                        {(Object.keys(providerMeta) as AIProvider[]).map(provider => {
                            const meta = providerMeta[provider];
                            const isActive = selectedProvider === provider;
                            return (
                                <div key={provider}>
                                    <button
                                        onClick={() => { setSelectedProvider(provider); if (provider === 'openrouter') setShowOrModelPicker(true); }}
                                        className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-300 ${isActive
                                            ? `${meta.border} ${meta.bg} shadow-lg ${meta.glow}`
                                            : 'border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0 ${isActive ? `bg-gradient-to-br ${meta.color}` : 'bg-white/5'
                                                }`}>
                                                {meta.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-0.5">
                                                    <span className={`text-[11px] font-black ${isActive ? 'text-white' : 'text-slate-400'}`}>{meta.label}</span>
                                                    {isActive && <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${meta.textColor.replace('text-', 'bg-')}`} />}
                                                </div>
                                                <div className={`text-[9px] font-bold truncate ${isActive ? meta.textColor : 'text-slate-600'}`}>{meta.desc}</div>
                                                <div className="text-[8px] text-slate-700 font-mono truncate mt-0.5">{meta.model}</div>
                                            </div>
                                        </div>
                                    </button>

                                    {/* OpenRouter Model Picker - shown when openrouter is active */}
                                    {provider === 'openrouter' && isActive && (
                                        <div className="mt-2 rounded-2xl border border-rose-500/20 bg-rose-500/5 overflow-hidden">
                                            {/* Currently selected */}
                                            <div className="px-3 py-2 border-b border-rose-500/10">
                                                <div className="text-[8px] text-rose-400/60 font-black uppercase tracking-widest mb-1">Modèle actif</div>
                                                <div className="text-[10px] font-bold text-rose-300 truncate">
                                                    {OPENROUTER_MODELS.find(m => m.id === selectedOpenRouterModel)?.label || selectedOpenRouterModel}
                                                </div>
                                            </div>
                                            {/* Search */}
                                            <div className="px-3 py-2 border-b border-rose-500/10">
                                                <input
                                                    type="text"
                                                    value={orModelSearch}
                                                    onChange={e => setOrModelSearch(e.target.value)}
                                                    placeholder="Rechercher un modèle..."
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-[10px] text-white placeholder:text-slate-700 focus:outline-none focus:border-rose-500/30 transition-colors"
                                                />
                                            </div>
                                            {/* Model list */}
                                            <div className="max-h-48 overflow-y-auto chat-scroll">
                                                {OPENROUTER_MODELS
                                                    .filter(m => m.label.toLowerCase().includes(orModelSearch.toLowerCase()) || m.badge.toLowerCase().includes(orModelSearch.toLowerCase()))
                                                    .map(model => (
                                                        <button
                                                            key={model.id}
                                                            onClick={() => setSelectedOpenRouterModel(model.id)}
                                                            className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-white/5 transition-colors ${selectedOpenRouterModel === model.id ? 'bg-rose-500/10' : ''
                                                                }`}
                                                        >
                                                            <div className={`flex-shrink-0 w-1 h-1 rounded-full ${selectedOpenRouterModel === model.id ? 'bg-rose-400' : 'bg-slate-700'}`} />
                                                            <div className="flex-1 min-w-0">
                                                                <div className={`text-[10px] font-bold truncate ${selectedOpenRouterModel === model.id ? 'text-rose-300' : 'text-slate-400'}`}>{model.label}</div>
                                                            </div>
                                                            <span className="flex-shrink-0 text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/5 text-slate-600">{model.badge}</span>
                                                        </button>
                                                    ))
                                                }
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pt-4 border-t border-white/[0.04]">
                        <p className="text-[8px] text-slate-700 font-medium text-center leading-relaxed">
                            Les réponses peuvent contenir des inexactitudes.<br />Vérifiez les informations critiques.
                        </p>
                    </div>
                </div> {/* end inner padding wrapper */}
            </div>

            {/* ===== MAIN CHAT AREA ===== */}
            <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">

                {/* Chat Header */}
                <div className="flex-shrink-0 px-8 py-5 border-b border-white/[0.04] bg-white/[0.01] backdrop-blur-xl flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* AI Avatar */}
                        <div className="relative">
                            <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${currentMeta.color} blur-md opacity-50`} />
                            <div className={`relative w-11 h-11 rounded-2xl bg-gradient-to-br ${currentMeta.color} flex items-center justify-center shadow-lg`}>
                                <svg className="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                                </svg>
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-black text-white tracking-tight">PlanneX Copilot IA</h1>
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${currentMeta.bg} ${currentMeta.textColor} ${currentMeta.border} border`}>{currentMeta.label}</span>
                            </div>
                            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">Intelligence Artificielle · Analyse d'Arrêt Industriel</p>
                        </div>
                    </div>
                    {/* Live Indicator */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06]">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">En ligne</span>
                        </div>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto chat-scroll px-8 py-6 space-y-8">
                    {messages.map((msg, index) => (
                        <div
                            key={msg.id}
                            className={`flex gap-4 message-anim ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                            style={{ animationDelay: `${index * 0.03}s` }}
                        >
                            {/* Avatar */}
                            <div className="flex-shrink-0 mt-1">
                                {msg.role === 'assistant' ? (
                                    <div className={`relative w-9 h-9 rounded-xl bg-gradient-to-br ${currentMeta.color} flex items-center justify-center shadow-lg ${currentMeta.glow}`}>
                                        <svg className="w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                                        </svg>
                                    </div>
                                ) : (
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 border border-white/10 flex items-center justify-center">
                                        <svg className="w-4 h-4 text-slate-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* Bubble */}
                            <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
                                <div className={`relative rounded-2xl px-5 py-4 ${msg.role === 'user'
                                    ? 'bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10 text-white rounded-tr-sm'
                                    : 'bg-[#0d1117] border border-white/[0.06] text-slate-300 rounded-tl-sm'
                                    }`}>
                                    {msg.role === 'assistant' && (
                                        <div className={`absolute -top-px left-0 right-0 h-px rounded-t-2xl bg-gradient-to-r ${currentMeta.color} opacity-50`} />
                                    )}
                                    {msg.role === 'assistant' ? (
                                        <div
                                            className="prose prose-invert prose-sm max-w-none leading-7 text-slate-300 [&_strong]:text-white [&_strong]:font-bold [&_table]:w-full [&_table]:border-collapse [&_table]:rounded-xl [&_table]:overflow-hidden [&_table]:bg-slate-900/50 [&_th]:bg-slate-800/80 [&_th]:px-3 [&_th]:py-2 [&_th]:text-[10px] [&_th]:font-black [&_th]:text-slate-400 [&_th]:uppercase [&_th]:tracking-wider [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_td]:border-b [&_td]:border-white/5"
                                            dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                        />
                                    ) : (
                                        <p className="text-sm leading-relaxed text-white font-medium">{msg.content}</p>
                                    )}
                                </div>
                                <div className={`flex items-center gap-2 px-1 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    <span className="text-[8px] font-bold uppercase tracking-widest text-slate-700">
                                        {msg.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {msg.role === 'assistant' && (
                                        <span className={`text-[8px] font-bold uppercase tracking-widest ${currentMeta.textColor} opacity-60`}>{currentMeta.label}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Typing Indicator */}
                    {isLoading && (
                        <div className="flex gap-4 message-anim">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${currentMeta.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                                <svg className="w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                                </svg>
                            </div>
                            <div className="bg-[#0d1117] border border-white/[0.06] rounded-2xl rounded-tl-sm px-6 py-4 flex items-center gap-4">
                                <div className="flex gap-1.5">
                                    {[0, 1, 2].map(i => (
                                        <div
                                            key={i}
                                            className={`w-2 h-2 rounded-full bg-gradient-to-br ${currentMeta.color} animate-bounce`}
                                            style={{ animationDelay: `${i * 180}ms` }}
                                        />
                                    ))}
                                </div>
                                <span className="text-xs text-slate-600 font-medium">Copilot analyse vos données...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Zone */}
                <div className="flex-shrink-0 px-8 pb-6 pt-4 border-t border-white/[0.04] bg-[#040608]/80 backdrop-blur-xl">
                    <form onSubmit={handleSubmit}>
                        <div className={`relative flex items-end gap-3 bg-[#0d1117] border rounded-2xl p-3 transition-all duration-300 focus-within:border-opacity-60 ${selectedProvider === 'gemini' ? 'border-blue-500/20 focus-within:border-blue-500/40 focus-within:shadow-[0_0_30px_rgba(59,130,246,0.08)]' :
                            selectedProvider === 'cohere' ? 'border-purple-500/20 focus-within:border-purple-500/40 focus-within:shadow-[0_0_30px_rgba(168,85,247,0.08)]' :
                                selectedProvider === 'huggingface' ? 'border-amber-500/20 focus-within:border-amber-500/40 focus-within:shadow-[0_0_30px_rgba(245,158,11,0.08)]' :
                                    'border-emerald-500/20 focus-within:border-emerald-500/40 focus-within:shadow-[0_0_30px_rgba(16,185,129,0.08)]'
                            } shadow-xl`}>
                            {/* Provider pill */}
                            <div className={`flex-shrink-0 self-end mb-1 px-2.5 py-1.5 rounded-xl ${currentMeta.bg} border ${currentMeta.border} flex items-center gap-1.5`}>
                                <span className="text-base leading-none">{currentMeta.icon}</span>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${currentMeta.textColor}`}>{currentMeta.label}</span>
                            </div>
                            <textarea
                                ref={inputRef}
                                value={inputValue}
                                onChange={handleInputChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Posez votre question sur l'arrêt industriel..."
                                rows={1}
                                disabled={isLoading}
                                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-slate-700 resize-none py-2 px-1 max-h-[160px] disabled:opacity-50 leading-relaxed"
                            />
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isLoading}
                                className={`flex-shrink-0 self-end p-3 rounded-xl bg-gradient-to-r ${currentMeta.color} text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:shadow-none disabled:hover:scale-100`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M22 2L11 13" /><path d="M22 2L15 22l-4-9-9-4 20-7z" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-center mt-2.5 text-[8px] text-slate-800 font-medium tracking-wide">
                            PlanneX Copilot IA · {results.kpis.totalTasks} tâches analysées · Moteur : {currentMeta.model}
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AICopilotPage;
