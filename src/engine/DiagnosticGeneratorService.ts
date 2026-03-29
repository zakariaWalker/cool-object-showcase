import { supabase } from "@/integrations/supabase/client";

export interface DiagnosticExercise {
  id: number;
  type: "logic" | "trap" | "standard" | "open" | "strategic";
  typeName: string;
  question: string;
  options?: string[];
  answer: string;
  hint: string;
  kind: "qcm" | "numeric" | "text";
  icon: string;
  misconception: string;
  badgeColor: string;
  badgeBg: string;
  placeholder?: string;
}

/**
 * Generates a set of 'Fair Diagnostic' questions dynamically 
 * based on the student's grade level and patterns in the Knowledge Base (KB).
 */
export async function generateDiagnosticExercises(level: string): Promise<DiagnosticExercise[]> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-diagnostic-assessment", {
      body: { 
        level,
        purpose: "fair_diagnostic",
        count: 5 
      }
    });

    if (error) throw error;
    if (!data?.exercises) throw new Error("No exercises returned from generator");

    return data.exercises as DiagnosticExercise[];
  } catch (error) {
    console.error("Diagnostic Generation Error:", error);
    // Return a fallback set if generation fails
    return getFallbackExercises(level);
  }
}

/**
 * Fallback exercises if the AI/KB engine is unavailable.
 * These are still better than nothing and follow the 'Fair' principles.
 */
function getFallbackExercises(level: string): DiagnosticExercise[] {
  // Simple logic to adjust slightly for level if needed
  const isBac = level === "3AS";
  
  return [
    {
      id: 1, type: "logic", typeName: "تحليل منطقي",
      question: isBac ? "قالت آمال: $(ln(x))^2 = 2ln(x)$. هل هي محقة؟" : "قالت آمال: $(x+5)^2 = x^2 + 25$. هل هي محقة؟",
      options: ["نعم، صحيحة", "لا، خطأ في القواعد"],
      answer: "لا، خطأ في القواعد",
      hint: "تذكر قواعد القوى وكيفية التعامل مع المربع.",
      kind: "qcm", icon: "💡",
      misconception: "خطأ في تطبيق قواعد القوى",
      badgeColor: "var(--algebra)", badgeBg: "rgba(167,139,250,0.08)"
    },
    // ... more fallbacks
    {
      id: 2, type: "trap", typeName: "فخ المتراجحات",
      question: "حل المتراجحة: $-3x > 9$ هو:",
      options: ["$x > -3$", "$x < -3$", "$x > 3$", "$x < 3$"],
      answer: "$x < -3$",
      hint: "انتبه لجهة المتراجحة.",
      kind: "qcm", icon: "🪤",
      misconception: "نسيان قلب المتراجحة",
      badgeColor: "var(--destructive)", badgeBg: "rgba(248,113,113,0.08)"
    }
  ];
}
