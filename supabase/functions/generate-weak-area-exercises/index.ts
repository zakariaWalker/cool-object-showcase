// Generate exercises for a single (country, grade, type) cell using Google Gemini
// (native API with GEMINI_API_KEY), then insert them into kb_exercises.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const GEMINI_MODEL = "gemini-2.5-flash"; // closest publicly available to gemini-3-flash-preview
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GRADE_LABELS: Record<string, string> = {
  "1AP": "السنة الأولى ابتدائي", "2AP": "السنة الثانية ابتدائي",
  "3AP": "السنة الثالثة ابتدائي", "4AP": "السنة الرابعة ابتدائي",
  "5AP": "السنة الخامسة ابتدائي",
  "1AM": "السنة الأولى متوسط", "2AM": "السنة الثانية متوسط",
  "3AM": "السنة الثالثة متوسط", "4AM": "السنة الرابعة متوسط (BEM)",
  "1AS": "السنة الأولى ثانوي", "2AS": "السنة الثانية ثانوي",
  "3AS": "السنة الثالثة ثانوي (BAC)",
};

const TYPE_LABELS: Record<string, string> = {
  algebra: "الجبر", advanced_algebra: "الجبر المتقدم",
  arithmetic: "الحساب", geometry_construction: "الإنشاءات الهندسية",
  analytic_geometry: "الهندسة التحليلية", angles: "الزوايا",
  fractions: "الكسور", number_sets: "مجموعات الأعداد",
  equations: "المعادلات", factor: "التحليل", functions: "الدوال",
  calculus: "التحليل (نهايات/مشتقات/تكامل)", probability: "الاحتمالات",
  parallelogram: "متوازي الأضلاع", bac_prep: "تحضير البكالوريا",
};

interface GenReq {
  country_code: string;
  grade: string;
  type: string;
  count: number;
}

interface GeneratedExercise {
  text: string;
  difficulty: number;
  base_score: number;
  step_count: number;
  concept_count: number;
  estimated_time_min: number;
  bloom_level: number;
  cognitive_level: string;
  chapter: string;
  label: string;
}

