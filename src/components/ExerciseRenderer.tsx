import { useMemo } from "react";
import { MathContent } from "@/components/MathContent";

interface Props {
  text: string;
  className?: string;
}

// Detect content types in exercise text
function detectContent(text: string) {
  const segments: { type: "text" | "latex" | "table" | "list" | "geometric" | "header"; content: string }[] = [];

  // Split by common section separators: —, –, |, and newlines
  // We added \n\n to ensure paragraph separation
  const sections = text.split(/\s*(?:—|–|\||\n\n|\n(?=[أ-ي]\)|سؤال \d+|[\d]+[\)\.]))\s*/);

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // Check for table-like patterns (columns of numbers with headers)
    const tableMatch = trimmed.match(/(\[[\d;,.\s]+\[|\$\[[\d;,.\s]+\[)/g);
    const hasTableHeaders = /القامة|العمر|المسافة|الوزن|التردد|عدد|الفئات|القيم/i.test(trimmed);
    const hasTabularData = trimmed.match(/(\d+\s+){3,}/);

    if (hasTableHeaders && (tableMatch || hasTabularData)) {
      segments.push({ type: "table", content: trimmed });
      continue;
    }

    // Check for list/numbered items within this section
    if (/سؤال \d+|[أ-ي]\)|^\d+[\)\.]/m.test(trimmed) || trimmed.includes(" / ")) {
      // Split by question markers or "/"
      const subItems = trimmed.split(/\s*(?:\/|(?=سؤال \d+)|(?=[أ-ي]\))|(?=[\d]+[\)\.]))\s*/);
      if (subItems.length > 1) {
        subItems.forEach(item => {
          const itrim = item.trim();
          if (itrim && itrim !== "/") {
            if (/^سؤال \d+|[أ-ي]\)|^\d+[\)\.]/.test(itrim) || itrim.length > 5) {
              segments.push({ type: "list", content: itrim });
            } else {
              segments.push({ type: "text", content: itrim });
            }
          }
        });
        continue;
      }
    }

    // Check for geometric construction instructions
    if (/ارسم|أنشئ|المثلث|الدائرة|المستقيم|المستوي|القطعة|الزاوية|التحويل|الإنشاء/i.test(trimmed) &&
        (/\$[A-Z]\$/i.test(trimmed) || trimmed.includes("cm") || trimmed.includes("سم"))) {
      segments.push({ type: "geometric", content: trimmed });
      continue;
    }

    // Default: text with potential LaTeX
    segments.push({ type: "text", content: trimmed });
  }

  return segments;
}

// ... remaining parseTable and other functions (kept unchanged except for using MathContent)

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

export function ExerciseRenderer({ text, className = "" }: Props) {
  const segments = useMemo(() => detectContent(text), [text]);

  if (segments.length === 0) {
    return <div className={`text-sm text-foreground leading-relaxed ${className}`} dir="rtl">{text}</div>;
  }

  return (
    <div className={`space-y-2 ${className}`} dir="rtl">
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
                            <MathContent text={h} />
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {table.rows.map((row, j) => (
                        <tr key={j}>
                          {row.map((cell, k) => (
                            <td key={k} className="px-3 py-2 text-center border border-border text-foreground">
                              <MathContent text={cell} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {/* Also show raw text for context */}
                  <div className="mt-2 text-xs text-muted-foreground leading-relaxed">
                    <MathContent text={seg.content} />
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
                  <MathContent text={seg.content} />
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
                  <MathContent text={seg.content} />
                </div>
              </div>
            );

          case "list": {
            const markerMatch = seg.content.match(/^سؤال (\d+)|^(\d+)[\)\.]|^([أ-ي])\)/);
            const marker = markerMatch ? (markerMatch[1] || markerMatch[2] || markerMatch[3]) : null;
            
            return (
              <div key={i} className="flex gap-3 items-start p-2.5 px-3 rounded-xl bg-card border border-border shadow-sm hover:border-primary/30 transition-all hover:shadow-md group">
                <div className="w-6 h-6 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[11px] font-black flex-shrink-0 mt-0.5 shadow-inner group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  {marker || "•"}
                </div>
                <div className="text-[13px] text-foreground/90 leading-relaxed flex-1 font-medium">
                  <MathContent text={seg.content.replace(/^سؤال \d+\s*|^\d+[\)\.]\s*|^[أ-ي]\)\s*/, "").trim()} />
                </div>
              </div>
            );
          }

          default: {
            const isPotentialHeader = seg.content.length < 60 && (/^(\d+[\.\)]|إليك|ليكن|نعتبر|في الشكل|لاحظ)/i.test(seg.content));
            return (
              <div key={i} className={`text-sm leading-relaxed ${isPotentialHeader ? "font-black text-foreground border-r-4 border-primary/40 pr-3 py-0.5 my-1 bg-muted/20 rounded-l-md" : "text-foreground/70"}`}>
                <MathContent text={seg.content} />
              </div>
            );
          }
        }
      })}
    </div>
  );
}
