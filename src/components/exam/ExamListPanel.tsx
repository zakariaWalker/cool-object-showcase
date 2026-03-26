// ===== Exam List Panel =====
import { Exam, GRADE_OPTIONS } from "@/engine/exam-types";

interface Props {
  exams: Exam[];
  onEdit: (exam: Exam) => void;
  onCorrect: (exam: Exam) => void;
  onDelete: (id: string) => void;
}

export function ExamListPanel({ exams, onEdit, onCorrect, onDelete }: Props) {
  if (exams.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">📝</div>
        <h2 className="text-lg font-black text-foreground">لا توجد امتحانات بعد</h2>
        <p className="text-sm text-muted-foreground mt-1">ابدأ بإنشاء امتحان جديد من تبويب "بناء امتحان"</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-foreground">📋 الامتحانات المحفوظة</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {exams.map(exam => {
          const gradeLabel = GRADE_OPTIONS.find(g => g.value === exam.grade)?.label || exam.grade;
          const exerciseCount = exam.sections.reduce((s, sec) => s + sec.exercises.length, 0);
          const formatIcon = exam.format === "bem" ? "🎓" : exam.format === "bac" ? "🏆" : "📄";
          return (
            <div key={exam.id} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm font-black text-foreground">{formatIcon} {exam.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{gradeLabel} · /{exam.totalPoints} · {exam.duration} د</div>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                  exam.status === "ready" ? "bg-green-500/10 text-green-600" :
                  exam.status === "published" ? "bg-primary/10 text-primary" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {exam.status === "draft" ? "مسودة" : exam.status === "ready" ? "جاهز" : "منشور"}
                </span>
              </div>

              <div className="text-[10px] text-muted-foreground">
                {exam.sections.length} أقسام · {exerciseCount} تمارين
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <button onClick={() => onEdit(exam)}
                  className="flex-1 text-[11px] px-3 py-1.5 rounded-lg border border-border text-foreground font-bold hover:bg-muted transition-all">
                  ✏️ تعديل
                </button>
                <button onClick={() => onCorrect(exam)}
                  className="flex-1 text-[11px] px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-bold hover:bg-primary/20 transition-all">
                  ✅ تصحيح
                </button>
                <button onClick={() => onDelete(exam.id)}
                  className="text-[11px] px-2 py-1.5 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10 transition-all">
                  🗑️
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
