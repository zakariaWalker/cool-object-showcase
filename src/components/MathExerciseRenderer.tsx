// ===== Smart Math Exercise Renderer =====
// Handles mixed Arabic text + LaTeX math + question separation + geometry diagrams
import { useRef, useEffect, Fragment } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathExerciseRendererProps {
  text: string;
  className?: string;
  /** Render as exam paper (serif, larger) */
  examMode?: boolean;
  /** Show geometry diagram if detected */
  showDiagram?: boolean;
  /** Font family for math */
  mathFont?: "serif" | "sans";
}

/**
 * Splits text containing mixed Arabic + LaTeX into rendered segments.
 * Handles:
 *  - $...$ inline math
 *  - $$...$$ display math
 *  - \(...\) inline, \[...\] display
 *  - Question numbering (1) 2) etc.)
 *  - Geometry shape detection
 */
export function MathExerciseRenderer({
  text,
  className = "",
  examMode = false,
  showDiagram = false,
  mathFont = "serif",
}: MathExerciseRendererProps) {
  if (!text) return null;

  // Split into statement + questions
  const { statement, questions } = splitExercise(text);

  return (
    <div className={`math-exercise-renderer ${className}`} dir="rtl">
      {/* Statement / Énoncé */}
      {statement && (
        <div className={`exercise-statement ${examMode ? "text-[13px] leading-[2]" : "text-sm leading-[1.9]"}`}>
          <MathTextBlock text={statement} mathFont={mathFont} />
        </div>
      )}

      {/* Questions — each on its own line */}
      {questions.length > 0 && (
        <ol className={`exercise-questions list-none pr-0 mt-2 space-y-2 ${examMode ? "" : ""}`}>
          {questions.map((q, i) => (
            <li key={i} className="flex items-start gap-2">
              <span
                className={`question-number flex-shrink-0 font-black ${examMode ? "text-[12px] min-w-[24px]" : "text-xs min-w-[20px]"} text-foreground`}
              >
                {q.label || `${i + 1})`}
              </span>
              <div className={`flex-1 ${examMode ? "text-[13px] leading-[2]" : "text-sm leading-[1.9]"}`}>
                <MathTextBlock text={q.text} mathFont={mathFont} />
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* Geometry diagram placeholder */}
      {showDiagram && detectGeometry(text) && <GeometrySketch text={text} />}
    </div>
  );
}

// ─── Mixed Arabic + LaTeX line renderer ───────────────────────────────────────

/**
 * Auto-wraps raw math patterns (like 3^2, x+3, 2x-1) in KaTeX
 * so students see proper formatted math instead of confusing plain text.
 */
function autoWrapMath(text: string): string {
  let result = text;

  // 1) Wrap bare LaTeX commands like \frac{3}{8}, \sqrt{2}, \pi, \alpha, etc.
  //    Only when NOT already inside $...$ delimiters.
  if (!/\$[^$]*\\[a-zA-Z]/.test(result)) {
    // \cmd{...}{...}  or  \cmd{...}  or  \cmd  (single token)
    result = result.replace(
      /\\(?:frac|dfrac|tfrac|sqrt|sum|int|lim|prod)\s*(?:\{[^{}]*\}){1,2}|\\(?:pi|alpha|beta|gamma|delta|theta|lambda|mu|sigma|phi|omega|infty|times|cdot|le|ge|ne|approx|pm|mp|in|notin|forall|exists|to|leftarrow|rightarrow|Leftrightarrow)\b/g,
      (m) => ` $${m}$ `,
    );
  }

  // 2) Don't add more wrappers if the text now/already has $ delimiters.
  if (/\$/.test(result)) return result;

  // 3) Wrap power expressions: number^number, (expr)^number, var^number
  result = result.replace(
    /(\([^)]+\)\s*\^\s*\{?[^}\s]+\}?|\b[a-zA-Z0-9]+\s*\^\s*\{?[^}\s]+\}?)/g,
    " $$$1$$ ",
  );

  // 4) Wrap expressions with ×, ÷
  result = result.replace(/(\d+\s*[×÷]\s*\d+)/g, " $$$1$$ ");

  return result;
}

function MixedMathLine({ text, mathFont = "serif" }: { text: string; mathFont?: string }) {
  // Auto-wrap raw math before parsing
  const processedText = autoWrapMath(text);
  const segments = parseMathSegments(processedText);

  return (
    <span style={{ fontFamily: mathFont === "serif" ? "serif" : "inherit" }}>
      {segments.map((seg, i) => (
        <Fragment key={i}>
          {seg.type === "text" ? (
            <span>{seg.content}</span>
          ) : (
            <KatexSpan latex={seg.content} displayMode={seg.type === "display"} />
          )}
        </Fragment>
      ))}
    </span>
  );
}

type ParsedTextBlock =
  | { type: "text"; content: string }
  | { type: "table"; header?: string[]; rows: string[][] };

function MathTextBlock({ text, mathFont = "serif" }: { text: string; mathFont?: string }) {
  const blocks = splitMarkdownTables(text);

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIndex) => {
        if (block.type === "table") {
          return <RenderedExerciseTable key={blockIndex} header={block.header} rows={block.rows} mathFont={mathFont} />;
        }

        return (
          <div key={blockIndex} className="space-y-1">
            {block.content.split(/\n+/).filter(Boolean).map((line, lineIndex) => (
              <div key={lineIndex}>
                <MixedMathLine text={line.trim()} mathFont={mathFont} />
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function splitMarkdownTables(text: string): ParsedTextBlock[] {
  const lines = text.split(/\n/);
  const blocks: ParsedTextBlock[] = [];
  const textBuffer: string[] = [];

  const flushText = () => {
    const content = textBuffer.join("\n").trim();
    if (content) blocks.push({ type: "text", content });
    textBuffer.length = 0;
  };

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].includes("|")) {
      textBuffer.push(lines[i]);
      continue;
    }

    const tableLines: string[] = [];
    while (i < lines.length && lines[i].includes("|")) {
      tableLines.push(lines[i]);
      i++;
    }
    i--;

    const table = parseMarkdownTable(tableLines);
    if (table) {
      flushText();
      blocks.push(table);
    } else {
      textBuffer.push(...tableLines);
    }
  }

  flushText();
  return blocks;
}

function parseMarkdownTable(lines: string[]): ParsedTextBlock | null {
  const compactLines = lines.map((line) => line.trim()).filter(Boolean);
  const separatorIndex = compactLines.findIndex((line) => splitTableRow(line).every((cell) => /^:?-{3,}:?$/.test(cell)));
  if (separatorIndex < 1) return null;

  const headerCells = splitTableRow(compactLines[separatorIndex - 1]);
  const rows = compactLines.slice(separatorIndex + 1).map(splitTableRow).filter((row) => row.length > 0);
  if (rows.length === 0) return null;

  const columnCount = Math.max(headerCells.length, ...rows.map((row) => row.length));
  const normalizedRows = rows.map((row) => normalizeTableRow(row, columnCount));
  const header = headerCells.some((cell) => cell.trim()) ? normalizeTableRow(headerCells, columnCount) : undefined;

  return { type: "table", header, rows: normalizedRows };
}

function splitTableRow(line: string): string[] {
  return line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function normalizeTableRow(row: string[], columnCount: number): string[] {
  return Array.from({ length: columnCount }, (_, index) => row[index] || "");
}

function RenderedExerciseTable({ header, rows, mathFont }: { header?: string[]; rows: string[][]; mathFont?: string }) {
  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-border bg-card" dir="ltr">
      <table className="w-full min-w-[280px] border-collapse text-center text-sm">
        {header && (
          <thead className="bg-muted/70 text-muted-foreground">
            <tr>
              {header.map((cell, index) => (
                <th key={index} className="border-b border-border px-4 py-2 font-bold">
                  <MixedMathLine text={cell} mathFont={mathFont} />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="odd:bg-background even:bg-muted/30">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border-border px-4 py-2 font-semibold text-foreground [&:not(:last-child)]:border-r">
                  <MixedMathLine text={cell} mathFont={mathFont} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── KaTeX inline renderer ────────────────────────────────────────────────────

// Broken-LaTeX sanitizer — our PDF ingestion sometimes drops fraction
// numerators/denominators leaving fragments like  \frac{}{}  or  \frac{a}{} .
// KaTeX would happily render an empty box; we'd rather drop the fragment so the
// rest of the line stays readable.
function sanitizeLatex(src: string): string {
  let out = src;
  // \frac with one or both args empty / non-numeric (√, _, …) → drop
  out = out.replace(/\\d?frac\s*\{\s*\}\s*\{[^}]*\}/g, "□");
  out = out.replace(/\\d?frac\s*\{[^}]*\}\s*\{\s*\}/g, "□");
  out = out.replace(/\\d?frac\s*\{\s*\}\s*\{\s*[√]\s*\}/g, "□");
  // Stray double "==" produced by parser glitches
  out = out.replace(/==/g, "=");
  return out;
}

function KatexSpan({ latex, displayMode }: { latex: string; displayMode: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(sanitizeLatex(latex), ref.current, {
        displayMode,
        throwOnError: false,
        trust: true,
      });
    } catch {
      ref.current.textContent = latex;
    }
  }, [latex, displayMode]);

  return (
    <span
      ref={ref}
      dir="ltr"
      className="inline-math-isolate"
      style={{
        display: displayMode ? "block" : "inline-block",
        unicodeBidi: "isolate",
        direction: "ltr",
        textAlign: displayMode ? "center" : undefined,
        margin: displayMode ? "0.5em 0" : undefined,
      }}
    />
  );
}

// ─── Text parsing utilities ───────────────────────────────────────────────────

interface Segment {
  type: "text" | "inline" | "display";
  content: string;
}

function parseMathSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  // Pattern matches: $$...$$, $...$, \[...\], \(...\)
  const regex =
    /(\$\$[\s\S]*?\$\$|\$(?!\s)([^$\n]+?)\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\\begin\{([^}]+)\}[\s\S]*?\\end\{\3\}|^\s*\d+\)\s.*)/gm;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before math
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index);
      if (before.trim()) segments.push({ type: "text", content: before });
    }

    const raw = match[1];
    if (raw.startsWith("$$")) {
      segments.push({ type: "display", content: raw.slice(2, -2).trim() });
    } else if (raw.startsWith("$")) {
      segments.push({ type: "inline", content: raw.slice(1, -1).trim() });
    } else if (raw.startsWith("\\[")) {
      segments.push({ type: "display", content: raw.slice(2, -2).trim() });
    } else if (raw.startsWith("\\(")) {
      segments.push({ type: "inline", content: raw.slice(2, -2).trim() });
    }

    lastIndex = match.index + raw.length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    const rest = text.slice(lastIndex);
    if (rest.trim()) segments.push({ type: "text", content: rest });
  }

  // If no math was found, return as single text
  if (segments.length === 0) {
    segments.push({ type: "text", content: text });
  }

  return segments;
}

