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

    // Use Lovable AI gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      await supabase
        .from("exam_uploads")
        .update({ status: "failed", error_message: "LOVABLE_API_KEY not set" })
        .eq("id", upload_id);
      return new Response(JSON.stringify({ error: "AI key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt = `أنت محلل امتحانات رياضيات جزائرية. حلل هذا الامتحان واستخرج كل الأسئلة بالتنسيق التالي.

لكل سؤال استخرج:
- section_label: اسم القسم (التمرين الأول، التمرين الثاني، المسألة، إلخ)
- question_number: رقم السؤال (1, 2, 3...)
- sub_question: السؤال الفرعي إن وجد أو null
- text: نص السؤال كاملاً مع الصيغ الرياضية
- points: عدد النقاط (إن كان مذكوراً، وإلا قدّر)
- type: نوع السؤال (algebra, equations, geometry, statistics, probability, functions, calculus, sequences, trigonometry, arithmetic, fractions, number_sets, proportionality, prove, factor, solve_equation, analytic_geometry, systems, transformations, solids, other)
- difficulty: مستوى الصعوبة (easy, medium, hard)
- concepts: قائمة المفاهيم الرياضية المستخدمة
- raw_latex: الصيغة الرياضية بتنسيق LaTeX إن أمكن

حدد أيضاً:
- format: نوع الامتحان (bem, bac, regular)
- year: السنة إن كانت مذكورة
- session: الدورة (juin, septembre, remplacement) إن كانت مذكورة
- grade: المستوى الدراسي

أعد النتيجة كـ JSON فقط بهذا الشكل:
{
  "format": "bem|bac|regular",
  "year": "2024",
  "session": "juin",
  "grade": "middle_4",
  "questions": [...]
}`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:application/pdf;base64,${base64}`,
                  },
                },
                {
                  type: "text",
                  text: prompt,
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 8192,
        }),
      }
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      
      if (aiResponse.status === 429) {
        await supabase
          .from("exam_uploads")
          .update({ status: "failed", error_message: "Rate limit exceeded, try again later" })
          .eq("id", upload_id);
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        await supabase
          .from("exam_uploads")
          .update({ status: "failed", error_message: "AI credits exhausted" })
          .eq("id", upload_id);
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase
        .from("exam_uploads")
        .update({ status: "failed", error_message: `AI error: ${aiResponse.status}` })
        .eq("id", upload_id);
      return new Response(JSON.stringify({ error: "AI analysis failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const aiText = aiData?.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      await supabase
        .from("exam_uploads")
        .update({ status: "failed", error_message: "Could not parse AI response" })
        .eq("id", upload_id);
      return new Response(JSON.stringify({ error: "Parse failed", raw: aiText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const questions: ExtractedQuestion[] = parsed.questions || [];

    await supabase
      .from("exam_uploads")
      .update({
        format: parsed.format || upload.format,
        year: parsed.year || upload.year,
        session: parsed.session || upload.session,
        grade: parsed.grade || upload.grade,
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
