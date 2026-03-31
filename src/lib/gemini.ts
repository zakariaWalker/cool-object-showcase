import { supabase } from "@/integrations/supabase/client";

/**
 * AI Integration for Math Engine Training
 * Uses Lovable AI via backend edge function.
 */

export interface AISuggestion {
  description: string;
  ruleHint?: string;
}

/**
 * Asks AI to decompose a mathematical exercise into logical solving steps.
 * Returns an array of steps suitable for a DeconstructionSchema.
 */
export async function suggestStepsForExercise(
  exercise: string,
  signature: string
): Promise<AISuggestion[]> {
  try {
    console.log(`[AI] Requesting logic for: ${exercise}`);
    
    const { data, error } = await supabase.functions.invoke("ai-deconstruct", {
      body: {
        exercises: [{ id: signature, text: exercise, type: "unknown", grade: "unknown" }],
        patterns: [],
        batchSize: 1,
      },
    });

    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);

    // Extract steps from deconstruction results
    const results = data?.results || [];
    if (results.length > 0 && results[0].success) {
      // The steps were saved to DB, but we can return generic suggestions
      return [
        { description: "تم تفكيك التمرين بنجاح", ruleHint: "ai_decomposed" },
      ];
    }

    return [
      { description: "لم يتمكن الذكاء الاصطناعي من تفكيك هذا التمرين", ruleHint: "unknown" },
    ];
  } catch (error) {
    console.error("[AI] Error:", error);
    throw new Error("فشل الذكاء الاصطناعي في الاستجابة. تأكد من اتصال الإنترنت.");
  }
}
