import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface LatexRendererProps {
  latex: string;
  className?: string;
  displayMode?: boolean;
}

export function LatexRenderer({ latex, className = "", displayMode = false }: LatexRendererProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(latex, ref.current, {
          displayMode,
          throwOnError: false,
          trust: true,
        });
      } catch {
        ref.current.textContent = latex;
      }
    }
  }, [latex, displayMode]);

  return (
    <span 
      ref={ref} 
      dir="ltr"
      className={`inline-math-isolate ${className}`}
      style={{ display: displayMode ? "block" : "inline-block", unicodeBidi: "isolate", direction: "ltr", maxWidth: "100%", overflowX: "auto", overflowY: "hidden" }} 
    />
  );
}
