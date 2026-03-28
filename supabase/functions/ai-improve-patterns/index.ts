import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { patterns } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseKey);

    // Process patterns in batches of 10
    const BATCH = 10;
    let improved = 0;

    for (let i = 0; i < patterns.length; i += BATCH) {
      const batch = patterns.slice(i, i + BATCH);

      const prompt = `أنت خبير رياضيات تعليمي متخصص في المنهج الجزائري.

لديك الأنماط التالية وأريد تحسين تسميتها ووصفها وخطواتها. يجب أن تكون:
1. **الاسم**: واضح ودقيق يصف العملية الرياضية بالضبط (مثال: "حل معادلة من الدرجة الثانية بالمميز" بدل "نمط حل المعادلات")
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

      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: "أنت مساعد تعليمي متخصص في تنظيم أنماط حل التمارين الرياضية. أجب باستخدام الأدوات المتاحة فقط." }] },
            { role: "user", parts: [{ text: prompt }] },
          ],
          tools: [{
            function_declarations: [{
              name: "submit_improved_patterns",
              description: "Submit improved pattern names and descriptions",
              parameters: {
                type: "object",
                properties: {
                  patterns: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        name: { type: "string" },
                        description: { type: "string" },
                        steps: { type: "array", items: { type: "string" } },
                        concepts: { type: "array", items: { type: "string" } },
                      },
                      required: ["id", "name", "description", "steps", "concepts"],
                    },
                  },
                },
                required: ["patterns"],
              },
            }],
          }],
          tool_config: {
            function_calling_config: {
              mode: "ANY",
              allowed_function_names: ["submit_improved_patterns"],
            },
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          await new Promise(r => setTimeout(r, 5000));
          i -= BATCH;
          continue;
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "رصيد AI غير كافٍ", improved }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        continue;
      }

      const data = await response.json();
      const toolCall = data.candidates?.[0]?.content?.parts?.[0]?.functionCall;
      if (!toolCall) continue;

      const parsed = toolCall.args;
      if (!parsed) continue;

      for (const p of (parsed.patterns || [])) {
        const { error } = await db.from("kb_patterns").update({
          name: p.name,
          description: p.description,
          steps: p.steps,
          concepts: p.concepts,
        }).eq("id", p.id);

        if (!error) improved++;
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
