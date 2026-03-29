const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { level, purpose, count = 5 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `أنت خبير بيداغوجي في الرياضيات (المنهاج الجزائري). 
المهمة: توليد "تقييم تشخيصي عادل" (Fair Diagnostic) للمستوى ${level}.

مبادئ التقييم العادل:
1. التفكير > النتيجة: لا تسأل "احسب x"، بل اسأل "آمال حسبت x بهذه الطريقة، هل هي محقة؟ لماذا؟".
2. كشف المفاهيم الخاطئة: ركز على الأخطاء الشائعة (Misconceptions) مثل نسيان حد الوسط، عدم قلب المتراجحة، خطأ في توزيع ln أو exp، إلخ.
3. التنوع: ولد ${count} أسئلة تشمل: تحليل منطقي، فخ رياضي، لغز عددي، ومسألة مفتوحة.
4. التنوع النوعي: استخدم "qcm" للخيارات و "numeric" للتوقعات العددية.

المستوى المستهدف: ${level} 
(4AM = متوسط، 1AS/2AS = ثانوي، 3AS = بكالوريا).

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

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "أنت خبير في بناء التقييمات التشخيصية العادلة. أجب دائماً بـ JSON صالح فقط." },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`AI gateway error: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const aiText = aiData?.choices?.[0]?.message?.content;
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse AI response");

    return new Response(jsonMatch[0], {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
