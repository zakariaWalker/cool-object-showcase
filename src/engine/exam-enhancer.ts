// ===== Exam Enhancer Engine =====
// Automatically enhances the exam builder from uploaded exams/devoirs
// Extracts patterns, scoring distribution, topic coverage, layout structure

import { ExamFormat, ExamSectionTemplate, TYPE_LABELS_AR } from "./exam-types";
import { detectScoringParams, computeBaseScore, categorizeForExam, type ExerciseScoringParams } from "./exercise-scoring";

export interface ExamBlueprint {
  format: ExamFormat;
  grade: string;
  totalPoints: number;
  duration: number;
  sectionStructure: BlueprintSection[];
  topicDistribution: Record<string, number>; // topic → percentage
  difficultyProfile: { easy: number; medium: number; hard: number }; // percentages
  progressionStyle: "linear" | "mixed" | "warmup_to_hard";
  averageExercisePoints: number;
  extractedFromCount: number; // how many exams contributed
}

export interface BlueprintSection {
  title: string;
  titleAr: string;
  averagePoints: number;
  topicPreference: string[];
  difficultyRange: [number, number]; // min-max difficulty
  exerciseCount: number;
  cognitiveLevel: string;
}

export interface UploadAnalysis {
  uploadId: string;
  sections: AnalyzedSection[];
  totalPoints: number;
  topicCoverage: Record<string, number>;
  difficultyDistribution: Record<string, number>;
  exerciseScores: { text: string; params: Partial<ExerciseScoringParams>; baseScore: number; category: string }[];
  patternSignatures: string[];
  grade: string;
  format: string;
}

export interface AnalyzedSection {
  label: string;
  questionCount: number;
  totalPoints: number;
  topics: string[];
  avgDifficulty: number;
}

// Analyze a set of extracted questions from an upload
export function analyzeUploadedExam(
  questions: { text: string; section_label: string; points: number; type?: string; difficulty?: string; concepts?: string[] }[],
  grade: string,
  format: string,
  uploadId: string
): UploadAnalysis {
  const sections: Record<string, AnalyzedSection> = {};
  const topicCoverage: Record<string, number> = {};
  const difficultyDistribution: Record<string, number> = { easy: 0, medium: 0, hard: 0 };
  const exerciseScores: UploadAnalysis["exerciseScores"] = [];
  const patternSignatures: string[] = [];

  for (const q of questions) {
    // Build section
    if (!sections[q.section_label]) {
      sections[q.section_label] = {
        label: q.section_label,
        questionCount: 0,
        totalPoints: 0,
        topics: [],
        avgDifficulty: 0,
      };
    }
    const sec = sections[q.section_label];
    sec.questionCount++;
    sec.totalPoints += q.points || 0;

    // Topics
    const type = q.type || "unclassified";
    topicCoverage[type] = (topicCoverage[type] || 0) + 1;
    if (!sec.topics.includes(type)) sec.topics.push(type);

    // Difficulty
    const diff = q.difficulty || "medium";
    difficultyDistribution[diff] = (difficultyDistribution[diff] || 0) + 1;
    const diffNum = diff === "easy" ? 1 : diff === "medium" ? 3 : 5;
    sec.avgDifficulty = (sec.avgDifficulty * (sec.questionCount - 1) + diffNum) / sec.questionCount;

    // Score analysis
    const params = detectScoringParams(q.text, type);
    const fullParams: ExerciseScoringParams = {
      difficulty: params.difficulty || 2,
      cognitiveLevel: params.cognitiveLevel || "apply",
      bloomLevel: 3,
      conceptCount: params.conceptCount || 1,
      stepCount: params.stepCount || 2,
      estimatedTimeMin: params.estimatedTimeMin || 5,
      hasSubQuestions: params.hasSubQuestions || false,
      requiresProof: params.requiresProof || false,
      requiresGraph: params.requiresGraph || false,
      requiresConstruction: params.requiresConstruction || false,
      domain: type,
      subdomain: "",
    };
    const baseScore = computeBaseScore(fullParams);
    const category = categorizeForExam(fullParams);

    exerciseScores.push({
      text: q.text.slice(0, 100),
      params,
      baseScore,
      category: category.section,
    });

    // Generate pattern signature
    const sig = `${type}:${params.cognitiveLevel}:d${params.difficulty}`;
    if (!patternSignatures.includes(sig)) patternSignatures.push(sig);
  }

  const totalPoints = Object.values(sections).reduce((s, sec) => s + sec.totalPoints, 0);

  return {
    uploadId,
    sections: Object.values(sections),
    totalPoints,
    topicCoverage,
    difficultyDistribution,
    exerciseScores,
    patternSignatures,
    grade,
    format,
  };
}

