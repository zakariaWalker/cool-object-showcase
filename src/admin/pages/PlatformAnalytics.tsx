// ===== Platform Analytics — Insights, alerts & actionable tools =====
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCountryGrades } from "@/hooks/useCountryGrades";
import { ruleBasedDeconstruct } from "@/components/admin/ruleBasedDeconstructor";
import type { Exercise, Pattern, Deconstruction } from "@/components/admin/useAdminKBStore";
import { AlertTriangle, ChevronDown, ChevronUp, Download, Globe, Loader2, Sparkles, Target, Wand2, Zap } from "lucide-react";

interface Country {
  code: string;
  name_ar: string;
  flag_emoji: string | null;
}

interface ProgressStats {
  totalProgress: number;
  avgXp: number;
  totalStudents: number;
}

const BATCH_SIZE = 200;

const PlatformAnalytics = () => {
  // ── Country selection (persisted) ────────────────────────────────────────
  const [countries, setCountries] = useState<Country[]>([]);
  const [country, setCountry] = useState<string>(() => {
    try { return localStorage.getItem("admin_analytics_country") || "DZ"; } catch { return "DZ"; }
  });
  useEffect(() => {
    try { localStorage.setItem("admin_analytics_country", country); } catch {}
  }, [country]);

  const { grades } = useCountryGrades(country);

  // ── KB data scoped to country ────────────────────────────────────────────
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [deconstructions, setDeconstructions] = useState<Deconstruction[]>([]);
  const [loadingKB, setLoadingKB] = useState(true);

  // ── Student stats ────────────────────────────────────────────────────────
  const [stats, setStats] = useState<ProgressStats>({ totalProgress: 0, avgXp: 0, totalStudents: 0 });

  // ── Action state ─────────────────────────────────────────────────────────
  const [linking, setLinking] = useState(false);
  const [linkProgress, setLinkProgress] = useState({ done: 0, total: 0 });
  const [lastLinkResult, setLastLinkResult] = useState<string | null>(null);
  const [showWeakAreas, setShowWeakAreas] = useState(true);

  // ── Weak-area generator state ───────────────────────────────────────────
  const [genGrade, setGenGrade] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState({ done: 0, total: 0, inserted: 0 });
  const [genLog, setGenLog] = useState<{ grade: string; type: string; status: "ok" | "err"; msg: string }[]>([]);

  // ── Load countries ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("countries")
        .select("code, name_ar, flag_emoji")
        .eq("is_active", true)
        .order("name_ar");
      setCountries(data || []);
    })();
  }, []);

  // ── Load student progress ────────────────────────────────────────────────
  useEffect(() => {
    (supabase as any).from("student_progress").select("xp, total_exercises, total_correct").then(({ data }: any) => {
      if (!data) return;
      const avgXp = data.length > 0 ? Math.round(data.reduce((s: number, d: any) => s + (d.xp || 0), 0) / data.length) : 0;
      setStats({ totalProgress: data.length, avgXp, totalStudents: data.length });
    });
  }, []);

  // ── Load KB data for selected country ────────────────────────────────────
  const loadKB = async () => {
    setLoadingKB(true);
    try {
      // exercises (paginate)
      const allEx: any[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await (supabase as any)
          .from("kb_exercises")
          .select("*")
          .eq("country_code", country)
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allEx.push(...data);
        if (data.length < PAGE) break;
        from += PAGE;
      }
      setExercises(allEx.map((r: any) => ({
        id: r.id, text: r.text || "", type: r.type || "other",
        chapter: r.chapter || "", grade: r.grade || "", stream: r.stream || "",
        label: r.label || "", source: r.source || "", countryCode: r.country_code || country,
      })));

      // patterns (universal, not country-scoped)
      const { data: pats } = await (supabase as any).from("kb_patterns").select("*");
      setPatterns((pats || []).map((p: any) => ({
        id: p.id, name: p.name, type: p.type || "",
        description: p.description || "", steps: p.steps || [],
        concepts: p.concepts || [], examples: [], createdAt: p.created_at,
      })));

      // deconstructions for this country
      const { data: decs } = await (supabase as any)
        .from("kb_deconstructions")
        .select("*")
        .eq("country_code", country);
      setDeconstructions((decs || []).map((d: any) => ({
        id: d.id, exerciseId: d.exercise_id, patternId: d.pattern_id,
        steps: d.steps || [], needs: d.needs || [], notes: d.notes || "",
        countryCode: d.country_code, createdAt: d.created_at,
      })));
    } finally {
      setLoadingKB(false);
    }
  };

  useEffect(() => { loadKB(); /* eslint-disable-next-line */ }, [country]);

  // ── Derived metrics ──────────────────────────────────────────────────────
  const deconstructedIds = useMemo(() => new Set(deconstructions.map(d => d.exerciseId)), [deconstructions]);
  const undeconstructedExercises = useMemo(
    () => exercises.filter(e => !deconstructedIds.has(e.id)),
    [exercises, deconstructedIds]
  );
  const patternsWithoutDeconstructions = useMemo(() => {
    const used = new Set(deconstructions.map(d => d.patternId));
    return patterns.filter(p => !used.has(p.id));
  }, [patterns, deconstructions]);

  // Coverage matrix: grade × type
  const weakAreas = useMemo(() => {
    if (exercises.length === 0) return [];
    const counts = new Map<string, number>();
    for (const ex of exercises) {
      const key = `${ex.grade || "?"}::${ex.type || "other"}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const types = Array.from(new Set(exercises.map(e => e.type || "other"))).sort();
    const gradeCodes = grades.length > 0 ? grades.map(g => g.grade_code) : Array.from(new Set(exercises.map(e => e.grade || "?")));

    const cells: { grade: string; type: string; count: number; needed: number }[] = [];
    const TARGET = 5;
    const THRESHOLD = 3;
    for (const g of gradeCodes) {
      for (const t of types) {
        const count = counts.get(`${g}::${t}`) || 0;
        if (count < THRESHOLD) {
          cells.push({ grade: g, type: t, count, needed: Math.max(0, TARGET - count) });
        }
      }
    }
    return cells.sort((a, b) => a.count - b.count);
  }, [exercises, grades]);

  // ── Action: rule-based bulk link ─────────────────────────────────────────
  const linkPatternsToExercises = async () => {
    if (linking || patterns.length === 0 || undeconstructedExercises.length === 0) return;
    setLinking(true);
    setLastLinkResult(null);
    setLinkProgress({ done: 0, total: undeconstructedExercises.length });

    try {
      const results = ruleBasedDeconstruct(undeconstructedExercises, patterns, deconstructedIds);
      const toInsert = results
        .filter(r => r.deconstruction)
        .map(r => ({
          exercise_id: r.deconstruction!.exerciseId,
          pattern_id: r.deconstruction!.patternId,
          steps: r.deconstruction!.steps || [],
          needs: r.deconstruction!.needs,
          notes: r.deconstruction!.notes,
          country_code: r.deconstruction!.countryCode,
          ai_generated: false,
        }));

      if (toInsert.length === 0) {
        setLastLinkResult("لا توجد تمارين قابلة للربط (لم يطابق أي نمط).");
        setLinking(false);
        return;
      }

      let inserted = 0;
      for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
        const chunk = toInsert.slice(i, i + BATCH_SIZE);
        const { error } = await (supabase as any).from("kb_deconstructions").insert(chunk);
        if (error) throw error;
        inserted += chunk.length;
        setLinkProgress({ done: inserted, total: toInsert.length });
      }
      setLastLinkResult(`✅ تم ربط ${inserted} تمرين بأنماط مناسبة.`);
      await loadKB();
    } catch (err: any) {
      setLastLinkResult(`❌ خطأ: ${err?.message || "فشل الحفظ"}`);
    } finally {
      setLinking(false);
    }
  };

  // ── Action: export weak areas as JSON plan ───────────────────────────────
  const exportWeakAreasPlan = () => {
    const plan = {
      country_code: country,
      generated_at: new Date().toISOString(),
      target_per_cell: 5,
      total_cells: weakAreas.length,
      total_exercises_needed: weakAreas.reduce((s, c) => s + c.needed, 0),
      cells: weakAreas.map(c => ({
        grade: c.grade,
        type: c.type,
        current_count: c.count,
        target_count: 5,
        exercises_to_generate: c.needed,
      })),
    };
    const blob = new Blob([JSON.stringify(plan, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weak-areas-plan-${country}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Action: AI-generate exercises for one grade's weak cells ─────────────
  const generateForGrade = async () => {
    if (generating) return;
    const gradeToUse = genGrade || (grades[0]?.grade_code ?? "");
    if (!gradeToUse) return;
    const cells = weakAreas.filter(c => c.grade === gradeToUse && c.needed > 0);
    if (cells.length === 0) {
      setGenLog([{ grade: gradeToUse, type: "—", status: "ok", msg: "لا توجد ثغرات لهذا المستوى." }]);
      return;
    }

    setGenerating(true);
    setGenLog([]);
    setGenProgress({ done: 0, total: cells.length, inserted: 0 });

    let totalInserted = 0;
    let stopReason: string | null = null;
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      try {
        const { data, error } = await (supabase as any).functions.invoke("generate-weak-area-exercises", {
          body: {
            country_code: country,
            grade: cell.grade,
            type: cell.type,
            count: cell.needed,
          },
        });
        // Detect billing/rate-limit errors from the edge function (non-2xx)
        const raw = (error?.context && (await error.context.json?.().catch(() => null))) || null;
        const code = raw?.error || data?.error;
        if (code === "credits_exhausted") {
          stopReason = "نفد رصيد Lovable AI. أضف رصيداً من Settings ← Workspace ← Usage ثم أعد المحاولة.";
          setGenLog(prev => [...prev, { grade: cell.grade, type: cell.type, status: "err", msg: stopReason! }]);
          break;
        }
        if (code === "rate_limited") {
          stopReason = "تم تجاوز حد الطلبات مؤقتاً. انتظر دقيقة ثم أعد المحاولة.";
          setGenLog(prev => [...prev, { grade: cell.grade, type: cell.type, status: "err", msg: stopReason! }]);
          break;
        }
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const inserted = data?.inserted ?? 0;
        totalInserted += inserted;
        setGenLog(prev => [...prev, { grade: cell.grade, type: cell.type, status: "ok", msg: `+${inserted} تمرين` }]);
      } catch (err: any) {
        const msg = err?.message || "فشل";
        // FunctionsHttpError on 402 surfaces as a generic message — translate it
        const friendly = /non-2xx|402|credits/i.test(msg)
          ? "نفد رصيد Lovable AI. أضف رصيداً من Settings ← Workspace ← Usage."
          : msg;
        setGenLog(prev => [...prev, { grade: cell.grade, type: cell.type, status: "err", msg: friendly }]);
        if (/credits|402/i.test(msg)) { stopReason = friendly; break; }
      }
      setGenProgress({ done: i + 1, total: cells.length, inserted: totalInserted });
      // gentle delay to avoid rate limits
      await new Promise(r => setTimeout(r, 800));
    }

    setGenerating(false);
    await loadKB();
  };

  return (
    <div className="space-y-6">
      {/* Header with country selector */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-foreground">📊 تحليلات المنصة</h2>
          <p className="text-sm text-muted-foreground mt-1">نظرة شاملة على المحتوى والمستخدمين والمجالات الضعيفة</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="bg-transparent text-sm font-bold text-foreground outline-none cursor-pointer"
          >
            {countries.length === 0 && <option value="DZ">🇩🇿 الجزائر</option>}
            {countries.map(c => (
              <option key={c.code} value={c.code}>{c.flag_emoji || ""} {c.name_ar}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="طلاب نشطون" value={stats.totalStudents} accent="primary" />
        <StatCard label="متوسط النقاط" value={stats.avgXp} accent="accent" />
        <StatCard label="تمارين الدولة" value={exercises.length} accent="primary" loading={loadingKB} />
        <StatCard label="أنماط شاملة" value={patterns.length} accent="accent" loading={loadingKB} />
        <StatCard label="تفكيكات" value={deconstructions.length} accent="primary" loading={loadingKB} />
        <StatCard
          label="نسبة التغطية"
          value={exercises.length > 0 ? `${Math.round((deconstructedIds.size / exercises.length) * 100)}%` : "—"}
          accent="accent"
          loading={loadingKB}
        />
      </div>

      {/* ── Alerts & gaps ───────────────────────────────────────────────── */}
      <section className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-destructive" />
          <h3 className="text-lg font-black text-foreground">🚨 تنبيهات وثغرات</h3>
        </div>

        <div className="space-y-3">
          {/* Alert 1 — undeconstructed exercises */}
          {undeconstructedExercises.length > 0 && (
            <AlertRow
              tone="warning"
              title={`${undeconstructedExercises.length} تمرين بدون تفكيك`}
              detail={`الأنماط المتاحة: ${patterns.length} · الإجراء التالي يربطها فوراً دون استخدام الذكاء الاصطناعي.`}
              action={
                <button
                  onClick={linkPatternsToExercises}
                  disabled={linking || patterns.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {linking
                    ? `جارٍ الربط... ${linkProgress.done}/${linkProgress.total}`
                    : `⚡ اربط الأنماط بـ ${undeconstructedExercises.length} تمرين`}
                </button>
              }
            />
          )}

          {/* Alert 2 — patterns with no deconstructions */}
          {patternsWithoutDeconstructions.length > 0 && (
            <AlertRow
              tone="info"
              title={`${patternsWithoutDeconstructions.length} نمط بدون تفكيكات في هذه الدولة`}
              detail="ستُربط تلقائياً عند تشغيل الإجراء أعلاه إذا طابقت تمارين غير مفكّكة."
            />
          )}

          {/* Last action result */}
          {lastLinkResult && (
            <div className="text-xs px-3 py-2 rounded-lg bg-muted text-foreground font-medium">
              {lastLinkResult}
            </div>
          )}

          {undeconstructedExercises.length === 0 && patternsWithoutDeconstructions.length === 0 && !loadingKB && (
            <div className="text-sm text-muted-foreground text-center py-4">
              ✅ كل التمارين مفكّكة وكل الأنماط مرتبطة لهذه الدولة.
            </div>
          )}
        </div>
      </section>

      {/* ── Weak areas card ────────────────────────────────────────────── */}
      <section className="bg-card rounded-2xl border border-border p-5">
        <button
          onClick={() => setShowWeakAreas(s => !s)}
          className="w-full flex items-center justify-between gap-2 mb-4"
        >
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-black text-foreground">🎯 المجالات الضعيفة</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">
              {weakAreas.length} خلية
            </span>
          </div>
          {showWeakAreas ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
        </button>

        {showWeakAreas && (
          <>
            <p className="text-xs text-muted-foreground mb-3">
              خلايا (مستوى × نوع) بأقلّ من 3 تمارين. الهدف: 5 تمارين لكل مجال.
            </p>

            {weakAreas.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">
                {loadingKB ? "جارٍ التحميل..." : "✅ لا توجد ثغرات تغطية في هذه الدولة."}
              </div>
            ) : (
              <>
                <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/50 sticky top-0">
                      <tr>
                        <th className="text-right px-3 py-2 font-bold text-muted-foreground">المستوى</th>
                        <th className="text-right px-3 py-2 font-bold text-muted-foreground">النوع</th>
                        <th className="text-center px-3 py-2 font-bold text-muted-foreground">حالياً</th>
                        <th className="text-center px-3 py-2 font-bold text-muted-foreground">المطلوب</th>
                      </tr>
                    </thead>
                    <tbody>
                      {weakAreas.map((c, i) => (
                        <tr key={i} className="border-t border-border hover:bg-muted/30">
                          <td className="px-3 py-2 font-bold text-foreground">{c.grade}</td>
                          <td className="px-3 py-2 text-muted-foreground">{c.type}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-bold">
                              {c.count}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-accent">+{c.needed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    الإجمالي المطلوب توليده: <span className="font-black text-foreground">{weakAreas.reduce((s, c) => s + c.needed, 0)}</span> تمرين
                  </div>
                  <button
                    onClick={exportWeakAreasPlan}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black text-accent-foreground bg-accent hover:bg-accent/90 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    📥 صدّر خطّة المجالات الضعيفة (JSON)
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </section>

      {/* ── AI Weak-Area Filler ────────────────────────────────────────── */}
      <section className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center gap-2 mb-3">
          <Wand2 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-black text-foreground">🪄 توليد ذكي لتمارين المجالات الضعيفة</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          اختر مستوى دراسياً وسيقوم الذكاء الاصطناعي بتوليد التمارين الناقصة لكل خلية ضعيفة لهذا المستوى وحفظها في قاعدة المعرفة.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={genGrade}
            onChange={(e) => setGenGrade(e.target.value)}
            disabled={generating}
            className="px-3 py-2 rounded-lg border border-border bg-background text-sm font-bold text-foreground outline-none cursor-pointer disabled:opacity-50"
          >
            <option value="">— اختر مستوى —</option>
            {grades.map(g => {
              const cellsForGrade = weakAreas.filter(c => c.grade === g.grade_code);
              const need = cellsForGrade.reduce((s, c) => s + c.needed, 0);
              return (
                <option key={g.grade_code} value={g.grade_code}>
                  {g.grade_label_ar} ({cellsForGrade.length} خلية · {need} تمرين)
                </option>
              );
            })}
          </select>

          <button
            onClick={generateForGrade}
            disabled={generating || !genGrade}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {generating
              ? `جارٍ التوليد... ${genProgress.done}/${genProgress.total} (+${genProgress.inserted})`
              : "🪄 ولّد التمارين الناقصة"}
          </button>

          {!generating && genProgress.total > 0 && (
            <span className="text-xs font-bold text-muted-foreground">
              ✅ تم إدراج {genProgress.inserted} تمرين عبر {genProgress.done} خلية
            </span>
          )}
        </div>

        {genLog.length > 0 && (
          <div className="mt-4 max-h-56 overflow-y-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-right px-3 py-2 font-bold text-muted-foreground">المستوى</th>
                  <th className="text-right px-3 py-2 font-bold text-muted-foreground">النوع</th>
                  <th className="text-right px-3 py-2 font-bold text-muted-foreground">النتيجة</th>
                </tr>
              </thead>
              <tbody>
                {genLog.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-3 py-2 font-bold text-foreground">{row.grade}</td>
                    <td className="px-3 py-2 text-muted-foreground">{row.type}</td>
                    <td className={`px-3 py-2 font-bold ${row.status === "ok" ? "text-accent" : "text-destructive"}`}>
                      {row.status === "ok" ? "✅" : "❌"} {row.msg}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Sparkle footer */}
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
        <Sparkles className="w-3.5 h-3.5" />
        تحليلات لحظية لـ {countries.find(c => c.code === country)?.name_ar || country}
      </div>
    </div>
  );
};

// ── Helper components ──────────────────────────────────────────────────────
function StatCard({ label, value, accent, loading }: { label: string; value: number | string; accent: "primary" | "accent"; loading?: boolean }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-4 text-center">
      <p className={`text-2xl font-black ${accent === "primary" ? "text-primary" : "text-accent"}`}>
        {loading ? "…" : value}
      </p>
      <p className="text-[11px] text-muted-foreground mt-1 font-bold">{label}</p>
    </div>
  );
}

function AlertRow({
  tone, title, detail, action,
}: { tone: "warning" | "info"; title: string; detail: string; action?: React.ReactNode }) {
  const toneClasses = tone === "warning"
    ? "border-destructive/30 bg-destructive/5"
    : "border-primary/20 bg-primary/5";
  return (
    <div className={`flex flex-wrap items-start gap-3 p-3 rounded-xl border ${toneClasses}`}>
      <div className="flex-1 min-w-[200px]">
        <div className="text-sm font-black text-foreground">{title}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{detail}</div>
      </div>
      {action}
    </div>
  );
}

export default PlatformAnalytics;
