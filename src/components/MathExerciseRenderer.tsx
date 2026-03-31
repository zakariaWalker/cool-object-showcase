// ===== Smart Math Exercise Renderer =====
// Handles mixed Arabic text + LaTeX math + question separation + geometry diagrams
import { useRef, useEffect, Fragment } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathExerciseRendererProps {
  text: string;
  className?: string;
  examMode?: boolean;
  showDiagram?: boolean;
  mathFont?: "serif" | "sans";
}

export function MathExerciseRenderer({
  text,
  className = "",
  examMode = false,
  showDiagram = false,
  mathFont = "serif",
}: MathExerciseRendererProps) {
  if (!text) return null;

  const { statement, questions } = splitExercise(text);

  return (
    <div className={`math-exercise-renderer ${className}`} dir="rtl">
      {statement && (
        <div className={`exercise-statement ${examMode ? "text-[13px] leading-[2.2]" : "text-sm leading-[2]"}`}>
          <MixedMathLine text={statement} mathFont={mathFont} />
        </div>
      )}

      {questions.length > 0 && (
        <ol className="exercise-questions list-none pr-0 mt-3 space-y-3">
          {questions.map((q, i) => (
            <li key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
              <span className={`question-number flex-shrink-0 font-black rounded-full w-7 h-7 flex items-center justify-center text-xs border-2 border-primary/30 bg-primary/5 text-primary`}>
                {q.label || `${i + 1}`}
              </span>
              <div className={`flex-1 ${examMode ? "text-[13px] leading-[2.2]" : "text-sm leading-[2]"}`}>
                <MixedMathLine text={q.text} mathFont={mathFont} />
              </div>
            </li>
          ))}
        </ol>
      )}

      {showDiagram && detectGeometry(text) && (
        <GeometrySketch text={text} />
      )}
    </div>
  );
}

// ─── Mixed Arabic + LaTeX line renderer ───────────────────────────────────────

function MixedMathLine({ text, mathFont = "serif" }: { text: string; mathFont?: string }) {
  const segments = parseMathSegments(text);

  return (
    <span style={{ fontFamily: mathFont === "serif" ? "serif" : "inherit" }}>
      {segments.map((seg, i) => (
        <Fragment key={i}>
          {seg.type === "text" ? (
            <span style={{ fontFamily: "'Tajawal', sans-serif" }}>{seg.content}</span>
          ) : (
            <KatexSpan latex={seg.content} displayMode={seg.type === "display"} />
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
        margin: displayMode ? "0.5em 0" : "0 0.15em",
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
  const regex = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
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

  if (lastIndex < text.length) {
    const rest = text.slice(lastIndex);
    if (rest.trim()) segments.push({ type: "text", content: rest });
  }

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
  // Normalize: replace / separators used as question delimiters
  // Pattern: "سؤال N" or "/ سؤال" 
  let normalized = text
    .replace(/\s*\/\s*سؤال\s*/g, "\nسؤال ")
    .replace(/\s*[/|]\s*(?=\d+[\)\.]\s)/g, "\n");
  
  // Normalize line breaks
  const lines = normalized.split(/\n/).map(l => l.trim()).filter(Boolean);

  if (lines.length <= 1) {
    const singleLine = lines[0] || text;
    
    // Try "سؤال N" pattern first (Arabic question markers)
    const sualPattern = /سؤال\s*(\d+)\s*/g;
    const sualMatches = [...singleLine.matchAll(sualPattern)];
    if (sualMatches.length >= 2) {
      const statement = singleLine.slice(0, sualMatches[0].index).trim();
      const questions: ParsedQuestion[] = [];
      for (let j = 0; j < sualMatches.length; j++) {
        const start = sualMatches[j].index! + sualMatches[j][0].length;
        const end = j + 1 < sualMatches.length ? sualMatches[j + 1].index! : singleLine.length;
        const qText = singleLine.slice(start, end).trim().replace(/^[:\s]+/, "");
        if (qText) questions.push({ label: `${sualMatches[j][1]})`, text: qText });
      }
      if (questions.length > 0) return { statement, questions };
    }

    // Try numbered patterns: 1) 2) 3) or 1. 2. 3.
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

    // Try Arabic letter markers: أ) ب) ج)
    const arabicQSplit = singleLine.split(/(?<=\s|^)([أبجدهو][\)\.])\s/);
    if (arabicQSplit.length > 2) {
      const statement = arabicQSplit[0].trim();
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
    // Detect question lines: starts with number, letter bullet, •, or "سؤال"
    const qMatch = line.match(/^(\d+[\)\.\-]|[أبجدهو][\)\.]|•|سؤال\s*\d+)\s*(.*)/);
    if (qMatch) {
      inQuestions = true;
      const label = qMatch[1].replace(/سؤال\s*/, "");
      questions.push({ label: label.match(/\d+/) ? `${label.match(/\d+/)![0]})` : label, text: qMatch[2] });
    } else if (inQuestions) {
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

      ctx.fillText("A", A.x - 5, A.y - 10);
      ctx.fillText("B", B.x - 15, B.y + 15);
      ctx.fillText("C", C.x + 5, C.y + 15);

      if (lower.includes("قائم") || lower.includes("rectangle") || lower.includes("right")) {
        ctx.strokeStyle = "hsl(0, 70%, 50%)";
        ctx.strokeRect(B.x, B.y - 10, 10, 10);
      }
    } else if (lower.includes("مربع") || lower.includes("مستطيل") || lower.includes("rectangle") || /\bABCD\b/.test(text)) {
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
