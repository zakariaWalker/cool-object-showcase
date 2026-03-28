import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, template, grade, patterns, kbExam, style } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

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
      // Hybrid mode
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
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      }),
    });

    const aiData = await aiResponse.json();
    const aiText = aiData?.choices?.[0]?.message?.content || "";
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
