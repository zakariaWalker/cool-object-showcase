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
    try {
      // Skills mapped to this country+grade via curriculum_mappings
      const { data: maps } = await db
        .from("curriculum_mappings")
        .select("skill_id, chapter_label, semester")
        .eq("country_code", countryCode)
        .eq("grade_code", level);

      let skillIds = (maps || []).map((m: any) => m.skill_id);

      // Fallback: if no mappings yet, use kb_skills.grade
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
          .select("name_ar, name, domain, subdomain, difficulty, bloom_level")
          .in("id", skillIds.slice(0, 40));

        if (skills?.length) {
          const list = skills.map((s: any) =>
            `- ${s.name_ar || s.name} [${s.domain}/${s.subdomain || "—"}] (صعوبة:${s.difficulty || 1})`
          ).join("\n");
          skillContext = `\n\nمهارات منهج ${COUNTRY_NAMES[countryCode] || countryCode} للمستوى ${level} (يجب اختيار أسئلة منها فقط):\n${list}`;
        }
      }
    } catch (e) {
      console.warn("skill context load failed (non-fatal):", e);
    }

    const countryHint = COUNTRY_NAMES[countryCode] || `بلد كود ${countryCode}`;

    const prompt = `أنت خبير بيداغوجي في الرياضيات وفق منهاج ${countryHint}.
المهمة: توليد "تقييم تشخيصي عادل" (Fair Diagnostic) للمستوى ${level} بهذا المنهج بالضبط.
البصمة العشوائية لهذا الطلب: ${seed} (يجب توليد أسئلة مختلفة عن المرات السابقة).
${skillContext}

مبادئ التقييم العادل:
1. التفكير > النتيجة: لا تسأل "احسب x"، بل اسأل "آمال حسبت x بهذه الطريقة، هل هي محقة؟ لماذا؟".
2. كشف المفاهيم الخاطئة الشائعة في هذا المنهج تحديداً.
3. التنوع: ولد ${count} أسئلة تشمل: تحليل منطقي، فخ رياضي، لغز عددي، ومسألة مفتوحة.
4. التنوع النوعي: استخدم "qcm" للخيارات و "numeric" للتوقعات العددية.
5. الالتزام بمصطلحات وأسلوب منهج ${countryHint} (مثلاً عُمان: G7-G12، الجزائر: AM/AS).

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

    const response = await callGemini(
      [{ role: "user", parts: [{ text: prompt }] }],
      {
        systemInstruction: `أنت خبير في بناء التقييمات التشخيصية العادلة وفق منهج ${countryHint}. أجب دائماً بـ JSON صالح فقط.`,
        temperature: 0.8,
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
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
