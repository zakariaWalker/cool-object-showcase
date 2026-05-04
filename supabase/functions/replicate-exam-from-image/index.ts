// ===== Replicate Exam From Image — Vision-based clean extraction =====
// Returns a clean structured exam JSON IGNORING handwriting, stamps, corrections, bleed-through.
// Preserves PRINTED content faithfully: tables (with mixed printed cells & dotted answer cells),
// inline answer slots, figures, and exact answer-space hints for faithful PDF replication.

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

    const prompt = `أنت ناسخ امتحانات رياضيات جزائرية محترف. مهمتك: إعادة بناء هذا الامتحان نظيفاً ومطابقاً تماماً للنسخة المطبوعة الأصلية، بحيث يبدو PDF الناتج نسخة طبق الأصل من الورقة.

🚫 تجاهل تماماً (لا تنسخ أبداً):
- خط اليد للتلميذ (الأرقام/الإجابات/الحسابات بالقلم الأزرق أو الأحمر)
- الأختام الدائرية (الكاشي / cachet rond / الخواتم الإدارية)
- علامات التصحيح الحمراء (✓ ✗ نقاط التصحيح الجانبية)
- النص الباهت من الورقة الخلفية (bleed-through)
- الشطب والخدوش والتصحيحات الجانبية

✅ احتفظ بدقة كاملة بكل ما هو **مطبوع** أصلاً:
- نصوص الأسئلة والتعليمات
- **محتوى الجداول المطبوع**: إذا كانت خلية تحتوي نصاً مطبوعاً (مثل: 25/5 ، 27/10 ، "سبعة وعشرون مئة" ، 10 ، 60 ، 120) → انسخها كما هي
- **خلايا الإجابة الفارغة**: إذا كانت الخلية مطبوعة بنقاط منقطة "..........." أو فارغة لكي يكتب فيها التلميذ → ضع "___" كقيمة
- **حقول الإجابة داخل السطر**: مثل "15/7 = .../..." أو "= ......" → احتفظ بـ "..." في النص (داخل LaTeX إن لزم) لأنها جزء من السؤال المطبوع
- السطور المنقطة الكاملة للإجابة تحت السؤال
- الإطارات/المربعات الفارغة المطبوعة
- الأشكال الهندسية → وصف نصي + موضعها (يسار/يمين/وسط)
- الصيغ الرياضية بـ LaTeX ($...$)
- الكسور بـ \\frac{a}{b}
- النقاط (مثل: "(3ن)" ، "(1.5ن)" ، "(5 نقاط)")
- ترويسة الورقة (المؤسسة، السنة، المستوى، الفصل، النقطة /10)

📋 الصيغة المطلوبة (JSON صالح فقط، لا شيء قبله أو بعده):

{
  "title": "اختبار الفصل الثالث في مادة الرياضيات",
  "school": "ابتدائية علي عرالي",
  "grade": "4 ابتدائي" ,
  "year": "2025/2026",
  "semester": "الفصل الثالث",
  "duration_min": 60,
  "total_points": 10,
  "header_note": "النقطة /10",
  "sections": [
    {
      "title": "التمرين 1",
      "points": 3,
      "instruction": "أكتب الكسور بالحروف أو كُتب:",
      "layout": "table_only" ,
      "sub_questions": [],
      "tables": [
        {
          "headers": null,
          "rows": [
            ["___", "$\\\\frac{25}{5}$", "___", "$\\\\frac{4}{3}$"],
            ["نصف تسعة من أربعين", "$\\\\frac{27}{10}$", "سبعةً وعشرون مئة", ""]
          ],
          "borders": "all"
        }
      ],
      "figures": []
    },
    {
      "title": "التمرين 2",
      "points": 5,
      "instruction": "",
      "sub_questions": [
        {
          "label": "أ",
          "text": "قَرّب إلى الكسور الآتية: $\\\\frac{14}{7}$ ، $\\\\frac{36}{11}$ ، $\\\\frac{20}{8}$ ، $\\\\frac{12}{8}$ :",
          "points": 0,
          "answer_space": "lines",
          "answer_lines": 2
        },
        {
          "label": "ب",
          "text": "اكتُب على شكل كسر غير قابل للتبسيط و كسر مكافئ: $\\\\frac{15}{7} = \\\\frac{...}{...}$ ، $\\\\frac{96}{10} = \\\\frac{...}{...}$ ، $\\\\frac{43}{8} = \\\\frac{...}{...}$",
          "points": 0,
          "answer_space": "none"
        },
        {
          "label": "ج",
          "text": "رتّب الأعداد العشرية الآتية ترتيباً تصاعدياً:",
          "points": 0,
          "answer_space": "box",
          "inline_box_content": "8.6 / 12.38 / 43.9 / 8.15"
        }
      ],
      "tables": [],
      "figures": []
    },
    {
      "title": "التمرين 5",
      "points": 1,
      "instruction": "يُمثّلُ هرمًا رباعيًا، لاحظهُ ثُمَّ أكمل الجدول:",
      "layout": "figure_left_table_right",
      "figures": [
        { "description": "هرم رباعي قاعدته مربعة، يظهر بمنظور ثلاثي الأبعاد بأحرف منقطة للأحرف الخفية", "position": "left" }
      ],
      "tables": [
        {
          "headers": ["اسم المجسم", "عدد الرؤوس", "عدد الأحرف", "عدد الأوجه"],
          "rows": [["___", "___", "___", "___"]],
          "borders": "all"
        }
      ]
    }
  ]
}

⚠️ قواعد صارمة جداً:

1. **لا تفرغ الجداول من محتواها المطبوع!** الخلية التي بها نص مطبوع تبقى بنصها. الخلية المخصصة لإجابة التلميذ فقط تصبح "___".

2. **ميّز بين النص المطبوع وخط اليد**: النص المطبوع له خط ثابت ومنتظم، خط اليد يكون متفاوتاً ومائلاً. تجاهل خط اليد فقط.

3. **حقول الإجابة المضمنة في السؤال** مثل "$\\\\frac{15}{7} = \\\\frac{...}{...}$" أو "= ......" تبقى ضمن نص السؤال، ولا تحتاج answer_space منفصل، استخدم "answer_space": "none".

4. **answer_space**:
   - "lines": سطور منقطة واضحة تحت السؤال (حدد answer_lines)
   - "box": إطار/مربع كبير تحت السؤال للإجابة الطويلة
   - "short": فراغ صغير قصير
   - "table": الإجابة في جدول (استخدم tables)
   - "none": لا يوجد فراغ منفصل (الفراغ مدمج في النص)

5. **layout** على مستوى القسم:
   - "default": تعليمة ثم أسئلة عمودياً
   - "table_only": القسم عبارة عن جدول مباشرة بعد التعليمة
   - "figure_left_table_right" أو "figure_right_table_left": الشكل والجدول جنباً إلى جنب
   - "inline_list": قائمة كسور/أعداد متصلة بفاصلة

6. **inline_box_content**: إذا كان هناك إطار يحتوي قائمة معطاة (مثل أرقام مرتبة)، ضع المحتوى هنا.

7. **الترويسة**: استخرج "header_note" إن وُجد (مثل "النقطة /10" في دائرة).

8. **اللغة**: استخدم نفس الإملاء العربي للنص المطبوع (مع التشكيل إن وُجد).

9. **JSON صالح فقط**. لا تعليقات. لا نص تعريفي.`;

    const parts: any[] = images.map((b64: string) => ({
      inlineData: { mimeType: "image/jpeg", data: b64 },
    }));
    parts.push({ text: prompt });

    let response;
    try {
      response = await callGemini(
        [{ role: "user", parts }],
        {
          model: "gemini-2.5-pro", // upgraded for better vision fidelity on tables/handwriting separation
          temperature: 0.05,
          responseMimeType: "application/json",
          maxOutputTokens: 24000,
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
