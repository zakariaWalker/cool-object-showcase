import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { callGemini, GeminiError } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { exerciseId, studentLevel, mode } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseKey);

    const { data: exercise } = await db.from("kb_exercises").select("*").eq("id", exerciseId).single();
    if (!exercise) throw new Error("التمرين غير موجود");

    const { data: deconstructions } = await db.from("kb_deconstructions").select("*").eq("exercise_id", exerciseId);
    
    // RAG: fetch semantically similar content for richer context
    let ragContext = "";
    try {
      const apiKey = Deno.env.get("GEMINI_API_KEY")!;
      const embUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;
      const embRes = await fetch(embUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text: exercise.text.slice(0, 2000) }] },
          taskType: "RETRIEVAL_QUERY",
        }),
      });
      if (embRes.ok) {
        const embData = await embRes.json();
        const queryEmb = embData.embedding?.values;
        if (queryEmb?.length) {
          const { data: similar } = await db.rpc("match_kb_embeddings", {
            query_embedding: JSON.stringify(queryEmb),
            match_threshold: 0.4,
            match_count: 5,
            filter_type: null,
          });
          if (similar?.length) {
            ragContext = "\n\n## محتوى مشابه من قاعدة المعرفة:\n" +
              similar.map((s: any) => `[${s.content_type}] (تشابه ${(s.similarity * 100).toFixed(0)}%): ${s.content_text?.slice(0, 200)}`).join("\n\n");
          }
        }
      }
    } catch (ragErr) {
      console.warn("RAG enrichment failed (non-fatal):", ragErr);
    }

    let patternInfo = "";
    if (deconstructions && deconstructions.length > 0) {
      const patternIds = [...new Set(deconstructions.map((d: any) => d.pattern_id))];
      const { data: patterns } = await db.from("kb_patterns").select("*").in("id", patternIds);
      
      if (patterns && patterns.length > 0) {
        patternInfo = patterns.map((p: any) => {
          const decon = deconstructions.find((d: any) => d.pattern_id === p.id);
          return `النمط: ${p.name}\nالنوع: ${p.type}\nالوصف: ${p.description || ""}\nالخطوات: ${(decon?.steps || p.steps || []).join(" → ")}\nالمفاهيم المطلوبة: ${(decon?.needs || p.concepts || []).join("، ")}\nملاحظات: ${decon?.notes || ""}`;
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
${ragContext}

## مستوى التلميذ: ${levelDesc}

## المطلوب:
${modePrompt}

## قواعد:
- استخدم LaTeX بين $ للصيغ الرياضية (مثل $x^2 + 3x = 0$)
- رقّم كل خطوة
- في نهاية كل خطوة اذكر المفهوم المستخدم بين قوسين
- في النهاية اذكر الأخطاء الشائعة إن وجدت
- اجعل الشرح مناسباً لتلميذ جزائري`;

    const response = await callGemini(
      [{ role: "user", parts: [{ text: prompt }] }],
      {
        systemInstruction: "أنت مدرّس رياضيات خبير متخصص في المنهاج الجزائري. تشرح بالعربية بوضوح وبساطة.",
        temperature: 0.2,
      }
    );

    return new Response(JSON.stringify({ 
      success: true, 
      explanation: response.text,
      exercise: { id: exercise.id, text: exercise.text, grade: exercise.grade, type: exercise.type },
      pattern: patternInfo ? deconstructions?.[0] : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof GeminiError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("ai-tutor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير متوقع" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
