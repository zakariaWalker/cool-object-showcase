// ===== Exercise Text Parser =====
// Parses natural language exercise text (Arabic/French) into structured exercise objects
// Detects domain (algebra/geometry/statistics), extracts equations, geometry specs, tables

import { Domain } from "./types";

// ===== Types =====

export interface ParsedExercise {
  id: string;
  source: {
    text: string;
    language: "ar" | "fr" | "en";
    origin: "user_input";
  };
  classification: {
    domain: Domain;
    subdomain: string;
    difficulty: number;
    grade: string;
  };
  intent: {
    tasks: string[];
    expectedOutput: string[];
  };
  semanticObjects: {
    expressions: string[];
    equations: string[];
    inequalities: string[];
    variables: string[];
    numbers: number[];
    geometry: GeometrySpec | null;
    table: TableSpec | null;
  };
  rawQuestions: string[];
}

export interface GeometrySpec {
  shape: "triangle" | "circle" | "rectangle" | "segment";
  vertices: string[];
  rightAngleAt?: string;
  sides: Record<string, number>;
  angles: Record<string, number>;
  properties: string[];
}

export interface TableSpec {
  headers: string[];
  rows: (string | number)[][];
}

// ===== Domain Detection =====

const DOMAIN_KEYWORDS: Record<Domain, { ar: string[]; fr: string[]; en: string[] }> = {
  algebra: {
    ar: [
      "أنشر", "بسط", "العبارة", "حل", "المعادلة", "المتراجحة", "جملة", "معادلتين",
      "عبارة", "أحسب", "قيمة", "من أجل", "الأقواس", "المساويات", "حلل", "انشر",
      "كثير حدود", "حدودية", "عامل", "مقام", "بسط", "اختزل",
    ],
    fr: [
      "développer", "simplifier", "résoudre", "équation", "inéquation", "expression",
      "factoriser", "calculer", "valeur", "parenthèses", "système",
    ],
    en: [
      "expand", "simplify", "solve", "equation", "inequality", "expression",
      "factor", "calculate", "value", "parentheses", "system",
    ],
  },
  geometry: {
    ar: [
      "مثلث", "قائم", "دائرة", "مساحة", "محيط", "فيثاغورس", "نقطة", "مستقيم",
      "زاوية", "ضلع", "وتر", "قطر", "نصف قطر", "متوازي", "مربع", "مستطيل",
      "أنشئ", "ارسم", "قاعدة", "ارتفاع", "منتصف", "عمودي", "مواز",
    ],
    fr: [
      "triangle", "rectangle", "cercle", "aire", "périmètre", "pythagore",
      "point", "droite", "angle", "côté", "hypoténuse", "diamètre", "rayon",
      "construire", "tracer",
    ],
    en: [
      "triangle", "circle", "area", "perimeter", "pythagorean", "point",
      "line", "angle", "side", "hypotenuse", "diameter", "radius",
    ],
  },
  statistics: {
    ar: [
      "إحصائي", "تكرار", "متوسط", "معدل", "مخطط", "أعمدة", "دائري", "جدول",
      "مجتمع", "صفة", "عينة", "تواتر", "منوال", "وسيط", "مدى",
      "المبلغ", "الزبائن", "عدد",
    ],
    fr: [
      "statistique", "fréquence", "moyenne", "diagramme", "tableau",
      "population", "caractère", "échantillon", "médiane", "mode",
    ],
    en: [
      "statistics", "frequency", "mean", "average", "chart", "table",
      "population", "sample", "median", "mode", "range",
    ],
  },
  functions: {
    ar: ["دالة", "تمثيل بياني", "مجال", "تعريف", "صورة", "أصل", "مشتقة", "نهاية"],
    fr: ["fonction", "graphique", "domaine", "définition", "image", "dérivée", "limite"],
    en: ["function", "graph", "domain", "definition", "image", "derivative", "limit"],
  },
  probability: {
    ar: ["احتمال", "حادثة", "تجربة عشوائية", "فضاء العينة", "عملة", "نرد", "كرة", "حقيبة", "رمي"],
    fr: ["probabilité", "événement", "expérience", "espace", "pièce", "dé", "boule", "urne", "lancer", "tirage"],
    en: ["probability", "event", "experiment", "sample space", "coin", "dice", "ball", "urn"],
  },
};

