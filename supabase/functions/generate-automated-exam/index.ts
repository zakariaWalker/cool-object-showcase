const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, template, grade, patterns, kbExam, style } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let prompt = "";
    if (mode === "synthetic") {
      prompt = `أنت خبير في بناء امتحانات الرياضيات الجزائرية وفق معايير الجيل الثاني.
قم ببناء امتحان كامل بصيغة ${template.labelAr} للمستوى ${grade}.

المعايير البيداغوجية المستهدفة:
- منحنى الصعوبة: ${patterns?.difficultyCurve || 'linear'}
- نسبة الأسئلة غير المباشرة: ${patterns?.explicitImplicitRatio || 0.4}
- ملاحظات هيكلية: ${patterns?.structuralNotes || 'توزيع متوازن'}

الأسلوب البصري:
- أعمدة: ${style?.layout?.columns || 1}
- تباعد: ${style?.layout?.spacing || 'normal'}

المطلوب: توليد امتحان JSON كامل يحتوي على الأقسام والتمارين المناسبة لكل قسم في القالب المرفق.
قالب الأقسام: ${JSON.stringify(template.sections)}

أعد النتيجة كـ JSON فقط بالهيكل التالي:
{
  "exam": {
    "title": "عنوان الامتحان",
    "format": "${template.format}",
    "grade": "${grade}",
    "duration": ${template.duration},
    "totalPoints": ${template.totalPoints},
    "sections": [
      {
        "id": "section_id",
        "title": "عنوان القسم",
        "points": 5,
        "exercises": [
          {
            "id": "unique_id",
            "text": "نص التمرين مع LaTeX",
            "points": 5,
            "type": "algebra|geometry...",
            "source": "ai"
          }
        ]
      }
    ]
  }
}`;
    } else {
      prompt = `أنت خبير تربوي. قم بتطوير وتحسين هذا الامتحان المقترح المستخرج من قاعدة البيانات ليطابق المعايير البيداغوجية الحديثة.
الامتحان الحالي: ${JSON.stringify(kbExam)}

المطلوب:
1. حافظ على جوهر التمارين لتبقى واقعية (Authentic).
2. قم بتحسين صياغة الأسئلة لتطابق منحنى الصعوبة: ${patterns?.difficultyCurve || 'linear'}.
3. تأكد من أن التنقيط والمهارات المعرفية تتناسب مع النمط الرسمي المعاصر.

أعد النتيجة بنفس هيكل JSON الخاص بالامتحان المرفق.`;
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "أنت خبير في بناء امتحانات الرياضيات الجزائرية. أجب دائماً بـ JSON صالح فقط." },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات. حاول مرة أخرى لاحقاً." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار في استخدام AI." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      throw new Error(`AI gateway error ${aiResponse.status}: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const aiText = aiData?.choices?.[0]?.message?.content;
    if (!aiText) throw new Error("Empty AI response");

    // Extract JSON from response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Could not parse AI response as JSON");

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
