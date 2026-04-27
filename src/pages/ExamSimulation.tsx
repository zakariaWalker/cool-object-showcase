import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { QEDLogo } from "@/components/QEDLogo";
import {
  ArrowLeft,
  ChevronLeft,
  Clock,
  Play,
  Trophy,
  GraduationCap,
  Calendar,
  Target,
  TrendingUp,
  Sparkles,
  Award,
  Zap,
  Filter,
  Timer,
} from "lucide-react";

interface ExamEntry {
  id: string;
  year: string;
  session: string;
  format: string;
  grade: string;
  stream: string | null;
  question_count?: number;
  total_points?: number;
}

const FORMAT_LABELS: Record<string, string> = {
  bac: "بكالوريا",
  bem: "شهادة التعليم المتوسط",
  regular: "اختبار",
  lesson_summary: "ملخّص درس",
};

const GRADE_LABELS: Record<string, string> = {
  middle_4: "4 متوسط",
  middle_3: "3 متوسط",
  middle_2: "2 متوسط",
  high_3: "3 ثانوي",
  high_3_scientific: "3 ثانوي علمي",
  high_3_tech_math: "3 ثانوي تقني",
  bac_technical_math: "بكالوريا تقني",
  terminal: "نهائي",
  terminale: "نهائي",
  "3_secondary": "3 ثانوي",
};

const formatGrade = (g: string | null) => {
  if (!g) return "—";
  return GRADE_LABELS[g] || g;
};

const formatLabel = (f: string) => FORMAT_LABELS[f] || f.toUpperCase();

const examDuration = (format: string) => {
  if (format === "bac") return 180;
  if (format === "bem") return 120;
  return 90;
};

