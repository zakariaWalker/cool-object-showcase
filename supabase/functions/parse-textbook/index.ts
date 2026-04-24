// ===== Parse Textbook — PDF or raw text → structured chapters/lessons/activities =====
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Gemini call (text only) ──
async function callGeminiText(prompt: string, systemPrompt: string): Promise<string> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192, responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "").join("").trim();
  if (!text) throw new Error(`Gemini empty response (${data.candidates?.[0]?.finishReason || ""})`);
  return text;
}

// ── Gemini call (PDF multimodal) — extract raw text from a PDF ──
async function extractTextFromPDF(base64Pdf: string): Promise<string> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY not set");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: base64Pdf } },
          { text: "استخرج كامل النص من هذا الكتاب المدرسي بالعربية والفرنسية مع الحفاظ على بنية الفصول والدروس والعناوين. اكتب الصيغ الرياضية بـ LaTeX بين $...$. لا تضف شرحاً، فقط النص المستخرج." },
        ],
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 16000 },
    }),
  });
  if (!res.ok) throw new Error(`PDF text extraction failed ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  return (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "").join("").trim();
}

// ── JSON helpers (unchanged) ──
function stripCodeFences(text: string): string {
  return text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
}
function findBalancedJson(text: string): string | null {
  let start = -1, stack: string[] = [], inString = false, escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (start === -1) { if (c === "{" || c === "[") { start = i; stack = [c]; } continue; }
    if (inString) { if (escaped) escaped = false; else if (c === "\\") escaped = true; else if (c === '"') inString = false; continue; }
    if (c === '"') { inString = true; continue; }
    if (c === "{" || c === "[") { stack.push(c); continue; }
    if (c === "}" || c === "]") {
      const last = stack[stack.length - 1];
      if ((c === "}" && last === "{") || (c === "]" && last === "[")) {
        stack.pop();
        if (stack.length === 0) return text.slice(start, i + 1);
      }
    }
  }
  return start === -1 ? null : text.slice(start);
}
function closeOpenJson(text: string): string {
  let result = "", inString = false, escaped = false;
  const stack: string[] = [];
  for (const c of text) {
    result += c;
    if (inString) { if (escaped) escaped = false; else if (c === "\\") escaped = true; else if (c === '"') inString = false; continue; }
    if (c === '"') { inString = true; continue; }
    if (c === "{" || c === "[") stack.push(c);
    if (c === "}" || c === "]") {
      const last = stack[stack.length - 1];
      if ((c === "}" && last === "{") || (c === "]" && last === "[")) stack.pop();
    }
  }
  if (inString) result += '"';
  for (let i = stack.length - 1; i >= 0; i--) result += stack[i] === "{" ? "}" : "]";
  return result;
}
function extractJSON(text: string): any {
  const cleaned = stripCodeFences(text);
  const base = findBalancedJson(cleaned) ?? cleaned;
  const candidates = [
    base,
    closeOpenJson(base),
    closeOpenJson(base.replace(/,\s*([}\]])/g, "$1").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")),
  ];
  let lastErr: Error | null = null;
  for (const c of candidates) {
    try { return JSON.parse(c.trim()); } catch (e) { lastErr = e as Error; }
  }
  console.error("JSON parse failed snippet:", cleaned.slice(0, 800));
  throw new Error(`Unable to parse AI JSON: ${lastErr?.message}`);
}

// ── Main pipeline ──
async function processTextbook(textbook_id: string, raw_text?: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const db = createClient(supabaseUrl, serviceKey);

  try {
    const { data: textbook, error: tbErr } = await db.from("textbooks").select("*").eq("id", textbook_id).single();
    if (tbErr || !textbook) throw new Error("Textbook not found");

    await db.from("textbooks").update({ status: "processing", processing_progress: 5 }).eq("id", textbook_id);

    // ── Step 1: Get text content (from PDF or pasted) ──
    let workingText = raw_text?.trim() || "";

    if (!workingText && textbook.file_path) {
      console.log("Downloading PDF:", textbook.file_path);
      await db.from("textbooks").update({ processing_progress: 10 }).eq("id", textbook_id);

      const cleanPath = textbook.file_path.replace(/^textbooks\//, "");
      const { data: fileData, error: dlErr } = await db.storage
        .from("educational-materials")
        .download(cleanPath);

      if (dlErr || !fileData) {
        // Try alternative path
        const { data: fileData2, error: dlErr2 } = await db.storage
          .from("educational-materials")
          .download(textbook.file_path);
        if (dlErr2 || !fileData2) {
          throw new Error(`فشل تحميل ملف PDF: ${dlErr?.message || dlErr2?.message || "unknown"}`);
        }
        const ab = await fileData2.arrayBuffer();
        const b64 = btoa(new Uint8Array(ab).reduce((d, b) => d + String.fromCharCode(b), ""));
        await db.from("textbooks").update({ processing_progress: 25 }).eq("id", textbook_id);
        workingText = await extractTextFromPDF(b64);
      } else {
        const ab = await fileData.arrayBuffer();
        const b64 = btoa(new Uint8Array(ab).reduce((d, b) => d + String.fromCharCode(b), ""));
        await db.from("textbooks").update({ processing_progress: 25 }).eq("id", textbook_id);
        workingText = await extractTextFromPDF(b64);
      }

      if (!workingText || workingText.length < 200) {
        throw new Error("لم يتمكن AI من استخراج نص كافٍ من PDF. حاول لصق النص يدوياً.");
      }
      console.log(`Extracted ${workingText.length} chars from PDF`);
    }

    if (!workingText) throw new Error("لا يوجد محتوى للمعالجة (لا PDF ولا نص)");

    await db.from("textbooks").update({ processing_progress: 35 }).eq("id", textbook_id);

    // ── Step 2: Build pedagogically-rich structure ──
    const systemPrompt = `أنت مؤلف كتب مدرسية خبير في المنهاج الجزائري للرياضيات (الجيل الثاني).
تنشئ دروساً تعليمية حقيقية ومنظمة تماماً مثل الكتب المطبوعة:
- مقدمة تحفيزية
- تعريفات واضحة
- خصائص ومبرهنات مع شروحات
- أمثلة محلولة خطوة بخطوة
- تمارين متدرجة الصعوبة (تطبيق ← تحليل ← تركيب)
- ملخص وخريطة ذهنية

أجب دائماً بـ JSON صالح 100% فقط، لا markdown ولا شرح خارج JSON.
اكتب الصيغ الرياضية كلها بـ LaTeX بين $...$ (مثال: $x^2 + 3x = 0$، $\\frac{a}{b}$، $\\sqrt{x}$).`;

    const structurePrompt = `حلل المحتوى التالي وأنشئ بنية كتاب مدرسي تربوية كاملة:

العنوان: ${textbook.title}
المستوى: ${textbook.grade}

--- محتوى الكتاب ---
${workingText.substring(0, 18000)}
--- نهاية المحتوى ---

أنشئ بنية JSON بهذا الشكل بالضبط:

{
  "chapters": [
    {
      "order": 1,
      "title": "Titre français",
      "title_ar": "العنوان بالعربية",
      "domain": "algebra|geometry|statistics|probability|functions|numbers|trigonometry",
      "lessons": [
        {
          "order": 1,
          "title": "Titre de la leçon",
          "title_ar": "عنوان الدرس",
          "objectives": ["هدف تعليمي 1", "هدف تعليمي 2", "هدف 3"],
          "content_summary": "ملخص قصير للدرس (سطرين)",
          "activities": [
            { "order": 1, "type": "explanation", "title_ar": "مقدمة", "content": "نص تحفيزي يربط الدرس بالواقع، مع $LaTeX$ عند الحاجة" },
            { "order": 2, "type": "definition", "title_ar": "تعريف 1", "content": "تعريف رياضي دقيق بـ $LaTeX$" },
            { "order": 3, "type": "property", "title_ar": "خاصية", "content": "نص الخاصية + شرحها" },
            { "order": 4, "type": "theorem", "title_ar": "مبرهنة", "content": "نص المبرهنة", "solution": "البرهان خطوة بخطوة" },
            { "order": 5, "type": "example", "title_ar": "مثال محلول 1", "content": "نص المثال", "solution": "الحل المفصّل خطوة بخطوة بـ $LaTeX$" },
            { "order": 6, "type": "exercise", "title_ar": "تمرين تطبيقي", "content": "نص التمرين", "solution": "الحل المفصّل", "difficulty": 1, "bloom_level": 2, "is_interactive": true, "expected_answer": "الإجابة النهائية", "answer_type": "numeric|expression|text", "hints": ["تلميح 1", "تلميح 2"] },
            { "order": 7, "type": "exercise", "title_ar": "تمرين متوسط", "content": "...", "solution": "...", "difficulty": 2, "bloom_level": 3, "is_interactive": true, "expected_answer": "...", "answer_type": "expression", "hints": ["..."] },
            { "order": 8, "type": "exercise", "title_ar": "تمرين تحدي", "content": "...", "solution": "...", "difficulty": 3, "bloom_level": 4, "is_interactive": true, "expected_answer": "...", "answer_type": "expression", "hints": ["..."] }
          ]
        }
      ]
    }
  ]
}

⚠️ قواعد إلزامية:
- كل درس يجب أن يحتوي على هذا التسلسل التربوي على الأقل: مقدمة (explanation) → تعريف (definition) → خاصية أو مبرهنة → مثال محلول (example) → 3 تمارين متدرجة (exercise: سهل، متوسط، صعب)
- استخرج الفصول من المحتوى الفعلي فقط؛ لا تخترع
- اكتب كل الصيغ الرياضية بـ LaTeX داخل $...$
- title_ar إجباري بالعربية، title بالفرنسية
- التمارين دائماً is_interactive: true مع expected_answer
- اجعل المحتوى تربوياً واضحاً، ليس مجرد نسخ خام
- JSON صالح 100% فقط`;

    const rawResult = await callGeminiText(structurePrompt, systemPrompt);
    const parsed = extractJSON(rawResult);

    await db.from("textbooks").update({ processing_progress: 55 }).eq("id", textbook_id);

    if (!parsed.chapters || !Array.isArray(parsed.chapters) || parsed.chapters.length === 0) {
      throw new Error("AI لم يُرجع بنية فصول صالحة");
    }

    // ── Step 3: Insert structure ──
    let totalActivities = 0;
    const insertedLessonIds: string[] = [];
    const lessonDomainMap: Record<string, string> = {};

    for (const ch of parsed.chapters) {
      const { data: chapterRow } = await db.from("textbook_chapters").insert({
        textbook_id, order_index: ch.order || 0,
        title: ch.title || "Untitled", title_ar: ch.title_ar || "",
        domain: ch.domain || "",
      }).select().single();

      if (!chapterRow) continue;

      for (const lesson of ch.lessons || []) {
        const { data: lessonRow } = await db.from("textbook_lessons").insert({
          chapter_id: chapterRow.id, order_index: lesson.order || 0,
          title: lesson.title || "Untitled", title_ar: lesson.title_ar || "",
          objectives: lesson.objectives || [], content_html: lesson.content_summary || "",
        }).select().single();

        if (!lessonRow) continue;
        insertedLessonIds.push(lessonRow.id);
        lessonDomainMap[lessonRow.id] = ch.domain || "";

        const acts = (lesson.activities || []).map((a: any) => ({
          lesson_id: lessonRow.id, order_index: a.order || 0,
          activity_type: a.type || "exercise",
          title: a.title || "", title_ar: a.title_ar || "",
          content_text: a.content || "", content_latex: a.content || "",
          solution_text: a.solution || "", solution_latex: a.solution || "",
          difficulty: a.difficulty || 1, bloom_level: a.bloom_level || 3,
          hints: a.hints || [],
          is_interactive: a.is_interactive || a.type === "exercise",
          expected_answer: a.expected_answer || "",
          answer_type: a.answer_type || "text",
        }));

        if (acts.length > 0) {
          await db.from("textbook_activities").insert(acts);
          totalActivities += acts.length;
        }
      }
    }

    await db.from("textbooks").update({ processing_progress: 75 }).eq("id", textbook_id);

    // ── Step 4: Link activities to KB skills + KB exercises ──
    const { data: skills } = await db.from("kb_skills").select("id, name, name_ar, domain").limit(500);
    const { data: kbExercises } = await db
      .from("kb_exercises")
      .select("id, text, chapter, grade")
      .eq("grade", textbook.grade)
      .limit(500);

    const { data: activities } = insertedLessonIds.length > 0
      ? await db.from("textbook_activities")
          .select("id, content_text, title_ar, lesson_id, activity_type")
          .in("lesson_id", insertedLessonIds).limit(500)
      : { data: [] };

    if (activities && activities.length > 0) {
      // Skills linking by keyword overlap
      if (skills) {
        const skillLinks: any[] = [];
        for (const act of activities) {
          const actText = `${act.title_ar} ${act.content_text}`.toLowerCase();
          for (const s of skills) {
            if (s.domain && lessonDomainMap[act.lesson_id] && s.domain !== lessonDomainMap[act.lesson_id]) continue;
            const skillText = `${s.name} ${s.name_ar || ""}`.toLowerCase();
            const words = skillText.split(/\s+/).filter((w: string) => w.length > 3);
            if (words.length === 0) continue;
            const matches = words.filter((w: string) => actText.includes(w));
            if (matches.length >= 2) {
              skillLinks.push({ activity_id: act.id, skill_id: s.id, relevance_score: matches.length / words.length });
            }
          }
        }
        if (skillLinks.length > 0) {
          await db.from("textbook_skill_links").insert(skillLinks.slice(0, 300));
        }
      }

      // KB exercise linking — for activities of type "exercise", find similar in kb_exercises
      // Stored in textbook_activities.metadata for the viewer to surface
      if (kbExercises && kbExercises.length > 0) {
        for (const act of activities) {
          if (act.activity_type !== "exercise") continue;
          const actWords = (act.content_text || "")
            .toLowerCase().split(/\s+/).filter((w: string) => w.length > 4);
          if (actWords.length === 0) continue;

          const scored = kbExercises.map((ex: any) => {
            const exText = (ex.text || "").toLowerCase();
            const matches = actWords.filter((w: string) => exText.includes(w)).length;
            return { id: ex.id, score: matches };
          }).filter((x: any) => x.score >= 3)
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 3);

          if (scored.length > 0) {
            await db.from("textbook_activities")
              .update({ metadata: { related_kb_exercise_ids: scored.map((s: any) => s.id) } })
              .eq("id", act.id);
          }
        }
      }
    }

    await db.from("textbooks").update({
      status: "completed", processing_progress: 100,
      metadata: {
        ...((textbook.metadata as any) || {}),
        chapters_count: parsed.chapters.length,
        activities_count: totalActivities,
        processed_at: new Date().toISOString(),
      },
    }).eq("id", textbook_id);

    console.log(`✓ Textbook ${textbook_id}: ${parsed.chapters.length} chapters, ${totalActivities} activities`);
  } catch (e: any) {
    console.error("parse-textbook error:", e);
    try {
      const db2 = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await db2.from("textbooks").update({
        status: "failed",
        processing_log: [{ error: e.message, at: new Date().toISOString() }],
      }).eq("id", textbook_id);
    } catch {}
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { textbook_id, raw_text } = await req.json().catch(() => ({ textbook_id: null, raw_text: null }));
  if (!textbook_id) {
    return new Response(JSON.stringify({ error: "textbook_id required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  EdgeRuntime.waitUntil(processTextbook(textbook_id, raw_text || undefined));

  return new Response(JSON.stringify({ success: true, message: "Processing started" }), {
    status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
