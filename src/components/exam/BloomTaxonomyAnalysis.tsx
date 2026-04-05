// ===== Bloom Taxonomy Deep Analysis — Exam KB =====
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from "recharts";

const BLOOM = [
  { level: 1, label: "تذكّر", labelFr: "Mémoriser", color: "#22c55e", desc: "استرجاع الحقائق والمعلومات الأساسية" },
  { level: 2, label: "فهم", labelFr: "Comprendre", color: "#3b82f6", desc: "شرح الأفكار والمفاهيم بطريقتك" },
  { level: 3, label: "تطبيق", labelFr: "Appliquer", color: "#8b5cf6", desc: "استخدام المعلومات في مواقف جديدة" },
  { level: 4, label: "تحليل", labelFr: "Analyser", color: "#f59e0b", desc: "تفكيك المعلومات واكتشاف العلاقات" },
  { level: 5, label: "تقييم", labelFr: "Évaluer", color: "#ef4444", desc: "تبرير قرار أو حكم" },
  { level: 6, label: "إبداع", labelFr: "Créer", color: "#ec4899", desc: "إنتاج عمل أو حل أصيل" },
];

interface ExamRow {
  id: string;
  year: string;
  session: string;
  format: string;
  grade: string;
}

interface QuestionRow {
  id: string;
  exam_id: string;
  bloom_level: number | null;
  cognitive_level: string | null;
  text: string;
  points: number;
  concepts: string[] | null;
  section_label: string;
  difficulty: string;
  question_number: number;
  sub_question: string | null;
}

type ProfileType = "memorizer" | "applicator" | "analyst" | "creator";

const PROFILES: Record<ProfileType, { label: string; icon: string; desc: string; color: string }> = {
  memorizer: { label: "حافظ", icon: "🧠", desc: "يركز على التذكر والفهم (B1-B2)", color: "#22c55e" },
  applicator: { label: "مُطبّق", icon: "⚙️", desc: "يركز على التطبيق المباشر (B3)", color: "#8b5cf6" },
  analyst: { label: "مُحلّل", icon: "🔍", desc: "يتطلب التحليل والتقييم (B4-B5)", color: "#f59e0b" },
  creator: { label: "مُبدع", icon: "✨", desc: "يتطلب الإبداع والتركيب (B6)", color: "#ec4899" },
};

function computeProfile(bloomDist: Record<number, number>): ProfileType {
  const low = (bloomDist[1] || 0) + (bloomDist[2] || 0);
  const mid = bloomDist[3] || 0;
  const high = (bloomDist[4] || 0) + (bloomDist[5] || 0);
  const top = bloomDist[6] || 0;
  const max = Math.max(low, mid, high, top);
  if (max === top && top > 0) return "creator";
  if (max === high) return "analyst";
  if (max === mid) return "applicator";
  return "memorizer";
}

