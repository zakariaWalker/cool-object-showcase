import { useMemo } from "react";
import { LatexRenderer } from "@/components/LatexRenderer";

interface MathContentProps {
  text: string;
  className?: string;
  autoHighlightNumbers?: boolean;
}

export function MathContent({ text, className = "", autoHighlightNumbers = true }: MathContentProps) {
  const segments = useMemo(() => {
    if (!text) return [];
    
    // Split text by $...$ for LaTeX segments
    const parts = text.split(/(\$[^$]+\$)/g);
    
    return parts.map((part, i) => {
      if (part.startsWith("$") && part.endsWith("$")) {
        return { type: "latex", content: part.slice(1, -1) };
      }
      return { type: "text", content: part };
    });
  }, [text]);

  return (
    <span className={`leading-relaxed text-foreground ${className}`}>
      {segments.map((seg, i) => {
        if (seg.type === "latex") {
          return <LatexRenderer key={i} latex={seg.content} />;
        }
        
        if (!autoHighlightNumbers) {
          return <span key={i} dir="auto" className="math-text-preserve whitespace-pre-wrap">{seg.content}</span>;
        }

        // Automated highlighting for numbers outside of LaTeX
        const subParts = seg.content.split(/(\d+[\.,]?\d*)/g);
        return (
          <bdi key={i} dir="auto" className="math-text-preserve whitespace-pre-wrap break-words">
            {subParts.map((sp, j) => {
              if (/^\d+[\.,]?\d*$/.test(sp) && sp.length > 0) {
                return (
                  <span key={j} className="font-black text-primary bg-primary/5 px-1 rounded mx-0.5 border-b border-primary/20">
                    {sp}
                  </span>
                );
              }
              return <span key={j}>{sp}</span>;
            })}
          </bdi>
        );
      })}
    </span>
  );
}
