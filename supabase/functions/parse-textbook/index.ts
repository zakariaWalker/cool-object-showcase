import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY not set");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        { role: "user", parts: [{ text: `${systemPrompt}\n\n${prompt}` }] },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini error ${res.status}: ${t.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part: { text?: string }) => part.text ?? "")
    .join("")
    .trim();

  if (!text) {
    const finishReason = data.candidates?.[0]?.finishReason;
    throw new Error(`Gemini returned empty response${finishReason ? ` (${finishReason})` : ""}`);
  }

  return text;
}

function stripCodeFences(text: string): string {
  return text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
}

function findBalancedJson(text: string): string | null {
  let start = -1;
  let stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (start === -1) {
      if (char === "{" || char === "[") {
        start = i;
        stack = [char];
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char === "}" || char === "]") {
      const last = stack[stack.length - 1];
      if ((char === "}" && last === "{") || (char === "]" && last === "[")) {
        stack.pop();
        if (stack.length === 0) {
          return text.slice(start, i + 1);
        }
      }
    }
  }

  if (start === -1) return null;
  return text.slice(start);
}

function closeOpenJson(text: string): string {
  let result = "";
  const stack: string[] = [];
  let inString = false;
  let escaped = false;

  for (const char of text) {
    result += char;

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") stack.push(char);
    if (char === "}" || char === "]") {
      const last = stack[stack.length - 1];
      if ((char === "}" && last === "{") || (char === "]" && last === "[")) {
        stack.pop();
      }
    }
  }

  if (inString) result += '"';
  for (let i = stack.length - 1; i >= 0; i--) {
    result += stack[i] === "{" ? "}" : "]";
  }

  return result;
}

function safeParseJson(text: string) {
  try {
    return { ok: true as const, value: JSON.parse(text) };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error : new Error("Unknown JSON parse error"),
    };
  }
}

function extractJSON(text: string): any {
  const cleaned = stripCodeFences(text);
  const baseCandidate = findBalancedJson(cleaned) ?? cleaned;
  const candidates = [
    baseCandidate,
    closeOpenJson(baseCandidate),
    closeOpenJson(
      baseCandidate
        .replace(/,\s*([}\]])/g, "$1")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " "),
    ),
  ];

  let lastError: Error | null = null;

  for (const candidate of candidates) {
    const parsed = safeParseJson(candidate.trim());
    if (parsed.ok) return parsed.value;
    lastError = parsed.error;
  }

  console.error("Failed AI JSON snippet:", cleaned.slice(0, 1200));
  throw new Error(`Unable to parse AI JSON response: ${lastError?.message ?? "unknown error"}`);
}

