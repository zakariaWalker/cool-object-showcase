// ===== Replicate Exam From Image — Vision-based clean extraction =====
// Takes one or more exam page images and returns a clean, structured exam JSON
// IGNORING all handwriting, student notes, stamps (cachet), corrections, and bleed-through.
// The output is fully editable in the Exam Builder.

import { callGemini, GeminiError, extractJSON } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { images, hint_grade, hint_format } = await req.json();
    if (!Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: "Missing images array (base64 strings)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `أنت ناسخ امتحانات رياضيات جزائرية محترف. مهمتك: إعادة كتابة هذا الامتحان بشكل نظيف ومنظّم.

🚫 تجاهل تماماً (لا تنسخ أبداً):
- خط اليد للتلميذ (الأرقام والإجابات المكتوبة بالقلم)
- الأختام الدائرية (الكاشي / cachet)
- علامات التصحيح (✓ ✗ نقاط حمراء)
- الكتابة الباهتة من الورقة الخلفية (bleed-through)
- الشطب أو الخدوش
- أي تعليقات هامشية بخط اليد

✅ انسخ فقط (بدقة كاملة):
- نص الأسئلة المطبوعة
- الجداول الفارغة الأصلية (بدون ما كتبه التلميذ بداخلها)
- الصيغ الرياضية (استخدم LaTeX بين $...$)
- الأرقام والكسور المطبوعة
- الأشكال الهندسية (وصفها نصياً)
- النقاط المخصصة لكل تمرين

📋 الهيكل المطلوب JSON فقط:
{
  "title": "عنوان الامتحان كما يظهر مطبوعاً",
  "school": "اسم المؤسسة إن ظهر",
  "grade": "المستوى (مثل: 4 ابتدائي, 4AM, 3AS)",
  "year": "السنة الدراسية مثل 2024/2025",
  "semester": "الفصل الأول/الثاني/الثالث إن ذُكر",
  "duration_min": 60,
  "total_points": 10,
  "sections": [
    {
      "title": "التمرين الأول",
      "points": 1,
      "instruction": "نص التعليمة الرئيسية للتمرين",
      "sub_questions": [
        { "label": "أ", "text": "نص السؤال الفرعي مع الصيغ الرياضية بـ LaTeX", "points": 0.5, "answer_space": "table|lines|box|short" }
      ],
      "tables": [
        { "headers": ["العمود1","العمود2"], "rows": [["خلية","خلية"]] }
      ],
      "figures": [
        { "description": "وصف الشكل الهندسي مثل: هرم رباعي قاعدته مربعة" }
      ]
    }
  ]
}

⚠️ مهم:
- إذا كان هناك "وضعية إدماجية" اجعلها قسماً منفصلاً بعنوان "الوضعية الإدماجية"
- حافظ على ترقيم التمارين الأصلي
- استخرج النقاط من بين الأقواس مثل (1ن) أو (1.5ن)
- لا تخترع محتوى غير موجود
- أعد JSON فقط بدون أي نص قبله أو بعده`;

    const parts: any[] = images.map((b64: string) => ({
      inlineData: { mimeType: "image/jpeg", data: b64 },
    }));
    parts.push({ text: prompt });

    let response;
    try {
      response = await callGemini(
        [{ role: "user", parts }],
        {
          model: "gemini-2.5-flash",
          temperature: 0.05,
          responseMimeType: "application/json",
          maxOutputTokens: 16384,
        }
      );
    } catch (err) {
      const msg = err instanceof GeminiError ? err.message : (err as Error).message;
      return new Response(JSON.stringify({ error: msg }), {
        status: err instanceof GeminiError ? err.status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.text) {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = extractJSON(response.text);
    } catch (parseErr) {
      return new Response(JSON.stringify({
        error: "JSON parse failed",
        details: (parseErr as Error).message,
        raw: response.text.slice(0, 800),
      }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, exam: parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
