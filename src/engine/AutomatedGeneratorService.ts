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
 * Assembles a real multi-section paper from kb_exercises + exam_kb_questions
 * filtered by grade and country, picking diverse types and respecting
 * the section blueprint and difficulty/Bloom progression.
 */
export async function generateKBOnlyExam(
  template: ExamTemplate,
  grade: string,
  country: string = "DZ",
): Promise<GenerationResult> {
  // 1. Pull a deep, country-scoped pool from BOTH KB tables
  const [{ data: kbEx }, { data: kbQs }] = await Promise.all([
    supabase
      .from("kb_exercises")
      .select("id, text, type, difficulty, bloom_level, grade, country_code, scoring_params, base_score")
      .or(`grade.eq.${grade},grade.ilike.%${grade}%`)
      .eq("country_code", country)
      .limit(400),
    supabase
      .from("exam_kb_questions")
      .select("id, text, type, difficulty, bloom_level, points, section_label, concepts")
      .ilike("section_label", "%")
      .limit(400),
  ]);

  type Pooled = {
    id: string;
    text: string;
    type: string;
    difficulty: number;
    bloomLevel: number;
    points: number;
    sectionLabel?: string;
    concepts?: string[];
  };

  const pool: Pooled[] = [];
  for (const e of (kbEx ?? [])) {
    pool.push({
      id: String(e.id),
      text: String(e.text ?? "").trim(),
      type: String(e.type ?? "unclassified"),
      difficulty: Number(e.difficulty ?? 2),
      bloomLevel: Number(e.bloom_level ?? 3),
      points: Number(e.base_score ?? 2),
      concepts: [],
    });
  }
  for (const q of (kbQs ?? [])) {
    pool.push({
      id: String(q.id),
      text: String(q.text ?? "").trim(),
      type: String(q.type ?? "unclassified"),
      difficulty: q.difficulty === "hard" ? 4 : q.difficulty === "easy" ? 1 : 2,
      bloomLevel: Number(q.bloom_level ?? 3),
      points: Number(q.points ?? 2),
      sectionLabel: q.section_label ?? undefined,
      concepts: Array.isArray(q.concepts) ? q.concepts as string[] : [],
    });
  }

  // De-dup by text and drop empties
  const seen = new Set<string>();
  const cleaned = pool.filter((p) => {
    if (!p.text || p.text.length < 30) return false;
    const k = p.text.slice(0, 80);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // 2. Match each blueprint section to the best candidates by topic hint
  const sections: ExamSection[] = [];
  const usedIds = new Set<string>();

  for (const st of template.sections) {
    const titleHint = st.titleAr.toLowerCase();
    // Heuristic topic keywords
    const wantKeywords: string[] = [];
    if (/متتالي|sequence/.test(titleHint)) wantKeywords.push("sequence", "متتالي", "u_n");
    if (/دال|function/.test(titleHint)) wantKeywords.push("function", "دال", "f(x)", "مشتق");
    if (/هندس|geometry/.test(titleHint)) wantKeywords.push("triangle", "مثلث", "دائرة", "geometry");
    if (/جبر|algebra|معادل/.test(titleHint)) wantKeywords.push("equation", "معادل", "نشر", "تحليل");
    if (/إحصاء|statistic|احتمال|probabil/.test(titleHint)) wantKeywords.push("احتمال", "probability", "إحصاء", "statistics");
    if (/إدماج|integ|problème/.test(titleHint)) wantKeywords.push("وضعية", "تطبيق");
    if (/حساب|عددي|number/.test(titleHint)) wantKeywords.push("جذر", "كسر", "PGCD", "عددي");

    const candidates = cleaned
      .filter((p) => !usedIds.has(p.id))
      .map((p) => {
        const txt = p.text.toLowerCase();
        let score = 0;
        for (const kw of wantKeywords) if (txt.includes(kw.toLowerCase())) score += 5;
        if (p.sectionLabel && titleHint.includes(p.sectionLabel.toLowerCase().slice(0, 6))) score += 3;
        // Reward matching difficulty progression: later sections want higher Bloom
        const sectionIndex = template.sections.indexOf(st);
        const progress = sectionIndex / Math.max(1, template.sections.length - 1);
        const idealBloom = 2.5 + progress * 2.5; // 2.5 → 5
        score += 3 - Math.abs(p.bloomLevel - idealBloom);
        return { p, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    // Aim for 1-2 exercises per section depending on point budget
    const exercisesPerSection = st.points >= 6 ? 2 : 1;
    const picked = candidates.slice(0, exercisesPerSection);

    const exercises: ExamExercise[] = picked.map(({ p }, i) => {
      usedIds.add(p.id);
      return {
        id: p.id,
        sectionId: st.id,
        text: p.text,
        points: Math.max(1, Math.round(st.points / picked.length)),
        type: (p.type as any) || "algebra",
        grade,
        source: "kb",
        bloomLevel: p.bloomLevel,
      } as ExamExercise & { bloomLevel?: number };
    });

    sections.push({
      id: st.id,
      title: st.titleAr,
      points: st.points,
      exercises,
    });
  }

  const totalExercises = sections.reduce((s, x) => s + x.exercises.length, 0);
  const avgBloom = totalExercises
    ? sections.flatMap((s) => s.exercises).reduce((a, e) => a + ((e as any).bloomLevel || 3), 0) / totalExercises
    : 3;

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
    metrics: {
      authenticity: 100,
      originality: 0,
      pedagogicalMatch: Math.min(100, Math.round((totalExercises / template.sections.length) * 50 + (avgBloom - 2) * 15)),
    },
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