export default function ExamSimulation() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [formatFilter, setFormatFilter] = useState<"all" | "bac" | "bem">("all");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: entries } = await supabase
        .from("exam_kb_entries")
        .select("*")
        .order("year", { ascending: false });

      const { data: questions } = await supabase
        .from("exam_kb_questions")
        .select("exam_id, points");

      const list: ExamEntry[] = (entries || []).map((e: any) => {
        const qs = (questions || []).filter((q: any) => q.exam_id === e.id);
        return {
          ...e,
          question_count: qs.length,
          total_points: qs.reduce((s: number, q: any) => s + (Number(q.points) || 0), 0),
        };
      });
      setExams(list);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return exams.filter((e) => {
      if (e.question_count === 0) return false; // hide empty exams
      if (formatFilter === "all") return true;
      return e.format === formatFilter;
    });
  }, [exams, formatFilter]);

  const stats = useMemo(() => {
    const bacCount = exams.filter((e) => e.format === "bac" && (e.question_count || 0) > 0).length;
    const bemCount = exams.filter((e) => e.format === "bem" && (e.question_count || 0) > 0).length;
    const years = new Set(exams.map((e) => e.year).filter(Boolean));
    return { bacCount, bemCount, totalYears: years.size };
  }, [exams]);

  return (
    <div className="qed-landing relative bg-background min-h-screen" dir="rtl">
      <style>{`
        .qed-paper-grid {
          background-image:
            linear-gradient(hsl(var(--foreground) / 0.04) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground) / 0.04) 1px, transparent 1px);
          background-size: 56px 56px;
        }
      `}</style>

      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/85 border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/">
            <QEDLogo size="md" />
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            العودة للرئيسية
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative qed-paper-grid pt-28 pb-12 px-6 border-b border-border/40">
        <div className="max-w-5xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 max-w-3xl"
          >
            <span className="eyebrow inline-flex items-center gap-2.5">
              <span className="w-6 h-px bg-current opacity-50" />
              وضع المحاكاة · Examen Blanc
            </span>
            <h1 className="display-2 text-foreground">
              حضّر <em className="not-italic text-accent">BAC / BEM</em>
              <br />
              بظروف الامتحان الحقيقي
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
              اختر موضوعاً سابقاً، شغّل التوقيت، وحلّ كأنك في القاعة. تحصل على{" "}
              <span className="font-semibold text-foreground">علامة على 20</span>،
              تصحيح آلي، وتحليل لأخطائك.
            </p>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="grid grid-cols-3 gap-3 max-w-2xl"
          >
            {[
              { v: stats.bemCount, l: "موضوع BEM", c: "hsl(var(--algebra))" },
              { v: stats.bacCount, l: "موضوع BAC", c: "hsl(var(--accent))" },
              { v: stats.totalYears, l: "سنوات مغطّاة", c: "hsl(var(--geometry))" },
            ].map((s, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-xl px-4 py-3.5 text-right"
              >
                <div className="font-mono text-2xl md:text-3xl font-bold" style={{ color: s.c }}>
                  {s.v}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 font-medium">{s.l}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FEATURE STRIP — what you get */}
      <section className="bg-secondary/40 border-b border-border/60 py-10 px-6">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: <Timer className="w-5 h-5" />,
              t: "توقيت حقيقي",
              d: "ساعتان للBEM، ثلاث ساعات ونصف للBAC. لا غش، لا تمديد.",
              c: "hsl(var(--algebra))",
            },
            {
              icon: <Award className="w-5 h-5" />,
              t: "تصحيح آلي + علامة /20",
              d: "كل سؤال يُصحَّح فوراً مع ملاحظات على الخطوات.",
              c: "hsl(var(--geometry))",
            },
            {
              icon: <TrendingUp className="w-5 h-5" />,
              t: "تحليل الأخطاء",
              d: "نبيّنلك أيّ مفاهيم خسّرتك النقاط، مع تمارين علاج.",
              c: "hsl(var(--accent))",
            },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-card border border-border rounded-2xl p-5 space-y-3"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${f.c}1f`, color: f.c }}
              >
                {f.icon}
              </div>
              <h3 className="text-sm font-black text-foreground">{f.t}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* EXAM PICKER */}
      <section className="max-w-5xl mx-auto px-6 py-12 space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div className="space-y-2">
            <span className="font-mono text-xs font-bold text-[hsl(var(--algebra))] uppercase tracking-widest">
              المواضيع المتوفرة
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight">
              اختر موضوعك وابدأ المحاكاة
            </h2>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-2">
            {[
              { v: "all", l: "الكل" },
              { v: "bem", l: "BEM" },
              { v: "bac", l: "BAC" },
            ].map((p) => (
              <button
                key={p.v}
                onClick={() => setFormatFilter(p.v as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-black transition-all ${
                  formatFilter === p.v
                    ? "bg-foreground text-background"
                    : "bg-muted/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-card border border-border rounded-2xl h-40 animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-2xl p-16 text-center space-y-3">
            <GraduationCap className="w-9 h-9 mx-auto opacity-15" />
            <p className="text-sm font-bold text-foreground">لا توجد مواضيع لهذا الفلتر</p>
            <button
              onClick={() => setFormatFilter("all")}
              className="text-xs font-black text-[hsl(var(--algebra))] hover:underline"
            >
              عرض كل المواضيع
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((exam, i) => {
                const isBac = exam.format === "bac";
                const accentColor = isBac ? "hsl(var(--accent))" : "hsl(var(--algebra))";
                const duration = examDuration(exam.format);
                return (
                  <motion.button
                    key={exam.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ delay: Math.min(i * 0.04, 0.3) }}
                    onClick={() => navigate(`/archive-solve/${exam.id}`)}
                    className="group relative bg-card border border-border rounded-2xl p-5 text-right hover:border-foreground/40 hover:shadow-xl hover:shadow-primary/5 transition-all overflow-hidden"
                  >
                    {/* Format badge */}
                    <div className="flex items-start justify-between mb-4">
                      <div
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider"
                        style={{
                          background: `${accentColor}1f`,
                          color: accentColor,
                        }}
                      >
                        {isBac ? <Trophy className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
                        {formatLabel(exam.format)}
                      </div>
                      <span className="font-mono text-xs font-bold text-muted-foreground">
                        {exam.year || "—"}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-black text-foreground mb-1 leading-snug">
                      موضوع {formatLabel(exam.format)} · {exam.year}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-4">
                      {formatGrade(exam.grade)}
                      {exam.session && exam.session !== "juin" ? ` · ${exam.session}` : " · دورة جوان"}
                    </p>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 pt-3 border-t border-border/60 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {exam.question_count} سؤال
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {Math.floor(duration / 60)}س{duration % 60 ? ` ${duration % 60}د` : ""}
                      </span>
                      {(exam.total_points || 0) > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {exam.total_points} ن
                        </span>
                      )}
                    </div>

                    {/* CTA arrow */}
                    <div
                      className="absolute bottom-4 left-4 w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:-translate-x-0 -translate-x-2 transition-all"
                      style={{ background: accentColor, color: "white" }}
                    >
                      <Play className="w-3.5 h-3.5 fill-current" style={{ transform: "rotate(180deg)" }} />
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Link to archive */}
        <div className="text-center pt-4">
          <Link
            to="/annales"
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            تصفّح الأرشيف الكامل
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FINAL CTA — diagnostic before exam */}
      <section className="relative py-16 px-6 bg-gradient-to-br from-[hsl(var(--algebra)/0.06)] via-secondary/30 to-[hsl(var(--accent)/0.06)] border-t border-border/60">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-black">
            <Sparkles className="w-3.5 h-3.5" />
            نصيحة قبل المحاكاة
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-foreground tracking-tight leading-tight">
            ابدأ بتشخيص قصير حتى نختار لك الموضوع المناسب لمستواك
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            5 دقائق فقط، 10 أسئلة. نحدد ثغراتك ونقترح أفضل موضوع تبدأ به ليكون التحدي مفيداً لا محبطاً.
          </p>
          <Link to="/diagnostic" className="btn-ink inline-flex px-8 py-3.5">
            <span className="flex items-center gap-2.5 text-sm">
              ابدأ التشخيص أوّلاً
              <ArrowLeft className="w-4 h-4" />
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
