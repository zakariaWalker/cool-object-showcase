// ===== Rich blog-style renderer =====
// Parses lightweight markup (headings, lists, tables, bold/italic, blockquotes,
// inline `$...$` and block `$$...$$` math) into beautifully styled blocks.
// Used by the public textbook reader to make every lesson read like an article.

import { LatexRenderer } from "@/components/LatexRenderer";

interface Props { text: string; className?: string }

type Block =
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "code"; text: string }
  | { kind: "math"; text: string }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "p"; text: string }
  | { kind: "hr" };

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    if (buf.length === 0) return;
    const text = buf.join(" ").trim();
    if (text) blocks.push({ kind: "p", text });
    buf.length = 0;
  };

  let pBuf: string[] = [];

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    // blank line → end current paragraph
    if (!line) { flushParagraph(pBuf); i++; continue; }

    // horizontal rule
    if (/^(---+|\*\*\*+|___+)$/.test(line)) {
      flushParagraph(pBuf); blocks.push({ kind: "hr" }); i++; continue;
    }

    // block math $$...$$
    if (line.startsWith("$$")) {
      flushParagraph(pBuf);
      const buf: string[] = [];
      const inline = line.slice(2);
      if (inline.endsWith("$$") && inline.length >= 2) {
        blocks.push({ kind: "math", text: inline.slice(0, -2).trim() });
        i++; continue;
      }
      if (inline) buf.push(inline);
      i++;
      while (i < lines.length && !lines[i].trim().endsWith("$$")) { buf.push(lines[i]); i++; }
      if (i < lines.length) {
        const last = lines[i].trim();
        buf.push(last.slice(0, -2));
        i++;
      }
      blocks.push({ kind: "math", text: buf.join("\n").trim() });
      continue;
    }

    // fenced code ```
    if (line.startsWith("```")) {
      flushParagraph(pBuf);
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) { buf.push(lines[i]); i++; }
      if (i < lines.length) i++;
      blocks.push({ kind: "code", text: buf.join("\n") });
      continue;
    }

    // headings
    if (/^##\s+/.test(line)) { flushParagraph(pBuf); blocks.push({ kind: "h2", text: line.replace(/^##\s+/, "") }); i++; continue; }
    if (/^###\s+/.test(line)) { flushParagraph(pBuf); blocks.push({ kind: "h3", text: line.replace(/^###\s+/, "") }); i++; continue; }

    // blockquote
    if (line.startsWith(">")) {
      flushParagraph(pBuf);
      const buf: string[] = [line.replace(/^>\s?/, "")];
      i++;
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        buf.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "quote", text: buf.join(" ") });
      continue;
    }

    // table — at least one row of pipes followed by a separator
    if (line.includes("|") && i + 1 < lines.length && /^[\s|:\-]+$/.test(lines[i + 1].trim()) && lines[i + 1].includes("-")) {
      flushParagraph(pBuf);
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().includes("|") && lines[i].trim() !== "") {
        rows.push(splitRow(lines[i].trim()));
        i++;
      }
      blocks.push({ kind: "table", header, rows });
      continue;
    }

    // unordered list
    if (/^[-*•]\s+/.test(line)) {
      flushParagraph(pBuf);
      const items: string[] = [line.replace(/^[-*•]\s+/, "")];
      i++;
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    // ordered list
    if (/^\d+[.)]\s+/.test(line)) {
      flushParagraph(pBuf);
      const items: string[] = [line.replace(/^\d+[.)]\s+/, "")];
      i++;
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    // plain paragraph line
    pBuf.push(line);
    i++;
  }
  flushParagraph(pBuf);
  return blocks;
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());
}

// ─── Inline rendering: bold, italic, code, math ───
function Inline({ text }: { text: string }) {
  if (!text) return null;
  // Split on `$...$` math first; preserves indices
  const mathParts = text.split(/(\$[^$\n]+\$)/g);
  return (
    <>
      {mathParts.map((part, i) => {
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          return <LatexRenderer key={`m-${i}`} latex={part.slice(1, -1)} />;
        }
        return <InlineText key={`t-${i}`} text={part} />;
      })}
    </>
  );
}

