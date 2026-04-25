/**
 * Answer Schema Engine
 * ---------------------
 * Replaces the "accept any non-empty input" anti-pattern with real validation.
 *
 * Two responsibilities:
 *   1. Infer an answer schema from the exercise/step text (numeric, list, range-filter, expression).
 *   2. Normalize student input (handle Arabic digits, comma-as-decimal vs comma-as-separator)
 *      and grade it against the schema.
 *
 * Returns a verdict: "correct" | "partial" | "incorrect" with a human-readable message.
 */

export type AnswerType =
  | "number" // single decimal/integer
  | "number_list" // unordered set of numbers
  | "range_filter" // pick numbers from a given list that fall in [min,max]
  | "comparison" // which of two quantities is bigger (a|b|equal)
  | "expression" // free-form algebraic — fall back to soft check
  | "construction" // geometric construction ("ارسم", "أنشئ"): student confirms drawing
  | "text"; // open-ended

export interface AnswerSchema {
  type: AnswerType;
  expected?: number | number[] | string;
  range?: { min: number; max: number; pool: number[] };
  tolerance?: number; // numeric tolerance, default 1e-6
}

export interface Verdict {
  status: "correct" | "partial" | "incorrect" | "unknown";
  message: string;
  expected?: string; // pretty form for UI reveal
}

// ──────────────────────────── INPUT NORMALIZATION ────────────────────────────

/** Convert Arabic-Indic digits to Latin and clean whitespace. */
function normalizeDigits(s: string): string {
  const map: Record<string, string> = {
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    "،": ",", "؛": ";",
  };
  return s.replace(/[٠-٩،؛]/g, (c) => map[c] || c).trim();
}

/**
 * Parse a single number that may use either "." or "," as decimal separator.
 * Returns NaN if ambiguous or unparseable.
 */
function parseSingleNumber(raw: string): number {
  const s = normalizeDigits(raw).replace(/\s+/g, "");
  if (!s) return NaN;
  // If it has both . and , — assume , is thousands sep
  if (s.includes(".") && s.includes(",")) {
    return parseFloat(s.replace(/,/g, ""));
  }
  // Single comma → decimal (French/Arabic convention)
  if (s.includes(",") && !s.includes(".")) {
    // But only if there's exactly one comma and digits on both sides
    const parts = s.split(",");
    if (parts.length === 2 && /^-?\d+$/.test(parts[0]) && /^\d+$/.test(parts[1])) {
      return parseFloat(parts[0] + "." + parts[1]);
    }
    return NaN; // ambiguous
  }
  return parseFloat(s);
}

/**
 * Parse student input as a list of numbers.
 * Heuristic:
 *   - If schema expects a list, treat commas as separators UNLESS the comma
 *     sits between two digits AND there's no other separator (then it's decimal).
 *   - Whitespace, semicolons, "و" (Arabic "and") all act as separators.
 */
export function parseNumberList(raw: string, expectListContext: boolean): number[] {
  const s = normalizeDigits(raw)
    .replace(/\bو\b/g, " ") // Arabic "and"
    .replace(/[;؛\n\t]/g, " ");

  if (!s.trim()) return [];

  // If we expect a list, prefer splitting on commas/spaces, but preserve decimal commas
  // by first protecting "digit,digit" sequences when the WHOLE input has no spaces (single number).
  const tokens: string[] = [];
  if (expectListContext) {
    // Split on whitespace OR comma — but rejoin tokens that look like a decimal "x,y"
    // when there are clearly multiple separators.
    const hasSpaceSep = /\s/.test(s.trim());
    if (hasSpaceSep) {
      // Whitespace is the primary separator → commas inside tokens stay as decimals
      s.split(/\s+/).forEach((t) => t && tokens.push(t));
    } else {
      // No whitespace → commas are separators
      s.split(",").forEach((t) => t && tokens.push(t));
    }
  } else {
    tokens.push(s);
  }

  const nums = tokens.map(parseSingleNumber);
  return nums.filter((n) => !isNaN(n));
}

// ──────────────────────────── SCHEMA INFERENCE ────────────────────────────

/**
 * Try to infer an answer schema from the exercise text + step description.
 * This is heuristic but covers the most common Arabic math-exercise patterns.
 */
