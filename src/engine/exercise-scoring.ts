import { CognitiveLevel, ExerciseScoringParams, ExamSection, ExamStructuralPattern, COGNITIVE_LABELS_AR } from "./exam-types";
export type { CognitiveLevel, ExerciseScoringParams };

export { COGNITIVE_LABELS_AR };

export const BLOOM_WEIGHTS: Record<CognitiveLevel, number> = {
  remember: 1,
  understand: 1.5,
  apply: 2,
  analyze: 2.5,
  evaluate: 3,
  create: 3.5,
};

// Compute a base score (0-8 scale) for an exercise
export function computeBaseScore(params: ExerciseScoringParams): number {
  const bloomWeight = BLOOM_WEIGHTS[params.cognitiveLevel] || 2;
  const difficultyFactor = params.difficulty / 5;
  const complexityFactor = Math.min(
    (params.conceptCount * 0.3) + (params.stepCount * 0.2) + (params.estimatedTimeMin * 0.05),
    3
  );
  
  let bonus = 0;
  if (params.requiresProof) bonus += 0.5;
  if (params.requiresGraph) bonus += 0.3;
  if (params.requiresConstruction) bonus += 0.3;
  if (params.hasSubQuestions) bonus += 0.2;

  const raw = bloomWeight * (0.5 + difficultyFactor) + complexityFactor + bonus;
  return Math.round(Math.min(Math.max(raw, 1), 8) * 2) / 2; // round to nearest 0.5
}

// Suggest point allocation for an exercise in context of an exam
export function suggestPoints(params: ExerciseScoringParams, totalExamPoints: number, exerciseCount: number): number {
  const baseScore = computeBaseScore(params);
  const averagePerExercise = totalExamPoints / exerciseCount;
  
  // Scale base score relative to average
  const ratio = baseScore / 4; // normalize around midpoint
  const suggested = averagePerExercise * ratio;
  
  return Math.round(Math.max(suggested, 0.5) * 2) / 2; // round to 0.5
}

// Auto-detect scoring parameters from exercise text
export function detectScoringParams(text: string, domain: string = ""): Partial<ExerciseScoringParams> {
  const lower = text.toLowerCase();
  const params: Partial<ExerciseScoringParams> = {
    domain,
    hasSubQuestions: false,
    requiresProof: false,
    requiresGraph: false,
    requiresConstruction: false,
    cognitiveLevel: "apply",
    conceptCount: 1,
    stepCount: 2,
    estimatedTimeMin: 5,
    difficulty: 2,
  };

  // Detect sub-questions
  const subQMatches = text.match(/[١٢٣٤٥٦٧٨٩0-9]+\s*[\)\.]/g);
  if (subQMatches && subQMatches.length > 1) {
    params.hasSubQuestions = true;
    params.stepCount = subQMatches.length * 2;
    params.estimatedTimeMin = subQMatches.length * 3;
  }

  // Detect proof requirements
  if (/اثبت|برهن|أثبت|بيّن أن|بين أن|اثبات|proof|prove/i.test(text)) {
    params.requiresProof = true;
    params.cognitiveLevel = "evaluate";
    params.difficulty = Math.max(params.difficulty || 2, 4);
  }

  // Detect graph requirements
  if (/ارسم|مثّل بيانياً|التمثيل البياني|منحنى|الرسم البياني|graph|plot/i.test(text)) {
    params.requiresGraph = true;
    params.estimatedTimeMin = (params.estimatedTimeMin || 5) + 3;
  }

  // Detect construction
  if (/أنشئ|ارسم|construction|إنشاء هندسي/i.test(text)) {
    params.requiresConstruction = true;
  }

  // Detect cognitive level from keywords
  if (/عرّف|ذكّر|ما هو|ما هي|عدّد|define|recall/i.test(text)) {
    params.cognitiveLevel = "remember";
    params.difficulty = 1;
  } else if (/فسّر|اشرح|وضّح|explain|interpret/i.test(text)) {
    params.cognitiveLevel = "understand";
    params.difficulty = 2;
  } else if (/حل|أحسب|جد|عين|أوجد|compute|solve|find|calculate/i.test(text)) {
    params.cognitiveLevel = "apply";
    params.difficulty = Math.max(params.difficulty || 2, 2);
  } else if (/قارن|حلل|ادرس|study|analyze|compare/i.test(text)) {
    params.cognitiveLevel = "analyze";
    params.difficulty = Math.max(params.difficulty || 2, 3);
  }

  // Count distinct mathematical concepts (rough heuristic)
  const conceptKeywords = [
    "معادلة", "متراجحة", "دالة", "مشتقة", "تكامل", "متتالية", "احتمال",
    "مثلث", "دائرة", "مستقيم", "متوازي", "زاوية", "مساحة", "محيط",
    "كسر", "نسبة", "تناسب", "جداء", "حاصل", "قسمة",
    "equation", "function", "derivative", "integral", "probability",
  ];
  const matchedConcepts = conceptKeywords.filter(k => text.includes(k));
  params.conceptCount = Math.max(matchedConcepts.length, 1);

  // Estimate difficulty from length and complexity
  if (text.length > 500) params.difficulty = Math.max(params.difficulty || 2, 3);
  if (text.length > 800) params.difficulty = Math.max(params.difficulty || 2, 4);

  return params;
}