function detectLanguage(text: string): "ar" | "fr" | "en" {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latinChars = (text.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
  if (arabicChars > latinChars) return "ar";
  // Simple French detection via accented chars or common words
  if (/[éèêëàâùûôîïç]|développer|résoudre|calculer|équation/i.test(text)) return "fr";
  return "en";
}

export function detectDomain(text: string): { domain: Domain; score: number; subdomain: string } {
  const lower = text.toLowerCase();
  const scores: Record<Domain, number> = { algebra: 0, geometry: 0, statistics: 0, functions: 0, probability: 0 };

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    for (const lang of Object.values(keywords)) {
      for (const kw of lang) {
        // Count occurrences
        const regex = new RegExp(kw, "gi");
        const matches = lower.match(regex) || text.match(regex);
        if (matches) scores[domain as Domain] += matches.length;
      }
    }
  }

  const best = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
  const domain = best[0] as Domain;

  // Subdomain detection
  let subdomain = "general";
  if (domain === "algebra") {
    if (/معادل|équation|equation/i.test(text)) subdomain = "equations";
    else if (/متراجح|inéquation|inequality/i.test(text)) subdomain = "inequalities";
    else if (/جملة|système|system/i.test(text)) subdomain = "systems";
    else if (/أنشر|بسط|développer|simplif|expand/i.test(text)) subdomain = "simplification";
    else if (/أقواس|parenthèses|parentheses/i.test(text)) subdomain = "parentheses";
  } else if (domain === "geometry") {
    if (/مثلث|triangle/i.test(text)) subdomain = "triangles";
    else if (/دائرة|cercle|circle/i.test(text)) subdomain = "circles";
  } else if (domain === "probability") {
    subdomain = "classical";
    if (/بدون إرجاع|sans remise|without replacement/i.test(text)) subdomain = "without_replacement";
    else if (/شرطي|conditionnel|conditional/i.test(text)) subdomain = "conditional";
    else if (/نرد|dé|dice/i.test(text)) subdomain = "dice";
    else if (/كرة|boule|ball|حقيبة|urne/i.test(text)) subdomain = "urn";
    else if (/عملة|pièce|coin/i.test(text)) subdomain = "coin";
  } else if (domain === "statistics") {
    if (/متوسط|معدل|moyenne|mean|average/i.test(text)) subdomain = "central_tendency";
    else if (/مخطط|diagramme|chart/i.test(text)) subdomain = "charts";
  }

  return { domain, score: best[1], subdomain };
}

// ===== Expression & Equation Extraction =====

// Matches math expressions like: 3(2x-5)+4(x+3), 28+9×5−6=170+9, 2x-3≥x+5, etc.
const MATH_EXPR_REGEX = /[0-9a-zA-Z\s\+\-\*×÷\/\(\)\^\.,=≥≤><]+[=≥≤><]+[0-9a-zA-Z\s\+\-\*×÷\/\(\)\^\.,]+/g;
const EXPRESSION_REGEX = /(?:^|[=:]\s*)([0-9][0-9a-zA-Z\s\+\-\*×÷\/\(\)\^\.,]+)/gm;
const EQUATION_REGEX = /([^=≥≤><\n]+[=][\s]*[^=≥≤><\n]+)/g;
const INEQUALITY_REGEX = /([^=≥≤><\n]+[≥≤><]+[^=≥≤><\n]+)/g;

