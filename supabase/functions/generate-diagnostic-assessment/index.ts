import { callGemini, GeminiError, extractJSON } from "../_shared/gemini.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const COUNTRY_NAMES: Record<string, string> = {
  DZ: "الجزائر (المنهاج الجزائري الرسمي)",
  OM: "سلطنة عُمان (المنهاج العُماني الرسمي)",
};

// Stable misconception types matching public.misconception_skill_map.misconception_type
type Misc =
  | "sign_error"
  | "distribution_error"
  | "exponent_error"
  | "bracket_error"
  | "arithmetic_error"
  | "missing_term"
  | "inequality_flip"
  | "triangle_inequality"
  | "square_root_estimation"
  | "area_scaling"
  | "reverse_modeling"
  | "function_distribution";

const TYPE_BADGES: Record<string, { color: string; bg: string; icon: string }> = {
  algebra: { color: "var(--algebra)", bg: "rgba(167,139,250,0.08)", icon: "💡" },
  geometry: { color: "var(--geometry)", bg: "rgba(16,185,129,0.08)", icon: "📐" },
  arithmetic: { color: "var(--primary)", bg: "rgba(59,130,246,0.08)", icon: "🔢" },
  inequality: { color: "var(--destructive)", bg: "rgba(248,113,113,0.08)", icon: "🪤" },
  strategy: { color: "var(--accent)", bg: "rgba(245,158,11,0.08)", icon: "🎯" },
  function: { color: "var(--functions)", bg: "rgba(225,29,72,0.08)", icon: "📈" },
};