// Merge multiple upload analyses into a single blueprint
export function buildBlueprint(analyses: UploadAnalysis[], format: ExamFormat, grade: string): ExamBlueprint {
  const totalExams = analyses.length;
  if (totalExams === 0) {
    return {
      format, grade,
      totalPoints: 20,
      duration: format === "bac" ? 180 : format === "bem" ? 120 : 60,
      sectionStructure: [],
      topicDistribution: {},
      difficultyProfile: { easy: 33, medium: 34, hard: 33 },
      progressionStyle: "linear",
      averageExercisePoints: 4,
      extractedFromCount: 0,
    };
  }

  // Average total points
  const avgTotalPoints = Math.round(analyses.reduce((s, a) => s + a.totalPoints, 0) / totalExams);

  // Merge topic distribution
  const topicCounts: Record<string, number> = {};
  let totalQuestions = 0;
  analyses.forEach(a => {
    Object.entries(a.topicCoverage).forEach(([t, c]) => {
      topicCounts[t] = (topicCounts[t] || 0) + c;
      totalQuestions += c;
    });
  });
  const topicDistribution: Record<string, number> = {};
  Object.entries(topicCounts).forEach(([t, c]) => {
    topicDistribution[t] = Math.round((c / totalQuestions) * 100);
  });

  // Difficulty profile
  const diffTotals = { easy: 0, medium: 0, hard: 0 };
  analyses.forEach(a => {
    diffTotals.easy += a.difficultyDistribution.easy || 0;
    diffTotals.medium += a.difficultyDistribution.medium || 0;
    diffTotals.hard += a.difficultyDistribution.hard || 0;
  });
  const diffTotal = diffTotals.easy + diffTotals.medium + diffTotals.hard || 1;
  const difficultyProfile = {
    easy: Math.round((diffTotals.easy / diffTotal) * 100),
    medium: Math.round((diffTotals.medium / diffTotal) * 100),
    hard: Math.round((diffTotals.hard / diffTotal) * 100),
  };

  // Section structure (merge by position)
  const sectionMap: Record<string, BlueprintSection & { count: number }> = {};
  analyses.forEach(a => {
    a.sections.forEach((sec, i) => {
      const key = sec.label || `section_${i}`;
      if (!sectionMap[key]) {
        sectionMap[key] = {
          title: key,
          titleAr: sec.label,
          averagePoints: 0,
          topicPreference: [],
          difficultyRange: [1, 5],
          exerciseCount: 0,
          cognitiveLevel: "apply",
          count: 0,
        };
      }
      const s = sectionMap[key];
      s.averagePoints = (s.averagePoints * s.count + sec.totalPoints) / (s.count + 1);
      s.exerciseCount = Math.max(s.exerciseCount, sec.questionCount);
      sec.topics.forEach(t => { if (!s.topicPreference.includes(t)) s.topicPreference.push(t); });
      s.difficultyRange = [
        Math.min(s.difficultyRange[0], Math.round(sec.avgDifficulty)),
        Math.max(s.difficultyRange[1], Math.round(sec.avgDifficulty)),
      ];
      s.count++;
    });
  });

  const sectionStructure: BlueprintSection[] = Object.values(sectionMap).map(s => ({
    title: s.title,
    titleAr: s.titleAr,
    averagePoints: Math.round(s.averagePoints * 2) / 2,
    topicPreference: s.topicPreference,
    difficultyRange: s.difficultyRange,
    exerciseCount: s.exerciseCount,
    cognitiveLevel: s.cognitiveLevel,
  }));

  // Detect progression style
  const categorySequence = analyses.flatMap(a => a.exerciseScores.map(e => e.category));
  const firstHalf = categorySequence.slice(0, Math.floor(categorySequence.length / 2));
  const secondHalf = categorySequence.slice(Math.floor(categorySequence.length / 2));
  const warmupFirst = firstHalf.filter(c => c === "warmup").length;
  const challengeLast = secondHalf.filter(c => c === "challenge" || c === "problem").length;
  const progressionStyle = (warmupFirst > firstHalf.length * 0.4 && challengeLast > secondHalf.length * 0.3)
    ? "warmup_to_hard" : "mixed";

  const avgExercisePoints = totalQuestions > 0 ? Math.round((avgTotalPoints / (totalQuestions / totalExams)) * 2) / 2 : 4;

  return {
    format, grade,
    totalPoints: avgTotalPoints,
    duration: format === "bac" ? 180 : format === "bem" ? 120 : 60,
    sectionStructure,
    topicDistribution,
    difficultyProfile,
    progressionStyle,
    averageExercisePoints: avgExercisePoints,
    extractedFromCount: totalExams,
  };
}

// Score label for display
export const PROGRESSION_LABELS_AR: Record<string, string> = {
  linear: "خطي — نفس الصعوبة",
  mixed: "مختلط — صعوبات متنوعة",
  warmup_to_hard: "تصاعدي — من السهل للصعب",
};
