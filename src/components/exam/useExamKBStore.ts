// ===== Exam KB Store — Secondary KB for past BEM/BAC exams — Supabase-backed =====
import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Pattern } from "@/components/admin/useAdminKBStore";

export interface ExamEntry {
  id: string;
  year: string;
  session: string;
  format: "bem" | "bac" | "regular" | "devoir";
  grade: string;
  stream?: string;
}

export interface ExamQuestion {
  id: string;
  examId: string;
  sectionLabel: string;
  questionNumber: number;
  subQuestion?: string;
  text: string;
  points: number;
  type: string;
  difficulty: "easy" | "medium" | "hard";
  concepts: string[];
  linkedPatternIds: string[];
  linkedExerciseIds: string[];
}

export interface ExamKBAnalysis {
  topicFrequency: Record<string, { count: number; totalPoints: number; years: string[] }>;
  difficultyDistribution: Record<string, number>;
  yearTrends: Record<string, Record<string, number>>;
  conceptFrequency: Record<string, number>;
  predictions: { type: string; probability: number; reasoning: string }[];
  kbCoverage: { covered: string[]; gaps: string[] };
}

export type ExamKBView = "exams" | "questions" | "analytics" | "links";

export function useExamKBStore(primaryPatterns: Pattern[] = []) {
  const [view, setView] = useState<ExamKBView>("exams");
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(false);

  // Load from Supabase on mount
  useEffect(() => {
    loadFromDB();
  }, []);

  async function loadFromDB() {
    setLoading(true);
    try {
      const [examRes, qRes] = await Promise.all([
        (supabase as any).from("exam_kb_entries").select("*").order("year", { ascending: false }),
        (supabase as any).from("exam_kb_questions").select("*").order("question_number"),
      ]);

      if (examRes.data) {
        setExams(examRes.data.map((e: any) => ({
          id: e.id,
          year: e.year || "",
          session: e.session || "juin",
          format: e.format || "bem",
          grade: e.grade || "",
          stream: e.stream || undefined,
        })));
      }

      if (qRes.data) {
        setQuestions(qRes.data.map((q: any) => ({
          id: q.id,
          examId: q.exam_id,
          sectionLabel: q.section_label,
          questionNumber: q.question_number,
          subQuestion: q.sub_question || undefined,
          text: q.text,
          points: q.points || 0,
          type: q.type || "unclassified",
          difficulty: q.difficulty || "medium",
          concepts: Array.isArray(q.concepts) ? q.concepts : [],
          linkedPatternIds: Array.isArray(q.linked_pattern_ids) ? q.linked_pattern_ids : [],
          linkedExerciseIds: Array.isArray(q.linked_exercise_ids) ? q.linked_exercise_ids : [],
        })));
      }
    } catch (err) {
      console.error("Failed to load ExamKB:", err);
    } finally {
      setLoading(false);
    }
  }

  // Get current user id
  async function getUserId(): Promise<string | null> {
    const { data } = await supabase.auth.getUser();
    return data?.user?.id || null;
  }

  const addExam = useCallback(async (exam: ExamEntry) => {
    setExams(prev => [...prev, exam]);
    const userId = await getUserId();
    if (userId) {
      await (supabase as any).from("exam_kb_entries").insert({
        id: exam.id,
        user_id: userId,
        year: exam.year,
        session: exam.session,
        format: exam.format,
        grade: exam.grade,
        stream: exam.stream || null,
      });
    }
  }, []);

  const deleteExam = useCallback(async (id: string) => {
    setExams(prev => prev.filter(e => e.id !== id));
    setQuestions(prev => prev.filter(q => q.examId !== id));
    await (supabase as any).from("exam_kb_entries").delete().eq("id", id);
  }, []);

  const addQuestion = useCallback(async (q: ExamQuestion) => {
    setQuestions(prev => [...prev, q]);
    const userId = await getUserId();
    if (userId) {
      await (supabase as any).from("exam_kb_questions").insert({
        id: q.id,
        user_id: userId,
        exam_id: q.examId,
        section_label: q.sectionLabel,
        question_number: q.questionNumber,
        sub_question: q.subQuestion || null,
        text: q.text,
        points: q.points,
        type: q.type,
        difficulty: q.difficulty,
        concepts: q.concepts,
        linked_pattern_ids: q.linkedPatternIds,
        linked_exercise_ids: q.linkedExerciseIds,
      });
    }
  }, []);

  const addQuestions = useCallback(async (qs: ExamQuestion[]) => {
    setQuestions(prev => [...prev, ...qs]);
    const userId = await getUserId();
    if (userId && qs.length > 0) {
      const rows = qs.map(q => ({
        id: q.id,
        user_id: userId,
        exam_id: q.examId,
        section_label: q.sectionLabel,
        question_number: q.questionNumber,
        sub_question: q.subQuestion || null,
        text: q.text,
        points: q.points,
        type: q.type,
        difficulty: q.difficulty,
        concepts: q.concepts,
        linked_pattern_ids: q.linkedPatternIds,
        linked_exercise_ids: q.linkedExerciseIds,
      }));
      await (supabase as any).from("exam_kb_questions").insert(rows);
    }
  }, []);

  const updateQuestion = useCallback(async (id: string, updates: Partial<ExamQuestion>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
    const dbUpdates: any = {};
    if (updates.sectionLabel !== undefined) dbUpdates.section_label = updates.sectionLabel;
    if (updates.questionNumber !== undefined) dbUpdates.question_number = updates.questionNumber;
    if (updates.subQuestion !== undefined) dbUpdates.sub_question = updates.subQuestion;
    if (updates.text !== undefined) dbUpdates.text = updates.text;
    if (updates.points !== undefined) dbUpdates.points = updates.points;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.difficulty !== undefined) dbUpdates.difficulty = updates.difficulty;
    if (updates.concepts !== undefined) dbUpdates.concepts = updates.concepts;
    if (updates.linkedPatternIds !== undefined) dbUpdates.linked_pattern_ids = updates.linkedPatternIds;
    if (updates.linkedExerciseIds !== undefined) dbUpdates.linked_exercise_ids = updates.linkedExerciseIds;
    if (Object.keys(dbUpdates).length > 0) {
      await (supabase as any).from("exam_kb_questions").update(dbUpdates).eq("id", id);
    }
  }, []);

  const deleteQuestion = useCallback(async (id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
    await (supabase as any).from("exam_kb_questions").delete().eq("id", id);
  }, []);

  const linkToPattern = useCallback(async (questionId: string, patternId: string) => {
    setQuestions(prev => prev.map(q =>
      q.id === questionId
        ? { ...q, linkedPatternIds: [...new Set([...q.linkedPatternIds, patternId])] }
        : q
    ));
    // Read current, update
    const q = questions.find(q => q.id === questionId);
    if (q) {
      const newIds = [...new Set([...q.linkedPatternIds, patternId])];
      await (supabase as any).from("exam_kb_questions").update({ linked_pattern_ids: newIds }).eq("id", questionId);
    }
  }, [questions]);

  const unlinkPattern = useCallback(async (questionId: string, patternId: string) => {
    setQuestions(prev => prev.map(q =>
      q.id === questionId
        ? { ...q, linkedPatternIds: q.linkedPatternIds.filter(p => p !== patternId) }
        : q
    ));
    const q = questions.find(q => q.id === questionId);
    if (q) {
      const newIds = q.linkedPatternIds.filter(p => p !== patternId);
      await (supabase as any).from("exam_kb_questions").update({ linked_pattern_ids: newIds }).eq("id", questionId);
    }
  }, [questions]);

  const autoLinkAll = useCallback(async () => {
    const updated = questions.map(q => {
      const matches = primaryPatterns.filter(p =>
        p.type === q.type ||
        (p.concepts || []).some(c => q.concepts.includes(c))
      );
      return {
        ...q,
        linkedPatternIds: [...new Set([...q.linkedPatternIds, ...matches.map(m => m.id)])],
      };
    });
    setQuestions(updated);
    // Batch update in DB
    for (const q of updated) {
      await (supabase as any).from("exam_kb_questions").update({ linked_pattern_ids: q.linkedPatternIds }).eq("id", q.id);
    }
  }, [primaryPatterns, questions]);

  // Analytics (computed, same as before)
  const analysis: ExamKBAnalysis = (() => {
    const topicFrequency: Record<string, { count: number; totalPoints: number; years: string[] }> = {};
    const difficultyDistribution: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    const yearTrends: Record<string, Record<string, number>> = {};
    const conceptFrequency: Record<string, number> = {};

    questions.forEach(q => {
      const exam = exams.find(e => e.id === q.examId);
      const year = exam?.year || "unknown";
      if (!topicFrequency[q.type]) topicFrequency[q.type] = { count: 0, totalPoints: 0, years: [] };
      topicFrequency[q.type].count++;
      topicFrequency[q.type].totalPoints += q.points;
      if (!topicFrequency[q.type].years.includes(year)) topicFrequency[q.type].years.push(year);
      difficultyDistribution[q.difficulty]++;
      if (!yearTrends[year]) yearTrends[year] = {};
      yearTrends[year][q.type] = (yearTrends[year][q.type] || 0) + 1;
      q.concepts.forEach(c => { conceptFrequency[c] = (conceptFrequency[c] || 0) + 1; });
    });

    const sortedTopics = Object.entries(topicFrequency).sort((a, b) => b[1].count - a[1].count);
    const predictions = sortedTopics.slice(0, 5).map(([type, data]) => ({
      type,
      probability: Math.min(95, Math.round((data.count / Math.max(questions.length, 1)) * 100 + 20)),
      reasoning: `ظهر ${data.count} مرة في ${data.years.length} سنة بمجموع ${data.totalPoints} نقطة`,
    }));

    const examTypes = new Set(questions.map(q => q.type));
    const patternTypes = new Set(primaryPatterns.map(p => p.type));
    const covered = [...examTypes].filter(t => patternTypes.has(t));
    const gaps = [...examTypes].filter(t => !patternTypes.has(t));

    return { topicFrequency, difficultyDistribution, yearTrends, conceptFrequency, predictions, kbCoverage: { covered, gaps } };
  })();

  const importExamText = useCallback((examId: string, text: string, format: "bem" | "bac") => {
    const lines = text.split("\n").filter(l => l.trim());
    const newQuestions: ExamQuestion[] = [];
    let currentSection = "";
    let questionNum = 0;

    const sectionPatterns = [
      /التمرين\s+(الأول|الثاني|الثالث|الرابع|الخامس)/,
      /المسألة/,
      /Exercise\s+(\d+)/i,
      /Problem/i,
    ];

    const sectionLabels: Record<string, string> = {
      "الأول": "التمرين الأول", "الثاني": "التمرين الثاني",
      "الثالث": "التمرين الثالث", "الرابع": "التمرين الرابع",
      "الخامس": "التمرين الخامس",
    };

    let buffer = "";
    lines.forEach(line => {
      const sectionMatch = sectionPatterns.find(p => p.test(line));
      if (sectionMatch) {
        if (buffer.trim() && currentSection) {
          questionNum++;
          newQuestions.push({
            id: crypto.randomUUID(),
            examId,
            sectionLabel: currentSection,
            questionNumber: questionNum,
            text: buffer.trim(),
            points: format === "bac" && currentSection === "المسألة" ? 6 : 4,
            type: "unclassified",
            difficulty: "medium",
            concepts: [],
            linkedPatternIds: [],
            linkedExerciseIds: [],
          });
          buffer = "";
        }
        const match = line.match(/التمرين\s+(الأول|الثاني|الثالث|الرابع|الخامس)/);
        currentSection = match ? sectionLabels[match[1]] || line.trim() :
          /المسألة/.test(line) ? "المسألة" : line.trim();
      } else {
        buffer += line + "\n";
      }
    });

    if (buffer.trim() && currentSection) {
      questionNum++;
      newQuestions.push({
        id: crypto.randomUUID(),
        examId,
        sectionLabel: currentSection,
        questionNumber: questionNum,
        text: buffer.trim(),
        points: format === "bac" && currentSection === "المسألة" ? 6 : 4,
        type: "unclassified",
        difficulty: "medium",
        concepts: [],
        linkedPatternIds: [],
        linkedExerciseIds: [],
      });
    }

    if (newQuestions.length > 0) addQuestions(newQuestions);
    return newQuestions;
  }, [addQuestions]);

  const exportData = useCallback(() => ({ exams, questions }), [exams, questions]);

  const importData = useCallback(async (data: { exams?: ExamEntry[]; questions?: ExamQuestion[] }) => {
    const userId = await getUserId();
    if (!userId) {
      console.error("User not logged in, import aborted.");
      return;
    }

    if (data.exams && data.exams.length > 0) {
      setExams(prev => {
        const existingIds = new Set(prev.map(e => e.id));
        const newExams = data.exams!.filter(e => !existingIds.has(e.id));
        return [...prev, ...newExams];
      });
      
      const examRows = data.exams.map(e => ({
        id: e.id,
        user_id: userId,
        year: e.year,
        session: e.session,
        format: e.format,
        grade: e.grade,
        stream: e.stream || null,
      }));
      await (supabase as any).from("exam_kb_entries").upsert(examRows);
    }

    if (data.questions && data.questions.length > 0) {
      setQuestions(prev => {
        const existingIds = new Set(prev.map(q => q.id));
        const newQs = data.questions!.filter(q => !existingIds.has(q.id));
        return [...prev, ...newQs];
      });

      const qRows = data.questions.map(q => ({
        id: q.id,
        user_id: userId,
        exam_id: q.examId,
        section_label: q.sectionLabel,
        question_number: q.questionNumber,
        sub_question: q.subQuestion || null,
        text: q.text,
        points: q.points,
        type: q.type,
        difficulty: q.difficulty,
        concepts: q.concepts,
        linked_pattern_ids: q.linkedPatternIds,
        linked_exercise_ids: q.linkedExerciseIds,
      }));
      await (supabase as any).from("exam_kb_questions").upsert(qRows);
    }
  }, []);

  return {
    view, setView,
    exams, questions, loading,
    addExam, deleteExam,
    addQuestion, addQuestions, updateQuestion, deleteQuestion,
    linkToPattern, unlinkPattern, autoLinkAll,
    analysis,
    importExamText, exportData, importData,
    reload: loadFromDB,
  };
}