export function inferAnswerSchema(exerciseText: string, stepText: string): AnswerSchema {
  const ex = normalizeDigits(exerciseText || "");
  const step = normalizeDigits(stepText || "");
  const combined = `${ex} ${step}`.toLowerCase();

  // ── Pattern A: range filter — "الأعداد المحصورة بين X و Y"
  const rangeMatch =
    combined.match(/محصور[ةه]?\s*بين\s*([\d.,]+)\s*و\s*([\d.,]+)/) ||
    combined.match(/بين\s*([\d.,]+)\s*و\s*([\d.,]+)/);
  if (rangeMatch) {
    const min = parseSingleNumber(rangeMatch[1]);
    const max = parseSingleNumber(rangeMatch[2]);
    // Extract the pool of numbers given in the exercise
    const poolMatches = Array.from(ex.matchAll(/-?\d+(?:[.,]\d+)?/g)).map((m) =>
      parseSingleNumber(m[0]),
    );
    // Filter out the bounds themselves
    const pool = poolMatches.filter((n) => !isNaN(n) && n !== min && n !== max);
    if (!isNaN(min) && !isNaN(max)) {
      const expected = pool.filter((n) => n >= min && n <= max);
      return {
        type: "range_filter",
        expected,
        range: { min, max, pool },
      };
    }
  }

  // ── Pattern B: comparison — "أيهما أكبر/أصغر"
  if (/أيهما\s+(أكبر|أصغر|أكثر|أقل)/.test(combined)) {
    return { type: "comparison" };
  }

  // ── Pattern C: geometric construction — "ارسم" / "أنشئ" / "أكمل رسم"
  // The step asks the student to DRAW something on the figure, not to compute.
  // We can't grade a drawing automatically, so we render a confirmation UI
  // instead of a text editor.
  if (/(?:^|\s)(?:ارسم|اِرسم|أنشئ|أنشِئ|أكمل\s+رسم|ارسموا|tracer?|dessiner?|construire?)\b/i.test(step)) {
    return { type: "construction" };
  }

  // ── Pattern D: explicit "احسب" / "أوجد" expecting one number
  if (/(احسب|أوجد|جد|قيمة)/.test(combined) && !/قائمة|الأعداد/.test(combined)) {
    return { type: "number" };
  }

  // ── Pattern E: "حدد الأعداد" → list
  if (/حدد\s+الأعداد|اذكر\s+الأعداد|اكتب\s+الأعداد/.test(combined)) {
    return { type: "number_list" };
  }

  // Fallback
  return { type: "text" };
}

// ──────────────────────────── GRADING ────────────────────────────

const TOL = 1e-6;
const eq = (a: number, b: number, tol = TOL) => Math.abs(a - b) <= tol;

function setEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort((x, y) => x - y);
  const sb = [...b].sort((x, y) => x - y);
  return sa.every((v, i) => eq(v, sb[i]));
}

function prettyList(nums: number[]): string {
  return nums.map((n) => String(n).replace(".", ",")).join(" ; ") || "—";
}

export function gradeAnswer(input: string, schema: AnswerSchema): Verdict {
  const raw = (input || "").trim();
  if (!raw) {
    return { status: "incorrect", message: "الرجاء إدخال إجابة." };
  }

  switch (schema.type) {
    case "range_filter": {
      const expected = (schema.expected as number[]) || [];
      const got = parseNumberList(raw, true);
      if (got.length === 0) {
        return {
          status: "incorrect",
          message: "لم نتعرف على أرقام في إجابتك. اكتب الأعداد مفصولة بمسافة.",
          expected: prettyList(expected),
        };
      }
      const r = schema.range!;
      // 1) Reject any number that wasn't in the original pool — students must
      //    PICK from the given list, not invent new numbers.
      const foreign = got.filter((n) => !r.pool.some((p) => eq(p, n)));
      if (foreign.length > 0) {
        return {
          status: "incorrect",
          message: `العدد ${String(foreign[0]).replace(".", ",")} غير موجود في القائمة المعطاة. اختر فقط من الأعداد المذكورة في التمرين.`,
          expected: prettyList(expected),
        };
      }
      // 2) Reject any pool number that is outside the valid range
      const invalid = got.filter((n) => n < r.min || n > r.max);
      if (invalid.length > 0) {
        return {
          status: "incorrect",
          message: `العدد ${String(invalid[0]).replace(".", ",")} ليس بين ${String(r.min).replace(".", ",")} و ${String(r.max).replace(".", ",")}.`,
          expected: prettyList(expected),
        };
      }
      // 3) Completeness check
      if (setEqual(got, expected)) {
        return { status: "correct", message: "إجابة كاملة وصحيحة." };
      }
      const missing = expected.filter((e) => !got.some((g) => eq(g, e)));
      if (missing.length > 0 && got.every((g) => expected.some((e) => eq(g, e)))) {
        return {
          status: "partial",
          message: `إجابة جزئية — تنقصك ${missing.length} من الأعداد.`,
          expected: prettyList(expected),
        };
      }
      return {
        status: "incorrect",
        message: "الإجابة غير مطابقة. راجع شروط المجال.",
        expected: prettyList(expected),
      };
    }

    case "number": {
      const got = parseSingleNumber(raw);
      if (isNaN(got)) {
        return { status: "incorrect", message: "أدخل عدداً صالحاً." };
      }
      if (schema.expected !== undefined && typeof schema.expected === "number") {
        return eq(got, schema.expected, schema.tolerance ?? TOL)
          ? { status: "correct", message: "صحيح." }
          : {
              status: "incorrect",
              message: "العدد غير صحيح.",
              expected: String(schema.expected).replace(".", ","),
            };
      }
      // No expected value → can't grade definitively
      return { status: "unknown", message: "تم استلام إجابتك." };
    }

    case "number_list": {
      const got = parseNumberList(raw, true);
      if (got.length === 0) {
        return { status: "incorrect", message: "أدخل قائمة أعداد." };
      }
      if (Array.isArray(schema.expected)) {
        return setEqual(got, schema.expected as number[])
          ? { status: "correct", message: "قائمة صحيحة." }
          : {
              status: "incorrect",
              message: "القائمة غير مطابقة.",
              expected: prettyList(schema.expected as number[]),
            };
      }
      return { status: "unknown", message: "تم استلام إجابتك." };
    }

    case "comparison":
    case "expression":
    case "text":
    default:
      // No reliable auto-grading → mark as "unknown" so UI shows a soft message.
      if (raw.length < 2) {
        return { status: "incorrect", message: "الإجابة قصيرة جداً." };
      }
      return { status: "unknown", message: "تم استلام إجابتك. تأكد من الحل قبل المتابعة." };
  }
}
