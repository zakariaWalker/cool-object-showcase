const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { questions, answers } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "أنت مصحح امتحانات رياضيات بيداغوجي. أجب دائماً بـ JSON صالح فقط." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      throw new Error(`AI error ${aiResponse.status}: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const aiText = aiData?.choices?.[0]?.message?.content;
    if (!aiText) throw new Error("Empty AI response");

    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse AI JSON");

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Correction error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
