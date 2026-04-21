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
/**
 * Generates a set of 'Fair Diagnostic' questions dynamically 
 * based on the student's grade level and patterns in the Knowledge Base (KB).
 */
export async function generateDiagnosticExercises(level: string, countryCode: string = "DZ"): Promise<DiagnosticExercise[]> {
  try {
    const { data, error } = await supabase.functions.invoke("generate-diagnostic-assessment", {
      body: {
        level,
        countryCode,
        purpose: "fair_diagnostic",
        count: 5,
        seed: Math.random() // Force AI variety
      }
    });

    if (error) throw error;
    if (!data?.exercises) throw new Error("No exercises returned from generator");

    return data.exercises as DiagnosticExercise[];
  } catch (error) {
    console.error("Diagnostic Generation Error:", error);
    // Return a randomized fallback set if generation fails
    return getFallbackExercises(level);
  }
}

/**
 * Fallback exercises if the AI/KB engine is unavailable.
 * Randomized from a pool to ensure variety.
 */
function getFallbackExercises(level: string): DiagnosticExercise[] {
  const isMiddle = level.includes("AM") || level === "middle_1" || level === "middle_2" || level === "middle_3" || level === "middle_4";
  const isBac = level === "3AS" || level === "secondary_3";
  
  const pool: DiagnosticExercise[] = [
    {
      id: 101, type: "logic", typeName: "تحليل منطقي",
      question: isBac ? "قالت آمال: $(ln(x))^2 = 2ln(x)$. هل هي محقة؟" : isMiddle ? "قالت آمال: $(x+5)^2 = x^2 + 25$. هل هي محقة؟" : "قالت آمال: $\\sqrt{a+b} = \\sqrt{a} + \\sqrt{b}$. هل هي محقة؟",
      options: ["نعم، صحيحة", "لا، خطأ في القواعد"],
      answer: "لا، خطأ في القواعد",
      hint: "تذكر قواعد القوى أو الدوال وكيفية توزيعها.",
      kind: "qcm", icon: "💡",
      misconception: "خطأ في توزيع القوى/الدوال",
      badgeColor: "var(--algebra)", badgeBg: "rgba(167,139,250,0.08)"
    },
    {
      id: 102, type: "trap", typeName: "فخ المتراجحات",
      question: "حل المتراجحة: $-3x > 9$ هو:",
      options: ["$x > -3$", "$x < -3$", "$x > 3$", "$x < 3$"],
      answer: "$x < -3$",
      hint: "ماذا يحدث لجهة المتراجحة عند الضرب في عدد سالب؟",
      kind: "qcm", icon: "🪤",
      misconception: "نسيان قلب المتراجحة",
      badgeColor: "var(--destructive)", badgeBg: "rgba(248,113,113,0.08)"
    },
    {
      id: 103, type: "standard", typeName: "حساب ذهني",
      question: "ما هو نصف $2^{10}$؟",
      options: ["$1^{10}$", "$2^5$", "$2^9$", "$1^5$"],
      answer: "$2^9$",
      hint: "تذكر أن القسمة على 2 هي طرح 1 من الأس.",
      kind: "qcm", icon: "🔢",
      misconception: "خطأ في قوانين الأسس",
      badgeColor: "var(--primary)", badgeBg: "rgba(59,130,246,0.08)"
    },
    {
      id: 104, type: "logic", typeName: "تحدي المساحات",
      question: "إذا ضاعفنا طول ضلع مربع، هل تتضاعف مساحته؟",
      options: ["نعم، تتضاعف", "لا، تصبح 4 أضعاف", "لا، تصبح 8 أضعاف"],
      answer: "لا، تصبح 4 أضعاف",
      hint: "المساحة هي الضلع في نفسه. $(2s)^2 = ?$",
      kind: "qcm", icon: "📐",
      misconception: "عدم إدراك التغير التربيحي للمساحة",
      badgeColor: "var(--geometry)", badgeBg: "rgba(16,185,129,0.08)"
    },
    {
      id: 105, type: "strategic", typeName: "تفكير تراجعي",
      question: "عدد إذا أضفنا له 5 ثم ضربناه في 2 حصلنا على 20. ما هو هذا العدد؟",
      answer: "5",
      hint: "حاول البدء من النتيجة والرجوع للخلف.",
      kind: "numeric", icon: "🎯",
      misconception: "صعوبة في النمذجة الرياضية العكسية",
      badgeColor: "var(--accent)", badgeBg: "rgba(245,158,11,0.08)",
      placeholder: "اكتب العدد فقط..."
    },
    {
      id: 106, type: "trap", typeName: "فخ الإشارات",
      question: "ما هي نتيجة $-5 - (-8)$؟",
      options: ["$-13$", "$3$", "$-3$", "$13$"],
      answer: "$3$",
      hint: "ناقص في ناقص يصبح زائد.",
      kind: "qcm", icon: "⚡",
      misconception: "ارتباك في جمع وطرح الأعداد النسبية",
      badgeColor: "var(--functions)", badgeBg: "rgba(225,29,72,0.08)"
    },
    {
      id: 107, type: "logic", typeName: "كشف التناقض",
      question: "هل يوجد مثلث أطوال أضلاعه 2cm و 3cm و 6cm؟",
      options: ["نعم، ممكن", "لا، مستحيل"],
      answer: "لا، مستحيل",
      hint: "تذكر المتباينة المثلثية: مجموع أي ضلعين يجب أن يكون أكبر من الثالث.",
      kind: "qcm", icon: "📐",
      misconception: "جهل بالمتباينة المثلثية",
      badgeColor: "var(--geometry)", badgeBg: "rgba(16,185,129,0.08)"
    },
    {
      id: 108, type: "strategic", typeName: "تقدير سريع",
      question: "أي قيمة هي الأقرب لـ $\\sqrt{48}$؟",
      options: ["6", "6.5", "7", "7.5"],
      answer: "7",
      hint: "تذكر $\\sqrt{49} = 7$.",
      kind: "qcm", icon: "👁️‍🗨️",
      misconception: "ضعف في تقدير الجذور الصماء",
      badgeColor: "var(--primary)", badgeBg: "rgba(59,130,246,0.08)"
    }
  ];

  // Shuffle and return 5
  return pool
    .sort(() => Math.random() - 0.5)
    .slice(0, 5);
}
