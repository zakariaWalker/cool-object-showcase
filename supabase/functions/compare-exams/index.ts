// Admin tool: compare a real (uploaded) exam vs an AI-generated exam.
// Returns gap analysis: missing concepts, bloom mismatch, difficulty drift, style deltas.
import { callGemini, GeminiError, extractJSON } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface QuestionLite {
  text: string;
  type?: string;
  difficulty?: string | number;
  bloom_level?: number;
  concepts?: string[];
  points?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { realQuestions = [], generatedQuestions = [], grade = "", format = "regular" } =
      (await req.json()) as {
        realQuestions: QuestionLite[];
        generatedQuestions: QuestionLite[];
        grade?: string;
        format?: string;
      };

    if (!realQuestions.length || !generatedQuestions.length) {
      return new Response(
        JSON.stringify({ error: "أرسل أسئلة الامتحانين الحقيقي والمولَّد" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Quick deterministic stats
    const stats = (qs: QuestionLite[]) => {
      const blooms = qs.map((q) => q.bloom_level || 3);
      const concepts = new Set<string>();
      qs.forEach((q) => (q.concepts || []).forEach((c) => concepts.add(c)));
      const totalPoints = qs.reduce((s, q) => s + (q.points || 0), 0);
      return {
        count: qs.length,
        avgBloom: blooms.length ? +(blooms.reduce((a, b) => a + b, 0) / blooms.length).toFixed(2) : 0,
        bloomMin: Math.min(...blooms),
        bloomMax: Math.max(...blooms),
        concepts: [...concepts],
        totalPoints,
      };
    };

    const realStats = stats(realQuestions);
    const genStats = stats(generatedQuestions);

    const onlyInReal = realStats.concepts.filter((c) => !genStats.concepts.includes(c));
    const onlyInGen = genStats.concepts.filter((c) => !realStats.concepts.includes(c));

    const formatList = (qs: QuestionLite[]) =>
      qs
        .map(
          (q, i) =>
            `${i + 1}. [${q.type || "—"} | bloom:${q.bloom_level || "?"} | ${q.difficulty || "?"}] ${q.text.slice(0, 220)}`,
        )
        .join("\n");

    const prompt = `أنت خبير في تحليل الامتحانات (${format} — ${grade}).
لديك امتحان حقيقي وامتحان مُولَّد بالذكاء الاصطناعي. هدفك تحديد الفجوات لتحسين مولّد الامتحانات.

## الامتحان الحقيقي (${realStats.count} سؤال):
${formatList(realQuestions)}

## الامتحان المولَّد (${genStats.count} سؤال):
${formatList(generatedQuestions)}

## إحصاءات أولية:
- متوسط Bloom الحقيقي: ${realStats.avgBloom} | المولَّد: ${genStats.avgBloom}
- مفاهيم في الحقيقي ولا توجد في المولَّد: ${onlyInReal.join(", ") || "—"}
- مفاهيم في المولَّد ولا توجد في الحقيقي: ${onlyInGen.join(", ") || "—"}

## أعد JSON فقط بهذا الهيكل:
{
  "summary": "ملخص قصير (سطرين) عن مدى مطابقة المولَّد للحقيقي",
  "matchScore": 0-100,
  "gaps": [
    { "category": "concept|bloom|difficulty|style|pedagogy", "severity": "high|medium|low", "title": "...", "detail": "...", "fix": "تعليمة دقيقة لتحسين المولّد" }
  ],
  "strengths": ["..."],
  "recommendations": ["..."]
}`;

    const response = await callGemini(
      [{ role: "user", parts: [{ text: prompt }] }],
      {
        systemInstruction:
          "أنت محلّل بيداغوجي. أجب دائماً بـ JSON صالح فقط، دون أي نص خارج JSON.",
        temperature: 0.3,
      },
    );

    const parsed = extractJSON(response.text);

    return new Response(
      JSON.stringify({
        ...parsed,
        stats: { real: realStats, generated: genStats, onlyInReal, onlyInGen },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    if (err instanceof GeminiError) {
      return new Response(JSON.stringify({ error: err.message, code: err.code }), {
        status: err.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
