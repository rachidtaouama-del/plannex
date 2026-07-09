import { GoogleGenAI, Type } from "@google/genai";
import type { AppParameters, CalculationResults, AIAnalysisResult, ScheduledTask } from '../types';

const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    executiveSummary: {
      type: Type.OBJECT,
      properties: {
        status: {
          type: Type.STRING,
          description: "Overall status of the schedule. Must be one of: 'On Track', 'At Risk', 'Off Track'.",
        },
        summaryText: {
          type: Type.STRING,
          description: "A concise, 1-2 sentence executive summary of the schedule's health.",
        },
      },
    },
    keyFindings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            description: "The type of finding. Must be either 'positive' or 'negative'.",
          },
          finding: {
            type: Type.STRING,
            description: 'A single, specific observation about the schedule (e.g., "Resource peak for MECANIQUE is high").',
          },
        },
      },
    },
    recommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: 'A single, actionable recommendation to improve the schedule (e.g., "Consider staggering tasks for MECANIQUE team to level resource load.").',
      },
    },
    bottlenecks: {
      type: Type.ARRAY,
      items: {
        type: Type.STRING,
        description: 'A single identified bottleneck, which could be a specific task, resource, or dependency chain (e.g., "MECANIQUE team resource availability").',
      },
    },
  },
};


export const analyzeScheduleWithAI = async (results: CalculationResults, parameters: AppParameters): Promise<AIAnalysisResult> => {
  // Always use Gemini for structured analysis as it's optimized for this schema
  // FIX: Obtained API key exclusively from environment variable process.env.API_KEY as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

Based *only* on the data above, provide the following analysis in French:

1.  **Executive Summary:** Give a very brief, high-level status ('On Track', 'At Risk', or 'Off Track') and a one-sentence summary.
2.  **Key Findings:** Identify 2-3 of the most critical positive or negative points.
3.  **Recommendations:** Provide 2-3 concrete, actionable recommendations for improvement.
4.  **Bottlenecks:** Clearly state the primary bottleneck(s) identified from the data (e.g., a specific team with high resource peak).

Your entire output **must** be a single, valid JSON object that conforms to the provided schema. Do not include any text, markdown formatting, or explanations outside of the JSON object.
`;

  try {
    const response = await ai.models.generateContent({
      // FIX: Updated deprecated model 'gemini-1.5-flash' to 'gemini-3-flash-preview' for basic text tasks with JSON output.
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
      },
    });

    // FIX: Use the .text property to get the string output directly from the response.
    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response from AI");

    // In case the API wraps the JSON in markdown, remove it.
    const cleanedJson = jsonText.trim().replace(/^```json\s*|```$/g, '');
    return JSON.parse(cleanedJson) as AIAnalysisResult;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    let errorMessage = "Erreur inconnue lors de la communication avec l'API d'IA.";
    if (error instanceof Error) {
      errorMessage = `Erreur lors de l'analyse par l'IA : ${error.message}`;
    }
    // Return a structured error object that matches the expected type, so the UI can handle it.
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
  // Limit to important fields to save tokens
  // Taking a subset if too many tasks to avoid context window limits (though Flash has large window)
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

export const sendMessageToChat = async (message: string, context: string, modelId: string = 'gemini-3-flash-preview'): Promise<string> => {

  // Use Gemini
  // FIX: Initialization using process.env.API_KEY as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: `CONTEXTE DU PROJET:\n${context}\n\nQUESTION DE L'UTILISATEUR:\n${message}`,
      config: {
        systemInstruction: "Tu es PlanneX Copilot, un expert senior en planification de maintenance industrielle. Ton rôle est d'aider le planificateur à optimiser son arrêt. Réponds aux questions de l'utilisateur en te basant EXCLUSIVEMENT sur les données du planning fournies dans le contexte. Si tu ne trouves pas l'information dans le contexte, dis-le poliment. Sois précis, professionnel, concis et force de proposition. Tes réponses doivent être en français.",
      }
    });

    // FIX: Use the .text property to get the string output directly from the response.
    return response.text || "Je n'ai pas pu générer de réponse. Veuillez réessayer.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    throw new Error("Erreur de communication avec l'IA Gemini. Vérifiez votre connexion ou votre clé API.");
  }
};