interface ParsedQuestion {
  label: string;
  text: string;
}

function splitExercise(text: string): { statement: string; questions: ParsedQuestion[] } {
  // Step 1: Normalize — replace common inline separators with newlines
  let normalized = text
    // "—" dash separator between questions
    .replace(/\s*[—–]\s*/g, "\n")
    // "/" separator between questions (but not inside math like a/b)
    .replace(/(?<=[^\d\\])\s*\/\s*(?=[^\d])/g, "\n")
    // ";" separator
    .replace(/\s*;\s*/g, "\n")
    // "سؤال N" or "السؤال N"
    .replace(/(?:ال)?سؤال\s*(\d+)\s*[:\-]?\s*/g, "\n$1) ");

  // Step 2: Split into lines
  const lines = normalized
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    const singleLine = text;

    // Try splitting by numbered patterns: 1) 2. 3-
    const qSplit = singleLine.split(/(?<=\s|^)(\d+[\)\.\-])\s/);
    if (qSplit.length > 2) {
      const statement = qSplit[0].trim();
      const questions: ParsedQuestion[] = [];
      for (let i = 1; i < qSplit.length; i += 2) {
        const label = qSplit[i];
        const qText = qSplit[i + 1]?.trim() || "";
        if (qText) questions.push({ label, text: qText });
      }
      if (questions.length > 0) return { statement, questions };
    }

    // Try Arabic question markers: أ) ب) ج)
    const arabicQSplit = singleLine.split(/(?<=\s|^)([أبجدهوز][\)\.])\s/);
    if (arabicQSplit.length > 2) {
      const statement = arabicQSplit[0].trim();
      const questions: ParsedQuestion[] = [];
      for (let i = 1; i < arabicQSplit.length; i += 2) {
        questions.push({ label: arabicQSplit[i], text: arabicQSplit[i + 1]?.trim() || "" });
      }
      if (questions.length > 0) return { statement, questions };
    }

    // Try bullet • separator
    const bulletParts = singleLine.split(/\s*•\s*/);
    if (bulletParts.length > 1) {
      const statement = bulletParts[0].trim();
      const questions = bulletParts.slice(1)
        .filter(p => p.trim())
        .map((p, i) => ({ label: `${i + 1})`, text: p.trim() }));
      if (questions.length > 0) return { statement, questions };
    }

    return { statement: text, questions: [] };
  }

  // Multi-line: separate statement from questions
  const questions: ParsedQuestion[] = [];
  const statementLines: string[] = [];
  let inQuestions = false;

  for (const line of lines) {
    // Detect question lines: starts with number, letter bullet, •, or standalone short question
    const qMatch = line.match(/^(\d+[\)\.\-]|[أبجدهوز][\)\.]|•)\s*(.*)/);
    if (qMatch) {
      inQuestions = true;
      questions.push({ label: qMatch[1], text: qMatch[2] });
    } else if (inQuestions) {
      // If line looks like a new question (starts with action verb in Arabic), make it a new question
      if (/^(أحسب|أنشر|بسط|حل|بيّن|أكتب|عيّن|أوجد|استنتج|تحقق|اعتمادا|بالاعتماد)/.test(line)) {
        questions.push({ label: `${questions.length + 1})`, text: line });
      } else if (questions.length > 0) {
        // Continuation of last question
        questions[questions.length - 1].text += " " + line;
      }
    } else {
      // Check if line starts with a verb (could be a question without numbering)
      if (statementLines.length > 0 && /^(أحسب|أنشر|بسط|حل|بيّن|أكتب|عيّن|أوجد|استنتج|تحقق|اعتمادا|بالاعتماد)/.test(line)) {
        inQuestions = true;
        questions.push({ label: `${questions.length + 1})`, text: line });
      } else {
        statementLines.push(line);
      }
    }
  }

  return {
    statement: statementLines.join("\n"),
    questions,
  };
}

