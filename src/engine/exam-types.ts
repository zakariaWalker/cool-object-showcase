// ===== Exam Builder & Corrector — Type Definitions =====

export type ExamFormat = "bem" | "bac" | "regular";
export type ExamDifficulty = "easy" | "medium" | "hard" | "mixed";

export type CognitiveLevel =
  | "remember" // التذكر — recall facts/formulas
  | "understand" // الفهم — explain, interpret
  | "apply" // التطبيق — use formula in standard context
  | "analyze" // التحليل — break down, compare
  | "evaluate" // التقييم — justify, critique
  | "create"; // الإبداع — design, prove, construct

export interface ExerciseScoringParams {
  difficulty: number; // 1-5
  cognitiveLevel: CognitiveLevel;
  bloomLevel: number; // 1-6
  conceptCount: number; // how many concepts involved
  stepCount: number; // estimated steps to solve
  estimatedTimeMin: number; // time in minutes
  hasSubQuestions: boolean;
  requiresProof: boolean;
  requiresGraph: boolean;
  requiresConstruction: boolean;
  domain: string;
  subdomain: string;
}

export const COGNITIVE_LABELS_AR: Record<CognitiveLevel, string> = {
  remember: "تذكر",
  understand: "فهم",
  apply: "تطبيق",
  analyze: "تحليل",
  evaluate: "تقييم",
  create: "إبداع",
};

export interface ExamTemplate {
  id: string;
  format: ExamFormat;
  label: string;
  labelAr: string;
  description: string;
  totalPoints: number;
  duration: number; // minutes
  sections: ExamSectionTemplate[];
}

export interface ExamSectionTemplate {
  id: string;
  title: string;
  titleAr: string;
  points: number;
  exerciseCount: number;
  allowedTypes?: string[];
}

export interface ExamTable {
  headers?: string[] | null;
  rows: string[][];
  borders?: "all" | "outer" | "none";
}

export interface ExamFigure {
  description: string;
  imageUrl?: string;
  position?: "left" | "right" | "center";
}

export type ExerciseLayout =
  | "default"
  | "table_only"
  | "figure_left_table_right"
  | "figure_right_table_left"
  | "inline_list";

export type AnswerSpaceKind = "lines" | "box" | "short" | "table" | "none";

export interface ExamSubQuestion {
  id: string;
  text: string;
  points: number;
  answerSpace?: AnswerSpaceKind;
  answerLines?: number;
}

export interface ExamExercise {
  id: string;
  sectionId: string;
  text: string;
  points: number;
  type: string;
  grade: string;
  subQuestions?: ExamSubQuestion[];
  tables?: ExamTable[];
  figures?: ExamFigure[];
  answerSpace?: AnswerSpaceKind;
  answerLines?: number;
  solution?: string;
  source?: "kb" | "manual" | "ai";
}

export interface ExamStyleProfile {
  typography: {
    math: "serif" | "sans";
    text: "serif" | "sans";
    hierarchy: "high" | "balanced";
  };
  layout: {
    columns: 1 | 2;
    spacing: "compact" | "normal" | "wide";
    exerciseBorder: boolean;
  };
  typographyNotes?: string;
}

export interface ExamStructuralPattern {
  difficultyCurve: "linear" | "stepped" | "u-shaped";
  explicitImplicitRatio: number;
  targetDifficultyDist?: { easy: number; medium: number; hard: number };
  requiredCognitiveLevels?: CognitiveLevel[];
  expectedDomains?: string[];
  structuralNotes?: string;
}

export interface Exam {
  id: string;
  title: string;
  format: ExamFormat;
  grade: string;
  duration: number;
  totalPoints: number;
  sections: ExamSection[];
  createdAt: string;
  status: "draft" | "ready" | "published";
  styleProfile?: ExamStyleProfile;
  structuralPatterns?: ExamStructuralPattern;
  metadata?: {
    school?: string;
    teacher?: string;
    semester?: string;
    year?: string;
  };
  version?: number;
}

export interface ExamSection {
  id: string;
  title: string;
  points: number;
  exercises: ExamExercise[];
}

// Correction types
export interface StudentAnswer {
  exerciseId: string;
  subQuestionId?: string;
  answer: string;
  imageUrl?: string;
}

export interface CorrectionResult {
  exerciseId: string;
  subQuestionId?: string;
  score: number;
  maxScore: number;
  feedback: string;
  feedbackAr: string;
  steps: CorrectionStep[];
  isCorrect: boolean;
  partialCredit: boolean;
  correctedBy: "ai" | "teacher";
  teacherOverride?: boolean;
}

export interface CorrectionStep {
  description: string;
  expected: string;
  studentAnswer: string;
  isCorrect: boolean;
  pointsAwarded: number;
  pointsPossible: number;
}

export interface ExamCorrection {
  id: string;
  examId: string;
  studentName: string;
  answers: StudentAnswer[];
  results: CorrectionResult[];
  totalScore: number;
  totalPossible: number;
  percentage: number;
  grade: string;
  correctedAt: string;
  status: "pending" | "ai_corrected" | "teacher_reviewed" | "final";
}

// ── Official Templates ──

