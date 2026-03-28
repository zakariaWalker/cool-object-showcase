import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { exercises, patterns, batchSize = 5 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseKey);

    // Build pattern context
    const patternList = patterns.map((p: any) =>
      `- ID: ${p.id} | Name: ${p.name} | Type: ${p.type} | Steps: ${(p.steps || []).join(" → ")}`
    ).join("\n");

    const results: any[] = [];

    // Process in batches
    for (let i = 0; i < exercises.length; i += batchSize) {
      const batch = exercises.slice(i, i + batchSize);

      const prompt = `أنت خبير رياضيات تعليمي جزائري. قم بتفكيك التمارين التالية إلى أنماط حل.

## الأنماط المتاحة:
${patternList}

## التمارين للتفكيك:
${batch.map((e: any, idx: number) => `### تمرين ${idx + 1} (ID: ${e.id}, النوع: ${e.type}, المستوى: ${e.grade})
${e.text}`).join("\n\n")}

## المطلوب:
لكل تمرين، أعطني:
1. pattern_id: معرف النمط الأنسب من القائمة أعلاه (إذا لم يوجد نمط مناسب، اقترح اسم نمط جديد)
2. steps: خطوات الحل المحددة لهذا التمرين (3-6 خطوات)
3. needs: المفاهيم المسبقة المطلوبة (2-4 مفاهيم)
4. notes: ملاحظة قصيرة عن صعوبة أو خصوصية التمرين
5. new_pattern: إذا اقترحت نمطاً جديداً، أعطني: name, type, description, steps, concepts

أجب بـ JSON فقط.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.0-flash",
          messages: [
            { role: "system", content: "أنت مساعد تعليمي متخصص في تحليل التمارين الرياضية. أجب دائماً بـ JSON صالح فقط." },
            { role: "user", content: prompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "submit_deconstructions",
              description: "Submit exercise deconstructions",
              parameters: {
                type: "object",
                properties: {
                  deconstructions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        exercise_id: { type: "string" },
                        pattern_id: { type: "string" },
                        steps: { type: "array", items: { type: "string" } },
                        needs: { type: "array", items: { type: "string" } },
                        notes: { type: "string" },
                        new_pattern: {
                          type: "object",
                          properties: {
                            name: { type: "string" },
                            type: { type: "string" },
                            description: { type: "string" },
                            steps: { type: "array", items: { type: "string" } },
                            concepts: { type: "array", items: { type: "string" } },
                          },
                        },
                      },
                      required: ["exercise_id", "pattern_id", "steps", "needs", "notes"],
                    },
                  },
                },
                required: ["deconstructions"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "submit_deconstructions" } },
        }),
      });

      if (!response.ok) {
        const status = response.status;
        const text = await response.text();
        console.error(`AI error ${status}:`, text);
        if (status === 429) {
          // Wait and retry
          await new Promise(r => setTimeout(r, 5000));
          i -= batchSize; // retry this batch
          continue;
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "رصيد AI غير كافٍ. يرجى شحن الرصيد.", results }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        continue; // skip this batch on other errors
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) continue;

      let parsed;
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse tool call arguments");
        continue;
      }

      const deconstructions = parsed.deconstructions || [];

      for (const d of deconstructions) {
        // If new pattern suggested, create it
        if (d.new_pattern && d.new_pattern.name) {
          const newPatId = crypto.randomUUID();
          await db.from("kb_patterns").upsert({
            id: newPatId,
            name: d.new_pattern.name,
            type: d.new_pattern.type || "",
            description: d.new_pattern.description || "",
            steps: d.new_pattern.steps || [],
            concepts: d.new_pattern.concepts || [],
          });
          d.pattern_id = newPatId;
        }

        // Insert deconstruction
        const { error: deconErr } = await db.from("kb_deconstructions").insert({
          exercise_id: d.exercise_id,
          pattern_id: d.pattern_id,
          steps: d.steps || [],
          needs: d.needs || [],
          notes: d.notes || "",
          ai_generated: true,
        });

        if (!deconErr) {
          // Mark exercise as AI deconstructed
          await db.from("kb_exercises").update({ ai_deconstructed: true }).eq("id", d.exercise_id);
          results.push({ exerciseId: d.exercise_id, patternId: d.pattern_id, success: true });
        } else {
          console.error("Insert error:", deconErr);
          results.push({ exerciseId: d.exercise_id, success: false, error: deconErr.message });
        }
      }

      // Small delay between batches
      if (i + batchSize < exercises.length) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-deconstruct error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