async function processTextbook(textbook_id: string, raw_text?: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  try {
    const { data: textbook, error: tbErr } = await db.from("textbooks").select("*").eq("id", textbook_id).single();
    if (tbErr || !textbook) throw new Error("Textbook not found");

    await db.from("textbooks").update({ status: "processing", processing_progress: 5 }).eq("id", textbook_id);

    const hasRawText = raw_text && raw_text.trim().length > 100;
    await db.from("textbooks").update({ processing_progress: 15 }).eq("id", textbook_id);

    const systemPrompt = `أنت خبير تربوي متخصص في المنهاج الجزائري للرياضيات (الجيل الثاني).
مهمتك إنشاء بنية كتاب مدرسي دقيقة ومضغوطة صالحة للحفظ في قاعدة البيانات.
أجب دائماً بـ JSON صالح 100% فقط، بدون أي شرح أو markdown أو نص خارج JSON.`;

    const structurePrompt = `أنشئ بنية كتاب الرياضيات التالي من المنهاج الجزائري (الجيل الثاني):

- العنوان: ${textbook.title}
- المستوى: ${textbook.grade}
- المادة: ${textbook.subject || "رياضيات"}
${hasRawText ? `\n--- المحتوى النصي للكتاب ---\n${raw_text!.substring(0, 12000)}\n--- نهاية المحتوى ---\n\nاستخرج فقط الفصول والدروس والأنشطة التي يدعمها النص أعلاه بوضوح. إذا كان النص مقتطفاً جزئياً فلا تخترع فصولاً إضافية.` : ""}

المطلوب: أنشئ البنية الهرمية للكتاب مع فصول ودروس وأنشطة تفاعلية:

{
  "chapters": [
    {
      "order": 1,
      "title": "عنوان الفصل بالفرنسية",
      "title_ar": "عنوان الفصل بالعربية",
      "domain": "algebra|geometry|statistics|probability|functions",
      "lessons": [
        {
          "order": 1,
          "title": "عنوان الدرس بالفرنسية",
          "title_ar": "عنوان الدرس بالعربية",
          "objectives": ["هدف 1", "هدف 2"],
          "content_summary": "ملخص قصير",
          "activities": [
            {
              "order": 1,
              "type": "explanation|exercise|activity|example|definition|property|theorem",
              "title": "عنوان",
              "title_ar": "عنوان بالعربية",
              "content": "محتوى مختصر بـ LaTeX",
              "solution": "حل مختصر إن وجد",
              "difficulty": 1,
              "bloom_level": 1,
              "is_interactive": true,
              "expected_answer": "الإجابة المتوقعة إن كان تمرين",
              "answer_type": "numeric|expression|text|multiple_choice",
              "hints": ["تلميح 1"]
            }
          ]
        }
      ]
    }
  ]
}

⚠️ مهم:
- أرجع JSON صالحاً 100% فقط
- أنشئ محتوى يتوافق مع المنهاج الجزائري للمستوى المحدد
- إذا كان النص جزئياً، استخرج فقط ما يظهر بوضوح
- اجعل content و solution و content_summary مختصرة جداً لتقليل حجم المخرجات
- التمارين يجب أن تكون تفاعلية (is_interactive: true) مع expected_answer
- اكتب المحتوى الرياضي بـ LaTeX
- إذا لم تتأكد من قيمة، استخدم سلسلة فارغة أو مصفوفة فارغة أو null حسب الحاجة`;

    const rawResult = await callAI(structurePrompt, systemPrompt);
    const parsed = extractJSON(rawResult);

    await db.from("textbooks").update({ processing_progress: 50 }).eq("id", textbook_id);

    if (!parsed.chapters || !Array.isArray(parsed.chapters)) {
      throw new Error("AI did not return valid chapters structure");
    }

    let totalActivities = 0;
    const insertedLessonIds: string[] = [];

    for (const ch of parsed.chapters) {
      const { data: chapterRow, error: chErr } = await db
        .from("textbook_chapters")
        .insert({
          textbook_id,
          order_index: ch.order || 0,
          title: ch.title || "Untitled",
          title_ar: ch.title_ar || "",
          domain: ch.domain || "",
          metadata: { page_start: ch.page_start, page_end: ch.page_end },
        })
        .select()
        .single();

      if (chErr || !chapterRow) continue;

      for (const lesson of ch.lessons || []) {
        const { data: lessonRow, error: lErr } = await db
          .from("textbook_lessons")
          .insert({
            chapter_id: chapterRow.id,
            order_index: lesson.order || 0,
            title: lesson.title || "Untitled",
            title_ar: lesson.title_ar || "",
            objectives: lesson.objectives || [],
            content_html: lesson.content_summary || "",
            content_latex: lesson.content_latex || "",
          })
          .select()
          .single();

        if (lErr || !lessonRow) continue;
        insertedLessonIds.push(lessonRow.id);

        const activitiesToInsert = (lesson.activities || []).map((act: any) => ({
          lesson_id: lessonRow.id,
          order_index: act.order || 0,
          activity_type: act.type || "exercise",
          title: act.title || "",
          title_ar: act.title_ar || "",
          content_text: act.content || "",
          content_latex: act.content || "",
          solution_text: act.solution || "",
          solution_latex: act.solution || "",
          difficulty: act.difficulty || 1,
          bloom_level: act.bloom_level || 3,
          hints: act.hints || [],
          is_interactive: act.is_interactive || false,
          expected_answer: act.expected_answer || "",
          answer_type: act.answer_type || "text",
        }));

        if (activitiesToInsert.length > 0) {
          await db.from("textbook_activities").insert(activitiesToInsert);
          totalActivities += activitiesToInsert.length;
        }
      }
    }

    await db.from("textbooks").update({ processing_progress: 80 }).eq("id", textbook_id);

    // Auto-link with skills
    const { data: skills } = await db.from("kb_skills").select("id, name, name_ar, domain").limit(500);

    const { data: activities } =
      insertedLessonIds.length > 0
        ? await db
            .from("textbook_activities")
            .select("id, content_text, title, lesson_id")
            .in("lesson_id", insertedLessonIds)
            .limit(500)
        : { data: [] };

    if (skills && activities && activities.length > 0) {
      const links: any[] = [];
      for (const act of activities) {
        const actText = `${act.title} ${act.content_text}`.toLowerCase();
        for (const skill of skills) {
          const skillText = `${skill.name} ${skill.name_ar || ""}`.toLowerCase();
          const words = skillText.split(/\s+/).filter((w: string) => w.length > 3);
          const matches = words.filter((w: string) => actText.includes(w));
          if (matches.length >= 2) {
            links.push({
              activity_id: act.id,
              skill_id: skill.id,
              relevance_score: matches.length / words.length,
            });
          }
        }
      }
      if (links.length > 0) {
        await db.from("textbook_skill_links").insert(links.slice(0, 200));
      }
    }

    await db
      .from("textbooks")
      .update({
        status: "completed",
        processing_progress: 100,
        metadata: {
          ...((textbook.metadata as any) || {}),
          chapters_count: parsed.chapters.length,
          activities_count: totalActivities,
          processed_at: new Date().toISOString(),
        },
      })
      .eq("id", textbook_id);

    console.log(`Textbook ${textbook_id} processed: ${parsed.chapters.length} chapters, ${totalActivities} activities`);
  } catch (e: any) {
    console.error("parse-textbook error:", e);
    try {
      await db
        .from("textbooks")
        .update({
          status: "failed",
          processing_log: [{ error: e.message, at: new Date().toISOString() }],
        })
        .eq("id", textbook_id);
    } catch {}
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

const { textbook_id, raw_text } = await req.json().catch(() => ({ textbook_id: null, raw_text: null }));

  if (!textbook_id) {
    return new Response(JSON.stringify({ error: "textbook_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Process in background to avoid timeout
  EdgeRuntime.waitUntil(processTextbook(textbook_id, raw_text || undefined));

  return new Response(
    JSON.stringify({ success: true, message: "Processing started" }),
    { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
