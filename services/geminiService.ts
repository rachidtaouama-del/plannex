import type { AppParameters, CalculationResults, AIAnalysisResult, ScheduledTask } from '../types';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const DEFAULT_MODEL = 'amazon/nova-pro-v1';

const callOpenRouter = async (messages: { role: string; content: string }[], model: string = DEFAULT_MODEL): Promise<string> => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://plannex.app',
      'X-Title': 'PlanneX Copilot IA',
    },
    body: JSON.stringify({ model, messages, max_tokens: 4096 }),
  });

  if (!response.ok) {
    let errMsg = `HTTP ${response.status}`;
    try {
      const d = await response.json();
      errMsg = d?.error?.message || d?.error?.metadata?.raw || JSON.stringify(d?.error) || errMsg;
    } catch {}
    throw new Error(`OpenRouter API Error: ${errMsg}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
};

export const analyzeScheduleWithAI = async (results: CalculationResults, parameters: AppParameters): Promise<AIAnalysisResult> => {
  const { kpis, peakResources, scheduleEndDate, maxWorkDate } = results;
  const isOvertime = scheduleEndDate > maxWorkDate;
  const overrunHours = isOvertime ? (scheduleEndDate.getTime() - maxWorkDate.getTime()) / (1000 * 60 * 60) : 0;

  const prompt = `
Act as a world-class Senior Project Scheduler specializing in industrial maintenance shutdowns.
Your task is to analyze the provided schedule data and return a structured JSON object with actionable insights.

**Schedule Data:**

- **Overall Status:** ${isOvertime ? `Overdue by ${overrunHours.toFixed(2)} hours.` : 'On time.'}
- **Planned End Date:** ${maxWorkDate.toLocaleString('fr-FR')}
- **Calculated End Date:** ${scheduleEndDate.toLocaleString('fr-FR')}
- **Total Tasks:** ${kpis.totalTasks}
- **Total Man-Hours:** ${kpis.totalManHours.toFixed(2)}
- **Peak Resources by Team:**
${Object.entries(peakResources).map(([team, count]) => `  - ${team}: ${count} people`).join('\n')}

**Analysis Instructions:**

Based *only* on the data above, provide the following analysis in French.
Your entire output **must** be a single, valid JSON object with this exact structure:
{
  "executiveSummary": { "status": "On Track|At Risk|Off Track", "summaryText": "..." },
  "keyFindings": [{ "type": "positive|negative", "finding": "..." }],
  "recommendations": ["..."],
  "bottlenecks": ["..."]
}

Do not include any text, markdown formatting, or explanations outside of the JSON object.
`;

  try {
    const text = await callOpenRouter([
      { role: 'system', content: 'You are a world-class project scheduler. Always respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);

    const cleanedJson = text.trim().replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson) as AIAnalysisResult;
  } catch (error) {
    console.error("Error calling OpenRouter API:", error);
    let errorMessage = "Erreur inconnue lors de la communication avec l'API d'IA.";
    if (error instanceof Error) {
      errorMessage = `Erreur lors de l'analyse par l'IA : ${error.message}`;
    }
    return {
      executiveSummary: { status: 'Off Track', summaryText: 'Failed to generate analysis.' },
      keyFindings: [{ type: 'negative', finding: `API Error: ${errorMessage}` }],
      recommendations: ['Check the browser console for more details and verify your API key configuration.'],
      bottlenecks: ['API Communication Failure'],
    };
  }
};

// --- CHAT FUNCTIONALITY ---

const formatTasksForContext = (tasks: ScheduledTask[]): string => {
  const limitedTasks = tasks.length > 500 ? tasks.slice(0, 500) : tasks;
  const taskStrings = limitedTasks.map(t =>
    `ID:${t.id} | Action:${t.action} | Eq:${t.equipment} | Team:${t.team} | Start:${t.startTime.toLocaleString()} | End:${t.endTime.toLocaleString()} | Dur:${t.duration}h`
  );

  let context = taskStrings.join('\n');
  if (tasks.length > 500) {
    context += `\n... et ${tasks.length - 500} autres tâches (tronqué pour la performance).`;
  }
  return context;
};

export const getChatContextString = (results: CalculationResults, parameters: AppParameters): string => {
  const { kpis, peakResources, scheduleEndDate, maxWorkDate } = results;
  const taskContext = formatTasksForContext(results.scheduledTasks);

  return `
    **DONNÉES DU PROJET:**
    - **Début Planifié:** ${new Date(parameters.shutdownStart).toLocaleString()}
    - **Fin Planifiée:** ${new Date(parameters.shutdownEnd).toLocaleString()}
    - **Fin Calculée:** ${scheduleEndDate.toLocaleString()}
    - **Total Tâches:** ${kpis.totalTasks}
    - **Total Heures-Homme:** ${kpis.totalManHours.toFixed(2)}
    - **Heures de Travail Effectives:** ${kpis.effectiveWorkHours.toFixed(2)}
    - **Pic de Ressources:** ${JSON.stringify(peakResources)}

    **LISTE DÉTAILLÉE DES TÂCHES:**
    ${taskContext}
    `;
};

export const sendMessageToChat = async (message: string, context: string, modelId: string = DEFAULT_MODEL): Promise<string> => {
  try {
    const text = await callOpenRouter([
      { role: 'system', content: "Tu es PlanneX Copilot, un expert senior en planification de maintenance industrielle. Ton rôle est d'aider le planificateur à optimiser son arrêt. Réponds aux questions de l'utilisateur en te basant EXCLUSIVEMENT sur les données du planning fournies dans le contexte. Si tu ne trouves pas l'information dans le contexte, dis-le poliment. Sois précis, professionnel, concis et force de proposition. Tes réponses doivent être en français." },
      { role: 'user', content: `CONTEXTE DU PROJET:\n${context}\n\nQUESTION DE L'UTILISATEUR:\n${message}` },
    ], modelId);

    return text || "Je n'ai pas pu générer de réponse. Veuillez réessayer.";
  } catch (error) {
    console.error("OpenRouter Chat Error:", error);
    throw new Error("Erreur de communication avec l'IA. Vérifiez votre connexion ou votre clé API OpenRouter.");
  }
};
