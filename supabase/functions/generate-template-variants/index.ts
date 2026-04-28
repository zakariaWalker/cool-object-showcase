// Rule-based question variant generator.
// Given a template_id, materializes N unique variants by:
// 1. Sampling each variable from its declared range
// 2. Filtering by constraint expressions
// 3. Evaluating answer + distractor expressions
// 4. Replacing {{var}} placeholders in the question text
// 5. Hashing & deduping; bulk-inserting into question_template_variants
//
// SAFETY: We do NOT use eval / Function. We parse expressions with a tiny
// shunting-yard arithmetic evaluator that only allows numbers, variables,
// + - * / % ^ parentheses, and unary minus. Anything else is rejected.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─────────────────────────── Safe expression evaluator ───────────────────────────

type Tok =
  | { t: "num"; v: number }
  | { t: "var"; v: string }
  | { t: "op"; v: string }
  | { t: "lp" }
  | { t: "rp" };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t") { i++; continue; }
    if (c >= "0" && c <= "9") {
      let j = i; while (j < src.length && (/[0-9.]/.test(src[j]))) j++;
      out.push({ t: "num", v: parseFloat(src.slice(i, j)) });
      i = j; continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i; while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j++;
      const name = src.slice(i, j);
      // boolean keywords map to numbers later via comparison results
      out.push({ t: "var", v: name });
      i = j; continue;
    }
    if (c === "(") { out.push({ t: "lp" }); i++; continue; }
    if (c === ")") { out.push({ t: "rp" }); i++; continue; }
    // 2-char ops
    const two = src.slice(i, i + 2);
    if (["==", "!=", "<=", ">=", "&&", "||"].includes(two)) {
      out.push({ t: "op", v: two }); i += 2; continue;
    }
    if ("+-*/%^<>!".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
    throw new Error(`Unexpected char in expression: '${c}'`);
  }
  return out;
}

const PREC: Record<string, number> = {
  "||": 1, "&&": 2,
  "==": 3, "!=": 3, "<": 3, ">": 3, "<=": 3, ">=": 3,
  "+": 4, "-": 4,
  "*": 5, "/": 5, "%": 5,
  "^": 6,
  "u-": 7, "!": 7,
};
const RIGHT_ASSOC = new Set(["^", "u-", "!"]);

function toRPN(tokens: Tok[]): Tok[] {
  const out: Tok[] = [];
  const stack: Tok[] = [];
  let prev: Tok | null = null;
  for (const tk of tokens) {
    if (tk.t === "num" || tk.t === "var") {
      out.push(tk);
    } else if (tk.t === "op") {
      // unary minus / not
      let op = tk.v;
      const isUnary = (op === "-" || op === "!") &&
        (prev === null || (prev.t === "op") || prev.t === "lp");
      if (isUnary) op = op === "-" ? "u-" : "!";
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.t !== "op") break;
        const pTop = PREC[top.v] ?? 0;
        const pNew = PREC[op] ?? 0;
        if (pTop > pNew || (pTop === pNew && !RIGHT_ASSOC.has(op))) {
          out.push(stack.pop()!);
        } else break;
      }
      stack.push({ t: "op", v: op });
    } else if (tk.t === "lp") {
      stack.push(tk);
    } else if (tk.t === "rp") {
      while (stack.length && stack[stack.length - 1].t !== "lp") out.push(stack.pop()!);
      if (!stack.length) throw new Error("Mismatched parens");
      stack.pop();
    }
    prev = tk;
  }
  while (stack.length) {
    const tk = stack.pop()!;
    if (tk.t === "lp" || tk.t === "rp") throw new Error("Mismatched parens");
    out.push(tk);
  }
  return out;
}

function evalRPN(rpn: Tok[], vars: Record<string, number>): number {
  const st: number[] = [];
  for (const tk of rpn) {
    if (tk.t === "num") st.push(tk.v);
    else if (tk.t === "var") {
      if (!(tk.v in vars)) throw new Error(`Undefined variable: ${tk.v}`);
      st.push(vars[tk.v]);
    } else if (tk.t === "op") {
      if (tk.v === "u-") { st.push(-st.pop()!); continue; }
      if (tk.v === "!")  { st.push(st.pop()! ? 0 : 1); continue; }
      const b = st.pop()!; const a = st.pop()!;
      switch (tk.v) {
        case "+": st.push(a + b); break;
        case "-": st.push(a - b); break;
        case "*": st.push(a * b); break;
        case "/": st.push(b === 0 ? NaN : a / b); break;
        case "%": st.push(b === 0 ? NaN : a % b); break;
        case "^": st.push(Math.pow(a, b)); break;
        case "==": st.push(a === b ? 1 : 0); break;
        case "!=": st.push(a !== b ? 1 : 0); break;
        case "<":  st.push(a < b ? 1 : 0); break;
        case ">":  st.push(a > b ? 1 : 0); break;
        case "<=": st.push(a <= b ? 1 : 0); break;
        case ">=": st.push(a >= b ? 1 : 0); break;
        case "&&": st.push(a && b ? 1 : 0); break;
        case "||": st.push(a || b ? 1 : 0); break;
        default: throw new Error(`Unknown op: ${tk.v}`);
      }
    }
  }
  if (st.length !== 1) throw new Error("Bad expression");
  return st[0];
}

