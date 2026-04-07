import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { callGemini, extractJSON, GeminiError } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
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

    // ── Bulk Insert Skills to avoid edge function timeout ───────────────────
    const skillsToInsert = skills.map((s: any) => ({
      name: s.name || `skill_${Math.random().toString(36).substring(7)}`,
      name_ar: s.name_ar || "",
      description: s.description || "",
      domain: s.domain || "algebra",
      subdomain: s.subdomain || "",
      grade: grade || "",
      difficulty: s.difficulty || 1,
      bloom_level: s.bloom_level || 3,
    }));

    const { data: insertedSkillsDB, error: skillsErr } = await db
      .from("kb_skills")
      .insert(skillsToInsert)
      .select();

    if (skillsErr || !insertedSkillsDB) {
      throw new Error(`Failed to insert skills: ${skillsErr?.message}`);
    }

    const skillMap: Record<string, string> = {};
    for (const row of insertedSkillsDB) {
      skillMap[row.name] = row.id;
    }

    // ── Prepare related bulk inserts ─────────────────────────────────────────
    const errorsToInsert: any[] = [];
    const patternLinksToInsert: any[] = [];
    const exerciseLinksToInsert: any[] = [];

    for (const skill of skills) {
      const skillId = skillMap[skill.name];
      if (!skillId) continue;

      if (Array.isArray(skill.common_errors)) {
        for (const err of skill.common_errors) {
          errorsToInsert.push({
            skill_id: skillId,
            error_description: err.description || String(err),
            error_type: err.type || "conceptual",
            severity: err.severity || "medium",
            fix_hint: err.fix_hint || "",
          });
        }
      }

      if (Array.isArray(skill.linked_pattern_ids)) {
        for (const pid of skill.linked_pattern_ids) {
          patternLinksToInsert.push({ skill_id: skillId, pattern_id: pid });
        }
      }

      if (Array.isArray(skill.linked_exercise_ids)) {
        for (const eid of skill.linked_exercise_ids) {
          exerciseLinksToInsert.push({ skill_id: skillId, exercise_id: eid });
        }
      }
    }

    // Execute bulk inserts in parallel
    await Promise.all([
      errorsToInsert.length > 0 ? db.from("kb_skill_errors").insert(errorsToInsert) : Promise.resolve(),
      patternLinksToInsert.length > 0 ? db.from("kb_skill_pattern_links").insert(patternLinksToInsert) : Promise.resolve(),
      exerciseLinksToInsert.length > 0 ? db.from("kb_skill_exercise_links").insert(exerciseLinksToInsert) : Promise.resolve(),
    ]);

    // ── Insert dependencies ────────────────────────────────────────────────────
    const depsToInsert: any[] = [];
    for (const skill of skills) {
      if (!Array.isArray(skill.dependencies)) continue;
      const fromId = skillMap[skill.name];
      if (!fromId) continue;

      for (const depName of skill.dependencies) {
        const toId = skillMap[depName];
        if (!toId) continue;

        depsToInsert.push({
          from_skill_id: fromId,
          to_skill_id: toId,
          dependency_type: "prerequisite",
        });
      }
    }
    if (depsToInsert.length > 0) {
      await db.from("kb_skill_dependencies").insert(depsToInsert);
    }

    // ── Link skills to course & mark complete ──────────────────────────────────
    if (course_id) {
      const courseLinks = insertedSkillsDB.map((skill, idx) => ({
        course_id,
        skill_id: skill.id,
        order_index: idx,
      }));

      if (courseLinks.length > 0) {
        await db.from("kb_course_skill_links").insert(courseLinks);
      }

      await db
        .from("kb_courses")
        .update({ status: "completed", extracted_skills: insertedSkillsDB })
        .eq("id", course_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        skills_count: insertedSkillsDB.length,
        skills: insertedSkillsDB,
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