// Categorize exercise for exam placement
export interface ExerciseCategory {
  section: "warmup" | "core" | "challenge" | "problem";
  sectionLabelAr: string;
  suggestedPoints: number;
  reasoning: string;
}

export function categorizeForExam(params: ExerciseScoringParams): ExerciseCategory {
  const baseScore = computeBaseScore(params);
  
  if (baseScore <= 2 || params.cognitiveLevel === "remember" || params.cognitiveLevel === "understand") {
    return {
      section: "warmup",
      sectionLabelAr: "تمارين تمهيدية",
      suggestedPoints: Math.max(baseScore, 1),
      reasoning: `مستوى ${COGNITIVE_LABELS_AR[params.cognitiveLevel]} — مناسب للبداية`,
    };
  }
  
  if (baseScore <= 4 || params.cognitiveLevel === "apply") {
    return {
      section: "core",
      sectionLabelAr: "تمارين أساسية",
      suggestedPoints: baseScore,
      reasoning: `تطبيق مباشر — يغطي ${params.conceptCount} مفهوم`,
    };
  }
  
  if (params.requiresProof || params.cognitiveLevel === "create" || baseScore >= 6) {
    return {
      section: "problem",
      sectionLabelAr: "المسألة",
      suggestedPoints: Math.max(baseScore, 4),
      reasoning: `مسألة مركبة — ${params.stepCount} خطوات، يتطلب ${COGNITIVE_LABELS_AR[params.cognitiveLevel]}`,
    };
  }
  
  return {
    section: "challenge",
    sectionLabelAr: "تمارين متقدمة",
    suggestedPoints: baseScore,
    reasoning: `تحليل/تقييم — صعوبة ${params.difficulty}/5`,
  };
}

// ── Exercise Benchmarking ──

export interface ExerciseBenchmark {
  topic: string;
  format: "official" | "regular";
  avgDifficulty: number;
  avgBloom: number;
  avgConcepts: number;
  avgSteps: number;
  avgTime: number;
  requiresProofPct: number;
}

/**
 * Computes a benchmark profile for a specific topic and format based on KB data
 */
export function computeExerciseBenchmark(
  topic: string,
  format: "official" | "regular",
  allQuestions: any[],
  exams: any[]
): ExerciseBenchmark {
  const filteredEx = allQuestions.filter(q => {
    const exam = exams.find(e => e.id === q.exam_id || e.id === q.examId);
    if (!exam) return false;
    const isOfficial = exam.format === "bac" || exam.format === "bem";
    const matchFormat = format === "official" ? isOfficial : !isOfficial;
    return q.type === topic && matchFormat;
  });

  if (filteredEx.length === 0) {
    // Default fallback benchmarks if no data exists
    return {
      topic,
      format,
      avgDifficulty: format === "official" ? 3.5 : 2.5,
      avgBloom: format === "official" ? 4 : 2.5,
      avgConcepts: format === "official" ? 2.5 : 1.5,
      avgSteps: format === "official" ? 5 : 3,
      avgTime: format === "official" ? 15 : 10,
      requiresProofPct: format === "official" ? 40 : 10,
    };
  }

  const count = filteredEx.length;
  return {
    topic,
    format,
    avgDifficulty: filteredEx.reduce((s, q) => s + (q.difficulty_num || q.difficulty === "hard" ? 5 : q.difficulty === "medium" ? 3 : 1), 0) / count,
    avgBloom: filteredEx.reduce((s, q) => s + (q.bloom_level || 3), 0) / count,
    avgConcepts: filteredEx.reduce((s, q) => s + (q.concepts?.length || 1), 0) / count,
    avgSteps: filteredEx.reduce((s, q) => s + (q.step_count || 3), 0) / count,
    avgTime: filteredEx.reduce((s, q) => s + (q.estimated_time_min || 10), 0) / count,
    requiresProofPct: (filteredEx.filter(q => q.requires_proof || q.text?.includes("برهن")).length / count) * 100,
  };
}

/**
 * Compares an exercise against a benchmark and returns a similarity score + insights
 */