export function BloomTaxonomyAnalysis() {
  const [selectedExams, setSelectedExams] = useState<Set<string>>(new Set());

  // Fetch exams
  const { data: exams = [] } = useQuery({
    queryKey: ["bloom-exams"],
    queryFn: async () => {
      const { data } = await supabase.from("exam_kb_entries").select("id, year, session, format, grade").order("year", { ascending: false });
      return (data || []) as ExamRow[];
    },
  });

  // Fetch all questions
  const { data: allQuestions = [] } = useQuery({
    queryKey: ["bloom-questions"],
    queryFn: async () => {
      const { data } = await supabase.from("exam_kb_questions").select("id, exam_id, bloom_level, cognitive_level, text, points, concepts, section_label, difficulty, question_number, sub_question");
      return (data || []) as QuestionRow[];
    },
  });

  const toggleExam = useCallback((id: string) => {
    setSelectedExams(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => setSelectedExams(new Set(exams.map(e => e.id)));
  const clearAll = () => setSelectedExams(new Set());

  // Selected questions
  const selectedQuestions = useMemo(() => {
    if (selectedExams.size === 0) return allQuestions;
    return allQuestions.filter(q => selectedExams.has(q.exam_id));
  }, [allQuestions, selectedExams]);

  // Bloom distribution per exam
  const examBloomData = useMemo(() => {
    const map = new Map<string, Record<number, { count: number; questions: QuestionRow[] }>>();
    allQuestions.forEach(q => {
      if (!map.has(q.exam_id)) map.set(q.exam_id, { 1: { count: 0, questions: [] }, 2: { count: 0, questions: [] }, 3: { count: 0, questions: [] }, 4: { count: 0, questions: [] }, 5: { count: 0, questions: [] }, 6: { count: 0, questions: [] } });
      const bl = q.bloom_level || 3;
      const entry = map.get(q.exam_id)!;
      if (!entry[bl]) entry[bl] = { count: 0, questions: [] };
      entry[bl].count++;
      entry[bl].questions.push(q);
    });
    return map;
  }, [allQuestions]);

  // Global bloom distribution for selected
  const globalBloom = useMemo(() => {
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    selectedQuestions.forEach(q => { const bl = q.bloom_level || 3; dist[bl] = (dist[bl] || 0) + 1; });
    return dist;
  }, [selectedQuestions]);

  const globalProfile = useMemo(() => computeProfile(globalBloom), [globalBloom]);

  // Radar data for selected exams
  const radarData = useMemo(() => {
    return BLOOM.map(b => {
      const row: any = { level: `B${b.level} ${b.label}` };
      const activeExams = selectedExams.size > 0 ? [...selectedExams] : exams.map(e => e.id);
      activeExams.forEach(eid => {
        const exam = exams.find(e => e.id === eid);
        if (!exam) return;
        const bloomData = examBloomData.get(eid);
        const totalForExam = allQuestions.filter(q => q.exam_id === eid).length || 1;
        const count = bloomData?.[b.level]?.count || 0;
        row[`${exam.year}-${exam.session}`] = Math.round((count / totalForExam) * 100);
      });
      return row;
    });
  }, [selectedExams, exams, examBloomData, allQuestions]);

  const radarKeys = useMemo(() => {
    const activeExams = selectedExams.size > 0 ? [...selectedExams] : exams.map(e => e.id);
    return activeExams.map(eid => {
      const exam = exams.find(e => e.id === eid);
      return exam ? `${exam.year}-${exam.session}` : eid;
    }).slice(0, 6); // max 6 for readability
  }, [selectedExams, exams]);

  const RADAR_COLORS = ["#7c3aed", "#059669", "#dc2626", "#d97706", "#ec4899", "#0ea5e9"];

  if (!exams.length) {
    return (
      <div className="text-center py-16 text-muted-foreground space-y-3">
        <div className="text-5xl">🧠</div>
        <h2 className="text-lg font-black text-foreground">تحليل بلوم</h2>
        <p className="text-sm">أضف امتحانات أولاً للحصول على تحليل معرفي</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Exam Selector Cards */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-black text-foreground">📝 اختر الامتحانات للتحليل</h2>
          <div className="flex gap-2">
            <button onClick={selectAll} className="text-[10px] px-3 py-1 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary/20 transition">تحديد الكل</button>
            <button onClick={clearAll} className="text-[10px] px-3 py-1 rounded-lg bg-muted text-muted-foreground font-bold hover:bg-muted/80 transition">إلغاء الكل</button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mb-4">انقر على كل بطاقة لتحديد/إلغاء التحديد — يتم التحليل فوراً</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
          {exams.map(exam => {
            const isSelected = selectedExams.has(exam.id);
            const qCount = allQuestions.filter(q => q.exam_id === exam.id).length;
            const bloomData = examBloomData.get(exam.id);
            const profile = bloomData ? computeProfile(
              Object.fromEntries([1,2,3,4,5,6].map(l => [l, bloomData[l]?.count || 0]))
            ) : "applicator";

            return (
              <motion.button
                key={exam.id}
                onClick={() => toggleExam(exam.id)}
                className={`relative p-3 rounded-xl border-2 text-right transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-border bg-card hover:border-primary/30"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isSelected && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-1 left-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-[10px] text-primary-foreground">✓</span>
                  </motion.div>
                )}
                <div className="text-[11px] font-black text-foreground">{exam.format.toUpperCase()}</div>
                <div className="text-[10px] text-muted-foreground font-bold">{exam.year} — {exam.session}</div>
                <div className="text-[9px] text-muted-foreground mt-1">{exam.grade || "—"}</div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[8px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: PROFILES[profile].color + "20", color: PROFILES[profile].color }}>
                    {PROFILES[profile].icon} {PROFILES[profile].label}
                  </span>
                  <span className="text-[8px] text-muted-foreground">{qCount} س</span>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Bloom Progress Bars with Question Details */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-black text-foreground mb-1">📊 التوزيع المعرفي حسب مستوى بلوم</h2>
        <p className="text-[10px] text-muted-foreground mb-4">
          {selectedExams.size > 0 ? `${selectedExams.size} امتحان محدد` : "جميع الامتحانات"} — {selectedQuestions.length} سؤال
        </p>

        <div className="space-y-4">
          {BLOOM.map(b => {
            const count = globalBloom[b.level] || 0;
            const pct = selectedQuestions.length > 0 ? Math.round((count / selectedQuestions.length) * 100) : 0;
            const questions = selectedQuestions.filter(q => (q.bloom_level || 3) === b.level);

            return (
              <BloomLevelRow key={b.level} bloom={b} count={count} pct={pct} questions={questions} />
            );
          })}
        </div>
      </div>

      {/* Radar Chart */}
      {radarKeys.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-black text-foreground mb-1">🕸️ رادار بلوم — مقارنة الامتحانات</h2>
          <p className="text-[10px] text-muted-foreground mb-4">كل محور يمثل مستوى بلوم — النسبة المئوية للأسئلة</p>

          <div style={{ width: "100%", height: 380 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="level" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 8 }} />
                {radarKeys.map((key, i) => (
                  <Radar key={key} name={key} dataKey={key} stroke={RADAR_COLORS[i % RADAR_COLORS.length]} fill={RADAR_COLORS[i % RADAR_COLORS.length]} fillOpacity={0.15} strokeWidth={2} />
                ))}
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison */}
      {selectedExams.size >= 2 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-black text-foreground mb-1">⚖️ مقارنة جنباً إلى جنب</h2>
          <p className="text-[10px] text-muted-foreground mb-4">مقارنة التوزيع المعرفي بين الامتحانات المحددة</p>

          <div className="overflow-x-auto">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right py-2 px-2 font-black text-foreground">المستوى</th>
                  {[...selectedExams].map(eid => {
                    const exam = exams.find(e => e.id === eid);
                    return (
                      <th key={eid} className="text-center py-2 px-2 font-bold text-foreground">
                        {exam ? `${exam.format.toUpperCase()} ${exam.year}` : eid.slice(0, 6)}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {BLOOM.map(b => (
                  <tr key={b.level} className="border-b border-border/50">
                    <td className="py-2 px-2 font-bold" style={{ color: b.color }}>
                      B{b.level} {b.label}
                    </td>
                    {[...selectedExams].map(eid => {
                      const totalForExam = allQuestions.filter(q => q.exam_id === eid).length || 1;
                      const count = examBloomData.get(eid)?.[b.level]?.count || 0;
                      const pct = Math.round((count / totalForExam) * 100);
                      return (
                        <td key={eid} className="text-center py-2 px-2">
                          <div className="flex items-center justify-center gap-1">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                                className="h-full rounded-full" style={{ backgroundColor: b.color }}
                              />
                            </div>
                            <span className="font-black text-foreground w-8">{pct}%</span>
                          </div>
                          <div className="text-[8px] text-muted-foreground">{count} سؤال</div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cognitive Profile Synthesis */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-black text-foreground mb-1">🎯 البروفيل المعرفي المهيمن</h2>
        <p className="text-[10px] text-muted-foreground mb-4">تحليل تركيبي للمستوى المعرفي السائد</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {(Object.entries(PROFILES) as [ProfileType, typeof PROFILES[ProfileType]][]).map(([key, prof]) => {
            const isActive = globalProfile === key;
            return (
              <motion.div
                key={key}
                className={`rounded-xl border-2 p-4 text-center transition-all ${
                  isActive ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-muted/30 opacity-50"
                }`}
                animate={{ scale: isActive ? 1.05 : 1 }}
              >
                <div className="text-3xl mb-2">{prof.icon}</div>
                <div className="text-xs font-black text-foreground">{prof.label}</div>
                <div className="text-[9px] text-muted-foreground mt-1">{prof.desc}</div>
              </motion.div>
            );
          })}
        </div>

        {/* Synthesis text */}
        <div className="p-4 rounded-xl bg-muted/40 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{PROFILES[globalProfile].icon}</span>
            <span className="text-sm font-black text-foreground">
              هذه الامتحانات تميل إلى نمط «{PROFILES[globalProfile].label}»
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {globalProfile === "memorizer" && "أغلب الأسئلة تتطلب استرجاع المعلومات وفهمها فقط. ركز على تمارين التطبيق والتحليل لرفع مستواك."}
            {globalProfile === "applicator" && "الغالبية العظمى من الأسئلة تتطلب تطبيق القوانين والقواعد مباشرة. تدرب على مسائل التحليل لتتفوق."}
            {globalProfile === "analyst" && "الامتحانات تتطلب مستوى عالٍ من التحليل والربط بين المفاهيم. جيد — هذا يعني أنك تُحضّر لامتحان يقيس الفهم العميق."}
            {globalProfile === "creator" && "الامتحانات تتضمن أسئلة إبداعية ومفتوحة بنسبة عالية. هذا مستوى متقدم يتطلب استراتيجيات حل مرنة."}
          </p>

          {/* Bloom pyramid mini */}
          <div className="mt-4 flex items-end justify-center gap-1" style={{ height: 80 }}>
            {BLOOM.map(b => {
              const pct = selectedQuestions.length > 0 ? (globalBloom[b.level] || 0) / selectedQuestions.length * 100 : 0;
              return (
                <div key={b.level} className="flex flex-col items-center gap-0.5">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: Math.max(4, pct * 0.7) }}
                    className="w-8 rounded-t"
                    style={{ backgroundColor: b.color }}
                  />
                  <span className="text-[7px] font-bold" style={{ color: b.color }}>B{b.level}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bloom Level Row with expandable questions ──────────────────────────────
function BloomLevelRow({ bloom, count, pct, questions }: {
  bloom: typeof BLOOM[0];
  count: number;
  pct: number;
  questions: QuestionRow[];
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="w-full text-right">
        <div className="flex items-center gap-3">
          <div className="w-20 shrink-0 flex items-center gap-1.5">
            <span className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black text-white" style={{ backgroundColor: bloom.color }}>
              B{bloom.level}
            </span>
            <span className="text-[10px] font-bold text-foreground">{bloom.label}</span>
          </div>

          <div className="flex-1">
            <div className="h-4 bg-muted rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full absolute inset-y-0 right-0"
                style={{ backgroundColor: bloom.color + "cc" }}
              />
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-foreground z-10">
                {pct}% ({count} سؤال)
              </span>
            </div>
          </div>

          <span className="text-[10px] text-muted-foreground w-4">{expanded ? "▲" : "▼"}</span>
        </div>
        <p className="text-[9px] text-muted-foreground mt-0.5 mr-[86px]">{bloom.desc}</p>
      </button>

      <AnimatePresence>
        {expanded && questions.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mr-[86px] mt-2"
          >
            <div className="space-y-1 max-h-[200px] overflow-y-auto pr-2">
              {questions.slice(0, 15).map((q, i) => (
                <div key={q.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40 border border-border/50">
                  <span className="w-4 h-4 rounded text-[8px] font-black flex items-center justify-center shrink-0" style={{ backgroundColor: bloom.color + "20", color: bloom.color }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-foreground leading-relaxed line-clamp-2">{q.text}</p>
                    <div className="flex items-center gap-2 mt-1 text-[8px] text-muted-foreground">
                      <span>{q.section_label}</span>
                      <span>·</span>
                      <span>{q.difficulty}</span>
                      {q.points > 0 && <><span>·</span><span>{q.points} نقاط</span></>}
                    </div>
                  </div>
                </div>
              ))}
              {questions.length > 15 && (
                <p className="text-[9px] text-muted-foreground text-center py-1">+{questions.length - 15} أسئلة أخرى</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
