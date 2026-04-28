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
// Quality filter: a diagnostic item must be auto-gradable AND answerable
// without paper. Reject anything that asks the student to draw, construct,
// prove, sketch a figure, or produce a free-text justification — those
// can't be checked by the QCM/numeric profiler and only confuse the user.
// ─────────────────────────────────────────────────────────────────────────
const NON_GRADABLE_RE =
  /(ارسم|أرسم|اِرسم|أنشئ|اِنشئ|إنشئ|مثّل|مثل بيانيا|بيِّن|بيّن أنّ|برهن|أثبت|عيّن|اِستنتج|استنتج|اُكتب نصاً|اكتب نصا|اكتب فقرة|اكتب جملة|اشرح|علِّل|فسِّر|بالاعتماد على الشكل|اعتماداً على الشكل|الشكل المقابل|الرسم المقابل|أكمل الرسم|drawing|construct|sketch|prove|show that|justify)/i;

function isGradableQuestion(q: string | undefined | null, kind?: string, type?: string): boolean {
  if (!q || typeof q !== "string") return false;
  const text = q.trim();
  if (text.length < 8 || text.length > 600) return false;
  if (kind && !["qcm", "numeric"].includes(kind)) return false;
  if (type && ["open", "drawing", "construction", "proof"].includes(type)) return false;
  if (NON_GRADABLE_RE.test(text)) return false;
  return true;
}

function isGradableItem(it: any): boolean {
  if (!it) return false;
  if (!isGradableQuestion(it.question, it.kind, it.type)) return false;
  // QCM must have options + an answer that appears in options
  if (it.kind === "qcm") {
    if (!Array.isArray(it.options) || it.options.length < 2) return false;
    if (!it.answer || !it.options.includes(it.answer)) return false;
  } else if (it.kind === "numeric") {
    if (it.answer === undefined || it.answer === null || String(it.answer).trim() === "") return false;
  }
  return true;
}

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
  // Defensive: filter again at pick time so old cached pools don't leak bad items
  const clean = pool.filter(isGradableItem);
  const rng = mulberry32(Math.floor((seed || Math.random()) * 1e9));
  const arr = [...clean];
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
    if (!isGradableItem(it)) continue;
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

  // (a) From documented errors — wrap as "trap" QCM items.
  // Only emit if the description is a complete, self-contained claim
  // (i.e. makes sense out-of-context as a sentence to agree/disagree with).
  for (const err of errors || []) {
    if (out.length >= count) break;
    const desc = (err.error_description || "").trim();
    if (desc.length < 20 || desc.length > 180) continue;
    // Skip fragments that obviously need surrounding context
    if (/^(و|أو|ثم|لأنّ|لذلك|بالتالي|then|because)/i.test(desc)) continue;
    if (NON_GRADABLE_RE.test(desc)) continue;

    const skill = skillById.get(err.skill_id);
    const badge = badgeFor(skill?.domain);
    const item = {
      id: `kb-err-${err.skill_id}-${out.length}`,
      type: "trap",
      typeName: "فخ موثَّق",
      question: `طالب قال: "${desc}". هل توافقه؟`,
      options: ["نعم، صحيح", "لا، خطأ شائع"],
      answer: "لا، خطأ شائع",
      hint: err.fix_hint || `راجع المهارة: ${skill?.name_ar || skill?.name || "—"}`,
      kind: "qcm",
      icon: badge.icon,
      misconception: desc,
      misconceptionType: inferMiscType(skill?.domain, skill?.subdomain, err.error_type),
      badgeColor: badge.color,
      badgeBg: badge.bg,
    };
    if (isGradableItem(item)) out.push(item);
  }

  // (b) REMOVED: the previous "self-report concept check" branch produced
  // fake diagnostic data ("هل أنت مرتاح؟" with answer always = "نعم"), so
  // every student auto-scored 100% on those items. We no longer emit them.
  // If the documented-errors pool is too small, the AI augment path (step 3)
  // takes over to fill the gap with real gradable questions.

  return out.filter(isGradableItem);
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

## مبادئ صارمة:
1. التفكير > النتيجة (اسأل "هل الطريقة صحيحة؟" بدل "احسب").
2. استهدف الأخطاء الموثَّقة أعلاه.
3. تنوّع الأنواع: logic, trap, standard, strategic (لا تستعمل "open").
4. التزم بمصطلحات منهج ${countryHint}.

## ❌ ممنوع منعاً باتاً:
- أي سؤال يطلب رسماً أو إنشاءً هندسياً (ارسم، أنشئ، مثّل بيانياً، أكمل الشكل…).
- أي سؤال يعتمد على شكل غير مرفق ("بالاعتماد على الشكل المقابل…").
- أي سؤال يحتاج برهاناً نصياً أو تعليلاً مفتوحاً (بيّن، برهن، علّل، اشرح…).
- الأسئلة المفتوحة (kind="text" أو type="open").
- الأسئلة الطويلة (> 400 حرف).

## ✅ مسموح فقط:
- kind="qcm" مع 2 إلى 4 خيارات + إجابة واحدة موجودة في الخيارات.
- kind="numeric" مع إجابة عددية واحدة.
- كل سؤال يجب أن يكون قابلاً للحل ذهنياً في أقل من دقيقة.

## JSON المطلوب فقط:
{"exercises":[{"id":1,"type":"logic|trap|standard|strategic","typeName":"...","question":"...","options":["..."],"answer":"...","hint":"...","kind":"qcm|numeric","icon":"💡","misconception":"...","misconceptionType":"sign_error|distribution_error|exponent_error|inequality_flip|triangle_inequality|square_root_estimation|area_scaling|reverse_modeling|function_distribution","badgeColor":"var(--primary)","badgeBg":"rgba(...)"}]}

قواعد JSON: أعد JSON خام فقط. هرّب \\\\sqrt و \\\\frac داخل النصوص.`;

  const response = await callGemini([{ role: "user", parts: [{ text: prompt }] }], {
    systemInstruction: `أنت خبير في تقييمات تشخيصية وفق منهج ${countryHint}. JSON صالح فقط. لا تنتج أبداً أسئلة رسم أو إنشاء أو برهان.`,
    temperature: 0.8,
    responseMimeType: "application/json",
  });

  const parsed = extractJSON(response.text);
  const raw = Array.isArray(parsed?.exercises) ? parsed.exercises : [];
  // Final guard: drop anything the AI generated that still slipped through
  return raw.filter(isGradableItem);
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