export function compareToBenchmark(
  params: ExerciseScoringParams,
  benchmark: ExerciseBenchmark
) {
  const diffSim = 1 - Math.abs(params.difficulty - benchmark.avgDifficulty) / 5;
  const bloomSim = 1 - Math.abs(BLOOM_WEIGHTS[params.cognitiveLevel] - (benchmark.avgBloom / 2)) / 3.5;
  const conceptSim = 1 - Math.min(Math.abs(params.conceptCount - benchmark.avgConcepts) / 5, 1);
  
  const similarity = Math.round(((diffSim + bloomSim + conceptSim) / 3) * 100);
  
  const gaps: string[] = [];
  if (params.difficulty < benchmark.avgDifficulty - 1) gaps.push("أقل تعقيداً من المعتاد");
  if (BLOOM_WEIGHTS[params.cognitiveLevel] < (benchmark.avgBloom / 2) - 0.5) gaps.push("يتطلب مهارات ذهنية أدنى");
  if (benchmark.requiresProofPct > 50 && !params.requiresProof) gaps.push("يفتقر للبرهنة المطلوبة رسمياً");

  return { similarity, gaps };
}

// ── Pedagogical Gap Analysis ──

export interface PedagogicalGap {
  id: string;
  type: "imbalance" | "missing_skill" | "missing_level" | "structure";
  severity: "critical" | "warning" | "tip";
  titleAr: string;
  messageAr: string;
  actionAr: string;
}

/**
 * Compares the current built exam against the AI-learned structural pattern
 * to detect pedagogical gaps.
 */
export function detectPedagogicalGaps(
  sections: ExamSection[],
  patterns: ExamStructuralPattern
): PedagogicalGap[] {
  const gaps: PedagogicalGap[] = [];
  const exercises = sections.flatMap(s => s.exercises);
  const totalEx = exercises.length;
  
  if (totalEx === 0) return [];

  const stats = {
    hardCount: 0,
    proofCount: 0,
    cognitiveFound: new Set<CognitiveLevel>(),
    domainsFound: new Set<string>(),
  };

  exercises.forEach(ex => {
    const params = detectScoringParams(ex.text, ex.type);
    if ((params.difficulty || 0) >= 4) stats.hardCount++;
    if (params.requiresProof) stats.proofCount++;
    if (params.cognitiveLevel) stats.cognitiveFound.add(params.cognitiveLevel as CognitiveLevel);
    if (ex.type) stats.domainsFound.add(ex.type);
  });

  // 1. Difficulty Curve Gap
  if (patterns.targetDifficultyDist) {
    const hardRatio = stats.hardCount / totalEx;
    const targetHardRatio = (patterns.targetDifficultyDist.hard || 0) / 100;
    
    if (hardRatio < targetHardRatio * 0.5) {
      gaps.push({
        id: "gap_difficulty_low",
        type: "imbalance",
        severity: "warning",
        titleAr: "نقص في التحدي",
        messageAr: `يحتوي هذا النمط عادةً على ${Math.round(targetHardRatio * 100)}% تمارين صعبة، امتحانك حالياً يحتوي على ${Math.round(hardRatio * 100)}% فقط.`,
        actionAr: "أضف تمريناً بمستوى 'تحليل' أو 'تقييم' لرفع مستوى التحدي."
      });
    }
  }

  // 2. Missing Cognitive Levels
  if (patterns.requiredCognitiveLevels) {
    patterns.requiredCognitiveLevels.forEach(level => {
      if (!stats.cognitiveFound.has(level)) {
        gaps.push({
          id: `gap_level_${level}`,
          type: "missing_level",
          severity: level === "evaluate" || level === "create" ? "critical" : "warning",
          titleAr: `مهارة ${COGNITIVE_LABELS_AR[level] || level} غائبة`,
          messageAr: `الامتحانات الرسمية لهذا المستوى تتضمن عادةً سؤالاً يقيس مهارة ${COGNITIVE_LABELS_AR[level] || level}.`,
          actionAr: `أضف سؤالاً يتطلب ${level === "evaluate" ? "البرهنة أو تبرير الإجابة" : "الاستنتاج والتحليل"}.`
        });
      }
    });
  }

  // 3. Official Partitioning Gap
  const hasProblem = sections.some(s => s.id === "problem");
  if (!hasProblem && totalEx > 3) {
    gaps.push({
      id: "gap_no_problem",
      type: "structure",
      severity: "critical",
      titleAr: "الوضعية الإدماجية مفقودة",
      messageAr: "الامتحانات الرسمية (BEM/BAC) يجب أن تنتهي دائماً بوضعية إدماجية (الجزء الثاني).",
      actionAr: "حوّل القسم الأخير إلى 'وضعية إدماجية' باستخدام زر ★ في أعلى القسم."
    });
  }

  // 4. Point Distribution Gap
  const problemPoints = sections.find(s => s.id === "problem")?.exercises.reduce((sum, e) => sum + e.points, 0) || 0;
  if (hasProblem && problemPoints < 7) {
    gaps.push({
      id: "gap_problem_points",
      type: "imbalance",
      severity: "warning",
      titleAr: "تنقيط الوضعية الإدماجية منخفض",
      messageAr: "في العرف التربوي الجزائري، تُنقط الوضعية الإدماجية عادةً بـ 8 نقاط (أو 7 في البكالوريا).",
      actionAr: "ارفع نقاط المسألة لتعكس أهميتها في التقييم الكلي."
    });
  }

  return gaps;
}
