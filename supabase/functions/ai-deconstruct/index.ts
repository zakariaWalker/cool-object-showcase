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
    const { exercises: rawExercises, patterns, batchSize: rawBatchSize = 3 } = await req.json();

    // Cap to avoid 150s edge timeout — client must chunk larger jobs
    const MAX_PER_REQUEST = 6;
    const batchSize = Math.min(rawBatchSize, 3);
    const exercises = (rawExercises || []).slice(0, MAX_PER_REQUEST);
    const truncated = (rawExercises || []).length > MAX_PER_REQUEST;
    const startTime = Date.now();
    const TIME_BUDGET_MS = 130_000; // leave headroom before 150s timeout

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseKey);

    const patternList = (patterns || []).map((p: any) =>
      `- ID: ${p.id} | Name: ${p.name} | Type: ${p.type} | Steps: ${(p.steps || []).join(" → ")}`
    ).join("\n");

    const results: any[] = [];
    const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || "");

    for (let i = 0; i < exercises.length; i += batchSize) {
      if (Date.now() - startTime > TIME_BUDGET_MS) {
        console.warn("Time budget exceeded, stopping early");
        break;
      }
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
5. new_pattern: إذا اقترحت نمطاً جديداً، أعطني: name, type, description, steps, concepts`;

      try {
        const response = await callGemini(
          [{ role: "user", parts: [{ text: prompt }] }],
          {
            systemInstruction: "أنت مساعد تعليمي متخصص في تحليل التمارين الرياضية. أجب دائماً باستخدام الأدوات المتاحة.",
            temperature: 0.2,
            tools: [{
              functionDeclarations: [{
                name: "submit_deconstructions",
                description: "Submit exercise deconstructions",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    deconstructions: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          exercise_id: { type: "STRING" },
                          pattern_id: { type: "STRING" },
                          steps: { type: "ARRAY", items: { type: "STRING" } },
                          needs: { type: "ARRAY", items: { type: "STRING" } },
                          notes: { type: "STRING" },
                          new_pattern: {
                            type: "OBJECT",
                            properties: {
                              name: { type: "STRING" },
                              type: { type: "STRING" },
                              description: { type: "STRING" },
                              steps: { type: "ARRAY", items: { type: "STRING" } },
                              concepts: { type: "ARRAY", items: { type: "STRING" } },
                            },
                          },
                        },
                        required: ["exercise_id", "pattern_id", "steps", "needs", "notes"],
                      },
                    },
                  },
                  required: ["deconstructions"],
                },
              }],
            }],
            toolConfig: { functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["submit_deconstructions"] } },
          }
        );

        if (!response.toolCalls || response.toolCalls.length === 0) continue;

        const parsed = response.toolCalls[0].args;
        const deconstructions = parsed.deconstructions || [];

        for (const d of deconstructions) {
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

          // Skip if pattern_id is not a valid UUID (e.g. AI returned "new_pattern_1")
          if (!isUuid(d.pattern_id)) {
            console.warn("Skipping invalid pattern_id:", d.pattern_id);
            results.push({ exerciseId: d.exercise_id, success: false, error: "invalid pattern_id" });
            continue;
          }

          const { error: deconErr } = await db.from("kb_deconstructions").insert({
            exercise_id: isUuid(d.exercise_id) ? d.exercise_id : null,
            pattern_id: d.pattern_id,
            steps: d.steps || [],
            needs: d.needs || [],
            notes: d.notes || "",
            ai_generated: true,
          });

          if (!deconErr) {
            results.push({ exerciseId: d.exercise_id, patternId: d.pattern_id, success: true });
          } else {
            console.error("Insert error:", deconErr);
            results.push({ exerciseId: d.exercise_id, success: false, error: deconErr.message });
          }
        }
      } catch (err) {
        if (err instanceof GeminiError && err.code === "RATE_LIMIT") {
          await new Promise(r => setTimeout(r, 3000));
          i -= batchSize;
          continue;
        }
        if (err instanceof GeminiError && err.code === "QUOTA") {
          return new Response(JSON.stringify({ error: err.message, results }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        console.error("Batch error:", err);
        continue;
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
