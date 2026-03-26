// ===== Misconception Detector =====
// Compares a student's algebra attempt to the correct result,
// identifies the type of error and returns targeted pedagogical feedback.

import { Misconception, MisconceptionType } from "./types";

// ─── Token-level comparison ───────────────────────────────────────────────────

function tokenize(expr: string): string[] {
  return expr
    .replace(/\s+/g, "")
    .split(/([+\-*/^()])/)
    .filter(t => t.length > 0);
}

function countSigns(expr: string): { plus: number; minus: number } {
  const plus = (expr.match(/\+/g) || []).length;
  const minus = (expr.match(/(?<![e])-/g) || []).length; // avoid scientific notation
  return { plus, minus };
}

function extractNumbers(expr: string): number[] {
  return (expr.match(/-?\d+\.?\d*/g) || []).map(Number);
}

// ─── Heuristic rules ─────────────────────────────────────────────────────────

function detectSignError(student: string, correct: string): boolean {
  // Student has correct terms but wrong signs
  const sSigns = countSigns(student);
  const cSigns = countSigns(correct);
  const sDiff = Math.abs(sSigns.plus - sSigns.minus);
  const cDiff = Math.abs(cSigns.plus - cSigns.minus);
  // If sign counts differ but term counts are similar → sign error
  if (sDiff !== cDiff && Math.abs(sDiff - cDiff) <= 2) return true;
  // If minus where plus expected or vice versa
  if (student.replace(/-/g, "+") === correct.replace(/-/g, "+")) return true;
  return false;
}

function detectDistributionError(student: string, correct: string): boolean {
  // Student forgot to distribute to all terms: e.g. 2(x+3) → 2x+3 instead of 2x+6
  const sNums = extractNumbers(student);
  const cNums = extractNumbers(correct);
  // If student has fewer distinct numbers → likely missed multiplying one term
  if (sNums.length < cNums.length) return true;
  // Missing coefficient in one term
  const sCleaned = student.replace(/[^0-9]/g, "");
  const cCleaned = correct.replace(/[^0-9]/g, "");
  if (sCleaned.length < cCleaned.length - 1) return true;
  return false;
}

function detectArithmeticError(student: string, correct: string): boolean {
  // Same structure, different numbers → arithmetic mistake
  const sNums = extractNumbers(student).sort((a, b) => a - b);
  const cNums = extractNumbers(correct).sort((a, b) => a - b);
  if (sNums.length === cNums.length) {
    const diffs = sNums.filter((v, i) => v !== cNums[i]);
    return diffs.length > 0 && diffs.length <= 2;
  }
  return false;
}

function detectExponentError(student: string, correct: string): boolean {
  // Student confused (a+b)^2 = a^2+b^2 instead of a^2+2ab+b^2
  const hasMiddleTerm = correct.includes("2") && /[a-z]\*[a-z]|[a-z]{2}/.test(correct);
  const studentMissingMiddle = !student.includes("2") || !/[a-z]\*[a-z]|[a-z]{2}/.test(student);
  if (hasMiddleTerm && studentMissingMiddle) return true;
  return false;
}

function detectBracketError(student: string, correct: string): boolean {
  const sOpen = (student.match(/\(/g) || []).length;
  const sClose = (student.match(/\)/g) || []).length;
  if (sOpen !== sClose) return true;
  return false;
}

function detectMissingTerm(student: string, correct: string): boolean {
  const sTerms = tokenize(student).filter(t => /[a-zA-Z]/.test(t));
  const cTerms = tokenize(correct).filter(t => /[a-zA-Z]/.test(t));
  return sTerms.length < cTerms.length - 1;
}

// ─── Misconception catalogue ─────────────────────────────────────────────────

