import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";
import { callGemini, extractJSON, GeminiError } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { course_id, content_text, title, grade } = await req.json();

    if (!content_text || content_text.trim().length < 50) {
      return new Response(JSON.stringify({ error: "محتوى غير كافٍ للتحليل" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseKey);

    // Fetch existing patterns and exercises for linking
    const { data: patterns } = await db.from("kb_patterns").select("id, name, type, description").limit(500);
    const { data: exercises } = await db.from("kb_exercises").select("id, text, type, grade").limit(200);

    const patternList = (patterns || []).map((p: any) => `${p.id}: ${p.name} (${p.type})`).join("\n");
    const exerciseSample = (exercises || [])
      .slice(0, 30)
      .map((e: any) => `${e.id}: ${(e.text || "").slice(0, 80)}`)
      .join("\n");

    const prompt = `أنت خبير بيداغوجي في المنهج الجزائري (الجيل الثاني). حلل المحتوى التالي واستخرج المهارات (Skills) بدقة.

## المحتوى:
عنوان: ${title || "غير محدد"}
المستوى: ${grade || "غير محدد"}

${content_text.slice(0, 12000)}

## الأنماط الموجودة في قاعدة المعرفة:
${patternList.slice(0, 3000)}

## نماذج من التمارين:
${exerciseSample.slice(0, 2000)}

## المطلوب:
استخرج المهارات الدقيقة (ليس عناوين الدروس!) بالشكل التالي:

لكل مهارة:
1. name: اسم المهارة بالفرنسية (قصير ودقيق)
2. name_ar: اسم المهارة بالعربية
3. description: وصف تفصيلي
4. domain: المجال (algebra/geometry/statistics/probability/functions)
5. subdomain: المجال الفرعي
6. difficulty: 1-5
7. bloom_level: 1-6
8. dependencies: قائمة المهارات المسبقة (أسماء المهارات الأخرى في نفس القائمة)
9. common_errors: أخطاء شائعة مرتبطة بهذه المهارة (2-4 أخطاء)
   - description: وصف الخطأ
   - type: نوع (conceptual/procedural/arithmetic/notation)
   - severity: خطورة (low/medium/high)
   - fix_hint: كيف يُصحح
10. linked_pattern_ids: معرفات الأنماط المرتبطة من القائمة أعلاه
11. linked_exercise_ids: معرفات التمارين المرتبطة من القائمة أعلاه

⚠️ مهم: فكك المهارات لا الدروس!
مثلاً بدل "المعادلات" → "استخراج المجهول", "ترجمة نص إلى معادلة", "التعامل مع الفرق والضعف"

أجب بـ JSON فقط بالشكل: { "skills": [...] }`;

    const response = await callGemini([{ role: "user", parts: [{ text: prompt }] }], {
      temperature: 0.15,
      model: "gemini-2.5-flash",
    });

    const parsed = extractJSON(response.text);
    const skills = parsed.skills || parsed;

    if (!Array.isArray(skills) || skills.length === 0) {
      return new Response(JSON.stringify({ error: "لم يتم استخراج مهارات", raw: response.text.slice(0, 500) }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Insert skills ──────────────────────────────────────────────────────────
    const skillMap: Record<string, string> = {};
    const insertedSkills: any[] = [];

    for (const skill of skills) {
      const { data: inserted, error: skillErr } = await db
        .from("kb_skills")
        .insert({
          name: skill.name || "",
          name_ar: skill.name_ar || "",
          description: skill.description || "",
          domain: skill.domain || "algebra",
          subdomain: skill.subdomain || "",
          grade: grade || "",
          difficulty: skill.difficulty || 1,
          bloom_level: skill.bloom_level || 3,
        })
        .select("id")
        .single();

      if (skillErr || !inserted) {
        console.error("Skill insert error:", skillErr?.message);
        continue;
      }

      skillMap[skill.name] = inserted.id;
      insertedSkills.push({ ...skill, id: inserted.id });

      // ── Insert common errors ─────────────────────────────────────────────────
      if (Array.isArray(skill.common_errors)) {
        for (const err of skill.common_errors) {
          const { error: errInsertErr } = await db.from("kb_skill_errors").insert({
            skill_id: inserted.id,
            error_description: err.description || String(err),
            error_type: err.type || "conceptual",
            severity: err.severity || "medium",
            fix_hint: err.fix_hint || "",
          });
          if (errInsertErr) {
            console.error("Error insert failed:", errInsertErr.message);
          }
        }
      }

      // ── Link patterns ────────────────────────────────────────────────────────
      if (Array.isArray(skill.linked_pattern_ids)) {
        for (const pid of skill.linked_pattern_ids) {
          const { error: linkErr } = await db
            .from("kb_skill_pattern_links")
            .insert({ skill_id: inserted.id, pattern_id: pid });
          if (linkErr) {
            console.error("Pattern link failed:", linkErr.message);
          }
        }
      }

      // ── Link exercises ───────────────────────────────────────────────────────
      if (Array.isArray(skill.linked_exercise_ids)) {
        for (const eid of skill.linked_exercise_ids) {
          const { error: exLinkErr } = await db
            .from("kb_skill_exercise_links")
            .insert({ skill_id: inserted.id, exercise_id: eid });
          if (exLinkErr) {
            console.error("Exercise link failed:", exLinkErr.message);
          }
        }
      }
    }

    // ── Insert dependencies ────────────────────────────────────────────────────
    for (const skill of skills) {
      if (!Array.isArray(skill.dependencies)) continue;
      const fromId = skillMap[skill.name];
      if (!fromId) continue;

      for (const depName of skill.dependencies) {
        const toId = skillMap[depName];
        if (!toId) continue;

        const { error: depErr } = await db.from("kb_skill_dependencies").insert({
          from_skill_id: fromId,
          to_skill_id: toId,
          dependency_type: "prerequisite",
        });
        if (depErr) {
          console.error("Dependency insert failed:", depErr.message);
        }
      }
    }

    // ── Link skills to course & mark complete ──────────────────────────────────
    if (course_id) {
      let order = 0;
      for (const skill of insertedSkills) {
        const { error: courseLinkErr } = await db.from("kb_course_skill_links").insert({
          course_id,
          skill_id: skill.id,
          order_index: order++,
        });
        if (courseLinkErr) {
          console.error("Course-skill link failed:", courseLinkErr.message);
        }
      }

      const { error: updateErr } = await db
        .from("kb_courses")
        .update({ status: "completed", extracted_skills: insertedSkills })
        .eq("id", course_id);
      if (updateErr) {
        console.error("Course update failed:", updateErr.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        skills_count: insertedSkills.length,
        skills: insertedSkills,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    if (e instanceof GeminiError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: e.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("extract-skills error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
