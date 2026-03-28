import { supabase } from "@/integrations/supabase/client";
import { 
  Exam, 
  ExamSection, 
  ExamExercise, 
  ExamTemplate, 
  ExamStructuralPattern, 
  ExamStyleProfile,
  generateExamId
} from "./exam-types";

export interface GenerationResult {
  engine: "kb_only" | "ai_only" | "hybrid";
  exam: Exam;
  metrics: {
    authenticity: number; // 0-100
    originality: number;  // 0-100
    pedagogicalMatch: number; // 0-100
  };
}

/**
 * Engine 1: KB-Only (Deterministic)
 * Finds the best existing questions from the database.
 */
export async function generateKBOnlyExam(
  template: ExamTemplate, 
  grade: string
): Promise<GenerationResult> {
  const sections: ExamSection[] = [];
  
  for (const st of template.sections) {
    // Query KB for matching section/grade
    const { data: questions } = await supabase
      .from("exam_kb_questions")
      .select("*")
      .eq("grade", grade)
      .ilike("section_label", `%${st.titleAr}%`)
      .limit(3) as any;

    const exercises: ExamExercise[] = (questions || []).map((q: any) => ({
      id: q.id,
      sectionId: st.id,
      text: q.text,
      points: q.points || st.points,
      type: q.type || "algebra",
      grade: q.grade,
      source: "kb"
    }));

    sections.push({
      id: st.id,
      title: st.titleAr,
      points: st.points,
      exercises: exercises.slice(0, 1) // Pick the best match
    });
  }

  const exam: Exam = {
    id: generateExamId(),
    title: `[KB] ${template.labelAr}`,
    format: template.format,
    grade,
    duration: template.duration,
    totalPoints: template.totalPoints,
    sections,
    createdAt: new Date().toISOString(),
    status: "draft",
  };

  return {
    engine: "kb_only",
    exam,
    metrics: { authenticity: 100, originality: 0, pedagogicalMatch: 75 }
  };
}

/**
 * Engine 2: AI-Only (Generative)
 * Generates 100% new content via Supabase Edge Function.
 */
export async function generateAIOnlyExam(
  template: ExamTemplate,
  grade: string,
  patterns?: ExamStructuralPattern,
  style?: ExamStyleProfile
): Promise<GenerationResult> {
  const { data, error } = await supabase.functions.invoke("generate-automated-exam", {
    body: {
      mode: "synthetic",
      template,
      grade,
      patterns,
      style
    }
  });

  if (error) throw error;

  return {
    engine: "ai_only",
    exam: data.exam,
    metrics: { authenticity: 60, originality: 100, pedagogicalMatch: 95 }
  };
}

/**
 * Engine 3: Hybrid (Blend)
 * Takes KB questions and refines them via AI.
 */
export async function generateHybridExam(
  template: ExamTemplate,
  grade: string,
  patterns?: ExamStructuralPattern
): Promise<GenerationResult> {
  // 1. Get KB baseline
  const kbResult = await generateKBOnlyExam(template, grade);
  
  // 2. Refine via AI
  const { data, error } = await supabase.functions.invoke("generate-automated-exam", {
    body: {
      mode: "hybrid",
      template,
      grade,
      kbExam: kbResult.exam,
      patterns
    }
  });

  if (error) throw error;

  return {
    engine: "hybrid",
    exam: data.exam,
    metrics: { authenticity: 85, originality: 70, pedagogicalMatch: 98 }
  };
}