export const BEM_TEMPLATE: ExamTemplate = {
  id: "bem",
  format: "bem",
  label: "BEM Exam",
  labelAr: "امتحان شهادة التعليم المتوسط",
  description: "الصيغة الرسمية: 4 تمارين + مسألة، المدة ساعتان، /20",
  totalPoints: 20,
  duration: 120,
  sections: [
    {
      id: "ex1",
      title: "Exercise 1",
      titleAr: "التمرين الأول",
      points: 4,
      exerciseCount: 1,
      allowedTypes: ["arithmetic", "algebra", "number_sets"],
    },
    {
      id: "ex2",
      title: "Exercise 2",
      titleAr: "التمرين الثاني",
      points: 4,
      exerciseCount: 1,
      allowedTypes: ["equations", "fractions", "proportionality"],
    },
    {
      id: "ex3",
      title: "Exercise 3",
      titleAr: "التمرين الثالث",
      points: 4,
      exerciseCount: 1,
      allowedTypes: ["geometry_construction", "angles", "parallelogram", "triangle_circle"],
    },
    {
      id: "ex4",
      title: "Exercise 4",
      titleAr: "التمرين الرابع",
      points: 4,
      exerciseCount: 1,
      allowedTypes: ["statistics", "probability"],
    },
    { id: "problem", title: "Problem", titleAr: "المسألة", points: 4, exerciseCount: 1 },
  ],
};

export const BAC_TEMPLATE: ExamTemplate = {
  id: "bac",
  format: "bac",
  label: "BAC Exam",
  labelAr: "امتحان شهادة البكالوريا",
  description: "الصيغة الرسمية: 4 تمارين + مسألة، المدة 3 ساعات، /20",
  totalPoints: 20,
  duration: 180,
  sections: [
    {
      id: "ex1",
      title: "Exercise 1",
      titleAr: "التمرين الأول",
      points: 4,
      exerciseCount: 1,
      allowedTypes: ["sequences", "calculus", "advanced_algebra"],
    },
    {
      id: "ex2",
      title: "Exercise 2",
      titleAr: "التمرين الثاني",
      points: 4,
      exerciseCount: 1,
      allowedTypes: ["functions", "calculus"],
    },
    {
      id: "ex3",
      title: "Exercise 3",
      titleAr: "التمرين الثالث",
      points: 3,
      exerciseCount: 1,
      allowedTypes: ["probability", "statistics"],
    },
    {
      id: "ex4",
      title: "Exercise 4",
      titleAr: "التمرين الرابع",
      points: 3,
      exerciseCount: 1,
      allowedTypes: ["analytic_geometry", "trigonometry"],
    },
    {
      id: "problem",
      title: "Problem",
      titleAr: "المسألة",
      points: 6,
      exerciseCount: 1,
      allowedTypes: ["functions", "calculus", "sequences"],
    },
  ],
};

export const REGULAR_TEMPLATE: ExamTemplate = {
  id: "regular",
  format: "regular",
  label: "Regular Exam",
  labelAr: "فرض / اختبار عادي",
  description: "صيغة مرنة: حدد عدد التمارين والنقاط بحرية",
  totalPoints: 20,
  duration: 60,
  sections: [
    { id: "ex1", title: "Exercise 1", titleAr: "التمرين الأول", points: 5, exerciseCount: 1 },
    { id: "ex2", title: "Exercise 2", titleAr: "التمرين الثاني", points: 5, exerciseCount: 1 },
    { id: "ex3", title: "Exercise 3", titleAr: "التمرين الثالث", points: 5, exerciseCount: 1 },
    { id: "ex4", title: "Exercise 4", titleAr: "التمرين الرابع", points: 5, exerciseCount: 1 },
  ],
};

export const ALL_TEMPLATES = [BEM_TEMPLATE, BAC_TEMPLATE, REGULAR_TEMPLATE];

export const GRADE_OPTIONS = [
  { value: "1AM", label: "1AM — أولى متوسط" },
  { value: "2AM", label: "2AM — ثانية متوسط" },
  { value: "3AM", label: "3AM — ثالثة متوسط" },
  { value: "4AM", label: "4AM — رابعة متوسط" },
  { value: "1AS", label: "1AS — أولى ثانوي" },
  { value: "2AS", label: "2AS — ثانية ثانوي" },
  { value: "3AS", label: "3AS — ثالثة ثانوي" },
];

export const TYPE_LABELS_AR: Record<string, string> = {
  arithmetic: "حساب",
  algebra: "جبر",
  fractions: "كسور",
  equations: "معادلات",
  geometry_construction: "إنشاءات هندسية",
  statistics: "إحصاء",
  probability: "احتمالات",
  functions: "دوال",
  trigonometry: "مثلثات",
  sequences: "متتاليات",
  calculus: "تحليل",
  systems: "جمل معادلات",
  proportionality: "تناسبية",
  transformations: "تحويلات",
  solids: "مجسمات",
  triangle_circle: "مثلث ودائرة",
  parallelogram: "متوازي أضلاع",
  angles: "زوايا",
  number_sets: "مجموعات أعداد",
  advanced_algebra: "جبر متقدم",
  prove: "برهان",
  bac_prep: "تحضير BAC",
  factor: "تحليل عوامل",
  solve_equation: "حل معادلات",
  analytic_geometry: "هندسة تحليلية",
  unclassified: "غير مصنف",
  other: "أخرى",
};

// Grading scale
export function getGradeLetter(percentage: number): string {
  if (percentage >= 90) return "ممتاز";
  if (percentage >= 80) return "جيد جداً";
  if (percentage >= 70) return "جيد";
  if (percentage >= 60) return "مقبول";
  if (percentage >= 50) return "ضعيف";
  return "راسب";
}

export function generateExamId(): string {
  return `exam_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function generateSectionId(): string {
  return `sec_${Math.random().toString(36).slice(2, 8)}`;
}
