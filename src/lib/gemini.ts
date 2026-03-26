import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Gemini AI Integration for Math Engine Training
 * This service handles calling the Google Generative AI API to 
 * logically decompose unsolved mathematical exercises.
 */

// Note: In a production environment, use import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_KEY ?? import.meta.env.VITE_GEMINI_API_KEY ?? "");
const MODEL_NAME = "gemini-3.1-flash-lite-preview";

export interface AISuggestion {
  description: string;
  ruleHint?: string;
}

/**
 * Asks Gemini to decompose a mathematical exercise into logical solving steps.
 * Returns an array of steps suitable for a DeconstructionSchema.
 */
export async function suggestStepsForExercise(
  exercise: string,
  signature: string
): Promise<AISuggestion[]> {
  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const prompt = `
      You are a mathematical expert and educator for Algerian Middle and High school students (CEM/Lycée).
      I will give you a mathematical exercise that the current engine does not know how to solve.
      
      Exercise: "${exercise}"
      Pattern Signature: "${signature}"
      
      Please decompose this exercise into logical solving steps (3-5 steps).
      Requirements:
      1. 'description': A clear, helpful description in ARABIC (Algerian educational style).
      2. 'ruleHint': A short technical slug (e.g., 'simplify', 'factor', 'apply_limit', 'integrate').
      
      IMPORTANT: Return the result ONLY as a valid JSON array of objects.
      Example: [{"description": "خطوة 1...", "ruleHint": "slug"}]
    `;

    console.log(`[Gemini] Requesting AI logic for: ${exercise}`);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Extract JSON (Gemini sometimes wraps in markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error("Could not parse AI response as JSON");
    }

    const suggestions: AISuggestion[] = JSON.parse(jsonMatch[0]);
    return suggestions;
  } catch (error) {
    console.error("[Gemini] API Error:", error);
    throw new Error("فشل الذكاء الاصطناعي في الاستجابة. تأكد من اتصال الإنترنت أو صلاحية المفتاح.");
  }
}
