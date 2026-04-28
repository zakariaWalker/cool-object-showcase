// ===== Quick Input Bar =====
// Chip toolbar that inserts common math tokens at the cursor of a textarea.
// Reduces typing pain (powers, parentheses, roots, fractions, …).

import { useRef } from "react";

export interface QuickInputBarProps {
  /** Ref to the textarea/input we should write into. */
  targetRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement>;
  value: string;
  onChange: (next: string) => void;
  /** Show only a useful subset for the active domain. */
  variant?: "algebra" | "arithmetic" | "geometry" | "general";
}

interface Chip {
  label: string;
  /** Inserted text. Use {|} to mark caret position; {sel} keeps current selection inside. */
  insert: string;
  hint?: string;
}

const ALGEBRA: Chip[] = [
  { label: "x²", insert: "x²", hint: "مربع x" },
  { label: "x³", insert: "x³" },
  { label: "( )", insert: "({sel}{|})", hint: "قوس" },
  { label: "[ ]", insert: "[{sel}{|}]" },
  { label: "²", insert: "²" },
  { label: "³", insert: "³" },
  { label: "√", insert: "√({|})", hint: "جذر" },
  { label: "/", insert: " / " },
  { label: "×", insert: " × " },
  { label: "±", insert: "±" },
  { label: "=", insert: " = " },
  { label: "π", insert: "π" },
];

const ARITHMETIC: Chip[] = [
  { label: "+", insert: " + " },
  { label: "−", insert: " − " },
  { label: "×", insert: " × " },
  { label: "÷", insert: " ÷ " },
  { label: ",", insert: "," },
  { label: "( )", insert: "({sel}{|})" },
  { label: "²", insert: "²" },
  { label: "%", insert: " % " },
];

const GEOMETRY: Chip[] = [
  { label: "°", insert: "°" },
  { label: "∠", insert: "∠" },
  { label: "⟂", insert: " ⟂ " },
  { label: "∥", insert: " ∥ " },
  { label: "△", insert: "△" },
  { label: "[AB]", insert: "[{|}]" },
  { label: "(AB)", insert: "({|})" },
];

export function QuickInputBar({ targetRef, value, onChange, variant = "general" }: QuickInputBarProps) {
  const lastFocus = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const chips: Chip[] =
    variant === "algebra" ? ALGEBRA :
    variant === "arithmetic" ? ARITHMETIC :
    variant === "geometry" ? GEOMETRY :
    [...ALGEBRA, ...GEOMETRY];

  const rememberCaret = () => {
    const el = targetRef.current;
    if (!el) return;
    lastFocus.current = {
      start: el.selectionStart ?? value.length,
      end: el.selectionEnd ?? value.length,
    };
  };

  const insertChip = (chip: Chip) => {
    const el = targetRef.current;
    const { start, end } = lastFocus.current;
    const sel = value.slice(start, end);
    let payload = chip.insert.replace("{sel}", sel);
    let caretOffset = payload.indexOf("{|}");
    payload = payload.replace("{|}", "");
    if (caretOffset < 0) caretOffset = payload.length;

    const next = value.slice(0, start) + payload + value.slice(end);
    onChange(next);

    requestAnimationFrame(() => {
      if (!el) return;
      const pos = start + caretOffset;
      el.focus();
      try { (el as HTMLTextAreaElement).setSelectionRange(pos, pos); } catch {}
      lastFocus.current = { start: pos, end: pos };
    });
  };

  return (
    <div
      onMouseDown={(e) => { rememberCaret(); e.preventDefault(); }}
      className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border bg-muted/40"
      dir="ltr"
    >
      {chips.map((c) => (
        <button
          key={c.label}
          type="button"
          onClick={() => insertChip(c)}
          title={c.hint || c.label}
          className="min-w-[36px] h-8 px-2 rounded-md bg-card border border-border text-sm font-bold text-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors active:scale-95"
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}
