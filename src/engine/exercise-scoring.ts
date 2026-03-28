// ===== Exercise Scoring Engine =====
// Computes a base score for each exercise based on multiple parameters
// Used for exam building, categorization, and automatic point allocation

export interface ExerciseScoringParams {
  difficulty: number;        // 1-5
  cognitiveLevel: CognitiveLevel;
  bloomLevel: number;        // 1-6
  conceptCount: number;      // how many concepts involved
  stepCount: number;         // estimated steps to solve
  estimatedTimeMin: number;  // time in minutes
  hasSubQuestions: boolean;
  requiresProof: boolean;
  requiresGraph: boolean;
  requiresConstruction: boolean;
  domain: string;
  subdomain: string;
}

export type CognitiveLevel = 
  | "remember"     // التذكر — recall facts/formulas
  | "understand"   // الفهم — explain, interpret
  | "apply"        // التطبيق — use formula in standard context
  | "analyze"      // التحليل — break down, compare
  | "evaluate"     // التقييم — justify, critique
  | "create";      // الإبداع — design, prove, construct

export const COGNITIVE_LABELS_AR: Record<CognitiveLevel, string> = {
  remember: "تذكر",
  understand: "فهم",
  apply: "تطبيق",
  analyze: "تحليل",
  evaluate: "تقييم",
  create: "إبداع",
};

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
