import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractedQuestion {
  section_label: string;
  question_number: number;
  sub_question: string | null;
  text: string;
  points: number;
  type: string;
  difficulty: string;
  cognitive_level: string;
  bloom_level: number;
  estimated_time_min: number;
  step_count: number;
  concept_count: number;
  concepts: string[];
  raw_latex: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { upload_id } = await req.json();
    if (!upload_id) {
      return new Response(JSON.stringify({ error: "Missing upload_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: upload, error: uploadErr } = await supabase
      .from("exam_uploads")
      .select("*")
      .eq("id", upload_id)
      .eq("user_id", user.id)
      .single();

    if (uploadErr || !upload) {
      return new Response(JSON.stringify({ error: "Upload not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase
      .from("exam_uploads")
      .update({ status: "processing" })
      .eq("id", upload_id);

    const { data: fileData, error: dlErr } = await supabase.storage
      .from("exam-pdfs")
      .download(upload.file_path);

    if (dlErr || !fileData) {
      await supabase
        .from("exam_uploads")
        .update({ status: "failed", error_message: "Failed to download file" })
        .eq("id", upload_id);
      return new Response(JSON.stringify({ error: "File download failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ""
      )
    );

    // Use Native Google Gemini API
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
    if (!GEMINI_API_KEY) {
      await supabase
        .from("exam_uploads")
        .update({ status: "failed", error_message: "GEMINI_API_KEY not set" })
        .eq("id", upload_id);
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `أنت محلل امتحانات رياضيات جزائرية خبير. حلل هذا الامتحان بدقة واستخرج كل الأسئلة بالإضافة إلى تحليل معمق للهيكل والأسلوب التربوي والبصري.

تحديد نوع الامتحان (format):
- bem: إذا وجد مفردات "شهادة التعليم المتوسط" أو "BEM" أو "دورة جوان" في ترويسة رسمية.
- bac: إذا وجد "شهادة البكالوريا" أو "BAC" أو "دورة جوان" في ترويسة رسمية.
- regular: إذا كان "فرض"، "اختبار فصلي"، "سلسلة تمارين"، أو امتحان مدرسي عادي لا يتبع الترويسة الوطنية الرسمية.

تحليل الأسلوب والهيكل (style_metadata):
- typography: نوع الخطوط المستخدمة (هل هي Serif للرياضيات و Sans-serif للنصوص؟)، أحجام الخطوط النسبية (العناوين، النصوص)، هل هناك خطوط غليظة للأرقام؟
- layout: هل التنسيق عمود واحد أم عمودين؟ هل المسافات بين الأسطر واسعة أم ضيقة؟ هل هناك صناديق أو حدود حول التمارين؟
- structure: كيف يتم ترتيب التمارين؟ هل هناك تدرج واضح في الصعوبة (تدرج خطي)؟ هل البداية بتمارين بسيطة ثم مسألة مركبة؟
- questioning_approach: هل الأسئلة مباشرة (Explicit) أم غامضة تتطلب استنتاجاً (Implicit)؟ ما هي نسبة الأسئلة التي تتطلب برهاناً؟

لكل سؤال استخرج:
- section_label: اسم القسم (التمرين الأول، التمرين الثاني...)
- question_number: رقم السؤال
- sub_question: السؤال الفرعي أو null
- text: نص السؤال كاملاً
- points: عدد النقاط
- type: نوع السؤال (algebra, geometry, functions...)
- difficulty: (easy, medium, hard)
- cognitive_level: (remember, understand, apply, analyze, evaluate, create)
- bloom_level: (1, 2, 3, 4, 5, 6)
- estimated_time_min: عدد دقائق تقريبي للحل
- step_count: عدد الخطوات المتوقع للحل
- concept_count: عدد المفاهيم الرياضية المتداخلة
- concepts: قائمة المفاهيم الرياضية
- raw_latex: الصيغة الرياضية بتنسيق LaTeX

أعد النتيجة كـ JSON فقط بالهيكل التالي:
{
  "format": "bem|bac|regular",
  "year": "2024",
  "session": "juin",
  "grade": "middle_4",
  "style_metadata": {
    "typography_notes": "وصف دقيق للخطوط والأسلوب البصري",
    "change_summary": "ملخص قصير للتطور التربوي أو البصري المكتشف في هذا الامتحان مقارنة بالمعايير العامة"
  },
  "structural_patterns": {
    "difficulty_curve": "linear|stepped|u-shaped",
    "explicit_implicit_ratio": 0.8,
    "targetDifficultyDist": { "easy": 30, "medium": 50, "hard": 20 },
    "requiredCognitiveLevels": ["apply", "analyze", "evaluate"],
    "expectedDomains": ["algebra", "geometry"],
    "structural_notes": "وصف لطريقة طرح الأسئلة والتدرج في الصعوبة"
  },
  "questions": [...]
} (تأكد من إرجاع JSON صالح فقط)`;

    const aiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64,
                },
              },
              {
                text: prompt,
              },
            ],
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("Gemini API error:", aiResponse.status, errText);
      
      await supabase
        .from("exam_uploads")
        .update({ status: "failed", error_message: `Gemini API error: ${aiResponse.status}` })
        .eq("id", upload_id);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const parsed = aiData?.candidates?.[0]?.content?.parts?.[0]?.text 
      ? JSON.parse(aiData.candidates[0].content.parts[0].text) 
      : null;

    if (!parsed) {
      await supabase
        .from("exam_uploads")
        .update({ status: "failed", error_message: "Empty or invalid AI response" })
        .eq("id", upload_id);
      return new Response(JSON.stringify({ error: "Parse failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questions: ExtractedQuestion[] = parsed.questions || [];

    await supabase
      .from("exam_uploads")
      .update({
        format: parsed.format || upload.format,
        year: parsed.year || upload.year,
        session: parsed.session || upload.session,
        grade: parsed.grade || upload.grade,
        extracted_metadata: parsed.style_metadata || {},
        extracted_patterns: parsed.structural_patterns || {},
        status: "completed",
      })
      .eq("id", upload_id);

    if (questions.length > 0) {
      const questionsToInsert = questions.map((q, i) => ({
        upload_id,
        user_id: user.id,
        section_label: q.section_label || `سؤال ${i + 1}`,
        question_number: q.question_number || i + 1,
        sub_question: q.sub_question,
        text: q.text,
        points: q.points || 0,
        type: q.type || "unclassified",
        difficulty: q.difficulty || "medium",
        cognitive_level: q.cognitive_level || "apply",
        bloom_level: q.bloom_level || 3,
        estimated_time_min: q.estimated_time_min || 0,
        step_count: q.step_count || 0,
        concept_count: q.concept_count || 0,
        concepts: q.concepts || [],
        raw_latex: q.raw_latex,
        linked_pattern_ids: [],
      }));

      await supabase.from("exam_extracted_questions").insert(questionsToInsert);

      // Also insert into exam_kb_entries + exam_kb_questions so they appear in the Questions tab
      const { data: kbEntry } = await supabase.from("exam_kb_entries").insert({
        user_id: user.id,
        year: parsed.year || "",
        session: parsed.session || "juin",
        format: parsed.format || "unknown",
        grade: parsed.grade || "",
        stream: null,
      }).select("id").single();

      if (kbEntry) {
        const kbQuestions = questions.map((q, i) => ({
          user_id: user.id,
          exam_id: kbEntry.id,
          section_label: q.section_label || `سؤال ${i + 1}`,
          question_number: q.question_number || i + 1,
          sub_question: q.sub_question || null,
          text: q.text,
          points: q.points || 0,
          type: q.type || "unclassified",
          difficulty: q.difficulty || "medium",
          cognitive_level: q.cognitive_level || "apply",
          bloom_level: q.bloom_level || 3,
          estimated_time_min: q.estimated_time_min || 0,
          step_count: q.step_count || 0,
          concept_count: q.concept_count || 0,
          concepts: q.concepts || [],
          linked_pattern_ids: [],
          linked_exercise_ids: [],
        }));
        await supabase.from("exam_kb_questions").insert(kbQuestions);
      }
    }

    const topicFreq: Record<string, number> = {};
    const diffDist: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    const conceptFreq: Record<string, number> = {};

    questions.forEach((q) => {
      topicFreq[q.type] = (topicFreq[q.type] || 0) + 1;
      diffDist[q.difficulty] = (diffDist[q.difficulty] || 0) + 1;
      (q.concepts || []).forEach((c) => {
        conceptFreq[c] = (conceptFreq[c] || 0) + 1;
      });
    });

    await supabase.from("exam_analytics").insert({
      user_id: user.id,
      upload_id,
      topic_frequency: topicFreq,
      difficulty_distribution: diffDist,
      concept_frequency: conceptFreq,
      metadata: {
        format: parsed.format,
        year: parsed.year,
        session: parsed.session,
        grade: parsed.grade,
        total_questions: questions.length,
        total_points: questions.reduce((s, q) => s + (q.points || 0), 0),
        style: parsed.style_metadata,
        structure: parsed.structural_patterns,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        upload_id,
        questions_count: questions.length,
        format: parsed.format,
        year: parsed.year,
        grade: parsed.grade,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Parse exam error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