// ─── Geometry detection & simple diagram ──────────────────────────────────────

const GEOMETRY_KEYWORDS = [
  "مثلث",
  "مستطيل",
  "مربع",
  "دائرة",
  "متوازي",
  "شبه منحرف",
  "triangle",
  "rectangle",
  "circle",
  "carré",
  "parallélogramme",
  "ABC",
  "ABCD",
  "زاوية",
  "angle",
  "perpendicular",
  "عمودي",
];

function detectGeometry(text: string): boolean {
  const lower = text.toLowerCase();
  return GEOMETRY_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

function GeometrySketch({ text }: { text: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "hsl(220, 20%, 50%)";
    ctx.lineWidth = 1.5;
    ctx.font = "bold 13px serif";
    ctx.fillStyle = "hsl(220, 20%, 30%)";

    const lower = text.toLowerCase();

    if (lower.includes("مثلث") || lower.includes("triangle") || /\bABC\b/.test(text)) {
      // Draw triangle ABC
      const cx = w / 2,
        cy = h / 2;
      const A = { x: cx, y: cy - 60 };
      const B = { x: cx - 70, y: cy + 50 };
      const C = { x: cx + 70, y: cy + 50 };

      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      ctx.lineTo(B.x, B.y);
      ctx.lineTo(C.x, C.y);
      ctx.closePath();
      ctx.stroke();

      // Labels
      ctx.fillText("A", A.x - 5, A.y - 10);
      ctx.fillText("B", B.x - 15, B.y + 15);
      ctx.fillText("C", C.x + 5, C.y + 15);

      // Right angle marker if mentioned
      if (lower.includes("قائم") || lower.includes("rectangle") || lower.includes("right")) {
        ctx.strokeStyle = "hsl(0, 70%, 50%)";
        ctx.strokeRect(B.x, B.y - 10, 10, 10);
      }
    } else if (
      lower.includes("مربع") ||
      lower.includes("مستطيل") ||
      lower.includes("rectangle") ||
      /\bABCD\b/.test(text)
    ) {
      // Draw rectangle ABCD
      const rx = w / 2 - 60,
        ry = h / 2 - 40;
      ctx.strokeRect(rx, ry, 120, 80);
      ctx.fillText("A", rx - 15, ry + 5);
      ctx.fillText("B", rx + 122, ry + 5);
      ctx.fillText("C", rx + 122, ry + 85);
      ctx.fillText("D", rx - 15, ry + 85);
    } else if (lower.includes("دائرة") || lower.includes("circle")) {
      const cx = w / 2,
        cy = h / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 50, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillText("O", cx - 5, cy + 5);
    }
  }, [text]);

  return (
    <div className="mt-3 flex justify-center">
      <canvas
        ref={canvasRef}
        width={240}
        height={160}
        className="border border-border/50 rounded-lg bg-muted/20"
        style={{ maxWidth: "100%" }}
      />
    </div>
  );
}

export default MathExerciseRenderer;
