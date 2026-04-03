import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { getGeminiKey, GeminiError } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

async function getEmbedding(text: string, apiKey: string): Promise<number[]> {
  const url = `${GEMINI_BASE}/models/text-embedding-004:embedContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/text-embedding-004",
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_DOCUMENT",
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embedding error ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.embedding?.values || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode = "all", contentType, contentId } = await req.json();
    const apiKey = getGeminiKey();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseKey);

    let items: { type: string; id: string; text: string; meta: any }[] = [];

    if (mode === "single" && contentType && contentId) {
      // Embed a single item
      if (contentType === "exercise") {
        const { data } = await db.from("kb_exercises").select("*").eq("id", contentId).single();
        if (data) items.push({ type: "exercise", id: data.id, text: `${data.text}\nالنوع: ${data.type}\nالمستوى: ${data.grade}`, meta: { grade: data.grade, type: data.type, chapter: data.chapter } });
      } else if (contentType === "pattern") {
        const { data } = await db.from("kb_patterns").select("*").eq("id", contentId).single();
        if (data) items.push({ type: "pattern", id: data.id, text: `${data.name}: ${data.description}\nالخطوات: ${JSON.stringify(data.steps)}`, meta: { type: data.type, name: data.name } });
      } else if (contentType === "deconstruction") {
        const { data } = await db.from("kb_deconstructions").select("*").eq("id", contentId).single();
        if (data) items.push({ type: "deconstruction", id: data.id, text: `خطوات التفكيك: ${JSON.stringify(data.steps)}\nالمتطلبات: ${JSON.stringify(data.needs)}\nملاحظات: ${data.notes}`, meta: { exercise_id: data.exercise_id, pattern_id: data.pattern_id } });
      }
    } else {
      // Embed all KB content
      const { data: exercises } = await db.from("kb_exercises").select("*").limit(500);
      if (exercises) {
        items.push(...exercises.map((e: any) => ({
          type: "exercise", id: e.id,
          text: `${e.text}\nالنوع: ${e.type}\nالمستوى: ${e.grade}\nالفصل: ${e.chapter}`,
          meta: { grade: e.grade, type: e.type, chapter: e.chapter },
        })));
      }

      const { data: patterns } = await db.from("kb_patterns").select("*");
      if (patterns) {
        items.push(...patterns.map((p: any) => ({
          type: "pattern", id: p.id,
          text: `نمط: ${p.name}\n${p.description}\nالخطوات: ${JSON.stringify(p.steps)}\nالمفاهيم: ${JSON.stringify(p.concepts)}`,
          meta: { type: p.type, name: p.name },
        })));
      }

      const { data: decons } = await db.from("kb_deconstructions").select("*");
      if (decons) {
        items.push(...decons.map((d: any) => ({
          type: "deconstruction", id: d.id,
          text: `تفكيك: ${JSON.stringify(d.steps)}\nالمتطلبات: ${JSON.stringify(d.needs)}\n${d.notes || ""}`,
          meta: { exercise_id: d.exercise_id, pattern_id: d.pattern_id },
        })));
      }
    }

    let embedded = 0;
    let errors = 0;

    for (const item of items) {
      try {
        const embedding = await getEmbedding(item.text.slice(0, 4000), apiKey);
        if (embedding.length === 0) { errors++; continue; }

        const { error } = await db.from("kb_embeddings").upsert({
          content_type: item.type,
          content_id: item.id,
          content_text: item.text.slice(0, 5000),
          embedding: JSON.stringify(embedding),
          metadata: item.meta,
        }, { onConflict: "content_type,content_id" });

        if (error) { console.error("Upsert error:", error); errors++; }
        else embedded++;

        // Rate limit protection
        if (items.length > 10) await new Promise(r => setTimeout(r, 100));
      } catch (e) {
        console.error(`Error embedding ${item.type}:${item.id}:`, e);
        errors++;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      total: items.length,
      embedded,
      errors,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-embeddings error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
