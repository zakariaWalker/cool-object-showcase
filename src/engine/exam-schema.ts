// ===== Exam JSON Import Schema =====
// This file defines the canonical JSON schema for importing exams into the Exam KB.
// Use this as reference when preparing JSON files for bulk or single exam upload.

import { z } from "zod";

// ─── Question Schema ──────────────────────────────────────────────────────────

export const ExamQuestionSchema = z.object({
  /** Section label, e.g. "التمرين الأول", "المسألة", "Exercise 1" */
  sectionLabel: z.string().min(1, "Section label is required"),
  
  /** Question number within the exam (1-based) */
  questionNumber: z.number().int().min(1),
  
  /** Sub-question label if any, e.g. "أ", "ب", "1)", "a)" */
  subQuestion: z.string().optional(),
  
  /** Full question text (may include LaTeX) */
  text: z.string().min(1, "Question text is required"),
  
  /** Points allocated to this question */
  points: z.number().min(0).default(1),
  
  /** Question type/topic classification */
  type: z.string().default("unclassified"),
  
  /** Difficulty level */
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
  
  /** Bloom's taxonomy cognitive level */
  cognitiveLevel: z.enum([
    "remember", "understand", "apply", "analyze", "evaluate", "create"
  ]).default("apply"),
  
  /** Bloom level (1-6) */
  bloomLevel: z.number().int().min(1).max(6).default(3),
  
  /** Estimated time in minutes */
  estimatedTimeMin: z.number().min(0).default(5),
  
  /** Number of solution steps */
  stepCount: z.number().int().min(0).default(2),
  
  /** Number of concepts involved */
  conceptCount: z.number().int().min(0).default(1),
  
  /** List of mathematical concepts tested */
  concepts: z.array(z.string()).default([]),
  
  /** IDs of linked KB patterns (optional, can be linked later) */
  linkedPatternIds: z.array(z.string()).default([]),
  
  /** IDs of linked KB exercises (optional, can be linked later) */
  linkedExerciseIds: z.array(z.string()).default([]),
});

// ─── Single Exam Schema ───────────────────────────────────────────────────────

export const ExamSchema = z.object({
  /** Exam year, e.g. "2024" */
  year: z.string().min(4, "Year is required (e.g. 2024)"),
  
  /** Session: juin (normal), septembre (catch-up), remplacement */
  session: z.enum(["juin", "septembre", "remplacement"]).default("juin"),
  
  /** Exam format */
  format: z.enum(["bem", "bac", "regular", "devoir"]).default("bem"),
  
  /** Grade level, e.g. "middle_4", "secondary_3" */
  grade: z.string().min(1, "Grade is required"),
  
  /** Stream for BAC exams (optional) */
  stream: z.string().optional(),
  
  /** List of questions in this exam */
  questions: z.array(ExamQuestionSchema).min(1, "At least one question is required"),
});

// ─── Bulk Import Schema (array of exams) ──────────────────────────────────────

export const ExamBulkImportSchema = z.union([
  ExamSchema,                    // Single exam
  z.array(ExamSchema).min(1),   // Array of exams
]);

// ─── TypeScript types derived from schema ─────────────────────────────────────

export type ExamQuestionInput = z.infer<typeof ExamQuestionSchema>;
export type ExamInput = z.infer<typeof ExamSchema>;
export type ExamBulkImport = z.infer<typeof ExamBulkImportSchema>;

// ─── Example JSON for documentation ──────────────────────────────────────────

export const EXAM_JSON_EXAMPLE: ExamInput = {
  year: "2024",
  session: "juin",
  format: "bem",
  grade: "middle_4",
  questions: [
    {
      sectionLabel: "التمرين الأول",
      questionNumber: 1,
      text: "أحسب القيمة التالية: \\( 3^2 + 4^2 \\)",
      points: 4,
      type: "arithmetic",
      difficulty: "easy",
      cognitiveLevel: "apply",
      bloomLevel: 3,
      estimatedTimeMin: 5,
      stepCount: 2,
      conceptCount: 1,
      concepts: ["الحساب", "القوى"],
      linkedPatternIds: [],
      linkedExerciseIds: [],
    },
    {
      sectionLabel: "التمرين الثاني",
      questionNumber: 2,
      text: "حل المعادلة: \\( 2x + 5 = 13 \\)",
      points: 4,
      type: "equation",
      difficulty: "medium",
      cognitiveLevel: "apply",
      bloomLevel: 3,
      estimatedTimeMin: 8,
      stepCount: 3,
      conceptCount: 2,
      concepts: ["المعادلات", "الجبر"],
      linkedPatternIds: [],
      linkedExerciseIds: [],
    },
  ],
};

export const EXAM_BULK_EXAMPLE: ExamInput[] = [
  EXAM_JSON_EXAMPLE,
  {
    year: "2023",
    session: "juin",
    format: "bac",
    grade: "secondary_3",
    stream: "sciences",
    questions: [
      {
        sectionLabel: "التمرين الأول",
        questionNumber: 1,
        text: "ادرس تغيرات الدالة \\( f(x) = x^3 - 3x \\)",
        points: 6,
        type: "analysis",
        difficulty: "hard",
        cognitiveLevel: "analyze",
        bloomLevel: 4,
        estimatedTimeMin: 15,
        stepCount: 5,
        conceptCount: 3,
        concepts: ["الدوال", "الاشتقاق", "جدول التغيرات"],
        linkedPatternIds: [],
        linkedExerciseIds: [],
      },
    ],
  },
];
