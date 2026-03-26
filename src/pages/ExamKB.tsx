// ===== Exam KB Page — Import, Analyze, Link past exams =====
import { useState } from "react";
import { useExamKBStore } from "@/components/exam/useExamKBStore";
import { useAdminKBStore } from "@/components/admin/useAdminKBStore";
import { ExamKBImporter } from "@/components/exam/ExamKBImporter";
import { ExamKBQuestions } from "@/components/exam/ExamKBQuestions";
import { ExamKBAnalytics } from "@/components/exam/ExamKBAnalytics";
import { ExamKBLinks } from "@/components/exam/ExamKBLinks";
import type { ExamKBView } from "@/components/exam/useExamKBStore";

export default function ExamKBPage() {
  const primaryKB = useAdminKBStore();
  const store = useExamKBStore(primaryKB.patterns);

  const tabs: { id: ExamKBView; label: string; icon: string }[] = [
    { id: "exams", label: "استيراد الامتحانات", icon: "📥" },
    { id: "questions", label: "الأسئلة", icon: "📋" },
    { id: "analytics", label: "تحليل شامل", icon: "📊" },
    { id: "links", label: "الربط مع KB", icon: "🔗" },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Tab bar */}
      <div className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 py-2">
          <h1 className="text-sm font-black text-foreground ml-4">📚 قاعدة معرفة الامتحانات</h1>
          <div className="flex items-center gap-1 mr-4">
            {tabs.map(t => (
              <button key={t.id} onClick={() => store.setView(t.id)}
                className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: store.view === t.id ? "hsl(var(--primary))" : "transparent",
                  color: store.view === t.id ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
          <div className="mr-auto flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {store.exams.length} امتحان · {store.questions.length} سؤال
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {store.view === "exams" && <ExamKBImporter store={store} />}
        {store.view === "questions" && <ExamKBQuestions store={store} />}
        {store.view === "analytics" && <ExamKBAnalytics store={store} primaryPatterns={primaryKB.patterns} />}
        {store.view === "links" && <ExamKBLinks store={store} primaryKB={primaryKB} />}
      </div>
    </div>
  );
}
