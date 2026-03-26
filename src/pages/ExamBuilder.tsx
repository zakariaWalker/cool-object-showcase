// ===== Exam Builder & Corrector Page =====
import { useState } from "react";
import { ExamBuilderPanel } from "@/components/exam/ExamBuilderPanel";
import { ExamCorrectorPanel } from "@/components/exam/ExamCorrectorPanel";
import { ExamListPanel } from "@/components/exam/ExamListPanel";
import { Exam } from "@/engine/exam-types";

type Tab = "build" | "correct" | "list";

export default function ExamBuilderPage() {
  const [tab, setTab] = useState<Tab>("build");
  const [exams, setExams] = useState<Exam[]>([]);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [correctingExam, setCorrectingExam] = useState<Exam | null>(null);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "build", label: "بناء امتحان", icon: "📝" },
    { id: "correct", label: "تصحيح", icon: "✅" },
    { id: "list", label: "الامتحانات", icon: "📋" },
  ];

  const handleSaveExam = (exam: Exam) => {
    setExams(prev => {
      const idx = prev.findIndex(e => e.id === exam.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = exam; return next; }
      return [...prev, exam];
    });
    setEditingExam(null);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Tab bar */}
      <div className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 py-2">
          <h1 className="text-sm font-black text-foreground ml-4">🏗️ منشئ الامتحانات</h1>
          <div className="flex items-center gap-1 mr-4">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: tab === t.id ? "hsl(var(--primary))" : "transparent",
                  color: tab === t.id ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                }}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-4">
        {tab === "build" && (
          <ExamBuilderPanel
            exam={editingExam}
            onSave={handleSaveExam}
            onCancel={() => setEditingExam(null)}
          />
        )}
        {tab === "correct" && (
          <ExamCorrectorPanel
            exams={exams}
            exam={correctingExam}
            onSelectExam={setCorrectingExam}
          />
        )}
        {tab === "list" && (
          <ExamListPanel
            exams={exams}
            onEdit={exam => { setEditingExam(exam); setTab("build"); }}
            onCorrect={exam => { setCorrectingExam(exam); setTab("correct"); }}
            onDelete={id => setExams(prev => prev.filter(e => e.id !== id))}
          />
        )}
      </div>
    </div>
  );
}
