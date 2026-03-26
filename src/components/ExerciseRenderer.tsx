import { useMemo } from "react";
import { LatexRenderer } from "@/components/LatexRenderer";

interface Props {
  text: string;
  className?: string;
}

// Detect content types in exercise text
function detectContent(text: string) {
  const segments: { type: "text" | "latex" | "table" | "list" | "geometric" | "header"; content: string }[] = [];

  // Split by — (section separator used in exercises)
  const sections = text.split(/\s*—\s*/);

  for (const section of sections) {
    if (!section.trim()) continue;

    // Check for table-like patterns (columns of numbers with headers)
    const tableMatch = section.match(/(\[[\d;,.\s]+\[|\$\[[\d;,.\s]+\[)/g);
    const hasTableHeaders = /القامة|العمر|المسافة|الوزن|التردد|عدد|الفئات|القيم/i.test(section);
    const hasTabularData = section.match(/(\d+\s+){3,}/);

    if (hasTableHeaders && (tableMatch || hasTabularData)) {
      segments.push({ type: "table", content: section });
      continue;
    }

    // Check for list/numbered items  
    if (/سؤال \d+|^\d+[\)\.]/m.test(section)) {
      // Split by question markers
      const questions = section.split(/\s*\/\s*(?=سؤال)/);
      if (questions.length > 1) {
        questions.forEach(q => {
          if (q.trim()) segments.push({ type: "list", content: q.trim() });
        });
        continue;
      }
    }

    // Check for geometric construction instructions
    if (/ارسم|أنشئ|المثلث|الدائرة|المستقيم|المستوي|القطعة|الزاوية|التحويل|الإنشاء/i.test(section) &&
        /\$[A-Z]\$/i.test(section)) {
      segments.push({ type: "geometric", content: section });
      continue;
    }

    // Default: text with potential LaTeX
    segments.push({ type: "text", content: section });
  }

  return segments;
}

// Try to parse table data from text
function parseTable(text: string): { headers: string[]; rows: string[][] } | null {
  // Pattern: header1 header2 ... followed by numbers
  // Example: "[170;180[ [168;170[ ... 3 9 15 12 6"
  const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);

  // Try to find interval/value patterns
  const intervals = text.match(/\[[\d;,.\s]+\[/g);
  const numbers = text.match(/(?<!\[)\b\d+\b(?!\])/g);

  if (intervals && numbers && intervals.length > 0) {
    // Statistical table
    const headerLabel = text.match(/(القامة|العمر|المسافة|الوزن|التردد|القيم|الفئات)[^$\n]*/)?.[0] || "القيم";
    return {
      headers: ["الفئة", ...intervals.map(i => i.trim())],
      rows: [["العدد", ...numbers.slice(0, intervals.length)]],
    };
  }

  return null;
}

function RenderLatexText({ text }: { text: string }) {
  // Split text by $...$ patterns for inline LaTeX
  const parts = text.split(/(\$[^$]+\$)/g);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("$") && part.endsWith("$")) {
          const latex = part.slice(1, -1);
          return <LatexRenderer key={i} latex={latex} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

export function ExerciseRenderer({ text, className = "" }: Props) {
  const segments = useMemo(() => detectContent(text), [text]);

  if (segments.length === 0) {
    return <div className={`text-sm text-foreground leading-relaxed ${className}`} dir="rtl">{text}</div>;
  }

  return (
    <div className={`space-y-3 ${className}`} dir="rtl">
      {segments.map((seg, i) => {
        switch (seg.type) {
          case "table": {
            const table = parseTable(seg.content);
            if (table) {
              return (
                <div key={i} className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr>
                        {table.headers.map((h, j) => (
                          <th key={j} className="px-3 py-2 text-center font-bold border border-border bg-muted/50 text-foreground">
                            <RenderLatexText text={h} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, j) => (
                        <tr key={j}>
                          {row.map((cell, k) => (
                            <td key={k} className="px-3 py-2 text-center border border-border text-foreground">
                              <RenderLatexText text={cell} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Also show raw text for context */}
                  <div className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    <RenderLatexText text={seg.content} />
                  </div>
                </div>
              );
            }
            // Fallback: render as text with table hint
            return (
              <div key={i} className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent-foreground font-bold">📊 جدول</span>
                </div>
                <div className="text-sm text-foreground leading-relaxed">
                  <RenderLatexText text={seg.content} />
                </div>
              </div>
            );
          }

          case "geometric":
            return (
              <div key={i} className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">📐 هندسة</span>
                </div>
                <div className="text-sm text-foreground leading-relaxed">
                  <RenderLatexText text={seg.content} />
                </div>
              </div>
            );

          case "list":
            return (
              <div key={i} className="flex gap-3 items-start">
                {/سؤال (\d+)/.test(seg.content) && (
                  <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">
                    {seg.content.match(/سؤال (\d+)/)?.[1] || "?"}
                  </div>
                )}
                <div className="text-sm text-foreground leading-relaxed flex-1">
                  <RenderLatexText text={seg.content.replace(/^سؤال \d+\s*/, "")} />
                </div>
              </div>
            );

          default:
            return (
              <div key={i} className="text-sm text-foreground leading-relaxed">
                <RenderLatexText text={seg.content} />
              </div>
            );
        }
      })}
    </div>
  );
}