function badgeFor(domain?: string | null) {
  const d = (domain || "").toLowerCase();
  if (d.includes("geom")) return TYPE_BADGES.geometry;
  if (d.includes("inequal")) return TYPE_BADGES.inequality;
  if (d.includes("func")) return TYPE_BADGES.function;
  if (d.includes("arith") || d.includes("number")) return TYPE_BADGES.arithmetic;
  if (d.includes("strateg")) return TYPE_BADGES.strategy;
  return TYPE_BADGES.algebra;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { level, countryCode = "DZ", count = 5, seed = Math.random(), forceRefresh = false } =
      await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const db = createClient(supabaseUrl, supabaseKey);

    // Cache the LARGE pool, not the served set. Slice + shuffle on every request.
    const POOL_SIZE = Math.max(count * 6, 30); // build a big varied pool
    const cacheKey = `diag:pool:${countryCode}:${level}`;

    // ── 1) Cache lookup (pool of items, 6h TTL) ─────────────────────────
    if (!forceRefresh) {
      const { data: cached } = await db
        .from("diagnostic_cache")
        .select("exercises, source, expires_at")
        .eq("cache_key", cacheKey)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (cached?.exercises && Array.isArray(cached.exercises) && cached.exercises.length >= count) {
        const picked = pickFromPool(cached.exercises, count, seed);
        return new Response(
          JSON.stringify({ exercises: picked, source: cached.source, cached: true, poolSize: cached.exercises.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // ── 2) KB-first: build a LARGE varied pool ──────────────────────────
    const kbPool = await buildFromKB(db, level, countryCode, POOL_SIZE);
    if (kbPool.length >= count * 3) {
      // Enough variety from KB alone
      await writeCache(db, cacheKey, level, countryCode, kbPool, "kb");
      const picked = pickFromPool(kbPool, count, seed);
      return new Response(
        JSON.stringify({ exercises: picked, source: "kb", poolSize: kbPool.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── 3) AI augment / fallback ────────────────────────────────────────
    try {
      const aiExercises = await generateWithAI(db, level, countryCode, Math.max(count * 2, 10), seed);
      const merged = dedupePool([...kbPool, ...aiExercises]);
      await writeCache(db, cacheKey, level, countryCode, merged, kbPool.length ? "hybrid" : "ai");
      const picked = pickFromPool(merged, count, seed);
      return new Response(
        JSON.stringify({ exercises: picked, source: kbPool.length ? "hybrid" : "ai", poolSize: merged.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (aiErr) {
      console.warn("[diagnostic] AI failed, using KB+static fallback:", aiErr);
      const staticPool = getStaticFallbackPool();
      const merged = dedupePool([...kbPool, ...staticPool]);
      await writeCache(db, cacheKey, level, countryCode, merged, "fallback");
      const picked = pickFromPool(merged, count, seed);
      return new Response(
        JSON.stringify({ exercises: picked, source: "fallback", reason: (aiErr as any)?.code, poolSize: merged.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// Picking: seeded shuffle ensures different students get different sets,
// while same seed reproduces (useful for retries).
// ─────────────────────────────────────────────────────────────────────────
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickFromPool(pool: any[], count: number, seed: number): any[] {
  const rng = mulberry32(Math.floor((seed || Math.random()) * 1e9));
  const arr = [...pool];
  // Fisher-Yates with seeded RNG
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Diversify by type: try to pick at most ceil(count/3) per type
  const byType: Record<string, any[]> = {};
  for (const it of arr) {
    const t = it.type || "standard";
    (byType[t] ||= []).push(it);
  }
  const types = Object.keys(byType);
  const out: any[] = [];
  let i = 0;
  while (out.length < count && types.some((t) => byType[t].length > 0)) {
    const t = types[i % types.length];
    const next = byType[t].shift();
    if (next) out.push(next);
    i++;
  }
  // Fill any remainder
  for (const it of arr) {
    if (out.length >= count) break;
    if (!out.includes(it)) out.push(it);
  }
  return out.slice(0, count);
}

function dedupePool(items: any[]): any[] {
  const seen = new Set<string>();
  const out: any[] = [];
  for (const it of items) {
    const key = (it.question || "").trim().slice(0, 120);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────
// KB-first builder: synthesizes diagnostic items from kb_skills + kb_skill_errors
// ─────────────────────────────────────────────────────────────────────────
async function buildFromKB(db: any, level: string, countryCode: string, count: number): Promise<any[]> {
  // Resolve skills via curriculum_mappings, fall back to kb_skills.grade
  let skillIds: string[] = [];
  try {
    const { data: maps } = await db
      .from("curriculum_mappings")
      .select("skill_id")
      .eq("country_code", countryCode)
      .eq("grade_code", level);
    skillIds = (maps || []).map((m: any) => m.skill_id);

    if (skillIds.length === 0) {
      const { data: gs } = await db.from("kb_skills").select("id").eq("grade", level).limit(40);
      skillIds = (gs || []).map((s: any) => s.id);
    }
  } catch (e) {
    console.warn("KB skill lookup failed:", e);
  }
  // If no skills found, still try to serve raw exercises from KB by grade — better than nothing
  let skills: any[] = [];
  if (skillIds.length > 0) {
    const { data } = await db
      .from("kb_skills")
      .select("id, name_ar, name, domain, subdomain")
      .in("id", skillIds.slice(0, 40));
    skills = data || [];
  }
  const skillById = new Map<string, any>((skills || []).map((s: any) => [s.id as string, s]));

  // ── Fetch a LARGE pool of exercises for this grade
  // Strategy: prefer skill-linked exercises, but fall back to grade-matched exercises
  // (most KB exercises are NOT yet linked to skills, so this dramatically increases variety).
  const skillIdList = skills.map((s: any) => s.id);

  const [{ data: linkedRows }, { data: gradeExs }] = await Promise.all([
    db.from("kb_skill_exercise_links").select("skill_id, exercise_id").in("skill_id", skillIdList).limit(200),
    db
      .from("kb_exercises")
      .select("id, text, type, difficulty, bloom_level, chapter")
      .eq("country_code", countryCode)
      .eq("grade", level)
      .limit(Math.max(count * 4, 80)),
  ]);

  // Map exercise → skill (for linked ones)
  const skillByExercise = new Map<string, any>();
  for (const l of linkedRows || []) {
    if (!skillByExercise.has(l.exercise_id)) {
      skillByExercise.set(l.exercise_id, skillById.get(l.skill_id));
    }
  }

  // Combine: linked first (better signal), then grade-matched fillers
  const linkedIds = new Set(skillByExercise.keys());
  const allExercises = [
    ...(gradeExs || []).filter((e: any) => linkedIds.has(e.id)),
    ...(gradeExs || []).filter((e: any) => !linkedIds.has(e.id)),
  ];

  // Shuffle once before sampling so different cache builds yield different orderings
  for (let i = allExercises.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allExercises[i], allExercises[j]] = [allExercises[j], allExercises[i]];
  }

  // Pull documented misconceptions for these skills (highest-frequency first)
  const { data: errors } = await db
    .from("kb_skill_errors")
    .select("skill_id, error_description, fix_hint, severity, error_type")
    .in("skill_id", skillIdList)
    .order("frequency", { ascending: false })
    .limit(Math.max(count * 2, 20));

  const out: any[] = [];

  // (a) From real KB exercises — favor variety in length/difficulty
  for (const ex of allExercises) {
    const text = (ex.text || "").trim();
    if (!text || text.length < 12 || text.length > 600) continue; // skip degenerate items
    const skill = skillByExercise.get(ex.id);
    const badge = badgeFor(skill?.domain || ex.chapter);
    out.push({
      id: `kb-ex-${ex.id}`,
      type: "standard",
      typeName: "تمرين منهجي",
      question: text,
      answer: "",
      hint: skill ? `يستهدف مهارة: ${skill.name_ar || skill.name}` : `الفصل: ${ex.chapter || "—"}`,
      kind: "text",
      icon: badge.icon,
      misconception: skill?.name_ar || skill?.name || "مهارة من المنهج",
      misconceptionType: inferMiscType(skill?.domain, skill?.subdomain),
      badgeColor: badge.color,
      badgeBg: badge.bg,
      placeholder: "اكتب حلك أو استراتيجيتك...",
    });
    if (out.length >= count) break;
  }

  // (b) From documented errors — wrap as "trap" QCM items
  for (const err of errors || []) {
    if (out.length >= count) break;
    const skill = skillById.get(err.skill_id);
    const badge = badgeFor(skill?.domain);
    out.push({
      id: `kb-err-${err.skill_id}-${out.length}`,
      type: "trap",
      typeName: "فخ موثَّق",
      question: `طالب قال: "${err.error_description}". هل توافقه؟`,
      options: ["نعم، صحيح", "لا، خطأ شائع"],
      answer: "لا، خطأ شائع",
      hint: err.fix_hint || `راجع المهارة: ${skill?.name_ar || skill?.name || "—"}`,
      kind: "qcm",
      icon: badge.icon,
      misconception: err.error_description,
      misconceptionType: inferMiscType(skill?.domain, skill?.subdomain, err.error_type),
      badgeColor: badge.color,
      badgeBg: badge.bg,
    });
  }

  return out;
}

function inferMiscType(domain?: string, subdomain?: string, errorType?: string): Misc | undefined {
  const d = `${domain || ""} ${subdomain || ""} ${errorType || ""}`.toLowerCase();
  if (d.includes("sign")) return "sign_error";
  if (d.includes("distrib")) return "distribution_error";
  if (d.includes("expon") || d.includes("power")) return "exponent_error";
  if (d.includes("bracket") || d.includes("paren")) return "bracket_error";
  if (d.includes("arith")) return "arithmetic_error";
  if (d.includes("inequal")) return "inequality_flip";
  if (d.includes("triang")) return "triangle_inequality";
  if (d.includes("root") || d.includes("sqrt")) return "square_root_estimation";
  if (d.includes("area") || d.includes("scaling")) return "area_scaling";
  if (d.includes("func")) return "function_distribution";
  return undefined;
}

async function writeCache(
  db: any,
  cacheKey: string,
  level: string,
  countryCode: string,
  exercises: any[],
  source: string,
) {
  try {
    await db
      .from("diagnostic_cache")
      .upsert(
        {
          cache_key: cacheKey,
          level,
          country_code: countryCode,
          exercises,
          source,
          expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        },
        { onConflict: "cache_key" },
      );
  } catch (e) {
    console.warn("cache write failed (non-fatal):", e);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// AI generator (used only when KB returns < count items)
// ─────────────────────────────────────────────────────────────────────────
async function generateWithAI(
  db: any,
  level: string,
  countryCode: string,
  count: number,
  seed: number,
): Promise<any[]> {
  // Build context
  let skillContext = "";
  let misconceptionContext = "";
  let exerciseContext = "";
  try {
    const { data: maps } = await db
      .from("curriculum_mappings")
      .select("skill_id")
      .eq("country_code", countryCode)
      .eq("grade_code", level);
    let skillIds = (maps || []).map((m: any) => m.skill_id);
    if (skillIds.length === 0) {
      const { data: gs } = await db.from("kb_skills").select("id").eq("grade", level).limit(40);
      skillIds = (gs || []).map((s: any) => s.id);
    }
    if (skillIds.length > 0) {
      const { data: skills } = await db
        .from("kb_skills")
        .select("id, name_ar, name, domain, subdomain, difficulty, bloom_level")
        .in("id", skillIds.slice(0, 30));
      if (skills?.length) {
        skillContext =
          `\n## مهارات منهج ${COUNTRY_NAMES[countryCode] || countryCode} (${level}):\n` +
          skills
            .map((s: any) => `- ${s.name_ar || s.name} [${s.domain}/${s.subdomain || "—"}]`)
            .join("\n");

        const { data: errs } = await db
          .from("kb_skill_errors")
          .select("error_description, fix_hint")
          .in("skill_id", skills.map((s: any) => s.id))
          .order("frequency", { ascending: false })
          .limit(10);
        if (errs?.length) {
          misconceptionContext =
            `\n## أخطاء شائعة موثَّقة (استهدفها):\n` +
            errs.map((e: any) => `- ${e.error_description}`).join("\n");
        }
      }
    }

    const { data: exs } = await db
      .from("kb_exercises")
      .select("text, type")
      .eq("country_code", countryCode)
      .eq("grade", level)
      .limit(5);
    if (exs?.length) {
      exerciseContext =
        `\n## أمثلة على الأسلوب (لا تنسخها):\n` +
        exs.map((e: any, i: number) => `${i + 1}. ${(e.text || "").slice(0, 200)}`).join("\n");
    }
  } catch {
    /* non-fatal */
  }

  const countryHint = COUNTRY_NAMES[countryCode] || countryCode;
  const prompt = `أنت خبير بيداغوجي في الرياضيات وفق منهاج ${countryHint}.
ولّد ${count} أسئلة "تشخيص عادل" للمستوى ${level}. بصمة عشوائية: ${seed}.
${skillContext}${misconceptionContext}${exerciseContext}

## مبادئ:
1. التفكير > النتيجة (اسأل "هل الطريقة صحيحة؟" بدل "احسب").
2. استهدف الأخطاء الموثَّقة أعلاه.
3. تنوّع: logic, trap, standard, open, strategic.
4. التزم بمصطلحات منهج ${countryHint}.

## JSON المطلوب فقط:
{"exercises":[{"id":1,"type":"logic|trap|standard|open|strategic","typeName":"...","question":"...","options":["..."],"answer":"...","hint":"...","kind":"qcm|numeric|text","icon":"💡","misconception":"...","misconceptionType":"sign_error|distribution_error|exponent_error|inequality_flip|triangle_inequality|square_root_estimation|area_scaling|reverse_modeling|function_distribution","badgeColor":"var(--primary)","badgeBg":"rgba(...)"}]}

قواعد JSON: أعد JSON خام فقط. هرّب \\\\sqrt و \\\\frac داخل النصوص.`;

  const response = await callGemini([{ role: "user", parts: [{ text: prompt }] }], {
    systemInstruction: `أنت خبير في تقييمات تشخيصية وفق منهج ${countryHint}. JSON صالح فقط.`,
    temperature: 0.8,
    responseMimeType: "application/json",
  });

  const parsed = extractJSON(response.text);
  return Array.isArray(parsed?.exercises) ? parsed.exercises : [];
}

// ─────────────────────────────────────────────────────────────────────────
// Static fallback pool — last resort if KB is empty AND AI fails
// ─────────────────────────────────────────────────────────────────────────
function getStaticFallbackPool() {
  return [
    {
      id: 101,
      type: "logic",
      typeName: "تحليل منطقي",
      question: "قالت آمال: $(x+5)^2 = x^2 + 25$. هل هي محقة؟",
      options: ["نعم، صحيحة", "لا، خطأ في القواعد"],
      answer: "لا، خطأ في القواعد",
      hint: "تذكر مربع المجموع.",
      kind: "qcm",
      icon: "💡",
      misconception: "خطأ في توزيع القوى",
      misconceptionType: "distribution_error",
      badgeColor: "var(--algebra)",
      badgeBg: "rgba(167,139,250,0.08)",
    },
    {
      id: 102,
      type: "trap",
      typeName: "فخ المتراجحات",
      question: "حل المتراجحة: $-3x > 9$ هو:",
      options: ["$x > -3$", "$x < -3$", "$x > 3$", "$x < 3$"],
      answer: "$x < -3$",
      hint: "ماذا يحدث عند الضرب في عدد سالب؟",
      kind: "qcm",
      icon: "🪤",
      misconception: "نسيان قلب المتراجحة",
      misconceptionType: "inequality_flip",
      badgeColor: "var(--destructive)",
      badgeBg: "rgba(248,113,113,0.08)",
    },
    {
      id: 103,
      type: "standard",
      typeName: "حساب ذهني",
      question: "ما هو نصف $2^{10}$؟",
      options: ["$1^{10}$", "$2^5$", "$2^9$", "$1^5$"],
      answer: "$2^9$",
      hint: "القسمة على 2 = طرح 1 من الأس.",
      kind: "qcm",
      icon: "🔢",
      misconception: "خطأ في قوانين الأسس",
      misconceptionType: "exponent_error",
      badgeColor: "var(--primary)",
      badgeBg: "rgba(59,130,246,0.08)",
    },
    {
      id: 104,
      type: "logic",
      typeName: "تحدي المساحات",
      question: "إذا ضاعفنا طول ضلع مربع، هل تتضاعف مساحته؟",
      options: ["نعم، تتضاعف", "لا، تصبح 4 أضعاف", "لا، تصبح 8 أضعاف"],
      answer: "لا، تصبح 4 أضعاف",
      hint: "$(2s)^2 = ?$",
      kind: "qcm",
      icon: "📐",
      misconception: "عدم إدراك التغير التربيعي",
      misconceptionType: "area_scaling",
      badgeColor: "var(--geometry)",
      badgeBg: "rgba(16,185,129,0.08)",
    },
    {
      id: 105,
      type: "strategic",
      typeName: "تفكير تراجعي",
      question: "عدد إذا أضفنا له 5 ثم ضربناه في 2 حصلنا على 20. ما هو؟",
      answer: "5",
      hint: "ابدأ من النتيجة وارجع للخلف.",
      kind: "numeric",
      icon: "🎯",
      misconception: "صعوبة في النمذجة العكسية",
      misconceptionType: "reverse_modeling",
      badgeColor: "var(--accent)",
      badgeBg: "rgba(245,158,11,0.08)",
      placeholder: "اكتب العدد فقط...",
    },
  ];
}