function normalizeOperators(text: string): string {
  return text
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Cleans text for display or pre-parsing.
 * - Strips $ signs while preserving the content inside.
 * - Handles implicit exponents like x2 -> x^2.
 */
export function cleanMathText(text: string): string {
  if (!text) return "";
  
  return text
    // 1. Strip $ signs but keep the content
    .replace(/\$/g, "")
    // 2. Fix implicit exponents: [a-zA-Z] followed immediately by a digit (x2, y3)
    // Only if it's not part of another number or word
    .replace(/([a-zA-Z])(\d)(?![a-zA-Z/d])/g, "$1^$2")
    // 3. Normalize common symbols
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-")
    .trim();
}


function extractExpressions(text: string): string[] {
  const results: string[] = [];
  
  // 1. First, try extracting anything between $...$ (higher confidence math)
  const latexRegex = /\$([^\$]+)\$/g;
  let lm;
  while ((lm = latexRegex.exec(text)) !== null) {
    results.push(normalizeOperators(lm[1]));
  }

  // 2. Look for "A = ..." or "f(x) = ..." assignments
  const assignRegex = /([A-Z](?:\s*\(x\))?)\s*=\s*([0-9a-zA-Zx\s\+\-\*×÷\/\(\)\^\.,]+)/g;
  let am;
  while ((am = assignRegex.exec(text)) !== null) {
    results.push(normalizeOperators(am[0]));
  }

  // 3. Fallback: Parse line by line for math-heavy content
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Remove common question prefixes like "1. ", "- ", etc.
    const deBulleted = trimmed.replace(/^[\d\-\.\s•\*]+/, "").trim();
    
    // If the line looks like it contains math operators and numbers, but isn't already captured
    if (/[x=+\-\*\/×÷\^]/.test(deBulleted) && deBulleted.length > 3) {
      // Try to extract the math part specifically if mixed with text
      // e.g. "انشر العبارة E = (2x+3)^2" -> "E = (2x+3)^2"
      const mathMatch = deBulleted.match(/[A-Z]\s*=\s*[^ء-يa-vA-Vw-zW-Z]+/);
      if (mathMatch) {
         results.push(normalizeOperators(mathMatch[0]));
      } else if (/^[0-9a-zA-Zx\s\+\-\*×÷\/\(\)\^\.,=≥≤><]+$/.test(deBulleted)) {
         results.push(normalizeOperators(deBulleted));
      }
    }
  }

  return [...new Set(results)];
}

function extractEquations(text: string): string[] {
  const results: string[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim().replace(/^[\d]+[\.)\-\s]+/, "").trim();
    const normalized = normalizeOperators(trimmed);

    // Equation: has exactly one = sign
    if (/^[^=]+=.+$/.test(normalized) && !normalized.includes("≥") && !normalized.includes("≤")) {
      results.push(normalized);
    }
  }

  return results;
}

function extractInequalities(text: string): string[] {
  const results: string[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = normalizeOperators(line.trim().replace(/^[\d]+[\.)\-\s]+/, "").trim());
    if (/[≥≤><]/.test(trimmed)) {
      results.push(trimmed);
    }
  }

  return results;
}

function extractVariables(expressions: string[]): string[] {
  const vars = new Set<string>();
  for (const expr of expressions) {
    const matches = expr.match(/[a-zA-Z]/g);
    if (matches) matches.forEach(v => vars.add(v));
  }
  // Remove common non-variable letters (function names etc.)
  ["s", "i", "n", "c", "o", "t", "a", "l", "g", "e", "p", "S"].forEach(c => {
    // Only remove if it appears as part of sin, cos, etc.
  });
  return Array.from(vars);
}

function extractNumbers(text: string): number[] {
  const nums: number[] = [];
  const matches = text.match(/\d+\.?\d*/g);
  if (matches) {
    for (const m of matches) {
      const n = parseFloat(m);
      if (!isNaN(n)) nums.push(n);
    }
  }
  return [...new Set(nums)];
}

// ===== Geometry Extraction =====

