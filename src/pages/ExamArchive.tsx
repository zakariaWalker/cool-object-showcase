import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Search, Filter, BookOpen, GraduationCap, Trophy, Calendar, LayoutGrid, List } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { GRADE_OPTIONS } from "@/engine/exam-types";
import { Button } from "@/components/ui/button";

interface ExamEntry {
  id: string;
  year: string;
  session: string;
  format: string;
  grade: string;
  stream: string | null;
  created_at: string;
  question_count?: number;
}

export default function ExamArchive() {
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const navigate = useNavigate();

  useEffect(() => {
    loadExams();
  }, []);

  async function loadExams() {
    setLoading(true);
    try {
      // First get basic entries
      const { data: entries, error } = await supabase
        .from("exam_kb_entries")
        .select("*")
        .order("year", { ascending: false });

      if (error) throw error;

      // Get question counts for each entry
      const { data: counts } = await supabase
        .from("exam_kb_questions")
        .select("exam_id");

      const examList = (entries || []).map(e => ({
        ...e,
        question_count: (counts || []).filter(c => c.exam_id === e.id).length
      }));

      setExams(examList);
    } catch (e) {
      console.error("Error loading exams:", e);
    } finally {
      setLoading(false);
    }
  }

  const filteredExams = exams.filter(e => {
    const matchesSearch = search === "" || 
      e.year.includes(search) || 
      e.format.toLowerCase().includes(search.toLowerCase());
    const matchesGrade = gradeFilter === "all" || e.grade === gradeFilter;
    const matchesFormat = formatFilter === "all" || e.format === formatFilter;
    return matchesSearch && matchesGrade && matchesFormat;
  });

  const formatIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case "bac": return <Trophy className="w-5 h-5" />;
      case "bem": return <GraduationCap className="w-5 h-5" />;
      default: return <BookOpen className="w-5 h-5" />;
    }
  };

  const formatColor = (format: string) => {
    switch (format.toLowerCase()) {
      case "bac": return "from-amber-500 to-orange-600";
      case "bem": return "from-blue-500 to-cyan-600";
      default: return "from-emerald-500 to-teal-600";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      {/* Header Section */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-black text-foreground">📚 المواضيع السابقة (Annales)</h1>
              <p className="text-muted-foreground font-medium">التحضير لشهادة البكالوريا والتعليم المتوسط عبر امتحانات السنوات السابقة.</p>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="relative group flex-1 md:w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder="ابحث بالسنة أو النوع..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-11 bg-muted/50 border-2 border-transparent focus:border-primary/20 focus:bg-background rounded-2xl pr-10 pl-4 text-sm font-medium transition-all"
                />
              </div>
              <div className="flex bg-muted/50 rounded-xl p-1">
                <button 
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-background shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-8">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/10 text-primary text-xs font-black">
              <Filter className="w-3.5 h-3.5" /> تصفية النتائج
            </div>
            
            <select 
              value={gradeFilter} 
              onChange={(e) => setGradeFilter(e.target.value)}
              className="h-9 bg-muted/50 border-none rounded-xl px-4 text-xs font-bold focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">جميع المستويات</option>
              {GRADE_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>

            <select 
              value={formatFilter} 
              onChange={(e) => setFormatFilter(e.target.value)}
              className="h-9 bg-muted/50 border-none rounded-xl px-4 text-xs font-bold focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">جميع أنواع الامتحانات</option>
              <option value="bac">بكالوريا (BAC)</option>
              <option value="bem">تعليم متوسط (BEM)</option>
              <option value="regular">اختبارات فصيلة</option>
            </select>

            {exams.length > 0 && (
              <span className="mr-auto text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted rounded-full px-3 py-1">
                {filteredExams.length} موضوع متاح
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-6 mt-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-64 rounded-[2rem] bg-card/50 border border-border animate-pulse" />
            ))}
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="text-center py-32 space-y-4">
            <div className="w-20 h-20 bg-muted rounded-3xl flex items-center justify-center mx-auto text-4xl mb-6">🔍</div>
            <h2 className="text-2xl font-black text-foreground">لم نجد أي مواضيع تطابق بحثك</h2>
            <p className="text-muted-foreground max-w-md mx-auto">جرب تغيير الفلاتر أو البحث عن سنة أخرى.</p>
            <Button variant="outline" onClick={() => { setSearch(""); setGradeFilter("all"); setFormatFilter("all"); }} className="rounded-xl">إعادة ضبط الفلاتر</Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <AnimatePresence>
              {filteredExams.map((exam, i) => (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -8 }}
                  className="group relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-br opacity-5 rounded-[2.5rem] transition-opacity group-hover:opacity-10"
                    style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-from), var(--tw-gradient-to))` }}
                  />
                  <div className="relative bg-card border border-border/60 p-8 rounded-[2.5rem] shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-primary/5 transition-all overflow-hidden flex flex-col h-full">
                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${formatColor(exam.format)} opacity-10 rounded-full blur-3xl -mr-16 -mt-16`} />
                    
                    <div className="flex items-center justify-between mb-6">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${formatColor(exam.format)} text-white flex items-center justify-center shadow-lg`}>
                        {formatIcon(exam.format)}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-foreground">{exam.year}</div>
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{exam.session === 'juin' ? 'دورة جوان' : exam.session === 'septembre' ? 'دورة سبتمبر' : exam.session}</div>
                      </div>
                    </div>

                    <h3 className="text-xl font-black text-foreground mb-2 leading-tight">
                      {exam.format.toUpperCase()} — {GRADE_OPTIONS.find(g => g.value === exam.grade)?.label?.split("—")[0] || exam.grade}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium mb-6">
                      {exam.stream ? `شعبة ${exam.stream}` : "جميع الشعب"}
                    </p>

                    <div className="mt-auto pt-6 border-t border-border/50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                        <List className="w-3.5 h-3.5 text-primary" /> {exam.question_count} أسئلة مفككة
                      </div>
                      <Button 
                        onClick={() => navigate(`/archive-solve/${exam.id}`)}
                        className="rounded-xl h-10 px-6 font-black shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                      >
                        ابدأ الحل الآن
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-4">
             {filteredExams.map((exam, i) => (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => navigate(`/archive-solve/${exam.id}`)}
                  className="bg-card border border-border p-5 rounded-2xl flex items-center gap-6 hover:border-primary/50 cursor-pointer transition-all group"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${formatColor(exam.format)} text-white flex items-center justify-center shrink-0`}>
                    {formatIcon(exam.format)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                       <h3 className="text-lg font-black text-foreground">{exam.format.toUpperCase()} {exam.year}</h3>
                       <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">{exam.session}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-bold">
                      {GRADE_OPTIONS.find(g => g.value === exam.grade)?.label} {exam.stream && `· شعبة ${exam.stream}`}
                    </p>
                  </div>
                  <div className="text-left">
                     <div className="text-xs font-black text-primary mb-1">{exam.question_count} أسئلة</div>
                     <div className="flex items-center gap-1 text-[10px] font-black text-muted-foreground group-hover:text-primary transition-colors">
                        دخول لبيئة الحل <ChevronLeft className="w-3 h-3" />
                     </div>
                  </div>
                </motion.div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
}

const ChevronLeft = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
  </svg>
);