// Gemini native function-calling declaration (no top-level "function" wrapper, no additionalProperties)
const geminiFunctionDecl = {
  name: "emit_exercises",
  description: "Emit a list of math exercises tailored to the grade and type.",
  parameters: {
    type: "object",
    properties: {
      exercises: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: { type: "string", description: "Full exercise statement in Arabic. Use $...$ for inline LaTeX math." },
            chapter: { type: "string", description: "Curriculum chapter in Arabic." },
            label: { type: "string", description: "Short label like '4AM — الرياضيات'" },
            difficulty: { type: "integer" },
            base_score: { type: "number" },
            step_count: { type: "integer" },
            concept_count: { type: "integer" },
            estimated_time_min: { type: "number" },
            bloom_level: { type: "integer" },
            cognitive_level: { type: "string", enum: ["remember", "understand", "apply", "analyze", "evaluate", "create"] },
          },
          required: ["text", "chapter", "label", "difficulty", "base_score", "step_count", "concept_count", "estimated_time_min", "bloom_level", "cognitive_level"],
        },
      },
    },
    required: ["exercises"],
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as GenReq;
    const { country_code, grade, type, count } = body;

    if (!country_code || !grade || !type || !count || count < 1 || count > 20) {
      return new Response(JSON.stringify({ error: "invalid params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gradeLabel = GRADE_LABELS[grade] || grade;
    const typeLabel = TYPE_LABELS[type] || type;

    const systemPrompt =
      `You are an expert Algerian math teacher. Generate exercises in ARABIC that match the official ` +
      `Algerian curriculum for ${gradeLabel}. All math expressions MUST use LaTeX delimited by $...$. ` +
      `Be pedagogically rigorous, age-appropriate, and varied in difficulty within the requested type.`;

    const userPrompt =
      `Generate exactly ${count} distinct math exercises for ${gradeLabel}, topic: ${typeLabel} (${type}).\n` +
      `Rules:\n` +
      `- Arabic question text only (no English).\n` +
      `- Use $...$ for ALL math (numbers, expressions, equations).\n` +
      `- Vary difficulty levels (1 to 4) across the batch.\n` +
      `- Each exercise must be self-contained (no references to figures unless described inline).\n` +
      `- Set 'label' to "${grade} — الرياضيات".\n` +
      `- Set 'chapter' to a real curriculum chapter name in Arabic for ${typeLabel} at ${gradeLabel}.\n` +
      `- estimated_time_min between 3 and 15 typically.\n` +
      `- step_count = number of resolution steps a student must perform.`;

    // Direct call to Google Gemini API (native), with retry on 503/500 and model fallback.
    const MODEL_CHAIN = [GEMINI_MODEL, "gemini-2.5-flash-lite", "gemini-2.0-flash"];
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const callGemini = (model: string) =>
      fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            tools: [{ functionDeclarations: [geminiFunctionDecl] }],
            toolConfig: {
              functionCallingConfig: { mode: "ANY", allowedFunctionNames: ["emit_exercises"] },
            },
            generationConfig: { temperature: 0.4 },
          }),
        },
      );

    let aiResp: Response | null = null;
    let lastStatus = 0;
    let lastBody = "";
    outer: for (const model of MODEL_CHAIN) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const r = await callGemini(model);
        if (r.ok) { aiResp = r; break outer; }
        lastStatus = r.status;
        lastBody = await r.text();
        // Hard-stop conditions: don't retry, don't try other models
        if (r.status === 400 || r.status === 401 || r.status === 403 || r.status === 429) break outer;
        // Transient (503/500/504): backoff then retry same model
        if (r.status === 503 || r.status === 500 || r.status === 504) {
          await sleep(700 * Math.pow(2, attempt)); // 700ms, 1.4s, 2.8s
          continue;
        }
        break; // other → try next model
      }
    }

    if (!aiResp) {
      console.error("Gemini API failed after fallbacks", lastStatus, lastBody);
      if (lastStatus === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (lastStatus === 401 || lastStatus === 403) {
        return new Response(JSON.stringify({ error: "key_invalid", detail: lastBody.slice(0, 300) }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (lastStatus === 503 || lastStatus === 500 || lastStatus === 504) {
        return new Response(JSON.stringify({ error: "model_overloaded", detail: lastBody.slice(0, 300) }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "ai_failed", detail: lastBody.slice(0, 500) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const fnCall = aiJson?.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall)?.functionCall;
    if (!fnCall?.args) {
      return new Response(JSON.stringify({ error: "no_tool_call", raw: aiJson }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: { exercises: GeneratedExercise[] };
    try {
      // Gemini returns args as already-parsed JSON object
      parsed = typeof fnCall.args === "string" ? JSON.parse(fnCall.args) : fnCall.args;
    } catch (e) {
      return new Response(JSON.stringify({ error: "bad_json", detail: String(e) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const exercises = (parsed.exercises || []).slice(0, count);
    if (exercises.length === 0) {
      return new Response(JSON.stringify({ error: "empty_generation" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const rows = exercises.map((ex) => ({
      country_code,
      grade,
      type,
      text: ex.text,
      chapter: ex.chapter || "",
      label: ex.label || `${grade} — الرياضيات`,
      difficulty: ex.difficulty,
      base_score: ex.base_score,
      step_count: ex.step_count,
      concept_count: ex.concept_count,
      estimated_time_min: ex.estimated_time_min,
      bloom_level: ex.bloom_level,
      cognitive_level: ex.cognitive_level,
      source: "ai_weak_area_filler",
      stream: "",
    }));

    const { data: inserted, error: insertErr } = await supabase
      .from("kb_exercises").insert(rows).select("id");

    if (insertErr) {
      console.error("insert error", insertErr);
      return new Response(JSON.stringify({ error: "insert_failed", detail: insertErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true, generated: exercises.length, inserted: inserted?.length || 0,
      grade, type,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("fn error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
