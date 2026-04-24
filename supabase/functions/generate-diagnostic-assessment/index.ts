import { callGemini, GeminiError, extractJSON } from "../_shared/gemini.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COUNTRY_NAMES: Record<string, string> = {
  DZ: "الجزائر (المنهاج الجزائري الرسمي)",
  OM: "سلطنة عُمان (المنهاج العُماني الرسمي)",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { level, countryCode = "DZ", purpose, count = 5, seed = Math.random() } = await req.json();

    // Pull skills + curriculum mapping for this country/grade to ground the AI
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseKey);

    let skillContext = "";
    let exerciseContext = "";
    let misconceptionContext = "";
    try {
      // 1) Skills mapped to this country+grade via curriculum_mappings
      const { data: maps } = await db
        .from("curriculum_mappings")
        .select("skill_id, chapter_label, semester")
        .eq("country_code", countryCode)
        .eq("grade_code", level);

      let skillIds = (maps || []).map((m: any) => m.skill_id);

      // Fallback: kb_skills.grade
      if (skillIds.length === 0) {
        const { data: gskills } = await db
          .from("kb_skills")
          .select("id")
          .eq("grade", level)
          .limit(40);
        skillIds = (gskills || []).map((s: any) => s.id);
      }

      if (skillIds.length > 0) {
        const { data: skills } = await db
          .from("kb_skills")
          .select("id, name_ar, name, domain, subdomain, difficulty, bloom_level")
          .in("id", skillIds.slice(0, 40));

        if (skills?.length) {
          const list = skills.map((s: any) =>
            `- ${s.name_ar || s.name} [${s.domain}/${s.subdomain || "—"}] (صعوبة:${s.difficulty || 1})`
          ).join("\n");
          skillContext = `\n\n## مهارات منهج ${COUNTRY_NAMES[countryCode] || countryCode} للمستوى ${level} (المرجع الرسمي):\n${list}`;

          // 2) Common misconceptions for these skills
          const { data: errors } = await db
            .from("kb_skill_errors")
            .select("error_description, fix_hint, severity")
            .in("skill_id", skills.map((s: any) => s.id))
            .order("frequency", { ascending: false })
            .limit(15);
          if (errors?.length) {
            misconceptionContext = `\n\n## أخطاء شائعة موثَّقة في قاعدة المعرفة لهذه المهارات (يجب أن يستهدفها التشخيص):\n` +
              errors.map((e: any) => `- ${e.error_description}${e.fix_hint ? ` (تصحيح: ${e.fix_hint})` : ""}`).join("\n");
          }
        }
      }

      // 3) Sample of real exercises from the country's KB at this grade — gives the AI authentic style
      const { data: exs } = await db
        .from("kb_exercises")
        .select("text, type, difficulty, bloom_level")
        .eq("country_code", countryCode)
        .eq("grade", level)
        .order("difficulty", { ascending: true })
        .limit(8);
      if (exs?.length) {
        exerciseContext = `\n\n## أمثلة على تمارين حقيقية من قاعدة المعرفة لهذا المستوى (للأسلوب فقط — لا تنسخها حرفياً):\n` +
          exs.map((e: any, i: number) => `${i + 1}. [${e.type || "—"}] ${e.text.slice(0, 240)}`).join("\n");
      }
    } catch (e) {
      console.warn("KB context load failed (non-fatal):", e);
    }

    const countryHint = COUNTRY_NAMES[countryCode] || `بلد كود ${countryCode}`;

    const prompt = `أنت خبير بيداغوجي في الرياضيات وفق منهاج ${countryHint}.
المهمة: توليد "تقييم تشخيصي عادل" (Fair Diagnostic) للمستوى ${level} بهذا المنهج بالضبط.
البصمة العشوائية لهذا الطلب: ${seed} (يجب توليد أسئلة مختلفة عن المرات السابقة).
${skillContext}${misconceptionContext}${exerciseContext}

## مبادئ التقييم العادل:
1. **التفكير > النتيجة**: لا تسأل "احسب x"، بل اسأل "آمال حسبت x بهذه الطريقة، هل هي محقة؟ لماذا؟".
2. **استهداف المفاهيم الخاطئة الموثَّقة أعلاه** كلما أمكن (هذا هو هدف التشخيص الأساسي).
3. **التنوع الكامل**: ولّد ${count} أسئلة تشمل بالضبط: تحليل منطقي، فخ رياضي، لغز عددي، مسألة مفتوحة، وسؤال استراتيجي.
4. **الاستناد إلى قاعدة المعرفة**: استخدم المهارات المذكورة أعلاه كمرجع — لا تخترع مفاهيم خارج المنهج.
5. **الالتزام بمصطلحات وأسلوب منهج ${countryHint}** (مثلاً عُمان: G7-G12، الجزائر: AM/AS).
6. **التنوع النوعي**: استخدم "qcm" للخيارات و "numeric" للتوقعات العددية.

## المطلوب: توليد JSON فقط بالهيكل التالي:
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
      "misconception": "اسم المفهوم الخاطئ الذي يكشفه هذا السؤال (يفضَّل من القائمة أعلاه)",
      "badgeColor": "var(--primary) أو var(--destructive) إلخ",
      "badgeBg": "rgba(...) مناسبة",
      "placeholder": "نص المساعدة في الإدخال"
    }
  ]
}

## قواعد صارمة لصلاحية JSON:
- أعد JSON خام فقط بدون أي شرح أو markdown fences.
- داخل أي نص يحتوي LaTeX يجب تهريب الشرطة العكسية هكذا: \\sqrt و \\frac وليس \sqrt أو \frac.
- لا تستخدم أي escape غير صالح داخل السلاسل النصية.
- إذا لم تحتج حقلاً اختيارياً فاحذفه بدلاً من وضع قيمة غير صالحة.`;

    const response = await callGemini(
      [{ role: "user", parts: [{ text: prompt }] }],
      {
        systemInstruction: `أنت خبير في بناء التقييمات التشخيصية العادلة وفق منهج ${countryHint}. أجب دائماً بـ JSON صالح فقط.`,
        temperature: 0.8,
        responseMimeType: "application/json",
      }
    );

    const parsed = extractJSON(response.text);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof GeminiError) {
      // For rate limits / overload, return a graceful fallback so the user still sees a diagnostic
      if (err.status === 429 || err.status === 503) {
        console.warn(`[diagnostic] AI ${err.status} — returning fallback exercises`);
        return new Response(
          JSON.stringify({ exercises: getFallbackPool(), fallback: true, reason: err.code }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
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

function getFallbackPool() {
  const pool = [
    { id: 101, type: "logic", typeName: "تحليل منطقي",
      question: "قالت آمال: $(x+5)^2 = x^2 + 25$. هل هي محقة؟",
      options: ["نعم، صحيحة", "لا، خطأ في القواعد"], answer: "لا، خطأ في القواعد",
      hint: "تذكر مربع المجموع.", kind: "qcm", icon: "💡",
      misconception: "خطأ في توزيع القوى", badgeColor: "var(--algebra)", badgeBg: "rgba(167,139,250,0.08)" },
    { id: 102, type: "trap", typeName: "فخ المتراجحات",
      question: "حل المتراجحة: $-3x > 9$ هو:",
      options: ["$x > -3$", "$x < -3$", "$x > 3$", "$x < 3$"], answer: "$x < -3$",
      hint: "ماذا يحدث عند الضرب في عدد سالب؟", kind: "qcm", icon: "🪤",
      misconception: "نسيان قلب المتراجحة", badgeColor: "var(--destructive)", badgeBg: "rgba(248,113,113,0.08)" },
    { id: 103, type: "standard", typeName: "حساب ذهني",
      question: "ما هو نصف $2^{10}$؟",
      options: ["$1^{10}$", "$2^5$", "$2^9$", "$1^5$"], answer: "$2^9$",
      hint: "القسمة على 2 = طرح 1 من الأس.", kind: "qcm", icon: "🔢",
      misconception: "خطأ في قوانين الأسس", badgeColor: "var(--primary)", badgeBg: "rgba(59,130,246,0.08)" },
    { id: 104, type: "logic", typeName: "تحدي المساحات",
      question: "إذا ضاعفنا طول ضلع مربع، هل تتضاعف مساحته؟",
      options: ["نعم، تتضاعف", "لا، تصبح 4 أضعاف", "لا، تصبح 8 أضعاف"], answer: "لا، تصبح 4 أضعاف",
      hint: "$(2s)^2 = ?$", kind: "qcm", icon: "📐",
      misconception: "عدم إدراك التغير التربيعي", badgeColor: "var(--geometry)", badgeBg: "rgba(16,185,129,0.08)" },
    { id: 105, type: "strategic", typeName: "تفكير تراجعي",
      question: "عدد إذا أضفنا له 5 ثم ضربناه في 2 حصلنا على 20. ما هو؟",
      answer: "5", hint: "ابدأ من النتيجة وارجع للخلف.", kind: "numeric", icon: "🎯",
      misconception: "صعوبة في النمذجة العكسية", badgeColor: "var(--accent)", badgeBg: "rgba(245,158,11,0.08)",
      placeholder: "اكتب العدد فقط..." },
  ];
  return pool;
}