const MISCONCEPTIONS: Record<MisconceptionType, Misconception> = {
  sign_error: {
    type: "sign_error",
    labelAr: "خطأ في الإشارة",
    labelFr: "Erreur de signe",
    description: "Inversion ou oubli d'un signe (+ / −) lors de la distribution",
    hint: "Quand on multiplie par un nombre négatif, TOUS les signes des termes s'inversent. Exemple: −2(x−3) = −2x + 6, pas −2x − 6.",
    severity: "medium",
  },
  distribution_error: {
    type: "distribution_error",
    labelAr: "خطأ في التوزيع",
    labelFr: "Erreur de distributivité",
    description: "Le facteur n'a pas été distribué à tous les termes",
    hint: "La distributivité s'applique à CHAQUE terme dans la parenthèse: a(b + c + d) = ab + ac + ad",
    severity: "high",
  },
  arithmetic_error: {
    type: "arithmetic_error",
    labelAr: "خطأ في الحساب",
    labelFr: "Erreur de calcul numérique",
    description: "La structure algébrique est correcte mais un calcul numérique est faux",
    hint: "Revérifie tes multiplications et additions terme par terme.",
    severity: "low",
  },
  exponent_error: {
    type: "exponent_error",
    labelAr: "خطأ في التربيع",
    labelFr: "Erreur sur les identités remarquables",
    description: "(a+b)² ≠ a² + b² — le terme croisé 2ab est souvent oublié",
    hint: "(a+b)² = a² + 2ab + b². Le carré d'une somme contient TROIS termes, pas deux.",
    severity: "high",
  },
  bracket_error: {
    type: "bracket_error",
    labelAr: "خطأ في الأقواس",
    labelFr: "Déséquilibre des parenthèses",
    description: "Le nombre de parenthèses ouvrantes ≠ parenthèses fermantes",
    hint: "Vérifie que chaque parenthèse ouverte est bien fermée.",
    severity: "medium",
  },
  missing_term: {
    type: "missing_term",
    labelAr: "حد مفقود",
    labelFr: "Terme manquant",
    description: "L'expression résultante manque un ou plusieurs termes",
    hint: "Après développement, compte les termes: ils doivent être autant que les produits croisés attendus.",
    severity: "high",
  },
  correct: {
    type: "correct",
    labelAr: "إجابة صحيحة",
    labelFr: "Réponse correcte",
    description: "L'expression de l'élève correspond au résultat attendu",
    hint: "",
    severity: "low",
  },
  unknown: {
    type: "unknown",
    labelAr: "خطأ غير محدد",
    labelFr: "Erreur non identifiée",
    description: "Le résultat ne correspond pas mais le type d'erreur n'est pas clair",
    hint: "Reprends le calcul depuis le début, étape par étape.",
    severity: "medium",
  },
};

// ─── Main detector ────────────────────────────────────────────────────────────

export function detectMisconception(studentAttempt: string, correctAnswer: string): Misconception {
  const s = studentAttempt.trim().replace(/\s+/g, "");
  const c = correctAnswer.trim().replace(/\s+/g, "");

  // Normalize: both directions of equivalence
  if (s === c || s.replace(/\*/g, "") === c.replace(/\*/g, "")) {
    return MISCONCEPTIONS.correct;
  }

  if (detectBracketError(s, c)) return MISCONCEPTIONS.bracket_error;
  if (detectExponentError(s, c)) return MISCONCEPTIONS.exponent_error;
  if (detectDistributionError(s, c)) return MISCONCEPTIONS.distribution_error;
  if (detectSignError(s, c)) return MISCONCEPTIONS.sign_error;
  if (detectMissingTerm(s, c)) return MISCONCEPTIONS.missing_term;
  if (detectArithmeticError(s, c)) return MISCONCEPTIONS.arithmetic_error;

  return MISCONCEPTIONS.unknown;
}

export { MISCONCEPTIONS };

// ─── Domain-specific misconception detectors ────────────────────────────────

export interface DomainMisconception {
  type: string;
  labelAr: string;
  description: string;
  hint: string;
}

