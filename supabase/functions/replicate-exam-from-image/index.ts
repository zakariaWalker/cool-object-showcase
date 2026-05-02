// ===== Replicate Exam From Image — Vision-based clean extraction =====
// Returns a clean structured exam JSON IGNORING handwriting, stamps, corrections, bleed-through.
// Preserves tables, figures, and answer-space hints for faithful PDF replication.

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
    const { images } = await req.json();
    if (!Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: "Missing images array (base64 strings)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `أنت ناسخ امتحانات رياضيات جزائرية محترف. مهمتك: إعادة كتابة هذا الامتحان نظيفاً ومنظماً ومطابقاً للأصل المطبوع.

🚫 تجاهل تماماً (لا تنسخ أبداً):
- خط اليد للتلميذ (الأرقام والإجابات والحسابات المكتوبة بالقلم)
- الأختام الدائرية (الكاشي / cachet / الخواتم الإدارية)
- علامات التصحيح (✓ ✗ نقاط حمراء)
- الكتابة الباهتة من الورقة الخلفية (bleed-through / النص المعكوس)
- الشطب أو الخدوش أو التصحيحات
- التعليقات الهامشية بخط اليد
- الأرقام الصغيرة المكتوبة فوق الأرقام المطبوعة

✅ انسخ بدقة كاملة (وأعد بناءها فارغة كما كانت أصلاً):
- نص الأسئلة المطبوعة كاملاً
- **الجداول** (بكل أعمدتها وصفوفها) — أعدها فارغة كما طُبعت أصلاً، مع رؤوس الأعمدة والصفوف فقط، بدون ما كتبه التلميذ
- **حقول الإجابة** (السطور المنقطة ......، المربعات الفارغة، الإطارات الفارغة)
- الصيغ الرياضية (LaTeX بين $...$)
- الكسور المطبوعة (استخدم \\frac{a}{b})
- الأشكال الهندسية (وصف نصي دقيق)
- النقاط المخصصة لكل تمرين/سؤال

📋 الصيغة المطلوبة (JSON فقط):
{
  "title": "العنوان كما يظهر مطبوعاً",
  "school": "اسم المؤسسة",
  "grade": "4 ابتدائي | 4AM | 3AS ...",
  "year": "2024/2025",
  "semester": "الفصل الأول/الثاني/الثالث",
  "duration_min": 60,
  "total_points": 10,
  "sections": [
    {
      "title": "التمرين الأول",
      "points": 1,
      "instruction": "نص التعليمة الرئيسية فقط (بدون نص الأسئلة الفرعية)",
      "sub_questions": [
        {
          "label": "أ" | "ب" | "1" | "2" | null,
          "text": "نص السؤال الفرعي مع الصيغ بـ LaTeX",
          "points": 0.5,
          "answer_space": "lines" | "box" | "short" | "table" | "none",
          "answer_lines": 3
        }
      ],
      "tables": [
        {
          "headers": ["العمود1", "العمود2", "العمود3"],
          "rows": [
            ["خلية مطبوعة أو فارغة", "", ""],
            ["", "", ""]
          ]
        }
      ],
      "figures": [
        { "description": "وصف الشكل: هرم رباعي قاعدته مربعة ABCD ورأسه S" }
      ]
    }
  ]
}

⚠️ قواعد صارمة:
- أي خانة في الجدول كانت مخصصة لإجابة التلميذ → أعدها كنص فارغ "" (لا تضع ما كتبه)
- إذا كان السؤال يحتوي على سطور منقطة للإجابة → answer_space: "lines" مع answer_lines = عدد السطور التقريبي
- إذا كان السؤال يحتوي على إطار/مربع فارغ → answer_space: "box"
- إذا كان السؤال قصيراً جداً (= ، أو فراغ صغير) → answer_space: "short"
- إذا كانت الإجابة في جدول → answer_space: "table" واترك tables ضمن نفس القسم
- "الوضعية الإدماجية" = قسم منفصل بنفس العنوان
- استخرج النقاط من (1ن) أو (1.5ن) أو (3 نقاط)
- لا تخترع محتوى غير موجود
- أعد JSON صالحاً فقط، بدون أي نص قبله أو بعده`;

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
