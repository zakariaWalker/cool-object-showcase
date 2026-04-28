// ===== analyze-geometry-context =====
// Uses Lovable AI to deeply parse a geometry exercise and return a rich
// figure spec + constraints. Robust fallback: caller keeps regex result.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FIGURE_KINDS = [
  "parallelepiped","cube","prism","pyramid","cone","cylinder","sphere",
  "triangle","right_triangle","quadrilateral","rectangle","square",
  "parallelogram","rhombus","trapezoid","circle","polygon",
  "axes","function_plot","point_set",
] as const;

const CONSTRAINT_KINDS = [
  "perpendicular","parallel","on_circle","midpoint","diameter","chord",
  "intersection","create_segment","create_line","create_point","create_circle",
  "equal_length","equal_angle","tangent","bisector_perp","bisector_angle",
] as const;

const SYSTEM_PROMPT = `أنت محلّل رياضي للهندسة المستوية والفضائية. مهمتك: قراءة نصّ تمرين هندسي (عربي/فرنسي/إنجليزي) وإخراج وصف بنيوي دقيق:
1) نوع الشكل الأساسي (kind) من القائمة المسموحة.
2) رؤوس الشكل بإحداثيات (x,y) معقولة في النطاق [-5,5] لرسم نظيف.
3) قائمة قيود بناء (constraints) يجب على الطالب تحقيقها لإنجاز الإنشاء (تعامد، توازي، منتصف، نقطة على دائرة، قطر، وتر، تماس، ...).
أخرج فقط JSON عبر استدعاء الأداة. لا تخمّن إذا لم يكن النص هندسياً — أعد kind="point_set" وقائمة قيود فارغة.`;

const TOOL = {
  type: "function" as const,
  function: {
    name: "emit_figure",
    description: "Return the parsed figure spec and construction constraints.",
    parameters: {
      type: "object",
      properties: {
        kind: { type: "string", enum: FIGURE_KINDS as unknown as string[] },
        labels: {
          type: "array",
          items: { type: "string" },
          description: "Vertex labels in order, e.g. ['A','B','C'].",
        },
        vertices: {
          type: "array",
          description: "Optional explicit coordinates for each label.",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              x: { type: "number" },
              y: { type: "number" },
              z: { type: "number" },
            },
            required: ["label", "x", "y"],
            additionalProperties: false,
          },
        },
        edges: {
          type: "array",
          items: {
            type: "array",
            items: { type: "string" },
            minItems: 2, maxItems: 2,
          },
        },
        dims: {
          type: "object",
          description: "Optional metric hints (radius, length, width, height).",
          properties: {
            radius: { type: "number" },
            length: { type: "number" },
            width: { type: "number" },
            height: { type: "number" },
          },
          additionalProperties: false,
        },
        constraints: {
          type: "array",
          items: {
            type: "object",
            properties: {
              kind: { type: "string", enum: CONSTRAINT_KINDS as unknown as string[] },
              labels: { type: "array", items: { type: "string" } },
              context: { type: "string" },
              description: { type: "string" },
            },
            required: ["kind", "description"],
            additionalProperties: false,
          },
        },
        caption: { type: "string", description: "Short Arabic summary of what to construct." },
        confidence: { type: "number", description: "0..1 — how confident the parse is." },
      },
      required: ["kind", "constraints"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text.slice(0, 4000) },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "emit_figure" } },
      }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      console.error("AI gateway error", resp.status, body);
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "ai_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const call = data?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      return new Response(JSON.stringify({ error: "no_tool_call" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any = {};
    try { parsed = JSON.parse(call.function.arguments); }
    catch { parsed = {}; }

    return new Response(JSON.stringify({ ok: true, result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-geometry-context error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