function InlineText({ text }: { text: string }) {
  // bold **x**, italic *x*, inline code `x`
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return (
    <>
      {tokens.map((t, i) => {
        if (t.startsWith("**") && t.endsWith("**") && t.length > 4) {
          return <strong key={i} className="font-black text-foreground">{t.slice(2, -2)}</strong>;
        }
        if (t.startsWith("`") && t.endsWith("`") && t.length > 2) {
          return <code key={i} className="px-1.5 py-0.5 rounded bg-muted text-foreground text-[0.92em] font-mono">{t.slice(1, -1)}</code>;
        }
        if (t.startsWith("*") && t.endsWith("*") && t.length > 2) {
          return <em key={i} className="italic text-foreground">{t.slice(1, -1)}</em>;
        }
        return <span key={i}>{t}</span>;
      })}
    </>
  );
}

export function RichContent({ text, className = "" }: Props) {
  if (!text) return null;
  const blocks = parseBlocks(text);

  return (
    <div className={`space-y-3 leading-loose text-foreground ${className}`}>
      {blocks.map((b, i) => {
        const delay = `${Math.min(i * 30, 240)}ms`;
        const enter = "animate-fade-in";
        switch (b.kind) {
          case "h2":
            return (
              <h3 key={i} style={{ animationDelay: delay }} className={`${enter} text-lg md:text-xl font-black text-foreground mt-2 border-r-4 border-primary pr-3`}>
                <Inline text={b.text} />
              </h3>
            );
          case "h3":
            return (
              <h4 key={i} style={{ animationDelay: delay }} className={`${enter} text-base font-black text-foreground mt-1`}>
                <Inline text={b.text} />
              </h4>
            );
          case "ul":
            return (
              <ul key={i} style={{ animationDelay: delay }} className={`${enter} space-y-1.5 pr-1`}>
                {b.items.map((it, k) => (
                  <li key={k} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-1.5 flex-shrink-0">◆</span>
                    <span className="flex-1"><Inline text={it} /></span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} style={{ animationDelay: delay }} className={`${enter} space-y-1.5 pr-1`}>
                {b.items.map((it, k) => (
                  <li key={k} className="flex items-start gap-2 text-sm">
                    <span className="font-black text-primary text-[11px] flex-shrink-0 mt-0.5 min-w-[1.2rem] text-center rounded bg-primary/10 px-1">{k + 1}</span>
                    <span className="flex-1"><Inline text={it} /></span>
                  </li>
                ))}
              </ol>
            );
          case "quote":
            return (
              <blockquote key={i} style={{ animationDelay: delay }} className={`${enter} border-r-4 border-accent bg-accent/5 pr-3 py-2 rounded-l text-sm italic text-foreground/90`}>
                <Inline text={b.text} />
              </blockquote>
            );
          case "code":
            return (
              <pre key={i} style={{ animationDelay: delay }} className={`${enter} bg-muted/70 border border-border rounded-lg p-3 text-xs font-mono overflow-x-auto`}>
                <code>{b.text}</code>
              </pre>
            );
          case "math":
            return (
              <div key={i} style={{ animationDelay: delay }} className={`${enter} bg-primary/5 border border-primary/15 rounded-lg p-3 overflow-x-auto`}>
                <LatexRenderer latex={b.text} displayMode />
              </div>
            );
          case "table":
            return (
              <div key={i} style={{ animationDelay: delay }} className={`${enter} overflow-x-auto rounded-lg border border-border`}>
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-muted">
                    <tr>
                      {b.header.map((h, k) => (
                        <th key={k} className="text-right px-3 py-2 font-black text-xs text-foreground border-b border-border">
                          <Inline text={h} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, r) => (
                      <tr key={r} className="hover:bg-muted/40 transition-colors">
                        {row.map((cell, c) => (
                          <td key={c} className="px-3 py-2 text-xs border-b border-border/60">
                            <Inline text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "hr":
            return <hr key={i} className="border-border my-2" />;
          case "p":
          default:
            return (
              <p key={i} style={{ animationDelay: delay }} className={`${enter} text-sm md:text-[15px] leading-loose text-foreground`}>
                <Inline text={(b as any).text} />
              </p>
            );
        }
      })}
    </div>
  );
}

export default RichContent;
