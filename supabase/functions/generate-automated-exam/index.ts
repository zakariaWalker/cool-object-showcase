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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");

    const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      throw new Error(`Gemini API error ${aiResponse.status}: ${errText}`);
    }

    const aiData = await aiResponse.json();
    const aiText = aiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) throw new Error("Empty AI response from Gemini");

    return new Response(aiText, {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
