import { callGemini, GeminiError, extractJSON } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { level, purpose, count = 5, seed = Math.random() } = await req.json();

    const prompt = `أنت خبير بيداغوجي في الرياضيات (المنهاج الجزائري). 
المهمة: توليد "تقييم تشخيصي عادل" (Fair Diagnostic) للمستوى ${level}.
البصمة العشوائية لهذا الطلب: ${seed} (يجب توليد أسئلة مختلفة عن المرات السابقة).

مبادئ التقييم العادل:
1. التفكير > النتيجة: لا تسأل "احسب x"، بل اسأل "آمال حسبت x بهذه الطريقة، هل هي محقة؟ لماذا؟".
2. كشف المفاهيم الخاطئة: ركز على الأخطاء الشائعة (Misconceptions).
3. التنوع: ولد ${count} أسئلة تشمل: تحليل منطقي، فخ رياضي، لغز عددي، ومسألة مفتوحة.
4. التنوع النوعي: استخدم "qcm" للخيارات و "numeric" للتوقعات العددية.

المطلوب: توليد JSON فقط بالهيكل التالي:
{
  "exercises": [
    {
      "id": 1,
      "type": "logic|trap|standard|open|strategic",
      "typeName": "اسم النوع بالعربية",
      "question": "نص السؤال مع LaTeX المغلّف بـ $",
      "options": ["خيارات في حال كان qcm"],
      "answer": "الإجابة الصحيحة",
      "hint": "تلميح يساعد الطالب",
      "kind": "qcm|numeric|text",
      "icon": "إيموجي مناسب",
      "misconception": "اسم المفهوم الخاطئ الذي يكشفه هذا السؤال",
      "badgeColor": "var(--primary) أو var(--destructive) إلخ",
      "badgeBg": "rgba(...) مناسبة",
      "placeholder": "نص المساعدة في الإدخال"
    }
  ]
}`;

    const response = await callGemini(
      [{ role: "user", parts: [{ text: prompt }] }],
      {
        systemInstruction: "أنت خبير في بناء التقييمات التشخيصية العادلة. أجب دائماً بـ JSON صالح فقط.",
        temperature: 0.8,
      }
    );

    const parsed = extractJSON(response.text);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof GeminiError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: err.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
