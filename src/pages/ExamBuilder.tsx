// ===== Exam Builder & Corrector Page — Supabase-backed =====
import { useState, useEffect, useCallback } from "react";
import { ExamBuilderPanel } from "@/components/exam/ExamBuilderPanel";
import { ExamCorrectorPanel } from "@/components/exam/ExamCorrectorPanel";
import { ExamListPanel } from "@/components/exam/ExamListPanel";
import { Exam } from "@/engine/exam-types";
import { supabase } from "@/integrations/supabase/client";

type Tab = "build" | "correct" | "list";

export default function ExamBuilderPage() {
  const [tab, setTab] = useState<Tab>("build");
  const [exams, setExams] = useState<Exam[]>([]);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [correctingExam, setCorrectingExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(false);

  // Load exams from DB on mount
  useEffect(() => {
    loadExams();
  }, []);

  async function loadExams() {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("built_exams")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        setExams(data.map((row: any) => ({
          id: row.id,
          title: row.title,
          format: row.format,
          grade: row.grade,
          duration: row.duration,
          totalPoints: row.total_points,
          sections: Array.isArray(row.sections) ? row.sections : [],
          createdAt: row.created_at,
          status: row.status,
          metadata: row.metadata || {},
        })));
      }
    } catch (err) {
      console.error("Failed to load exams:", err);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveExam = useCallback(async (exam: Exam) => {
    setExams(prev => {
      const idx = prev.findIndex(e => e.id === exam.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = exam; return next; }
      return [...prev, exam];
    });
    setEditingExam(null);

    // Persist to DB
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (!userId) return;

    const row = {
      id: exam.id,
      user_id: userId,
      title: exam.title,
      format: exam.format,
      grade: exam.grade,
      duration: exam.duration,
      total_points: exam.totalPoints,
      sections: exam.sections,
      status: exam.status,
      metadata: exam.metadata || {},
      updated_at: new Date().toISOString(),
    };

    await (supabase as any).from("built_exams").upsert(row, { onConflict: "id" });
  }, []);

  const handleDeleteExam = useCallback(async (id: string) => {
    setExams(prev => prev.filter(e => e.id !== id));
    await (supabase as any).from("built_exams").delete().eq("id", id);
  }, []);

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "build", label: "بناء امتحان", icon: "📝" },
    { id: "correct", label: "تصحيح", icon: "✅" },
    { id: "list", label: "الامتحانات", icon: "📋" },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
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
            onDelete={handleDeleteExam}
          />
        )}
      </div>
    </div>
  );
}
