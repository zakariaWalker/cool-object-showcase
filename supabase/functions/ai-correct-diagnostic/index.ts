import { callGemini, GeminiError, extractJSON } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { questions, answers } = await req.json();

    const prompt = `أنت مصحح امتحانات رياضيات جزائري خبير. لديك أسئلة امتحان وإجابات طالب.

الأسئلة:
${questions.map((q: any, i: number) => `${i + 1}. [${q.type || "عام"}] [${q.difficulty || "متوسط"}] (${q.points || 0} نقاط)
المفاهيم: ${(q.concepts || []).join("، ")}
النص: ${q.text}`).join("\n\n")}

إجابات الطالب:
${answers.map((a: any) => `السؤال ${questions.findIndex((q: any) => q.id === a.questionId) + 1}:
الإجابة: ${a.answer || "(لم يُجب)"}
الخطوات: ${(a.steps || []).join(" → ") || "(لا توجد)"}
الوقت: ${a.timeSpent}ث، الثقة: ${a.confidence}%`).join("\n\n")}

المطلوب: صحح كل سؤال وأعط:
1. score: النقاط المستحقة (من 0 إلى النقاط القصوى)
2. feedback: تعليق بيداغوجي مختصر (جملة واحدة بالعربية)
3. gaps: قائمة المفاهيم الناقصة (إن وجدت)
4. strengths: نقاط القوة المكتشفة

أعد النتيجة كـ JSON فقط:
{ "corrections": [{ "questionId": "...", "score": N, "maxScore": N, "feedback": "...", "gaps": [...], "strengths": [...] }] }`;

    const response = await callGemini(
      [{ role: "user", parts: [{ text: prompt }] }],
      {
        systemInstruction: "أنت مصحح امتحانات رياضيات بيداغوجي. أجب دائماً بـ JSON صالح فقط.",
        temperature: 0.1,
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
    console.error("Correction error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
