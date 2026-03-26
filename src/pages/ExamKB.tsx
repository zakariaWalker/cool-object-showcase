// ===== Exam KB Page — Import, Analyze, Link past exams =====
import { useState } from "react";
import { useExamKBStore } from "@/components/exam/useExamKBStore";
import { useAdminKBStore } from "@/components/admin/useAdminKBStore";
import { ExamKBImporter } from "@/components/exam/ExamKBImporter";
import { ExamKBQuestions } from "@/components/exam/ExamKBQuestions";
import { ExamKBAnalytics } from "@/components/exam/ExamKBAnalytics";
import { ExamKBLinks } from "@/components/exam/ExamKBLinks";
import { ExamPDFUploader } from "@/components/exam/ExamPDFUploader";
import { ExamConfidenceAnalysis } from "@/components/exam/ExamConfidenceAnalysis";
import type { ExamKBView } from "@/components/exam/useExamKBStore";

type ExtendedView = ExamKBView | "pdf-upload" | "confidence";

export default function ExamKBPage() {
  const primaryKB = useAdminKBStore();
  const store = useExamKBStore(primaryKB.patterns);
  const [activeView, setActiveView] = useState<ExtendedView>("pdf-upload");

  const tabs: { id: ExtendedView; label: string; icon: string }[] = [
    { id: "pdf-upload", label: "رفع PDF", icon: "📄" },
    { id: "exams", label: "استيراد يدوي", icon: "📥" },
    { id: "questions", label: "الأسئلة", icon: "📋" },
    { id: "confidence", label: "كسر الرهبة", icon: "💪" },
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
              <button key={t.id} onClick={() => {
                if (t.id === "pdf-upload" || t.id === "confidence") setActiveView(t.id);
                else { store.setView(t.id as ExamKBView); setActiveView(t.id); }
              }}
                className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: activeView === t.id ? "hsl(var(--primary))" : "transparent",
                  color: activeView === t.id ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
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
        {activeView === "pdf-upload" && <ExamPDFUploader onQuestionsExtracted={() => store.reload()} />}
        {activeView === "exams" && <ExamKBImporter store={store} />}
        {activeView === "questions" && <ExamKBQuestions store={store} />}
        {activeView === "confidence" && (
          <ExamConfidenceAnalysis
            exams={store.exams}
            questions={store.questions}
            analysis={store.analysis}
          />
        )}
        {activeView === "analytics" && <ExamKBAnalytics store={store} primaryPatterns={primaryKB.patterns} />}
        {activeView === "links" && <ExamKBLinks store={store} primaryKB={primaryKB} />}
      </div>
    </div>
  );
}
