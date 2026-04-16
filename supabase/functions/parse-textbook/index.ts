import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY not set");

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`AI error ${res.status}: ${t.slice(0, 300)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function extractJSON(text: string): any {
  let cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const start = cleaned.search(/[\{\[]/);
  if (start === -1) throw new Error("No JSON found");
  const opener = cleaned[start];
  const closer = opener === "[" ? "]" : "}";
  const end = cleaned.lastIndexOf(closer);
  if (end === -1) throw new Error("Truncated JSON");
  cleaned = cleaned.substring(start, end + 1);

  const ob = (cleaned.match(/{/g) || []).length;
  const cb = (cleaned.match(/}/g) || []).length;
  const os = (cleaned.match(/\[/g) || []).length;
  const cs = (cleaned.match(/\]/g) || []).length;
  for (let i = 0; i < os - cs; i++) cleaned += "]";
  for (let i = 0; i < ob - cb; i++) cleaned += "}";

  try {
    return JSON.parse(cleaned);
  } catch {
    cleaned = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, " ");
    return JSON.parse(cleaned);
  }
}

async function processTextbook(textbook_id: string, raw_text?: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  try {
    const { data: textbook, error: tbErr } = await db.from("textbooks").select("*").eq("id", textbook_id).single();
    if (tbErr || !textbook) throw new Error("Textbook not found");

    await db.from("textbooks").update({ status: "processing", processing_progress: 5 }).eq("id", textbook_id);

    // Use raw_text if provided, otherwise generate from metadata
    const hasRawText = raw_text && raw_text.trim().length > 100;
    await db.from("textbooks").update({ processing_progress: 15 }).eq("id", textbook_id);

    const systemPrompt = `أنت خبير تربوي متخصص في المنهاج الجزائري للرياضيات (الجيل الثاني).
مهمتك إنشاء بنية كاملة لكتاب مدرسي بناءً على المعلومات المقدمة.
أجب دائماً بـ JSON فقط.`;

    const structurePrompt = `أنشئ بنية كاملة لكتاب الرياضيات التالي من المنهاج الجزائري (الجيل الثاني):

- العنوان: ${textbook.title}
- المستوى: ${textbook.grade}
- المادة: ${textbook.subject || "رياضيات"}
${hasRawText ? `\n--- المحتوى النصي للكتاب ---\n${raw_text!.substring(0, 15000)}\n--- نهاية المحتوى ---\n\nاستخدم المحتوى أعلاه لاستخراج البنية الحقيقية للكتاب (الفصول، الدروس، الأنشطة) بدقة.` : ""}

المطلوب: أنشئ البنية الهرمية الكاملة للكتاب مع فصول ودروس وأنشطة تفاعلية:

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
          "content_summary": "ملخص المحتوى",
          "activities": [
            {
              "order": 1,
              "type": "explanation|exercise|activity|example|definition|property|theorem",
              "title": "عنوان",
              "title_ar": "عنوان بالعربية",
              "content": "المحتوى الكامل بـ LaTeX",
              "solution": "الحل إن وجد",
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
- أنشئ محتوى يتوافق مع المنهاج الجزائري للمستوى المحدد
- التمارين يجب أن تكون تفاعلية (is_interactive: true) مع expected_answer
- اكتب المحتوى الرياضي بـ LaTeX
- أنشئ على الأقل 4 فصول، كل فصل فيه 2-3 دروس، كل درس فيه 3-5 أنشطة
- كن شاملاً ودقيقاً`;

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