/** Detect common statistics misconceptions */
export function detectStatsMisconception(
  studentAnswer: string,
  correctAnswer: string,
  statType: "mean" | "median" | "mode" | "variance" | "stddev"
): DomainMisconception {
  const s = parseFloat(studentAnswer);
  const c = parseFloat(correctAnswer);

  if (isNaN(s)) return { type: "blank", labelAr: "لا إجابة", description: "لم يُحسب", hint: "تذكر: " + getStatsFormula(statType) };

  if (Math.abs(s - c) < 0.01) return { type: "correct", labelAr: "صحيح ✓", description: "", hint: "" };

  if (statType === "mean") {
    // Forgot to divide by n
    if (Math.abs(s - c * (s / c)) < 1 && s > c * 2) return { type: "forgot_divide", labelAr: "نسي القسمة على n", description: "جمع القيم لكن لم يقسم على عددها", hint: "المتوسط = مجموع القيم ÷ عدد القيم" };
  }

  if (statType === "median") {
    // Common: used wrong index, or forgot to sort
    return { type: "median_unsorted", labelAr: "لم يرتّب القيم", description: "الوسيط يتطلب ترتيب البيانات أولاً", hint: "رتّب القيم تصاعدياً ثم خذ القيمة الوسطى" };
  }

  if (statType === "variance" || statType === "stddev") {
    // Used n instead of (n-1), or forgot to square
    if (Math.abs(s - Math.sqrt(c)) < 0.1) return { type: "forgot_square", labelAr: "نسي التربيع", description: "استخدم الانحراف بدل التباين", hint: "التباين = مربع الانحراف المعياري" };
  }

  return { type: "arithmetic", labelAr: "خطأ حسابي", description: "النتيجة غير صحيحة", hint: "راجع العمليات الحسابية" };
}

function getStatsFormula(t: string): string {
  switch (t) {
    case "mean": return "x̄ = Σxᵢ / n";
    case "median": return "رتّب ثم خذ القيمة الوسطى";
    case "variance": return "V = Σ(xᵢ - x̄)² / n";
    case "stddev": return "σ = √V";
    default: return "";
  }
}

/** Detect geometry misconceptions */
export function detectGeometryMisconception(
  studentAnswer: string,
  correctAnswer: string,
  shape: "triangle" | "circle" | "rectangle"
): DomainMisconception {
  const s = parseFloat(studentAnswer);
  const c = parseFloat(correctAnswer);

  if (isNaN(s)) return { type: "blank", labelAr: "لا إجابة", description: "", hint: "" };
  if (Math.abs(s - c) < 0.01) return { type: "correct", labelAr: "صحيح ✓", description: "", hint: "" };

  if (shape === "circle") {
    // Used diameter instead of radius: answer = π*d² instead of π*r²
    if (Math.abs(s - c * 4) < 0.5) return { type: "diameter_not_radius", labelAr: "استخدم القطر بدل نصف القطر", description: "A = πd² بدل A = πr²", hint: "r = d/2، لا تنسَ القسمة على 2" };
    // Missing π
    if (Math.abs(s * Math.PI - c) < 0.5) return { type: "forgot_pi", labelAr: "نسي π", description: "لم يضرب في π", hint: "مساحة الدائرة = π × r²" };
  }

  if (shape === "triangle") {
    // Forgot the /2 for area
    if (Math.abs(s - c * 2) < 0.5) return { type: "forgot_half", labelAr: "نسي القسمة على 2", description: "A = base×height بدل A = ½×base×height", hint: "مساحة المثلث = ½ × القاعدة × الارتفاع" };
  }

  if (shape === "rectangle") {
    // Used addition instead of multiplication for area
    if (Math.abs(s - (parseFloat(correctAnswer) + parseFloat(correctAnswer))) < 1) return { type: "add_not_multiply", labelAr: "جمع بدل ضرب", description: "استخدم l+L بدل l×L", hint: "المساحة = الطول × العرض (ليس الجمع)" };
  }

  return { type: "arithmetic", labelAr: "خطأ حسابي", description: "", hint: "راجع القانون المستخدم" };
}

/** Detect probability misconceptions */
export function detectProbabilityMisconception(
  studentFraction: string,
  correctFraction: string
): DomainMisconception {
  // Inverted fraction
  const sParts = studentFraction.split("/").map(Number);
  const cParts = correctFraction.split("/").map(Number);

  if (sParts.length === 2 && cParts.length === 2) {
    if (sParts[0] === cParts[1] && sParts[1] === cParts[0]) {
      return { type: "inverted", labelAr: "قلب الكسر", description: "البسط والمقام مقلوبان", hint: "P(A) = عدد الحالات الملائمة ÷ مجموع الحالات" };
    }
    // Used total instead of favorable
    if (sParts[0] === sParts[1]) {
      return { type: "p_equals_one", labelAr: "احتمال = 1", description: "قسّم على نفسه", hint: "البسط = عدد الحالات الملائمة، المقام = مجموع الحالات" };
    }
  }
  return { type: "arithmetic", labelAr: "خطأ في الكسر", description: "", hint: "تحقق من فضاء العينة" };
}