function extractGeometry(text: string): GeometrySpec | null {
  // Detect triangle
  const triangleMatch = text.match(/([A-Z])([A-Z])([A-Z])\s*(?:مثلث|triangle)/i)
    || text.match(/(?:مثلث|triangle)\s*([A-Z])([A-Z])([A-Z])/i);

  if (triangleMatch) {
    const vertices = [triangleMatch[1], triangleMatch[2], triangleMatch[3]];

    // Detect right angle
    let rightAngleAt: string | undefined;
    const rightMatch = text.match(/(?:قائم في|قائم الزاوية في|rectangle en)\s*([A-Z])/i);
    if (rightMatch) rightAngleAt = rightMatch[1];

    // Extract sides: AB = 6 or AB=6cm
    const sides: Record<string, number> = {};
    const sideRegex = /([A-Z]{2})\s*=\s*(\d+\.?\d*)\s*(?:cm|سم)?/g;
    let sm;
    while ((sm = sideRegex.exec(text)) !== null) {
      sides[sm[1]] = parseFloat(sm[2]);
    }

    return {
      shape: "triangle",
      vertices,
      rightAngleAt,
      sides,
      angles: {},
      properties: rightAngleAt ? ["right_angle"] : [],
    };
  }

  return null;
}

// ===== Table Extraction =====

function extractTable(text: string): TableSpec | null {
  // Look for tabular data patterns
  // Pattern: header row followed by value rows separated by tabs, pipes, or multiple spaces
  const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);

  // Try to find two adjacent lines with similar delimiter patterns
  for (let i = 0; i < lines.length - 1; i++) {
    const cells1 = lines[i].split(/\t|\|/).map(c => c.trim()).filter(c => c);
    const cells2 = lines[i + 1].split(/\t|\|/).map(c => c.trim()).filter(c => c);

    if (cells1.length >= 3 && cells2.length >= 3 && Math.abs(cells1.length - cells2.length) <= 1) {
      const headers = cells1;
      const rows: (string | number)[][] = [];

      for (let j = i + 1; j < lines.length; j++) {
        const cells = lines[j].split(/\t|\|/).map(c => c.trim()).filter(c => c);
        if (cells.length >= 2) {
          rows.push(cells.map(c => {
            const n = parseFloat(c);
            return isNaN(n) ? c : n;
          }));
        }
      }

      if (rows.length > 0) {
        return { headers, rows };
      }
    }
  }

  // Try comma/space separated number patterns (common in Arabic math exercises)
  // e.g. "المبلغ المودع (دج)   1000   3000   5000   10000   50000"
  // followed by "عدد الزبائن        20     30     25     15      10"
  const numberLines: { label: string; values: number[] }[] = [];
  for (const line of lines) {
    const numbers = line.match(/\d+\.?\d*/g);
    if (numbers && numbers.length >= 3) {
      const label = line.replace(/[\d.,]+/g, "").trim();
      numberLines.push({
        label: label || `row_${numberLines.length}`,
        values: numbers.map(n => parseFloat(n)),
      });
    }
  }

  if (numberLines.length >= 2) {
    const headers = numberLines[0].values.map(String);
    headers.unshift(numberLines[0].label);
    const rows: (string | number)[][] = numberLines.slice(1).map(nl => [nl.label, ...nl.values]);
    return { headers, rows };
  }

  return null;
}

// ===== Question Extraction =====

function extractQuestions(text: string): string[] {
  const questions: string[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    // Match lines starting with question markers
    if (/^[\-•\*]\s+/.test(trimmed) ||
        /^\d+[\.\)]\s+/.test(trimmed) ||
        /^(حدد|احسب|أحسب|أنشر|بسط|حل|مثل|أنشئ|هل|علل|أوجد|عين|ارسم|بين|استنتج)/.test(trimmed) ||
        /^(calculer|résoudre|développer|simplifier|déterminer|tracer|montrer)/i.test(trimmed) ||
        /^(calculate|solve|expand|simplify|find|draw|show|prove)/i.test(trimmed)) {
      questions.push(trimmed.replace(/^[\-•\*\d\.\)]+\s*/, ""));
    }
  }

  return questions;
}

// ===== Task Detection =====

