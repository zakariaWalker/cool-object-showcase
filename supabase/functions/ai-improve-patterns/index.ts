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
    const { patterns } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseKey);

    const BATCH = 10;
    let improved = 0;

    for (let i = 0; i < patterns.length; i += BATCH) {
      const batch = patterns.slice(i, i + BATCH);

      const prompt = `أنت خبير رياضيات تعليمي متخصص في المنهج الجزائري.

لديك الأنماط التالية وأريد تحسين تسميتها ووصفها وخطواتها. يجب أن تكون:
1. **الاسم**: واضح ودقيق يصف العملية الرياضية بالضبط
2. **الوصف**: جملة أو اثنتين تشرح متى ولماذا يُستخدم هذا النمط
3. **الخطوات**: واضحة ومرتبة ومحددة (4-7 خطوات)
4. **المفاهيم**: قائمة المفاهيم الرياضية المطلوبة (3-5 مفاهيم)

## الأنماط للتحسين:
${batch.map((p: any) => `ID: ${p.id}
الاسم الحالي: ${p.name}
النوع: ${p.type}
الوصف: ${p.description || "غير متوفر"}
الخطوات: ${(p.steps || []).join(" → ") || "غير متوفرة"}
المفاهيم: ${(p.concepts || []).join(", ") || "غير متوفرة"}
---`).join("\n")}`;

      try {
        const response = await callGemini(
          [{ role: "user", parts: [{ text: prompt }] }],
          {
            systemInstruction: "أنت مساعد تعليمي متخصص في تنظيم أنماط حل التمارين الرياضية. أجب باستخدام الأدوات المتاحة فقط.",
            temperature: 0.2,
            tools: [{
              functionDeclarations: [{
                name: "submit_improved_patterns",
                description: "Submit improved pattern names and descriptions",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    patterns: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          id: { type: "STRING" },
                          name: { type: "STRING" },
                          description: { type: "STRING" },
                          steps: { type: "ARRAY", items: { type: "STRING" } },
                          concepts: { type: "ARRAY", items: { type: "STRING" } },
                        },
                        required: ["id", "name", "description", "steps", "concepts"],
                      },
                    },
                  },
                  required: ["patterns"],
                },
              }],
            }],
            toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["submit_improved_patterns"] } },
          }
        );

        if (!response.toolCalls || response.toolCalls.length === 0) continue;
        const parsed = response.toolCalls[0].args;

        for (const p of (parsed.patterns || [])) {
          const { error } = await db.from("kb_patterns").update({
            name: p.name,
            description: p.description,
            steps: p.steps,
            concepts: p.concepts,
          }).eq("id", p.id);

          if (!error) improved++;
        }
      } catch (err) {
        if (err instanceof GeminiError && err.code === "RATE_LIMIT") {
          await new Promise(r => setTimeout(r, 5000));
          i -= BATCH;
          continue;
        }
        if (err instanceof GeminiError && err.code === "QUOTA") {
          return new Response(JSON.stringify({ error: "رصيد API غير كافٍ", improved }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("Batch error:", err);
        continue;
      }

      if (i + BATCH < patterns.length) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    return new Response(JSON.stringify({ success: true, improved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-improve-patterns error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
