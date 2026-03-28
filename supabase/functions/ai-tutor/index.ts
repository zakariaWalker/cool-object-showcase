import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { exerciseId, studentLevel, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseKey);

    // Fetch exercise + its deconstructions + pattern
    const { data: exercise } = await db.from("kb_exercises").select("*").eq("id", exerciseId).single();
    if (!exercise) throw new Error("التمرين غير موجود");

    const { data: deconstructions } = await db.from("kb_deconstructions").select("*").eq("exercise_id", exerciseId);
    
    let patternInfo = "";
    if (deconstructions && deconstructions.length > 0) {
      const patternIds = [...new Set(deconstructions.map((d: any) => d.pattern_id))];
      const { data: patterns } = await db.from("kb_patterns").select("*").in("id", patternIds);
      
      if (patterns && patterns.length > 0) {
        patternInfo = patterns.map((p: any) => {
          const decon = deconstructions.find((d: any) => d.pattern_id === p.id);
          return `النمط: ${p.name}
النوع: ${p.type}
الوصف: ${p.description || ""}
الخطوات: ${(decon?.steps || p.steps || []).join(" → ")}
المفاهيم المطلوبة: ${(decon?.needs || p.concepts || []).join("، ")}
ملاحظات: ${decon?.notes || ""}`;
        }).join("\n\n");
      }
    }

    const levelDesc = studentLevel === "beginner" ? "مبتدئ — اشرح ببساطة شديدة مع أمثلة"
      : studentLevel === "intermediate" ? "متوسط — اشرح بوضوح مع بعض التفصيل"
      : "متقدم — اشرح بدقة رياضية مع البراهين";

    const modePrompt = mode === "solve" 
      ? "اشرح الحل خطوة بخطوة. لكل خطوة اذكر لماذا نقوم بها."
      : mode === "hint"
      ? "أعطِ تلميحاً واحداً فقط يساعد التلميذ دون إعطاء الحل الكامل."
      : "اشرح الأخطاء الشائعة في هذا النوع من التمارين وكيف يتجنبها التلميذ.";

    const prompt = `أنت مدرّس رياضيات للمنهاج الجزائري. تتحدث بالعربية الفصحى البسيطة.

## التمرين:
${exercise.text}

## المستوى: ${exercise.grade || "غير محدد"}
## النوع: ${exercise.type || "غير مصنف"}

## معلومات قاعدة المعرفة:
${patternInfo || "لا توجد معلومات KB لهذا التمرين"}

## مستوى التلميذ: ${levelDesc}

## المطلوب:
${modePrompt}

## قواعد:
- استخدم LaTeX بين $ للصيغ الرياضية (مثل $x^2 + 3x = 0$)
- رقّم كل خطوة
- في نهاية كل خطوة اذكر المفهوم المستخدم بين قوسين
- في النهاية اذكر الأخطاء الشائعة إن وجدت
- اجعل الشرح مناسباً لتلميذ جزائري`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
        messages: [
          { role: "system", content: "أنت مدرّس رياضيات خبير متخصص في المنهاج الجزائري. تشرح بالعربية بوضوح وبساطة." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI error:", response.status, text);
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "رصيد AI غير كافٍ" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error: ${response.status}`);
    }

    const data = await response.json();
    const explanation = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ 
      success: true, 
      explanation,
      exercise: { id: exercise.id, text: exercise.text, grade: exercise.grade, type: exercise.type },
      pattern: patternInfo ? deconstructions?.[0] : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-tutor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير متوقع" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
