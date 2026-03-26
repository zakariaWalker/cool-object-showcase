// ===== Exam KB Store — Secondary KB for past BEM/BAC exams =====
import { useState, useCallback } from "react";
import { Pattern } from "@/components/admin/useAdminKBStore";

export interface ExamEntry {
  id: string;
  year: string;
  session: string; // "juin" | "septembre" | "remplacement"
  format: "bem" | "bac" | "regular";
  grade: string;
  stream?: string; // for BAC: "sciences" | "math" | "lettres" etc.
}

export interface ExamQuestion {
  id: string;
  examId: string;
  sectionLabel: string; // "التمرين الأول", "المسألة" etc.
  questionNumber: number;
  subQuestion?: string; // "1)", "2.a)" etc.
  text: string;
  points: number;
  type: string; // math type
  difficulty: "easy" | "medium" | "hard";
  concepts: string[];
  // Link to primary KB
  linkedPatternIds: string[];
  linkedExerciseIds: string[];
}

export interface ExamKBAnalysis {
  topicFrequency: Record<string, { count: number; totalPoints: number; years: string[] }>;
  difficultyDistribution: Record<string, number>;
  yearTrends: Record<string, Record<string, number>>; // year → type → count
  conceptFrequency: Record<string, number>;
  predictions: { type: string; probability: number; reasoning: string }[];
  kbCoverage: { covered: string[]; gaps: string[] };
}

export type ExamKBView = "exams" | "questions" | "analytics" | "links";

export function useExamKBStore(primaryPatterns: Pattern[] = []) {
  const [view, setView] = useState<ExamKBView>("exams");
  const [exams, setExams] = useState<ExamEntry[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);

  // CRUD for exams
  const addExam = useCallback((exam: ExamEntry) => {
    setExams(prev => [...prev, exam]);
  }, []);

  const deleteExam = useCallback((id: string) => {
    setExams(prev => prev.filter(e => e.id !== id));
    setQuestions(prev => prev.filter(q => q.examId !== id));
  }, []);

  // CRUD for questions
  const addQuestion = useCallback((q: ExamQuestion) => {
    setQuestions(prev => [...prev, q]);
  }, []);

  const addQuestions = useCallback((qs: ExamQuestion[]) => {
    setQuestions(prev => [...prev, ...qs]);
  }, []);

  const updateQuestion = useCallback((id: string, updates: Partial<ExamQuestion>) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
  }, []);

  const deleteQuestion = useCallback((id: string) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  }, []);

  // Link question to primary KB pattern
  const linkToPattern = useCallback((questionId: string, patternId: string) => {
    setQuestions(prev => prev.map(q =>
      q.id === questionId
        ? { ...q, linkedPatternIds: [...new Set([...q.linkedPatternIds, patternId])] }
        : q
    ));
  }, []);

  const unlinkPattern = useCallback((questionId: string, patternId: string) => {
    setQuestions(prev => prev.map(q =>
      q.id === questionId
        ? { ...q, linkedPatternIds: q.linkedPatternIds.filter(p => p !== patternId) }
        : q
    ));
  }, []);

  // Auto-link: match question types/concepts to primary KB patterns
  const autoLinkAll = useCallback(() => {
    setQuestions(prev => prev.map(q => {
      const matches = primaryPatterns.filter(p =>
        p.type === q.type ||
        (p.concepts || []).some(c => q.concepts.includes(c))
      );
      return {
        ...q,
        linkedPatternIds: [...new Set([...q.linkedPatternIds, ...matches.map(m => m.id)])],
      };
    }));
  }, [primaryPatterns]);

  // Analytics
  const analysis: ExamKBAnalysis = (() => {
    const topicFrequency: Record<string, { count: number; totalPoints: number; years: string[] }> = {};
    const difficultyDistribution: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
    const yearTrends: Record<string, Record<string, number>> = {};
    const conceptFrequency: Record<string, number> = {};

    questions.forEach(q => {
      const exam = exams.find(e => e.id === q.examId);
      const year = exam?.year || "unknown";

      // Topic frequency
      if (!topicFrequency[q.type]) topicFrequency[q.type] = { count: 0, totalPoints: 0, years: [] };
      topicFrequency[q.type].count++;
      topicFrequency[q.type].totalPoints += q.points;
      if (!topicFrequency[q.type].years.includes(year)) topicFrequency[q.type].years.push(year);

      // Difficulty
      difficultyDistribution[q.difficulty]++;

      // Year trends
      if (!yearTrends[year]) yearTrends[year] = {};
      yearTrends[year][q.type] = (yearTrends[year][q.type] || 0) + 1;

      // Concepts
      q.concepts.forEach(c => {
        conceptFrequency[c] = (conceptFrequency[c] || 0) + 1;
      });
    });

    // Predictions based on frequency trends
    const sortedTopics = Object.entries(topicFrequency).sort((a, b) => b[1].count - a[1].count);
    const predictions = sortedTopics.slice(0, 5).map(([type, data]) => ({
      type,
      probability: Math.min(95, Math.round((data.count / Math.max(questions.length, 1)) * 100 + 20)),
      reasoning: `ظهر ${data.count} مرة في ${data.years.length} سنة بمجموع ${data.totalPoints} نقطة`,
    }));

    // KB coverage
    const examTypes = new Set(questions.map(q => q.type));
    const patternTypes = new Set(primaryPatterns.map(p => p.type));
    const covered = [...examTypes].filter(t => patternTypes.has(t));
    const gaps = [...examTypes].filter(t => !patternTypes.has(t));

    return { topicFrequency, difficultyDistribution, yearTrends, conceptFrequency, predictions, kbCoverage: { covered, gaps } };
  })();

  // Import from text (parse exam text into questions)
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
        // Save previous buffer
        if (buffer.trim() && currentSection) {
          questionNum++;
          newQuestions.push({
            id: `eq_${examId}_${questionNum}_${Date.now()}`,
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

    // Last buffer
    if (buffer.trim() && currentSection) {
      questionNum++;
      newQuestions.push({
        id: `eq_${examId}_${questionNum}_${Date.now()}`,
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

  // Export/Import JSON
  const exportData = useCallback(() => ({ exams, questions }), [exams, questions]);

  const importData = useCallback((data: { exams?: ExamEntry[]; questions?: ExamQuestion[] }) => {
    if (data.exams) setExams(data.exams);
    if (data.questions) setQuestions(data.questions);
  }, []);

  return {
    view, setView,
    exams, questions,
    addExam, deleteExam,
    addQuestion, addQuestions, updateQuestion, deleteQuestion,
    linkToPattern, unlinkPattern, autoLinkAll,
    analysis,
    importExamText, exportData, importData,
  };
}
