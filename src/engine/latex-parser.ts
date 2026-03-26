// ===== LaTeX Input Normaliser =====
// Converts common LaTeX math notation into plain expression strings
// that the existing parser/tokenizer can handle.
//
// Not a full LaTeX parser — covers the subset used in Algerian BEM/BAC exercises.

export function normaliseLatex(input: string): string {
  let s = input.trim();

  // Remove outer $...$ or $$...$$
  s = s.replace(/^\$\$?/, "").replace(/\$\$?$/, "").trim();
  s = s.replace(/^\\[(\[/, "").replace(/^\\]\]/, "").trim();

  // \frac{a}{b} → (a)/(b)
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "($1)/($2)");

  // \sqrt{x} → sqrt(x) , \sqrt[n]{x} → x^(1/n)
  s = s.replace(/\\sqrt\[([^\]]+)\]\{([^{}]+)\}/g, "($2)^(1/($1))");
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, "sqrt($1)");
  s = s.replace(/\\sqrt\s+(\S+)/g, "sqrt($1)");

  // \left( ... \right) → ( ... )
  s = s.replace(/\\left\s*\(/g, "(").replace(/\\right\s*\)/g, ")");
  s = s.replace(/\\left\s*\[/g, "(").replace(/\\right\s*\]/g, ")");
  s = s.replace(/\\left\s*\|/g, "|").replace(/\\right\s*\|/g, "|");
  s = s.replace(/\\left\s*\\{/g, "(").replace(/\\right\s*\\}/g, ")");

  // Trig and log functions
  s = s.replace(/\\(sin|cos|tan|arcsin|arccos|arctan|ln|log|exp)\b/g, "$1");
  s = s.replace(/\\asin\b/g, "asin").replace(/\\acos\b/g, "acos").replace(/\\atan\b/g, "atan");

  // \cdot → *
  s = s.replace(/\\cdot/g, "*");
  // \times → *
  s = s.replace(/\\times/g, "*");
  // \div → /
  s = s.replace(/\\div/g, "/");
  // \pm → +  (simplification — pick positive branch)
  s = s.replace(/\\pm/g, "+");

  // x^{n} → x^n , x^{ab} → x^(ab)
  s = s.replace(/\^\{([^{}]+)\}/g, (_, e) => e.length === 1 ? `^${e}` : `^(${e})`);

  // Subscripts: x_{n} → drop (subscripts aren't used in engine)
  s = s.replace(/_\{[^{}]*\}/g, "").replace(/_[a-zA-Z0-9]/g, "");

  // \pi → pi , \infty → inf
  s = s.replace(/\\pi\b/g, "pi");
  s = s.replace(/\\infty/g, "inf");
  s = s.replace(/\\mathrm\{([^{}]+)\}/g, "$1");
  s = s.replace(/\\text\{([^{}]+)\}/g, "");

  // Remove remaining backslash commands we don't know
  s = s.replace(/\\[a-zA-Z]+/g, "");

  // Normalise whitespace
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

/** Attempt to parse an input, trying LaTeX normalisation as a fallback. */
export function parseWithLatexFallback(input: string, parseFn: (s: string) => any): any {
  try {
    return parseFn(input);
  } catch {
    try {
      return parseFn(normaliseLatex(input));
    } catch {
      throw new Error(`لا يمكن تحليل التعبير: "${input}"`);
    }
  }
}
