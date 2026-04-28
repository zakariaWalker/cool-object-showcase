import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCountryGrades } from "@/hooks/useCountryGrades";
import { MathExerciseRenderer } from "@/components/MathExerciseRenderer";
import { Loader2, Flag, RefreshCw, Trash2, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// Hash must match the edge function: trimmed first 120 chars of question text.
function questionHash(q: string | undefined | null): string {
  return (q || "").trim().slice(0, 120);
}

const FLAG_REASONS = [
  { value: "needs_drawing", label: "يحتاج رسماً/شكلاً" },
  { value: "ambiguous", label: "غامض / غير واضح" },
  { value: "wrong_answer", label: "إجابة خاطئة" },
  { value: "off_curriculum", label: "خارج المنهج" },
  { value: "duplicate", label: "مكرر" },
  { value: "bad_quality", label: "جودة ضعيفة" },
];

interface PoolItem {
  id: string | number;
  type?: string;
  typeName?: string;
  question: string;
  options?: string[];
  answer?: string;
  hint?: string;
  kind?: string;
  misconception?: string;
}

interface FlagRow {
  id: string;
  question_hash: string;
  question_preview: string;
  reason: string;
  notes: string | null;
  created_at: string;
}

export default function DiagnosticQA() {
  const country = "DZ";
  const { grades } = useCountryGrades(country);
  const [grade, setGrade] = useState<string>("4AM");
  const [pool, setPool] = useState<PoolItem[]>([]);
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const flaggedHashes = useMemo(
    () => new Set(flags.map((f) => f.question_hash)),
    [flags],
  );

  async function loadPool(forceRefresh = false) {
    setLoading(true);
    try {
      // Pull whatever's in the cache by asking for a generous count.
      const { data, error } = await supabase.functions.invoke("generate-diagnostic-assessment", {
        body: { level: grade, countryCode: country, count: 30, forceRefresh },
      });
      if (error) throw error;
      // Then fetch the full cached pool directly so we see EVERY question, not the served slice.
      const cacheKey = `diag:pool:${country}:${grade}`;
      const { data: cached } = await (supabase as any)
        .from("diagnostic_cache")
        .select("exercises, source")
        .eq("cache_key", cacheKey)
        .maybeSingle();
      const items: PoolItem[] = Array.isArray(cached?.exercises)
        ? cached.exercises
        : (data?.exercises ?? []);
      setPool(items);
    } catch (e: any) {
      toast.error("فشل تحميل التمارين", { description: e?.message });
    } finally {
      setLoading(false);
    }
  }

  async function loadFlags() {
    const { data, error } = await (supabase as any)
      .from("diagnostic_question_flags")
      .select("id, question_hash, question_preview, reason, notes, created_at")
      .eq("country_code", country)
      .eq("grade_code", grade)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("فشل تحميل العلامات");
      return;
    }
    setFlags(data || []);
  }

  useEffect(() => {
    loadPool(false);
    loadFlags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grade]);

  async function flagItem(item: PoolItem, reason: string) {
    const hash = questionHash(item.question);
    const { error } = await (supabase as any).from("diagnostic_question_flags").insert({
      question_hash: hash,
      question_preview: (item.question || "").slice(0, 280),
      country_code: country,
      grade_code: grade,
      reason,
      flagged_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    });
    if (error) {
      toast.error("فشل العلامة", { description: error.message });
      return;
    }
    toast.success("تم تعليم السؤال — لن يظهر للتلاميذ مرة أخرى");
    loadFlags();
  }

  async function unflag(flagId: string) {
    const { error } = await (supabase as any)
      .from("diagnostic_question_flags")
      .delete()
      .eq("id", flagId);
    if (error) return toast.error(error.message);
    toast.success("تم إلغاء العلامة");
    loadFlags();
  }

  async function regenerate() {
    setRegenerating(true);
    try {
      await loadPool(true);
      toast.success("تم تجديد المجموعة");
    } finally {
      setRegenerating(false);
    }
  }

  const goodCount = pool.filter((it) => !flaggedHashes.has(questionHash(it.question))).length;
  const badInPool = pool.length - goodCount;

  return (
    <div className="p-6 md:p-8 space-y-6" dir="rtl">
      <header className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground">
            مراجعة جودة أسئلة التشخيص
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            عاين الأسئلة المولَّدة لكل مستوى. علِّم السؤال السيئ بنقرة — لن يظهر مجدداً.
          </p>
        </div>
        <button
          onClick={regenerate}
          disabled={regenerating || loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 disabled:opacity-50"
        >
          {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          تجديد المجموعة
        </button>
      </header>

      {/* Grade picker */}
      <div className="flex flex-wrap gap-2">
        {grades.map((g) => (
          <button
            key={g.grade_code}
            onClick={() => setGrade(g.grade_code)}
            className={`px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${
              grade === g.grade_code
                ? "border-primary bg-primary/10 text-primary scale-105"
                : "border-border hover:border-primary/40 text-muted-foreground"
            }`}
          >
            {g.grade_label_ar}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="إجمالي في المجموعة" value={pool.length} />
        <Stat label="صالحة" value={goodCount} color="text-emerald-600" />
        <Stat label="في المجموعة لكنها معلَّمة" value={badInPool} color="text-amber-600" />
        <Stat label="إجمالي الأسئلة المعلَّمة" value={flags.length} color="text-destructive" />
      </div>

      {/* Pool list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : pool.length === 0 ? (
        <div className="bg-muted/40 rounded-2xl p-8 text-center text-sm text-muted-foreground">
          لا توجد أسئلة في الذاكرة المؤقتة لهذا المستوى. اضغط "تجديد المجموعة".
        </div>
      ) : (
        <div className="space-y-3">
          {pool.map((item, i) => {
            const isFlagged = flaggedHashes.has(questionHash(item.question));
            return (
              <div
                key={`${item.id}-${i}`}
                className={`bg-card border-2 rounded-2xl p-5 transition-all ${
                  isFlagged ? "border-destructive/40 opacity-60" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md bg-muted text-muted-foreground">
                      #{i + 1}
                    </span>
                    {item.typeName && (
                      <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-primary/10 text-primary">
                        {item.typeName}
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-muted text-muted-foreground">
                      {item.kind || "qcm"}
                    </span>
                    {isFlagged && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-destructive/10 text-destructive">
                        <AlertTriangle className="w-3 h-3" /> معلَّم
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-base text-foreground leading-relaxed mb-3">
                  <MathExerciseRenderer text={item.question} showDiagram={false} />
                </div>

                {item.options && item.options.length > 0 && (
                  <div className="grid sm:grid-cols-2 gap-2 mb-3">
                    {item.options.map((opt, j) => {
                      const isAnswer = opt === item.answer;
                      return (
                        <div
                          key={j}
                          className={`flex items-start gap-2 px-3 py-2 rounded-xl text-sm border ${
                            isAnswer
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700"
                              : "bg-muted/40 border-border"
                          }`}
                        >
                          {isAnswer && <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
                          <MathExerciseRenderer text={opt} showDiagram={false} />
                        </div>
                      );
                    })}
                  </div>
                )}

                {item.kind === "numeric" && (
                  <div className="text-xs text-muted-foreground mb-3">
                    الإجابة المتوقعة: <strong className="text-emerald-700">{item.answer}</strong>
                  </div>
                )}

                {item.hint && (
                  <div className="text-xs text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg mb-3">
                    💡 {item.hint}
                  </div>
                )}

                {!isFlagged ? (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                    <span className="text-[10px] font-bold text-muted-foreground self-center ml-1">
                      علِّم كـ:
                    </span>
                    {FLAG_REASONS.map((r) => (
                      <button
                        key={r.value}
                        onClick={() => flagItem(item, r.value)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-border hover:border-destructive/40 hover:text-destructive hover:bg-destructive/5 transition-all"
                      >
                        <Flag className="w-3 h-3" /> {r.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      const f = flags.find((x) => x.question_hash === questionHash(item.question));
                      if (f) unflag(f.id);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border border-border hover:bg-muted transition-all"
                  >
                    <Trash2 className="w-3 h-3" /> إلغاء العلامة
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* All-flags audit panel */}
      {flags.length > 0 && (
        <details className="bg-card border border-border rounded-2xl p-5">
          <summary className="text-sm font-bold cursor-pointer">
            سجل العلامات ({flags.length})
          </summary>
          <div className="mt-4 space-y-2">
            {flags.map((f) => (
              <div key={f.id} className="flex items-start justify-between gap-3 text-xs border-b border-border pb-2">
                <div className="flex-1">
                  <div className="font-bold text-destructive mb-0.5">
                    {FLAG_REASONS.find((r) => r.value === f.reason)?.label || f.reason}
                  </div>
                  <div className="text-muted-foreground line-clamp-2">{f.question_preview}</div>
                </div>
                <button
                  onClick={() => unflag(f.id)}
                  className="text-[10px] text-muted-foreground hover:text-destructive shrink-0"
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function Stat({ label, value, color = "text-foreground" }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  );
}
