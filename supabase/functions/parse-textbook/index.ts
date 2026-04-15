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

  // Auto-close
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  const { textbook_id } = await req.json().catch(() => ({ textbook_id: null }));

  try {
    if (!textbook_id) throw new Error("textbook_id required");

    // Get textbook info
    const { data: textbook, error: tbErr } = await db.from("textbooks").select("*").eq("id", textbook_id).single();
    if (tbErr || !textbook) throw new Error("Textbook not found");

    // Update status to processing
    await db.from("textbooks").update({ status: "processing", processing_progress: 5 }).eq("id", textbook_id);

    // Download the PDF from storage
    const { data: fileData, error: dlErr } = await db.storage
      .from("educational-materials")
      .download(textbook.file_path);
    if (dlErr || !fileData) throw new Error(`Download failed: ${dlErr?.message}`);

    // Convert to base64 for AI (chunked to avoid call stack overflow)
    const arrayBuffer = await fileData.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer.slice(0, 500000));
    let binary = "";
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    const base64 = btoa(binary);

    await db.from("textbooks").update({ processing_progress: 15 }).eq("id", textbook_id);

    // Step 1: Extract table of contents / structure
    const systemPrompt = `أنت خبير تربوي متخصص في المنهاج الجزائري للرياضيات (الجيل الثاني).
مهمتك تحليل محتوى كتاب مدرسي واستخراج بنيته الكاملة.
أجب دائماً بـ JSON فقط.`;

    const structurePrompt = `حلل هذا الكتاب المدرسي واستخرج بنيته الكاملة.

المعلومات:
- العنوان: ${textbook.title}
- المستوى: ${textbook.grade}
- محتوى الكتاب (base64 PDF، أول 500KB): ${base64.slice(0, 2000)}...

المطلوب: استخرج البنية الهرمية الكاملة:

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
              "difficulty": 1-5,
              "bloom_level": 1-6,
              "is_interactive": true/false,
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
- استخرج كل الأنشطة والتمارين والتعريفات والخصائص
- التمارين يجب أن تكون تفاعلية (is_interactive: true) مع expected_answer
- اكتب المحتوى الرياضي بـ LaTeX
- كن شاملاً ودقيقاً`;

    const rawResult = await callAI(structurePrompt, systemPrompt);
    const parsed = extractJSON(rawResult);

    await db.from("textbooks").update({ processing_progress: 50 }).eq("id", textbook_id);

    if (!parsed.chapters || !Array.isArray(parsed.chapters)) {
      throw new Error("AI did not return valid chapters structure");
    }

    // Step 2: Insert chapters, lessons, activities
    let totalActivities = 0;

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

    // Step 3: Auto-link with skills
    const { data: skills } = await db.from("kb_skills").select("id, name, name_ar, domain").limit(500);
    const { data: activities } = await db
      .from("textbook_activities")
      .select("id, content_text, title, lesson_id")
      .eq("lesson_id", (await db.from("textbook_lessons").select("id").limit(1000)).data?.map((l: any) => l.id) as any)
      .limit(500);

    // Simple keyword matching for auto-linking
    if (skills && activities) {
      const links: any[] = [];
      for (const act of activities) {
        const actText = `${act.title} ${act.content_text}`.toLowerCase();
        for (const skill of skills) {
          const skillText = `${skill.name} ${skill.name_ar || ""}`.toLowerCase();
          const words = skillText.split(/\s+/).filter((w: string) => w.length > 3);
          const matches = words.filter((w: string) => actText.includes(w));
          if (matches.length >= 2) {
            links.push({ activity_id: act.id, skill_id: skill.id, relevance_score: matches.length / words.length });
          }
        }
      }
      if (links.length > 0) {
        await db.from("textbook_skill_links").insert(links.slice(0, 200));
      }
    }

    // Done
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

    return new Response(
      JSON.stringify({
        success: true,
        chapters: parsed.chapters.length,
        activities: totalActivities,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("parse-textbook error:", e);
    if (textbook_id) {
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

    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
