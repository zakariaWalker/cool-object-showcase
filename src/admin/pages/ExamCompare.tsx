// ===== Admin: Compare real exam vs AI-generated exam =====
// Surfaces gaps so the generator can be tuned.
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, GitCompare, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";

interface UploadRow {
  id: string;
  file_name: string;
  format: string;
  grade: string | null;
  year: string | null;
}

interface BuiltExamRow {
  id: string;
  title: string;
  grade: string;
  format: string;
  sections: any;
}

interface Gap {
  category: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  fix: string;
}

interface CompareResult {
  summary: string;
  matchScore: number;
  gaps: Gap[];
  strengths: string[];
  recommendations: string[];
  stats: {
    real: { count: number; avgBloom: number; concepts: string[]; totalPoints: number };
    generated: { count: number; avgBloom: number; concepts: string[]; totalPoints: number };
    onlyInReal: string[];
    onlyInGen: string[];
  };
}

const SEVERITY_STYLE: Record<string, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/30",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-border",
};

export default function ExamCompare() {
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [builtExams, setBuiltExams] = useState<BuiltExamRow[]>([]);
  const [realId, setRealId] = useState("");
  const [genId, setGenId] = useState("");
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const [{ data: ups }, { data: built }] = await Promise.all([
        supabase
          .from("exam_uploads")
          .select("id, file_name, format, grade, year")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("built_exams")
          .select("id, title, grade, format, sections")
          .order("created_at", { ascending: false })
          .limit(100),
      ]);
      setUploads((ups as UploadRow[]) || []);
      setBuiltExams((built as BuiltExamRow[]) || []);
      setLoading(false);
    })();
  }, []);

  async function runCompare() {
    if (!realId || !genId) {
      setError("اختر امتحانًا حقيقيًا وامتحانًا مولَّدًا");
      return;
    }
    setError("");
    setComparing(true);
    setResult(null);

    try {
      // Real questions from extracted_questions
      const { data: realQs } = await supabase
        .from("exam_extracted_questions")
        .select("text, type, difficulty, bloom_level, concepts, points")
        .eq("upload_id", realId)
        .order("question_number", { ascending: true });

      // Generated: pull sections.exercises from built_exams (handles multiple shapes)
      const built = builtExams.find((b) => b.id === genId);
      const generatedQs: any[] = [];
      const sections = (built?.sections as any[]) || [];
      sections.forEach((s) => {
        const items = s.exercises || s.questions || s.items || [];
        items.forEach((ex: any) => {
          generatedQs.push({
            text: ex.text || ex.statement || ex.question || "",
            type: ex.type || s.type || s.id || "—",
            difficulty: ex.difficulty,
            bloom_level: ex.bloomLevel || ex.bloom_level,
            concepts: ex.concepts || [],
            points: ex.points || 0,
          });
        });
      });

      if (!realQs?.length) {
        setError("لم يتم استخراج أسئلة من الامتحان الحقيقي");
        setComparing(false);
        return;
      }
      if (!generatedQs.length) {
        setError(
          `الامتحان المولَّد فارغ (لا يحتوي على أسئلة قابلة للقراءة). افتح "بناء الامتحانات" → اختر القالب → "توليد ثلاثي" ليتم حفظ النسخ المولَّدة تلقائياً، ثم أعد المحاولة.`,
        );
        setComparing(false);
        return;
      }

      const { data, error: fnErr } = await supabase.functions.invoke("compare-exams", {
        body: {
          realQuestions: realQs,
          generatedQuestions: generatedQs,
          grade: built?.grade || "",
          format: built?.format || "regular",
        },
      });

      if (fnErr) throw new Error(fnErr.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult(data as CompareResult);
    } catch (e) {
      setError((e as Error).message || "فشل التحليل");
    } finally {
      setComparing(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">مقارنة الامتحانات</h1>
            <p className="text-xs text-muted-foreground">
              قارن امتحانًا حقيقيًا برفعك مع امتحان مولَّد لاكتشاف ثغرات المولّد وتحسينه.
            </p>
          </div>
        </div>

        {/* Pickers */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <label className="text-xs font-bold text-muted-foreground block mb-2">
              📥 الامتحان الحقيقي (مرفوع)
            </label>
            <select
              value={realId}
              onChange={(e) => setRealId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground"
            >
              <option value="">— اختر —</option>
              {uploads.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.file_name} ({u.format} · {u.grade || "—"} · {u.year || "—"})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <label className="text-xs font-bold text-muted-foreground block mb-2">
              🤖 الامتحان المولَّد
            </label>
            <select
              value={genId}
              onChange={(e) => setGenId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground"
            >
              <option value="">— اختر —</option>
              {builtExams.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.format} · {b.grade})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={runCompare}
            disabled={comparing || !realId || !genId}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50"
          >
            {comparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            تحليل الفجوات
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs border border-destructive/30">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="space-y-6">
            {/* Score */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-foreground">درجة المطابقة</h2>
                <span className="text-3xl font-black text-primary">{result.matchScore}/100</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${result.matchScore}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{result.summary}</p>
            </div>

            {/* Stats */}
            <div className="grid md:grid-cols-2 gap-4">
              <StatBlock title="الحقيقي" stats={result.stats.real} />
              <StatBlock title="المولَّد" stats={result.stats.generated} />
            </div>

            {/* Gaps */}
            {result.gaps?.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-black text-foreground mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  الفجوات المكتشفة ({result.gaps.length})
                </h3>
                <div className="space-y-2">
                  {result.gaps.map((g, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${SEVERITY_STYLE[g.severity] || SEVERITY_STYLE.low}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">{g.title}</span>
                        <span className="text-[10px] font-mono uppercase">{g.category}</span>
                      </div>
                      <p className="text-[11px] opacity-90 mb-2">{g.detail}</p>
                      <p className="text-[11px] font-bold border-r-2 border-current pr-2">
                        💡 {g.fix}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths */}
            {result.strengths?.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-black text-foreground mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  نقاط القوة
                </h3>
                <ul className="space-y-1.5 text-xs text-foreground">
                  {result.strengths.map((s, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-emerald-500">✓</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {result.recommendations?.length > 0 && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
                <h3 className="text-sm font-black text-primary mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  توصيات لتحسين المولّد
                </h3>
                <ul className="space-y-1.5 text-xs text-foreground">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary font-bold">{i + 1}.</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBlock({
  title,
  stats,
}: {
  title: string;
  stats: { count: number; avgBloom: number; concepts: string[]; totalPoints: number };
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h4 className="text-xs font-black text-muted-foreground uppercase mb-3">{title}</h4>
      <div className="grid grid-cols-3 gap-3 text-center mb-3">
        <Stat label="أسئلة" value={stats.count} />
        <Stat label="Bloom" value={stats.avgBloom} />
        <Stat label="نقاط" value={stats.totalPoints} />
      </div>
      <div className="text-[10px] text-muted-foreground">
        <span className="font-bold">المفاهيم:</span> {stats.concepts.join("، ") || "—"}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="text-lg font-black text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground font-bold">{label}</div>
    </div>
  );
}
