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
          <MixedMathLine text={statement} mathFont={mathFont} />
        </div>
      )}

      {/* Questions — each on its own line */}
      {questions.length > 0 && (
        <ol className={`exercise-questions list-none pr-0 mt-2 space-y-2 ${examMode ? "" : ""}`}>
          {questions.map((q, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`question-number flex-shrink-0 font-black ${examMode ? "text-[12px] min-w-[24px]" : "text-xs min-w-[20px]"} text-foreground`}>
                {q.label || `${i + 1})`}
              </span>
              <div className={`flex-1 ${examMode ? "text-[13px] leading-[2]" : "text-sm leading-[1.9]"}`}>
                <MixedMathLine text={q.text} mathFont={mathFont} />
              </div>
            </li>
          ))}
        </ol>
      )}

      {/* Geometry diagram placeholder */}
      {showDiagram && detectGeometry(text) && (
        <GeometrySketch text={text} />
      )}
    </div>
  );
}

// ─── Mixed Arabic + LaTeX line renderer ───────────────────────────────────────

function MixedMathLine({ text, mathFont = "serif" }: { text: string; mathFont?: string }) {
  // Split on math delimiters: $...$, $$...$$, \(...\), \[...\]
  const segments = parseMathSegments(text);

  return (
    <span style={{ fontFamily: mathFont === "serif" ? "serif" : "inherit" }}>
      {segments.map((seg, i) => (
        <Fragment key={i}>
          {seg.type === "text" ? (
            <span>{seg.content}</span>
          ) : (
            <KatexSpan
              latex={seg.content}
              displayMode={seg.type === "display"}
            />
          )}
        </Fragment>
      ))}
    </span>
  );
}

// ─── KaTeX inline renderer ────────────────────────────────────────────────────

function KatexSpan({ latex, displayMode }: { latex: string; displayMode: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    try {
      katex.render(latex, ref.current, {
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
  const regex = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
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
  // Normalize line breaks
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);

  if (lines.length <= 1) {
    // Try splitting by numbered patterns within a single line
    const questionPattern = /(?:^|\s)(\d+[\)\-\.])(?:\s)/g;
    const parts: ParsedQuestion[] = [];
    let lastIdx = 0;
    let statement = "";
    let match: RegExpExecArray | null;
    let firstMatchPos = -1;

    const singleLine = text;
    while ((match = questionPattern.exec(singleLine)) !== null) {
      if (firstMatchPos === -1) {
        firstMatchPos = match.index;
        statement = singleLine.slice(0, match.index).trim();
      } else {
        const prevLabel = parts.length > 0 ? "" : "";
        // close previous question
      }
      // We'll use a different approach below
    }

    // Better approach: split by common question markers
    const qSplit = singleLine.split(/(?<=\s|^)(\d+[\)\.\-])\s/);
    if (qSplit.length > 2) {
      statement = qSplit[0].trim();
      const questions: ParsedQuestion[] = [];
      for (let i = 1; i < qSplit.length; i += 2) {
        const label = qSplit[i];
        const qText = qSplit[i + 1]?.trim() || "";
        if (qText) questions.push({ label, text: qText });
      }
      if (questions.length > 0) return { statement, questions };
    }

    // Also try Arabic question markers: أ) ب) ج) or bullet •
    const arabicQSplit = singleLine.split(/(?<=\s|^)([أبجدهو][\)\.])\s/);
    if (arabicQSplit.length > 2) {
      statement = arabicQSplit[0].trim();
      const questions: ParsedQuestion[] = [];
      for (let i = 1; i < arabicQSplit.length; i += 2) {
        questions.push({ label: arabicQSplit[i], text: arabicQSplit[i + 1]?.trim() || "" });
      }
      if (questions.length > 0) return { statement, questions };
    }

    return { statement: text, questions: [] };
  }

  // Multi-line: separate statement from questions
  const questions: ParsedQuestion[] = [];
  const statementLines: string[] = [];
  let inQuestions = false;

  for (const line of lines) {
    // Detect question lines: starts with number, letter bullet, or •
    const qMatch = line.match(/^(\d+[\)\.\-]|[أبجدهو][\)\.]|•)\s*(.*)/);
    if (qMatch) {
      inQuestions = true;
      questions.push({ label: qMatch[1], text: qMatch[2] });
    } else if (inQuestions) {
      // Continuation of last question
      if (questions.length > 0) {
        questions[questions.length - 1].text += " " + line;
      }
    } else {
      statementLines.push(line);
    }
  }

  return {
    statement: statementLines.join("\n"),
    questions,
  };
}

// ─── Geometry detection & simple diagram ──────────────────────────────────────

const GEOMETRY_KEYWORDS = [
  "مثلث", "مستطيل", "مربع", "دائرة", "متوازي", "شبه منحرف",
  "triangle", "rectangle", "circle", "carré", "parallélogramme",
  "ABC", "ABCD", "زاوية", "angle", "perpendicular", "عمودي",
];

function detectGeometry(text: string): boolean {
  const lower = text.toLowerCase();
  return GEOMETRY_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
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
      const cx = w / 2, cy = h / 2;
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
    } else if (lower.includes("مربع") || lower.includes("مستطيل") || lower.includes("rectangle") || /\bABCD\b/.test(text)) {
      // Draw rectangle ABCD
      const rx = w / 2 - 60, ry = h / 2 - 40;
      ctx.strokeRect(rx, ry, 120, 80);
      ctx.fillText("A", rx - 15, ry + 5);
      ctx.fillText("B", rx + 122, ry + 5);
      ctx.fillText("C", rx + 122, ry + 85);
      ctx.fillText("D", rx - 15, ry + 85);
    } else if (lower.includes("دائرة") || lower.includes("circle")) {
      const cx = w / 2, cy = h / 2;
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