function safeEval(expr: string, vars: Record<string, number>): number {
  return evalRPN(toRPN(tokenize(expr)), vars);
}

// ─────────────────────────── Variant generation ───────────────────────────

function sampleVar(v: any, rnd: () => number): number {
  const min = Number(v.min ?? 0);
  const max = Number(v.max ?? 9);
  if (v.type === "float") {
    const n = min + (max - min) * rnd();
    const dp = Number(v.decimals ?? 1);
    return Number(n.toFixed(dp));
  }
  // default int
  const lo = Math.ceil(min), hi = Math.floor(max);
  return lo + Math.floor(rnd() * (hi - lo + 1));
}

function fillTemplate(tpl: string, vars: Record<string, number>): string {
  return tpl.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, k) => {
    if (!(k in vars)) return `{{${k}}}`;
    const n = vars[k];
    // negative numbers in expressions like "{{a}}x + {{b}}" should render as "-3" not "+ -3"
    return String(n);
  });
}

function fmtAnswer(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return Number(n.toFixed(4)).toString();
}

async function sha1(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-1", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { template_id, count = 20 } = await req.json();
    if (!template_id) {
      return new Response(JSON.stringify({ error: "template_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: tpl, error: tplErr } = await supabase
      .from("question_templates").select("*").eq("id", template_id).maybeSingle();
    if (tplErr || !tpl) {
      return new Response(JSON.stringify({ error: tplErr?.message || "template not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const variables: any[] = Array.isArray(tpl.variables) ? tpl.variables : [];
    const constraints: string[] = Array.isArray(tpl.constraints) ? tpl.constraints : [];
    const distractorExpr: string[] = Array.isArray(tpl.distractor_expressions) ? tpl.distractor_expressions : [];

    const target = Math.max(1, Math.min(200, Number(count)));
    const seenHashes = new Set<string>();
    const variants: any[] = [];

    let attempts = 0;
    const maxAttempts = target * 50;
    const rnd = Math.random;

    while (variants.length < target && attempts < maxAttempts) {
      attempts++;
      const vars: Record<string, number> = {};
      for (const v of variables) vars[v.name] = sampleVar(v, rnd);

      // constraints
      let ok = true;
      for (const c of constraints) {
        try {
          if (!safeEval(c, vars)) { ok = false; break; }
        } catch { ok = false; break; }
      }
      if (!ok) continue;

      // answer
      let ansNum: number;
      try { ansNum = safeEval(tpl.answer_expression || "0", vars); }
      catch { continue; }
      if (!Number.isFinite(ansNum)) continue;

      const questionText = fillTemplate(tpl.template_text, vars);
      const hash = (await sha1(questionText)).slice(0, 24);
      if (seenHashes.has(hash)) continue;
      seenHashes.add(hash);

      // distractors
      let options: string[] = [];
      if (tpl.kind === "qcm") {
        const set = new Set<string>([fmtAnswer(ansNum)]);
        for (const e of distractorExpr) {
          try {
            const n = safeEval(e, vars);
            if (Number.isFinite(n)) set.add(fmtAnswer(n));
          } catch { /* skip bad distractor */ }
          if (set.size >= 4) break;
        }
        options = Array.from(set);
        if (options.length < 2) continue; // need at least one distractor
        // shuffle
        for (let i = options.length - 1; i > 0; i--) {
          const j = Math.floor(rnd() * (i + 1));
          [options[i], options[j]] = [options[j], options[i]];
        }
      }

      variants.push({
        template_id: tpl.id,
        variant_hash: hash,
        question_text: questionText,
        kind: tpl.kind,
        answer: fmtAnswer(ansNum) + (tpl.answer_unit ? ` ${tpl.answer_unit}` : ""),
        options,
        variables_used: vars,
        grade_code: tpl.grade_code,
        skill_id: tpl.skill_id,
        difficulty: tpl.difficulty,
        bloom_level: tpl.bloom_level,
        is_active: true,
      });
    }

    if (!variants.length) {
      return new Response(JSON.stringify({
        ok: false, generated: 0, attempts,
        error: "No valid variants produced. Check variable ranges, constraints, and answer expression.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: insErr, data: ins } = await supabase
      .from("question_template_variants")
      .upsert(variants, { onConflict: "template_id,variant_hash", ignoreDuplicates: true })
      .select("id");

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      ok: true, generated: variants.length, inserted: ins?.length ?? 0, attempts,
      sample: variants.slice(0, 3),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
