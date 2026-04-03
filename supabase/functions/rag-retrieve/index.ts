import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { getGeminiKey, GeminiError, callGemini } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

async function getQueryEmbedding(text: string, apiKey: string): Promise<number[]> {
  const url = `${GEMINI_BASE}/models/text-embedding-004:embedContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/text-embedding-004",
      content: { parts: [{ text }] },
      taskType: "RETRIEVAL_QUERY",
    }),
  });
  if (!res.ok) throw new Error(`Embedding error: ${res.status}`);
  const data = await res.json();
  return data.embedding?.values || [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query, mode = "search", filterType, topK = 8, threshold = 0.4 } = await req.json();
    if (!query) throw new Error("يجب تقديم استعلام");

    const apiKey = getGeminiKey();
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseKey);

    // 1. Get query embedding
    const queryEmbedding = await getQueryEmbedding(query, apiKey);
    if (queryEmbedding.length === 0) throw new Error("فشل في توليد التمثيل المتجهي");

    // 2. Semantic search
    const { data: matches, error } = await db.rpc("match_kb_embeddings", {
      query_embedding: JSON.stringify(queryEmbedding),
      match_threshold: threshold,
      match_count: topK,
      filter_type: filterType || null,
    });

    if (error) throw new Error(`Search error: ${error.message}`);

    // Mode: search only — return raw results
    if (mode === "search") {
      return new Response(JSON.stringify({
        success: true,
        results: matches || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode: answer — use RAG to generate an answer
    if (mode === "answer") {
      const context = (matches || []).map((m: any, i: number) =>
        `[${i + 1}] (${m.content_type}, تشابه: ${(m.similarity * 100).toFixed(0)}%)\n${m.content_text}`
      ).join("\n\n---\n\n");

      const ragPrompt = `أنت مدرّس رياضيات خبير في المنهاج الجزائري.

استخدم المعلومات التالية من قاعدة المعرفة للإجابة على سؤال التلميذ.
إذا لم تجد معلومات كافية، أجب بما تعرفه واذكر ذلك.

## قاعدة المعرفة:
${context || "لا توجد نتائج مطابقة"}

## سؤال التلميذ:
${query}

## قواعد:
- استخدم LaTeX بين $ للصيغ الرياضية
- أجب بالعربية الفصحى البسيطة
- رقّم الخطوات
- اذكر مصادر المعلومة (نمط/تمرين) إن أمكن`;

      const response = await callGemini(
        [{ role: "user", parts: [{ text: ragPrompt }] }],
        {
          systemInstruction: "أنت مدرّس رياضيات للمنهاج الجزائري. تستخدم قاعدة المعرفة للإجابة بدقة.",
          temperature: 0.3,
        }
      );

      return new Response(JSON.stringify({
        success: true,
        answer: response.text,
        sources: (matches || []).map((m: any) => ({
          type: m.content_type,
          id: m.content_id,
          similarity: m.similarity,
          preview: m.content_text?.slice(0, 150),
        })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode: generate — generate exercises from similar content
    if (mode === "generate") {
      const context = (matches || []).filter((m: any) => m.content_type === "exercise" || m.content_type === "pattern")
        .map((m: any) => m.content_text).join("\n\n");

      const genPrompt = `بناءً على التمارين والأنماط التالية من قاعدة المعرفة، أنشئ تمريناً جديداً مشابهاً:

${context}

## المطلوب: ${query}

أنشئ تمريناً جديداً بصيغة JSON:
{
  "text": "نص التمرين",
  "type": "النوع",
  "difficulty": 1-5,
  "concepts": ["المفاهيم"],
  "solution_steps": ["الخطوات"]
}`;

      const response = await callGemini(
        [{ role: "user", parts: [{ text: genPrompt }] }],
        { temperature: 0.7 }
      );

      return new Response(JSON.stringify({
        success: true,
        generated: response.text,
        basedOn: (matches || []).slice(0, 3).map((m: any) => ({ type: m.content_type, id: m.content_id })),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mode: gaps — analyze knowledge gaps
    if (mode === "gaps") {
      const gapPrompt = `حلل الثغرات المعرفية بناءً على:

السؤال/الموضوع: ${query}

المفاهيم المتاحة في قاعدة المعرفة:
${(matches || []).map((m: any) => `- ${m.content_type}: ${m.content_text?.slice(0, 100)}`).join("\n")}

حدد:
1. المفاهيم المفقودة التي يحتاجها التلميذ
2. ترتيب التعلم المقترح
3. تمارين مقترحة للتدريب

أجب بصيغة JSON:
{
  "missing_concepts": ["..."],
  "learning_order": ["..."],
  "suggested_exercises": ["وصف تمرين..."]
}`;

      const response = await callGemini(
        [{ role: "user", parts: [{ text: gapPrompt }] }],
        { temperature: 0.3 }
      );

      return new Response(JSON.stringify({
        success: true,
        analysis: response.text,
        relatedContent: (matches || []).slice(0, 5),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`وضع غير معروف: ${mode}`);
  } catch (e) {
    if (e instanceof GeminiError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("rag-retrieve error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "خطأ غير متوقع" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
