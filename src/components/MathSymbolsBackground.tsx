import { useMemo } from "react";
import { motion } from "framer-motion";

const SYMBOLS = [
  "∫", "∑", "π", "√", "∞", "∂", "θ", "λ", "Δ", "Ω",
  "α", "β", "γ", "φ", "≈", "≠", "≤", "≥", "±", "÷",
  "f(x)", "x²", "y²", "a²+b²", "sin", "cos", "tan", "log",
  "lim", "dx", "∇", "∈", "∀", "∃", "ℝ", "ℕ", "ℤ", "ℚ",
  "e^x", "n!", "∝", "⊂", "∪", "∩", "→", "⇒", "⇔",
];

interface SymbolItem {
  char: string;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  rotate: number;
  opacity: number;
}

export function MathSymbolsBackground({
  count = 28,
  className = "",
}: {
  count?: number;
  className?: string;
}) {
  const items = useMemo<SymbolItem[]>(() => {
    return Array.from({ length: count }).map((_, i) => {
      const seed = i * 9301 + 49297;
      const r = (n: number) => ((Math.sin(seed * (n + 1)) + 1) / 2);
      return {
        char: SYMBOLS[Math.floor(r(1) * SYMBOLS.length)],
        left: r(2) * 100,
        top: r(3) * 100,
        size: 18 + r(4) * 46,
        duration: 14 + r(5) * 22,
        delay: r(6) * -20,
        drift: 20 + r(7) * 60,
        rotate: (r(8) - 0.5) * 40,
        opacity: 0.05 + r(9) * 0.09,
      };
    });
  }, [count]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {items.map((it, i) => (
        <motion.span
          key={i}
          initial={{ y: 0, x: 0, rotate: 0 }}
          animate={{
            y: [0, -it.drift, 0, it.drift * 0.6, 0],
            x: [0, it.drift * 0.4, -it.drift * 0.3, 0],
            rotate: [0, it.rotate, 0, -it.rotate, 0],
          }}
          transition={{
            duration: it.duration,
            delay: it.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            position: "absolute",
            left: `${it.left}%`,
            top: `${it.top}%`,
            fontSize: `${it.size}px`,
            opacity: it.opacity,
            fontFamily: "'Cambria Math', 'Latin Modern Math', Georgia, serif",
            fontStyle: "italic",
            color: "hsl(var(--primary))",
            userSelect: "none",
            whiteSpace: "nowrap",
            textShadow: "0 0 18px hsl(var(--primary) / 0.25)",
          }}
        >
          {it.char}
        </motion.span>
      ))}
    </div>
  );
}

export default MathSymbolsBackground;