export function detectTasks(text: string, domain: Domain): string[] {
  const tasks: string[] = [];

  if (domain === "algebra") {
    if (/أنشر|انشر|développer|expand/i.test(text)) tasks.push("expand");
    if (/بسط|simplif/i.test(text)) tasks.push("simplify");
    if (/حل.*معادل|résoudre.*équation|solve.*equation/i.test(text)) tasks.push("solve_equation");
    if (/حل.*متراجح|résoudre.*inéquation|solve.*inequality/i.test(text)) tasks.push("solve_inequality");
    if (/حل.*جملة|résoudre.*système|solve.*system/i.test(text)) tasks.push("solve_system");
    if (/أحسب|حساب|احسب|calculer|calculate|compute/i.test(text)) tasks.push("compute");
    if (/أقواس|parenthèses|parentheses/i.test(text)) tasks.push("place_parentheses");
    if (/قيمة.*من أجل|valeur.*pour|value.*for/i.test(text)) tasks.push("evaluate");
  } else if (domain === "geometry") {
    if (/احسب.*ضلع|مسافة|calculer.*côté|find.*side|BC|AC|AB/i.test(text)) tasks.push("find_side");
    if (/مساحة|aire|area/i.test(text)) tasks.push("area");
    if (/محيط|périmètre|perimeter/i.test(text)) tasks.push("perimeter");
    if (/دائرة.*محيط|cercle.*circons|circumscribed/i.test(text)) tasks.push("circumscribed_circle");
    if (/تنتمي|appartient|belongs/i.test(text)) tasks.push("point_on_circle");
  } else if (domain === "probability") {
    if (/عملة|pièce|coin/i.test(text)) tasks.push("coin");
    if (/نرد|dé|dice/i.test(text)) tasks.push("dice");
    if (/كرة|boule|ball|urne|sac/i.test(text)) tasks.push("urn");
    if (/احتمال|probabilité|probability/i.test(text)) tasks.push("compute_probability");
  } else if (domain === "statistics") {
    if (/مجتمع.*إحصائ|population/i.test(text)) tasks.push("identify_population");
    if (/صفة.*إحصائ|caractère/i.test(text)) tasks.push("identify_character");
    if (/عدد.*إجمالي|العدد الإجمالي|total/i.test(text)) tasks.push("compute_total");
    if (/معدل|متوسط|moyenne|mean|average/i.test(text)) tasks.push("compute_mean");
    if (/مخطط|diagramme|chart|diagram/i.test(text)) tasks.push("draw_chart");
  }

  return tasks.length > 0 ? tasks : ["analyze"];
}

// ===== Main Parser =====

export function parseExercise(text: string): ParsedExercise {
  const language = detectLanguage(text);
  const { domain, subdomain } = detectDomain(text);
  const expressions = extractExpressions(text);
  const equations = extractEquations(text);
  const inequalities = extractInequalities(text);
  const geometry = extractGeometry(text);
  const table = extractTable(text);
  const questions = extractQuestions(text);
  const tasks = detectTasks(text, domain);
  const variables = extractVariables([...expressions, ...equations, ...inequalities]);
  const numbers = extractNumbers(text);

  // Determine expected outputs
  const expectedOutput: string[] = [];
  if (tasks.includes("expand") || tasks.includes("simplify")) expectedOutput.push("expression");
  if (tasks.includes("solve_equation") || tasks.includes("evaluate") || tasks.includes("compute")) expectedOutput.push("number");
  if (tasks.includes("draw_chart")) expectedOutput.push("diagram");
  if (tasks.includes("identify_population") || tasks.includes("identify_character")) expectedOutput.push("text");
  if (tasks.includes("area") || tasks.includes("perimeter") || tasks.includes("find_side")) expectedOutput.push("number");
  if (expectedOutput.length === 0) expectedOutput.push("expression");

  return {
    id: crypto.randomUUID(),
    source: { text, language, origin: "user_input" },
    classification: {
      domain,
      subdomain,
      difficulty: 1,
      grade: "BEM",
    },
    intent: { tasks, expectedOutput },
    semanticObjects: {
      expressions,
      equations,
      inequalities,
      variables,
      numbers,
      geometry,
      table,
    },
    rawQuestions: questions,
  };
}
